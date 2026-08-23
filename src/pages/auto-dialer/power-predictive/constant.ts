import { DIALER_TYPE } from '../campaign/add-edit-campaign/consts';

export const AUTO_DIALER_INITIAL_VALUES = {
  name: '',
  timezone: null,
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  daysToRun: [],
  holidays: [],
  // leads: "select",
  upload_leads: null,
  lead_uuid: [],
  contactMethod: 'ASCENDING',
  rotateCallerId: '1',
  callerId: [],
  dialMethod: DIALER_TYPE.NORMAL,
  forwardTo: 'MESSAGE',
  forwardToId: null,
  amd: '1',
  action: 'HANGUP',
  voicemail: '',
  upload_voice: null,
  setting: {
    ring_time: null,
    max_attempt: null,
    retry_after: null,
    call_per_second: 10,
  },
};

export const CAMPAIGN_DAYS = {
  Mon: 'monday',
  Tue: 'tuesday',
  Wed: 'wednesday',
  Thu: 'thursday',
  Fri: 'friday',
  Sat: 'saturday',
  Sun: 'sunday',
} as const;
