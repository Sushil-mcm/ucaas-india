/* The company logo: what may be uploaded, where it is kept, and how it is shown.
 *
 * WHERE IT LIVES, AND WHY NOT ON THE COMPANY ROW
 *
 * On the Company Default template under `company_logo`, beside company_identity,
 * company_holidays and company_ring_time. The obvious home looks like a column
 * on the companies table, but that row is billing data owned by platform staff
 * and tenant writes to it are expected to be refused - the company screen
 * already catches that refusal and tells the customer their console saved while
 * their billing record did not. A setting that sometimes silently fails to save
 * is worse than one kept somewhere the customer can actually write.
 *
 * THE FILE ITSELF
 *
 * Uploaded through the same media path as every other image here: ask the API
 * for a URL, PUT the file to storage, keep only the file name. It is fetched
 * back as `<company_uuid>/logo/<file>` through the authenticated media route, so
 * one company cannot read another's - which matters because a logo is often the
 * first thing a new customer uploads and the last thing anyone thinks to guard.
 */

export const LOGO_SETTINGS_KEY = 'company_logo';
export const LOGO_SCHEMA_VERSION = 1;

/* PNG only, matching the format customers already expect to supply for a logo,
   and the one that reliably carries a transparent background - a logo on a
   coloured header looks broken without it. */
export const ACCEPTED_LOGO_TYPES = ['image/png'] as const;

/* The hard ceiling. Generous on purpose: refusing somebody's file is worse than
   carrying one that is larger than ideal, and this is a once-per-company
   upload. */
export const MAX_LOGO_BYTES = 30 * 1024 * 1024;

/* Above this it still uploads, but it is worth saying something. A header logo
   is displayed a few dozen pixels tall and is fetched by every person in the
   company on every visit, so a large file is a cost everybody pays rather than
   a nicer picture. */
export const LARGE_LOGO_BYTES = 1 * 1024 * 1024;

export interface StoredLogo {
  version: number;
  updated_at: string;
  /* The file name only. Empty string means the company has cleared it - which
     is a different state from never having set one, and both read as "no
     logo" without needing to be told apart. */
  file_name: string;
}

export interface LogoCheck {
  ok: boolean;
  /* Said in the words a person can act on, never a code. */
  reason?: string;
  /* Accepted, but worth mentioning. */
  advice?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
};

/* Whether this file may be uploaded. Checked before anything is sent, so a
   refusal costs nobody an upload. */
export const checkLogoFile = (file: { name?: string; type?: string; size?: number } | null | undefined): LogoCheck => {
  if (!file) {
    return { ok: false, reason: 'No file was chosen.' };
  }

  const size = Number(file.size);
  /* Checked before the type, because a zero-byte file with the right extension
     is the more confusing failure - it uploads happily and shows nothing. */
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: 'That file is empty. Try exporting it again.' };
  }

  const type = String(file.type || '').toLowerCase();
  if (!ACCEPTED_LOGO_TYPES.includes(type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
    return {
      ok: false,
      reason: 'A logo has to be a PNG. That is the format that keeps a transparent background, so your logo sits on the header rather than in a white box.',
    };
  }

  if (size > MAX_LOGO_BYTES) {
    return {
      ok: false,
      reason: `That file is ${formatBytes(size)}. The most a logo can be is ${formatBytes(MAX_LOGO_BYTES)}.`,
    };
  }

  if (size > LARGE_LOGO_BYTES) {
    return {
      ok: true,
      advice: `That will work, but at ${formatBytes(size)} it is much larger than a logo needs to be. It is shown about the height of this text, and everyone in your company downloads it every time they open the app — a smaller file makes that quicker for all of them.`,
    };
  }

  return { ok: true };
};

/* Read the stored logo out of the template's settings blob. Tolerates the older
   shape of a bare string, because a setting written before it was versioned
   should not disappear when the shape changes. */
export const readStoredLogo = (settings: unknown): string => {
  const raw = (settings as any)?.[LOGO_SETTINGS_KEY];
  if (typeof raw === 'string') return raw.trim();
  const fileName = (raw as StoredLogo | undefined)?.file_name;
  return typeof fileName === 'string' ? fileName.trim() : '';
};

/* What to save. Versioned from the start, so the next change to this shape can
   tell old records from new ones instead of guessing. */
export const buildStoredLogo = (fileName: string, now: Date = new Date()): StoredLogo => ({
  version: LOGO_SCHEMA_VERSION,
  updated_at: now.toISOString(),
  file_name: String(fileName ?? '').trim(),
});

/* The URL the app fetches. Returns empty when there is nothing to show, so a
   caller can test the string rather than remembering to check two things. */
export const logoMediaUrl = (params: {
  apiBaseUrl: string;
  companyUuid?: string | null;
  fileName?: string | null;
}): string => {
  const file = String(params.fileName ?? '').trim();
  const company = String(params.companyUuid ?? '').trim();
  const base = String(params.apiBaseUrl ?? '').replace(/\/+$/, '');
  if (!file || !company || !base) return '';
  return `${base}/api/media/${encodeURIComponent(company)}/logo/${encodeURIComponent(file)}`;
};
