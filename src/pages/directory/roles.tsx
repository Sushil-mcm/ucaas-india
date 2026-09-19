import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCustomRole, getUserList, userRolesList } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { Ic } from '@/components/mcm/icons';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Icon } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomAvatar from '@/components/custom/custom-avatar';
import AddNewRole from '@/pages/admin-settings/roles/add-new-role';
import AssignUsersModal from '@/pages/admin-settings/roles/assign-users-modal';
import { AreaNav } from '@/pages/admin-settings/roles/area-nav';
import {
  OWNER_ROLE_KEY,
  isOwnerRole,
  roleDisplayDescription,
  roleDisplayName,
} from '@/pages/admin-settings/roles/role-names';
import { DirectoryPage, EmptyRow, FilterChip, SearchChip } from './page-shell';
import './roles-glass.css';

/**
 * Directory ▸ Roles — what people are allowed to do.
 *
 * The console version of the Admin roles list, reading the same
 * `userRolesList` and reusing the platform's own create/edit and assign-users
 * flows. Admin ▸ People ▸ Roles renders this too, so there is one screen rather
 * than two that drift apart.
 *
 * THE OWNER ROW
 *
 * The list endpoint builds its "system" rows from the plan's role_features
 * table, and the platform only ever writes role_features for AGENT, SUB-ADMIN
 * and MANAGER — so the owner role (stored as ADMIN) never comes back, and the
 * one role that the server actually enforces was the one role this screen did
 * not show. When it is missing it is added here, read-only, with a head count
 * from the user list. If a future build does return it, the server's row wins.
 */

type Role = {
  uuid?: string;
  role_uuid?: string;
  name?: string;
  description?: string;
  company_uuid?: string;
  type?: string;
  user_count?: number;
  users_count?: number;
  total_users?: number;
  usersCount?: number;
  users?: unknown[];
};

/** The count arrives under one of several keys depending on the endpoint. */
const usersOn = (role: Role) =>
  role?.user_count ??
  role?.users_count ??
  role?.total_users ??
  role?.usersCount ??
  (Array.isArray(role?.users) ? role.users.length : 0) ??
  0;

/** A predefined role belongs to the platform and cannot be edited or removed. */
const isSystemRole = (role: Role) => role?.company_uuid === 'PREDEFINED';

const Roles = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { pathname } = useLocation();
  const isAdmin = user?.user_info?.role === 'ADMIN';
  /* The same component serves /directory?view=roles. The access-control step
     strip belongs to the Admin area, where the other steps live. */
  const inAdminArea = pathname.startsWith('/admin-settings');

  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const { data: listed = [], isPending } = useQuery({
    queryKey: ['rolesList', 'directoryRoles'],
    queryFn: () => userRolesList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  const serverHasOwner = useMemo(
    () => (listed as Role[]).some((role) => isOwnerRole(role?.name)),
    [listed],
  );

  /* How many people hold the owner role: one request for one row, reading the
     total the list endpoint already returns. Only made when the row has to be
     built here. */
  const { data: ownerCount } = useQuery({
    queryKey: ['directoryPeople', 'ownerCount'],
    queryFn: () =>
      getUserList({ page: 1, limit: 1, filter: [{ key: 'role', value: OWNER_ROLE_KEY }] }),
    select: (res: any) => Number(res?.data?.data?.result?.total),
    enabled: !isPending && !serverHasOwner,
  });

  const roles: Role[] = useMemo(() => {
    if (isPending || serverHasOwner) return listed;
    const owner: Role = {
      uuid: 'owner-role',
      name: OWNER_ROLE_KEY,
      description: '',
      company_uuid: 'PREDEFINED',
      type: 'system',
      user_count: Number.isFinite(ownerCount) ? ownerCount : undefined,
    };
    return [owner, ...listed];
  }, [listed, isPending, serverHasOwner, ownerCount]);

  const { mutate: removeRole, isPending: isDeleting } = useMutation({
    mutationFn: deleteCustomRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      handleAlert({ text: 'Role deleted', type: 'success' });
      setDeleting(null);
    },
  });

  const visible = useMemo(() => {
    return roles.filter((role: Role) => {
      const system = isSystemRole(role);
      if (type === 'System' && !system) return false;
      if (type === 'Custom' && system) return false;
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return [role?.name, roleDisplayName(role?.name), role?.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [roles, search, type]);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['rolesList'] });
  };
  const [roleFormDirty, setRoleFormDirty] = useState(false);
  const [confirmDiscardRole, setConfirmDiscardRole] = useState(false);
  /* Same "you'll lose what you typed" guard as Directory's own Add-people
     dialog (people.tsx). */
  const requestCloseRoleForm = () => {
    if (roleFormDirty) {
      setConfirmDiscardRole(true);
    } else {
      closeForm();
    }
  };

  return (
    <div className="gp-roles">
      <DirectoryPage
        title="Roles"
        description="What each person sees in this app — and how many people hold each role."
        /* Honest about where the gate is. The tick boxes decide what this app
           shows and hides, and the server reads the same tree on the People
           routes, media, devices and company settings, plus admin scope on
           remove / edit / role change / restore / suspend. Roles management
           itself has no tree key yet, so it stays owner-and-admin only. */
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Step 2 of the access-control tour. Steps 1 and 3 and the
                reference table are not in the sidebar, so without this strip
                the tour dead-ended here. */}
            {inAdminArea && isAdmin ? <AreaNav current="/admin-settings/roles" /> : null}
            {isAdmin ? (
              <button type="button" className="btn primary" onClick={() => setCreating(true)}>
                <Ic n="plus" />
                New role
              </button>
            ) : null}
          </div>
        }
        filters={
          <>
            <FilterChip
              label="Type"
              value={type}
              options={['All', 'System', 'Custom']}
              onChange={setType}
            />
            <SearchChip value={search} onChange={setSearch} placeholder="Search roles" />
            <span className="fchip live" style={{ marginLeft: 'auto' }}>
              {visible.length} of {roles.length}
            </span>
          </>
        }
      >
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Type</th>
              <th>People</th>
              <th className="gp-role-actions-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <EmptyRow span={4} message="Loading roles…" />
            ) : visible.length ? (
              visible.map((role: Role) => {
                const system = isSystemRole(role);
                return (
                  <tr key={role?.uuid || role?.role_uuid || role?.name}>
                    <td>
                      <span className="flex items-center gap-2.5">
                        <CustomAvatar name={roleDisplayName(role?.name)} size="30" />
                        <div>
                          <div className="list-row-name">{roleDisplayName(role?.name)}</div>
                          <div className="list-row-sub">
                            {roleDisplayDescription(role?.name, role?.description) || 'No description'}
                          </div>
                        </div>
                      </span>
                    </td>
                    <td>
                      <span className={system ? 'tag neu' : 'tag acc'}>
                        {system ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="num">{usersOn(role)}</td>
                    <td className="gp-role-actions-cell">
                      <span className="flex items-center gap-2.5 gp-role-actions">
                        {isAdmin ? (
                          <button
                            type="button"
                            className="mini"
                            title={`Edit ${roleDisplayName(role?.name)}`}
                            aria-label={`Edit ${roleDisplayName(role?.name)}`}
                            onClick={() => setEditing(role)}
                          >
                            <Ic n="sliders" size={14} />
                          </button>
                        ) : null}
                        {/* System roles (company_uuid PREDEFINED) can't be
                            deleted - the platform owns them, not this
                            company - so the button is left off entirely
                            rather than shown disabled. */}
                        {isAdmin && !system ? (
                          <button
                            type="button"
                            className="mini"
                            title={`Delete ${roleDisplayName(role?.name)}`}
                            aria-label={`Delete ${roleDisplayName(role?.name)}`}
                            onClick={() => setDeleting(role)}
                          >
                            <Ic n="trash" size={14} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="mini gp-role-open"
                          onClick={() => setAssigning(role)}
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
                span={4}
                message={roles.length ? 'No roles match that search.' : 'No roles yet.'}
              />
            )}
          </tbody>
        </table>
      </DirectoryPage>

      <Dialog
        open={creating || Boolean(editing)}
        onOpenChange={(next) => !next && requestCloseRoleForm()}
      >
        <DialogContent
          className="gp-create-group-dialog gp-role-form-dialog sm:max-w-[860px]"
          showCloseButton={false}
        >
          <div className="gp-create-group-head">
            {/* A copy has a name but no uuid, so it is a new role being created and
                must not say "Update" — the heading is the main thing telling an
                admin whether they are about to change a role people already hold. */}
            <h2>
              {editing?.uuid
                ? `Update role (${editing?.name || ''})`
                : editing
                  ? `New role (from ${editing?.name || ''})`
                  : 'New role'}
            </h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={requestCloseRoleForm}
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <AddNewRole
              drawerState={creating || Boolean(editing)}
              roleData={editing || null}
              setDrawerState={(next: boolean) => !next && requestCloseRoleForm()}
              onDirtyChange={setRoleFormDirty}
            />
          </div>
        </DialogContent>
      </Dialog>

      {assigning ? (
        <AssignUsersModal
          open={Boolean(assigning)}
          setOpen={(value: boolean) => !value && setAssigning(null)}
          roleData={assigning}
          className="gp-assign-users-dialog"
        />
      ) : null}

      <AlertConfirm
        {...{
          apiLoading: false,
          open: confirmDiscardRole,
          setOpen: setConfirmDiscardRole,
          onConfirm: () => {
            setConfirmDiscardRole(false);
            setRoleFormDirty(false);
            closeForm();
          },
          onCancel: () => setConfirmDiscardRole(false),
          onClose: () => setConfirmDiscardRole(false),
          confirmBtnText: 'Discard',
          closeBtnText: 'Keep editing',
          descriptionTextComp: (
            <div className="text-md">
              You've started {editing ? 'editing this role' : 'creating a role'}. Closing now
              will lose what you've typed.
            </div>
          ),
        }}
      />

      <AlertConfirm
        {...{
          apiLoading: isDeleting,
          open: Boolean(deleting),
          setOpen: (value: boolean) => !value && setDeleting(null),
          onConfirm: () => {
            const id = deleting?.uuid || deleting?.role_uuid;
            if (!id) {
              handleAlert({ text: 'This role has no id to delete.', type: 'error' });
              setDeleting(null);
              return;
            }
            removeRole(id);
          },
          onCancel: () => setDeleting(null),
          onClose: () => setDeleting(null),
          confirmBtnText: 'Delete',
          closeBtnText: 'Cancel',
          descriptionTextComp: (
            <div className="text-md">
              Delete <strong>{roleDisplayName(deleting?.name)}</strong>? People holding it will
              need another role.
            </div>
          ),
        }}
      />
    </div>
  );
};

export default Roles;
