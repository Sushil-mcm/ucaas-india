import * as yup from 'yup';

import {
  DEVICE_OPTIONS_CONSTANT,
  FORWARD_TYPES,
  RING_MODE_OPTIONS,
} from '@/constants/forwarding-consts';
import { IADDUSER } from '@/interfaces/extension-interface';
import { SETTINGS } from '@/components/common-settings/constants';

export const userInitialState = {
  email: '',
  first_name: '',
  last_name: '',
  extension: '',
  // extension: generateRandomExtension(),
  phone: '',
  password: '',
  confirm_password: '',
  role: { label: 'Select', value: '' },
};

export const formInitialState: IADDUSER = {
  user_add_count: null,
  site: { label: 'Select', value: '' },
  users: [userInitialState],
  password: '',
  confirm_password: '',
  password_type: 'common',
};

export const TAB_CONSTANT = {
  ADD_USER_INFO: 'Add User Info',
  SETUP_OPTION: 'Setup Options',
};

export const FORWARDING_TAB_CONSTANT = {
  BASIC_INFORMATION: 'Basic Information',
  SETTING_PERMISSIONS: 'Settings & Permissions',
  GREETING_NOTIFICATION: 'Media',
  CALL_RULES: 'Call Rules',
};

export const ERROR_TYPES = {
  [FORWARDING_TAB_CONSTANT.BASIC_INFORMATION]: 'basic',
  [FORWARDING_TAB_CONSTANT.SETTING_PERMISSIONS]: 'settings',
  [FORWARDING_TAB_CONSTANT.GREETING_NOTIFICATION]: 'greetings',
  [FORWARDING_TAB_CONSTANT.CALL_RULES]: 'callRules',
};

export const ERROR_TYPES_MESSAGES = {
  [FORWARDING_TAB_CONSTANT.BASIC_INFORMATION]: 'Basic information is required',
  [FORWARDING_TAB_CONSTANT.SETTING_PERMISSIONS]: 'Settings are required',
  [FORWARDING_TAB_CONSTANT.GREETING_NOTIFICATION]: 'Media is required',
  [FORWARDING_TAB_CONSTANT.CALL_RULES]: 'Call rules is required',
};

const callHandlingInitialState = {
  type: FORWARD_TYPES.VOICEMAIL,
  value: RING_MODE_OPTIONS?.[0],
  missed_call_action: {
    value: { label: '', value: FORWARD_TYPES.VOICEMAIL },
    forward_value: {
      label: '',
      value: '',
    },
    personal: false,
  },
  device_options: DEVICE_OPTIONS_CONSTANT,
};

export const greetingsInitialState = {
  welcome_greeting: {
    enabled: false,
    override: false,
    value: { label: '', value: '' },
  },
  voicemail: {
    enabled: false,
    override: false,
    value: { label: '', value: '' },
  },
  ring_tone: {
    enabled: false,
    override: false,
    value: { label: '', value: '' },
  },
  on_hold_music: {
    enabled: false,
    override: false,
    value: { label: '', value: '' },
  },
};

export const MEMBER_RING_STRATEGY_OPTIONS = [
  {
    label: 'Ring All',
    value: 'ring_all',
  },
  {
    label: 'Linear',
    value: 'linear',
  },
  {
    label: 'Round Robin',
    value: 'round_robin',
  },
  {
    label: 'Longest Idle',
    value: 'longest_idle',
  },
  {
    label: 'Random',
    value: 'random',
  },
];

export const settingsInitialState = {
  role: {
    override: false,
    label: '',
    value: '',
  },
  voicemail_pin: {
    value: '',
    users: [],
    voicemail_to_text: 'YES',
    override: false,
  },
  ...SETTINGS.settings,
};

export const basicInitialState = {
  email: '',
  site: { label: 'Select', value: '' },
  extension: '',
  phone: '',
  caller_id: '',
  job_title: '',
  first_name: '',
  last_name: '',
  profile: null,
};

export const callForwardingInitialState = {
  business_hours: {
    ...callHandlingInitialState,
  },
  closed_hours: {
    ...callHandlingInitialState,
  },
};

export const UPDATE_FORWARDING_INITIAL = {
  basic: basicInitialState,
  settings: settingsInitialState,
  greetings: greetingsInitialState,
  callRules: {
    forwardCall: {
      enabled: false,
      type: { label: '', value: '' },
      value: { label: '', value: '' },
      personal: true,
    },
    doNotDisturb: false,
    incomingCall: {
      enabled: true,
      deviceOptions: DEVICE_OPTIONS_CONSTANT,
      type: 'number',
      number: '',
      name: '',
      extension: [],
      deviceOptionValue: { label: '', value: 'sequential' },
    },
    outgoingCall: {
      enabled: true,
      defaultCallerId: { label: '', value: '' },
      defaultFaxId: '',
      defaultTextId: '',
      ringOut: false,
      region: '',
    },
    failureAction: {
      enabled: false,
      type: { label: '', value: '' },
      value: { label: '', value: '' },
      personal: true,
    },
    closedHoursAction: {
      enabled: false,
      type: { label: '', value: '' },
      value: { label: '', value: '' },
      personal: true,
    },
  },
  templateName: '',
  site: {},
};

export const DISPLAY_NUMBER_OPTIONS = [
  { label: 'Personal and mobile only', value: 'personal' },
  { label: 'None', value: 'N' },
];

export const WEEKLY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof WEEKLY_ORDER)[number];

export const WEEKLY_SCHEDULE_MAP: Record<Weekday, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thur',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export const timeOption = [
  {
    label: 5,
    value: 5,
  },
  {
    label: 10,
    value: 10,
  },
  {
    label: 15,
    value: 15,
  },
  {
    label: 20,
    value: 20,
  },
  {
    label: 25,
    value: 25,
  },
  {
    label: 30,
    value: 30,
  },
];
export const DEVICE_TYPE_NAME_CONST = {
  web: 'Desktop',
  pstn: 'ATA Device',
  mobile: 'Mobile',
} as const;

export const holidaySchema = yup.object().shape({
  title: yup.string().required('Title is required'),
  from: yup.date().nullable().required('From date is required'),
  to: yup.date().nullable().required('To date is required'),
  type: yup.object().shape({
    label: yup.string(),
    value: yup.string().required('Type is required'),
  }),
  value: yup
    .object()
    .shape({
      label: yup.string(),
      value: yup.string().required('Value is required'),
    })
    .when('type', {
      is: (type: any) => type?.value === 'PHONE',
      then: (schema) =>
        schema.shape({
          value: yup
            .string()
            .required('Value is required')
            .test('phone-length', 'Phone number must be at least 8 digits', (val) => {
              if (val && val.replace(/\D/g, '').length < 8) return false;
              return true;
            }),
        }),
    }),
});
