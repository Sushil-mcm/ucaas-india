/* The shape the Notifications form actually uses.
 *
 * This was previously wrapped in one more `notification_settings` level than
 * the form reads. The form's field paths are `voicemail.email`,
 * `missed.socket` and so on, so nothing here ever reached a control: every
 * switch started as `undefined` — which Radix reads as "uncontrolled", after
 * which it keeps its own state and stops agreeing with the form — until the
 * record arrived and `reset` replaced the lot. The extra level belongs to the
 * stored record, and the page adds it back when it saves. */
export const NOTIFICATION_SETTINGS_INITIAL = {
  voicemail: {
    email: false,
    socket: false,
    sms: false,
    push: false,
    phone: '',
  },
  missed: {
    email: false,
    socket: false,
    sms: false,
    push: false,
    phone: '',
  },
  sms: {
    email: false,
    socket: false,
    sms: false,
    push: false,
    phone: '',
  },
};

/* Each channel gets a plain description. "Web Alert" and "Mobile Alert" are the
   stored names and say nothing about where the alert actually appears, which
   leaves someone guessing which one reaches them when they are away from a desk. */
export const NOTIFICATION_SETTINGS_LIST = [
  {
    label: 'Email',
    value: 'email',
    hint: 'Sent to your account email address.',
  },
  {
    label: 'Web alert',
    value: 'socket',
    hint: 'Appears while this site is open in a browser.',
  },
  {
    label: 'Text message',
    value: 'sms',
    hint: 'Sent to the number you give below. Charged per message.',
  },
  {
    label: 'Mobile app',
    value: 'push',
    hint: 'Push notification on the mobile app.',
  },
];

export const NOTIFICATION_TYPES_LIST = [
  {
    id: 1,
    name: 'Voicemail',
    description: 'When somebody leaves you a message.',
    value: 'voicemail',
    settingsType: NOTIFICATION_SETTINGS_LIST,
  },
  {
    id: 2,
    name: 'Missed calls',
    description: 'When a call rings you and nobody answers it.',
    value: 'missed',
    settingsType: NOTIFICATION_SETTINGS_LIST,
  },
  {
    id: 3,
    name: 'Text messages',
    description: 'When a text arrives on one of your numbers.',
    value: 'sms',
    settingsType: NOTIFICATION_SETTINGS_LIST,
  },
] as const;
