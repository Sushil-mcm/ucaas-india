import { SETTINGS } from '@/components/common-settings/constants';
import { generateRandomExtension } from '@/lib/utils';

export const IVR_TAB_CONSTANT = {
  BASIC_INFORMATION: 'Basic Information',
  SETTING_PERMISSIONS: 'Settings & Permissions',
  GREETING_NOTIFICATION: 'Media',
  KEY_PRESSES: 'Key Presses',
};

export const IVR_ERROR_TYPES_MESSAGES = {
  [IVR_TAB_CONSTANT.BASIC_INFORMATION]: 'Basic information is required',
  [IVR_TAB_CONSTANT.SETTING_PERMISSIONS]: 'Settings are required',
  [IVR_TAB_CONSTANT.GREETING_NOTIFICATION]: 'Media is required',
  [IVR_TAB_CONSTANT.KEY_PRESSES]: 'Key pressess is required',
};

/**
 * Retry / timeout behaviour for an IVR menu. These were hardcoded in the save
 * payload; they are now real form fields. The defaults are the values that used
 * to be sent, so existing IVRs keep behaving exactly the same.
 */
export const IVR_RETRY_DEFAULTS = {
  /** How many times an invalid key press replays the menu before giving up. */
  max_failures: 3,
  /** How many times silence replays the menu before giving up. */
  max_timeouts: 3,
  /** Seconds to wait for a key press after the menu finishes playing. */
  timeout: 10,
};

export const IVR_RETRY_LIMITS = {
  max_failures: { min: 1, max: 10 },
  max_timeouts: { min: 1, max: 10 },
  timeout: { min: 1, max: 60 },
};

export const INITIAL_IVR_MENU_VLAUES = {
  extension: generateRandomExtension(),
  ...IVR_RETRY_DEFAULTS,
  name: '',
  description: '',
  language: {},
  site: { label: 'Select', value: '' },
  greetings: {
    welcome: {
      enabled: false,
      value: { label: '', value: '' },
    },
    menu: {
      enabled: true,
      value: { label: '', value: '' },
    },
    invalid: {
      enabled: false,
      value: { label: '', value: '' },
    },
  },
  settings: SETTINGS.settings,
  ivrActions: [
    {
      key: { label: '', value: '' },
      forwardType: { label: 'Send to voicemail', value: 'VOICEMAIL' },
      forwardValue: { label: '', value: '' },
    },
  ],
  generic: {
    enabled: false,
    keyboard_shortcuts: 'default',
    press_hash: { label: 'Return to Previous Menu', value: 'Return to Previous Menu' },
    press_asterisk: {
      label: 'Repeat Menu Greeting',
      value: 'Repeat Menu Greeting',
    },
    timeout_action: {
      status: 'HANGUP',
      type: {},
      value: {},
    },
    failure_action: {
      status: 'HANGUP',
      type: {},
      value: {},
    },
  },
};

export const KEYBOARD_SHORTCUTS = [
  {
    id: 1,
    label: 'Repeat Menu Greeting',
    value: 'Repeat Menu Greeting',
  },
  {
    id: 2,
    label: 'Return to Previous Menu',
    value: 'Return to Previous Menu',
  },
];
