# People / Your Team — what they have, what we have

Reference material only. **Do not put a rival's name into product UI text or comments.**
Checked 31 August 2026 against help.dialpad.com and our own code.

---

## First, the link

`help.dialpad.com/docs/your-team` is **not** team management. It is an email template for
announcing the product to staff. The real team-management pages are elsewhere, and the page
did give us something better on the way past:

**`https://help.dialpad.com/llms.txt` is a complete documentation index**, and every page
has a clean markdown version — append `.md` to any `/docs/` URL. That is a far more reliable
source than fetching their rendered pages, and it works for every future comparison.

---

## Sheet — managing people

| Capability | Theirs | Ours | Verdict |
|---|---|---|---|
| List of people | names, emails, numbers, licence type | Name, Caller ID, Location, Availability | Have |
| Per-person actions | delete, admin access, proxy login, transfer office, change licence, reassign number | Activity, Call, Assign Caller ID, Chat, Update Forwarding | Partial |
| Add people | invite | full flow with number assignment and an order summary | **Ours is better** |
| **Deleted users tab + restore** | recently deleted kept **72 hours**, restorable; anonymised after | **none** | **Gap** |
| **Reserved numbers tab** | unassigned numbers, who held it, which office, when released, reassign or delete | **none** | **Gap** |
| **Proxy login** | admin opens a user's account and settings as them | **none** | **Gap** |
| **Move someone to another site** | transfer user between offices | **none** | **Gap** |
| **Licence type per person** | change licence, swap between licence families | 4 mentions, no change-licence action | **Gap** |
| Bulk role change | — | `assignRoleBulkUsers`, from People and from Roles | **Ours is better** |
| Bulk delete / bulk admin access | yes | **none** | Gap |
| Export the list | yes | yes | Have |
| Filter by licence or permission | yes | search only | Partial |
| Roles | fixed admin types plus role-based access | custom roles, capability matrix, admin scope | **Ours is better** |
| Joining and leaving | scattered across help pages | one page that states plainly what works and what does not | **Ours is better** |

### Their second feature: User Settings Policies

This is the one with no equivalent on our side, and it is worth understanding properly.

A policy decides **which settings a person may change on their own account**. Anything not
granted becomes read-only for them. Fifteen sets, covering: AI on calls, transcript timing,
personal working hours, voicemail upload, hold music, ring duration, call handling, missed
call routing, caller ID mask, language, timezone, ringtone, location, fax cover sheet, and
notifications.

Two things make it more than a pile of switches:

1. **Three scopes** — company-wide, one office, or one person.
2. **Precedence runs inwards** — a person's policy beats their office's, which beats the
   company's. So you set one company standard and carve out exceptions, rather than
   configuring everybody.

**We have the idea, at one level only.** Company settings already carry `override` flags —
the phone-rules card shows "Locked" or "Staff can change" per rule. What is missing is the
scoping and the precedence: no per-site policy, no per-person exception, and it covers a
handful of settings rather than fifteen.

So this is not a blank sheet. It is a one-level version of a three-level idea.

---

## What is worth building, in order

### 1. Deleted users, with a restore window
The clearest gap and the one with real consequences. Delete somebody today and there is no
way back. A 72-hour window turns an irreversible mistake into a recoverable one — and it is
mostly a state change plus a tab, not new machinery.

### 2. Reserved numbers
When somebody leaves, their number goes somewhere. Today there is no screen that says where.
This pairs naturally with (1): both are about what survives a person leaving. We already have
a numbers area for it to live in.

### 3. Extend the override flags into real policies
Not a rebuild. Take the `override` flags that already exist on company settings and give them
two more scopes — per site and per person — with the same inwards precedence. That is the
smallest change that turns a working idea into the useful version of it.

### 4. Move someone to another site
We are multi-site already; every person belongs to a location. There is no way to move one.

### 5. Bulk delete and bulk admin access
We already do bulk role assignment, so the pattern and the plumbing exist.

### Deliberately not recommending: proxy login
It is genuinely useful for support, and it is also the ability to become another person
inside the product. That needs a decision about audit trail and consent before any code —
who may do it, is the user told, what is recorded. Worth doing eventually; not worth doing
quietly.

---

## What this needs from the backend

| Ask | For |
|---|---|
| Soft delete on a user, with a deleted-at stamp and a restore endpoint | (1) |
| A record of a number's previous holder and release date | (2) |
| Policy objects scoped to company / site / person, resolved inwards | (3) |
| An endpoint to change a person's site | (4) |
| Bulk delete and bulk admin-access endpoints | (5) |

Items 1, 2 and 4 look like they belong to `default-api`, which has no source. Worth
confirming before any of it is scheduled — see `docs/queue-stats-backend-plan.md` for how
that has bitten already.

---

## Verified against the running API, 31 August 2026

Before building any of the above I checked what the backend can actually do. Most of it
cannot be built, and the reason is the same one every time.

### Deleted users and restore — blocked, but closer than it looks

**The data is already there.** The `User` model in `default-api` is `paranoid: true`, so a
removal is a soft delete: the row survives with a `deleted_at` stamp. Our own
"Joining and leaving" page says the same in plain words — *"Their record is kept rather than
destroyed, but nothing lists removed people."*

**What is missing is two endpoints.** Nothing in the list controller can return deleted rows
— no `paranoid: false`, no include-deleted flag — and there is no restore route. So the
records sit in the database, unreachable.

That is a small backend change. It is blocked only because `default-api` ships as compiled
`dist/` with no source and no git.

### Move someone to another site — unconfirmed

`site_uuid` appears throughout the user controller, but only in read attribute lists. Whether
the update handler will write a new one could not be established from compiled code. Do not
schedule this until it is checked.

### Bulk delete — recommend NOT building it

`deleteMember` is per-user, so a bulk action would be a loop. That is possible. It is also
the wrong thing to build **while restore is impossible**: it makes an irreversible action
easy to perform on many people at once, with no way back. Build restore first, then this.

Bulk *admin access* is already covered — `assignRoleBulkUsers` does bulk role change from
both People and Roles.

### A workaround I looked at and rejected

`tenant-api` has full TypeScript source and could be given a `User` model pointing at the
same table, exposing list-deleted and restore. It would work.

I am not recommending it. Queue statistics belonged in `esl-manager` because live call state
is genuinely that service's domain. Users are `default-api`'s domain, and putting a
user-restore endpoint in `tenant-api` would be placing it in the wrong service for
convenience — the kind of shortcut that is invisible for a year and then very expensive.

### What was built

The **email column** on People. The row already carried the address and it was being thrown
away; two people with the same name were indistinguishable. Front end only, no API change.

---

## The ask, made concrete

This module is one small change away from the feature that matters, and that change cannot be
made. So the `default-api` source is no longer a background risk — it is **the** blocker here.

When you find whoever deployed version 1.2.9, the specific ask is:

1. `GET /api/user/list` — accept a flag that includes soft-deleted rows
2. `POST /api/user/restore/:uuid` — clear `deleted_at`
3. Confirm whether `POST /api/user/update/:uuid` writes `site_uuid`

Items 1 and 2 are perhaps an hour's work for someone holding the source. They turn deleting a
colleague from an unrecoverable mistake into a recoverable one.
