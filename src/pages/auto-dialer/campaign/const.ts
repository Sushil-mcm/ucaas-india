import moment from 'moment';
import { DIALER_TYPE } from './add-edit-campaign/consts';

export const CAMPAIGN_UPSERT_TAB_CONSTANT = {
  BASIC_INFORMATION: 'Basic Information',
  SETTING_PERMISSION: 'Settings & Permissions',
  SETTING: 'Campaign Settings',
  AGENTS: 'Agents',
  MEDIA: 'Media',
};

export const CAMPAIGN_STATUS_CONST = {
  PROCESSING: 'PROCESSING',
  PAUSE: 'PAUSE',
  NEW: 'NEW',
  COMPLETE: 'COMPLETE',
};

export const getRescheduleOptions = () => {
  const now = moment();

  const list = [
    { name: 'Custom', value: 'custom' },
    { name: '15 min', value: 15 },
    { name: '30 min', value: 30 },
    { name: '45 min', value: 45 },
    { name: '1 hour', value: 60 },
    { name: '2 hours', value: 120 },
    { name: '3 hours', value: 180 },
  ];

  return list.map((item) => {
    if (item.value === 0) {
      return {
        label: item.name,
        value: item.value,
        utc: null, // Custom means user will pick
      };
    }

    const scheduled = now.clone().add(item.value, 'minutes');
    return {
      label: item.name,
      value: item.value,
      utc: scheduled,
    };
  });
};

export const RUNNING_CAMPAIGN_TAB_CONST = {
  INFO: 'Info',
  NOTES: 'Notes',
  SCRIPT: 'Script',
  DISPOSITION: 'Disposition',
  TRANSCRIPTION: 'Transcription',
};

export const CAMPAIGN_TYPE_NAME = {
  [DIALER_TYPE.NORMAL]: 'Progressive',
  [DIALER_TYPE.PREVIEW]: 'Preview',
  [DIALER_TYPE.PREDICTIVE]: 'Predictive',
};
export const campaignTypeOptions = [
  { label: 'Preview', value: 'PREVIEW' },
  { label: 'Predictive', value: 'PREDICTIVE' },
  { label: 'Progressive', value: 'PROGRESSIVE' },
];

export const statusMessages: Record<string, { title: string; description: string }> = {
  online: {
    title: 'No active tasks',
    description: 'You are ready to start receiving tasks',
  },
  busy: {
    title: 'Busy',
    description: "You won't receive new tasks until you switch back online.",
  },
  dnd: {
    title: 'Do Not Disturb',
    description: "You have turned 'DND' on. Please turn it off to continue receiving the calls.",
  },
};

export const MAIN_TABS_CONST = {
  LEAD: 'Lead',
  MORE_CALLS: 'More Calls',
};
