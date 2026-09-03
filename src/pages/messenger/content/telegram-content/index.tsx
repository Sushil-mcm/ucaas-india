import { EmojiICon, Send } from '@/assets/icons';
import EmojiPicker from 'emoji-picker-react';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

polyfillCountryFlagEmojis();
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCompanyFeatures } from '@/hooks/rbac';
import useMediaQuery from '@/hooks/use-media-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAISettingConfig, getWhatsAppMessages, sendWhatsAppMessage } from '@/services/api';
import { getObjectLength, groupMessagesByDate } from '@/lib/utils';
import moment from 'moment';
import { useUser } from '@/hooks/use-user';
import Loader from '@/components/custom/loader';
import { ACTIVITYLIST } from '@/components/activity-list/constants';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { AI_SETTINGS_TYPES, linkify } from '../../../messenger/constants';
import AiAssist from '../ai-assist';
import NotFound from '@/assets/images/not-found-img.svg';
import { ArrowDown, ArrowLeft, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

const ExpandableMessageBody = ({
  contentKey,
  isOutbound,
  children,
}: {
  contentKey: string;
  isOutbound: boolean;
  children: ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const collapsedHeight = 108;

  useEffect(() => {
    setIsExpanded(false);
  }, [contentKey]);

  useEffect(() => {
    const measureOverflow = () => {
      const contentEl = contentRef.current;
      if (!contentEl) {
        setIsOverflowing(false);
        return;
      }

      const previousMaxHeight = contentEl.style.maxHeight;
      const previousOverflow = contentEl.style.overflow;
      contentEl.style.maxHeight = 'none';
      contentEl.style.overflow = 'visible';
      const fullHeight = contentEl.scrollHeight;
      contentEl.style.maxHeight = previousMaxHeight;
      contentEl.style.overflow = previousOverflow;

      setIsOverflowing(fullHeight > collapsedHeight + 2);
    };

    measureOverflow();
    if (typeof window === 'undefined') return;

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureOverflow) : null;
    if (resizeObserver && contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    window.addEventListener('resize', measureOverflow);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureOverflow);
    };
  }, [children, collapsedHeight, contentKey]);

  return (
    <div className="inline-block max-w-full">
      <div className="relative">
        <div
          ref={contentRef}
          className={!isExpanded && isOverflowing ? 'overflow-hidden' : ''}
          style={!isExpanded && isOverflowing ? { maxHeight: `${collapsedHeight}px` } : undefined}
        >
          {children}
        </div>
        {!isExpanded && isOverflowing ? (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t ${isOutbound ? 'from-ucass-primary-200 to-transparent' : 'from-white to-transparent'}`}
          />
        ) : null}
      </div>

      {isOverflowing ? (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${isOutbound ? 'border-black/20 bg-black/5 text-black hover:bg-black/10' : 'border-[#D8E2F0] bg-white text-[#315A8F] hover:bg-[#F4F8FE]'}`}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        </div>
      ) : null}
    </div>
  );
};

const TelegramContent = ({
  selectedChat,
  selectedChannelType,
  onBackToList,
}: {
  selectedChat: any;
  selectedChannelType?: any;
  onBackToList?: () => void;
}) => {
  // const [searchParams] = useSearchParams();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [lineHeight, setLineHeight] = useState('leading-7');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { omniChannelData } = useSocketEvents();
  const { features } = useCompanyFeatures();
  const navigate = useNavigate();
  const { user_info } = user;
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [groupedMessage, setGroupedMessage] = useState<any>([]);
  const emojiPickerRef = useRef(null);
  const location = useLocation();
  const chatID = location?.search?.split('&')?.[1]?.split('=')?.[1] || '';

  const queryClient: any = useQueryClient();
  const handleEmojiOpen = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEmojiOpen((prev) => !prev);
  };
  const [isAiAssistOpen, setIsAiAssistOpen] = useState(false);
  const isDesktopAiLayout = useMediaQuery('(min-width: 1280px)');
  const {
    data,
    isPending,
    refetch: instagramMessagesRefetch,
  } = useQuery({
    queryKey: ['getTelegramMessages', chatID],
    queryFn: () => getWhatsAppMessages({ chat_id: chatID }),
    enabled: !!chatID,
    select: (data: any) => data?.data?.data?.result,
  });
  const { data: aiSettings = [] } = useQuery({
    queryKey: ['getAISettingConfig'],
    queryFn: () => getAISettingConfig(),
    select: (data: any) => data?.data?.data || [],
  });
  const hasAiAssistAgent = (Array.isArray(aiSettings) ? aiSettings : []).some(
    (setting: any) =>
      setting?.name === AI_SETTINGS_TYPES.TELEGRAM &&
      setting?.type === 'AI_ASSISTANT' &&
      Boolean(setting?.agentId),
  );
  const canShowAiAssistSetupPopover = Boolean(features?.plan_features?.ai?.IS_SHOW);
  const showAiAssistTrigger = hasAiAssistAgent || canShowAiAssistSetupPopover;
  const lastIncomingPrefill = useMemo(() => {
    const safeMessages = [...(Array.isArray(data) ? data : [])];
    safeMessages.sort((a: any, b: any) => {
      const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
      const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
      return ta - tb;
    });

    for (let index = safeMessages.length - 1; index >= 0; index--) {
      const item: any = safeMessages[index];
      const direction = `${item?.direction || ''}`.toLowerCase();
      if (direction !== `${ACTIVITYLIST.Inbound}`.toLowerCase()) continue;

      const rawMessage = item?.message;
      const parsedText =
        typeof rawMessage === 'string'
          ? rawMessage.trim()
          : Array.isArray(rawMessage)
            ? rawMessage
                .map((entry: any) => entry?.text || '')
                .filter(Boolean)
                .join('\n')
                .trim()
            : typeof rawMessage?.text === 'string'
              ? rawMessage.text.trim()
              : '';
      if (parsedText) return parsedText;
    }

    return '';
  }, [data]);

  useEffect(() => {
    if (data && data?.length) {
      setGroupedMessage(groupMessagesByDate(data));
    }
  }, [data]);

  const handleInputChange = (e: any) => {
    setMessage(e.target.value);
  };

  const { mutate: mutateSendMessage, isPending: isPendingInstagramMessage } = useMutation({
    mutationFn: sendWhatsAppMessage,
    mutationKey: ['SendTelegramMessages'],
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getTelegramMessages', chatID],
      });
      setMessage('');
    },
  });

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceFromBottom > 300) {
      setShowScrollToBottom(true);
    } else {
      setShowScrollToBottom(false);
    }
  };

  const scrollToBottom = () => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMessageSubmit = () => {
    if (isPendingInstagramMessage || !message.trim()) {
      return;
    }

    // const chatUniqueId = searchParams.get('chatId');
    // const chatIdArr = chatUniqueId?.split('_');

    mutateSendMessage({
      text: message.trim(),
      template_name: '',
      components: [],
      type: 'telegram',
      to: selectedChat?.to || '',
      from: selectedChat?.from || '',
      number_app_id: selectedChannelType?.number_app_id,
    });
  };

  useEffect(() => {
    if (!chatID) return;
    if (
      omniChannelData?.omni_details?.chatId &&
      omniChannelData?.omni_details?.channel_category === 'telegram' &&
      omniChannelData?.omni_details?.chatId === chatID
    ) {
      instagramMessagesRefetch();
    }
  }, [omniChannelData, chatID, queryClient]);

  useEffect(() => {
    if (getObjectLength(selectedChat)) textareaRef.current?.focus();
  }, [selectedChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [groupedMessage]);

  useEffect(() => {
    if (chatID) {
      setIsAiAssistOpen(false);
    }
  }, [chatID]);

  useEffect(() => {
    if (!hasAiAssistAgent) {
      setIsAiAssistOpen(false);
    }
  }, [hasAiAssistAgent]);

  return (
    <>
      <div className="w-full flex h-full min-h-0 flex-col overflow-hidden">
        <div className="w-full px-3 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] gap-2 flex items-center rounded-none border-b border-[rgba(225,200,165,0.9)] min-h-[65px]">
          {onBackToList ? (
            <button
              type="button"
              className="xl:hidden w-9 h-9 rounded-full flex items-center justify-center bg-[#FBE2C8]/40 text-[#2E2D35] hover:bg-[#F0DFC5] shrink-0"
              onClick={onBackToList}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          ) : null}
          <div className="relative shrink-0">
            <CustomAvatar name={selectedChat?.toName || 'Unknown Contact'} />
          </div>
          <div className="flex items-center justify-between min-w-0 flex-1">
            <div className="flex flex-col min-w-0">
              <p className="font-semibold text-[#2E2D35] truncate text-md">
                {selectedChat?.toName || 'Unknown Contact'}
              </p>
              {/* <p className="font-semibold text-gray-900 truncate text-xs">
                {selectedChat?.to || 't'}
              </p> */}
            </div>
          </div>
        </div>

        <div className="w-full min-h-0 flex-1 overflow-hidden flex flex-col lg:flex-row">
          <div className="w-full min-h-0 flex-1 flex flex-col gap-3 lg:min-w-0">
            <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-auto p-3" ref={scrollRef}>
              {isPending ? (
                <div className="flex justify-center items-center h-full">
                  <Loader variant="blue" />
                </div>
              ) : groupedMessage && groupedMessage.length ? (
                groupedMessage.map((item: any) => (
                  <>
                    <div className="flex items-center justify-center my-4 mx-auto w-[25%]">
                      <p className="bg-[#F0DFC5] rounded-full px-4 text-sm py-1">
                        {' '}
                        {moment(item?.date).format('DD MMM')}
                      </p>
                    </div>
                    {item?.message && item?.message.length
                      ? item?.message.map((message: any) => {
                          const direction = message?.direction;
                          return (
                            <div
                              className={`flex flex-col gap-1 items-${direction === ACTIVITYLIST.Outbound ? 'end' : 'start'} py-2 `}
                            >
                              <div className="flex justify-between items-center gap-1">
                                <div className="flex items-center gap-1 min-h-[20px]">
                                  {!message?.aiGenerated ? (
                                    <p className="text-[#2E2D35] text-xs font-medium">
                                      {direction === ACTIVITYLIST.Outbound
                                        ? 'You'
                                        : selectedChat?.toName || 'Unknown Contact'}
                                    </p>
                                  ) : (
                                    <CustomTooltip text="This message is from AI" side="top">
                                      <span className="inline-flex items-center cursor-pointer">
                                        <Sparkles className="text-[#9A948F] w-5 h-5" />
                                      </span>
                                    </CustomTooltip>
                                  )}
                                </div>
                                <small className="text-[#9A948F] text-xs">
                                  {moment(message?.updatedAt).format('hh:mm a')}
                                </small>
                              </div>
                              <div
                                className={`flex w-full justify-${direction === ACTIVITYLIST.Outbound ? 'end' : 'start'}`}
                              >
                                {direction !== ACTIVITYLIST.Outbound && (
                                  <div className="flex items-start mr-2">
                                    <div className="relative">
                                      <CustomAvatar
                                        name={
                                          direction === ACTIVITYLIST.Outbound
                                            ? `${user_info?.first_name || 'Unknown'} ${user_info?.last_name || 'Contact'} `
                                            : selectedChat?.toName || 'Unknown Contact'
                                        }
                                      />
                                    </div>
                                  </div>
                                )}

                                <div
                                  className={`${direction === ACTIVITYLIST.Outbound ? 'bg-ucass-primary-200 text-black p-2 rounded flex flex-row gap-2 w-fit py-2 px-3 rounded-tl-lg rounded-bl-lg rounded-br-lg max-w-[82%] sm:max-w-[70%] xl:max-w-[50%] text-sm' : 'flex flex-row gap-2 bg-white shadow-sm shadow-black/10 w-fit py-2 px-3 rounded-tr-lg rounded-br-lg rounded-bl-lg max-w-[82%] sm:max-w-[70%] xl:max-w-[50%] text-sm'}`}
                                >
                                  <ExpandableMessageBody
                                    contentKey={`${message?.id || message?._id || message?.updatedAt || ''}-${typeof message?.message === 'string' ? message?.message : JSON.stringify(message?.message || '')}`}
                                    isOutbound={direction === ACTIVITYLIST.Outbound}
                                  >
                                    {message?.message && typeof message?.message === 'string' ? (
                                      <p className="whitespace-pre-wrap break-words">
                                        {linkify(message?.message)}
                                      </p>
                                    ) : (
                                      <div className="w-full self-center">
                                        <p className="whitespace-pre-wrap break-words">
                                          {linkify(message?.message?.[0]?.text)}
                                        </p>
                                        <p className="whitespace-pre-wrap break-words">
                                          {linkify(message?.message?.[1]?.text)}
                                        </p>
                                      </div>
                                    )}
                                  </ExpandableMessageBody>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      : null}
                  </>
                ))
              ) : (
                <div className="w-full bg-white p-3 flex items-center justify-center h-full">
                  <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full mx-auto">
                    <img src={NotFound} alt="BusyImage" className="min-w-36 w-36" />
                    <p className="text-md font-medium text-[#2E2D35]"> No conversations yet</p>
                    <p className="text-md  text-[#2E2D35]">
                      Please add a user first to begin chatting.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col relative justify-between w-full  gap-2.5 p-3 bg-white">
              <div className="relative w-full h-full flex gap-2 sm:gap-3 justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="cursor-pointer relative flex items-center"
                    onClick={handleEmojiOpen}
                  >
                    <EmojiICon className="text-[#2E2D35]/80 w-4 h-4" />
                    <div
                      className="absolute bottom-[40px] left-[-.8rem] emoji-container"
                      ref={emojiPickerRef}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EmojiPicker
                        className="border-[#EEE7DD]"
                        open={emojiOpen}
                        lazyLoadEmojis
                        onEmojiClick={(data) => {
                          setMessage((prev) => prev + data?.emoji);
                          setEmojiOpen((prev) => !prev);
                        }}
                      />
                    </div>
                  </div>
                </div>
                {showAiAssistTrigger ? (
                  hasAiAssistAgent ? (
                    <span
                      className="cursor-pointer"
                      onClick={() => setIsAiAssistOpen((prev) => !prev)}
                    >
                      <Sparkles className="text-[#2E2D35]/80 w-4 h-4" />
                    </span>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="cursor-pointer inline-flex items-center"
                          aria-label="Set up AI assist agent"
                        >
                          <Sparkles className="text-[#2E2D35]/80 w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[calc(100vw-2rem)] max-w-80 p-0 overflow-hidden rounded-xl border border-[rgba(225,200,165,0.85)] shadow-xl"
                        side="top"
                      >
                        <div className="border-b border-gray-100 bg-gradient-to-br from-sky-50 to-indigo-50 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white bg-white/80 shadow-sm">
                              <Sparkles className="h-4 w-4 text-primary" />
                            </span>
                            <p className="text-sm font-semibold text-[#2E2D35]">AI Assist Setup</p>
                          </div>
                        </div>
                        <div className="space-y-3 p-3">
                          <p className="text-xs leading-5 text-[#9A948F]">
                            Set up an agent in AI Settings to start using AI-generated assistance.
                          </p>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size={'sm'}
                              className="rounded-md bg-[#f2994a] px-2.5 max-h- text-[11px] font-medium text-white hover:bg-[#f2994a] focus:bg-[#f2994a] active:bg-[#f2994a]"
                              onClick={() => navigate('/admin-settings/knowledge/ai-settings')}
                            >
                              Open AI Settings
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )
                ) : null}
                <textarea
                  className={`w-full h-full max-h-[46px] ${lineHeight} p-2 rounded-full text-sm overflow-y-auto placeholder:text-[#9A948F] focus:ring-0 focus-visible:shadow-none focus-visible:outline-0 text-[#2E2D35] shadow-none resize-none border border-[#EEE7DD]`}
                  value={message}
                  ref={textareaRef}
                  onChange={(e) => {
                    handleInputChange(e);
                    if (e.target.value.trim() === '') {
                      setLineHeight('leading-7');
                    }
                  }}
                  placeholder="Write a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                      e.preventDefault();
                      setLineHeight('leading-5');
                      requestAnimationFrame(() => {
                        const target = e.target as HTMLTextAreaElement;
                        target.scrollTop = target.scrollHeight;
                      });
                      setMessage((prevMessage) => {
                        return `${prevMessage}\n`;
                      });
                      return;
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isPendingInstagramMessage) {
                        handleMessageSubmit();
                        setLineHeight('leading-7');
                      }
                    }
                  }}
                />

                <div
                  onClick={() => handleMessageSubmit()}
                  className="cursor-pointer flex items-center justify-center rounded-full w-[40px] min-w-[40px] h-[40px]  bg-primary text-white hover:bg-[#FBE2C8]/40 hover:text-[#2E2D35]/80"
                >
                  {isPendingInstagramMessage ? (
                    <Loader variant="blue" />
                  ) : (
                    <button disabled={isPendingInstagramMessage} className="cursor-pointer">
                      <Send className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {showScrollToBottom && (
                  <button
                    onClick={scrollToBottom}
                    className="fixed cursor-pointer bottom-26 right-4 z-50 bg-primary text-white rounded-full shadow-lg w-10 h-10 flex items-center justify-center hover:bg-primary/90 transition"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {isAiAssistOpen && hasAiAssistAgent && isDesktopAiLayout ? (
            <div className="w-full h-[420px] border-t border-[#EEE7DD] lg:h-full lg:w-[360px] lg:min-w-[360px] lg:border-t-0">
              <AiAssist
                lineHeight={lineHeight}
                onClose={() => setIsAiAssistOpen(false)}
                type={AI_SETTINGS_TYPES.TELEGRAM}
                chatId={chatID}
                aiSettings={aiSettings}
                prefillText={lastIncomingPrefill}
                isEmbedded
              />
            </div>
          ) : null}
        </div>
      </div>
      {isAiAssistOpen && hasAiAssistAgent && !isDesktopAiLayout ? (
        <AiAssist
          lineHeight={lineHeight}
          onClose={() => setIsAiAssistOpen(false)}
          type={AI_SETTINGS_TYPES.TELEGRAM}
          chatId={chatID}
          aiSettings={aiSettings}
          prefillText={lastIncomingPrefill}
        />
      ) : null}
    </>
  );
};

export default TelegramContent;
