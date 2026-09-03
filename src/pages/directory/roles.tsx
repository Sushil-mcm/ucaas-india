import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCustomRole, userRolesList } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { Ic } from '@/components/mcm/icons';
import SideDrawer from '@/components/custom/side-drawer';
import AlertConfirm from '@/components/custom/alert-confirm';
import AddNewRole from '@/pages/admin-settings/roles/add-new-role';
import AssignUsersModal from '@/pages/admin-settings/roles/assign-users-modal';
import { DirectoryPage, EmptyRow, SearchChip } from './page-shell';
import { roleDisplayName, roleDisplayDescription } from '@/lib/role-display-names';
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
    <>
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
              <th>Actions</th>
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
                      {/* The stored name is an authorisation gate - the platform
                          compares role strings directly - so only the label
                          changes here, never the value. */}
                      <div className="list-row-name">{roleDisplayName(role?.name)}</div>
                      <div className="list-row-sub">
                        {roleDisplayDescription(role?.name, role?.description) || 'No description'}
                      </div>
                    </td>
                    <td>
                      <span className={system ? 'tag neu' : 'tag acc'}>
                        {system ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="num">{usersOn(role)}</td>
                    <td>
                      <span className="flex items-center gap-1">
                        {isAdmin ? (
                          <button
                            type="button"
                            className="mini"
                            title={`Assign people to ${roleDisplayName(role?.name)}`}
                            aria-label={`Assign people to ${roleDisplayName(role?.name)}`}
                            onClick={() => setAssigning(role)}
                          >
                            <Ic n="users" size={12} />
                          </button>
                        ) : null}
                        {/* Looking at a built-in role.

                            Manager, Agent and Sub-admin showed one button —
                            assign people — and nothing else, so there was no way
                            to see what they actually permit. The drawer already
                            copes: it hides its Save button for a platform role,
                            so opening one is read-only without any extra work.
                            It simply had nothing to open it. */}
                        {isAdmin && system ? (
                          <button
                            type="button"
                            className="mini"
                            title={`See what ${roleDisplayName(role?.name)} can do`}
                            aria-label={`See what ${roleDisplayName(role?.name)} can do`}
                            onClick={() => setEditing(role)}
                          >
                            <Ic n="eye" size={12} />
                          </button>
                        ) : null}

                        {/* Copying any role into one you own.

                            A built-in role cannot be edited, and that is right:
                            its owner is the literal string PREDEFINED rather
                            than any company, so it is shared by every company on
                            the platform and changing it would change it for all
                            of them. What was missing was the way forward —
                            "Manager, but without billing" meant rebuilding it
                            from nothing.

                            Passing the role WITHOUT its uuid is what makes this
                            a copy rather than an edit: the form sends a uuid
                            only when it has one. Leaving the company off is what
                            brings the Save button back. */}
                        {isAdmin ? (
                          <button
                            type="button"
                            className="mini"
                            title={
                              system
                                ? `Make my own copy of ${roleDisplayName(role?.name)}`
                                : `Duplicate ${roleDisplayName(role?.name)}`
                            }
                            aria-label={`Duplicate ${roleDisplayName(role?.name)}`}
                            onClick={() =>
                              setEditing({
                                /* The name people see, not the one stored. A copy
                                   of Manager opened as "MANAGER (copy)" carrying
                                   "Default features for MANAGER (Ultimate)" --
                                   the platform's own wording for a role this
                                   company never named that. The list has said
                                   Account admin for a while; the copy has to
                                   agree with it or the rename only went half
                                   way. */
                                name: `${roleDisplayName(role?.name)} (copy)`,
                                description: roleDisplayDescription(
                                  role?.name,
                                  role?.description,
                                ),
                                permission: (role as any)?.permission,
                              } as Role)
                            }
                          >
                            <Ic n="copy" size={12} />
                          </button>
                        ) : null}

                        {/* Predefined roles belong to the platform — the
                            platform's own screen refuses these too. */}
                        {isAdmin && !system ? (
                          <button
                            type="button"
                            className="mini"
                            title={`Edit ${role?.name}`}
                            aria-label={`Edit ${role?.name}`}
                            onClick={() => setEditing(role)}
                          >
                            <Ic n="sliders" size={12} />
                          </button>
                        ) : null}
                        {isAdmin && !system ? (
                          <button
                            type="button"
                            className="mini"
                            title={`Delete ${role?.name}`}
                            aria-label={`Delete ${role?.name}`}
                            onClick={() => setDeleting(role)}
                          >
                            <Ic n="trash" size={12} />
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

      {(creating || editing) && (
        <SideDrawer
          isOpen={creating || Boolean(editing)}
          /* A copy has a name but no uuid, so it is a new role being created and
             must not say "Update" — the heading is the main thing telling an
             admin whether they are about to change a role people already hold. */
          title={
            editing?.uuid
              ? `Update role (${editing?.name || ''})`
              : editing
                ? `New role (from ${editing?.name || ''})`
                : 'New role'
          }
          width="min(980px, 80vw)"
          isTab={false}
          enableResponsive
          handleClose={closeForm}
          content={
            <AddNewRole
              drawerState={creating || Boolean(editing)}
              roleData={editing || null}
              setDrawerState={closeForm}
            />
          }
        />
      )}

      {assigning ? (
        <AssignUsersModal
          open={Boolean(assigning)}
          setOpen={(value: boolean) => !value && setAssigning(null)}
          roleData={assigning}
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
    </>
  );
};

export default Roles;
