/* Admin scope — who an administrator is allowed to administer.
 *
 * A role answers "what can this person do": edit a user, buy a number, listen
 * to a recording. It does not answer the second question every company with
 * more than one location asks: to whom? Until scope existed the answer was
 * "everybody": the admin of one location could edit somebody at another.
 *
 * THE RULE (decided by the product owner, 3 Sep 2026: the industry-standard shape)
 *
 * Reach is derived from the role. A stored scope only narrows it or, for a
 * location admin, explicitly widens it. Nothing stored does NOT mean "everybody":
 *
 *   Account owner (ADMIN)      the whole company, always. Not scopable.
 *   Location admin (MANAGER,   the stored location list, or a stored "company"
 *     and custom roles under it) (a regional / whole-company admin, set by the
 *                              owner). Nothing stored: their own location
 *                              (users.site_uuid). No location: reaches nobody.
 *   Group admin (SUB-ADMIN,    always groups: the stored group list or, with
 *     and custom roles under it) nothing valid stored, the groups they MANAGE
 *                              (the group's manager). None: reaches nobody.
 *   Supervisor (SUPERVISOR)    not an administrator. Always groups, and never
 *                              stored: the groups they are a MEMBER of. In no
 *                              group: reaches nobody. Reach here means "may
 *                              see and help": a supervisor edits nobody's
 *                              record and changes duty only when the company
 *                              switch (duty_policy.supervisor_may_change_duty)
 *                              is on.
 *
 * The stored part lives on the person's own record:
 *
 *   users.settings.admin_scope = { level, location_uuids, group_uuids }
 *
 * The server owns the rules (default-api helpers/adminScope.ts): it decides who
 * may set a scope and, on every request that acts on a person, whether that
 * person is inside the caller's EFFECTIVE scope. Its list endpoint returns, per
 * person, the stored scope plus `effective_scope`, `scope_source`
 * ('stored' | 'role-default') and `managed_group_uuids`. An older server sends
 * only the stored scope, so `effectiveScope` below mirrors the same rule for the
 * browser to fall back on — the screen then still refuses what the server would
 * refuse instead of letting somebody find out from a 403.
 */

export type ScopeLevel = 'company' | 'location' | 'group';

export interface AdminScope {
  level: ScopeLevel;
  location_uuids: string[];
  group_uuids: string[];
}

export type SystemRole = 'ADMIN' | 'MANAGER' | 'SUB-ADMIN' | 'SUPERVISOR' | 'AGENT' | null;

/** Where the effective scope came from, as the server names it. */
export type ScopeSource = 'stored' | 'role-default';

/**
 * The finer reading of a role-default, for the sentence on screen:
 *   owner           the account owner: whole company, always
 *   own-location    a location admin with nothing stored: their own location
 *   managed-groups  a group admin with nothing stored: the groups they run
 *   member-groups   a supervisor: the groups they belong to (never stored)
 *   none            nothing to derive from: reaches nobody
 *   stored          written down on the record by the owner / an account admin
 */
export type ScopeOrigin = 'stored' | 'owner' | 'own-location' | 'managed-groups' | 'member-groups' | 'none';

export interface EffectiveScope {
  role: SystemRole;
  scope: AdminScope;
  source: ScopeSource;
  origin: ScopeOrigin;
}

/** One row of POST /api/person/scope. The last three fields arrive from newer servers only. */
export interface ScopeRow {
  uuid: string;
  system_role: SystemRole;
  admin_scope: AdminScope | null;
  effective_scope?: AdminScope | null;
  scope_source?: ScopeSource | null;
  managed_group_uuids?: string[] | null;
  /** Groups the person belongs to; a supervisor's reach. Newer servers only. */
  member_group_uuids?: string[] | null;
}

export interface LevelInfo {
  level: ScopeLevel;
  label: string;
  /** One sentence an administrator can read and act on. */
  description: string;
}

export const LEVELS: LevelInfo[] = [
  {
    level: 'company',
    label: 'Whole company',
    description:
      'Every location, every group and every person. For a regional or whole-company admin; only the account owner can grant it.',
  },
  {
    level: 'location',
    label: 'Chosen locations',
    description:
      'The people at the locations you pick. One location for a location admin, several for somebody who covers a region. Nothing saved means their own location.',
  },
  {
    level: 'group',
    label: 'Chosen groups',
    description:
      'The members of the groups you pick, wherever those people sit. Nothing saved means the groups they run as manager.',
  },
];

const levelInfo = (level: ScopeLevel): LevelInfo => LEVELS.find((item) => item.level === level)!;

/**
 * The levels a role may be given, in the order they are offered. A group admin
 * is always about groups; a location admin is about a location, or the whole
 * company when the owner says so. The owner is not scopable at all, and neither
 * is a supervisor: their reach is the groups they belong to, so there is no
 * dialog — change the group's members instead.
 */
export const levelsFor = (role: SystemRole): LevelInfo[] => {
  if (role === 'MANAGER') return [levelInfo('location'), levelInfo('company')];
  if (role === 'SUB-ADMIN') return [levelInfo('group')];
  return [];
};

export const isAdminRole = (role: SystemRole): boolean =>
  role === 'ADMIN' || role === 'MANAGER' || role === 'SUB-ADMIN';

/** Roles that have a reach at all: the administrators, plus the supervisor,
    who administers nobody but sees and helps the people in their groups. */
export const hasReach = (role: SystemRole): boolean => isAdminRole(role) || role === 'SUPERVISOR';

const cleanList = (list: unknown): string[] => {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  list.forEach((item) => {
    const value = typeof item === 'string' ? item.trim() : '';
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
};

export const isLevel = (value: unknown): value is ScopeLevel =>
  value === 'company' || value === 'location' || value === 'group';

/** A stored scope -> a scope, or null when there is none written down. */
export const normaliseScope = (raw: unknown): AdminScope | null => {
  const source = (raw && typeof raw === 'object' ? raw : null) as Record<string, unknown> | null;
  if (!source || !isLevel(source.level)) return null;
  return {
    level: source.level,
    location_uuids: source.level === 'location' ? cleanList(source.location_uuids) : [],
    group_uuids: source.level === 'group' ? cleanList(source.group_uuids) : [],
  };
};

/** True for an EFFECTIVE scope that reaches everybody. Never pass a stored scope
    here to mean "nothing stored": under the rule above, nothing stored is not
    company-wide. */
export const companyWide = (scope: AdminScope | null | undefined): boolean =>
  !scope || scope.level === 'company';

export const blankScope = (): AdminScope => ({ level: 'company', location_uuids: [], group_uuids: [] });

const scopeOf = (level: ScopeLevel, uuids: string[] = []): AdminScope => ({
  level,
  location_uuids: level === 'location' ? uuids : [],
  group_uuids: level === 'group' ? uuids : [],
});

export interface EffectiveInput {
  role: SystemRole;
  stored: AdminScope | null | undefined;
  /** users.site_uuid — the location the person themselves is at. */
  site_uuid?: string | null;
  /** Groups whose manager this person is. */
  managed_group_uuids?: string[] | null;
  /** Groups this person is a member of. Only a supervisor's reach reads it. */
  member_group_uuids?: string[] | null;
}

/**
 * The rule from the top of this file, as code. Null means scope does not apply
 * (not an administrator, not a supervisor). Never returns "nobody" as null: a
 * reach of nobody is a real answer (an empty list at the role's level) and the
 * screen must say so.
 *
 * WHY the stored scope is not simply trusted: the old dialog offered every level
 * to every admin, and an empty list or a level that makes no sense for the role
 * (a "company" scope on a group admin) would otherwise either widen somebody
 * silently or show one thing while the server enforces another. So: a stored
 * scope counts only where it narrows, plus the one explicit widening the owner
 * may grant (company, for a location admin). A stored group list on a location
 * admin is honoured too — it narrows, so it is safe.
 */
export const effectiveScope = ({
  role,
  stored,
  site_uuid,
  managed_group_uuids,
  member_group_uuids,
}: EffectiveInput): EffectiveScope | null => {
  if (role === 'ADMIN') {
    return { role, scope: scopeOf('company'), source: 'role-default', origin: 'owner' };
  }

  if (role === 'MANAGER') {
    if (stored?.level === 'company') return { role, scope: stored, source: 'stored', origin: 'stored' };
    if (stored?.level === 'location' && stored.location_uuids.length > 0) {
      return { role, scope: stored, source: 'stored', origin: 'stored' };
    }
    if (stored?.level === 'group' && stored.group_uuids.length > 0) {
      return { role, scope: stored, source: 'stored', origin: 'stored' };
    }
    const own = String(site_uuid || '').trim();
    return own
      ? { role, scope: scopeOf('location', [own]), source: 'role-default', origin: 'own-location' }
      : { role, scope: scopeOf('location'), source: 'role-default', origin: 'none' };
  }

  if (role === 'SUB-ADMIN') {
    if (stored?.level === 'group' && stored.group_uuids.length > 0) {
      return { role, scope: stored, source: 'stored', origin: 'stored' };
    }
    const managed = cleanList(managed_group_uuids);
    return managed.length > 0
      ? { role, scope: scopeOf('group', managed), source: 'role-default', origin: 'managed-groups' }
      : { role, scope: scopeOf('group'), source: 'role-default', origin: 'none' };
  }

  /* A supervisor's reach is never stored: whatever a stored scope says, they
     reach the groups they belong to. Membership is the one thing a group
     admin changes that also moves a supervisor's reach, and that is the point. */
  if (role === 'SUPERVISOR') {
    const member = cleanList(member_group_uuids);
    return member.length > 0
      ? { role, scope: scopeOf('group', member), source: 'role-default', origin: 'member-groups' }
      : { role, scope: scopeOf('group'), source: 'role-default', origin: 'none' };
  }

  return null;
};

/** The origin a server-resolved scope must have had, given role and source. */
const originOf = (role: SystemRole, scope: AdminScope, source: ScopeSource): ScopeOrigin => {
  if (role === 'SUPERVISOR') return scope.group_uuids.length > 0 ? 'member-groups' : 'none';
  if (source === 'stored') return 'stored';
  if (role === 'ADMIN') return 'owner';
  if (scope.level === 'company') return 'stored';
  if (role === 'MANAGER') return scope.location_uuids.length > 0 ? 'own-location' : 'none';
  return scope.group_uuids.length > 0 ? 'managed-groups' : 'none';
};

export interface DeriveInput {
  site_uuid?: string | null;
  managed_group_uuids?: string[] | null;
  member_group_uuids?: string[] | null;
}

/**
 * The effective scope of one list row. A newer server has already applied the
 * rule and says so (`effective_scope` + `scope_source`); that answer wins,
 * because it is the one enforced. An older server sends only the stored scope,
 * and the browser derives the rest from what it knows: the person's own
 * location, the groups they manage and the groups they belong to.
 */
export const effectiveScopeOfRow = (row: ScopeRow, derive: DeriveInput = {}): EffectiveScope | null => {
  const role = row.system_role;
  if (!hasReach(role)) return null;
  const server = row.effective_scope ? normaliseScope(row.effective_scope) : null;
  const source =
    row.scope_source === 'stored' || row.scope_source === 'role-default' ? row.scope_source : null;
  if (server && source) {
    return { role, scope: server, source, origin: originOf(role, server, source) };
  }
  return effectiveScope({
    role,
    stored: row.admin_scope,
    site_uuid: derive.site_uuid,
    managed_group_uuids: Array.isArray(row.managed_group_uuids)
      ? row.managed_group_uuids
      : derive.managed_group_uuids,
    member_group_uuids: Array.isArray(row.member_group_uuids)
      ? row.member_group_uuids
      : derive.member_group_uuids,
  });
};

/** A group as the department list returns it: `manager` is a JSON blob or object
    carrying `user_uuid` (newer rows) and `value` = the manager's extension;
    `members` is a JSON blob or array of the same shape, one entry per member. */
export interface GroupRecord {
  uuid: string;
  manager?: unknown;
  members?: unknown;
}

const parseManager = (raw: unknown): Record<string, unknown> | null => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const parseMemberList = (raw: unknown): Record<string, unknown>[] => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      : [];
  } catch {
    return [];
  }
};

/* One member or manager entry names its person by uuid (`user_uuid`, or `uuid`
   on some rows) and by extension (`value`, or `extension`). The uuid wins when
   the row has one; the extension is the fallback for rows saved before it. */
const entryIsPerson = (
  entry: Record<string, unknown>,
  person: { uuid: string; extension: string },
): boolean => {
  const entryUuid = String(entry.user_uuid || entry.uuid || '').trim();
  if (entryUuid) return Boolean(person.uuid) && entryUuid === person.uuid;
  const entryExtension = String(entry.value || entry.extension || '').trim();
  return Boolean(person.extension) && entryExtension === person.extension;
};

/**
 * The groups a person belongs to, from the department list — a supervisor's
 * reach. Read the same way as the manager: by user_uuid first, extension as
 * the fallback.
 */
export const memberGroupUuids = (
  person: { uuid: string; extension?: string | null },
  groups: GroupRecord[],
): string[] => {
  const uuid = String(person.uuid || '').trim();
  const extension = String(person.extension || '').trim();
  if (!uuid && !extension) return [];
  return cleanList(
    (Array.isArray(groups) ? groups : [])
      .filter((group) =>
        parseMemberList(group?.members).some((member) => entryIsPerson(member, { uuid, extension })),
      )
      .map((group) => String(group?.uuid || '')),
  );
};

/**
 * The groups a person manages, from the department list. Matched on the
 * manager's user_uuid; older rows saved before that field existed carry only
 * the manager's extension, so the extension is the fallback.
 */
export const managedGroupUuids = (
  person: { uuid: string; extension?: string | null },
  groups: GroupRecord[],
): string[] => {
  const uuid = String(person.uuid || '').trim();
  const extension = String(person.extension || '').trim();
  if (!uuid && !extension) return [];
  return cleanList(
    (Array.isArray(groups) ? groups : [])
      .filter((group) => {
        const manager = parseManager(group?.manager);
        if (!manager) return false;
        const managerUuid = String(manager.user_uuid || '').trim();
        if (managerUuid) return Boolean(uuid) && managerUuid === uuid;
        return Boolean(extension) && String(manager.value || '').trim() === extension;
      })
      .map((group) => String(group?.uuid || '')),
  );
};

export interface Directory {
  locations: { uuid: string; name?: string }[];
  groups: { uuid: string; name?: string }[];
}

const nameIn = (list: { uuid: string; name?: string }[], uuid: string): string =>
  list.find((item) => item.uuid === uuid)?.name || 'a deleted entry';

const namesOf = (scope: AdminScope, directory: Directory): string[] => {
  const uuids = scope.level === 'location' ? scope.location_uuids : scope.group_uuids;
  const list = scope.level === 'location' ? directory.locations : directory.groups;
  return uuids.map((uuid) => nameIn(list, uuid));
};

/**
 * The short form for the People list, after the role name: "Mumbai",
 * "Sales, Support", "Delhi +2", "no groups yet", "whole company". Empty when
 * scope does not apply, and for the owner — the role name already says it.
 */
export const scopeSuffix = (effective: EffectiveScope | null | undefined, directory: Directory): string => {
  if (!effective) return '';
  if (effective.origin === 'owner') return '';
  if (effective.scope.level === 'company') return 'whole company';
  const names = namesOf(effective.scope, directory);
  if (names.length === 0) return effective.scope.level === 'location' ? 'no location yet' : 'no groups yet';
  if (names.length <= 2) return names.join(', ');
  return `${names[0]} +${names.length - 1}`;
};

/** The long form for the scope screen, saying where a default came from. */
export const describeScope = (effective: EffectiveScope | null | undefined, directory: Directory): string => {
  if (!effective) return 'Scope does not apply';
  const { scope, origin } = effective;
  if (origin === 'owner') return 'Whole company (account owner)';
  if (scope.level === 'company') return 'Whole company (set by the owner)';

  const names = namesOf(scope, directory);
  if (origin === 'own-location') return `Their location: ${names.join(', ')}`;
  if (origin === 'managed-groups') return `Their groups (as manager): ${names.join(', ')}`;
  if (origin === 'member-groups') return `Their groups: ${names.join(', ')}`;
  if (effective.role === 'SUPERVISOR') return 'In no group yet — reaches nobody';
  if (origin === 'none' || names.length === 0) {
    return scope.level === 'location' ? 'No location yet — reaches nobody' : 'Runs no group yet — reaches nobody';
  }
  const what = scope.level === 'location' ? 'Location' : 'Group';
  return `${names.length === 1 ? what : `${what}s`}: ${names.join(', ')}`;
};

export interface ScopeProblem {
  field: 'level' | 'locations' | 'groups';
  message: string;
  /** A blocking problem means the scope cannot be saved as it stands. */
  blocking: boolean;
}

/** Everything wrong with a scope, in the order somebody would fix it. */
export const checkScope = (scope: AdminScope, directory: Directory): ScopeProblem[] => {
  const problems: ScopeProblem[] = [];

  if (scope.level === 'location') {
    if (scope.location_uuids.length === 0) {
      problems.push({
        field: 'locations',
        message: 'Pick at least one location, or this admin covers nobody at all.',
        blocking: true,
      });
    }
    const known = new Set(directory.locations.map((item) => item.uuid));
    scope.location_uuids
      .filter((uuid) => !known.has(uuid))
      .forEach((uuid) =>
        problems.push({
          field: 'locations',
          message: `A location on this list no longer exists (${uuid}). Remove it.`,
          blocking: true,
        }),
      );
    if (directory.locations.length > 0 && scope.location_uuids.length === directory.locations.length) {
      problems.push({
        field: 'level',
        message:
          'This covers every location you have, which is the same as the whole company. Choose "Whole company" so it stays true when you open the next location.',
        blocking: false,
      });
    }
  }

  if (scope.level === 'group') {
    if (scope.group_uuids.length === 0) {
      problems.push({
        field: 'groups',
        message: 'Pick at least one group, or this admin covers nobody at all.',
        blocking: true,
      });
    }
    const known = new Set(directory.groups.map((item) => item.uuid));
    scope.group_uuids
      .filter((uuid) => !known.has(uuid))
      .forEach((uuid) =>
        problems.push({
          field: 'groups',
          message: `A group on this list no longer exists (${uuid}). Remove it.`,
          blocking: true,
        }),
      );
  }

  return problems;
};

export const isScopeSaveable = (problems: ScopeProblem[]): boolean =>
  !problems.some((problem) => problem.blocking);

export interface Decision {
  allowed: boolean;
  /** A sentence that can be shown to the administrator as it is. */
  reason: string;
}

export interface ScopeActor {
  uuid: string;
  role: SystemRole;
  /** The actor's EFFECTIVE scope (see `effectiveScope`), not the stored one. */
  scope: AdminScope | null;
}

/**
 * May `me` set `them`'s scope? The same rules as the server, in the same order:
 * only the owner or an account admin; never yourself; not while you are scoped
 * yourself; never the owner; only the owner for an account admin; admins only.
 *
 * "Scoped yourself" is read off the effective scope: a location admin with
 * nothing stored reaches only their own location, so they cannot hand out
 * scopes either — only one the owner has widened to the whole company can.
 */
export const canSetScope = (me: ScopeActor, them: ScopeActor): Decision => {
  if (!me.role) {
    return { allowed: false, reason: 'Your role could not be determined.' };
  }
  if (me.uuid === them.uuid) {
    return { allowed: false, reason: 'You cannot change your own scope. Ask the account owner.' };
  }
  if (me.role !== 'ADMIN' && me.role !== 'MANAGER') {
    return { allowed: false, reason: 'Only the account owner or an account admin can set scopes.' };
  }
  if (me.role !== 'ADMIN' && !companyWide(me.scope)) {
    return {
      allowed: false,
      reason: 'Only an administrator over the whole company can set scopes.',
    };
  }
  if (them.role === 'ADMIN') {
    return { allowed: false, reason: 'The account owner always covers the whole company.' };
  }
  if (them.role === 'SUPERVISOR') {
    return { allowed: false, reason: SUPERVISOR_REACH_REASON };
  }
  if (them.role === 'MANAGER' && me.role !== 'ADMIN') {
    return { allowed: false, reason: "Only the account owner can change an account admin's scope." };
  }
  if (them.role !== 'MANAGER' && them.role !== 'SUB-ADMIN') {
    return { allowed: false, reason: 'Scope applies to administrators only.' };
  }
  return { allowed: true, reason: '' };
};

export interface Person {
  uuid: string;
  name?: string;
  extension?: string | null;
  locationUuid?: string | null;
  groupUuids?: string[];
  /** Groups this person is the manager of. */
  managedGroupUuids?: string[];
}

export interface Reach {
  people: number;
  /** People whose location or group the platform does not report. */
  unplaced: number;
  totalPeople: number;
}

/** Where one person sits, which is all a scope needs to know about them. */
export interface Target {
  locationUuid?: string | null;
  groupUuids?: string[];
}

/** Is this person inside the scope? The same test the server runs per request. */
export const inReach = (scope: AdminScope, target: Target): boolean => {
  if (scope.level === 'company') return true;
  if (scope.level === 'location') {
    return Boolean(target.locationUuid) && scope.location_uuids.includes(String(target.locationUuid));
  }
  const covered = new Set(scope.group_uuids);
  return (target.groupUuids || []).some((uuid) => covered.has(uuid));
};

/** How many people a scope actually reaches, counted from real records. */
export const reachOf = (scope: AdminScope, people: Person[]): Reach => {
  const list = Array.isArray(people) ? people : [];
  if (scope.level === 'company') return { people: list.length, unplaced: 0, totalPeople: list.length };
  const unplaced =
    scope.level === 'location'
      ? list.filter((person) => !person.locationUuid).length
      : list.filter((person) => !(person.groupUuids || []).length).length;
  const reached = list.filter((person) => inReach(scope, person)).length;
  return { people: reached, unplaced, totalPeople: list.length };
};

/* The two sentences a greyed-out button on the People list carries. Written
   once so the tooltip and any refusal the server sends read the same. */
export const OUTSIDE_SCOPE_REASON =
  'Outside your scope. A location admin reaches their location; a group admin reaches the groups they run.';
export const GROUP_ADMIN_IDENTITY_REASON =
  'A group admin changes duty, skills and group membership. Changing who a person is, their role, or removing them needs a location admin or the account owner.';
/* A supervisor's reach is for seeing and helping, not administering: every
   Edit and identity action is refused, inside their groups or out. */
export const SUPERVISOR_REASON =
  "A supervisor watches and helps the people in their groups. Changing a person's settings needs a group or location admin.";
/* Why the Admin scope screen offers no Change button on a supervisor. */
export const SUPERVISOR_REACH_REASON = "A supervisor's reach is the groups they belong to.";

export interface RowLocks {
  /** Why Edit is refused, or null when it is allowed. */
  edit: string | null;
  /** Why Remove / Change role / Suspend / Reactivate are refused, or null. */
  identity: string | null;
}

const NO_LOCKS: RowLocks = { edit: null, identity: null };

/**
 * Which actions on `target` the server will refuse for `me`, so the People
 * list greys them out with the reason instead of returning a 403.
 *
 *   me unknown / not an admin    nothing here — the permission tree decides
 *   whole company                never limited (the owner, or an admin the
 *                                owner widened)
 *   target outside the scope     every action on the person is refused
 *   a group admin, inside        Edit is theirs (duty, skills, membership);
 *                                who the person is, their role and removing
 *                                them are not
 *   a supervisor                 nothing on anyone: they see and help, and
 *                                change duty only where the company allows
 */
export const locksFor = (me: EffectiveScope | null | undefined, target: Target): RowLocks => {
  if (!me) return NO_LOCKS;
  if (me.role === 'SUPERVISOR') return { edit: SUPERVISOR_REASON, identity: SUPERVISOR_REASON };
  if (me.scope.level === 'company') return NO_LOCKS;
  if (!inReach(me.scope, target)) return { edit: OUTSIDE_SCOPE_REASON, identity: OUTSIDE_SCOPE_REASON };
  if (me.role === 'SUB-ADMIN') return { edit: null, identity: GROUP_ADMIN_IDENTITY_REASON };
  return NO_LOCKS;
};
