/* What actually breaks when you remove somebody.
 *
 * Removing a person is the single most destructive thing an admin does here,
 * and the whole of it is one line: "Are you sure, you want to delete this
 * user?". Sure of what? Nothing on the screen says the main line forwards to
 * their extension, or that they are the only agent left on the support queue,
 * or that key 3 of the welcome menu sends every caller who presses it straight
 * to a person who will no longer exist.
 *
 * None of that is discoverable afterwards either. The queue simply stops
 * answering, and somebody works out why the following week.
 *
 * So the checks run first, and they name the thing that breaks. Every finding
 * has to answer "and then what happens to a caller", because that is the
 * question the admin is actually weighing, and an inventory of references
 * without consequences is just a list.
 *
 * Two of these are not warnings but stops: removing the last admin locks the
 * whole company out of its own settings, and neither of those can be undone
 * from inside the product.
 */

export interface Person {
  uuid?: string;
  user_uuid?: string;
  extension?: string | number;
  first_name?: string;
  last_name?: string;
  email?: string;
  caller_id?: string;
  role?: string;
  role_data?: { name?: string };
  custom_role_data?: { name?: string };
}

export interface QueueLike {
  uuid?: string;
  name?: string;
  members?: { user_uuid?: string; uuid?: string; extension?: string | number }[];
}

export interface IvrKeyLike {
  key?: string;
  type?: string;
  value?: string;
}

export interface IvrLike {
  uuid?: string;
  name?: string;
  ivr_option?: any[];
  ivrActions?: any[];
}

export interface NumberLike {
  did_number?: string;
  number?: string;
  forward_type?: string;
  forward_value?: string;
}

export interface DepartmentLike {
  uuid?: string;
  name?: string;
  members?: { user_uuid?: string; uuid?: string; extension?: string | number }[];
}

export type ImpactLevel = 'stops-calls' | 'locks-you-out' | 'worth-knowing';

export interface Impact {
  code:
    | 'last-admin'
    | 'queue-last-agent'
    | 'queue-member'
    | 'ivr-target'
    | 'number-forwarding'
    | 'department-last-member'
    | 'department-member'
    | 'keeps-a-number';
  level: ImpactLevel;
  /* What breaks, said as the caller experiences it. */
  message: string;
  /* The queue, menu or number involved, so it can be gone and fixed. */
  where?: string;
}

const idsOf = (person: Person | null | undefined): Set<string> => {
  const ids = new Set<string>();
  [person?.uuid, person?.user_uuid].forEach((id) => {
    const value = String(id ?? '').trim();
    if (value) ids.add(value);
  });
  return ids;
};

const extensionOf = (person: Person | null | undefined): string =>
  String(person?.extension ?? '').trim();

export const nameOf = (person: Person | null | undefined): string => {
  const full = `${person?.first_name ?? ''} ${person?.last_name ?? ''}`.trim();
  return full || String(person?.email ?? '').trim() || 'this person';
};

const isMember = (
  member: { user_uuid?: string; uuid?: string; extension?: string | number } | undefined,
  ids: Set<string>,
  extension: string,
): boolean => {
  if (!member) return false;
  if (ids.has(String(member.user_uuid ?? '').trim())) return true;
  if (ids.has(String(member.uuid ?? '').trim())) return true;
  /* Extension is the fallback match, and only when there is one to match on —
     an empty extension against an empty member field would make everybody a
     member of everything. */
  return extension !== '' && String(member.extension ?? '').trim() === extension;
};

const keysOf = (ivr: IvrLike): IvrKeyLike[] => {
  const rows = ivr?.ivrActions ?? ivr?.ivr_option ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any) => ({
    key: String(row?.key?.value ?? row?.key ?? '').trim(),
    type: String(row?.forwardType?.value ?? row?.type ?? '')
      .trim()
      .toUpperCase(),
    value: String(row?.forwardValue?.value ?? row?.value ?? '').trim(),
  }));
};

/* Admin is read the same three ways the people list reads it, because a role
   renamed in one place and not the other is exactly how a last-admin check
   quietly stops working. */
export const isAdmin = (person: Person | null | undefined): boolean => {
  const role = person?.custom_role_data?.name || person?.role_data?.name || person?.role || '';
  return String(role).toUpperCase() === 'ADMIN';
};

/* Two rows are the same person when any identifier matches. Email is the
   fallback because a list row occasionally arrives without a uuid, and treating
   somebody as a second administrator when they are in fact the same person is
   the one mistake this check must not make - it would withhold the warning in
   exactly the case that needs it.  */
export const isSamePerson = (a: Person | null, b: Person | null): boolean => {
  const aIds = idsOf(a);
  const bIds = idsOf(b);
  if ([...aIds].some((id) => bIds.has(id))) return true;

  const aEmail = String(a?.email ?? '')
    .trim()
    .toLowerCase();
  const bEmail = String(b?.email ?? '')
    .trim()
    .toLowerCase();
  if (aEmail !== '' && aEmail === bEmail) return true;

  /* No identifier at all on either side is not a match - it is a row that
     cannot be told apart, and guessing "same" would hide the warning. */
  return false;
};

export interface RemovalContext {
  person: Person;
  everyone?: Person[];
  queues?: QueueLike[];
  ivrs?: IvrLike[];
  numbers?: NumberLike[];
  departments?: DepartmentLike[];
}

export const checkRemoval = ({
  person,
  everyone = [],
  queues = [],
  ivrs = [],
  numbers = [],
  departments = [],
}: RemovalContext): Impact[] => {
  const found: Impact[] = [];
  if (!person) return found;

  const ids = idsOf(person);
  const extension = extensionOf(person);
  const who = nameOf(person);

  /* --- the one that cannot be undone from inside the product --- */
  if (isAdmin(person)) {
    const otherAdmins = everyone.filter((p) => isAdmin(p) && !isSamePerson(p, person));
    if (otherAdmins.length === 0) {
      found.push({
        code: 'last-admin',
        level: 'locks-you-out',
        message: `${who} is your only administrator. Removing them leaves nobody who can add people, buy numbers or change how calls are handled — and no one inside the company can undo it.`,
      });
    }
  }

  /* --- queues --- */
  queues.forEach((queue) => {
    const members = Array.isArray(queue?.members) ? queue.members : [];
    if (!members.some((m) => isMember(m, ids, extension))) return;

    const remaining = members.filter((m) => !isMember(m, ids, extension)).length;
    const where = String(queue?.name ?? 'a queue');

    if (remaining === 0) {
      found.push({
        code: 'queue-last-agent',
        level: 'stops-calls',
        message: `${who} is the only person answering ${where}. Remove them and callers who reach that queue wait with nobody to pick up.`,
        where,
      });
    } else {
      found.push({
        code: 'queue-member',
        level: 'worth-knowing',
        message: `They answer calls for ${where}. ${remaining} other ${remaining === 1 ? 'person stays' : 'people stay'} on it.`,
        where,
      });
    }
  });

  /* --- menus that point at them --- */
  ivrs.forEach((ivr) => {
    keysOf(ivr).forEach((row) => {
      const pointsAtPerson =
        (row.type === 'EXTENSION' || row.type === 'VOICEMAIL') &&
        extension !== '' &&
        row.value === extension;
      if (!pointsAtPerson) return;

      const where = String(ivr?.name ?? 'a menu');
      const pressed = row.key === '#' || row.key === '*' ? row.key : `key ${row.key}`;
      found.push({
        code: 'ivr-target',
        level: 'stops-calls',
        message: `${where} sends callers who press ${pressed} to their extension. After they are removed, that key reaches nobody — point it somewhere else first.`,
        where,
      });
    });
  });

  /* --- numbers forwarded to them --- */
  numbers.forEach((entry) => {
    const type = String(entry?.forward_type ?? '').toUpperCase();
    const value = String(entry?.forward_value ?? '').trim();
    const pointsAtPerson =
      (type === 'EXTENSION' || type === 'VOICEMAIL') && extension !== '' && value === extension;
    if (!pointsAtPerson) return;

    const where = String(entry?.did_number ?? entry?.number ?? 'a number');
    found.push({
      code: 'number-forwarding',
      level: 'stops-calls',
      message: `Calls to ${where} go to their extension. Removing them leaves that number ringing out — send it somewhere else first.`,
      where,
    });
  });

  /* --- groups --- */
  departments.forEach((dept) => {
    const members = Array.isArray(dept?.members) ? dept.members : [];
    if (!members.some((m) => isMember(m, ids, extension))) return;

    const remaining = members.filter((m) => !isMember(m, ids, extension)).length;
    const where = String(dept?.name ?? 'a group');

    if (remaining === 0) {
      found.push({
        code: 'department-last-member',
        level: 'stops-calls',
        message: `${who} is the last person in ${where}. Calls sent to that group will reach nobody.`,
        where,
      });
    } else {
      found.push({
        code: 'department-member',
        level: 'worth-knowing',
        message: `They are in ${where}, along with ${remaining} ${remaining === 1 ? 'other' : 'others'}.`,
        where,
      });
    }
  });

  /* --- their own number --- */
  const ownNumber = String(person?.caller_id ?? '').trim();
  if (ownNumber) {
    found.push({
      code: 'keeps-a-number',
      level: 'worth-knowing',
      message: `${ownNumber} is assigned to them. It goes back to your released numbers, where it can be given to somebody else — you keep it and keep paying for it either way.`,
      where: ownNumber,
    });
  }

  return found;
};

const ORDER: Record<ImpactLevel, number> = {
  'locks-you-out': 0,
  'stops-calls': 1,
  'worth-knowing': 2,
};

/* Worst first. An admin reading this is deciding whether to go ahead, and the
   thing that decides it has to be the first line, not the ninth. */
export const sortImpacts = (impacts: Impact[]): Impact[] =>
  [...impacts].sort((a, b) => ORDER[a.level] - ORDER[b.level]);

/* Whether anything here should stop the delete outright rather than warn.
   Only the lockout does: everything else is a decision the admin is entitled to
   make, and a product that refuses to remove somebody who is on a queue would
   be unusable. */
export const blocksRemoval = (impacts: Impact[]): boolean =>
  impacts.some((i) => i.level === 'locks-you-out');

export const countByLevel = (impacts: Impact[], level: ImpactLevel): number =>
  impacts.filter((i) => i.level === level).length;

/* One sentence for the top of the dialog. Silence when nothing is affected is
   itself the useful answer — it means the removal is clean. */
export const summarise = (impacts: Impact[]): string => {
  if (blocksRemoval(impacts)) return 'This cannot be undone from inside the product.';

  const breaks = countByLevel(impacts, 'stops-calls');
  if (breaks > 0) {
    return breaks === 1
      ? 'One thing will stop working when they are removed.'
      : `${breaks} things will stop working when they are removed.`;
  }
  if (impacts.length > 0) return 'Nothing will stop working. A few things change.';
  return 'Nothing else points at this person. Removing them changes nothing else.';
};
