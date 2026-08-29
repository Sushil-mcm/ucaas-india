import { requiredAllString, requiredString, selectFieldRequired } from '@/lib/schema';
import * as yup from 'yup';
import { postcodeValidator, postcodeValidatorExistsForCountry } from 'postcode-validator';
import countryList from '@/lib/countries.json';

export const upsertSiteSchema = yup.object().shape({
  name: yup.string().when('$currentStep', {
    is: 1,
    then: () => requiredString('Name', 2, 50),
    otherwise: (schema) => schema,
  }),
  address: yup.string().when('$currentStep', {
    is: 1,
    then: () =>
      yup
        .string()
        .required('Address is required')
        .matches(/^\S[\s\S]*\S$|^\S$/, 'Spaces not allowed')
        .matches(/[A-Za-z]/, 'Address must contain at least one letter')
        .min(2, 'Address must be at least 2 characters')
        .max(50, 'Address must not exceed 50 characters'),
    otherwise: (schema) => schema,
  }),
  state: yup.string().when('$currentStep', {
    is: 1,
    then: () => requiredAllString('State'),
    otherwise: (schema) => schema,
  }),
  city: yup.string().when('$currentStep', {
    is: 1,
    then: () => requiredAllString('City'),
    otherwise: (schema) => schema,
  }),
  country: yup.mixed().when('$currentStep', {
    is: 1,
    then: () => selectFieldRequired('Country'),
    otherwise: (schema) => schema,
  }),
  postal_code: yup.string().when('$currentStep', {
    is: 1,
    then: () =>
      yup
        .string()
        .required('Postal Code is required')
        .test(
          'valid-postal-code',
          'Enter a valid postal code for the selected country',
          function (value) {
            const postalCode = String(value || '').trim();
            if (!postalCode) return false;

            const countryName = String(this.parent?.country?.value || '').trim();
            if (!countryName) return true;

            const countryCode = String(
              countryList?.find((country) => country?.name === countryName)?.isoCode || '',
            )
              .trim()
              .toUpperCase();

            if (!countryCode) return postalCode.length >= 3;

            if (!postcodeValidatorExistsForCountry(countryCode)) {
              return postalCode.length >= 3;
            }

            return postcodeValidator(postalCode, countryCode);
          },
        ),
    otherwise: (schema) => schema,
  }),
  /* Deliberately not required. Every existing location was saved as CUSTOM with
     no name — the column default, from the years the caller ID step was
     commented out — so requiring a name here trapped anyone opening an old
     location: the save was refused over a field that does nothing to calls, with
     the error landing beside a Location Name box that often holds the company
     name. A blank custom name is normalised to the company main number on save
     instead, which heals the old records as people touch them. */
  caller_id_name: yup.string().when('$currentStep', {
    is: 1,
    then: () =>
      yup
        .string()
        .max(15, 'Caller ID name must not exceed 15 characters')
        .transform((value) => (value === '' ? undefined : value))
        .optional(),
    otherwise: (schema) => schema,
  }),

  timezone: yup.mixed().when('$currentStep', {
    is: 1,
    then: () =>
      yup
        .object({
          label: yup.string().required(),
          value: yup.string().required(),
        })
        .required('Timezone is required')
        .typeError('Timezone is required'),
    otherwise: (schema) => schema.nullable(),
  }),
});
