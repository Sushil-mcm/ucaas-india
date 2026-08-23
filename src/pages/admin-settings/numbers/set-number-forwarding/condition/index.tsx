import { handleAlert } from '@/lib/utils';
import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Icon } from '@/assets/icons/icon';
import CommonSettingPermission from '@/components/common-settings';
import { INITIAL_TYPE_CONSTANT } from '../constants';

interface ICondtionProps {
  initialType: string | null;
  state: any;
  setState: any;
  features: any;
  data: any;
}

const Settings: FC<ICondtionProps> = ({ initialType, state = {}, setState, features, data }) => {
  const [contactNumber, setContactNumber] = useState('');
  const {
    watch,
    setValue,
    formState: { errors },
    clearErrors,
    register,
  } = useFormContext();
  const [watchsettings = {}] = watch(['settings']);

  const { callerId = {} } = watchsettings;

  const removeValue = (removedValue: any) => {
    const updatedValues = callerId?.value?.filter((value: any) => value !== removedValue);
    setValue('settings.callerId.value', updatedValues);
  };

  return (
    <div className="w-full h-[calc(100vh_-_15.6rem)] overflow-y-auto template-forwarding-condition">
      {initialType === INITIAL_TYPE_CONSTANT.UPSERT_TEMPLATE && (
        <div className="flex p-5 gap-4 items-center template-forwarding-condition-template-name">
          <Input
            placeholder="Enter template name"
            label="Template Name"
            {...register('settings.templateName')}
            error={(errors?.settings as any)?.templateName?.message}
          />
        </div>
      )}
      <CommonSettingPermission
        {...{
          initialType,
          state,
          setState,
          features,
          customClass: '',
          data: { settings: data },
        }}
      />
      <div className="flex flex-col border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] rounded-xl mt-3 mr-1">
        <div className="flex justify-between items-center p-4 cursor-pointer">
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Checkbox
                onCheckedChange={(checked: boolean) => {
                  setValue('settings.callerId.enabled', checked);
                  setValue('settings.callerId.value', []);
                }}
                checked={callerId?.enabled}
              />
              <Label>Allow Caller ID</Label>
            </div>
            <div className="flex flex-col gap-3 pl-6">
              <p className="text-gray-900 text-sm">
                A call that comes from country code or area code
              </p>
              {callerId?.enabled && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2 items-end template-forwarding-condition-caller-row">
                      <Input
                        error={(errors?.settings as any)?.callerId?.value?.message}
                        label="Type country code or area code"
                        placeholder="Enter country code or area code"
                        value={contactNumber}
                        onChange={(e) =>
                          setContactNumber(
                            e.target.value.replace(/\D/g, '').length <= 3
                              ? e.target.value.replace(/\D/g, '')
                              : e.target.value.replace(/\D/g, '').substring(0, 3),
                          )
                        }
                      />

                      <Button
                        variant={'outline'}
                        onClick={() => {
                          if (!contactNumber) return;
                          const currentValues = callerId?.value || [];
                          if (currentValues?.includes(contactNumber)) {
                            handleAlert({
                              text: "Can't add the same CallerId again",
                              type: 'error',
                            });
                            setContactNumber('');
                            return;
                          }
                          if (contactNumber) {
                            clearErrors('settings.callerId.value');
                          }
                          setValue('settings.callerId.value', [
                            ...(callerId?.value ?? []),
                            contactNumber,
                          ]);
                          setContactNumber('');
                        }}
                        type="button"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                  {callerId?.value?.length > 0 ? (
                    <div className="flex gap-1.5 items-center template-forwarding-condition-caller-tags">
                      {callerId.value.map((item: any, index: any) => (
                        <div
                          key={index}
                          className="flex items-center border border-grey-400 rounded-xl px-3 py-1 h-8 w-16 relative text-xs"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => removeValue(item)}
                            className="flex absolute right-[-.5rem] hover:bg-red-500/90 h-4 w-4 text-white bg-red border rounded-full top-[-.5rem] cursor-pointer  items-center justify-center bg-red-500 border-red-500"
                          >
                            <Icon name="CloseIcon" className="w-1.5 h-1.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    ''
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
