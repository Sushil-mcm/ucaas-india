# Admin sets it once, nobody overrides it — what exists, what is missing

Research only, 1 September 2026. No code changed. Another session is editing the Company
module, so this is a report, not a patch.
**Do not put a rival's name into product UI text or comments.**

---

## The short answer

You are asking for three things. **Two of them already exist**, one is only half-wired, and
the piece that would join them up is missing.

| What you asked for | State |
|---|---|
| Admin sets company rules | **Built** — 12 sections under `/admin-settings/company` |
| A rule can be locked so staff cannot change it | **Built, and enforced in some places but not others** |
| Roles decide what a person can access | **Built** — custom roles, capability matrix, admin scope |
| Settings can be prepared in advance and reused | **Built** — "User settings templates" |
| Picking a role also applies its settings | **Missing.** Roles and templates are not connected |

So this is not a build-from-scratch job. It is finishing wiring that is already most of the
way there.

---

## 1. The lock exists — and it leaks

Every company rule carries an `override` flag. The Phone rules card shows each one as
**Locked** or **Staff can change**. Eight settings are governed
(`src/lib/company-policy.ts`):

```
voicemail · recording · transcription · ai_call_monitoring
display_number · business_hours · regional · role
```

**Where the lock is honoured**

| Screen | |
|---|---|
| `settings/general` — a person's own preferences | honours it |
| `components/common-settings` — the shared block in queue / IVR editors | honours it |
| `people/update-forwarding` — an admin editing one person | honours it, via `isLockedByCompany` |
| `company-voicemail` | honours it |

**Where it does not**

| Screen | Exposes | Problem |
|---|---|---|
| `settings/phone` | `operational_hours`, `voicemail` | both are locked fields, no check |
| `settings/greetings` | `recording`, `voicemail` | both are locked fields, no check |
| `settings/basic-info`, `notification`, `security` | — | no locked fields, so no issue today |

**This is a hole, not a gap.** An admin can set business hours, voicemail or recording to
Locked, and the person can still change it from their own screens. The rule is honoured on
the path the admin walks and ignored on the path the user walks — which is the wrong way
round, because the user's path is the one the lock exists for.

Nothing is wrong with the mechanism. Two screens never got wired to it.

---

## 2. Roles and templates both exist, and do different jobs

**Roles** (`/admin-settings/roles`) decide *what a person may see and do*: custom roles, a
capability matrix, admin scope. This is genuinely strong — stronger than the reference
product, which has fixed admin types.

**User settings templates** (`/admin-settings/templates/user-settings`) decide *what a
person's settings start as*: a named, reusable set of settings with their own override flags.
The company's own defaults are stored as one of these, under the reserved name
"Company Default".

So both halves of your question are built. They have simply never been introduced to
each other.

---

## 3. The missing link

When an admin adds somebody (`people/add-users`), they pick a **role** — `role`,
`role_uuid`, `custom_role_uuid` all travel with the new user.

They do **not** pick a template, and no template is applied. Grep for "template" in that flow
returns nothing.

So today: pick the role, then set that person's settings by hand, one at a time, exactly as
you describe. The reusable settings exist on another screen and are never reached.

---

## How to build it

Three pieces, smallest first. Each is useful on its own.

### A. Close the leak — two screens

Make `settings/phone` and `settings/greetings` read the company policy the way
`settings/general` already does. There is a hook for it (`useCompanyPolicy`) and a working
example to copy. A locked setting should be visible but not editable, and should say who
locked it — a greyed control with no explanation reads as broken.

**Front end only. Nothing new required.** This is the one I would do first: it is small, and
until it is done "Locked" is not true.

### B. Give a role a default template

Add one field to a role: *which settings template does somebody on this role start with?*

Then in add-users, once the role is chosen, apply that role's template to the new person.
The admin picks a role and the settings come with it — which is exactly what you described.

**Needs the backend:** a `template_uuid` on the role, and user creation to apply it.

### C. Let a site sit between company and person

Today a rule is company-wide or per person. The reference product has three levels — company,
office, person — with the innermost winning: a person's setting beats their site's, which
beats the company's.

We are multi-site already, so the middle level is the obvious next step: "Delhi records every
call, Head Office does not", without touching anyone individually.

**Needs the backend:** policies scoped to a site, resolved innermost-first.

---

## What I would do, in order

1. **A** — close the leak. Small, front end, and it makes an existing promise true.
2. **B** — role carries a template. This is the thing you actually asked for, and it removes
   the per-person setup entirely.
3. **C** — per-site rules. Worth having, but only once B exists.

## One thing to check before scheduling B

Whether the role object can carry a template id, and whether user creation can apply it, both
live in `default-api` — the service with no source. Same blocker as user restore. Worth
confirming before B goes on a plan; A is unaffected either way.
