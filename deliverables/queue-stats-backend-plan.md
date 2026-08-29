# Making queue behaviour real — where the counter should live

Investigated 2026-08-29 on the live backend. **Nothing on the backend was changed.**
Reference material only. Do not put a rival's name into product UI text or comments.

---

## 1. Two corrections to what I said earlier

**I said I could not reach the backend. That was wrong.** My note said SSH was blocked;
it is not. The machine is **142.93.121.121** — SSH alias `mcm-new`, hostname `UCaaS-Live`.
It runs all fourteen APIs under `/var/www/prod`, plus the call path itself under `/opt`
(FreeSWITCH, Kamailio, `esl-manager`).

**`default-api` is not only DID/www.** It serves the call queue API:

```
/api/call-queue/list   -> default-api
/api/call-queue        -> default-api
```

`tenant-api` only has `report/call-queue/list`, which is reporting.

---

## 2. The actual blocker, precisely

`/var/www/prod/default-api` has `config dist documents logs migrations node_modules
package.json public rates seeders` — **no `src/`, no `.git`**. It is compiled output only,
version 1.2.9. Every other service ships TypeScript source.

Both GitHub deploy keys on the web box were tested: `gh-mcm-api` is refused, and
`gh-mcm-api-rw` authenticates as a deploy key for `SMSLocal/frontend-floatchat` — a
different repository. So the source is not reachable that way either.

So: access is fine. **Source is the problem, and only for `default-api`.**

---

## 3. The good news: the counter does not belong in `default-api`

The two numbers everything is waiting on — **how many are waiting right now** and
**how long a call typically takes** — are not database facts. They are live call state.
And the service that already receives that state has full source.

`/opt/esl-manager` — TypeScript, `src/` present, Express server on port 5555, a Redux
store plus JSON file storage. Its `CallCenterController.ts` (1,603 lines) already consumes
FreeSWITCH `mod_callcenter` events, including exactly the ones we need:

| Event it already handles | What it tells us |
|---|---|
| `member-queue-start` | a caller joined the queue |
| `member-queue-end` | that caller left — answered or gave up |
| `bridge-agent-start` | an agent picked up |
| `bridge-agent-end` | that call finished |
| `bridge-failed` | nobody answered |

It already calls `setAgentAvailable`, `setAgentOnCall` and
`recordBridgeFailureAsNoAnswer`, so agent availability is tracked too.

**This is not a new integration. It is aggregation of a stream the service already reads.**

---

## 4. Proposed design

### 4.1 A queue-stats aggregator inside `esl-manager`

Keep, per queue, in the existing store:

```
queueStats[queueUuid] = {
  waiting: [ { callUuid, joinedAt } ],        // ordered, so position is just the index
  recentHandleSeconds: number[],              // rolling window of the last N completed calls
  agentsAvailable: number,
}
```

- `member-queue-start` → push onto `waiting`
- `member-queue-end` → remove it; if it was answered, push the handle time onto the window
- `bridge-agent-start` / `end` → maintain `agentsAvailable`

Rolling, not all-time. A queue that was slow last month should not poison today's estimate.

### 4.2 One read-only endpoint

```
GET /queue-stats/:queueUuid
{
  waiting: 7,
  agentsAvailable: 2,
  averageHandleSeconds: 214,
  estimatedWaitSeconds: 749,
  trustworthy: true
}
```

`estimatedWaitSeconds ≈ (position × averageHandleSeconds) ÷ max(1, agentsAvailable)`.

**`trustworthy` is the important field.** It is false when no agent is on duty, when the
window holds too few calls to average, or when the estimate is swinging. The interface must
say nothing at all rather than announce a number that is wrong — that was the rule when the
announcements were designed and it has to survive into the data layer, or the caller hears
"about two minutes" and waits twenty.

### 4.3 What this unblocks immediately

- **Wait announcements** (place in line, expected wait) — already built, waiting on this
- **The callback offer thresholds** — "once this many are waiting", "once the wait passes"
- **Live queue figures** on the queue list and in Monitoring

Callback itself still needs a store and a scheduler. Those can also live here, or in a small
service of their own, but they are a second step — the counter is the thing that is blocking
three separate features at once.

---

## 5. Risk, and why I stopped

`esl-manager` is **on the live call path**. It handles events for calls in progress. A
read-only aggregator is low risk, but not zero: it adds work to a hot event handler and
holds state per queue in memory.

The standing permission to ship without asking covers **the website**. It does not cover the
API or the servers. So this was investigated only, and nothing on `142.93.121.121` was
modified.

Before any of it goes in, it wants: a bound on the rolling window so memory cannot grow
without limit, a decision on whether stats survive a restart, and someone who owns that
service agreeing to the change.

---

## 6. Recommendation

1. **Build the aggregator in `esl-manager`.** It is the right home, the source is there, and
   the events are already arriving.
2. **Do not touch `default-api`** until its source turns up. Nothing here needs it.
3. **Chase the `default-api` source separately** — ask whoever deployed 1.2.9. It is a
   standing risk well beyond queues: the service that owns login, company, users, roles,
   numbers and sites cannot currently be fixed or audited.
4. **Stop adding inert settings to the queue panel.** Eight now say "saved, but not in effect
   yet". Each is honest alone; together they read as a product that promises more than it
   does. The next queue work should make an existing setting real, not add a ninth.
