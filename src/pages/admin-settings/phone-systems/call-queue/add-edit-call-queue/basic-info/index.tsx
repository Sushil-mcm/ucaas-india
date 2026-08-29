import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
import ForwardingActions from '@/components/custom/forwarding-actions';
import { Button } from '@/components/ui/button';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useGetSite } from '@/hooks/common';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { generateRandomExtension } from '@/lib/utils';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { MAX_WAITING_CALLERS_LIMITS, QUEUE_TIMEOUT_LIMITS } from '../../constant';

interface IAddMembersProps {
  queueDetails: any;
}

const BasicInformation: FC<IAddMembersProps> = ({ queueDetails }) => {
  const { data: dataSiteList = [] } = useGetSite();
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();

  const generateNewExtension = () => {
    const newExtension = generateRandomExtension();
    setValue('extension', newExtension);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <div className="mt-1 flex flex-col gap-4 sm:mt-2">
        <SettingCard
          title="What this queue is"
          description="The name people see in reports and on transfers, and the extension used to reach it."
        >
          <SettingRow
            label="Name"
            description="Shown wherever this queue appears - reports, transfer lists, the queue list."
            control={
              <Input placeholder="Enter name" {...register('name')} error={errors?.name?.message} />
            }
          />

          <SettingRow
            label="Description"
            description="For your own team. Callers never see it."
            control={
              <Input
                placeholder="Enter description"
                {...register('description')}
                error={errors?.description?.message}
              />
            }
          />

          <SettingRow
            label="Location"
            description="Sets the clock this queue works to, and the hours it follows."
            control={
              <CustomSelect
                options={dataSiteList.map((site: { name: string; uuid: string }) => ({
                  label: site?.name,
                  value: site?.uuid,
                }))}
                handleChange={(e: ISELECTVALUE | null) => {
                  setValue(`site_uuid`, e || { label: '', value: '' }, { shouldValidate: true });
                }}
                value={watch('site_uuid')}
                error={(errors as any)?.site_uuid?.message}
              />
            }
          />

          <SettingRow
            label="Extension"
            description={
              queueDetails
                ? 'Fixed once the queue exists, because people dial it and other screens point at it.'
                : 'The internal number people dial to reach this queue.'
            }
            control={
              <div className="flex w-full items-start gap-2">
                <Input
                  placeholder="Enter extension"
                  type="number"
                  min={0}
                  {...register('extension')}
                  error={errors?.extension?.message}
                  disabled={!!queueDetails}
                />
                {!queueDetails && (
                  <Button
                    type="button"
                    className="h-10 w-10 shrink-0"
                    variant={'outline'}
                    onClick={() => generateNewExtension()}
                  >
                    <Icon name="Refresh" className="h-5 w-5" />
                  </Button>
                )}
              </div>
            }
          />
        </SettingCard>
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-3">
            <SettingCard
              title="How long a caller waits"
              description="The limits that decide when the queue stops holding somebody and hands them on."
            >
              {/* A number field rather than a dropdown: the ceiling is 500, and a
                  500-entry list is unusable. The stored shape stays
                  `{ label, value }` so nothing downstream has to change. */}
              <SettingRow
                label="Most callers allowed to wait"
                description={`Past this, new callers go to the failover instead of joining the line. Up to ${MAX_WAITING_CALLERS_LIMITS.max}.`}
                control={
                  <Input
                    placeholder={`1 to ${MAX_WAITING_CALLERS_LIMITS.max}`}
                    type="number"
                    min={MAX_WAITING_CALLERS_LIMITS.min}
                    max={MAX_WAITING_CALLERS_LIMITS.max}
                    value={watch('settings.ring_strategy.max_wait_time.callers')?.value ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setValue(
                        `settings.ring_strategy.max_wait_time.callers`,
                        raw === ''
                          ? { label: '', value: '' }
                          : { label: Number(raw), value: Number(raw) },
                        { shouldValidate: true },
                      );
                    }}
                    error={
                      (errors?.settings as any)?.ring_strategy?.max_wait_time?.callers?.value
                        ?.message
                    }
                  />
                }
              />

              <SettingRow
                label="Longest anyone waits (seconds)"
                description="When this is up the caller is sent to the failover, rather than left holding."
                control={
                  <Input
                    placeholder={`${QUEUE_TIMEOUT_LIMITS.min} to ${QUEUE_TIMEOUT_LIMITS.max}`}
                    type="number"
                    min={QUEUE_TIMEOUT_LIMITS.min}
                    max={QUEUE_TIMEOUT_LIMITS.max}
                    {...register('settings.ring_strategy.max_wait_time.queue_timeout')}
                    error={
                      (errors?.settings as any)?.ring_strategy?.max_wait_time?.queue_timeout
                        ?.message
                    }
                  />
                }
              />

              {/* `leave_room_if_no_agent` has been saved, loaded and defaulted to
                  true since the queue form was written, with no input anywhere - so
                  every queue has been silently sending callers away the moment the
                  last agent goes off duty, and no admin could see it, let alone
                  change it.

                  Established systems make this a choice, because the two answers
                  suit different businesses: a sales line would rather hold a caller
                  until someone comes back than lose them, while a support line with
                  published hours would rather send them to voicemail than leave them
                  listening to music nobody will answer.

                  Worded as "hold" rather than "leave_room" because the stored key is
                  backwards from the way an admin thinks about it. */}
              <SettingRow
                label="Hold callers when no one is on duty"
                description="On, callers wait until somebody comes on duty, or until the timeout above sends them to the failover. Off, they go to the failover as soon as the last agent leaves."
                control={
                  <Switch
                    checked={watch('settings.ring_strategy.leave_room_if_no_agent') === false}
                    onCheckedChange={(checked) =>
                      setValue('settings.ring_strategy.leave_room_if_no_agent', !checked, {
                        shouldValidate: true,
                      })
                    }
                  />
                }
              />
            </SettingCard>

            {/* Timezone and Time Format */}
            <ForwardingActions
              setValue={setValue}
              watch={watch}
              errors={errors}
              forwardState="settings.ring_strategy.max_wait_time.after_max_wait_time"
              isUser={true}
              SITE_UUID={watch('basic.site_uuid.value')}
              selectedUserExt={watch('basic.extension')}
              valueLabel="Failover Forward Value"
              typeLabel="Failover Forward Type"
              mainClasses="w-full"
              selectWidth="w-full"
              selectInnerWidth="w-full"
              selectTwoWidth="w-full"
              mainValueDivClass="w-full"
              mainTypeDivClass="w-full"
              selectCustomClassSecond="w-full"
              gap="gap-4"
              mainGapClasses="gap-0"
              isShowUpload={true}
              menuPlacement="auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInformation;
