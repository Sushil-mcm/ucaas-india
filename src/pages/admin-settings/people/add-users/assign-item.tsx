import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import TableManager from '@/components/custom/table-manager';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { capitalizeFirstLetter } from '@/lib/utils';
import { featuresLookUp, featuresObj } from '@/pages/admin-settings/numbers/all-numbers/constants';
import { didRegionList, getAvailableDid, getDidGroup, getDidPrefixes } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import NotFound from '@/assets/images/not-found-img.svg';
import CustomTooltip from '@/components/custom/custom-tooltip';
const AssignItem = ({
  field,
  index,
  countryOptions,
  formInstance,
}: {
  field: any;
  index: number;
  countryOptions: Array<{ label: string; value: string }>;
  formInstance: any;
}) => {
  const {
    setValue,
    watch,
    formState: { errors },
  } = formInstance;

  const { first_name, last_name, extension } = field;
  const name = `${first_name} ${last_name || ''} (${extension})`;

  const [watchCountry, watchState, watchCity, watchGroupId, watchDidNumber] = watch([
    `users.[${index}].country`,
    `users.[${index}].state`,
    `users.[${index}].city`,
    `users.[${index}].groupId`,
    `users.[${index}].did_number`,
  ]);
  const countryIso = watchCountry?.value;

  const selectedDidNumbers = watch('users')?.map((v: any) => v?.did_number?.value);

  const { data: dataStateList, isLoading: isLoadingStateList } = useQuery({
    queryKey: ['regionList', countryIso],
    queryFn: () => didRegionList({ country_iso: countryIso }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: !!countryIso,
  });

  const { data: areaCodeData, isLoading: areaCodeLoading } = useQuery({
    queryKey: ['cityListAllNumbers', countryIso, watchState?.value],
    queryFn: () =>
      getDidPrefixes({
        country_iso: countryIso,
        region_id: watchState?.value,
      }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: !!(countryIso && watchState?.value),
  });

  const { data: didAvailableData, isFetching: didAvailableLoading } = useQuery({
    queryKey: ['getAvailableDid', countryIso, watchState?.value, watchGroupId?.value, index],
    queryFn: () =>
      getAvailableDid({
        country_iso: countryIso,
        region_id: watchState?.value,
        group_type_id: [],
        group_id: watchGroupId?.value,
      }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: !!(countryIso && watchGroupId?.value),
  });

  const columns = [
    {
      header: 'Select',
      accessorKey: 'prefix',
      cell: ({ row: { original } = {} }: any) => {
        const radioValue = {
          name: original?.prefix,
          value: original?.id,
          sku_id: original?.sku_id,
        };
        return (
          <div className=" flex justify-center items-center w-full">
            <RadioGroup
              value={JSON.stringify(watchGroupId)}
              onValueChange={(val) => {
                const parsed = JSON.parse(val);
                setValue(`users.[${index}].groupId`, parsed, { shouldValidate: true });
                setValue(`users.[${index}].did_number`, { label: 'Select Did Number', value: '' });
                // setValue('groupId', parsed, { shouldValidate: true });
              }}
            >
              <div className="flex items-center justify-center">
                <RadioGroupItem
                  value={JSON.stringify(radioValue)}
                  className="peer cursor-pointer  "
                />
              </div>
            </RadioGroup>
          </div>
        );
      },
      meta: {
        textAlign: 'center',
      },
    },
    {
      header: 'Prefix',
      accessorKey: 'prefix',
      cell: ({ row }: any) => {
        const elem = row?.original;
        return (
          <div>
            {elem?.area_name} ({elem?.prefix})
          </div>
        );
      },
    },

    {
      header: 'Features',
      accessorKey: 'features',
      cell: ({ getValue }: any) => {
        const features = getValue();
        return (
          <div className="flex justify-center items-center gap-2 px-4">
            {features?.map((v: any) => {
              if (!featuresLookUp[v]) return;
              return (
                <CustomTooltip text={featuresObj[v]} side="top">
                  <img
                    key={v}
                    src={featuresLookUp[v]}
                    alt={`${featuresLookUp[v]}`}
                    width={24}
                    height={24}
                  />
                </CustomTooltip>
              );
            })}
          </div>
        );
      },
      meta: {
        textAlign: 'center',
      },
    },
    {
      header: 'Is Registration',
      accessorKey: 'needs_registration',
      cell: ({ getValue }: any) => {
        return <div>{getValue() ? 'Yes' : 'No'}</div>;
      },
    },
  ];

  const isShowTable = countryIso && watchState?.value && watchCity?.value;

  return (
    // <div className="w-full min-h-[500px]">
    <div className="w-full ">
      <div
        key={`${extension}`}
        className="w-full flex flex-col gap-4 mt-3 bg-ucass-primary-200/40 p-3 rounded-xl"
      >
        <div className="w-full flex items-center gap-2">
          <Label>{'Name'}:</Label>
          <Label className="font-light">{capitalizeFirstLetter(name)}</Label>
        </div>
        <div className="w-full flex flex-col gap-4">
          <CustomSelect
            label="Country"
            options={countryOptions}
            handleChange={(data) => {
              setValue(
                `users.[${index}].country`,
                {
                  label: data?.label,
                  value: data?.value,
                },
                { shouldValidate: true },
              );
              setValue(`users.[${index}].state`, { label: 'Select State', value: '' });
              setValue(`users.[${index}].city`, { label: 'Select Area Code', value: '' });
              setValue(`users.[${index}].groupId`, { label: '', value: '', sku_id: '' });
              setValue(`users.[${index}].did_number`, {
                label: 'Select DID Number',
                value: '',
              });
            }}
            value={watchCountry}
            placeholder="Select Country"
            error={errors?.users?.[index]?.country?.value?.message}
          />

          <CustomSelect
            label={'State'}
            options={dataStateList?.map((item: any) => ({
              label: item?.name,
              value: item?.id,
            }))}
            handleChange={(data) => {
              setValue(
                `users.[${index}].state`,
                {
                  label: data?.label,
                  value: data?.value,
                },
                { shouldValidate: true },
              );
              setValue(`users.[${index}].city`, { label: 'Select City', value: '' });
              setValue(`users.[${index}].groupId`, { label: '', value: '', sku_id: '' });
              setValue(`users.[${index}].did_number`, { label: 'Select Did Number', value: '' });
            }}
            value={watchState}
            placeholder={'Select State'}
            error={errors?.users?.[index]?.state?.value?.message}
            isLoading={isLoadingStateList}
            isDisabled={!countryIso}
          />

          <CustomSelect
            label={'Area Code'}
            // label={'Area Code'}
            options={areaCodeData?.map((v: any) => ({
              label: v?.npanxx,
              value: v?.id,
            }))}
            handleChange={(data) => {
              setValue(
                `users.[${index}].city`,
                {
                  label: data?.label,
                  value: data?.value,
                },
                { shouldValidate: true },
              );
              setValue(`users.[${index}].groupId`, { label: '', value: '', sku_id: '' });
              setValue(`users.[${index}].did_number`, '');
            }}
            value={watchCity}
            placeholder="Select Area Code"
            error={errors?.users?.[index]?.city?.value?.message}
            isLoading={areaCodeLoading}
            isDisabled={!watchState?.value}
          />

          {/* <CustomSelect
          label={'DID Number'}
          options={didAvailableData?.map((v: any) => ({
            isDisabled: selectedDidNumbers.includes(v?.id),
            label: v?.attributes?.number,
            value: v?.id,
          }))}
          handleChange={(data) => {
            setValue(
              `users.[${index}].did_number`,
              {
                label: data?.label,
                value: data?.value,
              },
              { shouldValidate: true },
            );
          }}
          value={watch(`users.[${index}].did_number`)}
          placeholder="Select DID Number"
          error={errors?.users?.[index]?.did_number?.value?.message}
          isLoading={didAvailableLoading}
          isDisabled={!watchCity}
        /> */}

          <section className="w-full relative">
            <div className="flex gap-3 w-full mb-2">
              <div className="w-3/4 relative flex flex-col gap-2">
                {isShowTable && errors?.users?.[index]?.groupId?.value?.message ? (
                  <div className="text-red-500 font-medium text-xs">
                    {errors?.users?.[index]?.groupId?.value?.message}
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
              <div className="w-1/4 flex flex-col gap-2">
                {watchGroupId?.value && errors?.users?.[index]?.did_number?.value?.message ? (
                  <div className="text-red-500 font-medium text-xs">
                    {errors?.users?.[index]?.did_number?.value?.message}
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full">
              {isShowTable ? (
                // <div className="w-[calc(100%-13rem)] relative">
                <div className="w-full relative">
                  <TableManager
                    {...{
                      fetcherKey: ['getDidGroup', countryIso, watchState?.value, watchCity?.value],
                      fetcherFn: () =>
                        getDidGroup({
                          country_iso: countryIso,
                          group_type_id: ['Mobile'],
                          region_id: watchState?.value,
                          nanpa_prefix_id: watchCity?.value,
                        }),
                      enabled: Boolean(isShowTable),
                      columns,
                      showPagination: false,
                      // isHeightSet:true,
                      // tableMaxHeight:"min-h-96",
                      // customClass:"h-52"
                      customClass: 'max-h-52 min-h-32',
                      imageSize: 'w-28 min-w-28',
                      loaderTableClass: 'min-h-32',
                    }}
                  />
                </div>
              ) : null}

              {/* <div className="w-full max-w-[13rem] flex "> */}
              <div className="w-full flex ">
                {watchGroupId?.value && (
                  <>
                    <div className="flex flex-wrap  w-full gap-5">
                      {watchCity?.value && watchState?.value ? (
                        didAvailableLoading ? (
                          // <div className="w-full flex justify-center min-h-32 p-2">
                          <div className="bg-white border border-gray-200 rounded-xl p-3 gap-3 flex flex-col items-center">
                            <Loader variant="blue" />
                          </div>
                        ) : didAvailableData?.length > 0 ? (
                          // <div className="bg-white border border-gray-200 rounded-xl p-3 gap-3 flex flex-col items-center">
                          <div className="bg-white border border-gray-200 rounded-xl p-3 gap-3 flex flex-col ">
                            <div className="pb-1 flex flex-col gap-0.5 px-3">
                              <h6 className="flex gap-2 text-sm font-semibold">
                                Available DID Number
                              </h6>
                            </div>
                            <div className="w-full h-full max-h-[14rem] overflow-y-auto">
                              <RadioGroup
                                value={watchDidNumber?.value}
                                onValueChange={(value) => {
                                  const selected = didAvailableData.find(
                                    (d: any) => d.id === value,
                                  );
                                  if (selected) {
                                    setValue(
                                      `users.[${index}].did_number`,
                                      {
                                        label: selected?.number,
                                        value: selected?.id,
                                      },
                                      { shouldValidate: true },
                                    );
                                  }
                                }}
                                // className="flex flex-wrap gap-4 items-center justify-center"
                                className="flex flex-wrap gap-3 w-full"
                              >
                                {didAvailableData?.slice(0, 10)?.map((item: any) => {
                                  const didNumber = item?.number;
                                  const didId = item?.id;

                                  return (
                                    <div
                                      className="flex items-center space-x-2 min-w-[150px]"
                                      key={`${didId}-${didNumber}`}
                                    >
                                      <RadioGroupItem
                                        value={didId}
                                        id={`did-${didId}`}
                                        disabled={selectedDidNumbers.includes(didId)}
                                      />
                                      <Label className="text-sm" htmlFor={`did-${didId}`}>
                                        {didNumber}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </RadioGroup>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full">
                            <div className="bg-white border border-gray-200 rounded-xl p-3 gap-3 flex flex-col items-center">
                              <div className="pb-1 flex flex-col gap-1.5 px-3">
                                <img src={NotFound} alt="BusyImage" className="w-20 min-w-20" />
                                <p className="text-sm text-center font-medium text-gray-700">
                                  No DID found
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <h5 className="text-base text-gray-800 font-normal w-full text-center mt-[-1rem] flex justify-center">
                          Choose a number for your account
                        </h5>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AssignItem;
