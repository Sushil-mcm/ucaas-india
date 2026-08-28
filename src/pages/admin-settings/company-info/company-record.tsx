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
  /* Set once the server has actually refused a save. The explanation below is
     shown only then — stating it up front would be guessing about a deployment
     we cannot see from the browser, and on an install where the endpoint does
     work the note would simply be wrong. */
  const [serverRefused, setServerRefused] = useState(false);
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { dirtyFields },
  } = useForm<any>({
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
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403) setServerRefused(true);
      handleAlert({
        text:
          status === 401 || status === 403
            ? 'The server will not let a company administrator change these details. Your session is fine — this needs a change on the API side. Nothing was saved.'
            : error?.response?.data?.message ||
              error?.response?.data?.error?.message ||
              'Could not save the company details. Nothing was changed.',
        type: 'error',
      });
    },
  });

  /* Only the fields the admin actually edited are sent, and a field left alone
     is omitted rather than sent empty.
     
     This matters more than it looks. The session's company_info carries the
     address but NOT name, city, state, country or postal code, so those seed
     as blank no matter what the company record holds. Sending them anyway meant
     an admin correcting one line of the street address also wrote '' over four
     columns they had never seen — Sequelize strips `undefined` before writing
     but treats '' as a real value. The name is worse: it seeds from the main
     location's name, because the company's own name cannot be read, so an
     untouched save would have written the location name onto the company.
     
     Omitting untouched fields makes both harmless. */
  const onSubmit = (values: any) => {
    if (!uuid) return;

    const payload: Record<string, any> = { uuid };
    if (dirtyFields.name) payload.name = values.name;
    if (dirtyFields.address) payload.address = values.address;
    if (dirtyFields.postal_code) payload.postal_code = values.postal_code;
    /* Codes for country and state, matching what signup wrote; cities have no
       code so the name is the value. */
    if (dirtyFields.country) payload.country = values.country?.value || '';
    if (dirtyFields.state) payload.state = values.state?.value || '';
    if (dirtyFields.city) payload.city = values.city?.value || '';

    if (Object.keys(payload).length === 1) {
      return handleAlert({ text: 'Nothing has been changed.', type: 'info' });
    }

    save(payload as any);
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
          {/* Editing is back. The reason it was hidden was not the form but the
              consequence of failing: /api/admin/company/upsert may be gated to
              platform staff, and a 401 used to tear the session down, so pressing
              Save logged the admin out. That call now opts out of the session
              teardown (see `allowUnauthorized` in services/api/axios.tsx), so the
              worst case is a clear message instead of being thrown to the login
              screen. */}
          {!isEditing && (
            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
              Edit details
            </Button>
          )}
        </div>
      </div>

      {/* Where the name on this card actually comes from, and what can be done
          about it today. Signup names the main location after the company, and
          the session does not carry the company's own name — so the name above
          is the main location's. That one IS editable, which is a real fix for
          a wrong name on screen. It is deliberately not described as renaming
          the company: invoices and number purchases read the company record,
          which keeps the old name until the API allows a change. */}
      {serverRefused && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-gray-900">
            These details cannot be changed from here yet
          </p>
          <p className="mt-1 text-xs text-gray-700">
            The name shown above is your main location&rsquo;s name, and you{' '}
            <strong>can</strong> change that — edit the main location below and the name here
            follows. That corrects what everyone sees.
          </p>
          <p className="mt-1 text-xs text-gray-700">
            Your registered address is held on a separate billing record, which only your provider
            can change today. Invoices and number purchases read that record, so ask them to update
            it if it is wrong.
          </p>
        </div>
      )}

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
