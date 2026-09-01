"""Resolve who a voicemail email goes to, on the dialplan side.

The first draft of this left the lookup to the lua and told an operator to hand
write it. That was the wrong half of the system to put it in. The dialplan
already holds a MySQL connection, a cache, and every other company setting read
on the call path; the lua holds none of those and would have needed a new HTTP
endpoint to get at any of it.

So the decision is made here and the answer travels down the channel. By the
time `save-voicemail.lua` runs it has an address or it has nothing, and it never
has to look anything up - which also means the mail path cannot add a database
round trip to a call.

Two variables are set, and only when there is somebody to send to:

    vm_notify_email    the address
    vm_notify_attach   "true" when the recording was asked for
"""

import io
import sys

PATH = sys.argv[1]
with io.open(PATH, encoding="utf-8") as handle:
    text = handle.read()

ANCHOR = "def company_recording_policy(db_name):"

HELPERS = '''VM_EMAIL_SHAPE = re.compile(r"^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

_vm_notify_cache = {}
_vm_notify_cache_time = {}


def company_voicemail_notify(db_name):
    """The company's voicemail-email settings, or {} when there are none.

    Same reserved record as the opening hours and the ring time. Any failure
    returns nothing, which reads as "not switched on" - the safe direction for
    this one, because the cost of a missed notification is an inconvenience and
    the cost of mailing a voicemail to the wrong inbox is not.
    """
    if not db_name:
        return {}
    now = time.time()
    if db_name in _vm_notify_cache and (now - _vm_notify_cache_time.get(db_name, 0)) < CALLING_RULES_CACHE_SECONDS:
        return _vm_notify_cache[db_name]

    notify = {}
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT settings FROM `%s`.user_template WHERE name = %%s LIMIT 1" % db_name,
                (COMPANY_DEFAULT_TEMPLATE,),
            )
            row = cur.fetchone() or {}
            notify = _as_object(_as_object(row.get("settings")).get("voicemail_notify"))
    except Exception as e:
        log("error", "voicemail notify lookup failed, treating as off: %s" % e)
        return {}

    _vm_notify_cache[db_name] = notify
    _vm_notify_cache_time[db_name] = now
    return notify


def user_email(db_name, extension):
    """The mailbox owner's own email address, or "" if they have none."""
    if not db_name or not extension:
        return ""
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.email
                FROM users u
                JOIN companies c ON c.uuid = u.company_uuid
                WHERE c.db_name = %s AND u.extension = %s AND u.status = 'ACTIVE'
                LIMIT 1
            """, (db_name, extension))
            row = cur.fetchone() or {}
    except Exception as e:
        log("error", "mailbox owner lookup failed, no voicemail email sent: %s" % e)
        return ""
    return str(row.get("email") or "").strip()


def voicemail_notify_actions(db_name, target_ext):
    """The channel variables that tell the recording script where to mail this
    message, or [] when it should not mail anything.

    Everything uncertain returns [] and no mail is sent. A voicemail that
    silently reaches the wrong inbox cannot be taken back, so this is the one
    place in the file where doing nothing is the safe answer rather than the
    conservative one.
    """
    notify = company_voicemail_notify(db_name)
    if not notify or notify.get("enabled") is not True:
        return []

    send_to = str(notify.get("send_to") or "person").strip().lower()
    if send_to == "address":
        address = str(notify.get("address") or "").strip()
        if not address:
            log("info", "voicemail email is on but no address is stored", extension=target_ext)
            return []
    else:
        # `person` is the default for anything unrecognised: a target we do not
        # know must not fall through to a fixed address nobody can see.
        address = user_email(db_name, target_ext)
        if not address:
            log("info", "voicemail email is on but the mailbox owner has no address",
                extension=target_ext)
            return []

    # A last shape check, deliberately the SAME pattern the portal validates
    # with (`EMAIL_SHAPE` in company-voicemail.tsx). Two different opinions about
    # what an address looks like is how a value saves on one side and is refused
    # on the other. Not a full RFC 5322 check - no regex does that correctly -
    # but it catches what people actually mistype, and an earlier "@" in address
    # test let a bare "@" through.
    if not VM_EMAIL_SHAPE.match(address):
        log("warn", "voicemail email address does not look like one, not sending",
            extension=target_ext)
        return []

    return [
        {"application": "set", "data": "vm_notify_email=%s" % address},
        {"application": "set", "data": "vm_notify_attach=%s"
            % ("true" if notify.get("attach_audio") is True else "false")},
    ]


def company_recording_policy(db_name):'''

assert text.count(ANCHOR) == 1, "anchor"
text = text.replace(ANCHOR, HELPERS)

OLD = '''            {"application": "set", "data": f"vm_target_extension={target_ext}"},
            {"application": "answer", "data": ""},'''
NEW = '''            {"application": "set", "data": f"vm_target_extension={target_ext}"},
        ] + voicemail_notify_actions(db_name, target_ext) + [
            {"application": "answer", "data": ""},'''
assert text.count(OLD) == 1, "voicemail branch"
text = text.replace(OLD, NEW)

with io.open(PATH, "w", encoding="utf-8") as handle:
    handle.write(text)
print("patched %s" % PATH)
