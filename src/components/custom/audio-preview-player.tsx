import { useEffect, useRef, useState } from 'react';
import { Download, EllipsisVertical, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CloseIcon } from '@/assets/icons';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AudioPreviewPlayerProps {
  src: string;
  authenticated?: boolean;
  onClose: () => void;
}

const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5, 2];

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// A compact, single-row player -- the same shape as the browser's own
// `<audio controls>` bar it replaces -- because that native bar's own kebab
// menu (download, playback speed) can't be restyled: it's browser chrome,
// not DOM. Rebuilding just enough of it as real markup lets the download
// and speed options live in the app's own themed DropdownMenu instead.
const AudioPreviewPlayer = ({ src, authenticated = false, onClose }: AudioPreviewPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const {
    data: authenticatedSrc,
    isLoading: isAuthenticatedSrcLoading,
    isError: hasAuthenticatedSrcError,
  } = useAuthenticatedMediaUrl(src, authenticated && Boolean(src));
  const resolvedSrc = authenticated ? authenticatedSrc || undefined : src;
  const isLoading = isAuthenticatedSrcLoading || !isReady;
  const isError = hasAuthenticatedSrcError || hasError;

  useEffect(() => {
    setIsReady(false);
    setHasError(false);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const nextTime = (Number(event.target.value) / 100) * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleSpeedChange = (speed: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const handleDownload = () => {
    if (!resolvedSrc) return;
    const link = document.createElement('a');
    link.href = resolvedSrc;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    // No padding of its own -- the popover wrapping this already adds `p-1`;
    // stacking a second one made this card taller than the row it opens
    // from, so it overflowed past the row into the divider underneath it.
    <div className="flex w-full items-center gap-2">
      <audio
        ref={audioRef}
        src={resolvedSrc}
        preload="auto"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onCanPlay={() => setIsReady(true)}
        onError={() => setHasError(true)}
        className="hidden"
      />

      {isLoading && !isError ? (
        <Skeleton className="h-9 w-full rounded-full bg-[#f0e4d3]" aria-label="Loading audio preview" />
      ) : isError ? (
        <p className="w-full py-2 text-center text-xs text-red-500">Unable to load this audio.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c96f1f] text-white transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
          </button>

          <span className="w-[62px] shrink-0 text-[11px] font-medium text-[#9A948F]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="relative flex h-3.5 w-full min-w-0 flex-1 items-center">
            <div className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-[#f0e4d3]">
              <div className="h-full rounded-full bg-[#c96f1f]" style={{ width: `${progressPct}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={progressPct}
              onChange={handleSeek}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#c96f1f] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c96f1f]"
              aria-label="Seek"
            />
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#c96f1f] hover:bg-[#FBE2C8]/40"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#c96f1f] hover:bg-[#FBE2C8]/40"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[170px] border-0">
              <DropdownMenuItem
                className="focus:bg-primary/10 focus:text-primary"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="focus:bg-primary/10 focus:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
                  Playback speed
                  <span className="ml-2 text-xs text-[#9A948F]">{playbackRate}x</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[100px] border-0">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      className={
                        speed === playbackRate
                          ? 'bg-primary/10 text-primary'
                          : 'focus:bg-primary/10 focus:text-primary'
                      }
                      onClick={() => handleSpeedChange(speed)}
                    >
                      {speed}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#9A948F] hover:bg-[#FBE2C8]/40 hover:text-[#2E2D35]"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
};

export default AudioPreviewPlayer;
