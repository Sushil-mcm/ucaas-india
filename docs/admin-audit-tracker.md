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

Not yet audited.

## Numbers

Not yet audited.

## Phone System

Not yet audited. Known from the queue trace, to be confirmed in this group:

- `mod_callcenter` is not loaded. It is present and uncommented in
  `modules.conf.xml` but fails to load, because `callcenter.conf` returns 400
  from the configuration service on :9002 while `ivr.conf`, `sofia.conf` and
  `acl.conf` all return 200. Its log gives the cause: the request arrives with an
  empty queue_name and domain, falls to the not-found path, and that template
  path is an empty string.
- The `callcenter.conf.xml` template renders only `<queues>` — no `<agents>`,
  no `<tiers>`.
- The dialplan generator has no reference to `callcenter` or `queue`, so nothing
  routes a caller into a queue.
- Consequence: **no queue works at call time**, and neither MySQL nor MongoDB is
  read for a queue call. Do not migrate agent data between the two as a fix.

---

## Cross-cutting

| # | Item | State |
|---|---|---|
| X1 | Releasing a number never tells the carrier, so billing continues (issue 4 of the API security audit) | OPEN — the only one of that audit's six still open |
| X2 | `rbac` permissions are advisory; the `users.role` string is the only real gate server-side | OPEN — a project, not a patch |
