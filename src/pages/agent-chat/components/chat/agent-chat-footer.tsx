import { useSocketEvents } from '@/hooks/use-socket-events';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AiAssist from '@/pages/messenger/content/ai-assist';
import { AI_SETTINGS_TYPES } from '@/pages/messenger/constants';
import { getAISettingConfig } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import EmojiPicker from 'emoji-picker-react';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

polyfillCountryFlagEmojis();
import { SendHorizontal, Smile, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';

const buildMessagePayload = (text: string) => [
  {
    type: 'paragraph',
    children: [{ text }],
  },
];

const extractMessageText = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractMessageText(item))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  if (typeof value === 'object') {
    if (typeof value?.text === 'string') return value.text.trim();
    if (typeof value?.message === 'string') return value.message.trim();
    if (typeof value?.value === 'string') return value.value.trim();
    if (Array.isArray(value?.children)) return extractMessageText(value.children);
    if (Array.isArray(value?.content)) return extractMessageText(value.content);
  }

  return '';
};

const getMessagePreviewText = (value: any): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      const fromParsed = extractMessageText(parsed);
      return fromParsed || trimmed;
    } catch {
      return trimmed;
    }
  }
  return extractMessageText(value);
};

const AgentChatFooter = ({
  currentChat,
  typingText,
}: {
  currentChat: any;
  typingText?: string;
}) => {
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const navigate = useNavigate();
  const { handleSendMessage, handleTyping, messageList } = useSocketEvents();
  const [text, setText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAiAssistOpen, setIsAiAssistOpen] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const { data: aiSettings = [] } = useQuery({
    queryKey: ['getAISettingConfig'],
    queryFn: () => getAISettingConfig(),
    select: (data: any) => data?.data?.data || [],
  });

  const hasAiAssistAgent = (Array.isArray(aiSettings) ? aiSettings : []).some(
    (setting: any) =>
      setting?.name === AI_SETTINGS_TYPES.CHAT_ASSISTANT &&
      setting?.type === 'AI_ASSISTANT' &&
      Boolean(setting?.agentId),
  );
  const canShowAiAssistSetupPopover = Boolean(features?.plan_features?.ai?.IS_SHOW);
  const showAiAssistTrigger = hasAiAssistAgent || canShowAiAssistSetupPopover;
  const lastIncomingPrefill = useMemo(() => {
    const chatMessages = ((Array.isArray(messageList) ? messageList : []).find(
      (chatItem: any) => chatItem?.chatId === currentChat?.chatId,
    )?.messages || []) as any[];

    for (let index = chatMessages.length - 1; index >= 0; index--) {
      const messageItem = chatMessages[index];
      if (!messageItem || messageItem?.isDeleted) continue;
      if (!messageItem?.senderId || messageItem?.senderId === user?.uuid) continue;
      const preview = getMessagePreviewText(messageItem?.message || '').trim();
      if (preview) return preview;
    }

    return '';
  }, [messageList, currentChat?.chatId, user?.uuid]);

  const emitTyping = (typing: boolean) => {
    if (!currentChat?.chatId) return;
    handleTyping({ currentChat, isTyping: typing });
    isTypingRef.current = typing;
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) emitTyping(false);
    };
  }, [currentChat?.chatId]);

  useEffect(() => {
    setIsAiAssistOpen(false);
  }, [currentChat?.chatId]);

  useEffect(() => {
    if (!hasAiAssistAgent) {
      setIsAiAssistOpen(false);
    }
  }, [hasAiAssistAgent]);

  const onTextChange = (value: string) => {
    setText(value);
    const hasContent = value.trim().length > 0;

    if (hasContent && !isTypingRef.current) emitTyping(true);
    if (!hasContent && isTypingRef.current) emitTyping(false);

    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (hasContent) {
      typingTimeoutRef.current = window.setTimeout(() => {
        if (isTypingRef.current) emitTyping(false);
      }, 1200);
    }
  };

  const sendMessage = () => {
    const normalizedText = text.trim();
    if (!normalizedText || !currentChat?.chatId || !user?.uuid) return;

    const isOwnChat = currentChat?.chatId === user?.uuid;
    const receiverId = isOwnChat
      ? [user?.uuid]
      : (Array.isArray(currentChat?.users) ? currentChat.users : [])
          .map((chatUser: any) => chatUser?.uuid)
          .filter((id: string) => id && id !== user?.uuid);

    handleSendMessage({
      chatId: currentChat?.chatId,
      message: buildMessagePayload(normalizedText),
      attachments: [],
      senderId: user?.uuid,
      receiverId,
      messageId: uuidV4(),
      createdAt: new Date().toISOString(),
    });

    setText('');
    setIsEmojiPickerOpen(false);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) emitTyping(false);
  };

  return (
    <div className="relative flex w-full flex-col gap-2 border-t border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-2 py-2 sm:px-3">
      {typingText ? (
        <div className="px-1 text-[11px] text-ucass-active sm:text-xs">{typingText}</div>
      ) : null}

      <div className="relative w-full rounded-xl border border-border bg-white shadow-sm">
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message..."
          className="w-full min-h-[74px] resize-none rounded-xl border-0 bg-transparent px-3 py-2.5 pr-24 text-[13px] leading-5 text-foreground outline-none sm:min-h-[90px] sm:px-4 sm:py-3 sm:pr-28 sm:text-[14px] sm:leading-6"
        />

        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 sm:right-3 sm:gap-2">
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted sm:h-8 sm:w-8"
              onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
              title="Emoji"
            >
              <Smile className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </button>
            {isEmojiPickerOpen ? (
              <div className="absolute bottom-9 right-0 z-50 overflow-hidden rounded-lg shadow-xl sm:bottom-10">
                <EmojiPicker
                  lazyLoadEmojis
                  searchDisabled={false}
                  onEmojiClick={(data: any) => onTextChange(`${text}${data?.emoji || ''}`)}
                />
              </div>
            ) : null}
          </div>

          {showAiAssistTrigger ? (
            hasAiAssistAgent ? (
              <button
                type="button"
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted sm:h-8 sm:w-8"
                onClick={() => setIsAiAssistOpen((prev) => !prev)}
                title="AI Assist"
              >
                <Sparkles className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </button>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted sm:h-8 sm:w-8"
                    aria-label="Set up AI assist agent"
                    title="AI Assist setup required"
                  >
                    <Sparkles className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-2rem)] max-w-80 p-0 overflow-hidden rounded-xl border border-[rgba(225,200,165,0.9)] shadow-xl"
                  side="top"
                >
                  <div className="border-b border-gray-100 bg-gradient-to-br from-sky-50 to-indigo-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white bg-white/80 shadow-sm">
                        <Sparkles className="h-4 w-4 text-ucass-active" />
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
                        className="rounded-md bg-ucass-active px-2.5 max-h- text-[11px] font-medium text-white hover:bg-ucass-active focus:bg-ucass-active active:bg-ucass-active"
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

          <button
            type="button"
            onClick={sendMessage}
            className={cn(
              'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-ucass-active bg-ucass-active text-white hover:bg-ucass-active sm:h-8 sm:w-8',
              text.trim().length ? '' : 'opacity-50 cursor-not-allowed',
            )}
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      {isAiAssistOpen && hasAiAssistAgent ? (
        <AiAssist
          lineHeight="leading-7"
          onClose={() => setIsAiAssistOpen(false)}
          type={AI_SETTINGS_TYPES.CHAT_ASSISTANT}
          chatId={currentChat?.chatId || ''}
          aiSettings={aiSettings}
          prefillText={lastIncomingPrefill}
        />
      ) : null}
    </div>
  );
};

export default AgentChatFooter;
