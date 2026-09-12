import { useEffect, useMemo, useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import useDebounce from '@/hooks/use-debounce';
import {
  History,
  MoreHorizontal,
  Pencil,
  PhoneOff,
  PhoneOutgoing,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { mayActOn } from '@/lib/role-rank';
import { Ic } from '@/components/mcm/icons';
import SideDrawer from '@/components/custom/side-drawer';
import UpdateForwarding from '@/pages/admin-settings/people/update-forwarding';
import { DirectoryPage, EmptyRow, FilterChip, SearchChip } from './page-shell';
import CustomAvatar from '@/components/custom/custom-avatar';
import { useConsoleDialer } from '@/pages/phone/console/dial-number';
import { useInstantMeeting } from '@/hooks/use-instant-meeting';
import {
  PERSON_STATE_LABEL,
  SKILL_STARS_MAX,
  STATUS_FILTER_OPTIONS,
  stateOfStatusFilter,
  usePeopleRows,
  type PersonRow,
} from './people-rows';
import RemovedPeople from './people-removed';
import { useDirectoryFavourites } from './use-directory-favourites';
import { useUser } from '@/hooks/use-user';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignRoleBulkUsers,
  getRoleList,
  deleteMember,
  reactivateMember,
  removeAssignNumber,
  resendInvite,
  suspendMember,
  updateMemberForwading,
} from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { locksFor } from '@/lib/admin-scope';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import AlertConfirm from '@/components/custom/alert-confirm';
import RemovalWarning, { useRemovalImpact } from '@/components/mcm/removal-warning';
import {
  PRESENCE_OPTIONS,
  presenceValueOf,
  useMyPresenceControl,
} from '@/hooks/use-presence-control';
import { useCompanyFeatures } from '@/hooks/rbac';
import RoleChangeModal from '@/pages/admin-settings/people/role-change-modal';
import { roleDisplayName } from '@/pages/admin-settings/roles/role-names';
import AssignCallerIdModal from '@/pages/admin-settings/people/add-users/assign-caller-id-modal';
import AddUsers from '@/pages/admin-settings/people/add-users';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { buildRosterCsv, rosterFileName, toExportRow } from '@/lib/user-roster-export';
import './people-glass.css';
import './groups-glass.css';

/**
 * Directory ▸ People — the organisation roster.
 *
 * Everyone in the org with their role, department, extension, the queues they
 * take, their rated skills, live presence, and one click to call, message or
 * start video.
 *
 * Row actions reuse the platform's own person editor rather than inventing a
 * second one: "Edit" opens Update Forwarding, and every action is gated on the
 * plan's USER permission tree.
 *
 * WHAT THE GATES HERE ARE, AND ARE NOT
 *
 * The buttons below are hidden or shown from the role's permission tree
 * (account_setting.access.USER.action.edit / .delete). Hiding a button is a
 * courtesy: it keeps people from seeing buttons that would fail. The real
 * check is on the server, which reads the same tree on the People routes
 * (and on media, devices and company settings), and checks the caller's
 * admin scope on remove, edit, role change, restore and suspend. So a hidden
 * button and a refused request are the same decision made twice, and the
 * server's is the one that counts. It is the same gate for all three actions
 * on purpose: Edit and Change role used to demand the ADMIN role as well,
 * while Remove did not, so a custom role holding the edit permission could
 * delete a colleague but not rename them.
 *
 * The scope check is mirrored too, as greyed-out buttons rather than hidden
 * ones: a person outside the caller's reach (a location admin's location, a
 * group admin's groups — see lib/admin-scope.ts) keeps the buttons, disabled,
 * with the reason as the tooltip. A group admin inside their groups may Edit
 * (duty, skills, membership) but not change who a person is, their role, or
 * remove them; those stay disabled with that sentence. Most group admins
 * manage no group and have no stored scope, so they now reach nobody, and the
 * buttons must say so rather than fail with a 403.
 *
 * ONE PAGE AT A TIME
 *
 * The list is read a page at a time from the same endpoint every other list
 * uses. It used to ask for 500 rows once, and any company larger than that
 * was silently cut off — with an export button that still said "everybody".
 * Search and Location go to the server (it matches name, e-mail, extension and
 * the location's name); Groups, Presence and Status are only known once the
 * page has arrived, so they narrow the page on screen. The export covers exactly the
 * rows on screen and its label says so.
 *
 * STATES
 *
 * Every person has a state as well as a presence: Invited (has not accepted
 * the invite yet), Active, Suspended (an administrator switched them off), and
 * Removed (soft-deleted, restorable for 72 hours on the Removed tab). The
 * pill in the Status column is the state; Presence stays what it was. What
 * Suspended actually blocks today is written on the pill itself, and it must
 * stay honest: login is blocked the moment it is set, the phone only once
 * the switch update is applied.
 */

const TONE_CLASS: Record<string, string> = {
  good: 'tag pos',
  busy: 'tag neg',
  warn: 'tag warn',
  idle: 'tag neu',
};

/** Columns a supervisor can order the roster by. */
export type SortKey = 'name' | 'roleLabel' | 'state' | 'department' | 'location' | 'presence';

/* Sorts the way a person reads a name list: case-insensitively, with an empty
   value last whichever direction the column is pointing. */
const compareBy = (key: SortKey, desc: boolean) => (left: any, right: any) => {
  const a = String(left?.[key] ?? '').trim();
  const b = String(right?.[key] ?? '').trim();
  const aEmpty = !a || a === '—';
  const bEmpty = !b || b === '—';
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
  const compared = a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  return desc ? -compared : compared;
};

/**
 * One sortable column heading.
 *
 * Sorting orders the WHOLE company: picking a column puts the roster into its
 * whole-roster load, so the first name in the list is the first name in the
 * company rather than the first on page one.
 */
const SortHeader = ({
  sortKey,
  label,
  sort,
  onSort,
}: {
  sortKey: SortKey;
  label: string;
  sort: { key: SortKey; desc: boolean } | null;
  onSort: (key: SortKey) => void;
}) => {
  const active = sort?.key === sortKey;
  return (
    <th aria-sort={active ? (sort?.desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="mcm-sort" onClick={() => onSort(sortKey)}>
        {label}
        <span className="mcm-sort-mark">{active ? (sort?.desc ? '\u25BC' : '\u25B2') : '\u21C5'}</span>
      </button>
    </th>
  );
};

const PAGE_SIZE = 50;

const People = () => {
  const navigate = useNavigate();
  const { dial } = useConsoleDialer();
  const { startVideoCall, isStarting } = useInstantMeeting();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [location, setLocation] = useState('All');
  const [page, setPage] = useState(1);

  /* A new search or location starts from the first page again. */
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, location]);

  const [department, setDepartment] = useState('All');
  const [presence, setPresence] = useState('Any');
  const [status, setStatus] = useState('Any');

  /* Groups, Presence and Status are decided here rather than by the server —
     presence is live socket state and neither groups nor the invited/suspended
     state is a column on the users table. So the moment one of them (or a sort)
     is in play the screen needs the whole company in hand, not one page of it,
     or a match on page two would simply not exist. */
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>(null);
  const [exportAll, setExportAll] = useState(false);
  const needsWholeRoster =
    department !== 'All' || presence !== 'Any' || status !== 'Any' || Boolean(sort) || exportAll;

  const { rows, isLoading, isFetching, total, totalPages, locationNames, myScope } = usePeopleRows({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    location,
    loadAll: needsWholeRoster,
  });

  const { user } = useUser();
  const {
    setMyPresence,
    isPending: isSettingPresence,
    myUuid,
    isOnCall,
  } = useMyPresenceControl();
  const { features } = useCompanyFeatures();

  /* The same tree the server reads on these routes — see the note at the top
     of the file. Hiding a button here only saves somebody a refused request. */
  const userAccess = features?.plan_features?.account_setting?.access?.USER?.action;
  /* The Activity page is a report, so the button follows the reports
     permission the Reports pages are guarded with, not the raw role string. */
  const canViewActivity = Boolean(features?.plan_features?.reports?.IS_SHOW);
  const canEdit = Boolean(userAccess?.edit);
  const canAssignCallerId = Boolean(
    features?.plan_features?.virtual_numbers?.action?.assign_number,
  );

  /* Rank, not a string test. A plan permission says the feature exists on the
     account; it says nothing about who you may point it at. `outranks` answers
     that one way for every action on this screen -- see lib/role-rank.ts. */
  const outranks = (row: PersonRow) => mayActOn(user?.user_info, row.raw);

  /* Trial accounts and people without the add permission don't get an invite
     button that would fail. */
  const canInvite = Boolean(userAccess?.add) && user?.company_info?.is_trial !== 'Y';
  /* Sending an invite again is the same permission as sending it the first
     time. The server refuses it for anybody who has already accepted. */
  const canResendInvite = Boolean(userAccess?.add);
  const canDelete = Boolean(userAccess?.delete);

  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<PersonRow | null>(null);

  /* Before anybody is removed, find what still points at them — a queue they
     are the last agent on, a menu key, a number forwarded to their extension.
     Only one page of the roster is on screen now, and "is this the last
     administrator?" needs everybody, so the check fetches its own list. */
  const removal = useRemovalImpact((deleting?.raw ?? null) as any, Boolean(deleting));
  const [unassigning, setUnassigning] = useState<PersonRow | null>(null);

  const { mutate: removePerson, isPending: isDeletingPerson } = useMutation({
    mutationKey: ['deleteMember'],
    mutationFn: deleteMember,
    onSuccess: ({ data }: any) => {
      queryClient.invalidateQueries({ queryKey: ['fetchUsersList'] });
      queryClient.invalidateQueries({ queryKey: ['directoryPeople'] });
      invalidateGlobalUsersDirectory(queryClient);
      handleAlert({ text: data?.data?.message || 'Person removed', type: 'success' });
      setDeleting(null);
    },
  });

  /* Suspend / reactivate. The server decides who may (an administrator,
     never yourself, never the account owner); these only hide the buttons
     from people it would refuse. Every failed request is toasted by the API
     client, so there is no onError here. */
  const [suspending, setSuspending] = useState<PersonRow | null>(null);
  const [reactivating, setReactivating] = useState<PersonRow | null>(null);
  const afterStateChange = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ['directoryPersonStates'] });
    queryClient.invalidateQueries({ queryKey: ['directoryPeople'] });
    queryClient.invalidateQueries({ queryKey: ['fetchUsersList'] });
    handleAlert({ text: message, type: 'success' });
  };
  const { mutate: suspendPerson, isPending: isSuspending } = useMutation({
    mutationKey: ['suspendMember'],
    mutationFn: suspendMember,
    onSuccess: ({ data }: any) => {
      afterStateChange(data?.data?.message || 'Person suspended');
      setSuspending(null);
    },
  });
  const { mutate: reactivatePerson, isPending: isReactivating } = useMutation({
    mutationKey: ['reactivateMember'],
    mutationFn: reactivateMember,
    onSuccess: ({ data }: any) => {
      afterStateChange(data?.data?.message || 'Person reactivated');
      setReactivating(null);
    },
  });

  /* Send the invite link again to somebody who has not accepted it yet. The
     server makes a new link and the old one stops working. */
  const {
    mutate: resendInviteTo,
    isPending: isResendingInvite,
    variables: resendingUuid,
  } = useMutation({
    mutationKey: ['resendInvite'],
    mutationFn: (uuid: string) => resendInvite({ user_uuid: uuid }),
    onSuccess: () => {
      handleAlert({ text: 'Invite sent again. The link works for 3 days.', type: 'success' });
    },
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.message || 'The invite could not be sent. Please try again.',
        type: 'error',
      });
    },
  });

  const { mutate: removeCallerId, isPending: isUnassigning } = useMutation({
    mutationFn: removeAssignNumber,
    onSuccess: (data: any) => {
      invalidateNumberLists(queryClient);
      queryClient.invalidateQueries({ queryKey: ['directoryPeople'] });
      handleAlert({
        text: data?.data?.data?.message || 'Caller ID removed',
        type: 'success',
      });
      setUnassigning(null);
    },
  });

  /* What the caller's admin scope refuses on this row: `edit` for Edit,
     `identity` for Change role / Suspend / Reactivate / Remove. Each is the
     reason to show, or null when the action is allowed. Call, chat, video and
     favourite are not administration and are never locked. */
  /* Your own row is never locked by scope: the server exempts self, and Profile
     is where you edit yourself anyway. Everyone else is judged against reach. */
  const locksOn = (row: PersonRow) =>
    row.uuid === user?.uuid ? { edit: null, identity: null } : locksFor(myScope, row);

  /* Anyone with the edit permission may change a role, except the owner's —
     and only for somebody they outrank: `row.role !== 'ADMIN'` alone reads
     the label, so an administrator on a custom role named anything else
     passed it. The role-change dialog refuses the owner role too. */
  const canChangeRoleOf = (row: PersonRow) =>
    canEdit && outranks(row) && String(row.role || '').toUpperCase() !== 'ADMIN';

  /* Same shape as Remove: the delete permission, never yourself, never the
     owner. Only once the state is known — a null state means the states
     request has not answered, and a button that acts on a guess is worse
     than none. */
  const canSuspendOf = (row: PersonRow) =>
    canDelete &&
    row.uuid !== myUuid &&
    outranks(row) &&
    String(row.role || '').toUpperCase() !== 'ADMIN' &&
    row.state !== null;

  /* People, or the people removed in the last 72 hours. */
  const [tab, setTab] = useState<'people' | 'removed'>('people');

  const [changingRole, setChangingRole] = useState<PersonRow | null>(null);
  const [assigningCallerId, setAssigningCallerId] = useState<PersonRow | null>(null);
  const [inviting, setInviting] = useState(false);

  const { isFavourite, toggleFavourite } = useDirectoryFavourites();
  const [open, setOpen] = useState<PersonRow | null>(null);
  const [editing, setEditing] = useState<PersonRow | null>(null);

  const [personForm, setPersonForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', site: '', extension: '',
  });

  const openPerson = (row: PersonRow) => {
    setOpen(row);
    setPersonForm({
      first_name: row.raw?.first_name || row.name.split(' ')[0] || '',
      last_name: row.raw?.last_name || row.name.split(' ').slice(1).join(' ') || '',
      email: row.email || '',
      phone: row.phone || '',
      site: row.location || '',
      extension: row.extension || '',
    });
  };

  const { mutate: savePerson, isPending: isSavingPerson } = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      updateMemberForwading({ userID: open?.uuid, uuid: open?.uuid, ...payload }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['directoryPeople'] });
      invalidateGlobalUsersDirectory(queryClient);
      handleAlert({ text: data?.data?.data?.message || 'Saved', type: 'success' });
      setOpen(null);
    },
  });

  const departments = useMemo(() => {
    const found = new Set<string>();
    rows.forEach((row) => row.department !== '—' && found.add(row.department));
    return ['All', ...Array.from(found).sort()];
  }, [rows]);

  /* Every location the company has, not just the ones on this page — otherwise
     picking one would make the others vanish from the list. */
  const locations = useMemo(() => ['All', ...locationNames], [locationNames]);

  const presences = useMemo(() => {
    const found = new Set<string>();
    rows.forEach((row) => found.add(row.presence));
    return ['Any', ...Array.from(found).sort()];
  }, [rows]);

  /* Search and location went to the server. Groups, Presence and Status are
     applied here — across the WHOLE roster, because `needsWholeRoster` had the
     hook fetch every page as soon as one of them was picked. */
  const statusFilter = stateOfStatusFilter(status);
  const matching = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (department !== 'All' && row.department !== department) return false;
      if (presence !== 'Any' && row.presence !== presence) return false;
      if (statusFilter && row.state !== statusFilter) return false;
      return true;
    });
    return sort ? [...filtered].sort(compareBy(sort.key, sort.desc)) : filtered;
  }, [rows, department, presence, statusFilter, sort]);

  /* When the whole roster is in hand the server's paging no longer applies, so
     the page is cut here; otherwise the server already sent one page. */
  const visible = useMemo(
    () =>
      needsWholeRoster ? matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : matching,
    [matching, needsWholeRoster, page],
  );

  const shownTotal = needsWholeRoster ? matching.length : total;
  const shownTotalPages = needsWholeRoster
    ? Math.max(1, Math.ceil(matching.length / PAGE_SIZE))
    : totalPages;

  /* A filter or a sort can leave the current page past the end of the result. */
  useEffect(() => {
    if (page > shownTotalPages) setPage(shownTotalPages);
  }, [page, shownTotalPages]);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    setSort((current) =>
      current?.key === key ? (current.desc ? null : { key, desc: true }) : { key, desc: false },
    );
  };

  /* ── working on several people at once ──────────────────────────────
     Every bulk action is the single-person action repeated, because that is
     what the API offers: there is no bulk endpoint, so the screen must not
     pretend one call is happening. Each person is reported on, and a refusal
     for one (the server will not let anybody suspend themselves, or remove the
     last administrator) does not stop the rest. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const canBulk = canDelete || canEdit;
  const selectedRows = useMemo(
    () => visible.filter((row) => selected.has(row.uuid)),
    [visible, selected],
  );
  const allOnPageSelected = visible.length > 0 && visible.every((row) => selected.has(row.uuid));
  const togglePage = () =>
    setSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) visible.forEach((row) => next.delete(row.uuid));
      else visible.forEach((row) => next.add(row.uuid));
      return next;
    });
  const toggleOne = (uuid: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  /* A filter or a page change must not leave invisible people selected. */
  useEffect(() => {
    setSelected(new Set());
  }, [department, presence, status, location, debouncedSearch, page]);

  const [bulkAction, setBulkAction] = useState<'delete' | 'suspend' | 'role' | null>(null);
  const [bulkRole, setBulkRole] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  /* Roles have a real bulk endpoint, so that one is a single call. Remove and
     suspend do not, so they are the single-person call repeated. */
  const { data: bulkRoleOptions = [] } = useQuery({
    queryKey: ['useRolesList', false],
    queryFn: () => getRoleList(),
    select: (response: any) =>
      (response?.data?.data?.result?.rows || []).map((role: any) => ({
        label: roleDisplayName(role?.name),
        value: String(role?.type || '').toLowerCase() === 'custom' ? role?.uuid : role?.role_uuid,
      })),
    enabled: bulkAction === 'role',
  });

  const runBulk = async () => {
    if (!bulkAction || !selectedRows.length) return;
    setBulkBusy(true);
    let done = 0;
    const failed: string[] = [];

    if (bulkAction === 'role') {
      if (!bulkRole) {
        setBulkBusy(false);
        return;
      }
      try {
        await assignRoleBulkUsers({
          role_uuid: bulkRole,
          users: selectedRows.map((row) => row.uuid),
        });
        done = selectedRows.length;
      } catch {
        failed.push(...selectedRows.map((row) => row.name));
      }
    } else {
      for (const row of selectedRows) {
        try {
          if (bulkAction === 'delete') await deleteMember(row.uuid);
          else await suspendMember(row.uuid);
          done += 1;
        } catch {
          failed.push(row.name);
        }
      }
    }

    setBulkBusy(false);
    setBulkAction(null);
    setBulkRole('');
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ['directoryPeople'] });
    queryClient.invalidateQueries({ queryKey: ['directoryPersonStates'] });
    queryClient.invalidateQueries({ queryKey: ['fetchUsersList'] });
    invalidateGlobalUsersDirectory(queryClient);
    handleAlert({
      text: failed.length
        ? `${done} done, ${failed.length} refused by the server: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`
        : `${done} ${done === 1 ? 'person' : 'people'} updated`,
      type: failed.length ? 'error' : 'success',
    });
  };

  const onQueue = rows.filter((row) => row.tone === 'good').length;

  const pageFirst = shownTotal ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageLast = Math.min(page * PAGE_SIZE, shownTotal);

  /* Take the roster away as a spreadsheet.
   *
   * The platform has no people export of its own, so this is built here. It
   * used to hold whatever was on screen — one page of fifty — which is worse
   * than no export for anyone with a real company. Now it walks every page of
   * the list endpoint first, so "Export all" means all of them; the filters
   * that are on still apply, and the button says which of the two it is.
   *
   * The file starts with a byte-order mark because otherwise a spreadsheet
   * opening it on Windows reads the accents in people's names as rubbish. */
  const writeCsv = (exportRows: PersonRow[]) => {
    const csv = buildRosterCsv(
      exportRows.map((row) =>
        toExportRow(
          row.raw,
          row.department && row.department !== '—' ? row.department.split(', ') : [],
        ),
      ),
    );
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = rosterFileName(
      user?.company_info?.company_name || user?.user_info?.company_name,
      new Date().toISOString(),
    );
    link.click();
    URL.revokeObjectURL(url);
  };

  /* Export asks the hook for the whole company first, then writes what it
     shaped — one row-shaping path, so the file carries the same groups,
     numbers and roles the table does. */
  const exportRoster = () => {
    if (needsWholeRoster || shownTotalPages <= 1) {
      writeCsv(matching);
      return;
    }
    setExportAll(true);
  };

  useEffect(() => {
    if (!exportAll || isFetching) return;
    writeCsv(matching);
    setExportAll(false);
  }, [exportAll, isFetching, matching]);

  return (
    <>
      <div className="gp-people">
      <DirectoryPage
        title="People"
        description="Everyone in the organisation, with live presence, skills and one-click contact."
        actions={
          <>
            <button
              type="button"
              className="btn ghost"
              onClick={() => navigate('/directory/groups')}
            >
              <Ic n="users" />
              Groups
            </button>
            {/* The count is in the label on purpose: filters and paging are
                on this page, and a button that just says "Export" invites
                somebody to file one page as the whole company. */}
            <button
              type="button"
              className="btn ghost"
              disabled={!visible.length || exportAll}
              title={
                needsWholeRoster || shownTotalPages <= 1
                  ? `Download all ${matching.length} matching people as a spreadsheet`
                  : `Downloads every one of the ${shownTotal} people this filter matches`
              }
              onClick={exportRoster}
            >
              <Ic n="dl" />
              {exportAll ? 'Preparing…' : `Export all ${shownTotal}`}
            </button>
            {canInvite ? (
              <button type="button" className="btn primary" onClick={() => setInviting(true)}>
                <Ic n="plus" />
                Invite person
              </button>
            ) : null}
          </>
        }
        filters={
          <>
            <FilterChip
              label="Groups"
              value={department}
              options={departments}
              onChange={setDepartment}
            />
            <FilterChip
              label="Location"
              value={location}
              options={locations}
              onChange={setLocation}
            />
            <FilterChip
              label="Presence"
              value={presence}
              options={presences}
              onChange={setPresence}
            />
            <FilterChip
              label="Status"
              value={status}
              options={STATUS_FILTER_OPTIONS}
              onChange={setStatus}
            />
            <SearchChip value={search} onChange={setSearch} placeholder="Search people" />
            <span className="fchip" style={{ marginLeft: 'auto' }}>
              {total ? (
                <>
                  Showing <span className="num">{pageFirst}</span>–
                  <span className="num">{pageLast}</span> of <span className="num">{total}</span>
                </>
              ) : (
                'Nobody to show'
              )}
            </span>
            <span className="fchip live">
              <span className="num">{onQueue}</span> available on this page
            </span>
          </>
        }
      >
        {/* Two views of the same roster: the people here now, and the people
            removed in the last 72 hours who can still be brought back. */}
        <div
          className="flex items-center gap-1"
          role="tablist"
          aria-label="People or removed people"
          style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'people'}
            className={tab === 'people' ? 'mini solid' : 'mini'}
            onClick={() => setTab('people')}
          >
            <Ic n="users" size={12} />
            People
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'removed'}
            className={tab === 'removed' ? 'mini solid' : 'mini'}
            title="People removed in the last 72 hours, who can still be restored"
            onClick={() => setTab('removed')}
          >
            <Ic n="trash" size={12} />
            Removed
          </button>
        </div>

        {/* What can be done to several people at once. It appears only when
            something is selected, and it names the number so nobody acts on a
            selection they have forgotten about. */}
        {tab === 'people' && canBulk && selected.size ? (
          <div className="mcm-bulkbar">
            <span className="num" style={{ fontWeight: 800 }}>
              {selected.size} selected
            </span>
            {canEdit ? (
              <button type="button" className="mini" onClick={() => setBulkAction('role')}>
                Change role
              </button>
            ) : null}
            {canEdit ? (
              <button type="button" className="mini" onClick={() => setBulkAction('suspend')}>
                Suspend
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" className="mini danger" onClick={() => setBulkAction('delete')}>
                Remove
              </button>
            ) : null}
            <button
              type="button"
              className="mini"
              style={{ marginLeft: 'auto' }}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </div>
        ) : null}

        {tab === 'removed' ? (
          <RemovedPeople canRestore={canDelete} />
        ) : (
        <table>
          <thead>
            <tr>
              {canBulk ? (
                <th style={{ width: 34 }}>
                  <input
                    type="checkbox"
                    aria-label={allOnPageSelected ? 'Clear selection' : 'Select everyone on this page'}
                    checked={allOnPageSelected}
                    onChange={togglePage}
                  />
                </th>
              ) : null}
              <SortHeader sortKey="name" label="Person" sort={sort} onSort={toggleSort} />
              <SortHeader sortKey="roleLabel" label="Role" sort={sort} onSort={toggleSort} />
              <SortHeader sortKey="state" label="Status" sort={sort} onSort={toggleSort} />
              <SortHeader sortKey="department" label="Groups" sort={sort} onSort={toggleSort} />
              <SortHeader sortKey="location" label="Location" sort={sort} onSort={toggleSort} />
              <th>Numbers</th>
              <th>Queues</th>
              <th>Skills</th>
              <SortHeader sortKey="presence" label="Presence" sort={sort} onSort={toggleSort} />
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <EmptyRow span={canBulk ? 11 : 10} message="Loading the roster…" />
            ) : visible.length ? (
              visible.map((row: PersonRow) => (
                <tr key={row.uuid} className="gp-person-row" onClick={() => openPerson(row)}>
                  {canBulk ? (
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name}`}
                        checked={selected.has(row.uuid)}
                        onChange={() => toggleOne(row.uuid)}
                      />
                    </td>
                  ) : null}
                  <td>
                    <span className="flex items-center gap-2.5">
                      <CustomAvatar name={row.name} image={row.image} size="30" />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 700, display: 'block' }}>{row.name}</span>
                        {row.jobTitle ? (
                          <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'block' }}>
                            {row.jobTitle}
                          </span>
                        ) : null}
                        {row.email ? (
                          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{row.email}</span>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  {/* The friendly name, never the stored MANAGER/AGENT string;
                      the same map every other role screen reads. The suffix is
                      the administrator's effective reach — derived from the role
                      when nothing is stored: "Location admin · Mumbai",
                      "Group admin · Sales, Support", "Group admin · no groups yet". */}
                  <td>
                    {row.roleLabel}
                    {row.scopeSuffix ? (
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}> · {row.scopeSuffix}</span>
                    ) : null}
                  </td>
                  {/* The account's state, not their presence. The note on the
                      pill says exactly what the state blocks today. Nothing is
                      shown until the states request has answered. */}
                  <td>
                    {row.state ? (
                      <span
                        className={TONE_CLASS[PERSON_STATE_LABEL[row.state].tone] || 'tag neu'}
                        title={PERSON_STATE_LABEL[row.state].note}
                      >
                        {PERSON_STATE_LABEL[row.state].label}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-4)' }}>—</span>
                    )}
                  </td>
                  <td>{row.department}</td>
                  <td>
                    <span style={{ display: 'block' }}>{row.location}</span>
                    {row.locationPlace ? (
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                        {row.locationPlace}
                      </span>
                    ) : null}
                  </td>
                  {/* Extension is the internal number, caller ID the outbound
                      one people outside the org actually see. Both belong here;
                      the personal phone stays in the drawer. */}
                  <td className="num">
                    <span style={{ display: 'block' }}>{row.extension || '—'}</span>
                    {row.callerId ? (
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{row.callerId}</span>
                    ) : null}
                  </td>
                  <td>
                    {row.queues.length ? (
                      row.queues.join(', ')
                    ) : (
                      <span style={{ color: 'var(--ink-4)' }}>—</span>
                    )}
                  </td>
                  {/* Rated skills from the Skills feature, best first, on the
                      same one-to-five scale the drawer's Skills tab uses. */}
                  <td>
                    {row.skills.length ? (
                      <span className="flex flex-wrap items-center gap-1">
                        {row.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="tag neu"
                            title={`${skill.name}: ${skill.stars} of ${SKILL_STARS_MAX} stars`}
                          >
                            {skill.name} {skill.stars}/{SKILL_STARS_MAX}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-4)' }}>—</span>
                    )}
                  </td>
                  {/* Your own row gets a control; everyone else's shows only the
                      live state. Availability is yours to set and nobody else's,
                      so there is nothing to display or imply on their rows. */}
                  <td onClick={(event) => event.stopPropagation()}>
                    <span className={TONE_CLASS[row.tone] || 'tag neu'}>{row.presence}</span>
                    {row.uuid === myUuid ? (
                      <select
                        className="mcm-presence-set"
                        aria-label="Set my availability"
                        value={presenceValueOf(row.availability)}
        disabled={isSettingPresence || isOnCall}
        title={isOnCall ? 'You cannot change this during a call' : undefined}
                        onChange={(event) => setMyPresence(event.target.value)}
                      >
                        {/* Each option carries what it actually does. Busy is the one people
                            read wrong - it holds back colleagues only, and a customer still
                            rings through - so the control says so rather than leaving the word
                            to imply something the switch does not do. */}
                        {PRESENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} title={option.description}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    {/* Three actions on the row, the rest behind the menu. Ten
                        buttons wrapped onto a second line and made every row
                        taller, and the three people actually reach for -- call,
                        message, video -- were lost among the admin ones. */}
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        className="mini"
                        title={`Call ${row.name}`}
                        aria-label={`Call ${row.name}`}
                        disabled={!row.extension}
                        onClick={() =>
                          row.extension && dial(row.extension, { forceRefreshContactInfo: true })
                        }
                      >
                        <Ic n="phone" size={16} />
                      </button>
                      <button
                        type="button"
                        className="mini"
                        title={`Message ${row.name}`}
                        aria-label={`Message ${row.name}`}
                        onClick={() => navigate(`/messenger?chatId=${row.uuid}&chatType=chat`)}
                      >
                        <Ic n="chat" size={16} />
                      </button>
                      <button
                        type="button"
                        className="mini"
                        title={`Start video with ${row.name}`}
                        aria-label={`Start video with ${row.name}`}
                        disabled={isStarting}
                        onClick={() =>
                          startVideoCall(
                            { user_uuid: row.uuid, name: row.name, email: row.email },
                            `Call with ${row.name}`,
                          )
                        }
                      >
                        <Ic n="video" size={16} />
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="mini"
                            title={`More for ${row.name}`}
                            aria-label={`More actions for ${row.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-52">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => toggleFavourite('person', row.uuid)}
                          >
                            <Star
                              className="h-4 w-4"
                              fill={isFavourite('person', row.uuid) ? 'currentColor' : 'none'}
                            />
                            {isFavourite('person', row.uuid)
                              ? 'Remove from favourites'
                              : 'Add to favourites'}
                          </DropdownMenuItem>
                          {/* Scope locks (lib/admin-scope) grey an item out with
                              the reason as its tooltip rather than hiding it. */}
                          {canEdit ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              title={locksOn(row).edit || undefined}
                              disabled={Boolean(locksOn(row).edit)}
                              onClick={() => setEditing(row)}
                            >
                              <Pencil className="h-4 w-4" /> Edit person
                            </DropdownMenuItem>
                          ) : null}
                          {canResendInvite && row.state === 'PENDING' ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              disabled={isResendingInvite && resendingUuid === row.uuid}
                              onClick={() => resendInviteTo(row.uuid)}
                            >
                              <Ic n="send" size={14} /> Resend invite
                            </DropdownMenuItem>
                          ) : null}
                          {canViewActivity ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => navigate(`/activity/${row.uuid}`)}
                            >
                              <History className="h-4 w-4" /> View activity
                            </DropdownMenuItem>
                          ) : null}
                          {canChangeRoleOf(row) ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              title={locksOn(row).identity || undefined}
                              disabled={Boolean(locksOn(row).identity)}
                              onClick={() => setChangingRole(row)}
                            >
                              <ShieldCheck className="h-4 w-4" /> Change role
                            </DropdownMenuItem>
                          ) : null}
                          {canSuspendOf(row) && row.state !== 'SUSPENDED' ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              title={locksOn(row).identity || undefined}
                              disabled={Boolean(locksOn(row).identity)}
                              onClick={() => setSuspending(row)}
                            >
                              <Ic n="pause" size={14} /> Suspend
                            </DropdownMenuItem>
                          ) : null}
                          {canSuspendOf(row) && row.state === 'SUSPENDED' ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              title={locksOn(row).identity || undefined}
                              disabled={Boolean(locksOn(row).identity)}
                              onClick={() => setReactivating(row)}
                            >
                              <Ic n="play" size={14} /> Reactivate
                            </DropdownMenuItem>
                          ) : null}
                          {canAssignCallerId && outranks(row) ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setAssigningCallerId(row)}
                            >
                              <PhoneOutgoing className="h-4 w-4" /> Assign caller ID
                            </DropdownMenuItem>
                          ) : null}
                          {canAssignCallerId && row.callerId && outranks(row) ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setUnassigning(row)}
                            >
                              <PhoneOff className="h-4 w-4" /> Remove caller ID
                            </DropdownMenuItem>
                          ) : null}
                          {/* Anyone with the delete permission can remove a person
                              they outrank; never yourself. The server refuses to
                              delete the owner whoever asks. Browser-side gate. */}
                          {canDelete && row.uuid !== myUuid && outranks(row) ? (
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              title={locksOn(row).identity || undefined}
                              disabled={Boolean(locksOn(row).identity)}
                              onClick={() => setDeleting(row)}
                            >
                              <Trash2 className="h-4 w-4" /> Remove person
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow
                span={canBulk ? 11 : 10}
                message={
                  rows.length
                    ? /* The filters now run over the whole company, so this
                         really does mean nobody — not "nobody on this page". */
                      'Nobody in the company matches those filters.'
                    : debouncedSearch.trim() || location !== 'All'
                      ? 'Nobody matches that search.'
                      : 'No people yet.'
                }
              />
            )}
          </tbody>
        </table>
        )}

        {/* One page at a time. The page you are on, out of how many, with the
            two buttons that move it; nothing else, because nothing else is
            needed to get to any person. */}
        {tab === 'people' && totalPages > 1 ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2"
            style={{ padding: '10px 12px', borderTop: '1px solid var(--line)' }}
          >
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Page {page} of {totalPages}
              {isFetching ? ' · loading…' : ''}
            </span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                className="btn ghost"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </button>
            </span>
          </div>
        ) : null}

        <Dialog open={Boolean(open)} onOpenChange={(next) => !next && setOpen(null)}>
          <DialogContent className="sm:max-w-[560px] w-[calc(100vw-32px)] p-0 gap-0 rounded-2xl overflow-hidden border border-[rgba(225,200,165,0.5)]">
            {open && (
              <div className="flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3.5 px-6 py-5 border-b border-gray-100 bg-[rgba(251,249,246,0.6)]">
                  <CustomAvatar name={open.name} image={open.image} size="48" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-bold text-gray-900 truncate">{open.name}</div>
                    <div className="text-[13px] text-gray-500 mt-0.5">{open.roleLabel}</div>
                    {/* The account's state, not their presence — what it blocks
                        today is on the note. */}
                    {open.state ? (
                      <div className="text-[11px] text-gray-400 mt-0.5" title={PERSON_STATE_LABEL[open.state].note}>
                        {PERSON_STATE_LABEL[open.state].label} · {PERSON_STATE_LABEL[open.state].note}
                      </div>
                    ) : null}
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    open.tone === 'good' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    open.tone === 'busy' ? 'bg-red-50 text-red-600 border border-red-200' :
                    open.tone === 'warn' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      open.tone === 'good' ? 'bg-emerald-500' :
                      open.tone === 'busy' ? 'bg-red-500' :
                      open.tone === 'warn' ? 'bg-amber-500' :
                      'bg-gray-400'
                    }`} />
                    {open.presence}
                  </span>
                </div>

                {/* Form fields */}
                <div className="px-6 py-5 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                      <input className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors" value={personForm.first_name} onChange={(e) => setPersonForm((p) => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                      <input className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors" value={personForm.last_name} onChange={(e) => setPersonForm((p) => ({ ...p, last_name: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                      <input className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors" type="email" value={personForm.email} onChange={(e) => setPersonForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                      <div className="[&_.react-tel-input_.form-control]:!h-10 [&_.react-tel-input_.form-control]:!rounded-lg [&_.react-tel-input_.form-control]:!border-gray-200 [&_.react-tel-input_.form-control]:!text-sm [&_.react-tel-input_.form-control]:!w-full [&_.react-tel-input_.flag-dropdown]:!rounded-l-lg [&_.react-tel-input_.flag-dropdown]:!border-gray-200">
                        <PhoneInput country={'in'} onlyCountries={['in']} disableDropdown value={personForm.phone} onChange={(value) => setPersonForm((p) => ({ ...p, phone: `+${value.startsWith('91') ? value : '91'}` }))} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site</label>
                      <input className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 cursor-not-allowed" value={personForm.site} disabled />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extension</label>
                      <input className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 cursor-not-allowed" value={personForm.extension} disabled />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-gray-100 mt-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Queues</span>
                    <span className="text-sm text-gray-700">{open.queues.length ? open.queues.join(', ') : '—'}</span>
                  </div>
                  {/* Rated skills from the Skills feature, best first, on the
                      same one-to-five scale the drawer's Skills tab uses. */}
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Skills</span>
                    <span className="text-sm text-gray-700">
                      {open.skills.length
                        ? open.skills.map((skill) => `${skill.name} ${skill.stars}/${SKILL_STARS_MAX}`).join(' · ')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Caller ID</span>
                    {open.callerId ? (
                      <span className="text-sm font-medium text-gray-900">{open.callerId}</span>
                    ) : canAssignCallerId ? (
                      <button type="button" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors" onClick={() => setAssigningCallerId(open)}>
                        <Ic n="vm" size={14} />
                        Assign Number
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">Not assigned</span>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="px-6 pb-5 flex items-center gap-3">
                  <button
                    type="button"
                    className="group flex-1 flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-primary hover:border-primary hover:text-white active:scale-[0.98] transition-all duration-150 disabled:opacity-40"
                    disabled={!open.extension}
                    onClick={() => open.extension && dial(open.extension, { forceRefreshContactInfo: true })}
                  >
                    <span className="inline-flex [&_svg]:fill-white [&_svg]:stroke-gray-700 [&_svg]:[stroke-width:1.5px] group-hover:[&_svg]:stroke-white"><Ic n="phone" size={16} /></span>
                    <span className="transition-colors">Call</span>
                  </button>
                  <button
                    type="button"
                    className="group flex-1 flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-primary hover:border-primary hover:text-white active:scale-[0.98] transition-all duration-150"
                    onClick={() => navigate(`/messenger?chatId=${open.uuid}&chatType=chat`)}
                  >
                    <span className="inline-flex [&_svg]:fill-white [&_svg]:stroke-gray-700 [&_svg]:[stroke-width:1.5px] group-hover:[&_svg]:stroke-white"><Ic n="chat" size={16} /></span>
                    <span className="transition-colors">Message</span>
                  </button>
                  <button
                    type="button"
                    className="group flex-1 flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-primary hover:border-primary hover:text-white active:scale-[0.98] transition-all duration-150 disabled:opacity-40"
                    disabled={isStarting}
                    onClick={() => startVideoCall({ user_uuid: open.uuid, name: open.name, email: open.email }, `Call with ${open.name}`)}
                  >
                    <span className="inline-flex [&_svg]:fill-white [&_svg]:stroke-gray-700 [&_svg]:[stroke-width:1.5px] group-hover:[&_svg]:stroke-white"><Ic n="video" size={16} /></span>
                    <span className="transition-colors">Video</span>
                  </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <button type="button" className="h-9 px-5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setOpen(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="h-9 px-5 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    title={locksOn(open).edit || undefined}
                    disabled={isSavingPerson || Boolean(locksOn(open).edit)}
                    onClick={() => savePerson({ first_name: personForm.first_name, last_name: personForm.last_name, email: personForm.email, phone: personForm.phone })}
                  >
                    {isSavingPerson ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DirectoryPage>
      </div>

      {/* The platform's own add-user flow, opened in place rather than
          bouncing to Admin — the console keeps you in Directory. */}
      {inviting && (
        <SideDrawer
          isOpen={inviting}
          title="Invite people"
          width="min(765px, 94vw)"
          isTab={false}
          handleClose={() => setInviting(false)}
          content={<AddUsers setDrawerState={() => setInviting(false)} />}
        />
      )}

      {/* Several people at once. The dialog names every one of them: the
          single-person removal shows what would break, and this cannot (it
          would be one impact check per person), so the least it can do is make
          the admin read the list before it acts. */}
      <AlertConfirm
        {...{
          apiLoading: bulkBusy,
          open: Boolean(bulkAction),
          setOpen: (value: boolean) => !value && setBulkAction(null),
          onConfirm: runBulk,
          onCancel: () => setBulkAction(null),
          onClose: () => setBulkAction(null),
          confirmBtnText:
            bulkAction === 'delete'
              ? `Remove ${selectedRows.length}`
              : bulkAction === 'suspend'
                ? `Suspend ${selectedRows.length}`
                : `Change ${selectedRows.length}`,
          closeBtnText: 'Cancel',
          confirmBtnDisabled: bulkAction === 'role' && !bulkRole,
          className: 'w-full sm:w-2/3 md:w-1/2 lg:w-2/5 p-3',
          descriptionTextComp: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 700 }}>
                {bulkAction === 'delete'
                  ? `Remove ${selectedRows.length} ${selectedRows.length === 1 ? 'person' : 'people'}?`
                  : bulkAction === 'suspend'
                    ? `Suspend ${selectedRows.length} ${selectedRows.length === 1 ? 'person' : 'people'}?`
                    : `Give ${selectedRows.length} ${selectedRows.length === 1 ? 'person' : 'people'} a new role`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                {selectedRows.map((row) => row.name).join(', ')}
              </div>
              {bulkAction === 'role' ? (
                <select
                  className="mcm-input"
                  value={bulkRole}
                  onChange={(event) => setBulkRole(event.target.value)}
                >
                  <option value="">Choose a role…</option>
                  {bulkRoleOptions.map((option: any) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
                {bulkAction === 'delete'
                  ? 'Removed people can be restored from the Removed tab for 72 hours. The server still refuses anyone it protects — the last administrator, or yourself.'
                  : bulkAction === 'suspend'
                    ? 'Suspending blocks their login immediately; their phone stops once the switch update is applied. The server refuses to suspend you or the account owner.'
                    : 'Roles cannot be changed for anyone who has not accepted their invite yet; the server refuses those.'}
              </div>
            </div>
          ),
        }}
      />

      <AlertConfirm
        {...{
          apiLoading: isDeletingPerson,
          open: Boolean(deleting),
          setOpen: (value: boolean) => !value && setDeleting(null),
          onConfirm: () => deleting?.raw?.uuid && removePerson(deleting.raw.uuid),
          onCancel: () => setDeleting(null),
          onClose: () => setDeleting(null),
          confirmBtnText: 'Remove them',
          closeBtnText: 'Cancel',
          /* Off only for the finding that cannot be undone from inside the
             product — losing your last administrator. Everything else is a
             judgement the admin is entitled to make. */
          confirmBtnDisabled: removal.blocked || removal.loading,
          className: 'w-full sm:w-2/3 md:w-1/2 lg:w-2/5 p-3',
          descriptionTextComp: (
            <RemovalWarning
              impacts={removal.impacts}
              loading={removal.loading}
              incomplete={removal.incomplete}
              name={deleting?.name || 'this person'}
            />
          ),
        }}
      />

      <AlertConfirm
        {...{
          apiLoading: isUnassigning,
          open: Boolean(unassigning),
          setOpen: (value: boolean) => !value && setUnassigning(null),
          onConfirm: () =>
            unassigning?.callerId && removeCallerId({ did_number: unassigning.callerId }),
          onCancel: () => setUnassigning(null),
          onClose: () => setUnassigning(null),
          confirmBtnText: 'Remove',
          closeBtnText: 'Cancel',
          descriptionTextComp: (
            <div className="text-md">
              Remove <strong>{unassigning?.callerId}</strong> from {unassigning?.name}? The number
              stays on the account and can be assigned again.
            </div>
          ),
        }}
      />

      <AlertConfirm
        {...{
          apiLoading: isSuspending,
          open: Boolean(suspending),
          setOpen: (value: boolean) => !value && setSuspending(null),
          onConfirm: () => suspending?.uuid && suspendPerson(suspending.uuid),
          onCancel: () => setSuspending(null),
          onClose: () => setSuspending(null),
          confirmBtnText: 'Suspend',
          closeBtnText: 'Cancel',
          descriptionTextComp: (
            <div className="text-md">
              Suspend <strong>{suspending?.name}</strong>? They are signed out everywhere at
              once and cannot sign in until you reactivate them. Their phone stops working once
              the switch update is applied. Nothing is deleted: their extension, e-mail, role and
              settings stay as they are.
            </div>
          ),
        }}
      />

      <AlertConfirm
        {...{
          apiLoading: isReactivating,
          open: Boolean(reactivating),
          setOpen: (value: boolean) => !value && setReactivating(null),
          onConfirm: () => reactivating?.uuid && reactivatePerson(reactivating.uuid),
          onCancel: () => setReactivating(null),
          onClose: () => setReactivating(null),
          confirmBtnText: 'Reactivate',
          closeBtnText: 'Cancel',
          descriptionTextComp: (
            <div className="text-md">
              Reactivate <strong>{reactivating?.name}</strong>? They can sign in again straight
              away.
            </div>
          ),
        }}
      />

      <RoleChangeModal
        open={Boolean(changingRole)}
        userData={changingRole?.raw}
        setOpen={(val: boolean) => {
          if (!val) setChangingRole(null);
        }}
      />

      {/* The Extension page normalises the key before handing the record over,
          because the modal expects `user_uuid` and the roster carries `uuid`. */}
      <AssignCallerIdModal
        open={Boolean(assigningCallerId)}
        userData={
          assigningCallerId
            ? {
                ...assigningCallerId.raw,
                user_uuid: assigningCallerId.raw?.user_uuid || assigningCallerId.raw?.uuid,
              }
            : null
        }
        onClose={() => setAssigningCallerId(null)}
      />

      {/* An explicit width matters: without one SideDrawer falls back to
          `calc(100% - 21rem)`, which is ~1660px on a wide screen — far more
          than a four-step form needs, and it buries the page behind it. */}
      {editing ? (
        <SideDrawer
          isOpen={Boolean(editing)}
          title={`Edit ${editing.name}`}
          width="min(1080px, 82vw)"
          enableResponsive
          responsiveWidth="96vw"
          responsiveBreakpoint={1024}
          handleClose={() => setEditing(null)}
          content={
            <UpdateForwarding
              drawerState
              setDrawerState={() => setEditing(null)}
              data={editing.raw}
              setTabData={() => undefined}
            />
          }
        />
      ) : null}
    </>
  );
};

export default People;
