import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker from 'emoji-picker-react';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

polyfillCountryFlagEmojis();
import {
  CheckSquare,
  ClipboardList,
  Copy,
  Edit,
  Forward,
  Pin,
  PinOffIcon,
  Reply,
  ReplyAll,
  Smile,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { getMessagePreviewText, getReceiverIds, pendingReactionsCache } from './helpers';
import { handleAlert } from '@/lib/utils';

interface ItemHoveredContentProps {
  senderId: string;
  messageId: string;
  currentChat: any;
  msgObj: any;
  fromThread?: boolean;
  fromMeetChat?: boolean;
  onReply?: () => void;
  onReplyThread?: () => void;
  onForward?: () => void;
  onSelect?: () => void;
  onCreateTask?: () => void;
  isPinnedView?: boolean;
  isFilesView?: boolean;
  isAgentChat?: boolean;
}

const ItemHoveredContent = ({
  senderId,
  messageId,
  currentChat,
  msgObj,
  fromThread = false,
  fromMeetChat = false,
  onReply,
  onReplyThread,
  onForward,
  onSelect,
  onCreateTask,
  onEdit,
  onDelete,
  isPinnedView = false,
  isFilesView = false,
  isAgentChat = false,
}: ItemHoveredContentProps & { onEdit?: () => void; onDelete?: () => void }) => {
  console.log(msgObj?.reaction, 'msgObjmsgObj');

  const { user } = useUser();
  const actorUuid = user?.uuid || user?.guest_info?.uuid || '';
  const { handleSendReaction, handlePinMessage } = useSocketEvents();

  const [emojiOpen, setEmojiOpen] = useState(false);

  const msgObjRef = useRef(msgObj);
  useEffect(() => {
    msgObjRef.current = msgObj;
  }, [msgObj]);

  useEffect(() => {
    const targetMessageId = messageId || msgObj?.messageId || '';
    if (!targetMessageId || !actorUuid) return;
    const serverReactions = msgObj?.reactions?.[actorUuid] || [];
    const cached = pendingReactionsCache[targetMessageId]?.[actorUuid];
    if (cached) {
      const isSync =
        serverReactions.length === cached.length &&
        serverReactions.every((e: string) => cached.includes(e));
      if (isSync) {
        delete pendingReactionsCache[targetMessageId];
      }
    }
  }, [msgObj?.reactions, messageId, msgObj?.messageId, actorUuid]);

  const [emojiPosition, setEmojiPosition] = useState({ top: 0, left: 0 });
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const isVoiceMessage = msgObj?.attachments?.[0]?.fileName?.includes('voice-message-');
  const messageCreatedAt = msgObj?.createdAt || msgObj?.timestamp || msgObj?.sentAt || msgObj?.time;
  const messageCreatedAtMs = messageCreatedAt ? new Date(messageCreatedAt).getTime() : NaN;
  const isWithinEditWindow = Number.isFinite(messageCreatedAtMs)
    ? Date.now() - messageCreatedAtMs <= 10 * 60 * 1000
    : false;
  const hasTextMessage = Boolean(getMessagePreviewText(msgObj?.message || '').trim());
  const hasAttachments = Array.isArray(msgObj?.attachments) && msgObj.attachments.length > 0;
  const canCreateTaskFromMessage =
    !isPinnedView &&
    senderId !== actorUuid &&
    hasTextMessage &&
    !hasAttachments &&
    !msgObj?.gif?.url &&
    !['poll', 'event', 'task'].includes(msgObj?.messageType);

  const calculateEmojiPosition = () => {
    try {
      if (!emojiButtonRef?.current) return;
      const buttonRect = emojiButtonRef.current.getBoundingClientRect();
      const scrollX = window?.pageXOffset || document?.documentElement?.scrollLeft || 0;
      const scrollY = window?.pageYOffset || document?.documentElement?.scrollTop || 0;
      const viewportWidth = window?.innerWidth || 1024;
      const viewportHeight = window?.innerHeight || 768;
      const pickerWidth = 352;
      const pickerHeight = 435;
      const offset = 8;

      let top = buttonRect.bottom + scrollY + offset;
      let left = buttonRect.left + scrollX;

      if (buttonRect.bottom + pickerHeight > viewportHeight) {
        top = buttonRect.top + scrollY - pickerHeight - offset;
      }
      if (buttonRect.left + pickerWidth > viewportWidth) {
        left = buttonRect.right + scrollX - pickerWidth;
      }
      if (left < scrollX + offset) left = scrollX + offset;
      if (top < scrollY + offset) top = scrollY + offset;

      setEmojiPosition({ top, left });
    } catch (error) {
      console.error('Error calculating emoji position:', error);
      setEmojiPosition({ top: 100, left: 100 });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!event?.target) return;
      const isOutsidePicker =
        emojiPickerRef?.current && !emojiPickerRef.current.contains(event.target as Node);
      const isOutsideButton =
        emojiButtonRef?.current && !emojiButtonRef.current.contains(event.target as Node);

      if (isOutsidePicker && isOutsideButton) {
        setEmojiOpen(false);
      }
    };

    if (!emojiOpen || typeof document === 'undefined') return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [emojiOpen]);

  useLayoutEffect(() => {
    if (emojiOpen) calculateEmojiPosition();
  }, [emojiOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (emojiOpen) calculateEmojiPosition();
    };
    if (!emojiOpen || typeof window === 'undefined') return;
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [emojiOpen]);

  const pinMessageHandler = (e?: React.MouseEvent) => {
    try {
      e?.stopPropagation();
      if (!actorUuid || !currentChat?.chatId) return;
      const receiverId = getReceiverIds(currentChat, user, msgObj?.receiverId);
      handlePinMessage({
        messageId: messageId || msgObj?.messageId || '',
        senderId: actorUuid,
        receiverId,
        chatId: currentChat.chatId,
        type: msgObj?.isPinned ? 'unpin' : 'pin',
      });
    } catch (error) {
      console.error('Error in pinMessageHandler:', error);
    }
  };

  const emojiReactionHandler = (emoji: string) => {
    try {
      const currentMsgObj = msgObjRef.current;
      if (!actorUuid || !emoji) return;
      const receiverId = getReceiverIds(currentChat, user, currentMsgObj?.receiverId);
      const targetMessageId = currentMsgObj?.messageId || messageId || '';
      if (!targetMessageId) return;

      const myReactions = (pendingReactionsCache[targetMessageId]?.[actorUuid] ||
        currentMsgObj?.reactions?.[actorUuid] ||
        []) as string[];
      console.log(currentMsgObj?.reactions, 'msgObj?.reactions');

      const hasEmoji = myReactions.includes(emoji);
      const nextMyReactions = hasEmoji
        ? myReactions.filter((item) => item !== emoji)
        : [...myReactions, emoji];

      const nextReactionsObj = {
        ...(currentMsgObj?.reactions || {}),
        [actorUuid]: nextMyReactions,
      };

      pendingReactionsCache[targetMessageId] = nextReactionsObj;

      handleSendReaction({
        messageId: targetMessageId,
        receiverId,
        senderId: actorUuid,
        chatId: currentChat?.chatId || '',
        reactions: nextReactionsObj,
      });
    } catch (error) {
      console.error('Error in emojiReactionHandler:', error);
    } finally {
      // setEmojiOpen(false);
    }
  };

  const handleEdit = () => {
    try {
      if (!actorUuid || senderId !== actorUuid || isVoiceMessage) return;
      if (!isWithinEditWindow) {
        handleAlert({
          text: 'You can edit a message only within 10 minutes of sending.',
          type: 'error',
        });
        return;
      }
      onEdit?.();
    } catch (error) {
      console.error('Error triggering edit action:', error);
    }
  };

  const handleDelete = async () => {
    try {
      onDelete?.();
    } catch (error) {
      console.error('Error triggering delete action:', error);
    }
  };

  const handleCopy = async () => {
    try {
      const text = getMessagePreviewText(msgObj?.message || '');
      if (!text) return;
      await navigator.clipboard.writeText(text);
      // toast.success('Message copied to clipboard');
      handleAlert({ text: `Message copied to clipboard`, type: 'info' });
    } catch (error) {
      console.error('Error copying message:', error);
    }
  };

  const handleReply = () => {
    try {
      onReply?.();
    } catch (error) {
      console.error('Error triggering reply action:', error);
    }
  };

  const handleReplyThread = () => {
    try {
      if (fromThread) return;
      onReplyThread?.();
    } catch (error) {
      console.error('Error triggering reply thread action:', error);
    }
  };

  const handleForward = () => {
    try {
      if (fromThread) return;
      onForward?.();
    } catch (error) {
      console.error('Error triggering forward action:', error);
    }
  };

  const handleSelect = () => {
    try {
      if (fromThread) return;
      onSelect?.();
    } catch (error) {
      console.error('Error triggering select action:', error);
    }
  };

  if (!senderId || !actorUuid) return null;
  if (isFilesView) return null;
  if (isAgentChat) {
    return null;
  }

  return (
    <>
      <div
        className={`absolute -top-8 ${senderId === actorUuid ? 'right-0' : 'left-0'} flex items-center justify-center gap-1.5 z-10 px-2 py-1 bg-white rounded-md shadow-lg border cursor-pointer`}
      >
        {!isPinnedView ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                ref={emojiButtonRef}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEmojiOpen((prev) => !prev)}
                className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
              >
                <Smile size={15} className="text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">React</TooltipContent>
          </Tooltip>
        ) : null}

        {!fromThread && !isPinnedView ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReply}
                className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
              >
                <Reply size={14} className="text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Reply</TooltipContent>
          </Tooltip>
        ) : null}

        {!fromThread && !fromMeetChat && !isPinnedView ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReplyThread}
                className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
              >
                <ReplyAll size={14} className="text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Reply in thread</TooltipContent>
          </Tooltip>
        ) : null}

        {!fromThread &&
        !fromMeetChat &&
        !isPinnedView &&
        !msgObj?.gif?.url &&
        !msgObj?.isForwarded ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleForward}
                className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
              >
                <Forward size={14} className="text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Forward</TooltipContent>
          </Tooltip>
        ) : null}

        {!fromThread && !fromMeetChat && !isPinnedView ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelect}
                className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
              >
                <CheckSquare size={14} className="text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Select message</TooltipContent>
          </Tooltip>
        ) : null}

        {!fromThread &&
        !isPinnedView &&
        msgObj?.attachments?.length === 0 &&
        !msgObj?.gif?.url &&
        !['poll', 'event', 'task'].includes(msgObj?.messageType) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
              >
                <Copy size={14} className="text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Copy</TooltipContent>
          </Tooltip>
        ) : null}

        {!fromThread ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={pinMessageHandler}
                className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
              >
                {msgObj?.isPinned ? (
                  <PinOffIcon size={14} className="text-gray-700" />
                ) : (
                  <Pin size={14} className="text-gray-700" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{msgObj?.isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
          </Tooltip>
        ) : null}

        {/* Create Task - only for incoming messages */}
        {canCreateTaskFromMessage ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onCreateTask?.()}
                className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
              >
                <ClipboardList size={14} className="text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Create Task</TooltipContent>
          </Tooltip>
        ) : null}

        {!isPinnedView && senderId === actorUuid ? (
          <>
            {!isVoiceMessage &&
            !msgObj?.isForwarded &&
            !['poll', 'event', 'task'].includes(msgObj?.messageType) &&
            isWithinEditWindow ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
                  >
                    <Edit size={14} className="text-gray-700" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Edit</TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
                >
                  <Trash2 size={14} className="text-red-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete</TooltipContent>
            </Tooltip>
          </>
        ) : null}
      </div>

      {emojiOpen && typeof document !== 'undefined' && document?.body
        ? createPortal(
            <div
              ref={emojiPickerRef}
              className="absolute z-50"
              style={{
                top: `${emojiPosition.top}px`,
                left: `${emojiPosition.left}px`,
              }}
            >
              <EmojiPicker
                lazyLoadEmojis
                open={emojiOpen}
                searchDisabled
                onEmojiClick={(data: any) => emojiReactionHandler(data?.emoji)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export default ItemHoveredContent;
