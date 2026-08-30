/* Admin scope — which part of the company each administrator covers.
 *
 * The Roles screen next door answers "what may this person do". It has no answer
 * for "to whom", so a role that grants "edit user" grants it over everybody. This
 * screen is where the second half is written down: this person covers the whole
 * company, this one covers London and Manchester, this one covers the support
 * queue and nothing else.
 *
 * The rules — what a valid scope is, who each scope reaches, who may change one —
 * live in `lib/admin-scope.ts` with their own tests. This file is only the part
 * somebody touches.
 *
 * It is deliberately honest about what it is. The platform's API does not check
 * scope on any request today, so what is saved here is a written record of who
 * should administer what, not a lock. The card says exactly that, and it will
 * keep saying it until the API enforces it. An administrator told their locations
 * are separated, when nothing separates them, would find out the wrong way.
 *
 * Stored under `settings.admin_scopes` on the company record, the same place the
 * other company-wide lists live.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ShieldCheck, Trash2, Users } from 'lucide-react';

import Loader from '@/components/custom/loader';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { AreaNav } from '@/pages/admin-settings/roles/area-nav';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { getDepartmentList, getUserList, siteList } from '@/services/api';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  saveCompanyDefaults,
} from '@/lib/company-defaults';
import {
  TIERS,
  canEditScope,
  checkScope,
  coverageOf,
  describeScope,
  isScopeSaveable,
  normaliseScope,
  readScopes,
  scopeFor,
  type AdminScope,
  type Directory,
  type Person,
  type ScopeTier,
} from '@/lib/admin-scope';

const STORE_KEY = 'admin_scopes';

const nameOf = (person: any): string =>
  `${person?.first_name || ''} ${person?.last_name || ''}`.trim() ||
  person?.email ||
  person?.extension ||
  'Unknown';

/* A department's location arrives as a JSON string of `{ label, value }`, which is
   how the department form writes it. Anything else means no location is set, and
   the scope rules treat that as "we cannot tell" rather than guessing. */
const departmentSiteUuid = (raw: unknown): string | null => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const value = (parsed as any)?.value;
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
};

const departmentMembers = (raw: unknown): string[] => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((member: any) => String(member?.user_uuid || member?.uuid || ''))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const blankScope = (personUuid: string): AdminScope => ({
  personUuid,
  tier: 'location',
  locationUuids: [],
  departmentUuids: [],
});

const AdminScopePage = () => {
  const queryClient: any = useQueryClient();
  const { user } = useUser();
  const myUuid = String((user as any)?.user_info?.uuid || '');
  const [scopes, setScopes] = useState<AdminScope[]>([]);
  const [editing, setEditing] = useState<AdminScope | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data: stored, isLoading } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
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

  useEffect(() => {
    if (!stored) return;
    setScopes(readScopes((stored as any)?.settings?.[STORE_KEY]));
    setDirty(false);
  }, [stored]);

  const directory: Directory = useMemo(
    () => ({
      locations: (sites as any[]).map((site) => ({
        uuid: String(site?.uuid || ''),
        name: site?.name || 'Unnamed location',
      })),
      departments: (departments as any[]).map((department) => ({
        uuid: String(department?.uuid || ''),
        name: department?.name || 'Unnamed department',
        locationUuid: departmentSiteUuid(department?.site),
      })),
    }),
    [sites, departments],
  );

  /** People with their location and their department memberships attached. */
  const roster: Person[] = useMemo(() => {
    const byUser = new Map<string, string[]>();
    (departments as any[]).forEach((department) => {
      const uuid = String(department?.uuid || '');
      departmentMembers(department?.members).forEach((member) => {
        byUser.set(member, [...(byUser.get(member) || []), uuid]);
      });
    });

    return (people as any[]).map((person) => ({
      uuid: String(person?.uuid || ''),
      name: nameOf(person),
      locationUuid: person?.site_uuid || null,
      departmentUuids: byUser.get(String(person?.uuid || '')) || [],
    }));
  }, [people, departments]);

  const personName = (uuid: string) =>
    roster.find((person) => person.uuid === uuid)?.name || 'Somebody who has since left';

  const { mutate: save, isPending } = useMutation({
    mutationFn: saveCompanyDefaults,
    onSuccess: () => {
      handleAlert({ text: 'Admin scopes saved.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
      setDirty(false);
    },
  });

  /* Everything else on the company record travels through untouched — writing
     only this key would delete the rest. */
  const persist = (next: AdminScope[]) => {
    const settings = { ...((stored as any)?.settings || {}), [STORE_KEY]: next };
    save({
      uuid: (stored as any)?.uuid,
      settings,
      greetings: (stored as any)?.greetings ?? {},
    });
  };

  /* The scope the signed-in person is working from. Nobody has one written down
     until somebody writes one, and until then every administrator covers the
     whole company — so that is what an absent entry means here too. */
  const mine: AdminScope = scopeFor(scopes, myUuid) || {
    personUuid: myUuid,
    tier: 'company',
    locationUuids: [],
    departmentUuids: [],
  };

  /* Nobody widens their own reach. The refusal is shown as its own sentence
     rather than as a button that quietly does nothing. */
  const mayEdit = (subject: AdminScope) => canEditScope(mine, subject);

  const problems = editing ? checkScope(editing, directory) : [];
  const canSaveEditor = editing ? isScopeSaveable(problems) && mayEdit(editing).allowed : false;
  const preview = editing ? coverageOf(editing, roster, directory) : null;

  const commitEditor = () => {
    if (!editing || !canSaveEditor) return;
    const clean = normaliseScope(editing);
    const next = [
      ...scopes.filter((scope) => scope.personUuid !== clean.personUuid),
      clean,
    ].sort((a, b) => personName(a.personUuid).localeCompare(personName(b.personUuid)));
    setScopes(next);
    setEditing(null);
    setDirty(true);
  };

  const removeScope = (personUuid: string) => {
    setScopes((list) => list.filter((scope) => scope.personUuid !== personUuid));
    setDirty(true);
  };

  const toggleIn = (list: string[], uuid: string) =>
    list.includes(uuid) ? list.filter((item) => item !== uuid) : [...list, uuid];

  /* Who is not on the list yet. Somebody can only hold one scope, so the picker
     offers everybody who does not already have one — and never the signed-in
     person, who is not allowed to decide their own reach. */
  const unassigned = roster.filter(
    (person) =>
      !scopes.some((scope) => scope.personUuid === person.uuid) &&
      mayEdit(blankScope(person.uuid)).allowed,
  );

  return (
    <AdminPage
      section="People"
      title="Admin scope"
      description="Step 3 of four. A role says what somebody may do. This says who they may do it to — the whole company, chosen locations, or chosen departments."
      actions={<AreaNav current="/admin-settings/admin-scope" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        {isLoading || peopleLoading ? (
          <Loader />
        ) : (
          <>
            <SettingCard
              title="Who administers what"
              icon={<ShieldCheck className="h-4 w-4" />}
              description={
                scopes.length
                  ? `${scopes.length} ${scopes.length === 1 ? 'person has' : 'people have'} a scope written down. Anybody not listed is treated as covering the whole company, which is what happens today.`
                  : 'Nobody has a scope yet, so every administrator covers the whole company — including people at other locations.'
              }
              status="coming-soon"
              note={
                <>
                  Coming soon. This is saved on your company record and nothing acts on it yet: an
                  administrator&rsquo;s scope is never checked, so it is a written record of who{' '}
                  <em>should</em> manage what rather than a restriction. Decide it now and it is
                  ready the day it arrives.
                </>
              }
              aside={
                dirty ? (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isPending}
                    onClick={() => persist(scopes)}
                  >
                    {isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                ) : null
              }
            >
              {scopes.length === 0 ? (
                <SettingRow
                  label="Nothing written down"
                  description="Most companies start with the person who runs each location."
                />
              ) : (
                scopes.map((scope) => {
                  const cover = coverageOf(scope, roster, directory);
                  const decision = mayEdit(scope);
                  return (
                    <SettingRow
                      key={scope.personUuid}
                      label={personName(scope.personUuid)}
                      description={
                        <>
                          {describeScope(scope, directory)} — reaches {cover.people} of{' '}
                          {cover.totalPeople} people
                          {cover.unplaced > 0 ? (
                            <>
                              {' '}
                              ({cover.unplaced}{' '}
                              {scope.tier === 'location'
                                ? 'have no location set, so they are left out'
                                : 'are in no department, so they are left out'}
                              )
                            </>
                          ) : null}
                          .{decision.allowed ? null : <> {decision.reason}</>}
                        </>
                      }
                      control={
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!decision.allowed}
                            onClick={() => setEditing({ ...scope })}
                          >
                            Change
                          </Button>
                          <Button
                            type="button"
                            variant="transparent"
                            disabled={!decision.allowed}
                            onClick={() => removeScope(scope.personUuid)}
                            aria-label={`Remove the scope for ${personName(scope.personUuid)}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      }
                    />
                  );
                })
              )}

              <SettingRow
                label="Give somebody a scope"
                description={
                  unassigned.length
                    ? 'Pick the person, then choose how far they reach.'
                    : 'Everybody already has one.'
                }
                control={
                  <select
                    aria-label="Choose a person to give a scope to"
                    className="h-10 w-full min-w-56 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-slate-500"
                    value=""
                    disabled={unassigned.length === 0}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      setEditing(blankScope(event.target.value));
                    }}
                  >
                    <option value="">Choose a person…</option>
                    {unassigned.map((person) => (
                      <option key={person.uuid} value={person.uuid}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                }
              />
            </SettingCard>

            {editing ? (
              <SettingCard
                title={`How far ${personName(editing.personUuid)} reaches`}
                icon={<Users className="h-4 w-4" />}
                description="Everything inside the scope is theirs to administer. Everything outside it is not."
              >
                {TIERS.map((tier) => (
                  <SettingRow
                    key={tier.tier}
                    label={tier.label}
                    description={tier.description}
                    control={
                      <input
                        type="radio"
                        name="admin-scope-tier"
                        aria-label={tier.label}
                        checked={editing.tier === tier.tier}
                        onChange={() =>
                          setEditing((current) =>
                            current
                              ? normaliseScope({ ...current, tier: tier.tier as ScopeTier })
                              : current,
                          )
                        }
                      />
                    }
                  />
                ))}

                {editing.tier === 'location' ? (
                  <SettingRow
                    label="Locations they manage"
                    description="One for an location manager, several for somebody who covers a region."
                  >
                    <div className="flex flex-col gap-2">
                      {directory.locations.length === 0 ? (
                        <p className="text-sm text-gray-600">
                          No locations yet. Add one under Company before using this scope.
                        </p>
                      ) : (
                        directory.locations.map((location) => (
                          <label key={location.uuid} className="flex items-center gap-3 text-sm">
                            <Checkbox
                              checked={editing.locationUuids.includes(location.uuid)}
                              onCheckedChange={() =>
                                setEditing((current) =>
                                  current
                                    ? {
                                        ...current,
                                        locationUuids: toggleIn(
                                          current.locationUuids,
                                          location.uuid,
                                        ),
                                      }
                                    : current,
                                )
                              }
                            />
                            <Building2 className="h-3.5 w-3.5 text-gray-500" />
                            {location.name}
                          </label>
                        ))
                      )}
                    </div>
                  </SettingRow>
                ) : null}

                {editing.tier === 'department' ? (
                  <SettingRow
                    label="Departments they manage"
                    description="They reach the people in these departments, wherever those people sit."
                  >
                    <div className="flex flex-col gap-2">
                      {directory.departments.length === 0 ? (
                        <p className="text-sm text-gray-600">
                          No departments yet. Add one under Phone System before using this scope.
                        </p>
                      ) : (
                        directory.departments.map((department) => (
                          <label key={department.uuid} className="flex items-center gap-3 text-sm">
                            <Checkbox
                              checked={editing.departmentUuids.includes(department.uuid)}
                              onCheckedChange={() =>
                                setEditing((current) =>
                                  current
                                    ? {
                                        ...current,
                                        departmentUuids: toggleIn(
                                          current.departmentUuids,
                                          department.uuid,
                                        ),
                                      }
                                    : current,
                                )
                              }
                            />
                            {department.name}
                          </label>
                        ))
                      )}
                    </div>
                  </SettingRow>
                ) : null}

                {preview ? (
                  <SettingRow
                    label="What this reaches"
                    description={
                      editing.tier === 'company'
                        ? `Everybody — all ${preview.totalPeople} people, ${preview.locations || directory.locations.length} locations and ${preview.departments} departments.`
                        : `${preview.people} of ${preview.totalPeople} people${
                            preview.unplaced > 0
                              ? `. ${preview.unplaced} ${
                                  editing.tier === 'location'
                                    ? 'have no location set and are left out'
                                    : 'are in no department and are left out'
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
                  <Button type="button" variant="transparent" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canSaveEditor}
                    onClick={commitEditor}
                  >
                    Use this scope
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
