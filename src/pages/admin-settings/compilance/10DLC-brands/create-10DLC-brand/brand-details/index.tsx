import { Controller, UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/custom/custom-select';
import { entityTypes, stockExchangeArr, usStates, verticalArr } from '../../constant';
import { getObjectLength } from '@/lib/utils';
import PhoneInput from 'react-phone-input-2';
import { Label } from '@/components/ui/label';
import ErrorTooltip from '@/components/custom/error-tooltip';

const BrandDetails = ({ formMethods }: { formMethods: UseFormReturn<any> }) => {
  const {
    setValue,
    register,
    control,
    watch,
    formState: { errors },
  } = formMethods;

  const [wAltBusinessIdType, wCountry, wEntityType] = watch([
    'altBusinessIdType',
    'country',
    'entityType',
  ]);

  const entityTypeValue = wEntityType?.value;
  const isSoleProprietor = entityTypeValue === 'SOLE_PROPRIETOR';
  const isPublicProfit = entityTypeValue === 'PUBLIC_PROFIT';

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh_-_16rem)] overflow-auto pr-1 ten-dlc-brand-step-scroll">
      <div className="grid grid-cols-1 sm:grid-cols-2 w-full gap-4 ">
        {/* {!isSoleProprietor && ( */}
        <Controller
          name="companyName"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Legal Company Name"
              placeholder="Enter Legal company name"
              onChange={(e) => {
                field.onChange(e.target.value);
                setValue('displayName', e.target.value, { shouldValidate: true });
              }}
              error={errors?.companyName?.message}
            />
          )}
        />
        {/* )} */}

        <Input
          label="DBA or Brand Name"
          placeholder="Enter DBA or brand name"
          {...register('displayName')}
          error={errors?.displayName?.message}
        />

        <Controller
          name="entityType"
          control={control}
          render={({ field }) => (
            <CustomSelect
              label="What type of legal form is the organization?"
              placeholder="Select an entity"
              value={field.value}
              handleChange={(v) => {
                field.onChange(v);
                const newEntityType = v?.value;

                // Clear PUBLIC_PROFIT specific fields if not PUBLIC_PROFIT
                if (newEntityType !== 'PUBLIC_PROFIT') {
                  setValue('stockSymbol', '');
                  setValue('stockExchange', null);
                }

                // Clear SOLE_PROPRIETOR specific fields if not SOLE_PROPRIETOR
                if (newEntityType !== 'SOLE_PROPRIETOR') {
                  setValue('firstName', '');
                  setValue('lastName', '');
                  setValue('mobilePhone', '');
                }

                // Clear non-SOLE_PROPRIETOR fields if SOLE_PROPRIETOR
                if (newEntityType === 'SOLE_PROPRIETOR') {
                  setValue('companyName', '');
                  setValue('ein', '');
                  setValue('einIssuingCountry', null);
                }
              }}
              options={entityTypes.map((v) => ({ value: v, label: v }))}
              error={errors?.entityType?.message}
            />
          )}
        />

        <Controller
          name="country"
          control={control}
          render={({ field }) => (
            <CustomSelect
              label="Country of Registration"
              placeholder="Select a country"
              value={field.value}
              handleChange={(v) => {
                field.onChange(v);
                setValue('einIssuingCountry', v);
              }}
              options={[{ value: 'US', label: 'United States' }]}
              error={errors?.country?.message}
            />
          )}
        />

        {!isSoleProprietor && (
          <>
            <Input
              label="Tax Number/ID/EIN"
              placeholder="Enter EIN"
              {...register('ein')}
              error={errors?.ein?.message}
              type="number"
            />

            <Controller
              name="einIssuingCountry"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  label="Tax Number/ID/EIN Issuing Country"
                  placeholder="Select issuing country"
                  value={field.value}
                  handleChange={field.onChange}
                  options={[{ value: 'US', label: 'United States' }]}
                  error={errors?.einIssuingCountry?.message}
                />
              )}
            />
          </>
        )}
        <Controller
          name="altBusinessIdType"
          control={control}
          render={({ field }) => (
            <CustomSelect
              label="DUNS OR GIIN OR LEI Number"
              placeholder="Select option"
              value={field.value}
              handleChange={field.onChange}
              options={[
                { value: 'DUNS', label: 'DUNS' },
                { value: 'GIIN', label: 'GIIN' },
                { value: 'LEI', label: 'LEI' },
              ]}
              error={errors?.altBusinessIdType?.message}
            />
          )}
        />

        <Input
          label={`${getObjectLength(wAltBusinessIdType) ? wAltBusinessIdType?.value : ''} Number`}
          {...register('altBusinessId')}
          type="number"
          error={errors?.altBusinessId?.message}
        />

        <Input
          label="Address/Street"
          placeholder="Enter street address"
          {...register('street')}
          error={errors?.street?.message}
        />

        <Input
          label="City"
          placeholder="Enter city"
          {...register('city')}
          error={errors?.city?.message}
        />

        <Controller
          name="state"
          control={control}
          render={({ field }) => (
            <CustomSelect
              label="State"
              placeholder="Select state"
              value={field.value}
              handleChange={field.onChange}
              options={Object?.entries(usStates)?.map((v) => ({
                value: v[0],
                label: v[1],
              }))}
              error={errors?.state?.message}
            />
          )}
        />

        <Input
          label="ZIP code"
          placeholder="Enter postal code"
          {...register('postalCode')}
          error={errors?.postalCode?.message}
        />

        <Input label="Country" value={wCountry?.label} disabled error={errors?.country?.message} />

        <Input
          label={isPublicProfit ? 'Website/Online Presence *' : 'Website/Online Presence'}
          placeholder="Enter website URL"
          {...register('website')}
          error={errors?.website?.message}
        />

        <Controller
          name="stockExchange"
          control={control}
          render={({ field }) => (
            <CustomSelect
              label="Stock Exchange"
              placeholder="Select stock exchange"
              value={field.value}
              handleChange={field.onChange}
              options={stockExchangeArr.map((v) => ({ label: v, value: v }))}
              isDisabled={wEntityType?.value != 'PUBLIC_PROFIT'}
              error={errors?.stockExchange?.message}
            />
          )}
        />

        <Input
          label="Stock Symbol"
          {...register('stockSymbol')}
          disabled={wEntityType?.value != 'PUBLIC_PROFIT'}
          error={errors?.stockSymbol?.message}
        />

        {!isSoleProprietor && (
          <Controller
            name="vertical"
            control={control}
            render={({ field }) => (
              <CustomSelect
                label="Vertical Type *"
                placeholder="Select"
                value={field.value}
                handleChange={field.onChange}
                options={verticalArr}
                error={errors?.vertical?.message}
              />
            )}
          />
        )}

        <Input
          label={isSoleProprietor ? 'Reference ID *' : 'Reference ID'}
          placeholder="Enter Reference ID"
          {...register('referenceId')}
          error={errors?.referenceId?.message}
        />

        {isSoleProprietor && (
          <>
            <Input
              label="First Name *"
              {...register('firstName')}
              error={errors?.firstName?.message}
            />
            <Input
              label="Last Name *"
              {...register('lastName')}
              error={errors?.lastName?.message}
            />
          </>
        )}

        {isSoleProprietor && (
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <Label>Mobile Phone * (Required for OTP)</Label>
              <div className="flex items-start ">
                {' '}
                {errors?.mobilePhone?.message && (
                  <ErrorTooltip text={errors?.mobilePhone?.message} />
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Controller
                name="mobilePhone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    country={'us'}
                    countryCodeEditable={false}
                    containerClass={errors?.mobilePhone?.message ? 'phone-error' : ''}
                  />
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandDetails;
