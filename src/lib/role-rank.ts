/**
 * Who outranks whom.
 *
 * Every guard in the product used to ask the same question with its own string
 * test — `role !== 'ADMIN'` — which answers only one case and answers it badly:
 *
 *  - It compares against a *display* name in places. A person's row carries
 *    `custom_role_data.name || role_data.name || role`, so an administrator on
 *    a custom role called "Owner" is not the string ADMIN and passes a check
 *    meant to stop exactly that.
 *  - It says nothing about the ranks between. A sub-admin acting on another
 *    sub-admin, or a manager on a sub-admin, passes every `!== 'ADMIN'` test in
 *    the codebase.
 *
 * So the rule lives here once: you may act on somebody strictly below you, and
 * on nobody else.
 *
 * This is a *usability* boundary, not a security one. It stops a screen
 * offering an action that should not be offered. The server is what decides
 * whether an action is allowed, and until every person-acting endpoint asks the
 * same question, a crafted request still gets through: today
 * `/api/did/remove-assign-did` and `/api/user/delete` check the caller's
 * company and nothing about rank.
 */

/** Higher outranks lower. Unknown roles rank lowest, so they can act on nobody. */
export const ROLE_RANK: Record<string, number> = {
  ADMIN: 40,
  'SUB-ADMIN': 30,
  SUBADMIN: 30,
  SUB_ADMIN: 30,
  MANAGER: 20,
  AGENT: 10,
  USER: 10,
};

/**
 * The system role behind a person record, never the label shown on screen.
 *
 * `role` is the enum the server stores. `custom_role_data.name` is what an
 * administrator typed when they made a custom role, and it can say anything at
 * all — reading it here is what let a renamed administrator slip past.
 */
export const systemRoleOf = (person: unknown): string => {
  const record = (person || {}) as Record<string, any>;
  const raw = record.raw && typeof record.raw === 'object' ? record.raw : record;
  return String(raw?.role ?? '')
    .trim()
    .toUpperCase();
};

/** Rank of a person record. Anything unrecognised sits at the bottom. */
export const rankOf = (person: unknown): number => ROLE_RANK[systemRoleOf(person)] ?? 0;

/**
 * May `actor` act on `target`?
 *
 * Strictly greater, so peers cannot act on each other: one sub-admin does not
 * get to strip another sub-admin's number, and two administrators do not get to
 * remove one another. Acting on yourself is not this function's business — a
 * screen that allows it (editing your own profile) or forbids it (deleting your
 * own account) says so separately, because the answer differs by action.
 */
export const mayActOn = (actor: unknown, target: unknown): boolean =>
  rankOf(actor) > rankOf(target);
