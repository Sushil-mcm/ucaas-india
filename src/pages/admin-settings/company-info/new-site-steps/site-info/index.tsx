import ErrorTooltip from '@/components/custom/error-tooltip';
import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { City, State } from 'country-state-city';
import { useEffect, useMemo, useRef } from 'react';
import countryList from '@/lib/countries.json';

const SiteInfo = ({ formInstance }: any) => {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = formInstance;

  const [watchedCountry, watchedState, watchedCity, watchedTimezone] = watch([
    'country',
    'state',
    'city',
    'timezone',
  ]);
  const shouldShowState = watchedState !== 'N/A';
  const shouldShowCity = watchedCity !== 'N/A';
  const previousCountryValueRef = useRef<string | null>(null);
  const previousStateValueRef = useRef<string | null>(null);

  const selectedCountryCode = useMemo(() => {
    return countryList?.find((country) => country?.name === watchedCountry?.value)?.isoCode || '';
  }, [watchedCountry?.value]);

  const stateOptions = useMemo(() => {
    if (!selectedCountryCode) return [];
    return State.getStatesOfCountry(selectedCountryCode)?.map((stateItem) => ({
      label: stateItem.name,
      value: stateItem.isoCode,
    }));
  }, [selectedCountryCode]);

  const selectedStateCode = useMemo(() => {
    return stateOptions?.find((stateItem: any) => stateItem?.label === watchedState)?.value || '';
  }, [stateOptions, watchedState]);

  const cityOptions = useMemo(() => {
    if (!selectedCountryCode || !selectedStateCode) return [];
    return City.getCitiesOfState(selectedCountryCode, selectedStateCode)?.map((cityItem) => ({
      label: cityItem.name,
      value: cityItem.name,
    }));
  }, [selectedCountryCode, selectedStateCode]);

  const timezonesList = useMemo(() => {
    if (!selectedCountryCode) return [];
    return (
      countryList?.find((country) => country?.isoCode === selectedCountryCode)?.timezones || []
    );
  }, [selectedCountryCode]);

  useEffect(() => {
    const currentCountry = watchedCountry?.value || '';
    if (previousCountryValueRef.current === null) {
      previousCountryValueRef.current = currentCountry;
      return;
    }

    if (previousCountryValueRef.current === currentCountry) return;
    previousCountryValueRef.current = currentCountry;

    setValue('state', '');
    setValue('city', '');

    const countryCode =
      countryList?.find((country) => country?.name === currentCountry)?.isoCode || '';
    const timezones =
      countryList?.find((country) => country?.isoCode === countryCode)?.timezones || [];
    if (timezones.length > 0) {
      setValue(
        'timezone',
        { label: timezones[0].zoneName, value: timezones[0].zoneName },
        { shouldValidate: true, shouldDirty: true },
      );
    } else {
      setValue('timezone', null);
    }
  }, [watchedCountry?.value, setValue]);

  useEffect(() => {
    const currentState = watchedState || '';
    if (previousStateValueRef.current === null) {
      previousStateValueRef.current = currentState;
      return;
    }

    if (previousStateValueRef.current === currentState) return;
    previousStateValueRef.current = currentState;

    if (stateOptions?.length > 0) setValue('city', '');
  }, [watchedState, stateOptions?.length, setValue]);

  useEffect(() => {
    if (!watchedCountry?.value) return;

    const noStates = stateOptions?.length === 0;
    const noCities = cityOptions?.length === 0;
    const hasSelectedState = Boolean(String(watchedState || '').trim());

    if (noStates) {
      setValue('state', 'N/A', { shouldDirty: false, shouldValidate: false });
      setValue('city', 'N/A', { shouldDirty: false, shouldValidate: false });
      return;
    }

    // Only mark city as N/A when a real state is selected and it has no cities.
    if (hasSelectedState && noCities) {
      setValue('city', 'N/A', { shouldDirty: false, shouldValidate: false });
    }
  }, [watchedCountry?.value, watchedState, stateOptions?.length, cityOptions?.length, setValue]);

  return (
    // <div className="flex flex-col gap-2 h-[calc(100vh_-_19rem)] overflow-auto">
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-5 border-b border-gray-200 py-4 sm:py-5">
        <div className="flex flex-col gap-1">
          <h5 className="font-semibold text-gray-900 text-md">General Location Info</h5>
          <p className="text-gray-500 text-sm">
            Enter an identifying name for this specific site or location.
          </p>
        </div>
        <div className="flex w-full items-center gap-3">
          <div className="flex w-full gap-4">
            <div className="relative flex w-full gap-1">
              <Input
                label="Location Name"
                {...register('name')}
                error={errors?.name?.message}
                placeholder={'Enter name'}
                maxLength={50}
              />
            </div>
            {/* <div className="flex flex-col w-full"></div> */}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h5 className="font-semibold text-gray-900 text-md">Physical Address</h5>
          <p className="text-gray-500 text-sm">Enter the geographical address for this site.</p>
        </div>
        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="flex w-full items-center gap-3">
            <div className="relative flex w-full gap-1">
              <div className="flex w-full flex-col gap-1.5">
                <div className="flex items-center justify-between gap-1">
                  <Label>Street Address</Label>
                  {errors?.address?.message && <ErrorTooltip text={errors?.address?.message} />}
                </div>
                <textarea
                  placeholder="Enter address"
                  {...register('address')}
                  rows={3}
                  className={`border w-full ${errors?.address?.message ? 'border-red-500' : 'border-gray-300'} rounded-xl text-sm resize-none p-3 hover:border-primary focus:border-primary focus-visible:border-primary focus-visible:outline-none text-gray-700`}
                />
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-3">
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div
                className={`relative flex w-full gap-1 ${shouldShowState ? 'md:w-1/2' : 'md:w-full'}`}
              >
                <CustomSelect
                  label={'Country'}
                  options={countryList?.map((country) => ({
                    label: country?.name || '',
                    value: country?.name || '',
                  }))}
                  handleChange={(value) => {
                    setValue('country', value, { shouldValidate: true, shouldDirty: true });
                  }}
                  value={watchedCountry}
                  placeholder={'Select Country'}
                  error={errors?.country?.message}
                />
              </div>
              {shouldShowState && (
                <div className="relative flex w-full gap-1 md:w-1/2">
                  <CustomSelect
                    label="State"
                    placeholder="Select State"
                    options={stateOptions || []}
                    handleChange={(value) => {
                      setValue('state', value?.label || '', {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                    value={
                      stateOptions?.find((stateItem: any) => stateItem?.label === watchedState) ||
                      (watchedState ? { label: watchedState, value: watchedState } : null)
                    }
                    error={errors?.state?.message}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex w-full items-center gap-3">
            <div className="flex w-full flex-col gap-4 md:flex-row">
              {shouldShowCity && (
                <div className="relative flex w-full gap-1 md:w-1/2">
                  <CustomSelect
                    label="City"
                    placeholder="Select City"
                    options={cityOptions || []}
                    handleChange={(value) => {
                      setValue('city', value?.value || '', {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                    value={
                      cityOptions?.find((cityItem: any) => cityItem?.value === watchedCity) ||
                      (watchedCity ? { label: watchedCity, value: watchedCity } : null)
                    }
                    error={errors?.city?.message}
                    menuPlacement="top"
                  />
                </div>
              )}
              <div
                className={`relative flex w-full gap-1 ${shouldShowCity ? 'md:w-1/2' : 'md:w-full'}`}
              >
                <Input
                  label="Postal Code"
                  {...register('postal_code')}
                  error={errors?.postal_code?.message}
                  placeholder={'Enter Postal Code'}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-3">
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="relative flex w-full gap-1 md:w-1/2">
                <CustomSelect
                  label="Timezone"
                  placeholder="Select Timezone"
                  options={timezonesList?.map((item: any) => ({
                    label: item?.zoneName,
                    value: item?.zoneName,
                  }))}
                  handleChange={(value) => {
                    setValue('timezone', value, { shouldValidate: true, shouldDirty: true });
                  }}
                  value={watchedTimezone}
                  error={errors?.timezone?.message}
                  menuPlacement="top"
                />
              </div>
              <div className="relative flex w-full gap-1 md:w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteInfo;
