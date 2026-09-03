import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDepartmentList, getUserList } from '@/services/api';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';
import { AddCircle } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import NewDepartment from '@/pages/admin-settings/phone-systems/departments/new-department';
import './groups-glass.css';

/**
 * Directory ▸ Groups — the departments people belong to.
 *
 * Reproduces the platform's own "Users / Groups" split-pane page
 * (`src/pages/departments/index.tsx` + `department-list/index.tsx` +
 * `department-list/department-details.tsx`) at the console's own
 * `/directory?view=groups` address — same classes, same component pieces
 * (`Input`, `Button`, `Icon`, `AddCircle`, `CustomAvatar`) — rather than the
 * platform's `/department/organization/:id`, which those components are
 * otherwise wired to.
 *
 * One deliberate improvement over the platform page: a department record
 * only carries `{ user_uuid }` for each member, which is why the platform's
 * own manager/member rows render as a blank circle with nothing beside it.
 * This resolves that uuid against the roster (`getUserList`) so a name,
 * extension and email actually show.
 */

const parseJson = (value: unknown): any => {
  try {
    return typeof value === 'string' ? JSON.parse(value || 'null') : value;
  } catch {
    return null;
  }
};

const parseMembers = (members: unknown): any[] => {
  const parsed = parseJson(members);
  return Array.isArray(parsed) ? parsed : [];
};

const PersonRow = ({ name, extension, email }: { name: string; extension: string; email: string }) => (
  <div className="flex min-w-0 flex-col border border-gray-200 bg-gray-100 rounded-xl w-full p-3 gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-1">
    <CustomAvatar name={name} showPresence extension={extension} />
    <div className="flex min-w-0 flex-col sm:w-[calc(100%_-_3.5rem)]">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        <p className="capitalize text-md truncate">{name}</p>
        <div className="flex shrink-0 gap-1">
          <Icon name="Grid" className="w-4 h-4 text-gray-500" />
          <div className="text-gray-500 truncate text-xs">{extension || ''}</div>
        </div>
      </div>
      {email ? (
        <div className="flex flex-col gap-1">
          <small className="text-gray-500 truncate text-sm">{email}</small>
        </div>
      ) : null}
    </div>
  </div>
);

const Groups = () => {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);

  /* Same gate the Department page puts on New Department. */
  const { features } = useCompanyFeatures();
  const phoneSystem = features?.plan_features?.phone_system_action;
  const canCreateGroup = Boolean(phoneSystem?.access?.DEPARTMENT && phoneSystem?.action?.add);

  const departmentQueryKey = ['getDepartmentList', 'directoryGroups'];
  const {
    data: rows = [],
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    /* The platform's department writes invalidate ['getDepartmentList']; keying
       this list anything else meant a newly created group never appeared. */
    queryKey: departmentQueryKey,
    queryFn: () => getDepartmentList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  /* A department's own record only carries `{ user_uuid }` for each member —
     the manager and members panels need a name, extension and email to show
     anything, so the roster is fetched once here and joined in by uuid. */
  const { data: people = [] } = useQuery({
    queryKey: ['directoryGroupsPeople'],
    queryFn: () => getUserList({ page: 1, limit: 500 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  const peopleByUuid = useMemo(() => {
    const map = new Map<string, any>();
    people.forEach((person: any) => {
      if (person?.uuid) map.set(String(person.uuid), person);
    });
    return map;
  }, [people]);

  const resolvePerson = (entry: any) => {
    const person = entry?.user_uuid ? peopleByUuid.get(String(entry.user_uuid)) : null;
    const name =
      entry?.label ||
      `${person?.first_name || ''} ${person?.last_name || ''}`.trim() ||
      person?.name ||
      /* A department's `manager` doesn't always carry a `user_uuid` to look
         up — the contact-centre seed stores just a name — so this is the
         last fallback rather than a roster-only lookup leaving it blank. */
      entry?.name ||
      '';
    return {
      uuid: entry?.user_uuid || person?.uuid,
      name,
      extension: entry?.value || person?.extension || '',
      email: entry?.email || person?.email || '',
    };
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row: any) => {
      const manager = resolvePerson(parseJson(row?.manager) || {});
      return [row?.name, row?.extension, manager.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rows, search, peopleByUuid]);

  /* The first group is selected the moment the list loads, so this view never
     opens on an empty pane — the same thing the platform's own Groups tab
     already does at `/department/organization`. */
  useEffect(() => {
    if (selectedUuid && rows.some((row: any) => row?.uuid === selectedUuid)) return;
    setSelectedUuid(rows[0]?.uuid || null);
  }, [rows, selectedUuid]);

  const selected = rows.find((row: any) => row?.uuid === selectedUuid) || null;
  const selectedManager = selected ? resolvePerson(parseJson(selected?.manager) || {}) : null;
  const selectedMembers = selected
    ? Array.from(
        new Map(
          parseMembers(selected?.members).map((entry) => [entry?.user_uuid, resolvePerson(entry)]),
        ).values(),
      )
    : [];

  return (
    <div className="gp-groups">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
        {/* ── left: Users / Groups list ─────────────────────────────────── */}
        <section className="gp-ug-left relative bg-white h-full border-r border-gray-200 w-full lg:min-w-[19rem] lg:max-w-[19rem] xl:min-w-[22rem] xl:max-w-[22rem]">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px]">
              <div className="flex gap-1 items-center">
                <h4 className="text-gray-900 font-semibold text-lg">Groups</h4>
              </div>
              {canCreateGroup ? (
                <div
                  role="button"
                  aria-label="New group"
                  title="New group"
                  onClick={() => setCreating(true)}
                  className="cursor-pointer flex items-center justify-center rounded-full w-10 h-10 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                >
                  <AddCircle className="w-6 h-6" />
                </div>
              ) : null}
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex w-full min-w-0 flex-col gap-2">
                <div className="flex items-center w-full min-w-0 gap-2 px-3 pt-3 pb-1">
                  <Input
                    IconPosition="left-0 pl-2 inset-y-0"
                    placeholder="Search by name and extension number"
                    className="min-w-0 pl-10 py-2.5"
                    value={search}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value.startsWith(' ')) return;
                      setSearch(value);
                    }}
                    Icon={<Icon name="SearchLine" className="text-gray-700" />}
                  />
                  <Button
                    className="gp-groups-refresh shrink-0"
                    style={{ width: 44, height: 44, padding: 0 }}
                    type="button"
                    variant="outline"
                    onClick={() =>
                      refetch().then(() => handleAlert({ text: 'Groups refreshed', type: 'success' }))
                    }
                  >
                    <Icon name="Refresh" className={`w-5 h-5${isFetching ? ' animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="flex w-full flex-col overflow-auto h-[calc(100vh_-_14.5rem)]">
                <ul role="list" className="list-rows h-full">
                  {isPending ? (
                    <div className="flex items-center justify-center p-5">
                      <span className="skel" style={{ width: '100%', height: 40, display: 'block' }} />
                    </div>
                  ) : visible.length ? (
                    visible.map((row: any) => {
                      const members = parseMembers(row?.members);
                      const manager = resolvePerson(parseJson(row?.manager) || {});
                      const isSelected = selectedUuid === row?.uuid;
                      return (
                        <li
                          key={row?.uuid}
                          className={`list-row ${isSelected ? 'on' : ''}`}
                          onClick={() => setSelectedUuid(row?.uuid)}
                        >
                          <div className="flex min-w-0 items-center w-full gap-2">
                            <div className="relative shrink-0">
                              <CustomAvatar name={row?.name} size="36" />
                            </div>
                            <div className="flex min-w-0 flex-col justify-between text-sm w-[calc(100%_-_3rem)] gap-1">
                              <div className="flex min-w-0 items-center justify-between gap-2">
                                <p className="list-row-name truncate">{row?.name || '--'}</p>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span
                                    className="list-row-meta num"
                                    style={{ display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    <Icon name="Grid" className="h-3.5 w-3.5" />
                                    {row?.extension || '--'}
                                  </span>
                                  <span
                                    className="tag acc num"
                                    style={{ display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    {members.length}
                                  </span>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-1">
                                <p className="shrink-0 text-gray-800 truncate text-xs">Manager :</p>
                                <p className="text-gray-500 flex min-w-0 items-center gap-0.5 truncate text-xs">
                                  {capitalizeFirstLetter(manager.name) || ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })
                  ) : (
                    <div className="flex justify-center items-center w-full h-full">
                      <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full mx-auto">
                        <p className="text-sm font-medium text-gray-900">
                          {rows.length ? 'No groups match that search.' : 'No Department Found'}
                        </p>
                      </div>
                    </div>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── right: selected group's detail ────────────────────────────── */}
        <div className="gp-ug-right-body min-h-0 flex-1 flex flex-col overflow-hidden bg-gray-200/15">
          {selected ? (
            <>
              <div className="gp-ug-detail-head w-full min-w-0 px-3 bg-white gap-2 flex items-center justify-between rounded-none border-b border-gray-200 min-h-[65px]">
                <div className="relative shrink-0">
                  <CustomAvatar name={selected?.name} />
                </div>
                <div className="flex min-w-0 items-center justify-between w-[calc(100%_-_3rem)]">
                  <div className="flex min-w-0 flex-col">
                    <p className="font-semibold text-gray-900 truncate text-md">
                      {selected?.name || 'Unknown group'}
                    </p>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="flex shrink-0 items-center gap-1 text-gray-500">
                        <Icon name="Grid" className="w-4 h-4" />
                        <small className="text-xs">{selected?.extension || '--'}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 h-[calc(100vh_-_10.3rem)] overflow-auto p-3">
                <div className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-gray-900 text-md">Description</p>
                    <p className="text-gray-800 text-sm">
                      {selected?.description || 'No description provided '}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-gray-900 truncate text-md">Department Manager</p>
                    <div className="w-full flex min-w-0 flex-col gap-3">
                      {selectedManager?.uuid ? (
                        <PersonRow
                          name={selectedManager.name}
                          extension={selectedManager.extension}
                          email={selectedManager.email}
                        />
                      ) : (
                        <p className="text-gray-500 text-sm">No manager assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex flex-col gap-1">
                    <h6 className="font-semibold text-gray-900 truncate text-md">Members</h6>
                    <div className="flex flex-wrap gap-y-2.5">
                      {selectedMembers.length ? (
                        selectedMembers.map((member) => (
                          <div className="w-full flex min-w-0 flex-col gap-3" key={member.uuid}>
                            <PersonRow name={member.name} extension={member.extension} email={member.email} />
                          </div>
                        ))
                      ) : (
                        <p>No members found in this departments</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="m-auto flex flex-col items-center justify-center gap-2 p-10">
              <p className="text-gray-800 text-sm">Select a group on the left to see its details.</p>
            </div>
          )}
        </div>
      </div>

      {/* The platform's own department form, opened as a centered popup
          rather than a side drawer. `rowData` empty means create rather
          than edit. */}
      <Dialog open={creating} onOpenChange={(next) => !next && setCreating(false)}>
        <DialogContent className="gp-create-group-dialog sm:max-w-[920px]" showCloseButton={false}>
          <div className="gp-create-group-head">
            <h2>Create group</h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={() => setCreating(false)}
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <NewDepartment rowData={{}} setDrawerState={setCreating} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
