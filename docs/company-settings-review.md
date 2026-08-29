# Company / Organization settings — review, three-way comparison, and URL plan

Internal engineering note. Reference material only.
**Do not put a rival's name into product UI text, code comments, or customer docs.**

Sources, all primary and all re-checked on 2026-08-29:

- Platform A (thin-org model) — public Platform API spec, `api.mypurecloud.com/api/v2/docs/swagger`.
  See `docs/genesys-cloud-reference.md`.
- Platform B (master-switch model) — their complete public help centre, 918 articles,
  mirrored locally at `/root/dialpad-kb/articles/`.
- Ours — the code in this repo.

Two reference platforms, because they solve the same problem in opposite directions and
the disagreement is the useful part.

---

## 1. Platform B — how a "company" works in the master-switch model

### 1.1 The shape

There is a real **My Company** screen, and it is deliberately small. The company owns almost
no configuration of its own. What it owns is:

1. **Master switches** — company turns a capability on; an office or group admin then configures it.
2. **Cross-office management** — things that only make sense above a single office.

Everything an admin thinks of as "settings" — call routing, business hours, greetings,
caller ID, recording, users, numbers — lives on the **Office**, not the company. The company
is a container plus a control panel.

### 1.2 What actually sits under My Company

| Section | Contents | Pattern |
|---|---|---|
| **Company Settings** | Workflows on/off · custom logo (PNG, ≤30 MB) · restricted internal search · IVR forwarding to external numbers · restrict number assignment to office-specific reserved pool · company holidays · export change log | Master switches |
| **Office Management** | Table of every office. Inline toggles for admin call recording, AI features, AI management. Search, filter, bulk apply, CSV export (office, country, user count, three flags). Create Office. | Cross-office |
| **Access Control** | Company admins · Regional admin + which offices they cover · Roles · Admins and Managers | Cross-office |
| **Authentication** | SAML / SSO, enforce SAML, API keys (name, expiry, scopes, shown once only) | Company-only |
| **Number Management** | Every number in the company: type, textable, assigned-to, brand, campaign, use case, registration status. Filter and export. | Cross-office |
| **SMS Management** | A2P brands and campaigns | Company-only |
| **Ai Settings** | AI training opt-in/out · company dictionary (keyword, category, language, pronunciation hint) | Master switch + shared data |
| **Shared Contacts** | Company-wide contact CSV: upload, template download, export | Shared data |
| **Deskphone Settings** | Company-level device defaults | Master switch |
| **Integrations** | Enable per integration for the whole account | Master switch |
| **Billing** | Licence pool (one per currency, auto-transfers between offices) · cost centres · credits | Cross-office |
| **Labs** | Self-service beta flags, scoped company-wide or to named offices, with a reason field | Master switches |
| **Queue Prioritization** | Priority ladder across contact centres in different offices | Cross-office |

### 1.3 The five rules behind it

1. **Company enables, office configures.** Workflows, external IVR forwarding, AI training and
   restricted search are all one boolean at company level that unlocks a whole editor
   somewhere else. Nobody configures anything on the company screen.
2. **Anything that spans offices lives at company level, and nowhere else.** A number pool,
   a licence pool, a queue priority ladder and a shared contact list have no meaning inside
   one office, so they are not offered there.
3. **Bulk is a first-class verb.** Office Management exists purely to change one flag across
   many offices at once. It is explicit that bulk actions apply immediately and cannot be undone.
4. **Feature rollout is data, not a deploy.** Labs lets a company admin turn a beta on for
   named offices, with a reason recorded, and hand feedback back.
5. **The audit log is at both levels.** Company and office each export their own CSV change
   log, delivered by email rather than downloaded inline.

### 1.4 Details worth stealing outright

- **Cost centre allocation is percentage-based with an explicit precedence.** Tags at office,
  user or licence level; each allocation must total exactly 100%; max 10 per item; precedence
  is user → licence → office; anything unallocated shows as *Unassigned* rather than being
  silently dropped. That is a finance-grade design, and it changes no invoice — it is pure
  reporting metadata.
- **Licence pool is per currency, not per company.** USD offices draw from the USD pool, CAD
  from the CAD pool. Obvious once said, easy to get wrong.
- **Create Office can clone settings from an existing office.** The single biggest saving
  when a company opens its fifth location.
- **AI training defaults are set by jurisdiction, not by one global default** — US and Canada
  opt out, UK and EU opt in, and a signed BAA disables it entirely regardless.
- **API keys are shown once.** Named, expiring, scoped.
- **Number Management carries campaign registration state per number**, so "which of my
  numbers can actually send SMS" is one screen rather than a support ticket.

### 1.5 Where they are weak

- The company screen is a flat list of unrelated sections with no grouping.
- Several company-level switches still need a support ticket rather than being self-serve.
- Company holidays and office holidays are two separate lists with no inheritance — creating
  a company holiday does not push it down, and deleting all office defaults resets them.
- No company-level identity fields at all: no legal entity name, no registered address, no tax
  ID. The company is a container, not a record.

---

## 2. Platform A — how a "company" works in the thin-org model

Covered in full in `docs/genesys-cloud-reference.md`; the essentials repeated here so the
comparison table stands on its own.

There is **no company settings page**. The organization is a **15-field identity object plus
about fifteen separately-owned settings resources**, each with its own permission string.

`GET/PUT /organizations/me` — `name`, `domain`, `defaultLanguage`, `defaultCountryCode`,
`defaultSiteId`, `voicemailEnabled`, `supportURI`, `thirdPartyOrgName`, `thirdPartyURI`,
`productPlatform`, `state`, `version`, `id`, `features`.

Satellites, one resource and one permission each: authentication settings (MFA, domain
allowlist, IP allowlist, password requirements, inactivity timeout, token storage), IP
authentication, embedded integration allowlist, published limits with change requests,
voicemail policy, recording settings, telephony settings, contact-centre routing settings,
presence settings, data-retention settings, default greetings, per-channel settings for
messaging / email / chat / fax, licence and usage, and org linking for the reseller case.

**Location is not Site**, and this is the structural point we have merged:

- **Location** = where humans are. Address, contact user, notes, `emergencyNumber` with an
  `elin` type, `addressVerified` as a stored boolean separate from `addressStored`, and a
  `path[]` so locations nest — campus > building > floor.
- **Site** = how calls behave there. Timezone, caller ID and name, media model, media regions,
  edges, NTP, and a reference back to a Location.

One Location may carry several Sites. A warehouse can be a Location with no telephony at all.

---

## 3. The three-way comparison

Legend — ● full · ◐ partial · ○ absent

### 3.1 Company identity

| Capability | Platform A | Platform B | Us today | What to do |
|---|---|---|---|---|
| Company record as a first-class object | ● 15 fields | ○ container only | ◐ address fields only | Give the company a record: legal name, trading name, support URL, default language, default country |
| Default language | ● on the org | ● office-level | ◐ inside `company_policies` blob | Promote to company identity |
| Default country | ● `defaultCountryCode` | ● office-level | ◐ inside `company_policies` blob | Promote to company identity |
| Main-location pointer | ● `defaultSiteId` on the org | ● primary office | ◐ `is_default` flag on a site row | Company should own the pointer, not the site |
| Company logo | ○ | ● PNG, ≤30 MB, in-app | ○ | Add — cheap, and it is the first thing a reseller asks for |
| Own subdomain | ● `domain` | ◐ secondary domain by ticket | ○ | Later |
| Support URL for staff | ● `supportURI` | ○ | ○ | Add with the identity record |

### 3.2 Master switches — the pattern we are missing entirely

| Capability | Platform A | Platform B | Us today | What to do |
|---|---|---|---|---|
| Per-org feature flags | ● boolean set on the org | ● Labs, scoped to named offices, with a reason | ○ plan features only, via `useCompanyFeatures` | **This is the biggest structural gap.** Ours is plan-shaped, so there is no way to enable something for one customer without changing their plan |
| Company gate on IVR external forwarding | n/a | ● master on/off | ◐ handled ad hoc in `use-ivr-external-forwarding.ts` | Make it a company switch — it is a fraud control, and it belongs above the group admin |
| Company gate on workflows / IVR builder | n/a | ● | ○ | Add when the IVR builder lands |
| Restricted internal directory search | ○ | ● company switch + per-office grants | ○ | Add. Multi-location customers ask for this immediately |
| AI training consent | ○ | ● jurisdiction-aware default, BAA override | ○ | Needed before we train on anything |

### 3.3 Cross-location management

| Capability | Platform A | Platform B | Us today | What to do |
|---|---|---|---|---|
| One table of every location with inline toggles | ○ | ● search, filter, bulk apply, CSV export | ○ list only, no bulk | Add bulk + export to the locations list |
| One table of every number in the company | ○ | ● type, assigned-to, campaign, registration status | ◐ split across `numbers/all`, `in-use`, `inventory` | Consolidate into one filterable table |
| Clone settings when creating a location | ○ | ● | ○ | Add to the new-location flow |
| Licence pool across locations | ● | ● per currency | ○ | Later, needs billing work |
| Cost centres | ○ | ● %-based, 3 levels, precedence, Unassigned bucket | ○ | Worth copying wholesale when billing is touched |
| Shared company contact list | ○ | ● CSV up/down | ◐ contacts exist, not company-shared | Add |
| Cross-queue priority ladder | ● | ● | ○ | Needs the queue work first |
| Audit / change log | ● | ● company + office, CSV by email | ○ | **Add.** Compliance customers will not buy without it |

### 3.4 Location vs Site — the structural fork

| Capability | Platform A | Platform B | Us today | What to do |
|---|---|---|---|---|
| Address vs call-behaviour separated | ● two objects | ○ one Office, but Offices are heavy tenants | ○ one merged `site` | **Decide which model we are.** Ours is neither |
| Nesting | ● `path[]` tree | ○ | ○ | Follow from the decision |
| Emergency address verification state | ● `addressVerified` stored | ● validated at office creation | ○ | Add — this is the one field where "probably right" is not acceptable |
| ELIN callback number | ● `emergencyNumber.type = elin` | ◐ E911 address only | ○ | Add, legally required in several markets |
| Per-location timezone | ● on Site | ● on Office | ● on site | Fine |
| Per-location caller ID | ● on Site | ● on Office | ● on site | Fine |

**The fork, stated plainly.** Their Office is a *tenant*: it has its own main line, its own
users, its own billing, its own admins, its own holidays. Platform A's Location is just an
*address*, with a Site next to it holding call behaviour. Our `site` is halfway — an address
plus timezone plus caller ID — which means it is too heavy to be a simple address and too
light to be a tenant. Pick one before adding more fields to it.

### 3.5 Security and access

| Capability | Platform A | Platform B | Us today | What to do |
|---|---|---|---|---|
| Per-settings-group permission | ● one per resource | ◐ 38 CC flags, 5 roles, no custom roles | ○ **all nine sections behind one phone permission** | Split the routes — see section 5 |
| MFA enforcement | ● + exemption list | ● | ◐ fields exist, nothing enforced | Auth-layer work, stays on the blockers list |
| IP allowlist | ● | ○ | ◐ fields exist, nothing enforced | Auth-layer work |
| Idle timeout | ● + token storage choice | ○ | ◐ field exists, no timer | Auth-layer work |
| SSO / SAML | ● full IdP config | ● + enforce SAML | ◐ captured, no handler | Backend work |
| Email domain allowlist | ● | ○ | ○ | Later |
| Password requirements | ● object | ○ | ○ | Later |
| API keys | ● | ● named, expiring, scoped, shown once | ○ | Add when we open an API |
| Published limits + raise request | ● | ○ | ○ | Nice-to-have |

---

## 4. What to do on our end, in order

**Now — front-end only, no backend needed**

1. **Split the nine sections into nine routes**, each with its own permission guard.
   This is the highest-value change in the whole list: it fixes the security-gating hole and
   the no-URL problem in one edit. Section 5.
2. **Consolidate the three number tables into one filterable table**, and add assigned-to and
   registration status as columns rather than as separate pages.
3. **Add bulk actions and CSV export to the locations list.**

**Next — needs backend fields**

4. **Give the company its own identity record.** Legal name, trading name, support URL,
   default language, default country, main-location pointer. Pull language and country out of
   the `company_policies` blob where they are currently buried.
5. **Add a per-company feature-flag table**, separate from plan features. Without it we cannot
   enable anything for one customer without moving their plan, and every future master switch
   has nowhere to live.
6. **Add `address_verified` and an ELIN field** to the emergency address.
7. **Add a change log**, exported as CSV by email, at both company and location level.
8. **Restore the company voicemail editor** with real fields — PIN required, PIN length, max
   message length, transcription, email notification, PII suppression. The summary card
   already has a hole shaped exactly like it.
9. **Model business hours as schedules** with an rrule, and holidays as a holiday schedule, so
   the IVR can point at open / closed / holiday without an `if`.

**Decide before building more**

10. **Location or tenant?** Section 3.4. Everything else about locations depends on this answer.

**Blocked — keep on the blockers list, do not count as company-settings work**

11. MFA challenge, inactivity timer, request-time IP check, SAML handler. The security page is
    honest that it writes to a blob and stops; leave it honest until the auth layer catches up.

---

## 5. The URL plan

Written previously, **not yet implemented** — the router still has the old shape as of
2026-08-29. Re-checked and confirmed below.

### 5.1 What is wrong now

| Problem | Where |
|---|---|
| Nine company sections have **no URL at all** | `useState('rules')` in `phone-systems/preferences/index.tsx` — cannot bookmark, cannot link from help, back button does nothing |
| **Company Security is guarded by a phone permission** | `/admin-settings/phone/preferences` is gated on `phone_system_action.action.view`. Anyone who can view the phone system can open MFA, the IP allowlist and SSO |
| Company settings live under two unrelated trees | `/admin-settings/company-info` and `/admin-settings/phone/preferences` |
| Folder and URL disagree | Nine files live in `company-info/`, rendered under `/phone/` |
| Duplicate route, same component | `company-info/rules` and `phone/preferences` |
| Two meanings of "phone" | `/admin-settings/phone/*` is the company phone system; `/admin-settings/account/phone` is my own phone |
| Personal settings exist twice | `/admin-settings/account/*` and top-level `/settings/*` render the same components |
| Locations have no URL | A site opens in a drawer, so one location cannot be linked |
| `company-info` is not a customer word | It is just "company" |
| Slashes inside single path strings | `brands/campaigns`, `brands/reseller` — should be nested children |
| Mixed slug styles | `numbers/all` and `numbers/in-use` beside `all-extensions` |

### 5.2 Proposed scheme

Rule: **one screen, one URL. One URL, one permission.**

```
/admin-settings/company                                   overview
/admin-settings/company/profile                           name, default language, default country, support URL, logo, main location
/admin-settings/company/locations                         list — search, filter, bulk, export
/admin-settings/company/locations/new
/admin-settings/company/locations/:locationId             address, contact, notes
/admin-settings/company/locations/:locationId/emergency   emergency address, ELIN, verification state
/admin-settings/company/business-hours
/admin-settings/company/holidays
/admin-settings/company/greetings
/admin-settings/company/voicemail
/admin-settings/company/recording
/admin-settings/company/calling                           calling permissions
/admin-settings/company/messaging
/admin-settings/company/policies                          data retention, defaults staff may override
/admin-settings/company/security                          MFA, IP allowlist, idle timeout
/admin-settings/company/security/sso                      SAML / IdP
/admin-settings/company/features                          per-company switches  (new — section 4.5)
/admin-settings/company/audit-log                         change log export     (new — section 4.7)
```

Sites, once split from locations, sit with the phone system:

```
/admin-settings/phone/sites
/admin-settings/phone/sites/:siteId
```

Naming rules to apply everywhere:

- lower-case, hyphenated, plural for collections — `locations`, `sites`, `numbers`
- the noun the customer uses — `company`, not `company-info`
- nest with real child routes; never a `/` inside one `path` string
- an entity always gets `:id` in the URL, never a drawer as its only address
- a drawer is fine, but it must be opened *by* a URL so it can be linked and reloaded

### 5.3 Redirects, kept permanently

```
/admin-settings/company-info          ->  /admin-settings/company
/admin-settings/company-info/rules    ->  /admin-settings/company/policies
/admin-settings/phone/preferences     ->  /admin-settings/company/policies
```

Admins bookmark these and support articles link to them.

### 5.4 Shape of the change

The nine sections already exist as separate components, so this is mostly routing:

1. In `phone-systems/preferences/index.tsx`, drop `activeSection` and export the nine sections.
2. Move those files from `company-info/` into `company/` so folder and URL agree.
3. Add nine child routes under a `company` parent in `router/index.tsx`, each in a
   `ProtectedRoute` with **its own** permission, not `phone_system_action.action.view`.
4. Turn the section list into a company sub-nav driven by the router.
5. Add the three redirects.
6. Give locations a real route and open the drawer from `:locationId`.

Step 3 needs new permission strings on the backend. Until they exist, map each route to the
closest current permission and leave a note — but do **not** leave Security on a phone-system
permission. If nothing better exists yet, put Security behind the company-admin check rather
than a feature permission.

---

## 6. Cross-check against the CX implementation syllabus

The training syllabus confirms the setup order and the object split independently of the API spec.

Teaching order: `location configuration` → `user profiles` → `adding people` →
`organizing people` → `telephony: trunks, sites, edges, phones, DIDs, extensions` →
`relationship between locations, sites, edges and edge groups` → `number plans and outbound
routes` → `agents, roles and permissions`.

Three things worth noting:

1. **Location is taught first**, and there is a whole lesson on *locations vs sites vs edges vs
   edge groups* being four different things. Our merged object collapses the first two.
2. **"The importance of number plans and outbound routes"** is taught as a concept needing
   justification, with a lab on blocking premium-rate numbers. We understand premium-rate
   fraud — see the header comments in `company-calling-permissions.tsx` and
   `use-ivr-external-forwarding.ts` — but we have no classification layer to express the rule
   in, so it is handled ad hoc.
3. **"Creating profile fields and assigning them to users"** is a lab. Custom profile fields
   are first-class there. We have none — `grep -ri "profile_field|custom_field|customField|profileField"`
   returns 0 hits.

Two additions for section 4:

- **Custom profile fields** — admin-defined fields on a person (employee ID, cost centre, team,
  badge number), assignable and searchable in the directory.
- **Premium-rate blocking as a named classification** rather than a one-off toggle, so the rule
  is visible, auditable and reusable across locations.
