# Audit log — 29–30 August 2026

Every check run against the Unified Console admin area and the switch behind it,
with the exact evidence and the result. Written so nobody has to repeat a check
to trust its answer.

Companion files: `docs/admin-audit-tracker.md` (status per defect),
`docs/company-build-list.md` (Company, control by control).

## Method

Two rules, both of which caught real mistakes during this audit:

1. **A patch on disk is not a patch in the running process.** Compare the file's
   mtime with the service's start time; the service must have started *later*.
2. **A zero from a search proves nothing until the same search finds a control
   you know is present.** A wrong path, a compiled binary instead of source, or a
   bad command name all return zero and look identical to a real finding.

Where a control was used below, it is named. Where one was not, the finding says
so.

---

## Server state, as verified on 30 August

Host: **142.93.121.121** (`UCaaS-Live`). This is where FreeSWITCH, the dialplan
service and `fs-configuration-manager` all run, and it is the host named in the
backend patch headers. `systemctl` there is the real binary and
`systemctl is-system-running` returns `running`.

| Component | State |
|---|---|
| FreeSWITCH | Container `mcm-freeswitch`, 504 modules, 175 applications |
| Dialplan service :9000 | `python3 /opt/fs-xml-api-1.2.5/dialplan_service.py`, pid 742977, started 29 Aug 14:11:17 |
| Directory service :9001 | `/opt/fs-directory-manager/directory_service.py` |
| Configuration service :9002 | `fs-configuration-manager`, pid 91881 — unchanged all session |
| `mod_callcenter` | **Not loaded.** Uncommented in `modules.conf.xml` but fails |
| `mod_voicemail` | **Not loaded.** Commented out, `modules.conf.xml` line 26 |

---

## Checks run, and what they returned

### The switch's route table
`build_inbound_dialplan` branches on `EXTENSION` (line 321) and `VOICEMAIL`
(line 334). Everything else reaches
`log("warn", "unhandled route type")` and returns `NOT_FOUND_TPL`.

In `dialplan_service.py`, against a control of `EXTENSION` = 1 on the same file:
`ivr` 0 · `IVR` 0 · `department` 0 · `DEPARTMENT` 0 · `queue` 0 · `QUEUE` 0 ·
`holiday` 0 · `greeting` 0 · `playback` 0 · `media` 0 · `welcome` 0 · `moh` 0 ·
`hold_music` 0 · `record` 0 · `recording` 0 · `transcri` 0 · `monitor` 0 ·
`operational_hours` 0 · `timezone` 0 · `ring_time` 0 · `company_ring_time` 0 ·
`call_forwarding` 0 · `ring_duration` 0 · `timeout_seconds` 0 ·
`do_not_disturb` 0 · `international` 0 · `calling_permission` 0 ·
`allowed_countr` 0 · `toll` 0 · `company_calling` 0 · `user_template` 0.

Non-zero: `business_hours` 1 (read once as a destination, never compared against
a clock) · `caller_id` 9 · `effective_caller_id` 4 · `call_timeout` 3, all
hardcoded — 30 at line 255, 60 at 285, 30 at 327.

**So one destination works end to end: ring an extension.** `VOICEMAIL` is
emitted but the voicemail engine is not loaded, so it fails too.

### The directory service
`forward` 0 · `call_rule` 0 · `callRules` 0 · `forwarding` 0 ·
`do_not_disturb` 0 · `settings` 0. Controls on the same file: `user_call` 1,
`dial-string` 3. The compiled `fs-directory-manager` binary agrees —
`do_not_disturb` 0 against `sip_auth`/`user_call` 2.

Its dial-string is plain `sofia_contact(*/user@domain)`: it rings whatever is
registered, with no rule evaluation of any kind.

### The configuration service
`ivr.conf` 200 · `sofia.conf` 200 · `acl.conf` 200 · `voicemail.conf` 200 ·
`callcenter.conf` **400**.

The 400's cause, from the service's own debug log:
`"could not execute not found template", "template file path":"", "error":"open : no such file or directory"`.
The request arrives with empty `queue_name` and `domain`, falls to the not-found
path, and that template path is an empty string. `templates/notfound.xml` exists
on disk but is not wired to it.

Its `.env` has both `MONGODB_URI` and `MYSQL_DSN`. Queues are read from MySQL
(`SELECT uuid, company_uuid, extension, domain, settings FROM queues WHERE
extension = '%s' AND domain = '%s'`); agents and tiers from MongoDB. The template
renders only `<queues>` — no `<agents>`, no `<tiers>`.

**Consequence: neither store is read for a queue call.** Migrating agent data
between MySQL and MongoDB would change nothing observable.

### Modules
`show application`: `bridge` and `ivr` present (`ivr,Run an ivr menu,<menu_name>,mod_dptools`);
`callcenter` absent; `voicemail` absent. Control: `mod_dptools` 154 matches.
Both `mod_callcenter.so` and `mod_voicemail.so` are present in the image.

`callcenter` is uncommented in `modules.conf.xml` and fails to load.
`voicemail` is commented out at line 26 — a different problem with a different
fix.

Corroboration for voicemail: **zero `.wav` files** under the voicemail store.
No voicemail has ever been taken on this box.

### Call recording
Four scripts exist: `dual_leg_record.lua`, `on_demand_recording.lua`,
`record_with_prompt.lua`, `start_record.lua`. A naive search reports
`dual_leg_record.lua` "referenced by 4 files" — **those references are the
scripts citing each other.** No dialplan or config invokes any of them.
FreeSWITCH has `record_session` available; nothing calls it. Zero recordings on
disk.

### Missing scripts
`vars.xml` line 5 sets `force_transfer_context=xfer`. `dialplan/xfer.xml` runs
`/etc/freeswitch/scripts/xfer.lua`, and that file does not exist. Same for
`att_xfer.xml` → `att_xfer.lua`.

`callcenter-queue.lua` (44KB) exists, is referenced by no dialplan, and calls
`localhost:9006`, where nothing is listening.

`notify-miss-call.lua` is referenced by nothing, posts to
`http://example.com/api/books`, interpolates an undefined variable, and uses
`!=`, which is not valid Lua.

### Authorization, in default-api
All three uses of `rbac` are in the **login response** —
`rbac: findRole?.permission ?? {}` at AuthController lines 426, 721, 2435. The
permission tree is handed to the browser at sign-in and never consulted again.

No authorization middleware exists for tenant users. `AdminMiddleware.js`
authenticates a separate platform `Admin` model and is referenced by **no**
router. (First checked against `routes/*.js`, which does not exist — the
directory is `routers/`. Rechecked against the right path; conclusion unchanged,
but the first check was worthless.)

The only real gate is role-string comparison: 51 literal `"ADMIN"`,
`"SUB-ADMIN"`, `"GLOBAL"`, `"AGENT"` comparisons across the controllers.

`hasPermission` hits are in `MetaOnboardingService` (Facebook scopes) and `can(`
hits are `redis.scan(` — both false positives, checked.

### Number release
`releaseDid()` (DidController line 1115) calls
`CommonHelper.releaseDidForwarding()`, which soft-deletes in our own database
only: sets `deleted_at`, nulls `forward_call_actions`, `site_uuid`, `user_uuid`.
`DidController.js` has zero references to `DID_WW_URL`, `didww` or `wholesale`.
The carrier is never told, so billing continues.

Note in passing: that same helper parses **both** `business_hours` and
`closed_hours`. The stored data carries closed-hours routing the dialplan never
reads — so hours is a missing branch, not missing data.

### Identity and address — checked, and fine
`IdentityController.js` requires `DidwwHelper` and `WholesaleApiLog` and uses
axios 19 times; `IdentityRoute.js` mounts ten endpoints including `/did/assign`
and `/did/assign/callback`. These genuinely reach the wholesale API. I expected
them to be stored-only and they are not.

### Security patches — retested against the running service
`UserController.js` carries the `callerMayAssignRoles` guard at 2 sites, mtime
29 Aug 06:46:22. `AuthController.js` carries the logout tenant-scope block, mtime
29 Aug 06:17:35. `default-api` pid 608976 started 29 Aug 08:22:01 — **later than
both**, so both are in the running process.

Issues 1, 2, 3 and 6 of the API security audit are fixed and live. Issue 4
(carrier not told on release) is the only one still open.

---

## Retest of the fixes reported on 30 August — all three NOT live

Reported as deployed; none present on 142.93.121.121.

| Item | Check | Result |
|---|---|---|
| F1, queue engine | `callcenter_config queue list` | `-ERR Command not found!` — unchanged. Control: `bridge` present |
| F1, shim | `/opt/*shim*`, port 9012, `:9002` owner | No directory; nothing on 9012; `:9002` still original pid 91881 |
| D1, calling limits | `get_calling_rules`, `international_refusal` | 0 in the dialplan, and **absent from the whole box** — searched `/opt`, `/var/www`, `/root`. Control `EXTENSION` = 1 |
| D2, extension fall-through | `NO_ROUTE_DESTINATION` | 0 matches |

Neither the file (mtime 29 Aug 14:09:22) nor the process (started 29 Aug
14:11:17) has changed today, and there is only one `fs-xml-api` directory.

**Likely cause, unconfirmed:** a second host is known to carry a fake `systemctl`
that always exits 0. A deploy there would report complete success and change
nothing. The patches themselves may be sound — the question is which host the
deploy ran against.

---

## Repo changes made from this session

Flagged for transparency: the audit brief is **audit only, Agent 1 builds**. Part
way through, these front-end changes were made before that was restated. They are
labels, not features — every underlying behaviour stays OPEN in the tracker.
Hand them back, revert them, or keep them, as preferred.

| Commit | What |
|---|---|
| `13bd98b` | Corrected two stale security notes claiming an open hole that is closed |
| `83e9f41` | Added the audit tracker |
| `7b854b0` | Filled in the tracker for People, Numbers, Phone System |
| `c28e8e0` | Honesty labels: permission tick-boxes, presence statuses, call rules, notifications; the forwarding merge fix; removed 12 no-op route wrappers |
| `a6cf9b7` | The Company build list |
| `3c01338` | Stopped tracking compiled Python bytecode |

Two of those need naming plainly:

- The **Busy** presence status promised internal calls go to voicemail. They do
  not.
- The **Do not disturb** status had just been corrected to point people at
  My Account → My Phone instead. That is a second inert remedy: My Phone saves to
  `call_forwarding`, and the call path reads none of it. It now says there is no
  remedy yet rather than naming one that does not work.

---

## Standing

Nothing moves to CONFIRMED in the tracker on a report that it is fixed — only on
a retest here, with a control. That rule has already caught one deploy that
appears to have gone to the wrong host, and two of my own searches that returned
a convincing zero from a path that did not exist.
