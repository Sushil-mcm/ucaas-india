import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDepartmentList, updateMemberForwading } from '@/services/api';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';
import { Ic } from '@/components/mcm/icons';
import { handleAlert } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useNavigate } from 'react-router-dom';
import { useConsoleDialer } from '@/pages/phone/console/dial-number';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import NewDepartment from '@/pages/admin-settings/phone-systems/departments/new-department';
import { usePeopleRows, type PersonRow as PeopleRow, type PresenceTone } from './people-rows';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { DirectoryPage, EmptyRow, SearchChip } from './page-shell';
import './groups-glass.css';

/**
 * Directory ▸ Groups — the departments people belong to.
 *
 * A table matching People's and Roles' own list design, rather than a
 * split Users/Groups pane: Group, Manager, headcount and extension at a
 * glance, with "Open" showing the rest (description, manager, members) in
 * a popup instead of a permanently-docked detail column. Clicking a person
 * inside that popup opens a second, smaller popup to edit them — the same
 * live presence, edit-and-save shape People's own row dialog uses, reusing
 * `usePeopleRows` so the two screens can't show a person differently.
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

/** Pill + dot colour for a presence tone, matching the live reference's
   generic "Offline" badge extended to the app's other tones. */
const PRESENCE_STYLE: Record<PresenceTone, { pill: string; dot: string }> = {
  good: { pill: 'bg-green-50 text-green-600 border-green-100', dot: 'bg-green-500' },
  busy: { pill: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' },
  warn: { pill: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' },
  idle: { pill: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
};

type GroupPerson = {
  uuid: string;
  name: string;
  extension: string;
  email: string;
  role: string;
  phone: string;
  site: string;
  presence: string;
  tone: PresenceTone;
};

const PersonRow = ({ person, onOpen }: { person: GroupPerson; onOpen: () => void }) => {
  const navigate = useNavigate();
  const { dial } = useConsoleDialer();
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(225,200,165,0.35)] bg-[rgba(251,249,246,0.5)] cursor-pointer hover:bg-[#FBE2C8]/40 transition-colors"
      onClick={onOpen}
    >
      <CustomAvatar name={person.name} size="38" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate capitalize">{person.name}</p>
          {person.role ? (
            <span className="text-[10px] font-semibold text-primary uppercase">{person.role}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {person.extension ? (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Icon name="Grid" className="w-3 h-3" />
              {person.extension}
            </span>
          ) : null}
          {person.email ? <span className="text-xs text-gray-400 truncate">{person.email}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5" onClick={(event) => event.stopPropagation()}>
        <div
          className="gp-group-call flex items-center justify-center rounded-full w-8 h-8 cursor-pointer transition-colors"
          title={`Call ${person.name}`}
          onClick={() => person.extension && dial(person.extension, { forceRefreshContactInfo: true })}
        >
          <Ic n="phone" size={14} />
        </div>
        <div
          className="gp-group-message flex items-center justify-center rounded-full w-8 h-8 cursor-pointer transition-colors"
          title={`Message ${person.name}`}
          onClick={() => navigate(`/messenger?chatId=${person.uuid}&chatType=chat`)}
        >
          <Ic n="chat" size={14} />
        </div>
      </div>
    </div>
  );
};

const Groups = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dial } = useConsoleDialer();
  const { rows: peopleRows } = usePeopleRows();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [openUuid, setOpenUuid] = useState<string | null>(null);
  const [editing, setEditing] = useState<GroupPerson | null>(null);
  const [personForm, setPersonForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    extension: '',
  });

  /* Same gate the Department page puts on New Department / Edit. */
  const { features } = useCompanyFeatures();
  const phoneSystem = features?.plan_features?.phone_system_action;
  const canCreateGroup = Boolean(phoneSystem?.access?.DEPARTMENT && phoneSystem?.action?.add);
  const canEditGroup = Boolean(phoneSystem?.access?.DEPARTMENT && phoneSystem?.action?.edit);

  const departmentQueryKey = ['getDepartmentList', 'directoryGroups'];
  const {
    data: rows = [],
    isPending,
  } = useQuery({
    /* The platform's department writes invalidate ['getDepartmentList']; keying
       this list anything else meant a newly created group never appeared. */
    queryKey: departmentQueryKey,
    queryFn: () => getDepartmentList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  /* A department record only carries `{ user_uuid }` for each member -- the
     manager and members panels need a name, extension, email and live
     presence to show anything, so this joins against `usePeopleRows`
     (the same roster People itself reads) rather than re-deriving presence
     a second way. */
  const peopleByUuid = useMemo(() => {
    const map = new Map<string, PeopleRow>();
    peopleRows.forEach((person) => {
      if (person.uuid) map.set(String(person.uuid), person);
    });
    return map;
  }, [peopleRows]);

  const resolvePerson = (entry: any, role: string): GroupPerson => {
    const person = entry?.user_uuid ? peopleByUuid.get(String(entry.user_uuid)) : null;
    const name =
      entry?.label ||
      person?.name ||
      /* A department's `manager` doesn't always carry a `user_uuid` to look
         up — the contact-centre seed stores just a name — so this is the
         last fallback rather than a roster-only lookup leaving it blank. */
      entry?.name ||
      '';
    return {
      uuid: entry?.user_uuid || person?.uuid || '',
      name,
      extension: entry?.value || person?.extension || '',
      email: entry?.email || person?.email || '',
      role,
      phone: person?.phone || '',
      site: person?.location || '',
      presence: person?.presence || 'Offline',
      tone: person?.tone || 'idle',
    };
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row: any) => {
      const manager = resolvePerson(parseJson(row?.manager) || {}, 'Manager');
      return [row?.name, row?.extension, manager.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rows, search, peopleByUuid]);

  /* Same paging as People/Roles: a fixed 10 rows with a pager below. */
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [visible, currentPage],
  );

  const opened = rows.find((row: any) => row?.uuid === openUuid) || null;
  const openedManager = opened ? resolvePerson(parseJson(opened?.manager) || {}, 'Manager') : null;
  const openedMembers = opened
    ? Array.from(
        new Map(
          parseMembers(opened?.members).map((entry) => [
            entry?.user_uuid,
            resolvePerson(entry, 'Agent'),
          ]),
        ).values(),
      )
    : [];

  const openPerson = (person: GroupPerson) => {
    setEditing(person);
    setPersonForm({
      first_name: person.name.split(' ')[0] || '',
      last_name: person.name.split(' ').slice(1).join(' ') || '',
      email: person.email || '',
      phone: person.phone || '',
      extension: person.extension || '',
    });
  };

  const { mutate: savePerson, isPending: isSavingPerson } = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      updateMemberForwading({ userID: editing?.uuid, uuid: editing?.uuid, ...payload }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['directoryPeople'] });
      invalidateGlobalUsersDirectory(queryClient);
      handleAlert({ text: data?.data?.data?.message || 'Saved', type: 'success' });
      setEditing(null);
    },
  });

  /* Take the roster away as a spreadsheet -- same shape as People's own
     Export, scoped to the groups currently on screen. */
  const exportGroups = () => {
    const csv = [
      ['Group', 'Manager', 'People', 'Extension'].join(','),
      ...visible.map((row: any) => {
        const manager = resolvePerson(parseJson(row?.manager) || {}, 'Manager');
        const members = parseMembers(row?.members);
        return [row?.name, manager.name, members.length, row?.extension]
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',');
      }),
    ].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'groups.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gp-groups">
      <DirectoryPage
        title="Groups"
        description="Everyone routes through a group — see who's in each one and who manages it."
        actions={
          <>
            <button
              type="button"
              className="btn ghost"
              onClick={() => navigate('/directory?view=people')}
            >
              <Ic n="users" />
              People
            </button>
            <button type="button" className="btn ghost" onClick={exportGroups}>
              <Ic n="dl" />
              Export
            </button>
            {canCreateGroup ? (
              <button type="button" className="btn primary" onClick={() => setCreating(true)}>
                <Ic n="plus" />
                New group
              </button>
            ) : null}
          </>
        }
        filters={
          <>
            <SearchChip value={search} onChange={setSearch} placeholder="Search groups" />
            <span className="fchip live" style={{ marginLeft: 'auto' }}>
              <span className="num">{visible.length}</span> groups
            </span>
          </>
        }
      >
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Manager</th>
              <th>People</th>
              <th>Extension</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <EmptyRow span={5} message="Loading groups…" />
            ) : visible.length ? (
              paged.map((row: any) => {
                const members = parseMembers(row?.members);
                const manager = resolvePerson(parseJson(row?.manager) || {}, 'Manager');
                return (
                  <tr
                    key={row?.uuid}
                    className="gp-group-row"
                    onClick={() => setOpenUuid(row?.uuid)}
                  >
                    <td>
                      <span className="flex items-center gap-2.5">
                        <CustomAvatar name={row?.name} size="30" />
                        <span style={{ fontWeight: 700 }}>{row?.name || '--'}</span>
                      </span>
                    </td>
                    <td>{manager.name || '—'}</td>
                    <td>
                      <span className="tag acc num">{members.length}</span>
                    </td>
                    <td className="num">{row?.extension || '—'}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <span className="flex items-center gap-1">
                        {canEditGroup ? (
                          <button
                            type="button"
                            className="mini"
                            title={`Edit ${row?.name}`}
                            aria-label={`Edit ${row?.name}`}
                            onClick={() => setEditingGroup(row)}
                          >
                            <Ic n="sliders" size={14} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="mini gp-group-open"
                          onClick={() => setOpenUuid(row?.uuid)}
                        >
                          <Ic n="chev" size={12} />
                          Open
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow
                span={5}
                message={rows.length ? 'No groups match that search.' : 'No groups yet.'}
              />
            )}
          </tbody>
        </table>

        {/* Pager. Reuses the app's own `.mcm-pager` classes (index.css), same
            as People and Roles -- hidden on a single page. */}
        {!isPending && pageCount > 1 ? (
          <div className="gp-groups-pager">
            <span className="gp-groups-pager-count">
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length}
            </span>
            <div className="mcm-pager flex items-center">
              <button
                type="button"
                className="mcm-pager-btn"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                &#8249;
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  className={`mcm-pager-page${number === currentPage ? ' is-current' : ''}`}
                  onClick={() => setPage(number)}
                  aria-current={number === currentPage ? 'page' : undefined}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                className="mcm-pager-btn"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                aria-label="Next page"
              >
                &#8250;
              </button>
            </div>
          </div>
        ) : null}
      </DirectoryPage>

      {/* "Open" -- a group's description, manager and members, in a popup
          rather than a permanently-docked detail pane. Markup/classes copied
          from the live site (ucaas-india.vercel.app/directory/groups) so
          this reads as the same product rather than a re-interpretation. */}
      <Dialog open={Boolean(opened)} onOpenChange={(next) => !next && setOpenUuid(null)}>
        <DialogContent
          className="sm:max-w-[640px] w-[calc(100vw-32px)] p-0 gap-0 rounded-2xl overflow-hidden border border-[rgba(225,200,165,0.5)]"
          showCloseButton={false}
        >
          {opened ? (
            <div className="flex flex-col max-h-[80vh]">
              <div className="flex items-center gap-3.5 px-6 py-4 border-b border-[rgba(225,200,165,0.3)] bg-[rgba(251,249,246,0.6)]">
                <CustomAvatar name={opened?.name} size="44" />
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-bold text-gray-900 truncate">{opened?.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[13px] text-gray-500 flex items-center gap-1">
                      <Icon name="Grid" className="w-3.5 h-3.5" />
                      {opened?.extension || '--'}
                    </span>
                    <span className="text-[13px] text-gray-500">{openedMembers.length} members</span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="gp-create-group-close"
                  onClick={() => setOpenUuid(null)}
                >
                  <Icon name="CloseIcon" className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Description
                  </p>
                  <p className="text-sm text-gray-700">
                    {opened?.description || 'No description provided.'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Manager
                  </p>
                  {openedManager?.uuid ? (
                    <PersonRow person={openedManager} onOpen={() => openPerson(openedManager)} />
                  ) : (
                    <p className="text-sm text-gray-500">No manager assigned</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Members
                  </p>
                  <div className="flex flex-col gap-2">
                    {openedMembers.length ? (
                      openedMembers.map((member) => (
                        <PersonRow key={member.uuid} person={member} onOpen={() => openPerson(member)} />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No members in this group.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end px-6 py-3 border-t border-[rgba(225,200,165,0.3)] bg-[rgba(251,249,246,0.4)]">
                <button
                  type="button"
                  className="h-9 px-5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenUuid(null)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* One person from that group -- editable, same field set as People's
          own row dialog (people.tsx), reached here too since a manager or
          member is the same record either way. */}
      <Dialog open={Boolean(editing)} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent
          className="sm:max-w-[560px] w-[calc(100vw-32px)] p-0 gap-0 rounded-2xl overflow-hidden border border-[rgba(225,200,165,0.5)]"
          showCloseButton={false}
        >
          {editing ? (
            <div className="flex flex-col">
              <div className="flex items-center gap-3.5 px-6 py-5 border-b border-gray-100 bg-[rgba(251,249,246,0.6)]">
                <CustomAvatar name={editing.name} size="48" />
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-bold text-gray-900 truncate">{editing.name}</div>
                  <div className="text-[13px] text-gray-500 mt-0.5">{editing.role}</div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${PRESENCE_STYLE[editing.tone].pill}`}
                >
                  <span className={`w-2 h-2 rounded-full ${PRESENCE_STYLE[editing.tone].dot}`} />
                  {editing.presence}
                </span>
              </div>

              <div className="px-6 py-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      First Name
                    </label>
                    <input
                      className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                      value={personForm.first_name}
                      onChange={(event) =>
                        setPersonForm((prev) => ({ ...prev, first_name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Last Name
                    </label>
                    <input
                      className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                      value={personForm.last_name}
                      onChange={(event) =>
                        setPersonForm((prev) => ({ ...prev, last_name: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Email
                    </label>
                    <input
                      className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                      type="email"
                      value={personForm.email}
                      onChange={(event) =>
                        setPersonForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Phone
                    </label>
                    <div className="[&_.react-tel-input_.form-control]:!h-10 [&_.react-tel-input_.form-control]:!rounded-lg [&_.react-tel-input_.form-control]:!border-gray-200 [&_.react-tel-input_.form-control]:!text-sm [&_.react-tel-input_.form-control]:!w-full [&_.react-tel-input_.flag-dropdown]:!rounded-l-lg [&_.react-tel-input_.flag-dropdown]:!border-gray-200">
                      <PhoneInput
                        country={'in'}
                        onlyCountries={['in']}
                        disableDropdown
                        value={personForm.phone}
                        onChange={(value) =>
                          setPersonForm((prev) => ({
                            ...prev,
                            phone: `+${value.startsWith('91') ? value : '91'}`,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Site
                    </label>
                    <input
                      className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 cursor-not-allowed"
                      disabled
                      value={editing.site}
                      title="Site is set from the person's assigned location, not edited here"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Extension
                    </label>
                    <input
                      className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 cursor-not-allowed"
                      disabled
                      value={personForm.extension}
                      title="Extension is provisioned, not edited here"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 pb-5 flex items-center gap-3">
                <button
                  type="button"
                  className="group flex-1 flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-primary hover:border-primary hover:text-white active:scale-[0.98] transition-all duration-150 disabled:opacity-40"
                  disabled={!editing.extension}
                  onClick={() =>
                    editing.extension && dial(editing.extension, { forceRefreshContactInfo: true })
                  }
                >
                  <Ic n="phone" size={16} />
                  Call
                </button>
                <button
                  type="button"
                  className="group flex-1 flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-primary hover:border-primary hover:text-white active:scale-[0.98] transition-all duration-150"
                  onClick={() => navigate(`/messenger?chatId=${editing.uuid}&chatType=chat`)}
                >
                  <Ic n="chat" size={16} />
                  Message
                </button>
              </div>

              <div className="px-6 pb-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  className="h-9 px-5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="h-9 px-5 rounded-lg bg-primary text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  disabled={isSavingPerson}
                  onClick={() =>
                    savePerson({
                      first_name: personForm.first_name,
                      last_name: personForm.last_name,
                      email: personForm.email,
                      phone: personForm.phone,
                    })
                  }
                >
                  {isSavingPerson ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* The platform's own department form, opened as a centered popup
          rather than a side drawer -- shared between Create and Edit, same
          as Admin ▸ Phone Systems ▸ Departments: an empty `rowData` means
          create, a populated one (the row that was clicked) means edit. */}
      <Dialog
        open={creating || Boolean(editingGroup)}
        onOpenChange={(next) => {
          if (!next) {
            setCreating(false);
            setEditingGroup(null);
          }
        }}
      >
        <DialogContent className="gp-create-group-dialog sm:max-w-[1100px]" showCloseButton={false}>
          {/* The title lives on the step rail now (`railTitle`/`railSubtitle`
              below), so this bar is just the close control -- same pattern
              as the Invite people dialog (people.tsx). */}
          <div className="gp-create-group-head gp-create-group-head--bare">
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={() => {
                setCreating(false);
                setEditingGroup(null);
              }}
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <NewDepartment
              rowData={editingGroup || {}}
              setDrawerState={(next: boolean) => {
                if (!next) {
                  setCreating(false);
                  setEditingGroup(null);
                }
              }}
              railTitle={editingGroup ? 'Edit group' : 'Create group'}
              railSubtitle={
                editingGroup
                  ? "Update this team's details, manager and members."
                  : 'Route calls to a team and assign it a shared extension.'
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
