# queue-agent-service — who should this queued call ring?

**Not applied. Nothing on any server has been changed, and nothing has been
written to any database.**

When somebody calls a queue, the switch answers, plays hold music, and asks a
service on `localhost:9006` which phone to ring. It asks again every couple of
seconds until somebody picks up or the caller gives up.

Nothing has ever been listening on port 9006. The script that asks has been on
the switch all along, asking into thin air. This is the service it has been
asking.

It reads the queue records the product actually writes. When an admin edits a
queue on the website, that is saved to MongoDB; this reads the same place. There
is no copy, no sync, and no second version of the truth to drift.

Python 3, standard library plus the MongoDB driver, one JSON line per log entry —
the same house style as the dialplan service already on that machine.

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
| `strategy` | How the queue rings. Sent already tidied up by the switch: `ring-all`, `top-down`, `longest-idle-agent`, `agent-with-least-talk-time`, `agent-with-fewest-calls`, `random`, or anything a queue has been set to. If it is missing, the queue's own saved setting is used instead. |
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
the other reason every database call in here has a hard one.

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

## Why it reads MongoDB directly

The product owner's decision is that MongoDB is the one true copy of queues,
agents and rotas. Three ways to read it were open. This takes the first, and here
is what each was measured against.

**a) Read MongoDB directly, using the system database driver. Chosen.**
- The switch can already reach the database. Checked from the switch itself: the
  address resolves, and port 27017 answers. **No firewall change is needed.**
- The driver is a system package away — `python3-pymongo` is in the mirror the
  switch is already configured against. There is no `pip3` on that machine and
  none is needed.
- The records are already indexed for exactly this question: `agents` carries
  indexes on `queue_uuid`, on `name`, and a combined one on
  `queue_uuid + status + state`; `tiers` carries `queue + level + position`. The
  call-path lookup is a single indexed read.
- One prerequisite, on one machine, that a human applies deliberately.

**b) Ask the service that owns the records over HTTP. Rejected, twice over.**
- `campaign-api` has **no queue endpoints at all**. Searching its bundle for any
  route with "queue" in it returns nothing. One would have to be written into a
  compiled bundle that ships without source.
- The switch **cannot reach it anyway**. Checked from the switch: its port is
  closed from there, so this would also need a firewall change.
- Even if both were fixed, it would put a second service's uptime, and an extra
  network hop, in front of a caller on hold.

**c) Copy MongoDB into MySQL on a timer and keep the old reader. Rejected.**
- It puts a stale window on the call path: an agent who just came on duty is not
  reachable until the next copy runs.
- It is a new moving part that can fail quietly, and its failure looks exactly
  like "nobody is free", which is the answer that must always be trustworthy.
- Worst of all it recreates two sources of truth, which is the problem being
  solved.

---

## What it reads

Database `mycountrymobile_db` in MongoDB — the same connection line the dialplan
service on the switch already has in its settings file.

**`agents`** — one record per person per queue.

| Field | Used for |
|---|---|
| `queue_uuid` | Which queue they are in. A record id, not text — this is the lookup on the call path, and it is indexed. |
| `name`, `contact`, `user_detail` | Sent to the switch as above. |
| `status`, `state` | Whether they can take a call right now. |
| `last_bridge_end`, with the queue's wrap-up time | Whether they are still writing up the last call. |
| `max_no_answer`, `no_answer_count`, `last_status_change` | Whether their phone has been left ringing too often. |
| `last_bridge_end`, `talk_time`, `calls_answered`, `last_offered_call` | Deciding whose turn it is, per strategy. |

**`queues`** — the queue's own record. Two things are read from it that the switch
does not send: how long somebody spends writing up notes
(`settings.wrapup_time`, falling back to `wrap_seconds`), and the ring order to
use when the switch names none (`settings.ring_strategy.value`).

**`tiers`** — who is in which ring round, and in what order within it
(`queue`, `agent`, `level`, `position`). Optional: with no rota records
everybody in the queue is treated as equal, which is how a simple queue behaves.

### Wrap-up time is on the queue, not the person

Worth knowing, because it is easy to get wrong: **every agent record on the
platform holds `wrap_up_time: 0`**, and the real figure — 30 seconds — is saved
against the queue. A service that read only the agent record would give nobody a
moment to finish their notes and would ring them again immediately. This reads
the agent's own figure first and falls back to the queue's, so a person with
their own setting keeps it.

### Being free, and being on duty

Being free is not the same as being on duty for a queue. Somebody can be at their
desk and deliberately not taking queue calls. The platform records that, and this
service reads it as five states, matching `src/lib/acd-routing.ts` in the website:

| Stored `status` / `state` | Read as | Rings? |
|---|---|---|
| `Available` + `Waiting` / `Idle` | available | yes |
| `Available`, last call ended inside the wrap-up time | wrapping-up | no, until the wrap-up is up |
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
   and no filtering is done. The nearest thing is `user_detail.skills`, on 16 of
   the 37 agent records, and it holds language tags such as `["en"]` — not a
   score. There is even an index prepared for filtering on it, but the queue
   script never sends a skill to filter by, so there is nothing to act on. If
   ratings are wanted, they need somewhere to live first.

2. **How long each round lasts.** The website takes a wait per round. That is not
   stored per queue anywhere, so this uses one setting, `ACD_STEP_SECONDS`, for
   every queue. Rounds come from `tiers.level`; where there is only one level —
   which is every queue today — this does nothing at all.

3. **Ring order.** The website's `fewest-calls-first` and `in-order` become the
   switch's `agent-with-fewest-calls` and `top-down`. The switch also has
   `agent-with-least-talk-time`, `longest-idle-agent`, `round-robin` and `random`,
   which the website has no name for. All are handled here. Every queue on the
   platform today is set to `ring-all`.

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
python3 tests/queue_agent_service_test.py      # 60 tests, no driver, no database, no network
```

The tests fake the database out completely and cover the reply shapes against the
contract above, the duty-state rules, the wrap-up time coming from the queue, each
ring order, the widening rounds, the exact queries put to the database — including
that a queue is looked up by record id and not by text — and the promise that a
broken database still answers cleanly.

To run the service by hand:

```bash
MONGODB_URI='…' MONGODB_DATABASE=mycountrymobile_db python3 queue_agent_service.py
```

Settings are all in `env.example`, with what each one is for.

---

## What a human must do to deploy it

There is a script, `apply.sh`, that does steps 2 to 6 and puts the old state back
if the service does not come up healthy. **It has not been run**, and it
deliberately does **not** install the driver — it stops and tells you the command.
By hand, on the switch (`mcm-switch`, 167.99.4.91):

1. **Install the database driver. This is the one prerequisite, and the only
   change to the machine itself.** There is no `pip3` on that box, so use the
   system package:
   ```bash
   ssh mcm-switch "apt-get install -y python3-pymongo python3-dnspython"
   ```
   - `python3-pymongo` is the driver. Version 3.11 from the mirror is fine; this
     service uses nothing newer.
   - `python3-dnspython` is only needed if the connection line begins
     `mongodb+srv://`, because the driver then has to look the servers up first.
     The line already on the switch does. If you would rather install one package
     than two, `env.example` shows the plain `mongodb://` form to use instead.
   - **No firewall change is needed.** The switch already reaches the database on
     port 27017; this was checked from the switch itself.

2. **Copy the service.**
   ```bash
   ssh mcm-switch "mkdir -p /opt/queue-agent-service"
   scp queue_agent_service.py mcm-switch:/opt/queue-agent-service/
   ```

3. **Write the settings file.** Copy the connection line from the dialplan service
   already running, rather than typing it out, so the two cannot point at
   different databases:
   ```bash
   ssh mcm-switch "grep -E '^MONGODB_(URI|DATABASE)=' /opt/fs-xml-api-1.2.5/.env > /opt/queue-agent-service/.env
     printf 'HTTP_LISTEN_ADDR=127.0.0.1:9006\nHTTP_LISTEN_HOST6=::1\nBASE_DOMAIN=mycountrymobile.com\nLOG_LEVEL=info\nDB_TIMEOUT_MS=2000\n' >> /opt/queue-agent-service/.env
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
   ssh mcm-switch "journalctl -u queue-agent-service -n 20 --no-pager | grep -i mongodb"
   ```
   The log line to look for is `MongoDB connection verified OK`, with a count of
   queues and agents beside it. That is the proof it reached the records, not just
   that the port is open. If the driver is missing, or the connection line is
   wrong, the service still starts and still answers — it says so in the log every
   time, and every queue comes back as nobody free.

6. **Watch one real queued call.**
   ```bash
   ssh mcm-switch "journalctl -u queue-agent-service -f"
   ```
   Every ask logs the queue, how long the caller has waited, how many people are in
   the queue, how many were offered, how long it took, and one line of plain
   English saying why.

7. **Do the same on the API box** (`mcm-new`, 142.93.121.121), starting again from
   step 1. The event manager runs on both machines and each asks for this service
   on its own machine, so agent status changes on that box only get recorded if it
   is running there too.

**Nothing needs to be done to any database.** No table to create, no data to
migrate, no index to add — the records and their indexes are already there.
`sql/001-queue-tables.DO-NOT-RUN.sql` is a route not taken, kept only so nobody
finds the empty MySQL `agents` table and helpfully fills it in.

To undo any of it: `bash rollback.sh mcm-switch` stops the service and switches it
off, which returns the machine to exactly what it was — nothing on port 9006. The
driver package can be left installed; nothing else uses it and nothing is harmed
by it.

---

## Before this changes a real call

One thing is still in the way, and it is not inside this service.

**Queued calls do not reach the switch's queue script at all.** The service
answering dialplan lookups, `fs-xml-api`, is running
`/opt/fs-xml-api-1.2.5/dialplan_service.py`, which handles two kinds of inbound
call handling: ring an extension, or go to voicemail. A number set to a **queue**
falls through to "unhandled route type" and the call is not answered. Nothing in
it sets `X-Queue`, `cc_ring_strategy`, `cc_queue_timeout` or the other settings
the queue script reads, and no dialplan on the box mentions
`callcenter-queue.lua`. That gap is bigger than this one and needs its own piece
of work.

Deploying this service is still worth doing first: it is safe, it changes nothing
about how calls behave today, and it means the port is answering — with the real
queue records behind it — the moment the dialplan side is fixed.

---

## Safety

This is on the live call path, so:

- **Nothing throws into a call.** Every request is wrapped. Any unexpected failure
  is logged and answered as an empty agent list, which the switch reads as "nobody
  is free" and handles by keeping the caller on hold.
- **Everything has a hard time limit.** Choosing a server, connecting, and reading
  are each capped at `DB_TIMEOUT_MS` (two seconds by default). A database that
  stops answering costs a caller one two-second pause and then hold music — it
  cannot hang the call, which matters because the switch sets no limit of its own
  on this request.
- **It starts even when the database, or the driver, is missing.** It says so in
  the log on every request and answers "nobody is free". Refusing to start would
  leave the port dead, which is the problem this exists to fix.
- **Repeated questions are answered from memory** for two seconds. A queue full of
  waiting callers all ask the same question every couple of seconds; without this
  they would each be a database query.
- **Memory stays flat.** What was already tried for a caller is forgotten an hour
  later, and capped at 5,000 callers regardless.
- **Requests are handled side by side**, over the driver's own shared connections,
  so one slow lookup cannot make every other waiting caller queue behind it.
- **Reads are narrow.** Only the fields that are used are fetched, and every
  lookup uses an index that already exists.
- **Only agent records are ever written to**, and only the counters and status
  fields the event manager reports. Queues and rotas are read and never touched.
- **It answers on both loopback addresses.** Both callers ask for "localhost",
  which can mean either one, and the wrong guess is a refused connection.
- **No login by default.** It listens on the loopback address only, so nothing off
  the machine can reach it. The switch and the event manager send different
  tokens, so if `AUTH_TOKENS` is filled in it has to list both or one of them
  stops working.
