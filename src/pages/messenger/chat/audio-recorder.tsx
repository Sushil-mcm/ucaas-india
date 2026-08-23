import { useEffect, useRef, useState } from 'react';
import { X, SendHorizontal, Mic, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
  onCancel: () => void;
  onSend: (audioFile: File) => void;
  isLoading?: boolean;
}

const AudioRecorder = ({ onCancel, onSend, isLoading = false }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [ripples, setRipples] = useState<Array<{ id: number; startTime: number }>>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const rippleIdRef = useRef(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (recordingTime >= 300) {
      handleSend();
    }
  }, [recordingTime]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setPermissionGranted(true);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      visualize();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      onCancel();
    }
  };

  const visualize = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;

      analyser.getByteFrequencyData(frequencyData);

      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const nyquist = sampleRate / 2;
      const frequencyPerBin = nyquist / bufferLength;

      const minFrequency = 300;
      const maxFrequency = 3400;
      const startBin = Math.floor(minFrequency / frequencyPerBin);
      const endBin = Math.min(Math.floor(maxFrequency / frequencyPerBin), bufferLength - 1);

      let sumSquared = 0;
      let voiceSum = 0;
      for (let i = startBin; i <= endBin; i++) {
        const normalized = frequencyData[i] / 255;
        voiceSum += normalized;
        sumSquared += normalized * normalized;
      }
      const voiceCount = endBin - startBin + 1;
      const avgVoiceLevel = voiceSum / voiceCount;
      const rms = Math.sqrt(sumSquared / voiceCount);
      const currentVolumeLevel = Math.min(1, rms * 10);

      setVolumeLevel(currentVolumeLevel);

      const speechThreshold = 0.015;

      if (currentVolumeLevel >= speechThreshold && avgVoiceLevel >= 0.05) {
        const now = Date.now();
        setRipples((prev) => {
          const lastRipple = prev[prev.length - 1];
          if (!lastRipple || now - lastRipple.startTime > 300) {
            rippleIdRef.current += 1;
            return [...prev, { id: rippleIdRef.current, startTime: now }];
          }
          return prev;
        });
      }

      setRipples((prev) => {
        const now = Date.now();
        return prev.filter((ripple) => now - ripple.startTime < 1200);
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  const handleSend = () => {
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.mp3`, {
          type: 'audio/mp3',
        });
        cleanup();
        onSend(audioFile);
      };
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      onCancel();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!permissionGranted) {
    return (
      <div className="w-full h-14   bg-white flex items-center justify-center">
        <div className="text-gray-500 text-xs">Requesting microphone access...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes audio-ripple {
          0% { transform: scale(1); opacity: 0.4; }
          50% { opacity: 0.2; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .audio-ripple-animate {
          animation: audio-ripple 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
      <div className="w-full h-14 rounded-xl  flex items-center px-3 gap-3">
        {/* Timer */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`w-2 h-2 rounded-full bg-red-500 shrink-0 ${isRecording ? 'animate-pulse' : ''}`}
          />
          <div className="text-sm font-semibold text-gray-800 whitespace-nowrap font-mono min-w-[4rem] text-right">
            {formatTime(recordingTime)}
          </div>
          {recordingTime >= 270 && (
            <div className="text-xs text-red-500 whitespace-nowrap font-mono min-w-[2.5rem]">
              ({formatTime(300 - recordingTime)})
            </div>
          )}
        </div>

        {/* Mic with ripple */}
        <div className="flex-1 flex items-center justify-center relative h-12 overflow-hidden">
          <div className="relative flex items-center justify-center rounded-full ">
            {ripples.map((ripple) => (
              <div
                key={ripple.id}
                className="absolute rounded-full border border-red-400/50 audio-ripple-animate"
                style={{ width: '48px', height: '48px' }}
              />
            ))}
            <div
              className={`relative z-10 flex items-center justify-center w-12 h-12 min-h-12 min-w-12 rounded-full transition-all duration-200 ${
                volumeLevel > 0.015 ? 'bg-red-500 ' : 'bg-gray-300 scale-100'
              }`}
            >
              <Mic
                width={20}
                height={20}
                className={volumeLevel > 0.015 ? 'text-white' : 'text-gray-600'}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex items-center justify-center w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors disabled:opacity-50"
          >
            <X width={14} height={14} />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading}
            className="flex items-center justify-center w-7 h-7 bg-primary hover:opacity-90 text-white rounded-full transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 width={12} height={12} className="animate-spin" />
            ) : (
              <SendHorizontal width={14} height={14} />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default AudioRecorder;
