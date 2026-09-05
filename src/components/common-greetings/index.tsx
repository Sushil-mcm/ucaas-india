import { Icon } from '@/assets/icons/icon';
import SelectGreeting from '@/components/custom/greeting-select';
import { Switch } from '@/components/ui/switch';
import { GreetingItem } from '@/hooks/common';
import { useIsStarterPlan } from '@/hooks/use-is-starter-plan';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { capitalizeFirstLetter } from '@/lib/utils';
import { FC, useRef } from 'react';
import { useFormContext } from 'react-hook-form';

interface IGREETINGPROPS {
  optionsData: Record<string, GreetingItem[]>;
  mediaOptionsGreetingNotifications: Array<any>;
  formParentKey?: string;
  customClass?: string;
}

const CommonGreetingNotification: FC<IGREETINGPROPS> = ({
  optionsData,
  mediaOptionsGreetingNotifications,
  formParentKey = 'greetings',
  customClass = 'h-[calc(100vh_-_17rem)]',
}) => {
  const isStarterPlan = useIsStarterPlan();
  const greetingFormSnapshotRef = useRef<{
    value: any;
    wasDirty: boolean;
  } | null>(null);
  const {
    formState: { dirtyFields, errors },
    getValues,
    watch,
    setValue,
  } = useFormContext<any>();

  const watchMedia = watch(formParentKey);
  const visibleMediaOptions = mediaOptionsGreetingNotifications.filter(
    ({ name }) => !isStarterPlan || !['hold', 'on_hold_music'].includes(name),
  );

  const onChangeMedia = (name: string, status: boolean) => {
    setValue(`${formParentKey}.${name}.enabled`, status, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`${formParentKey}.${name}.value`, { label: '', value: '' } as ISELECTVALUE, {
      shouldDirty: true,
      shouldTouch: true,
      // shouldValidate: true,
    });
  };

  const preserveGreetingForm = () => {
    const currentGreetings = getValues(formParentKey);
    let snapshot = currentGreetings;

    try {
      snapshot = JSON.parse(JSON.stringify(currentGreetings));
    } catch {
      // Greeting form values are plain data; retain the current object if cloning ever fails.
    }

    greetingFormSnapshotRef.current = {
      value: snapshot,
      wasDirty: Boolean((dirtyFields as any)?.[formParentKey]),
    };
  };

  const restoreGreetingForm = () => {
    const snapshot = greetingFormSnapshotRef.current;
    if (!snapshot) return;

    setValue(formParentKey, snapshot.value, {
      shouldDirty: snapshot.wasDirty,
      shouldTouch: snapshot.wasDirty,
      shouldValidate: snapshot.wasDirty,
    });
    greetingFormSnapshotRef.current = null;
  };

  return (
    <div className={`w-full ${customClass} overflow-y-auto`}>
      <div className="flex flex-col gap-4 p-4 rounded-xl bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] ">
        <div className="w-full">
          {visibleMediaOptions.map(({ name, label, placeholder, icon, iconClass, disabled }) => (
            <div key={name} className="flex flex-col gap-4 w-full py-2 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center flex-wrap gap-1">
                  <Icon name={icon} className={iconClass} />
                  {/* The name of the slot, not a question about it. This read
                      `Do you want to add "{label} message" ?`, which produced
                      "On hold music message" and, on the call queue,
                      "Waiting | No agent available | All agent busy message".
                      Every caller already passes a display name in
                      `placeholder`; `label` stays as the fallback. Made a
                      <label> so the name toggles the switch beside it. */}
                  <label
                    htmlFor={`switch-${name}`}
                    className="text-[#2E2D35] text-sm font-medium cursor-pointer"
                  >
                    {placeholder || capitalizeFirstLetter(label)}
                  </label>
                </div>

                {name === 'waiting' ? null : (
                  <Switch
                    id={`switch-${name}`}
                    checked={watchMedia?.[name]?.enabled ?? false}
                    onCheckedChange={(checked) => onChangeMedia(name, checked)}
                    className="cursor-pointer"
                    disabled={disabled}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2 w-1/2 template-greeting-control-wrap">
                <div className="w-80 template-greeting-control">
                  {watchMedia?.[name]?.enabled && (
                    <>
                      <SelectGreeting
                        name={
                          name === 'voicemail'
                            ? 'voicemail'
                            : name === 'menu'
                              ? 'prompt'
                              : 'greeting'
                        }
                        isShowUpload={name !== 'ring_tone'}
                        onGreetingUploadStart={preserveGreetingForm}
                        onGreetingUploadSuccess={restoreGreetingForm}
                        onChangeMedia={(e) =>
                          setValue(`${formParentKey}.${name}.value`, e as ISELECTVALUE, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        options={optionsData[name]?.map((item: GreetingItem) => ({
                          label: item.name,
                          value: item.filename,
                          uuid: item.uuid,
                        }))}
                        value={watch(`${formParentKey}.${name}.value`) || null}
                        errors={
                          (errors as any)?.[formParentKey]?.[name]?.value?.value?.message ||
                          (errors as any)?.[formParentKey]?.[name]?.value?.message
                            ? `${label} is required`
                            : ''
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommonGreetingNotification;
