import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCustomRole, userRolesList } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { Ic } from '@/components/mcm/icons';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Icon } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
import AddNewRole from '@/pages/admin-settings/roles/add-new-role';
import AssignUsersModal from '@/pages/admin-settings/roles/assign-users-modal';
import { DirectoryPage, EmptyRow, SearchChip } from './page-shell';
import './roles-glass.css';

/**
 * Directory ▸ Roles — what people are allowed to do.
 *
 * The console version of the Admin roles list, reading the same
 * `userRolesList` and reusing the platform's own create/edit and assign-users
 * flows. Admin ▸ Users ▸ Role renders this too, so there is one screen rather
 * than two that drift apart.
 */

type Role = {
  uuid?: string;
  role_uuid?: string;
  name?: string;
  description?: string;
  company_uuid?: string;
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
  const isAdmin = user?.user_info?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const { data: roles = [], isPending } = useQuery({
    queryKey: ['rolesList', 'directoryRoles'],
    queryFn: () => userRolesList({ page: 1, limit: 200 }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  const { mutate: removeRole, isPending: isDeleting } = useMutation({
    mutationFn: deleteCustomRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolesList'] });
      handleAlert({ text: 'Role deleted', type: 'success' });
      setDeleting(null);
    },
  });

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return roles;
    return roles.filter((role: Role) =>
      [role?.name, role?.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [roles, search]);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['rolesList'] });
  };

  return (
    <div className="gp-roles">
      <DirectoryPage
        title="Roles"
        description="What each person sees in this app — and how many people hold each role."
        actions={
          isAdmin ? (
            <button type="button" className="btn primary" onClick={() => setCreating(true)}>
              <Ic n="plus" />
              New role
            </button>
          ) : null
        }
        filters={
          <>
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
                      <div className="list-row-name">{role?.name || '—'}</div>
                      <div className="list-row-sub">{role?.description || 'No description'}</div>
                    </td>
                    <td>
                      <span className={system ? 'tag neu' : 'tag acc'}>
                        {system ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="num">{usersOn(role)}</td>
                    <td className="gp-role-actions-cell">
                      <span className="flex items-center gap-2 gp-role-actions">
                        {isAdmin ? (
                          <button
                            type="button"
                            className="mini"
                            title={`Assign people to ${role?.name}`}
                            aria-label={`Assign people to ${role?.name}`}
                            onClick={() => setAssigning(role)}
                          >
                            <Ic n="users" size={16} />
                          </button>
                        ) : null}
                        {/* Predefined roles belong to the platform — the
                            platform's own screen refuses these too. Shown
                            disabled rather than hidden, so the column reads
                            the same width and shape on every row. */}
                        {isAdmin ? (
                          <button
                            type="button"
                            className="mini"
                            disabled={system}
                            title={system ? `${role?.name} is a system role and can't be edited` : `Edit ${role?.name}`}
                            aria-label={`Edit ${role?.name}`}
                            onClick={() => setEditing(role)}
                          >
                            <Ic n="sliders" size={16} />
                          </button>
                        ) : null}
                        {isAdmin ? (
                          <button
                            type="button"
                            className="mini"
                            disabled={system}
                            title={system ? `${role?.name} is a system role and can't be deleted` : `Delete ${role?.name}`}
                            aria-label={`Delete ${role?.name}`}
                            onClick={() => setDeleting(role)}
                          >
                            <Ic n="trash" size={16} />
                          </button>
                        ) : null}
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

      <Dialog open={creating || Boolean(editing)} onOpenChange={(next) => !next && closeForm()}>
        <DialogContent
          className="gp-create-group-dialog gp-role-form-dialog sm:max-w-[860px]"
          showCloseButton={false}
        >
          <div className="gp-create-group-head">
            <h2>{editing ? `Update role (${editing?.name || ''})` : 'New role'}</h2>
            <button
              type="button"
              aria-label="Close"
              className="gp-create-group-close"
              onClick={closeForm}
            >
              <Icon name="CloseIcon" className="h-4 w-4" />
            </button>
          </div>
          <div className="gp-create-group-body">
            <AddNewRole
              drawerState={creating || Boolean(editing)}
              roleData={editing || null}
              setDrawerState={closeForm}
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
              Delete <strong>{deleting?.name}</strong>? People holding it will need another role.
            </div>
          ),
        }}
      />
    </div>
  );
};

export default Roles;
