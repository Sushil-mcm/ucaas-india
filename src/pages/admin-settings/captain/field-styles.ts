/**
 * The list controls that sit above a Captain screen's results — the search
 * field and the filter select — so every screen reads the same. Widgets set
 * the shape: 36px tall, `rounded-lg`, a neutral edge and a solid white fill.
 *
 * The `mcm-captain-*` classes carry the two parts Tailwind cannot express
 * here, both defined in `src/components/mcm/mcm-page.css`:
 *
 *  - Opting out of the console's glass-card rule, which fills any rounded
 *    `bg-white` element with translucent warm cream and would otherwise tint
 *    these controls whatever the utility says.
 *  - Trading the shared admin focus outline, an offset ring drawn outside an
 *    edge these already have, for the border lighting instead.
 *
 * The search field is a wrapper around a bare `input` rather than the shared
 * `Input` component: that component nests its field in a positioned div, which
 * paints over an overlaid icon and forces every caller to remember a z-index.
 */

export const CAPTAIN_SEARCH_WRAP =
  'mcm-captain-search flex h-9 items-center gap-2 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted px-3';

export const CAPTAIN_SEARCH_INPUT =
  'min-w-0 flex-1 bg-transparent text-sm text-gray-900 dark:text-foreground placeholder:text-gray-400 dark:placeholder:text-muted-foreground outline-none';

export const CAPTAIN_SEARCH_ICON = 'size-4 shrink-0 text-gray-400 dark:text-muted-foreground';

export const CAPTAIN_FILTER =
  'mcm-captain-filter h-9 appearance-none rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted pl-3 pr-8 text-sm text-gray-900 dark:text-foreground outline-none cursor-pointer';

/** The chevron overlaid on a `CAPTAIN_FILTER` select. */
export const CAPTAIN_FILTER_CHEVRON =
  'pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground';
