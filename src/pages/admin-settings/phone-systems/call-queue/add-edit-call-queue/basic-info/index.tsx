import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
import ForwardingActions from '@/components/custom/forwarding-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetSite } from '@/hooks/common';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { generateRandomExtension } from '@/lib/utils';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { MAX_WAITING_CALLERS } from '../../constant';

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
              <CustomSelect
                label={'Max Waiting Callers'}
                options={MAX_WAITING_CALLERS.map((item) => ({
                  label: item,
                  value: item,
                }))}
                handleChange={(e: ISELECTVALUE | null) => {
                  setValue(
                    `settings.ring_strategy.max_wait_time.callers`,
                    e || { label: '', value: '' },
                    { shouldValidate: true },
                  );
                }}
                value={watch('settings.ring_strategy.max_wait_time.callers')}
                error={(errors?.settings as any)?.ring_strategy?.max_wait_time?.callers?.messag}
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
                placeholder="Enter Queue Timeout (Sec)"
                type="number"
                min={0}
                // max={3600}
                {...register('settings.ring_strategy.max_wait_time.queue_timeout')}
                error={
                  (errors?.settings as any)?.ring_strategy?.max_wait_time?.queue_timeout?.message
                }
              />
              {/* Country select input */}
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
