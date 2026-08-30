# callcenter-config-shim — starting the queue engine

**Applied and live on `mcm-switch` (167.99.4.91) on 30 August 2026.**

## What was wrong

Call queues did not work, and this was the bottom of the chain — underneath the
missing agent service, underneath the missing dialplan branches. FreeSWITCH's
queue module was never running at all:

    [ERR]  mod_callcenter.c:1512 Open of callcenter.conf failed
    [CRIT] Error Loading module mod_callcenter.so

Before this change, asking FreeSWITCH about queues gave:

    callcenter_config queue list   ->  -ERR Command not found!

Like the dialplan and the directory, the module fetches its configuration over
HTTP instead of from a file. The service answering those requests returned
**HTTP 400** for `callcenter.conf` while answering `ivr.conf` and `sofia.conf`
with 200, and its own log said why:

    "could not execute not found template", "template file path": ""

It fell through to a not-found template whose path was never configured, so it
could not even render its own error. The module got a broken answer and refused
to load.

That service is a stripped binary. There is no source for it on any machine
here, so the fix could not be made inside it.

## What was done instead

A small service now sits on the address the original used, answers the single
request that was failing, and forwards everything else to the original —
unchanged — on port 9012.

A shim rather than a replacement, deliberately: the original answers directory
and IVR lookups that work today, and reimplementing those to repair one broken
answer would risk every working call to fix a broken one.

It answers with a valid, empty queue list. That is all the module needs — it
reads this once at startup, and queues are added afterwards at runtime. Building
the real queue list here would need a database driver this machine does not have
and would not be re-read anyway.

## The result

    callcenter_config queue list   ->  +OK (with the column header)
    show application               ->  callcenter, callcenter_track

The queue engine is running. That unblocks everything queue-shaped; it does not
by itself make a queued call work — see "what is still missing" below.

## How it is wired

| | |
|---|---|
| `callcenter-config-shim` | listens on `localhost:9002`, answers `callcenter.conf`, forwards the rest |
| `fs-configuration-manager` | moved to `localhost:9012`, otherwise untouched |
| FreeSWITCH | unchanged — still asks `localhost:9002`, as it always did |

Both services are `enabled`, so both return after a reboot, and
`mod_callcenter` is in `modules.conf.xml`, so it loads on a FreeSWITCH restart
without anybody intervening.

## To undo it

    ssh mcm-switch "systemctl disable --now callcenter-config-shim \
      && cp -a /etc/systemd/system/fs-configuration-manager.service.bak-preshim \
               /etc/systemd/system/fs-configuration-manager.service \
      && systemctl daemon-reload && systemctl restart fs-configuration-manager"

That returns the box to exactly its previous state: the original back on 9002,
the shim gone, and the queue module failing to load as before.

## Tests

    python3 tests/shim_test.py

15 tests, standard library only, no network and no service running. They cover
the answer being XML FreeSWITCH can parse, `<queues>` being present-and-empty
rather than absent, every other configuration going upstream untouched, a
near-miss name like `callcenter.conf.bak` not being swallowed, malformed input
not taking the service down, and — most importantly — that when the original is
unreachable the shim answers FreeSWITCH's own "not found" rather than an error,
because an error here would break lookups that currently work.

## What is still missing

The engine runs; a queued call still will not complete. Three things remain, and
none of them is this service:

1. **The dialplan never sends a call to a queue.** `dialplan_service.py` handles
   `EXTENSION` and `VOICEMAIL` and returns not-found for the other nine
   destination types, queues and IVR menus among them. It also sets none of the
   `cc_*` variables the queue script reads.
2. **Nobody is in a queue.** The configuration template renders `<queues>` only —
   there is no `<agents>` or `<tiers>` section — so even a loaded module has no
   members.
3. **The agent lookup service does not exist.** The queue script asks
   `localhost:9006` which agent should take the call, and nothing listens there.
   That service is built and tested in `backend-patches/queue-agent-service/`,
   not yet deployed.
