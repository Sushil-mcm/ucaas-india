/* "Has anything actually changed since this loaded?"
 *
 * Every My Account page with a save bar asks that question, and the obvious
 * way to ask it — `JSON.stringify(current) !== JSON.stringify(loaded)` — gets
 * it wrong twice over:
 *
 *   1. `JSON.stringify` preserves key order, so writing a whole object back
 *      through `setValue` with its keys in a different order reads as a change
 *      when nothing about the value moved.
 *   2. It drops `undefined` on one side and keeps `null` on the other, so a
 *      field that was never set compares unequal to one that was cleared.
 *
 * Both leave the save bar up over a form nobody has changed, which is worse
 * than useless: it trains people to ignore it. This sorts keys, normalises the
 * two ways of saying "nothing", and leaves array order alone — arrays on these
 * forms are ordered on purpose (the sequence devices ring in, for one).
 */
const normalise = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) return value.map(normalise);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.keys(value as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        const next = normalise((value as Record<string, unknown>)[key]);
        /* An absent key and a key holding nothing are the same state, so the
           key is dropped rather than recorded as `null`. Otherwise a record
           saved before a field existed never compares equal to the form that
           now has it. */
        if (next !== null) out[key] = next;
      });
    return out;
  }
  return value;
};

/** A deterministic string for comparing two form snapshots. */
export const stableJson = (value: unknown): string => JSON.stringify(normalise(value));

/** True when `current` would save exactly what `baseline` already holds. */
export const isUnchanged = (baseline: unknown, current: unknown): boolean =>
  stableJson(baseline) === stableJson(current);
