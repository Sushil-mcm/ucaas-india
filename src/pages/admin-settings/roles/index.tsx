import TableManager from '@/components/custom/table-manager';
import { deleteCustomRole, userRolesList } from '@/services/api';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon, IconName } from '@/assets/icons/icon';
import SideDrawer from '@/components/custom/side-drawer';
import AddEditUserRole from './add-new-role';
import CustomTooltip from '@/components/custom/custom-tooltip';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import AssignUsersModal from './assign-users-modal';

const UserRoles = () => {
  const [drawerState, setDrawerState] = useState<boolean>(false);
  const [viewPermission, setViewPermissions] = useState<boolean>(false);
  const [roleData, setRoleData] = useState<any>(null);
  const [isDeleteRole, setIsDeleteRole] = useState<boolean>(false);
  const [isAssignUsersModalOpen, setIsAssignUsersModalOpen] = useState<boolean>(false);
  const { user = {} } = useUser();
  const { company_info } = user || {};
  const isTrial = company_info?.is_trial === 'Y';

  const queryClient: any = useQueryClient();
  const { mutate: mutateDeleteRole, isPending: isPendingDelete } = useMutation({
    mutationFn: deleteCustomRole,
    onSuccess: (data) => {
      handleAlert({
        text: data?.data?.data?.message || 'Custom role deleted successfully!',
        type: 'success',
      });
      queryClient.invalidateQueries(['rolesList']);
      setIsDeleteRole(false);
    },
  });
  const handleCloseDrawer = () => {
    setRoleData(null);
    setDrawerState(false);
    setViewPermissions(false);
  };

  const getRolePillClass = (name: string) => {
    const normalized = String(name || '').toUpperCase();
    if (normalized === 'ADMIN') {
      return 'text-ucass-active border-ucass-active-bg bg-ucass-active-bg';
    }
    if (normalized === 'SUB-ADMIN') {
      return 'text-indigo-700 border-indigo-200 bg-indigo-50';
    }
    if (normalized === 'MANAGER') {
      return 'text-amber-700 border-amber-200 bg-amber-50';
    }
    if (normalized === 'AGENT') {
      return 'text-slate-700 border-slate-200 bg-slate-50';
    }
    if (normalized.includes('SUPPORT')) {
      return 'text-emerald-700 border-emerald-200 bg-emerald-50';
    }
    if (normalized.includes('SALES')) {
      return 'text-rose-700 border-rose-200 bg-rose-50';
    }
    return 'text-primary border-primary/30 bg-primary/5';
  };

  const getRoleUsersCount = (data: any) => {
    return (
      data?.user_count ??
      data?.users_count ??
      data?.total_users ??
      data?.usersCount ??
      (Array.isArray(data?.users) ? data?.users?.length : 0) ??
      0
    );
  };

  const columns = [
    {
      header: 'Role Name',
      accessorKey: 'name',
      cell: ({ row }: any) => {
        const data = row?.original;
        return (
          <button
            type="button"
            className={`uppercase tracking-[0.08em] text-xs font-semibold px-3 py-2 rounded-lg border ${getRolePillClass(data?.name)}`}
            onClick={() => {
              setRoleData(data);
              setDrawerState(true);
              setViewPermissions(true);
            }}
          >
            {data?.name}
          </button>
        );
      },
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: ({ row }: any) => <p className="text-gray-800">{row?.original?.description || '--'}</p>,
    },
    {
      header: 'Type',
      accessorKey: 'company_uuid',
      cell: ({ getValue }: any) => (
        <p className="font-semibold text-gray-900">
          {getValue() === 'PREDEFINED' ? 'System' : 'Custom'}
        </p>
      ),
    },
    {
      header: 'Users',
      accessorKey: 'user_count',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        const usersCount = getRoleUsersCount(data);
        const isActiveUsersCount = Number(usersCount) > 0;
        return (
          <div className="w-full flex justify-center">
            <div
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold min-w-14 justify-center border ${
                isActiveUsersCount
                  ? 'border-ucass-active-bg bg-ucass-active-bg text-primary'
                  : 'border-gray-200 bg-gray-100 text-gray-500'
              }`}
            >
              <Icon name="UsersGroupLine" className="w-4 h-4" />
              <span>{usersCount}</span>
            </div>
          </div>
        );
      },
      meta: {
        textAlign: 'center',
      },
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original;
        const isSystemRole = data?.company_uuid === 'PREDEFINED';
        const isAdminRole = String(data?.name || '').toUpperCase() === 'ADMIN';
        const actions = [
          {
            icon: 'UserPlusLine',
            className: isAdminRole
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-100 text-emerald-500 hover:bg-emerald-500 hover:text-white',
            tooltipText: 'Assign Users',
            cb: () => {
              setRoleData(data);
              setIsAssignUsersModalOpen(true);
            },
            isDisabled: isAdminRole,
          },
          {
            /* Copying a built-in role into one you own.
    
               Manager, Agent and the rest are shared across every company on the
               platform -- their `company_uuid` is the literal string PREDEFINED
               rather than any company's id. Editing one would change it for
               everybody, so Edit is correctly refused on them.
    
               What was missing was the way forward. An administrator who wants
               "Manager, but without billing" clicked Edit on Manager, found it
               greyed out with no explanation, and reasonably concluded that
               roles cannot be changed at all. The create screen has always been
               able to start from a built-in role and copy its permissions --
               there was simply nothing pointing at it from here.
    
               Passing the role WITHOUT its uuid is what makes this a copy: the
               drawer sends a uuid only when it has one, so no uuid means create
               a new role rather than update this one. The company is left off
               for the same reason -- it is the flag that hides the Save button. */
            icon: 'CopyLine',
            className: 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white',
            tooltipText: isSystemRole
              ? `Make my own copy of ${data?.name}`
              : `Duplicate ${data?.name}`,
            cb: () => {
              setRoleData({
                name: `${data?.name} (copy)`,
                description: data?.description,
                permission: data?.permission,
              });
              /* Cleared explicitly. Viewing a built-in role sets read-only, and
                 without this a copy started straight after a view would open
                 with no way to save it. */
              setViewPermissions(false);
              setDrawerState(true);
            },
            isDisabled: false,
          },
          {
            /* View for a built-in role, Edit for your own.
    
               Seeing what Manager can actually do was always possible -- you
               click the role's name -- but the name is styled as a pill, which
               reads as a label rather than a control. Every administrator tries
               the Actions column first, found a greyed-out Edit, and concluded
               the permissions could be neither seen nor changed.
    
               A disabled button that explains itself is still a dead end. So a
               built-in role gets a working View instead: same read-only drawer
               the name already opened, reachable from where people look. */
            icon: isSystemRole ? 'EyeLine' : 'EditStrokIcon',
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: isSystemRole ? `See what ${data?.name} can do` : 'Edit',
            cb: () => {
              setRoleData(data);
              setDrawerState(true);
              if (isSystemRole) setViewPermissions(true);
            },
            isDisabled: false,
          },
          {
            icon: 'TrashBin',
            className: isSystemRole
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-red-100 text-red-400 hover:bg-red-500 hover:text-white',
            tooltipText: 'Delete',
            cb: () => {
              setRoleData(data);
              setIsDeleteRole(true);
            },
            isDisabled: isSystemRole,
          },
        ];

        return (
          <div className="flex items-center gap-2">
            {actions?.map((action, index) => (
              <CustomTooltip key={index} text={action.tooltipText} side="top">
                <div
                  className={`cursor-pointer flex items-center justify-center rounded-full w-8 h-8 ${action.className}`}
                  onClick={() => {
                    if (action.isDisabled) return;
                    action.cb();
                  }}
                >
                  <Icon name={action.icon as IconName} className="w-5 h-5" />
                </div>
              </CustomTooltip>
            ))}
          </div>
        );
      },
      meta: {
        textAlign: 'center',
      },
    },
  ];

  return (
    <>
      <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden ">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
            Users
            <div className="-rotate-90 text-gray-800">
              <Icon name="ChevronIcon" className="w-5 h-5" />
            </div>
            <span className="text-primary text-md">Role</span>
          </p>
          <div className="flex gap-2 filters">
            {/* <div className="flex gap-2">
                    <Search
                      placeholder={t("search_placeholder.search")}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div> */}
            {!isTrial && (
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (isTrial) {
                      handleAlert({
                        text: 'This feature is not available in your current plan. Please upgrade',
                        type: 'error',
                      });
                      return;
                    } else {
                      setRoleData(null);
                      setDrawerState(true);
                    }
                  }}
                  className="min-h-9"
                >
                  <Icon name="Plus" className="w-3 h-3" /> New Role
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full p-3 flex flex-col gap-2">
          <p className="text-gray-900 text-sm">
            Create a custom role to control what your team members can see and do. Select a starting
            point (like Manager or Agent) to automatically pre-fill recommended permissions, then
            fine-tune their access below.
          </p>
          <TableManager
            {...{
              emptyTablePlaceholder: 'No roles yet',
              descriptionEmptyTable:
                'Roles decide what somebody can see and change. Everyone has a role, so the ones you make here apply straight away.',
              columns,
              fetcherKey: 'rolesList',
              fetcherFn: userRolesList,
            }}
          />
        </div>
      </section>

      {drawerState && (
        <SideDrawer
          isOpen={drawerState}
          title={
            viewPermission
              ? `View Role (${roleData?.name})`
              : roleData
                ? `Update role (${roleData?.name})`
                : 'Add New Role'
          }
          isTab={false}
          enableResponsive
          handleClose={handleCloseDrawer}
          content={
            <AddEditUserRole
              drawerState={drawerState}
              setDrawerState={handleCloseDrawer}
              roleData={roleData}
              viewPermission={viewPermission}
            />
          }
        />
      )}

      {isAssignUsersModalOpen && (
        <AssignUsersModal
          open={isAssignUsersModalOpen}
          roleData={roleData}
          setOpen={(val) => {
            setIsAssignUsersModalOpen(val);
            if (!val) setRoleData(null);
          }}
        />
      )}

      {isDeleteRole && (
        <AlertConfirm
          {...{
            apiLoading: isPendingDelete,
            onConfirm: () => {
              mutateDeleteRole(roleData?.uuid);
            },
            open: isDeleteRole,
            setOpen: () => {
              setIsDeleteRole(false);
              setRoleData(null);
            },
          }}
        />
      )}
    </>
  );
};

export default UserRoles;
