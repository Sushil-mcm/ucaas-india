# Company Security — build plan for the six blocked items

Written 31 August 2026, after reading `default-api` source at its real location.

**Source is at `/root/UCAAS/mcm-repos/`, not `/root/unified2-backend/`.** Version
1.2.9, matching production. 14 services, all with TypeScript source. An earlier
note in this repo said `default-api` had no source; that was wrong and came from
checking the wrong directory.

---

## What the authentication layer does today

`src/middlewares/AuthMiddleware.ts`, read end to end.

It **authenticates** and does not **authorise**. Specifically it:

- Verifies the JWT against `JWT_SECRET`
- Looks up active sessions in `DeviceSecurity`, capped at `MAX_CONCURRENT_LOGINS`
  (default 3)
- Handles encrypted-vs-plaintext stored tokens, upgrading plaintext on use
- Rejects a deleted user, an inactive user, or an inactive company plan
- Attaches the user, company and derived `domain` to `req.auth`

**It never checks what the caller is permitted to do.** That confirms the audit
finding, now from source rather than from the compiled bundle.

### The precedent worth reusing

There is already one route-level restriction in this file:

```ts
const PLAN_RENEW_ALLOWED_ROUTES = new Set([
    "GET:/api/user/info",
    "POST:/api/user/current-plan-detail",
    ...
]);
```

A `PLAN_RENEW` scoped token is confined to that set, keyed on
`` `${req.method}:${routePath}` ``.

**This is the pattern to extend for real authorisation** — it is already the
codebase's own idiom, so an authorisation layer built this way will read as
native rather than bolted on.

### What the user model has

`src/models/User.ts`, 348 lines. Searched for `mfa`, `two_factor`, `2fa`,
`totp`, `secret`, `ip_`, `allowlist`, `saml`, `sso` — **no matches**.

So none of the Security section has anywhere to store its state. Every item
below needs a migration before any code.

---

## 1. Multi-factor authentication

**Build first.** Highest value: real security benefit, named requirement in both
SOC 2 and HIPAA, and self-contained.

**Database.** A migration adding to `users`, or a separate `user_mfa` table:
`mfa_enabled`, `mfa_secret` *(encrypted — reuse `CommonHelper.encrypt`)*,
`mfa_backup_codes`, `mfa_enrolled_at`, `mfa_last_used_at`.

Prefer a separate table: the secret is more sensitive than the rest of the user
row, and `AuthMiddleware` already loads `User` on every request with an
`exclude` list. Keeping the secret off that model means it is never loaded by
accident.

**Login flow.** `AuthController` currently issues a token on password success.
MFA inserts a step: on success **and** `mfa_enabled`, issue a short-lived
challenge token rather than a session token, and require a second call with the
code before a real session is created.

Do **not** create the `DeviceSecurity` row until the second factor passes —
otherwise a half-authenticated session exists.

**Company policy.** The Company Security screen already has "Require MFA for
password sign-in" plus an exception list, saved under
`settings.company_security`. The enforcement point is the login flow: if the
company requires it and the user has not enrolled, force enrolment before
issuing a session.

**Endpoints needed:** enrol *(returns the secret and a QR payload)*, confirm
enrolment, verify at login, regenerate backup codes, disable *(admin only, and
audit-logged)*.

**Watch:** backup codes must be single-use and stored hashed, not encrypted.
They are a password equivalent, not a retrievable secret.

---

## 2. IP allowlist

**Build alongside MFA** — both are login-time controls.

**Database.** Company-level, so it belongs with the existing
`settings.company_security` blob rather than a new table.

**Enforcement point.** `AuthMiddleware.ts`, after the user and company are
loaded and before `next()`. The company record is already in scope there, so no
extra query is needed.

**Traps, both of which have locked people out of real systems:**

- The screen already notes that other products refuse an allowlist that does not
  cover the admin's current address. **Enforce that server-side too** — a
  client-side check is trivially bypassed and the failure mode is total lockout.
- Behind Cloudflare, `req.ip` is Cloudflare's address, not the customer's. Use
  the forwarded header, and only trust it from known proxy addresses. There is
  already an `00-mcm-xff-allowlist.conf` in nginx — read it before choosing.
- Decide explicitly what happens to an **already-established session** when an
  allowlist is added. Immediate cutoff is defensible; silent continuation is not.

---

## 3. SAML single sign-on

**Build third.** Largest of the three and the least urgent — SSO is an
enterprise sales feature more than a security control.

The screen stores IdP Entity ID, IdP SSO URL and Single Logout URI under
`company_security`. What is missing is the assertion handling: a library
*(`@node-saml/node-saml` or similar)*, certificate validation, assertion
signature verification, and mapping the assertion to a user.

**Security note:** SAML implementations fail on signature validation more often
than anything else. Do not hand-roll the XML handling.

---

## 4. Profile fields

**Small, once the source is in hand.**

The definitions already save to the Company Default template under
`settings.company_profile_fields`, with stable ids that survive relabelling.
What is missing is a place on the person record for the **values**.

**Database.** A `user_profile_values` table — `user_uuid`, `field_id`, `value` —
rather than columns on `users`, since the fields are admin-defined at runtime.

Then the person form renders them, and the directory can show them as columns.

**Remove the "don't appear on anyone's profile yet" note in the same commit that
makes them appear.**

---

## 5. Apply to people (bulk settings)

**Needs care rather than cleverness.** It writes to every person's record in the
company, so:

- **Dry run first** — show exactly how many records will change and what to,
  before anything is written
- **Record what it overwrote**, so it can be undone. A bulk change with no undo
  is one mis-click from a support incident
- Run it as a job with progress, not a single request — a company with hundreds
  of users will time out
- Audit-log it: who applied what, to whom, when

---

## 6. Data retention

**Build last, and give it its own attention.** This is GDPR work, not a feature.

It is not "delete after N days". It needs to:

- Know **which** data each rule covers — call records, recordings, voicemails,
  messages, transcripts each have different legal positions
- Honour **legal holds** — billing records usually must be kept regardless
- **Prove** deletion happened, for the audit trail
- Handle backups — data deleted from the live system persists in backups until
  they rotate. State that window in the policy

Do not ship a retention screen that silently fails to delete something. That is
worse than not having one, because it creates a documented promise.

---

## Suggested order

1. **MFA** — highest value, self-contained, satisfies SOC 2 and HIPAA
2. **IP allowlist** — same layer, build together
3. **Profile fields** — quick win while the bigger pieces settle
4. **Apply to people** — with dry run and undo
5. **SAML** — enterprise feature, use a library
6. **Data retention** — its own piece of work, with legal input

---

## Rules for all six

**Migrations first, and reversible.** Every one needs schema before code. Write
the `down` as carefully as the `up`.

**Change the badge in the same commit as the behaviour.** Every one of these
screens is currently honest about not working. The moment one works, its badge
must say so — and not before.

**Nothing deploys without the owner's word.** Build, test, report. The decision
to go live is theirs.

**Follow the file you are in.** The codebase has a `BaseController`,
`ResponseModel`, centralised `ApiErrors`, validators and repository classes.
Mirror the neighbouring code rather than introducing a new style.
