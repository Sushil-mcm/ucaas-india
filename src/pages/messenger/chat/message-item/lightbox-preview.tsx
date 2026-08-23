import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, FileText, X, Play, Pause } from 'lucide-react';
import moment from 'moment';
import CustomAvatar from '@/components/custom/custom-avatar';
import { cn } from '@/lib/utils';
import { FILE_TYPES, getFileType } from '../utils';
import { useMediaBlob } from './use-media-blob';
import DownloadButton from './download-button';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';

interface LightBoxPreviewProps {
  open: boolean;
  onClose: () => void;
  mediaUrl?: string;
  alt?: string;
  type?: 'image' | 'video';
  senderName?: string;
  senderAvatar?: string;
  sentTime?: string;
  slides?: any[];
  index?: number;
}

const LightBoxPreview = ({
  open,
  onClose,
  mediaUrl,
  alt,
  type = 'image',
  senderName,
  senderAvatar,
  sentTime,
  slides: defaultSlides,
  index = 0,
}: LightBoxPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(index);

  useEffect(() => {
    if (!open) return;
    setCurrentIndex(index);
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min((slides?.length || 1) - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const slides = useMemo(() => {
    if (Array.isArray(defaultSlides) && defaultSlides.length > 0) return defaultSlides;
    return [
      {
        src: mediaUrl || '',
        alt: alt || 'Preview',
        type,
        senderName,
        senderAvatar,
        sentTime,
      },
    ];
  }, [defaultSlides, mediaUrl, alt, type, senderName, senderAvatar, sentTime]);

  const currentSlide = slides[currentIndex] || slides[0] || null;
  const currentFileType = getFileType(
    currentSlide?.alt || currentSlide?.id || currentSlide?.serverFileName || '',
  );
  const currentType =
    currentSlide?.type ||
    (currentFileType === FILE_TYPES.IMAGE
      ? 'image'
      : currentFileType === FILE_TYPES.VIDEO
        ? 'video'
        : currentFileType === FILE_TYPES.AUDIO
          ? 'audio'
          : 'document');

  const { data: blobUrl, isLoading: isBlobLoading } = useMediaBlob({
    serverFileName: currentSlide?.serverFileName,
    company_uuid: currentSlide?.company_uuid,
    type: 'chat',
    enabled: Boolean(currentSlide?.serverFileName && currentSlide?.company_uuid),
  });

  const fallbackMediaUrl = currentSlide?.src || currentSlide?.sources?.[0]?.src || mediaUrl || '';
  const { data: authenticatedFallbackUrl, isLoading: isFallbackLoading } = useAuthenticatedMediaUrl(
    fallbackMediaUrl,
    Boolean(fallbackMediaUrl),
  );
  const resolvedMediaUrl = blobUrl || authenticatedFallbackUrl;
  const isLoading = isBlobLoading || isFallbackLoading;

  const [isPlaying, setIsPlaying] = useState(false);
  const [animationState, setAnimationState] = useState<'play' | 'pause' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset play/pause states when slide URL changes
  useEffect(() => {
    setIsPlaying(false);
    setAnimationState(null);
  }, [resolvedMediaUrl]);

  // Clear transient play/pause animation after it completes
  useEffect(() => {
    if (animationState) {
      const timer = setTimeout(() => {
        setAnimationState(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [animationState]);

  const handlePlay = () => {
    setIsPlaying(true);
    setAnimationState('play');
  };

  const handlePause = () => {
    setIsPlaying(false);
    setAnimationState('pause');
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => console.log('Video play interrupted:', err));
    } else {
      videoRef.current.pause();
    }
  };

  if (!open || typeof document === 'undefined') return null;
  if (!currentSlide) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm">
      <div className="absolute inset-0 flex flex-col">
        <div className="h-16 px-4 flex items-center justify-between text-white border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <CustomAvatar
              name={currentSlide?.senderName || senderName || 'Unknown'}
              size="34"
              showPresence={false}
              image={currentSlide?.senderAvatar || senderAvatar || ''}
            />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {currentSlide?.senderName || senderName || 'Unknown User'}
              </div>
              <div className="text-xs text-white/70">
                {currentSlide?.sentTime || sentTime
                  ? moment(currentSlide?.sentTime || sentTime).format('MMM DD, hh:mm A')
                  : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentSlide?.serverFileName && currentSlide?.company_uuid ? (
              <DownloadButton
                fileName={currentSlide?.alt || 'download'}
                file_name={currentSlide.serverFileName}
                company_uuid={currentSlide.company_uuid}
                type="chat"
                size="size-5"
                className="text-white"
              />
            ) : null}
            <button
              type="button"
              className="p-2 rounded-md hover:bg-white/10"
              onClick={onClose}
              aria-label="Close preview"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center px-16 py-6">
          {slides.length > 1 ? (
            <button
              type="button"
              className={cn(
                'absolute left-4 z-10 p-2 rounded-full text-white',
                currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10',
              )}
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              aria-label="Previous"
            >
              <ChevronLeft size={26} />
            </button>
          ) : null}

          <div className="w-full h-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-sm text-white/70">Loading preview...</div>
            ) : currentType === 'image' ? (
              <img
                src={resolvedMediaUrl}
                alt={currentSlide?.alt || 'Image'}
                className="max-h-[78vh] max-w-[78vw] object-contain rounded"
              />
            ) : currentType === 'video' ? (
              <div className="relative group max-h-[78vh] max-w-[78vw] flex items-center justify-center rounded overflow-hidden select-none">
                <video
                  ref={videoRef}
                  src={resolvedMediaUrl}
                  controls
                  autoPlay
                  onPlay={handlePlay}
                  onPause={handlePause}
                  className="max-h-[78vh] max-w-[78vw] object-contain rounded"
                />

                {/* Click catcher overlay for toggling play/pause, leaving bottom controls accessible */}
                <div
                  className="absolute inset-x-0 top-0 bottom-14 z-10 cursor-pointer"
                  onClick={togglePlay}
                />

                {/* Transient Play/Pause animation flash in the middle */}
                {animationState && animationState === 'play' && (
                  <div className="absolute pointer-events-none inset-0 flex items-center justify-center z-[15]">
                    <div className="animate-play-pause flex items-center justify-center w-20 h-20 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-2xl">
                      {animationState === 'play' ? (
                        <Play className="w-10 h-10 fill-current translate-x-0.5" />
                      ) : (
                        <Pause className="w-10 h-10 fill-current" />
                      )}
                    </div>
                  </div>
                )}

                {/* Persistent Play button when paused */}
                {!isPlaying && !animationState && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="pointer-events-auto flex items-center justify-center w-16 h-16 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white border border-white/20 shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                      aria-label="Play video"
                    >
                      <Play className="w-8 h-8 fill-current translate-x-0.5" />
                    </button>
                  </div>
                )}

                {/* Stylesheet containing custom animations */}
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                  @keyframes playPauseFade {
                    0% {
                      transform: scale(0.85);
                      opacity: 0;
                    }
                    15% {
                      transform: scale(1);
                      opacity: 1;
                    }
                    75% {
                      transform: scale(1.05);
                      opacity: 1;
                    }
                    100% {
                      transform: scale(1.25);
                      opacity: 0;
                    }
                  }
                  .animate-play-pause {
                    animation: playPauseFade 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                  }
                `,
                  }}
                />
              </div>
            ) : currentType === 'audio' ? (
              <audio controls src={resolvedMediaUrl} className="w-full max-w-[640px]" />
            ) : (
              <div className="flex flex-col items-center justify-center text-white/80">
                <FileText size={56} />
                <div className="mt-4 text-sm">
                  {currentSlide?.alt || 'Document preview unavailable'}
                </div>
              </div>
            )}
          </div>

          {slides.length > 1 ? (
            <button
              type="button"
              className={cn(
                'absolute right-4 z-10 p-2 rounded-full text-white',
                currentIndex >= slides.length - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-white/10',
              )}
              disabled={currentIndex >= slides.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1))}
              aria-label="Next"
            >
              <ChevronRight size={26} />
            </button>
          ) : null}
        </div>

        <div className="h-12 px-4 flex items-center justify-center text-white/80 text-sm border-t border-white/10">
          <span className="truncate max-w-[80vw]">{currentSlide?.alt || alt || ''}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default LightBoxPreview;
