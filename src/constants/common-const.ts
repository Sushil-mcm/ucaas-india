export const COMMN_CONST = {
  ACTIVE_CALL_TAB: 'Active Call Tab',
};

export const CAMPAIGN_SETTINGS_CONST = {
  settings: {
    operational_hours: {
      value: {
        monday: {
          open: true,
          start: '09:00',
          end: '17:00',
        },
        tuesday: {
          open: true,
          start: '09:00',
          end: '17:00',
        },
        wednesday: {
          open: true,
          start: '09:00',
          end: '17:00',
        },
        thursday: {
          open: true,
          start: '09:00',
          end: '17:00',
        },
        friday: {
          open: true,
          start: '09:00',
          end: '17:00',
        },
        saturday: {
          open: false,
          start: '',
          end: '',
        },
        sunday: {
          open: false,
          start: '',
          end: '',
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
  },
};


export const COMMON_CONST = {
  OPEN_POWER_CAMPAIGN: 'OPEN_POWER_CAMPAIGN',
  CLOSE_POWER_CAMPAIGN: 'CLOSE_POWER_CAMPAIGN',
};


export const CARDS_TYPE = {
  NEW_CARD: "new-card",
  SAVED_CARD: "saved-card"
}

export const NOTIFICATION_TYPE_CONST = {
  CALL_BACK_SCHEDULE: "campaign_callback_scheduled",
  EVENT_REMINDER : "event_reminder",
  PAYMENT_EVENT: "payment_event_socket",
  EVENT: "EVENT",
  TASK: "TASK",
  MEETING_REMINDER: "meeting_reminder"
}