/* Caller-location routing on a number ("geo routes").

   The switch reads `forward_call_actions.geo_routes` on the number as a list
   of {prefix, type, value}: a caller whose number starts with `prefix` is sent
   to that target instead of the number's normal route, LONGEST prefix wins,
   digits only on both sides (backend-patches/switch/patch_geographic_routing.py).
   These helpers are the screen's half: what the form holds, what gets saved,
   and a preview that mirrors the switch's matcher exactly. Pure - no React. */

export const GEO_ROUTE_TYPES = ['EXTENSION', 'QUEUE', 'DEPARTMENT', 'IVR', 'PHONE'] as const;
export type GeoRouteType = (typeof GEO_ROUTE_TYPES)[number];

export interface GeoRouteRule {
  prefix: string;
  type: string;
  value: string;
  /* Display only - what the picker showed when the rule was saved. */
  label?: string;
}

export const digitsOnly = (raw: unknown): string => String(raw ?? '').replace(/\D/g, '');

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/* Stored value -> rows for the form. Tolerant: anything that is not a list of
   objects becomes no rules, and a broken row is kept (so the person can see and
   fix it) rather than silently dropped. */
export function normaliseGeoRoutes(raw: unknown): GeoRouteRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((row) => ({
    prefix: digitsOnly(row.prefix),
    type: String(row.type ?? '').trim().toUpperCase(),
    value: String(row.value ?? '').trim(),
    label: row.label ? String(row.label) : undefined,
  }));
}

/* Rows -> what the switch reads. Incomplete rows are dropped: the switch would
   skip them anyway, and saving them would only confuse the next reader. */
export function serialiseGeoRoutes(rows: unknown): GeoRouteRule[] {
  return normaliseGeoRoutes(rows).filter((r) => r.prefix && r.type && r.value);
}

/* Human-readable problems with the rows as typed. Empty = fine to save. */
export function geoRouteProblems(rows: unknown): string[] {
  const list = normaliseGeoRoutes(rows);
  const problems: string[] = [];
  const seen = new Map<string, number>();
  list.forEach((r, i) => {
    const n = i + 1;
    if (!r.prefix) problems.push(`Rule ${n}: enter the digits a caller's number starts with.`);
    if (!r.type) problems.push(`Rule ${n}: choose where those callers go.`);
    else if (!r.value) problems.push(`Rule ${n}: pick the destination.`);
    if (r.prefix) {
      const first = seen.get(r.prefix);
      if (first !== undefined) problems.push(`Rule ${n} repeats the prefix ${r.prefix} of rule ${first}.`);
      else seen.set(r.prefix, n);
    }
  });
  return problems;
}

/* The switch's matcher, line for line: longest matching prefix wins. */
export function matchGeoRoute(rows: unknown, callerNumber: unknown): GeoRouteRule | null {
  const digits = digitsOnly(callerNumber);
  if (!digits) return null;
  let best: GeoRouteRule | null = null;
  for (const r of serialiseGeoRoutes(rows)) {
    if (digits.startsWith(r.prefix) && (!best || r.prefix.length > best.prefix.length)) best = r;
  }
  return best;
}
