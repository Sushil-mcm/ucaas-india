---
name: coordinate-the-agent-trio
description: "How to split research/plan/build/audit work across three independently-running agent sessions with proper handoff, without losing state between them or blurring who checks whom. Covers finding and addressing the right live session, file-based vs message-based handoff, when to use a live peer session versus a same-turn subagent, and escalation when a claim doesn't survive a retest. Use when coordinating multi-session or multi-person work on the same system over time. Not needed for a single-session task, or for parallel research fully containable within one turn."
---

## What this is for

Three roles, one flow: **research & plan** → **build** → **audit**, each
capable of running as its own long-lived, independently-scheduled session
rather than a step inside one conversation. That independence is the whole
point — a builder can work for hours without the researcher's context window,
and an auditor's retest means nothing if it isn't run by someone who wasn't
the one who just wrote the fix.

It's also exactly where state gets lost: a session that assumes its peer
remembers something it never wrote down, a handoff aimed at a session that
turns out to belong to a different project, a claim that traveled from
builder to status report without ever being rechecked.

The roles, generically:

| Role | Produces | Skill for the *how* |
|---|---|---|
| Research & plan | A build brief | [[study-the-reference-product]], [[write-the-build-brief]] |
| Build | A CLAIMED item | (ordinary implementation work, against the brief's ground rules) |
| Audit | A CONFIRMED, HONEST, or bounced-back item | [[verify-before-claiming]], [[run-the-audit-loop]] |

This skill is the map connecting them — not a replacement for any one of the
three above.

---

## 1. Confirm which live session you actually mean

`ListAgents` returns every peer session by name, and names collide: the same
role name (a builder, an auditor, a researcher) often exists once per
sub-project, distinguished only by the bracketed ref shown when a name is
ambiguous. Addressing a role by name alone risks handing work to the wrong
project's instance of that role — the messaging equivalent of deploying to
the box with the same hostname pattern but the wrong traffic.

Before sending anything non-trivial, confirm identity the same way you'd
confirm a production host: by what the session is actually working on (ask,
or check what it last reported), not by the label alone. If two sessions
share a name, always disambiguate with the ref.

---

## 2. The durable record is a shared document, not the message

A live session can restart, run out of context, or simply not read a message
for hours. A `SendMessage` is good for a nudge, a question, or a
time-sensitive handoff — it is not where state should live. The tracker file,
the brief, the status report: these are what any session (including one that
starts fresh with no memory of the conversation that led here) can read and
trust.

Practical rule: if a decision or a state change matters, it goes in the
document *and* gets a message pointing at it, not one or the other. A message
that says "fixed C4" and nothing in the tracker is a claim with no home —
the next person to check the tracker sees OPEN and has no idea a claim was
ever made.

---

## 3. Live peer session vs same-turn subagent

Not every piece of research needs a dedicated live session. Use a same-turn
subagent (the `Agent` tool) for anything fully containable within your own
turn — a scoped investigation, parallel searches across a codebase, a
one-off review — where no continuity across sessions is needed and nobody
downstream depends on that specific agent's ongoing ownership of the work.

Reserve the live trio for the roles that need to *own* a lifecycle stage
across time: a builder who will be executing a multi-item brief over hours,
an auditor whose retests need to stay attributable to one continuous thread
of checks. Pulling in a live peer session for a five-minute lookup is more
coordination overhead than the lookup was worth; spinning up a same-turn
subagent for work that needs to persist and be checked by someone else later
loses the record the moment that subagent's turn ends.

---

## 4. Escalate on a bad claim; don't quietly absorb it

When a retest doesn't hold up a CLAIMED item, the auditor's job is to bounce
it back with the exact evidence — not to fix it themselves (that blurs who
checked whom, see [[run-the-audit-loop]] §6), and not to soften it in the
report. Name what was claimed, what was actually found, and — if a pattern
recurs across several items — say so once at the top rather than as isolated
surprises. A builder who consistently gets bounced back for the same reason
needs that reason stated plainly, not rediscovered by the next auditor.

---

## 5. Keep the loop closed, not just started

Handing an item to a builder is not the work finishing — it's the work
starting. The coordinating session (whichever role is currently driving) is
responsible for making sure every dispatched item eventually gets a retest,
not just an initial handoff. An item that's CLAIMED and never revisited is
functionally OPEN with an optimistic label; if a session ends before a retest
happens, the next session to pick up the tracker should treat anything past
its last verified timestamp as unverified, per [[run-the-audit-loop]] §7.

---

## 6. Report the shape of the coordination, not just the outcome

When summarizing multi-session work, say what was handed to whom, what came
back, and what's still in flight — not only the final counts. "14 confirmed,
3 bounced back twice for the same reason, 1 still with the builder" tells the
next reader where to look; "17 items processed" doesn't. If a handoff went to
the wrong session, or a claim didn't survive a retest, that's worth surfacing
plainly rather than folding into an aggregate number — it's usually the most
actionable sentence in the report.
