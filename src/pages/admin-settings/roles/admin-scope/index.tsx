/* Admin scope — which part of the company each administrator covers.
 *
 * The Roles screen next door answers "what may this person do". It has no answer
 * for "to whom", so a role that grants "edit user" grants it over everybody. This
 * screen writes down the second half, per person. "Location admin, in Delhi."
 * "Group admin, for Sales."
 *
 * THE RULE the screen shows (lib/admin-scope.ts has it in full): reach comes
 * from the role, and a saved scope only narrows it — or, for a location admin,
 * widens it to the whole company when the owner says so. A group admin reaches
 * the groups they run; a location admin their own location. So the row for an
 * administrator with nothing saved does not read "Whole company": it reads
 * "Their groups (as manager): Sales" or "Runs no group yet — reaches nobody".
 *
 * A supervisor is listed too, read-only: their reach is the groups they belong
 * to ("Their groups: Sales, Support" / "In no group yet — reaches nobody") and
 * nothing is stored for them, so there is no Change button — change the
 * group's members instead.
 *
 * The scope is saved on the person's own record through POST /api/person/scope/:uuid
 * and the server enforces the EFFECTIVE scope on every request that acts on a
 * person (remove, edit, change role, restore, suspend, reactivate): a request
 * outside the caller's scope is refused. Lists and reports do not filter by
 * scope yet, so an administrator still sees everybody. The card says exactly that.
 *
 * The rules — who may set a scope, what a valid one is — are in
 * `lib/admin-scope.ts`, the same rules the server applies. This file is only the
 * part somebody touches.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ShieldCheck, Users } from 'lucide-react';

import Loader from '@/components/custom/loader';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { AreaNav } from '@/pages/admin-settings/roles/area-nav';
import { roleDisplayName } from '@/pages/admin-settings/roles/role-names';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { getDepartmentList, getPersonScopes, getUserList, setPersonScope, siteList } from '@/services/api';
import {
  canSetScope,
  checkScope,
  describeScope,
  effectiveScopeOfRow,
  isScopeSaveable,
  levelsFor,
  managedGroupUuids,
  memberGroupUuids,
  normaliseScope,
  reachOf,
  SUPERVISOR_REACH_REASON,
  type AdminScope,
  type Directory,
  type EffectiveScope,
  type Person,
  type ScopeActor,
  type ScopeLevel,
  type ScopeRow,
  type SystemRole,
} from '@/lib/admin-scope';

export const PERSON_SCOPES_QUERY_KEY = ['personScopes'];

const nameOf = (person: any): string =>
  `${person?.first_name || ''} ${person?.last_name || ''}`.trim() ||
  person?.email ||
  person?.extension ||
  'Unknown';

const toggleIn = (list: string[], uuid: string) =>
  list.includes(uuid) ? list.filter((item) => item !== uuid) : [...list, uuid];

const AdminScopePage = () => {
  const queryClient: any = useQueryClient();
  const { user } = useUser();
  const myUuid = String((user as any)?.user_info?.uuid || '');

  const [chosen, setChosen] = useState<string>('');
  const [draft, setDraft] = useState<AdminScope | null>(null);

  const { data: scopeRows = [], isLoading: scopesLoading } = useQuery({
    queryKey: PERSON_SCOPES_QUERY_KEY,
    queryFn: getPersonScopes,
    select: (res: any): ScopeRow[] => {
      const list = res?.data?.data?.result?.rows;
      return (Array.isArray(list) ? list : []).map((row: any) => ({
        uuid: String(row?.uuid || ''),
        system_role: (row?.system_role || null) as SystemRole,
        admin_scope: normaliseScope(row?.admin_scope),
        /* Newer servers resolve the rule themselves; older ones send nothing
           here and the browser derives it (effectiveScopeOfRow). */
        effective_scope: normaliseScope(row?.effective_scope),
        scope_source: row?.scope_source ?? null,
        managed_group_uuids: Array.isArray(row?.managed_group_uuids) ? row.managed_group_uuids : null,
        member_group_uuids: Array.isArray(row?.member_group_uuids) ? row.member_group_uuids : null,
      }));
    },
  });

  const { data: people = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['adminScopePeople'],
    queryFn: () => fetchAllPages(getUserList),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['adminScopeSites'],
    queryFn: () => fetchAllPages(siteList),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['getDepartmentList', 'adminScope'],
    queryFn: () => fetchAllPages(getDepartmentList),
  });

  const directory: Directory = useMemo(
    () => ({
      locations: (sites as any[]).map((site) => ({
        uuid: String(site?.uuid || ''),
        name: site?.name || 'Unnamed location',
      })),
      groups: (departments as any[]).map((department) => ({
        uuid: String(department?.uuid || ''),
        name: department?.name || 'Unnamed group',
      })),
    }),
    [sites, departments],
  );

  const roleByUuid = useMemo(() => {
    const map = new Map<string, ScopeRow>();
    scopeRows.forEach((row) => map.set(row.uuid, row));
    return map;
  }, [scopeRows]);

  /** People with their location, their group memberships and the groups they
      manage attached. Both group lists are read the same way (user_uuid, or
      the extension on older rows), so a supervisor's reach and a group
      admin's reach cannot disagree about who is in a group. */
  const roster: Person[] = useMemo(
    () =>
      (people as any[]).map((person) => {
        const key = { uuid: String(person?.uuid || ''), extension: person?.extension };
        return {
          uuid: key.uuid,
          name: nameOf(person),
          extension: person?.extension || null,
          locationUuid: person?.site_uuid || null,
          groupUuids: memberGroupUuids(key, departments as any[]),
          managedGroupUuids: managedGroupUuids(key, departments as any[]),
        };
      }),
    [people, departments],
  );

  const personByUuid = useMemo(() => {
    const map = new Map<string, Person>();
    roster.forEach((person) => map.set(person.uuid, person));
    return map;
  }, [roster]);

  const personName = (uuid: string) => personByUuid.get(uuid)?.name || 'Somebody who has since left';

  /** The reach a person actually has: the server's answer when it sends one,
      otherwise derived from their role, stored scope, location, the groups
      they manage and the groups they belong to. Null for anybody who is
      neither an administrator nor a supervisor. */
  const effectiveOf = (uuid: string): EffectiveScope | null => {
    const row = roleByUuid.get(uuid);
    if (!row) return null;
    const person = personByUuid.get(uuid);
    return effectiveScopeOfRow(row, {
      site_uuid: person?.locationUuid,
      managed_group_uuids: person?.managedGroupUuids,
      member_group_uuids: person?.groupUuids,
    });
  };

  /* Who may set scopes is judged on the EFFECTIVE scope: a location admin with
     nothing saved reaches their own location, not the whole company, so they
     cannot hand out scopes unless the owner has widened them. */
  const actorOf = (uuid: string): ScopeActor => {
    const row = roleByUuid.get(uuid);
    return { uuid, role: row?.system_role ?? null, scope: effectiveOf(uuid)?.scope ?? null };
  };
  const me = actorOf(myUuid);

  /* The administrators: everybody the server resolves to an admin role other
     than the owner, plus the supervisors (read-only rows). Sorted so the ones
     with a scope written down come first and the supervisors last. */
  const admins = useMemo(
    () =>
      scopeRows
        .filter(
          (row) =>
            row.system_role === 'MANAGER' ||
            row.system_role === 'SUB-ADMIN' ||
            row.system_role === 'SUPERVISOR',
        )
        .map((row) => ({
          ...row,
          supervisor: row.system_role === 'SUPERVISOR',
          name: personName(row.uuid),
          effective: effectiveOf(row.uuid),
          decision: canSetScope(me, actorOf(row.uuid)),
        }))
        .sort((a, b) => {
          const rank = (row: { supervisor: boolean; effective: EffectiveScope | null }) =>
            row.supervisor ? 2 : row.effective?.source === 'stored' ? 0 : 1;
          return rank(a) - rank(b) || a.name.localeCompare(b.name);
        }),
    [scopeRows, roster, myUuid],
  );

  const { mutate: save, isPending } = useMutation({
    mutationFn: ({ uuid, scope }: { uuid: string; scope: AdminScope }) => setPersonScope(uuid, scope),
    onSuccess: () => {
      handleAlert({ text: 'Admin scope saved.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: PERSON_SCOPES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['directoryPersonScopes'] });
      setChosen('');
      setDraft(null);
    },
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.message || 'The scope could not be saved.',
        type: 'error',
      });
    },
  });

  /* The dialog opens on the EFFECTIVE scope, so a group admin with nothing
     saved sees the groups they manage already ticked, and a location admin
     their own location — saving that writes down what already applies. */
  const startEditing = (uuid: string) => {
    const effective = effectiveOf(uuid);
    const offered = levelsFor(roleByUuid.get(uuid)?.system_role ?? null);
    const first = offered[0]?.level ?? 'group';
    setChosen(uuid);
    setDraft(
      effective && offered.some((item) => item.level === effective.scope.level)
        ? { ...effective.scope }
        : { level: first, location_uuids: [], group_uuids: [] },
    );
  };

  const chosenRole = chosen ? (roleByUuid.get(chosen)?.system_role ?? null) : null;
  const offeredLevels = levelsFor(chosenRole);
  const problems = draft ? checkScope(draft, directory) : [];
  const chosenDecision = chosen ? canSetScope(me, actorOf(chosen)) : { allowed: false, reason: '' };
  const canSave = Boolean(draft) && isScopeSaveable(problems) && chosenDecision.allowed;
  const reach = draft ? reachOf(draft, roster) : null;

  const setLevel = (level: ScopeLevel) =>
    setDraft((current) => (current ? { ...current, level } : current));

  return (
    <AdminPage
      section="People"
      title="Admin scope"
      description="A role says what an administrator may do. This says who they may do it to: a location, the whole company, or chosen groups."
      actions={<AreaNav current="/admin-settings/admin-scope" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        {scopesLoading || peopleLoading ? (
          <Loader />
        ) : (
          <>
            <SettingCard
              title="Who administers what"
              icon={<ShieldCheck className="h-4 w-4" />}
              description={
                admins.length
                  ? 'Every administrator except the account owner, and every supervisor. Without a saved scope, a location admin reaches their own location and a group admin the groups they run. A supervisor always reaches the groups they belong to.'
                  : 'Nobody holds an admin or supervisor role yet, apart from the account owner. Give somebody one under Roles first.'
              }
              status="active"
              note={
                <>
                  Enforced on the server for remove, edit, role change, restore and suspend: a
                  request outside somebody's scope is refused. Lists and reports do not filter by
                  scope yet, so an administrator still sees everybody. The account owner always
                  covers the whole company.
                </>
              }
            >
              {!me.role || (me.role !== 'ADMIN' && me.role !== 'MANAGER') ? (
                <SettingRow
                  label="Read only for you"
                  description="Only the account owner or an account admin can change a scope."
                />
              ) : null}

              {admins.map((admin) => (
                <SettingRow
                  key={admin.uuid}
                  label={admin.name}
                  description={
                    <>
                      {roleDisplayName(admin.system_role || '')} · {describeScope(admin.effective, directory)}
                      {/* A supervisor's row is read-only by design, not refused:
                          the reason lives on the button, not after the reach. */}
                      {admin.decision.allowed || admin.supervisor ? null : <> — {admin.decision.reason}</>}
                    </>
                  }
                  control={
                    <Button
                      type="button"
                      variant={chosen === admin.uuid ? 'primary' : 'outline'}
                      disabled={!admin.decision.allowed}
                      title={admin.supervisor ? SUPERVISOR_REACH_REASON : undefined}
                      onClick={() => startEditing(admin.uuid)}
                    >
                      {chosen === admin.uuid ? 'Editing' : 'Change'}
                    </Button>
                  }
                />
              ))}
            </SettingCard>

            {draft && chosen ? (
              <SettingCard
                title={`How far ${personName(chosen)} reaches`}
                icon={<Users className="h-4 w-4" />}
                description="A group admin reaches the groups they run. A location admin reaches a location, or the whole company if the owner says so. Everything inside the scope is theirs to administer; everything outside it is not."
              >
                {offeredLevels.map((item) => (
                  <SettingRow
                    key={item.level}
                    label={item.label}
                    description={item.description}
                    control={
                      <input
                        type="radio"
                        name="admin-scope-level"
                        aria-label={item.label}
                        checked={draft.level === item.level}
                        onChange={() => setLevel(item.level)}
                      />
                    }
                  />
                ))}

                {draft.level === 'location' ? (
                  <SettingRow
                    label="Locations they manage"
                    description="One for a location admin, several for somebody who covers a region."
                  >
                    <div className="flex flex-col gap-2">
                      {directory.locations.length === 0 ? (
                        <p className="text-sm text-[#9A948F]">
                          No locations yet. Add one under Company before using this scope.
                        </p>
                      ) : (
                        directory.locations.map((location) => (
                          <label key={location.uuid} className="flex items-center gap-3 text-sm">
                            <Checkbox
                              checked={draft.location_uuids.includes(location.uuid)}
                              onCheckedChange={() =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        location_uuids: toggleIn(current.location_uuids, location.uuid),
                                      }
                                    : current,
                                )
                              }
                            />
                            <Building2 className="h-3.5 w-3.5 text-[#9A948F]" />
                            {location.name}
                          </label>
                        ))
                      )}
                    </div>
                  </SettingRow>
                ) : null}

                {draft.level === 'group' ? (
                  <SettingRow
                    label="Groups they manage"
                    description="They reach the people in these groups, wherever those people sit. Groups they are the manager of are ticked already."
                  >
                    <div className="flex flex-col gap-2">
                      {directory.groups.length === 0 ? (
                        <p className="text-sm text-[#9A948F]">
                          No groups yet. Add one under Phone System before using this scope.
                        </p>
                      ) : (
                        directory.groups.map((group) => (
                          <label key={group.uuid} className="flex items-center gap-3 text-sm">
                            <Checkbox
                              checked={draft.group_uuids.includes(group.uuid)}
                              onCheckedChange={() =>
                                setDraft((current) =>
                                  current
                                    ? { ...current, group_uuids: toggleIn(current.group_uuids, group.uuid) }
                                    : current,
                                )
                              }
                            />
                            {group.name}
                          </label>
                        ))
                      )}
                    </div>
                  </SettingRow>
                ) : null}

                {reach ? (
                  <SettingRow
                    label="What this reaches"
                    description={
                      draft.level === 'company'
                        ? `Everybody — all ${reach.totalPeople} people.`
                        : `${reach.people} of ${reach.totalPeople} people${
                            reach.unplaced > 0
                              ? `. ${reach.unplaced} ${
                                  draft.level === 'location'
                                    ? 'have no location set and are left out'
                                    : 'are in no group and are left out'
                                }`
                              : ''
                          }.`
                    }
                  />
                ) : null}

                {problems.map((problem, index) => (
                  <SettingRow
                    key={`${problem.field}-${index}`}
                    label={problem.blocking ? 'Needs fixing' : 'Worth knowing'}
                    description={problem.message}
                  />
                ))}

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="transparent"
                    onClick={() => {
                      setChosen('');
                      setDraft(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canSave || isPending}
                    onClick={() => draft && save({ uuid: chosen, scope: draft })}
                  >
                    {isPending ? 'Saving…' : 'Save scope'}
                  </Button>
                </div>
              </SettingCard>
            ) : null}
          </>
        )}
      </div>
    </AdminPage>
  );
};

export default AdminScopePage;
