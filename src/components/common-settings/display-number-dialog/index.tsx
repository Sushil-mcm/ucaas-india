import { CloseIcon } from '@/assets/icons';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { ModalProps } from '@/interfaces/common-interface';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

type MaskingType = 'S' | 'R' | 'P' | 'E' | 'N';

const incomingNumberOptions: ISELECTVALUE[] = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const showMaskingInputDesc: Record<Exclude<MaskingType, 'N'>, string> = {
  S: 'Enter the number of digits to split (range: 2-5).',
  R: 'Enter a complete number or text (range: 3-15 characters).',
  P: 'Add an alphanumeric value at the beginning (range: 2-5 characters).',
  E: 'Add an alphanumeric value at the end (range: 2-5 characters).',
};

const maxInputLength: Record<MaskingType, number> = {
  S: 1,
  R: 15,
  P: 5,
  E: 5,
  N: 0,
};

const maskingOptions: ISELECTVALUE[] = [
  { label: 'Strip', value: 'S' },
  { label: 'Replace', value: 'R' },
  { label: 'Prefix', value: 'P' },
  { label: 'End', value: 'E' },
  { label: 'None', value: 'N' },
];

const DisplayNumberModal: FC<ModalProps> = ({ modalState, setModalState, data }) => {
  const { settings = {} } = data || {};
  const {
    watch,
    setValue,
    register,
    trigger,
    setError,
    formState: { errors },
  } = useFormContext();

  const displayNumber = watch('settings.display_number');
  const maskingValue = (displayNumber?.masking?.type?.value ?? 'N') as MaskingType;
  const incomingValue = displayNumber?.incoming?.value;

  const handleSubmit = async () => {
    const value = watch('settings.display_number.masking.value');
    if (maskingValue && maskingValue !== 'N' && (!value || value.toString().trim() === '')) {
      setError('settings.display_number.masking.value', {
        type: 'manual',
        message: 'Value is required',
      });
      return;
    }
    const isValid = await trigger(['settings.display_number.masking.value']);
    if (!isValid) return;
    setModalState(false);
  };
  const handleCancel = () => {
    setValue(
      'settings.display_number.incoming',
      settings?.display_number?.incoming || { label: 'Yes', value: true },
    );
    setValue(
      'settings.display_number.masking',
      settings?.display_number?.masking || { type: { value: 'N', label: 'None' }, value: '' },
    );
    setValue(
      'settings.display_number.show_number_if_blocked',
      settings?.display_number?.show_number_if_blocked || 'NO',
    );
    setValue('settings.display_number.masking.type', {
      label: settings?.display_number?.masking?.label || 'None',
      value: settings?.display_number?.masking?.type || 'N',
    });
    setModalState(false);
  };
  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent
        className="sm:w-1/2 lg:w-1/4 p-3 max-h-[99%] overflow-y-auto"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Display Number
            <div
              onClick={handleCancel}
              className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <ul role="list" className="divide-y divide-gray-200">
          {/* Incoming number */}
          <li className="py-4 first:pt-0 last:pb-0">
            <div className="flex gap-2 flex-col">
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-md text-gray-900">Incoming number</p>
                <small className="text-gray-700 text-sm">
                  Show the number the caller is using to call you
                </small>
              </div>
              <div className="w-full">
                <CustomSelect
                  options={incomingNumberOptions}
                  value={{
                    label: displayNumber?.incoming?.label || '',
                    value: displayNumber?.incoming?.value?.toString() || '',
                  }}
                  handleChange={(e) => {
                    setValue('settings.display_number.incoming', e);
                    setValue('settings.display_number.special_number.number', '');
                    setValue('settings.display_number.masking.value', '', {
                      shouldValidate: true,
                    });
                    if (e?.value && !maskingValue) {
                      setValue('settings.display_number.masking.type', {
                        label: 'None',
                        value: 'N',
                      });
                    }
                  }}
                />
              </div>
            </div>
          </li>

          {/* Masking */}
          {incomingValue && (
            <li className="py-4 flex flex-col gap-4">
              <div className="flex gap-2 flex-col">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-md text-gray-900">Masking</p>
                  <p className="text-gray-800 text-sm">
                    {showMaskingInputDesc[maskingValue as Exclude<MaskingType, 'N'>] ??
                      'Invalid masking type'}
                  </p>
                </div>
                <div className="w-full">
                  <CustomSelect
                    options={maskingOptions}
                    value={displayNumber?.masking?.type}
                    handleChange={(e) => {
                      setValue('settings.display_number.masking.type', e);
                      setValue('settings.display_number.masking.value', '');
                    }}
                  />
                </div>
              </div>
              {maskingValue &&
                maskingValue !== 'N' &&
                (() => {
                  const { onChange, ...rest } = register('settings.display_number.masking.value', {
                    required: 'Value is required',
                    validate: (value) => {
                      if (maskingValue === 'S') {
                        const num = Number(value);
                        if (!num || num < 2 || num > 5) {
                          return 'Enter a number between 2 and 5';
                        }
                      }
                      return true;
                    },
                  });
                  return (
                    <Input
                      type={maskingValue === 'S' ? 'number' : 'text'}
                      placeholder="Enter value"
                      {...rest}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (maskingValue === 'S') {
                          e.target.value = e.target.value.replace(/[^2-5]/g, '').slice(0, 1);
                        } else {
                          e.target.value = e.target.value.slice(0, maxInputLength[maskingValue]);
                        }
                        onChange(e);
                      }}
                      error={(errors?.settings as any)?.display_number?.masking?.value?.message}
                      min={maskingValue === 'S' ? 2 : 0}
                      max={maskingValue === 'S' ? 5 : undefined}
                    />
                  );
                })()}

              {/* {maskingValue && maskingValue !== 'N' && (
                <Input
                  type={maskingValue === 'S' ? 'number' : 'text'}
                  placeholder="Enter value"
                  {...register('settings.display_number.masking.value')}
                  onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                    e.target.value = e.target.value.slice(0, maxInputLength[maskingValue]);
                  }}
                  error={(errors?.settings as any)?.display_number?.masking?.value?.message}
                  min={0}
                />
              )} */}
            </li>
          )}

          {/* Display on */}
          {/* <li className="py-4">
            <div className="flex gap-5 justify-between items-center">
              <div className="flex flex-col gap-1">
                <p className="font-semibold">Display on</p>
                <small>Pick devices you want your incoming calls to ring</small>
              </div>
              <CustomSelect
                options={DISPLAY_NUMBER_OPTIONS}
                value={displayNumber?.display_on}
                handleChange={(e) => {
                  setValue('settings.display_number.display_on', e);
                }}
              />
            </div>
          </li> */}

          {/* Final note */}
          <li className="pt-4">
            <div className="flex gap-2 justify-between items-center">
              <Label className="text-sm">
                If number is blocked or unknown, show my number instead
              </Label>

              <Switch
                onCheckedChange={(checked) => {
                  setValue(
                    'settings.display_number.show_number_if_blocked',
                    checked ? 'Yes' : 'No',
                  );
                }}
                checked={watch('settings.display_number.show_number_if_blocked') === 'Yes'}
              />
            </div>
          </li>
        </ul>

        <DialogFooter>
          <div className="justify-end flex gap-2">
            <Button type="button" variant={'transparent'} onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" variant={'outline'} onClick={() => handleSubmit()}>
              Submit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisplayNumberModal;
