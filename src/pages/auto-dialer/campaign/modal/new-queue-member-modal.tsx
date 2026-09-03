import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { ModalState } from '..';
import TableManager from '@/components/custom/table-manager';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { useDialpad } from '@/hooks/use-dialpad';
import { useNavigate } from 'react-router-dom';
import { createPrivateChatId } from '@/context/socket-events-context';
import CustomTooltip from '@/components/custom/custom-tooltip';

const statusConfig: Record<string, { label: string; bg: string; dotBg: string }> = {
  call: { label: 'On Call', bg: 'bg-rose-50 text-rose-700 border-rose-200', dotBg: 'bg-rose-500' },
  online: {
    label: 'Online',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotBg: 'bg-emerald-500',
  },
  offline: {
    label: 'Offline',
    bg: 'bg-gray-50 text-gray-600 border-gray-200',
    dotBg: 'bg-gray-400',
  },
  busy: { label: 'Busy', bg: 'bg-amber-50 text-amber-700 border-amber-200', dotBg: 'bg-amber-500' },
  dnd: { label: 'DND', bg: 'bg-red-50 text-red-700 border-red-200', dotBg: 'bg-red-500' },
};

const QueueMemberModal = ({
  modalState,
  setModalState,
}: {
  modalState: ModalState;
  setModalState: Dispatch<SetStateAction<ModalState>>;
}) => {
  const { open = false, data = [], type } = modalState || {};
  const { usersOnlineStatus, liveCalls, eventLiveCallsData } = useSocketEvents();
  const { user } = useUser();
  const { makeCall } = useDialpad();
  const navigate = useNavigate();

  const currentUserUuid = user?.uuid || user?.user_info?.uuid || '';
  const liveCallsData = useMemo(() => {
    return liveCalls?.length > 0 ? liveCalls : eventLiveCallsData || [];
  }, [liveCalls, eventLiveCallsData]);

  const isGroupType = type === 'Total Groups';

  const handleClose = () => setModalState({ open: false, data: [], type: null });

  const columns = useMemo(() => {
    if (isGroupType) {
      return [
        {
          header: 'Group Name',
          accessorKey: 'label',
          cell: ({ row }: any) => {
            const rowData = row?.original;
            const name = rowData?.label || rowData?.name || 'Unknown Group';
            return (
              <div className="flex items-center gap-3 py-1.5">
                <div className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="font-semibold text-gray-900">{name}</div>
              </div>
            );
          },
        },
        {
          header: 'Group ID',
          accessorKey: 'value',
          cell: ({ row }: any) => {
            const rowData = row?.original;
            return <div className="text-gray-500 font-mono text-xs">{rowData?.value || '---'}</div>;
          },
        },
      ];
    }

    return [
      {
        header: 'Name',
        accessorKey: 'first_name',
        cell: ({ row }: any) => {
          const rowData = row?.original;
          const displayName = (
            rowData?.label ||
            rowData?.name ||
            rowData?.first_name ||
            'Unknown User'
          ).trim();
          const email = (rowData?.email || '').trim();
          const extension = rowData?.value || rowData?.extension || '';
          const profile = rowData?.profile || rowData?.imageUrl || rowData?.image || '';
          const showEmail = email && displayName.toLowerCase() !== email.toLowerCase();

          return (
            <div className="flex items-center gap-3 py-1.5">
              <CustomAvatar
                name={displayName}
                showPresence={false}
                extension={extension}
                image={profile}
                size="36"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-gray-900 truncate max-w-[200px] capitalize">
                  {displayName}
                </span>
                {showEmail && (
                  <span className="text-gray-500 text-xs truncate max-w-[200px]">{email}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: 'Role',
        accessorKey: 'role',
        cell: ({ row }: any) => {
          const rowData = row?.original;
          const role = String(rowData?.role || 'AGENT').trim();
          const normalizedRole = role.toUpperCase();

          let badgeStyle = 'bg-gray-50 text-gray-700 border-gray-200';
          if (normalizedRole.includes('MANAGER')) {
            badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          } else if (normalizedRole.includes('ADMIN')) {
            badgeStyle = 'bg-violet-50 text-violet-700 border-violet-200';
          } else if (normalizedRole.includes('AGENT')) {
            badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
          }

          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle}`}
            >
              {role}
            </span>
          );
        },
      },
      {
        header: 'Extension',
        accessorKey: 'value',
        cell: ({ row }: any) => {
          const rowData = row?.original;
          const extension = rowData?.value || rowData?.extension || '';
          if (!extension) return <span className="text-gray-400">---</span>;

          return (
            <div className="flex items-center gap-1.5 text-gray-600 font-medium">
              <Icon name="Grid" className="w-4 h-4 text-gray-400" />
              <span>{extension}</span>
            </div>
          );
        },
      },
      {
        header: 'Status',
        id: 'status',
        cell: ({ row }: any) => {
          const rowData = row?.original;
          const ext = String(rowData?.value || rowData?.extension || '').trim();
          if (!ext) {
            return (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-600 border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Offline
              </div>
            );
          }

          const activeUser = Array.isArray(usersOnlineStatus)
            ? usersOnlineStatus.find(
                (statusUser: any) => String(statusUser?.userId ?? '').trim() === ext,
              )
            : null;

          const isOnCall = Array.isArray(liveCallsData)
            ? liveCallsData.some(
                (callItem: any) =>
                  String(callItem?.agent_extension ?? '').trim() === ext &&
                  ['answered', 'bridged'].includes(String(callItem?.status || '').toLowerCase()),
              ) || Boolean(activeUser?.onCall)
            : false;

          const isOnline = Boolean(activeUser?.online);
          const userStatus = String(activeUser?.status || '').toLowerCase();
          const status = isOnCall ? 'call' : isOnline ? userStatus || 'online' : 'offline';

          const config = statusConfig[status] || statusConfig.offline;

          return (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config.dotBg}`} />
              {config.label}
            </div>
          );
        },
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }: any) => {
          const rowData = row?.original;
          const ext = String(rowData?.value || rowData?.extension || '').trim();
          const memberUuid = rowData?.user_uuid || rowData?.uuid || '';
          const isSelf = memberUuid === currentUserUuid;

          if (!ext || isSelf) {
            return <div className="text-gray-400 text-xs">---</div>;
          }

          const handleCall = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const displayName = (
              rowData?.label ||
              rowData?.name ||
              rowData?.first_name ||
              ''
            ).trim();
            const extraHeaders = [
              displayName ? `X-ContactName: ${displayName}` : '',
              memberUuid ? `X-ContactUuid: ${memberUuid}` : '',
            ].filter(Boolean) as string[];

            makeCall(ext, { size: 'mini', extraHeaders });
            handleClose();
          };

          const handleChat = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const chatId = createPrivateChatId([currentUserUuid, memberUuid]);
            navigate(`/messenger?channel=chat&type=all&chatId=${chatId}&exact=true`);
            handleClose();
          };

          return (
            <div className="flex items-center gap-2">
              <CustomTooltip text="Call Member" side="top">
                <button
                  type="button"
                  onClick={handleCall}
                  className="flex items-center justify-center rounded-full w-8 h-8 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all cursor-pointer shadow-3xs"
                >
                  <Icon name="PhoneIcon" className="w-4 h-4" />
                </button>
              </CustomTooltip>

              <CustomTooltip text="Chat" side="top">
                <button
                  type="button"
                  onClick={handleChat}
                  className="flex items-center justify-center rounded-full w-8 h-8 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all cursor-pointer shadow-3xs"
                >
                  <Icon name="MessageIcon" className="w-4.5 h-4.5" />
                </button>
              </CustomTooltip>
            </div>
          );
        },
      },
    ];
  }, [isGroupType, usersOnlineStatus, liveCallsData, currentUserUuid]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-4xl w-11/12 p-5 max-h-[95vh] overflow-y-auto"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-1.5 text-900/80 mb-2">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            {type || 'Total Members'}
            <div
              onClick={handleClose}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="w-full h-full flex flex-col gap-2">
          <TableManager
            {...{
              columns,
              staticData: data || [],
              showPagination: false,
              isHeightSet: true,
              customClass: 'max-h-[500px]',
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QueueMemberModal;
