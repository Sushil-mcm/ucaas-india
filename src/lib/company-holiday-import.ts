/* Bringing the company holiday list onto one line's business hours.
 *
 * the established model, which this follows: holidays are declared once for the
 * company, then each line — a queue, an IVR, a person, a number — decides what
 * actually happens on those dates. Declaring Christmas centrally does not close
 * anything on its own; a line has to take the date and attach an action to it.
 *
 * The action is the part that is easy to get wrong. Every holiday on a line is
 * validated with `holidaySchema` (src/pages/admin-settings/constants.ts),
 * which requires BOTH `type.value` and `value.value`. A holiday imported with an
 * empty action does not quietly fall back to anything — it fails validation and
 * blocks the whole business-hours form from saving, on a screen that gives no
 * clue why. So an action is always attached here, copied from the line's own
 * closed-hours behaviour, which is also the semantic established systems describes: a
 * holiday borrows what the line already does when it is shut.
 */

export interface ImportableCompanyHoliday {
  title: string;
  /* 'YYYY-MM-DD' as stored on the company record. */
  from: string;
  to: string;
  /* Read from the company list so callers can see which dates repeat, but NOT
     written onto a line. `getHolidaysPayload` in src/lib/utils.ts builds each
     saved holiday from a fixed set of fields and silently discards anything
     else, so a tenth key would never reach the server — it would look carried
     through in the form and be gone after a reload. Marking a holiday as
     repeating therefore stops at the company list until the holiday record
     itself can hold the flag. */
  repeats_yearly?: boolean;
}

export interface HolidayAction {
  type: { label: string; value: string };
  value: { label: string; value: string; name?: string };
  personal?: boolean;
}

export interface ImportResult {
  /* Ready to hand straight to react-hook-form's `append`. */
  toAppend: any[];
  /* Already on this line, matched on name and start date. */
  skippedDuplicate: number;
  /* Dropped because the line's holiday limit was reached. */
  skippedCapacity: number;
  /* True when no valid action could be resolved — neither a closed-hours action
     nor an extension to fall back to. Importing anyway would append rows that
     fail validation and block the form from saving with no visible cause, so
     nothing is imported and the caller explains what to set first. */
  unresolvedAction: boolean;
}

/* Parsed to local noon so a browser west of UTC cannot render 2026-12-25 as the
   24th, which is how an off-by-one holiday reaches production. */
const isoToDate = (iso: string): Date | null => {
  const parts = `${iso}`.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
};

const pad = (value: number) => `${value}`.padStart(2, '0');

/* Existing rows hold Date objects, company rows hold strings, and rows loaded
   from the API can be either. All three are reduced to 'YYYY-MM-DD' so the
   duplicate check compares like with like. */
const toDayKey = (value: any): string => {
  if (!value) return '';
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const text = `${value}`;
  return text.length >= 10 ? text.slice(0, 10) : text;
};

const dedupeKey = (title: any, from: any) =>
  `${`${title || ''}`.trim().toLowerCase()}|${toDayKey(from)}`;

/* The line's own closed-hours action, or a voicemail fallback when it has none
   set yet. Both halves must carry a `value` or the row will not validate. */
const resolveAction = (
  closedHourAction: HolidayAction | undefined,
  fallbackExtension: string | undefined,
): HolidayAction | null => {
  const type = closedHourAction?.type;
  const value = closedHourAction?.value;

  if (type?.value && value?.value) {
    return {
      type: { label: type.label || '', value: type.value },
      value: { label: value.label || '', value: value.value, name: value.name || '' },
      personal: Boolean(closedHourAction?.personal),
    };
  }

  /* Without an extension there is no voicemail box to send the call to, so
     there is no valid fallback to invent. */
  if (!`${fallbackExtension || ''}`.trim()) return null;

  return {
    type: { label: 'Send to Voicemail', value: 'VOICEMAIL' },
    value: { label: '', value: `${fallbackExtension}`, name: '' },
    personal: true,
  };
};

export const buildHolidayImport = ({
  companyHolidays,
  existingHolidays,
  closedHourAction,
  fallbackExtension,
  capacity,
}: {
  companyHolidays: ImportableCompanyHoliday[];
  existingHolidays: any[];
  closedHourAction?: HolidayAction;
  fallbackExtension?: string;
  /* How many more rows this line will accept. */
  capacity: number;
}): ImportResult => {
  const seen = new Set(
    (existingHolidays || []).map((holiday) => dedupeKey(holiday?.title, holiday?.from)),
  );

  const action = resolveAction(closedHourAction, fallbackExtension);
  if (!action) {
    return { toAppend: [], skippedDuplicate: 0, skippedCapacity: 0, unresolvedAction: true };
  }

  const toAppend: any[] = [];
  let skippedDuplicate = 0;
  let skippedCapacity = 0;

  for (const holiday of companyHolidays || []) {
    const key = dedupeKey(holiday?.title, holiday?.from);
    if (seen.has(key)) {
      skippedDuplicate += 1;
      continue;
    }

    const from = isoToDate(holiday?.from);
    /* A single-day holiday stores the same date twice; a missing `to` is still
       treated as one day rather than an open-ended closure. */
    const to = isoToDate(holiday?.to || holiday?.from);
    if (!from || !to) {
      skippedDuplicate += 1;
      continue;
    }

    if (toAppend.length >= Math.max(capacity, 0)) {
      skippedCapacity += 1;
      continue;
    }

    seen.add(key);
    toAppend.push({
      title: holiday.title,
      from,
      to,
      type: { ...action.type },
      value: { ...action.value },
      personal: action.personal,
      /* Deliberately not copied — see the note on the type above. Writing it
         here would be discarded on save and read as working. */
    });
  }

  return { toAppend, skippedDuplicate, skippedCapacity, unresolvedAction: false };
};

/* Pulls the declared list off the company record. Tolerates both shapes the
   data has had: a bare array, and the versioned `{ items: [...] }` wrapper. */
export const readCompanyHolidays = (settings: any): ImportableCompanyHoliday[] => {
  const stored = settings?.company_holidays;
  const items = Array.isArray(stored) ? stored : stored?.items;
  if (!Array.isArray(items)) return [];

  return items
    .filter((item: any) => item?.title && item?.from)
    .map((item: any) => ({
      title: `${item.title}`,
      from: `${item.from}`,
      to: `${item.to || item.from}`,
      repeats_yearly: Boolean(item.repeats_yearly),
    }));
};
