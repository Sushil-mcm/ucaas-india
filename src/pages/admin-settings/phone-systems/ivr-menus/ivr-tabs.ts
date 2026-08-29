/* The tabs inside an IVR, as URL segments. See `call-queue/queue-tabs.ts` for
   why this exists; the IVR editor had the same problem with four tabs instead
   of six. */

import { IVR_TAB_CONSTANT } from './constants';

export interface IvrTab {
  slug: string;
  tab: string;
}

export const IVR_TABS: IvrTab[] = [
  { slug: 'general', tab: IVR_TAB_CONSTANT.BASIC_INFORMATION },
  { slug: 'settings', tab: IVR_TAB_CONSTANT.SETTING_PERMISSIONS },
  { slug: 'audio', tab: IVR_TAB_CONSTANT.GREETING_NOTIFICATION },
  { slug: 'keys', tab: IVR_TAB_CONSTANT.KEY_PRESSES },
];

export const IVR_DEFAULT_TAB = IVR_TABS[0];

export const ivrTabFromSlug = (slug?: string): string | undefined =>
  IVR_TABS.find((entry) => entry.slug === slug)?.tab;

export const ivrSlugFromTab = (tab?: string): string =>
  IVR_TABS.find((entry) => entry.tab === tab)?.slug || IVR_DEFAULT_TAB.slug;

export const IVR_PATH = '/admin-settings/phone/ivr';
