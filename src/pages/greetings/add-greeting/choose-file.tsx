import { FC, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { useFormContext } from 'react-hook-form';
import { UploadIcon } from 'lucide-react';
import { AUDIO_FILE_ACCEPT, handleAlert, isAudioFile } from '@/lib/utils';
import ReadyAudio from '@/components/custom/ready-audio';

const ChooseFile: FC = () => {
  const { watch, register, setValue } = useFormContext();
  const WatchUploadFile = watch('greetingFile');
  const [isDragging, setIsDragging] = useState(false);

  const audioUrl = useMemo(() => {
    return WatchUploadFile ? URL.createObjectURL(WatchUploadFile) : null;
  }, [WatchUploadFile]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileSelect = (file?: File | null) => {
    if (!file) {
      setValue('greetingFile', null, { shouldValidate: true });
      return;
    }

    if (!isAudioFile(file)) {
      setValue('greetingFile', null, { shouldValidate: true });
      handleAlert({ text: 'Please upload an audio file.', type: 'error' });
      return;
    }

    setValue('greetingFile', file, { shouldValidate: true });
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className={`flex items-center justify-center flex-col gap-4 w-full`}>
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer bg-white transition-colors duration-200 ${
            isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center">
            <UploadIcon className={`w-5 h-5 ${isDragging ? 'text-primary' : ''}`} />
            <p className={`pt-2 text-sm ${isDragging ? 'text-primary' : 'text-gray-900'}`}>
              {isDragging ? 'Drop file here' : 'Upload File'}
            </p>
          </div>

          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept={AUDIO_FILE_ACCEPT}
            {...register('greetingFile')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              handleFileSelect(file);
              if (!file || !isAudioFile(file)) e.currentTarget.value = '';
            }}
          />
        </label>

        {WatchUploadFile && audioUrl ? (
          <div className="flex justify-between items-center w-full gap-2">
            <div className="py-1.5 pr-2 h-10 flex items-center justify-between w-full">
              <ReadyAudio controls src={audioUrl} />
            </div>
            <div onClick={() => setValue('greetingFile', null)}>
              <Icon name="CloseIcon" className="w-3.5 h-3.5 text-primary cursor-pointer" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChooseFile;
