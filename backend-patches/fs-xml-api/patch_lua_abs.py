"""Give every lua invocation in the dialplan an absolute path.

FreeSWITCH resolves a bare script name against its own script dir,
/usr/share/freeswitch/scripts, which is EMPTY on this box - all 18 scripts live
in /etc/freeswitch/scripts. A bare name does not raise. It logs "cannot open"
and the call carries on as if nothing had been asked for, so recording,
voicemail and queues all fail silently.

Proved 1 Sep 2026 by running one probe script both ways, one second apart:

    luarun _abspath_probe.lua                        -> cannot open ...
    luarun /etc/freeswitch/scripts/_abspath_probe.lua -> ABSPATH_PROBE_OK

lua.conf.xml's script-directory does not help: that is LUA_PATH for `require`
INSIDE a script, not the search path for the script the dialplan names.

Run:  python3 patch_lua_abs.py <path-to-dialplan_service.py>
Every replacement asserts it matched exactly once, so a partial apply is not
possible - it either does all of them or writes nothing.
"""
import io
import sys

CONST = '''DEFAULT_RECORDING_MODE = "off"

# ALWAYS give lua an absolute path. A bare script name is resolved against
# /usr/share/freeswitch/scripts, which is empty on this box, and the failure is
# silent - "cannot open" in the log and the call carries on. Every script lives
# under FS_SCRIPTS. This has already been reintroduced once by a later edit, so
# if you are adding a lua action: use this constant, not a bare name.
FS_SCRIPTS = "/etc/freeswitch/scripts/"'''

PAIRS = [
    ('DEFAULT_RECORDING_MODE = "off"', CONST),

    ('"data": "api_hangup_hook=lua upload_recording.lua ${uuid} %s" % company_uuid},',
     '"data": "api_hangup_hook=lua %supload_recording.lua ${uuid} %s" % (FS_SCRIPTS, company_uuid)},'),

    ('"data": "ondrec,*2,exec:lua,ondemand_record.lua start,%s,self" % dtmf_leg},',
     '"data": "ondrec,*2,exec:lua,%sondemand_record.lua start,%s,self" % (FS_SCRIPTS, dtmf_leg)},'),

    ('"data": "ondrec,*3,exec:lua,ondemand_record.lua stop,%s,self" % dtmf_leg},',
     '"data": "ondrec,*3,exec:lua,%sondemand_record.lua stop,%s,self" % (FS_SCRIPTS, dtmf_leg)},'),

    ('"data": "api_hangup_hook=lua /etc/freeswitch/scripts/upload_recording.lua ${uuid} %s" % company_uuid},',
     '"data": "api_hangup_hook=lua %supload_recording.lua ${uuid} %s" % (FS_SCRIPTS, company_uuid)},'),

    ('{"application": "lua", "data": "/etc/freeswitch/scripts/start_record.lua"},',
     '{"application": "lua", "data": FS_SCRIPTS + "start_record.lua"},'),

    ('{"application": "lua", "data": "save-voicemail.lua"},',
     '{"application": "lua", "data": FS_SCRIPTS + "save-voicemail.lua"},'),

    ('{"application": "lua", "data": "callcenter-queue.lua"},',
     '{"application": "lua", "data": FS_SCRIPTS + "callcenter-queue.lua"},'),
]


def main(path):
    s = io.open(path, encoding="utf-8").read()
    for old, new in PAIRS:
        found = s.count(old)
        if found != 1:
            raise SystemExit("REFUSING TO WRITE: %d matches (want 1) for: %s" % (found, old[:70]))
        s = s.replace(old, new)
    io.open(path, "w", encoding="utf-8").write(s)
    print("replacements made: %d" % len(PAIRS))


if __name__ == "__main__":
    main(sys.argv[1])
