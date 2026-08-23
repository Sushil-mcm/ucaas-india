import { SETTINGS } from '@/components/common-settings/constants';

export const CUSTOM_HOURS_SCHEDULE_OPTIONS = {
  monday: {
    open: true,
    start: '10:00',
    end: '23:00',
    is_checked: false,
  },
  tuesday: {
    open: true,
    start: '10:00',
    end: '23:00',
    is_checked: false,
  },
  wednesday: {
    open: true,
    start: '10:00',
    end: '23:00',
    is_checked: false,
  },
  thursday: {
    open: true,
    start: '10:00',
    end: '23:00',
    is_checked: false,
  },
  friday: {
    open: true,
    start: '10:00',
    end: '23:00',
    is_checked: false,
  },
  saturday: {
    open: false,
    start: '',
    end: '',
    is_checked: false,
  },
  sunday: {
    open: false,
    start: '',
    end: '',
    is_checked: false,
  },
};

export const BUSINESS_HOURS_NAME_CONSTANT = {
  '24_hours': '24 Hours',
  weekly: 'Weekly',
};
export const FORWARD_TYPES_LABEL = {
  DEVICE: 'Ring My Device',
  VOICEMAIL: 'Send to Voicemail',
  GREETING: 'Play an Announcement',
  EXTENSION: 'Forward to Extension',
  PHONE: 'Forward to External Number',
  IVR: 'Forward to IVR',
  QUEUE: 'Forward to Call Queue',
  DEPARTMENT: 'Forward to Group',
  MESSAGE: 'Send to Message',
  HANGUP: 'Hangup',
  AI: 'Forward to AI',
};
export const FORWARD_TYPES = {
  DEVICE: 'DEVICE',
  VOICEMAIL: 'VOICEMAIL',
  GREETING: 'GREETING',
  EXTENSION: 'EXTENSION',
  PHONE: 'PHONE',
  IVR: 'IVR',
  QUEUE: 'QUEUE',
  DEPARTMENT: 'DEPARTMENT',
  MESSAGE: 'MESSAGE',
  HANGUP: 'HANGUP',
};
export const RING_MY_DEVICE_OPTIONS = [
  {
    label: 'Ring in order',
    value: 'simultaneously',
  },
  {
    label: 'Ring all at once',
    value: 'sequential',
  },
];

const condition = {
  templateName: '',
  site: {},
  callerId: {
    enabled: false,
    value: [],
  },
  ...SETTINGS.settings,
};
const callHandling = {
  businessHours: {
    // ai_forward_to: {
    //   type: {
    //     label: 'Hangup',
    //     value: 'HANGUP',
    //   },
    //   value: {
    //     label: 'Hangup',
    //     value: 'HANGUP',
    //   },
    // },
    forwardType: '',
    forwardValue: {
      label: '',
      value: '',
    },
    missedCall: {
      type: '0',
      forwardType: {
        label: '',
        value: '',
        // label: FORWARD_TYPES_LABEL.VOICEMAIL,
        // value: "VOICEMAIL",
      },
      forwardValue: {
        label: '',
        value: '',
      },
    },
  },
};
const media = {
  welcome: {
    enabled: false,
    value: {},
  },
  hold: {
    enabled: false,
    value: {},
  },
  voicemail: {
    enabled: false,
    value: {},
  },
};

export const callForwardingFormInitialState = {
  settings: condition,
  callHandling,
  media,
  did_info: {
    did_name: '',
    site: {
      label: 'Select',
      value: '',
    },
  },
};

export const TAB_CONSTANT = {
  DID_INFO: 'DID Info',
  CONDITION: 'Settings & Permissions',
  CALL_HANDLING: 'Call Handling',
  MEDIA: 'Media',
  SUMMARY: 'Summary',
};

export const CALL_HANDLING_TAB_CONSTANT = {
  BUSINESS_HOURS: 'Business Hours',
  CLOSED_HOURS: 'Closed Hours',
  RECORDING: 'Setting & Permission',
};

export const INITIAL_TYPE_CONSTANT = {
  UPSERT_TEMPLATE: 'UPSERT_TEMPLATE',
  SELECT_TEMPLATE: 'SELECT_TEMPLATE',
};

export const SET_UP_CALL_SCREENING_OPTIONS = [
  {
    label: 'If Caller Id not present',
    value: '0',
  },
  {
    label: 'If caller not in contact List',
    value: '1',
  },
  {
    label: 'Always',
    value: '2',
  },
];

export const MEDIA_OPTIONS = [
  {
    label: 'Welcome',
    value: 'welcome',
  },
  {
    label: 'On Hold',
    value: 'hold',
  },
  {
    label: 'Voicemail',
    value: 'voicemail',
  },
];

export const CALL_FORWARDING_TAB_CONSTANT = {
  DID_INFO: 'DID Info',
  CONDITION: 'Settings & Permissions',
  CALL_HANDLING: 'Call Handling',
  MEDIA: 'Media',
  SUMMARY: 'Summary',
};

export const BUSINESS_HOURS_CONSTANT = {
  ALL_TIME: '24_hours',
  WEEKLY: 'weekly',
};
