import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Pause, Play } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { isAudioFile, isImageFile, isVideoFile } from '../utils';
import FilePreview from './file-preview';
import DownloadButton from './download-button';
import { useMediaBlob } from './use-media-blob';

interface AttachmentItemProps {
  item: any;
  onPreview?: (serverFileName: string) => void;
  isMine?: boolean;
  messageTime?: string;
}

const AttachmentItem = ({
  item,
  onPreview,
  isMine = false,
  messageTime = '',
}: AttachmentItemProps) => {
  const { user } = useUser();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const isAudio = isAudioFile(item?.fileName || '');
  const isImage = isImageFile(item?.fileName || '');
  const isVideo = isVideoFile(item?.fileName || '');
  const isStandaloneChatRoute =
    window.location.pathname.includes('/messenger') ||
    window.location.pathname.includes('/agent-chat');

  const widthClassName = isStandaloneChatRoute ? 'min-w-40 max-w-40' : 'min-w-32 max-w-32';
  const companyUuid = item?.company_uuid || user?.company_info?.uuid || user?.company_uuid || '';

  const { data: audioUrlServer, isLoading: isLoadingAudio } = useMediaBlob({
    serverFileName: item?.serverFileName,
    company_uuid: companyUuid,
    type: 'chat',
    enabled: isAudio,
  });

  const { data: imageUrlServer, isLoading: isLoadingImage } = useMediaBlob({
    serverFileName: item?.serverFileName,
    company_uuid: companyUuid,
    type: 'chat',
    enabled: isImage,
  });

  const { data: videoUrlServer, isLoading: isLoadingVideo } = useMediaBlob({
    serverFileName: item?.serverFileName,
    company_uuid: companyUuid,
    type: 'chat',
    enabled: isVideo,
  });

  const togglePlay = () => {
    if (!audioRef.current || !audioUrlServer || isLoadingAudio) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => console.error('Audio play error:', error));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!item?.serverFileName || !companyUuid) return null;

  if (isAudio) {
    return (
      <div
        className={cn(
          'border-b last:border-b-0 w-full flex flex-col gap-2 px-3 py-3',
          isMine ? 'border-white/15' : 'border-gray-200',
        )}
      >
        {/* Row: play button + filename + download */}
        <div className="flex items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoadingAudio || !audioUrlServer}
            className={cn(
              'min-w-9 max-h-9 max-w-9 min-h-9 rounded-full flex justify-center items-center transition-colors shrink-0',
              isMine
                ? 'bg-primary text-white hover:bg-primary'
                : 'bg-primary text-white hover:opacity-90',
              isLoadingAudio || !audioUrlServer
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer',
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

          {audioUrlServer ? (
            <audio
              ref={audioRef}
              src={audioUrlServer}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              preload="metadata"
            />
          ) : null}

          <div className="flex flex-col flex-1 min-w-0">
            <div className={cn('text-sm font-medium truncate', widthClassName)}>
              {item?.fileName || 'Voice message'}
            </div>
            <div className={cn('text-xs', isMine ? 'text-gray-500' : 'text-gray-500')}>
              {isLoadingAudio
                ? 'Loading...'
                : isPlaying
                  ? `${formatDuration(currentTime)} / ${formatDuration(duration)}`
                  : formatDuration(duration) || 'Voice message'}
            </div>
          </div>

          <DownloadButton
            fileName={item?.fileName || 'download'}
            file_name={item?.serverFileName}
            company_uuid={companyUuid}
            type="chat"
            size="size-4"
            className={isMine ? 'text-gray-500' : 'text-gray-500'}
          />
        </div>

        {/* Progress / seek bar */}
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
              onChange={handleSeek}
              disabled={!audioUrlServer || isLoadingAudio}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
            />
          </div>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="w-full">
        <div
          className={cn(
            'relative h-44 w-64 max-w-full overflow-hidden rounded-xl',
            imageUrlServer ? 'cursor-pointer' : '',
          )}
          onClick={() => {
            if (imageUrlServer) onPreview?.(item?.serverFileName);
          }}
        >
          {isLoadingImage ? (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          ) : imageUrlServer ? (
            <img
              src={imageUrlServer}
              alt={item?.fileName}
              className="block h-full w-full object-cover bg-black/5"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <ImageIcon size={26} />
            </div>
          )}
          {imageUrlServer ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent" />
              {messageTime ? (
                <span className="pointer-events-none absolute bottom-2 right-2 text-[11px] font-medium text-white drop-shadow">
                  {messageTime}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="w-full">
        <div
          className={cn(
            'relative h-44 w-64 max-w-full overflow-hidden rounded-xl',
            videoUrlServer ? 'cursor-pointer' : '',
          )}
          onClick={() => {
            if (videoUrlServer) onPreview?.(item?.serverFileName);
          }}
        >
          {isLoadingVideo ? (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          ) : videoUrlServer ? (
            <>
              <video
                src={videoUrlServer}
                className="h-full w-full object-cover bg-black"
                playsInline
                muted
                preload="metadata"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/95 bg-black/35 shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                  <div className="absolute inset-[3px] rounded-full bg-black/55" />
                  <Play
                    size={16}
                    className="relative ml-0.5 text-white drop-shadow-sm"
                    fill="currentColor"
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent" />
              {messageTime ? (
                <span className="pointer-events-none absolute bottom-2 right-2 text-[11px] font-medium text-white drop-shadow">
                  {messageTime}
                </span>
              ) : null}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-gray-100">
              <FilePreview
                key={`${item?.serverFileName}`}
                filename={item?.serverFileName}
                company_uuid={companyUuid}
                type="chat"
                size={36}
                onPreview={() => onPreview?.(item?.serverFileName)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Generic file
  return (
    <div
      className={cn(
        'border-b last:border-b-0 w-full min-h-14 items-center flex gap-2 px-3 py-2',
        isMine ? 'border-white/15 text-white' : 'border-gray-200 text-gray-900',
      )}
    >
      <div className="min-w-9 max-h-9 max-w-9 min-h-9 rounded-lg flex justify-center items-center overflow-hidden">
        <FilePreview
          key={`${item?.serverFileName}`}
          filename={item?.serverFileName}
          company_uuid={companyUuid}
          type="chat"
          size={36}
          disableOpen
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className={cn('text-sm font-medium truncate text-gray-900', widthClassName)}>
          {item?.fileName}
        </div>
        <div className={cn('text-xs truncate', 'text-gray-500')}>
          {formatFileSize(item?.fileSize || item?.size || 0)}
        </div>
      </div>

      <DownloadButton
        fileName={item?.fileName || 'download'}
        file_name={item?.serverFileName}
        company_uuid={companyUuid}
        type="chat"
        size="size-4"
        className={'text-gray-500'}
      />
    </div>
  );
};

export default AttachmentItem;
