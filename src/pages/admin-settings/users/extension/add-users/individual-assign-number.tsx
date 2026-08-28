import CustomSelect from '@/components/custom/custom-select';
import CustomTooltip from '@/components/custom/custom-tooltip';
import Loader from '@/components/custom/loader';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useGetMyPlanDetails } from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import { normalizeDidCountries } from '@/lib/did-countries';
import { handleAlert } from '@/lib/utils';
import { featuresLookUp, featuresObj } from '@/pages/admin-settings/numbers/all-numbers/constants';
import {
  allNumbersList,
  assignNumber,
  assignNumberUser,
  didRegionList,
  getAvailableDid,
  getDidGroup,
  getDidPrefixes,
  getNumbersCount,
  reserveDid,
} from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

const formDefaultValues = {
  choose_inventory: true,
  inventory: { label: 'Select', value: '' },
  country: { label: 'Select', value: '' },
  state: { label: 'Select', value: '' },
  city: { label: 'Select', value: '' },
  did_number: { label: 'Select', value: '' },
  groupId: { label: '', value: '', sku_id: '' },
};

const validationSchema = yup.object().shape({
  inventory: yup.object().shape({
    value: yup.string().when('$schemaContext', {
      is: (schema: any) => schema?.chooseInventory,
      then: () => yup.string().required('DID Number is required'),
      otherwise: () => yup.string().notRequired(),
    }),
  }),
  country: yup.object().shape({
    value: yup.string().when('$schemaContext', {
      is: (schema: any) => !schema?.chooseInventory,
      then: () => yup.string().required('Country is required'),
      otherwise: () => yup.string().notRequired(),
    }),
  }),
  state: yup.object().shape({
    value: yup.string().when('$schemaContext', {
      is: (schema: any) => !schema?.chooseInventory,
      then: () => yup.string().required('State is required'),
      otherwise: () => yup.string().notRequired(),
    }),
  }),
  city: yup.object().shape({
    value: yup.string().when('$schemaContext', {
      is: (schema: any) => !schema?.chooseInventory,
      then: () => yup.string().required('City is required'),
      otherwise: () => yup.string().notRequired(),
    }),
  }),
  did_number: yup.object().shape({
    value: yup.string().when('$schemaContext', {
      is: (schema: any) => !schema?.chooseInventory,
      then: () => yup.string().required('DID number is required'),
      otherwise: () => yup.string().notRequired(),
    }),
  }),
});
const IndividualAssignNumber = ({ rowData, handleClose }: any) => {
  const queryClient = useQueryClient();
  const [schemaContext, setSchemaContext] = useState<any>(null);
  const { user } = useUser();
  const countryOptions = useMemo(
    () =>
      normalizeDidCountries(user?.company_info?.allow_country)
        .sort((a, b) => a.country_name.localeCompare(b.country_name))
        .map((country) => ({
          label: country.country_name,
          value: country.country_code_iso2,
        })),
    [user?.company_info?.allow_country],
  );
  const { data: dataGetMyPlanDetails } = useGetMyPlanDetails();
  const totalPaybleLicences = dataGetMyPlanDetails?.license_detail?.payable_licenses || 0;
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  }: any = useForm<any>({
    mode: 'all',
    defaultValues: formDefaultValues,
    resolver: yupResolver(validationSchema),
    context: { schemaContext },
  });

  const [
    watchChooseInventory,
    watchInventory,
    watchCountry,
    watchState,
    watchCity,
    watchDidNumber,
    watchGroupId,
  ] = watch(['choose_inventory', 'inventory', 'country', 'state', 'city', 'did_number', 'groupId']);

  const countryIso = watchCountry?.value;
  const { data: numbersCount } = useQuery({
    queryKey: ['numberCountList'],
    queryFn: () => getNumbersCount(),
    select: (data: any) => data?.data?.data?.result?.counts || {},
  });

  const { data: dataStateList, isLoading: isLoadingStateList } = useQuery({
    queryKey: ['regionList', countryIso],
    queryFn: () => didRegionList({ country_iso: countryIso }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: !watchChooseInventory && !!countryIso,
  });

  // const { data: areaCodeData, isLoading: areaCodeLoading } = useQuery({
  //   queryKey: ['cityListAllNumbers', USA_ID, watchState?.value],
  //   queryFn: () => getAreaCode(USA_ID, watchState?.value),
  //   select: (data: any) => data?.data?.data?.result?.rows || [],
  //   enabled: !!(USA_ID && watchState?.value),
  // });

  const { data: areaCodeData, isLoading: areaCodeLoading } = useQuery({
    queryKey: ['cityList', countryIso, watchState?.value],
    queryFn: () =>
      getDidPrefixes({
        country_iso: countryIso,
        region_id: watchState?.value,
      }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: !!(countryIso && watchState?.value),
  });

  const { data: didAvailableData, isLoading: didAvailableLoading } = useQuery({
    queryKey: [
      'getAvailableDid',
      countryIso,
      watchState?.value,
      watchCity?.value,
      watchGroupId?.value,
    ],
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

  const { data: dataGetAllNumbers = [], isLoading: isLoadingGetAllNumbers } = useQuery({
    queryKey: ['choose-from-inventory'],
    queryFn: () =>
      allNumbersList({
        type: 'inventory',
        filters: [{ did_type: 'L' }],
      }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: watchChooseInventory,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: watchChooseInventory ? assignNumberUser : assignNumber,
    onSuccess: ({ data }: any) => {
      queryClient.invalidateQueries({ queryKey: ['fetchUsersList'] });
      handleAlert({ text: data?.data?.message, type: 'success' });
      handleClose();
    },
  });

  const { mutate: mutateReserveDid, isPending: reserveLoading } = useMutation({
    mutationKey: ['reserveDid'],
    mutationFn: reserveDid,
  });
  const onSubmit = () => {
    let payload: any = null;
    if (watchChooseInventory) {
      payload = {
        user_uuid: rowData?.uuid,
        did_number: watchInventory?.value,
      };
      mutate(payload);
    } else {
      payload = {
        users: [
          {
            id: String(watchDidNumber?.value) || '',
            name: `${rowData?.first_name}${rowData?.last_name ? ` ${rowData?.last_name}` : ''}`,
            country: watchCountry?.label || '',
            state: watchState?.value || '',
            city: watchCity?.value || '',
            extension: rowData?.extension,
            user_uuid: rowData?.uuid,
          },
        ],
      };

      mutateReserveDid(
        {
          available_did_id: [watchDidNumber?.value],
          country_iso: countryIso,
        },
        {
          onSuccess: () => {
            mutate(payload);
          },
        },
      );
    }
  };

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
                setValue('groupId', parsed, { shouldValidate: true });
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

  useEffect(() => {
    setSchemaContext({
      chooseInventory: watchChooseInventory,
      state: watchState?.value || '',
      city: watchCity?.value || '',
    });
  }, [watchChooseInventory, watchState, watchCity]);

  const isShowTable = countryIso && watchState?.value && watchCity?.value;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full min-h-0 w-full flex-col justify-between gap-3"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden pt-2 pr-1">
        {numbersCount?.free < totalPaybleLicences ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label>Choose From Inventory</Label>
            <Switch
              onCheckedChange={(_) => {
                const { city, country, did_number, inventory, state } = formDefaultValues;
                reset({ choose_inventory: _, city, country, did_number, inventory, state });
              }}
              checked={watchChooseInventory}
            />
          </div>
        ) : null}

        {watchChooseInventory ? (
          <CustomSelect
            label={'DID Number'}
            options={dataGetAllNumbers?.map((item: any) => ({
              label: `${item?.did_number} (${item?.type === 'F' ? 'FREE' : item?.type === 'P' ? 'PAID' : ''})`,
              value: item?.did_number,
            }))}
            handleChange={(val) => {
              // const obj = dataGetAllNumbers?.find((item: any) => item?.did_number === val?.value);
              setValue('inventory', val, { shouldValidate: true });
              // setValue('city', {
              //   name: obj?.did_city,
              //   value: obj?.did_city,
              // });
            }}
            value={watch('inventory')}
            error={errors?.inventory?.value?.message}
            isLoading={isLoadingGetAllNumbers}
          />
        ) : (
          <>
            <CustomSelect
              label="Country"
              options={countryOptions}
              handleChange={(data) => {
                setValue(
                  'country',
                  {
                    label: data?.label,
                    value: data?.value,
                  },
                  { shouldValidate: true },
                );
                setValue('state', { label: 'Select State', value: '' });
                setValue('city', { label: 'Select Area Code', value: '' });
                setValue('groupId', { label: '', value: '', sku_id: '' });
                setValue('did_number', { label: 'Select DID Number', value: '' });
              }}
              value={watchCountry}
              placeholder="Select Country"
              error={errors?.country?.value?.message}
            />

            <CustomSelect
              label={'State'}
              options={dataStateList?.map((item: any) => ({
                label: item?.name,
                value: item?.id,
              }))}
              handleChange={(data) => {
                setValue(
                  `state`,
                  {
                    label: data?.label,
                    value: data?.value,
                  },
                  { shouldValidate: true },
                );
                setValue(`city`, { label: 'Select City', value: '' });
                setValue('groupId', { label: '', value: '', sku_id: '' });

                setValue(`did_number`, { label: 'Select Did Number', value: '' });
              }}
              value={watchState}
              placeholder={'Select State'}
              error={errors?.state?.value?.message}
              isLoading={isLoadingStateList}
              isDisabled={!countryIso}
            />

            <CustomSelect
              label={'Area Code'}
              options={areaCodeData?.map((v: any) => ({
                label: v?.npanxx,
                value: v?.id,
              }))}
              handleChange={(data) => {
                setValue(
                  `city`,
                  {
                    label: data?.label,
                    value: data?.value,
                  },
                  { shouldValidate: true },
                );
                setValue('groupId', { label: '', value: '', sku_id: '' });

                setValue(`did_number`, '');
              }}
              value={watchCity}
              placeholder="Select Area Code"
              isLoading={areaCodeLoading}
              error={errors?.city?.value?.message}
              isDisabled={!watchState?.value}
            />

            {/* <CustomSelect
              label={'DID Number'}
              options={didAvailableData?.map((v: any) => ({
                label: v?.attributes?.number,
                value: v?.id,
              }))}
              handleChange={(data) => {
                setValue(
                  `did_number`,
                  {
                    label: data?.label,
                    value: data?.value,
                  },
                  { shouldValidate: true },
                );
              }}
              value={watch(`did_number`)}
              placeholder="Select DID Number"
              isLoading={didAvailableLoading}
              error={errors?.did_number?.value?.message}
            /> */}

            <section className="flex min-h-0 w-full overflow-x-auto overflow-y-visible">
              <div className="flex w-full min-w-0 flex-col gap-4">
                <div className="flex w-full min-w-0 gap-3">
                  <div className="flex w-full min-w-0 flex-col gap-4">
                    {isShowTable ? (
                      <div className="relative w-full overflow-x-auto rounded-xl bg-white p-2 sm:p-3">
                        {errors?.groupId?.value?.message && (
                          <div className="text-red-500 font-medium text-xs pb-1 absolute top-2">
                            {errors?.groupId?.value?.message}
                          </div>
                        )}
                        <div className="min-w-[620px]">
                          <TableManager
                            {...{
                              fetcherKey: [
                                'getDidGroup',
                                countryIso,
                                watchState?.value,
                                watchCity?.value,
                              ],
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
                            }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="w-full">
                      {watchGroupId?.value && (
                        <>
                          <div className="flex w-full flex-wrap gap-4">
                            {watchCity?.value && watchState?.value ? (
                              didAvailableLoading ? (
                                <div className="w-full flex justify-center">
                                  <Loader variant="blue" />
                                </div>
                              ) : didAvailableData?.length > 0 ? (
                                <div className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:items-center">
                                  <div className="flex flex-col gap-0.5 pb-1 sm:px-3">
                                    <h6 className="flex gap-2 text-sm font-semibold">
                                      Available DID Number
                                    </h6>
                                  </div>
                                  <RadioGroup
                                    value={watchDidNumber?.value}
                                    onValueChange={(value) => {
                                      const selected = didAvailableData.find(
                                        (d: any) => d.id === value,
                                      );
                                      if (selected) {
                                        setValue('did_number', {
                                          label: selected.attributes?.number,
                                          value: selected.id,
                                        });
                                      }
                                    }}
                                    className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2"
                                  >
                                    {didAvailableData?.slice(0, 10)?.map((item: any) => {
                                      const didNumber = item?.number;
                                      const didId = item?.id;

                                      return (
                                        <div
                                          className="flex min-w-0 items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 sm:items-center"
                                          key={`${didId}-${didNumber}`}
                                        >
                                          <RadioGroupItem value={didId} id={`did-${didId}`} />
                                          <Label
                                            htmlFor={`did-${didId}`}
                                            className="break-all text-sm"
                                          >
                                            {didNumber}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </RadioGroup>
                                </div>
                              ) : (
                                <div className="w-full">
                                  <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-center">
                                    <div className="pb-1 flex flex-col gap-0.5 px-3">
                                      <h6 className="flex gap-2 text-sm font-semibold">
                                        No DID found
                                      </h6>
                                    </div>
                                  </div>

                                  {/* <div className="flex gap-2">
                              <CustomSelect
                                label={'Select quantity'}
                                options={[1]?.map((v: any) => ({
                                  label: v,
                                  value: v,
                                }))}
                                handleChange={(data) => {
                                  setValue(
                                    'quantity',
                                    {
                                      label: data?.label,
                                      value: data?.value,
                                    },
                                    { shouldValidate: true },
                                  );
                                }}
                                value={watchQuantity}
                                placeholder="Select quantity"
                                error={errors?.quantity?.value?.message}
                              />
                            </div> */}
                                </div>
                              )
                            ) : (
                              <h5 className="flex w-full justify-center py-2 text-center text-base font-normal text-gray-800">
                                Choose a number for your account
                              </h5>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
      <div className="flex shrink-0 flex-row gap-2 border-t border-gray-200 bg-white pt-3">
        <Button
          variant={'transparent'}
          type="button"
          onClick={handleClose}
          className="flex-1 sm:w-auto sm:flex-none"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant={'primary'}
          disabled={isPending || reserveLoading}
          className="flex-1 sm:w-auto sm:flex-none"
        >
          {isPending || reserveLoading ? <Loader variant="blue" /> : 'Assign Number'}
        </Button>
      </div>
    </form>
  );
};

export default IndividualAssignNumber;
