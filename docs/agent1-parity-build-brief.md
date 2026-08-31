# Agent 1 build brief — closing the account-settings parity gap

Written 31 August 2026, after auditing every screen under **My Account** and
**Company** against the reference platform's own published documentation, and
after reading the backend source at `/root/UCAAS/mcm-repos/`.

This brief covers **58 items**: 17 half built, 19 missing, 8 deliberate
divergences to leave alone, and 14 already finished that you must not touch.
Each item has an ID, what is wrong today, what to build, which files it lives
in, the data shape, and the test that will be run against it.

Companion documents, already in this folder — read them, do not duplicate them:

- `company-security-build-plan.md` — the six Company → Security items, in depth.
  Items **C1–C5** below continue that plan rather than restating it.
- `admin-audit-tracker.md` — the state machine. Nothing here is done until a row
  in that file moves to CONFIRMED.
- `api-security-audit-2026-08-29.md` — the five open holes.

---

## Part 0 — Ground rules

These are not style preferences. Each one exists because breaking it has already
cost this project a rebuild.

### 0.1 Never name the reference product inside the product

No competitor name in UI copy, placeholder text, tooltips, error messages, code
comments, migration names, or anything a customer could read. Study them; do not
name them. Where a comment needs to explain why a rule exists, write
"established platforms" or describe the behaviour without attribution.

This brief names them because it is an internal document that never ships. The
code you write from it must not.

### 0.2 Nothing is finished on your say-so

Agent 3 retests every item with a control before its tracker row moves to
CONFIRMED. A file on disk is not a running process; compare the file's mtime
against the service's start time. A search returning zero is not proof of
absence until the same search finds something you know is there.

Report items as **CLAIMED**, never as CONFIRMED.

### 0.3 Do not ship a control without its consumer

Seventeen of the items in this brief exist because a screen was built that saves
a value nothing reads. That is now the single largest category of defect in this
product. From here on:

> A setting ships in the same batch as the code that acts on it, or it ships
> wearing an honest label saying it does nothing yet.

The honest-label pattern already exists — `SettingCard` with
`status="coming-soon"` and a `note` prop, used throughout
`src/pages/admin-settings/company/company-security.tsx`. Reuse it. Do not invent
a second one.

### 0.4 Merge, never replace

`settings`, `call_forwarding`, `greetings` and `notification_settings` are single
JSON columns shared by several screens. A screen that rebuilds the whole object
deletes what its neighbours own. The existing helper is
`src/lib/call-forwarding-record.ts` → `mergeCallForwarding`. Follow that shape
for any new shared record.

### 0.5 Backend source, and the two patches that only exist on the server

Source lives at `/root/UCAAS/mcm-repos/` (14 services, TypeScript, from
Bitbucket). Production runs a compiled `dist`.

Two security fixes were applied **directly to the compiled bundle on the server**
and have no equivalent in source:

| Patch | What it closes |
|---|---|
| `backend-patches/default-api/patch-logs-auth.py` | `/api/logs/file` and `/api/logs/<name>` served every server log, including request logs with real customer headers and bodies, to anyone with no token at all |
| `backend-patches/default-api/patch-role-self-edit.py` | Any signed-in user could rewrite the permission tree of the role they are currently assigned |

**The first `npm run build` of `default-api` erases both.** Before you compile
anything, port both fixes into `src/` and commit them. This is item **X1** and it
blocks every backend item in this brief.

### 0.6 Migrations are explicit

Models do not auto-sync. Every new column or table needs a file in
`default-api/migrations/`, named `YYYYMMDDHHMMSS-sync-<thing>-table.js`, applied
with `npm run db:migrate`. The most recent example is
`20260831103000-sync-user-mfa-table.js`.

### 0.7 Do not rebuild these — they are finished and correct

Sign out everywhere / sign out others · the "How calls reach you" panel · Media
Files library · idle timeout enforcement · Apply to people · custom profile
fields · display-number masking · per-device ring duration modelling ·
transcription and AI-monitoring interlock · company policy lock notes · the
"You will not be told" notification warning.

Several of these are better than the reference product. Leave them alone.

---

## Part 1 — Finish the second factor

**This is wave one and it is mostly built already.** Somebody scaffolded it
today. Read before you write.

### What already exists

| File | State |
|---|---|
| `default-api/src/models/UserMfa.ts` | Complete. Secret encrypted, backup codes hashed, `enabled` separate from `enrolled_at` |
| `default-api/migrations/20260831103000-sync-user-mfa-table.js` | Written. Confirm it has been applied |
| `default-api/src/helpers/totp.ts` | Complete, proved against the RFC's own test vectors |
| `default-api/src/helpers/backupCodes.ts` | Complete, hashed and single-use |
| `default-api/src/services/MfaService.ts` | Complete: `beginEnrolment`, `confirmEnrolment`, `isEnabled`, `verifySecondFactor`, `disable`, `backupCodesRemaining` |

**Nothing calls any of it.** No route, no controller, no screen. That is the gap.

### X0 — Correct two statements that are false today

Do this first. It is text only, no backend, and it stops the product lying about
itself.

Every sign-in already goes password → one-time code emailed to the account
address → session. It is keyed to `device_id`, allows five attempts, then locks
that device for ten minutes, and sits behind IP-velocity blocking. The code is
`AuthController.verifyOtp` in `default-api`, called from
`src/pages/login/index.tsx:157`.

Two places contradict this:

1. `src/pages/admin-settings/company/company-security.tsx` — the red banner
   around line 508 says "there is no MFA prompt in the sign-in flow". Delete that
   clause. Rewrite the banner to say what is true: email one-time codes are
   already mandatory for everyone; what is not yet enforced is the *policy* — the
   requirement switch, the exception list, IP restriction and SSO.
2. `src/pages/settings/security/index.tsx` — the page never mentions the second
   factor at all. Add a section (see **S1**).

**Test:** sign in from a clean browser profile; confirm the code is demanded.
Read both screens; neither may deny it.

### M-1 — Routes and controller for enrolment

**Build.** A new `MfaController` in `default-api/src/controllers/`, mounted in
`authRoute.ts` behind `AuthMiddleware`:

| Route | Body | Returns |
|---|---|---|
| `POST /api/mfa/enrol/begin` | — | `{ secret, uri }` from `MfaService.beginEnrolment` |
| `POST /api/mfa/enrol/confirm` | `{ code }` | `{ enabled: true, backup_codes: string[] }` — the codes are shown **once** |
| `GET  /api/mfa/status` | — | `{ enabled, enrolled_at, backup_codes_remaining }` |
| `POST /api/mfa/disable` | `{ password }` | `{ enabled: false }` — requires the current password, always |
| `POST /api/mfa/backup-codes/regenerate` | `{ code }` | New set, old set invalidated |

Rules that are not optional:

- `enrol/confirm` must reject if `MfaService.confirmEnrolment` returns false. An
  abandoned enrolment must cost nothing — that is why the service leaves
  `enabled` false until a working code is produced.
- `disable` requires the account password even if the person is already signed
  in. Otherwise a stolen session removes the protection the session was supposed
  to need.
- The secret is returned by `begin` and **never again**. There is no "show me my
  secret" route. The way back in is a backup code or an admin reset.

**Test:** enrol with a real authenticator app; confirm; sign out; sign in and be
asked for the app code, not the email code. Spend a backup code and confirm it
cannot be spent twice.

### M-2 — Second factor in the login flow

**Build.** `AuthController` currently issues the email OTP unconditionally.
Change the order to:

```
password verified
  └─ MfaService.isEnabled(user_uuid)?
       yes → challenge TOTP (accept a backup code as an alternative)
       no  → existing email OTP path, unchanged
```

Do **not** remove the email OTP path. It is the fallback for everyone who has not
enrolled, and it is the only protection most accounts have today.

Reuse the existing lockout machinery — `checkAuthActionBlock`,
`evaluateAuthAction`, `user_login_failure_velocity`. Do not write a second
counter.

**Test:** an enrolled user gets the app prompt. A non-enrolled user gets the
email code. Five wrong app codes lock the same way five wrong email codes do.

### M-3 — Trusted devices ("remember this device")

**Build. This is the item users will complain about first.**

Today `device_id` is sent on every login and stored, but nothing ever marks a
device trusted — so a code is emailed on literally every sign-in, forever.

Add to `devices_securities`:

| Column | Type | Meaning |
|---|---|---|
| `trusted_until` | `DATETIME NULL` | Second factor is skipped on this device until this moment |
| `last_seen_at` | `DATETIME NULL` | Updated on each authenticated request, throttled to once per 15 minutes |

Flow: on a successful second factor, if the person ticked "trust this device for
30 days", set `trusted_until = now + 30 days`. On the next login, if a row
matches `user_uuid + device_id` and `trusted_until > now`, skip the challenge.

Trust must be revoked by: signing that device out, changing the password,
disabling MFA, or an admin forcing logout. Any of those sets `trusted_until` to
`NULL` for the affected rows.

**Test:** tick the box, sign out, sign back in — no code. Change the password,
sign in — code demanded again.

---

## Part 2 — Security & Privacy, the personal page

`src/pages/settings/security/index.tsx`, routed at
`/admin-settings/account/security`.

### S1 — A two-factor section on the page

**Build.** Sits above the password card. Three states:

- **Not enrolled** — explain that a code is emailed on every sign-in today, and
  that an authenticator app is faster and safer. Button: *Set up an app*.
- **Enrolling** — QR code from the `uri`, the secret in text for manual entry, a
  six-digit field, then the backup codes shown once with a copy button and a
  clear warning that they will not be shown again.
- **Enrolled** — when it was set up, how many backup codes remain, buttons to
  regenerate codes and to turn it off (password required).

Write the copy so somebody who has never heard the phrase "two-factor" can
follow it. "A second check when you sign in", not "2FA enrolment".

**Test:** all three states render; the backup codes appear exactly once.

### S2 — Make the device list readable

**Build.** Today each row shows a raw user-agent string and an IP address. A
person cannot recognise a session they should not trust from
`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...`.

Each row should show: a plain device name ("Chrome on Windows"), where it was
last used (city and country from the IP), when it was last seen, and when it
first signed in. Keep the raw user-agent behind a "details" disclosure — it is
useful when something looks wrong.

Parse the user-agent client-side; do not add a dependency that phones home.

**There is a blocking bug underneath this.** In
`default-api/src/models/DeviceSecurityModel.ts`:

```
ip_address: DataTypes.STRING(11)   // an IPv4 address needs 15
user_agent: DataTypes.STRING(36)   // a real user-agent is 100–200
```

Both are being silently truncated, which is why the strings on screen look
wrong. Verify the live column types against the model — they may differ if the
table predates it. Widen to `STRING(45)` for the IP (fits IPv6) and `TEXT` for
the user-agent, with a migration. **Do this before building the parser**, or you
will parse rubbish.

**Test:** sign in from two browsers; both rows name the right browser and OS, and
the stored IP matches the real one character for character.

### S3 — Sign-in history

**Build.** The reference product's own "my account was compromised" guide is four
steps, and step three — check your recent activity — is impossible here. There
is no last-sign-in time anywhere in this product.

New table `user_auth_events`:

| Column | Notes |
|---|---|
| `uuid`, `user_uuid`, `company_uuid` | |
| `event` | `login_success`, `login_failure`, `otp_failure`, `mfa_enrolled`, `mfa_disabled`, `password_changed`, `session_revoked` |
| `ip_address` | `STRING(45)` |
| `user_agent` | `TEXT` |
| `device_id` | |
| `created_at` | Indexed with `user_uuid` |

Write from `AuthController` at each of those moments. Surface the last 50 on the
Security page as a simple list. Retain 90 days.

This table is also the foundation for **C5**, the company-wide change log — build
the shape with that in mind.

**Test:** sign in, fail a password, change the password; all three appear with
correct times and IPs.

### S4 — Password rules

**Build.** `src/pages/change-password/schema.ts` currently requires 8 characters.
The reference requires 12, plus a number, a capital and a symbol, and blocks the
last 10 passwords from reuse.

1. Raise the minimum to 12. One line. Do it today.
2. Add reuse history: new table `user_password_history` holding
   `user_uuid`, `password_hash`, `created_at`. On change, bcrypt-compare the new
   password against the last 10; reject a match with a clear message. Trim to 10.
3. Mirror the rule server-side. A client-only rule is a suggestion.

**Test:** an 11-character password is rejected. Setting a password, changing it,
then setting the first one again is rejected.

### S5 — Decide what "& Privacy" means

**Build or rename.** The page is titled "Security & Privacy" and contains no
privacy content at all. Two acceptable outcomes; pick one and say which:

- **Bring privacy onto the page** — a read-only summary block: is my call
  recording on, is transcription on, how long are recordings kept (from Company →
  Policies), and a link to each place it is changed.
- **Rename the page** to "Password & devices" and leave privacy where it lives.

Do not leave a title promising something the page does not have.

### S6 — Surface the voicemail PIN here

**Build.** `settings.voicemail_pin` is edited under Preferences → Voicemail
Settings. A PIN is a credential and people look for credentials on the security
page. Add a card that shows it is set and links to where it is changed, or move
the editor here outright.

### S7 — Admin unlock

**Build.** Lockout today is purely time-based — ten minutes, no override. Add
*Unlock account access* to the People screen's per-user menu, admin only, which
clears `blocked_until` on the `Otp` rows for that user and writes a
`session_revoked` event to `user_auth_events`.

---

## Part 3 — Company security enforcement

These continue `company-security-build-plan.md`. Read it first; this section only
adds what the parity audit found on top.

### C1 — Wire the MFA requirement and its exception list

The switch and the exception list save into the company default template row and
control nothing. Once Part 1 lands, make them real:

- `mfa_required = true` forces enrolment at next login for anyone not on the
  exception list.
- Nobody holding an admin role may be on the exception list. The screen already
  enforces this client-side and already detects people promoted after being
  added — enforce the same rule server-side.
- While `mfa_required` is off, enrolment stays voluntary and the email OTP
  remains the floor for everyone.

**Test:** turn it on with a test user not exempt; that user is forced through
enrolment on next sign-in. Add them to the exception list; they are not.

### C2 — IP allowlist enforcement

Recorded, never checked. Enforce in `AuthMiddleware` — it already runs on every
request and already carries a route-scoping precedent
(`PLAN_RENEW_ALLOWED_ROUTES`), so extend that idiom rather than inventing a new
layer.

Two rules that must not be skipped:

- Evaluate on **sign-in and on every request**, not sign-in alone. A session
  started inside the allowlist and continued outside it is exactly the case this
  protects against.
- Refuse to save an allowlist that does not contain the saving admin's own
  address. The screen cannot do this check — a browser does not know its own
  public IP — but the server does. Move the check server-side and drop the
  acknowledgement checkbox once it is there.

### C3 — SAML single sign-on

Fields are recorded; no handler exists. Full build: ACS endpoint, assertion
signature verification against the stored certificate, `NameID` → user mapping,
single logout if a URI is configured. An SSO user skips both the email OTP and
the app code — the identity provider has already done the checking.

Large. Schedule after C1 and C2.

### C4 — Idle timeout — verify only, do not rebuild

Already enforced client-side by `src/hooks/use-idle-timeout.ts`. This is a
control the reference product does not offer at all. Confirm it still fires after
the Part 1 login changes, and leave the honest note that it signs somebody out of
this app only.

### C5 — Company change log

**Build.** Nothing records who changed what. Extend the `user_auth_events` table
from **S3** into a general `company_events` log covering: user created, user
deleted, role changed, plan changed, number assigned, security settings saved,
company settings saved.

Surface as a filterable table under Company, admin only, plus a CSV export.
Retain 12 months.

This is the largest single gap in the audit and it grows more expensive every
month the product runs without it.

---

## Part 4 — Profile and Preferences

### P1 — Pronouns

**Build.** A profile field beside name and job title, shown wherever a name is
shown. Company → Profile fields already exists as the place to make it optional
or required. Small.

### P2 — Interface language

**Build, phased. This is the largest non-security item and it blocks every
non-English market.** There is no i18n library in `package.json` today; the
console is English-only with no selector and no translation layer.

- **Phase 1** — install `react-i18next`, wrap the app, extract the strings from
  My Account and Company only, ship English plus one second language end to end.
  This proves the pipeline on a bounded surface.
- **Phase 2** — extract the remaining screens.
- **Phase 3** — locale-aware dates, times and number formats, driven from the
  regional settings already stored under `settings.operational_hours.regional`.

Store the choice as `settings.language`, defaulting from the site. Do not attempt
all three phases at once.

### P3 — Local time on a colleague's card

**Build.** The timezone is already stored per person. Show "3:40 PM local" on the
directory card and warn before messaging somebody outside their business hours.
Small, and it makes the timezone field earn its place.

### P4 — AI training opt-out

**Build.** A per-person switch: may my calls and transcripts be used to improve
the models. Increasingly a procurement question, not a nice-to-have. Store as
`settings.ai_training_opt_out`. If nothing consumes it yet, ship it with the
honest label from 0.3.

### P5 — Enforce international calling

**Build. Priority: this is the one half-built toggle with a direct money
consequence.** The per-person switch on Preferences is explicitly marked as not
enforced. A stolen password today can dial premium international numbers billed
by the minute.

Enforce at the dialplan, not the browser. Check the person's flag, then the
company rule, before allowing a call whose destination country differs from the
account's own.

---

## Part 5 — My Phone and call handling

Several of these are blocked on the call path, not on the console. Where that is
so it is said plainly.

### M4 — Business hours are never evaluated

**Build.** The dialplan never checks the clock. Business hours, holidays and the
closed-hours action are stored and have no effect on a live call. The screen is
richer than the reference product's and delivers less.

Blocked on dialplan work. Until it lands, the screen must carry an honest label.

### M5 — Ring duration is hardcoded

**Build.** Per-device ring duration is modelled better than the reference
product's single slider, and the dialplan ignores all of it. Same blocker as M4;
same honest label until fixed.

### M6 — Nine of eleven forwarding targets cannot connect

**Build.** The dialplan implements two route types. Queue and menu targets never
arrive. Either implement the remaining types or remove them from the picker —
offering a target that silently drops calls is worse than not offering it.

Retest whether personal fallback targets on My Phone share this limit; the audit
established it for number forwarding.

### M7 — Custom status and automatic DND

**Build.** Three fixed states today: Available, Busy, DND. Add free-text custom
status, and an automatic DND that switches itself on outside the person's
business hours (depends on M4).

Note the existing honesty defect: the **Busy** status promises internal calls go
to voicemail and they do not. Fix the behaviour or keep the corrected label.

### M8 — Split busy from unanswered

**Consider.** Ours collapses busy, unanswered and unreachable into one fallback.
The reference offers three explicit choices when you are already on a call: call
waiting, busy signal, or advanced routing. A caller who hears a busy tone and a
caller who is ignored are not the same event.

Lower priority than M4–M6, and pointless before them.

### M9 — Verify a forwarding number before ringing it

**Build.** Any number can be added as a forwarding target with no proof of
ownership. The reference calls the number and asks the person to press 1. Without
that, one typo forwards a stranger's calls to somebody's phone.

Cap at five forwarding numbers per person, as they do.

### M10 — Desk phone self-provisioning

**Build.** Users cannot add a desk phone themselves. Needs a supported-model
list, a provisioning URL and a MAC-address flow. Large, and lower value than
everything above it.

### M11 — Press 0 to skip voicemail

**Build.** Let callers press 0 during a greeting and route to the main line or a
chosen destination. Depends on the dialplan work in M4–M6.

---

## Part 6 — Notifications

### N1 — Restore voicemail and missed-call delivery

**Build. Down since 24 August.** The Notifications screen is the best-built
thing in this audit and it currently controls nothing that sends.

**Read this before you start, because it changes the shape of the fix.**
`notification-api`'s `/notification/send` does **not** load the recipient's
stored preferences. It honours whatever `notification_settings` block the
*calling service* passes it. So a stored preference only means something if the
service raising the event loads it and passes it on.

`chat-api` and `SmsController` already do this correctly — copy their pattern.
Whatever raises voicemail and missed-call events must:

1. Load `notification_settings` from the user record.
2. Pass the relevant block to `/notification/send`.

Also correct the missed-call script noted in the code: it is referenced by no
dialplan, posts to a placeholder address, and uses `!=`, which is not valid Lua.

Remove the amber banner in `src/pages/settings/notification/index.tsx` **in the
same change that makes delivery real** — not before.

### N2 — `security_alert` is not what the frontend comment claims

**Correct the comment.** The comment in `notification/index.tsx` says
`security_alert` is the only key any service reads out of `notification_settings`.
That is misleading. `security_alert` is an **operator alert** raised by
`security-api`'s `SecurityAlertNotificationDispatcher` with SEV-1/SEV-3
severities, and the dispatcher **hardcodes its own channel block** rather than
reading the user's stored preference. It is not a per-user setting and should not
be exposed as one.

If a per-user "somebody signed in as you" alert is wanted, that is a new event
type built on the `user_auth_events` table from **S3** — not a reuse of this key.

### N3 — SMS and push channels

**Build.** Both channels are offered on the screen and neither has ever sent.
Either wire them or hide them. Do not leave switches that do nothing.

### N4 — Scheduled reports and queue alerts

**Build.** The reference lets a person subscribe to scheduled report emails and
to per-contact-centre alert topics. Neither exists here. Depends on N1's delivery
path working.

---

## Part 7 — Greetings, voicemail and media

### G1 — State the limits

**Build.** Uploads have no stated length or size limit. The reference publishes
45 seconds and 10 MB for a voicemail greeting. Enforce a limit and print it
before the upload, not after it fails.

### G2 — Voicemail cloud backup

**Build.** Not offered. Lower priority.

### G3 — Voicemail drop

**Build.** Drop a pre-recorded message on an outbound call. A sales feature; the
reference sells it as a paid add-on, which makes it a revenue item rather than a
parity item.

### G4 — SMS auto-reply

**Build.** An automatic reply to inbound texts outside business hours. Depends on
M4.

---

## Part 8 — Safety, compliance and platform

### E1 — Personal emergency location

**Build. This is a compliance gap, not a feature gap.** Only a company-level
emergency address exists. The reference allows ten saved personal working
locations that override the office address, precisely because people work from
home. Somebody dialling emergency services from a kitchen table today sends
responders to head office.

Store up to ten per person; prompt on first sign-in from a new network.

### E2 — Executive assistant pairings

**Build.** An assistant answers an executive's calls. Both sides confirm by email
before it takes effect. Well-defined, self-contained, no dialplan dependency
beyond routing that already exists.

### E3 — Finish call blocking

**Build.** A contact carries one tag — Standard, VIP, DNC or Blocked — and
nothing else. There is no way to block calls but not messages, to choose what the
caller hears, or to block a number that is not a saved contact.
`src/lib/contact-blocking.ts` already models the full decision and documents
exactly which parts the platform cannot keep. Build the storage that module is
waiting for.

### E4 — API keys

**Build.** No way for a customer to get programmatic access. Needs key issue,
scope, revoke, and last-used, plus an entry in the change log from C5.

### E5 — SCIM provisioning

**Build.** Users are created by hand through the Add People wizard. SCIM with a
directory provider creates, updates and deactivates automatically. Schedule after
C3 — the same customers ask for both.

---

## Part 9 — Order of work

Grouped so each wave ships something whole. Do not start a wave before the one
above it is CONFIRMED.

**Wave 1 — honesty and the second factor.** X1 (port the two dist patches), X0
(correct the false MFA statements), S4 part 1 (password minimum to 12), M-1, M-2,
M-3, S1. Highest value, mostly built already, and it stops the product
misdescribing itself.

**Wave 2 — the security page becomes real.** S2 (including the column-width bug),
S3, S4 parts 2 and 3, S5, S6, S7.

**Wave 3 — money and safety.** P5 (international calling enforcement), E1
(personal emergency location), C2 (IP allowlist enforcement), N1 (restore
notification delivery).

**Wave 4 — the call path.** M4, M5, M6. These unblock M7, M8, M11 and G4, and
they are the difference between a console that stores intentions and a phone
system that honours them.

**Wave 5 — company scale.** C5 (change log), C1 (MFA policy), C3 (SAML), E5
(SCIM), E4 (API keys).

**Wave 6 — reach and polish.** P2 (language, phased), P1, P3, P4, E2, E3, N3, N4,
G1, G2, G3, M9, M10.

---

## Part 10 — Definition of done

An item is done when all five are true:

1. The behaviour works on the live system, tested by Agent 3 with a control.
2. If it stores something, something reads it — or the screen says plainly that
   nothing does yet.
3. No competitor name appears anywhere in what shipped.
4. Any shared JSON record is merged, not replaced, and a neighbouring screen's
   settings survive a save.
5. Its row in `admin-audit-tracker.md` names the evidence: what was run, what was
   read, and what the control was.

Report progress as CLAIMED. Agent 3 moves rows to CONFIRMED, and only on a
retest.
