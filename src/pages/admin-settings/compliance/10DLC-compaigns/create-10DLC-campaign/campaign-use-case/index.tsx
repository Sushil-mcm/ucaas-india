import CustomSelect from '@/components/custom/custom-select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBrandList } from '@/hooks/use-brand-list';
import { getArrayLength, getObjectLength } from '@/lib/utils';
import { getUseCaseList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Crown, Star } from 'lucide-react';
import { Controller } from 'react-hook-form';

const CampaignUseCase = ({ formInstance }: { formInstance: any }) => {
  const { data } = useBrandList();

  const {
    control,
    watch,
    formState: { errors },
  } = formInstance || {};
  const { brand_type } = watch();

  const { data: useCaseData } = useQuery({
    queryKey: ['getUseCaseList'],
    queryFn: getUseCaseList,
    select: (data) => data?.data?.data?.result,
  });

  return (
    <>
      <div className="w-full min-h-0 flex flex-col items-stretch gap-4 overflow-y-auto pr-1">
        <div className="w-full lg:max-w-[40%]">
          <div className="flex w-full gap-1 relative">
            <Controller
              name="brand_type"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label={'Brand'}
                  options={
                    getArrayLength(data?.result?.rows)
                      ? data?.result?.rows?.map((v: any) => ({
                          value: v?.brandId,
                          label: v?.displayName,
                        }))
                      : []
                  }
                  value={field.value}
                  handleChange={(val) => field.onChange(val)}
                  placeholder={'Select Brand'}
                  error={errors?.brand_type?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="w-full">
          {errors?.usecase?.message ? (
            <div className="text-red-500 flex justify-start w-full text-sm">
              {errors?.usecase?.message}
            </div>
          ) : null}
          <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-4">
            {/* STANDARD LIST */}
            <div className=" w-full border-1 border-ucass-primary-200 rounded-lg bg-white p-3">
              <h3 className="flex items-center gap-1 justify-center text-sm font-medium text-primary mb-2">
                <Star className="w-4.5 h-4.5" />
                Standard Campaign Type
              </h3>

              <div className=" w-full border-gray-100 rounded-lg bg-gray-50 ">
                <div className="p-3 rounded-t-xl bg-gray-100 flex items-center gap-2">
                  <h3 className="text-gray-900 font-medium w-4/7 text-sm">Use Case</h3>
                  <h3 className="text-gray-900 font-medium  w-3/7 text-sm">TCR Monthly Fee</h3>
                </div>

                <div className="w-full h-full overflow-y-auto flex flex-col gap-3 p-3">
                  <Controller
                    name="usecase"
                    control={control}
                    render={({ field }) => (
                      <>
                        {getObjectLength(useCaseData) &&
                          Object.entries(useCaseData).map((v) => {
                            const value = v[0];
                            const obj: any = v[1];

                            if (obj?.classification === 'SPECIAL') return null;

                            return (
                              <div className="w-full flex items-center gap-2" key={value}>
                                <RadioGroup
                                  disabled={brand_type === null}
                                  className="min-w-0 flex-1"
                                  value={field.value}
                                  onValueChange={(val) => field.onChange(val)}
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <RadioGroupItem value={value} className="cursor-pointer" />
                                    <Label className="cursor-pointer font-normal truncate">
                                      {obj?.displayName}
                                    </Label>
                                  </div>
                                </RadioGroup>

                                <h3 className="shrink-0 whitespace-nowrap text-gray-500 font-medium text-sm">
                                  $20
                                </h3>
                              </div>
                            );
                          })}
                      </>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* SPECIAL LIST */}
            <div className=" w-full  border-1  border-ucass-primary-200 rounded-lg bg-white p-3">
              <h3 className="flex items-center gap-1 justify-center text-sm font-medium text-primary mb-2">
                <Crown className="w-4.5 h-4.5" />
                Special Campaign Type
              </h3>

              <div className=" w-full  border-1  border-gray-100 rounded-lg bg-gray-50 ">
                <div className="p-3 rounded-t-xl bg-gray-100 flex items-center gap-2">
                  <h3 className="text-gray-900 font-medium w-4/7 text-sm">Use Case</h3>
                  <h3 className="text-gray-900 font-medium  w-3/7 text-sm">TCR Monthly Fee</h3>
                </div>

                <div className="w-full h-full overflow-y-auto flex flex-col gap-3 p-3">
                  <Controller
                    name="usecase"
                    control={control}
                    render={({ field }) => (
                      <>
                        {getObjectLength(useCaseData) &&
                          Object.entries(useCaseData).map((v) => {
                            const value = v[0];
                            const obj: any = v[1];

                            if (obj?.classification === 'STANDARD') return null;

                            return (
                              <div className="w-full flex items-center gap-2" key={value}>
                                <RadioGroup
                                  disabled={brand_type === null}
                                  className="min-w-0 flex-1"
                                  value={field.value}
                                  onValueChange={(val) => field.onChange(val)}
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <RadioGroupItem value={value} className="cursor-pointer" />
                                    <Label className="cursor-pointer font-normal truncate">
                                      {obj?.displayName}
                                    </Label>
                                  </div>
                                </RadioGroup>

                                <h3 className="shrink-0 whitespace-nowrap text-gray-500 font-medium text-sm">
                                  $20
                                </h3>
                              </div>
                            );
                          })}
                      </>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CampaignUseCase;
