# Call Queues — Deep Build Audit

**Feature:** Admin Settings → Phone System → Call queues
**Live URL:** https://unified.mycountrymobile.com/admin-settings/phone/queues
**Deploy path:** `/root/mycountrymobile-web` (serves unified.mycountrymobile.com)
**Audit date:** 2026-09-01
**Method:** Full read of the queue feature source, its schema, its routing engine, and the save/load path. No backend source was read (the `api.mycountrymobile.com` service lives outside this repo); the backend contract below is inferred from the payload builder and its in-code comments.

---

## 1. TL;DR

The Call Queues feature is **large and mostly built on the frontend**, but it is split into two clearly-marked halves:

- **LIVE** — captured in the form, sent to the backend, and acted on by the call path: identity, hours, failover, recording, ring strategy, members/manager, dispositions, greetings/media, wrap-up *timer*, call script.
- **STORED-ONLY ("coming soon")** — captured and shown on screen, but **deliberately NOT sent to the backend** because the queue service rejects unknown keys: the *waiting experience* (position/wait announcements, callback), *after-call intelligence* (wrap-up prompt mode, last-agent routing, service-level target), and *ring widening/escalation* (tiers + minimum rating). Every one of these controls is labelled "coming soon" in the UI on purpose.

A full **automatic-call-distribution decision engine** (`src/lib/acd-routing.ts`) already exists as a pure, test-ready function that models widening, ratings, duty states, and give-up — but it is currently consumed **only by the on-screen preview**, not by the actual call path. It is the blueprint for making the "coming soon" controls real.

---

## 2. File map

```
src/pages/admin-settings/phone-systems/call-queue/
├── index.tsx                     (396)  List page: table, search, site filter, delete, RBAC gating
├── queue-tabs.ts                 (45)   URL <-> tab mapping (single source of truth)
├── constant.ts                   (346)  All defaults, limits, strategy list, "coming soon" config
├── schema.ts                     (283)  Yup validation, one schema object per tab
└── add-edit-call-queue/
    ├── index.tsx                 (838)  Editor controller: form, hydrate, payload build, save
    ├── basic-info/index.tsx      (224)  Tab: identity, wait limits, hold toggle, failover
    ├── queue-settings/index.tsx  (220)  Tab: wrap-up time + rule, call script, dispositions
    ├── add-members/index.tsx     (414)  Tab: member picker, manager, per-queue rating
    ├── ring-strategy/index.tsx   (552)  Tab: strategy, escalation, last-agent, service level, waiting, member table
    ├── greetings/index.tsx       (115)  Tab: media/greetings + repeating-message interval
    └── ring-preview.tsx          (143)  Live simulation "what a caller would experience"

src/lib/acd-routing.ts            (263)  Pure ACD decision engine (the routing brain)
```

Related (not part of the editor, but consume queues): `pages/monitoring/call-queue`, `pages/reports/call-logs/queue`, `pages/dashboard/call-dashboard/Call-queue-content`, `pages/performance/queues-activity-tab.tsx`, `components/activity-list/side-drawers/queue-details-view.tsx`.

---

## 3. Navigation & UX model

- **URL-driven, deep-linkable.** The open queue and open tab both live in the path, not React state:
  - `/admin-settings/phone/queues` — list
  - `/admin-settings/phone/queues/new` — create wizard
  - `/admin-settings/phone/queues/:queueId/:tab` — edit a queue on a specific tab
  - Tab slugs: `general`, `settings`, `after-call`, `members`, `routing`, `audio`.
  - Consequence: a queue/tab can be linked in a ticket, survives reload, and the back button steps through the editor. An unknown tab slug is corrected in the address bar rather than silently showing tab 1.
- **Create is a gated wizard, edit is free navigation.** Creating keeps the tab in local state on purpose so `handleTabChange` can refuse to advance until the current tab validates (a pasted deep-link can't jump past required fields). Editing reads the tab from the URL and lets you jump anywhere.
- **List page** shows: Name, Site, Extension, How calls are shared (ring strategy), Hours (24h / per-weekday / not set), Members (avatars, +N overflow modal), Created date, Actions (edit/delete). Search (debounced 1s) + site filter. Add/Edit/Delete buttons are gated by RBAC (`phone_system_action.access.QUEUE` + `.action.{add,edit,delete}`).
- **Defensive read helper** `readQueueSettings` copes with `settings` arriving as either an object or a JSON string depending on endpoint.

---

## 4. Tab-by-tab: what is built

### Tab 1 — General / Basic Information (`general`)
- **Name** (required), **Description** (optional, ≤500 chars, internal-only), **Location/site** (required — sets the clock & hours), **Extension** (auto-generated, regenerate button; locked once the queue exists).
- **Most callers allowed to wait** — number field, 1–500. (Was a 3–30 dropdown; raised to match industry norms. Stored shape kept as `{label,value}`.) **LIVE.**
- **Longest anyone waits (seconds)** — `queue_timeout`, 10–18000s (10s–300min). **LIVE.**
- **Hold callers when no one is on duty** — exposes `leave_room_if_no_agent`, which had been silently hard-defaulted to `true` with no UI (every queue was sending callers away the moment the last agent left, invisibly). Now a toggle. **LIVE.**
- **Failover forward** (`after_max_wait_time`) — where the caller goes when the wait/timeout is exceeded (voicemail / phone / extension etc., via the shared `ForwardingActions` component). Phone numbers validated ≥8 digits. **LIVE.**

### Tab 2 — Settings & Permissions (`settings`)
- Rendered by the shared `CommonSettingPermission` component (same component used by the IVR editor). Covers **operational hours** (24-hour vs per-weekday), **regional** (timezone, country, country code, 12/24h time format), **closed-hours action**, **holidays + holiday action**, **recording** (on-demand + automatic), **display number / masking**, **transcription**, **AI call monitoring**. **LIVE.**
- Notable fix: `holidays_action` is now read from its own field instead of being overwritten by the closed-hours action on every save (the old bug had made all ~20 live queues hold identical closed-hours and holiday actions).

### Tab 3 — After-call / Queue Settings (`after-call`)
- **Wrap-up time** (timer, seconds from `TIME_LIST`). **LIVE.**
- **Wrap-up rule** (prompt mode: Optional / Required-no-limit / Required-then-move-on / Required-forced-close / Agent-requested). **STORED-ONLY — "coming soon"** (UI explicitly says "Saved, but the timer above is still what actually runs"). Existing queues default to `MANDATORY_TIMEOUT`, which matches how a plain timer already behaved.
- **Call Script** — toggle + select of `QUEUE`-type scripts. **LIVE.**
- **Agent Dispositions** — multi-select of agent-type dispositions, with an inline "add disposition" modal. At least one is required by schema. **LIVE.**

### Tab 4 — Members (`members`)
- Member picker table (only lists people at the queue's chosen site), search by name/email/extension, select-all with indeterminate state, per-row checkbox. **LIVE.**
- **Manager** radio — only enable-able for roles in `{MANAGER, ADMIN, SUB-ADMIN, SUPER-ADMIN}`. Fix noted: list display and the manager-eligibility rule now read the *same* role field (`custom_role_data ?? role_data ?? role`); previously a custom-role manager could be shown as MANAGER yet never be selectable. **LIVE.**
- **Rating (0–100), per-queue, per-member** — stored on the member object; everyone defaults to 100 so an unrated queue behaves normally. Feeds the escalation/ratings model. **Carried on the member record**, but only meaningful once escalation is live (below).

### Tab 5 — Routing / Ring Strategy (`routing`)
- **Ring strategy** select (7 options, each with a plain-language "what this costs" description): Ring All, Longest Idle Agent, Round Robin, Top Down, Least Talk Time, Fewest Calls, Random. **LIVE.**
- **Per-member ring time** ("Ring For") — seeded from the company default; Ring-All syncs all members to one time. Top-Down shows an ordered table. **LIVE.**
- **Widening the ring / escalation** — enable toggle, "widen after (seconds)" (15–600), "only ring people rated at least" (0–100), plus a per-member **Tier** column (1/2/3) that appears only when escalation is on. **STORED-ONLY — "coming soon".**
- **Send them back to the person they spoke to last** (last-agent routing: Off / queue-members-only / any-agent, + "only within N hours"). **STORED-ONLY — "coming soon".**
- **Set a target for answering** (service level: percent within seconds, default 80/20). **STORED-ONLY — "coming soon".**
- **While the caller waits** — announce position, announce wait time, offer callback (+ offer-after-callers, offer-after-minutes, max attempts, retry-after-minutes, expires-after-hours). **STORED-ONLY — "coming soon".**
- **Ring preview** — see §6.

### Tab 6 — Media / Greetings (`audio`)
- Greeting selectors (via shared `CommonGreetingNotification`): **welcome** (business hour), **on-hold music**, **ring tone**, **waiting** (waiting / no-agent / all-busy), **repeating message (delay)**; an "after hour" waiting slot appears when hours are per-weekday. **LIVE** (all mapped into `settings.media` in the payload).
- **Repeating-message interval** (seconds, 30–600) appears only when the repeating message is enabled. The interval field is marked **"coming soon"** (nothing plays it on a timer yet), though the media selection itself is sent.

---

## 5. Data model & the save/load path (`add-edit-call-queue/index.tsx`)

- **Initial values:** `CALL_QUEUE_INIITAL_VALUES` in `constant.ts` — the full nested shape (settings.ring_strategy, operational_hours, recording, display_number, waiting, after_call, escalation; greetings.*; members; agentDisposition).
- **Load (edit):** `callQueueInfo({uuid})` → `setValue(...)` hydrates every field. "Coming soon" blocks (`waiting`, `after_call`, `escalation`) are **merged over defaults** so a queue saved before those existed opens with sensible values rather than `undefined`.
- **Save (`onSubmit`):** builds `settings` **field-by-field from a whitelist**, then:
  - **Carry-through guard:** any stored key the builder does *not* rebuild is copied back from `queueInfo.settings` so a newly-added backend key isn't dropped on the next save. (Written after the `holidays_action` data-loss incident.)
  - **Members** de-duplicated by `user_uuid`; each member's `timeout` is seeded from its ring time / company default.
  - **Payload:** `{ name, extension, description, site{name,site_uuid}, settings, members, manager, script, agentDisposition, uuid? }` → `upsertCallQueue`.
  - On success, emits a socket `update-queue` event to the switch and invalidates the list query.

### The backend contract (critical)
The in-code comment is explicit: the queue save is forwarded to the service that owns queues, and **its settings schema accepts only**:
`operational_hours, recording, display_number, ai_call_monitoring, transcription, wrapup_time, skills, ring_strategy, leave_room_if_no_agent, media`.
It **rejects unknown keys**, so `waiting`, `after_call`, and `escalation` are **deliberately excluded from the payload** — including them would fail the whole save (an admin renaming a queue would get an unexplained error). This is why those three feature groups are "stored-only" in the UI sense: the UI stores them in form state and would persist them, but the current backend will not accept them.

---

## 6. The ACD routing engine (`src/lib/acd-routing.ts`) + preview

- A **pure decision function** `decideAcdRing({rules, agents, waitedSeconds, now})` → `{ring, ringsTogether, step, changesInSeconds, reason}`. No network, no switch — testable in isolation and callable by "whatever ends up placing the call (dialplan, API, or a screen)."
- Models the parts most systems get wrong:
  - **Five duty states** (`available`, `busy`, `on-a-call`, `wrapping-up`, `off-duty`) — only `available` (and wrap-up once elapsed) is ringable.
  - **Cumulative widening steps** — later steps *add* people, never swap them out.
  - **Per-queue ratings** with cumulative thresholds (widening can only ever admit more people).
  - **Ring orders:** all-at-once / longest-idle-first / highest-rated-first / fewest-calls-first / in-order.
  - **Give-up** at `giveUpAfterSeconds` → failover.
  - **`changesInSeconds`** so a caller is re-evaluated exactly when something changes (next step, wrap-up ends, give-up) instead of polling.
  - Human-readable `reason` strings for each outcome.
  - `pickQueueForAgent` — when an agent is in several queues, highest priority wins, longest wait breaks ties.
- **`ring-preview.tsx`** walks a caller second-by-second **through this same function**, so the on-screen "What a caller would experience" cannot drift from real behaviour. It assumes everyone is free and says so.
- **Gap:** this engine is currently wired **only to the preview**. The real call path (FreeSWITCH dialplan / the queue backend) does not yet call it. Making escalation/last-agent/service-level/waiting real means teaching the backend to (a) accept those settings keys and (b) execute this model (needs a queue-depth counter, rolling handle time, and a callback scheduler — none of which exist yet, per the code comments).

---

## 7. Validation (`schema.ts`)

Per-tab Yup schemas (indexed by tab):
- **General:** name required; extension required; description 10–500; site required; script required when script enabled; `queue_timeout` 10–18000; max waiting callers 1–500; failover type/value required with phone ≥8 digits.
- **Hours:** type required; closed-hour forward value required/validated for weekly + phone; regional country/code/timezone required.
- **After-call:** `wrapup_time` 0–3600; script conditional; **at least one agent disposition required**.
- **Greetings:** each greeting required only when its own toggle is enabled (waiting greeting always required).
- **Members:** manager required; ≥1 member required.
- **Ring strategy:** strategy value required.

---

## 8. API endpoints (`services/api/routes.tsx`, base `https://api.mycountrymobile.com`)

| Purpose | URL |
|---|---|
| List queues | `/api/call-queue/list` |
| Create/update | `/api/call-queue/save` |
| Delete | `/api/call-queue/remove` |
| Queue detail | `/api/call-queue/info` |
| Role-based list (monitoring) | `/api/call-queue/role-based-queue` |
| Agent availability toggle | `/api/call-queue/agent/status` |
| Queue involvement | `/api/call-queue/queue-involvement` |
| Notes list | `/api/call-queue/notes/list` |
| Disposition save | `/api/call-queue/notes-disposition/save` |
| Report list | `/api/tenant/report/call-queue/list` |
| Report detail | `/api/tenant/report/call-queue` |

Real-time: socket `update-queue` emitted on save; `wss://socket.mycountrymobile.com/` for notifications.

---

## 9. Build status matrix

| Capability | Captured in UI | Validated | Sent to backend | Acted on by call path | Status |
|---|---|---|---|---|---|
| Name / description / site / extension | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Max waiting callers (1–500) | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Queue timeout (10–18000s) | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Hold when no agent (`leave_room_if_no_agent`) | ✅ | — | ✅ | ✅ | **LIVE** (newly exposed) |
| Failover forward | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Operational hours / regional / closed-hours | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Holidays + holiday action | ✅ | ✅ | ✅ | ✅ | **LIVE** (bug fixed) |
| Recording / display number / masking | ✅ | — | ✅ | ✅ | **LIVE** |
| Transcription / AI call monitoring | ✅ | — | ✅ | ✅ | **LIVE** |
| Wrap-up **time** (timer) | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Ring strategy (7 modes) | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Per-member ring time | ✅ | — | ✅ | ✅ | **LIVE** |
| Members / manager | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Agent dispositions | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Greetings/media (welcome/hold/ring/waiting/delay) | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Call script | ✅ | ✅ | ✅ | ✅ | **LIVE** |
| Per-member rating (0–100) | ✅ | — | ✅ (on member) | ❌ | **STORED** (needs engine) |
| Wrap-up **rule** (prompt mode) | ✅ | — | ❌ (stripped) | ❌ | **COMING SOON** |
| Escalation / widening + tiers | ✅ | — | ❌ (stripped) | ❌ | **COMING SOON** |
| Last-agent routing | ✅ | — | ❌ (stripped) | ❌ | **COMING SOON** |
| Service-level target | ✅ | — | ❌ (stripped) | ❌ | **COMING SOON** |
| Announce position / wait time | ✅ | — | ❌ (stripped) | ❌ | **COMING SOON** |
| Callback offer (+ all sub-settings) | ✅ | — | ❌ (stripped) | ❌ | **COMING SOON** |
| Repeating-message interval | ✅ | — | media sent; interval not executed | ❌ | **COMING SOON** |
| ACD engine (`acd-routing.ts`) | n/a | n/a | n/a | ❌ preview only | **BUILT, NOT WIRED** |

---

## 10. Notable fixes already made (from code comments)
1. **`holidays_action` data loss** — was overwritten by closed-hours action on every save; had corrupted all ~20 live queues. Now read from its own field.
2. **`leave_room_if_no_agent` invisible** — hard-defaulted true, no UI; every queue was dropping callers when the last agent left. Now a toggle.
3. **Manager not selectable** — role display and eligibility read different fields; a custom-role manager could show as MANAGER yet never be selectable. Unified on one `roleOf()`.
4. **Member matching** — matching on id alone could swallow adds when a row lacked an id; now matched on extension (always present).
5. **Max waiting callers** — old 3–30 dropdown silently capped queues an order of magnitude below industry norms; now a 1–500 number field.
6. **Carry-through guard** on save so future backend keys aren't dropped.

## 11. Risks / cleanup worth flagging
- **Debug logging left in production `onSubmit`/hydrate**: several `console.info` / `console.log` calls in `add-edit-call-queue/index.tsx` (e.g. logging country name, manager label/value, ring-strategy label). Low risk but should be removed.
- **"Coming soon" honesty depends on the label staying attached.** The whole design leans on every stored-only control being visibly marked. When each feature is made real, the label and the payload exclusion must be lifted in the *same* change — a control that looks live but isn't is worse than none.
- **Ratings sent but unused.** Per-member rating rides along in the members payload today but nothing consumes it until the escalation engine is wired; confirm the backend tolerates the extra field.
- **No backend source in this repo.** Confirming exactly which keys the queue service accepts (and wiring `acd-routing.ts` into the dialplan) requires the `api.mycountrymobile.com` backend, which is outside `/root/mycountrymobile-web`.

## 12. Recommended next steps (to close the "coming soon" gap)
1. **Backend: accept the three key groups** (`waiting`, `after_call`, `escalation`) in the queue settings schema, then remove them from the payload exclusion.
2. **Wire `acd-routing.ts` into the call path** (or port its logic) so widening, ratings, last-agent, and give-up actually execute. It's already the shared brain behind the preview.
3. **Build the three missing runtime primitives** the comments call out: a live queue-depth counter, a rolling handle-time metric, and a callback scheduler — prerequisites for announcements, service-level, and callback.
4. **Enforce wrap-up rule** in the agent client (the timer already runs; the mode needs enforcing).
5. **Remove debug `console.*`** from the editor.
6. Once each is real, **drop its "coming soon" badge in the same commit.**
