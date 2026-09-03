import ErrorTooltip from '@/components/custom/error-tooltip';
import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { City, State } from 'country-state-city';
import { useEffect, useMemo, useRef } from 'react';
import countryList from '@/lib/countries.json';

/* Stored as an enum of three codes. An admin reading "BLANK" cannot tell that it
   means calls arrive with no number shown, so each is given its plain meaning. */
const CALLER_ID_OPTIONS = [
  { label: 'Company main number', value: 'MAIN' },
  { label: 'Custom name', value: 'CUSTOM' },
  { label: 'Withheld', value: 'BLANK' },
];

/* Stored, but not yet acted on. Nothing in the call path reads a location's
   caller ID — the number a person shows comes from their own record. Saying so
   is better than describing behaviour that does not happen. */
const CALLER_ID_HELP: Record<string, string> = {
  MAIN: 'Recorded against this location. Not applied to calls yet — see the note below.',
  CUSTOM: 'Recorded against this location. Not applied to calls yet — see the note below.',
  BLANK: 'Recorded against this location. Not applied to calls yet — see the note below.',
};

const CALLER_ID_NOTE =
  'What a person shows when calling out is currently taken from their own record, not from their location. This setting is saved for when location-level caller ID is switched on.';

const SiteInfo = ({ formInstance }: any) => {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = formInstance;

  const [watchedCountry, watchedState, watchedCity, watchedTimezone, watchedCallerIdType] = watch([
    'country',
    'state',
    'city',
    'timezone',
    'caller_id_type',
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
    const previousCountry = previousCountryValueRef.current;
    previousCountryValueRef.current = currentCountry;

    if (!currentCountry) return;

    /* Distinguishes a person changing the country from the form being filled in
       with a saved location. The guard used to fire on both, because loading an
       existing record looks like ''  ->  'India' — which cleared the state and
       city that had just been loaded, and overwrote the saved timezone with the
       country's first zone. That is why editing a location showed "Select State"
       and "Select City" on a record that had both. */
    const isRealCountryChange = Boolean(previousCountry) && previousCountry !== currentCountry;

    if (isRealCountryChange) {
      setValue('state', '');
      setValue('city', '');
    }

    const countryCode =
      countryList?.find((country) => country?.name === currentCountry)?.isoCode || '';
    const timezones =
      countryList?.find((country) => country?.isoCode === countryCode)?.timezones || [];

    /* Only filled in when there is nothing there, or when the country genuinely
       changed. A saved location keeps the timezone it was given — several
       countries have more than one, and picking the first would quietly move a
       branch to the wrong clock. */
    const hasTimezone = Boolean(watch('timezone')?.value);
    if (isRealCountryChange || !hasTimezone) {
      if (timezones.length > 0) {
        setValue(
          'timezone',
          { label: timezones[0].zoneName, value: timezones[0].zoneName },
          { shouldValidate: true, shouldDirty: true },
        );
      } else if (isRealCountryChange) {
        setValue('timezone', null);
      }
    }
  }, [watchedCountry?.value, setValue, watch]);

  useEffect(() => {
    const currentState = watchedState || '';
    const previousState = previousStateValueRef.current;
    previousStateValueRef.current = currentState;

    /* Same distinction as the country guard: '' -> 'Maharashtra' is a saved
       record being loaded, not somebody picking a different state, and clearing
       the city on load is what emptied it on every edit. */
    const isRealStateChange = Boolean(previousState) && previousState !== currentState;

    if (isRealStateChange && stateOptions?.length > 0) setValue('city', '');
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
            The name of this place — <span className="font-medium">Mumbai Office</span>,{' '}
            <span className="font-medium">London Branch</span>. Not your company name, which is
            shown at the top of Company &amp; Locations.
          </p>
        </div>
        <div className="flex w-full items-center gap-3">
          <div className="flex w-full gap-4">
            <div className="relative flex w-full gap-1">
              <Input
                label="Location Name"
                required
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
                  <Label required>Street Address</Label>
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
                  required
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
                    required
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
                    required
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
                  required
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
                  required
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
              <div className="relative flex w-full gap-1 md:w-1/2">
                <CustomSelect
                  label="Outbound caller ID"
                  placeholder="Select caller ID"
                  options={CALLER_ID_OPTIONS}
                  handleChange={(option: any) => {
                    const nextType = option?.value ?? option;
                    setValue('caller_id_type', nextType, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    /* A name only means something for CUSTOM. Clearing it on the
                       way out stops a hidden value being saved against a type
                       that never shows it. */
                    if (nextType !== 'CUSTOM') {
                      setValue('caller_id_name', '', { shouldValidate: true });
                    }
                  }}
                  value={
                    CALLER_ID_OPTIONS.find((option) => option.value === watchedCallerIdType) || null
                  }
                  error={errors?.caller_id_type?.message}
                  menuPlacement="top"
                />
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-3">
            <div className="flex w-full flex-col gap-4 md:flex-row">
              <div className="relative flex w-full gap-1 md:w-1/2">
                {watchedCallerIdType === 'CUSTOM' && (
                  <Input
                    label="Name to show"
                    {...register('caller_id_name')}
                    error={errors?.caller_id_name?.message}
                    placeholder="Enter caller ID name"
                    maxLength={15}
                  />
                )}
              </div>
              <div className="relative flex w-full gap-1 md:w-1/2" />
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
            <p className="text-xs text-gray-700">
              {CALLER_ID_HELP[watchedCallerIdType] || CALLER_ID_HELP.MAIN}
            </p>
            <p className="mt-1 text-xs text-gray-500">{CALLER_ID_NOTE}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteInfo;
