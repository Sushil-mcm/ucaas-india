/* The tabs inside a queue, as URL segments.
 *
 * A queue used to live entirely in React state: a drawer opened by
 * `setDrawerState(true)` and six tabs held in `useState`. One URL covered all of
 * it, so a queue could not be linked in a ticket, a reload lost the tab, and the
 * back button skipped the whole editor.
 *
 * Established systems put both the id and the tab in the path —
 * `.../queues/<id>/general` — so a colleague can be sent straight to the tab
 * being discussed. This table is the single source for that mapping: the router
 * and the editor both read it, so a tab cannot exist in one and not the other.
 *
 * `settings` still covers hours, recording and number display together, because
 * that tab is a shared component used by the IVR editor as well. Splitting it
 * into `hours` and `recording` is a content change and belongs with the work
 * that touches that component, not with the URL work.
 */

import { TAB_CONSTANT } from './constant';

export interface QueueTab {
  /** The URL segment. Lower case, hyphenated, the word a customer would use. */
  slug: string;
  /** The existing internal tab name. Unchanged, so nothing else has to move. */
  tab: string;
}

export const QUEUE_TABS: QueueTab[] = [
  { slug: 'general', tab: TAB_CONSTANT.BASIC_INFORMATION },
  { slug: 'settings', tab: TAB_CONSTANT.SETTINGS },
  { slug: 'after-call', tab: TAB_CONSTANT.QUEUE_SETTINGS },
  { slug: 'members', tab: TAB_CONSTANT.ADD_MEMBERS },
  { slug: 'routing', tab: TAB_CONSTANT.RING_STRATEGY },
  { slug: 'audio', tab: TAB_CONSTANT.GREETING_NOTIFICATION },
];

export const QUEUE_DEFAULT_TAB = QUEUE_TABS[0];

export const queueTabFromSlug = (slug?: string): string | undefined =>
  QUEUE_TABS.find((entry) => entry.slug === slug)?.tab;

export const queueSlugFromTab = (tab?: string): string =>
  QUEUE_TABS.find((entry) => entry.tab === tab)?.slug || QUEUE_DEFAULT_TAB.slug;

export const QUEUES_PATH = '/admin-settings/phone/queues';
