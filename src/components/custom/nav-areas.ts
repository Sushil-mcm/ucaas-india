/**
 * The MCM Unified Console's top-level areas.
 *
 * The artifact groups the product into a handful of areas across the top bar,
 * each with its own left rail, rather than one flat sidebar. This is that
 * grouping expressed over the nav items the app already has — the top nav and
 * the sidebar both read it, so an area can never highlight one thing while the
 * rail below shows another.
 *
 * Nothing here grants access. Items are still produced and RBAC-filtered by
 * `navList` / `navListBottom` in sidebar.tsx; an area simply decides which of
 * the surviving items belong to it, and hides itself when none do.
 */

export type AreaId = 'home' | 'directory' | 'activity' | 'performance' | 'integration' | 'admin';

export type NavArea = {
  id: AreaId;
  label: string;
  icon: string;
  /** Nav item names, in the order the rail should show them. */
  items: string[];
};

/**
 * The artifact also carries an "Apps" area. The platform has no installed-apps
 * surface yet, so it is left out rather than shown empty — an area that opens
 * onto nothing is worse than one that isn't there.
 */
export const NAV_AREAS: NavArea[] = [
  { id: 'home', label: 'Home', icon: 'HomeIcon', items: ['Home'] },
  { id: 'directory', label: 'Directory', icon: 'ContactIcon', items: ['Contact', 'Groups'] },
  {
    id: 'activity',
    label: 'Activity',
    icon: 'PhoneIcon',
    items: ['Phone', 'Chat', 'Agent Chat', 'Video', 'Campaign', 'Inbox'],
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: 'AnalyticsIcon',
    items: ['Performance', 'Reports'],
  },
  { id: 'admin', label: 'Admin', icon: 'AdminIcon', items: ['Admin'] },
  { id: 'integration', label: 'Integration', icon: 'IntegrationIcon', items: ['Integration'] },
];

/** Which area a nav item belongs to. */
export const areaOfItem = (name: string): AreaId | null =>
  NAV_AREAS.find((area) => area.items.includes(name))?.id ?? null;

/**
 * Which area the current URL sits in.
 *
 * Matched on the item link that is the longest prefix of the path, so
 * `/department/extension` resolves to Directory rather than being missed, and a
 * deep link inside an area keeps that area lit.
 */
export const areaOfPath = (pathname: string, items: { name: string; link: string }[]): AreaId => {
  const path = String(pathname || '');
  const match = items
    .filter((item) => item.link && (path === item.link || path.startsWith(`${item.link}/`)))
    .sort((a, b) => b.link.length - a.link.length)[0];

  if (match) return areaOfItem(match.name) ?? 'home';

  // An area that owns a base path claims it directly — /directory has no nav
  // item of its own, so prefix matching alone would send it to Home.
  const owner = (Object.keys(AREA_VIEWS) as AreaId[]).find((id) => {
    const base = AREA_VIEWS[id]?.base;
    return base && (path === base || path.startsWith(`${base}/`));
  });
  if (owner) return owner;

  // Fall back to the first path segment, which covers routes an item links to
  // only indirectly (e.g. /campaign/... when the item points at a sub-page).
  const segment = path.split('/').filter(Boolean)[0] || '';
  const bySegment = items.find((item) => item.link.split('/').filter(Boolean)[0] === segment);
  return (bySegment && areaOfItem(bySegment.name)) || 'home';
};

/**
 * Performance's own views, for the area rail.
 *
 * The console puts an area's sub-pages in the rail rather than a tab strip, and
 * separates the everyday ones from the rest with a divider. These carry short
 * labels on purpose: the rail is 80px wide, and "Speech & Text" or "Campaign
 * Activity" cannot be read at that width.
 *
 * `key` is the `?view=` value the Performance page reads, so the rail, the URL
 * and the open view are always the same fact.
 */
export type AreaView = {
  key: string;
  label: string;
  icon: string;
  sep?: boolean;
  /** Plan feature that must be on for this view to appear. */
  feature?: 'ai' | 'video' | 'queue';
};

/**
 * Directory's views, named as the console names them.
 *
 * "People" is the organisation roster — the platform calls the same thing
 * People. Contacts are the people outside the org — "external" describes them, it
 * is not a separate kind of record, so the tab carries the record's own name.
 * Locations and Favourites have no service behind them yet and render an
 * honest empty state rather than being hidden, so the rail matches the console
 * and the gap is visible rather than silently missing.
 */
export const DIRECTORY_VIEWS: AreaView[] = [
  { key: 'people', label: 'People', icon: 'ContactIcon' },
  { key: 'groups', label: 'Groups', icon: 'DepartmentIcon' },
  { key: 'roles', label: 'Roles', icon: 'AdminIcon' },
  { key: 'locations', label: 'Locations', icon: 'IntegrationIcon' },
  { key: 'external', label: 'Contacts', icon: 'InboxIcon' },
  { key: 'favourites', label: 'Favourites', icon: 'HomeIcon' },
];

export const PERFORMANCE_VIEWS: AreaView[] = [
  // the five the console leads with
  { key: 'queues-activity', label: 'Queues', icon: 'ReportsLineIcon' },
  { key: 'agents', label: 'Agents', icon: 'ContactIcon' },
  { key: 'interactions', label: 'Calls', icon: 'PhoneIcon' },
  { key: 'flows', label: 'Flows', icon: 'IntegrationIcon' },
  { key: 'dashboards', label: 'Boards', icon: 'AnalyticsIcon' },
  // everything the platform has that the console does not
  { key: 'live-interactions', label: 'Live', icon: 'PhoneIcon', sep: true },
  { key: 'callbacks', label: 'Callbacks', icon: 'DialerIcon' },
  { key: 'campaign-activity', label: 'Campaigns', icon: 'DialerIcon' },
  { key: 'speech-text', label: 'Speech', icon: 'MessageIcon' },
  { key: 'reports', label: 'Reports', icon: 'ReportsLineIcon' },
  { key: 'live-wallboard', label: 'Wallboard', icon: 'AnalyticsIcon' },
  { key: 'ai-wallboard', label: 'AI Wall', icon: 'AnalyticsIcon', feature: 'ai' },
  { key: 'call-queue', label: 'Queue', icon: 'PhoneIcon', feature: 'queue' },
  { key: 'video-dashboard', label: 'Video', icon: 'VideoIcon', feature: 'video' },
];

/** The views an area carries in its rail, if it carries any. */
/**
 * An area that navigates by views declares where those views live. Without
 * this the rail would build its links off whichever route item happened to be
 * first, which is not necessarily the page that reads `?view=`.
 */
export const AREA_VIEWS: Partial<Record<AreaId, { base: string; views: AreaView[] }>> = {
  performance: { base: '/performance', views: PERFORMANCE_VIEWS },
  directory: { base: '/directory', views: DIRECTORY_VIEWS },
};
