import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/constants/forwarding-consts';

export const TAB_CONSTANT = {
  SETTING_PERMISSIONS: 'Settings & Permissions',
  GREETING_NOTIFICATION: 'Greetings',
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

export const settingsInitialState = {
  operational_hours: {
    override: false,
    type: '24_hours',
    value: CUSTOM_HOURS_SCHEDULE_OPTIONS,
    regional: {
      override: false,
      timezone: {},
      country_code: {},
      country: {},
      time_format: '12',
    },
  },
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
  recording: {
    on_demand: {
      enabled: false,
      recording_on: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34331.mp3',
      recording_Off: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34332.mp3',
    },
    automatic: {
      enabled: false,
      value: 'incoming',
      label: 'Incoming',
      recording_on: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34333.mp3',
    },
  },
  display_number: {
    incoming: {
      label: 'Yes',
      value: true,
    },
    masking: {
      type: { value: 'N', label: 'None' },
      value: '',
    },
    show_number_if_blocked: 'NO',
  },
  transcription: {
    enabled: false,
    override: false,
  },
  ai_call_monitoring: {
    enabled: false,
    override: false,
  },
};

export const ADD_TEMPLATE_INITIAL = {
  settings: settingsInitialState,
  greetings: greetingsInitialState,
  name: '',
};
