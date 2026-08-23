import { FC, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadGreetingProps } from '@/interfaces/audio-interface';
import { Controller, useFormContext } from 'react-hook-form';
import CustomSelect from '@/components/custom/custom-select';
import { useMutation } from '@tanstack/react-query';
import { getGreetingVoiceList } from '@/services/api';
import ReadyAudio from '@/components/custom/ready-audio';

const LANGUAGE_OPTIONS = [
  { label: 'Hindi (India)', value: 'hi-IN' },
  { label: 'English (United States)', value: 'en-US' },
  { label: 'Spanish (Spain)', value: 'es-ES' },
  { label: 'Arabic (Saudi Arabia)', value: 'ar-SA' },
];

const sanitizeTextByLocale = (text: string, locale: string) => {
  if (!locale) return '';

  const filters: Record<string, RegExp> = {
    'hi-IN': /[^\p{Script=Devanagari}0-9\s.,!?;:'"()\-_/&@#%+*=]/gu,
    'en-US': /[^A-Za-z0-9\s.,!?;:'"()\-_/&@#%+*=]/g,
    'es-ES':
      /[^A-Za-z0-9\u00C1\u00C9\u00CD\u00D3\u00DA\u00DC\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1\s.,!?;:'"()\-_/&@#%+*=]/g,
    'ar-SA': /[^\p{Script=Arabic}0-9\s.,!?;:'"()\-_/&@#%+*=]/gu,
  };

  const filter = filters[locale];
  if (!filter) return text;
  return text.replace(filter, '');
};

const getVoiceOptions = (response: any, locale: string) => {
  const voices =
    response?.data?.data?.voices ||
    response?.data?.data?.result?.voices ||
    response?.data?.data?.result?.rows ||
    response?.data?.data?.result ||
    [];

  if (!Array.isArray(voices)) return [];

  return voices
    .filter((voice: any) => !locale || !voice?.locale || voice?.locale === locale)
    .map((voice: any, index: number) => {
      const baseLabel =
        voice?.display_name ||
        voice?.local_name ||
        voice?.label ||
        voice?.name ||
        `Voice ${index + 1}`;
      const genderSuffix = voice?.gender ? ` (${voice.gender})` : '';
      const value =
        voice?.short_name ||
        voice?.voice_name ||
        voice?.value ||
        voice?.id ||
        voice?.uuid ||
        String(index);

      return {
        ...voice,
        label: `${baseLabel}${genderSuffix}`,
        value,
      };
    });
};

const TextToSpeech: FC<UploadGreetingProps> = ({ handleTextToSpeech, isPendingTextToSpeech }) => {
  const { watch, control, setValue } = useFormContext();
  const WatchTextFile = watch('textFile');
  const selectedLocale = watch('textToSpeechLocale');
  const selectedVoice = watch('textToSpeechVoice');
  const [voiceOptions, setVoiceOptions] = useState<any[]>([]);

  const { mutate: mutateVoiceList, isPending: isVoiceListLoading } = useMutation({
    mutationFn: getGreetingVoiceList,
    onSuccess: (data, variables) => {
      const options = getVoiceOptions(data, variables?.locale || '');
      setVoiceOptions(options);
      setValue('textToSpeechVoice', options[0] || null, { shouldDirty: true });
    },
    onError: () => {
      setVoiceOptions([]);
      setValue('textToSpeechVoice', null, { shouldDirty: true });
    },
  });

  const audioUrl = useMemo(() => {
    return WatchTextFile ? URL.createObjectURL(WatchTextFile) : null;
  }, [WatchTextFile]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className={`flex flex-col gap-4 pt-2 w-full `}>
      <CustomSelect
        label={'Language'}
        options={LANGUAGE_OPTIONS}
        value={selectedLocale}
        placeholder="Select language"
        handleChange={(option) => {
          setValue('textToSpeechLocale', option, { shouldDirty: true, shouldValidate: true });
          setValue('textToSpeech', '');
          setValue('textFile', null);
          setValue('textToSpeechVoice', null);
          setVoiceOptions([]);

          if (option?.value) {
            mutateVoiceList({ locale: option.value });
          }
        }}
      />
      <CustomSelect
        label={'Voice'}
        options={voiceOptions}
        value={selectedVoice}
        placeholder={selectedLocale ? 'Select voice' : 'Select language first'}
        isDisabled={!selectedLocale}
        isLoading={isVoiceListLoading}
        handleChange={(option) => {
          setValue('textToSpeechVoice', option, { shouldDirty: true, shouldValidate: true });
          setValue('textFile', null);
        }}
      />
      <label className="flex items-center gap-2 text-sm leading-none font-medium group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
        Enter the text you want to convert into speech.
      </label>
      <Controller
        name="textToSpeech"
        control={control}
        render={({ field }) => (
          <textarea
            rows={5}
            value={field.value || ''}
            onChange={(event) => {
              const locale = selectedLocale?.value || '';
              const sanitizedText = sanitizeTextByLocale(event.target.value, locale);
              field.onChange(sanitizedText);
              setValue('textFile', null);
            }}
            placeholder={selectedLocale ? 'Type your text here...' : 'Select language first'}
            className=" border border-gray-300 rounded-xl text-sm min-h-[86px]  p-3 hover:border-primary focus:border-primary focus-visible:border-primary focus-visible:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            maxLength={500}
            disabled={!selectedLocale}
          />
        )}
      />
      <p className="text-xs text-gray-500">
        {selectedLocale
          ? 'You can type only characters from the selected language script.'
          : 'Choose a language to enable typing.'}
      </p>

      <div className="flex justify-center">
        <Button
          variant={'outline'}
          type="button"
          onClick={handleTextToSpeech}
          disabled={!watch('textToSpeech') || !selectedLocale || isPendingTextToSpeech}
        >
          Text to Speech
        </Button>
      </div>
      {WatchTextFile && audioUrl && <ReadyAudio controls src={audioUrl} />}
    </div>
  );
};

export default TextToSpeech;
