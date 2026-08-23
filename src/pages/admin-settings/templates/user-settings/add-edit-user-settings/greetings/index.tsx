import SelectGreeting from '@/components/custom/greeting-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GreetingItem, useGetGreetings } from '@/hooks/common';
import { useIsStarterPlan } from '@/hooks/use-is-starter-plan';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { capitalizeFirstLetter } from '@/lib/utils';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

interface ICompanyInfo {
  plan_features?: string;
}

interface IGREETINGPROPS {
  company_info: ICompanyInfo;
}

const GreetingNotification: FC<IGREETINGPROPS> = () => {
  const { greetingList, voicemailList } = useGetGreetings();
  const isStarterPlan = useIsStarterPlan();
  const optionsData: Record<string, GreetingItem[]> = {
    welcome_greeting: greetingList,
    on_hold: greetingList,
    on_hold_music: greetingList,
    ring_tone: greetingList,
    voicemail: voicemailList,
  };

  const {
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();

  const watchMedia = watch('greetings');

  const mediaOptionsGreetingNotifications = [
    {
      name: 'welcome_greeting',
      placeholder: 'Welcome',
      label: 'welcome',
    },
    {
      name: 'on_hold_music',
      placeholder: 'On Hold Music',
      label: 'on hold music',
    },
    {
      name: 'voicemail',
      placeholder: 'Voicemail',
      label: 'voicemail',
    },
    {
      name: 'ring_tone',
      placeholder: 'Ring Tone',
      label: 'ring tone',
    },
  ].filter(({ name }) => !isStarterPlan || !['hold', 'on_hold_music'].includes(name)) as {
    name: string;
    placeholder: string;
    label: string;
  }[];

  const onChangeMedia = (name: string, status: boolean) => {
    setValue(`greetings.${name}.enabled`, status, { shouldValidate: true });
    setValue(`greetings.${name}.value`, {} as ISELECTVALUE);
  };

  return (
    <div className="h-[calc(100vh_-_15rem)] overflow-auto flex flex-col gap-4 pt-2 user-settings-template-greetings">
      <div className="divide-y divide-gray-200">
        {mediaOptionsGreetingNotifications.map(({ name, label }) => (
          <div
            key={name}
            className="flex flex-col gap-2 w-full py-2 first:pt-0 last:pb-0 user-settings-template-greeting-row"
          >
            <p className="text-gray-900 text-sm">{`Do you want to add "${capitalizeFirstLetter(label)} message" ?`}</p>
            <div className="flex min-h-10 items-center user-settings-template-greeting-controls">
              <RadioGroup
                value={watchMedia?.[name]?.enabled?.toString()}
                onValueChange={(value) => onChangeMedia(name, JSON.parse(value))}
                className="flex gap-5 w-1/2 user-settings-template-greeting-radio"
              >
                <div className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="true" id={`yes-${name}`} />
                  <Label htmlFor={`yes-${name}`} className="cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="false" id={`no-${name}`} />
                  <Label htmlFor={`no-${name}`} className="cursor-pointer">
                    No
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex flex-col gap-2 w-1/2 user-settings-template-greeting-select-wrap">
                <div className="w-80 flex flex-col gap-3 user-settings-template-greeting-select">
                  {watchMedia?.[name]?.enabled && (
                    <>
                      <SelectGreeting
                        name={name == 'voicemail' ? 'voicemail' : 'greeting'}
                        isShowUpload={name !== 'ring_tone'}
                        onChangeMedia={(e) =>
                          setValue(`greetings.${name}.value`, e as ISELECTVALUE, {
                            shouldValidate: true,
                          })
                        }
                        options={optionsData[name]?.map((item: GreetingItem) => ({
                          label: item.name,
                          value: item.filename,
                        }))}
                        value={watch(`greetings.${name}.value`)}
                        errors={(errors.greetings as any)?.[name]?.value?.value?.message}
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          onCheckedChange={(checked: boolean) => {
                            setValue(`greetings.${name}.override`, checked);
                          }}
                          checked={watch(`greetings.${name}.override`)}
                        />
                        <Label>Override {label}</Label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GreetingNotification;
