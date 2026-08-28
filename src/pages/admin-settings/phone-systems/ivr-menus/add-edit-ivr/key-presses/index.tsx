import { AddIcon, RemoveIcon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import ForwardActionAll from '@/components/custom/forward-action-all';

import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { useFieldArray, useFormContext } from 'react-hook-form';
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
          <div className="gap-3 flex flex-col">
            <h5 className="text-gray-900 font-semibold text-lg">Manage Key Press</h5>
            {fields?.map((_, index) => {
              return (
                <div
                  key={fields[index]?.id || index}
                  className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4"
                >
                  <div className="w-full lg:w-1/3">
                    <CustomSelect
                      label={'Key Press'}
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
                    forwardTypeLabel={index === 0 ? 'Action' : ''}
                    forwardValueLabel={index === 0 ? 'Value' : ''}
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
                  <div className="flex w-full justify-end gap-2 lg:w-28">
                    {fields?.length - 1 === index && (
                      <Button
                        variant={'outline'}
                        className="h-10 w-10"
                        type="button"
                        onClick={addAction}
                      >
                        <AddIcon className="w-5 h-5" />
                      </Button>
                    )}
                    {fields?.length > 1 ? (
                      <Button
                        variant={'outline'}
                        className="h-10 w-10 border-red-500 text-red-500 hover:bg-red-500"
                        type="button"
                        onClick={() => remove(index)}
                      >
                        <RemoveIcon className="w-5 h-5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <GenericKey />
      </div>
    </div>
  );
};

export default IvrKeyPresses;
