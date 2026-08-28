/* Reading a user-settings template into a form, and writing it back out.
 *
 * The stored shape and the form shape are not the same. Storage keeps flat
 * values (`type`, `type_label`) because that is what the dialplan reads; the
 * form needs `{ label, value }` pairs because that is what the select controls
 * bind to. Several fields also have two historical spellings, and two were once
 * plain booleans before they grew an `override` flag, so a record written a year
 * ago and a record written today do not look alike.
 *
 * All of that lived inline in the template drawer. The company defaults page
 * needs precisely the same translation, and a second copy would drift the first
 * time either side gained a field — a drift that shows up as a setting the admin
 * changed silently reverting. So it lives here once and both callers use it.
 */

import { getHolidaysFormVal, getHolidaysPayload } from '@/lib/utils';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/pages/admin-settings/numbers/set-number-forwarding/constants';

type SetValue = (name: string, value: any) => void;

const parseMaybeJson = (value: any): any => {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

/* `transcription` and `ai_call_monitoring` were booleans before they became
   objects carrying an override flag. Older records still hold the boolean, so
   both forms are accepted and normalised to the object the form expects. */
const asToggleWithOverride = (value: any) => {
  const isObject = typeof value === 'object' && value !== null;
  return {
    enabled: isObject ? !!value.enabled : !!value,
    override: isObject ? !!value.override : false,
  };
};

const asGreetingField = (greeting: any) => ({
  enabled: greeting?.enabled || false,
  override: greeting?.override || false,
  value: {
    label: greeting?.label || 'Select',
    value: greeting?.value || '',
  },
});

/* Fills a react-hook-form instance from a stored template record.
 *
 * `fallbackSettings` is used when the stored settings are missing a timezone —
 * the marker for a record that was never completed. Loading such a record as-is
 * leaves the regional selects empty and the first save writes those blanks back,
 * so the caller's initial state is used instead. */
export const hydrateTemplateForm = (
  setValue: SetValue,
  data: any,
  fallbackSettings: any,
): void => {
  if (!data) return;

  const settingsData = parseMaybeJson(data?.settings);
  const greetingsData = parseMaybeJson(data?.greetings);

  setValue('name', data?.name || '');
  setValue(
    'settings',
    settingsData?.operational_hours?.regional?.timezone?.value ? settingsData : fallbackSettings,
  );

  setValue('settings.transcription', asToggleWithOverride(settingsData?.transcription));
  setValue('settings.ai_call_monitoring', asToggleWithOverride(settingsData?.ai_call_monitoring));

  setValue(
    'settings.operational_hours.holidays',
    settingsData?.operational_hours?.holidays?.length
      ? getHolidaysFormVal(settingsData.operational_hours.holidays)
      : [],
  );

  setValue('settings.display_number.masking.type', {
    label: settingsData?.display_number?.masking?.label || '',
    value: settingsData?.display_number?.masking?.type || '',
  });

  setValue('settings.operational_hours.closed_hour_action', {
    type: {
      label: settingsData?.operational_hours?.closed_hour_action?.type_label || '',
      value: settingsData?.operational_hours?.closed_hour_action?.type || '',
    },
    value: {
      label: settingsData?.operational_hours?.closed_hour_action?.value_label || '',
      value: settingsData?.operational_hours?.closed_hour_action?.value || '',
    },
    enabled: settingsData?.operational_hours?.closed_hour_action?.enabled,
    personal: settingsData?.operational_hours?.closed_hour_action?.personal,
  });

  /* `welcome_greeting`/`welcome` and `on_hold_music`/`hold` are the same field
     under two spellings from different eras of the API. */
  setValue('greetings', {
    welcome_greeting: asGreetingField(
      greetingsData?.welcome_greeting || greetingsData?.welcome,
    ),
    voicemail: asGreetingField(greetingsData?.voicemail),
    ring_tone: asGreetingField(greetingsData?.ring_tone),
    on_hold_music: asGreetingField(greetingsData?.on_hold_music || greetingsData?.hold),
  });
};

const toStoredGreeting = (greeting: any) => ({
  enabled: greeting?.enabled,
  label: greeting?.value?.label,
  value: greeting?.value?.value,
  override: greeting?.override,
});

/* Turns current form values back into the payload the upsert endpoint stores. */
export const buildTemplatePayload = ({
  name,
  settings = {},
  greetings = {},
  uuid,
}: {
  name: string;
  settings: any;
  greetings: any;
  uuid?: string;
}) => {
  const {
    display_number: {
      masking = {},
      incoming = {},
      show_number_if_blocked = 'NO',
      override = false,
    } = {},
    operational_hours = {},
    ...restSettings
  } = settings;

  return {
    name,
    settings: {
      ...restSettings,
      display_number: {
        incoming,
        masking: {
          type: masking?.type?.value,
          label: masking?.type?.label,
          value: masking?.value,
        },
        show_number_if_blocked,
        override,
      },
      operational_hours: {
        type: operational_hours?.type,
        /* An empty schedule would mean "closed at every hour", which routes every
           call to the closed-hours action. The standard week is used instead. */
        value: operational_hours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
        holidays: operational_hours?.holidays?.length
          ? getHolidaysPayload(operational_hours.holidays)
          : [],
        override: operational_hours?.override,
        regional: {
          country: operational_hours?.regional?.country,
          timezone: operational_hours?.regional?.timezone,
          time_format: operational_hours?.regional?.time_format,
          country_code: operational_hours?.regional?.country_code,
          override: operational_hours?.regional?.override,
        },
        closed_hour_action: {
          type: operational_hours?.closed_hour_action?.type?.value,
          value: operational_hours?.closed_hour_action?.value?.value,
          enabled: operational_hours?.closed_hour_action?.enabled,
          personal: operational_hours?.closed_hour_action?.personal,
          type_label: operational_hours?.closed_hour_action?.type?.label,
          value_label: operational_hours?.closed_hour_action?.value?.label,
        },
      },
    },
    greetings: {
      welcome_greeting: toStoredGreeting(greetings?.welcome_greeting),
      voicemail: toStoredGreeting(greetings?.voicemail),
      ring_tone: toStoredGreeting(greetings?.ring_tone),
      on_hold_music: toStoredGreeting(greetings?.on_hold_music),
    },
    ...(uuid ? { uuid, userID: uuid } : {}),
  };
};
