import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
import ForwardingActions from '@/components/custom/forwarding-actions';
import { Button } from '@/components/ui/button';
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
        <div className="flex flex-col gap-4 lg:flex-row">
          <Input
            placeholder="Enter name"
            {...register('name')}
            label="Name"
            error={errors?.name?.message}
          />

          <Input
            placeholder="Enter Description"
            {...register('description')}
            label="Description"
            error={errors?.description?.message}
          />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <CustomSelect
            label={'Site'}
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

          <div className="flex w-full items-end gap-2">
            <Input
              label={'Extension'}
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
                className="w-10 h-10"
                variant={'outline'}
                onClick={() => generateNewExtension()}
              >
                <Icon name="Refresh" className="w-5 h-5" />
              </Button>
            )}
          </div>
          {/* {errors?.extension?.message && (
            <div className="flex justify-end">
              <ErrorTooltip text={errors?.extension?.message} />
            </div>
          )} */}
        </div>
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-3">
            <h5 className="font-semibold text-gray-900 text-md my-2">Response Time Settings</h5>
            <div className="flex flex-col gap-4 lg:flex-row">
              {/* A number field rather than a dropdown: the ceiling is 500, and a
                  500-entry list is unusable. The stored shape stays
                  `{ label, value }` so nothing downstream has to change. */}
              <Input
                label={'Max Waiting Callers'}
                placeholder={`1 to ${MAX_WAITING_CALLERS_LIMITS.max}`}
                type="number"
                min={MAX_WAITING_CALLERS_LIMITS.min}
                max={MAX_WAITING_CALLERS_LIMITS.max}
                value={watch('settings.ring_strategy.max_wait_time.callers')?.value ?? ''}
                onChange={(event) => {
                  const raw = event.target.value;
                  setValue(
                    `settings.ring_strategy.max_wait_time.callers`,
                    raw === '' ? { label: '', value: '' } : { label: Number(raw), value: Number(raw) },
                    { shouldValidate: true },
                  );
                }}
                error={(errors?.settings as any)?.ring_strategy?.max_wait_time?.callers?.value?.message}
              />
              {/* <Input
                label={'Wrapup Time (Sec)'}
                placeholder="Enter Wrapup Time (Sec)"
                type="number"
                min={0}
                // max={3600}
                {...register('settings.wrapup_time')}
                error={
                  (errors?.settings as any)?.wrapup_time?.message
                }
              /> */}
              <Input
                label={'Queue Timeout (Sec)'}
                placeholder={`${QUEUE_TIMEOUT_LIMITS.min} to ${QUEUE_TIMEOUT_LIMITS.max}`}
                type="number"
                min={QUEUE_TIMEOUT_LIMITS.min}
                max={QUEUE_TIMEOUT_LIMITS.max}
                {...register('settings.ring_strategy.max_wait_time.queue_timeout')}
                error={
                  (errors?.settings as any)?.ring_strategy?.max_wait_time?.queue_timeout?.message
                }
              />
              {/* Country select input */}
            </div>

            {/* `leave_room_if_no_agent` has been saved, loaded and defaulted to
                true since the queue form was written, with no input anywhere —
                so every queue has been silently sending callers away the moment
                the last agent goes off duty, and no admin could see it, let
                alone change it.

                Established systems make this a choice, because the two answers
                suit different businesses: a sales line would rather hold a
                caller until someone comes back than lose them, while a support
                line with published hours would rather send them to voicemail
                than leave them listening to music nobody will answer.

                Worded as "hold" rather than "leave_room" because the stored key
                is backwards from the way an admin thinks about it. */}
            <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-900">
                  Hold callers when no one is on duty
                </p>
                <p className="text-xs text-gray-600">
                  On, callers wait in the queue until an agent comes on duty, or until the timeout
                  above sends them to the failover. Off, they go straight to the failover as soon as
                  the last agent leaves.
                </p>
              </div>
              <Switch
                checked={watch('settings.ring_strategy.leave_room_if_no_agent') === false}
                onCheckedChange={(checked) =>
                  setValue('settings.ring_strategy.leave_room_if_no_agent', !checked, {
                    shouldValidate: true,
                  })
                }
              />
            </div>

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
