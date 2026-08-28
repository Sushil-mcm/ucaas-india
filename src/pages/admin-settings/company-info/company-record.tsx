/* The company itself, above the list of places it works from.
 *
 * Genesys and Dialpad both separate the organisation from its locations, and
 * both put the organisation first: name, address, and the ID that support asks
 * for. MCM stores all of that on the `companies` record and showed none of it —
 * the page opened straight into the location list, so an admin had no way to see
 * their own company details, or the ID to quote when raising a ticket.
 *
 * It is editable through `/api/admin/company/upsert`, which has existed all
 * along and which nothing in the app had ever called. That is why the company
 * name could be typed once at signup and never corrected afterwards.
 *
 * Only the fields on this form are sent. The controller builds its update object
 * with `plan_features` and `allow_country` always present, so omitting them
 * leaves them `undefined` — and Sequelize's static update strips undefined
 * values before writing (verified against 6.37.8 on the server). Sending them
 * back instead would risk re-transforming `allow_country`, which the controller
 * expands when it arrives as an array.
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Building2, Check, Copy } from 'lucide-react';
import { City, State } from 'country-state-city';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/custom/custom-select';
import countryList from '@/lib/countries.json';
import { upsertCompany } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

/* Signup stores ISO codes — `IN`, `MH` — so every existing company record holds
   codes rather than names. The selects show the readable name and save the code,
   which keeps this form consistent with the eighteen records already there and
   with whatever reads them. Cities have no ISO code and are stored by name. */
type Option = { label: string; value: string };

const COUNTRY_OPTIONS: Option[] = (countryList || []).map((country: any) => ({
  label: country?.name || '',
  value: country?.isoCode || '',
}));

interface CompanyRecordProps {
  companyInfo?: any;
  /* The default location, used only as a fallback source for the company name —
     see below. */
  defaultSite?: any;
}

const Field = ({ label, value }: { label: string; value?: string }) => (
  <div className="space-y-0.5">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900 break-words">{value?.trim() ? value : '—'}</p>
  </div>
);

const CompanyRecord = ({ companyInfo, defaultSite }: CompanyRecordProps) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { refetch } = useUser();

  const uuid = companyInfo?.uuid || '';

  /* DELIBERATELY NOT FETCHED.
     `/api/admin/company/info/:uuid` and `/api/admin/company/upsert` both sit
     behind AdminMiddleware, which resolves the token against the `admins` table.
     That table holds platform staff — zero tenant users are in it — so every
     customer admin gets a 401, and the axios interceptor turns any 401 into a
     forced logout. Calling either endpoint from a customer-facing page ends the
     session merely by visiting it. Until there is a tenant-scoped company
     endpoint (deriving company_uuid from the token rather than the body), this
     panel reads only what the session already carries. */
  const record = companyInfo || {};
  /* The session's company_info carries `address` but not `name`, and the endpoint
     that does return the name is platform-admin only — calling it logged every
     customer out. Signup creates the default location named after the company, so
     that name is used instead. Verified across every company on the account: the
     two match exactly. It would drift only if somebody renamed their main
     location, which is a visible, reversible action. */
  const name = record?.name || record?.company_name || defaultSite?.name || '';

  const { register, handleSubmit, reset, watch, setValue } = useForm<any>({
    defaultValues: {
      name: '',
      address: '',
      postal_code: '',
      country: null,
      state: null,
      city: null,
    },
  });

  const country: Option | null = watch('country');
  const stateValue: Option | null = watch('state');

  const stateOptions: Option[] = useMemo(() => {
    if (!country?.value) return [];
    return (State.getStatesOfCountry(country.value) || []).map((item) => ({
      label: item.name,
      value: item.isoCode,
    }));
  }, [country?.value]);

  const cityOptions: Option[] = useMemo(() => {
    if (!country?.value || !stateValue?.value) return [];
    return (City.getCitiesOfState(country.value, stateValue.value) || []).map((item) => ({
      label: item.name,
      value: item.name,
    }));
  }, [country?.value, stateValue?.value]);

  /* Re-seeded whenever the record changes or the form is opened, so cancelling
     and reopening shows the saved values rather than the abandoned edit. */
  useEffect(() => {
    /* Stored values are codes. They are matched back to a readable name so the
       select shows "India" rather than "IN"; if a code is not recognised the
       stored value is kept as its own label rather than silently blanked. */
    const storedCountry = `${record?.country || ''}`.trim();
    const countryOption =
      COUNTRY_OPTIONS.find((option) => option.value === storedCountry) ||
      (storedCountry ? { label: storedCountry, value: storedCountry } : null);

    const storedState = `${record?.state || ''}`.trim();
    const statesForCountry = countryOption?.value
      ? State.getStatesOfCountry(countryOption.value) || []
      : [];
    const matchedState = statesForCountry.find((item) => item.isoCode === storedState);
    const stateOption = matchedState
      ? { label: matchedState.name, value: matchedState.isoCode }
      : storedState
        ? { label: storedState, value: storedState }
        : null;

    const storedCity = `${record?.city || ''}`.trim();

    reset({
      name,
      address: record?.address || '',
      postal_code: record?.postal_code || '',
      country: countryOption,
      state: stateOption,
      city: storedCity ? { label: storedCity, value: storedCity } : null,
    });
  }, [companyInfo, isEditing, name, reset]);

  /* Shown with the readable country name rather than the stored code, so the
     summary does not read "Mumbai, MH, 400001, IN". */
  const countryName =
    COUNTRY_OPTIONS.find((option) => option.value === record?.country)?.label || record?.country;

  const addressLine = [record?.address, record?.city, record?.state, record?.postal_code, countryName]
    .map((part) => `${part ?? ''}`.trim())
    .filter(Boolean)
    .join(', ');

  const { mutate: save, isPending } = useMutation({
    mutationFn: upsertCompany,
    onSuccess: (response: any) => {
      handleAlert({
        text: response?.data?.data?.message || 'Company details saved.',
        type: 'success',
      });
      setIsEditing(false);
      refetch();
    },
  });

  const onSubmit = (values: any) => {
    if (!uuid) return;
    save({
      uuid,
      name: values.name,
      address: values.address,
      postal_code: values.postal_code,
      /* Codes for country and state, matching what signup wrote; cities have no
         code so the name is the value. */
      country: values.country?.value || '',
      state: values.state?.value || '',
      city: values.city?.value || '',
    });
  };

  const handleCopyId = async () => {
    if (!uuid) return;
    try {
      await navigator.clipboard.writeText(uuid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Refused in some browsers and over plain http. The id is on screen
         anyway, so there is nothing to recover from. */
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ucass-primary-200 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">{name || 'Your company'}</p>
            <p className="text-xs text-gray-500">
              The company record. Every location below belongs to it.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {uuid && (
            <button
              type="button"
              onClick={handleCopyId}
              title="Copy company ID"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? 'Copied' : 'Company ID'}
            </button>
          )}
          {/* Edit is hidden for the same reason the fetch was removed: the only
              save endpoint, /api/admin/company/upsert, is behind AdminMiddleware
              and 401s for every customer — and a 401 force-logs them out. The
              form below is kept intact and re-enables the moment a tenant-scoped
              endpoint exists. */}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Company name" placeholder="Enter company name" {...register('name')} />
            <Input label="Street address" placeholder="Enter address" {...register('address')} />

            <CustomSelect
              label="Country"
              placeholder="Select country"
              options={COUNTRY_OPTIONS}
              value={country}
              handleChange={(option: any) => {
                setValue('country', option || null);
                /* State and city belong to the old country, so they are cleared
                   rather than left pointing somewhere that no longer exists. */
                setValue('state', null);
                setValue('city', null);
              }}
            />

            <CustomSelect
              label="State / region"
              placeholder={country ? 'Select state' : 'Choose a country first'}
              options={stateOptions}
              value={stateValue}
              isDisabled={!country}
              handleChange={(option: any) => {
                setValue('state', option || null);
                setValue('city', null);
              }}
            />

            <CustomSelect
              label="City"
              placeholder={stateValue ? 'Select city' : 'Choose a state first'}
              options={cityOptions}
              value={watch('city')}
              isDisabled={!stateValue}
              handleChange={(option: any) => setValue('city', option || null)}
            />

            <Input
              label="Postal code"
              placeholder="Enter postal code"
              {...register('postal_code')}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="transparent" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save company details'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Company name" value={name} />
          <div className="lg:col-span-2">
            <Field label="Registered address" value={addressLine} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyRecord;
