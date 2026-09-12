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
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import SideDrawer from '@/components/custom/side-drawer';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomAvatar from '@/components/custom/custom-avatar';
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
import AddUsers from './add-users';
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
      <section className="w-full">
        <div className="flex items-start justify-between gap-4 px-3 pt-3">
          <div>
            <h2 className="text-xl font-semibold">People</h2>
            <p className="text-sm text-muted-foreground">Everyone in the company. Add, invite, edit, suspend, remove and restore people here; the Directory only looks them up.</p>
          </div>
          {isAdministrator && (
            <Button className="gap-2" onClick={() => setDrawerState({ addUser: true })}><Plus className="w-4 h-4" /> Add people</Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-3 pt-3">
          {[
            ['People', counts.active, `${counts.suspended} suspended`],
            ['Pending invites', counts.pending, invites.size ? `${Array.from(invites.values()).filter((i) => i.expired).length} expired` : 'none waiting'],
            ['Never signed in', counts.never, 'active people with no sign-in yet'],
            ['Showing', visible.length, `of ${rows.length} loaded`],
          ].map(([l, v, s]) => (
            <div key={String(l)} className="rounded-lg border bg-card px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</div>
              <div className="text-xl font-semibold tabular-nums">{v}</div>
              <div className="text-xs text-muted-foreground">{s}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b px-3 mt-3" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setSelected(new Set()); }}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === t.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground'}`}>
              {t.label}
              {t.key === 'active' && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums">{counts.active}</span>}
              {t.key === 'pending' && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums">{counts.pending}</span>}
            </button>
          ))}
        </div>

        {tab !== 'removed' && tab !== 'reserved' && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <div className="relative">
              <SearchLine className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8 w-64" placeholder="Search name, e-mail, extension" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location">
              <option value="All">Location: All</option>
              {locationNames.map((n: string) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role">
              <option value="All">Role: All</option>
              {roleLabels.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={lastSeen} onChange={(e) => setLastSeen(e.target.value as LastSeenFilter)} aria-label="Last signed in">
              {LAST_SEEN_FILTERS.map((f) => <option key={f.key} value={f.key}>Last signed in: {f.label}</option>)}
            </select>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={exportRoster} disabled={!visible.length}>Export CSV</Button>
          </div>
        )}

        {tab !== 'removed' && tab !== 'reserved' && selectedRows.length > 0 && (
          <div className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            <b className="tabular-nums">{selectedRows.length} selected</b>
            {bulkAction === 'role' ? (
              <>
                <select className="h-8 rounded-md border bg-background px-2 text-sm" value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} aria-label="New role">
                  <option value="">Choose a role</option>
                  {roleOptions.map((r: any) => <option key={r.uuid} value={r.uuid}>{r.name}</option>)}
                </select>
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

        <div className="px-3 pb-6">
          {tab === 'removed' ? (
            <RemovedPeople canRestore={isAdministrator} />
          ) : tab === 'reserved' ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Number</th><th>Why it is free</th><th>Since</th><th>Note</th></tr></thead>
              <tbody>
                {isReservedLoading ? <tr><td className="py-6 text-muted-foreground" colSpan={4}>Loading…</td></tr>
                  : reserved.length === 0 ? <tr><td className="py-6 text-muted-foreground" colSpan={4}>No unassigned or released numbers. A number freed by removing a person appears here.</td></tr>
                  : reserved.map((n: any) => (
                    <tr key={`${n.kind}-${n.number}`} className="border-t"><td className="py-2 font-mono">{n.number}</td><td>{n.kind === 'released' ? 'Released' : 'Unassigned'}</td><td className="tabular-nums">{n.since ? String(n.since).slice(0, 10) : '—'}</td><td className="text-muted-foreground">{n.note || '—'}</td></tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  {isAdministrator && <th className="py-2 w-8"><input type="checkbox" aria-label="Select everyone shown" checked={visible.length > 0 && visible.every((r) => selected.has(r.uuid))} onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((r) => r.uuid)) : new Set())} /></th>}
                  <th className="py-2">Person</th><th>Role</th><th>Location</th><th>Ext</th>
                  {tab === 'pending' ? <th>Invite expires</th> : <th>Last signed in</th>}
                  <th>Status</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <tr><td className="py-6 text-muted-foreground" colSpan={8}>Loading people…</td></tr>
                  : visible.length === 0 ? <tr><td className="py-6 text-muted-foreground" colSpan={8}>{tab === 'pending' ? 'Nobody is waiting on an invite.' : 'Nobody matches these filters.'}</td></tr>
                  : visible.map((row) => {
                    const inv = invites.get(row.uuid);
                    const state = row.state ? PERSON_STATE_LABEL[row.state] : null;
                    const actionable = canActOn(row);
                    return (
                      <tr key={row.uuid} className="border-t hover:bg-muted/40">
                        {isAdministrator && <td><input type="checkbox" aria-label={`Select ${row.name}`} disabled={!actionable} checked={selected.has(row.uuid)} onChange={() => toggleRow(row.uuid)} /></td>}
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <CustomAvatar name={row.name} image={row.image} />
                            <div><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.email}</div></div>
                          </div>
                        </td>
                        <td><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{row.roleLabel}</span>{row.scopeSuffix ? <div className="text-xs text-muted-foreground">{row.scopeSuffix}</div> : null}</td>
                        <td>{row.location || '—'}{row.department ? <div className="text-xs text-muted-foreground">{row.department}</div> : null}</td>
                        <td className="font-mono">{row.extension || '—'}</td>
                        {tab === 'pending'
                          ? <td className="tabular-nums">{inv?.expired ? <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs">Expired {inv.expiresText}</span> : <span>{inv?.expiresText || '—'}</span>}</td>
                          : <td className="tabular-nums">{row.raw?.last_login_at ? lastSeenText(row.raw.last_login_at) : <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs">Never</span>}</td>}
                        <td>{state ? <span className={`rounded-full px-2 py-0.5 text-xs ${row.state === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : row.state === 'SUSPENDED' ? 'bg-red-100 text-red-800' : 'bg-muted'}`}>{state.label}</span> : '—'}</td>
                        <td className="text-right">
                          <div className="inline-flex items-center gap-1">
                            {tab === 'pending' && actionable && (
                              <Button size="sm" variant="outline" disabled={isResending} onClick={() => doResend({ user_uuid: row.uuid })}>{inv?.expired ? 'Re-invite' : 'Resend'}</Button>
                            )}
                            <CustomTooltip text="Edit"><button aria-label={`Edit ${row.name}`} className="p-1 rounded hover:bg-muted" onClick={() => openFor(row, 'updateForwarding')}><Pencil className="w-4 h-4" /></button></CustomTooltip>
                            {actionable && (
                              <details className="relative">
                                <summary className="list-none cursor-pointer rounded border px-2 py-0.5 text-xs">More ▾</summary>
                                <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border bg-popover p-1 text-left shadow-md">
                                  <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => openFor(row, 'changeRole')}>Change role</button>
                                  {virtualNumbersAccess?.assign_number && <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => openFor(row, 'assignUser')}>Assign a number</button>}
                                  <div className="my-1 border-t" />
                                  <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => setConfirm({ kind: 'signout', row })}>Sign out everywhere</button>
                                  {row.state === 'SUSPENDED'
                                    ? <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => doReactivate(row.uuid)}>Reactivate</button>
                                    : <button className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => setConfirm({ kind: 'suspend', row })}>Suspend</button>}
                                  <button className="block w-full rounded px-2 py-1.5 text-left text-destructive hover:bg-muted" onClick={() => setConfirm({ kind: 'remove', row })}>Remove (restorable 72 h)</button>
                                </div>
                              </details>
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
      </section>

      {drawerState.addUser && (
        <SideDrawer isOpen={drawerState.addUser} title="Add people" width="min(765px, 94vw)" isTab={false} handleClose={() => setDrawerState({ addUser: false })}
          content={<AddUsers setDrawerState={(val) => setDrawerState((prev: any) => ({ ...prev, addUser: val }))} />} />
      )}
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
