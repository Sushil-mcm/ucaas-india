import CustomSelect from '@/components/custom/custom-select';
import TableManager from '@/components/custom/table-manager';
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
  getInventoryOptions
} from '@/services/api';
import { useQueries, useQuery } from '@tanstack/react-query';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { getCompanyDefaultCountryOption } from '@/lib/company-default-country';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { featuresLookUp, featuresObj } from '../constants';
import { isSellableNumberType, lookupInventory } from '@/lib/did-inventory';
import NumberPicker from '@/components/numbers/number-picker';
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
                /* 200 is the API's max page size (the request layer clamps
                   anything higher); 100 dropped countries past the first page. */
                limit: 200,
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
            /* Explicit max page size — the list was relying on an unknown
               server default and area codes past it were unreachable. */
            limit: 200,
            page: 1,
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
          watchStateProvince?.label,
          watchGroupId?.value,
          isFaxNumber,
        ],
        /* Our own stock first, the carrier only when a state has run dry.
           Numbers we already own can be handed over instantly; asking DIDWW
           means a search now and an order inside the customer's checkout, which
           is where purchases used to fail because the number had gone by the
           time they confirmed. The fallback keeps every state buyable. */
        queryFn: async () => {
          if (isFaxNumber) {
            return getFaxAvailableDid({
              country_code: watchLocation?.value,
              number_type: watchNumberType?.value,
              did_filter_type: 'fax',
            });
          }

          /* Country and number type is the whole question now. We stock a
             handful of states, so asking somebody to choose one from a list of
             fifty - most of which we hold nothing for - was asking a question
             we already know the answer to. The five come back spread across
             the states we do hold. A state is still honoured if one was
             picked, which is what the carrier fallback below needs. */
          const stock = await lookupInventory({
            countryIso: watchLocation?.value,
            numberType: watchNumberType,
            /* No state. Scoping to whatever happened to be selected - often
               a state we hold nothing for - is what sent these lookups to
               the carrier. The five come back spread across our states. */
            regionName: null,
          });
          if (stock.source === 'inventory') {
            /* Shaped like a carrier response so `select` below, the table and
               the selection handlers need no branch of their own. */
            return { data: { data: { result: { rows: stock.rows } } } };
          }

          /* Nothing on the shelf. The carrier search needs an area code, so if
             one has not been chosen yet there is nothing to ask for - the
             screen keeps its existing prompt instead of erroring. */
          if (!watchGroupId?.value) {
            return { data: { data: { result: { rows: [] } } } };
          }
          return getAvailableDid({
            country_iso: watchLocation?.value,
            region_id: watchStateProvince?.value,
            group_type_id: [watchNumberType?.value],
            group_id: watchGroupId?.value,
          });
        },
        select: (data: any) => {
          const result = data?.data?.data?.result ?? data?.data?.result ?? data?.result;

          if (isFaxNumber) {
            return Array.isArray(result) ? result : result?.rows || [];
          }

          return result?.rows || [];
        },
        /* Stock is held per state, not per area code, so this may now answer
           before an area code has been chosen. Toll-free has no state at all. */
        /* Country + type is enough to ask the shelf. Only the carrier fallback
           needs a state and an area code. */
        enabled: isFaxNumber
          ? !!(watchLocation?.value && watchNumberType?.value)
          : !!(watchLocation?.value && watchNumberType?.value),
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


  /* True once the numbers on screen came from our own stock. The state and
     area-code pickers exist only to narrow a carrier search; with stock there
     is nothing to narrow, so they are hidden and the table shows immediately. */
  const servedFromStock = Boolean((didAvailableData || [])[0]?.from_inventory);
  const hideLocationPickers = hideStateAreaCode || servedFromStock;

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
    : hideStateAreaCode || servedFromStock
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
    /* The account sells its own Indian inventory, so the rest of the carrier
       catalogue is not on offer however many countries it returns.

       India is kept from the API response when it appears there, and stood up
       as a static option when it does not. The numbers being sold were bought
       directly and are held in did_numbers, so the catalogue's opinion about
       whether India is purchasable is not the thing that decides it — without
       the fallback the dropdown would simply be empty and nothing could be
       added at all. Fax is left alone: a fax package needs a real uuid from the
       API, and inventing one would fail at checkout instead of here. */
    const isIndia = (location: any) =>
      (location?.country_code_iso2 || location?.country_iso || location?.code || '')
        .toString()
        .toUpperCase() === 'IN';

    const locations = (locationData || []).filter(isIndia);

    if (!locations.length && !isFaxNumber) {
      return [{ label: 'India', value: 'IN', region_available: false }];
    }

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

  /* We stock the United States and nothing else, so the country picker is a
     question with one answer. Ask the shelf once on mount: if we hold anything,
     United States is selected for the customer and the picker is not shown. An
     empty shelf brings it straight back, because then the carrier - which does
     sell other countries - is doing the work. */
  const { data: inventoryOptions } = useQuery({
    queryKey: ['didInventoryOptions', 'US'],
    queryFn: () => getInventoryOptions({ country_iso: 'US' }),
    select: (res: any) => res?.data?.data?.result ?? res?.data?.result ?? null,
    enabled: !isFaxNumber,
    staleTime: 60000,
  });
  const hasUsStock = Boolean(
    (inventoryOptions?.types || []).some((t: any) => Number(t?.total || 0) > 0),
  );
  const usOption = useMemo(
    () => (locationOptions || []).find((o: any) => o?.value === 'US'),
    [locationOptions],
  );

  useEffect(() => {
    if (!hasUsStock || !usOption || watchLocation?.value) return;
    setValue('location', usOption, { shouldValidate: true });
  }, [hasUsStock, usOption, watchLocation?.value, setValue]);

  /* Hidden only while the United States is the selection and we have stock for
     it - never hidden in a way that could strand somebody on a country they
     cannot change. */
  const hideCountryPicker = hasUsStock && watchLocation?.value === 'US';


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
    /* The company default is still a US site on most of these accounts, and it
       no longer matches anything in the list, so the seed comes back empty and
       the box opens blank on its only possible answer. With one country on
       offer there is nothing to choose. */
    const resolvedSeed = seed || (locationOptions.length === 1 ? locationOptions[0] : null);
    if (resolvedSeed) setValue('location', resolvedSeed, { shouldValidate: true });
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
        : (numberTypesData || []).filter(isSellableNumberType)
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
              {/* One country in stock means one possible answer, so the picker
                  is not shown. It returns the moment we have no stock, because
                  the carrier does sell other countries. */}
              <div
                className={`relative flex w-full gap-1 md:w-1/2 ${hideCountryPicker ? 'hidden' : ''}`}
              >
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
        {hideLocationPickers
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

            {/* Choosing the number. A wall of large tiles, because people scan
                for one that reads well rather than working down a list - and
                the same component runs on sign-up, so a customer buying their
                second number recognises the screen. */}
            <div className="w-full pt-2 lg:pt-7">
              {(isFaxNumber ? watchNumberType?.value : (watchGroupId?.value || servedFromStock)) && (
                <>
                  {errors?.virtualNumbers?.message && (
                    <p className="pb-2 text-center text-xs font-medium text-red-500">
                      {errors.virtualNumbers.message}
                    </p>
                  )}
                  <NumberPicker
                    loading={isFetching}
                    numbers={(didAvailableData || []).map((item: any) => ({
                      id: String(isFaxNumber ? item?.phone_number : item?.id),
                      number: String(isFaxNumber ? item?.phone_number : item?.number),
                      area_code: item?.area_code ?? null,
                      area_name: item?.area_name ?? null,
                      region_name: item?.region_name ?? null,
                      from_inventory: Boolean(item?.from_inventory),
                    }))}
                    selectedId={
                      watchVirtualNumbers?.length ? String(watchVirtualNumbers[0]?.value) : null
                    }
                    onSelect={(item) => {
                      /* One number at a time here, matching what the wizard
                         already enforced through handleCheckboxChange. */
                      setValue('virtualNumbers', [{ name: item.number, value: item.id }], {
                        shouldValidate: true,
                      });
                    }}
                    types={
                      isFaxNumber
                        ? undefined
                        : numberTypeOptions.map((t: any) => ({ label: t.label, value: t.value }))
                    }
                    selectedType={watchNumberType?.value ? watchNumberType : null}
                    onTypeChange={(t) => {
                      setValue('numberType', t, { shouldValidate: true });
                      setValue('virtualNumbers', [], { shouldValidate: false });
                    }}
                    emptyMessage={
                      isFaxNumber
                        ? 'No fax number is available for this location.'
                        : 'No number is available for this selection.'
                    }
                  />
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
