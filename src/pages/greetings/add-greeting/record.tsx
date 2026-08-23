import { useState, useRef, useEffect, FC, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import RecordingGif from '@/assets/images/recordingimg.webp';
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
    <div className="flex flex-col gap-4 pt-2">
      <div className="border border-gray-300 gap-12 flex flex-col w-full h-44 justify-center rounded-xl">
        <div className="gap-4 flex flex-col p-3 justify-center">
          <div className="flex flex-col gap-2 justify-center w-full items-center">
            {!recording && !WatchUploadFile && (
              <Button variant={'outline'} type="button" onClick={handleStartRecording}>
                Start Recording
              </Button>
            )}

            {recording && (
              <>
                <img src={RecordingGif} alt="gif" height={50} width={50} />
                <Recorder getAudioBlob={getAudioBlob} />
                <div className="flex flex-col items-center gap-1">
                  <p className="font-semibold text-gray-900 truncate text-md">{'Listening'}</p>
                  <small className="text-gray-800 truncate text-sm">
                    {formatDuration(duration)}
                  </small>
                </div>
                <Button type="button" variant={'outline'} onClick={handleStopRecording}>
                  Stop Recording
                </Button>
              </>
            )}

            {WatchUploadFile && audioRecordUrl && (
              <div className="flex flex-col items-center justify-center w-full">
                <ReadyAudio controls src={audioRecordUrl} />
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant={'secondary'} onClick={handleCloseAudio}>
                    Close
                  </Button>
                  <Button type="button" variant={'outline'} onClick={handleRecordAgain}>
                    Record Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Record;
