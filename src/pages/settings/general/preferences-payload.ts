/* The body of a Preferences save, built away from the page so it can be
 * checked without React.
 *
 * The save endpoint REPLACES the whole `settings` column with what it is
 * sent, and the Preferences form only ever hydrates the keys it shows. So any
 * key another screen wrote to the person's record used to be deleted the
 * first time Save was pressed here. The one that matters most is
 * `international_calling` — the admin's per-person rule on calling abroad, and
 * the only per-person key the switch actually reads. Starting from the stored
 * record and laying the form's keys over it keeps everything this page does
 * not know about, now and for keys added later.
 */
import { getHolidaysPayload } from '@/lib/utils';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/pages/admin-settings/numbers/set-number-forwarding/constants';

/* The record arrives parsed or as JSON text, depending on the caller. */
export const parseSettings = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/* Company rule flags describe what the company does to a person; they are not
   part of that person's own settings. `override` was already stripped for that
   reason, and `apply`/`locked` are the same flag split in two, so all three go.
   Left in, this page would save the company's rule back onto the individual
   record, and the lock would then be read from the wrong level. */
const RULE_FLAG_KEYS = ['override', 'apply', 'locked'];

export function removeOverride<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(removeOverride) as unknown as T;
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([key]) => !RULE_FLAG_KEYS.includes(key))
        .map(([key, value]) => [key, removeOverride(value)]),
    ) as unknown as T;
  }
  return obj;
}

/* `storedSettings` is the person's record as loaded (already parsed);
   `formSettings` is the form's `settings` object as the page holds it. */
export const buildPreferencesPayload = (
  storedSettings: Record<string, any>,
  formSettings: any,
): Record<string, any> => {
  const {
    display_number: { masking = {}, incoming = {}, show_number_if_blocked = 'NO' } = {},
    operational_hours = {},
    ...restSettings
  }: any = formSettings || {};

  const tempSettings = {
    ...storedSettings,
    ...restSettings,
    display_number: {
      incoming,
      masking: {
        type: masking?.type?.value,
        label: masking?.type?.label,
        value: masking?.value,
      },
      show_number_if_blocked,
    },

    operational_hours: {
      type: operational_hours?.type,
      value: operational_hours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
      holidays: operational_hours?.holidays?.length
        ? getHolidaysPayload(operational_hours.holidays)
        : [],
      regional: {
        country: operational_hours?.regional?.country,
        timezone: operational_hours?.regional?.timezone,
        time_format: operational_hours?.regional?.time_format,
        country_code: operational_hours?.regional?.country_code,
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
  };

  return removeOverride(tempSettings);
};
