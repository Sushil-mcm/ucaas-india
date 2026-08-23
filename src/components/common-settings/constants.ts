export const OPERATIONAL_HOURS = {
  type: '24_hours',
  value: {
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
  },
  holidays: [],
  regional: {
    override: false,
    timezone: {},
    country_code: {},
    country: {},
    time_format: '12',
  },
  closed_hour_action: {
    enabled: false,
    type: { label: '', value: '' },
    value: { label: '', value: '' },
    personal: true,
  },
};

export const SETTINGS = {
  settings: {
    operational_hours: OPERATIONAL_HOURS,
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
    transcription: false,
    ai_call_monitoring: false,
  },
};
