import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { cn, scrollToBottom } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import moment from 'moment';
import { useEffect, useMemo, useRef, useState } from 'react';
import AgentChatMessageItem from './agent-chat-message-item';

const AgentChatMessages = ({ currentChat }: { currentChat: any }) => {
  const { user } = useUser();
  const {
    messageList = [],
    isFetchingMessages,
    isSocketConnected,
    setMessageList,
    handleGetMessageByChatId,
  } = useSocketEvents();
  const messageContainerRef = useRef<any>(null);
  const isScrolledToBottom = useRef(true);
  const scrollPosFromBottomRef = useRef(0);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const [hasNewBottomMessage, setHasNewBottomMessage] = useState(false);
  const [showGoToLatestMessage, setShowGoToLatestMessage] = useState(false);

  const messages = useMemo(() => {
    const current = (Array.isArray(messageList) ? messageList : []).find(
      (entry: any) => entry?.chatId === currentChat?.chatId,
    );
    const list = Array.isArray(current?.messages)
      ? current.messages.filter((messageItem: any) => !messageItem?.parentMsgId)
      : [];

    const unique = list.filter(
      (messageItem: any, index: number, self: any[]) =>
        index ===
        self.findIndex(
          (other: any) =>
            (other?.messageId || other?._id || '') ===
            (messageItem?.messageId || messageItem?._id || ''),
        ),
    );

    return unique.sort((a: any, b: any) => {
      const ta = new Date(a?.createdAt || 0).getTime();
      const tb = new Date(b?.createdAt || 0).getTime();
      return ta - tb;
    });
  }, [currentChat?.chatId, messageList]);

  const displayMessages = useMemo(() => messages, [messages]);

  useEffect(() => {
    if (!currentChat?.chatId || !user?.uuid || !isSocketConnected) return;

    const hasCurrentChatMessages = (Array.isArray(messageList) ? messageList : []).find(
      (entry: any) => entry?.chatId === currentChat?.chatId,
    );
    if (hasCurrentChatMessages) return;

    handleGetMessageByChatId({
      chatId: currentChat?.chatId,
      userId: user?.uuid,
    });
  }, [currentChat?.chatId, messageList, user?.uuid, isSocketConnected]);

  useEffect(() => {
    const handleOnline = () => {
      if (!currentChat?.chatId || !isSocketConnected || !user?.uuid) return;

      setMessageList((prevMessageList: any) => {
        const prevList = Array.isArray(prevMessageList) ? prevMessageList : [];
        return prevList.map((entry: any) =>
          entry?.chatId === currentChat?.chatId ? { ...entry, messages: [] } : entry,
        );
      });

      handleGetMessageByChatId({
        chatId: currentChat?.chatId,
        userId: user?.uuid,
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isSocketConnected, currentChat?.chatId, user?.uuid]);

  useEffect(() => {
    isScrolledToBottom.current = true;
    scrollPosFromBottomRef.current = 0;
    previousLastMessageIdRef.current = null;
    setHasNewBottomMessage(false);
    setShowGoToLatestMessage(false);
  }, [currentChat?.chatId]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    if (!displayMessages.length) {
      previousLastMessageIdRef.current = null;
      return;
    }

    const currentLastMessage = displayMessages[displayMessages.length - 1];
    const currentLastMessageId = currentLastMessage?.messageId || currentLastMessage?._id || null;
    const isInitialLoad = previousLastMessageIdRef.current === null;
    const isAppended = !isInitialLoad && previousLastMessageIdRef.current !== currentLastMessageId;

    const isAtBottom = isScrolledToBottom.current || scrollPosFromBottomRef.current < 120;
    const isSentByMe = currentLastMessage?.senderId === user?.uuid;

    if (isInitialLoad || isAtBottom || isSentByMe) {
      scrollToBottom(messageContainerRef, isInitialLoad ? 'instant' : 'smooth');
      isScrolledToBottom.current = true;
      scrollPosFromBottomRef.current = 0;
      setHasNewBottomMessage(false);
      setShowGoToLatestMessage(false);
    } else if (isAppended) {
      setHasNewBottomMessage(true);
      setShowGoToLatestMessage(true);
    }

    previousLastMessageIdRef.current = currentLastMessageId;
  }, [displayMessages, user?.uuid]);

  const handleMessageContainerScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const scrollFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    scrollPosFromBottomRef.current = scrollFromBottom;

    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 30) {
      isScrolledToBottom.current = true;
      setHasNewBottomMessage(false);
      setShowGoToLatestMessage(false);
    } else {
      isScrolledToBottom.current = false;
      setShowGoToLatestMessage(scrollFromBottom > 80);
    }
  };

  return (
    <div
      ref={messageContainerRef}
      onScroll={handleMessageContainerScroll}
      className="chatInnerSec relative w-full h-full overflow-y-auto overflow-x-hidden flex-1 bg-white"
    >
      {isFetchingMessages?.[currentChat?.chatId] ? (
        <div className="sticky top-2 z-10 mx-2 my-2 flex min-h-9 items-center justify-center rounded-lg bg-ucass-active-bg py-1.5 text-xs font-medium text-ucass-active sm:min-h-10 sm:py-2 sm:text-sm">
          Loading messages...
        </div>
      ) : null}

      <div className="relative flex w-full flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-5">
        {displayMessages.map((message: any, index: number, arr: any[]) => {
          const prevVisibleMessage = (() => {
            for (let i = index - 1; i >= 0; i--) {
              if (!arr[i]?.isDeleted) return arr[i];
            }
            return null;
          })();

          const currentDate = moment(message?.createdAt);
          const prevDate = moment(prevVisibleMessage?.createdAt);
          const showDateSeparator =
            !prevVisibleMessage ||
            (currentDate.isValid() && prevDate.isValid() && !currentDate.isSame(prevDate, 'day'));

          return (
            <div
              className="w-full flex flex-col"
              key={message?.messageId || message?._id || `msg-${index}`}
            >
              {showDateSeparator && currentDate.isValid() ? (
                <div className="flex items-center justify-center my-2 mx-auto">
                  <p className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-muted-foreground sm:px-4 sm:text-[13px] sm:font-normal">
                    {currentDate.isSame(moment(), 'day')
                      ? 'Today'
                      : currentDate.isSame(moment().subtract(1, 'day'), 'day')
                        ? 'Yesterday'
                        : currentDate.format('DD MMM YYYY')}
                  </p>
                </div>
              ) : null}

              <div className={cn('flex-1 min-w-0')}>
                <AgentChatMessageItem msgObj={message} currentChat={currentChat} />
              </div>
            </div>
          );
        })}

        {!displayMessages.length && !isFetchingMessages?.[currentChat?.chatId] ? (
          <div className="flex w-full items-center justify-center py-10 text-xs text-gray-500 sm:text-sm">
            No messages found.
          </div>
        ) : null}

        {(hasNewBottomMessage || showGoToLatestMessage) && (
          <div className="sticky bottom-4 left-0 w-full flex justify-end pr-1 sm:pr-3 z-20 pointer-events-none">
            <button
              type="button"
              onClick={() => {
                scrollToBottom(messageContainerRef, 'smooth');
                setHasNewBottomMessage(false);
                setShowGoToLatestMessage(false);
              }}
              className={`pointer-events-auto cursor-pointer w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all ${
                hasNewBottomMessage
                  ? 'bg-primary text-white animate-bounce'
                  : 'bg-ucass-active-bg text-ucass-active hover:text-white hover:bg-primary/90'
              }`}
              aria-label="Go to latest message"
              title="Go to latest message"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentChatMessages;
