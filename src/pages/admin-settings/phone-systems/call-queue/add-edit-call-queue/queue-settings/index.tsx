import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { getDispositions } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { TIME_LIST } from '@/pages/auto-dialer/campaign/add-edit-campaign/consts';

const QueueSettings: FC<any> = ({ scriptList, setModalState }) => {
  console.log('scriptList in queue settings', scriptList);
  const {
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();

  const { data: dispositionsList = [] } = useQuery({
    queryKey: ['getDispositionsList'],
    queryFn: () => getDispositions({ page: 1, limit: 200 }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const handleDispositionCheck = (checked: boolean, item: any) => {
    const currentValues = watch('agentDisposition') || [];
    if (checked) {
      if (!currentValues.some((d: any) => d._id === item?._id)) {
        setValue('agentDisposition', [...currentValues, { ...item }], { shouldValidate: true });
      }
    } else {
      setValue(
        'agentDisposition',
        currentValues.filter((d: any) => d._id !== item?._id),
        { shouldValidate: true },
      );
    }
  };

  const isDispositionChecked = (item: any) => {
    return (watch('agentDisposition') || []).some((d: any) => d._id === item?._id);
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pr-1">
        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between w-full min-h-[20px]">
              <span className="text-sm font-semibold text-gray-900">Wrap-up time</span>
            </div>
            <CustomSelect
              placeholder="Select Option"
              options={TIME_LIST.map((item) => ({
                label: item,
                value: item,
              }))}
              handleChange={(e: ISELECTVALUE | null) => {
                setValue(`settings.wrapup_time`, e?.value || '', {
                  shouldValidate: true,
                });
              }}
              value={{
                value: watch('settings.wrapup_time'),
                label: watch('settings.wrapup_time'),
              }}
              error={(errors?.settings as any)?.wrapup_time?.message}
              menuPlacement="auto"
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between w-full min-h-[20px]">
              <span className="text-sm font-semibold text-gray-900">Call Script</span>
              <div className="flex items-center gap-2">
                {/* <span className="text-xs text-gray-500 font-medium">Required</span> */}
                <Switch
                  id="script_enabled"
                  checked={watch('script_enabled')}
                  onCheckedChange={(checked) => {
                    setValue('script_enabled', checked, { shouldValidate: true });
                    if (!checked) {
                      setValue('script', { label: '', value: '' }, { shouldValidate: true });
                    }
                  }}
                />
                {((errors as any)?.script?.value?.message ?? errors?.script?.message) && (
                  <ErrorTooltip
                    text={(errors as any)?.script?.value?.message ?? errors?.script?.message}
                  />
                )}
              </div>
            </div>
            {!watch('script_enabled') ? null : (
              <CustomSelect
                isDisabled={!watch('script_enabled')}
                placeholder="Select Option"
                options={scriptList?.map((script: { name: string; _id: string }) => ({
                  label: script?.name,
                  value: script?._id,
                }))}
                handleChange={(e: ISELECTVALUE | null) => {
                  setValue(`script`, e || { label: '', value: '' }, { shouldValidate: true });
                }}
                value={watch('script')}
              />
            )}
          </div>
        </div>

        <div className="flex w-full gap-6">
          <div className="w-full">
            <div className="w-full flex items-center gap-2 mb-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  <h3 className="text-gray-900 font-semibold text-md">Agent Disposition</h3>
                  {(errors as any)?.agentDisposition?.message && (
                    <ErrorTooltip text={(errors as any)?.agentDisposition?.message} />
                  )}
                </div>
                <Button
                  className="shadow-none"
                  variant="secondary"
                  type="button"
                  onClick={() => setModalState(true)}
                >
                  <Icon name="Plus" className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {/* <div
              className={`w-full h-full grid grid-cols-2 gap-2 overflow-y-auto ${dialMethod === 'PREDICTIVE' ? 'max-h-[calc(100vh_-_41rem)]' : 'max-h-[calc(100vh_-_30rem)]'}  pr-1`}
            > */}
            <div className="grid w-full grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {dispositionsList && dispositionsList?.length
                ? dispositionsList
                    ?.filter((item: any) => item?.dispositionType?.toLowerCase() === 'agent')
                    ?.map((item: any) => (
                      <div
                        className="w-full  flex items-center justify-between gap-3"
                        key={`${item?.disposition?.name}`}
                      >
                        <div className="w-full p-2 border border-gray-200 rounded-lg flex items-center justify-between gap-2  min-h-[62px]">
                          <div className="flex items-center gap-3">
                            <Switch
                              id={item?._id}
                              onCheckedChange={(checked) => {
                                handleDispositionCheck(checked, item);
                              }}
                              checked={isDispositionChecked(item)}
                            />
                            <label
                              htmlFor={item?._id}
                              className="text-gray-900/80 font-semibold text-sm"
                            >
                              {item?.disposition?.name}
                            </label>
                          </div>
                        </div>
                        {/* <Button
                        className="shadow-none min-w-[70px]"
                        variant={'secondary'}
                        type="submit"
                      >
                        Retry
                      </Button> */}
                      </div>
                    ))
                : null}
              {/* items */}

              {/* ---- */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QueueSettings;
