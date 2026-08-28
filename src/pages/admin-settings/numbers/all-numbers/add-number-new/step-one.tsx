import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import TableManager from '@/components/custom/table-manager';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetSite } from '@/hooks/common';
import {
  didGroupTypes,
  didRegionList,
  // getAreaCode,
  getAvailableDid,
  getDidCountryList,
  getFaxAvailableDid,
  getFaxDidCountryList,
  getDidGroup,
  getDidPrefixes,
} from '@/services/api';
import { useQueries, useQuery } from '@tanstack/react-query';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { getCompanyDefaultCountryOption } from '@/lib/company-default-country';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { featuresLookUp, featuresObj } from '../constants';
import { useUser } from '@/hooks/use-user';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useWatch } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const TOLL_FREE_NUMBER_TYPE_IDS = ['1b8076db-df6c-42ee-bdc0-392367b7e070'];

const isTollFreeNumberType = (numberType: any) => {
  const label = String(numberType?.label || '').toLowerCase();
  const value = String(numberType?.value || '').toLowerCase();

  return (
    label === 'toll free' ||
    label === 'toll-free' ||
    value === 'toll free' ||
    value === 'toll-free' ||
    TOLL_FREE_NUMBER_TYPE_IDS.includes(numberType?.value)
  );
};

const StepOne = ({ formInstance, setStatus, setFeatures, isFaxNumber, setIsFaxNumber }: any) => {
  const {
    register,
    control,
    formState: { errors },
    setValue,
    clearErrors,
    getValues,
    reset,
  } = formInstance;

  const { data: siteListData, isLoading: siteListLoading } = useGetSite();

  /* The company's default country, used only to open the Location box on
     something sensible. It never replaces a country the admin has chosen. */
  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    staleTime: 5 * 60 * 1000,
  });
  const seededForFaxModeRef = useRef<boolean | null>(null);
  const { user } = useUser();
  const { user_info = {} } = user || {};
  const [
    watchNumberType,
    watchStateProvince,
    watchAreaCode,
    watchLocation,
    watchVirtualNumbers,
    watchGroupId,
    watchSite,
    watchIsQuantity,
    watchDidName,
  ] = useWatch({
    control,
    name: [
      'numberType',
      'state',
      'areaCode',
      'location',
      'virtualNumbers',
      'groupId',
      'site',
      'isQuantity',
      'did_name',
    ],
  });

  const hideStateAreaCode =
    ['US', 'CA', 'GB'].includes(watchLocation?.value) && isTollFreeNumberType(watchNumberType);

  const [
    { data: locationData = [], isLoading: locationLoading },
    { data: numberTypesData, isLoading: numberTypesLoading },
    { data: stateProvinceData, isLoading: stateProvinceLoading },
    { data: prefixesData, isLoading: prefixLoading },
    { data: didAvailableData, isFetching },
  ]: any = useQueries({
    queries: [
      // 1
      {
        queryKey: [isFaxNumber ? 'getFaxDidCountryList' : 'getDidCountryList'],
        queryFn: () =>
          isFaxNumber
            ? getFaxDidCountryList({ limit: 200, page: 1 })
            : getDidCountryList({
                limit: 100,
                page: 1,
                filter: [
                  {
                    key: 'status',
                    value: 1,
                  },
                ],
              }),
        select: (data: any) => {
          const result = data?.data?.data?.result ?? data?.data?.result ?? data?.result;

          return Array.isArray(result) ? result : result?.rows || [];
        },
      },
      // 2
      {
        queryKey: ['groupTypesAllNumbers', watchLocation?.value, isFaxNumber],
        queryFn: () => didGroupTypes(watchLocation?.value),
        select: (data: any) => data?.data?.data?.result?.rows || [],
        enabled: !isFaxNumber && !!watchLocation?.value,
      },
      //3
      {
        queryKey: ['didRegionListAllNumbers', watchLocation?.value, watchNumberType?.value],
        queryFn: () => didRegionList({ country_iso: watchLocation?.value }),
        select: (data: any) => data?.data?.data?.result?.rows || [],
        enabled:
          isFaxNumber || hideStateAreaCode
            ? false
            : !!(watchLocation?.region_available && watchNumberType?.value),
      },
      //4
      {
        queryKey: ['didPrefixesAllNumbers', watchLocation?.value, watchStateProvince?.value],
        queryFn: () =>
          getDidPrefixes({
            country_iso: watchLocation?.value,
            region_id: watchStateProvince?.value,
          }),
        select: (data: any) => data?.data?.data?.result?.rows || [],
        enabled: !isFaxNumber && !!(watchLocation?.value && watchStateProvince?.value),
      },
      //5
      {
        queryKey: [
          'getAvailableDid',
          watchLocation?.value,
          watchNumberType?.value,
          watchGroupId?.value,
          isFaxNumber,
        ],
        queryFn: () =>
          isFaxNumber
            ? getFaxAvailableDid({
                country_code: watchLocation?.value,
                number_type: watchNumberType?.value,
                did_filter_type: 'fax',
              })
            : getAvailableDid({
                country_iso: watchLocation?.value,
                region_id: watchStateProvince?.value,
                group_type_id: [watchNumberType?.value],
                group_id: watchGroupId?.value,
              }),
        select: (data: any) => {
          const result = data?.data?.data?.result ?? data?.data?.result ?? data?.result;

          if (isFaxNumber) {
            return Array.isArray(result) ? result : result?.rows || [];
          }

          return result?.rows || [];
        },
        enabled: isFaxNumber
          ? !!(watchLocation?.value && watchNumberType?.value)
          : !!watchGroupId?.value,
      },
    ],
  });

  const columns = useMemo(
    () => [
      {
        id: 'select_prefix',
        header: 'Select',
        accessorKey: 'prefix',
        cell: ({ row: { original } = {} }: any) => {
          const features = original?.features;
          const radioValue = {
            name: original?.prefix,
            value: original?.id,
            sku_id: original?.sku_id,
            needs_registration: original?.needs_registration,
          };
          return (
            <div className="flex justify-center items-center">
              <input
                type="radio"
                name="did-group-selection"
                className="h-4 w-4 cursor-pointer accent-primary"
                checked={watchGroupId?.value === radioValue.value}
                onChange={() => {
                  setValue('groupId', radioValue, { shouldValidate: true });
                  setFeatures(features);
                }}
              />
            </div>
          );
        },
        meta: {
          textAlign: 'center',
        },
      },
      {
        id: 'display_prefix',
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
              {features?.map((v: any, index: number) => {
                if (!featuresLookUp[v]) return;
                return (
                  <CustomTooltip key={`${v}_${index}`} text={featuresObj[v]} side="top">
                    <img
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
      // {
      //   header: 'Monthly Price',
      //   accessorKey: 'monthly_price',
      // },
    ],
    [setFeatures, setValue, watchGroupId?.value],
  );

  // const handleCheckboxChange = (e: any) => {
  //   const value = JSON.parse(e.target.value);
  //   const virtualNumbers = watch('virtualNumbers');
  //   if (e.target.checked) {
  //     if (!virtualNumbers.some((item: any) => item.value === value.value)) {
  //       setValue('virtualNumbers', [...virtualNumbers, value], {
  //         shouldValidate: true,
  //       });
  //     }
  //   } else {
  //     setValue(
  //       'virtualNumbers',
  //       virtualNumbers.filter((item: any) => item.value !== value.value),
  //       { shouldValidate: true },
  //     );
  //   }
  // };

  const handleCheckboxChange = useCallback(
    (e: any) => {
      const value = JSON.parse(e.target.value);
      if (e.target.checked) {
        setValue('virtualNumbers', [value], { shouldValidate: true });
      } else {
        setValue('virtualNumbers', [], { shouldValidate: true });
      }
    },
    [setValue],
  );

  const availableDidSignature = useMemo(
    () =>
      (didAvailableData || [])
        .map((item: any) => item?.id || item?.number || item?.phone_number || '')
        .join('|'),
    [didAvailableData],
  );
  const prevAvailableDidSignatureRef = useRef('');

  useEffect(() => {
    if (prevAvailableDidSignatureRef.current !== availableDidSignature) {
      setValue('virtualNumbers', [], { shouldValidate: false });
      prevAvailableDidSignatureRef.current = availableDidSignature;
    }

    const shouldBeQuantity = (didAvailableData?.length || 0) === 0;
    if (watchIsQuantity !== shouldBeQuantity) {
      setValue('isQuantity', shouldBeQuantity, { shouldValidate: false });
    }
  }, [availableDidSignature, didAvailableData?.length, setValue, watchIsQuantity]);

  // useEffect(() => {
  //     if (siteListData?.length && !watch('site')?.value) {
  //       const firstSite = siteListData[0] || {};
  //       setValue(
  //         'site',
  //         { label: firstSite?.name, value: firstSite?.uuid },
  //         { shouldValidate: true },
  //       );
  //     }
  //   }, [siteListData, watch, setValue]);
  useEffect(() => {
    if (user_info && !watchSite?.value) {
      const obj = {
        label: user_info?.site_detail?.name,
        value: user_info?.site_uuid,
      };
      setValue('site', obj, { shouldValidate: false });
    }
  }, [setValue, user_info, watchSite]);

  const isShowTable = isFaxNumber
    ? false
    : hideStateAreaCode
      ? true
      : watchLocation?.region_available
        ? watchStateProvince?.value && watchAreaCode?.value
        : watchNumberType?.value;

  const resetNumberSelectionState = useCallback(() => {
    // Reset all dependent fields in a single call to avoid 5-6 separate
    // re-renders that cause visible flashing in the downstream dropdowns.
    reset(
      {
        ...getValues(),
        state: null,
        areaCode: null,
        groupId: {},
        virtualNumbers: [],
        isQuantity: false,
      },
      {
        keepErrors: false,
        keepDirty: false,
        keepTouched: false,
        keepIsValid: false,
        keepIsSubmitted: false,
      },
    );
  }, [getValues, reset]);

  const siteOptions = useMemo(
    () =>
      siteListData?.map((site: any) => ({
        label: site?.name,
        value: site?.uuid,
      })) || [],
    [siteListData],
  );

  const locationOptions = useMemo(() => {
    const locations = [...(locationData || [])];

    return locations
      .sort((a: any, b: any) => a?.country_name.localeCompare(b?.country_name))
      .map((location: any) => ({
        label: location?.country_name || location?.name,
        value: location?.country_code_iso2 || location?.country_iso || location?.code,
        fax_number_types: isFaxNumber
          ? {
              local: Boolean(location?.local?.isAvailable),
              toll_free: Boolean(location?.toll_free?.isAvailable),
            }
          : undefined,
        fax_package_uuid: isFaxNumber ? location?.uuid : undefined,
        region_available:
          !isFaxNumber &&
          ['CA', 'US', 'GB'].includes(
            location?.country_code_iso2 || location?.country_iso || location?.code,
          ),
      }));
  }, [isFaxNumber, locationData]);

  /* Opens the Location box on the company's default country. Seeded once per
     fax mode and only once the country list has arrived, because the seed has
     to be a country this account can actually buy in. A country the admin has
     already chosen is never touched. */
  useEffect(() => {
    if (seededForFaxModeRef.current === isFaxNumber) return;
    if (!locationOptions.length) return;

    const seed = getCompanyDefaultCountryOption({
      companySettings: companyDefaults?.settings,
      sites: siteListData,
      options: locationOptions,
      current: watchLocation,
    });

    seededForFaxModeRef.current = isFaxNumber;
    if (seed) setValue('location', seed, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyDefaults, isFaxNumber, locationOptions, siteListData]);

  const numberTypeOptions = useMemo(
    () =>
      (isFaxNumber
        ? [
            watchLocation?.fax_number_types?.toll_free && {
              name: 'Toll Free',
              id: 'toll_free',
            },
            watchLocation?.fax_number_types?.local && { name: 'Local', id: 'local' },
          ].filter(Boolean)
        : numberTypesData
      )?.map((item: any) => ({
        label: item?.name,
        value: item?.id,
      })) || [],
    [isFaxNumber, numberTypesData, watchLocation?.fax_number_types],
  );

  const hasNoFaxNumbersForLocation =
    isFaxNumber &&
    Boolean(watchLocation?.value) &&
    !watchLocation?.fax_number_types?.local &&
    !watchLocation?.fax_number_types?.toll_free;

  const stateOptions = useMemo(
    () =>
      stateProvinceData?.map((location: any) => ({
        label: location?.name,
        value: location?.id,
      })) || [],
    [stateProvinceData],
  );

  const areaCodeOptions = useMemo(
    () =>
      prefixesData?.map((v: any) => ({
        label: v?.npanxx,
        value: v?.id,
      })) || [],
    [prefixesData],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-col">
        <div className="flex flex-col gap-4">
          <div className="flex w-full items-center gap-3">
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="relative flex w-full gap-1 md:w-1/2">
                <Input
                  label="Name"
                  {...register('did_name')}
                  type="text"
                  value={watchDidName || ''}
                  placeholder="Enter DID Name"
                  error={errors?.did_name?.message}
                />
              </div>
              <div className="relative flex w-full gap-1 md:w-1/2">
                <CustomSelect
                  label="Location"
                  {...register('site')}
                  options={siteOptions}
                  handleChange={(value) => {
                    setValue('site', value || {}, {
                      shouldValidate: true,
                    });
                  }}
                  value={watchSite}
                  placeholder="Select location"
                  error={errors?.site?.message}
                  isLoading={siteListLoading}
                />
              </div>
            </div>
          </div>
          <div className="flex w-full items-center gap-3">
            <div className="flex w-full flex-col gap-2">
              <Label>Fax Number</Label>
              <RadioGroup
                className="flex items-center gap-6"
                value={isFaxNumber ? 'yes' : 'no'}
                onValueChange={(value) => {
                  setIsFaxNumber(value === 'yes');
                  setValue('location', null, { shouldValidate: false });
                  setValue('numberType', null, { shouldValidate: false });
                  resetNumberSelectionState();
                  clearErrors(['location', 'numberType', 'groupId', 'virtualNumbers']);
                  setStatus(1);
                }}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="fax-number-yes" />
                  <Label className="cursor-pointer" htmlFor="fax-number-yes">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="fax-number-no" />
                  <Label className="cursor-pointer" htmlFor="fax-number-no">
                    No
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="flex w-full items-center gap-3">
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="relative flex w-full gap-1 md:w-1/2">
                <CustomSelect
                  label="Location"
                  options={locationOptions}
                  handleChange={(data) => {
                    setValue(
                      'location',
                      {
                        label: data?.label,
                        value: data?.value,
                        region_available: data?.region_available,
                        fax_number_types: data?.fax_number_types,
                        fax_package_uuid: data?.fax_package_uuid,
                      },
                      { shouldValidate: true },
                    );
                    setValue('numberType', null, { shouldValidate: false });
                    resetNumberSelectionState();
                    setStatus(1);
                  }}
                  value={watchLocation}
                  placeholder="Select Location"
                  error={errors?.location?.message}
                  isLoading={locationLoading}
                />
              </div>
              <div className="relative flex w-full flex-col gap-1 md:w-1/2">
                {/*
                  key={watchLocation?.value} forces CustomSelect to fully
                  remount when location changes, clearing any stale internal
                  react-select state (selected option highlight, menu position, etc.).
                */}
                <CustomSelect
                  key={`number-type-${watchLocation?.value ?? 'none'}`}
                  label="Number Type"
                  options={numberTypeOptions}
                  handleChange={(data) => {
                    setValue(
                      'numberType',
                      {
                        label: data?.label,
                        value: data?.value,
                      },
                      { shouldValidate: true },
                    );
                    resetNumberSelectionState();
                    if (isFaxNumber) {
                      setValue(
                        'groupId',
                        { value: data?.value, needs_registration: false },
                        { shouldValidate: true },
                      );
                    }
                    setStatus(1);
                  }}
                  value={watchNumberType}
                  placeholder="Select Number Type"
                  error={errors?.numberType?.message}
                  isLoading={numberTypesLoading}
                  isDisabled={!watchLocation?.value}
                />
                {hasNoFaxNumbersForLocation && (
                  <p className="text-xs font-medium text-red-500">
                    No number available for selected location.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {hideStateAreaCode
          ? null
          : watchLocation?.region_available &&
            watchNumberType?.value && (
              <div className="w-full flex items-center gap-3 pt-4">
                <div className="flex w-full flex-col gap-4 md:flex-row">
                  <div className="relative flex w-full gap-1 md:w-1/2">
                    {/*
                      key forces remount when location changes so the select
                      never shows a stale highlighted option.
                    */}
                    <CustomSelect
                      key={`state-${watchLocation?.value ?? 'none'}`}
                      label="State/Province"
                      options={stateOptions}
                      handleChange={(data) => {
                        setValue(
                          'state',
                          {
                            label: data?.label,
                            value: data?.value,
                          },
                          { shouldValidate: true },
                        );
                        setValue('groupId', {}, { shouldValidate: false });
                        setValue('areaCode', {}, { shouldValidate: false });
                        setValue('virtualNumbers', [], { shouldValidate: false });
                        clearErrors(['groupId', 'virtualNumbers', 'areaCode']);
                      }}
                      value={watchStateProvince}
                      placeholder="Select State or Province"
                      error={errors?.state?.value?.message}
                      isLoading={stateProvinceLoading}
                    />
                  </div>
                  <div className="relative flex w-full gap-1 md:w-1/2">
                    <CustomSelect
                      key={`area-code-${watchStateProvince?.value ?? 'none'}`}
                      label="Area Code"
                      options={areaCodeOptions}
                      handleChange={(data) => {
                        setValue(
                          'areaCode',
                          {
                            label: data?.label,
                            value: data?.value,
                          },
                          { shouldValidate: true },
                        );
                        setValue('groupId', {}, { shouldValidate: false });
                        setValue('virtualNumbers', [], { shouldValidate: false });
                        clearErrors(['groupId', 'virtualNumbers']);
                        setStatus(3);
                      }}
                      value={watchAreaCode}
                      placeholder="Select Area Code"
                      error={errors?.areaCode?.value?.message}
                      isLoading={prefixLoading}
                    />
                  </div>
                </div>
              </div>
            )}
        <div className="flex w-full items-center gap-3">
          <div className="flex w-full flex-col gap-4 lg:flex-row">
            {isShowTable ? (
              <div className="relative pt-7 w-full lg:w-3/4">
                {errors?.groupId?.value?.message && (
                  <div className="text-red-500 font-medium text-xs pb-1 absolute top-2">
                    {errors?.groupId?.value?.message}
                  </div>
                )}
                <TableManager
                  {...{
                    fetcherKey: [
                      'getDidGroup',
                      watchLocation?.value,
                      watchNumberType?.value,
                      watchStateProvince?.value,
                      watchAreaCode?.value,
                    ],
                    fetcherFn: () =>
                      getDidGroup({
                        country_iso: watchLocation?.value,
                        group_type_id: [watchNumberType?.value],
                        region_id: watchStateProvince?.value,
                        nanpa_prefix_id: watchAreaCode?.value,
                      }),
                    enabled: Boolean(isShowTable),
                    columns,
                    showPagination: false,
                    customClass: 'min-h-[80px]',
                  }}
                />
              </div>
            ) : null}

            <div className={`w-full pt-2 lg:pt-7 ${isFaxNumber ? '' : 'lg:w-1/4'}`}>
              {(isFaxNumber ? watchNumberType?.value : watchGroupId?.value) && (
                <>
                  {!isFetching ? (
                    didAvailableData?.length > 0 && (
                      <div className="pb-1 flex flex-col gap-0.5 px-3">
                        <h6 className="flex gap-2 text-sm font-semibold">
                          {isFaxNumber ? 'Available Fax Number' : 'Available DID Number'}
                        </h6>
                        {errors?.virtualNumbers?.message && (
                          <p className="text-red-500 font-medium text-xs">
                            {errors.virtualNumbers.message}
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center py-3">
                      <Loader variant="blue" size="md" />
                    </div>
                  )}
                  <>
                    {!isFetching ? (
                      didAvailableData?.length ? (
                        <div className="flex flex-col gap-2 p-3">
                          {didAvailableData?.slice(0, 10)?.map((item: any) => {
                            const didNumber = isFaxNumber ? item?.phone_number : item?.number;
                            const didValue = isFaxNumber ? item?.phone_number : item?.id;
                            const isChecked = watchVirtualNumbers?.some(
                              (number: any) => number?.name === didNumber,
                            );
                            return (
                              <div
                                className="flex gap-1.5 w-full items-center"
                                key={`${didValue}-${didNumber}`}
                              >
                                <Checkbox
                                  className="cursor-pointer"
                                  value={JSON.stringify({
                                    name: didNumber,
                                    value: didValue,
                                  })}
                                  onCheckedChange={(checked: boolean) => {
                                    const syntheticEvent = {
                                      target: {
                                        checked,
                                        value: JSON.stringify({
                                          name: didNumber,
                                          value: didValue,
                                        }),
                                      },
                                    };
                                    handleCheckboxChange(syntheticEvent);
                                  }}
                                  checked={isChecked}
                                  id={didNumber}
                                />
                                <Label className="cursor-pointer" htmlFor={didNumber}>
                                  {didNumber}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div>
                          <div className="text-red-500 text-sm font-medium">
                            {isFaxNumber ? 'No fax number found' : 'No DID Found'}
                          </div>
                        </div>
                      )
                    ) : null}
                  </>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOne;
