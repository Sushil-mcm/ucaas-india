import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ic } from '@/components/mcm/icons';
import SideDrawer from '@/components/custom/side-drawer';
import UpdateForwarding from '@/pages/admin-settings/people/update-forwarding';
import { DirectoryDrawer, DirectoryPage, EmptyRow, FilterChip, SearchChip } from './page-shell';
import CustomAvatar from '@/components/custom/custom-avatar';
import { useConsoleDialer } from '@/pages/phone/console/dial-number';
import { useInstantMeeting } from '@/hooks/use-instant-meeting';
import { usePeopleRows, type PersonRow } from './people-rows';
import { useDirectoryFavourites } from './use-directory-favourites';
import { useUser } from '@/hooks/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMember, removeAssignNumber } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import AlertConfirm from '@/components/custom/alert-confirm';
import RemovalWarning, { useRemovalImpact } from '@/components/mcm/removal-warning';
import SetupGuide from '@/components/mcm/setup-guide';
import {
  PRESENCE_OPTIONS,
  presenceValueOf,
  useMyPresenceControl,
} from '@/hooks/use-presence-control';
import { useCompanyFeatures } from '@/hooks/rbac';
import RoleChangeModal from '@/pages/admin-settings/people/role-change-modal';
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
 * take (the platform's nearest thing to an ACD skill), live presence, and one
 * click to call, message or start video.
 *
 * Row actions mirror the platform's own Extension page rather than inventing a
 * second vocabulary: on this platform "Edit" for a user means Update Forwarding,
 * and it is gated on the same admin + plan permissions, so People cannot offer
 * an action the Extension page would refuse.
 */

const TONE_CLASS: Record<string, string> = {
  good: 'tag pos',
  busy: 'tag neg',
  warn: 'tag warn',
  idle: 'tag neu',
};

const People = () => {
  const navigate = useNavigate();
  const { dial } = useConsoleDialer();
  const { startVideoCall, isStarting } = useInstantMeeting();
  const { rows, isLoading } = usePeopleRows();

  const { user } = useUser();
  const { setMyPresence, isPending: isSettingPresence, myUuid } = useMyPresenceControl();
  const { features } = useCompanyFeatures();

  /* Same source the Extension page reads, so the two pages can't disagree about
     who may edit a user. */
  const userAccess = features?.plan_features?.account_setting?.access?.USER?.action;
  const isAdmin = user?.user_info?.role === 'ADMIN';
  const canEdit = Boolean(isAdmin && userAccess?.edit);
  const canAssignCallerId = Boolean(
    features?.plan_features?.virtual_numbers?.action?.assign_number,
  );

  /* Same gate the Extension page puts on Add Users: trial accounts and users
     without the add permission don't get an invite button that would fail. */
  const canInvite = Boolean(userAccess?.add) && user?.company_info?.is_trial !== 'Y';
  const canDelete = Boolean(userAccess?.delete);

  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<PersonRow | null>(null);

  /* Before anybody is removed, find what still points at them — a queue they
     are the last agent on, a menu key, a number forwarded to their extension.
     The roster is already on screen, so it is handed over rather than fetched
     a second time. */
  const roster = useMemo(() => rows.map((row: any) => row.raw), [rows]);
  const removal = useRemovalImpact((deleting?.raw ?? null) as any, Boolean(deleting), roster);
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

  /* Admins may change anyone's role except another admin's — the same rule the
     Extension page applies to its inline role control. */
  const canChangeRoleOf = (row: PersonRow) =>
    isAdmin && String(row.role || '').toUpperCase() !== 'ADMIN';

  const [changingRole, setChangingRole] = useState<PersonRow | null>(null);
  const [assigningCallerId, setAssigningCallerId] = useState<PersonRow | null>(null);
  const [inviting, setInviting] = useState(false);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const { isFavourite, toggleFavourite } = useDirectoryFavourites();
  const [presence, setPresence] = useState('Any');
  const [location, setLocation] = useState('All');
  const [open, setOpen] = useState<PersonRow | null>(null);
  const [editing, setEditing] = useState<PersonRow | null>(null);

  const departments = useMemo(() => {
    const found = new Set<string>();
    rows.forEach((row) => row.department !== '—' && found.add(row.department));
    return ['All', ...Array.from(found).sort()];
  }, [rows]);

  const locations = useMemo(() => {
    const found = new Set<string>();
    rows.forEach((row) => row.location !== '—' && found.add(row.location));
    return ['All', ...Array.from(found).sort()];
  }, [rows]);

  const presences = useMemo(() => {
    const found = new Set<string>();
    rows.forEach((row) => found.add(row.presence));
    return ['Any', ...Array.from(found).sort()];
  }, [rows]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (department !== 'All' && row.department !== department) return false;
      if (location !== 'All' && row.location !== location) return false;
      if (presence !== 'Any' && row.presence !== presence) return false;
      if (!needle) return true;
      return [
        row.name,
        row.role,
        row.department,
        row.location,
        row.extension,
        row.email,
        ...row.skills,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rows, search, department, presence, location]);

  const onQueue = rows.filter((row) => row.tone === 'good').length;

  /* Take the roster away as a spreadsheet.
   *
   * The platform has no export of any kind for people, so this is built here
   * out of the list already on screen. That is why it exports what the filters
   * are showing rather than "everybody": the rows are what this page fetched,
   * and pretending otherwise would quietly hand somebody a partial file
   * labelled as the whole company. The button says how many are in it.
   *
   * The file starts with a byte-order mark because otherwise a spreadsheet
   * opening it on Windows reads the accents in people's names as rubbish. */
  const exportRoster = () => {
    const csv = buildRosterCsv(
      visible.map((row) =>
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
              onClick={() => navigate('/directory?view=groups')}
            >
              <Ic n="users" />
              Groups
            </button>
            {/* The count is in the label on purpose: filters are on this page,
                and a button that just says "Export" invites somebody to file a
                filtered list as the whole company. */}
            <button
              type="button"
              className="btn ghost"
              disabled={!visible.length}
              title={
                visible.length === rows.length
                  ? 'Download everybody as a spreadsheet'
                  : 'Downloads the people these filters are showing, not the whole company'
              }
              onClick={exportRoster}
            >
              <Ic n="dl" />
              Export {visible.length}
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
            <SearchChip value={search} onChange={setSearch} placeholder="Search people" />
            <span className="fchip live" style={{ marginLeft: 'auto' }}>
              <span className="num">{onQueue}</span> available
            </span>
          </>
        }
      >
        {/* A new admin adding their first people is exactly who needs to see
            how far through setup they are. The guide hides itself once
            everything is done, so an established account never sees it. */}
        <SetupGuide companyInfo={user?.company_info} />

        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Groups</th>
              <th>Location</th>
              <th>Numbers</th>
              <th>ACD skills</th>
              <th>Presence</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <EmptyRow span={8} message="Loading the roster…" />
            ) : visible.length ? (
              visible.map((row: PersonRow) => (
                <tr key={row.uuid} className="gp-person-row" onClick={() => openPerson(row)}>
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
                  <td>{row.role}</td>
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
                    {row.skills.length ? (
                      row.skills.join(', ')
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
                        disabled={isSettingPresence}
                        onChange={(event) => setMyPresence(event.target.value)}
                      >
                        {PRESENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        className={`mini${isFavourite('person', row.uuid) ? ' mcm-fav-on' : ''}`}
                        title={
                          isFavourite('person', row.uuid)
                            ? `Remove ${row.name} from favourites`
                            : `Add ${row.name} to favourites`
                        }
                        aria-label={
                          isFavourite('person', row.uuid)
                            ? `Remove ${row.name} from favourites`
                            : `Add ${row.name} to favourites`
                        }
                        aria-pressed={isFavourite('person', row.uuid)}
                        onClick={() => toggleFavourite('person', row.uuid)}
                      >
                        <Ic n="star" size={16} fill={isFavourite('person', row.uuid)} />
                      </button>
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
                      {canEdit ? (
                        <button
                          type="button"
                          className="mini"
                          title={`Edit ${row.name}`}
                          aria-label={`Edit ${row.name}`}
                          onClick={() => setEditing(row)}
                        >
                          <Ic n="sliders" size={12} />
                        </button>
                      ) : null}
                      {isAdmin ? (
                        <button
                          type="button"
                          className="mini"
                          title={`${row.name}'s activity`}
                          aria-label={`${row.name}'s activity`}
                          onClick={() => navigate(`/activity/${row.uuid}`)}
                        >
                          <Ic n="clock" size={12} />
                        </button>
                      ) : null}
                      {canChangeRoleOf(row) ? (
                        <button
                          type="button"
                          className="mini"
                          title={`Change ${row.name}'s role`}
                          aria-label={`Change ${row.name}'s role`}
                          onClick={() => setChangingRole(row)}
                        >
                          <Ic n="shield" size={12} />
                        </button>
                      ) : null}
                      {canAssignCallerId && row.callerId ? (
                        <button
                          type="button"
                          className="mini"
                          title={`Remove ${row.name}'s caller ID`}
                          aria-label={`Remove ${row.name}'s caller ID`}
                          onClick={() => setUnassigning(row)}
                        >
                          <Ic n="x" size={12} />
                        </button>
                      ) : null}
                      {/* Admins can remove a person; never yourself, and never
                          another admin unless you are one. */}
                      {canDelete && row.uuid !== myUuid ? (
                        <button
                          type="button"
                          className="mini"
                          title={`Remove ${row.name}`}
                          aria-label={`Remove ${row.name}`}
                          onClick={() => setDeleting(row)}
                        >
                          <Ic n="trash" size={12} />
                        </button>
                      ) : null}
                      {canAssignCallerId ? (
                        <button
                          type="button"
                          className="mini"
                          title={`Assign a caller ID to ${row.name}`}
                          aria-label={`Assign a caller ID to ${row.name}`}
                          onClick={() => setAssigningCallerId(row)}
                        >
                          <Ic n="vm" size={12} />
                        </button>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow
                span={8}
                message={
                  rows.length ? 'Nobody matches those filters.' : 'No people on the roster yet.'
                }
              />
            )}
          </tbody>
        </table>

        {open ? (
          <DirectoryDrawer
            title={open.name}
            onClose={() => setOpen(null)}
            footer={
              <>
                <button type="button" className="btn ghost" onClick={() => setOpen(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => navigate(`/department/extension/${open.uuid}`)}
                >
                  <Ic n="user" />
                  Full record
                </button>
                {canEdit ? (
                  <button type="button" className="btn primary" onClick={() => setEditing(open)}>
                    <Ic n="sliders" />
                    Edit
                  </button>
                ) : null}
              </>
            }
          >
            <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
              <CustomAvatar name={open.name} image={open.image} size="44" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{open.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{open.role}</div>
              </div>
              <span
                className={`${TONE_CLASS[open.tone] || 'tag neu'}`}
                style={{ marginLeft: 'auto' }}
              >
                {open.presence}
              </span>
            </div>

            <div className="kv">
              <span className="k">Groups</span>
              <span className="v">{open.department}</span>
            </div>
            <div className="kv">
              <span className="k">Job title</span>
              <span className="v">{open.jobTitle || '—'}</span>
            </div>
            <div className="kv">
              <span className="k">Location</span>
              <span className="v">
                {open.location}
                {open.locationPlace ? ` · ${open.locationPlace}` : ''}
              </span>
            </div>
            <div className="kv">
              <span className="k">Extension</span>
              <span className="v num">{open.extension || '—'}</span>
            </div>
            <div className="kv">
              <span className="k">Email</span>
              <span className="v">{open.email || '—'}</span>
            </div>
            <div className="kv">
              <span className="k">Caller ID</span>
              <span className="v">{open.callerId || 'Not assigned'}</span>
            </div>
            <div className="kv">
              <span className="k">Phone</span>
              <span className="v num">{open.phone || '—'}</span>
            </div>
            <div className="kv">
              <span className="k">ACD skills</span>
              <span className="v">{open.skills.length ? open.skills.join(', ') : '—'}</span>
            </div>

            <div className="ac-acts" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="mini solid"
                disabled={!open.extension}
                onClick={() =>
                  open.extension && dial(open.extension, { forceRefreshContactInfo: true })
                }
              >
                <Ic n="phone" size={12} />
                Call
              </button>
              <button
                type="button"
                className="mini"
                onClick={() => navigate(`/messenger?chatId=${open.uuid}&chatType=chat`)}
              >
                <Ic n="chat" size={12} />
                Message
              </button>
              <button
                type="button"
                className="mini"
                disabled={isStarting}
                onClick={() =>
                  startVideoCall(
                    { user_uuid: open.uuid, name: open.name, email: open.email },
                    `Call with ${open.name}`,
                  )
                }
              >
                <Ic n="video" size={12} />
                Video
              </button>
            </div>
          </DirectoryDrawer>
        ) : null}
      </DirectoryPage>
      </div>

      {/* The platform's own add-user flow, opened in place rather than
          bouncing to Admin — the console keeps you in Directory. */}
      {inviting && (
        <SideDrawer
          isOpen={inviting}
          title="Invite people"
          width="min(1180px, 88vw)"
          isTab={false}
          handleClose={() => setInviting(false)}
          content={<AddUsers setDrawerState={() => setInviting(false)} />}
        />
      )}

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
