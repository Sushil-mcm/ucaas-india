# queue-agent-service — who should this queued call ring?

**Not applied. Nothing on any server has been changed, and nothing has been
written to any database.**

When somebody calls a queue, the switch answers, plays hold music, and asks a
service on `localhost:9006` which phone to ring. It asks again every couple of
seconds until somebody picks up or the caller gives up.

Nothing has ever been listening on port 9006. The script that asks has been on
the switch all along, asking into thin air. This is the service it has been
asking.

It is written the same way as the dialplan service already on that machine:
Python 3, standard library plus `pymysql`, one JSON line per log entry.

---

## The contract

Taken from the script that actually runs,
`/etc/freeswitch/scripts/callcenter-queue.lua` on the switch, and from the event
manager at `/opt/esl-manager/src/controllers/CallCenterController.ts`. It is what
those two really send and really read, not a tidier API someone might design.

### 1. Which agents can take this call

```
GET /api/callcenter/queues/{queue}/agents?strategy=…&call_uuid=…&call_timeout=…
```

| Part | What it is |
|---|---|
| `{queue}` | The queue's own reference, taken from the `X-Queue` header on the call. |
| `strategy` | How the queue rings. Sent already tidied up by the switch: `ring-all`, `top-down`, `longest-idle-agent`, `agent-with-least-talk-time`, `agent-with-fewest-calls`, `random`, or anything a queue has been set to. |
| `call_uuid` | This caller. The same value comes back on every ask, which is how the service knows whose phone it already tried for them. |
| `call_timeout` | How long one phone is left ringing before moving on. |

The switch sends `Authorization: Bearer …` with a fixed value built into its
helper. It is not checked unless `AUTH_TOKENS` is filled in — see below.

**The answer.** Only one field is read:

```json
{ "agents": [ … ] }
```

Every other field in the reply is extra, and is there for whoever reads the logs:
`queue`, `strategy`, `rings_together`, `step`, `steps`, `count`,
`changes_in_seconds`, `reason`.

Each entry in `agents` is read like this:

| Field | Read as | Matters because |
|---|---|---|
| `name` | text, e.g. `1000@company.mycountrymobile.com` | **Load bearing.** The switch prints it straight into a log line. If it were missing, the script would stop and the call would end there. It is never empty. |
| `contact` | text, e.g. `user/1000_web@company.mycountrymobile.com` | **Load bearing.** This is what gets dialled. Empty means the call rings nowhere, so anybody without one is left out of the list entirely. |
| `extension` | text, e.g. `1000` | Stamped on the call so reports and screens can show who took it. If missing, the switch works it out from `name`, then `contact` — this service works it out exactly the same way, so the two can never disagree. |
| `user_detail` | object | Optional. `first_name` + `last_name` make the name shown on the agent's phone; `name` is used if those are empty; `timeout` is how long that one person's phone rings, overriding `call_timeout`. |

Order is the answer, not a detail:

- `ring-all` — the switch rings **everybody in the list at once**.
- everything else — the switch rings **`agents[1]` only**, then asks again.

So for one-at-a-time queues, the first entry is the decision.

**An empty list is a normal answer.** `{"agents": []}` means nobody is free. The
switch keeps the caller on hold, plays the waiting message, and asks again in
about three seconds, until the queue's own timeout. It is not an error and must
never be answered as one.

**When things go wrong.** The switch's helper reads whatever comes back and
ignores the status code. An empty body, or anything that is not valid JSON, is
treated exactly like an empty list — the caller waits and it asks again. That is
why this service always answers with a well-formed body, even while its database
is unreachable: the caller keeps their place in the queue instead of hearing the
line go dead. There is no timeout on the switch's side of that request, which is
the other reason every query in here has one.

### 2. A phone that was left ringing

```
GET|POST /api/callcenter/agents/no-answer
```

The switch means to send `{ "extension", "domain", "queue_id" }`. **It does not
arrive.** The helper it uses to make web requests, `curl()` in
`/etc/freeswitch/scripts/functions.lua`, takes one argument — the address. The
script calls it with three, so the method and the body are silently dropped, and
what actually arrives is an empty GET. Nothing identifies the person.

This service answers that cleanly (`{"ok": true, "recorded": false, "reason": …}`)
and writes a warning to the log. Nothing is lost by it: the event manager sends
the **same** report properly, as a POST with a real body, and that one is
recorded. Fixing the switch's helper is a separate one-line change to a shared
file used by every script on the box, and is not part of this.

### 3. Everything the event manager reports

All of these carry `{ "extension", "domain", "queue_id", "timestamp" }` and are
answered with `{"ok": true, "recorded": …}`.

| Address | Method | Also carries | What it records |
|---|---|---|---|
| `/api/callcenter/agents/status` | PUT | `status`, `state`, `memberUuid` | Somebody went on a queue call, or came free again. |
| `/api/callcenter/agents/state` | PUT | `state` | A smaller change, without touching their status. |
| `/api/callcenter/agents/call-start` | POST | | They answered. Their run of missed calls is cleared and their answered count goes up. |
| `/api/callcenter/agents/call-end` | PUT | `talk_time_seconds` | The call finished; talk time is added up. |
| `/api/callcenter/agents/call-complete` | POST | | The call is fully done. |
| `/api/callcenter/agents/wrapup-start` | POST | `wrapup_duration` | They are writing up notes and should not ring for that long. |
| `/api/callcenter/agents/no-answer` | POST | | Their phone was left ringing. |

And one lookup, used to put a real name on screen instead of an extension number:

```
GET /api/callcenter/agents/{extension@domain}
```

Answers with one agent in the same shape as above, or `404` with a JSON body. The
event manager already handles a `404` by quietly falling back to the extension.

Plus `GET /health` for the service itself.

---

## What it reads

Everything is in the shared database, `mycountrymobile_db` — the same one the
dialplan service already uses, and the same connection line.

**`agents`** — one row per person per queue. It already exists with exactly the
right columns.

| Column | Used for |
|---|---|
| `queue_uuid` | Which queue they are in. This is the lookup on the call path. |
| `name`, `contact`, `user_detail` | Sent to the switch as above. |
| `status`, `state` | Whether they can take a call right now. |
| `wrap_up_time`, `last_bridge_end` | Whether they are still writing up the last call. |
| `max_no_answer`, `no_answer_count`, `last_status_change` | Whether their phone has been left ringing too often. |
| `last_bridge_end`, `talk_time`, `calls_answered`, `last_offered_call` | Deciding whose turn it is, per strategy. |

**`queues`** and **`tiers`** — optional, and **neither exists yet**. The service
checks first and carries on without them, so a half-finished database shows up as
"fewer details available" and never as a failed call. `sql/001-queue-tables.sql`
creates both, and adds the two indexes the `agents` table is missing.

### Being free, and being on duty

Being free is not the same as being on duty for a queue. Somebody can be at their
desk and deliberately not taking queue calls. The platform records that, and this
service reads it as five states, matching `src/lib/acd-routing.ts` in the website:

| Stored `status` / `state` | Read as | Rings? |
|---|---|---|
| `Available` + `Waiting` / `Idle` | available | yes |
| `Available`, last call ended inside `wrap_up_time` | wrapping-up | no, until the wrap-up is up |
| `On Break` / `On break` | busy | no |
| `On Queue Call`, or state `Busy` / `Receiving` / `In a queue call` | on a call | no |
| `Logged Out` | signed out | no |
| anything else | signed out | no — an unfamiliar label costs a caller half a minute of hold music, so it is the safer thing to skip |

Both spellings of `On Break` are in the live data, which is why both are listed.

---

## Where this follows the switch instead of the website

`src/lib/acd-routing.ts` is the same decision, written for the screens. This
service mirrors it — same five duty states, same widening rounds, same "people are
added, never swapped out". Three places differ, and in each the switch wins,
because the switch is the thing actually placing calls:

1. **Ratings.** The website can demand a minimum rating per round. **Nothing in
   this platform stores a rating for anybody**, so there is nothing to filter on
   and no filtering is done. Inventing a number would have quietly sidelined
   people. If ratings are wanted, they need somewhere to live first.

2. **How long each round lasts.** The website takes a wait per round. That is not
   stored per queue anywhere, so this uses one setting, `ACD_STEP_SECONDS`, for
   every queue. Rounds come from `tiers.level`; where there is only one level —
   which is every queue today — this does nothing at all.

3. **Ring order.** The website's `fewest-calls-first` and `in-order` become the
   switch's `agent-with-fewest-calls` and `top-down`. The switch also has
   `agent-with-least-talk-time`, `longest-idle-agent`, `round-robin` and `random`,
   which the website has no name for. All are handled here.

One thing this does that neither does: it remembers whose phone it already tried
for a given caller and does not offer them again straight away. Without that, a
one-at-a-time queue would be handed the same person on every ask and the caller
would wait out the whole timeout on one unanswered phone. It is why the switch
sends `call_uuid` at all. Once everybody has had a turn, the list starts again
rather than going empty.

---

## Running it

```bash
cd backend-patches/queue-agent-service
python3 tests/queue_agent_service_test.py      # 46 tests, no database, no network
```

The tests fake the database out completely and cover the reply shapes against the
contract above, the duty-state rules, each ring order, the widening rounds, and
the promise that a broken database still answers cleanly.

To run the service by hand:

```bash
MYSQL_DSN='…' HTTP_LISTEN_ADDR=127.0.0.1:9006 python3 queue_agent_service.py
```

Settings are all in `env.example`, with what each one is for.

---

## What a human must do to deploy it

There is a script, `apply.sh`, that does all of this and puts the old state back
if the service does not come up healthy. **It has not been run.** By hand, on the
switch (`mcm-switch`, 167.99.4.91):

1. **Check the machine can run it.**
   ```bash
   ssh mcm-switch "python3 -V && python3 -c 'import pymysql; print(\"ok\")'"
   ```
   Python 3.12 and `pymysql` are both already there. Nothing else is needed — the
   switch has no package manager access, which is why there are no other imports.

2. **Copy the service.**
   ```bash
   ssh mcm-switch "mkdir -p /opt/queue-agent-service"
   scp queue_agent_service.py mcm-switch:/opt/queue-agent-service/
   ```

3. **Write the settings file.** Copy the database line from the dialplan service
   already running, rather than typing it out, so the two cannot point at
   different databases:
   ```bash
   ssh mcm-switch "grep '^MYSQL_DSN=' /opt/fs-xml-api-1.2.5/.env > /opt/queue-agent-service/.env
     printf 'HTTP_LISTEN_ADDR=127.0.0.1:9006\nHTTP_LISTEN_HOST6=::1\nBASE_DOMAIN=mycountrymobile.com\nLOG_LEVEL=info\n' >> /opt/queue-agent-service/.env
     chmod 600 /opt/queue-agent-service/.env"
   ```

4. **Install the service unit** (`queue-agent-service.service` in this folder).
   ```bash
   scp queue-agent-service.service mcm-switch:/etc/systemd/system/
   ssh mcm-switch "systemctl daemon-reload && systemctl enable --now queue-agent-service"
   ```

5. **Check it.**
   ```bash
   ssh mcm-switch "curl -s http://127.0.0.1:9006/health"
   ssh mcm-switch "curl -s 'http://127.0.0.1:9006/api/callcenter/queues/anything/agents?strategy=ring-all'"
   ```
   `{"agents": []}` from the second one is a **good** answer: the service is up and
   simply has nobody free for a queue that does not exist.

6. **Watch one real queued call.**
   ```bash
   ssh mcm-switch "journalctl -u queue-agent-service -f"
   ```
   Every ask logs the queue, how long the caller has waited, how many people are in
   the queue, how many were offered, how long it took, and one line of plain
   English saying why.

7. **Do the same on the API box** (`mcm-new`). The event manager runs on both
   machines and each asks for this service on its own machine, so agent status
   changes on that box only get recorded if it is running there too.

8. **Then, separately, the database** — `sql/001-queue-tables.sql`. Someone who
   owns the database reviews and runs it. The two `ALTER TABLE` lines are the ones
   that matter for speed and should go on first; the two new tables can follow.

To undo any of it: `bash rollback.sh mcm-switch` stops the service and switches it
off, which returns the machine to exactly what it was — nothing on port 9006.

---

## Before any of this changes a real call

Three things are in the way, and none of them are inside this service. This is
necessary, and on its own it is not sufficient.

1. **The agent records the switch reads are empty.** The `agents` table in MySQL
   has the right columns and **nought rows**. The live records — 20 queues, 37
   agents, 37 rota entries — are in MongoDB, in the same database name, written
   there by the API that saves a queue when somebody edits one on the website.
   Until those records also exist in MySQL, this service will honestly and
   correctly answer "nobody is free" for every call. Somebody has to decide which
   of the two is the real one and make the other follow. The tables here are
   written to match the MongoDB records column for column, so nothing needs
   reshaping.

2. **Queued calls do not reach the switch's queue script at all.** The service
   answering dialplan lookups, `fs-xml-api`, is running
   `/opt/fs-xml-api-1.2.5/dialplan_service.py`, which handles two kinds of inbound
   call handling: ring an extension, or go to voicemail. A number set to a **queue**
   falls through to "unhandled route type" and the call is not answered. Nothing
   in it sets `X-Queue`, `cc_ring_strategy`, `cc_queue_timeout` or the other
   settings the queue script reads, and no dialplan on the box mentions
   `callcenter-queue.lua`. That gap is bigger than this one and needs its own
   piece of work.

3. **The switch cannot report a missed call.** As above: its web helper drops the
   details. Harmless today because the event manager reports the same thing
   properly, but worth fixing where it sits, in `functions.lua`.

Items 1 and 2 each stop queued calls working on their own. Deploying this service
is still worth doing first: it is safe, it changes nothing about how calls behave
today, and it means the port is answering when either of the other two is fixed.

---

## Safety

This is on the live call path, so:

- **Nothing throws into a call.** Every request is wrapped. Any unexpected failure
  is logged and answered as an empty agent list, which the switch reads as "nobody
  is free" and handles by keeping the caller on hold.
- **Everything has a timeout.** Connecting and reading are capped at three
  seconds each, so a slow database is a short pause, never a hung call.
- **Repeated questions are answered from memory** for two seconds. A queue full of
  waiting callers all ask the same question every couple of seconds; without this
  they would each be a database query.
- **Memory stays flat.** What was already tried for a caller is forgotten an hour
  later, and capped at 5,000 callers regardless.
- **Requests are handled side by side**, over a small shared set of database
  connections, so one slow lookup cannot make every other waiting caller queue
  behind it.
- **It starts even when the database does not.** Refusing to start would leave the
  port dead, which is the problem this exists to fix.
- **It answers on both loopback addresses.** Both callers ask for "localhost",
  which can mean either one, and the wrong guess is a refused connection.
- **No login by default.** It listens on the loopback address only, so nothing off
  the machine can reach it. The switch and the event manager send different
  tokens, so if `AUTH_TOKENS` is filled in it has to list both or one of them
  stops working.
