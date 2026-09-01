-- Email a copy of a new voicemail.
--
-- Called from voicemail_save() the moment the caller hangs up, after the file
-- is on disk and only when the message was long enough to keep.
--
-- IT LOOKS NOTHING UP. The dialplan has already decided who this mail goes to
-- and put the answer on the channel:
--
--     vm_notify_email    the address, absent when no mail should be sent
--     vm_notify_attach   "true" when the recording was asked for
--
-- An earlier draft did the lookup here and needed an HTTP endpoint that does not
-- exist to reach the company record. The dialplan already holds a MySQL
-- connection, a cache and every other company setting read on the call path, so
-- the decision belongs there and is tested there
-- (`test_vm_email.py`). What is left here is one request.
--
-- WHERE IT SENDS. notification-api answers
-- POST 127.0.0.1:3002/api/v1/send-email with { email, subject, body }. It is
-- bound to loopback, so the switch can reach it and nothing off-box can, and its
-- SMTP is configured against Gmail sending as notifications@mycountrymobile.com.
--
-- IT NEVER FAILS A CALL. Every step is wrapped, curl times out in 5 seconds, and
-- any error is logged and swallowed. The caller has already hung up by the time
-- this runs; a mail server having a bad afternoon must not turn into a voicemail
-- that was never saved.

local NOTIFY_URL   = "http://127.0.0.1:3002/api/v1/send-email"
local CURL_TIMEOUT = 5

-- The smallest possible JSON string escape: the characters that can appear in a
-- caller ID or a name and would otherwise break the document.
local function json_escape(value)
    if value == nil then return "" end
    local text = tostring(value)
    text = text:gsub('\\', '\\\\')
    text = text:gsub('"', '\\"')
    text = text:gsub('\n', '\\n')
    text = text:gsub('\r', '\\r')
    text = text:gsub('\t', '\\t')
    -- Anything else below 0x20 would be an illegal raw control character.
    text = text:gsub('%c', ' ')
    return text
end

local function log(level, message)
    freeswitch.consoleLog(level, "[voicemail-email] " .. tostring(message) .. "\n")
end

-- Seconds as something a person reads. 95 -> "1 min 35 sec".
local function pretty_duration(seconds)
    local total = tonumber(seconds) or 0
    if total < 60 then return string.format("%d sec", total) end
    return string.format("%d min %d sec", math.floor(total / 60), total % 60)
end

-- The one entry point.
--
--   channel   anything with getVariable - the live session on a real call, and
--             a plain table in the tests, which is why it is passed in rather
--             than read off the global `session`
--   extension the mailbox this message was left for
--   caller    the number that rang
--   duration  seconds of recorded audio
--   msgfile   the file name on disk, so an operator can find it from the log
function voicemail_email(channel, extension, caller, duration, msgfile)
    if channel == nil then return end

    local ok, recipient = pcall(function() return channel:getVariable("vm_notify_email") end)
    if not ok or recipient == nil or recipient == "" then
        -- Not an error. The dialplan sets this only when a mail should be sent,
        -- so its absence is the ordinary case for most companies.
        return
    end

    local _, attach = pcall(function() return channel:getVariable("vm_notify_attach") end)

    local from = (caller == nil or caller == "") and "an unknown number" or caller
    local subject = string.format("New voicemail from %s", from)

    -- Plain text on purpose. It renders identically everywhere, cannot carry a
    -- tracking pixel, and is what a phone shows in a notification preview.
    local body = table.concat({
        string.format("You have a new voicemail for extension %s.", tostring(extension)),
        "",
        string.format("From:     %s", from),
        string.format("Length:   %s", pretty_duration(duration)),
        string.format("Received: %s", os.date("%d %b %Y at %H:%M")),
        "",
        "Sign in to hear it.",
    }, "\n")

    -- The attachment is reported and NOT acted on. /send-email takes only
    -- { email, subject, body } and has no attachment field, so honouring this
    -- needs that endpoint extended first. Saying so in the log is the honest
    -- half; quietly sending without the recording an admin asked for is not.
    if attach == "true" then
        log("info", "attach was asked for, but send-email cannot carry one yet; "
            .. "sending the notice without the recording (" .. tostring(msgfile) .. ")")
    end

    local payload = string.format(
        '{"email":"%s","subject":"%s","body":"%s"}',
        json_escape(recipient), json_escape(subject), json_escape(body))

    -- Written to a temp file rather than inlined, so a caller ID containing a
    -- quote can never break out of the shell command.
    local tmp = os.tmpname()
    local handle = io.open(tmp, "w")
    if handle == nil then
        log("err", "could not write the request body; no mail sent")
        return
    end
    handle:write(payload)
    handle:close()

    local cmd = string.format(
        "/usr/bin/curl -s -o /dev/null -w '%%{http_code}' --max-time %d "
        .. "-X POST %s -H 'Content-Type: application/json' --data-binary @%s",
        CURL_TIMEOUT, NOTIFY_URL, tmp)

    local ran, pipe = pcall(io.popen, cmd)
    if ran and pipe then
        local code = pipe:read("*a")
        pipe:close()
        if code == "200" then
            log("info", "sent to " .. recipient)
        else
            log("warning", "send-email answered " .. tostring(code) .. "; no mail sent")
        end
    else
        log("err", "could not run curl; no mail sent")
    end

    os.remove(tmp)
end
