import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { voiceOptions } from '../../constants';

let currentAudio: HTMLAudioElement | null = null;
let currentSetter: ((value: boolean) => void) | null = null;

const VoicePlayerCell = ({ value }: { value: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const voice = voiceOptions.find((v) => v.value === value);

  if (!voice) return <span>---</span>;

  const handlePlayPause = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      if (currentSetter) currentSetter(false);
      currentAudio = null;
      currentSetter = null;
    }

    if (!isPlaying) {
      const audio = new Audio(voice.audioURL);
      currentAudio = audio;
      currentSetter = setIsPlaying;
      setIsPlaying(true);
      audio.play();

      audio.onended = () => {
        setIsPlaying(false);
        currentAudio = null;
        currentSetter = null;
      };
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePlayPause}
      className="flex items-center gap-1 text-sm text-ucass-active hover:underline cursor-pointer"
    >
      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      <span>{voice.label}</span>
    </button>
  );
};

export default VoicePlayerCell;
