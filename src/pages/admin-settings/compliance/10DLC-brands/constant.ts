import { HandCoins, Key, TreeDeciduous, TreePalm, Trees } from 'lucide-react';
import * as yup from 'yup';

export const DLC_BRAND_TABS_CONST = {
  BRAND_DETAILS: 'Brand Details',
  BRAND_RELATIONSHIP: 'Brand Relationship',
  CONTACT_DETAILS: 'Contact Details',
};
export const BRAND_INITIALS = {
  companyName: '',
  displayName: '',
  entityType: null,
  country: null,
  ein: '',
  einIssuingCountry: null,
  altBusinessIdType: null,
  altBusinessId: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  website: '',
  stockSymbol: '',
  stockExchange: null,
  vertical: null,
  referenceId: '',
  firstName: '',
  lastName: '',
  mobilePhone: '',

  brandRelationship: 'BASIC_ACCOUNT',

  phone: '',
  email: '',
  businessContactEmail: '',
};

export const BRAND_RELATIONSHIP_OPTIONS = [
  {
    key: 'BASIC_ACCOUNT',
    title: 'Basic Accounts',
    desc: 'no business history with the CSP',
    icon: HandCoins,
  },
  {
    key: 'SMALL_ACCOUNT',
    title: 'Small Accounts',
    desc: 'for some business history with the CSP',
    icon: TreeDeciduous,
  },
  {
    key: 'MEDIUM_ACCOUNT',
    title: 'Medium Accounts',
    desc: 'with good standing with the CSP and solid business history',
    icon: Trees,
  },
  {
    key: 'LARGE_ACCOUNT',
    title: 'Large Accounts',
    desc: 'with a dedicated account manager, highly trusted',
    icon: TreePalm,
  },
  {
    key: 'KEY_ACCOUNT',
    title: 'Key Accounts',
    desc: 'with strategic value and dedicated account team',
    icon: Key,
  },
];

export const entityTypes = [
  'PRIVATE_PROFIT',
  'PUBLIC_PROFIT',
  'NON_PROFIT',
  'GOVERNMENT',
  'SOLE_PROPRIETOR',
];
export const stockExchangeArr = [
  'NONE',
  'NASDAQ',
  'NYSE',
  'AMEX',
  'AMX',
  'ASX',
  'B3',
  'BME',
  'BSE',
  'FRA',
  'ICEX',
  'JPX',
  'JSE',
  'KRX',
  'LON',
  'NSE',
  'OMX',
  'SEHK',
  'SGX',
  'SSE',
  'STO',
  'SWX',
  'SZSE',
  'TSX',
  'TWSE',
  'VSE',
  'OTHER',
];

export const verticalArr = [
  { value: 'PROFESSIONAL', label: 'Professional Services' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'HEALTHCARE', label: 'Healthcare and Life Sciences' },
  { value: 'HUMAN_RESOURCES', label: 'HR, Staffing or Recruitment' },
  { value: 'ENERGY', label: 'Energy and Utilities' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'RETAIL', label: 'Retail and Consumer Products' },
  { value: 'TRANSPORTATION', label: 'Transportation or Logistics' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'POSTAL', label: 'Postal and Delivery' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'HOSPITALITY', label: 'Hospitality and Travel' },
  { value: 'FINANCIAL', label: 'Financial Services' },
  { value: 'POLITICAL', label: 'Political' },
  { value: 'GAMBLING', label: 'Gambling and Lottery' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'CONSTRUCTION', label: 'Construction, Materials, and Trade Services' },
  { value: 'NGO', label: 'Non-profit Organization' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'GOVERNMENT', label: 'Government Services and Agencies' },
  { value: 'TECHNOLOGY', label: 'Information Technology Services' },
  { value: 'COMMUNICATION', label: 'Media and Communication' },
];

export const brandDetailsSchema = yup.object({
  displayName: yup
    .string()
    .required('Brand name is required')
    .max(255, 'Brand name must be less than 255 characters'),

  entityType: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .nullable()
    .required('Entity type is required')
    .test(
      'government-us-only',
      'Only US-based organizations can use GOVERNMENT entity type',
      function (value) {
        const country = this.parent.country;
        if (value?.value === 'GOVERNMENT' && country?.value !== 'US') {
          return this.createError({
            message: 'GOVERNMENT entity type is only available for US-based organizations',
          });
        }
        return true;
      },
    ),

  country: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .nullable()
    .required('Country is required'),

  // companyName - Required for all except SOLE_PROPRIETOR
  companyName: yup
    .string()
    .required('Legal company name is required')
    .max(255, 'Legal company name must be less than 255 characters'),

  // ein - Required for all except SOLE_PROPRIETOR
  ein: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value !== 'SOLE_PROPRIETOR',
      then: (schema) =>
        schema.required('EIN is required').min(9).max(21, 'EIN must be less than 21 characters'),
      otherwise: (schema) => schema.nullable(),
    }),

  // einIssuingCountry - Optional for all (defaults to US)
  einIssuingCountry: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value !== 'SOLE_PROPRIETOR',
      then: (schema) => schema.nullable(), // Optional
      otherwise: (schema) => schema.nullable(), // N/A for SOLE_PROPRIETOR
    }),

  // altBusinessIdType - Optional for all
  altBusinessIdType: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .nullable()
    .notRequired(),

  // altBusinessId - Optional for all
  altBusinessId: yup
    .string()
    .nullable()
    .when('altBusinessIdType', {
      is: (v: any) => v !== null && v !== undefined,
      then: (schema) =>
        schema.required('ID number required').max(50, 'ID number must be less than 50 characters'),
      otherwise: (schema) => schema.nullable(),
    }),

  // Address fields - Required for all
  street: yup
    .string()
    .required('Street is required')
    .max(255, 'Street must be less than 255 characters'),
  city: yup.string().required('City is required').max(100, 'City must be less than 100 characters'),
  state: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .nullable()
    .required('State is required'),
  postalCode: yup
    .string()
    .required('Postal code required')
    .max(10, 'Postal code must be less than 10 characters'),

  // website - Required for PUBLIC_PROFIT, Optional for others
  website: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value === 'PUBLIC_PROFIT',
      then: (schema) =>
        schema.required('Website is required').max(255, 'Website must be less than 255 characters'),
      otherwise: (schema) => schema.nullable().notRequired(),
    }),

  // stockExchange - Required for PUBLIC_PROFIT only
  stockExchange: yup
    .object({
      value: yup.string(),
      label: yup.string(),
    })
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value === 'PUBLIC_PROFIT',
      then: (schema) => schema.required('Stock exchange is required for Public companies'),
      otherwise: (schema) => schema.nullable(),
    }),

  // stockSymbol - Required for PUBLIC_PROFIT only
  stockSymbol: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value === 'PUBLIC_PROFIT',
      then: (schema) =>
        schema
          .required('Stock symbol is required')
          .max(10, 'Stock symbol must be less than 10 characters'),
      otherwise: (schema) => schema.nullable(),
    }),

  // vertical - Required for all except SOLE_PROPRIETOR
  vertical: yup
    .object({
      value: yup.string(),
      label: yup.string(),
    })
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value !== 'SOLE_PROPRIETOR',
      then: (schema) => schema.required('Vertical type is required'),
      otherwise: (schema) => schema.nullable(),
    }),

  // brandRelationship - Required for all except SOLE_PROPRIETOR
  brandRelationship: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value !== 'SOLE_PROPRIETOR',
      then: (schema) => schema.required('Brand relationship is required'),
      otherwise: (schema) => schema.nullable(),
    }),

  // referenceId - Required for SOLE_PROPRIETOR, Optional for others
  referenceId: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value === 'SOLE_PROPRIETOR',
      then: (schema) =>
        schema
          .required('Reference ID is required')
          .max(50, 'Reference ID must be less than 50 characters'),
      otherwise: (schema) =>
        schema.nullable().max(50, 'Reference ID must be less than 50 characters'),
    }),

  // firstName - Required for SOLE_PROPRIETOR only
  firstName: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value === 'SOLE_PROPRIETOR',
      then: (schema) =>
        schema
          .required('First name required')
          .max(100, 'First name must be less than 100 characters'),
      otherwise: (schema) => schema.nullable(),
    }),

  // lastName - Required for SOLE_PROPRIETOR only
  lastName: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value === 'SOLE_PROPRIETOR',
      then: (schema) =>
        schema
          .required('Last name required')
          .max(100, 'Last name must be less than 100 characters'),
      otherwise: (schema) => schema.nullable(),
    }),

  // mobilePhone - Required for SOLE_PROPRIETOR (for OTP)
  mobilePhone: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value === 'SOLE_PROPRIETOR',
      then: (schema) =>
        schema
          .required('Mobile number required for OTP verification')
          .max(20, 'Mobile number must be less than 20 characters'),
      otherwise: (schema) => schema.nullable(),
    }),
});

export const brandRelationshipSchema = yup.object({
  brandRelationship: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value !== 'SOLE_PROPRIETOR',
      then: (schema) => schema.required('Select brand relationship'),
      otherwise: (schema) => schema.nullable(),
    }),
});

// Helper function to validate business contact email
export const validateBusinessContactEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;

  // Check for common email distribution addresses (sales@, info@, support@, contact@, etc.)
  const commonDistributionPatterns = [
    /^(sales|info|support|contact|help|service|admin|webmaster|noreply|no-reply|postmaster)@/i,
  ];

  // Check for personal/free email providers
  const freeEmailProviders = [
    '@gmail.com',
    '@yahoo.com',
    '@hotmail.com',
    '@outlook.com',
    '@aol.com',
    '@icloud.com',
    '@mail.com',
    '@protonmail.com',
    '@yandex.com',
    '@zoho.com',
    '@yopmail.com',
  ];

  const lowerEmail = email.toLowerCase();

  // Check if it's a common distribution address
  if (commonDistributionPatterns.some((pattern) => pattern.test(lowerEmail))) {
    return false;
  }

  // Check if it's a free email provider
  if (freeEmailProviders.some((provider) => lowerEmail.includes(provider))) {
    return false;
  }

  return true;
};

export const contactDetailsSchema = yup.object().shape({
  email: yup
    .string()
    .email('Invalid email format')
    .required('Support email required')
    .max(100, 'Support email must be less than 100 characters'),

  phone: yup
    .string()
    .required('Support phone required')
    .max(20, 'Phone number must be less than 20 characters'),

  // Include entityType to access it in when() clauses
  entityType: yup.mixed().nullable(),

  // businessContactEmail - Required for PUBLIC_PROFIT only, with special validation
  businessContactEmail: yup
    .string()
    .nullable()
    .when('entityType', {
      is: (v: any) => v?.value === 'PUBLIC_PROFIT',
      then: (schema) =>
        schema
          .required('Business contact email is required for Public Profit brands')
          .email('Invalid email format')
          .max(255, 'Business contact email must be less than 255 characters')
          .test(
            'not-common-email',
            'Common email distribution addresses (like sales@company.com) are not allowed',
            (value) => {
              if (!value) return false;
              return validateBusinessContactEmail(value);
            },
          )
          .test('not-free-email', 'Personal or free email addresses are not allowed', (value) => {
            if (!value) return false;
            return validateBusinessContactEmail(value);
          }),
      otherwise: (schema) => schema.nullable().notRequired(),
    }),
});

export const usStates = {
  DE: 'Delaware',
  HI: 'Hawaii',
  PR: 'Puerto Rico',
  TX: 'Texas',
  MA: 'Massachusetts',
  MD: 'Maryland',
  IA: 'Iowa',
  ME: 'Maine',
  ID: 'Idaho',
  MI: 'Michigan',
  UT: 'Utah',
  AA: 'Armed forces - America',
  MN: 'Minnesota',
  MO: 'Missouri',
  IL: 'Illinois',
  MP: 'Northern Marianas Islands',
  AE: 'Armed forces - Europe',
  IN: 'Indiana',
  MS: 'Mississippi',
  MT: 'Montana',
  AK: 'Alaska',
  AL: 'Alabama',
  VA: 'Virginia',
  AP: 'Armed forces - Pacific',
  AR: 'Arkansas',
  AS: 'American Samoa',
  VI: 'Virgin Islands',
  NC: 'North Carolina',
  ND: 'North Dakota',
  NE: 'Nebraska',
  RI: 'Rhode Island',
  AZ: 'Arizona',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  VT: 'Vermont',
  NM: 'New Mexico',
  FL: 'Florida',
  NV: 'Nevada',
  WA: 'Washington',
  NY: 'New York',
  SC: 'South Carolina',
  SD: 'South Dakota',
  WI: 'Wisconsin',
  OH: 'Ohio',
  GA: 'Georgia',
  OK: 'Oklahoma',
  CA: 'California',
  WV: 'West Virginia',
  WY: 'Wyoming',
  OR: 'Oregon',
  KS: 'Kansas',
  CO: 'Colorado',
  KY: 'Kentucky',
  GU: 'Guam',
  CT: 'Connecticut',
  PA: 'Pennsylvania',
  LA: 'Louisiana',
  TN: 'Tennessee',
  DC: 'District of Columbia',
};
