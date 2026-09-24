import { Label } from '@/components/ui/label';
import { GreetingItem, useGetGreetings } from '@/hooks/common';
import { useIsStarterPlan } from '@/hooks/use-is-starter-plan';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import SelectGreeting from '@/components/custom/greeting-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { useFormContext } from 'react-hook-form';

const Media = () => {
  const { greetingList } = useGetGreetings();
  const isStarterPlan = useIsStarterPlan();

  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const watchMedia = watch('media');

  const optionsData: Record<string, GreetingItem[]> = {
    welcome: greetingList,
    hold: greetingList,
  };

  const mediaOptionsGreetingNotifications = [
    {
      name: 'welcome',
      placeholder: 'Welcome',
      label: 'welcome',
      title: 'Welcome message',
      hint: 'Plays to the caller before anyone in the group is rung.',
    },
    {
      name: 'hold',
      placeholder: 'On Hold Music',
      label: 'on hold music',
      title: 'On-hold music',
      hint: 'Plays while the caller waits to be connected.',
    },
  ].filter(({ name }) => !isStarterPlan || !['hold', 'on_hold_music'].includes(name)) as {
    name: string;
    placeholder: string;
    label: string;
    title: string;
    hint: string;
  }[];

  const onChangeMedia = (name: string, status: boolean) => {
    setValue(`media.${name}.enabled`, status, { shouldValidate: true, shouldDirty: true });
    setValue(
      `media.${name}.value`,
      status ? null : ({} as ISELECTVALUE),
      status ? { shouldDirty: true } : { shouldValidate: true, shouldDirty: true },
    );
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
        <div className="flex w-full flex-col gap-4 pr-1 sm:pr-2">
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full flex-col gap-3">
              <h5 className="font-semibold text-gray-900 text-md my-2">Media</h5>
              <div className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col gap-3">
                  {mediaOptionsGreetingNotifications.map(({ name, label, title, hint }) => {
                    return (
                      /* A titled setting row rather than a bare question with
                         a divider under it. The old copy ("Do you want to add
                         \"Welcome message\" ?") asked what the control already
                         answers, and said nothing about when the caller
                         actually hears it -- which is the part you need to
                         decide Yes or No. */
                      <div
                        key={name}
                        className="flex w-full flex-col gap-2 rounded-xl border border-[rgba(225,200,165,0.55)] p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{title}</p>
                          <p className="text-xs text-gray-600">{hint}</p>
                        </div>
                        <div className="flex min-h-10 flex-col items-start gap-3 md:flex-row md:items-center">
                          <RadioGroup
                            value={watchMedia?.[name]?.enabled?.toString()}
                            onValueChange={(value) => onChangeMedia(name, JSON.parse(value))}
                            className="flex w-full gap-5 pl-1.5 md:w-1/2"
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

                          <div className="flex w-full flex-col gap-2 md:w-1/2">
                            <div className="w-full md:max-w-80">
                              {watchMedia?.[name]?.enabled && (
                                <SelectGreeting
                                  name={name == 'voicemail' ? 'voicemail' : 'greeting'}
                                  isShowUpload={name !== 'ring_tone'}
                                  onChangeMedia={(e) =>
                                    setValue(`media.${name}.value`, e as ISELECTVALUE, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    })
                                  }
                                  options={optionsData[name]?.map((item: GreetingItem) => ({
                                    label: item.name,
                                    value: item.filename,
                                  }))}
                                  value={watch(`media.${name}.value`) || null}
                                  errors={
                                    (errors.media as any)?.[name]?.value?.value?.message ||
                                    (errors.media as any)?.[name]?.value?.message
                                      ? `${label} message is required`
                                      : ''
                                  }
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Media;
