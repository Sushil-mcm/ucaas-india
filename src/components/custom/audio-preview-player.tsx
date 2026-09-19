import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';

interface AudioPreviewPlayerProps {
  src: string;
  authenticated?: boolean;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Custom-styled stand-in for the browser's own `<audio controls>` skin (a
// plain grey bar with a native context menu) -- built for the "preview a
// recording" side drawer, which is a fixed-width panel with room for a
// proper play/pause button, seek bar and volume icon in the app's own
// orange theme instead of whatever the OS/browser ships.
const AudioPreviewPlayer = ({ src, authenticated = false }: AudioPreviewPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
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

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const nextTime = (Number(event.target.value) / 100) * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const nextVolume = Number(event.target.value) / 100;
    setVolume(nextVolume);
    if (audio) audio.volume = nextVolume;
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-[rgba(242,153,74,0.25)] bg-[#fff9f2] p-4">
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
        <Skeleton className="h-16 w-full rounded-xl bg-[#f0e4d3]" aria-label="Loading audio preview" />
      ) : isError ? (
        <p className="py-2 text-center text-xs text-red-500">Unable to load this audio.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c96f1f] text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="ml-0.5 h-4.5 w-4.5" />}
            </button>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="relative flex h-3.5 w-full items-center">
                {/* `appearance-none` strips the native range skin, but a plain
                    `background` on the input itself doesn't paint a track in
                    every browser -- that needs `::-webkit-slider-runnable-track`/
                    `::-moz-range-track`, which Tailwind's arbitrary classes
                    can't reach. A filled div underneath (sized to the current
                    percentage) plus an invisible range input on top for
                    dragging renders identically everywhere. */}
                <div className="pointer-events-none absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-[#f0e4d3]">
                  <div
                    className="h-full rounded-full bg-[#c96f1f]"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressPct}
                  onChange={handleSeek}
                  className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c96f1f] [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#c96f1f]"
                  aria-label="Seek"
                />
              </div>
              <div className="flex justify-between text-[11px] font-medium text-[#9A948F]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#9A948F]" />
            <div className="relative flex h-3 w-24 items-center">
              <div className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-[#f0e4d3]">
                <div className="h-full rounded-full bg-[#c96f1f]" style={{ width: `${volume * 100}%` }} />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={volume * 100}
                onChange={handleVolume}
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c96f1f] [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#c96f1f]"
                aria-label="Volume"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AudioPreviewPlayer;
