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
  // caller_id_name: yup.string().when(['$currentStep', 'caller_id_type'], {
  //   is: (currentStep: any, caller_id_type: any) => currentStep === 2 && caller_id_type === 'CUSTOM',
  //   then: (schema) =>
  //     schema.required('Caller id name is required').matches(/^\S.*\S$|^\S$/, 'Spaces not allowed'),
  //   otherwise: (schema) => schema,
  // }),
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
