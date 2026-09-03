import { useRef, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import moment from 'moment';

// Recursively extract plain text from Slate.js rich text nodes or JSON strings
const extractSlateText = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => extractSlateText(item))
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  if (typeof value === 'object') {
    if (typeof value?.text === 'string') return value.text.trim();
    if (typeof value?.message === 'string') return value.message.trim();
    if (Array.isArray(value?.children)) return extractSlateText(value.children);
    if (Array.isArray(value?.content)) return extractSlateText(value.content);
  }
  return '';
};

const getMessagePreviewText = (value: any): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      const fromParsed = extractSlateText(parsed);
      return fromParsed || trimmed;
    } catch {
      return trimmed;
    }
  }
  return extractSlateText(value);
};

const getDisplayName = (value: any): string => {
  if (!value) return '';

  const userInfo = value?.user_info || value?.userInfo || {};
  const firstName = value?.first_name || value?.firstName || userInfo?.first_name || '';
  const lastName = value?.last_name || value?.lastName || userInfo?.last_name || '';

  return (
    value?.senderName ||
    value?.name ||
    `${firstName || ''} ${lastName || ''}`.trim() ||
    value?.email ||
    userInfo?.email ||
    ''
  );
};

const getUserId = (value: any): string => {
  const userInfo = value?.user_info || value?.userInfo || {};

  return String(
    value?.uuid ||
      value?.user_uuid ||
      value?.userId ||
      value?.senderId ||
      value?.id ||
      userInfo?.uuid ||
      '',
  ).trim();
};

const SearchComponent = ({
  currentChat,
  disableScrollTop,
}: {
  currentChat: any;
  disableScrollTop: React.MutableRefObject<boolean>;
}) => {
  const { socketEventsManager, handleGetMessageByChatId, setMessageList } = useSocketEvents();
  const { user } = useUser();

  const searchTimeoutRef = useRef<any>(null);
  const [, setSearchText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadOptions = (inputVal: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (!inputVal) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      if (inputVal) {
        socketEventsManager?.emit(
          'nats-search-message',
          {
            chatId: currentChat?.chatId,
            userID: user?.uuid,
            keyword: inputVal.trim(),
          },
          (res: any) => {
            // Support both response shapes: res?.response?.data?.result?.chats or res?.data?.result?.chats
            const data = res?.response?.data?.result?.chats || res?.data?.result?.chats || [];
            setResults(data);
            setIsLoading(false);
            setIsOpen(true);
          },
        );
      } else {
        setResults([]);
        setIsLoading(false);
        setIsOpen(false);
      }
    }, 1000);
  };

  const onClickItem = (msgObj: any) => {
    disableScrollTop.current = true;
    function eventCallback(data: any) {
      const container = document.getElementById(data?.chatId);
      setTimeout(() => {
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 200);
      const messages = data?.messages || [];
      if (data?.chatId) {
        setMessageList((prevMessageList: any) => {
          try {
            const prevList = Array.isArray(prevMessageList) ? prevMessageList : [];
            return [
              ...prevList.filter((item: any) => item?.chatId !== data?.chatId),
              {
                chatId: data?.chatId,
                messages: [...messages.reverse()],
              },
            ];
          } catch (error) {
            console.error('Error updating message list:', error);
            return prevMessageList || [];
          }
        });
      }
    }

    handleGetMessageByChatId({
      chatId: currentChat?.chatId,
      userId: user?.uuid,
      direction: 'down',
      cursor: msgObj?.createdAt,
      messageId: msgObj?.messageId,
      cb: eventCallback,
    });
  };

  const handleClickResult = (option: any) => {
    const messageId = option?.messageId;
    setIsOpen(false);
    if (messageId) {
      const elm = document.getElementById(messageId);
      if (elm) {
        setTimeout(() => {
          elm.classList.remove('bg-ucass-active-bg', 'rounded-md');
        }, 2000);
        elm.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'center',
        });
        elm.classList.add('bg-ucass-active-bg', 'rounded-md');
      } else {
        onClickItem(option);
      }
    }
  };

  const getMessagePreview = (option: any): string => {
    // message can be a Slate JSON array, a JSON string, or a plain string
    if (option?.message !== undefined && option?.message !== null && option?.message !== '') {
      return getMessagePreviewText(option.message);
    }
    // Fallback to attachments
    if (Array.isArray(option?.attachments) && option.attachments.length > 0) {
      return option.attachments[0]?.fileName || 'Attachment';
    }
    return '';
  };

  const getSenderName = (option: any): string => {
    const directName =
      option?.senderName ||
      option?.sender?.name ||
      getDisplayName(option?.sender) ||
      getDisplayName(option?.senderDetails) ||
      getDisplayName(option?.senderInfo) ||
      getDisplayName(option?.user);
    if (directName) return directName;

    const senderId = String(
      option?.senderId || option?.senderUserId || option?.userId || '',
    ).trim();
    const found = (currentChat?.users || []).find((chatUser: any) => {
      const chatUserId = getUserId(chatUser);
      return chatUserId && chatUserId === senderId;
    });
    const foundName = getDisplayName(found);
    if (foundName) return foundName;

    const currentUserId = getUserId(user);
    if (senderId && currentUserId && senderId === currentUserId) {
      const currentUserName = getDisplayName(user);
      if (currentUserName) return currentUserName;
    }

    return 'Unknown';
  };

  return (
    <div className="w-full search-component-main relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex justify-center items-center text-[#9A948F]">
        <SearchIcon width={18} height={18} />
      </div>
      <input
        type="text"
        value={inputValue}
        autoFocus
        placeholder="Search messages..."
        className="w-full h-9 pl-9 pr-3 text-sm border border-[#EEE7DD] rounded-lg bg-[#FBE2C8]/45 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        onChange={(e) => {
          const val = e.target.value;
          setInputValue(val);
          setSearchText(val);
          loadOptions(val);
        }}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
      />

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-[#9A948F]">Searching...</div>
          ) : results?.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#9A948F]">No messages found</div>
          ) : (
            <div className="overflow-y-auto max-h-80">
              {results?.map((option: any, index: number) => {
                const preview = getMessagePreview(option);
                const sender = getSenderName(option);
                const time = option?.createdAt ? moment(option.createdAt).format('hh:mm A') : '';

                return (
                  <div
                    key={option?.messageId || index}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-ucass-active-bg cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                    onClick={() => handleClickResult(option)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#2E2D35] truncate">{sender}</span>
                      {time && (
                        <span className="text-[11px] text-[#9A948F] shrink-0 ml-2">{time}</span>
                      )}
                    </div>
                    {preview ? (
                      <div className="text-sm text-[#9A948F] line-clamp-2">{preview}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
