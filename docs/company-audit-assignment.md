# Audit assignment — Company module (Company & Locations + Company Rules)

**Prepared:** 2026-08-31, by the orchestrator session (mycountrymobile-web-11).
**Assignee:** Agent 3 (auditor). **Status: DRAFT — not dispatched until the user approves.**
**Discipline:** follow the `run-the-audit-loop` and `verify-before-claiming` skills in
`/root/mycountrymobile-web/.claude/skills/`. You audit and report; you do not fix.
Every claim needs its own retest with a control case.

## Why this audit

The user is starting a research → build → audit cycle on the Company module.
Research (Agent 2, fresh session) will be dispatched only AFTER this audit reports,
so the researcher plans from verified facts, not assumptions.

## Scope

Live portal: https://unified.mycountrymobile.com (account is open in the Chrome
browser named "UCaaS Testing Phase1"; backend is api2.mycountrymobile.com).

1. **Company & Locations** (`/admin-settings/company`)
2. **Company Rules** (`/admin-settings/company/phone-rules`) and its 11 sibling
   sections: Phone rules, Greetings, Ringing & voicemail, Emergency address,
   Holidays, Calling, Messaging, Policies, Apply to people, Profile fields, Security.

## What is already documented (do not re-derive; verify by sampling)

- `docs/company-build-list.md` — control-by-control audit traced to FreeSWITCH,
  plus a 7-step build order. The single most relevant document.
- `docs/admin-audit-tracker.md` lines 34–70 — Company items C1–C5 CONFIRMED,
  an "Honest, still not working" table, D1–D3 OPEN.
- `docs/agent1-parity-build-brief.md` Part 3 (lines 343–410) — Security
  enforcement items C1–C5 (MFA, IP allowlist, SAML, idle timeout, change log).

## Verified code facts to test against (from a 2026-08-31 code exploration)

- Sites CRUD is real: `/api/site/list`, `/api/site/upsert`, `/api/site/delete/{id}`.
- ALL company settings persist into a reserved `user_template` row whose `name`
  is exactly `"Company Default"` (read via `/api/tenant/user/template/list`,
  written via `/api/tenant/user/template/upsert`). There is no company-settings table.
- The company name shown is a proxy read from the main location; the real company
  record endpoint `/api/admin/company/info` is platform-staff-only and never called.
- "Make main" has no endpoint — the frontend re-saves the site with `is_default:'1'`
  and re-fetches to check whether the server obeyed.
- Roughly two-thirds of the rules controls are stored-but-never-read; badges
  (`active` / `app-only` / `coming-soon`) mostly admit this, with known exceptions.

## Audit items

For each item: retest live, record evidence (what you did, what you saw, control
case), and mark OPEN / CONFIRMED-working / HONEST (admits it does nothing) /
DISHONEST (claims more than it does).

- **A1 — Sites CRUD.** Create a throwaway location, edit it, delete it. Confirm via
  a second list fetch, not the success toast.
- **A2 — "Make main".** Attempt to move the main flag to a non-default location.
  The code itself doubts the API accepts this — settle it with evidence.
- **A3 — Company record edit.** Edit company name/address via "Edit details".
  Where did the write actually land (template? `/api/admin/company/upsert`?), and
  what does a fresh session show afterward?
- **A4 — Template-name dependency (new finding).** The Phone rules form exposes an
  editable **Name** field containing "Company Default". Determine what happens if
  it is changed: does every company-rules screen orphan? **User decision
  2026-08-31 (~13:25): rename-and-revert on the live row is SANCTIONED**, with
  guardrails: prepare the revert before the rename; capture evidence in one
  pass; revert within seconds; prove the revert (re-fetch template list + full
  reload of one rules screen); record the rename+restore with timestamps in the
  tracker. If the revert fails, stop and escalate before touching anything else.
- **A5 — Badge honesty sweep.** For each of the 12 sections, list every control and
  its badge, and check the badge against reality where testable without a live
  call. Known disputes to settle: Default ring time claims `active` but
  `docs/company-build-list.md` says the dialplan hardcodes 30/60; the two Calling
  transfer switches claim active but are app-only; Phone rules / Greetings /
  Holidays carry no badge at all.
- **A6 — Settings consumers.** Business hours are never evaluated by the dialplan
  and ring duration is hardcoded (memory: business-hours-never-evaluated). Confirm
  which stored keys have any real consumer (app-side counts, switch-side counts).
- **A7 — Security section.** Confirm all six controls (MFA, exception list, idle
  timeout, IP allowlist, SAML, change log) are still coming-soon and none
  half-works. Note: Agent 1 has MFA storage built locally (branch
  `feat/mfa-storage`, NOT deployed) — the live screen should not claim otherwise.
- **A8 — Permissions gate.** The screens gate on
  `account_setting.access.SITE.action.*`, but server-side rbac is advisory
  (memory: rbac-is-advisory). Spot-check one write as a non-admin if a test user
  exists; otherwise mark untested, do not guess.

## Ground rules

- Read-only mindset: create/delete only throwaway data, clean up after yourself,
  never touch the two real locations or the real "Company Default" row beyond A4's
  carefully-reverted test.
- Never write competitor names into anything user-visible.
- Do not edit code or deploy. Findings go to the report; fixes go through
  Agent 2 (plan) → Agent 1 (build).
- Report back to the orchestrator session (mycountrymobile-web-11) via SendMessage
  AND append findings to `docs/admin-audit-tracker.md` under the Company section —
  the file is the durable record, the message is the pointer.
