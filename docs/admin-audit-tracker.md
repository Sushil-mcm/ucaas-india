# Admin audit tracker

One row per defect, one section per navigation group. This is the running record
for the audit loop: Agent 3 audits a group, sends the defects to Agent 1, Agent 1
fixes, Agent 3 retests, and only then does a row change state.

## The rule this file exists to enforce

**A row moves to CONFIRMED only on Agent 3's own retest, never on a report that
it was fixed.** Not on a commit message, not on a file being present, not on a
message from another agent. The Evidence column must name what was actually run
or read. If a row has no evidence, its state is OPEN whatever anyone has said.

Two traps this has already caught on this project, both worth remembering:

- A patch can be on disk and not in the running process. Compare the file's mtime
  with the service's start time; the service must have started *later*.
- A zero from a search is not proof of absence until the same search finds a
  control you know is there. A wrong path, a compiled binary, or a bad pattern all
  return zero and look identical to a real finding.

## States

| State | Meaning |
|---|---|
| OPEN | Found, sent to Agent 1, not fixed |
| CLAIMED | Agent 1 reports it fixed; Agent 3 has not retested |
| CONFIRMED | Agent 3 retested and it works |
| HONEST | Still does not work, but the screen now says so plainly |
| WONTFIX | Deliberately left, with the reason recorded |

---

## Company

### Confirmed working

| # | Was broken | Evidence of the fix |
|---|---|---|
| C1 | Saving one screen wiped settings owned by other screens — all company settings share one record and each screen rebuilt it from scratch | Save path merges: `...savedSettings` under a namespaced key, comment "Merge, never replace" |
| C2 | The Security page held the sign-in policy but opened for anyone who could *view* the phone system | `guard={{ adminOnly: true }}` on the security route |
| C3 | The sidebar "Company Rules" link, the summary card Edit button and the setup guide all landed on Policies, not the hours/ring-time screen they described | All three resolve through the single `COMPANY_RULES_PATH` constant |
| C4 | Company settings had no addresses — tabs held in state, so no bookmark, link or reload | 11 sections each routed from one shared list; old paths redirect |
| C5 | The ring-time header claimed nothing read the value; it is read in three places, so the note invited someone to rebuild a working feature | Header corrected; three call sites confirmed reading it |

### Honest, still not working

These are labelled truthfully on screen. An admin is no longer misled, but no
behaviour changed. Each becomes a build item the day someone wants it real.

| Setting | What the screen says |
|---|---|
| Emergency address | Warns it does not route emergency calls, and requires a tick to confirm before saving |
| Profile fields | "don't appear on anyone's profile yet" |
| Security — MFA, IP allowlist, SAML SSO | Only idle sign-out is active; the rest "need work in the backend" |
| Calling — country list | "no call is stopped by it yet" |

### Open

| # | Defect | State | Notes |
|---|---|---|---|
| D1 | No calling restriction is enforced anywhere but the browser. The dialplan builder bridges any non-extension straight to the carrier — no country check, no permission check, never reads the company record. A registered SIP device bypasses every browser gate. | OPEN | Highest value. Retest: grep the dialplan builder for a country/permission check, then place a test call to a barred destination from a registered device. |
| D2 | A mistyped 3-5 digit extension that matches no user falls through to the outbound branch and is dialled to the carrier as a real call. | OPEN | Retest: confirm the fall-through fails the call instead of bridging. |
| D3 | `vars.xml` sets `force_transfer_context=xfer`; that context runs `/etc/freeswitch/scripts/xfer.lua`, which does not exist. Same for `att_xfer.lua`. | OPEN | Retest: list the scripts directory, then run a transfer. Blast radius not yet established. |

### Missing next to the reference product

Additions, not defects: shared company contacts, company-wide caller ID, global
department settings, desk phone admin password in company settings.

---

## My Account

### Open

| # | Defect | State | Notes |
|---|---|---|---|
| M3 | Do Not Disturb stops nothing. The app says "When you are in Do not disturb mode, all call will go to voicemail". Nothing in the call path reads `do_not_disturb` — not the dialplan builder, not the directory service, no backend service. | OPEN | Take first: it is the one that makes the product look like it lied. Retest: control-checked grep of the directory service and dialplan, then set DND and place a call. |
| M1 | The three Notification toggles (voicemail, missed, SMS) save but nothing reads them; the only key any service reads from that blob is `security_alert`. The missed-call script is unreferenced, points at `http://example.com/api/books`, uses an undefined variable, and uses `!=`, which is not valid Lua. | OPEN | Retest: enumerate the keys services read from the blob, then trigger a missed call. |
| M2 | 12 `<ProtectedRoute>` wrappers carry no guard, so they check nothing while reading as protection. | OPEN | **Not a hole** — all 12 checked against their ancestors. Ten inherit a real guard from the reports parent; inbox and account/phone are correctly authenticated-only. Clarity fix. |

### Confirmed working

| # | Was broken | Evidence of the fix |
|---|---|---|
| A1 | The personal security page warned that the server did not check who you were signing out, and that the fix was "still needed" — untrue, and it invited someone to redo closed work | Comment rewritten; the three server gaps confirmed live (see below) |
| A2 | Security audit doc listed issues 1 and 6 as OPEN when both were fixed | Retested against the running service: `callerMayAssignRoles` present at 2 sites (mtime 29 Aug 06:46), logout tenant-scope block present (mtime 29 Aug 06:17), `default-api` pid 608976 started 29 Aug 08:22 — later than both |

### Missing next to the reference product

Custom status (free text with a timer); Auto-DND driven by working hours. The
second is only worth building once DND itself is honoured.

---

## People

### Open

| # | Defect | State | Notes |
|---|---|---|---|
| P1 | The permission tree an admin builds is never enforced. All three `rbac` uses in default-api are in the login response (`rbac: findRole?.permission ?? {}`, AuthController lines 426/721/2435) — handed to the browser at sign-in, never consulted again. No authorization middleware for tenant users; `AdminMiddleware` authenticates a separate platform Admin model and is used by no router. The only real gate is 51 role-string comparisons. | OPEN | Labelled backwards: the three screens that only *describe* the model all warn it is not checked, while the two where an admin *builds and saves* it — `directory/roles.tsx` and `roles/add-new-role/role-permissions/index.tsx` — say nothing. Smallest fix in the audit. |
| P2 | A person's own call rules never affect a call. The directory service reads no forwarding, call rules or DND (all 0; control on the same file: `user_call` 1, `dial-string` 3). Its dial-string is plain `sofia_contact(*/user@domain)`. Inbound takes its route from the DID, not the person. | OPEN | Same root cause as M3. |
| P3 | `call-rules/index.tsx:324` renders "Bypassed by Do Not Disturb" and "Bypassed by Forward All Calls" — a precedence order that does not exist server-side. | OPEN | Fix with M3 as one change. |

---

## Numbers

### Open

| # | Defect | State | Notes |
|---|---|---|---|
| N1 | Releasing a number never tells the carrier, so billing continues. `releaseDid()` calls `CommonHelper.releaseDidForwarding()`, which soft-deletes in our own database only — sets `deleted_at`, nulls `forward_call_actions`, `site_uuid`, `user_uuid`. Zero references to `DID_WW_URL`, `didww` or `wholesale` in `DidController.js`. | OPEN | Issue 4 of the API security audit, and the last of its six still open. Costs money every month and grows with each release. The identity flow already has a working wholesale-API path through `DidwwHelper`, so the plumbing exists. |
| N2 | `set-number-forwarding/index.tsx:330` writes `{ forward_call_actions: { ...request } }` from a freshly rebuilt object — no merge. `assign-receptionist-caller-id-modal.tsx:193` writes the same field keyed on the same DID uuid. | OPEN | **Not yet proven** that both land on the same row — confirm on a live record before treating the overwrite as real. Fix is the merge pattern Company already uses. |
| N3 | Two carrier targets are configured: `DidwwHelper.js` hardcodes `wholesale-api.mycountrymobile.com`, while default-api's `.env` sets `DID_WW_URL` to the DIDWW host. | OPEN | Not a defect yet — establish which paths use which. A request in one dialect sent to the other endpoint fails silently. |

### Confirmed working

| # | Was broken | Evidence |
|---|---|---|
| N4 | Expired-plan customers could open the buy flow, because the check read `companyInfo` — a field that does not exist on the user object | Now reads `user?.company_info?.plan_status`; `parseForwardActions` defensive parse also present |

### Not a defect — checked and fine

Identities, addresses and verifications are genuinely wired to the carrier, not
stored-only as I expected. `IdentityController.js` requires `DidwwHelper` and
`WholesaleApiLog` and uses axios 19 times; `IdentityRoute.js` mounts ten
endpoints including `/did/assign` and `/did/assign/callback`.

---

## Phone System

### Open

| # | Defect | State | Notes |
|---|---|---|---|
| F1 | `mod_callcenter` is not loaded, so **no queue exists at call time**. It is present and uncommented in `modules.conf.xml` but fails to load: `callcenter.conf` returns 400 from :9002 (while `ivr.conf`, `sofia.conf`, `acl.conf` all return 200) because the request arrives with empty queue_name and domain, falls to the not-found path, and that template path is an empty string. Confirmed twice, independently — `show application` lists `bridge` and `ivr` but not `callcenter`. | OPEN | **First domino.** Nothing about queues can be tested until the module loads. Do not migrate agent data between MySQL and MongoDB as a fix — neither store is read for a queue call. |
| F2 | The `callcenter.conf.xml` template renders only `<queues>` — no `<agents>`, no `<tiers>`. | OPEN | Even once loaded, no agent would join a queue. |
| F3 | **IVR is one missing branch from working.** The `ivr` application is available (`ivr,Run an ivr menu,<menu_name>,mod_dptools`), config is served correctly (ivr.conf 200, template present, SQL query present), and the admin UI is complete — but the dialplan never invokes it. | OPEN | **Highest value per effort in the whole audit.** Adding a branch emitting `{"application": "ivr", "data": <menu_name>}` connects work that is otherwise finished. |
| F4 | `build_inbound_dialplan` branches on `EXTENSION` (line 321) and `VOICEMAIL` (line 334) only. Everything else logs "unhandled route type" and the call fails. Control-checked: EXTENSION appears once; ivr, IVR, department, DEPARTMENT, queue, QUEUE all appear zero times. | OPEN | Departments can be created and staffed and will never receive a call. |
| F5 | Business hours are never evaluated. The builder reads `call_handling.business_hours` and nothing else — no after_hours, no holiday, no closed, no clock comparison. A 2am call takes the business-hours route. | OPEN | Not a missing-data problem: `releaseDidForwarding` parses both `business_hours` AND `closed_hours`, so the data is stored. One missing branch, same shape as F3. |

### Gaps vs the reference product

Queue admin has basic-info, greetings, queue-settings, add-members,
ring-strategy. Missing: queue priority (0 hits), global queue settings applying
across all queues (0 hits — same shape as the missing global department
settings). Callback shows only 2 hits and may be thinner than it looks. Skills
(9) and duty state (4) look present.

---

## Cross-cutting

| # | Item | State |
|---|---|---|
| X1 | Releasing a number never tells the carrier — see N1 | OPEN |
| X2 | `rbac` permissions are advisory; the `users.role` string is the only real gate — see P1 | OPEN |

## Suggested order across all groups

1. **F1** — the callcenter.conf 400. Everything queue-shaped is blocked behind it.
2. **F3** — the IVR branch. Small, self-contained, unblocks a finished feature.
3. **P1** — two honesty labels. The most misleading thing currently in the admin area, and the cheapest fix here.
4. **M3 + P3** — Do Not Disturb, as one change, since they share a cause.
5. **D1** — calling restrictions reaching the switch. The money one.
6. **N1** — carrier release. Costs money every month it waits.
7. **F4, F5, P2** — the remaining route types and the clock check.
