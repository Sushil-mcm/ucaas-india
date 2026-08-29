# Company settings + URL restructure — update plan

Ticket-ready work plan for the UCaaS project.
Based on `docs/genesys-cloud-reference.md` (the platform reference) and
`docs/company-settings-review.md` (the field-by-field review).

**Do not put a rival's name into product UI text, code comments, or customer docs.**

Status on 2026-08-29: nothing below is built. Every claim was checked against the code.

---

## 0. The constraint that shapes everything

`src/router/protected-route.tsx` resolves a permission by walking a dotted path into
`features.plan_features`, and then:

```ts
// A missing key is not permission. This prevents stale/incorrect paths from
// silently allowing a protected page.
if (guard?.permission && hasPermission !== true) { ...blocked... }
```

**So we cannot ship new permission strings ahead of the backend.** If we add
`account_setting.access.VOICEMAIL.action.view` to a route before the API returns that key,
every admin is locked out of that page and the only signal is an "upgrade required" screen.

That splits the work in two:

- **Phase 1 — front end only.** Real URLs, real pages, existing permission strings.
  Ship today, no backend needed.
- **Phase 2 — after the backend adds the keys.** Swap each route onto its own permission.

The one thing that must not wait is Security. It currently sits behind
`phone_system_action.action.view`, which means anyone who can view the phone system can
open MFA, the IP allowlist and SSO. Phase 1 moves it to an admin-only gate.

---

## Part A — URL restructure (Phase 1, no backend)

### A0. Add an `adminOnly` guard option
**File:** `src/router/protected-route.tsx`
Add `adminOnly?: boolean` to `FeatureGuard`. When set and `IS_ADMIN` is false, redirect to
`/dashboard`. `IS_ADMIN` already comes back from `useCompanyFeatures()` in that file.

*Why:* Security and SSO need a gate that does not depend on a permission key the backend
has not shipped yet.
**Done when:** a non-admin hitting an `adminOnly` route lands on the dashboard, and an
admin gets the page.

---

### A1. Split the nine sections out of the preferences page
**File:** `src/pages/admin-settings/phone-systems/preferences/index.tsx` (323 lines)

Today this holds `const [activeSection, setActiveSection] = useState<string>('rules')` and
switches between nine sections:

```
rules | greetings | ringvoicemail | emergency | holidays | calling | messaging | policies | security
```

The nine components already exist as separate files. Remove the `activeSection` state and
export each section as its own page component.

**Done when:** no `activeSection` state remains, and each section renders standalone.

---

### A2. Move the files so the folder matches the URL
Nine files currently live in `src/pages/admin-settings/company-info/` but are imported into
`phone-systems/preferences`. The folder says company; the URL says phone.

**Move** `src/pages/admin-settings/company-info/` → `src/pages/admin-settings/company/`

Files affected: `company-details`, `company-record`, `location-facts`,
`company-settings-card`, `company-ring-time`, `company-voicemail`, `company-messaging`,
`company-emergency-address`, `company-holidays`, `company-holiday-apply`,
`company-policies`, `company-security`, `company-calling-permissions`, `new-site-steps/`

Note `src/lib/company-ring-time` is a different file with a similar name — used by
`users/extension/update-forwarding` and `call-queue/add-edit-call-queue`. Leave it alone.

**Done when:** `grep -r "company-info" src/` returns only the redirect definitions.

---

### A3. New route tree
**File:** `src/router/index.tsx`

| Route | Screen | Phase 1 guard |
|---|---|---|
| `/admin-settings/company` | overview | `account_setting.access.SITE.action.view` |
| `/admin-settings/company/profile` | name, default language, default country, support URL, main location | `account_setting.access.SITE.action.view` |
| `/admin-settings/company/locations` | list | `account_setting.access.SITE.action.view` |
| `/admin-settings/company/locations/new` | add | `account_setting.access.SITE.action.add` |
| `/admin-settings/company/locations/:locationId` | one location | `account_setting.access.SITE.action.view` |
| `/admin-settings/company/locations/:locationId/emergency` | emergency address | `account_setting.access.SITE.action.edit` |
| `/admin-settings/company/business-hours` | opening hours | `phone_system_action.action.view` |
| `/admin-settings/company/holidays` | days closed | `phone_system_action.action.view` |
| `/admin-settings/company/greetings` | company audio | `settings.action.greeting.view` |
| `/admin-settings/company/voicemail` | voicemail rules | `phone_system_action.action.view` |
| `/admin-settings/company/recording` | recording rules | `phone_system_action.action.view` |
| `/admin-settings/company/calling` | calling permissions | `phone_system_action.action.view` |
| `/admin-settings/company/messaging` | text and chat rules | `phone_system_action.action.view` |
| `/admin-settings/company/policies` | retention + staff overrides | `phone_system_action.action.view` |
| `/admin-settings/company/security` | MFA, IP allowlist, idle timeout | **`adminOnly: true`** |
| `/admin-settings/company/security/sso` | single sign-on | **`adminOnly: true`** |

Sites, once separated from locations (Part B2), move to:

| `/admin-settings/phone/sites` | list | `account_setting.access.SITE.action.view` |
| `/admin-settings/phone/sites/:siteId` | one site | `account_setting.access.SITE.action.view` |

Phase 1 guards are deliberately the *existing* keys. They are no weaker than today, because
today all nine sections share one guard. Security is the exception and gets tightened.

**Done when:** each of the sixteen URLs loads its own screen directly, survives a reload,
and the back button moves between them.

---

### A4. Redirects, kept permanently
```
/admin-settings/company-info        -> /admin-settings/company
/admin-settings/company-info/rules  -> /admin-settings/company/policies
/admin-settings/phone/preferences   -> /admin-settings/company/policies
```
Admins bookmark these and support articles link to them.
**Done when:** all three old URLs land on the new page with no error screen.

---

### A5. Drive the sub-nav from the router
The section list in `preferences/index.tsx` becomes the company sub-nav, built from the
route table rather than a local array, and hides entries the person cannot open.

**Done when:** the nav highlights from the URL, not from state.

---

### A6. Give locations a real URL
Locations currently open in a side drawer from `company-info/index.tsx`, so a single
location has no address of its own.

Keep the drawer — but open it *from* `:locationId` so it can be linked and reloaded.

**Done when:** pasting a location URL into a fresh tab opens that location.

---

### A7. Naming clean-up (separate ticket, low risk)
- lower case, hyphenated, plural for collections
- the word a customer uses: `company`, not `company-info`
- nest with real child routes — never a `/` inside one `path` string
  (currently `brands/campaigns` and `brands/reseller`)
- rename the misspelled folder `pages/admin-settings/compilance` → `compliance`
  (the route is already spelled correctly)

---

## Part B — Company model gaps

### B1. Give the company its own identity record
Today the company page holds an address only. Default language and default country are
buried inside the `company_policies` blob.

Add a company profile screen with: legal name, default language, default country,
support URL, and main location. Move `default_language` and `default_country` out of the
policies blob and onto this record.

*Needs backend:* a company profile object. **Blocked.**

---

### B2. Separate Location from Site
Currently one merged object: name, display name, outbound caller ID, city, state, postal
code, timezone.

Split into:
- **Location** — street, street 2, city, state, country, postcode, contact person, notes,
  emergency number, verification state. Locations nest (parent location).
- **Site** — timezone, outbound caller ID and name, media settings. Points at a Location.

One location may hold several sites. A location with no site is valid — a warehouse that
only needs a verified emergency address.

*Needs backend:* two tables where there is one. **Blocked.**

---

### B3. Emergency address: verified state and ELIN
Add `address_verified` as stored data, separate from "an address was typed", and an ELIN
field (the callback number emergency services see — a legal requirement in several markets).

*Needs backend.* **Blocked.** High priority once unblocked: this is the one area where
"probably right" is not acceptable.

---

### B4. Bring back the company voicemail editor
The editor is commented out, so the summary card correctly shows no voicemail row.
Restore it with real fields: enabled, PIN required, minimum PIN length, max message length,
transcription default, email notification, and suppress personal data in email.

Some keys already exist in the policies blob (`voicemail_min_pin_length`,
`voicemail_max_message_minutes`, `voicemail_transcription_default`).
*Partly buildable now.*

---

### B5. Model business hours as schedules
Today: `operational_hours.type` is `24_hours` or `weekly`. Add a recurrence rule, and model
holidays as a holiday schedule inside a schedule group, so the IVR can point at
open / closed / holiday instead of branching.

*Needs backend.* **Blocked.** Do this before the IVR builder grows further.

---

### B6. Custom profile fields
Admin-defined fields on a person — employee ID, cost centre, team, badge number —
assignable and searchable in the directory.

`grep -ri "profile_field|custom_field|customField|profileField" src/` returns 0 hits.
*Needs backend.* **Blocked.**

---

### B7. Premium-rate blocking as a named classification
The fraud is already understood — see the header comments in
`company-calling-permissions.tsx` and `hooks/use-ivr-external-forwarding.ts`. What is
missing is a classification layer to express the rule in, so it is currently handled case
by case rather than as one auditable, reusable rule.

Depends on number plans. See `docs/genesys-cloud-reference.md` §2.1.
*Needs backend.* **Blocked.**

---

### B8. Later
Password requirements, email domain allowlist, published limits with a request-to-raise.
Real gaps, none blocking anybody today.

---

## Part C — What we need from the backend

Listed so it can go over as one ask.

| # | Ask | Unblocks |
|---|---|---|
| C1 | Per-section permission keys under `account_setting.access.*` — `COMPANY_PROFILE`, `LOCATION`, `BUSINESS_HOURS`, `HOLIDAY`, `VOICEMAIL`, `RECORDING`, `CALLING`, `MESSAGING`, `POLICY`, `SECURITY`, `SSO`, each with `view` / `edit` | Phase 2 of Part A |
| C2 | A company profile object (name, default language, default country, support URL, main location) | B1 |
| C3 | Location and Site as two linked tables, locations nesting | B2 |
| C4 | `address_verified` + ELIN on the location | B3 |
| C5 | Recurrence rule on schedules; holiday schedules inside a schedule group | B5 |
| C6 | Custom profile field definitions and per-user values | B6 |
| C7 | Number plans: ordered match rules producing a classification, plus outbound routes mapping classification to trunk | B7 |
| C8 | Enforcement for MFA, IP allowlist, idle timeout and SAML | the security page |

Follow the existing naming convention for C1: `module.access.ENTITY.action.verb`, matching
`account_setting.access.SITE.action.view`.

**Note on C8.** Those four settings write to a JSON blob and nothing reads them. The page
says so honestly per card. Until C8 lands, the security page is a display, and it belongs on
the blockers list rather than being counted as company-settings work.

---

## Sequencing

**Can start now, no backend:** A0 → A1 → A2 → A3 → A4 → A5 → A6, then A7 and B4.
That is the whole URL restructure plus the voicemail editor.

**After C1:** swap each route's guard onto its own permission (Phase 2). Mechanical.

**After C2–C7:** Part B in the order B2 → B3 → B1 → B5 → B7 → B6.
B2 first because Location vs Site is the split everything else hangs off.

**Open question for the team.** The top segment is `company` in this plan. `company-settings`
is the other candidate. Worth settling before A3, because it is the one part that is
awkward to change once people have bookmarked it.
