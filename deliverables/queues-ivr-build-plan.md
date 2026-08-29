# Call Queues + IVR — build plan

What to build, what to improve, the logic behind each, and the URL structure.
Reference material only. **Do not put a rival's name into product UI text or comments.**

Based on `docs/call-queues-and-ivr-sheet.md` (the gap sheet).
Nothing here is built yet. Deploy only on your sign-off.

---

## Part 0 — The six rules we are borrowing

Every decision below follows from one of these. They are the *logic*, not the features.

1. **Everything has an address.** A queue, a tab inside a queue, an IVR, a single menu key.
   If you cannot link to it, it does not exist for support, for docs, or for the back button.
2. **Config is data, not branches.** "Block international" is a classification rule, not an
   `if` in the dial path. "Closed on Sunday" is a schedule record, not a weekday check.
3. **Versioning comes before the editor.** A flow is source code. Draft, publish, roll back,
   and lock — built in from the start, never bolted on.
4. **Separate what happens from when it happens.** The number points at a schedule plus
   three flows. Open / closed / holiday is never an `if` inside the menu.
5. **Widen, don't fail.** Routing degrades gracefully — ring the best people, then more
   people, then drop a requirement. Never all-or-nothing.
6. **One screen, one permission.** Named `domain:entity:action`, with "edit me" separate
   from "edit anyone".

---

## Part 1 — URL structure

### 1.1 How they do it

A real Genesys admin URL:

```
/directory/#/admin/organization/queues/<QUEUE-ID>/general
                   └ category ┘ └ coll ┘ └ id ┘   └ tab ┘
```

Two things to take from it:

- **The entity id is in the path.** One queue = one address.
- **The tab is in the path too.** You can send someone straight to a queue's routing tab.

Their nav grouping is `Admin → Contact Center → Queues` and
`Admin → Routing → Message Routing`, with flows living in a separate Architect app.

### 1.2 What we have

Both pages hold everything in React state:

```
/admin-settings/phone/call-queue    → list + SideDrawer(useState) + 6 tabs(useState)
/admin-settings/phone/ivr-menus     → list + SideDrawer(useState) + 4 tabs(useState)
```

So there is **no URL for a single queue, and no URL for a tab**. Same disease as the
company settings pages. You cannot bookmark a queue, link one in a ticket, reload mid-edit,
or use the back button between tabs.

### 1.3 Proposed

```
/admin-settings/phone/queues                          list
/admin-settings/phone/queues/new                      create
/admin-settings/phone/queues/:queueId                 → redirect to /general
/admin-settings/phone/queues/:queueId/general         name, extension, site, description
/admin-settings/phone/queues/:queueId/routing         ring strategy, skills, timeouts, caps
/admin-settings/phone/queues/:queueId/members         members and manager
/admin-settings/phone/queues/:queueId/audio           greetings and hold music
/admin-settings/phone/queues/:queueId/hours           open hours, holidays, closed action
/admin-settings/phone/queues/:queueId/after-call      wrap-up, dispositions, script
/admin-settings/phone/queues/:queueId/recording       recording, transcription, number display

/admin-settings/phone/ivr                             list
/admin-settings/phone/ivr/new                         create
/admin-settings/phone/ivr/:ivrId                      → redirect to /general
/admin-settings/phone/ivr/:ivrId/general              name, extension, site, language
/admin-settings/phone/ivr/:ivrId/keys                 key presses, # and *, timeout, failure
/admin-settings/phone/ivr/:ivrId/audio                welcome, menu, invalid greetings
/admin-settings/phone/ivr/:ivrId/hours                open, closed, holiday paths
/admin-settings/phone/ivr/:ivrId/versions             draft, published, history, rollback
```

Tab slugs map to today's tabs:

| Today | Slug |
|---|---|
| Basic Information | `general` |
| Ring Strategy | `routing` |
| Add Member | `members` |
| Media | `audio` |
| Settings & Permissions | split into `hours` + `recording` |
| Queue Settings | `after-call` |
| Key Presses (IVR) | `keys` |

Redirects, kept permanently:

```
/admin-settings/phone/call-queue  -> /admin-settings/phone/queues
/admin-settings/phone/ivr-menus   -> /admin-settings/phone/ivr
```

**Naming note.** `call-queue` is singular for a collection and `ivr-menus` says "menus"
when the thing is an IVR. Both change here. This is the one part that is painful to undo
once people bookmark it, so settle it before any route lands.

---

## Part 2 — What to improve (things we already have)

### I1. Make queues and IVRs addressable
**Now:** SideDrawer + tabs in `useState`.
**Their logic:** the id and the tab both live in the path.
**Build:** replace the drawer with real routes from 1.3. Keep the side-panel look if you
like it — just open it *from* the URL so it survives a reload.
**Edge cases:** an unsaved-changes prompt on tab change; an unknown `:queueId` shows a
not-found state, not a blank drawer; `:tab` that is not recognised redirects to `general`.
**Front-end only.** No backend needed.

### I2. Raise the caps
**Now:** max waiting callers **30**; max wait **60 minutes**.
**Reference:** 500–1,000 callers; up to 300 minutes.
**Build:** raise to 500 callers and 300 minutes. Replace the fixed dropdown list
(`MAX_WAITING_CALLERS` is a hand-written array of 3–30) with a number field plus validation.
**Why it matters:** a 30-caller ceiling silently drops callers on any busy morning, and
nothing in the UI explains that it happened.
**Needs backend:** the queue must actually hold that many. Confirm before raising the UI,
or we will promise 500 and drop at 30.

### I3. Wrap-up: one timer → five modes
**Now:** `wrapup_time`, 0–3600 seconds.
**Their logic:** the *prompt mode* is the setting, and the timer is secondary —
`MANDATORY`, `OPTIONAL`, `MANDATORY_TIMEOUT`, `MANDATORY_FORCED_TIMEOUT`, `AGENT_REQUESTED`.
**Build:** add a mode selector; keep the timer, shown only for the timeout modes.
Default `MANDATORY_TIMEOUT` with the current 30 s, so nothing changes for existing queues.
**Why:** "optional wrap-up" and "wrap-up you cannot skip" are different products for a
supervisor, and today we only express the timer.

### I4. Business hours → schedule records
**Now:** `operational_hours.type` is `24_hours` or `weekly`, stored inside the queue.
**Their logic:** a Schedule is its own record with an **RFC 5545 recurrence rule**, and a
Schedule Group holds three buckets: open, closed, holiday.
**Build:** promote schedules to their own objects and let a queue *point* at a schedule
group. Keeps "the sales team's hours" defined once instead of copied into every queue.
**Migration:** convert each queue's inline hours into a private schedule group named after
the queue, so nothing changes on day one.
**Needs backend.**

### I5. Add skills-based as an eighth ring strategy
**Now:** seven strategies, all flat.
**Build:** add `skills-based` once Part 3 B1 lands. Do not remove any of the seven —
we lead Dialpad here and should keep it.

### I6. Finish multi-language on the IVR
**Now:** a `language` field exists and its validation is **commented out** in the schema.
**Build:** either finish it (language drives prompt selection and text-to-speech voice) or
remove the field. A field that is collected and never used is worse than no field.

### I7. Keep, do not touch
Retry and timeout fields on the IVR (already explicit, with limits), the eleven forward
destinations, required dispositions, caller ID masking, per-queue timezone override.
These are ahead of both references. Protect them during the rebuild.

---

## Part 3 — What to build (missing)

### Tier 1 — queues, customer-visible

#### B1. Callback in queue
The biggest single win. Caller keeps their place and hangs up.

**Logic**
- Offer a callback when the queue is under pressure — waiting callers above a threshold
  **or** estimated wait above a threshold. Both configurable per queue, either can be off.
- The offer is made during the waiting loop: "press 1 and we will call you back."
- **The caller's place is kept.** Score by the *original* time they joined, not the time
  they hung up. This is the whole point; get it wrong and the feature is a lie.
- **Agent first.** When the callback reaches the front, reserve and ring an agent, and only
  then dial the customer. Dialling the customer first means they answer to silence.
- Retry policy: N attempts with a growing gap between them, and a maximum age
  (their field is `maxOwnedCallbackHours`). After that, expire it and tell someone.
- Outside opening hours, hold the callback until the queue next opens.
- The caller can cancel by calling back in and pressing a key.

**Data**
```
callback:
  id, queue_id, conversation_id
  caller_number, caller_name
  requested_at, original_enqueued_at        <- scoring uses this
  state: pending | reserved | dialing | connected | failed | expired | cancelled
  attempts, last_attempt_at, next_attempt_at
  assigned_agent_id, completed_at, failure_reason
```

**Screen** — on the queue's `routing` tab: enable, the two thresholds, the offer prompt,
max attempts, retry gap, expiry hours. Plus a callbacks list under Monitoring showing
state, age and attempts.

**Edge cases** — caller requests twice (de-duplicate on number + queue); number is withheld
(do not offer); agent rejects the callback (return to the front, do not lose the place);
queue emptied before the callback runs (dial immediately); number is invalid or unreachable.

**Backend-first.** Needs the callback table, a scheduler, and the reservation step.

#### B2. Estimated wait and place in queue
**Logic**
- Position is simply the caller's rank in the waiting list.
- Estimated wait ≈ `(position × average handle time) ÷ max(1, agents available)`.
  Use a rolling average handle time per queue, not an all-time one.
- **Say nothing when the number is not trustworthy** — no agents on duty, too few calls
  to have an average, or the estimate swings wildly. A wrong estimate is worse than none.
- Announce in rounded steps (their choice is 5 minutes) so it does not sound false.
- Do not offer a position announcement when the maximum wait is under about two minutes —
  it just delays the answer.

**Data** — no new table. Needs a queue-depth counter and rolling handle time. These are
the same counters B1 needs for its threshold, which is why the two go together.

**Screen** — on `audio`: toggles for position and estimated wait, plus how often to repeat.

#### B3. Repeating delay greeting
**Logic:** a message that repeats on an interval while the caller waits, minimum 30 seconds.
Distinct from the one-time welcome. It is also the natural place to make the callback offer.
**Screen:** on `audio` — prompt, interval, on/off.

### Tier 2 — routing quality

#### B4. Skills with proficiency
**Logic**
- A skill is a named thing. A person has a skill **with a rating**, not just a yes/no.
- A queue states which skills it needs, and **how strictly**: `NONE`, `BEST`, `ALL`.
  `BEST` prefers the highest-rated available person but will still connect the call.
  `ALL` refuses anyone missing a skill.
- Languages are modelled the same way, separately from skills.
- Later: skill groups (membership by rule, not a hand-picked list) and skill expressions
  with a validate endpoint.

**Data**
```
skill:       id, name, division_id
user_skill:  user_id, skill_id, proficiency (0-5)
queue_skill: queue_id, skill_id, minimum_proficiency
queue:       skill_evaluation_method  NONE | BEST | ALL
```

**Screen** — skills list under Users; a skills section on the person; a skills block on the
queue's `routing` tab with the evaluation method.

**Edge case that matters:** with `ALL` and nobody qualified, the queue stalls silently.
Always pair `ALL` with a timeout action, and warn in the UI when no member matches.

#### B5. Last-agent routing
**Logic:** three modes, matching the reference — `Disabled`, `QueueMembersOnly`
(only if that person is in this queue), `AnyAgent`. Plus a window: "within the last N hours".
Fall back to normal routing when the person is unavailable — never hold the caller waiting
for one person unless that is explicitly chosen.
**Data:** `queue.last_agent_routing_mode`, `queue.last_agent_window_hours`, and a
last-handled-by record per caller number per queue.

#### B6. Per-agent ring duration
**Logic:** how long one agent's phone rings before moving on. Separate from the total time
in queue. Their field is per channel; ours can be one number to start.
**Screen:** `routing` tab. **Mostly front-end** if the backend already has the value.

#### B7. Service level target
**Logic:** "answer X% of calls within Y seconds" stored on the queue, so reporting has a
target to measure against instead of showing raw averages.
**Screen:** `routing` tab. **Mostly front-end**, plus a reporting change.

### Tier 3 — the IVR rebuild, in this order

#### B8. Versioning, publish and edit lock — **do this first**
**Logic**
- An IVR has many versions. Three pointers: `published`, `saved` (the working draft),
  `debug` (for testing).
- Saving never affects live calls. Only **publish** swaps the live pointer, atomically.
- Rollback is just publishing an older version.
- An **edit lock** records who is editing and when, with a timeout so a closed browser tab
  does not lock a menu forever. Today two admins editing at once silently overwrite.

**Data**
```
ivr:          id, name, published_version_id, saved_version_id, debug_version_id,
              locked_by_user_id, locked_at
ivr_version:  id, ivr_id, definition (json), created_by, created_at, published_at, note
```

**Screen** — a `versions` tab: current draft, what is live, history with who and when, and
a rollback button. A "you are editing a draft, X is live" banner on every other tab.

**Why first:** every later item edits the flow. Retrofitting version history onto a live
editor means migrating live flows and is far more expensive than starting with it.

#### B9. Text to speech
**Logic:** type the prompt instead of uploading a file. Pick a voice and language.
Cache the generated audio and regenerate when the text changes. Keep file upload — some
prompts are recorded by a real person on purpose.
**Screen:** every greeting slot gets a "type it" / "upload it" choice.
**Needs backend:** a TTS provider, voice list, and audio cache.

#### B10. Flow builder
**Logic:** replace the flat key table with steps. Start with the smallest useful set:
`Menu`, `Play`, `Collect`, `Branch`, `Transfer`, `Hangup`, `Go-To`.
Keep our eleven forward destinations on `Transfer` — that is our lead.
Later: external API, speech recognition, park and resume, customer data to the agent.
**Migration:** every existing IVR converts to a single `Menu` step with its keys as
transfers. Nobody has to rebuild anything.

#### B11. Speech recognition, then external API steps
After the builder exists. Both are step types, not separate features.

### Tier 4 — structural

#### B12. Tiered escalation
**Logic:** rings that widen on a timer. Ring 1 is the best-matched people. After N seconds
ring 2 is *added* (not replaced), and a ring may **drop a skill requirement** to widen.
This is rule 5 — widen, don't fail.
**Data:** `queue_ring: queue_id, position, after_seconds, member_group_ids[], skills_to_drop[]`.

#### B13. Conditional overflow while waiting
**Now:** we can forward to another queue **at timeout** — eleven destinations, which is good.
**Missing:** overflow *during* the wait, on a condition such as depth or estimated wait.
**Logic:** rules evaluated while the caller waits, each with a condition and a target.

#### B14. Open / closed / holiday as three paths
**Logic:** rule 4. The IVR points at a schedule group and three flows, instead of branching
inside one menu. Depends on I4.

---

## Part 4 — What the backend needs to provide

One list, so it can go over as a single ask.

| # | Ask | Unblocks |
|---|---|---|
| S1 | Queue depth counter and rolling average handle time, readable per queue | B1, B2 |
| S2 | Callback table, scheduler, and agent-reservation step | B1 |
| S3 | Raise the real queue ceiling to 500 callers and 300 minutes | I2 |
| S4 | Skills tables: skill, user_skill with proficiency, queue_skill, evaluation method | B4, I5 |
| S5 | Last-handled-by record per caller per queue | B5 |
| S6 | Service level target and ring duration on the queue | B6, B7 |
| S7 | Schedule and schedule-group objects with a recurrence rule | I4, B14 |
| S8 | IVR versions table, three pointers, and an edit lock with a timeout | B8 |
| S9 | Text-to-speech provider, voice list, audio cache | B9 |
| S10 | Flow definition as JSON, with a step schema | B10 |
| S11 | Wrap-up prompt mode on the queue | I3 |
| S12 | Per-screen permission keys under the existing naming | all routes |

**A warning on S12.** `ProtectedRoute` treats a missing permission key as *denied*. Adding a
new permission string to a route before the API returns it locks everyone out of that page.
New routes must ship on existing keys and switch over only after S12 lands.

---

## Part 5 — Order of work

**Wave 1 — front end only, no backend, ship first**
I1 (addressable queues and IVRs) · I6 (finish or remove the IVR language field) ·
the naming clean-up in 1.3. This is the whole URL restructure and it needs nothing from
anyone else.

**Wave 2 — needs S1, S2, S3**
B2 (wait announcements) → B3 (delay greeting) → B1 (callback) → I2 (raise the caps).
B2 before B1 deliberately: B1 needs B2's counters, and B2 is useful on its own.

**Wave 3 — needs S4, S5, S6, S11**
B4 (skills) → I5 (skills-based strategy) → B5 (last agent) → B6, B7 → I3 (wrap-up modes).

**Wave 4 — needs S8, S9, S10**
B8 (versioning) → B9 (text to speech) → B10 (builder) → B11.
**B8 first, without exception.**

**Wave 5 — needs S7**
I4 (schedules) → B14 (three paths) → B12 (tiers) → B13 (overflow while waiting).

---

## Part 6 — Decisions, made

All five were decided from what Genesys and Dialpad actually do, with the evidence.

### D1. URL naming — `queues` and `ivr`
**Evidence.** Genesys's own admin URL is `/admin/organization/queues/<QUEUE-ID>/general`
— plural `queues`, id in the path, tab in the path. Dialpad's admin nav item is literally
**"IVR workflows"**, so "IVR" is the customer's word for it there too.
**Decision.** `queues` and `ivr`. `ivr` survives the later flow builder — Dialpad still
calls theirs IVR workflows even though the editor is a flow builder.

### D2. Tab split — deferred, and the reason changed
**Evidence.** Genesys's queue has General, Members, Wrap-up Codes and After Call Work tabs,
with routing settings sitting *on* General. Dialpad keeps "Call routing" as its own area.
**Decision.** Routing gets its own tab (Dialpad's shape) rather than being crammed into
General (Genesys's shape, which is famously overloaded). But the `hours` + `recording`
split is **deferred**: that tab is a shared component the IVR editor also uses, so splitting
it is a content change, not URL work, and it would have made Wave 1 depend on a refactor.
Wave 1 maps today's tabs one-to-one onto slugs.

### D3. Caps — 500 / 1,000 by plan, and 300 minutes
**Evidence.** Dialpad caps the hold queue at 500 callers on Advanced and 1,000 on Premium,
and allows a maximum wait from 10 seconds to 300 minutes. Genesys has no cap of this shape.
**Decision.** Mirror the *tiered* approach, not just the number — 500 on the standard plan
and 1,000 on the top plan, using the plan features we already read. Maximum wait 10 s to
300 minutes. Still gated on S3: confirm the backend can hold it before the UI promises it.

### D4. Ship Wave 1 alone
**Evidence.** Genesys documents continuous delivery — "rapid deployment of small changes
and updates" — as a deliberate choice, not an accident.
**Decision.** Ship Wave 1 alone. It has no backend dependency, so holding it only delays
the fix and grows the diff.

### D5. Builder scope — five steps for release one
**Evidence.** Dialpad groups its thirteen steps into prompt steps (Menu, Collect, Play),
logic steps (Go-To, Assign, Branch, Customer Data, External API, Expert, Park, Resume) and
terminal steps (Transfer, Hangup).
**Decision.** Release one is **Menu, Play, Transfer, Hangup, Go-To**.
The first four represent every existing IVR exactly, so migration loses nothing. Go-To adds
the reuse and nesting we currently fake by forwarding to another IVR record — it fixes an
existing weakness rather than introducing a new idea. Collect and Branch bring variables,
a whole new mental model, and should not land in the same release as the builder itself.

---

## Part 7 — Wave 1, built

On branch `feat/queues-ivr-urls`. Typecheck, lint and build all pass. Not deployed.

**Routes added** — four each, all rendering the same screen, with the id deciding whether
the editor opens over the list:
```
/admin-settings/phone/queues
/admin-settings/phone/queues/new
/admin-settings/phone/queues/:queueId
/admin-settings/phone/queues/:queueId/:tab
/admin-settings/phone/ivr, /ivr/new, /ivr/:ivrId, /ivr/:ivrId/:tab
```
Permanent redirects from `call-queue` and `ivr-menus`. Sidebar, global search and route
prefetch all point at the new paths.

**Tab slugs** live in one table per feature (`queue-tabs.ts`, `ivr-tabs.ts`) read by both
the router and the editor, so a tab cannot exist in one and not the other.
Queue: `general`, `settings`, `after-call`, `members`, `routing`, `audio`.
IVR: `general`, `settings`, `audio`, `keys`.

**Two things worth knowing about the implementation:**

1. **Creating still keeps the tab in state, on purpose.** The create flow is a wizard that
   refuses to move forward until the current tab validates. A URL is an open door past that
   check, so a link to the last tab would let someone save a queue with empty required
   fields. Editing reads the tab from the URL; creating does not.
2. **An IVR opened from a pasted link shows an honest message when its row is not loaded.**
   There is no endpoint that returns one IVR by id — only list, upsert and delete — and the
   editor hydrates entirely from the row. Handing it a bare id would produce an object with
   a uuid and no fields, and saving would overwrite a real IVR with empty values. So the
   editor is not opened at all in that case. Queues do not have this problem: they have a
   detail endpoint and already fetch by id.

**A decision that changed once I read the code — I6.** The plan said "finish or remove" the
IVR language field. Neither is right. There is **no language input on the form at all**: the
value is read from the stored IVR and written straight back. So a required rule would make
every existing IVR unsaveable, and deleting the field would wipe the stored value on the
next save. It stays a pass-through, the dead commented-out validation is gone, and the note
in `ivr-menus/schema.ts` explains why. A real language picker belongs with text to speech,
which is the point at which language decides anything.

**New backend ask.**

| # | Ask | Unblocks |
|---|---|---|
| S13 | An endpoint returning one IVR by id | true deep links to an IVR; today only queues have one |

### Still to do in Wave 1's spirit
- Split `settings` into `hours` and `recording` when that shared component is next touched.
- Give each tab its own permission once S12 lands.
