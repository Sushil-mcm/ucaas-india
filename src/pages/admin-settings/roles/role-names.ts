/* One set of names for the built-in roles, used by every screen that shows one.
 *
 * WHY A DISPLAY MAP AND NOT A RENAME
 *
 * `users.role` stores the role NAME as a string, and the server compares that
 * string directly - `role !== "ADMIN"` in the auth middleware and in a dozen
 * controllers. Rename the stored value and every one of those checks fails for
 * the people it is meant to let through. So the stored strings stay exactly as
 * they are; only the label a person reads changes.
 *
 * WHY THE NAMES ARE WHAT THEY ARE (decided 3 Sep 2026)
 *
 *   ADMIN      -> Account owner   runs the whole account
 *   MANAGER    -> Location admin  runs one location day to day
 *   SUB-ADMIN  -> Group admin     looks after one group of people
 *   SUPERVISOR -> Supervisor      watches and helps the people in their groups
 *   AGENT      -> Agent           the person who answers queue calls
 *
 * The People list, the Roles list, the role-change dialog and the assign-people
 * dialog all import from here. There used to be three vocabularies for the same
 * four rows (raw MANAGER, "Account admin", "Department Admin"), so an admin could
 * not match the role on one screen with the same role on the next.
 *
 * SUPERVISOR is the fifth system role (added Sep 2026, parent AGENT on the
 * server). Not an administrator: their reach is the groups they belong to
 * (lib/admin-scope.ts), they configure nothing, and they change another
 * person's duty only while Company › Duty policy allows it. A plan whose role
 * table has no SUPERVISOR row never returns the key, and a key that is never
 * returned is simply never looked up.
 */

export interface RoleDisplay {
  name: string;
  description: string;
}

/** Keyed on the stored value, upper-cased. Custom roles are never in here:
    a company already chose their names. */
export const ROLE_DISPLAY: Record<string, RoleDisplay> = {
  ADMIN: {
    name: 'Account owner',
    description: 'Runs the whole account. Everything the company has, including billing.',
  },
  MANAGER: {
    name: 'Location admin',
    description: 'Runs a location day to day: its people, numbers and call handling.',
  },
  SUPERVISOR: {
    name: 'Supervisor',
    description: 'Watches and helps the people in their groups. Configures nothing.',
  },
  AGENT: {
    name: 'Agent',
    description: 'Answers calls from queues and groups, and handles their own phone.',
  },
  'SUB-ADMIN': {
    name: 'Group admin',
    description: 'Looks after one group of people: adds them, removes them, sets their phones.',
  },
};

/** The stored key of the owner role. Only the server decides what it can do. */
export const OWNER_ROLE_KEY = 'ADMIN';

/** "SUB-ADMIN", "Sub Admin" and "sub_admin" have all been seen for one role. */
const normalise = (stored: string | null | undefined): string =>
  String(stored ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-');

/* About half the user records on some tenants carry a raw uuid where a role name
   should be. A uuid is not a role anybody can read. */
const looksLikeUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const roleDisplayName = (stored: string | null | undefined): string => {
  const raw = String(stored ?? '').trim();
  if (!raw) return 'No role';
  if (looksLikeUuid(raw)) return 'Unknown role';
  return ROLE_DISPLAY[normalise(raw)]?.name ?? raw;
};

export const roleDisplayDescription = (
  stored: string | null | undefined,
  fallback?: string | null,
): string => {
  const built = ROLE_DISPLAY[normalise(stored)];
  if (built) return built.description;

  /* Every built-in shipped with the description "This is test description".
     Anything that says that is not a description, whoever wrote it. */
  const given = String(fallback ?? '').trim();
  if (!given || /this is test description/i.test(given)) return '';
  return given;
};

export const isBuiltInRole = (stored: string | null | undefined): boolean =>
  Boolean(ROLE_DISPLAY[normalise(stored)]);

export const isOwnerRole = (stored: string | null | undefined): boolean =>
  normalise(stored) === OWNER_ROLE_KEY;

/* The five names, most access first. Anything that lists "the roles" in prose
   or as choices reads this so the order and spelling cannot drift. */
export const ROLE_NAMES = [
  ROLE_DISPLAY.ADMIN.name,
  ROLE_DISPLAY.MANAGER.name,
  ROLE_DISPLAY['SUB-ADMIN'].name,
  ROLE_DISPLAY.SUPERVISOR.name,
  ROLE_DISPLAY.AGENT.name,
] as const;
