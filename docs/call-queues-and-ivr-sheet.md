# Call Queues + IVR Menus — feature sheet

What we have, what the two reference platforms have, and what is missing.
Reference material only. **Do not put a rival's name into product UI text or comments.**

Checked 2026-08-29 against our code, the public Platform API spec, and help.dialpad.com.

Pages under review:
- `/admin-settings/phone/call-queue` → `pages/admin-settings/phone-systems/call-queue` (2,436 lines)
- `/admin-settings/phone/ivr-menus` → `pages/admin-settings/phone-systems/ivr-menus` (1,494 lines)

---

## Correction to an earlier note

An earlier review said our queues offer "ring-all and top-down only". **That was wrong.**
It came from grepping one file for string literals. The real list is in
`call-queue/constant.ts` → `CALL_DISTRIBUTION_DATA`, and it has **seven** strategies:

> Ring All · Longest Idle Agent · Round Robin · Top Down · Agent With Least Talk Time
> · Agent With Fewest Calls · Random

That is **more flat strategies than Dialpad offers** (they have five). The gap is not the
count. It is skills, tiering, callback, and what the caller hears while waiting.
`docs/genesys-cloud-reference.md` has been corrected.

---

## Sheet 1 — Call Queues

Legend: **Have** = built and working · **Partial** = built but thinner than reference
· **Gap** = not built · **Ours is better** = we lead

### A. Identity and placement

| Feature | Genesys | Dialpad | Ours | Verdict |
|---|---|---|---|---|
| Name, description | yes | yes | yes | Have |
| Extension | yes | yes | yes, validated | Have |
| Site / location | yes | office | yes, required | Have |
| Division scoping | yes | no | no | Gap |
| Call script attached | `defaultScripts` per media | yes | yes, optional with toggle | Have |
| Caller ID for the queue | `callingPartyName` / `callingPartyNumber` | yes | `display_number` + masking + show-if-blocked | **Ours is better** |

### B. Who rings

| Feature | Genesys | Dialpad | Ours | Verdict |
|---|---|---|---|---|
| Ring strategies | not a list — skill evaluation + rings | 5: longest idle, fixed order, round robin, skills-based, random | **7**: ring all, longest idle, round robin, top down, least talk time, fewest calls, random | **Ours is better** |
| Members | yes | yes | yes, min 1 enforced | Have |
| Manager / owner | yes | yes | yes, required | Have |
| **Skills + proficiency** | skills, ratings, skill groups, validated expressions | skills-based routing by skill rank | **none** | **Gap** |
| **Tiered escalation (bullseye)** | rings that widen on a timer and can drop a skill | no | **none** | **Gap** |
| **Last-agent routing** | `lastAgentRoutingMode`: Disabled / QueueMembersOnly / AnyAgent | "prioritize last agent routing" | **none** | **Gap** |
| Agent concurrency cap | utilization, per media type | per plan | **none** | Gap |
| Auto-answer | `enableAutoAnswer` per media | auto-answer timer | **none** | Gap |
| Direct routing to a named person with backup queue | yes | no | no | Gap |

### C. How long

| Feature | Genesys | Dialpad | Ours | Verdict |
|---|---|---|---|---|
| Per-agent ring duration | `alertingTimeoutSeconds` per media | ring duration slider | **not exposed** | Gap |
| Max time in queue | via flows and routing rules | 10 s – **300 min** | 60 s – 3600 s (60 min) | Partial |
| Max callers waiting | no hard cap of this shape | **500** (Advanced) / **1,000** (Premium) | **max 30** | **Partial — hard cap far too low** |
| Leave queue if no agent | via flow logic | yes | `leave_room_if_no_agent` | Have |

### D. What the caller hears

| Feature | Genesys | Dialpad | Ours | Verdict |
|---|---|---|---|---|
| Welcome greeting | in-queue flow | yes, open + closed | yes, toggle | Have |
| Hold music | `onHoldPrompt` | yes | yes, toggle | Have |
| Waiting / ring tone | yes | yes | yes, two separate slots | Have |
| No agent available | flow branch | yes | yes | Have |
| All agents busy | flow branch | yes | yes | Have |
| Whisper to the agent | `whisperPrompt` | no | **none** | Gap |
| **Repeating delay greeting** | in-queue flow loop | yes, interval ≥ 30 s | **none** | **Gap** |
| **Place in queue announcement** | yes | yes (needs wait ≥ 2 min) | **none** | **Gap** |
| **Estimated wait time announcement** | `estimatedwaittime` per queue and per media | yes, 5-minute increments | **none** | **Gap** |

### E. When nobody answers

| Feature | Genesys | Dialpad | Ours | Verdict |
|---|---|---|---|---|
| Action on timeout | flow-driven | fallback options | `after_max_wait_time` → voicemail, phone, extension, queue, department, IVR, AI, message, hangup | **Ours is better** (11 destinations) |
| Overflow to another queue | conditional group routing **while waiting** | fallback | only **at timeout**, not while waiting | Partial |
| **Callback in queue** | callback media + agent-owned callbacks with max hold hours | yes, above a caller threshold, agent-first | **none** | **Gap — highest customer-visible value** |
| Voicemail fallback | yes | yes, open hours only | yes, personal or shared | Have |

### F. Hours

| Feature | Genesys | Dialpad | Ours | Verdict |
|---|---|---|---|---|
| 24 h or weekly | schedules with rrule | open / closed routing | `24_hours` or `weekly` | Partial |
| Holidays | holiday schedule in a schedule group | yes | yes, per queue | Have |
| Closed-hours action | closed-hours flow | closed-hours routing | `closed_hour_action` with full forward types | Have |
| Timezone override per queue | site timezone | office timezone | `regional.override` + country + timezone | **Ours is better** |
| Emergency override | emergency groups | no | **none** | Gap |

### G. After the call

| Feature | Genesys | Dialpad | Ours | Verdict |
|---|---|---|---|---|
| Wrap-up time | `acwSettings.timeoutMs` | yes | 0 – 3600 s | Have |
| Wrap-up prompt modes | 5 modes: mandatory, optional, mandatory-timeout, forced-timeout, agent-requested | simpler | single timer | Partial |
| Dispositions | wrap-up codes per queue | dispositions | **required, min 1** | **Ours is better** |
| Recording | org + queue policy | yes | automatic + on-demand, with prompts | Have |
| Transcription | `enableTranscription` | yes | boolean | Have |
| Monitor / whisper / barge | `enableAudioMonitoring` | yes | monitoring module | Have |

### H. Measuring

| Feature | Genesys | Dialpad | Ours | Verdict |
|---|---|---|---|---|
| Service level target | `serviceLevel` per media on the queue | SLA settings | **none on the queue** | Gap |
| Real-time queue stats | analytics + websocket topics | live dashboard | monitoring module | Partial |
| Per-channel settings | call, callback, chat, email, message | separate products | voice only | Gap (scope decision) |

**Queue summary: 9 real gaps.** In value order —
callback, estimated wait + place in queue, skills, the 30-caller cap, last-agent routing,
delay greeting, tiered escalation, service level, per-agent ring duration.

---

## Sheet 2 — IVR Menus

Ours today is a **flat key-to-destination table**: one menu, one level, digits mapped to
destinations. Retry and timeout are real fields with limits, which is good.

| Feature | Genesys (Architect) | Dialpad (Workflows) | Ours | Verdict |
|---|---|---|---|---|
| Name, extension, site | yes | yes | yes | Have |
| Menu greeting | yes | Menu step | yes, required | Have |
| Welcome greeting | yes | Play step | yes, toggle | Have |
| Invalid-entry greeting | yes | no-match handling | yes, toggle | Have |
| Digit → destination | yes | Transfer step | yes — 11 destinations incl. **AI agent** | **Ours is better** |
| `#` and `*` behaviour | flow-defined | flow-defined | repeat menu / return to previous | Have |
| Retries on invalid | configurable | retry counts | `max_failures` 1–10 | Have |
| Retries on silence | configurable | no-input handling | `max_timeouts` 1–10 | Have |
| Wait for input | configurable | timeout values | `timeout` 1–60 s | Have |
| Action on timeout / failure | flow branch | default behaviours | both configurable | Have |
| **Nested menus** | any depth | any depth | only by forwarding to another IVR record | Partial |
| **Text to speech** | yes, with SSML | yes, with SSML and variables | **none** — audio files only | **Gap** |
| **Speech recognition** | yes | ASR on Menu and Collect | **none** | **Gap** |
| **Collect digits into a variable** | yes | Collect step | **none** | **Gap** |
| **Branch on data** | yes | Branch step, with regex | **none** | **Gap** |
| **Call an external API mid-call** | data actions | External API step: GET/POST/PUT/PATCH | **none** | **Gap** |
| **Variables / assign** | yes | Assign step | **none** | Gap |
| Reusable sub-flow | `COMMONMODULE` | Go-To step | **none** | Gap |
| Show customer data to the agent | yes | Customer Data step, 10 variables | **none** | Gap |
| Park / resume during lookup | yes | Call Park + Call Resume | **none** | Gap |
| **Draft, version, publish** | save / check-in / publish, `publishedVersion` vs `savedVersion` | yes | **none — edits go live immediately** | **Gap** |
| **Edit lock** | `lockedUser` / `lockedClient` | — | **none** | **Gap** |
| Typed inputs / outputs | JSON Schema in and out | variables | none | Gap |
| Open / closed / holiday flows | schedule group + three flows | open and closed routing | hours in common settings, one path | Partial |
| Emergency override | emergency groups | — | none | Gap |
| Templates | yes | IVR workflow templates | none | Gap |
| Test / simulate before publish | debug version | yes | **none** | **Gap** |
| Multi-language | `supportedLanguages` per flow | yes | `language` field exists, **validation commented out** | Partial |

**IVR summary: 14 gaps.** The three that matter before any others —
**versioning and publish**, **text to speech**, and **a real flow builder**. In that order.

---

## What to build, in priority order

This is the ranking, not the build logic. Build logic comes next, per item.

### Tier 1 — biggest customer-visible win, smallest change
1. **Callback in queue.** Caller keeps their place and hangs up. Single most-requested
   contact-centre feature and we have none of it.
2. **Estimated wait and place in queue announcements.** Cheap once the queue can count.
3. **Raise the caps.** Max waiting callers 30 → 500. Max wait 60 min → 300 min.
   Ours is currently an order of magnitude below both references.
4. **Repeating delay greeting** with an interval.

### Tier 2 — routing quality
5. **Skills with proficiency**, then a skills-based ring strategy. Unlocks a lot later.
6. **Last-agent routing** — three modes, matching the reference shape.
7. **Per-agent ring duration** exposed on the queue.
8. **Service level target** on the queue, so reporting has something to measure against.

### Tier 3 — the IVR rebuild
9. **Draft / version / publish + edit lock.** Do this *before* the builder.
   Retrofitting versioning onto a live editor is expensive and risky.
10. **Text to speech.** Removes the audio-file bottleneck for every menu.
11. **Flow builder** — Menu, Play, Collect, Branch, Transfer, Hangup, Go-To to start.
12. **Speech recognition**, then external API steps.

### Tier 4 — structural
13. Tiered escalation (rings that widen and can drop a skill requirement).
14. Conditional overflow while waiting, not only at timeout.
15. Open / closed / holiday as three flows behind a schedule group.

### Needs backend before anything starts
Callback state, queue-depth counters, skills tables, flow versions, TTS voices,
per-queue service level. Every Tier 1 and Tier 3 item is backend-first.

---

## What we already do better

Worth protecting during any rebuild:

- **Seven ring strategies** — more than Dialpad's five.
- **Eleven forward destinations** on timeout and on every IVR key, including an AI agent.
- **Dispositions are required**, minimum one, enforced in the schema.
- **Caller ID masking** with a show-if-blocked rule.
- **Per-queue timezone override**, not inherited from the site.
- **Retry and timeout are explicit fields** with sensible limits, not hidden constants.
