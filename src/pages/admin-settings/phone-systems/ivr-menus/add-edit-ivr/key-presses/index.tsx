import { RemoveIcon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import ForwardActionAll from '@/components/custom/forward-action-all';

import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { SettingCard } from '@/components/mcm/setting-card';
import { useIvrMenuChecks } from '@/hooks/use-ivr-menu-checks';
import GenericKey from './genericKeys';
import { Button } from '@/components/ui/button';
import useIvrExternalForwarding from '@/hooks/use-ivr-external-forwarding';

const IvrKeyPresses = ({ initialData = {} }) => {
  const {
    setValue,
    watch,
    control,
    formState: { errors },
  } = useFormContext();

  /* Hides the outside-number option when the company has switched off menu
     forwarding. A menu already pointed at an outside number keeps working and
     still shows its number — only the choice is withdrawn. */
  const { hiddenForwardTypes } = useIvrExternalForwarding();
  const findings = useIvrMenuChecks((initialData as any)?.uuid, (initialData as any)?.name);
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ivrActions',
  });

  const IVR_KEY_OPTIONS = [
    ...Array.from({ length: 9 }, (_, index) => ({
      label: (index + 1).toString(),
      value: index + 1,
    })),
    { label: '0', value: 0 },
  ];

  const addAction = () => {
    if (fields?.length >= IVR_KEY_OPTIONS.length) return;
    append({
      key: { label: '', value: '' },
      forwardType: { label: 'Send to voicemail', value: 'VOICEMAIL' },
      forwardValue: { label: '', value: '' },
    });
  };

  const watchIVRActions = watch('ivrActions');
  const selectedKeys = watchIVRActions?.map((option: any) => option?.key?.value);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 pr-1">
      {/* <div className="flex flex-col gap-3 h-[calc(100vh_-_19rem)] overflow-auto"> */}
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-4 pt-1 sm:pt-2">
          <SettingCard
            title="What each key does"
            description="The caller hears the menu, presses a key, and this is where it takes them. A key you do not set here simply does nothing."
            aside={
              <Button type="button" variant="outline" onClick={addAction}>
                Add a key
              </Button>
            }
          >
            {/* Faults that strand a caller: two rows on the same digit, a menu
              that leads back to itself, a key pointing at something deleted.
              Shown while editing rather than on save, because the fix is
              obvious here and a page of errors after pressing Save is not. */}
            {findings.length > 0 && (
              <div className="flex flex-col gap-2 py-3">
                {findings.map((finding, i) => (
                  <p
                    key={`${finding.code}-${finding.key ?? i}`}
                    className={`mcm-setrow-note${finding.level === 'error' ? ' is-error' : ''}`}
                  >
                    {finding.message}
                  </p>
                ))}
              </div>
            )}

            {fields?.map((_, index) => (
              <div
                key={fields[index]?.id || index}
                className="flex flex-col gap-3 border-b border-gray-100 py-3 last:border-b-0 lg:flex-row lg:items-end lg:gap-4"
              >
                <div className="w-full lg:w-1/4">
                  <CustomSelect
                    label={index === 0 ? 'Caller presses' : ''}
                    options={IVR_KEY_OPTIONS?.map((item) => ({
                      ...item,
                      isDisabled: selectedKeys?.includes(item?.value),
                    }))}
                    handleChange={(e: ISELECTVALUE | null) => {
                      setValue(`ivrActions.[${index}].key`, e || null, {
                        shouldValidate: true,
                      });
                    }}
                    value={watch(`ivrActions.[${index}].key`) || {}}
                    error={(errors?.ivrActions as any)?.[index]?.key?.value?.message}
                  />
                </div>
                <ForwardActionAll
                  forwardTypeLabel={index === 0 ? 'Then' : ''}
                  forwardValueLabel={index === 0 ? 'Where' : ''}
                  setValue={setValue}
                  watch={watch}
                  forwardType={`ivrActions.[${index}].forwardType`}
                  forwardValue={`ivrActions.[${index}].forwardValue`}
                  forwardTypeError={
                    (errors?.ivrActions as any)?.[index]?.forwardType?.value?.message
                  }
                  forwardValueError={
                    (errors?.ivrActions as any)?.[index]?.forwardValue?.value?.message
                  }
                  initialData={initialData}
                  forwardTypeClass="w-full lg:w-1/3"
                  forwardValueClass="w-full lg:w-1/3"
                  selectCustomClassSecond="w-full"
                  notInclude={hiddenForwardTypes}
                />
                <div className="flex w-full justify-end lg:w-16">
                  {fields?.length > 1 ? (
                    <Button
                      variant={'outline'}
                      className="h-10 w-10 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      type="button"
                      onClick={() => remove(index)}
                      title="Remove this key"
                    >
                      <RemoveIcon className="w-5 h-5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </SettingCard>
        </div>

        <GenericKey />
      </div>
    </div>
  );
};

export default IvrKeyPresses;
