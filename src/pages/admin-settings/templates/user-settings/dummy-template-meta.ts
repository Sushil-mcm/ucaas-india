/* Tags, status, author and usage numbers for the User Settings Templates
 * list — none of these exist on the real template record (see
 * src/lib/user-settings-template-form.ts: a template is only ever
 * name/settings/greetings/uuid). Demo-only, gated by isDemoMode() the same
 * way the notification drawer's sample data is, so this never shows up
 * anywhere but a preview host — see src/lib/demo-mode.ts.
 *
 * Deterministic, not random: the same template always gets the same tags,
 * status and author, derived from its own uuid/name rather than
 * Math.random(). A demo screen that reshuffles itself on every re-render
 * reads as broken, not as a feature.
 */

export interface DummyAuthor {
  name: string;
  initials: string;
  colour: string;
}

export type DummyTemplateStatus = 'Active' | 'Archived' | 'Pending' | 'Draft';

const DEMO_TAGS = ['Sales Team', 'Onboarding', 'Support', 'Admin'] as const;

/** Who a template is visible to. Same demo-only status as tags/status/author
 *  below — nothing in the real record has an audience. */
export const DEMO_ACCESS = ['Admin Only', 'Team View', 'Company Wide'] as const;

const ACCESS_COLOURS: Record<string, { bg: string; text: string }> = {
  'Admin Only': { bg: '#fbe2c8', text: '#8a4a2a' },
  'Team View': { bg: '#e0e7f7', text: '#3949ab' },
  'Company Wide': { bg: '#ddf2e3', text: '#1f7a4d' },
};

export const getAccessColours = (access: string) =>
  ACCESS_COLOURS[access] || { bg: '#f0d6b4', text: '#7a3f1f' };

const STATUS_COLOURS: Record<DummyTemplateStatus, { bg: string; text: string }> = {
  Active: { bg: '#dcf3e3', text: '#1f7a4d' },
  Archived: { bg: '#e5e5e5', text: '#5f5f5f' },
  Pending: { bg: '#fdecc8', text: '#9a6b12' },
  Draft: { bg: '#e6e1f7', text: '#5b3fa0' },
};

export const getStatusColours = (status: DummyTemplateStatus) => STATUS_COLOURS[status];

const DEMO_AUTHORS: DummyAuthor[] = [
  { name: 'Amy Fernandes', initials: 'AF', colour: '#ea6b42' },
  { name: 'Andra Kulkarni', initials: 'AK', colour: '#b5502f' },
  { name: 'Joshan Mehta', initials: 'JM', colour: '#e8965f' },
  { name: 'Janna Rao', initials: 'JR', colour: '#c97a4a' },
];

const TAG_COLOURS: Record<string, { bg: string; text: string }> = {
  'Sales Team': { bg: '#fbe2c8', text: '#b5502f' },
  Onboarding: { bg: '#fdf0e0', text: '#c97a4a' },
  Support: { bg: '#f7dcc0', text: '#8a4a2a' },
  Admin: { bg: '#f0d6b4', text: '#7a3f1f' },
};

export const getTagColours = (tag: string) => TAG_COLOURS[tag] || { bg: '#f0d6b4', text: '#7a3f1f' };

/** Turns a string into a small positive int, stable across renders and reloads. */
const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

/* Archived state and favourite are the two pieces of this an admin can
 * actually toggle in the demo, so — same reasoning as the notification
 * drawer's read/unread store — they live at module scope rather than
 * component state, to survive this drawer closing and reopening. Not
 * persisted past a page reload; there is nowhere real to persist them to. */
let dummyArchivedOverrides = new Set<string>();
let dummyFavouriteOverrides = new Set<string>();

/** The status a row actually shows, once a manual archive/unarchive is
 *  layered on top of its base roll. Unarchiving a row that rolled Pending or
 *  Draft returns it to that original status rather than forcing Active —
 *  archiving is the only override that exists, so undoing it means "go back
 *  to what it was", not "assume it was always active". */
export const getDummyTemplateStatus = (
  uuid: string,
  baseStatus: DummyTemplateStatus,
): DummyTemplateStatus => {
  if (dummyArchivedOverrides.has(`archive:${uuid}`)) return 'Archived';
  if (dummyArchivedOverrides.has(`unarchive:${uuid}`)) {
    return baseStatus === 'Archived' ? 'Active' : baseStatus;
  }
  return baseStatus;
};

export const isDummyTemplateArchived = (uuid: string, baseStatus: DummyTemplateStatus): boolean =>
  getDummyTemplateStatus(uuid, baseStatus) === 'Archived';

export const toggleDummyTemplateArchived = (uuid: string, nextArchived: boolean) => {
  const next = new Set(dummyArchivedOverrides);
  next.delete(`archive:${uuid}`);
  next.delete(`unarchive:${uuid}`);
  next.add(`${nextArchived ? 'archive' : 'unarchive'}:${uuid}`);
  dummyArchivedOverrides = next;
};

export const isDummyTemplateFavourite = (uuid: string, baseFavourite: boolean): boolean => {
  if (dummyFavouriteOverrides.has(`unfavourite:${uuid}`)) return false;
  if (dummyFavouriteOverrides.has(`favourite:${uuid}`)) return true;
  return baseFavourite;
};

export const toggleDummyTemplateFavourite = (uuid: string, nextFavourite: boolean) => {
  const next = new Set(dummyFavouriteOverrides);
  next.delete(`favourite:${uuid}`);
  next.delete(`unfavourite:${uuid}`);
  next.add(`${nextFavourite ? 'favourite' : 'unfavourite'}:${uuid}`);
  dummyFavouriteOverrides = next;
};

export interface DummyTemplateMeta {
  tags: string[];
  baseStatus: DummyTemplateStatus;
  access: (typeof DEMO_ACCESS)[number];
  author: DummyAuthor;
  /** How many people this template is shown as applied to, for the usage chart. */
  profileCount: number;
  baseFavourite: boolean;
}

/** The template's own uuid/name decide everything below — same input, same output. */
export const getDummyTemplateMeta = (template: any): DummyTemplateMeta => {
  const seed = hashString(String(template?.uuid || template?.name || ''));

  const tagCount = 1 + (seed % 2);
  const tags = Array.from(
    new Set(
      Array.from({ length: tagCount }, (_, i) => DEMO_TAGS[(seed + i * 7) % DEMO_TAGS.length]),
    ),
  );

  /* Out of 15 rolls: 3 Archived, 2 Pending, 1 Draft, 9 Active — Draft is
     rarest since it stands for a template nobody finished setting up. */
  const statusRoll = seed % 15;
  const baseStatus: DummyTemplateStatus =
    statusRoll < 3 ? 'Archived' : statusRoll < 5 ? 'Pending' : statusRoll < 6 ? 'Draft' : 'Active';

  return {
    tags,
    baseStatus,
    access: DEMO_ACCESS[seed % DEMO_ACCESS.length],
    author: DEMO_AUTHORS[seed % DEMO_AUTHORS.length],
    profileCount: 2 + (seed % 14),
    baseFavourite: seed % 4 === 0,
  };
};

export const DUMMY_FILTER_TAGS = DEMO_TAGS;
export const DUMMY_FILTER_AUTHORS = DEMO_AUTHORS.map((author) => author.name);
export const DUMMY_FILTER_STATUSES: DummyTemplateStatus[] = ['Active', 'Archived', 'Pending', 'Draft'];
export const DUMMY_FILTER_ACCESS = DEMO_ACCESS;

/** Six months of made-up "profiles updated via a template" counts, for the usage chart. */
export const buildDummyUsageSeries = (templates: any[]): { label: string; count: number }[] => {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const total = templates.reduce(
    (sum, template) => sum + getDummyTemplateMeta(template).profileCount,
    0,
  );
  return months.map((label, index) => {
    const wave = Math.sin((index + 1) * 1.1) * 0.5 + 0.5;
    return { label, count: Math.max(1, Math.round((total / months.length) * (0.6 + wave))) };
  });
};

/** How often each settings area shows up switched on, across all templates. */
export const buildDummyFrequentFields = (
  templates: any[],
): { label: string; count: number }[] => {
  const fields = ['Business Hours', 'Recording', 'Caller ID', 'Regional', 'Greetings'];
  return fields
    .map((label, index) => ({
      label,
      count: templates.reduce((sum, template) => {
        const seed = hashString(String(template?.uuid || template?.name || '') + label);
        return sum + (seed % 3 === index % 3 ? 1 : 0) + 1;
      }, 0),
    }))
    .sort((a, b) => b.count - a.count);
};
