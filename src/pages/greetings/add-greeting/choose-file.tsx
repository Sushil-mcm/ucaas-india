import { FC, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Music, UploadCloud, X } from 'lucide-react';
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
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-center flex-col gap-3 w-full">
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer bg-white transition-colors duration-200 ${
            isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-2">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                isDragging ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <UploadCloud className="w-5 h-5" />
            </span>
            <div className="flex flex-col items-center gap-0.5">
              <p className={`text-sm font-medium ${isDragging ? 'text-primary' : 'text-gray-900'}`}>
                {isDragging ? 'Drop the file here' : 'Drag & drop an audio file'}
              </p>
              <p className="text-xs text-gray-500">or click to browse</p>
            </div>
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
          <div className="flex items-center gap-3 w-full rounded-xl border border-gray-200 bg-white p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Music className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{WatchUploadFile.name}</p>
              <ReadyAudio controls src={audioUrl} />
            </div>
            <button
              type="button"
              aria-label="Remove selected file"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              onClick={() => setValue('greetingFile', null, { shouldValidate: true })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChooseFile;
