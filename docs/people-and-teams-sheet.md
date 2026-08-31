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
