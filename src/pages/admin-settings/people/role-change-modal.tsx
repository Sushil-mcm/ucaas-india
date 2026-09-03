import { CloseIcon, SearchLine } from '@/assets/icons';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { handleAlert } from '@/lib/utils';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { assignRoleBulkUsers, getRoleList } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useMemo, useState } from 'react';
import './role-change-modal.css';

interface RoleChangeModalProps {
  open: boolean;
  setOpen: (state: boolean) => void;
  userData: any;
}

const EMPTY_ROLE_LIST: Array<{ name: string; type: string; uuid: string; role_uuid: string }> = [];
type RoleOption = ISELECTVALUE & { type: string };

const RoleChangeModal: FC<RoleChangeModalProps> = ({ open, setOpen, userData }) => {
  const queryClient: any = useQueryClient();
  const [search, setSearch] = useState('');
  const currentRoleName =
    userData?.custom_role_data?.name || userData?.role_data?.name || userData?.role || '';
  const selectedUserUUID = userData?.uuid || userData?.user_uuid || '';
  const fullName =
    `${userData?.first_name || ''}${userData?.last_name ? ` ${userData?.last_name}` : ''}`.trim() ||
    userData?.email ||
    'Selected user';

  const { data, isLoading } = useQuery({
    queryKey: ['useRolesList', false],
    queryFn: () => getRoleList(),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: open,
  });

  const roleList = data || EMPTY_ROLE_LIST;

  const roleOptions = useMemo<RoleOption[]>(
    () =>
      roleList?.map(
        (role: {
          name: string;
          type?: string;
          uuid: string;
          role_uuid?: string;
          is_custom?: boolean;
        }) => {
          /* Two API shapes carry the same idea under different names — the
             live role-list endpoint marks a role with `type: 'custom'` and
             splits its id across `uuid`/`role_uuid`; this app's demo data
             instead marks it with `is_custom` and only ever sets `uuid`.
             Reading both means a row always gets a real, distinct id instead
             of every row silently falling back to `role_uuid` (undefined
             here) and comparing equal to each other. */
          const isCustom =
            typeof role?.is_custom === 'boolean'
              ? role.is_custom
              : String(role?.type || '').toLowerCase() === 'custom';
          return {
            label: role?.name,
            value: (isCustom ? role?.uuid : role?.role_uuid) || role?.uuid || '',
            type: isCustom ? 'custom' : role?.type || 'system',
          };
        },
      ),
    [roleList],
  );

  const filteredRoleOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roleOptions;
    return roleOptions.filter((role) =>
      String(role?.label || '')
        .toLowerCase()
        .includes(term),
    );
  }, [roleOptions, search]);

  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);

  const { mutate: mutateAssignRoleBulkUsers, isPending } = useMutation({
    mutationFn: assignRoleBulkUsers,
    onSuccess: (data: any) => {
      handleAlert({
        text: data?.data?.data?.message || 'Role assigned successfully.',
        type: 'success',
      });
      queryClient.invalidateQueries(['fetchUsersList']);
      queryClient.invalidateQueries(['rolesList']);
      invalidateGlobalUsersDirectory(queryClient);
      setSearch('');
      setOpen(false);
    },
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.message || 'Failed to assign role.',
        type: 'error',
      });
    },
  });

  useEffect(() => {
    if (!open) return;
    const matchedRole = roleOptions?.find((item: RoleOption) => item?.label === currentRoleName);
    const nextRole =
      matchedRole ||
      (currentRoleName
        ? { label: currentRoleName, value: '', type: '' }
        : { label: '', value: '', type: '' });

    setSelectedRole((prev) => {
      if (prev?.label === nextRole?.label && prev?.value === nextRole?.value) return prev;
      return nextRole;
    });
  }, [open, currentRoleName, roleOptions]);

  const getRoleBadgeClass = (name: string) => {
    const normalized = String(name || '').toUpperCase();
    if (normalized === 'ADMIN')
      return 'text-ucass-active border-ucass-active-bg bg-ucass-active-bg';
    if (normalized === 'SUB-ADMIN') return 'text-indigo-700 border-indigo-200 bg-indigo-50';
    if (normalized === 'MANAGER') return 'text-amber-700 border-amber-200 bg-amber-50';
    if (normalized === 'AGENT') return 'text-slate-700 border-slate-200 bg-slate-50';
    if (normalized.includes('SUPPORT')) return 'text-emerald-700 border-emerald-200 bg-emerald-50';
    if (normalized.includes('SALES')) return 'text-rose-700 border-rose-200 bg-rose-50';
    return 'text-gray-700 border-gray-200 bg-gray-50';
  };

  const handleClose = () => {
    setSearch('');
    setOpen(false);
  };

  const handleSubmit = () => {
    const roleUUID = typeof selectedRole?.value === 'string' ? selectedRole.value : '';

    if (!roleUUID) {
      handleAlert({ text: 'Please select a role.', type: 'error' });
      return;
    }
    if (!selectedUserUUID) {
      handleAlert({ text: 'Unable to identify user for role change.', type: 'error' });
      return;
    }

    mutateAssignRoleBulkUsers({
      role_uuid: roleUUID,
      users: [selectedUserUUID],
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (val ? setOpen(true) : handleClose())}>
      <DialogContent
        className="gp-role-dialog w-[760px] max-w-[calc(100%-2rem)] p-0 gap-0"
        showCloseButton={false}
      >
        <div className="gp-role-head flex items-start justify-between p-5">
          <div className="flex flex-col gap-1">
            <h4 className="text-gray-900 text-lg font-semibold">Select Role</h4>
            <p className="text-sm text-gray-500">
              Selecting role for <span className="text-primary font-sm">{fullName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-900 cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="gp-role-search p-4">
          <Input
            placeholder="Search roles..."
            className="pl-10"
            IconPosition="left-0 pl-3 inset-y-0"
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith(' ')) return;
              setSearch(value);
            }}
            Icon={<SearchLine className="text-gray-500" />}
          />
        </div>

        <div className="max-h-[430px] overflow-y-auto p-3 flex flex-col gap-1.5">
          {isLoading ? (
            <div className="w-full min-h-[180px] flex items-center justify-center">
              <Loader variant="blue" />
            </div>
          ) : filteredRoleOptions?.length > 0 ? (
            <RadioGroup
              value={String(selectedRole?.value || '')}
              onValueChange={(value) => {
                const selected =
                  roleOptions.find((item) => String(item?.value || '') === value) || null;
                setSelectedRole(selected);
              }}
              className="gap-1.5"
            >
              {filteredRoleOptions.map((role, index) => {
                const roleValue = String(role?.value || '');
                const isSelected = roleValue === String(selectedRole?.value || '');
                return (
                  <div
                    key={`${roleValue}-${index}`}
                    className={`gp-role-row w-full text-sm rounded-xl px-3 py-3 flex items-center justify-between border${
                      isSelected ? ' is-selected' : ''
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={roleValue} />
                      <div className="flex flex-col">
                        <p className="text-gray-900 font-semibold text-md leading-tight">
                          {role?.label}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`uppercase tracking-[0.08em] text-[11px] font-semibold px-2.5 py-1 rounded-md border ${getRoleBadgeClass(role?.label || '')}`}
                    >
                      {String(role?.type || 'custom').toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </RadioGroup>
          ) : (
            <div className="w-full min-h-[180px] flex items-center justify-center text-sm text-gray-500">
              No roles found.
            </div>
          )}
        </div>

        <div className="gp-role-foot text-sm px-6 py-4 flex items-center justify-between">
          <p className="text-gray-600 font-medium">
            Selected:{' '}
            <span className="text-gray-900">
              {selectedRole?.label || currentRoleName || 'No role selected'}
            </span>
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant={'transparent'}
              className="gp-role-cancel"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={'outline'}
              className="gp-role-submit"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? <Loader variant="blue" size="sm" /> : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleChangeModal;
