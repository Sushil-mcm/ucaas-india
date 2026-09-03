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

export type AreaId = 'home' | 'directory' | 'activity' | 'performance' | 'admin';

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
    /**
     * Campaign stays here on purpose. `/campaign` is where an agent works a
     * dialer list, so Activity is the area the running campaign belongs to, and
     * moving the item to Admin would light the Admin tab while the user is on
     * the dialer and open a two-icon rail on top of the Admin Hub sidebar.
     *
     * Admin has no entry for it, by request. Outbound campaigns are run, not
     * configured, so Activity is the only way in. The "SMS Campaigns" item under
     * Compliance keeps that name: it is 10DLC registration, a different object,
     * and the clearer name is worth keeping whether or not the dialer is
     * listed alongside it.
     */
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

  /* A view that opens outside its area's base — Tasks, Calendar, Dialer,
     Activity, Monitor all leave /performance — still belongs to the area whose
     rail offered it. Without this the path matches no nav item and no area
     base, falls through to the segment guess below, and lands on Home: the
     Home tab lights while the user is on a Performance view, and the rail
     disappears because Home carries a single item. Longest prefix first, so a
     nested claim beats a shallower one. */
  const claimed = externalViewPrefixes()
    .filter(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (claimed) return claimed.area;

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
  /**
   * A view that opens somewhere other than `${base}?view=${key}` — one of the
   * top-bar shortcuts moved into this rail. Static routes go straight in
   * here; the handful that depend on the signed-in user (Activity,
   * Monitoring) are resolved in useAreaNav instead, keyed by `key`.
   */
  href?: string;
  /**
   * The path prefix this view owns, when that cannot be read off `href` —
   * the views whose real href depends on the signed-in user. Without it the
   * area cannot recognise its own page when the user is standing on it.
   */
  match?: string;
  /**
   * Other routes that count as "on" this view for the rail's own highlight,
   * distinct from `match` (which decides which *area* a path belongs to).
   * `/contact` is a separate, older contact-book page that isn't reachable
   * through `?view=external` at all, but External Contacts' own "New
   * contact" button sends people there — without this the rail item that
   * sent them goes dark the moment they land, which reads as if the click
   * had left Directory entirely.
   */
  altPaths?: string[];
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
 *
 * Blocked is the contact book's Blocked tag given a list of its own. Marking a
 * contact as blocked was already possible from a menu on the contacts table,
 * but nothing showed what had been blocked, so nobody could check their own
 * decisions.
 */
export const DIRECTORY_VIEWS: AreaView[] = [
  { key: 'people', label: 'People', icon: 'ContactIcon' },
  { key: 'groups', label: 'Groups', icon: 'DepartmentIcon' },
  { key: 'roles', label: 'Roles', icon: 'AdminIcon' },
  { key: 'locations', label: 'Locations', icon: 'IntegrationIcon' },
  { key: 'external', label: 'External Contacts', icon: 'InboxIcon', altPaths: ['/contact'] },
  { key: 'favourites', label: 'Favourites', icon: 'Star' },
  { key: 'blocked', label: 'Blocked', icon: 'AdminIcon' },
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
  { key: 'callbacks', label: 'Callbacks', icon: 'PhoneForwardingIcon' },
  { key: 'campaign-activity', label: 'Campaigns', icon: 'DialerIcon' },
  { key: 'speech-text', label: 'Speech', icon: 'MessageIcon' },
  { key: 'reports', label: 'Reports', icon: 'ReportsLineIcon' },
  { key: 'live-wallboard', label: 'Wallboard', icon: 'AnalyticsIcon' },
  { key: 'ai-wallboard', label: 'AI Wall', icon: 'AnalyticsIcon', feature: 'ai' },
  { key: 'call-queue', label: 'Queue', icon: 'PhoneIcon', feature: 'queue' },
  { key: 'video-dashboard', label: 'Video', icon: 'VideoIcon', feature: 'video' },
  // The top-bar shortcuts, moved down here so the bar itself stays lean.
  { key: 'ext-tasks', label: 'Tasks', icon: 'ReportsLineIcon', href: '/calendar?view=task-list', sep: true },
  { key: 'ext-calendar', label: 'Calendar', icon: 'CalendarLine', href: '/calendar?view=calendar' },
  { key: 'ext-campaigns', label: 'Dialer', icon: 'DialerIcon', href: '/my-campaigns' },
  // Activity and Monitoring depend on the signed-in user (their uuid, their
  // role/plan access) so their real href is resolved in useAreaNav — this
  // placeholder just claims the slot and the icon.
  { key: 'ext-activity', label: 'Activity', icon: 'PhoneIcon', match: '/activity' },
  { key: 'ext-monitoring', label: 'Monitor', icon: 'AnalyticsIcon', match: '/monitoring' },
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

/**
 * Path prefixes owned by views that open outside their own area's base.
 *
 * Read off `href` where there is one, and off `match` for the views whose href
 * is resolved later from the signed-in user.
 */
const externalViewPrefixes = (): { prefix: string; area: AreaId }[] =>
  (Object.keys(AREA_VIEWS) as AreaId[]).flatMap((area) =>
    (AREA_VIEWS[area]?.views ?? []).flatMap((view) => {
      const prefix = view.match || (view.href ? view.href.split('?')[0] : '');
      return prefix ? [{ prefix, area }] : [];
    }),
  );
