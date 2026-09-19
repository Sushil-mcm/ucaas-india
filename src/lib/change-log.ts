/* Company change log — pure helpers.
 *
 * The server has kept a history row for every company-settings save since
 * 3 Sep 2026 (`company_settings_history`: one row per section per version,
 * with who saved it and the whole section as it was after the save). Nothing
 * read those rows into a screen. This module turns them into something an
 * admin can read: one line per changed field, newest first, with the value
 * before and after, plus the IP-allowlist decisions the Security page has
 * kept in its own audit list.
 *
 * It deliberately knows nothing about React or the network; the page fetches,
 * this module explains. Tested in tests/change-log-test.cjs. */

export interface HistoryRow {
  section?: string;
  settings?: any;
  version?: number;
  updated_at?: string;
  updated_by?: string;
  updated_by_name?: string;
  changed_at?: string;
  changed_by?: string;
  changed_by_name?: string;
}

export interface ChangeLogEntry {
  /* ISO time of the save. */
  at: string;
  section: string;
  /* Which setting inside the section moved, as a dotted path. Empty when the
     whole section was first created and there is nothing to compare against. */
  field: string;
  before: string;
  after: string;
  actor: string;
  actor_uuid?: string;
  version?: number | string;
  correlation_id?: string;
  event_id?: string;
  entity_uuid?: string;
  evidence?: string;
  /* 'settings' rows come from company_settings_history; 'security' rows are
     the IP-allowlist audit the Security page keeps; 'audit' rows are the
     server's configuration-change log (people, roles, numbers, sites, desk
     phones, recording access). */
  source: 'settings' | 'security' | 'audit' | 'central';
}

const isPlainObject = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/* A value as a person would read it in a table cell. Objects and arrays are
   shown as compact JSON, clipped so one giant blob does not swallow the row. */
export const showValue = (value: unknown, max = 120): string => {
  if (value === undefined) return '—';
  if (value === null) return 'empty';
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (typeof value === 'string') return value === '' ? 'empty' : clip(value, max);
  if (typeof value === 'number') return String(value);
  try {
    return clip(JSON.stringify(value), max);
  } catch {
    return clip(String(value), max);
  }
};

const clip = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/* Every leaf that differs between two versions of a section, as dotted paths.
   Arrays are compared whole: a list of holidays that changed is one change,
   "holidays", not one per element — that is how the admin thinks of it. */
export const diffSettings = (
  before: any,
  after: any,
  prefix = '',
): Array<{ field: string; before: unknown; after: unknown }> => {
  const out: Array<{ field: string; before: unknown; after: unknown }> = [];
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    Array.from(keys)
      .sort()
      .forEach((key) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const a = before[key];
        const b = after[key];
        if (isPlainObject(a) && isPlainObject(b)) {
          out.push(...diffSettings(a, b, path));
        } else if (!sameValue(a, b)) {
          out.push({ field: path, before: a, after: b });
        }
      });
    return out;
  }
  if (!sameValue(before, after)) out.push({ field: prefix, before, after });
  return out;
};

const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/* Human names for the section keys the store uses. Anything not listed is
   shown as its key with underscores opened up, which is still readable. */
const SECTION_LABELS: Record<string, string> = {
  operational_hours: 'Phone rules · business hours',
  recording: 'Phone rules · call recording',
  transcription: 'Phone rules · transcription',
  ai_call_monitoring: 'Phone rules · AI call monitoring',
  display_number: 'Phone rules · display number',
  voicemail_pin: 'Phone rules · voicemail',
  role: 'Phone rules · role',
  greetings: 'Greetings',
  holidays: 'Holidays',
  company_holidays: 'Holidays',
  emergency_address: 'Emergency address',
  messaging: 'Messaging',
  policies: 'Policies',
  break_reasons: 'Break reasons',
  duty_policy: 'Duty policy',
  campaign_timers: 'Campaign timers',
  alerts: 'Alerts',
  security: 'Security',
  desk_phones: 'Desk phones',
  numbers: 'Numbers',
  company_calling_permissions: 'Calling permissions',
  people: 'People',
  roles: 'Roles',
  sites: 'Locations',
  'desk-phones': 'Desk phones',
  recordings: 'Recordings',
  retention: 'Retention',
  user_profile: 'User profiles',
  company_profile: 'Company profile',
  office_policy: 'Office policies',
};

export const sectionLabel = (section: string): string =>
  SECTION_LABELS[section] || section.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const actorOf = (row: HistoryRow): string =>
  row.updated_by_name?.trim() || row.changed_by_name?.trim() || row.updated_by || row.changed_by || 'Unknown';

/* History rows for one section (any order) → change entries. Consecutive
   versions are compared; the oldest row we hold is reported as "saved" with
   no before/after, because whatever came before it is not in the list. */
export const entriesForSection = (section: string, rows: HistoryRow[]): ChangeLogEntry[] => {
  const sorted = [...rows].sort((a, b) => {
    const va = Number(a.version ?? 0);
    const vb = Number(b.version ?? 0);
    if (va !== vb) return va - vb;
    return String(a.updated_at || a.changed_at || '').localeCompare(String(b.updated_at || b.changed_at || ''));
  });
  const out: ChangeLogEntry[] = [];
  sorted.forEach((row, index) => {
    const at = String(row.updated_at || row.changed_at || '');
    const base = {
      at,
      section,
      actor: actorOf(row),
      actor_uuid: row.updated_by || row.changed_by,
      version: row.version,
      source: 'settings' as const,
    };
    if (index === 0) {
      out.push({ ...base, field: '', before: '—', after: 'Section saved (earliest version kept)' });
      return;
    }
    const changes = diffSettings(sorted[index - 1].settings, row.settings);
    if (!changes.length) {
      out.push({ ...base, field: '', before: '—', after: 'Saved with no field changed' });
      return;
    }
    changes.forEach((change) => {
      out.push({
        ...base,
        field: change.field,
        before: showValue(change.before),
        after: showValue(change.after),
      });
    });
  });
  return out;
};

export interface SecurityAuditRow {
  at: string;
  actor_uuid?: string;
  actor_name?: string;
  action: string;
  detail: string;
}

const SECURITY_ACTIONS: Record<string, string> = {
  add: 'IP allowlist entry added',
  remove: 'IP allowlist entry removed',
  enable: 'IP allowlist switched on',
  disable: 'IP allowlist switched off',
  break_glass_armed: 'Break-glass window armed',
  break_glass_cleared: 'Break-glass window cleared',
};

export const entriesForSecurityAudit = (rows: SecurityAuditRow[]): ChangeLogEntry[] =>
  rows
    .filter((row) => row && row.at)
    .map((row) => ({
      at: String(row.at),
      section: 'security',
      field: SECURITY_ACTIONS[row.action] || row.action,
      before: '—',
      after: String(row.detail || ''),
      actor: (row.actor_name && row.actor_name.trim()) || row.actor_uuid || 'Unknown',
      actor_uuid: row.actor_uuid,
      source: 'security' as const,
    }));

/* A row of the server's configuration-change log (company_audit_logs, read
   through GET /api/audit/log). `changes` is { field: { from, to } }; rows
   written by the generic trail carry `from: null`, meaning "not recorded",
   which is shown as such rather than as "empty". */
export interface AuditLogRow {
  uuid?: string;
  action: string;
  entity_type?: string | null;
  entity_uuid?: string | null;
  summary?: string | null;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
  actor_uuid?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  created_at?: string;
  version?: number | string;
  correlation_id?: string;
  before_recorded?: boolean;
  source?: 'central';
  evidence?: string;
}

/* The action key's first word names the area: "people.update" -> people. */
export const auditArea = (action: string): string => String(action || '').split('.')[0] || 'other';

export const NOT_RECORDED = 'not recorded';

export const entriesForAuditLog = (rows: AuditLogRow[]): ChangeLogEntry[] => {
  const out: ChangeLogEntry[] = [];
  rows
    .filter((row) => row && row.action)
    .forEach((row) => {
      const at = String(row.created_at || '');
      const area = auditArea(row.action);
      const actor = (row.actor_name && row.actor_name.trim()) || row.actor_uuid || 'Unknown';
      const base = {
        at, section: area, actor, actor_uuid: row.actor_uuid || undefined,
        source: row.source === 'central' ? 'central' as const : 'audit' as const,
        version: row.version, correlation_id: row.correlation_id, event_id: row.uuid,
        entity_uuid: row.entity_uuid || undefined, evidence: row.evidence,
      };
      const changes = row.changes && typeof row.changes === 'object' ? row.changes : null;
      const keys = changes ? Object.keys(changes) : [];
      if (!keys.length) {
        out.push({ ...base, field: row.summary || row.action, before: '—', after: row.entity_uuid ? `${row.entity_type || 'item'} ${row.entity_uuid}` : row.action });
        return;
      }
      keys.forEach((key) => {
        const change = changes![key] || { from: null, to: null };
        out.push({
          ...base,
          field: `${row.summary || row.action} · ${key}`,
          before: !row.before_recorded && (change.from === null || change.from === undefined) ? NOT_RECORDED : showValue(change.from),
          after: showValue(change.to),
        });
      });
    });
  return out;
};

/* Everything, newest first. */
export const buildChangeLog = (
  histories: Record<string, HistoryRow[]>,
  securityAudit: SecurityAuditRow[] = [],
  auditLog: AuditLogRow[] = [],
): ChangeLogEntry[] => {
  const all: ChangeLogEntry[] = [];
  Object.keys(histories).forEach((section) => {
    all.push(...entriesForSection(section, histories[section] || []));
  });
  all.push(...entriesForSecurityAudit(securityAudit));
  all.push(...entriesForAuditLog(auditLog));
  return all.sort((a, b) => b.at.localeCompare(a.at));
};

export interface ChangeLogFilter {
  section?: string;
  actor?: string;
  text?: string;
}

export const filterChangeLog = (
  entries: ChangeLogEntry[],
  filter: ChangeLogFilter,
): ChangeLogEntry[] => {
  const text = (filter.text || '').trim().toLowerCase();
  return entries.filter((entry) => {
    if (filter.section && entry.section !== filter.section) return false;
    if (filter.actor && entry.actor !== filter.actor) return false;
    if (text) {
      const hay = `${entry.field} ${entry.before} ${entry.after} ${entry.actor} ${sectionLabel(
        entry.section,
      )} ${entry.correlation_id || ''} ${entry.entity_uuid || ''} ${entry.event_id || ''}`.toLowerCase();
      if (!hay.includes(text)) return false;
    }
    return true;
  });
};

/* CSV with the same columns as the table. Every cell is quoted so a value
   holding a comma or a line break cannot break the row. */
export const changeLogToCsv = (entries: ChangeLogEntry[]): string => {
  const q = (value: string) => {
    const raw = String(value ?? '');
    let start = 0;
    while (start < raw.length && (raw.charCodeAt(start) <= 32 || /\s/.test(raw[start]))) start++;
    const safe = /^[=+@-]/.test(raw.slice(start)) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = [['When', 'Section', 'Setting', 'Before', 'After', 'Who', 'Source', 'Version', 'Correlation', 'Event', 'Subject', 'Evidence'].map(q).join(',')];
  entries.forEach((entry) => {
    lines.push(
      [entry.at, sectionLabel(entry.section), entry.field, entry.before, entry.after, entry.actor, entry.source,
        String(entry.version ?? ''), entry.correlation_id || '', entry.event_id || '', entry.entity_uuid || '', entry.evidence || '']
        .map(q)
        .join(','),
    );
  });
  return lines.join('\r\n');
};
