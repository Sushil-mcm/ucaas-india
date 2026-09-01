/* Friendly names for the four built-in roles, shown instead of the stored ones.
 *
 * WHY THIS IS A DISPLAY LAYER AND NOT A RENAME
 *
 * The obvious thing is to rename the roles in the database. That would break
 * authentication. `users.role` stores the NAME as a string, and the platform
 * compares that string directly - `role !== "ADMIN"` appears in AuthMiddleware
 * and fourteen other places in the API, and thirteen files in the code actually
 * running. Rename ADMIN to anything and every one of those checks starts failing
 * for the people it is meant to let through: they would quietly lose admin
 * access, and nothing would say why.
 *
 * So the stored strings stay exactly as they are and only the label changes. The
 * screens read better, and the gate underneath is untouched.
 *
 * The day the platform stops gating on a role string, these become real names
 * and this file goes away. Until then, renaming them for real is not a tidy-up,
 * it is an outage.
 */

export interface RoleDisplay {
  name: string;
  description: string;
}

/* Keyed on the stored value, upper-cased. The four built-ins are the only ones
   here - a company's own custom role already has a name somebody chose, and
   overriding that would be rude as well as wrong. */
const BUILT_IN: Record<string, RoleDisplay> = {
  ADMIN: {
    name: 'Account owner',
    description: 'Runs the whole account. Everything the company has.',
  },
  MANAGER: {
    name: 'Account admin',
    description: 'Runs the account day to day. Everything the company has.',
  },
  'SUB-ADMIN': {
    name: 'People admin',
    description: 'Adds and removes people, and looks after numbers.',
  },
  AGENT: {
    name: 'Call reviewer',
    description: 'Listens to recordings and reads reports.',
  },
};

/* Some user records carry a raw uuid where a role name should be - about half of
   them, on this system. A uuid is not a role anybody can read, so it is shown as
   unknown rather than printed at somebody. */
const looksLikeUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const roleDisplayName = (stored: string | null | undefined): string => {
  const raw = String(stored ?? '').trim();
  if (!raw) return 'No role';
  if (looksLikeUuid(raw)) return 'Unknown role';
  return BUILT_IN[raw.toUpperCase()]?.name ?? raw;
};

export const roleDisplayDescription = (
  stored: string | null | undefined,
  fallback?: string | null,
): string => {
  const raw = String(stored ?? '').trim();
  const built = BUILT_IN[raw.toUpperCase()];
  if (built) return built.description;

  /* Every built-in shipped with the description "This is test description".
     Anything that says that is not a description, whoever wrote it. */
  const given = String(fallback ?? '').trim();
  if (!given || /this is test description/i.test(given)) return '';
  return given;
};

/* The five names a person ever sees, in the order they make sense: most access
   first. The presets in add-new-role use exactly this list, so a company reading
   its roles and a company creating one are reading the same vocabulary. */
export const ROLE_NAMES = [
  'Account owner',
  'Account admin',
  'People admin',
  'Call reviewer',
  'Call flow builder',
] as const;

export const isBuiltInRole = (stored: string | null | undefined): boolean =>
  Boolean(BUILT_IN[String(stored ?? '').trim().toUpperCase()]);
