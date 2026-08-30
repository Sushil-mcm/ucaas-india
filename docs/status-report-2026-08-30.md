# Admin audit — full status, 30 August 2026

Where every item stands after a day of work by three agents. One row per item,
with when it was last verified and by what evidence.

**Scope note.** Everything below marked *verified* was checked against the
running system between 08:00 and 09:35 today. After 09:35 this session lost
server access, so anything landed in the last part of the morning is marked
*needs retest* rather than guessed at. Nothing here is reported from a commit
message alone.

---

## The pattern worth reading first

**Written is not deployed.** Several fixes exist as patch scripts in
`backend-patches/`, are correct, and are not running on the live machine.

The clearest case: `backend-patches/fs-xml-api/apply-ivr-route.sh` was committed
at 08:43 with the message "verified end to end". At 09:33 the live dialplan on
142.93.121.121 still contained **zero** references to `ivr` — against a control
of `EXTENSION` = 1 on the same file. The patch is good. It is simply not applied
to the machine that takes calls.

This is the same shape as the earlier wrong-box deploy: work that is genuinely
finished, genuinely tested, and genuinely absent from production. It is the
single most expensive failure mode on this project, because everything reports
success.

**Before closing any item below, check the live machine, not the repository.**

---

## Fixed and verified today

| # | Item | Evidence |
|---|---|---|
| F1 | Queue engine now loads | `callcenter_config queue list` returns the full column header, was `-ERR Command not found`. `callcenter` + `callcenter_track` in the application list. `callcenter.conf` now 200, was 400. Control: `bridge` present. Verified 09:26 |
| D1 | Calling restrictions reach the dialplan | `get_calling_rules` and `international_refusal` present, 2 each. File mtime 09:15:25, process started 09:15:31 — process newer, so the running code is the new code. Verified 09:15 |
| D2 | Mistyped extensions no longer dial out | `NO_ROUTE_DESTINATION` present in the running file. Verified 09:15 |
| C1–C5 | Five Company fixes | Settings-blob wipe, Security admin-only, rules links, per-section URLs, ring-time header. Verified in source |
| A1–A2 | Two stale security notes corrected | Both rewritten; the three server gaps behind them confirmed live by mtime vs process start |
| N4 | Expired-plan buy-flow check | Now reads `company_info`, the field that exists |
| — | Repository backup | 116 commits to Furkan, Adnan and private GitHub, hourly. Restore-tested on both mirrors: 114 commits, 29 branches, 3/3 audit docs |

---

## Open — highest value first

### 1. The call router reads a frozen snapshot of the database

**This is the most consequential finding of the audit, and it undermines D1
above.**

`dialplan_service.py` opens one global database connection and never commits or
rolls back. `pymysql` defaults to autocommit off, and there is no `autocommit`,
no `.commit()` and no `.rollback()` anywhere in the file. MySQL's default
isolation then holds that connection on a single snapshot for as long as it
lives.

What that means in practice:

- A number added after the service started may never be routed.
- A calling restriction an admin sets may never take effect — which means the
  international-calling enforcement that went live at 09:15 may be reading a
  frozen picture and refusing nothing.
- New users and extension changes may be invisible.

The 60-second rules cache is irrelevant; the staleness is underneath it.

**Fix:** set `autocommit=True` on the connection. One line.

**How to prove it rather than assume it:** add a number through the admin
screens, then place a call to it. If the call fails while the row plainly exists
in the database, this is why. I could not run that test — it needs a write to
the live database, which is outside my brief.

### 2. Outbound calls cannot authenticate to the carrier

`/etc/kamailio/include/routing.cfg` lines 272–273 still read:

```
$avp(auser) = "CHANGEME_USERNAME";
$avp(apass) = "CHANGEME_PASSWORD...";
```

with a comment above saying "TODO: Update these with actual credentials from
provider". `uac_auth()` and `t_relay()` follow, so this is the live
authentication path, not dead config. Provider realm `mcm` at 38.147.130.91.

**Blocked on the account owner** — nobody can fix this without the real details
from the carrier.

### 3. Voicemail is switched off in the switch

`/etc/freeswitch/autoload_configs/modules.conf.xml` line 26:

```
<!--<load module="mod_voicemail"/>-->
```

Not in `show modules`. Nothing beginning `voicemail` in `show application`.
Control: `mod_dptools` 154, `bridge` present. The `.so` is in the image and
`voicemail.conf` serves correctly at 200 — so this is not the callcenter
problem, it is one commented-out line.

**Zero `.wav` files** exist under the voicemail store. No voicemail has ever been
taken on this machine.

**Do this before the IVR branch.** Queues, hours, call rules and number
forwarding all fall back to voicemail. Routing to a destination that does not
exist buys nothing.

Do not simply uncomment it: whoever disabled it may have had a reason, and
`mod_voicemail` can fail to load exactly as `mod_callcenter` did. Confirm with
`show application | grep '^voicemail'` before testing a call.

### 4. The IVR branch is written and not applied

`backend-patches/fs-xml-api/apply-ivr-route.sh` exists and is correct. The live
dialplan does not have it. Applying it is the highest value-per-effort item
here: the switch has the `ivr` application, the configuration is generated
correctly, and the admin screens are complete. Only the route builder never
calls it.

### 5. Queues still cannot take a call

The engine runs and the agent lookup answers on 9006. Two things remain:

- The `callcenter.conf.xml` template renders only `<queues>` — no `<agents>`,
  no `<tiers>`. Nobody would be in any queue.
- The dialplan has no queue branch. Verified 09:33: `callcenter`, `queue`,
  `QUEUE`, `cc_queue` all 0 against a control of `EXTENSION` = 1.

### 6. Only one destination works end to end

`build_inbound_dialplan` handles `EXTENSION` (line 1239) and `VOICEMAIL`
(line 1252). Everything else logs "unhandled route type" and the call fails.
And of those two, voicemail fails anyway because the module is not loaded — so
**one of eleven route types works.**

Departments never receive calls: zero references in the dialplan.

### 7. Opening hours are never evaluated

The builder reads `call_handling.business_hours` and nothing else. No
`after_hours`, no `holiday`, no `closed`, and no clock comparison.

Not a missing-data problem: `releaseDidForwarding` in default-api parses both
`business_hours` **and** `closed_hours`, so the stored data already carries
closed-hours routing. It is a missing branch, same shape as the IVR one.

### 8. Releasing a number never tells the carrier

`releaseDid()` calls `CommonHelper.releaseDidForwarding()`, which soft-deletes in
our own database only — sets `deleted_at`, nulls `forward_call_actions`,
`site_uuid`, `user_uuid`. `DidController.js` has zero references to
`DID_WW_URL`, `didww` or `wholesale`.

Costs money every month it waits, and grows with every release. The identity flow
already has a working wholesale-API path through `DidwwHelper`, so the plumbing
exists.

### 9. The permission tree is never enforced

All three uses of `rbac` in default-api are in the **login response** —
`rbac: findRole?.permission ?? {}` at AuthController 426, 721, 2435. Handed to
the browser at sign-in, never consulted again. No authorization middleware for
tenant users; `AdminMiddleware` authenticates a separate platform Admin model and
is used by no router. The only real gate is 51 role-string comparisons.

The two screens where an admin builds the tree now carry an honest label, so
nobody is misled — but the behaviour is unchanged.

### 10. Per-person call rules never affect a call

The directory service reads none of it: `forward`, `call_rule`, `callRules`,
`forwarding`, `do_not_disturb`, `settings` all 0, against controls of
`user_call` = 1 and `dial-string` = 3 on the same file. Its dial-string is plain
`sofia_contact(*/user@domain)` — it rings whatever is registered.

Do Not Disturb, forward-all and the whole call-rules screen sit on this.

### 11. Call recording records nothing

`record` and `recording` both 0 in the dialplan. The four recording scripts
reference only each other; no dialplan or config invokes any of them.
FreeSWITCH has `record_session` available and nothing calls it. Zero recordings
on disk.

**Watch out for the false positive here**: a naive search reports
`dual_leg_record.lua` "referenced by 4 files", and those four are the scripts
citing each other.

### 12. Company greetings are never played

`greeting`, `playback`, `media`, `welcome`, `moh`, `hold_music` — all 0 in the
dialplan.

### 13. Default ring time is labelled Active and is not

`RING_TIME_STATUS = 'active'`, so the screen shows the active badge. The switch
hardcodes `call_timeout` 30 / 60 / 30 (lines 255, 285, 327) and reads no stored
value — `ring_time`, `company_ring_time`, `call_forwarding`, `ring_duration`,
`timeout_seconds` all 0.

The file's own header warns about this outcome: *"An admin who believes they
have shortened the ring and has not will read every missed call as a fault
somewhere else."*

### 14. Notification toggles do nothing

The only key any service reads out of `notification_settings` is
`security_alert`. Voicemail, missed-call and SMS toggles are never branched on.
The missed-call script is unreferenced, posts to `http://example.com/api/books`,
uses an undefined variable, and uses `!=`, which is not valid Lua.

Now labelled honestly on screen; behaviour unchanged.

### 15. Number forwarding merge — needs a live confirm

The front end now merges instead of replacing. What was never proven is whether
`set-number-forwarding` and the AI-receptionist assign flow actually write the
same database row. Worth ten minutes with a real record before closing.

---

## Needs retest — landed after this session lost server access

| Item | Committed |
|---|---|
| Unauthenticated log access, and role self-escalation | 09:44 |
| Full price list rather than one country at a time | 09:30 |
| Two company rules enforced in tenant-api | 07:47 |
| Queue settings the backend refuses, plus four open doors | 07:49 |

None of these has been checked against the running system by me.

---

## Suggested order

1. **Set `autocommit=True`.** One line, and until it is done nobody can trust
   that any database-driven fix is actually taking effect — including the
   calling restrictions that just went live.
2. **Load `mod_voicemail`.** One line. Everything else falls back to it.
3. **Apply the IVR patch to the live machine.** Already written.
4. **Carrier credentials.** Blocked on the account owner.
5. **Queue agents and tiers in the template, then the queue branch.**
6. **The clock check** for hours and holidays.
7. **Carrier notification on number release.** Costs money while it waits.
8. **Call recording, greetings, ring time, per-person call rules.**

---

## The two rules that caught real errors today

**A patch on disk is not a patch in the running process.** Compare the file's
mtime with the service's start time; the service must have started later. This
caught the IVR patch, and it caught a whole deploy that went to a machine nobody
calls.

**A zero proves nothing until the same search finds a control.** A wrong path, a
compiled binary instead of source, or a mistyped command all return zero and look
identical to a real finding. Three near-misses today: a grep against `routes/`
when the directory is `routers/`, `show applications` when the command is
`show application`, and a backup that reported success and restored nothing.
