import { useState, useRef, useEffect, FC, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import { Mic, Music, X } from 'lucide-react';
import Recorder from '../recorder';
import moment from 'moment';
import { useFormContext } from 'react-hook-form';
import ReadyAudio from '@/components/custom/ready-audio';

const Record: FC = () => {
  const { watch, setValue } = useFormContext();
  const WatchUploadFile = watch('greetingFile');
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getAudioBlob = (metaData: any) => {
    if (!metaData?.blob) return;
    const file = new File(metaData.buffer, `greetingRecording${moment().unix()}.mp3`, {
      type: metaData.blob.type,
      lastModified: Date.now(),
    });

    const blobURL = window.URL.createObjectURL(metaData.blob);
    setValue('greetingFile', file);
    const audio = new Audio(blobURL);
    audio.onloadedmetadata = function () {};
  };
  const handleStartRecording = () => {
    setRecording(true);
    startTimer();
  };

  const handleStopRecording = () => {
    setRecording(false);
    stopTimer();
  };

  const handleCloseAudio = () => {
    setRecording(false);
    setValue('greetingFile', null);
  };

  const handleRecordAgain = () => {
    setRecording(true);
    setValue('greetingFile', null);
    startTimer();
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const audioRecordUrl = useMemo(() => {
    return WatchUploadFile ? URL.createObjectURL(WatchUploadFile) : null;
  }, [WatchUploadFile]);

  useEffect(() => {
    return () => {
      if (audioRecordUrl) {
        URL.revokeObjectURL(audioRecordUrl);
      }
    };
  }, [audioRecordUrl]);

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col w-full min-h-44 items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
        {!recording && !WatchUploadFile && (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Mic className="w-5 h-5" />
            </span>
            <Button variant={'primary'} type="button" onClick={handleStartRecording}>
              <Mic className="w-4 h-4" />
              Start Recording
            </Button>
          </>
        )}

        {recording && (
          <>
            <span className="relative flex h-11 w-11 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-40" />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Mic className="w-5 h-5" />
              </span>
            </span>
            <Recorder getAudioBlob={getAudioBlob} />
            <div className="flex flex-col items-center gap-1">
              <p className="font-semibold text-gray-900 truncate text-md">Listening</p>
              <small className="text-gray-500 truncate text-sm tabular-nums">
                {formatDuration(duration)}
              </small>
            </div>
            <Button type="button" variant={'outline'} onClick={handleStopRecording}>
              Stop Recording
            </Button>
          </>
        )}

        {WatchUploadFile && audioRecordUrl && (
          <div className="flex items-center gap-3 w-full rounded-xl border border-gray-200 bg-white p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Music className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <ReadyAudio controls src={audioRecordUrl} />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button type="button" variant={'outline'} size={'sm'} onClick={handleRecordAgain}>
                Record Again
              </Button>
              <button
                type="button"
                aria-label="Discard recording"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={handleCloseAudio}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Record;
