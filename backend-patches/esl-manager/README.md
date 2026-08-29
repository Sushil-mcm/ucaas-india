# esl-manager — live queue figures

**Not applied. Nothing on 142.93.121.121 has been changed.**

Adds the two numbers three built-but-inert features are waiting on: how many callers are
waiting in a queue right now, and how long a call in it usually takes.

See `docs/queue-stats-backend-plan.md` for why this lives here rather than in `default-api`.

## What it unblocks

Already built in the website, saving correctly, doing nothing:

- place in the line announcement
- expected wait announcement
- both callback offer thresholds ("once this many are waiting", "once the wait passes")

Plus live figures on the queue list and in Monitoring.

## Files

| File | Change |
|---|---|
| `src/controllers/QueueStatsController.ts` | **new**, self-contained, no imports from the rest of the service |
| `src/controllers/CallCenterController.ts` | 4 lines added at one existing dispatch point |
| `src/app.ts` | 2 read-only endpoints |

## Edit 1 — `CallCenterController.ts`

At the top:

```ts
import { QueueStatsController } from "./QueueStatsController";
```

In `eslCallcenterEvent`, in the existing `if (isValidEvent) { ... }` block, alongside the
`bridge-failed` / `bridge-agent-start` / `bridge-agent-end` branches already there:

```ts
// Live queue figures. Wrapped inside QueueStatsController, which never throws —
// a statistics counter must not be able to drop a real call.
if (ccEvent.call_type === "queue" && ccEvent.type === "call-start") {
  QueueStatsController.onQueueStart(ccEvent.queue, ccEvent.call_uuid);
} else if (ccEvent.type === "member-queue-end") {
  QueueStatsController.onQueueEnd(ccEvent.call_uuid);
} else if (ccEvent.type === "bridge-agent-start") {
  QueueStatsController.onAgentOnCall(ccEvent.queue, ccEvent.agentName, ccEvent.call_uuid);
} else if (ccEvent.type === "bridge-agent-end" || ccEvent.type === "bridge-failed") {
  QueueStatsController.onAgentAvailable(ccEvent.queue, ccEvent.agentName);
}
```

Note `member-queue-start` is already rewritten to `type: "call-start"` with
`call_type: "queue"` before this point, which is why the first branch tests both.

`member-queue-end` does **not** carry the queue name — only the member uuid. That is why
`QueueStatsController` keeps its own `callUuid -> queue` map.

## Edit 2 — `app.ts`

```ts
import { QueueStatsController } from "./controllers/QueueStatsController";

app.get("/queue-stats", (_req, res) => res.json(QueueStatsController.allStats()));
app.get("/queue-stats/:queue", (req, res) =>
  res.json(QueueStatsController.statsFor(req.params.queue)),
);
```

Both are read-only. The service already listens on port 5555.

## The field that matters

`trustworthy`. It is false when there are too few completed calls to average, or when
nobody is on duty. **When it is false the caller must hear nothing.** An estimate given in
those conditions is worse than silence — someone told "about two minutes" who then waits
twenty is more annoyed than someone told nothing at all.

`statsFor` also returns `reason`, so a quiet queue can be explained rather than guessed at.

## Safety

This runs in the live call path, so:

- **Nothing throws.** Every entry point is wrapped. The failure mode is "no figures", never
  "no call". A failed `statsFor` returns `trustworthy: false`, never a confident zero.
- **Memory is bounded.** Waiting lists cap at 500 per queue and entries older than 4 hours
  are pruned; the handle-time window is fixed at 50 calls.
- **Abandoned calls are not counted as handle time.** Counting them as zero would drag the
  average down and make every estimate optimistic — the direction that misleads a caller.
- **State is in memory and does not survive a restart.** After a restart the figures are
  untrustworthy until enough calls complete, which the `trustworthy` flag already reports.
  Persisting it is possible but adds risk for little gain; a restart is rare and the quiet
  period is short.

## Before it goes live

1. Someone who owns `esl-manager` reviews it — it is on the call path.
2. Watch memory across a busy day; the caps should hold it flat.
3. Compare `waiting` against what the switch reports, on a real queue, before the website
   is pointed at it.

## Then, in the website

Point the announcements and the callback thresholds at these figures, and take off the
"saved, but not in effect yet" labels **in the same change that makes each one real**.
