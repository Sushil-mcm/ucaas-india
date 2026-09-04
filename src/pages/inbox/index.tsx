import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageSidebarLayout from '@/layout/page-sidebar-layout';
import './inbox-theme.css';
import ListItem from './list-item';
import DidPicker from './did-picker';
import { formatDialSpaced } from './format-number';
import {
  getDLCStatus,
  getFaxAssignedDidNumbers,
  getSMSList,
  mediaUploadUrl,
  sendSms,
  userSMSInfo,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParamManager } from '@/hooks/use-search-params';
import { AddCircle, EmojiICon, PlainLine, SearchLine, Send } from '@/assets/icons';

import {
  CHAT_MAX_LENGTH,
  cn,
  formatChatDate,
  checkPhoneNumberCountry,
  getEnv,
  handleAlert,
  getSmsAlert,
  SESSION_NAME,
} from '@/lib/utils';
import moment from 'moment';
import Loader from '@/components/custom/loader';
import { useUser } from '@/hooks/use-user';
import { count } from 'sms-length';
import { useSmsRateCredits } from '@/hooks/use-sms-rate-credits';
import EmojiPicker from 'emoji-picker-react';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

polyfillCountryFlagEmojis();
import useClickOutside from '@/hooks/use-click-outside';
import CustomAvatar from '@/components/custom/custom-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SendSMSModal from './send-sms-modal';
import SendFaxModal from './send-fax-modal';
import FaxContent from './fax-content';
import { useMessagingPermissions } from '@/hooks/use-messaging-permissions';
import {
  ArrowDown,
  ArrowLeft,
  CheckCheckIcon,
  CheckIcon,
  DownloadIcon,
  Expand,
  FileAudio2,
  FileText,
  FileVideo2,
  Loader2,
  MessageSquareOff,
  MessageSquareText,
  Paperclip,
  Pause,
  Play,
  Printer,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFetchContact } from '@/hooks/common';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import DLCVerificationPopup from '@/components/custom/dlc-verification-popup';
import countryList from '@/lib/countries.json';
import AlertConfirm from '@/components/custom/alert-confirm';
import useDebounce from '@/hooks/use-debounce';
import { useMediaBlob } from '@/pages/messenger/chat/message-item/use-media-blob';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';
import ActivityPageHead from '@/components/custom/activity-page-head';

const messageStatus = function (key: string = '') {
  const status = {
    Delivered: (
      <div className="mcm-bub-meta pos">
        <CheckCheckIcon width={12} height={12} />
        Delivered
      </div>
    ),

    Success: (
      <div className="mcm-bub-meta pos">
        <CheckCheckIcon width={12} height={12} />
        Sent
      </div>
    ),

    Pending: (
      <div className="mcm-bub-meta">
        <CheckIcon width={12} height={12} />
        Sending
      </div>
    ),
  };

  if (!key) return null;

  /* Matched case-insensitively. The keys here are capitalised while the feed
     sends "delivered", so every successfully delivered message missed the
     lookup and fell through to the branch below -- red text and a warning
     triangle on the happy path. */
  const matched = Object.entries(status).find(
    ([name]) => name.toLowerCase() === String(key).trim().toLowerCase(),
  );

  return (
    matched?.[1] || (
      <div className="mcm-bub-meta neg">
        <TriangleAlert width={12} height={12} />
        {key}
      </div>
    )
  );
};

// Two messages from the same sender inside this window are drawn as one visual
// group: only the last one gets the pointed tail corner.
const MESSAGE_GROUP_WINDOW_MINUTES = 3;

const SOFT_BREAK_CHUNK_SIZE = 24;
const SMS_COUNT_LIMIT = 5;
const FAX_ASSIGNED_DID_PAYLOAD = { page: 1, limit: 200 };
const EMPTY_FAX_DID_NUMBERS: any[] = [];

const getFaxDidNumber = (item: any) =>
  String(item?.did_number || item?.phone_number || item?.number || '').trim();

const insertSoftBreaksIntoLongWords = (text: string, chunkSize = SOFT_BREAK_CHUNK_SIZE) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\S+/g, (token) => {
    if (token.length <= chunkSize) return token;
    let broken = '';
    for (let index = 0; index < token.length; index += chunkSize) {
      broken += token.slice(index, index + chunkSize);
      if (index + chunkSize < token.length) broken += '\u200B';
    }
    return broken;
  });
};

const trimToSmsCountLimit = (value: string, maxMessages = SMS_COUNT_LIMIT) => {
  const normalizedValue = String(value || '');
  if (count(normalizedValue).messages <= maxMessages) return normalizedValue;

  let low = 0;
  let high = normalizedValue.length;
  let best = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = normalizedValue.slice(0, mid);
    if (count(candidate).messages <= maxMessages) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
};

const extractFileNameFromUrl = (url: string) => {
  try {
    const cleanUrl = String(url || '').trim();
    if (!cleanUrl) return '';
    const parsed = new URL(cleanUrl, window.location.origin);
    const pathname = parsed.pathname || '';
    const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(lastSegment);
  } catch {
    const fallback = String(url || '')
      .split('?')[0]
      .split('#')[0];
    const lastSegment = fallback.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(lastSegment);
  }
};

const getMMSFileName = (sms: any) => {
  const directName = sms?.filename || sms?.fileName || sms?.mediaName || sms?.media_name || '';
  if (directName) return directName;
  return extractFileNameFromUrl(sms?.mediaUrl || sms?.media_url || sms?.url || '');
};

const isAllowedMMSFile = (file: File | null) => {
  if (!file) return false;
  const mimeType = String(file.type || '').toLowerCase();
  if (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('video/')
  ) {
    return true;
  }
  const lowerName = String(file.name || '').toLowerCase();
  return [
    '.gif',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.bmp',
    '.svg',
    '.mp4',
    '.mov',
    '.webm',
    '.m4v',
    '.mkv',
    '.avi',
    '.mp3',
    '.wav',
    '.m4a',
    '.aac',
    '.ogg',
    '.flac',
  ].some((ext) => lowerName.endsWith(ext));
};

const getMMSMediaUrl = (sms: any, companyUuid: string) => {
  const rawUrl = sms?.mediaUrl || sms?.media_url || sms?.url || '';
  const base = getEnv()?.VITE_API_BASE_URL || '';
  if (typeof rawUrl === 'string' && /^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (typeof rawUrl === 'string' && rawUrl.startsWith('/') && base) return `${base}${rawUrl}`;
  if (typeof rawUrl === 'string' && rawUrl && !rawUrl.startsWith('/')) return rawUrl;

  const filename = getMMSFileName(sms);
  if (!filename || !companyUuid) return rawUrl || '';

  return `${base}/api/media/${companyUuid}/mms/${encodeURIComponent(filename)}`;
};

const resolveMMSMediaType = (sms: any) => {
  const directType =
    sms?.mimeType ||
    sms?.mediaMimeType ||
    sms?.media_type ||
    sms?.contentType ||
    sms?.mediaType ||
    '';
  const normalizedType = String(directType || '').toLowerCase();
  if (normalizedType.startsWith('image/')) return 'image';
  if (normalizedType.startsWith('video/')) return 'video';
  if (normalizedType.startsWith('audio/')) return 'audio';

  const urlFileName = extractFileNameFromUrl(sms?.mediaUrl || sms?.media_url || sms?.url || '');
  const filename = String(getMMSFileName(sms) || urlFileName || '').toLowerCase();
  const ext = filename.includes('.') ? filename.split('.').pop() || '' : '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) return 'audio';

  const rawUrl = String(sms?.mediaUrl || sms?.media_url || sms?.url || '').toLowerCase();
  if (rawUrl.includes('image%2f') || rawUrl.includes('image/')) return 'image';
  if (rawUrl.includes('video%2f') || rawUrl.includes('video/')) return 'video';
  if (rawUrl.includes('audio%2f') || rawUrl.includes('audio/')) return 'audio';

  return 'file';
};

const MMSAttachmentPreview = ({
  sms,
  companyUuid = '',
  isMine = false,
}: {
  sms: any;
  companyUuid?: string;
  isMine?: boolean;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const fallbackMediaUrl = getMMSMediaUrl(sms, companyUuid);
  const mediaType = resolveMMSMediaType(sms);
  const serverFileName = getMMSFileName(sms);
  const fileName = serverFileName || 'Attachment';
  const isAudio = mediaType === 'audio';
  const isImage = mediaType === 'image';
  const isVideo = mediaType === 'video';
  const { data: authenticatedFallbackMediaUrl } = useAuthenticatedMediaUrl(
    fallbackMediaUrl,
    Boolean(fallbackMediaUrl),
  );

  const { data: audioUrlServer, isLoading: isLoadingAudio } = useMediaBlob({
    serverFileName,
    company_uuid: companyUuid,
    type: 'mms',
    enabled: Boolean(isAudio && serverFileName && companyUuid),
  });
  const { data: imageUrlServer, isLoading: isLoadingImage } = useMediaBlob({
    serverFileName,
    company_uuid: companyUuid,
    type: 'mms',
    enabled: Boolean(isImage && serverFileName && companyUuid),
  });
  const { data: videoUrlServer, isLoading: isLoadingVideo } = useMediaBlob({
    serverFileName,
    company_uuid: companyUuid,
    type: 'mms',
    enabled: Boolean(isVideo && serverFileName && companyUuid),
  });

  const audioUrl = audioUrlServer || authenticatedFallbackMediaUrl;
  const imageUrl = imageUrlServer || authenticatedFallbackMediaUrl;
  const videoUrl = videoUrlServer || authenticatedFallbackMediaUrl;

  const resolvedMediaUrl = isAudio
    ? audioUrl
    : isImage
      ? imageUrl
      : isVideo
        ? videoUrl
        : authenticatedFallbackMediaUrl;

  if (!resolvedMediaUrl) return null;

  const openPreview = () => {
    window.open(resolvedMediaUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadFile = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const accessToken = localStorage.getItem(SESSION_NAME) || '';
      const response = await fetch(resolvedMediaUrl, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(link.href);
      link.remove();
    } catch (error) {
      console.error('Failed to download MMS media:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl || isLoadingAudio) return;
    if (isPlaying) {
      audioRef.current.pause();
      return;
    }
    audioRef.current.play().catch(() => setIsPlaying(false));
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (mediaType === 'audio') {
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    return (
      <div
        className={cn(
          'border-b last:border-b-0 w-full flex flex-col gap-2 px-3 py-3',
          isMine ? 'border-white/20' : 'border-[var(--mcm-line)]',
        )}
      >
        <div className="flex items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoadingAudio || !audioUrl}
            className={cn(
              'min-w-9 max-h-9 max-w-9 min-h-9 rounded-full flex justify-center items-center transition-colors shrink-0 hover:opacity-90',
              isMine ? 'bg-white text-[var(--mcm-accent)]' : 'bg-[var(--mcm-accent)] text-white',
              isLoadingAudio || !audioUrl ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            {isLoadingAudio ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            preload="metadata"
          />
          <div className="flex flex-col flex-1 min-w-0">
            <div className="text-[12px] font-bold truncate min-w-40 max-w-40">{fileName}</div>
            <div
              className={cn('text-[10.5px]', isMine ? 'text-white/75' : 'text-[var(--mcm-ink-4)]')}
            >
              {isPlaying
                ? `${formatDuration(currentTime)} / ${formatDuration(duration)}`
                : formatDuration(duration)}
            </div>
          </div>
          <button
            type="button"
            className="cursor-pointer"
            onClick={downloadFile}
            title="Download"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2
                className={cn(
                  'animate-spin size-4',
                  isMine ? 'text-white/85' : 'text-[var(--mcm-ink-4)]',
                )}
              />
            ) : (
              <DownloadIcon
                className={cn('size-4', isMine ? 'text-white/85' : 'text-[var(--mcm-ink-4)]')}
              />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 w-full">
          <div
            className="relative flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: isMine ? 'rgba(255,255,255,0.60)' : '#e5e7eb' }}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isMine ? 'bg-white' : 'bg-primary',
              )}
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (audioRef.current) {
                  audioRef.current.currentTime = value;
                  setCurrentTime(value);
                }
              }}
              disabled={!audioUrl || isLoadingAudio}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
            />
          </div>
        </div>
      </div>
    );
  }

  if (mediaType === 'image') {
    const isGif = fileName.toLowerCase().endsWith('.gif');
    return (
      <div
        className={cn(
          'border-b last:border-b-0 w-full flex flex-col gap-2 px-3 py-2',
          isMine ? 'border-white/20' : 'border-[var(--mcm-line)]',
        )}
      >
        <div className="w-64 max-w-full h-40 rounded-lg overflow-hidden flex items-center justify-center bg-black/5 relative">
          {isLoadingImage ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          ) : imageUrl ? (
            <img src={imageUrl} alt={fileName} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full bg-gray-100 text-gray-500 flex items-center justify-center rounded-lg text-xs">
              Unable to load image
            </div>
          )}
          <button
            type="button"
            className="absolute cursor-pointer bg-[var(--mcm-accent)] top-2 right-2 h-7 w-7 rounded-[8px] text-white flex items-center justify-center"
            onClick={openPreview}
            aria-label={isGif ? 'Open GIF in large view' : 'Open image in large view'}
          >
            <Expand size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div
              className={cn(
                'text-[12px] font-bold truncate min-w-40 max-w-40',
                isMine ? 'text-white' : 'text-[var(--mcm-ink)]',
              )}
            >
              {fileName}
            </div>
            <div
              className={cn('text-[10.5px]', isMine ? 'text-white/75' : 'text-[var(--mcm-ink-4)]')}
            >
              {isGif ? 'GIF' : 'Image'}
            </div>
          </div>
          <button
            type="button"
            className="cursor-pointer"
            onClick={downloadFile}
            title="Download"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2
                className={cn(
                  'animate-spin size-4',
                  isMine ? 'text-white/85' : 'text-[var(--mcm-ink-4)]',
                )}
              />
            ) : (
              <DownloadIcon
                className={cn('size-4', isMine ? 'text-white/85' : 'text-[var(--mcm-ink-4)]')}
              />
            )}
          </button>
        </div>
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <div
        className={cn(
          'border-b last:border-b-0 w-full flex flex-col gap-2 px-3 py-2',
          isMine ? 'border-white/20' : 'border-[var(--mcm-line)]',
        )}
      >
        <div className="w-64 max-w-full h-40 rounded-lg overflow-hidden flex items-center justify-center bg-black/5 relative">
          {isLoadingVideo ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          ) : videoUrl ? (
            <video
              src={videoUrl}
              className="w-full h-full object-contain"
              controls
              controlsList="nofullscreen nodownload noremoteplayback"
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 text-gray-500 flex items-center justify-center rounded-lg text-xs">
              Unable to load video
            </div>
          )}
          <button
            type="button"
            className="absolute cursor-pointer bg-[var(--mcm-accent)] top-2 right-2 h-7 w-7 rounded-[8px] text-white flex items-center justify-center"
            onClick={openPreview}
            aria-label="Open video in large view"
          >
            <Expand size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex flex-col flex-1 min-w-0">
            <div
              className={cn(
                'text-[12px] font-bold truncate min-w-40 max-w-40',
                isMine ? 'text-white' : 'text-[var(--mcm-ink)]',
              )}
            >
              {fileName}
            </div>
            <div
              className={cn(
                'text-[10.5px] truncate',
                isMine ? 'text-white/75' : 'text-[var(--mcm-ink-4)]',
              )}
            >
              Video
            </div>
          </div>
          <button
            type="button"
            className="cursor-pointer"
            onClick={downloadFile}
            title="Download"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2
                className={cn(
                  'animate-spin size-4',
                  isMine ? 'text-white/85' : 'text-[var(--mcm-ink-4)]',
                )}
              />
            ) : (
              <DownloadIcon
                className={cn('size-4', isMine ? 'text-white/85' : 'text-[var(--mcm-ink-4)]')}
              />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-b last:border-b-0 w-full min-h-14 items-center flex gap-2 px-3 py-2',
        isMine ? 'border-white/20 text-white' : 'border-[var(--mcm-line)] text-[var(--mcm-ink)]',
      )}
    >
      <div
        className={cn(
          'min-w-9 max-h-9 max-w-9 min-h-9 rounded-[9px] flex justify-center items-center overflow-hidden',
          isMine ? 'bg-white/20 text-white' : 'bg-[var(--mcm-surface-3)] text-[var(--mcm-ink-3)]',
        )}
      >
        <FileText className="size-4" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div
          className={cn(
            'text-[12px] font-bold truncate min-w-40 max-w-40',
            isMine ? 'text-white' : 'text-[var(--mcm-ink)]',
          )}
        >
          {fileName}
        </div>
        <div
          className={cn(
            'text-[10.5px] truncate',
            isMine ? 'text-white/75' : 'text-[var(--mcm-ink-4)]',
          )}
        >
          Attachment
        </div>
      </div>
      <button
        type="button"
        className="cursor-pointer"
        onClick={downloadFile}
        title="Download"
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2
            className={cn(
              'animate-spin size-4',
              isMine ? 'text-white/85' : 'text-[var(--mcm-ink-4)]',
            )}
          />
        ) : (
          <DownloadIcon
            className={cn('size-4', isMine ? 'text-white/85' : 'text-[var(--mcm-ink-4)]')}
          />
        )}
      </button>
    </div>
  );
};

const InnerSidebarInbox = (props: any) => {
  const {
    setSelectedDID,
    selectedDID,
    selectedChat,
    setSelectedChat,
    getNameFromNumber,
    messagesAccess,
    setType,
    type,
    setSmsNumber,
    setShowSendSMSModal,
    selectedFaxDID,
    isFaxDIDLoading = false,
    isCompactLayout = false,
    headerAction = null,
    focusNumber = '',
    onFocusHandled,
  } = props;
  const [isDIDLoaded, setIsDIDLoaded] = useState(false);
  const { getParam } = useSearchParamManager();
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce<string>(search, 300);
  const { user } = useUser();
  const did_number = getParam('did_number');
  const allDIDNumbers = useMemo(() => user?.assigned_did || [], [user?.assigned_did]);
  // const defaultTab = messagesAccess?.send_message
  //   ? 'messages'
  //   : messagesAccess?.send_mms
  //     ? 'messages'
  //     : 'fax';

  useEffect(() => {
    if (!allDIDNumbers?.length) {
      setIsDIDLoaded(true);
      return;
    }

    if (did_number) {
      const data = allDIDNumbers?.find(
        (item: any) => item?.did_number?.replace(/\+/g, '') === did_number?.replace(/\+/g, ''),
      );

      if (data) {
        setSelectedDID({
          label: formatDialSpaced(data?.did_number),
          value: data?.did_number,
        });
      }
    }
    setIsDIDLoaded(true);
  }, [allDIDNumbers?.length, did_number]);

  useEffect(() => {
    if (did_number === undefined || (did_number === null && allDIDNumbers?.length)) {
      const defaultDID = allDIDNumbers?.[0];
      setSelectedDID({
        label: formatDialSpaced(defaultDID?.did_number),
        value: defaultDID?.did_number,
      });
    }
  }, [allDIDNumbers]);

  return (
    <Tabs
      value={type}
      onValueChange={(e) => {
        setSelectedChat({});
        setType(e);
      }}
      className="mcm-col h-full w-full min-h-0 gap-0"
    >
      <div className="mcm-col-head">
        {/* New sits beside the SMS/MMS and Fax tabs rather than on a row
            of its own -- with the duplicated title gone that row held
            nothing but this one button. */}
        <div className="mcm-col-tabrow">
          <TabsList className="mcm-seg" style={{ width: '100%' }}>
            {messagesAccess?.send_message || messagesAccess?.send_mms ? (
              <TabsTrigger value="messages">
                <MessageSquareText className="size-3.5" />
                SMS / MMS
              </TabsTrigger>
            ) : null}
            {messagesAccess?.send_fax && (
              <TabsTrigger value="fax">
                <Printer className="size-3.5" />
                Fax
              </TabsTrigger>
            )}
          </TabsList>
          {headerAction}
        </div>
        <div className="mcm-search">
          <span className="mcm-search-ic">
            <SearchLine className="h-3.5 w-3.5" />
          </span>
          <input
            placeholder="Search by name or number"
            maxLength={50}
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith(' ')) return;
              setSearch(value);
            }}
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              className="mcm-search-clear"
              onClick={() => setSearch('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>


        {/* The sending-number picker is gone from this header entirely: both
            panes carry their own now, so the list keeps title, search and the
            SMS/Fax switch, and conversations start higher up the column. */}

      </div>
      <TabsContent value="messages" className="mt-0 flex flex-1 min-h-0 flex-col overflow-hidden">
        {isDIDLoaded ? (
          <ListItem
            selectedDID={selectedDID}
            setSelectedChat={setSelectedChat}
            selectedChat={selectedChat}
            focusNumber={focusNumber}
            onFocusHandled={onFocusHandled}
            tabType="messages"
            getNameFromNumber={getNameFromNumber}
            search={debouncedSearch}
            setSmsNumber={setSmsNumber}
            setShowSendSMSModal={setShowSendSMSModal}
            isCompactLayout={isCompactLayout}
          />
        ) : (
          <div className="flex justify-center items-center h-full">
            <Loader variant="blue" />
          </div>
        )}
      </TabsContent>
      <TabsContent value="fax" className="mt-0 flex flex-1 min-h-0 flex-col overflow-hidden">
        {isFaxDIDLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader variant="blue" />
          </div>
        ) : (
          <ListItem
            selectedDID={selectedFaxDID}
            setSelectedChat={setSelectedChat}
            selectedChat={selectedChat}
            tabType="fax"
            getNameFromNumber={getNameFromNumber}
            search={debouncedSearch}
            isCompactLayout={isCompactLayout}
          />
        )}
      </TabsContent>
      {/* The mode switch lives at the foot of the column, pinned, so it stays
          put while the conversations scroll. It is a destination switch, not a
          filter on the list -- keeping it out of the header lets the search
          and the first conversation sit at the top where they are read. */}
      <div className="mcm-col-foot">
        <TabsList className="mcm-seg" style={{ width: '100%' }}>
          {messagesAccess?.send_message || messagesAccess?.send_mms ? (
            <TabsTrigger value="messages">
              <MessageSquareText className="size-3.5" />
              SMS / MMS
            </TabsTrigger>
          ) : null}
          {messagesAccess?.send_fax && (
            <TabsTrigger value="fax">
              <Printer className="size-3.5" />
              Fax
            </TabsTrigger>
          )}
        </TabsList>
      </div>
    </Tabs>
  );
};

const InboxContent = ({
  selectedDID = {},
  selectedChat,
  getNameFromNumber,
  type,
  onBackToList,
  isCompactLayout = false,
  didOptions = [],
  onDidChange,
}: {
  selectedDID: any;
  selectedChat: any;
  getNameFromNumber?: any;
  type?: string;
  onBackToList?: () => void;
  isCompactLayout?: boolean;
  didOptions?: any[];
  onDidChange?: (value: any) => void;
}) => {
  const { getAllParams } = useSearchParamManager();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [smsListData, setSmsListData] = useState([]);
  const [message, setMessage] = useState('');
  const [mmsFile, setMmsFile] = useState<File | null>(null);
  const [mmsPreviewUrl, setMmsPreviewUrl] = useState<string>('');
  const [emojiOpen, setEmojiOpen] = useState<boolean>(false);
  const [countryCode, seCountryCode] = useState('');
  const params = getAllParams();
  // Keyed per message: expanding one long message must not expand every other
  // long message in the thread.
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const { user } = useUser();
  const companyUuid = user?.company_info?.uuid || user?.company_uuid || '';
  const queryClient = useQueryClient();
  const emojiContainerRef = useRef(null);
  const mmsFileInputRef = useRef<HTMLInputElement | null>(null);
  // text area auto height
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useClickOutside({ current: [emojiContainerRef.current] }, () => setEmojiOpen(false));
  const [showDLCPopup, setShowDLCPopup] = useState(false);
  const [sendMsgAlert, setSendMsgAlert] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const {
    data: smsList,
  } = useQuery({
    queryKey: ['getSMSList', { chat_id: params?.chatId }],
    queryFn: () => getSMSList({ chat_id: params?.chatId, limit: 100 }),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: !!(params?.chatId && selectedDID),
  });

  /* Company messaging rules, read alongside the registration status they work
     with. */
  const { canSendTo } = useMessagingPermissions();

  const { data: dlcStatus } = useQuery({
    queryKey: ['getDLCStatus'],
    queryFn: () => getDLCStatus(),
    select: (data) => data?.data?.data?.result,
  });
  const otherNumber =
    selectedDID?.value?.replace('+', '') === selectedChat?.from?.replace('+', '')
      ? selectedChat?.to
      : selectedChat?.from;
  const isConversationReady = Boolean(selectedChat?._id);

  /* Which outgoing message is the newest, across every day bucket. Delivery
     status only renders there: once a later message has gone through, the
     state of an older one has stopped being news, and repeating it turned a
     long thread into a column of the same green word. */
  const lastOutboundKey = useMemo(() => {
    const days: any[] = smsListData || [];
    for (let d = days.length - 1; d >= 0; d -= 1) {
      const day: any[] = days[d] || [];
      for (let i = day.length - 1; i >= 0; i -= 1) {
        if (user?.uuid === day[i]?.senderId) return `${d}-${i}`;
      }
    }
    return null;
  }, [smsListData, user?.uuid]);

  const smsCountData = count(message);
  const isMMSMode = !!mmsFile;

  useEffect(() => {
    if (otherNumber && otherNumber?.length > 0 && countryList && countryList?.length > 0) {
      const { countryCode = 'US' } = checkPhoneNumberCountry(otherNumber);
      seCountryCode(countryCode);
    }
  }, [otherNumber]);

  const { data: smsInfoData = [] } = useQuery({
    queryKey: ['userSMSInfo', otherNumber],
    queryFn: () =>
      userSMSInfo({
        filter: {
          key: 'DIALPREFIX',
          value: otherNumber?.trim().replace(/\s+/g, ''),
        },
      }),
    select: (data) => data?.data?.data?.result || {},
    enabled: !!otherNumber && otherNumber?.length > 8,
  });

  const { allow_country = [], sms_rates = [], sms: freeSms = 0, sms_used = 0 } = smsInfoData || {};
  const isSmsFree =
    allow_country?.some(({ country_code_iso2 }: any) => country_code_iso2 === countryCode) &&
    freeSms > sms_used;
  const freeSmsLeft = isSmsFree ? freeSms - sms_used : 0;
  const totalSmsCharges = Number(sms_rates?.rate || 0) * smsCountData.messages;
  const balanceAmount = Number(user?.company_info?.amount || 0);
  const chargeableSmsCount = Math.max(smsCountData.messages - freeSmsLeft, 0);

  const smsRate = Number(sms_rates?.rate || 0);
  const chargeableAmount = chargeableSmsCount * smsRate;
  const { credits: smsCredits } = useSmsRateCredits({
    segment: smsCountData.messages,
    phone: otherNumber,
    alpha2code: countryCode,
  });

  const { mutateAsync: sendSMSMutate, isPending: sendSMSLoad } = useMutation({
    mutationKey: ['sendSmsNew'],
    mutationFn: sendSms,
    onSuccess: () => {
      setMessage('');
      setMmsFile(null);
      if (mmsFileInputRef.current) {
        mmsFileInputRef.current.value = '';
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
      queryClient.invalidateQueries({ queryKey: ['getSMSList'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['smsListViaDID'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['userSMSInfo'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'], exact: false });
      handleAlert({
        type: 'success',
        text: isMMSMode ? (
          'MMS sent successfully'
        ) : (
          <>
            Remaining SMS: {Math.max(0, freeSms - (sms_used + (smsCountData?.messages || 0)))}
            <br />
            SMS Charges: ${chargeableAmount.toFixed(2)}
          </>
        ),
      });
      setSendMsgAlert(false);
    },
    onError: ({ response }: any) => {
      setSendMsgAlert(false);
      handleAlert({
        type: 'error',
        text: response?.data?.error?.message || 'Something went wrong',
      });
    },
  });

  useEffect(() => {
    if (!smsList?.length) return;
    const groupedMessages = smsList.reduce((groups: any, message: any) => {
      const date = new Date(message?.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});

    const sortedGroups =
      groupedMessages &&
      Object.keys(groupedMessages)
        ?.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        ?.map((date) => {
          return groupedMessages[date];
        });

    setSmsListData(sortedGroups);
  }, [smsList]);

  const scrollToBottom = () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const toggleMessageExpanded = (messageKey: string) =>
    setExpandedMessages((prev) => ({ ...prev, [messageKey]: !prev[messageKey] }));

  // Only offer the jump-to-latest affordance once the reader has actually
  // scrolled away from the newest message.
  const handleThreadScroll = () => {
    const element = scrollAreaRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 240);
  };

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [smsList]);

  const uploadMMSAttachment = async (file: File) => {
    const companyUuid = user?.company_info?.uuid || user?.company_uuid;
    if (!companyUuid) throw new Error('Company uuid not found');

    const uploadRes = await mediaUploadUrl({
      uuid: companyUuid,
      type: 'mms',
      file_name: file?.name,
    });

    const mediaUrl = uploadRes?.data?.data?.result?.url;
    const filename = uploadRes?.data?.data?.result?.file_name;
    if (!mediaUrl || !filename) {
      throw new Error('Failed to generate media upload url');
    }

    const uploadFileResponse = await fetch(mediaUrl, {
      method: 'PUT',
      body: file,
    });
    if (!uploadFileResponse.ok) {
      throw new Error('Failed to upload media file');
    }

    return { mediaUrl, filename };
  };

  async function handleSendSMS() {
    const otherNumber =
      selectedDID?.value?.replaceAll('+', '') === selectedChat?.from?.replaceAll('+', '')
        ? selectedChat?.to
        : selectedChat?.from;
    const senderNumber =
      selectedDID?.value?.replaceAll('+', '') !== selectedChat?.from?.replaceAll('+', '')
        ? selectedChat?.to
        : selectedChat?.from;

    if (sendSMSLoad || isSending) return;

    // Check if the receiver number is USA or international
    const receiverNumber = otherNumber?.startsWith('+') ? otherNumber : `+${otherNumber}`;
    const { isUSA } = checkPhoneNumberCountry(receiverNumber);

    // Check if DLC verification is required for US numbers
    if (isUSA && dlcStatus?.verified === false) {
      setShowDLCPopup(true);
      return;
    }

    /* The company's messaging rules. Runs after the registration check above so
       a number blocked there is refused once, with one explanation, rather than
       twice with two. A guard rail, not a lock: the send endpoint accepts the
       request regardless, so this tells someone before they send rather than
       making it impossible. */
    const messagingCheck = canSendTo(receiverNumber, { dlcVerified: dlcStatus?.verified });
    if (!messagingCheck.allowed) {
      handleAlert({ type: 'error', text: messagingCheck.message || 'Texting is switched off.' });
      return;
    }
    if (messagingCheck.warning) {
      handleAlert({ type: 'warning', text: messagingCheck.warning });
    }

    const payload: any = {
      isMMS: isMMSMode,
      from: senderNumber?.startsWith('+') ? senderNumber : `+${senderNumber}`,
      to: receiverNumber?.trim().replace(/\s+/g, ''),
      text: message,
    };
    if (!isMMSMode && !String(message || '').trim()) {
      handleAlert({ type: 'error', text: 'Message is required' });
      return;
    }
    setIsSending(true);
    try {
      if (isMMSMode && mmsFile) {
        const uploaded = await uploadMMSAttachment(mmsFile);
        payload.mediaUrl = uploaded.mediaUrl;
        payload.filename = uploaded.filename;
      }

      await sendSMSMutate(payload);
      scrollToBottom();
    } catch (error: any) {
      if (!error?.response) {
        handleAlert({
          type: 'error',
          text: error?.message || 'Failed to upload MMS attachment',
        });
      }
    } finally {
      setIsSending(false);
    }
  }

  const name = selectedChat?.name
    ? selectedChat?.name
    : selectedChat?.toContactName
      ? selectedChat?.toContactName
      : getNameFromNumber(otherNumber?.replaceAll(' ', ''))?.includes('+')
        ? 'Unknown contact'
        : getNameFromNumber(otherNumber?.replaceAll(' ', ''));

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    setMmsFile(null);
    if (mmsFileInputRef.current) {
      mmsFileInputRef.current.value = '';
    }
  }, [type, params?.chatId]);

  useEffect(() => {
    if (!mmsFile) {
      setMmsPreviewUrl('');
      return;
    }
    if (!String(mmsFile?.type || '').startsWith('image/')) {
      setMmsPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(mmsFile);
    setMmsPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [mmsFile]);

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    // Reset height to measure scrollHeight correctly
    textarea.style.height = 'auto';
    const maxHeight = 160; // Tailwind's max-h-40 (40 * 4)
    const newHeight = textarea.scrollHeight;
    if (newHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
    // Fix scroll jump issue
    requestAnimationFrame(() => {
      textarea.scrollTop = textarea.scrollHeight;
    });
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    adjustTextareaHeight(e.currentTarget);
  };
  return (
    <>
      {/* Gated on the selected conversation, not on `chatId` in the URL.
          Those were two different sources of truth for one pane: this decided
          whether to show a thread, while the header inside it decided what to
          draw from `selectedChat`. When they disagreed -- `chatId` still in
          the URL after a tab switch cleared `selectedChat` -- the pane
          rendered a header skeleton that could never resolve, because nothing
          in this file ever turns a `chatId` back into a `selectedChat`; only
          clicking a row does. That is the switch-to-fax-and-back hang, and it
          also hit a reload on any ?chatId= link. */}
      {isConversationReady ? (
        <div className="mcm-col mcm-col-stage h-full w-full">
          {/* ── thread header ─────────────────────────────────────── */}
          <div className="mcm-thread-head">
            {onBackToList ? (
              <button
                type="button"
                className={cn('mcm-iconbtn', isCompactLayout ? 'xl:hidden' : 'hidden')}
                onClick={onBackToList}
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
            ) : null}

            {/* No skeleton branch here any more: this whole block only renders
                when `isConversationReady` is true, so the placeholder was
                unreachable in the good case and permanent in the bad one. */}
            <span className="shrink-0">
              <CustomAvatar
                name={name}
                image={selectedChat?.contactPic}
                type="contact"
                size="38"
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mcm-thread-name">{name}</div>
              {/* No channel tag beside the number. The SMS/MMS vs Fax switch
                  at the top of the list is already set to one of them, and it
                  is the thing that decided which threads are on screen at all
                  -- so the tag could only ever repeat the tab you just used. */}
              <div className="mcm-thread-num">
                <span className="mcm-num truncate">{otherNumber}</span>
              </div>
            </div>
            {/* The sending number, as a control rather than the read-only
                "From" chip that used to sit here. Same corner, same width
                budget, but it now does something -- and it left the list
                header, which was four stacked rows deep before the first
                conversation. */}
            <DidPicker
                options={didOptions}
                value={selectedDID}
                onChange={onDidChange}
                className="ml-auto"
              />
          </div>

          {/* Same again: unreachable under the new gate. The thread's own
              loading state is the spinner on the refresh button, which is
              driven by the query rather than by whether a chat is selected. */}
          {(
            <>
              {/* ── message thread ──────────────────────────────────── */}
              <div className="relative min-h-0 flex-1">
                <div
                  ref={scrollAreaRef}
                  onScroll={handleThreadScroll}
                  className="mcm-thread mcm-scroll h-full"
                >
                  {smsListData && smsListData?.length > 0 ? (
                    smsListData?.map((item: any, idx) => {
                      return (
                        <div key={idx} className="flex flex-col">
                          <div className="my-3 flex justify-center">
                            <span className="mcm-daychip">
                              {formatChatDate(item?.[0]?.createdAt)}
                            </span>
                          </div>
                          {item?.map((sms: any, index: any) => {
                            const isOutbound = user?.uuid === sms?.senderId;
                            const messageDate = moment(sms?.createdAt)?.format('HH:mm');
                            const message = sms?.message || '';
                            const isLong = message.length > CHAT_MAX_LENGTH;
                            const messageKey = String(sms?._id || `${idx}-${index}`);
                            const isExpanded = Boolean(expandedMessages[messageKey]);
                            const visibleOutboundText = isExpanded
                              ? message
                              : message.slice(0, CHAT_MAX_LENGTH) + (isLong ? '...' : '');
                            const visibleMessageText =
                              insertSoftBreaksIntoLongWords(visibleOutboundText);
                            const isMMSMessage =
                              String(sms?.messageMimeType || '').toLowerCase() === 'mms';
                            const mmsMediaUrl = isMMSMessage
                              ? getMMSMediaUrl(sms, companyUuid)
                              : '';
                            const status = sms?.dlrStatus || '';
                            const hasText = Boolean(String(visibleOutboundText || '').trim());

                            // Consecutive messages from the same side within a
                            // short window read as one group: only the last one
                            // gets the pointed tail corner.
                            const nextSms = item?.[index + 1];
                            const isLastOutbound = `${idx}-${index}` === lastOutboundKey;
                            const isGroupEnd = !(
                              nextSms &&
                              (user?.uuid === nextSms?.senderId) === isOutbound &&
                              Math.abs(
                                moment(sms?.createdAt).diff(moment(nextSms?.createdAt), 'minutes'),
                              ) < MESSAGE_GROUP_WINDOW_MINUTES
                            );
                            const showsStatus = Boolean(isOutbound && status && isLastOutbound);

                            return (
                              <div
                                key={`${sms?.date}-${index}`}
                                className={cn(
                                  'flex w-full flex-col',
                                  isGroupEnd ? 'mb-2.5' : 'mb-1',
                                  isOutbound ? 'items-end' : 'items-start',
                                )}
                              >
                                <div
                                  className={cn(
                                    'mcm-bub',
                                    isOutbound ? 'mcm-bub-out' : 'mcm-bub-in',
                                    isGroupEnd && 'is-tail',
                                  )}
                                >
                                  {hasText ? (
                                    <p className="whitespace-pre-wrap">{visibleMessageText}</p>
                                  ) : null}
                                  {isMMSMessage && mmsMediaUrl ? (
                                    <div
                                      className="w-full overflow-hidden rounded-[9px]"
                                      style={{
                                        background: isOutbound
                                          ? 'rgba(255,255,255,0.14)'
                                          : 'var(--mcm-surface-2)',
                                      }}
                                    >
                                      <MMSAttachmentPreview
                                        sms={sms}
                                        companyUuid={companyUuid}
                                        isMine={isOutbound}
                                      />
                                    </div>
                                  ) : null}
                                  {isLong ? (
                                    <button
                                      type="button"
                                      className="mcm-showmore"
                                      onClick={() => toggleMessageExpanded(messageKey)}
                                    >
                                      {isExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                  ) : null}
                                </div>
                                {/* One timestamp per group, not per message: a
                                    run of messages a minute apart does not
                                    need the same clock time under each. */}
                                {isGroupEnd || showsStatus ? (
                                  <div
                                    className={cn(
                                      'mt-1 flex items-center gap-2 px-1',
                                      isOutbound ? 'flex-row-reverse' : 'flex-row',
                                    )}
                                  >
                                    {isGroupEnd ? (
                                      <span
                                        className="mcm-num text-[10px]"
                                        style={{ color: 'var(--mcm-ink-4)' }}
                                      >
                                        {messageDate}
                                      </span>
                                    ) : null}
                                    {showsStatus ? messageStatus(status) : null}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    <div className="mcm-empty">
                      <MessageSquareOff className="mcm-empty-ic" />
                      <div className="mcm-empty-title">No messages yet</div>
                      <p>Send the first message below to start this conversation.</p>
                    </div>
                  )}
                  <div ref={containerRef} />
                </div>
                {showScrollToBottom ? (
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    aria-label="Jump to latest message"
                    className="mcm-jump"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    Latest
                  </button>
                ) : null}
              </div>

              {/* ── composer ────────────────────────────────────────── */}
              <div className="mcm-composer">
                {mmsFile && type !== 'fax' ? (
                  <div className="mcm-attach">
                    <div className="mcm-attach-thumb">
                      {mmsPreviewUrl ? (
                        <img src={mmsPreviewUrl} alt={mmsFile?.name || 'attachment'} />
                      ) : String(mmsFile?.type || '').startsWith('video/') ? (
                        <FileVideo2 className="h-5 w-5" />
                      ) : String(mmsFile?.type || '').startsWith('audio/') ? (
                        <FileAudio2 className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="mcm-attach-name">{mmsFile?.name || 'Attachment'}</div>
                      <div className="mcm-attach-sub">
                        Sending as MMS
                        {mmsFile?.size ? ` · ${(mmsFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove attachment"
                      className="mcm-iconbtn"
                      style={{ width: 26, height: 26 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMmsFile(null);
                        if (mmsFileInputRef.current) {
                          mmsFileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                <div className={cn('mcm-composer-shell', (sendSMSLoad || isSending) && 'is-busy')}>
                  <textarea
                    placeholder="Write a message…"
                    rows={1}
                    value={message}
                    ref={textareaRef}
                    onInput={handleInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^\s+/, '');
                      const limitedValue = trimToSmsCountLimit(value);
                      setMessage(limitedValue);
                    }}
                    disabled={sendSMSLoad || isSending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        setMessage((prevMessage) => {
                          return trimToSmsCountLimit(`${prevMessage}\n`);
                        });
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!isMMSMode && smsCountData.messages > freeSmsLeft) {
                          setSendMsgAlert(true);
                        } else {
                          handleSendSMS();
                        }
                      }
                    }}
                  />

                  <div className="mcm-composer-bar">
                    {type !== 'fax' ? (
                      <>
                        <input
                          ref={mmsFileInputRef}
                          type="file"
                          accept="image/*,audio/*,video/*"
                          className="hidden"
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          onChange={(e) => {
                            const selectedFile = e.target.files?.[0] || null;
                            if (selectedFile && !isAllowedMMSFile(selectedFile)) {
                              handleAlert({
                                type: 'error',
                                text: 'Only image, audio, or video files are allowed',
                              });
                              setMmsFile(null);
                              (e.target as HTMLInputElement).value = '';
                              return;
                            }
                            setMmsFile(selectedFile);
                          }}
                        />
                        <button
                          type="button"
                          title="Attach image, audio or video"
                          aria-label="Attach image, audio or video"
                          className="mcm-iconbtn"
                          onClick={() => mmsFileInputRef.current?.click()}
                        >
                          <Paperclip className="h-[17px] w-[17px]" />
                        </button>
                      </>
                    ) : null}

                    <div className="relative flex items-center">
                      <div
                        className="emoji-container absolute bottom-[2.75rem] left-0 z-20 max-w-[calc(100vw-2rem)]"
                        ref={emojiContainerRef}
                      >
                        <EmojiPicker
                          className="border-gray-200"
                          lazyLoadEmojis
                          open={emojiOpen}
                          onEmojiClick={(data) => {
                            setMessage((prev) =>
                              trimToSmsCountLimit(`${prev}${data?.emoji || ''}`),
                            );
                            setEmojiOpen(false);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        title="Insert emoji"
                        aria-label="Insert emoji"
                        className={cn('mcm-iconbtn', emojiOpen && 'is-on')}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEmojiOpen((prev: boolean) => !prev);
                        }}
                      >
                        <EmojiICon className="h-[17px] w-[17px]" />
                      </button>
                    </div>

                    <div className="ml-auto flex items-center gap-2.5">
                      {/* Only once there is something to count, and spelled
                          out. "0 - 0/5" sat there on every empty composer
                          being two numbers and a slash that explain nothing
                          until you already know the rule. */}
                      {!isMMSMode && String(message || '').trim() ? (
                        <span
                          className={cn(
                            'mcm-num hidden text-[11px] sm:inline',
                            smsCountData.messages >= SMS_COUNT_LIMIT && 'is-over',
                          )}
                          style={{
                            color:
                              smsCountData.messages >= SMS_COUNT_LIMIT
                                ? 'var(--mcm-warn)'
                                : 'var(--mcm-ink-3)',
                            fontWeight: smsCountData.messages >= SMS_COUNT_LIMIT ? 700 : 500,
                          }}
                          title={`${smsCountData.length} characters · ${smsCountData.characterPerMessage} characters per SMS`}
                        >
                          {smsCountData.messages}/{SMS_COUNT_LIMIT} SMS
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Send message"
                        title="Send message"
                        className="mcm-sendbtn"
                        disabled={
                          sendSMSLoad || isSending || (!isMMSMode && !String(message || '').trim())
                        }
                        onClick={() => {
                          if (sendSMSLoad || isSending) return;
                          if (!isMMSMode && smsCountData.messages > freeSmsLeft) {
                            setSendMsgAlert(true);
                          } else {
                            handleSendSMS();
                          }
                        }}
                      >
                        {sendSMSLoad || isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-[17px] w-[17px]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* The foot only exists once there is something to send. It was
                    a permanent third row under the composer carrying a
                    keyboard hint you learn once and an estimate that reads
                    "$0.00" until you type -- so it cost a row of every screen
                    to say nothing. Both facts matter while composing, which is
                    exactly when this now appears. */}
                {!isMMSMode && message.trim().length > 0 ? (
                  <div className="mcm-composer-foot">
                    <span className="mcm-num sm:hidden">
                      {smsCountData.length} chars · {smsCountData.messages}/{SMS_COUNT_LIMIT} SMS
                    </span>
                    <span className="hidden sm:inline">
                      Enter to send · Shift + Enter for a new line
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      {freeSmsLeft > 0 ? (
                        <span className="mcm-tag pos">
                          <span className="mcm-num">{freeSmsLeft}</span> free left
                        </span>
                      ) : null}
                      <span>
                        Est. charge{' '}
                        <span
                          className="mcm-num"
                          style={{ color: 'var(--mcm-ink-2)', fontWeight: 700 }}
                        >
                          ${smsCredits.toFixed(2)}
                        </span>
                      </span>
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mcm-col mcm-col-stage h-full w-full">
          {/* The picker lives in the thread header now, and this pane has no
              thread header until something is selected -- so without this it
              would be unreachable exactly when a user wants to switch numbers
              and start a new conversation. */}
          <div className="mcm-empty-bar">
            <DidPicker options={didOptions} value={selectedDID} onChange={onDidChange} />
          </div>
          <div className="mcm-empty">
            <MessageSquareOff className="mcm-empty-ic" />
            <div className="mcm-empty-title">
              {type === 'fax' ? 'No fax selected' : 'No conversation selected'}
            </div>
            <p>
              {type === 'fax'
                ? 'Pick a fax from the list, or send a new one to see it appear here.'
                : 'Pick a conversation from the list, or start a new message to begin texting.'}
            </p>
          </div>
        </div>
      )}
      <DLCVerificationPopup open={showDLCPopup} setOpen={setShowDLCPopup} />
      {!isMMSMode && sendMsgAlert && (
        <AlertConfirm
          open={sendMsgAlert}
          setOpen={setSendMsgAlert}
          onConfirm={handleSendSMS}
          descriptionTextComp={getSmsAlert({
            freeSmsLeft,
            smsCount: smsCountData.messages,
            balanceAmount,
            totalSmsCharges,
          })}
          apiLoading={sendSMSLoad || isSending}
          showButton={!(balanceAmount <= 0)}
          headerText={balanceAmount <= 0 ? 'Alert' : 'Confirm'}
        />
      )}
    </>
  );
};

const Inbox = () => {
  const { clearAllParams, getAllParams, removeParam, setParam } = useSearchParamManager();
  /* The sending-number picker moved out of the list header and into the
     conversation pane, so the options are built here -- the one place that
     already owns `selectedDID` -- rather than inside the sidebar that used to
     render it. */
  const { user: currentUser } = useUser();
  const messageDidOptions = useMemo(
    () =>
      (currentUser?.assigned_did || []).map((number: any, index: number) => ({
        label: formatDialSpaced(number?.did_number),
        value: number?.did_number,
        /* 1-based position in the user's own list of numbers. The closed
           picker shows this instead of thirteen digits; the open menu still
           shows the number in full, because the index only means anything
           next to the thing it stands for. */
        line: index + 1,
      })),
    [currentUser?.assigned_did],
  );
  const [showSendSMSModal, setShowSendSMSModal] = useState(false);
  const [showSendFaxModal, setShowSendFaxModal] = useState(false);
  const [selectedDID, setSelectedDID] = useState({});
  const [selectedFaxDID, setSelectedFaxDID] = useState<any>({});
  const [selectedChat, setSelectedChat] = useState({});
  const [smsNumber, setSmsNumber] = useState('');
  const [faxNumber, setFaxNumber] = useState('');
  const [isFaxFromDisabled, setIsFaxFromDisabled] = useState(false);

  // An SMS push notification navigates here with the message in router state
  // (socket-events-context, 'inbound-sms'). Nothing consumed it before, so the
  // notification landed on whatever thread happened to be open.
  const location = useLocation();
  const navigate = useNavigate();
  const [focusNumber, setFocusNumber] = useState('');

  const [isCompactLayout, setIsCompactLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1280 : false,
  );
  const { formState, number, chatId, faxMessageId } = getAllParams();
  const { data: dataFetchContact } = useFetchContact();
  const { features } = useCompanyFeatures();
  const messagesAccess = features?.plan_features?.messages?.action || {};
  const canUseMessages = Boolean(messagesAccess?.send_message || messagesAccess?.send_mms);
  const canUseFax = Boolean(messagesAccess?.send_fax);
  const [type, setType] = useState<string>('messages');
  const hasActiveConversation = type === 'fax' ? Boolean(faxMessageId) : Boolean(chatId);
  const { data: faxAssignedNumbers = EMPTY_FAX_DID_NUMBERS, isLoading: isFaxDIDLoading } = useQuery(
    {
      queryKey: ['faxAssignedDidNumbers', FAX_ASSIGNED_DID_PAYLOAD],
      queryFn: () => getFaxAssignedDidNumbers(FAX_ASSIGNED_DID_PAYLOAD),
      select: (response) => {
        const result = response?.data?.data?.result;
        if (Array.isArray(result)) return result;
        if (Array.isArray(result?.rows)) return result.rows;
        if (Array.isArray(result?.data)) return result.data;
        return EMPTY_FAX_DID_NUMBERS;
      },
      enabled: Boolean(messagesAccess?.send_fax),
    },
  );
  const faxDIDOptions = useMemo(() => {
    const seenNumbers = new Set<string>();

    return faxAssignedNumbers.reduce((options: any[], item: any) => {
      const number = getFaxDidNumber(item);
      const normalizedNumber = number.replace(/\+/g, '');
      if (!number || seenNumbers.has(normalizedNumber)) return options;
      seenNumbers.add(normalizedNumber);

      options.push({
        label: formatDialSpaced(number),
        value: number,
        /* Same 1-based index the messages picker uses, so a fax line reads
           the same way as an SMS line. */
        line: options.length + 1,
      });
      return options;
    }, []);
  }, [faxAssignedNumbers]);

  useEffect(() => {
    if (isFaxDIDLoading) return;

    setSelectedFaxDID((current: any) => {
      if (!faxDIDOptions.length) return current?.value ? {} : current;
      const currentNumber = String(current?.value || '').replace(/\+/g, '');
      return (
        faxDIDOptions.find((option: any) => option.value.replace(/\+/g, '') === currentNumber) ||
        faxDIDOptions[0]
      );
    });
  }, [faxDIDOptions, isFaxDIDLoading]);
  const openSendModal = () => {
    setShowSendSMSModal(true);
  };
  const getNameFromNumber = (number: string = '') => {
    const contact = dataFetchContact?.[number] || null;
    if (contact) {
      return `${contact?.first_name || ''} ${contact?.last_name || ''}`;
    } else {
      return number;
    }
  };

  // Keep the selected tab when it is allowed and only fall back when access changes.
  useEffect(() => {
    setType((currentType) => {
      const canUseCurrentTab =
        (currentType === 'messages' && canUseMessages) || (currentType === 'fax' && canUseFax);

      if (canUseCurrentTab) return currentType;
      if (canUseMessages) return 'messages';
      if (canUseFax) return 'fax';
      return 'messages';
    });
  }, [canUseFax, canUseMessages]);

  // Keep SMS and fax conversation state isolated when switching tabs.
  useEffect(() => {
    if (type === 'fax' && chatId) {
      setSelectedChat({});
      removeParam('chatId');
    } else if (type === 'messages' && faxMessageId) {
      setSelectedChat({});
      removeParam('faxMessageId');
    }
  }, [chatId, faxMessageId, type]);

  useEffect(() => {
    if (formState === 'contact' && number) {
      setSmsNumber(number);
      setShowSendSMSModal(true);
    }
  }, [formState, number]);

  // Consume the SMS push-notification payload, then strip it from history so a
  // refresh or a back-navigation does not yank the user to an old thread.
  useEffect(() => {
    const notificationData = (location.state as any)?.notificationData;
    if (!notificationData) return;

    const sender = String(notificationData?.from || '').trim();
    const receivedOn = String(notificationData?.to || notificationData?.didNumber || '').trim();

    if (sender) {
      setType('messages');
      setFocusNumber(sender);
      if (receivedOn) setParam({ did_number: receivedOn });
    }

    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.key]);

  useEffect(() => {
    const handleResize = () => {
      setIsCompactLayout(window.innerWidth < 1280);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBackToList = () => {
    setSelectedChat({});
    removeParam(type === 'fax' ? 'faxMessageId' : 'chatId');
  };

  return (
    <div className="mcm-actpage">
      <ActivityPageHead title="Inbox" description="Faxes, SMS and everything sent to your numbers, in one thread list." />
      <div className="mcm-inbox w-full h-full min-h-0 flex overflow-hidden bg-white">
      <section
        className={cn(
          'h-full min-h-0 bg-white',
          isCompactLayout
            ? hasActiveConversation
              ? 'hidden'
              : 'w-full'
            : 'w-full min-w-0 lg:w-[22rem] lg:min-w-[22rem] lg:max-w-[22rem]',
        )}
      >
        {/* Not collapsible. The conversation list is half of what this screen
            is -- you pick a thread from it, read on the right, and pick the
            next one -- so folding it away leaves a pane with no way back into
            the list except reopening the panel you just closed. */}
        <PageSidebarLayout
          collapsible={false}
          fullHeightOnMobile
          content={
            <InnerSidebarInbox
              type={type}
              focusNumber={focusNumber}
              onFocusHandled={() => setFocusNumber('')}
              headerAction={
                messagesAccess?.send_message ||
                messagesAccess?.send_mms ||
                messagesAccess?.send_fax ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="mcm-btn sm primary">
                        <AddCircle className="h-4 w-4" />
                        New
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {messagesAccess?.send_message || messagesAccess?.send_mms ? (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setSmsNumber('');
                            openSendModal();
                          }}
                        >
                          <PlainLine className="text-gray-900 w-8 h-8" /> Send New Message
                        </DropdownMenuItem>
                      ) : null}
                      {messagesAccess?.send_fax ? (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setFaxNumber('');
                            setIsFaxFromDisabled(false);
                            setShowSendFaxModal(true);
                          }}
                        >
                          <FileText className="ml-1 mr-2 h-6 w-6 text-gray-900" /> Send New Fax
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null
              }
              setSelectedDID={setSelectedDID}
              selectedDID={selectedDID}
              selectedChat={selectedChat}
              setSelectedChat={setSelectedChat}
              getNameFromNumber={getNameFromNumber}
              messagesAccess={messagesAccess}
              setType={setType}
              setSmsNumber={setSmsNumber}
              faxDIDOptions={faxDIDOptions}
              selectedFaxDID={selectedFaxDID}
              setSelectedFaxDID={setSelectedFaxDID}
              isFaxDIDLoading={isFaxDIDLoading}
              isCompactLayout={isCompactLayout}
              setShowSendSMSModal={(value: boolean) => {
                if (value) {
                  openSendModal();
                } else {
                  setShowSendSMSModal(false);
                }
              }}
            />
          }
        />
      </section>
      <section
        className={cn(
          'h-full min-h-0 w-full min-w-0 flex-1 bg-white',
          isCompactLayout ? (hasActiveConversation ? 'block' : 'hidden') : 'block',
        )}
      >
        {type === 'fax' ? (
          <FaxContent
            selectedDID={selectedFaxDID}
            didOptions={faxDIDOptions}
            onDidChange={(val: any) => {
              setSelectedFaxDID(val);
              setSelectedChat({});
              clearAllParams();
            }}
            selectedChat={selectedChat}
            getNameFromNumber={getNameFromNumber}
            onBackToList={isCompactLayout ? handleBackToList : undefined}
            onSendNewFax={(number) => {
              setFaxNumber(number);
              setIsFaxFromDisabled(true);
              setShowSendFaxModal(true);
            }}
            isCompactLayout={isCompactLayout}
          />
        ) : (
          <InboxContent
            selectedDID={selectedDID}
            selectedChat={selectedChat}
            getNameFromNumber={getNameFromNumber}
            type={type}
            onBackToList={isCompactLayout ? handleBackToList : undefined}
            isCompactLayout={isCompactLayout}
            didOptions={messageDidOptions}
            onDidChange={(val: any) => {
              setSelectedDID(val);
              clearAllParams();
            }}
          />
        )}
      </section>
      {/* Centred, not a right-hand drawer. Composing a message is a task you
          start and finish before going back to the list -- a sheet sliding in
          from the edge implies the list behind it is still in play, and left
          the form hugging one side of a wide screen. */}
      <Dialog open={showSendSMSModal} onOpenChange={(open) => {
        if (open) return;
        if (formState === 'contact' && number) clearAllParams();
        setShowSendSMSModal(false);
      }}>
        <DialogContent className="mcm-inbox mcm-formdialog max-w-[560px] w-[calc(100vw-32px)] p-0">
          <DialogTitle className="sr-only">New message</DialogTitle>
          <div className="mcm-formdialog-body">
            <SendSMSModal
              handleClose={() => {
                if (formState === 'contact' && number) clearAllParams();
                setShowSendSMSModal(false);
              }}
              defaultNumber={smsNumber}
              selectedDID={selectedDID}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSendFaxModal} onOpenChange={(open) => !open && setShowSendFaxModal(false)}>
        <DialogContent className="mcm-inbox mcm-formdialog max-w-[560px] w-[calc(100vw-32px)] p-0">
          <DialogTitle className="sr-only">New fax</DialogTitle>
          <div className="mcm-formdialog-body">
            <SendFaxModal
              defaultNumber={faxNumber}
              faxDIDOptions={faxDIDOptions}
              selectedDID={selectedFaxDID}
              isFromDisabled={isFaxFromDisabled}
              handleClose={() => setShowSendFaxModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Inbox;
