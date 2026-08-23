import { ArrowLeft } from 'lucide-react';
import MessageItem from '@/pages/messenger/chat/message-item';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { chatEvents } from '@/context/socket-events';
import Loader from '@/components/custom/loader';

const Thread = ({
  threadInfo,
  setThreadInfo,
  fromStreak,
  setMode,
  setInfoBar,
  currentChat,
}: any) => {
  const lastMessageRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [messageItemAction, setMessageItemAction] = useState({
    action: '',
    msgObj: null,
  });
  console.log(messageItemAction);

  const {
    socketEventsManager: socketManager,
    setThreadsManager,
    threadsManager,
  } = useSocketEvents();

  useEffect(() => {
    if (!socketManager || !threadInfo?.messageId) {
      return;
    }

    try {
      setIsLoading(true);
      socketManager.emit(
        chatEvents.THREAD_LIST,
        {
          parentMsgId: threadInfo?.messageId,
        },
        (data: any) => {
          try {
            const actualData = Array.isArray(data) ? data[0] : data;
            if (actualData?.status === 200 || actualData?.response?.status === 200) {
              const result = actualData?.data?.result?.threads || actualData?.result?.threads;
              const nextMessages = Array.isArray(result) ? result : [];

              setThreadsManager((prev: any) => {
                const prevList = Array.isArray(prev) ? prev : [];
                const withoutCurrentThread = prevList.filter(
                  (thread: any) => thread?.parentMsgId !== threadInfo?.messageId,
                );

                return [
                  ...withoutCurrentThread,
                  {
                    chatId: threadInfo?.chatId || currentChat?.chatId,
                    parentMsgId: threadInfo?.messageId,
                    messages: nextMessages,
                  },
                ];
              });
            }
          } catch (error) {
            console.error('Error in thread list callback:', error);
          } finally {
            setIsLoading(false);
          }
        },
      );
    } catch (error) {
      setIsLoading(false);
      console.error('Error in thread useEffect:', error);
    }
  }, [
    socketManager,
    threadInfo?.messageId,
    threadInfo?.chatId,
    currentChat?.chatId,
    setThreadsManager,
  ]);

  const currentThread = useMemo(() => {
    try {
      if (!threadsManager || !Array.isArray(threadsManager)) {
        console.warn('Thread: threadsManager is not a valid array');
        return [];
      }

      if (!threadInfo || !threadInfo?.messageId) {
        console.warn('Thread: threadInfo or messageId is missing for currentThread');
        return [];
      }

      const foundThread = threadsManager.find(
        (thread: any) => thread?.parentMsgId === threadInfo?.messageId,
      );

      if (!foundThread) {
        return [];
      }

      return Array.isArray(foundThread?.messages) ? foundThread.messages : [];
    } catch (error) {
      console.error('Error accessing currentThread:', error);
      return [];
    }
  }, [threadInfo?.messageId, threadsManager]);

  useEffect(() => {
    if (currentThread?.length && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView();
    }
  }, [currentThread?.length]);

  return (
    <div className="w-full flex flex-col h-full min-h-0 bg-[var(--color-bg-gray-50)] overflow-hidden">
      <div className="w-full shrink-0 px-4 bg-white flex items-center justify-between border-b min-h-[56px] lg:min-h-[65px] border-b-gray-200">
        <div className="cursor-pointer" onClick={() => setInfoBar(false)}>
          <div className="flex gap-2 items-center">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm lg:text-base font-semibold text-gray-900">Call Details</h3>
          </div>
        </div>
      </div>

      <div className="h-0 min-h-0 flex-1 p-4 overflow-y-auto overflow-x-hidden bg-white lg:bg-[var(--color-bg-gray-50)]">
        <MessageItem
          fromStreak={fromStreak}
          {...threadInfo}
          currentChat={currentChat}
          setThreadInfo={setThreadInfo}
          setMode={setMode}
          setInfoBar={setInfoBar}
          fromThread={true}
          msgObj={threadInfo}
          setMessageItemAction={setMessageItemAction}
        />

        {currentThread && currentThread?.length > 0 ? (
          <div className="w-full max-w-40 mx-auto relative h-[1px] bg-[var(--color-bg-gray-200)] flex justify-center items-center my-6">
            <div className="bg-[var(--color-bg-gray-100)] px-3 py-1 absolute -top-3 text-[var(--color-text-gray-600)] text-xs rounded-full  shadow-2xs border">
              {currentThread?.length} replies
            </div>
          </div>
        ) : (
          <div className="w-full max-w-40 mx-auto relative h-[1px] bg-[var(--color-bg-gray-200)] flex justify-center items-center my-6">
            <div className="bg-[var(--color-bg-gray-100)] px-3 py-1 absolute -top-3 text-[var(--color-text-gray-600)] text-xs rounded-full  shadow-2xs border">
              0 replies
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center">
            <Loader />
          </div>
        ) : currentThread && currentThread?.length > 0 ? (
          currentThread?.map((message: any) => {
            if (message?.isDeleted) {
              return null;
            }
            return (
              <div key={message?.messageId}>
                <MessageItem
                  fromStreak={fromStreak}
                  currentChat={currentChat}
                  setThreadInfo={setThreadInfo}
                  setMode={setMode}
                  setInfoBar={setInfoBar}
                  fromThread={true}
                  {...message}
                  msgObj={message}
                  setMessageItemAction={setMessageItemAction}
                />
              </div>
            );
          })
        ) : null}
      </div>

      {threadInfo?.messageType === 'prompt' ? null : (
        <div className="p-4 border-t italic text-center text-xs text-gray-500">
          Replies are disabled for this message type
        </div>
      )}
    </div>
  );
};

export default Thread;
