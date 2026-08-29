import { useFormContext } from 'react-hook-form';
import ForwardActionAll from '@/components/custom/forward-action-all';
import CustomSelect from '@/components/custom/custom-select';
import { SettingCard, SettingNest, SettingRow } from '@/components/mcm/setting-card';

const FALLBACK_CHOICES = [
  { label: 'Hang up', value: 'HANGUP' },
  { label: 'Send them somewhere', value: 'EXTENSION' },
];

/* The two behaviours these keys have always had. Kept as stored strings rather
   than codes so an existing menu keeps working untouched. */
const HASH_CHOICES = [
  { label: 'Go back to the previous menu', value: 'Return to Previous Menu' },
  { label: 'Play this menu again', value: 'Repeat Menu Greeting' },
];
const ASTERISK_CHOICES = [
  { label: 'Play this menu again', value: 'Repeat Menu Greeting' },
  { label: 'Go back to the previous menu', value: 'Return to Previous Menu' },
];
import useIvrExternalForwarding from '@/hooks/use-ivr-external-forwarding';

const GenericKey = () => {
  /* Hides the outside-number option when the company has switched off menu
     forwarding. A menu already pointed at an outside number keeps working and
     still shows its number — only the choice is withdrawn. */
  const { hiddenForwardTypes } = useIvrExternalForwarding();
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  /* One shape for both fallbacks: hang up, or send them somewhere. The stored
     keys differ only by name, so the row is written once and used twice rather
     than the same markup appearing in two places and drifting apart. */
  const FallbackRows = ({
    field,
    label,
    description,
  }: {
    field: 'timeout_action' | 'failure_action';
    label: string;
    description: string;
  }) => {
    const status = watch(`generic.${field}.status`);
    return (
      <>
        <SettingRow
          label={label}
          description={description}
          control={
            <CustomSelect
              options={FALLBACK_CHOICES}
              value={FALLBACK_CHOICES.find((c) => c.value === status) || FALLBACK_CHOICES[0]}
              handleChange={(choice: any) => {
                const next = choice?.value || 'HANGUP';
                setValue(`generic.${field}.status`, next);
                setValue(`generic.${field}.type`, {
                  label: next === 'EXTENSION' ? 'Send to Voicemail' : '',
                  value: next === 'EXTENSION' ? 'VOICEMAIL' : '',
                });
                setValue(`generic.${field}.value`, { label: '', value: '' });
              }}
              menuPlacement="auto"
            />
          }
        />
        <SettingNest when={status === 'EXTENSION'}>
          <SettingRow label="Send them to" description="Where the call goes instead.">
            <ForwardActionAll
              {...{
                setValue,
                watch,
                forwardType: `generic.${field}.type`,
                forwardValue: `generic.${field}.value`,
                forwardValueError: (errors?.generic as any)?.[field]?.value?.value?.message,
                notInclude: hiddenForwardTypes,
                forwardTypeClass: 'w-full sm:w-1/2',
                forwardValueClass: 'w-full sm:w-1/2',
                selectCustomClassSecond: 'w-full',
              }}
            />
          </SettingRow>
        </SettingNest>
      </>
    );
  };

  return (
    <>
      <SettingCard
        title="When the caller does not choose"
        description="The two cases that decide what happens to somebody who cannot use the menu — which is usually somebody on an old handset, in a noisy place, or who simply does not know what they need."
      >
        <FallbackRows
          field="timeout_action"
          label="They press nothing"
          description="After the menu has played three times with no key pressed."
        />
        <FallbackRows
          field="failure_action"
          label="They press a key that is not set up"
          description="After three tries at a key this menu does not use."
        />
      </SettingCard>

      <SettingCard
        title="The # and * keys"
        description="Kept aside from the numbered keys because callers expect them to mean the same thing on every menu."
      >
        <SettingRow
          label="Pressing #"
          description="Usually takes the caller back to where they came from."
          control={
            <CustomSelect
              options={HASH_CHOICES}
              value={
                HASH_CHOICES.find((c) => c.value === watch('generic.press_hash')?.value) ||
                HASH_CHOICES[0]
              }
              handleChange={(choice: any) => setValue('generic.press_hash', choice)}
              menuPlacement="auto"
            />
          }
        />
        <SettingRow
          label="Pressing *"
          description="Usually plays the menu again for somebody who missed it."
          control={
            <CustomSelect
              options={ASTERISK_CHOICES}
              value={
                ASTERISK_CHOICES.find((c) => c.value === watch('generic.press_asterisk')?.value) ||
                ASTERISK_CHOICES[0]
              }
              handleChange={(choice: any) => setValue('generic.press_asterisk', choice)}
              menuPlacement="auto"
            />
          }
        />
      </SettingCard>
    </>
  );
};

export default GenericKey;
