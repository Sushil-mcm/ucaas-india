import CustomAvatar from '@/components/custom/custom-avatar';
import { chatEvents } from '@/context/socket-events';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { ArrowLeft, CheckCircle2, Monitor, UserRound } from 'lucide-react';
import { useMemo } from 'react';

const formatStartedAt = (value: string | number | Date | null | undefined) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const AgentChatHeader = ({
  currentChat,
  onBackToList,
  onOpenProfile,
  isPendingRequest = false,
  pendingTopic = '',
}: any) => {
  const { user } = useUser();
  const { socketEventsManager, messageList = [] } = useSocketEvents();
  const isActiveChat = Boolean(currentChat?.chatId) && !currentChat?.isEnded;
  const shouldShowTransfer =
    Boolean(currentChat?.chatId) && (!currentChat?.isEnded || isPendingRequest);
  const shouldShowProfileAction = typeof onOpenProfile === 'function';
  const shouldShowActions = shouldShowTransfer || shouldShowProfileAction;

  const displayName = useMemo(() => {
    if (!currentChat) return 'Unknown';
    if (currentChat?.isGroupChat) return currentChat?.name || 'Group';
    if (currentChat?.chatId === user?.uuid) {
      return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'You';
    }

    const otherUser = (Array.isArray(currentChat?.users) ? currentChat.users : []).find(
      (chatUser: any) => chatUser?.uuid !== user?.uuid,
    );
    return (
      otherUser?.name ||
      `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim() ||
      'Unknown'
    );
  }, [currentChat, user?.first_name, user?.last_name, user?.uuid]);

  const avatarImage = useMemo(() => {
    if (currentChat?.isGroupChat) return currentChat?.avatar || '';
    const otherUser = (Array.isArray(currentChat?.users) ? currentChat.users : []).find(
      (chatUser: any) => chatUser?.uuid !== user?.uuid,
    );
    return otherUser?.profile || '';
  }, [currentChat, user?.uuid]);

  const startedAt = useMemo(() => {
    const currentChatMessages =
      (Array.isArray(messageList) ? messageList : []).find(
        (messageEntry: any) => messageEntry?.chatId === currentChat?.chatId,
      )?.messages || [];

    const firstMessage = [...currentChatMessages]
      .filter((message: any) => message?.createdAt)
      .sort(
        (a: any, b: any) =>
          new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime(),
      )?.[0];

    return formatStartedAt(firstMessage?.createdAt || currentChat?.createdAt);
  }, [currentChat?.chatId, currentChat?.createdAt, messageList]);

  const handleResolve = () => {
    if (!isActiveChat || !socketEventsManager || !currentChat?.chatId) return;
    socketEventsManager.emit(chatEvents.END_CONVERSATION, {
      chatId: currentChat.chatId,
    });
  };

  return (
    <div className="w-full min-h-16 border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 sm:px-4 md:px-5">
      <div className="flex min-h-16 items-center justify-between gap-2 sm:min-h-[74px] sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {onBackToList ? (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#EEE7DD] text-[#9A948F] hover:bg-[#FBE2C8]/45 md:hidden"
              aria-label="Back to chat list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <CustomAvatar name={displayName} image={avatarImage} size="42" isActivityInfo={false} />

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
                {displayName}
              </div>
              {pendingTopic ? (
                <span className="hidden shrink-0 rounded-md bg-ucass-active-bg px-2 py-0.5 text-[11px] font-semibold text-ucass-active sm:inline-flex">
                  {pendingTopic}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:gap-2 sm:text-xs">
              <span className="inline-flex items-center gap-1">
                <Monitor className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Windows
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="truncate">Started {startedAt}</span>
            </div>
          </div>
        </div>

        {shouldShowActions ? (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {shouldShowProfileAction ? (
              <button
                type="button"
                onClick={onOpenProfile}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[12px] font-semibold text-foreground hover:bg-muted sm:h-10 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
              >
                <UserRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Profile</span>
              </button>
            ) : null}
            {/* {shouldShowTransfer ? (
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-muted px-3 text-[12px] font-semibold text-foreground hover:bg-muted/80 sm:h-10 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Transfer</span>
              </button>
            ) : null} */}
            {shouldShowTransfer && !isPendingRequest ? (
              <button
                type="button"
                onClick={handleResolve}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-ucass-active px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-ucass-active sm:h-10 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Resolve</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AgentChatHeader;
