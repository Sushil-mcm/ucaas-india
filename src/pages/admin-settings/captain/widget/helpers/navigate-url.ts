// Builds the URL an "Open URL" button navigates to, appending the customer's
// filled-in answers (or interpolating {{ token }}s), and only ever returns a
// safe-scheme URL. Ported from Chatwoot's shared/helpers/widgetNavigateURL.js.

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

const encode = (value: unknown) => encodeURIComponent(String(value).trim());

const isFilled = (value: unknown) =>
  value !== undefined && value !== null && String(value).trim() !== '';

const separatorFor = (base: string) => (/[=?&]$/.test(base) ? '' : '/');

const appendValues = (base: string, values: Record<string, unknown>, keys: string[]) => {
  const filled = keys.filter((key) => isFilled(values[key]));
  if (!filled.length) return base;
  const separator = separatorFor(base);
  const trimmedBase = separator === '/' ? base.replace(/\/+$/, '') : base;
  return `${trimmedBase}${separator}${filled.map((key) => encode(values[key])).join('/')}`;
};

const TOKEN_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;
const HAS_TOKEN = /\{\{\s*[\w.-]+\s*\}\}/;

const interpolate = (url: string, values: Record<string, unknown>) =>
  url.replace(TOKEN_PATTERN, (_m, key: string) => (isFilled(values[key]) ? encode(values[key]) : ''));

export const widgetNavigateURL = (
  url: string,
  values: Record<string, unknown> = {},
  keys: string[] | null = null,
): string | null => {
  const base = String(url || '').trim();
  if (!base) return null;

  const resolved = HAS_TOKEN.test(base)
    ? interpolate(base, values)
    : appendValues(base, values, keys || Object.keys(values));

  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(resolved) ? resolved : `https://${resolved}`;

  try {
    return SAFE_PROTOCOLS.includes(new URL(candidate).protocol) ? candidate : null;
  } catch {
    return null;
  }
};
