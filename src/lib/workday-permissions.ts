/* The agent-workday permission keys, in ONE place on this side.
 *
 * Mirrors campaign-api src/constants/workdayPermissions.ts and default-api
 * src/constants/workdayPermissions.ts: the same keys, sentences and defaults.
 * A change to one is a change to all three. The server decides; what this
 * file decides is only whether a control is shown, and how it explains
 * itself when it is not.
 *
 * WHO DECIDES WHAT
 *
 * The role STRING is still the real gate on this platform (never rename a
 * role: ADMIN, MANAGER, SUB-ADMIN, SUPERVISOR, AGENT; SUPER-ADMIN turns up in
 * some checks). It reads as three columns:
 *
 *   ADMIN / SUPER-ADMIN   the account owner: everything.
 *   MANAGER / SUB-ADMIN   the location and group admins: other people's duty
 *     / SUPERVISOR        and the agent reports, never the timers, reasons,
 *                         limits or the lock. SUPERVISOR sits in this column
 *                         with one extra gate: other people's duty only while
 *                         the company switch (below) is on. Their reach is
 *                         the groups they belong to (lib/admin-scope.ts).
 *   AGENT                 their own duty and their own day.
 *   anything else         a custom role name, a uuid, nothing: the AGENT
 *                         column, unless the role's tree says otherwise.
 *
 * A company's own role (Roles › Add role) can name these keys under the
 * "Agent workday" group; an explicit tick box there wins over the column.
 * Both servers read the same box: the gateway from the role tree, and
 * campaign-api from the parent role the gateway resolved.
 *
 * THE LOCK
 *
 * Company › Duty policy holds two switches. "Agents may change their own
 * duty": off, an AGENT's duty.own is refused (the header chip goes read-only
 * with the sentence below) and somebody else sets it. Admins and the owner
 * are never locked. "Supervisors may change an agent's duty": off by
 * default, and while it is off a SUPERVISOR's duty.others is refused even if
 * a role tree ticks it; location and group admins are not gated by it. */

import { extractPlanFeatures } from '@/hooks/rbac';

export const WORKDAY_KEYS = [
  'duty.own',
  'duty.others',
  'breaks.reasons.manage',
  'breaks.limits.manage',
  'campaign.timers.manage',
  'reports.agents.view',
  'reports.agents.export',
  'reports.agents.schedule',
  'duty.lock',
] as const;

export type WorkdayKey = (typeof WORKDAY_KEYS)[number];

/* Plain sentences: the Roles screen shows these beside the tick boxes. */
export const WORKDAY_SENTENCES: Record<WorkdayKey, string> = {
  'duty.own': 'May start and end their own shift and take their own breaks',
  'duty.others': "May end another person's shift or change their duty",
  'breaks.reasons.manage': "May add, rename and remove the company's break reasons",
  'breaks.limits.manage': 'May set the allowance on a break reason',
  'campaign.timers.manage': "May change the company's campaign timer defaults",
  'reports.agents.view': 'May read agent reports for everyone (without it: their own day only)',
  'reports.agents.export': 'May export agent reports',
  'reports.agents.schedule': 'May schedule agent reports to be sent',
  'duty.lock': 'May lock agents out of changing their own duty',
};

export type WorkdayColumn = 'AGENT' | 'SUPERVISOR' | 'ADMIN';

export const WORKDAY_DEFAULTS: Record<WorkdayKey, Record<WorkdayColumn, boolean>> = {
  'duty.own': { AGENT: true, SUPERVISOR: true, ADMIN: true },
  'duty.others': { AGENT: false, SUPERVISOR: true, ADMIN: true },
  'breaks.reasons.manage': { AGENT: false, SUPERVISOR: false, ADMIN: true },
  'breaks.limits.manage': { AGENT: false, SUPERVISOR: false, ADMIN: true },
  'campaign.timers.manage': { AGENT: false, SUPERVISOR: false, ADMIN: true },
  /* AGENT: true means "their own day"; the report route scopes it. */
  'reports.agents.view': { AGENT: true, SUPERVISOR: true, ADMIN: true },
  'reports.agents.export': { AGENT: false, SUPERVISOR: true, ADMIN: true },
  'reports.agents.schedule': { AGENT: false, SUPERVISOR: false, ADMIN: true },
  'duty.lock': { AGENT: false, SUPERVISOR: false, ADMIN: true },
};

const roleKey = (role: unknown): string =>
  String(role ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-');

export const workdayColumnForRole = (role: unknown): WorkdayColumn => {
  const key = roleKey(role);
  if (key === 'ADMIN' || key === 'SUPER-ADMIN') return 'ADMIN';
  if (key === 'MANAGER' || key === 'SUB-ADMIN' || key === 'SUPERVISOR') return 'SUPERVISOR';
  return 'AGENT';
};

/* The one role string the company switch gates. A custom role whose parent
   is SUPERVISOR arrives here as its own name; the server resolves the parent
   and applies the same gate, so the worst case is a control that is shown
   and then refused, never one that is hidden and would have worked. */
export const isSupervisorRole = (role: unknown): boolean => roleKey(role) === 'SUPERVISOR';

export const isWorkdayKey = (key: unknown): key is WorkdayKey =>
  (WORKDAY_KEYS as ReadonlyArray<string>).includes(String(key ?? ''));

/* ---- The role tree ------------------------------------------------------ */

/* The keys live in a role's tree as `agent_workday.action.duty_own`: the
   tree reader splits on dots, so a key's own dots become underscores. */
export const WORKDAY_TREE_MODULE = 'agent_workday';
export const WORKDAY_TREE_MODULE_LABEL = 'Agent workday';

export const workdayTreeLeaf = (key: WorkdayKey): string => key.replace(/\./g, '_');
export const workdayTreePath = (key: WorkdayKey): string =>
  `${WORKDAY_TREE_MODULE}.action.${workdayTreeLeaf(key)}`;

/* Tree path -> sentence, for the Roles screen's labels. */
export const WORKDAY_TREE_LABELS: Record<string, string> = Object.fromEntries(
  WORKDAY_KEYS.map((key) => [workdayTreePath(key), WORKDAY_SENTENCES[key]]),
);

/* The group as it appears in a company's plan tree - which it never does,
   because it is not a plan feature: everybody has a workday. The Roles
   screens merge this in so the boxes can be ticked; the tree that is saved
   then carries `agent_workday.action.*` like any other module. */
export const workdayTreeGroup = (): Record<string, any> => ({
  IS_SHOW: true,
  action: Object.fromEntries(WORKDAY_KEYS.map((key) => [workdayTreeLeaf(key), true])),
});

export const withWorkdayGroup = (planFeatures: unknown): Record<string, any> => {
  const base =
    planFeatures && typeof planFeatures === 'object' && !Array.isArray(planFeatures)
      ? (planFeatures as Record<string, any>)
      : {};
  return { ...base, [WORKDAY_TREE_MODULE]: workdayTreeGroup() };
};

/* The boolean at a tree path, or undefined when the tree does not reach one.
   `1`/`0` and "true"/"false" count, because JSON that has been through
   MySQL and back has arrived in those shapes before. */
export const readTreeBox = (tree: unknown, path: string): boolean | undefined => {
  let node: any = tree;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) return undefined;
    node = node[part];
  }
  if (typeof node === 'boolean') return node;
  if (node === 1 || node === '1' || node === 'true') return true;
  if (node === 0 || node === '0' || node === 'false') return false;
  return undefined;
};

/* ---- The decision ------------------------------------------------------- */

export type WorkdayDecision =
  | { ok: true; reason: 'owner' | 'default' | 'tree' }
  | { ok: false; reason: 'default' | 'tree' | 'locked' | 'policy'; message: string };

export const WORKDAY_REFUSALS = {
  default: 'Your role does not allow this.',
  tree: 'Your role does not allow this.',
  locked: 'Your supervisor sets your status.',
  policy: 'The company has not turned this on for supervisors. The switch is under Company › Duty policy.',
} as const;

export interface ResolveWorkdayInput {
  role: unknown;
  key: WorkdayKey;
  tree?: boolean | undefined;
  lockOwnStatus?: boolean;
  /* duty_policy.supervisor_may_change_duty. Undefined reads as off: the
     switch is off by default, and a control must not appear on a guess. */
  supervisorMayChangeDuty?: boolean;
}

/* In order: the owner passes everything; the lock refuses an agent's own
   duty; the company switch refuses a supervisor's hand on other people's
   duty; an explicit tree box decides; else the role's column. */
export const resolveWorkdayPermission = (input: ResolveWorkdayInput): WorkdayDecision => {
  const column = workdayColumnForRole(input.role);
  if (column === 'ADMIN') return { ok: true, reason: 'owner' };
  if (input.key === 'duty.own' && column === 'AGENT' && input.lockOwnStatus) {
    return { ok: false, reason: 'locked', message: WORKDAY_REFUSALS.locked };
  }
  if (input.key === 'duty.others' && isSupervisorRole(input.role) && !input.supervisorMayChangeDuty) {
    return { ok: false, reason: 'policy', message: WORKDAY_REFUSALS.policy };
  }
  if (typeof input.tree === 'boolean') {
    return input.tree
      ? { ok: true, reason: 'tree' }
      : { ok: false, reason: 'tree', message: WORKDAY_REFUSALS.tree };
  }
  return WORKDAY_DEFAULTS[input.key][column]
    ? { ok: true, reason: 'default' }
    : { ok: false, reason: 'default', message: WORKDAY_REFUSALS.default };
};

/* ---- The signed-in person ----------------------------------------------- */

/* What `useUser()` hands back: `user.user_info` carries the role string and,
   for a custom role, its tree. The order the tree is read in is the one
   hooks/rbac.tsx uses, so a screen and a guard cannot disagree. */
export interface WorkdayUserLike {
  user_info?: {
    role?: string | null;
    custom_role_data?: { permission?: unknown } | null;
    role_data?: { permission?: unknown } | null;
    permission?: unknown;
  } | null;
}

export const workdayTreeOf = (user: WorkdayUserLike | null | undefined): Record<string, any> => {
  const info = user?.user_info;
  const raw = info?.custom_role_data?.permission ?? info?.role_data?.permission ?? info?.permission;
  return extractPlanFeatures(raw);
};

export interface CanOptions {
  /* duty_policy.lock_own_status, when the caller has read it. */
  lockOwnStatus?: boolean;
  /* duty_policy.supervisor_may_change_duty, when the caller has read it.
     hooks/use-agent-duty.ts passes both from the one policy it loads. */
  supervisorMayChangeDuty?: boolean;
}

export const decideFor = (
  user: WorkdayUserLike | null | undefined,
  key: WorkdayKey,
  options: CanOptions = {},
): WorkdayDecision =>
  resolveWorkdayPermission({
    role: user?.user_info?.role,
    key,
    tree: readTreeBox(workdayTreeOf(user), workdayTreePath(key)),
    lockOwnStatus: options.lockOwnStatus,
    supervisorMayChangeDuty: options.supervisorMayChangeDuty,
  });

/* "May this person do `key`?" - the one question every screen asks. */
export const can = (
  user: WorkdayUserLike | null | undefined,
  key: WorkdayKey,
  options: CanOptions = {},
): boolean => decideFor(user, key, options).ok;

/* ---- The company lock: section `duty_policy` ---------------------------- */

export const DUTY_POLICY_SECTION = 'duty_policy';

export interface DutyPolicy {
  schema_version: 1;
  /* True = agents may NOT change their own duty; somebody else sets it. */
  lock_own_status: boolean;
  /* True = a SUPERVISOR may set On duty, Off duty or a break for the people
     in their groups. Off by default; admins are never gated by it. */
  supervisor_may_change_duty: boolean;
}

export const DEFAULT_DUTY_POLICY: DutyPolicy = {
  schema_version: 1,
  lock_own_status: false,
  supervisor_may_change_duty: false,
};

const asFlag = (value: unknown): boolean =>
  value === true || value === 1 || value === '1' || value === 'true';

/* A policy saved before the second switch existed has no
   supervisor_may_change_duty; it reads as off, which is the default. */
export const normaliseDutyPolicy = (raw: unknown): DutyPolicy => {
  const source = raw && typeof raw === 'object' ? (raw as any) : {};
  return {
    schema_version: 1,
    lock_own_status: asFlag(source.lock_own_status),
    supervisor_may_change_duty: asFlag(source.supervisor_may_change_duty),
  };
};

/* The sentence the read-only chip shows an agent under the lock. */
export const LOCKED_SENTENCE = WORKDAY_REFUSALS.locked;
