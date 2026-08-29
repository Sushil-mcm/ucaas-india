# My Account · People · Numbers — review, comparison, and URL plan

Internal engineering note. Reference material only.
**Do not put a rival's name into product UI text, code comments, or customer docs.**

Companion to `docs/company-settings-review.md`, same method and same sources, checked against
the code on 2026-08-29:

- **Platform A** — thin-org model. Public Platform API spec. Detail in `docs/genesys-cloud-reference.md`.
- **Platform B** — master-switch model. Complete public help centre, 918 articles, mirrored at
  `/root/dialpad-kb/articles/`.
- **Ours** — the code in this repo.

Company is done. The nine sections are real routes, the three redirects are in place, Security is
`adminOnly`, and `tsc` is clean. This note covers the three areas that come next.

---

## 0. Two live holes, before anything else

Both are one-line fixes and both are in scope for this pass.

**`/admin-settings/users/role` has no guard.**

```jsx
{ path: 'role', element: <ProtectedRoute element={<DirectoryRoles />} />, id: 'role' },
```

`ProtectedRoute` only gates when a `guard` object is passed — with `guard` undefined it returns the
element unchanged. So **any signed-in user can open the page where roles and permissions are
defined.** This is the same defect class already fixed on `/campaign/:type?`, and the comment on
that route documents the pattern. Roles is a worse instance of it than Campaign was.

**`/admin-settings/numbers/coverage` has no `ProtectedRoute` at all.**

```jsx
{ path: 'coverage', id: 'numbers-coverage', element: <CallCoverage /> },
```

Every sibling under `numbers` carries `virtual_numbers.action.view`. This one carries nothing.

Fix both the way Company Security was fixed: `adminOnly: true` for Roles until a real permission
string exists, and the sibling permission for Coverage.

---

## 1. My Account

### 1.1 What we have

Nine screens, and **two URL trees for the same components**:

| Screen | Route today | Also at |
|---|---|---|
| Profile | `/admin-settings/account/basic-info` | `/settings/basic-info` |
| Preferences | `/admin-settings/account/general` | `/settings/general` |
| My Phone | `/admin-settings/account/phone` | `/settings/phone` |
| Notification | `/admin-settings/account/notification` | `/settings/notification` |
| Greetings | `/admin-settings/account/greetings` | `/settings/greetings` |
| Media Files | `/admin-settings/account/media` + 3 children | `/settings/media` + 3 children |
| Security & Privacy | `/admin-settings/account/security` | `/settings/security` |
| Video | — | `/settings/video` only |

The sidebar points at the `/admin-settings/account` tree. `/settings/*` is still fully routed and
reachable, and `Video` exists **only** there — so one screen is unreachable from the navigation.

A defect pass already landed on these screens (commit `1f49c0f`): partial saves no longer wipe the
record, Security is scoped to the signed-in person, and the shared merge stops My Phone and the
admin drawer deleting each other's fields. That work is done and is not repeated here. One item it
explicitly left open: **the server still takes the logout target from the request and never checks
it is you.** That stays on the blockers list.

### 1.2 Comparison

Legend — ● full · ◐ partial · ○ absent

| Capability | Platform A | Platform B | Ours | Verdict |
|---|---|---|---|---|
| Profile: name, photo, job title | ● | ● + pronouns | ● | Add pronouns — cheap, and we already use they/them elsewhere |
| My numbers listed | ● | ● direct + fax + meetings | ● | Fine |
| Global outbound caller ID | ● | ● + per-call override + block | ◐ set, no per-call override | Add per-call picker and `*67`-style block |
| Interface language | ● | ● 12 languages | ○ | Missing |
| Personal timezone | ● | ● + "outside their hours" hint to colleagues | ◐ | Check it drives anything |
| Voicemail PIN | ● | ● gates voicemail, greeting recording, DND | ○ | Missing |
| **Personal working hours** | ● schedules | ● up to 4 blocks/day, own timezone | ○ | **Missing — and routing already needs it** |
| Ring duration on my line | ● | ● slider, default 30s | ◐ | Confirm it exists and is editable |
| Call handling when busy | ● | ● call waiting / busy signal / advanced routing | ● | Fine |
| Advanced missed-call routing | ● | ● | ● | Fine |
| Press 0 to escape voicemail | ○ | ● routes to main line or a shared line | ○ | Nice win, small |
| Personal SMS auto-reply | ○ | ● out-of-hours or DND | ○ | Missing |
| Personal hold music | ○ | ● | ○ | Missing |
| Personal call queue | ○ | ● Enterprise; desk phone / forwarding only | ○ | Later |
| **Devices list + ring-this-device** | ● station association | ● per device, force logout | ◐ no per-device ring control | **Missing** |
| Forwarding numbers | ● | ● up to 5, **verified by call-back, press 1** | ◐ | Add verification — unverified forwarding is a fraud path |
| Incoming caller ID on forwarded calls | ○ | ● three separate choices | ○ | Missing |
| Personal E911 working location | ● on Location | ● up to 10 saved addresses | ○ | **Missing — legal exposure for remote staff** |
| Executive assistant pairing | ● | ● two-sided confirmation | ○ | Later |
| Notification matrix | ● | ● | ● 4 channels × 4 types | **Ours is good.** Keep |
| Scheduled reports on the person | ● | ● | ○ | Later |
| Meetings/video settings | ● | ● | ● | Fine, but unreachable — see 1.1 |
| **`self` vs `other` permissions** | ● two distinct strings | ◐ | ○ | **See below** |

### 1.3 The structural finding

`/settings/phone` imports its call-rules editor straight from
`admin-settings/users/extension/update-forwarding/call-rules`, and `/settings/general` imports that
drawer's validation schema. **The screen where I edit my own call rules and the screen where an
admin edits anyone's call rules are the same component.**

Platform A treats this as two different permissions on purpose —
`telephony:selfStationAssociation:edit` against `telephony:otherStationAssociation:edit`,
`routing:directRoutingBackup:selfEdit` against `:edit`. Their spec carries the split throughout.

Sharing the component is fine and good. What is missing is that the *target* is implicit. Every one
of these screens should take an explicit subject — "me" or "this user id" — and the permission
should be chosen from that, not from which route happened to render it.

### 1.4 What to do

1. **Pick one tree.** Keep `/admin-settings/account/*`, redirect `/settings/*` into it permanently.
2. **Route Video** so it stops being orphaned.
3. **Add personal working hours.** Routing already needs the concept; see the call-handling note.
4. **Add the devices screen** with per-device ring control and call-back verification for
   forwarding numbers.
5. **Add a personal E911 working location**, several saved addresses per person.
6. **Make the subject explicit** on every personal screen, and split the permission self vs other.
7. Then: language, voicemail PIN, SMS auto-reply, per-call caller ID, press-0 escape.

---

## 2. People (currently "Users")

### 2.1 What we have

Three routes under `users`, and only one of them is about users:

| Route | Renders | Guard |
|---|---|---|
| `/admin-settings/users/extension` | `DirectoryPeople` — the user list | `account_setting.access.USER.action.view` |
| `/admin-settings/users/role` | `DirectoryRoles` | **none** |
| `/admin-settings/users/department` | `DirectoryGroups` | `phone_system_action.action.view` |

Three problems visible from that table alone. The people list lives at a URL called `extension`.
A collection is named in the singular at `role`. And departments — which are call-routing groups,
not users — sit under People while being guarded by a phone-system permission.

The list itself shows Name, Caller ID, Location, Availability, Actions. The add-user flow is
genuinely good: user info → assign caller ID → setup options → individual or bulk number
assignment → order summary. That matches Platform B's shape closely and should be left alone.

### 2.2 Comparison

| Capability | Platform A | Platform B | Ours | Verdict |
|---|---|---|---|---|
| User list | ● | ● name, email, numbers, licence, extension, admin flags, state | ◐ name, caller ID, location, availability | Add licence, extension, state, email |
| Invite by email | ● | ● + straight from Google/Microsoft directory | ● | Fine |
| Resend invite | ● | ● | ○ | Missing |
| **Pending state** | ● `invited` | ● shown in list | ○ | Missing — admins cannot see who never accepted |
| **Suspended state** | ● | ● | ○ | Missing |
| **Deleted users, restore window** | ● | ● 72h, then anonymised; number held | ○ | **Missing.** Accidental deletion is unrecoverable today |
| Bulk actions | ● | ● delete, add/remove admin, assign roles | ○ | Missing |
| Export user list | ● | ● CSV, 19 named columns, by email | ○ | Missing |
| Change licence type | ● | ● + warns the DID may not survive | ○ | Missing |
| Move user between locations | ● | ● + warns about number/country | ○ | Missing |
| Proxy / impersonate with audit | ● | ● explicit permission, red banner | ○ | Later, but needed for support |
| Per-user privilege toggles | ● | ● 4 grouped menus | ◐ | Partial |
| **Roles** | ● granted **per division** | ◐ 5 fixed, no custom | ● custom roles exist | **Ours is ahead of B here** |
| Role carries entitlement | ● baseLicense + addonLicenses | ○ separate | ○ | Worth copying — one system, not two |
| **Skills + proficiency** | ● + skill groups + expressions | ● 0–100 per agent | ○ | **Missing.** Blocks skills-based routing |
| Utilisation cap per person | ● per media type | ◐ session limit | ○ | Later |
| Custom profile fields | ● | ○ | ○ | Missing — flagged in the company review too |
| Divisions / scoping | ● every object | ◐ office + regional admin | ○ | Missing |

### 2.3 What to do

1. **Guard the Roles route.** `adminOnly: true` today; a real permission when the backend ships one.
2. **Rename the section to People** and move `department` out to the phone system, where the rest
   of the routing groups live.
3. **Add user states** — pending, suspended, deleted-with-restore-window. The 72-hour window with
   the number held is the single most valuable thing in Platform B's user management.
4. **Add bulk actions and CSV export.**
5. **Add licence type** to the list and allow changing it, with the DID warning.
6. Then: skills with proficiency, role-carried entitlement, divisions.

---

## 3. Numbers

### 3.1 What we have

| Route | Renders | Guard |
|---|---|---|
| `/admin-settings/numbers/coverage` | `CallCoverage` | **none** |
| `/admin-settings/numbers/all` | `AllNumbers` | `virtual_numbers.action.view` |
| `/admin-settings/numbers/in-use` | `InUseNumbers` | same |
| `/admin-settings/numbers/inventory` | `NumbersInventory` | same |
| `/admin-settings/numbers/identities` | `IdentitiesAndAddressesPageLayout` | same |
| `/admin-settings/numbers/addresses` | same component | same |
| `/admin-settings/numbers/verifications` | same component | same |

Plus `assign-did` and a `set-number-forwarding` wizard (DID info → condition → call handling with
hours → media → summary).

**Credit where it is due.** `identities` / `addresses` / `verifications` are three URLs rendering
one tabbed component, with the tab read from `pathname`. That is exactly the pattern Company should
have had and now does. It is already right here — do not change it.

**The problem is the other three.** `all`, `in-use` and `inventory` are three separate pages that
are three filters over one list. Platform B ships this as a single table with `assigned-to` and
`status` as columns.

### 3.2 Comparison

| Capability | Platform A | Platform B | Ours | Verdict |
|---|---|---|---|---|
| One filterable number table | ○ | ● type, textable, assigned-to, brand, campaign, status | ○ three pages | Consolidate |
| Buy local / toll-free | ● | ● 30 per line or user | ● | Fine |
| Assign to user or shared line | ● | ● | ● | Fine |
| **Label on a number** | ○ | ● so agents see which line a transfer came from | ○ | Cheap, high value |
| Swap a user's primary number | ● | ● | ◐ | Confirm |
| **Reserved / unassigned pool** | ● | ● held, reassignable, monthly fee, deletable in bulk | ○ | **Missing.** Deleting a user today loses the number |
| Auto-forward reserved numbers | ○ | ● to main line or a shared line | ○ | Missing — callers hit dead numbers |
| Restrict pool to one location | ○ | ● company switch | ○ | Missing |
| **Extensions** | ● extension **pools** as ranges | ● 3–6 digits, company level | ◐ | See below |
| **Emergency-number blocklist for extensions** | ● | ● published per country | ○ | **Missing. Safety issue** |
| Failover number per line | ● | ● PSTN only, validated, testable | ○ | Missing |
| Porting workflow in-product | ● | ● + LOA, rejection codes | ◐ | Confirm |
| Branded caller ID / CNAM | ● | ● via partners | ○ | Later |
| Campaign registration joined to the number | ○ | ● status per number | ○ 10DLC lives elsewhere | Join them |
| **Number plan → classification** | ● ordered match rules | ○ | ○ | **The big one** |
| **Outbound route per classification** | ● + trunk distribution | ○ | ○ | **The big one** |
| Pools stored as ranges | ● start → end | ○ | ○ | Cheaper to store and validate |

### 3.3 The two things worth building properly

**Emergency-number blocklist.** Platform B publishes, per country, the short codes that must never
be usable as an extension — `911`, `112`, `999`, `000`, `110`, and dozens more across Europe, Asia
and Latin America. If someone can set extension `911`, an internal dial silently shadows the
emergency number. We have no such check. This is a small list and a validation rule, and it should
not wait for the dial-plan work.

**Number plan, then outbound route.** Platform A splits dialling into two steps:

1. A **number plan** is an ordered list of match rules on a location. Each rule has `match`,
   `matchType`, `digitLength`, `normalizedFormat`, `priority`, and produces a **classification**
   string — Emergency, International, Premium, Local, Extension.
2. An **outbound route** maps `classification → trunk`, with sequential or random distribution
   and an enabled flag.

Classify the number, then route the classification. "Block international calling" becomes one
permission on one classification instead of a regex in the dial path. "Block premium-rate numbers"
becomes a classification rather than the ad-hoc handling in `company-calling-permissions.tsx` and
`use-ivr-external-forwarding.ts` — both of which already carry header comments about premium-rate
fraud, because we understand the problem and have nowhere clean to express it.

Their own training sequence puts number plans at **step 6 of 13 — before any user or queue
exists.** We have never built the layer, so dial-string meaning gets decided late, in several
places, differently each time.

### 3.4 What to do

1. **Guard `coverage`.**
2. **Add the extension emergency-number blocklist.** Small, safety-critical, no dependencies.
3. **Consolidate `all` / `in-use` / `inventory`** into one table with filters.
4. **Add a reserved pool** with reassign, bulk delete, and automatic forwarding for reserved numbers.
5. **Add number labels.**
6. **Add failover numbers** per shared line, validated against being one of our own numbers.
7. Then, as a project of its own: **number plans and outbound routes.** Everything else in calling
   permissions gets simpler once this exists.

---

## 4. URL plan

Same rule as Company: **one screen, one URL. One URL, one permission.**

### 4.1 My Account

```
/admin-settings/account                       overview
/admin-settings/account/profile               was basic-info
/admin-settings/account/preferences           was general
/admin-settings/account/phone
/admin-settings/account/working-hours         new
/admin-settings/account/devices               new
/admin-settings/account/notifications         was notification (plural)
/admin-settings/account/greetings
/admin-settings/account/media
/admin-settings/account/media/voicemail       was media/type-voicemail
/admin-settings/account/media/greetings       was media/type-greeting
/admin-settings/account/media/prompts         was media/type-prompt
/admin-settings/account/security
/admin-settings/account/video                 currently orphaned
```

`type-` prefixes are a storage detail leaking into the URL. Drop them.

### 4.2 People

```
/admin-settings/people                        was users/extension
/admin-settings/people/invite
/admin-settings/people/pending                new
/admin-settings/people/deleted                new
/admin-settings/people/:userId
/admin-settings/people/:userId/call-rules
/admin-settings/people/:userId/greetings
/admin-settings/roles                         was users/role — own guard
/admin-settings/roles/new
/admin-settings/roles/:roleId
```

Departments are routing groups, not people. They belong with the phone system:

```
/admin-settings/phone/departments
/admin-settings/phone/departments/:departmentId
```

### 4.3 Numbers

```
/admin-settings/numbers                       one table, filtered
/admin-settings/numbers/buy
/admin-settings/numbers/reserved              new
/admin-settings/numbers/extensions            new
/admin-settings/numbers/:numberId
/admin-settings/numbers/:numberId/routing     was set-number-forwarding
/admin-settings/numbers/identities
/admin-settings/numbers/addresses
/admin-settings/numbers/verifications
/admin-settings/numbers/coverage
```

Later, when the dial-plan layer lands:

```
/admin-settings/numbers/dial-plan
/admin-settings/numbers/outbound-routes
```

### 4.4 Redirects, kept permanently

```
/settings/*                             ->  /admin-settings/account/*
/admin-settings/account/basic-info      ->  /admin-settings/account/profile
/admin-settings/account/general         ->  /admin-settings/account/preferences
/admin-settings/account/media/type-*    ->  /admin-settings/account/media/*
/admin-settings/users/extension         ->  /admin-settings/people
/admin-settings/users/role              ->  /admin-settings/roles
/admin-settings/users/department        ->  /admin-settings/phone/departments
/admin-settings/numbers/all             ->  /admin-settings/numbers
/admin-settings/numbers/in-use          ->  /admin-settings/numbers?assigned=true
/admin-settings/numbers/inventory       ->  /admin-settings/numbers?assigned=false
```

---

## 5. Order of work

**Now — small, no backend**

1. Guard `users/role` and `numbers/coverage`.
2. Route `Video`; redirect `/settings/*` into `/admin-settings/account/*`.
3. Extension emergency-number blocklist.
4. Rename Users → People; move departments to the phone system; add the redirects.

**Next — needs backend fields**

5. User states: pending, suspended, deleted with a 72-hour restore window.
6. Reserved number pool, with reassign and automatic forwarding.
7. Personal working hours, devices screen, personal E911 location.
8. Consolidate the three number tables; add labels and failover numbers.
9. Bulk actions and CSV export on People and Numbers.

**Projects of their own**

10. Number plans → classifications → outbound routes.
11. Skills with proficiency, then wire into routing.
12. Explicit subject and self/other permission split across every personal screen.

**Blocked — auth layer**

13. Server-side ownership check on session logout, still open from commit `1f49c0f`.
