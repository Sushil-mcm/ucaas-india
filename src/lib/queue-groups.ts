/**
 * Putting a whole group on a queue.
 *
 * Queues and groups both keep a plain list of people, and a group's entries are
 * already the shape a queue member is built from - `value` holds the extension,
 * with `label`, `email`, `role` and `user_uuid` beside it (written at
 * admin-settings/phone-systems/departments/new-department/add-members.tsx:39).
 * So adding a group is not a new kind of membership: it is the people in it,
 * folded into the queue one at a time by the same `toggleMember` a tick box
 * uses.
 *
 * That is deliberate, and it is the whole design decision here.
 *
 *   - Nothing new is stored. The queue saves the same member records it always
 *     did, so every screen, the switch, and the agent-lookup service keep
 *     working with no change and no migration.
 *   - A group is a starting point, not a live link. Somebody added to the group
 *     tomorrow does NOT appear on this queue: the queue holds the people who
 *     were in the group when it was saved. A live link would be a different
 *     feature - it would mean a queue whose membership changes without anybody
 *     opening it, which also changes who the switch rings mid-shift. That is a
 *     decision for an owner to take deliberately, not a side effect of a
 *     convenience button, so the screen says which one this is rather than
 *     leaving it to be discovered.
 *
 * Kept pure and apart from the screen for the reason the queue-members helpers
 * were: so "adding a second group keeps the first" and "a person in two groups
 * is added once" are things proven rather than believed.
 */

import { isOnQueue, memberKey, toggleMember, type QueueMember } from './queue-members';

/** A group as this screen needs it, whatever the list endpoint returned. */
export type QueueGroup = {
  uuid: string;
  name: string;
  extension: string;
  /** The group's location, for display only. '' when the row carries none. */
  siteLabel: string;
  /** The location's id, when the row carries one. Used only to spot a mismatch. */
  siteValue: string;
  /** Everybody in the group, including anybody a queue cannot ring. */
  members: any[];
};

/**
 * `members` comes back as a JSON string on some responses and an array on
 * others - the same split already handled in use-group-caller-id-options.ts and
 * directory/people-rows.ts. Anything unreadable is an empty group rather than a
 * thrown error: a group that cannot be parsed must not take the screen down.
 */
export const parseGroupMembers = (members: unknown): any[] => {
  if (Array.isArray(members)) return members;
  if (typeof members !== 'string') return [];
  try {
    const parsed = JSON.parse(members || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* `site` is stored as a JSON string on some rows and a plain name on others -
   the departments list already reads it both ways. */
const parseSite = (site: unknown): { label: string; value: string } => {
  if (site && typeof site === 'object') {
    const row = site as Record<string, unknown>;
    return {
      label: String(row.label ?? row.name ?? '').trim(),
      value: String(row.value ?? row.site_uuid ?? row.uuid ?? '').trim(),
    };
  }
  const text = String(site ?? '').trim();
  if (!text) return { label: '', value: '' };
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      return parseSite(JSON.parse(text));
    } catch {
      return { label: '', value: '' };
    }
  }
  return { label: text, value: '' };
};

/** One row from the groups list, in the shape this screen uses. */
export const toQueueGroup = (row: any): QueueGroup | null => {
  const uuid = String(row?.uuid ?? row?._id ?? row?.id ?? '').trim();
  const name = String(row?.name ?? '').trim();
  if (!uuid && !name) return null;

  const site = parseSite(row?.site);

  return {
    uuid: uuid || name,
    name: name || 'Group',
    extension: String(row?.extension ?? '').trim(),
    siteLabel: site.label,
    siteValue: site.value,
    members: parseGroupMembers(row?.members),
  };
};

/**
 * The people in a group a queue can actually ring, once each.
 *
 * Two things are dropped, both of which would otherwise be silent:
 *
 *   - Anybody with no extension. A queue member is identified by its extension
 *     everywhere on this screen and is what the switch dials, so a person
 *     without one cannot be a member. The count of these is reported so the
 *     screen can say "2 of 3" rather than quietly adding two.
 *   - The same person listed twice. A group's stored blob can repeat somebody -
 *     the groups list dedupes on `user_uuid` before drawing its avatars for
 *     exactly this reason.
 */
export const addableMembers = (group: QueueGroup | null | undefined): any[] => {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const person of group?.members ?? []) {
    const extension = String(person?.extension ?? person?.value ?? '').trim();
    if (!extension || seen.has(extension)) continue;
    seen.add(extension);
    out.push(person);
  }
  return out;
};

/**
 * The people in a group a queue cannot ring, because they have no extension.
 *
 * Listed rather than counted so the screen can name them. "2 people were
 * skipped" leaves an admin hunting; naming them says who to go and give an
 * extension to.
 */
export const unreachableMembers = (group: QueueGroup | null | undefined): any[] => {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const person of group?.members ?? []) {
    const extension = String(person?.extension ?? person?.value ?? '').trim();
    if (extension) continue;
    const id = String(person?.user_uuid ?? person?.uuid ?? '').trim();
    /* Entries with no id at all cannot be told apart, so they are counted once
       each rather than collapsed into one. */
    const key = id || `anon:${out.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(person);
  }
  return out;
};

/**
 * How many of a group a queue cannot ring.
 *
 * Counted straight off the list above rather than worked out from totals, so
 * the number on the screen and the names behind it can never disagree.
 */
export const unreachableCount = (group: QueueGroup | null | undefined): number =>
  unreachableMembers(group).length;

export type GroupCoverage = {
  /** How many of this group a queue could ring. */
  addable: number;
  /** How many of those are already on the queue. */
  onQueue: number;
  /** Everybody who can be rung is already on the queue. False for an empty group. */
  isFullyAdded: boolean;
  /** Some but not all. */
  isPartiallyAdded: boolean;
};

/** Where this group stands against the queue as it is right now. */
export const groupCoverage = (
  group: QueueGroup | null | undefined,
  list: unknown,
): GroupCoverage => {
  const people = addableMembers(group);
  const onQueue = people.filter((person) => isOnQueue(list, person)).length;
  return {
    addable: people.length,
    onQueue,
    isFullyAdded: people.length > 0 && onQueue === people.length,
    isPartiallyAdded: onQueue > 0 && onQueue < people.length,
  };
};

/**
 * The queue's list after everybody in this group is added.
 *
 * Folded in one at a time, exactly as ticking each person by hand would, so the
 * result is the same either way and somebody already on the queue is left
 * alone rather than added twice. Always derived from the list passed in - the
 * caller must hand over the list as it is at the moment of the click, for the
 * same reason every other write on this screen does.
 */
export const addGroupToQueue = (
  list: unknown,
  group: QueueGroup | null | undefined,
): QueueMember[] => {
  let next: unknown = Array.isArray(list) ? list : [];
  for (const person of addableMembers(group)) {
    next = toggleMember(next, person, true);
  }
  return next as QueueMember[];
};

/**
 * The queue's list after everybody in this group is taken off.
 *
 * Removing a group removes the people in it, including anybody who was ticked
 * by hand before the group was ever used - the queue stores people, not a
 * record of how they got there, so there is no way to tell those apart and
 * pretending otherwise would leave people behind with no explanation.
 */
export const removeGroupFromQueue = (
  list: unknown,
  group: QueueGroup | null | undefined,
): QueueMember[] => {
  let next: unknown = Array.isArray(list) ? list : [];
  for (const person of addableMembers(group)) {
    next = toggleMember(next, person, false);
  }
  return next as QueueMember[];
};

/**
 * The names to show on a group's row, in the order they are stored.
 *
 * The extension is included because two people can share a first name and the
 * extension is what the queue actually rings.
 */
export const groupMemberLabels = (group: QueueGroup | null | undefined): string[] =>
  addableMembers(group).map(memberDisplayName);

/**
 * What one person in a group is called on screen.
 *
 * Shared by the summary line and the rows inside the group, so the name in the
 * collapsed line and the name in the open one are always the same string.
 * Falls back to the extension, then to a plain "Unknown" - a blank row is
 * indistinguishable from a broken one.
 */
export function memberDisplayName(person: any): string {
  const name = String(
    person?.label ??
      person?.name ??
      [person?.first_name, person?.last_name].filter(Boolean).join(' ') ??
      '',
  ).trim();
  const extension = String(person?.extension ?? person?.value ?? '').trim();
  return name || extension || 'Unknown';
}

/** The extension a queue would dial for this person. '' when they have none. */
export const memberExtension = (person: any): string =>
  String(person?.extension ?? person?.value ?? '').trim();

/** Their role, read the same way the queue's manager rule reads it. */
export const memberRole = (person: any): string =>
  String(person?.custom_role_data?.name ?? person?.role_data?.name ?? person?.role ?? '').trim();

/**
 * True when a group plainly belongs to a different location from the one the
 * queue is set to.
 *
 * Deliberately conservative: only an answer when both ids are actually present.
 * The queue's people list is filtered to its location, so a group from
 * elsewhere brings in people who are not in that list - worth saying, but a
 * warning invented from missing data would be worse than no warning at all.
 */
export const isOtherLocation = (
  group: QueueGroup | null | undefined,
  queueSiteValue: unknown,
): boolean => {
  const queueSite = String(queueSiteValue ?? '').trim();
  const groupSite = String(group?.siteValue ?? '').trim();
  if (!queueSite || !groupSite) return false;
  return queueSite !== groupSite;
};

/** Groups matching what somebody has typed: the name, or the extension. */
export const searchGroups = (groups: QueueGroup[], query: string): QueueGroup[] => {
  const needle = String(query ?? '')
    .trim()
    .toLowerCase();
  if (!needle) return groups;
  return groups.filter((group) => {
    if (group.name.toLowerCase().includes(needle)) return true;
    if (group.extension.toLowerCase().includes(needle)) return true;
    /* Searching by a person finds the group they are in, which is how somebody
       looks for "the group Neel is in" without remembering its name. */
    return groupMemberLabels(group).some((label) => label.toLowerCase().includes(needle));
  });
};

/** Used by the screen's tests and by the strip that reports what a click did. */
export const addedByGroup = (before: unknown, after: unknown): number => {
  const had = new Set((Array.isArray(before) ? before : []).map((row) => memberKey(row)));
  return (Array.isArray(after) ? after : []).filter((row) => !had.has(memberKey(row))).length;
};
