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
  AI: 'AI',
  HANGUP: 'HANGUP',
};

export const RING_TYPE_LABELS = {
  sequential: 'Ring in order',
  simultaneously: 'Ring all at once',
} as const;

export const RING_MODE_OPTIONS = [
  {
    label: RING_TYPE_LABELS.sequential,
    value: 'sequential',
  },
  {
    label: RING_TYPE_LABELS.simultaneously,
    value: 'simultaneously',
  },
];

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

export const CUSTOM_HOURS_HOLIDAYS = [
  {
    title: '',
    from: null,
    to: null,
    type: { label: '', value: '' },
    value: { label: '', value: '' },
  },
];

export const RINGING_OPTIONS = [
  {
    label: '6 times / 30 secs',
    value: '30',
  },
  {
    label: '3 times / 15 secs',
    value: '15',
  },
];

export const DEVICE_OPTIONS_CONSTANT = {
  web: {
    status: true,
    value: RINGING_OPTIONS?.[0],
    options: {
      label: '',
      value: '',
    },
  },
};
