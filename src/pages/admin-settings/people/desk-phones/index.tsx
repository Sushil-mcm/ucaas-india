/* Desk phones: the company's physical handsets (Yealink, Poly), keyed by MAC.
 *
 * Lives under Company, beside locations, because a phone is a thing in a
 * place before it is a thing of a person: room phones have no person at all.
 * The two tabs are the split the reference products draw. USER phones belong
 * to one person and ring with their calls. ROOM phones stand in shared spaces
 * and register as their own extension.
 *
 * What a phone is doing on the switch (registered / offline) is only ever the
 * switch's own answer. When it cannot be asked the column says "Cannot tell"
 * rather than guessing; until a phone has been in touch once it can only say
 * "never connected" or
 * "not set up". */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SearchLine } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import SideDrawer from '@/components/custom/side-drawer';
import AlertConfirm from '@/components/custom/alert-confirm';
import useDebounce from '@/hooks/use-debounce';
import { handleAlert } from '@/lib/utils';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import AddPhoneForm from './add-phone-form';
import EditPhoneForm from './edit-phone-form';
import BulkAdd from './bulk-add';
import CredentialsDialog from './credentials-dialog';
import {
  describeError,
  DESK_PHONES_QUERY_KEY,
  listDeskPhones,
  removeDeskPhone,
  type DeskPhone,
  type DeskPhoneKind,
  type DeskPhoneState,
} from './desk-phones-api';

export const DESK_PHONES_PATH = '/admin-settings/desk-phones';

const VENDOR_LABEL: Record<string, string> = { yealink: 'Yealink', poly: 'Poly', 'poly-obi': 'Poly OBi', cisco: 'Cisco', grandstream: 'Grandstream' };

/* `unknown` is not a fault. It means the switch could not be asked, so the
   list refuses to guess: a phone that has been unplugged used to go on
   reporting Registered for two hours, which is exactly the window in which
   somebody needed the truth. The two cases also call for different actions -
   chase the phone, or chase the switch. */
const STATE: Record<DeskPhoneState, { label: string; className: string; hint: string }> = {
  unassigned: {
    label: 'Not set up',
    className: 'text-amber-700 border-amber-200 bg-amber-50',
    hint: 'No person and no extension yet, so it has nothing to sign in as.',
  },
  ready: {
    label: 'Never connected',
    className: 'text-slate-700 border-slate-200 bg-slate-50',
    hint: 'Set up and waiting. It has not reached us once yet - plug it in and switch it on.',
  },
  registered: {
    label: 'Registered',
    className: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    hint: 'Signed in to the switch right now. It can make and take calls.',
  },
  offline: {
    label: 'Offline',
    className: 'text-red-700 border-red-200 bg-red-50',
    hint: 'Not signed in. Usually switched off, unplugged, or its internet is down.',
  },
  unknown: {
    label: 'Cannot tell',
    className: 'text-slate-700 border-slate-300 bg-slate-100',
    hint: 'The switch did not answer, so this is the last thing we knew rather than the truth now.',
  },
};

const TABS: Array<{ kind: DeskPhoneKind; label: string; blurb: string }> = [
  { kind: 'user', label: 'User phones', blurb: "On a person's desk. Rings with their calls." },
  { kind: 'room', label: 'Room phones', blurb: 'Reception, meeting rooms. Their own extension, nobody’s voicemail.' },
];

const when = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const DeskPhones = () => {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<DeskPhoneKind>('user');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<'add' | 'bulk' | null>(null);
  const [editing, setEditing] = useState<DeskPhone | null>(null);
  const [details, setDetails] = useState<DeskPhone | null>(null);
  const [removing, setRemoving] = useState<DeskPhone | null>(null);

  /* Registration state is read from the switch on every fetch, so the list
     re-asks every 20 seconds while the page is open (a phone registers within
     a minute of being set up), and a Check now button asks at once. The
     "checked N s ago" note is what tells the person the screen is not stale. */
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: [...DESK_PHONES_QUERY_KEY, { kind, search: debouncedSearch, page }],
    queryFn: () => listDeskPhones({ kind, search: debouncedSearch, page, limit: 50 }),
    retry: false,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);
  const checkedAgo = dataUpdatedAt ? Math.max(0, Math.round((now - dataUpdatedAt) / 1000)) : null;

  /* Counts for the tab labels, independent of the search box. */
  const { data: counts } = useQuery({
    queryKey: [...DESK_PHONES_QUERY_KEY, 'counts'],
    queryFn: async () => {
      const [u, r] = await Promise.all([
        listDeskPhones({ kind: 'user', page: 1, limit: 1 }),
        listDeskPhones({ kind: 'room', page: 1, limit: 1 }),
      ]);
      return {
        user: u.kind === 'ok' ? u.list.total : 0,
        room: r.kind === 'ok' ? r.list.total : 0,
      };
    },
    retry: false,
  });

  const { mutate: remove, isPending: isRemoving } = useMutation({
    mutationFn: removeDeskPhone,
    onSuccess: () => {
      handleAlert({ text: 'Desk phone removed.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: DESK_PHONES_QUERY_KEY });
      setRemoving(null);
    },
  });

  const rows = data?.kind === 'ok' ? data.list.result : [];
  const total = data?.kind === 'ok' ? data.list.total : 0;
  const pages = Math.max(1, Math.ceil(total / 50));
  const absent = data?.kind === 'absent';
  const tab = TABS.find((t) => t.kind === kind) ?? TABS[0];

  const summary = useMemo(
    () =>
      rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.state] = (acc[r.state] ?? 0) + 1;
        return acc;
      }, {}),
    [rows],
  );

  return (
    <>
      <AdminPage
        crumbs={[
          { label: 'Admin settings', to: '/admin-settings' },
          { label: 'Company', to: '/admin-settings/company' },
          { label: 'Desk phones' },
        ]}
        section="Company"
        title="Desk phones"
        description="Physical handsets: who each belongs to, or which room it stands in. Add one, or a whole delivery from a spreadsheet."
        actions={
          <>
            <button type="button" className="btn" onClick={() => setDrawer('bulk')} disabled={absent}>
              Add many
            </button>
            <button type="button" className="btn primary" onClick={() => setDrawer('add')} disabled={absent}>
              <Plus className="w-3 h-3" />
              {kind === 'room' ? 'Add room phone' : 'Add user phone'}
            </button>
          </>
        }
        filters={
          <Input
            placeholder="Search by MAC, name, model or extension"
            className="pl-10 w-full min-h-9 rounded-lg"
            IconPosition="left-0 pl-2 inset-y-0"
            value={search}
            onChange={(e) => {
              if (e.target.value.startsWith(' ')) return;
              setSearch(e.target.value);
              setPage(1);
            }}
            Icon={<SearchLine className=" text-gray-700" />}
          />
        }
      >
        <div className="w-full p-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Kind of phone">
            {TABS.map((t) => (
              <button
                key={t.kind}
                type="button"
                role="tab"
                aria-selected={kind === t.kind}
                className={`chip${kind === t.kind ? ' on' : ''}`}
                onClick={() => {
                  setKind(t.kind);
                  setPage(1);
                }}
              >
                {t.label}
                {counts ? <span className="opacity-70">{counts[t.kind]}</span> : null}
              </button>
            ))}
            <span className="text-xs text-gray-500">{tab.blurb}</span>
          </div>

          {absent ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This server does not offer desk phones yet.
            </div>
          ) : null}
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {describeError(error, 'Could not load the phone list.')}
            </div>
          ) : null}

          {!absent && !error ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span>
                {total} {tab.label.toLowerCase().replace(/s$/, total === 1 ? '' : 's')}
              </span>
              {(Object.keys(STATE) as DeskPhoneState[])
                .filter((k) => summary[k])
                .map((k) => (
                  <span key={k} className={`rounded-md border px-2 py-0.5 ${STATE[k].className}`}>
                    {summary[k]} {STATE[k].label.toLowerCase()}
                  </span>
                ))}
              <span className="ml-auto flex items-center gap-2 text-gray-500">
                {checkedAgo !== null ? (
                  <span>
                    {isFetching ? 'Checking the switch…' : checkedAgo < 5 ? 'Checked just now' : `Checked ${checkedAgo}s ago`}
                  </span>
                ) : null}
                <button type="button" className="btn ghost" disabled={isFetching} onClick={() => refetch()}>
                  Check now
                </button>
              </span>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>MAC address</th>
                  <th>{kind === 'room' ? 'Extension' : 'Belongs to'}</th>
                  <th>Location</th>
                  <th>State</th>
                  <th>Last seen</th>
                  <th>Added</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!isLoading && !rows.length ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-500">
                      <div className="font-medium text-gray-700">
                        {kind === 'room' ? 'No room phones yet' : 'No user phones yet'}
                      </div>
                      <div className="mt-1 text-xs">
                        {kind === 'room'
                          ? 'Add the handsets in reception and meeting rooms. Each gets its own extension.'
                          : "Add the handsets on people's desks. Each one is identified by the MAC address printed under it."}
                      </div>
                    </td>
                  </tr>
                ) : null}
                {rows.map((phone) => {
                  const state = STATE[phone.state] ?? STATE.ready;
                  return (
                    <tr key={phone.uuid}>
                      <td>
                        <div className="font-medium text-gray-900">{phone.label || phone.model}</div>
                        <div className="text-xs text-gray-500">
                          {VENDOR_LABEL[phone.vendor] ?? phone.vendor} {phone.model}
                          {phone.serial_number ? ` · SN ${phone.serial_number}` : ''}
                        </div>
                      </td>
                      <td className="font-mono text-xs">{phone.mac_display}</td>
                      <td>
                        {phone.kind === 'room' ? (
                          phone.sip_username ? (
                            <span className="font-mono">{phone.extension ?? phone.sip_username}</span>
                          ) : (
                            <span className="text-gray-500">Not set</span>
                          )
                        ) : phone.owner ? (
                          <>
                            <div className="text-gray-900">{phone.owner.name || phone.owner.email}</div>
                            <div className="text-xs text-gray-500">ext {phone.owner.extension}</div>
                          </>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="text-xs text-gray-600">{phone.site?.name ?? '—'}</td>
                      <td>
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-xs ${state.className}`}
                          title={state.hint}
                        >
                          {state.label}
                        </span>
                        {/* Six minutes is a phone being moved between desks.
                            Since yesterday evening is somebody who has been
                            unreachable all morning. The number is what makes
                            the difference worth acting on. */}
                        {phone.away_for && phone.state !== 'registered' ? (
                          <div className="mt-0.5 text-xs text-gray-500">for {phone.away_for}</div>
                        ) : null}
                      </td>
                      <td className="text-xs text-gray-600">
                        {phone.last_seen_at ? when(phone.last_seen_at) : 'Never'}
                        {phone.last_user_agent ? <div className="text-gray-400">{phone.last_user_agent}</div> : null}
                      </td>
                      <td className="text-xs text-gray-600">{when(phone.created_at)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button type="button" className="btn ghost" onClick={() => setDetails(phone)}>
                            Details
                          </button>
                          <button type="button" className="btn ghost" onClick={() => setEditing(phone)}>
                            Edit
                          </button>
                          <button type="button" className="btn ghost" onClick={() => setRemoving(phone)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 ? (
            <div className="flex items-center justify-end gap-2 text-xs text-gray-600">
              <button type="button" className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button type="button" className="btn ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          ) : null}
        </div>
      </AdminPage>

      {drawer === 'add' ? (
        <SideDrawer
          isOpen
          title={kind === 'room' ? 'Add a room phone' : 'Add a user phone'}
          width="min(640px, 94vw)"
          isTab={false}
          handleClose={() => setDrawer(null)}
          content={<AddPhoneForm initialKind={kind} onDone={() => setDrawer(null)} />}
        />
      ) : null}

      {drawer === 'bulk' ? (
        <SideDrawer
          isOpen
          title="Add many desk phones"
          width="min(760px, 94vw)"
          isTab={false}
          handleClose={() => setDrawer(null)}
          content={<BulkAdd onDone={() => setDrawer(null)} />}
        />
      ) : null}

      {editing ? (
        <SideDrawer
          isOpen
          title={`Edit ${editing.label || editing.model}`}
          width="min(640px, 94vw)"
          isTab={false}
          handleClose={() => setEditing(null)}
          content={<EditPhoneForm phone={editing} onDone={() => setEditing(null)} />}
        />
      ) : null}

      <CredentialsDialog device={details} onClose={() => setDetails(null)} />

      {removing ? (
        <AlertConfirm
          open
          setOpen={(open) => (!open ? setRemoving(null) : null)}
          headerText="Remove this desk phone?"
          descriptionTextComp={
            <span>
              {removing.label || removing.model} ({removing.mac_display}) will be removed from the
              company and its SIP password will stop working. The handset itself is not changed.
            </span>
          }
          confirmBtnText="Remove"
          apiLoading={isRemoving}
          onConfirm={() => remove(removing.uuid)}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </>
  );
};

export default DeskPhones;
