import { requiredString } from '@/lib/schema';
import {
  facebookValidation,
  instagramValidation,
  linkedinValidation,
  telegramValidation,
  twitterValidation,
  whatsappValidation,
} from '@/lib/utils';
import countryList from '@/lib/countries.json';
import { postcodeValidator, postcodeValidatorExistsForCountry } from 'postcode-validator';
import * as yup from 'yup';

export const newContactValidationSchema = yup.object().shape({
  id: yup.string().nullable(),
  first_name: requiredString('First name'),
  last_name: requiredString('Last name'),
  // email: requiredEmail(),
  email: yup
    .string()
    .nullable()
    .notRequired()
    .test('email-format', 'Invalid email format', (value) => {
      if (!value) return true; // skip validation if empty
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    })
    .max(50, 'Email must not exceed 50 characters'),
  phone: yup
    .string()
    .required('Phone is required')
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone cannot exceed 15 digits'),
  webpage: yup.string().nullable().notRequired().url('Enter a valid URL'),
  // company: yup.string().required('Company is required'),
  // street: yup.string().required('Street is required'),
  // city: yup.string().required('City is required'),
  // state: yup.string().required('State is required'),
  zipcode: yup
    .string()
    .nullable()
    .notRequired()
    .test(
      'valid-postal-code',
      'Enter a valid postal code for the selected country',
      function (value) {
        const postalCode = String(value || '').trim();
        if (!postalCode) return true;

        const selectedCountry = this.parent?.country;
        const countryValue =
          typeof selectedCountry === 'object'
            ? selectedCountry?.value || selectedCountry?.label
            : selectedCountry;
        const countryCode = countryList.find(
          (country) => country.isoCode === countryValue || country.name === countryValue,
        )?.isoCode;

        // Country is optional for contacts. Preserve the existing validation until one is selected.
        if (!countryCode) return /^[a-zA-Z0-9]{5,10}$/.test(postalCode);

        if (!postcodeValidatorExistsForCountry(countryCode)) {
          return postalCode.length >= 3;
        }

        return postcodeValidator(postalCode, countryCode);
      },
    ),
  // country: yup.object().shape({
  // value: yup.string().required('Country is required'),
  // }),

  twitter: twitterValidation(),
  facebook: facebookValidation(),
  linkedin: linkedinValidation(),
  whatsapp: whatsappValidation(),
  instagram: instagramValidation(),
  telegram: telegramValidation(),
  // belongsTo: yup.mixed().when('id', {
  //     is: (id: string) => !id,
  //     then: () =>
  //         yup
  //             .object()
  //             .shape({
  //                 value: yup.string().required('Select Group is required'),
  //             })
  //             .required('Select Group is required'),
  //     otherwise: () => yup.mixed().nullable().notRequired(),
  // }),
});
