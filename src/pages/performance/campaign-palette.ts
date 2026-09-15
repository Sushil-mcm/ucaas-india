/**
 * Shared, muted palette for Performance ▸ Campaigns' KPI + analytics cards.
 *
 * The first pass used the app's usual vivid tones (#f97316, #16a34a,
 * #3b82f6…) on every chart, which read as one saturated, copy-pasted look
 * across all eight cards. These are the same hues pulled toward the warm
 * neutral the rest of this theme already sits on — softer, premium, still
 * clearly orange/green/blue/amber at a glance.
 *
 * Kept as plain hex rather than reading `--ca-*` CSS custom properties:
 * recharts and inline SVG take colour props directly, at component-render
 * time, not through the cascade.
 */
export const CA_ORANGE = '#eb9c68';
export const CA_ORANGE_DEEP = '#d3814a';
export const CA_GREEN = '#a3c9b3';
export const CA_GREEN_DEEP = '#7fa98f';
export const CA_BLUE = '#a9c0d9';
export const CA_BLUE_DEEP = '#7d9cbd';
export const CA_AMBER = '#e0bb85';
export const CA_AMBER_DEEP = '#c99a5c';
export const CA_SLATE = '#c9c2b6';

/** The four campaign lifecycle states, everywhere they're charted. */
export const STATUS_COLORS: Record<string, string> = {
  Running: CA_GREEN_DEEP,
  Paused: CA_AMBER_DEEP,
  Scheduled: CA_BLUE_DEEP,
  Completed: CA_SLATE,
};

/** One muted accent pair (icon wash + ink) per large analytics card, so the
 * header alone signals which card this is before reading a single number. */
export const CARD_ACCENTS: Record<string, { bg: string; fg: string }> = {
  line: { bg: '#faeadc', fg: '#c07c49' },
  funnel: { bg: '#f6ddc9', fg: '#b06a3d' },
  bar: { bg: '#f6ecd4', fg: '#ba9152' },
  donut: { bg: '#ecf1ea', fg: '#71937f' },
  rank: { bg: '#faeadc', fg: '#c07c49' },
  leaderboard: { bg: '#faeadc', fg: '#c07c49' },
  timeline: { bg: '#e9f1ec', fg: '#65937a' },
  radial: { bg: '#e5ecf3', fg: '#57769c' },
};
