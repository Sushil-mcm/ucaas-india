import { CloseIcon } from '@/assets/icons';
import Loader from '@/components/custom/loader';
import { getSessionChat } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

const formatMessageTime = (value: any) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number: number, size = 2) => String(number).padStart(size, '0');
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`,
  ].join(' ');
};

const formatResponseTime = (value: any) => {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds)) return '';
  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
  return `${(milliseconds / 1000).toFixed(1)}s`;
};

const ChatSession = ({ handleClose, rowData }: any) => {
  const { agentId, formData } = rowData || {};
  const { data: sessionChat = [], isLoading } = useQuery({
    queryKey: ['getSessionChat', agentId, formData?.sessionId],
    queryFn: () =>
      getSessionChat({
        agentId: agentId,
        sessionId: formData?.sessionId,
      }),
    select: (data) => data?.data?.messages || [],
    enabled: Boolean(agentId) && Boolean(formData?.sessionId),
  });
  //   const aiSettings = savedSettings.find((setting: any) => setting.name === type &&  setting.type === 'AI_ASSISTANT');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessionChat?.length]);

  //   useEffect(() => {

  //     if (chatId && aiSettings?.agentId && AIToken) {
  //       setIsAiLoading(true);
  //       const socket = makeAISocketConnection();
  //       if (socket) {
  //         socket.on('connect', () => {
  //           setTimeout(() => {
  //             initialEmitters(socket);
  //           }, 1000);
  //         });

  //         socket.on('reconnect', () => {
  //           setTimeout(() => {
  //             initialEmitters(socket);
  //           }, 1000);
  //         });

  //         socket.on('disconnect', (reason: any) => {
  //           console.log('disconnected');
  //           if (reason === 'io server disconnect') {
  //             socket.connect();
  //           }
  //         });

  //         socket.on('authorized', () => {
  //           console.log('under auth');
  //           setIsAiLoading(false);
  //           if (safeChat && !safeChat?.length) {
  //             socket.emit('question', {
  //               agentId: aiSettings?.agentId,
  //               token: AIToken,
  //             });
  //           }
  //         });

  //         socket.on('unauthorized', () => {
  //           socket.disconnect();
  //           setIsAiLoading(true);
  //           setAIToken('');
  //         });

  //         socket.on('answer', (data: any) => {
  //           setIsLoading(false);
  //           handleChat({
  //             mode: 'ai-chat',
  //             ...data,
  //           });
  //         });

  //         socket.connect();
  //         setAISocket(socket);
  //       }
  //       return () => {
  //         turnOffListeners(socket);
  //       };
  //     }
  //   }, [chatId, aiSettings?.agentId, AIToken]);

  //   useEffect(() => {
  //     if (
  //       !AIToken &&
  //       !!tokenData?.tokenId
  //       // !!tokenData?.result?.data_conversational_agent_id
  //     ) {
  //       setAIToken(tokenData?.tokenId);
  //     }
  //   }, [tokenData]);

  //   function initialEmitters(socket: any) {
  //     socket.emit('auth', AIToken);
  //   }

  //   function turnOffListeners(socket: any) {
  //     if (socket) {
  //       socket.off('connect');
  //       socket.off('disconnect');
  //       socket.off('reconnect');
  //     }
  //   }

  //   function handleChat(data: any) {
  //     if (data?.mode === 'ai-chat') {
  //       setAiChat((prev: any) => {
  //         const safePrev = prev || [];
  //         return [...safePrev, data];
  //       });
  //     }
  //   }

  return (
    <div className="rounded-xl bg-white shadow overflow-hidden absolute bottom-3 right-3 w-full max-w-[380px] z-50">
      <div className="rounded-t-xl p-3 bg-primary/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <AIChatIcon className="text-white w-4 h-4" />
          </div> */}
          <div className="flex flex-col">
            <h3 className="text-base text-white font-medium">AI Assistant</h3>
          </div>
        </div>
        <span className="cursor-pointer" onClick={() => handleClose()}>
          <CloseIcon className="text-white w-3 h-3" />
        </span>
      </div>
      <div
        ref={scrollRef}
        className=" p-3 bg-white w-full flex flex-col gap-2 min-h-[calc(100vh-11.5rem)] max-h-[calc(100vh-11.5rem)] overflow-y-auto"
      >
        {/* left items */}
        {sessionChat?.length
          ? sessionChat?.map((item: any, index: number) => {
              return (
                <div
                  key={`${item?.at || index}-${item?.role}`}
                  className="w-full flex flex-col gap-1"
                >
                  <div
                    className={`p-3 rounded-md ${item?.role === 'user' ? 'bg-primary rounded-br-xs w-fit max-w-[90%]' : 'bg-white border border-gray-200 rounded-bl-xs w-fit max-w-[90%] ml-auto'}`}
                  >
                    <div
                      className={`mb-1 text-xs font-semibold ${item?.role === 'user' ? 'text-white/80' : 'text-gray-700'}`}
                    >
                      {item?.displayName || (item?.role === 'user' ? 'User' : 'Agent')}
                    </div>
                    <p
                      className={`text-sm ${item?.role === 'user' ? 'text-white' : 'text-gray-900/80'}`}
                    >
                      {/* {item?.me ? item?.text : item?.answer} */}
                      {item?.data}
                    </p>
                  </div>
                  {item?.at ? (
                    <p
                      className={`text-[11px] text-gray-500 ${item?.role === 'user' ? 'text-left' : 'text-right'}`}
                    >
                      {formatMessageTime(item.at)}
                      {item?.role === 'assistant' &&
                      item?.responseTimeMs !== null &&
                      item?.responseTimeMs !== undefined
                        ? ` · Response ${formatResponseTime(item.responseTimeMs)}`
                        : ''}
                    </p>
                  ) : null}
                </div>
              );
            })
          : null}
        {isLoading ? (
          <div className="w-full flex items-center justify-center p-3">
            <Loader variant="blue" />
            525
          </div>
        ) : null}
      </div>
      {/* Chat Footer */}
      <div className=" p-4 bg-white text-gray-500 w-full text-center border-t border-gray-200 relative">
        Chat session has been ended
      </div>
    </div>
  );
};

export default ChatSession;
