---
name: write-the-build-brief
description: "How to turn research and live-system audit findings into a build brief another agent can execute without re-deriving context. Covers per-item structure, ground rules stated once, gap-vs-regression-vs-divergence classification, and writing the retest into the item up front. Use when handing implementation work to a separate builder (agent or person) after studying a reference product or auditing the current system. Not needed for a change small enough to just make yourself."
---

## What this is for

A brief is the interface between research and implementation. Whoever executes
it was not in the room while you read the docs, mirrored the reference
product, or grepped the live dialplan. Everything they need to act correctly —
without pinging back to ask, and without re-deciding something you already
decided — has to be on the page.

A brief that makes the builder re-derive context is really an incomplete
research pass with a to-do list stapled on. This is the skill for closing that
gap: [[study-the-reference-product]] and a live audit produce the raw
findings; this skill turns them into something buildable.

---

## 1. One row, six facts, always

Every item needs: an **ID**, what is wrong **today**, what to **build**, which
**files** it lives in, the **data shape**, and the **test** that will be run
against it once it's claimed done.

```
C4 | Do Not Disturb promises calls go to voicemail | dialplan_service.py never
   reads presence state | build_inbound_dialplan, presence.py | presence:
   'available'|'busy'|'dnd' on the user row | fs_cli 'show channels' during a
   DND call must show it routed to voicemail, not the extension
```

Skip any of the six and the builder either guesses or stops to ask — both cost
more than writing the row completely the first time. The test column matters
most and is the one people skip: without it, "done" is whatever the builder
believes, not something the next check can confirm or refute.

---

## 2. Ground rules live once, at the top, not per item

If a rule recurs across items, it does not belong in each item's description —
it belongs in a numbered "ground rules" section every item is read against.
Repeating it per item invites drift: item 12's wording quietly relaxes item
3's rule and nobody notices.

Rules worth a permanent slot, because each one has already cost a rebuild
somewhere:

- **Nothing is finished on the builder's say-so.** They report a state as
  claimed, never confirmed — confirmation is a different party's job, on a
  retest with a control. See [[run-the-audit-loop]].
- **Don't ship a control without its consumer.** A setting that saves and
  nothing reads is worse than no setting — it looks finished. Ship the
  behaviour in the same batch as the control, or ship the control wearing an
  honest "not active yet" label. If an honest-label pattern already exists in
  the codebase (a status badge, a disabled-with-note state), name it and say
  reuse it — don't let the builder invent a second one.
- **Merge, never replace, on shared records.** Where several screens or
  features write to one shared record (a JSON column, a config blob), name
  the existing merge helper if one exists. A screen that reads-modifies-writes
  the whole object deletes what its neighbours own.
- **State every blocking prerequisite as its own numbered item**, ordered
  first, and reference its ID from anything it blocks. If a build step
  destroys a hotfix that only exists outside version control (a patch applied
  directly to a running/compiled artifact), that item is not a footnote — it
  gates every other item in the brief and must be item one.
- **Explicit schema changes.** If the system doesn't auto-sync models to
  storage, say so and name the migration convention to follow, with a recent
  real example.
- **Never write the reference product's name into the product** — not in UI
  text, not in code comments, not in a migration name. Say "established
  platforms" or describe the behaviour if the *why* needs explaining. Study
  it; don't name it.

---

## 3. Classify every gap before assigning it

Not-yet-built and used-to-work are different jobs with different costs, and
conflating them wastes the more valuable one:

- **Gap** — never existed. Needs design judgment.
- **Regression** — worked once, was dropped (often in a rewrite). Diff the old
  build against the current one; the old behaviour *is* the spec. This is
  usually the cheaper item even though it looks the same size on a feature
  list.
- **Deliberate divergence** — built differently on purpose. Leave it, and
  record the reason so it isn't rediscovered and "fixed" by someone who
  didn't get the memo.
- **Already correct** — say so explicitly and tell the builder not to touch
  it. An unlisted working feature gets refactored by accident; a listed one
  that says "leave alone, here's why" doesn't.

Put the classification in the item, not just in your head — it's the
difference between "design this" and "restore this," and a builder can't tell
which without being told.

---

## 4. Point at companion documents, don't restate them

If a deeper plan for one area already exists (a security build-out, a
subsystem's own design doc), reference it by path and say what continues from
it. A brief that copies another document's content will drift from it the
first time either one is edited. State the relationship once: "items C1–C5
continue `<path>`, read it first."

---

## 5. Say what the builder must not do, not just what to build

A brief that only lists additions invites a well-meaning cleanup of everything
adjacent. If there's a known list of finished, correct, or intentionally
untouched things nearby, name them plainly — "do not rebuild these" — with
enough specificity that a builder recognizes them without re-auditing the area
themselves.

---

## 6. Report what you didn't verify

A brief is a product of research, and research has edges. Say which parts are
observed fact (read the source, ran the check) versus inference (read three
similar sections and generalized), and say which areas you didn't get to
rather than letting silence imply full coverage. The builder — and whoever
retests after them — should know where the brief itself might be wrong.
