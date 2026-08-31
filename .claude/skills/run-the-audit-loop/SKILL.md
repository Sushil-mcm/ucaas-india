---
name: run-the-audit-loop
description: "The state machine and tracker discipline that keeps a build/audit handoff honest: OPEN, CLAIMED, CONFIRMED, HONEST, WONTFIX, who is allowed to move which state, and what evidence a state change requires. Use when a builder and an auditor are separate agents or people working the same defect list over multiple sessions. Not needed for a single session that writes and verifies its own change in one pass."
---

## What this is for

A build/audit split only works if state can't drift from reality between
sessions. The failure mode is not dishonesty — it's a report that was true of
one machine, one build, one moment, quietly read as true of all of them later.
[[verify-before-claiming]] is the toolbox for *how* to check a claim; this
skill is the discipline for *when* a state is allowed to change, and who is
allowed to change it.

The rule underneath everything here: **a row's state reflects the last party
who actually checked it, not the last party who said something about it.**

---

## 1. Five states, and who may set each one

| State | Meaning | Set by |
|---|---|---|
| OPEN | Found, handed off, not yet addressed | The auditor, on finding it |
| CLAIMED | Builder reports it fixed | The builder — **never** the auditor |
| CONFIRMED | Auditor retested it, with a control, and it holds | The auditor — **only** on their own retest |
| HONEST | Still doesn't work, but the screen now says so truthfully instead of implying it does | Either party, once the label is verified accurate |
| WONTFIX | Deliberately left as-is | Whoever decided, with the reason recorded in the same row |

The two traps this catches: a builder cannot mark their own work CONFIRMED
(that's the entire point of having a second party), and an auditor cannot
promote a row to CONFIRMED on a report, a commit message, or a file's
presence — only on a check they ran themselves, this session, against the
live target.

---

## 2. Every row needs an Evidence column, and a blank one means OPEN

Whatever the state column says, treat a row with no evidence recorded as OPEN.
"Evidence" means what was actually run or read — a command, a grep with its
control, a timestamp comparison — not a description of the fix. If you can't
name the check, the state hasn't actually changed yet, whatever anyone
believes.

Two recurring shapes worth naming explicitly in the tracker's own header, so
nobody re-learns them the hard way:

- **A patch on disk is not a patch in the running process.** Compare the
  file's mtime against the process's start time; the process must be newer.
- **A deploy can succeed completely and change nothing**, if it targeted the
  wrong host, or a host whose service-management commands report success
  without doing anything. Confirm the target behaviourally (live traffic,
  live registrations) before trusting that a "successful" deploy landed
  where it matters.

---

## 3. The loop itself

1. **Auditor finds defects**, files each as its own row, state OPEN, addressed
   to the builder.
2. **Builder fixes**, reports the row CLAIMED. This is a handoff, not a
   close — the builder's report is input to the next audit pass, not a
   record of completion.
3. **Auditor retests with a control** (see [[verify-before-claiming]]) and
   either promotes to CONFIRMED with the evidence recorded, or bounces it
   back to OPEN with exactly what's still wrong. A partial fix is OPEN, not a
   half-CONFIRMED — there's no state for "mostly."
4. Repeat until every row is CONFIRMED, HONEST, or WONTFIX. A brief isn't done
   while any row sits at CLAIMED with no retest behind it — CLAIMED is a
   promise, not a result.

---

## 4. HONEST is a legitimate resting state, not a failure

When the underlying capability genuinely can't be finished yet (a dependency
that doesn't exist, a platform limitation), the correct outcome is a row that
says so — and a screen that says so too, per [[verify-before-claiming]]'s
rule on honest labels. Don't leave a row open indefinitely chasing a fix
that isn't buildable this cycle; mark it HONEST once the label matches
reality, and revisit it as a fresh OPEN item when the blocker clears.

---

## 5. WONTFIX needs a reason in the row, not just in memory

An undocumented WONTFIX looks identical to an abandoned OPEN item six months
later, and gets "rediscovered" and re-argued. Write the reason where the
state lives: why it's deliberate, and who decided.

---

## 6. Stay in your lane

If the auditor starts fixing things, or the builder starts closing their own
rows, the loop stops meaning anything — there's no longer a second party
checking the first. If scope drift happens anyway (a small fix made in
passing while auditing), say so plainly in the write-up rather than quietly
folding it into the audit's findings: name what was changed, and leave its
tracker row exactly where an outside check would leave it, not where the
person who touched it would like it to be.

---

## 7. Status reports separate "verified" from "stale"

When rolling many rows up into a periodic summary, state the freshness
cutoff explicitly — the timestamp after which nothing has been rechecked —
and put anything past it in a "needs retest" bucket rather than reporting it
at whatever state it last held. A status report's job is to be trustworthy
about what it doesn't know, not just about what it does.

If one failure pattern is recurring across many rows (the same wrong-host
deploy, the same stale-process problem), name the pattern once at the top of
the report instead of letting it appear as N unrelated surprises — that's
usually the single most useful sentence in the report.
