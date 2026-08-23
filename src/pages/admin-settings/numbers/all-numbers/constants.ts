import MsgIncoming from '@/assets/images/email_outgoing_icon.png';
import MsgOutgoing from '@/assets/images/email_ongoing_icon.png';
import CallIncoming from '@/assets/images/call_outgoing.png';
import CallOutgoing from '@/assets/images/call_ongoing.png';
import * as yup from 'yup';
import { selectFieldRequired } from '@/lib/schema';

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

const shouldRequireStateAndAreaCode = (location: any, numberType: any) => {
  if (!location?.region_available) {
    return false;
  }

  if (['US', 'CA', 'GB'].includes(location?.value) && isTollFreeNumberType(numberType)) {
    return false;
  }

  return true;
};

export const featuresLookUp: any = {
  sms_in: MsgIncoming,
  sms_out: MsgOutgoing,
  voice_in: CallIncoming,
  voice_out: CallOutgoing,
};
export const featuresObj: any = {
  sms_in: 'SMS-IN',
  sms_out: 'SMS-OUT',
  voice_in: 'VOICE-IN',
  voice_out: 'VOICE-OUT',
};
export const DEFAULT_PRICE = {
  original_price: 20,
  type: 'MONTHLY',
  service_type: 'Toll-free',
  gst: 25,
  country: 'Canada',
};
export const DID_NUMBER_PRICE_LIST = [
  {
    original_price: 15,
    type: 'MONTHLY',
    service_type: 'Local',
    gst: 20,
    country: 'United States',
  },
  {
    original_price: 10,
    type: 'MONTHLY',
    service_type: 'Local',
    gst: 25,
    country: 'Canada',
  },
  {
    original_price: 15,
    type: 'MONTHLY',
    service_type: 'Mobile',
    gst: 20,
    country: 'United States',
  },
  {
    original_price: 10,
    type: 'MONTHLY',
    service_type: 'Mobile',
    gst: 25,
    country: 'Canada',
  },
  {
    original_price: 25,
    type: 'MONTHLY',
    service_type: 'Toll-free',
    gst: 20,
    country: 'United States',
  },
  {
    original_price: 20,
    type: 'MONTHLY',
    service_type: 'Toll-free',
    gst: 25,
    country: 'Canada',
  },
];

export const initialState = {
  did_name: '',
  numberType: null,
  location: null,
  state: null,
  areaCode: null,
  site: null,
  groupId: {},
  prefix: {},
  virtualNumbers: [],
  confirmOrder: false,
  quantity: 1,

  // CREATE IDENTITY
  type: { label: 'Personal', value: 'personal' },
  company_name: '',
  company_registration_number: '',
  vat_number: '',
  website: '',
  firstname: '',
  lastname: '',
  email: '',
  phone: '',
  tax_id: '',
  id_number: '',
  country: '',
  birth_place: '',
  day: '',
  month: '',
  year: '',
  description: '',
  proofs: [],
  supporting_documents: [],
  requirements_type: { label: 'Registration', value: 'registration' },
  requirements_country: '',
  number_type: '',
  // CREATE ADDRESS
  address_state: '',
  addressDescription: '',
};
export const GETSCHEMA: Record<1 | 2 | 3, yup.ObjectSchema<any>> = {
  1: yup.object().shape({
    did_name: yup
      .string()
      .required('DID name is required.')
      .min(2, 'DID name must be at least 2 characters.')
      .max(50, 'DID name cannot exceed 50 characters.'),

    site: selectFieldRequired('Site'),
    location: selectFieldRequired('Location'),
    numberType: selectFieldRequired('Number type'),

    state: yup.mixed().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { location, numberType } = schemaContext?.current || {};
        return shouldRequireStateAndAreaCode(location, numberType);
      },
      then: () =>
        yup.object({
          value: yup.string().required('State is required.'),
        }),
      otherwise: () => yup.mixed().nullable().notRequired(),
    }),
    areaCode: yup.mixed().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { location, numberType } = schemaContext?.current || {};
        return shouldRequireStateAndAreaCode(location, numberType);
      },
      then: () =>
        yup.object({
          value: yup.string().required('Area code is required.'),
        }),
      otherwise: () => yup.mixed().nullable().notRequired(),
    }),
    groupId: yup.object({
      value: yup.string().required('Prefix is required'),
    }),
    virtualNumbers: yup.array().when('$schemaContext', {
      is: (schemaContext: any) => {
        return !schemaContext?.current?.isQuantity;
      },
      then: (schema) =>
        schema
          .of(yup.object())
          .min(1, 'At least one DID is required.')
          .max(2, 'Maximum 2 DIDs can be bought at once.'),
      otherwise: (schema) => schema.notRequired(),
    }),
  }),
  2: yup.object().shape({
    // CREATE IDENTITY
    type: yup.mixed().when('$schemaContext', {
      is: (schemaContext: any) => {
        const needsRegistration = schemaContext?.current?.groupId?.needs_registration;
        return needsRegistration;
      },
      then: (schema) => schema.test('type-required', 'Prefix is required', (val: any) => !!val),
      otherwise: (schema) => schema.optional(),
    }),
    company_name: yup.mixed().when(['type', '$schemaContext'], {
      is: (typeVal: any, schemaContext: any) => {
        const needsRegistration = schemaContext?.current?.groupId?.needs_registration;
        const isBusiness = typeVal?.value === 'business';
        return needsRegistration && isBusiness;
      },
      then: (schema) =>
        schema.test('company-name-required', 'Company name is required', (val) => !!val),
      otherwise: (schema) => schema.optional(),
    }),
    company_registration_number: yup.mixed().when(['type', '$schemaContext'], {
      is: (typeVal: any, schemaContext: any) => {
        const needsRegistration = schemaContext?.current?.groupId?.needs_registration;
        const isBusiness = typeVal?.value === 'business';
        return needsRegistration && isBusiness;
      },
      then: (schema) =>
        schema.test('crn-required', 'Company registration number is required', (val) => !!val),
      otherwise: (schema) => schema.optional(),
    }),
    vat_number: yup.mixed().when(['type', '$schemaContext'], {
      is: (typeVal: any, schemaContext: any) => {
        const needsRegistration = schemaContext?.current?.groupId?.needs_registration;
        const isBusiness = typeVal?.value === 'business';
        return needsRegistration && isBusiness;
      },
      then: (schema) => schema.test('vat-required', 'VAT/TAX number is required', (val) => !!val),
      otherwise: (schema) => schema.optional(),
    }),
    website: yup.string().when(['type', '$schemaContext'], {
      is: (typeVal: any, schemaContext: any) => {
        const needsRegistration = schemaContext?.current?.groupId?.needs_registration;
        const isBusiness = typeVal?.value === 'business';
        return needsRegistration && isBusiness;
      },
      then: (schema) => schema.required('Company website is required'),
      otherwise: (schema) => schema.optional(),
    }),
    firstname: yup.string().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (s) => s.required('First name is required'),
      otherwise: (s) => s.optional(),
    }),
    lastname: yup.string().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (s) => s.required('Last name is required'),
      otherwise: (s) => s.optional(),
    }),
    phone: yup.string().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (s) => s.required('Phone is required'),
      otherwise: (s) => s.optional(),
    }),
    email: yup.string().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (s) => s.email('Invalid email').required('Email is required'),
      otherwise: (s) => s.optional(),
    }),
    tax_id: yup.string().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (s) => s.required('Tax ID is required'),
      otherwise: (s) => s.optional(),
    }),
    id_number: yup.string().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (s) => s.required('ID number is required'),
      otherwise: (s) => s.optional(),
    }),
    country: yup.mixed().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (schema) =>
        schema.test('country-required', 'Country of residence is required', (val: any) => {
          return !!val;
        }),
      otherwise: (schema) => schema.optional(),
    }),
    birth_place: yup.mixed().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (schema) =>
        schema.test('birth-place-required', 'Place of birth is required', (val: any) => {
          return !!val;
        }),
      otherwise: (schema) => schema.optional(),
    }),
    description: yup.string().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (s) => s.required('Description is required'),
      otherwise: (s) => s.optional(),
    }),
    day: yup
      .number()
      .nullable()
      .transform((value, originalValue) => (originalValue === '' ? null : value))
      .when('$schemaContext', {
        is: (schemaContext: any) => {
          const { groupId } = schemaContext?.current || {};
          return groupId?.needs_registration;
        },
        then: (s) =>
          s
            .typeError('Date must be a number')
            .required('Date is required')
            .min(1, 'Date must be between 1 and 31')
            .max(31, 'Date must be between 1 and 31'),
        otherwise: (s) => s.optional(),
      }),
    month: yup.mixed().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (s) =>
        s.test('required-month', 'Month is required', (val) => {
          return !!val;
        }),
      otherwise: (s) => s.optional(),
    }),
    year: yup
      .number()
      .nullable()
      .transform((value, originalValue) => (originalValue === '' ? null : value))
      .when('$schemaContext', {
        is: (schemaContext: any) => {
          const { groupId } = schemaContext?.current || {};
          return groupId?.needs_registration;
        },
        then: (s) =>
          s
            .typeError('Year must be a number')
            .required('Year is required')
            .min(1900, 'Enter a valid year')
            .max(new Date().getFullYear(), 'Year cannot be in the future'),
        otherwise: (s) => s.optional(),
      }),
    proofs: yup
      .array()
      .of(
        yup.object().shape({
          proof_type_id: yup
            .object({
              value: yup.string().required(),
              label: yup.string(),
            })
            .required('Proof type is required'),
          file: yup
            .mixed<File>()
            .transform((v) => (v === '' ? null : v))
            .required('File is required')
            .test('fileSize', 'File is too large', (value) => {
              return value && (value as File).size <= 5 * 1024 * 1024;
            })
            .test('fileType', 'Unsupported file format', (value) => {
              return (
                value &&
                ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(
                  (value as File).type,
                )
              );
            }),
        }),
      )
      .when('$schemaContext', {
        is: (schemaContext: any) => {
          const { groupId } = schemaContext?.current || {};
          return groupId?.needs_registration;
        },
        then: (s) => s.min(1, 'At least one proof is required'),
        otherwise: (s) => s.optional(),
      }),
    supporting_documents: yup
      .array()
      .of(
        yup.object().shape({
          supporting_document_template_id: yup
            .object({
              value: yup.string().required(),
              label: yup.string(),
            })
            .required('Supporting Document type is required'),

          file: yup
            .mixed<File>()
            .transform((v) => (v === '' ? null : v))
            .required('File is required')
            .test('fileSize', 'File is too large', (value) => {
              return value && (value as File).size <= 5 * 1024 * 1024;
            })
            .test('fileType', 'Unsupported file format', (value) => {
              return (
                value &&
                ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(
                  (value as File).type,
                )
              );
            }),
        }),
      )
      .when('$schemaContext', {
        is: (schemaContext: any) => {
          const { groupId } = schemaContext?.current || {};
          return groupId?.needs_registration;
        },
        then: (s) => s.min(1, 'At least one supporting document is required'),
        otherwise: (s) => s.optional(),
      }),
  }),
  3: yup.object().shape({
    // CREATE Address
    country: yup.mixed().when('$schemaContext', {
      is: (schemaContext: any) => {
        const { groupId } = schemaContext?.current || {};
        return groupId?.needs_registration;
      },
      then: (schema) =>
        schema.test('country-required', 'Country of residence is required', (val: any) => {
          return !!val;
        }),
      otherwise: (schema) => schema.optional(),
    }),
    city: yup
      .string()
      .transform((v) => (v === '' ? undefined : v))
      .trim()
      .required('City is required')
      .min(2, 'City must be at least 2 characters'),
    zipcode: yup
      .string()
      .transform((v) => (v === '' ? undefined : v))
      .trim()
      .required('Postal Code is required')
      .min(2, 'Postal Code must be at least 2 characters'),
    address: yup
      .string()
      .transform((v) => (v === '' ? undefined : v))
      .trim()
      .required('Address is required')
      .min(2, 'Address must be at least 2 characters'),
    address_state: yup
      .string()
      .transform((v) => (v === '' ? undefined : v))
      .trim()
      .required('State/Province/Region is required')
      .min(2, 'State/Province/Region must be at least 2 characters'),
    addressProofs: yup
      .array()
      .of(
        yup.object().shape({
          proof_type_id: yup
            .object({
              value: yup.string().required(),
              label: yup.string(),
            })
            .required('Proof type is required'),
          file: yup
            .mixed<File>()
            .transform((v) => (v === '' ? null : v))
            .required('File is required')
            .test('fileSize', 'File is too large', (value) => {
              return value && (value as File).size <= 5 * 1024 * 1024;
            })
            .test('fileType', 'Unsupported file format', (value) => {
              return (
                value &&
                ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(
                  (value as File).type,
                )
              );
            }),
        }),
      )
      .when('$schemaContext', {
        is: (schemaContext: any) => {
          const { groupId } = schemaContext?.current || {};
          return groupId?.needs_registration;
        },
        then: (s) => s.min(1, 'At least one proof is required'),
        otherwise: (s) => s.optional(),
      }),
  }),
};
export const identitiesUpdateSchema = yup.object().shape({
  type: yup.mixed().required('Type is required'),
  company_name: yup.mixed().when('type', {
    is: (typeVal: any) => typeVal?.value === 'business',
    then: (schema) =>
      schema.test('company-name-required', 'Company name is required', (val) => !!val),
    otherwise: (schema) => schema.optional(),
  }),
  company_registration_number: yup.mixed().when('type', {
    is: (typeVal: any) => typeVal?.value === 'business',
    then: (schema) =>
      schema.test('crn-required', 'Company registration number is required', (val) => !!val),
    otherwise: (schema) => schema.optional(),
  }),
  vat_number: yup.mixed().when('type', {
    is: (typeVal: any) => typeVal?.value === 'business',
    then: (schema) => schema.test('vat-required', 'VAT/TAX number is required', (val) => !!val),
    otherwise: (schema) => schema.optional(),
  }),
  website: yup.string().when('type', {
    is: (typeVal: any) => typeVal?.value === 'business',
    then: (schema) => schema.required('Company website is required'),
    otherwise: (schema) => schema.optional(),
  }),
  firstname: yup.string().required('First name is required'),
  lastname: yup.string().required('Last name is required'),
  phone: yup.string().required('Phone is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  tax_id: yup.string().required('Tax ID is required'),
  id_number: yup.string().required('ID number is required'),
  country: yup.mixed().required('Country is required'),
  birth_place: yup.mixed().required('Birth place is required'),
  description: yup.string().required('Description is required'),
  day: yup
    .number()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .optional(),
  month: yup.mixed().optional(),
  year: yup
    .number()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .optional(),
  proofs: yup
    .array()
    .of(
      yup.object().shape({
        proof_type_id: yup
          .object({
            value: yup.string().required(),
            label: yup.string(),
          })
          .required('Proof type is required'),
        file: yup
          .mixed<File>()
          .transform((v) => (v === '' ? null : v))
          .required('File is required'),
        // .test('fileSize', 'File is too large', (value) => {
        //   return value && (value as File).size <= 5 * 1024 * 1024;
        // })
        // .test('fileType', 'Unsupported file format', (value) => {
        //   return (
        //     value &&
        //     ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(
        //       (value as File).type,
        //     )
        //   );
        // }),
      }),
    )
    .min(1, 'At least one proof is required'),
  supporting_documents: yup
    .array()
    .of(
      yup.object().shape({
        supporting_document_template_id: yup
          .object({
            value: yup.string().required(),
            label: yup.string(),
          })
          .required('Supporting Document type is required'),

        file: yup
          .mixed<File>()
          .transform((v) => (v === '' ? null : v))
          .required('File is required'),
        // .test('fileSize', 'File is too large', (value) => {
        //   return value && (value as File).size <= 5 * 1024 * 1024;
        // })
        // .test('fileType', 'Unsupported file format', (value) => {
        //   return (
        //     value &&
        //     ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(
        //       (value as File).type,
        //     )
        //   );
        // }),
      }),
    )
    .min(1, 'At least one supporting document is required'),
});

export const addressUpdateSchema = yup.object().shape({
  country: yup.mixed().when('$schemaContext', {
    is: (schemaContext: any) => {
      const { groupId } = schemaContext?.current || {};
      return groupId?.needs_registration;
    },
    then: (schema) =>
      schema.test('country-required', 'Country of residence is required', (val: any) => {
        return !!val;
      }),
    otherwise: (schema) => schema.optional(),
  }),
  city: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .trim()
    .required('City is required')
    .min(2, 'City must be at least 2 characters'),
  zipcode: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .trim()
    .required('Postal Code is required')
    .min(2, 'Postal Code must be at least 2 characters'),
  address: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .trim()
    .required('Address is required')
    .min(2, 'Address must be at least 2 characters'),
  address_state: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .trim()
    .required('State/Province/Region is required')
    .min(2, 'State/Province/Region must be at least 2 characters'),
  addressProofs: yup
    .array()
    .of(
      yup.object().shape({
        proof_type_id: yup
          .object({
            value: yup.string().required(),
            label: yup.string(),
          })
          .required('Proof type is required'),
        file: yup
          .mixed<File>()
          .transform((v) => (v === '' ? null : v))
          .required('File is required'),
        // .test('fileSize', 'File is too large', (value) => {
        //   return value && (value as File).size <= 5 * 1024 * 1024;
        // })
        // .test('fileType', 'Unsupported file format', (value) => {
        //   return (
        //     value &&
        //     ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(
        //       (value as File).type,
        //     )
        //   );
        // }),
      }),
    )
    .min(1, 'At least one proof is required'),
});

export const packageName = {
  'Toll Free': 'TOLLFREE_DID',
  'Toll-free': 'TOLLFREE_DID',
  Mobile: 'MOBILE_DID',
  Local: 'LOCAL_DID',
};
export const monthsArray = [
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];
export const typeArray = [
  { label: 'Personal', value: 'personal' },
  { label: 'Business', value: 'business' },
];
export const ipv4Regex =
  /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)(\/\d{1,2})?$/;

export const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4})(\/\d{1,3})?$/;

export const extractFileNameFromUrl = (url: string): string | null => {
  const parsedUrl = new URL(url);
  const disposition = parsedUrl.searchParams.get('response-content-disposition');

  if (!disposition) return null;

  const match = disposition.match(/filename\s*=\s*["']?([^"';]+)["']?/i);
  return match ? decodeURIComponent(match[1]) : null;
};
