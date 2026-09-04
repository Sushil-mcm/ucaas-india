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
import { Building2, MapPin, MoreHorizontal, ShieldCheck, Trash2, Users } from 'lucide-react';

import Loader from '@/components/custom/loader';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  /* The rail can hold every administrator in the company, so the list needs the
     same two controls the other admin tables have: find a name, and see only
     the ones that are or are not narrowed yet. */
  const [search, setSearch] = useState('');
  const [only, setOnly] = useState<'all' | 'scoped' | 'unscoped'>('all');

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
      /* Carried so the table can list the people this screen is actually
         about. The same field People reads for its Role column. */
      role: String(
        person?.custom_role_data?.name || person?.role_data?.name || person?.role || '',
      ),
    }));
  }, [people, departments]);

  /* Who this screen is for. A scope only means anything for somebody who can
     administer, so the table lists them rather than sitting empty until
     somebody is added -- everyone starts on "Whole company", which is the
     truth today, and each row is a way to narrow it. */
  const administrators = useMemo(
    () => roster.filter((person) => /admin|manager/i.test(String((person as any).role || ''))),
    [roster],
  );

  const visibleAdministrators = useMemo(() => {
    const q = search.trim().toLowerCase();
    return administrators.filter((person) => {
      const scoped = Boolean(scopeFor(scopes, person.uuid));
      if (only === 'scoped' && !scoped) return false;
      if (only === 'unscoped' && scoped) return false;
      if (!q) return true;
      return `${person.name} ${(person as any).role || ''}`.toLowerCase().includes(q);
    });
  }, [administrators, scopes, search, only]);

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

  /* Writes a scope straight into the list, for the shortcuts that do not need
     the editor. Same normalise-and-replace the editor does, so a scope set this
     way is identical to one built by hand. */
  const applyScope = (raw: AdminScope) => {
    const clean = normaliseScope(raw);
    if (!mayEdit(clean).allowed) return;
    setScopes((list) =>
      [...list.filter((scope) => scope.personUuid !== clean.personUuid), clean].sort((a, b) =>
        personName(a.personUuid).localeCompare(personName(b.personUuid)),
      ),
    );
    setDirty(true);
  };

  const removeScope = (personUuid: string) => {
    setScopes((list) => list.filter((scope) => scope.personUuid !== personUuid));
    setDirty(true);
  };

  const toggleIn = (list: string[], uuid: string) =>
    list.includes(uuid) ? list.filter((item) => item !== uuid) : [...list, uuid];

  return (
    <AdminPage
      hideHead
      title="Admin scope"
      description="A role says what somebody may do. This says who they may do it to — the whole company, chosen locations, or chosen departments."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        {isLoading || peopleLoading ? (
          <Loader />
        ) : (
          <>
            {/* Led by who covers what, the way People and Roles beside it are:
                one row per administrator, scannable, with the limitation stated
                once above rather than wrapped around every row. */}
            {/* Amber, written inline rather than through `.mcm-notsaved`: that
                class carries a `prefers-color-scheme: dark` variant, so on a
                machine set to dark it painted a near-black box into this
                otherwise light page. */}
            <div className="rounded-md border border-amber-200 border-l-[3px] border-l-amber-500 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-900">
              <span className="font-semibold">Saved here, not enforced yet.</span> Nothing checks a
              scope when an administrator acts, so everyone still covers the whole company. Writing
              it down now means it applies the day that check is switched on.
            </div>

            {/* The save lives with the list it saves, and only appears once
                something has changed -- a button that is always there says
                nothing about whether there is anything to keep. */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search administrators"
                aria-label="Search administrators"
                className="h-9 min-w-56 flex-1 rounded-md border border-[rgba(225,200,165,0.9)] bg-white px-3 text-sm outline-none focus:border-primary"
              />
              <select
                value={only}
                onChange={(event) => setOnly(event.target.value as typeof only)}
                aria-label="Show"
                className="h-9 rounded-md border border-[rgba(225,200,165,0.9)] bg-white px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">Everyone</option>
                <option value="scoped">Narrowed only</option>
                <option value="unscoped">Whole company only</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#2E2D35]">
                {scopes.length
                  ? `${scopes.length} of ${administrators.length} scoped. The rest cover the whole company.`
                  : `${administrators.length} ${administrators.length === 1 ? 'administrator' : 'administrators'}, all covering the whole company.`}
              </p>
              <div className="flex items-center gap-2">
                {/* Undoes the narrowing in one go. Only offered when there is
                    something to undo, and it goes through the same save as
                    every other change rather than writing straight through. */}
                {scopes.length ? (
                  <Button
                    type="button"
                    variant="transparent"
                    onClick={() => {
                      setScopes([]);
                      setDirty(true);
                    }}
                  >
                    Reset everyone
                  </Button>
                ) : null}
                {dirty ? (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isPending}
                    onClick={() => persist(scopes)}
                  >
                    {isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="panel-card">
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Administrator</th>
                      <th>Role</th>
                      <th>Covers</th>
                      <th>Reaches</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAdministrators.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty">
                            <p>
                              {administrators.length === 0
                                ? 'Nobody holds an administrator role yet. Give someone one under Roles and they will appear here to be scoped.'
                                : 'No administrator matches that.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visibleAdministrators.map((person) => {
                        const scope = scopeFor(scopes, person.uuid);
                        const cover = scope ? coverageOf(scope, roster, directory) : null;
                        const decision = scope ? mayEdit(scope) : { allowed: true, reason: '' };
                        return (
                          <tr key={person.uuid}>
                            <td>
                              <span className="font-semibold text-[#2E2D35]">{person.name}</span>
                            </td>
                            <td className="text-[#9A948F]">{String((person as any).role || '—')}</td>
                            <td>
                              {scope ? (
                                describeScope(scope, directory)
                              ) : (
                                <span className="text-[#9A948F]">
                                  The whole company &middot; nothing narrower set
                                </span>
                              )}
                            </td>
                            <td>
                              {cover ? (
                                <>
                                  {cover.people} of {cover.totalPeople} people
                                  {cover.unplaced > 0 ? (
                                    <span className="block text-xs text-[#9A948F]">
                                      {cover.unplaced}{' '}
                                      {scope?.tier === 'location'
                                        ? 'have no location set, so they are left out'
                                        : 'are in no department, so they are left out'}
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-[#9A948F]">Everyone</span>
                              )}
                              {decision.allowed ? null : (
                                <span className="block text-xs text-[#9A948F]">{decision.reason}</span>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={!decision.allowed}
                                  onClick={() =>
                                    setEditing(scope ? { ...scope } : blankScope(person.uuid))
                                  }
                                >
                                  {scope ? 'Change' : 'Narrow this'}
                                </Button>
                                {/* The two common narrowings without opening the
                                    editor, and the way back to the whole
                                    company. The editor is still there for
                                    picking exactly which locations. */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="mini"
                                      disabled={!decision.allowed}
                                      title={`More for ${person.name}`}
                                      aria-label={`More actions for ${person.name}`}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-56">
                                    {/* The commonest scope of all -- a manager
                                        over the site they work at -- in one
                                        click, using the location already on
                                        their record. */}
                                    {person.locationUuid ? (
                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() =>
                                          applyScope({
                                            ...(scope || blankScope(person.uuid)),
                                            tier: 'location',
                                            locationUuids: [String(person.locationUuid)],
                                            departmentUuids: [],
                                          })
                                        }
                                      >
                                        <Building2 className="h-3.5 w-3.5" /> Narrow to their own
                                        location
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() =>
                                        setEditing({
                                          ...(scope || blankScope(person.uuid)),
                                          tier: 'location',
                                        })
                                      }
                                    >
                                      <MapPin className="h-3.5 w-3.5" /> Choose locations…
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() =>
                                        setEditing({
                                          ...(scope || blankScope(person.uuid)),
                                          tier: 'department',
                                        })
                                      }
                                    >
                                      <Users className="h-3.5 w-3.5" /> Choose departments…
                                    </DropdownMenuItem>
                                    {scope ? (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-red-600 focus:text-red-600"
                                        onClick={() => removeScope(person.uuid)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" /> Reset to whole company
                                      </DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* A dialog, not a panel under the table. Opened from a row that
                can be most of a screen down, the editor used to appear below
                everything and needed scrolling to find -- the click looked as
                though it had done nothing. */}
            <Dialog
              open={Boolean(editing)}
              onOpenChange={(next) => (next ? undefined : setEditing(null))}
            >
              <DialogContent className="max-w-xl p-0" showCloseButton={false}>
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
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </AdminPage>
  );
};

export default AdminScopePage;
