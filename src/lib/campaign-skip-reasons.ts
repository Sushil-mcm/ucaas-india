/* The reasons a campaign asks an agent for when they skip a lead.
 *
 * A campaign stores its skip reasons as ids only (`declineDispositions`, a list
 * of disposition ids - the server schema allows nothing else), and the names
 * live on the campaign's own `agentDisposition` rows and in the company's
 * disposition list. The dialer joined a campaign through the member-based list,
 * whose projection does not include `declineDispositions` at all, so the skip
 * panel saw an empty list and said the campaign had no reasons set up while
 * the saved document held two.
 *
 * This resolver takes every source the dialer can lay hands on and returns the
 * named reasons, in the order the admin ticked them. Pure, so it is tested.
 */

export type NamedDisposition = { _id: string; name: string };

const idOf = (value: unknown): string => {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return String(v._id ?? v.id ?? v.value ?? '').trim();
  }
  return String(value ?? '').trim();
};

const nameOf = (row: unknown): string => {
  if (!row || typeof row !== 'object') return '';
  const r = row as Record<string, any>;
  return String(r?.disposition?.name ?? r?.name ?? r?.label ?? '').trim();
};

/** Every id the campaign marked as a skip reason, deduplicated, in order. */
export const skipReasonIds = (declineDispositions: unknown): string[] => {
  const list = Array.isArray(declineDispositions) ? declineDispositions : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of list) {
    const id = idOf(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

/** id -> name from any list of disposition-shaped rows; blank names are skipped. */
export const dispositionNameMap = (...lists: unknown[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      const id = idOf(row);
      const name = nameOf(row);
      if (id && name && !map.has(id)) map.set(id, name);
    }
  }
  return map;
};

export type ResolveSkipReasonsInput = {
  /** campaign.declineDispositions - ids, or objects carrying an id. */
  declineDispositions: unknown;
  /** campaign.agentDisposition - {_id, disposition:{name}} rows. */
  campaignDispositions?: unknown;
  /** The company's disposition list (the wizard's own source of names). */
  companyDispositions?: unknown;
};

/**
 * The skip reasons with their names. An id nobody can name is left out: the
 * panel cannot offer a button with no words on it, and a blank button was the
 * bug this replaces.
 */
export const resolveSkipReasons = ({
  declineDispositions,
  campaignDispositions,
  companyDispositions,
}: ResolveSkipReasonsInput): NamedDisposition[] => {
  const names = dispositionNameMap(campaignDispositions, companyDispositions);
  return skipReasonIds(declineDispositions)
    .map((_id) => ({ _id, name: names.get(_id) || '' }))
    .filter((row) => row.name);
};

/**
 * Every disposition the campaign switched on, named. A campaign row that lost
 * its name (older saves, a stripped projection) is named from the company list.
 */
export const resolveCampaignDispositions = ({
  campaignDispositions,
  companyDispositions,
}: Omit<ResolveSkipReasonsInput, 'declineDispositions'>): NamedDisposition[] => {
  const names = dispositionNameMap(companyDispositions);
  const list = Array.isArray(campaignDispositions) ? campaignDispositions : [];
  const seen = new Set<string>();
  const out: NamedDisposition[] = [];
  for (const row of list) {
    const _id = idOf(row);
    if (!_id || seen.has(_id)) continue;
    const name = nameOf(row) || names.get(_id) || '';
    if (!name) continue;
    seen.add(_id);
    out.push({ _id, name });
  }
  return out;
};
