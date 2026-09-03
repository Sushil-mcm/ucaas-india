/* Which role somebody gets when you invite them, and why that one.
 *
 * THE PROBLEM
 *
 * Adding a person asks for a role and offers a list of names. The names that
 * ship all look alike — ADMIN, MANAGER, AGENT, USER — and the permissions
 * behind them barely differ, so the box is a guess dressed up as a decision.
 * Whoever is adding ten people on a Monday morning picks the first one that
 * sounds right, and one of those ten quietly ends up able to change the plan.
 *
 * Worse, the platform's own fallback is the widest one there is: a person
 * created without a role named on the request is stored as an administrator.
 * That default is invisible from this screen, and it is exactly backwards —
 * the safe answer when nobody has decided is the *narrowest* role, not the
 * widest.
 *
 * WHAT THIS FILE DECIDES
 *
 * Given the company's saved answer, the roles that actually exist on the
 * account, and the six kinds of person already described in
 * `role-permission-defaults.ts`, it returns one role, a plain sentence saying
 * why that one, and a warning when the answer hands somebody the ability to
 * spend money. It is the same ladder the Default permissions screen explains,
 * so the invite form and that screen can never disagree.
 *
 * THE ORDER, AND WHY IT IS THIS ORDER
 *
 *   1. The company's own choice, saved under Admin > People > Default
 *      permissions. Somebody sat down and decided; nothing here should
 *      second-guess that. If the role they picked has since been deleted we
 *      fall through rather than fail, because a deleted role is not an answer.
 *
 *   2. Otherwise the narrowest role on the account that still lets a person do
 *      the job they were hired for — "User" first, then "Agent". Nothing above
 *      that is ever chosen automatically. Handing somebody supervision or
 *      administration is a decision a human makes on purpose; a computer
 *      guessing it from a list of names is how an agent ends up with the
 *      billing screen. Widening a role afterwards takes one click. Finding out
 *      six months later that everybody is an administrator does not.
 *
 *   3. Otherwise nothing, said out loud. When no role on the account is named
 *      in a way that says what it is, the honest answer is "we cannot tell,
 *      you choose" plus a pointer to where the company can settle it once.
 *
 * WHAT IT WILL NOT DO
 *
 *   It never picks an administrator. Not as a fallback, not to be helpful.
 *   It never overrules a person who has already chosen a role by hand.
 *   It reads and writes nothing — no React, no network. Give it a saved
 *   answer and a list of roles, get back a decision.
 */

import { TIERS, tierForRoleName, tierInfo, type RoleTier } from './role-permission-defaults';

/**
 * A role as the platform's own list hands it back. Both role endpoints in this
 * product return this shape, with `type: 'custom'` marking a role the company
 * made itself.
 */
export interface PlatformRoleLike {
  uuid?: string;
  role_uuid?: string;
  name?: string;
  type?: string;
  company_uuid?: string;
}

/** One role, reduced to the four things a decision needs. */
export interface RoleChoice {
  /**
   * The id this role travels under. A role the company made is identified by
   * its own `uuid`; one that ships is identified by `role_uuid`. Both pickers
   * already in the product branch the same way, and getting it wrong writes an
   * id that matches nothing.
   */
  id: string;
  /**
   * The role's name. This matters more than it looks: the create call stores
   * the *name* in the person's role column, and several guards elsewhere in
   * the product compare that column against "ADMIN".
   */
  name: string;
  /** True when the company made this role rather than it shipping with the product. */
  custom: boolean;
  /** Which of the six kinds of person the name means, or null when it says nothing. */
  tier: RoleTier | null;
}

/** Where the answer came from. */
export type RoleSource =
  /** The company saved this answer under Default permissions. */
  | 'company-choice'
  /** Nobody saved an answer, so the narrowest sensible role was used. */
  | 'safest-match'
  /** No answer could be reached; the person adding somebody has to choose. */
  | 'none';

export interface InviteRoleDecision {
  /** The role to start the person on, or null when none could be chosen. */
  role: RoleChoice | null;
  source: RoleSource;
  /** One sentence, for an administrator to read on the invite form. */
  reason: string;
  /**
   * Set only when the chosen role reaches beyond the person themselves — an
   * empty string otherwise. Written to be shown as a caution, not an error:
   * choosing an administrator on purpose is perfectly normal.
   */
  warning: string;
}

/**
 * The tiers that may be chosen for somebody without a human saying so, worst
 * case first is deliberate — 'user' is tried before 'agent', so a company that
 * has both starts people on the narrower one.
 *
 * Supervisor and everything above it are absent on purpose. Those tiers see or
 * change other people's work, and nothing about a list of role names is good
 * enough evidence to hand that out unasked.
 */
export const AUTO_CHOOSABLE_TIERS: RoleTier[] = ['user', 'agent'];

/**
 * The tiers that can spend the company's money or reshape the account. Picking
 * one is allowed; doing it without being told is not.
 */
export const SPENDING_TIERS: RoleTier[] = ['company_admin'];

/**
 * The tiers that administer other people. Choosing one of these deserves a
 * sentence on screen, because the difference between "runs the sales team" and
 * "can delete anybody in the company" is not visible in a role's name.
 */
export const ADMINISTRATIVE_TIERS: RoleTier[] = [
  'company_admin',
  'location_admin',
  'department_admin',
];

const idOf = (role: PlatformRoleLike): string =>
  String((String(role?.type || '').toLowerCase() === 'custom' ? role?.uuid : role?.role_uuid) || '');

const isCustom = (role: PlatformRoleLike): boolean =>
  String(role?.type || '').toLowerCase() === 'custom';

/** Turn one row from the platform's role list into a choice, or null if unusable. */
export const toRoleChoice = (role: PlatformRoleLike | null | undefined): RoleChoice | null => {
  if (!role) return null;
  const id = idOf(role);
  const name = String(role?.name || '').trim();
  /* A role with no id cannot be saved onto anybody, and a role with no name
     would be stored as an empty role column — which is the case the platform
     turns into "ADMIN". Neither is a usable answer. */
  if (!id || !name) return null;
  return { id, name, custom: isCustom(role), tier: tierForRoleName(name) };
};

/** Every usable role in the list, in the order the list gave them. */
export const roleChoices = (roles: readonly PlatformRoleLike[] | null | undefined): RoleChoice[] =>
  (Array.isArray(roles) ? roles : [])
    .map(toRoleChoice)
    .filter((choice): choice is RoleChoice => Boolean(choice));

/**
 * The narrowest role on the account that a person can be started on without a
 * human deciding. Returns null when the account has none — which is common
 * enough on a company that renamed everything, and is why step 3 exists.
 */
export const safestAutoRole = (choices: readonly RoleChoice[]): RoleChoice | null => {
  for (const tier of AUTO_CHOOSABLE_TIERS) {
    const found = choices.find((choice) => choice.tier === tier);
    if (found) return found;
  }
  return null;
};

/**
 * What a role means, in a sentence an administrator can act on.
 *
 * A role whose name maps to one of the six kinds of person borrows that kind's
 * own words — the same words the Default permissions screen shows, so the two
 * screens describe the same thing identically. A role named something only the
 * company understands gets an honest shrug instead of an invented description.
 */
export const describeRole = (role: RoleChoice | null | undefined): string => {
  if (!role) return '';
  if (!role.tier) {
    return `“${role.name}” is one of this account's own roles. What it allows is whatever its permissions currently hold — open it under Roles to see.`;
  }
  const info = tierInfo(role.tier);
  return `${info.description} ${info.boundary}`;
};

/**
 * The caution to show beside a role that reaches past the person holding it, or
 * an empty string when there is nothing to caution about.
 */
export const roleWarning = (role: RoleChoice | null | undefined): string => {
  if (!role?.tier) return '';
  if (SPENDING_TIERS.includes(role.tier)) {
    return `Everybody you add with “${role.name}” can buy numbers, change the plan and pay the bill. Give it to as few people as the company can manage with.`;
  }
  if (ADMINISTRATIVE_TIERS.includes(role.tier)) {
    return `“${role.name}” administers other people — it can change their settings and, at this reach, remove them. That is more than most new starters need on day one.`;
  }
  return '';
};

export interface DecideInviteRoleInput {
  /**
   * The id the company saved under Admin > People > Default permissions. Pass
   * the result of `readNewPersonRole` — an empty string means nobody decided.
   */
  savedRoleId?: string;
  /** The account's roles, exactly as the role-list endpoint returned them. */
  roles?: readonly PlatformRoleLike[] | null;
}

/** Nothing to decide from: no roles have loaded yet. */
const NO_ROLES: InviteRoleDecision = {
  role: null,
  source: 'none',
  reason: '',
  warning: '',
};

/**
 * Which role a new person should start on. See the file header for the order
 * and the reasoning behind it.
 */
export const decideInviteRole = ({
  savedRoleId,
  roles,
}: DecideInviteRoleInput): InviteRoleDecision => {
  const choices = roleChoices(roles);
  if (!choices.length) return NO_ROLES;

  const saved = String(savedRoleId || '').trim();
  if (saved) {
    const picked = choices.find((choice) => choice.id === saved);
    if (picked) {
      return {
        role: picked,
        source: 'company-choice',
        reason: `Your company starts new people on “${picked.name}”. Change it here for this person, or change it for everybody under Default permissions.`,
        warning: roleWarning(picked),
      };
    }
    /* The saved role has been deleted since. Fall through to the safe answer
       rather than leaving the box empty, but say what happened — otherwise the
       company's setting looks like it is being ignored. */
    const fallback = safestAutoRole(choices);
    if (fallback) {
      return {
        role: fallback,
        source: 'safest-match',
        reason: `The role your company chose for new people no longer exists, so this falls back to “${fallback.name}” — the narrowest role on the account. Pick a new default under Default permissions.`,
        warning: roleWarning(fallback),
      };
    }
    return {
      role: null,
      source: 'none',
      reason:
        'The role your company chose for new people no longer exists, and none of the remaining roles is named in a way that says what it is. Choose one below, then set a new default under Default permissions.',
      warning: '',
    };
  }

  const safest = safestAutoRole(choices);
  if (safest) {
    return {
      role: safest,
      source: 'safest-match',
      reason: `Nobody has chosen what new people start on, so this uses “${safest.name}” — the narrowest role on the account. Set the answer once under Default permissions and everybody added after that starts there.`,
      warning: roleWarning(safest),
    };
  }

  return {
    role: null,
    source: 'none',
    reason:
      'None of the roles on this account is named in a way that says what it is, so nothing is filled in for you. Choose a role below, then set a default under Default permissions so this is not a decision every time.',
    warning: '',
  };
};

/**
 * Whether a row is about to be sent with no role name on it.
 *
 * This is the one that matters. The platform stores whatever name it is given
 * in the person's role column, and when it is given nothing it writes "ADMIN".
 * The form is supposed to make the role box compulsory, but a row that slips
 * through — a role deleted between loading the form and submitting it, a value
 * cleared by hand — does not fail loudly. It creates an administrator.
 *
 * So the check is on the payload, not on the form: if there is no name to send,
 * the answer is no, and the caller must stop rather than let the platform
 * choose.
 */
export const willBecomeAdminByDefault = (roleName: unknown): boolean =>
  !(typeof roleName === 'string' && roleName.trim());

/**
 * The sentence to show when that happens. It names the consequence rather than
 * the field, because "Role is required" does not tell anybody why they should
 * care.
 */
export const ADMIN_BY_DEFAULT_WARNING =
  'This person has no role. Somebody created without one is stored as an administrator, with the whole company and the billing screen. Choose a role before adding them.';

/**
 * The six kinds of person, as options for a picker, narrowest reach last.
 * Offered here rather than rebuilt by each screen so the wording of a tier is
 * written in exactly one place.
 */
export const TIER_CHOICES = TIERS.map((info) => ({
  tier: info.tier,
  label: info.label,
  description: info.description,
}));

export default decideInviteRole;
