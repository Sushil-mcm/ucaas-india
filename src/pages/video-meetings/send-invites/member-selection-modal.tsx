import { CloseIcon } from '@/assets/icons';
import CustomAvatar from '@/components/custom/custom-avatar';
import Loader from '@/components/custom/loader';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-user';
import { getUserList } from '@/services/api';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { Search, X } from 'lucide-react';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { SCHEDULEMEETING } from '../Calender/constants';

interface MemberSelectionModalProps {
  isPending?: boolean;
  formInstance: any;
  modalState: any;
  setModalState: (open: any) => void;
  handleSubmitMembers?: (members: InviteMember[]) => void;
  type?: string;
}

interface InviteUser {
  uuid?: string;
  user_uuid?: string;
  userId?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  extension?: string | number;
  profile?: string;
  hash?: string;
  user_info?: {
    uuid?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    extension?: string | number;
    profile?: string;
    hash?: string;
  };
}

interface InviteMember {
  email: string;
  name: string;
  type: 'USER';
  user_uuid: string;
  hash?: string;
  extension?: string | number;
  profile?: string;
}

const normalizeEmail = (email?: string) => (email || '').trim().toLowerCase();
const normalizeExtension = (extension?: string | number) => String(extension || '').trim();

const getUserIdentity = (inviteUser: Partial<InviteUser>) => {
  const userInfo = inviteUser?.user_info || {};
  return {
    uuid: String(
      inviteUser?.uuid || inviteUser?.user_uuid || inviteUser?.userId || userInfo?.uuid || '',
    ),
    email: normalizeEmail(inviteUser?.email || userInfo?.email),
    extension: normalizeExtension(inviteUser?.extension || userInfo?.extension),
  };
};

const getUserEmail = (inviteUser: Partial<InviteUser>) =>
  inviteUser?.email || inviteUser?.user_info?.email || '';
const getUserExtension = (inviteUser: Partial<InviteUser>) =>
  inviteUser?.extension || inviteUser?.user_info?.extension || '';
const getUserProfile = (inviteUser: Partial<InviteUser>) =>
  inviteUser?.profile || inviteUser?.user_info?.profile || '';
const getUserDisplayName = (inviteUser: Partial<InviteUser>) => {
  const userInfo = inviteUser?.user_info || {};
  const firstName = inviteUser?.first_name || userInfo?.first_name || '';
  const lastName = inviteUser?.last_name || userInfo?.last_name || '';
  const email = getUserEmail(inviteUser);
  const extension = getUserExtension(inviteUser);

  return (
    inviteUser?.name ||
    userInfo?.name ||
    `${firstName} ${lastName}`.trim() ||
    email ||
    normalizeExtension(extension) ||
    'User'
  );
};

const getUserKey = (inviteUser: Partial<InviteUser>) => {
  const identity = getUserIdentity(inviteUser);
  return identity.uuid || identity.email || identity.extension;
};

const getMemberKey = (member: Partial<InviteMember>) =>
  member?.user_uuid || normalizeEmail(member?.email) || normalizeExtension(member?.extension);

const MemberSelectionModal: FC<MemberSelectionModalProps> = ({
  isPending,
  formInstance,
  modalState,
  setModalState,
  handleSubmitMembers,
  type,
}) => {
  const {
    watch,
    setValue,
    formState: { errors },
  } = formInstance;
  const { user } = useUser();
  const isCategoryTask = type === SCHEDULEMEETING?.task;
  const currentUserUuid =
    user?.uuid || user?.user_uuid || user?.userId || user?.user_info?.uuid || '';
  const currentUserEmail = normalizeEmail(user?.email || user?.user_info?.email);
  const currentUserExtension = normalizeExtension(
    user?.extension || user?.user_info?.extension || user?.sip_credentials?.extension,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState<InviteMember[]>([]);
  const [currentPageUsers, setCurrentPageUsers] = useState<InviteUser[]>([]);
  const parentSelected = watch('members') || [];

  const isOpen = useMemo(() => {
    if (typeof modalState === 'boolean') return modalState;
    if (modalState && typeof modalState === 'object' && 'inviteMembers' in modalState) {
      return Boolean(modalState?.inviteMembers);
    }
    return Boolean(modalState);
  }, [modalState]);

  const closeModal = useCallback(() => {
    if (typeof modalState === 'boolean') {
      setModalState(false);
      return;
    }
    if (modalState && typeof modalState === 'object') {
      setModalState({ ...modalState, inviteMembers: false });
      return;
    }
    setModalState(false);
  }, [modalState, setModalState]);

  const isCurrentUserMember = useCallback(
    (member: { user_uuid?: string | number; email?: string; extension?: string | number }) => {
      const byUuid = Boolean(
        member?.user_uuid &&
        currentUserUuid &&
        String(member.user_uuid) === String(currentUserUuid),
      );
      const byEmail = Boolean(
        member?.email && currentUserEmail && normalizeEmail(member.email) === currentUserEmail,
      );
      const byExtension = Boolean(
        member?.extension &&
        currentUserExtension &&
        normalizeExtension(member.extension) === currentUserExtension,
      );
      return byUuid || byEmail || byExtension;
    },
    [currentUserEmail, currentUserExtension, currentUserUuid],
  );

  const mapUserToMember = useCallback((inviteUser: InviteUser): InviteMember => {
    const userInfo = inviteUser?.user_info || {};
    return {
      email: getUserEmail(inviteUser),
      name: getUserDisplayName(inviteUser),
      type: 'USER',
      user_uuid:
        inviteUser?.uuid || inviteUser?.user_uuid || inviteUser?.userId || userInfo?.uuid || '',
      hash: inviteUser?.hash || userInfo?.hash,
      extension: getUserExtension(inviteUser),
      profile: getUserProfile(inviteUser),
    };
  }, []);

  const currentUserFallbackMember = useMemo<InviteMember | null>(() => {
    if (!isCategoryTask) return null;
    const userInfo = user?.user_info || {};
    const email = user?.email || userInfo?.email || '';
    const extension =
      user?.extension || userInfo?.extension || user?.sip_credentials?.extension || '';
    const userUuid = user?.uuid || user?.user_uuid || user?.userId || userInfo?.uuid || '';
    const firstName = user?.first_name || userInfo?.first_name || '';
    const lastName = user?.last_name || userInfo?.last_name || '';
    const name =
      user?.name ||
      userInfo?.name ||
      `${firstName} ${lastName}`.trim() ||
      email ||
      normalizeExtension(extension) ||
      'You';

    if (!userUuid && !email && !extension) return null;
    return {
      email,
      name,
      type: 'USER',
      user_uuid: userUuid,
      hash: user?.hash || userInfo?.hash,
      extension,
      profile: user?.profile || userInfo?.profile,
    };
  }, [isCategoryTask, user]);

  const sanitizedParentSelected = useMemo(() => {
    if (!Array.isArray(parentSelected)) return [];
    const uniqueMembers = new Map<string, InviteMember>();

    parentSelected.forEach((member: any) => {
      const memberUser = member?.user || member?.user_detail || member?.user_info || {};
      const firstName = member?.first_name || memberUser?.first_name || '';
      const lastName = member?.last_name || memberUser?.last_name || '';
      const email = member?.email || memberUser?.email || '';
      const extension = member?.extension || memberUser?.extension || '';
      const normalizedMember: InviteMember = {
        email,
        name:
          member?.name ||
          memberUser?.name ||
          `${firstName} ${lastName}`.trim() ||
          email ||
          normalizeExtension(extension),
        type: 'USER',
        user_uuid: member?.user_uuid || member?.userId || member?.uuid || memberUser?.uuid || '',
        hash: member?.hash || memberUser?.hash,
        extension,
        profile: member?.profile || memberUser?.profile,
      };
      const key = getMemberKey(normalizedMember);
      if (!key || uniqueMembers.has(key)) return;
      if (!isCategoryTask && isCurrentUserMember(normalizedMember)) return;
      uniqueMembers.set(key, normalizedMember);
    });

    if (isCategoryTask && currentUserFallbackMember) {
      const currentUserKey = getMemberKey(currentUserFallbackMember);
      if (currentUserKey && !uniqueMembers.has(currentUserKey)) {
        uniqueMembers.set(currentUserKey, currentUserFallbackMember);
      }
    }

    return Array.from(uniqueMembers.values());
  }, [currentUserFallbackMember, isCategoryTask, isCurrentUserMember, parentSelected]);

  useEffect(() => {
    if (!isOpen) return;
    setLocalSelected(sanitizedParentSelected);
    setSearchTerm('');
  }, [isOpen, sanitizedParentSelected]);

  const selectedKeySet = useMemo(
    () => new Set(localSelected.map((member) => getMemberKey(member)).filter(Boolean)),
    [localSelected],
  );

  const handleToggleUser = useCallback(
    (inviteUser: InviteUser) => {
      const userKey = getUserKey(inviteUser);
      if (!userKey) return;
      setLocalSelected((previous) => {
        const exists = previous.some((member) => getMemberKey(member) === userKey);
        if (exists) return previous.filter((member) => getMemberKey(member) !== userKey);
        return [...previous, mapUserToMember(inviteUser)];
      });
    },
    [mapUserToMember],
  );

  const selectUserRows = useCallback(
    (response: any) => {
      const rows = response?.data?.data?.result?.rows;
      if (!Array.isArray(rows)) return [];
      return rows.filter((inviteUser: InviteUser) => {
        if (!getUserKey(inviteUser)) return false;
        const identity = getUserIdentity(inviteUser);
        return (
          isCategoryTask ||
          !isCurrentUserMember({
            user_uuid: identity.uuid,
            email: identity.email,
            extension: identity.extension,
          })
        );
      });
    },
    [isCategoryTask, isCurrentUserMember],
  );

  const handleTableData = useCallback(
    (response: any) => setCurrentPageUsers(selectUserRows(response)),
    [selectUserRows],
  );

  const currentPageKeySet = useMemo(
    () => new Set(currentPageUsers.map((inviteUser) => getUserKey(inviteUser)).filter(Boolean)),
    [currentPageUsers],
  );
  const checkedCurrentPageCount = useMemo(
    () =>
      currentPageUsers.filter((inviteUser) => selectedKeySet.has(getUserKey(inviteUser))).length,
    [currentPageUsers, selectedKeySet],
  );
  const allCurrentPageSelected =
    currentPageUsers.length > 0 && checkedCurrentPageCount === currentPageUsers.length;

  const handleSelectCurrentPage = useCallback(
    (checked: CheckedState) => {
      const shouldSelect = checked === true;
      setLocalSelected((previous) => {
        if (!shouldSelect) {
          return previous.filter((member) => !currentPageKeySet.has(getMemberKey(member)));
        }
        const merged = new Map<string, InviteMember>();
        previous.forEach((member) => {
          const key = getMemberKey(member);
          if (key) merged.set(key, member);
        });
        currentPageUsers.forEach((inviteUser) => {
          const key = getUserKey(inviteUser);
          if (key) merged.set(key, mapUserToMember(inviteUser));
        });
        return Array.from(merged.values());
      });
    },
    [currentPageKeySet, currentPageUsers, mapUserToMember],
  );

  const columns = useMemo(
    () => [
      {
        header: 'Member',
        accessorKey: 'name',
        cell: ({ row }: any) => {
          const inviteUser = row.original as InviteUser;
          const fullName = getUserDisplayName(inviteUser);
          const email = getUserEmail(inviteUser);
          const extension = getUserExtension(inviteUser);
          const identity = getUserIdentity(inviteUser);
          const isSelf = isCurrentUserMember({
            user_uuid: identity.uuid,
            email,
            extension,
          });
          return (
            <div className="flex min-w-0 items-center gap-3">
              <CustomAvatar
                name={fullName || email}
                showPresence
                extension={normalizeExtension(extension) || undefined}
                image={getUserProfile(inviteUser)}
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">
                  {fullName || email}
                  {isCategoryTask && isSelf ? (
                    <span className="ml-1.5 text-xs font-normal text-gray-500">(You)</span>
                  ) : null}
                </p>
                {extension ? (
                  <p className="truncate text-xs text-gray-500">Ext. {extension}</p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        header: 'Email',
        accessorKey: 'email',
        cell: ({ row }: any) => getUserEmail(row.original) || '--',
      },
      {
        header: 'Select',
        accessorKey: 'selection',
        meta: { textAlign: 'center' },
        cell: ({ row }: any) => {
          const inviteUser = row.original as InviteUser;
          const userKey = getUserKey(inviteUser);
          return (
            <div className="flex justify-center">
              <Checkbox
                checked={selectedKeySet.has(userKey)}
                onCheckedChange={() => handleToggleUser(inviteUser)}
                aria-label={`Select ${getUserDisplayName(inviteUser)}`}
              />
            </div>
          );
        },
      },
    ],
    [handleToggleUser, isCategoryTask, isCurrentUserMember, selectedKeySet],
  );

  const handleRemoveSelected = useCallback((memberKey: string) => {
    setLocalSelected((previous) => previous.filter((member) => getMemberKey(member) !== memberKey));
  }, []);

  const handleInviteClick = useCallback(() => {
    const finalSelected = isCategoryTask
      ? localSelected
      : localSelected.filter((member) => !isCurrentUserMember(member));
    setValue('members', finalSelected, { shouldValidate: true });
    handleSubmitMembers?.(finalSelected);
  }, [handleSubmitMembers, isCategoryTask, isCurrentUserMember, localSelected, setValue]);

  const title = isCategoryTask ? 'Assign Members' : 'Invite Members';
  const actionText = isCategoryTask ? 'Assign' : 'Invite';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent
        className="h-[92vh] max-h-[860px] w-[96vw] max-w-5xl overflow-hidden p-0"
        showCloseButton={false}
      >
        <section className="flex h-full min-h-0 flex-col bg-white">
          <header className="shrink-0 border-b border-gray-200 px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Search the directory and choose members across pages.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="cursor-pointer text-gray-500 opacity-70 transition-opacity hover:opacity-100"
                aria-label={`Close ${title}`}
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[1.6fr_1fr] lg:grid-rows-1">
            <div className="flex min-h-0 flex-col border-b border-gray-200 lg:border-r lg:border-b-0">
              <div className="shrink-0 space-y-3 border-b border-gray-200 px-4 py-4 sm:px-6">
                <Input
                  placeholder="Search by name, email, or extension"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  value={searchTerm}
                  Icon={<Search className="h-4 w-4 text-gray-500" />}
                  IconPosition="left-0 pl-3 inset-y-0"
                  className="pl-9"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      onCheckedChange={handleSelectCurrentPage}
                      disabled={isPending || currentPageUsers.length === 0}
                      checked={
                        allCurrentPageSelected
                          ? true
                          : checkedCurrentPageCount > 0
                            ? 'indeterminate'
                            : false
                      }
                    />
                    <Label className="text-sm text-gray-900">Select current page</Label>
                  </div>
                  <span className="text-xs text-gray-700">
                    {checkedCurrentPageCount}/{currentPageUsers.length} selected on this page
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
                <TableManager
                  columns={columns}
                  fetcherKey="inviteMembersUserList"
                  fetcherFn={getUserList}
                  select={selectUserRows}
                  onSuccess={handleTableData}
                  extraParams={{ displayType: 'dropdown' }}
                  search={searchTerm}
                  enabled={isOpen}
                  tableMaxHeight="calc(92vh - 300px)"
                  customClass="min-h-[280px]"
                  emptyTablePlaceholder="No users found"
                  descriptionEmptyTable="Try a different search term."
                />
              </div>
            </div>

            <aside className="flex min-h-0 flex-col bg-white">
              <div className="shrink-0 border-b border-gray-200 px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Selection</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {localSelected.length}
                    </p>
                  </div>
                  {localSelected.length > 0 ? (
                    <Button
                      type="button"
                      variant="transparent"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setLocalSelected([])}
                    >
                      Clear all
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-gray-700">
                  Selections are preserved while you search or change pages.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                {localSelected.length > 0 ? (
                  <ul className="space-y-2">
                    {localSelected.map((member) => {
                      const memberKey = getMemberKey(member);
                      return (
                        <li
                          key={memberKey}
                          className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {member?.name || member?.email}
                            </p>
                            <p className="truncate text-xs text-gray-700">{member?.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelected(memberKey)}
                            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            aria-label={`Remove ${member?.name || member?.email}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex min-h-[190px] flex-col items-center justify-center px-4 text-center">
                    <p className="mt-3 text-sm text-gray-700">No members selected yet</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Choose users from the table to build your final list.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto shrink-0 border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
                {errors?.members?.message ? (
                  <small className="mb-2 block text-red-500">{errors.members.message}</small>
                ) : null}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="transparent"
                    onClick={closeModal}
                    disabled={isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleInviteClick}
                    disabled={localSelected.length === 0 || isPending}
                    className="w-full sm:w-auto"
                  >
                    {isPending ? (
                      <div className="flex items-center justify-center p-5">
                        <Loader variant="blue" size="sm" />
                      </div>
                    ) : (
                      actionText
                    )}
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default MemberSelectionModal;
