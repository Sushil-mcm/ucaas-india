import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDepartmentList, getPersonScopes, getPersonStates, getUserList } from '@/services/api';
import {
  effectiveScope,
  effectiveScopeOfRow,
  managedGroupUuids,
  memberGroupUuids,
  normaliseScope,
  scopeSuffix,
  type EffectiveScope,
  type ScopeRow,
  type SystemRole,
} from '@/lib/admin-scope';
import { useGetSite } from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useLiveContactCentre, CONFIG_REFRESH_MS, KPI_REFRESH_MS } from '@/hooks/use-live-contact-centre';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import { getAgentLiveState } from '@/pages/performance/agent-rows';
import { roleDisplayName } from '@/pages/admin-settings/roles/role-names';
import { useMembersSkills } from '@/hooks/use-queue-skills';
import { fetchAllPages } from '@/lib/fetch-all-pages';

/**
 * The organisation roster, as the console's People page reads it.
 *
 * The platform stores the pieces separately — the user list, department
 * membership, queue membership and live presence all arrive from different
 * places — so this assembles one row per person from all four. Presence reuses
 * `getAgentLiveState` from Performance rather than re-deriving it, so a person
 * cannot show as Available here and On Call there.
 *
 * Location comes from the site a user is assigned to (`site.name`), which is
 * what the platform calls the same thing.
 *
 * TWO WAYS TO READ IT
 *
 * People (the list page) reads one page at a time — `POST /api/user/list` has
 * always taken `page`/`limit`/`search` and returned `total`/`totalPages`, and
 * asking for one page of 50 is what every other list in the product does. The
 * old single request for 500 rows silently cut off any company bigger than
 * that, and the export button then called the cut-off list "everybody".
 *
 * Favourites and Locations still need the whole roster in one go (to find the
 * pinned people, and to count heads per location), so calling the hook with no
 * query keeps the old single-request shape. That request is still capped at
 * ROSTER_LIMIT; the cap is now written down here rather than hidden.
 */

export type PresenceTone = 'good' | 'busy' | 'warn' | 'idle';

/**
 * What a person's account is, as distinct from their live presence.
 *
 *   PENDING    invited, has not signed in yet
 *   ACTIVE     normal
 *   SUSPENDED  an administrator switched them off: signed out everywhere and
 *              cannot sign in. The phone follows once the switch update is applied.
 *   REMOVED    removed, restorable for 72 hours (the Removed tab)
 *
 * `/api/user/list` does not carry the stored status, so the states come from
 * one extra request (`POST /api/person/state`) and are joined here by uuid.
 * A person the states request does not know is `null`, never assumed Active.
 */
export type PersonState = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

/** How each state reads on screen, and the honest note behind it. */
export const PERSON_STATE_LABEL: Record<PersonState, { label: string; tone: PresenceTone; note: string }> = {
  PENDING: {
    label: 'Invited',
    tone: 'warn',
    note: 'Has not accepted the invite yet. Roles can be changed once they have signed in.',
  },
  ACTIVE: { label: 'Active', tone: 'good', note: 'Can sign in and use their phone.' },
  SUSPENDED: {
    label: 'Suspended',
    tone: 'busy',
    note: 'Login blocked and the phone is blocked: it cannot register, and calls to their extension go to voicemail or the closed-hours destination of the number.',
  },
  REMOVED: { label: 'Removed', tone: 'idle', note: 'Removed. Can be restored for 72 hours.' },
};

/** The states the Status filter offers, in the order they are listed. Removed
    people have their own tab, so that state is not a filter here. */
export const STATUS_FILTER_STATES: PersonState[] = ['ACTIVE', 'PENDING', 'SUSPENDED'];

/** "Any", then the same labels the pill shows — one map, so the filter and the
    pill can never disagree about what a state is called. */
export const STATUS_FILTER_OPTIONS: string[] = [
  'Any',
  ...STATUS_FILTER_STATES.map((state) => PERSON_STATE_LABEL[state].label),
];

/** The state behind a filter label, or null for "Any". */
export const stateOfStatusFilter = (label: string): PersonState | null =>
  STATUS_FILTER_STATES.find((state) => PERSON_STATE_LABEL[state].label === label) ?? null;

/**
 * A skill a person has been rated on, from the Skills feature
 * (`POST /api/campaign/skills/users/get`, the same rows the drawer's Skills
 * tab and the queue member list read).
 */
export type PersonSkill = {
  id: string;
  name: string;
  stars: number;
};

/** The rating scale the Skills feature uses: one to five stars. The star
    control defaults to five and the queue rules clamp every rating to 1–5;
    there is no separate named constant for it in the feature, so it is
    written down once here for the roster. */
export const SKILL_STARS_MAX = 5;

export type PersonRow = {
  uuid: string;
  name: string;
  initials: string;
  image?: string;
  email: string;
  /** The stored role name — an authorisation key, never shown as is. */
  role: string;
  /** The role as a person should read it: "Location admin", not "MANAGER". */
  roleLabel: string;
  /** Who the role actually reaches — the EFFECTIVE scope, derived from the
      role when nothing is stored: "Mumbai", "Sales, Support", "no groups yet".
      Empty for the owner and for everybody who is not an administrator. */
  scopeSuffix: string;
  department: string;
  /** Where the person sits, for the caller's reach check: their location's
      uuid and the uuids of the groups they belong to. */
  locationUuid: string;
  groupUuids: string[];
  extension: string;
  /** The site's name — in most tenants this reads like a company name. */
  location: string;
  /** "City, Country" for that site, so the location reads as a place. */
  locationPlace: string;
  jobTitle: string;
  phone: string;
  /** Outbound number assigned to the user; blank until one is assigned. */
  callerId: string;
  /** The queues whose member list has this person. */
  queues: string[];
  /** Rated skills from the Skills feature, best first. Empty until the
      skills request has answered, or when nobody has rated them. */
  skills: PersonSkill[];
  /** Live state from the socket — On Call, Offline, Available… */
  presence: string;
  /** The availability stored against the person, which an admin can change. */
  availability: string;
  tone: PresenceTone;
  /** Pending / Active / Suspended. Null until the states request has answered. */
  state: PersonState | null;
  /** The untouched user record, for surfaces that expect the platform shape. */
  raw: any;
};

/** One page of the list, as the People page asks for it. */
export type PeopleQuery = {
  page: number;
  limit: number;
  /** Matched by the server against name, e-mail and extension. */
  search?: string;
  /** A location name; the server matches the site's name. 'All' means no filter. */
  location?: string;
  /**
   * Load every page instead of one.
   *
   * Groups, Presence and Status cannot be filtered by the server: presence is
   * live socket state that was never in the database, and neither groups nor
   * the invited/suspended state are columns on the users table — the list
   * endpoint turns any other filter key into `WHERE <key> LIKE %value%`, so
   * asking it for them would be a SQL error rather than a filter.
   *
   * The honest way to make those filters mean the whole company is therefore
   * to have the whole company in hand. The screen asks for that only when it
   * needs it (a filter or a sort is on); the ordinary case still pages on the
   * server.
   */
  loadAll?: boolean;
};

/** The most the whole-roster shape will ever fetch. */
export const ROSTER_LIMIT = 500;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '—';

/** How each live state should read on the roster. */
const TONE: Record<string, PresenceTone> = {
  'On Call': 'busy',
  Ringing: 'warn',
  'On Hold': 'warn',
  Available: 'good',
  Busy: 'busy',
  'Do Not Disturb': 'busy',
  Offline: 'idle',
};

const parseMembers = (members: unknown): any[] => {
  try {
    const parsed = typeof members === 'string' ? JSON.parse((members as string) || '[]') : members;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** What is actually posted to /api/user/list for a given query. */
const listPayload = (query?: PeopleQuery) => {
  if (!query) return { page: 1, limit: ROSTER_LIMIT };
  const search = String(query.search || '').trim();
  const location = String(query.location || '').trim();
  return {
    page: Math.max(1, query.page || 1),
    limit: query.limit || 50,
    ...(search ? { search } : {}),
    ...(location && location !== 'All'
      ? { filter: [{ key: 'site_name', value: location }] }
      : {}),
  };
};

export const usePeopleRows = (query?: PeopleQuery) => {
  const today = useMemo(() => handleDate('Today'), []);
  const { queues, activeQueueCalls } = useLiveContactCentre(today);
  const { usersOnlineStatus } = useSocketEvents();

  const payload = useMemo(
    () => listPayload(query),
    [query?.page, query?.limit, query?.search, query?.location, query?.loadAll, Boolean(query)],
  );

  const loadAll = Boolean(query?.loadAll);

  const { data: page, isPending: isRosterLoading, isFetching } = useQuery({
    /* 'directoryPeople' stays the first key so the existing invalidations
       (remove person, change role, caller ID) still refresh every page. */
    queryKey: ['directoryPeople', payload, loadAll],
    queryFn: async () => {
      if (!loadAll) return getUserList(payload);
      /* Every page, in the shape one page comes back in, so nothing
         downstream has to know which of the two it is looking at. */
      const { page: _page, limit: _limit, ...rest } = payload as any;
      const rows = await fetchAllPages((params) => getUserList(params), rest);
      return { data: { data: { result: { rows, total: rows.length, totalPages: 1 } } } };
    },
    select: (res: any) => res?.data?.data?.result || {},
    /* ucaas.in: the roster is configuration, not a live KPI, so it polls on
       the slower CONFIG clock rather than the contact-centre one. */
    refetchInterval: CONFIG_REFRESH_MS,
    /* Keep the last page on screen while the next one loads, so paging does
       not flash an empty table. */
    placeholderData: keepPreviousData,
  });

  const roster: any[] = useMemo(() => (Array.isArray(page?.rows) ? page.rows : []), [page]);

  /* One request for every rated skill of everybody on this page, keyed by
     uuid. The same hook the queue member list uses, so a rating shows the
     same here as it does there. */
  const rosterUuids = useMemo(
    () => roster.map((person: any) => String(person?.uuid || '')).filter(Boolean),
    [roster],
  );
  const { byUser: skillsByUser } = useMembersSkills(rosterUuids);

  /* One request for every person's state, joined by uuid below. Refreshed on
     the same clock as the roster, and invalidated by suspend / reactivate /
     remove / restore. A failed request leaves every state null, and the
     screen then shows no pill rather than a wrong one. */
  const { data: stateByUuid } = useQuery({
    queryKey: ['directoryPersonStates'],
    queryFn: getPersonStates,
    select: (res: any) => {
      const map = new Map<string, PersonState>();
      const list = res?.data?.data?.result?.rows;
      (Array.isArray(list) ? list : []).forEach((row: any) => {
        const state = String(row?.state || '').toUpperCase() as PersonState;
        if (row?.uuid && state in PERSON_STATE_LABEL) map.set(String(row.uuid), state);
      });
      return map;
    },
    refetchInterval: KPI_REFRESH_MS,
    retry: false,
  });
  /* One request for every person's admin scope (POST /api/person/scope),
     joined by uuid below and shown as a suffix on the role. Every row is
     kept, not only the ones with a scope written down: under the rule in
     lib/admin-scope.ts a group admin with nothing stored still reaches
     something (the groups they run) or nobody, and the column must say which.
     A newer server sends the resolved answer (effective_scope, scope_source,
     managed_group_uuids); an older one only the stored scope, and the rest is
     derived below. A failed request leaves every suffix empty rather than wrong. */
  const { data: scopeByUuid } = useQuery({
    queryKey: ['directoryPersonScopes'],
    queryFn: getPersonScopes,
    select: (res: any) => {
      const map = new Map<string, ScopeRow>();
      const list = res?.data?.data?.result?.rows;
      (Array.isArray(list) ? list : []).forEach((row: any) => {
        if (!row?.uuid) return;
        map.set(String(row.uuid), {
          uuid: String(row.uuid),
          system_role: (row?.system_role || null) as SystemRole,
          admin_scope: normaliseScope(row?.admin_scope),
          effective_scope: normaliseScope(row?.effective_scope),
          scope_source: row?.scope_source ?? null,
          managed_group_uuids: Array.isArray(row?.managed_group_uuids) ? row.managed_group_uuids : null,
          member_group_uuids: Array.isArray(row?.member_group_uuids) ? row.member_group_uuids : null,
        });
      });
      return map;
    },
    retry: false,
  });
  const total = Number(page?.total);
  const totalPages = Number(page?.totalPages);

  /* Sites carry city/country; the user row only carries the site's name. Joining
     them lets the roster show where someone actually is, not just the label
     whoever created the site happened to type. */
  const { data: sites = [] } = useGetSite();

  const { data: departments = [] } = useQuery({
    /* Same key prefix the platform invalidates, so membership changes reach
       People's Groups column instead of sitting stale. */
    queryKey: ['getDepartmentList', 'directoryDepartments'],
    queryFn: () => getDepartmentList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  /** Names for the scope suffix: a scope holds ids, the column shows words. */
  const scopeDirectory = useMemo(
    () => ({
      locations: (sites as any[]).map((site) => ({ uuid: String(site?.uuid || ''), name: site?.name })),
      groups: departments.map((department: any) => ({
        uuid: String(department?.uuid || ''),
        name: department?.name,
      })),
    }),
    [sites, departments],
  );

  /** user uuid -> the departments they belong to: names for the column, uuids
      for the reach check. */
  const departmentByUser = useMemo(() => {
    const names = new Map<string, string[]>();
    const uuids = new Map<string, string[]>();
    departments.forEach((department: any) => {
      const departmentUuid = String(department?.uuid || '');
      parseMembers(department?.members).forEach((member: any) => {
        const key = String(member?.user_uuid || member?.uuid || '');
        if (!key) return;
        names.set(key, [...(names.get(key) || []), department?.name].filter(Boolean));
        if (departmentUuid) uuids.set(key, [...(uuids.get(key) || []), departmentUuid]);
      });
    });
    return { names, uuids };
  }, [departments]);

  /* The signed-in caller's own reach, for greying out what the server will
     refuse. The scope list is the first choice — the server has already
     resolved a custom role to its base role and, when it is new enough,
     applied the rule itself. Failing that (older server, or the list request
     failed), the sign-in record carries enough to derive it: the role, the
     stored scope, the person's own location, the groups they manage and (for
     a supervisor) the groups they belong to. A caller this cannot place gets
     no lock at all — the permission tree and the server still decide, as
     before. */
  const { user } = useUser();
  const myInfo: any = (user as any)?.user_info || {};
  const myUuid = String(myInfo?.uuid || '');
  const myScope: EffectiveScope | null = useMemo(() => {
    if (!myUuid) return null;
    const me = { uuid: myUuid, extension: myInfo?.extension };
    const derive = {
      site_uuid: myInfo?.site_uuid,
      managed_group_uuids: managedGroupUuids(me, departments),
      member_group_uuids: memberGroupUuids(me, departments),
    };
    const row = scopeByUuid?.get(myUuid);
    if (row) return effectiveScopeOfRow(row, derive);
    const rawRole = String(myInfo?.role || '')
      .trim()
      .toUpperCase()
      .replace(/[\s_]+/g, '-');
    const role: SystemRole =
      rawRole === 'ADMIN' ||
      rawRole === 'MANAGER' ||
      rawRole === 'SUB-ADMIN' ||
      rawRole === 'SUPERVISOR' ||
      rawRole === 'AGENT'
        ? rawRole
        : null;
    let settings: any = myInfo?.settings;
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch {
        settings = null;
      }
    }
    return effectiveScope({ role, stored: normaliseScope(settings?.admin_scope), ...derive });
  }, [myUuid, myInfo?.extension, myInfo?.site_uuid, myInfo?.role, myInfo?.settings, departments, scopeByUuid]);

  const rows: PersonRow[] = useMemo(
    () =>
      roster.map((person: any) => {
        const name = `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'Unknown';
        const extension = String(person?.extension || '');
        const keys = [person?.uuid, person?.user_uuid, extension].filter(Boolean).map(String);

        // The queues this person is a member of. Shown as Queues, not as
        // skills: the real skills come from the Skills feature below.
        const memberOfQueues = queues
          .filter((queue: any) => queue.memberKeys.some((key: string) => keys.includes(key)))
          .map((queue: any) => queue.name);

        const skills: PersonSkill[] = (skillsByUser[String(person?.uuid || '')] || [])
          .map((rated: any) => ({
            id: String(rated?.skill_id || ''),
            name: String(rated?.name || 'Skill'),
            stars: Number(rated?.stars) || 0,
          }))
          .filter((skill) => skill.id && skill.stars > 0)
          .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));

        const live = getAgentLiveState(extension, usersOnlineStatus, activeQueueCalls);
        const role = person?.custom_role_data?.name || person?.role_data?.name || person?.role || '';
        const personUuid = String(person?.uuid || '');
        const groupUuids = departmentByUser.uuids.get(personUuid) || [];

        /* The person's reach, if they are an administrator. Without a row from
           the scope list nothing is derived: a custom role's base role is only
           known to the server, and a guess would show a wrong reach. */
        const scopeRow = scopeByUuid?.get(personUuid);
        const reach = scopeRow
          ? effectiveScopeOfRow(scopeRow, {
              site_uuid: person?.site_uuid,
              managed_group_uuids: managedGroupUuids({ uuid: personUuid, extension }, departments),
              member_group_uuids: memberGroupUuids({ uuid: personUuid, extension }, departments),
            })
          : null;

        return {
          uuid: String(person?.uuid || extension || name),
          name,
          initials: initialsOf(name),
          image: person?.profile,
          email: person?.email || '',
          role: role || '—',
          roleLabel: role ? roleDisplayName(role) : '—',
          scopeSuffix: scopeSuffix(reach, scopeDirectory),
          department: (departmentByUser.names.get(personUuid) || []).join(', ') || '—',
          locationUuid: String(person?.site_uuid || ''),
          groupUuids,
          extension,
          location: person?.site?.name || '—',
          locationPlace:
            (() => {
              const site = sites.find(
                (entry: any) =>
                  entry?.uuid === person?.site_uuid || entry?.name === person?.site?.name,
              );
              return [site?.city, site?.state].filter(Boolean).join(', ');
            })() || '',
          jobTitle: person?.job_title || '',
          phone: person?.phone || person?.mobile || '',
          callerId: person?.caller_id || '',
          queues: memberOfQueues,
          skills,
          presence: live.status,
          availability: (() => {
            const raw = person?.call_forwarding;
            const rules =
              typeof raw === 'string'
                ? (() => {
                    try {
                      return JSON.parse(raw);
                    } catch {
                      return null;
                    }
                  })()
                : raw;
            return rules?.status || 'online';
          })(),
          tone: TONE[live.status] || 'idle',
          state: stateByUuid?.get(String(person?.uuid)) ?? null,
          raw: person,
        };
      }),
    [roster, queues, usersOnlineStatus, activeQueueCalls, departmentByUser, departments, sites, stateByUuid, scopeByUuid, scopeDirectory, skillsByUser],
  );

  /** Every location the company has, for a filter that must list locations the
      current page happens not to show. */
  const locationNames = useMemo(
    () =>
      Array.from(
        new Set((sites as any[]).map((site) => String(site?.name || '')).filter(Boolean)),
      ).sort(),
    [sites],
  );

  return {
    rows,
    isLoading: isRosterLoading,
    isFetching,
    /* Fall back to what is on screen when the server sends no total, so a
       count is never shown as zero for a list that is plainly not empty. */
    total: Number.isFinite(total) ? total : rows.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    locationNames,
    /** The caller's effective reach; null when it cannot be placed (then no
        button is greyed out on its account). */
    myScope,
  };
};

export default usePeopleRows;
