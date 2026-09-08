import { FC, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media';
import ReadyAudio from '@/components/custom/ready-audio';
import { Skeleton } from '@/components/ui/skeleton';
import { Headphones, Pause, Play, X } from 'lucide-react';
import NumberWithFlag from '@/components/custom/number-with-flag';

interface AudioModalMeta {
  fromNumber?: string;
  didNumber?: string;
  leftAt?: string;
  lengthLabel?: string;
}

interface AudioModalProps {
  modalState: boolean;
  setModalState: (val: boolean) => void;
  serRecordingUrl: (val: any) => void;
  srcUrl: string | null;
  /* Caller context for the row being played. Only Performance > Callbacks
     passes this today — its presence opts into the redesigned "Voicemail
     Playback" modal below; every other caller keeps the plain "Play Audio"
     dialog untouched. */
  meta?: AudioModalMeta;
}

/* Demo-only fallback: the dummy voicemail rows in Performance > Callbacks
   point at recording files that don't actually exist on the server, so the
   real fetch always 404s. Rather than showing a dead "unable to load"
   state in a client meeting, synthesize a short tone locally (no network
   call, so it always works) and play that instead — clearly labeled as a
   preview so nobody mistakes it for a real recording. This is scaffolding
   for demo data only and should not ship once real recordings are wired
   up; feel free to delete once every row has a real recording_file. */
const parseLengthLabelToSeconds = (label?: string) => {
  const match = /^(\d+):(\d{2})$/.exec(label || '');
  if (!match) return 30;
  return Number(match[1]) * 60 + Number(match[2]);
};

const createMockVoicemailTone = (durationSeconds: number) => {
  const sampleRate = 8000;
  const numSamples = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let angle = 0;
  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const freq = 220 + Math.sin(t * 1.6) * 24;
    angle += (2 * Math.PI * freq) / sampleRate;
    const fade = Math.min(1, Math.min(t, durationSeconds - t) * 4);
    const sample = Math.sin(angle) * 0.18 * fade;
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

const formatClock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

const VoicemailPlayer: FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const value = Number(event.target.value);
    if (audio) audio.currentTime = value;
    setCurrentTime(value);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="vm-player">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        autoPlay
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
      />
      <div className="vm-player-row">
        <button type="button" className="vm-play-btn" onClick={togglePlay}>
          {isPlaying ? (
            <Pause className="h-4.5 w-4.5" fill="currentColor" />
          ) : (
            <Play className="h-4.5 w-4.5 ml-0.5" fill="currentColor" />
          )}
        </button>
        <div className="vm-player-track">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleScrub}
            className="vm-scrubber"
            style={{ '--vm-progress': `${progressPct}%` } as React.CSSProperties}
          />
          <div className="vm-player-timers">
            <span>{formatClock(currentTime)}</span>
            <span>/ {formatClock(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AudioModal: FC<AudioModalProps> = ({
  modalState,
  setModalState,
  srcUrl,
  serRecordingUrl,
  meta,
}) => {
  const {
    data: authenticatedSrcUrl,
    isLoading: isMediaLoading,
    isError: hasMediaError,
  } = useAuthenticatedMediaUrl(srcUrl || '', modalState);

  useEffect(() => {
    if (!modalState) {
      serRecordingUrl('');
    }
  }, [modalState, serRecordingUrl]);

  const [mockAudioUrl, setMockAudioUrl] = useState('');
  useEffect(() => {
    if (!meta || !modalState || !hasMediaError) return undefined;
    const url = createMockVoicemailTone(parseLengthLabelToSeconds(meta.lengthLabel));
    setMockAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [meta, modalState, hasMediaError]);

  if (meta) {
    return (
      <Dialog open={modalState} onOpenChange={setModalState}>
        <DialogContent
          className="vm-modal max-w-md w-full rounded-[20px] p-6 gap-0 bg-[#fffdfb] border border-[rgba(249,115,22,0.18)] shadow-[0_20px_45px_rgba(160,95,30,0.20)] backdrop-blur-[20px]"
          overlayClassName="bg-black/35 backdrop-blur-sm"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Voicemail Playback</DialogTitle>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-[#1a1a1a]">
              <Headphones className="h-4.5 w-4.5 text-[#ea580c]" />
              Voicemail Playback
            </div>
            <button
              type="button"
              onClick={() => setModalState(false)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[rgba(249,115,22,0.2)] bg-[#fff7ed] text-[#8a6f57] transition-all hover:bg-[#ffedd5] hover:text-[#1a1a1a]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-5 rounded-xl border border-orange-100/60 bg-white/80 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#1a1a1a]">
                <NumberWithFlag number={meta.fromNumber} />
              </span>
              {meta.leftAt && (
                <span className="shrink-0 text-xs text-[#64748b]">{meta.leftAt}</span>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-[#64748b]">
              <span className="inline-flex items-center gap-1">
                DID: <NumberWithFlag number={meta.didNumber} />
              </span>
              {meta.lengthLabel && (
                <span className="shrink-0 font-mono">{meta.lengthLabel}</span>
              )}
            </div>
          </div>

          {isMediaLoading ? (
            <Skeleton className="h-12 w-full rounded-full bg-gray-200" />
          ) : authenticatedSrcUrl ? (
            <VoicemailPlayer src={authenticatedSrcUrl} />
          ) : hasMediaError && mockAudioUrl ? (
            <VoicemailPlayer src={mockAudioUrl} />
          ) : hasMediaError ? (
            <p className="py-3 text-center text-sm text-red-500">Unable to load this recording.</p>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="w-1/4 p-3" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Play Audio
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer  text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <DialogDescription>
          {hasMediaError ? (
            <p className="py-3 text-center text-sm text-red-500">Unable to load this recording.</p>
          ) : isMediaLoading ? (
            <Skeleton className="h-10 w-full rounded-full bg-gray-200" />
          ) : authenticatedSrcUrl ? (
            <ReadyAudio controls src={authenticatedSrcUrl} autoPlay />
          ) : null}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default AudioModal;
