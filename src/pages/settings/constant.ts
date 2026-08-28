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

/* Each channel gets a plain description. "Web Alert" and "Mobile Alert" are the
   stored names and say nothing about where the alert actually appears, which
   leaves someone guessing which one reaches them when they are away from a desk. */
export const NOTIFICATION_SETTINGS_LIST = [
  { label: 'Email', value: 'email', hint: 'Sent to your account email address.' },
  { label: 'Web Alert', value: 'socket', hint: 'Appears while this site is open in a browser.' },
  { label: 'SMS', value: 'sms', hint: 'Text message to the number below. Charged per message.' },
  { label: 'Mobile Alert', value: 'push', hint: 'Push notification on the mobile app.' },
];

export const NOTIFICATION_TYPES_LIST = [
  {
    id: 1,
    name: 'Voicemail Notifications',
    description: 'When somebody leaves you a voicemail.',
    value: 'voicemail',
    settingsType: NOTIFICATION_SETTINGS_LIST,
    iconType: 'circle',
    iconClass: 'w-4 h-4 border border-primary rounded-full',
  },
  {
    id: 2,
    name: 'Missed Calls Notifications',
    description: 'When a call rings you and nobody answers it.',
    value: 'missed',
    settingsType: NOTIFICATION_SETTINGS_LIST,
    iconType: 'circle',
    iconClass: 'w-4 h-4 border border-red-500 rounded-full',
  },
  {
    id: 3,
    name: 'SMS Notifications',
    description: 'When a text message arrives on one of your numbers.',
    value: 'sms',
    settingsType: NOTIFICATION_SETTINGS_LIST,
    iconType: 'icon',
    iconName: 'MessageStrokIcon',
    iconClass: 'h-5 w-5 text-green-500',
  },
] as const;
