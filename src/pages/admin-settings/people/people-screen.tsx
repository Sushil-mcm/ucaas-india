/* Admin › People — everyone in the company on ONE screen.
 *
 * Until now adding, editing, deleting and assigning numbers lived here while
 * suspending, restoring, exporting and bulk role changes lived under
 * Directory › People. An administrator had to know which screen held which
 * verb. Both reference products keep one Users page with tabs and bulk
 * actions; this screen does the same and reuses the pieces that already
 * worked: the Directory's row engine (usePeopleRows), its removed-people tab
 * (RemovedPeople), and the add / edit / role / number drawers and modals of
 * the old Admin screen.
 *
 * Tabs: Active · Pending (invites, with expiry) · Removed (72-hour restore) ·
 * Reserved numbers (unassigned and released numbers, so a leaver's number is
 * visible instead of lost). New columns: last signed in. New verbs: sign out
 * everywhere, bulk suspend / remove / sign-out. */
import { FC, useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SearchLine } from '@/assets/icons';
import { ChevronDown, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SideDrawer from '@/components/custom/side-drawer';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomSelect from '@/components/custom/custom-select';
import CustomTooltip from '@/components/custom/custom-tooltip';
import useDebounce from '@/hooks/use-debounce';
import { useUser } from '@/hooks/use-user';
import { useCompanyFeatures } from '@/hooks/rbac';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { buildRosterCsv } from '@/lib/user-roster-export';
import {
  allNumbersList,
  assignRoleBulkUsers,
  deleteMember,
  getRoleList,
  pendingInvites,
  reactivateMember,
  releasedNumbersList,
  resendInvite,
  signOutEverywhere,
  suspendMember,
} from '@/services/api';
import usePeopleRows, {
  PERSON_STATE_LABEL,
  PersonRow,
  ROSTER_LIMIT,
} from '@/pages/directory/people-rows';
import RemovedPeople from '@/pages/directory/people-removed';
import { AdminHeadActions, useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import AddUsers from './add-users';
/* The dialog shell these classes come from - see the Add people dialog
   below. Imported here so this screen does not depend on another page
   having pulled the stylesheet in. */
import '@/pages/directory/groups-glass.css';
import UpdateForwarding from './update-forwarding';
import RoleChangeModal from './role-change-modal';
import AssignCallerIdModal from './add-users/assign-caller-id-modal';
import MultipleAssignNumber from './add-users/multiple-assign-number';
import {
  LAST_SEEN_FILTERS,
  LastSeenFilter,
  lastSeenText,
  matchesLastSeen,
  pendingInviteMap,
  personTab,
  PersonTab,
} from '@/lib/people-screen';

type BulkAction = 'role' | 'suspend' | 'remove' | 'signout';

/* The "everything" row of each filter, and the whole last-seen list. The
   label carries the filter's name - "Location: All" - so a closed field
   still says what it filters once the list is shut. */
const LOCATION_ALL = [{ label: 'Location: All', value: 'All' }];
const ROLE_ALL = [{ label: 'Role: All', value: 'All' }];
const LAST_SEEN_OPTIONS = LAST_SEEN_FILTERS.map((f) => ({
  label: `Last signed in: ${f.label}`,
  value: f.key,
}));

const TABS: Array<{ key: PersonTab; label: string }> = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'removed', label: 'Removed' },
  { key: 'reserved', label: 'Reserved numbers' },
];

const PeopleScreen: FC = () => {
  const queryClient: any = useQueryClient();
  const { user } = useUser();
  const myRole = String(user?.user_info?.role || '').toUpperCase();
  const isOwner = myRole === 'ADMIN';
  const isAdministrator = ['ADMIN', 'MANAGER', 'SUB-ADMIN'].includes(myRole);
  const myUuid = String(user?.uuid || user?.user_info?.uuid || '');
  const { features } = useCompanyFeatures();
  const virtualNumbersAccess = (features as any)?.plan_features?.virtual_numbers?.action;

  /* The head prints the title; this is the line it shows beside it. */
  useSetAdminPageMeta({
    description:
      'Everyone in the company. Add, invite, edit, suspend, remove and restore people here; the Directory only looks them up.',
  });

  const [tab, setTab] = useState<PersonTab>('active');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [location, setLocation] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [lastSeen, setLastSeen] = useState<LastSeenFilter>('any');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkRole, setBulkRole] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  /* Drawers and modals, exactly as the old Admin screen wired them. */
  const [drawerState, setDrawerState] = useState<any>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [multipleAssignUsers, setMultipleAssignUsers] = useState<any[]>([]);
  const [showMultipleAssignModal, setShowMultipleAssignModal] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'signout' | 'suspend'; row: PersonRow } | null>(null);

  /* The whole roster: filters on state, role and last sign-in cannot be
     answered by the server (see PeopleQuery), so the screen holds the
     company in hand, as the Directory already does. */
  const { rows, isLoading, locationNames } = usePeopleRows({
    page: 1,
    limit: ROSTER_LIMIT,
    search: debouncedSearch || undefined,
    location: location === 'All' ? undefined : location,
  });

  const { data: invitesData } = useQuery({
    queryKey: ['pendingInvites'],
    queryFn: pendingInvites,
    staleTime: 60 * 1000,
  });
  const invites = useMemo(() => pendingInviteMap(invitesData?.data?.data?.result?.pending), [invitesData]);

  const { data: roleOptions = [] } = useQuery({
    queryKey: ['roleList', 'people-screen'],
    queryFn: async () => {
      const res: any = await getRoleList();
      const list = res?.data?.data?.result?.rows || [];
      return (Array.isArray(list) ? list : []).map((r: any) => ({ uuid: String(r.uuid), name: String(r.name || r.label || '') }));
    },
    enabled: isAdministrator,
    staleTime: 5 * 60 * 1000,
  });

  const { data: reserved = [], isPending: isReservedLoading } = useQuery({
    queryKey: ['peopleReservedNumbers'],
    queryFn: async () => {
      const [all, released]: any[] = await Promise.all([allNumbersList({ page: 1, limit: 500 }), releasedNumbersList({})]);
      const numbers = (all?.data?.data?.result?.rows || all?.data?.data?.rows || all?.data?.data || []) as any[];
      const unassigned = (Array.isArray(numbers) ? numbers : [])
        .filter((n) => !n?.user_uuid && !n?.assigned_user && !n?.assigned_to)
        .map((n) => ({ number: String(n?.did_number || ''), kind: 'unassigned', since: n?.updated_at || n?.buy_date || '', note: n?.did_name || '' }));
      const rel = (released?.data?.data?.result?.rows || released?.data?.data?.rows || released?.data?.data || []) as any[];
      const releasedRows = (Array.isArray(rel) ? rel : []).map((n) => ({ number: String(n?.did_number || ''), kind: 'released', since: n?.deleted_at || n?.updated_at || '', note: n?.user_name || n?.did_name || '' }));
      return [...unassigned, ...releasedRows].filter((n) => n.number);
    },
    enabled: tab === 'reserved',
  });

  const invalidateAll = useCallback(() => {
    ['directoryPeople', 'directoryPersonStates', 'fetchUsersList', 'pendingInvites', 'listDeletedMembers'].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    );
    invalidateGlobalUsersDirectory(queryClient);
  }, [queryClient]);

  const { mutate: doResend, isPending: isResending } = useMutation({
    mutationFn: resendInvite,
    onSuccess: () => { handleAlert({ type: 'success', text: 'Invite sent again.' }); invalidateAll(); },
    onError: (e: any) => handleAlert({ type: 'error', text: e?.response?.data?.message || 'Could not resend the invite.' }),
  });
  const { mutate: doRemove, isPending: isRemoving } = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => { handleAlert({ type: 'success', text: 'Removed. They can be restored for 72 hours.' }); setConfirm(null); invalidateAll(); invalidateNumberLists(queryClient); },
    onError: (e: any) => handleAlert({ type: 'error', text: e?.response?.data?.message || 'Could not remove this person.' }),
  });
  const { mutate: doSuspend, isPending: isSuspending } = useMutation({
    mutationFn: suspendMember,
    onSuccess: () => { handleAlert({ type: 'success', text: 'Suspended. Their sessions have ended.' }); setConfirm(null); invalidateAll(); },
    onError: (e: any) => handleAlert({ type: 'error', text: e?.response?.data?.message || 'Could not suspend this person.' }),
  });
  const { mutate: doReactivate } = useMutation({
    mutationFn: reactivateMember,
    onSuccess: () => { handleAlert({ type: 'success', text: 'Reactivated.' }); invalidateAll(); },
    onError: (e: any) => handleAlert({ type: 'error', text: e?.response?.data?.message || 'Could not reactivate this person.' }),
  });
  const { mutate: doSignOut, isPending: isSigningOut } = useMutation({
    mutationFn: signOutEverywhere,
    onSuccess: (res: any) => {
      const n = Number(res?.data?.data?.result?.sessions_ended ?? res?.data?.data?.sessions_ended ?? 0);
      handleAlert({ type: 'success', text: n ? `Signed out on ${n} device${n === 1 ? '' : 's'}.` : 'They were not signed in anywhere.' });
      setConfirm(null);
    },
    onError: (e: any) => handleAlert({ type: 'error', text: e?.response?.data?.message || 'Could not sign this person out.' }),
  });

  /* Rows for the tab in view. */
  const visible = useMemo(() => {
    const wanted = tab === 'active' ? 'active' : tab === 'pending' ? 'pending' : null;
    return rows.filter((row) => {
      if (wanted && personTab(row, invites) !== wanted) return false;
      if (roleFilter !== 'All' && row.roleLabel !== roleFilter) return false;
      if (!matchesLastSeen(row.raw?.last_login_at, lastSeen)) return false;
      return true;
    });
  }, [rows, tab, invites, roleFilter, lastSeen]);

  const counts = useMemo(() => {
    let active = 0; let pending = 0; let never = 0; let suspended = 0;
    rows.forEach((row) => {
      const t = personTab(row, invites);
      if (t === 'pending') pending += 1; else active += 1;
      if (row.state === 'SUSPENDED') suspended += 1;
      if (t !== 'pending' && !row.raw?.last_login_at) never += 1;
    });
    return { active, pending, never, suspended };
  }, [rows, invites]);

  const roleLabels = useMemo(() => Array.from(new Set(rows.map((r) => r.roleLabel).filter(Boolean))).sort(), [rows]);

  const canActOn = (row: PersonRow) => {
    if (!isAdministrator) return false;
    if (row.uuid === myUuid) return false;
    if (row.role === 'ADMIN' && !isOwner) return false;
    return true;
  };

  const toggleRow = (uuid: string) =>
    setSelected((prev) => { const next = new Set(prev); if (next.has(uuid)) next.delete(uuid); else next.add(uuid); return next; });
  const selectedRows = useMemo(() => visible.filter((r) => selected.has(r.uuid) && canActOn(r)), [visible, selected]);

  const runBulk = async () => {
    if (!bulkAction || !selectedRows.length) return;
    if (bulkAction === 'role' && !bulkRole) return;
    setBulkBusy(true);
    let done = 0; const failed: string[] = [];
    if (bulkAction === 'role') {
      try { await assignRoleBulkUsers({ role_uuid: bulkRole, users: selectedRows.map((r) => r.uuid) }); done = selectedRows.length; }
      catch { failed.push(...selectedRows.map((r) => r.name)); }
    } else {
      for (const row of selectedRows) {
        try {
          if (bulkAction === 'remove') await deleteMember(row.uuid);
          else if (bulkAction === 'suspend') await suspendMember(row.uuid);
          else await signOutEverywhere(row.uuid);
          done += 1;
        } catch { failed.push(row.name); }
      }
    }
    setBulkBusy(false); setBulkAction(null); setBulkRole(''); setSelected(new Set()); invalidateAll();
    handleAlert({ type: failed.length ? 'warning' : 'success', text: failed.length ? `${done} done; not done for ${failed.join(', ')}.` : `${done} done.` });
  };

  const exportRoster = () => {
    const csv = buildRosterCsv(visible.map((row) => ({
      name: row.name, email: row.email, role: row.roleLabel, jobTitle: row.jobTitle, location: row.location,
      extension: row.extension, numbers: row.callerId, groups: row.department, addedOn: String(row.raw?.created_at || '').slice(0, 10),
    })) as any);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `people-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openFor = (row: PersonRow, key: string) => { setSelectedUser(row.raw); setDrawerState((prev: any) => ({ ...prev, [key]: true })); };

  return (
    <>
      <section className="mcm-people">
        {/* The head above already prints "People": the screen printed it a
            second time, with the description beside it, so the page opened on
            two identical titles. The button goes up into the head's own action
            slot, on the title's line, and the description into its tooltip. */}
        <AdminHeadActions>
          {isAdministrator && (
            <Button className="mcm-people-add gap-2" onClick={() => setDrawerState({ addUser: true })}>
              <Plus className="w-4 h-4" /> Add people
            </Button>
          )}
        </AdminHeadActions>

        <div className="mcm-people-stats">
          {[
            ['People', counts.active, `${counts.suspended} suspended`],
            ['Pending invites', counts.pending, invites.size ? `${Array.from(invites.values()).filter((i) => i.expired).length} expired` : 'none waiting'],
            ['Never signed in', counts.never, 'active people with no sign-in yet'],
            ['Showing', visible.length, `of ${rows.length} loaded`],
          ].map(([l, v, s]) => (
            <div key={String(l)} className="mcm-people-stat">
              <span className="mcm-people-stat-l">{l}</span>
              <span className="mcm-people-stat-v">{v}</span>
              <span className="mcm-people-stat-s">{s}</span>
            </div>
          ))}
        </div>

        {/* Tabs and filters in one card, because they do one job: they decide
            which rows the table below shows. They were three loose strips on
            the page ground, each with its own left edge. */}
        <div className="mcm-people-bar">
          <div className="mcm-people-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => { setTab(t.key); setSelected(new Set()); }}
                className={`mcm-people-tab${tab === t.key ? ' is-on' : ''}`}
              >
                {t.label}
                {t.key === 'active' && <span className="mcm-people-tab-n">{counts.active}</span>}
                {t.key === 'pending' && <span className="mcm-people-tab-n">{counts.pending}</span>}
              </button>
            ))}
          </div>

          {tab !== 'removed' && tab !== 'reserved' && (
            <div className="mcm-people-filters">
              <div className="mcm-people-search">
                <SearchLine />
                <Input placeholder="Search name, e-mail, extension" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {/* The app's own dropdown, not a native `<select>`. A native one
                  draws its list with the operating system: the open list was
                  the Windows blue, in Windows' own typeface, at Windows' idea
                  of where the list goes - which is why it sat over the control
                  and off its left edge. This one is drawn by the page, so it
                  keeps the console's orange and lines up under the field. */}
              <div className="mcm-people-pick">
                <CustomSelect
                  inputClass="mcm-people-opt"
                  isSearchable={false}
                  options={LOCATION_ALL.concat(locationNames.map((n: string) => ({ label: n, value: n })))}
                  value={{ label: location === 'All' ? 'Location: All' : location, value: location }}
                  handleChange={(o: any) => setLocation(o?.value ?? 'All')}
                />
              </div>
              <div className="mcm-people-pick">
                <CustomSelect
                  inputClass="mcm-people-opt"
                  isSearchable={false}
                  options={ROLE_ALL.concat(roleLabels.map((n) => ({ label: n, value: n })))}
                  value={{ label: roleFilter === 'All' ? 'Role: All' : roleFilter, value: roleFilter }}
                  handleChange={(o: any) => setRoleFilter(o?.value ?? 'All')}
                />
              </div>
              <div className="mcm-people-pick is-wide">
                <CustomSelect
                  inputClass="mcm-people-opt"
                  isSearchable={false}
                  options={LAST_SEEN_OPTIONS}
                  value={LAST_SEEN_OPTIONS.find((f) => f.value === lastSeen) || LAST_SEEN_OPTIONS[0]}
                  handleChange={(o: any) => setLastSeen((o?.value as LastSeenFilter) ?? 'any')}
                />
              </div>
              <div className="mcm-people-spacer" />
              <Button variant="outline" size="sm" onClick={exportRoster} disabled={!visible.length}>Export CSV</Button>
            </div>
          )}
        </div>

        {tab !== 'removed' && tab !== 'reserved' && selectedRows.length > 0 && (
          <div className="mcm-people-bulk">
            <b className="tabular-nums">{selectedRows.length} selected</b>
            {bulkAction === 'role' ? (
              <>
                <div className="mcm-people-pick">
                  <CustomSelect
                    inputClass="mcm-people-opt"
                    isSearchable={false}
                    placeholder="Choose a role"
                    options={roleOptions.map((r: any) => ({ label: r.name, value: r.uuid }))}
                    value={roleOptions.filter((r: any) => r.uuid === bulkRole).map((r: any) => ({ label: r.name, value: r.uuid }))[0] || null}
                    handleChange={(o: any) => setBulkRole(o?.value || '')}
                  />
                </div>
                <Button size="sm" onClick={runBulk} disabled={!bulkRole || bulkBusy}>Apply</Button>
                <Button size="sm" variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
              </>
            ) : bulkAction ? (
              <>
                <span>{bulkAction === 'remove' ? 'Remove these people (restorable for 72 hours)?' : bulkAction === 'suspend' ? 'Suspend these people and end their sessions?' : 'Sign these people out on every device?'}</span>
                <Button size="sm" variant={bulkAction === 'remove' ? 'destructive' : 'default'} onClick={runBulk} disabled={bulkBusy}>Yes, {bulkAction === 'remove' ? 'remove' : bulkAction === 'suspend' ? 'suspend' : 'sign out'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setBulkAction('role')}>Change role</Button>
                <Button size="sm" variant="outline" onClick={() => setBulkAction('suspend')}>Suspend</Button>
                <Button size="sm" variant="outline" onClick={() => setBulkAction('signout')}>Sign out everywhere</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setBulkAction('remove')}>Remove</Button>
              </>
            )}
          </div>
        )}

        {tab === 'removed' ? (
          <RemovedPeople canRestore={isAdministrator} />
        ) : (
          <div className="mcm-people-table">
            <div className="mcm-people-scroll">
              {tab === 'reserved' ? (
                <table className="mcm-people-t">
                  <thead>
                    <tr><th>Number</th><th>Why it is free</th><th>Since</th><th>Note</th></tr>
                  </thead>
                  <tbody>
                    {isReservedLoading ? <tr className="mcm-no-hover"><td className="mcm-people-empty" colSpan={4}>Loading…</td></tr>
                      : reserved.length === 0 ? <tr className="mcm-no-hover"><td className="mcm-people-empty" colSpan={4}>No unassigned or released numbers. A number freed by removing a person appears here.</td></tr>
                      : reserved.map((n: any) => (
                        <tr key={`${n.kind}-${n.number}`}>
                          <td className="mcm-people-mono">{n.number}</td>
                          <td>{n.kind === 'released' ? 'Released' : 'Unassigned'}</td>
                          <td className="tabular-nums">{n.since ? String(n.since).slice(0, 10) : '—'}</td>
                          <td className="mcm-people-dim">{n.note || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <table className="mcm-people-t">
                  <thead>
                    <tr>
                      {isAdministrator && <th className="is-pick"><input type="checkbox" aria-label="Select everyone shown" checked={visible.length > 0 && visible.every((r) => selected.has(r.uuid))} onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((r) => r.uuid)) : new Set())} /></th>}
                      <th>Person</th><th>Role</th><th>Location</th>
                      <th className="is-num">Ext</th>
                      {tab === 'pending' ? <th>Invite expires</th> : <th>Last signed in</th>}
                      <th>Status</th>
                      <th className="is-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? <tr className="mcm-no-hover"><td className="mcm-people-empty" colSpan={8}>Loading people…</td></tr>
                      : visible.length === 0 ? <tr className="mcm-no-hover"><td className="mcm-people-empty" colSpan={8}>{tab === 'pending' ? 'Nobody is waiting on an invite.' : 'Nobody matches these filters.'}</td></tr>
                      : visible.map((row) => {
                        const inv = invites.get(row.uuid);
                        const state = row.state ? PERSON_STATE_LABEL[row.state] : null;
                        const actionable = canActOn(row);
                        return (
                          <tr key={row.uuid}>
                            {isAdministrator && <td className="is-pick"><input type="checkbox" aria-label={`Select ${row.name}`} disabled={!actionable} checked={selected.has(row.uuid)} onChange={() => toggleRow(row.uuid)} /></td>}
                            <td>
                              <div className="mcm-people-who">
                                <CustomAvatar name={row.name} image={row.image} />
                                <div className="min-w-0">
                                  <div className="mcm-people-name" title={row.name}>{row.name}</div>
                                  <div className="mcm-people-sub" title={row.email}>{row.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="mcm-people-role">{row.roleLabel}</span>
                              {row.scopeSuffix ? <div className="mcm-people-sub">{row.scopeSuffix}</div> : null}
                            </td>
                            <td>
                              <div className="mcm-people-name">{row.location || '—'}</div>
                              {row.department ? <div className="mcm-people-sub" title={row.department}>{row.department}</div> : null}
                            </td>
                            <td className="is-num mcm-people-mono">{row.extension || '—'}</td>
                            {tab === 'pending'
                              ? <td className="tabular-nums">{inv?.expired ? <span className="mcm-people-pill is-bad">Expired {inv.expiresText}</span> : <span>{inv?.expiresText || '—'}</span>}</td>
                              : <td className="tabular-nums">{row.raw?.last_login_at ? lastSeenText(row.raw.last_login_at) : <span className="mcm-people-pill is-wait">Never</span>}</td>}
                            <td>{state ? <span className={`mcm-people-pill ${row.state === 'ACTIVE' ? 'is-good' : row.state === 'SUSPENDED' ? 'is-bad' : 'is-idle'}`}>{state.label}</span> : '—'}</td>
                            <td className="is-right">
                              <div className="mcm-people-acts">
                                {tab === 'pending' && actionable && (
                                  <Button size="sm" variant="outline" disabled={isResending} onClick={() => doResend({ user_uuid: row.uuid })}>{inv?.expired ? 'Re-invite' : 'Resend'}</Button>
                                )}
                                <CustomTooltip text="Edit"><button type="button" aria-label={`Edit ${row.name}`} className="mcm-people-icon" onClick={() => openFor(row, 'updateForwarding')}><Pencil className="w-4 h-4" /></button></CustomTooltip>
                                {/* A menu, not a `<details>` panel. The panel was
                                    a child of the table card, and a card that
                                    scrolls sideways has to clip what overflows
                                    it - so on the last rows the menu was cut off
                                    at the card's edge. This one is portalled out
                                    of the table and flips above the button when
                                    the space below runs out. */}
                                {actionable && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger className="mcm-people-more" aria-label={`More for ${row.name}`}>
                                      More <ChevronDown />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-white">
                                      <DropdownMenuItem onSelect={() => openFor(row, 'changeRole')}>Change role</DropdownMenuItem>
                                      {virtualNumbersAccess?.assign_number && (
                                        <DropdownMenuItem onSelect={() => openFor(row, 'assignUser')}>Assign a number</DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => setConfirm({ kind: 'signout', row })}>Sign out everywhere</DropdownMenuItem>
                                      {row.state === 'SUSPENDED'
                                        ? <DropdownMenuItem onSelect={() => doReactivate(row.uuid)}>Reactivate</DropdownMenuItem>
                                        : <DropdownMenuItem onSelect={() => setConfirm({ kind: 'suspend', row })}>Suspend</DropdownMenuItem>}
                                      <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ kind: 'remove', row })}>
                                        Remove (restorable 72 h)
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Centred, not a side drawer. The flow is a two-column wizard - a
          step rail beside a three-across form - and 765px of drawer had it
          folding onto itself. This is the same shell Directory opens the
          same flow in (`gp-invite-dialog`), so the two agree, with the page
          behind dimmed just enough to sit back - a light veil, not frosted
          glass; at a heavier blur the console read as out of focus rather
          than behind something. Clicking
          the backdrop does not close it: half a roster typed in is too
          easy to lose to a stray click. */}
      <Dialog open={Boolean(drawerState.addUser)} onOpenChange={(open) => { if (!open) setDrawerState({ addUser: false }); }}>
        <DialogContent
          className="gp-create-group-dialog gp-invite-dialog sm:max-w-[600px] lg:max-w-[1120px]"
          overlayClassName="bg-black/20 backdrop-blur-[1.5px]"
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Add people</DialogTitle>
          <div className="gp-create-group-head gp-create-group-head--bare">
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={() => setDrawerState({ addUser: false })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <AddUsers
              setDrawerState={(val) => setDrawerState((prev: any) => ({ ...prev, addUser: val }))}
              railTitle="Add people"
              railSubtitle="Add team members and give them access to your workspace."
            />
          </div>
        </DialogContent>
      </Dialog>
      {drawerState.updateForwarding && (
        <SideDrawer isOpen={drawerState.updateForwarding} title={`${capitalizeFirstLetter(selectedUser?.first_name || '')} ${selectedUser?.last_name || ''}`} isTab={false} handleClose={() => setDrawerState({ updateForwarding: false })}
          content={<UpdateForwarding drawerState={drawerState.updateForwarding} setDrawerState={(val) => setDrawerState((prev: any) => ({ ...prev, updateForwarding: val }))} data={selectedUser} />} />
      )}
      <AssignCallerIdModal open={Boolean(drawerState.assignUser)} userData={selectedUser}
        onOpenMultipleAssignModal={(users) => { setMultipleAssignUsers(users || []); setShowMultipleAssignModal(true); }}
        onClose={() => { setDrawerState((prev: any) => ({ ...prev, assignUser: false })); setSelectedUser(null); }} />
      {showMultipleAssignModal && (
        <Dialog open={showMultipleAssignModal} onOpenChange={(val) => { setShowMultipleAssignModal(val); if (!val) setMultipleAssignUsers([]); }}>
          <DialogContent className="md:w-3/6 p-3 max-h-[99%] overflow-y-auto" showCloseButton={false}>
            <MultipleAssignNumber users={multipleAssignUsers} handleClose={() => { setShowMultipleAssignModal(false); setMultipleAssignUsers([]); }} />
          </DialogContent>
        </Dialog>
      )}
      <RoleChangeModal open={Boolean(drawerState.changeRole)} userData={selectedUser} setOpen={(val) => { setDrawerState((prev: any) => ({ ...prev, changeRole: val })); if (!val) setSelectedUser(null); }} />
      <AlertConfirm
        apiLoading={isRemoving || isSuspending || isSigningOut}
        onConfirm={() => { if (!confirm) return; if (confirm.kind === 'remove') doRemove(confirm.row.uuid); else if (confirm.kind === 'suspend') doSuspend(confirm.row.uuid); else doSignOut(confirm.row.uuid); }}
        open={Boolean(confirm)}
        setOpen={(v: boolean) => { if (!v) setConfirm(null); }}
        headerText={confirm?.kind === 'remove' ? 'Remove this person' : confirm?.kind === 'suspend' ? 'Suspend this person' : 'Sign out everywhere'}
        descriptionTextComp={confirm?.kind === 'remove'
          ? `${confirm.row.name} will be removed now and can be restored for 72 hours. Their number is freed and their extension leaves every routing rule.`
          : confirm?.kind === 'suspend'
            ? `${confirm.row.name} will be signed out on every device, logged out of every queue, and unable to sign in until reactivated.`
            : `${confirm?.row.name} will be signed out on every device and app. They can sign in again straight away.`}
      />
    </>
  );
};

export default PeopleScreen;
