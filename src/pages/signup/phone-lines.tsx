import AlertConfirm from '@/components/custom/alert-confirm';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  buyVirtualDID,
  countryList,
  didGroupTypes,
  didRegionList,
  getAvailableDid,
  getDidGroup,
  getDidPrefixes,
  getPlanInfo,
  reserveDid,
  reserveDidQuantity,
  getInventoryOptions
} from '@/services/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import AccountCreatedPopup from './account-created-popup';
import { getDeviceId, getEnv, handleAlert, SESSION_NAME } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { featuresLookUp, featuresObj } from '../admin-settings/numbers/all-numbers/constants';
import TableManager from '@/components/custom/table-manager';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { getPlanDidCountries, normalizeDidCountries } from '@/lib/did-countries';
import { isSellableNumberType, lookupInventory } from '@/lib/did-inventory';
import NumberPicker from '@/components/numbers/number-picker';

const PURCHASE_WINDOW_SECONDS = 2 * 60;

export const phoneLinesValidationSchema = yup.object({
  did_type: yup
    .object({
      value: yup.string().required('DID type is required.'),
    })
    .nonNullable('DID type is required'),
  region: yup
    .object({
      value: yup.string().required('Region is required.'),
    })
    .nonNullable('Region is required'),
  city: yup
    .object({
      value: yup.string().required('City is required.'),
    })
    .nonNullable('City is required'),
  did_number: yup
    .object({
      value: yup.string().required('DID number is required.'),
    })
    .nonNullable('DID number is required'),
});

const initialValues = {
  location: { label: '', value: '', region_available: false },
  did_type: { label: 'Select', value: '' },
  region: { label: 'Select', value: '' },
  city: { label: 'Select', value: '' },
  did_number: { label: '', value: '' },
  groupId: { label: '', value: '', sku_id: '' },
  quantity: { label: 1, value: 1 },
  isQuantity: false,
};

const PhoneLines = () => {
  const { user, handleSetUser } = useUser();
  console.log('🚀 ~ PhoneLines ~ user:', user);
  const [features, setFeatures] = useState<any>([]);
  const [isDIDBuy, setIsDIDBuy] = useState(false);
  const [isAccountCreated, setIsAccountCreated] = useState(false);

  const location = useLocation();
  const { state } = location;
  const navigate = useNavigate();
  const { signUpResponseData } = state || {};
  const isAuthenticatedOnboarding = location.pathname === '/phone-lines-auth';
  const isLoginFlow = Boolean(state?.isLogin || isAuthenticatedOnboarding);
  const onboardingAccessToken = String(
    state?.accessToken ||
      localStorage.getItem(SESSION_NAME) ||
      signUpResponseData?.current?.token ||
      signUpResponseData?.token ||
      '',
  ).trim();
  const onboardingCompanyUuid = String(
    signUpResponseData?.current?.company_uuid ||
      signUpResponseData?.current?.auth?.company_uuid ||
      signUpResponseData?.company_uuid ||
      signUpResponseData?.auth?.company_uuid ||
      user?.company_uuid ||
      user?.company_info?.uuid ||
      '',
  ).trim();
  const onboardingRequestConfig = useMemo(
    () => ({
      headers: onboardingAccessToken
        ? { Authorization: `Bearer ${onboardingAccessToken}` }
        : undefined,
    }),
    [onboardingAccessToken],
  );

  useEffect(() => {
    if (!isAuthenticatedOnboarding && !Object.keys(state || {}).length) {
      navigate('/');
    }
  }, [isAuthenticatedOnboarding, navigate, state]);

  const {
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues,
    // resolver: yupResolver(phoneLinesValidationSchema),
    mode: 'all',
  });

  const [
    watchLocation,
    watchDIDType,
    watchDIDNumber,
    watchRegion,
    watchCity,
    watchGroupId,
    watchQuantity,
    watchIsQuantity,
  ] = watch([
    'location',
    'did_type',
    'did_number',
    'region',
    'city',
    'groupId',
    'quantity',
    'isQuantity',
  ]);

  const planUuid = String(
    state?.planUuid ||
      state?.plan_uuid ||
      signUpResponseData?.current?.plan_uuid ||
      signUpResponseData?.plan_uuid ||
      signUpResponseData?.current?.auth?.plan_uuid ||
      signUpResponseData?.auth?.plan_uuid ||
      user?.plan_uuid ||
      user?.company_info?.plan_uuid ||
      '',
  ).trim();

  const { data: planInfo, isLoading: isPlanInfoLoading } = useQuery({
    queryKey: ['getPlanInfoQuery', planUuid],
    queryFn: () => getPlanInfo(planUuid),
    select: (res: any) => res?.data?.data?.result,
    enabled: Boolean(planUuid),
  });

  const planDidCountries = useMemo(() => {
    const planCountrySources = [
      planInfo,
      state?.didCountries || state?.did_countries,
      signUpResponseData,
    ];

    for (const source of planCountrySources) {
      const countries = getPlanDidCountries(source);
      if (countries.length) return countries;
    }

    return normalizeDidCountries(user?.company_info?.allow_did_countries);
  }, [planInfo, signUpResponseData, state?.didCountries, state?.did_countries, user]);

  const { data: fallbackCountryList = [], isLoading: isFallbackCountryListLoading } = useQuery({
    queryKey: ['countryList', 'phoneLinesFallback'],
    queryFn: () => countryList(onboardingRequestConfig),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: !isPlanInfoLoading && planDidCountries.length === 0 && Boolean(onboardingAccessToken),
    retry: 1,
  });
  const locationOptions = useMemo(() => {
    if (planUuid && isPlanInfoLoading) return [];

    if (planDidCountries.length) {
      return planDidCountries.map((country) => ({
        label: country.country_name,
        value: country.country_code_iso2,
        country_prefix: country.country_prefix,
        region_available: ['CA', 'US', 'GB'].includes(country.country_code_iso2),
      }));
    }

    return fallbackCountryList
      .map((country: any) => ({
        label: country?.country_name || country?.name,
        value: String(
          country?.country_code_iso2 ||
            country?.country_iso ||
            country?.isoCode ||
            country?.iso ||
            country?.code ||
            '',
        ).toUpperCase(),
        country_prefix: country?.country_prefix || country?.phonecode || country?.prefix || '',
        region_available:
          country?.region_available ??
          ['CA', 'US', 'GB'].includes(
            String(
              country?.country_code_iso2 ||
                country?.country_iso ||
                country?.isoCode ||
                country?.iso ||
                country?.code ||
                '',
            ).toUpperCase(),
          ),
      }))
      .filter((country: any) => country.label && country.value);
  }, [fallbackCountryList, isPlanInfoLoading, planDidCountries, planUuid]);

  const selectedCountryIso = watchLocation?.value || '';

  const { data: dataDIDTypeList = [], isLoading: didTypeListLoading } = useQuery({
    queryKey: ['didGroupTypes', selectedCountryIso],
    queryFn: () => didGroupTypes(selectedCountryIso, onboardingRequestConfig),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: Boolean(selectedCountryIso),
  });

  const didTypeOptions = useMemo(
    () =>
      dataDIDTypeList
        /* Was local + mobile. Mobile does not exist in the US - the carrier
           returns zero mobile groups for it - so that filter offered one real
           choice and one that could never be filled. */
        .filter(isSellableNumberType)
        .map((item: any) => ({
          label: item?.name,
          value: item?.id,
        })),
    [dataDIDTypeList],
  );

  const { data: dataRegionList, isLoading: regionListLoading } = useQuery({
    queryKey: ['regionList', selectedCountryIso, watchDIDType?.value],
    queryFn: () => didRegionList({ country_iso: selectedCountryIso }, onboardingRequestConfig),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: Boolean(selectedCountryIso && watchDIDType?.value),
  });

  const { data: dataCityList, isLoading: cityListLoading } = useQuery({
    queryKey: ['cityList', selectedCountryIso, watchRegion?.value],
    queryFn: () =>
      getDidPrefixes(
        {
          country_iso: selectedCountryIso,
          region_id: watchRegion?.value,
        },
        onboardingRequestConfig,
      ),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: Boolean(selectedCountryIso && watchRegion?.value),
  });

  const {
    data: didAvailableData,
    isPending: isPendingAvailableDID,
    isFetching: isFetchingAvailableDID,
    refetch: refetchAvailableDids,
  } = useQuery({
    queryKey: [
      'didList',
      selectedCountryIso,
      watchDIDType?.value,
      watchRegion?.value,
      watchRegion?.label,
      watchCity?.value,
      watchGroupId?.value,
    ],
    /* Our own stock first, the carrier only when a state has run dry.
       This is the sign-up path, so it is the one that matters most: a number
       we already own is handed over immediately, where asking DIDWW means a
       search and then an order placed inside the customer's first payment -
       the slowest and most fragile moment we have. */
    queryFn: async () => {
      /* Country and number type only. Sign-up is the worst place to ask a
         question we can answer ourselves, and we stock a handful of states, so
         the five come back spread across those. A region is still honoured if
         one was chosen, which the carrier fallback below needs. */
      const stock = await lookupInventory({
        countryIso: selectedCountryIso,
        numberType: watchDIDType,
        /* No region, for the same reason as the Add Number screen: scoping
           to a stale selection emptied the result and fell through to the
           carrier. */
        regionName: null,
        config: onboardingRequestConfig,
      });
      if (stock.source === 'inventory') {
        /* Shaped like the carrier's reply so `select` and everything below it
           stay unchanged - a row is a row whichever shelf it came from. */
        return { data: { data: { result: { rows: stock.rows } } } };
      }
      /* Nothing in stock. The carrier search is keyed on an area code, so
         without one there is nothing to ask for yet. */
      if (!watchGroupId?.value) {
        return { data: { data: { result: { rows: [] } } } };
      }
      return getAvailableDid(
        {
          country_iso: selectedCountryIso,
          region_id: watchRegion?.value,
          group_type_id: [watchDIDType?.value],
          group_id: watchGroupId?.value,
        },
        onboardingRequestConfig,
      );
    },
    select: (data: any) => data?.data?.data?.result?.rows || [],
    /* Stock is held per state, not per area code, so this can now answer before
       an area code is picked. Toll-free has no state at all. */
    /* Country + type is enough to ask the shelf; only the carrier fallback
       needs a region and an area code. */
    enabled: Boolean(selectedCountryIso && watchDIDType?.value),
  });
  /* Numbers that came off our own shelf need no narrowing, so the region and
     area-code pickers are not shown at all - they exist only to scope a carrier
     search. If the shelf is empty they come back and the old flow applies. */
  /* We stock the United States and nothing else, so the country picker is a
     question with a single answer. Asked once on mount: with stock, the United
     States is chosen for the customer and the picker is not shown. No stock and
     it comes straight back, because the carrier does sell other countries. */
  const { data: inventoryOptions } = useQuery({
    queryKey: ['didInventoryOptions', 'US'],
    queryFn: () => getInventoryOptions({ country_iso: 'US' }, onboardingRequestConfig),
    select: (res: any) => res?.data?.data?.result ?? res?.data?.result ?? null,
    staleTime: 60000,
  });
  const hasUsStock = Boolean(
    (inventoryOptions?.types || []).some((t: any) => Number(t?.total || 0) > 0),
  );
  const usCountryOption = useMemo(
    () => (locationOptions || []).find((o: any) => o?.value === 'US'),
    [locationOptions],
  );
  useEffect(() => {
    if (!hasUsStock || !usCountryOption || watchLocation?.value) return;
    setValue('location', usCountryOption, { shouldValidate: true });
  }, [hasUsStock, usCountryOption, watchLocation?.value, setValue]);
  const hideCountryPicker = hasUsStock && watchLocation?.value === 'US';

  const servedFromStock = Boolean((didAvailableData || [])[0]?.from_inventory);
  const hasAvailableDidNumbers = Boolean(didAvailableData?.length);
  /* The countdown is no longer shown - the picker has no "complete within"
     header - but the timer itself stays: it refreshes the offered numbers every
     two minutes, which keeps a lapsed hold from being presented as available. */
  const [, setPurchaseSecondsRemaining] = useState(PURCHASE_WINDOW_SECONDS);

  useEffect(() => {
    if (!hasAvailableDidNumbers) {
      setPurchaseSecondsRemaining(PURCHASE_WINDOW_SECONDS);
      return;
    }

    let isCancelled = false;
    let purchaseDeadline = Date.now() + PURCHASE_WINDOW_SECONDS * 1000;
    let countdownInterval: number | undefined;

    const updateCountdown = async () => {
      const secondsRemaining = Math.max(0, Math.ceil((purchaseDeadline - Date.now()) / 1000));

      setPurchaseSecondsRemaining(secondsRemaining);

      if (secondsRemaining === 0) {
        if (countdownInterval !== undefined) {
          window.clearInterval(countdownInterval);
          countdownInterval = undefined;
        }

        setValue('did_number', { label: '', value: '' }, { shouldValidate: false });
        await refetchAvailableDids();

        if (isCancelled) return;

        purchaseDeadline = Date.now() + PURCHASE_WINDOW_SECONDS * 1000;
        setPurchaseSecondsRemaining(PURCHASE_WINDOW_SECONDS);
        countdownInterval = window.setInterval(() => void updateCountdown(), 1000);
      }
    };

    void updateCountdown();
    countdownInterval = window.setInterval(() => void updateCountdown(), 1000);

    return () => {
      isCancelled = true;
      if (countdownInterval !== undefined) window.clearInterval(countdownInterval);
    };
  }, [hasAvailableDidNumbers, refetchAvailableDids, setValue]);

  const { mutate: mutateBuyVirtualDID, isPending: isPendingBuyVirtualDID } = useMutation({
    mutationFn: (data: any) => buyVirtualDID(data, onboardingRequestConfig),
    onSuccess: (response: any) => {
      const { data } = response;
      if (isLoginFlow) {
        handleAlert({ text: data?.data?.message, type: 'success' });
        handleSetUser({
          ...data?.data?.result,
          token: data?.data?.result?.token || onboardingAccessToken,
        });
        navigate('/dashboard', { replace: true });
        window.location.reload();
      } else {
        setIsAccountCreated(true);
      }
    },
  });

  /* Reserving is deliberately NOT done on the buy path.

     DIDWW removes a reserved DID from `available_dids`, and the order path
     (createOrderInternal -> findDID) looks the DID up in `available_dids` to
     resolve its SKU. So reserving a number three seconds before ordering it
     made every purchase fail - as a 404 that the backend then reported as
     "DID provider timeout", which it never was.

     Proven 7 Sep 2026 against the live provider: a DID holding a live
     reservation returns 404, and the very same DID returns 200 once the hold
     lapses. There is no payment step between Add Number and Confirm, so a hold
     buys nothing here anyway.

     The mutation is kept rather than deleted: once the backend resolves the SKU
     from the reservation instead of from `available_dids`, reserving becomes
     safe again and this is a one-line restore. */
  const { isPending } = useMutation({
    mutationKey: ['reserveDid'],
    mutationFn: (data: any) => reserveDid(data, onboardingRequestConfig),
    onSuccess: () => {
      setIsDIDBuy(true);
    },
  });

  const { mutate: mutateReserveDidQuantity, isPending: quantityPending } = useMutation({
    mutationKey: ['reserveDidQuantity'],
    mutationFn: (data: any) => reserveDidQuantity(data, onboardingRequestConfig),
    onSuccess: () => {
      setIsDIDBuy(true);
    },
  });
  const isLoading = [isPending, quantityPending].some((v) => v);

  const onSubmit = () => {
    if (watchIsQuantity) {
      mutateReserveDidQuantity({
        sku_id: watchGroupId?.sku_id,
        quantity: watchQuantity?.value,
        did_id: watchGroupId?.value,
      });
    } else {
      // Straight to the confirm step - no reservation, for the reason above.
      setIsDIDBuy(true);
    }
  };

  const columns = [
    {
      header: 'Select',
      accessorKey: 'prefix',
      cell: ({ row: { original } = {} }: any) => {
        const features = original?.features;
        const radioValue = {
          name: original?.prefix,
          value: original?.id,
          sku_id: original?.sku_id,
        };
        return (
          <div className=" flex justify-center items-center">
            <RadioGroup
              value={JSON.stringify(watchGroupId)}
              onValueChange={(val) => {
                const parsed = JSON.parse(val);
                setValue('groupId', parsed, { shouldValidate: true });
                setFeatures(features);
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
                <CustomTooltip text={featuresObj[v]}>
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

  const isShowTable = selectedCountryIso && watchRegion?.value && watchCity?.value;
  const showSubmitBtn = watchDIDNumber.value || (watchGroupId && watchIsQuantity);

  useEffect(() => {
    setValue('did_number', { label: '', value: '' });
    if (didAvailableData?.length === 0) {
      setValue('isQuantity', true);
    } else {
      setValue('isQuantity', false);
    }
  }, [didAvailableData]);

  useEffect(() => {
    if (!watchLocation?.value) return;

    const selectedLocation = locationOptions.find(
      (location: any) => location.value === watchLocation?.value,
    );
    if (selectedLocation) return;

    setValue('location', initialValues.location, { shouldValidate: false });
    setValue('did_type', { label: 'Select', value: '' }, { shouldValidate: false });
    setValue('region', { label: 'Select', value: '' }, { shouldValidate: false });
    setValue('city', { label: 'Select', value: '' }, { shouldValidate: false });
    setValue('groupId', { label: '', value: '', sku_id: '' }, { shouldValidate: false });
    setValue('did_number', { label: '', value: '' }, { shouldValidate: false });
    setFeatures([]);
  }, [locationOptions, setValue, watchLocation?.value]);

  return (
    <div className="w-full flex h-full">
      <section className="w-2/5 bg-white">
        <div className="m-auto h-full flex flex-col gap-16 items-center justify-center">
          <form className="flex flex-col pb-8 p-8 bg-white gap-3">
            <h3 className="text-2xl font-semibold">Choose a main number for your account</h3>
            <div className={`flex flex-col border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-xl p-3 gap-2`}>
              <div className="flex flex-col gap-4 py-4">
                {!hideCountryPicker && (
                <CustomSelect
                  label="Country"
                  placeholder="Select Country"
                  options={locationOptions}
                  handleChange={(location) => {
                    setValue('location', location, { shouldValidate: true });
                    setValue('did_type', { label: 'Select', value: '' });
                    setValue('region', { label: 'Select', value: '' });
                    setValue('city', { label: 'Select', value: '' });
                    setValue('groupId', { label: '', value: '', sku_id: '' });
                    setValue('did_number', { label: '', value: '' });
                    setFeatures([]);
                  }}
                  value={watchLocation}
                  isLoading={isPlanInfoLoading || isFallbackCountryListLoading}
                />
                )}

                {/* The type is asked as two cards inside the picker below, the
                    same way /get-started asks it. Kept mounted but hidden so the
                    form state and validation are untouched. */}
                <div className="hidden">
                <CustomSelect
                  label="DID Type"
                  placeholder="Select DID Type"
                  options={didTypeOptions}
                  handleChange={(didType) => {
                    setValue('did_type', didType, { shouldValidate: true });
                    setValue('region', { label: 'Select', value: '' });
                    setValue('city', { label: 'Select', value: '' });
                    setValue('groupId', { label: '', value: '', sku_id: '' });
                    setValue('did_number', { label: '', value: '' });
                    setFeatures([]);
                  }}
                  error={errors?.did_type?.message || errors?.did_type?.value?.message}
                  value={watchDIDType}
                  isLoading={didTypeListLoading}
                  isDisabled={!selectedCountryIso}
                />
                </div>

                {!servedFromStock && (
                <>
                <CustomSelect
                  label="Region"
                  placeholder="Select Region"
                  options={dataRegionList?.map((item: any) => ({
                    label: item?.name,
                    value: item?.id,
                  }))}
                  handleChange={(val) => {
                    setValue('region', val, {
                      shouldValidate: true,
                    });
                    setValue('city', { label: 'Select', value: '' });
                    setValue('groupId', { label: '', value: '', sku_id: '' });
                    setValue('did_number', { label: '', value: '' });
                    setFeatures([]);
                  }}
                  error={errors?.region?.message || errors?.region?.value?.message}
                  isLoading={regionListLoading}
                  isDisabled={!selectedCountryIso || !watchDIDType?.value}
                  value={watchRegion}
                />

                {watchRegion?.value && (
                  <CustomSelect
                    label={'Area Code'}
                    placeholder="Select Area Code"
                    options={dataCityList?.map((item: any) => ({
                      label: item?.npanxx,
                      value: item?.id,
                    }))}
                    handleChange={(val) => {
                      setValue('city', val, {
                        shouldValidate: true,
                      });

                      setValue('groupId', { label: '', value: '', sku_id: '' });
                      setValue('did_number', { label: '', value: '' });
                    }}
                    error={errors?.city?.message || errors?.city?.value?.message}
                    value={watchCity}
                    isLoading={cityListLoading}
                  />
                )}
                </>
                )}
              </div>
            </div>
            {/* <p className="text-sm text-gray-800 font-normal">
              Once your account is activated, you can transfer existing phone number.
            </p> */}
          </form>
        </div>
      </section>
      <section className="w-3/5 h-full flex items-center overflow-auto">
        <div className="p-8 flex flex-col gap-4  w-full  m-auto">
          <h3 className="text-xl font-semibold">Virtual DID Numbers</h3>

          <div className="w-full flex items-center gap-3">
            <div className="flex  flex-col gap-4 w-full">
              {isShowTable ? (
                <div className="w-full relative bg-white rounded-xl p-3">
                  {errors?.groupId?.value?.message && (
                    <div className="text-[#DC5049] font-medium text-xs pb-1 absolute top-2">
                      {errors?.groupId?.value?.message}
                    </div>
                  )}
                  <TableManager
                    {...{
                      fetcherKey: [
                        'getDidGroup',
                        selectedCountryIso,
                        watchDIDType?.value,
                        watchRegion?.value,
                        watchCity?.value,
                      ],
                      fetcherFn: () =>
                        getDidGroup(
                          {
                            country_iso: selectedCountryIso,
                            group_type_id: [watchDIDType?.value],
                            region_id: watchRegion?.value,
                            nanpa_prefix_id: watchCity?.value,
                          },
                          onboardingRequestConfig,
                        ),
                      enabled: Boolean(isShowTable),
                      columns,
                      showPagination: false,
                      customClass: 'min-h-44',
                    }}
                  />
                </div>
              ) : null}

              <div className="w-full">
                {/* Stock has no area-code group to pick, so the list cannot wait
                    for one. Both of these gates were written for the carrier
                    flow, where a group and a region are how a number is found;
                    from our own shelf the numbers are already in hand. */}
                {(watchGroupId?.value || servedFromStock) && (
                  <>
                    <div className="flex flex-wrap mx-auto w-full gap-5">
                      {servedFromStock || (watchCity?.value && watchRegion?.value) ? (
                        <div className="w-full">
                          {errors?.did_number?.value?.message && (
                            <p className="pb-2 text-center text-xs font-medium text-red-500">
                              {errors.did_number.value.message}
                            </p>
                          )}
                          {/* The same picker the Add Number wizard uses, so
                              somebody buying their second number recognises the
                              screen they signed up on. */}
                          <NumberPicker
                            loading={isPendingAvailableDID || isFetchingAvailableDID}
                            heading="Choose your first phone number"
                            subheading="Within the US, and you can add more later"
                            numbers={(didAvailableData || []).map((item: any) => ({
                              id: String(item?.id),
                              number: String(item?.number),
                              area_code: item?.area_code ?? null,
                              area_name: item?.area_name ?? null,
                              region_name: item?.region_name ?? null,
                              from_inventory: Boolean(item?.from_inventory),
                            }))}
                            selectedId={watchDIDNumber?.value ? String(watchDIDNumber.value) : null}
                            onSelect={(item) => {
                              setValue('did_number', { label: item.number, value: item.id });
                            }}
                            types={didTypeOptions.map((t: any) => ({ label: t.label, value: t.value }))}
                            selectedType={watchDIDType?.value ? watchDIDType : null}
                            onTypeChange={(t) => {
                              setValue('did_type', t, { shouldValidate: true });
                              setValue('did_number', { label: '', value: '' });
                            }}
                            emptyMessage="No number is available right now. Please try again shortly."
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg m-auto border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 text-center">
                          <h5 className="text-base text-[#2E2D35] font-normal w-full text-center flex justify-center">
                            Choose a number for your account
                          </h5>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {showSubmitBtn && (
            <Button
              onClick={() => onSubmit()}
              className="m"
              disabled={isLoading || !watchDIDNumber?.value}
              variant={'outline'}
            >
              Add Number
            </Button>
          )}
        </div>
      </section>

      <AlertConfirm
        {...{
          apiLoading: isPendingBuyVirtualDID,
          onCancel: () => {
            setIsDIDBuy(false);
            // navigate('/');
          },
          onConfirm: () => {
            if (!onboardingCompanyUuid) {
              handleAlert({
                text: 'Company information is unavailable. Please refresh and try again.',
                type: 'error',
              });
              return;
            }

            const payload = {
              caller_id: String(watchDIDNumber?.label),
              did_id: [String(watchDIDNumber?.value)],
              uuid: signUpResponseData?.current?.uuid || user?.uuid,
              company_uuid: onboardingCompanyUuid,
              type: isLoginFlow ? 'login' : 'signup',
              device_id: getDeviceId(),
              // country: selectedCountryIso,
              // did_type: 'FREE',
              // state: watchRegion?.value,
              // city: watchCity?.value,
              // site: '5d65c3f1-e9dc-4c22-abec-f674e7ddb7a3',
              callback_url: `${getEnv()?.VITE_API_BASE_URL}/api/didw/callback`,
              features: Array.isArray(features) ? features : [],
            };
            mutateBuyVirtualDID(payload);
          },
          open: !!isDIDBuy,
          setOpen: setIsDIDBuy,
          headerText: 'Confirm Number',
          descriptionTextComp: (
            <div className="text-md">Do you want to proceed with this DID number?</div>
          ),
        }}
      />

      <Dialog open={isAccountCreated} onOpenChange={setIsAccountCreated}>
        <DialogContent
          className="w-2/5 p-3"
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <AccountCreatedPopup />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhoneLines;
