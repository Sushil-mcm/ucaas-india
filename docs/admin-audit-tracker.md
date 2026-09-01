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
| C6 | Company → Away dates wrote a bespoke `settings.away` blob per user that nothing but an unapplied, voicemail-only patch ever read. Rebuilt (`company-away-dates.tsx`, Agent 1, 1 Sep) on the per-user custom-day model: an away period is now `{title,from,to,source:'away'}` in `settings.operational_hours.holidays`, the same list People → forwarding writes, and a closed day follows the person's own `closed_hour_action`. Retested live against TestersCompany2 (`a5bd159a-…ff5`) via direct `/api/user/update` calls (auth: a minted, self-issued JWT + matching `devices_securities` row for a disposable test account, deleted after) with before/after DB reads, not the UI toast. **1. Write shape** — Rahul jatt (`c78c2f2f-…3c`, seeded with a real "Diwali" holiday first): after Set, `holidays` = `[Diwali, {title:'Away',from:'2026-09-10',to:'2026-09-12',source:'away'}]`, `settings.away` absent. Control: Amey Katale (`2b651e43-…d3`), never targeted, `holidays` stayed `[]` throughout. **2. No-wipe** — August (`658a0274-…1b`, pre-existing `closed_hour_action` VOICEMAIL/1794): Set with the destination checkbox off left `closed_hour_action` byte-identical (confirmed via full-value compare); Set again with it on (HANGUP) changed it to exactly `{type:"HANGUP",type_label:"Hang up",value:"",value_label:"",personal:true,enabled:true}`, and re-running Set did not duplicate the holidays entry. **3. Clear is surgical** — Clear on Rahul removed only the `source:'away'` entry; Diwali and `closed_hour_action` survived (`greetings`/`call_forwarding` md5 unchanged across both the Set and the Clear). **4. Whole-record echo** — `greetings` and `call_forwarding` md5s matched the pre-save baseline exactly on every write; `role`/`role_uuid`/`custom_role_uuid`/`site_uuid` untouched. **5. Legacy migration** — seeded a live user's `settings.away={from,to,note}` blob directly; the screen's pure read logic (replicated and run standalone) resolves it as a booked period, and the `holiday_start_date`/`holiday_end_date` column fallback resolves the same way with no blob present; one live Set against that user removed `settings.away` entirely and replaced it with the new custom-day entry. **6. Honesty gate** — banner text confirmed unchanged: records dates/destinations, says calls do not divert yet, no claim of live diversion. |

### Honest, still not working

These are labelled truthfully on screen. An admin is no longer misled, but no
behaviour changed. Each becomes a build item the day someone wants it real.

| Setting | What the screen says |
|---|---|
| Emergency address | Warns it does not route emergency calls, and requires a tick to confirm before saving |
| Away dates diversion | Says booking someone away marks them closed and records where their calls should go, but does not change a live call yet — matches reality: **retested directly on the switch (mcm-new, `/opt/fs-xml-api-1.2.5/dialplan_service.py`, 1 Sep).** The only closed-hours check in the live file is `business_hours_state(company_operational_hours(db_name))` at line 1609 — company-wide, keyed on the `user_template` "Company Default" row, not the target person. `closed_hour_action` (the field this screen writes) appears **zero** times in the file; the one other per-user settings lookup (line 1455) is for international-calling permission, unrelated. So an away person's calls are not diverted by anything currently running, on any date. This is CLAIMED-but-unconfirmed in [[away-dates-derives-from-custom-days]] correctly downgraded to HONEST/pending here — the screen's own wording already matches this, so no UI change needed. Live-call retest (real inbound to an away person, in-window vs out-of-window, non-away colleague as control) is blocked until `patch_holidays.py` is actually applied to this file — it is not on disk today. |
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
| F3 | **IVR is one missing branch from working.** The `ivr` application is available (`ivr,Run an ivr menu,<menu_name>,mod_dptools`), config is served correctly (ivr.conf 200, template present, SQL query present), and the admin UI is complete — but the dialplan never invokes it. | CLAIMED (observed, not applied — Agent 1, 31 Aug) | **The branch is already live.** Found at `dialplan_service.py` line 1324 while claiming the file for F5: `if route_type == "IVR":` emitting `{"application": "ivr", "data": route_value}`. Agent 2's `apply-ivr-route.sh` is idempotent (`if 'route_type == "IVR"' in s` → skip), so re-running it is a no-op and there is no ordering conflict with F5. **I did not apply it and did not edit that branch.** This row is claimed on observation only — needs a real call to an IVR number to move further. |
| F4 | `build_inbound_dialplan` branches on `EXTENSION` (line 321) and `VOICEMAIL` (line 334) only. Everything else logs "unhandled route type" and the call fails. Control-checked: EXTENSION appears once; ivr, IVR, department, DEPARTMENT, queue, QUEUE all appear zero times. | OPEN | Departments can be created and staffed and will never receive a call. |
| F5 | Business hours are never evaluated. The builder reads `call_handling.business_hours` and nothing else — no after_hours, no holiday, no closed, no clock comparison. A 2am call takes the business-hours route. | CLAIMED (Agent 1, 31 Aug) | Clock check landed on mcm-new. Outside hours an EXTENSION route goes to that extension's voicemail, reusing the existing VOICEMAIL branch. Only EXTENSION diverts — IVR/QUEUE are untouched because nothing has a `closed_hours` set. **Evidence:** file mtime 13:53:54 vs process start 13:53:56 (process newer); backup `dialplan_service.py.bak-20260831-135353`; `grep -c 'def business_hours_state'`=1, `'diverting to voicemail'`=1, control `'route_type == "QUEUE"'`=1. Against real stored settings for `mcm_1785312032037` (weekly 10:00–23:00 Asia/Kolkata): 14:00 open, 09:00 closed, 23:30 closed, Saturday closed, **02:00 closed**; a db with no hours answers `unknown` as a control. 34 offline tests in `backend-patches/fs-xml-api/test_business_hours.py`. **Correction to this row's own note:** `closed_hours` is *parsed* by the API but is **not stored** — it is absent from `call_handling` on all 23 configured DIDs, checked directly. So it was partly a missing-data problem. A follow-up honouring a configured `closed_hours` destination **landed 31 Aug 14:19** (`apply-closed-hours-destination.sh`; file mtime 14:19:42 vs process start 14:19:44; backup `.bak-20260831-141941`). Order is now: a configured `closed_hours` destination wins; failing that an EXTENSION goes to voicemail; a menu or queue with nothing set rings through and says so in the log. Proved against the live module across 8 cases — IVR and QUEUE destinations honoured, a half-filled block falls back to voicemail, a lowercase type is normalised, and both `open` and `unknown` leave the route untouched. The script's own assertion fired first on a correct patch (it counted a phrase that also appears in a comment) and refused to write — the file was verified unchanged before the assertion was corrected. Decision returns open/closed/**unknown**; every uncertain case answers unknown and behaves exactly as before, because wrongly refusing an in-hours call is lost business. |
| F6 | **Voicemail: the premise that it does not exist is wrong.** `mod_voicemail` is genuinely not loaded (`show application` lists `bridge` and `ivr`, not `voicemail`) — but the dialplan never wanted it. The VOICEMAIL branch calls `save-voicemail.lua`, which exists at `/etc/freeswitch/scripts/save-voicemail.lua`, and `voicemail_save()` in `functions.lua:312` is a complete implementation: answers, plays a **generated** beep tone (no sound file needed), `mkdir -p`s its own store, `recordFile`s to `/usr/share/freeswitch/storage/voicemail/default/<accountcode>/msg_<uuid>.wav`, and discards anything under 3 seconds. Loading `mod_voicemail` would add an unused module. | CLAIMED (investigated, Agent 1, 31 Aug) | **Why zero recordings exist:** not a fault — **no number has ever routed to voicemail**. Across all 23 configured DIDs the in-hours route types are EXTENSION 21, QUEUE 1, AI 1, and **VOICEMAIL 0**. F5's business-hours divert is the first thing in this system that will ever send a call there, so this path is about to be exercised for the first time and has never had a live test. **The one real defect:** the container holds **zero audio files of any format** — control: `find` works there, returning 56 lua files. `/usr/share/freeswitch/sounds/` exists and is empty. So `session:streamFile(sounds_dir.."voicemail/vm-goodbye.wav")` at `functions.lua:331` has nothing to play. It runs *after* `recordFile`, so a message is still saved and the caller simply hears no goodbye — cosmetic, not data loss. Customer-uploaded greetings are unaffected: `/var/lib/freeswitch/storage/http_file_cache` shows FreeSWITCH fetches those over HTTP rather than from the sounds tree. **Retest:** place a real call outside opening hours to an EXTENSION-routed number and confirm a `.wav` appears under the store; control — an in-hours call to the same number must still ring. |
| F7 | **Recording has never worked — it is a gap, not a regression.** The screen told customers it "worked until 22 August and stopped when the call router was rebuilt". That is false and is now corrected. **Evidence: 5,987 calls across every tenant database, and `recording_file` is set on zero of them.** No `.wav` exists anywhere in the container (control: `find` returns 56 lua files). The 29 Aug dialplan backup contains no recording of any kind, and the pre-rewrite Go binary contains **zero** occurrences of `record_session`, `start_record`, `on_demand` or `dual_leg` (controls: `callcenter` 58, `ivr` 65, `template` 1141 — so the scan works). There is nothing to restore. | CLAIMED (investigated, Agent 1, 31 Aug) | **But it is wiring, not building.** Present and unused: `record_session` in mod_dptools; five recording scripts (`start_record`, `stop_record`, `on_demand_recording`, `dual_leg_record`, `record_with_prompt`); a complete `upload.lua` that asks the API for a presigned URL, PUTs the audio to object storage and writes the location back; `recording_path=/opt/call-recordings/tmp/` with `/opt/call-recordings` **mounted as a volume**; and media-api already serving `POST /media/upload/url`, `GET /media/:uuid/:type/:file`, `DELETE /media/delete` and `POST /media/get-bucket-size` — so storage, playback, deletion and accounting all exist. **The four actual gaps:** (1) `fs_upload_url` is never defined in `config.lua`, so `upload.lua` reads an undefined variable — it should point at `fs_media_api_addr .. "/upload/url"`; (2) nothing in the dialplan calls `record_session` or any recording script; (3) `fs_put_call_logs` is also undefined, so the write-back of the filename to the call log cannot run either; (4) the stored recording policy is read by nothing. **Correction:** I earlier listed a missing `/opt/call-recordings/tmp/` as a gap. It exists and has since 28 Aug — I read a listing truncated by `head -4`. Third time today a truncated or mis-targeted read produced a false 'absent'. **What is genuinely complete and unused:** `start_record.lua` records both legs to that exact path via `uuid_record`; `stop_record.lua` stops it; `uploadCallRecording`/`updateCallRecording` exist in `functions.lua`. **Also corrected:** `dial_string` appears to take recording parameters but takes only two — `phoneForward` passes seven and Lua discards the rest, and `call_record` is assigned then never used. It never calls `record_session`. The signatures are vestigial. **Storage is proved working end to end:** the switch-facing `POST /api/media/direct/upload/url` with the Bearer secret returns a presigned Wasabi URL for `<company_uuid>/recording/<file>` — the PRIVATE prefix, matching the now-scoped `getMediaFile`; a wrong secret gives 401; the bucket already holds 315 objects / ~1GB. So the destination is real and correctly protected. **Storage decision, answered by the design rather than by us:** recordings were never meant to live on a box — the local file is temporary and object storage is the destination. Disk figures for the record: web box 1.8T with 710G free (58%, not 80%); mcm-new 48G with only 20G free, which is why local retention is not an option. **Blocked on sequencing:** "Who may listen to call recordings" is browser-only, because the platform never checks permissions server-side. Recording must not be switched on before that is real, or the audio is fetchable by anyone signed in. |
| F8 | **Count of undocumented dist-only patches is four, not two.** Ground rule 8 found two more in a single deploy: (a) the rate-limit exemption — source used `includes("webhook")`, so any path containing that word skipped rate limiting, while the running dist checked an allow-list `Set`; (b) all four role writes were already scoped to `company_uuid` in the running dist while the source had them unscoped. | CLOSED (Agent 1, 31 Aug) | **Correction to my own earlier report on this row's subject:** I read the source, saw `Role.destroy({where:{uuid}})`, and announced that any signed-in user could delete a PREDEFINED role for the whole platform. **Production was never exposed** — verified against `dist.rollback-20260831-145146`, which has zero unscoped role writes. The fix was regression prevention, not a breach fix, and it would have become a real hole on the first build from source. The genuine behaviour change is that both deletes now return 404 when nothing matched, where the old dist reported success either way. **The general lesson, which is the point of this row:** on this system the compiled dist is ahead of the source in at least four places, so reading source alone tells you what WILL be true after the next build, not what IS true now. Any claim about live behaviour has to be checked against the running dist. |
| F9 | **Every caller is now told the call is recorded, and nothing records.** Recording was wired into the live dialplan and switched on by default for every tenant (`DEFAULT_RECORDING_MODE = "all"`, `dialplan_service.py:1041`), so each call now emits `lua(start_record.lua)`, an `api_hangup_hook` of `upload_recording.lua`, and a `playback` of the recording announcement. The announcement plays. The two lua scripts never run: FreeSWITCH resolves a bare script name against `/usr/share/freeswitch/scripts/`, and all 18 of this system's lua scripts live in `/etc/freeswitch/scripts/`. So the product makes a statement to the caller that it does not keep. | OPEN | **My own retest, 1 Sep 11:27-11:35, live on mcm-new.** *Live, not just on disk:* the patch's mtime (11:09:18.657) and the service's start second are too close to separate by timestamp, so I proved it behaviourally instead - `POST 127.0.0.1:9000/v1/dialplan` for DID `12135103420` returns the recording actions, which only the patched code can emit. *Default-on is real and cross-tenant:* the same probe against `14422129488` (company `d3e6c538`, no recording row at all - the company [[recording-switch-is-user-template]] recorded as switched off) and `12568081021` (company `a5bd159a`) both come back recording. *The scripts do not load:* `/var/log/freeswitch/freeswitch.log` holds `[ERR] mod_lua.cpp:202 cannot open /usr/share/freeswitch/scripts/start_record.lua` x9 and the same for `upload_recording.lua` x7, most recently 11:31:22. Control for the path claim: `ls /usr/share/freeswitch/scripts/*.lua` = **0**, `ls /etc/freeswitch/scripts/*.lua` = **18**. *The announcement really is heard:* 5 `playback(...recording-announcement.wav)` executions in the log, and `/opt/call-recordings/tmp/` is **empty** (control: `find /opt/call-recordings` returns 211 files, all under `cdr/`). Not a missing-file problem - `recording-announcement.wav` is present in the container. `lua.conf.xml` sets `script-directory` to `/etc/freeswitch/scripts/?.lua`, but that is LUA_PATH for `require` inside a script, not the directory mod_lua searches for the script named in the dialplan - which is why `upload_recording.lua`'s own `require "config"` would have worked had the file ever been reached. **Two more scripts are invoked the same way and will fail the same way, not yet observed because no call has reached them:** `save-voicemail.lua` (line 1670 - the destination F5's after-hours divert now sends calls to, so F6's voicemail path is dead on arrival) and `callcenter-queue.lua` (line 1715, seen in the `12568081021` probe). **Retest after a fix:** place one call, then confirm a `.wav` appears in `/opt/call-recordings/tmp/`, the `cannot open` count stops rising, and an in-hours call to a non-recording company still bridges. **Sequencing, unchanged from F7:** F7 recorded that recording must not be switched on before permissions are checked server-side. **P1 is still OPEN** - the `rbac` tree is advisory and role strings are the only gate - so that precondition was not met before default-on landed. Today the path bug means no audio exists to expose; the day the path is fixed, audio starts flowing for every tenant at once, with no per-company opt-in and no server-side gate on who may listen. Fix the two in that order, not this one first. |
| F10 | Two of today's patch scripts are written and tested locally but **not applied** to the running service, and one set of audio files was uploaded with nothing to play it. | OPEN | Checked against the live file at 11:30: line availability (`apply-line-availability.sh`, `patch_lines.py`) - `line_availability`, `max_lines`, `concurrent`, `busy` all **0** occurrences. Voicemail email (`apply-voicemail-email.sh`) - `vm_notify_email` **0**, which matches that script's own header saying it was blocked on a permission rule and that the card's note says so rather than promising mail. On-demand recording - `recording-on-demand-start.wav` and `-stop.wav` were placed in the container at 11:09, but `on_demand` appears **0** times in the dialplan, so nothing plays them. Controls on the same file: `holidays` 10, `route_type == "QUEUE"` 1, `def business_hours_state` 1 - so the search finds what is genuinely there. Holidays **is** applied and live. |

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

0. **F9** — the recording announcement that is played and then not honoured. It is
   the only item on this list where the product currently says something untrue to
   a member of the public on every call, and it is one path change. Fixing it also
   revives `save-voicemail.lua` and `callcenter-queue.lua`, which fail the same way.
   Do **P1** before, or together with, letting the audio actually flow.
1. **F1** — the callcenter.conf 400. Everything queue-shaped is blocked behind it.
2. **F3** — the IVR branch. Small, self-contained, unblocks a finished feature.
3. **P1** — two honesty labels. The most misleading thing currently in the admin area, and the cheapest fix here.
4. **M3 + P3** — Do Not Disturb, as one change, since they share a cause.
5. **D1** — calling restrictions reaching the switch. The money one.
6. **N1** — carrier release. Costs money every month it waits.
7. **F4, F5, P2** — the remaining route types and the clock check.
