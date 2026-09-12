/* Which time zone a report is in.
 *
 * The agent-day reports cut days at midnight in a zone. "Today so far" on
 * Performance › Agents follows the browser (the person looking wants their
 * own today); the report screens should follow the COMPANY, because a
 * supervisor in one zone reads the same numbers as the owner in another.
 *
 * Where the company's zone comes from, in order:
 *   1. the main location (is_default '1', or the only location) — the same
 *      rule lib/company-default-country.ts uses for the country;
 *   2. the signed-in person's regional setting
 *      (settings.operational_hours.regional.timezone.value), which the
 *      dialer already trusts for hours;
 *   3. the browser.
 * Every screen says which one it used, so a number is never read in the
 * wrong zone without the reader being told. Pure: no React, no network. */

export type TimeZoneSource = 'company' | 'personal' | 'browser';

export interface TimeZoneChoice {
  timeZone: string;
  source: TimeZoneSource;
}

export const isValidTimeZone = (timeZone: unknown): boolean => {
  const name = String(timeZone ?? '').trim();
  if (!name) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name });
    return true;
  } catch {
    return false;
  }
};

const isMain = (site: any): boolean => {
  const flag = site?.is_default;
  return flag === '1' || flag === 1 || flag === true;
};

/* The main location, or the only one; two or more unflagged is nobody. */
export const mainSite = (sites: unknown): any | null => {
  const rows = Array.isArray(sites) ? sites : [];
  if (!rows.length) return null;
  const flagged = rows.filter(isMain);
  return flagged.length ? flagged[0] : rows.length === 1 ? rows[0] : null;
};

export const personalTimeZone = (user: any): string => {
  const value = user?.settings?.operational_hours?.regional?.timezone?.value;
  return isValidTimeZone(value) ? String(value) : '';
};

export const resolveCompanyTimeZone = (input: {
  sites?: unknown;
  user?: any;
  browser: string;
}): TimeZoneChoice => {
  const site = mainSite(input.sites);
  const company = String(site?.timezone ?? '').trim();
  if (isValidTimeZone(company)) return { timeZone: company, source: 'company' };
  const personal = personalTimeZone(input.user);
  if (personal) return { timeZone: personal, source: 'personal' };
  return { timeZone: isValidTimeZone(input.browser) ? input.browser : 'UTC', source: 'browser' };
};

const whyText = (choice: TimeZoneChoice): string =>
  choice.source === 'company' ? 'company' : choice.source === 'personal' ? 'your regional setting' : 'this browser';

/* "times in Asia/Kolkata (company)" — the small label beside a report. */
export const timeZoneLabel = (choice: TimeZoneChoice): string => `times in ${choice.timeZone} (${whyText(choice)})`;

/* "Days are cut at midnight in Asia/Kolkata (company)." — the note under a
   report whose rows are calendar days. */
export const midnightSentence = (choice: TimeZoneChoice): string =>
  `Days are cut at midnight in ${choice.timeZone} (${whyText(choice)}).`;

/* Today's calendar date in a zone, YYYY-MM-DD. */
export const todayIn = (timeZone: string, now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
