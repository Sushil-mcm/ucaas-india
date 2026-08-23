export const NOTIFICATION_SETTINGS_INITIAL = {
  notification_settings: {
    voicemail: {
      email: false,
      socket: false,
      sms: false,
      push: false,
    },
    missed: {
      email: false,
      socket: false,
      sms: false,
      push: false,
    },
    sms: {
      email: false,
      socket: false,
      sms: false,
      push: false,
    },
    forgot_password: {
      email: true,
      socket: false,
      sms: true,
      push: false,
    },
  },
};

export const NOTIFICATION_SETTINGS_BREADCRUM = [{ label: 'Settings' }, { label: 'Notification' }];

export const NOTIFICATION_SETTINGS_LIST = [
  { label: 'Email', value: 'email' },
  { label: 'Web Alert', value: 'socket' },
  { label: 'SMS', value: 'sms' },
  { label: 'Mobile Alert', value: 'push' },
];

export const NOTIFICATION_TYPES_LIST = [
  {
    id: 1,
    name: 'Voicemail Notifications',
    value: 'voicemail',
    settingsType: NOTIFICATION_SETTINGS_LIST,
    iconType: 'circle',
    iconClass: 'w-4 h-4 border border-primary rounded-full',
  },
  {
    id: 2,
    name: 'Missed Calls Notifications',
    value: 'missed',
    settingsType: NOTIFICATION_SETTINGS_LIST,
    iconType: 'circle',
    iconClass: 'w-4 h-4 border border-red-500 rounded-full',
  },
  {
    id: 3,
    name: 'SMS Notifications',
    value: 'sms',
    settingsType: NOTIFICATION_SETTINGS_LIST,
    iconType: 'icon',
    iconName: 'MessageStrokIcon',
    iconClass: 'h-5 w-5 text-green-500',
  },
] as const;
