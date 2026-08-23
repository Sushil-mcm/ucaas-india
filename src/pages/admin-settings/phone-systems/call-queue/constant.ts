import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/constants/forwarding-consts';

export const TAB_CONSTANT = {
  BASIC_INFORMATION: 'Basic Information',
  SETTINGS: 'Settings & Permissions',
  QUEUE_SETTINGS: 'Queue Settings',
  ADD_MEMBERS: 'Add Member',
  RING_STRATEGY: 'Ring Strategy',
  GREETING_NOTIFICATION: 'Media',
};

export const CALL_QUEUE_INIITAL_VALUES = {
  name: '',
  extension: '',
  script_data: '',
  site_uuid: null,
  description: '',
  script: null,
  script_enabled: false,
  settings: {
    wrapup_time: 30,
    regional: {
      timezone: {},
      country_code: {},
      country: {},
      time_format: 12,
    },
    operational_hours: {
      type: '24_hours',
      value: CUSTOM_HOURS_SCHEDULE_OPTIONS,
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
    ring_strategy: {
      value: { label: 'Ring All', value: 'ring-all' },
      leave_room_if_no_agent: true,
      max_wait_time: {
        callers: {
          label: 5,
          value: 5,
        },
        queue_timeout: 60,
        after_max_wait_time: {
          type: { label: 'Send to voicemail', value: 'VOICEMAIL' },
          value: {},
          personal: true,
          label: '',
          name: '',
        },
      },
    },
    transcription: false,
  },
  greetings: {
    welcome: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
    hold: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
    waiting: {
      value: null,
      enabled: true,
    },
    ring_tone: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
    no_agent_available: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
    all_agent_busy: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
  },
  members: [],
  agentDisposition: [],
};

export const CALL_DISTRIBUTION_DATA = [
  {
    label: 'Ring All',
    value: 'ring-all',
  },
  {
    label: 'Longest Idle Agent',
    value: 'longest-idle-agent',
  },
  {
    label: 'Round Robin',
    value: 'round-robin',
  },
  {
    label: 'Top Down',
    value: 'top-down',
  },
  {
    label: 'Agent With Least Talk Time',
    value: 'agent-with-least-talk-time',
  },
  {
    label: 'Agent With Fewest Calls',
    value: 'agent-with-fewest-calls',
  },
  // {
  //   label: 'Sequentially By Agent Order',
  //   value: 'sequentially-by-agent-order',
  // },
  {
    label: 'Random',
    value: 'random',
  },
];

export const DEPARTMENT_RING_STRATEGY_DESC = {
  'ring-all': 'Rings all agent simultaneously',
  'longest-idle-agent':
    'Rings the agent who has been idle the longest taking into account tier level.',
  'round-robin': 'Rings the agent in position but remember last tried agent.',
  'top-down': 'Rings the agent in order position starting from 1 for every member.',
  'agent-with-least-talk-time': 'Rings the agent with least talk time.',
  'agent-with-fewest-calls': 'Rings the agent with fewest calls.',
  random: 'Rings agents in random order.',
};

export const MAX_WAITING_CALLERS = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
  29, 30,
];
