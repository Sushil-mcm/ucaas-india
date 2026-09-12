/* Admin › People › Authentication: the pure part.
 *
 * Everything on that page lives in the company's `company_security` section
 * (the same record Company › Security writes): `idle_timeout`, `sso`, and
 * two keys added by the People module on 11 Sep 2026:
 *
 *   allowed_domains   string[]   e-mail domains a new person may be on
 *   provisioning.scim { enabled, token_hash, token_hint, created_at }
 *
 * The provisioning token is generated in the browser and only its sha256 is
 * stored; the gateway compares hashes (services/ScimService). The token itself
 * is shown once. Its shape is "<company uuid>.<secret>" so the gateway can
 * find the company without scanning every tenant. */

export type AuthSettings = {
  ssoEnabled: boolean;
  idleEnabled: boolean;
  idleSeconds: number | null;
  allowedDomains: string[];
  scimEnabled: boolean;
  scimTokenHint: string;
  scimCreatedAt: string;
  version: number | undefined;
};

const asObject = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? (value as Record<string, any>) : {};
};

/** The whole company-defaults `settings` blob, whatever shape it arrived in. */
export const settingsObject = (value: unknown): Record<string, any> => asObject(value);

export const readAuthSettings = (section: unknown): AuthSettings => {
  const sec = asObject(section);
  const idle = asObject(sec.idle_timeout);
  const sso = asObject(sec.sso);
  const scim = asObject(asObject(sec.provisioning).scim);
  const seconds = Number(idle.seconds);
  return {
    ssoEnabled: sso.enabled === true,
    idleEnabled: idle.enabled === true,
    idleSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : null,
    allowedDomains: normaliseDomains(sec.allowed_domains),
    scimEnabled: scim.enabled === true && Boolean(scim.token_hash),
    scimTokenHint: String(scim.token_hint || ''),
    scimCreatedAt: String(scim.created_at || ''),
    version: typeof sec.version === 'number' ? sec.version : undefined,
  };
};

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Lower-cased, de-duplicated, "@" and spaces stripped, invalid entries dropped. */
export const normaliseDomains = (value: unknown): string[] => {
  const raw: unknown[] = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\s,;]+/) : [];
  const seen = new Set<string>();
  for (const item of raw) {
    const d = String(item ?? '').trim().toLowerCase().replace(/^@/, '');
    if (d && DOMAIN_RE.test(d)) seen.add(d);
  }
  return Array.from(seen);
};

/** Entries the person typed that are not domains, so the screen can say which. */
export const invalidDomains = (text: string): string[] =>
  text
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter((d) => d && !DOMAIN_RE.test(d));

export const isAllowedEmail = (email: string, domains: string[]): boolean => {
  if (!domains.length) return true;
  const at = String(email || '').lastIndexOf('@');
  if (at < 0) return false;
  return domains.includes(email.slice(at + 1).toLowerCase());
};

/** Merge, never replace: the section keeps everything Security wrote. */
export const withAuthSettings = (
  section: unknown,
  patch: { idleEnabled?: boolean; idleMinutes?: number | null; allowedDomains?: string[]; scim?: { enabled: boolean; token_hash?: string; token_hint?: string; created_at?: string } | null },
): Record<string, any> => {
  const sec = { ...asObject(section) };
  if (patch.idleEnabled !== undefined || patch.idleMinutes !== undefined) {
    const enabled = patch.idleEnabled ?? asObject(sec.idle_timeout).enabled === true;
    const minutes = patch.idleMinutes ?? (Number(asObject(sec.idle_timeout).seconds) || 0) / 60;
    sec.idle_timeout = { enabled, seconds: enabled && minutes ? Math.round(minutes * 60) : null };
  }
  if (patch.allowedDomains !== undefined) sec.allowed_domains = normaliseDomains(patch.allowedDomains);
  if (patch.scim !== undefined) {
    const provisioning = { ...asObject(sec.provisioning) };
    provisioning.scim = patch.scim === null ? { enabled: false } : { ...asObject(provisioning.scim), ...patch.scim };
    sec.provisioning = provisioning;
  }
  return sec;
};

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 32 random bytes, one URL-safe character each (the gateway accepts 24 or more). */
export const generateScimSecret = (cryptoImpl: Crypto = globalThis.crypto): string => {
  const bytes = new Uint8Array(32);
  cryptoImpl.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += BASE64URL[bytes[i] % 64];
  return out;
};

export const sha256Hex = async (text: string, cryptoImpl: Crypto = globalThis.crypto): Promise<string> => {
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const scimTokenFor = (companyUuid: string, secret: string): string => `${String(companyUuid).toLowerCase()}.${secret}`;

/** The base URL an identity provider is given; the gateway serves both spellings. */
export const scimBaseUrl = (apiBase: string): string => `${String(apiBase || '').replace(/\/+$/, '')}/scim/v2`;

/** Idle minutes accepted by both the browser hook and the gateway: 5 minutes to 24 hours. */
export const IDLE_MIN_MINUTES = 5;
export const IDLE_MAX_MINUTES = 24 * 60;
export const isIdleMinutesValid = (value: string | number): boolean => {
  const n = Number(value);
  return Number.isInteger(n) && n >= IDLE_MIN_MINUTES && n <= IDLE_MAX_MINUTES;
};
