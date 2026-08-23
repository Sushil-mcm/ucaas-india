import { useJitsi } from '@/hooks/use-jitsi';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const normalizeJid = (value: string = '') =>
  String(value || '')
    .trim()
    .split('/')
    .pop()
    ?.toLowerCase() || '';

const getChatUserNameByJid = (users: any[] = [], jid = '') => {
  const normalizedJid = normalizeJid(jid);
  if (!normalizedJid || !Array.isArray(users)) return '';

  const matchedUser = users.find((chatUser: any) => {
    const candidates = [
      chatUser?.jid,
      chatUser?.user_jid,
      chatUser?.meeting_jid,
      chatUser?.jitsi_jid,
      chatUser?.jitsiJid,
    ]
      .map((candidate) => normalizeJid(candidate))
      .filter(Boolean);

    return candidates.includes(normalizedJid);
  });

  if (!matchedUser) return '';
  return (
    matchedUser?.name ||
    `${matchedUser?.first_name || ''} ${matchedUser?.last_name || ''}`.trim() ||
    ''
  );
};

const formatSubtitleTime = (value: any) => {
  if (!value) return '';
  const time = typeof value === 'number' ? new Date(value) : new Date(String(value));
  if (Number.isNaN(time.getTime())) return '';
  return time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

const Subtitles = () => {
  const {
    roomCode,
    participantsListing = [],
    userID = '',
    userName = '',
    subtitlesData: jitsiSubtitles = [],
  } = useJitsi();
  const { meetingSubtitlesByChatId = {}, allChats = [] } = useSocketEvents();

  const subtitlesChatKey =
    roomCode && meetingSubtitlesByChatId?.[roomCode]
      ? roomCode
      : Object.keys(meetingSubtitlesByChatId || {}).find(
          (key) => key === roomCode || key.endsWith(`_${roomCode}`),
        ) || '';

  const socketSubtitles = Array.isArray(meetingSubtitlesByChatId?.[subtitlesChatKey])
    ? meetingSubtitlesByChatId[subtitlesChatKey]
    : [];

  const subtitlesArray = socketSubtitles.length ? socketSubtitles : jitsiSubtitles;
  const subtitlesToDisplay = useMemo(() => {
    const getStoredSubtitleText = (subtitle: any) => {
      const textValue = subtitle?.text;
      if (typeof textValue === 'string') {
        return textValue.trim();
      }

      if (textValue && typeof textValue === 'object' && !Array.isArray(textValue)) {
        const firstObjectText = Object.values(textValue).find(
          (value) => typeof value === 'string' && String(value || '').trim(),
        ) as string | undefined;
        return String(firstObjectText || '').trim();
      }

      const textByLanguage = subtitle?.text_by_language;
      if (textByLanguage && typeof textByLanguage === 'object' && !Array.isArray(textByLanguage)) {
        const firstMappedText = Object.values(textByLanguage).find(
          (value) => typeof value === 'string' && String(value || '').trim(),
        ) as string | undefined;
        return String(firstMappedText || '').trim();
      }

      return '';
    };

    return (subtitlesArray || [])
      .map((subtitle: any) => ({
        ...subtitle,
        _displayText: getStoredSubtitleText(subtitle),
      }))
      .filter((subtitle: any) => Boolean(subtitle?._displayText));
  }, [subtitlesArray]);
  const currentChat = allChats?.find((chat: any) => chat?.chatId === roomCode);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevLastMessageFingerprintRef = useRef('');
  const isFirstRenderRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const lastMessageFingerprint = useMemo(() => {
    const lastSubtitle = subtitlesToDisplay?.[subtitlesToDisplay.length - 1];
    if (!lastSubtitle) return '';
    const messageId = String(lastSubtitle?.message_id || '');
    const timestamp = String(lastSubtitle?.timestamp || '');
    const displayText = String(lastSubtitle?._displayText || lastSubtitle?.text || '').trim();
    return `${messageId}|${timestamp}|${displayText}`;
  }, [subtitlesToDisplay]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  const getBottomThreshold = (container: HTMLDivElement) =>
    Math.max(24, Math.min(96, Math.round(container.clientHeight * 0.08)));

  const getDistanceFromBottom = (container: HTMLDivElement) =>
    Math.max(0, container.scrollHeight - container.scrollTop - container.clientHeight);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const threshold = getBottomThreshold(container);
    const distanceFromBottom = getDistanceFromBottom(container);
    const atBottom = distanceFromBottom <= threshold;

    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setNewMessageCount(0);
    }
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevLastMessageFingerprintRef.current = lastMessageFingerprint;
      scrollToBottom('auto');
      return;
    }

    if (
      !lastMessageFingerprint ||
      prevLastMessageFingerprintRef.current === lastMessageFingerprint
    ) {
      return;
    }

    if (isAtBottomRef.current) {
      scrollToBottom('auto');
    } else {
      setNewMessageCount((prev) => prev + 1);
    }

    prevLastMessageFingerprintRef.current = lastMessageFingerprint;
  }, [lastMessageFingerprint]);

  useEffect(() => {
    updateScrollState();
  }, [subtitlesToDisplay, updateScrollState]);

  const getSpeakerName = (subtitle: any) => {
    const normalizedIncomingJid = normalizeJid(subtitle?.jid || subtitle?.participant || '');
    const normalizedLocalJid = normalizeJid(userID);

    if (
      normalizedIncomingJid &&
      normalizedLocalJid &&
      normalizedIncomingJid === normalizedLocalJid
    ) {
      return userName || 'You';
    }

    const participant = Array.isArray(participantsListing)
      ? participantsListing.find((item: any) => normalizeJid(item?._id) === normalizedIncomingJid)
      : null;

    if (participant?._displayName) {
      return participant._displayName;
    }

    const chatUserName = getChatUserNameByJid(currentChat?.users || [], normalizedIncomingJid);
    if (chatUserName) return chatUserName;

    return subtitle?.username || 'Unknown';
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Transcripts</h3>
      </div>
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollState}
        className="flex-1 overflow-y-auto p-3 relative"
      >
        {subtitlesToDisplay && subtitlesToDisplay.length ? (
          <div className="text-white flex flex-col gap-3">
            {subtitlesToDisplay.map((subtitle: any) => {
              const speakerName = getSpeakerName(subtitle);
              const subtitleTime = formatSubtitleTime(subtitle?.timestamp);
              return (
                <div
                  key={subtitle?.message_id || subtitle?.participant || subtitle?.jid}
                  className="rounded-md bg-gray-800 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{speakerName}</span>
                    <span className="text-[11px] text-gray-300 whitespace-nowrap">
                      {subtitleTime}
                    </span>
                  </div>
                  <div className="text-sm mt-1 break-words">{subtitle?._displayText}</div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No transcripts yet
          </div>
        )}
      </div>
      {!isAtBottom && newMessageCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            scrollToBottom('smooth');
            setNewMessageCount(0);
          }}
          className="absolute bottom-3 right-3 z-30 bg-ucass-active hover:bg-ucass-active text-white rounded-full shadow-lg px-3 py-2 flex items-center gap-2 text-xs font-semibold"
        >
          <ChevronDown className="w-4 h-4" />
          {newMessageCount > 1 ? `${newMessageCount} new` : 'New'}
        </button>
      ) : null}
    </div>
  );
};

export default Subtitles;
