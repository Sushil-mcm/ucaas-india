/* Ready-made roles, so a company does not have to invent them.
 *
 * ONE SET OF NAMES, EVERYWHERE A PERSON LOOKS
 *
 * The built-in roles are shown under the names in ../role-names.ts (Account
 * owner, Location admin, Group admin, Supervisor, Agent). A preset must not
 * borrow one of those names: a custom role called "Account owner" would look
 * like the owner and not be one, because the server gates on the stored
 * string, not on the label. So presets are named for the job they do and
 * never for a built-in role. There were briefly three vocabularies on this
 * screen: the stored ADMIN/MANAGER/SUB-ADMIN/AGENT, a set of presets, and a set
 * of display labels. Three names for one idea is worse than an ugly name.
 *
 * The stored strings stay as they are because the platform compares them
 * directly as an authorisation gate - `role !== "ADMIN"` in AuthMiddleware and
 * 32 other places - so they are internal identifiers, like a primary key, and
 * nobody sees them.
 *
 * Until now a new role started from nothing or from a copy of ADMIN, SUB-ADMIN,
 * MANAGER or AGENT. Neither helps somebody who wants the ordinary thing every
 * company wants: a person who runs reports, or handles people, and touches
 * nothing else.
 *
 * The names are ours. An earlier version borrowed another product's five word
 * for word, reasoning that somebody moving across would recognise them. That is
 * a bad trade: it puts a competitor's vocabulary inside our product, where it
 * stays for as long as the product does, in exchange for a moment of
 * familiarity during one signup. These say what the person does instead, which
 * is what the rest of this console already does - "What each role can do",
 * rather than a job title.
 *
 * WHY THESE ARE FEATURE LISTS AND NOT PERMISSION TREES
 * `constants.ts` carries a warning worth repeating: a hard-coded permission tree
 * in this folder once caused removed and renamed backend keys to be submitted.
 * So a preset never spells out a permission. It names top-level features, and
 * `buildPresetPermission` walks the company's OWN live plan tree and switches on
 * what it finds there. A key that no longer exists cannot be sent, because the
 * only keys used are the ones the company just told us about.
 *
 * THE AGENT PRESET IS BUILT FROM THE TIER RULES, NOT A FEATURE LIST
 * "Everything under these modules" is the right shape for an administrator's
 * role, and the wrong shape for an agent's. An agent needs the dialler, chat,
 * the shared inbox, their own reports and their own shift - and must NOT get
 * the queue editor or other people's recordings that live under the same
 * top-level keys. lib/role-permission-defaults.ts already decides that, box by
 * box, with a stated reason per rule, so the agent preset asks it rather than
 * repeating it here.
 *
 * EVERY PRESET NAMES A PARENT BUILT-IN ROLE
 * The server stores a company role with a parent (custom_roles.role_uuid, NOT
 * NULL) and that parent is what the holder becomes on the server: an AGENT
 * parent means "your own calls and numbers only" in the DID list, the duty
 * controls and the role guard. A preset that sent no parent could not be saved
 * at all. The parent is resolved to the company's own built-in row at save
 * time, by name, because the uuids differ per plan.
 */

import { buildDefaultPermission, type RoleTier } from '@/lib/role-permission-defaults';

/** The stored keys of the five built-in roles. The server gates on these. */
export type PresetParent = 'ADMIN' | 'MANAGER' | 'SUB-ADMIN' | 'SUPERVISOR' | 'AGENT';

/** What "Nothing - start empty" becomes on the server: the narrowest role. */
export const BLANK_PARENT: PresetParent = 'AGENT';

/* Top-level feature keys, taken from the guards in src/router/index.tsx rather
   than written from memory. */
export const FEATURE_KEYS = {
  people: 'account_setting',
  phoneSystem: 'phone_system_action',
  numbers: 'virtual_numbers',
  reports: 'reports',
  monitoring: 'monitoring',
  ai: 'ai',
  chat: 'chat',
  video: 'video',
  contact: 'contact',
  campaign: 'campaign',
  billing: 'billing',
  integration: 'integration',
  settings: 'settings',
  omniChannel: 'omni_channel',
  callingRates: 'calling_rates',
} as const;

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  /* Which top-level features this role covers. `null` means everything the
     company has — used only by Administrator. Ignored when `tier` is set. */
  features: string[] | null;
  /* Build the tree from the per-box rules in lib/role-permission-defaults.ts
     for this kind of person instead of from `features`. */
  tier?: RoleTier;
  /* Which built-in role the holder becomes on the server. Never ADMIN: only
     the account owner may grant the owner role, and these promise not to. */
  parent: PresetParent;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'full-access',
    name: 'Full access',
    description:
      'Every feature the company has. A copy you own. The built-in Account owner role stays as it is.',
    features: null,
    parent: 'MANAGER',
  },
  {
    id: 'people-admin',
    name: 'People admin',
    description: 'Adds and removes people, and looks after numbers. No billing.',
    features: [FEATURE_KEYS.people, FEATURE_KEYS.numbers, FEATURE_KEYS.settings],
    parent: 'SUB-ADMIN',
  },
  {
    /* "Account admin" and "Call reviewer" used to sit here as two presets with
       the same two features. One job, one preset. */
    id: 'reports-and-monitoring',
    name: 'Reports and monitoring',
    description: 'Watches live calls, listens to recordings and reads reports. Changes no settings.',
    features: [FEATURE_KEYS.reports, FEATURE_KEYS.monitoring],
    parent: 'MANAGER',
  },
  {
    id: 'call-flow-builder',
    name: 'Call flow builder',
    description: 'Builds menus, AI agents and knowledge. Does not manage people.',
    features: [FEATURE_KEYS.ai, FEATURE_KEYS.phoneSystem],
    parent: 'MANAGER',
  },
  {
    /* The role most companies create first and the one this list lacked: the
       person hired to take and make calls. Not named "Agent" because the
       server reserves the four built-in names, and a second "Agent" beside the
       built-in one would be two rows nobody could tell apart. "Contact centre
       agent" is what the job is called, and lib/role-permission-defaults.ts
       recognises the phrase, so Default permissions and the invite form read
       this role as an agent too. */
    id: 'agent',
    name: 'Contact centre agent',
    description:
      'Takes and makes calls, works campaigns, and answers chat and the shared inbox. Sees only their own calls. Changes no settings.',
    features: [],
    tier: 'agent',
    parent: 'AGENT',
  },
  {
    /* Not named "Supervisor" for the same reason the agent preset is not
       named "Agent": the built-in row already has that name. "Group
       supervisor" says what the reach is - the groups they belong to - and
       lib/role-permission-defaults.ts recognises the phrase as the supervisor
       tier. The SUPERVISOR parent is what gives the holder that reach on the
       server and puts their duty control behind Company › Duty policy. On a
       plan whose role table has no SUPERVISOR row the save is refused with
       the usual "no built-in role to base a new one on" message. */
    id: 'supervisor',
    name: 'Group supervisor',
    description:
      'Watches and helps the people in their groups. Sees their duty and reports, changes their duty when the company allows it. Configures nothing.',
    features: [],
    tier: 'supervisor',
    parent: 'SUPERVISOR',
  },
];

/** A role as the platform's list hands it back. Built-ins carry
    `company_uuid: 'PREDEFINED'` and their id in `role_uuid`. */
export interface PlatformRoleRow {
  role_uuid?: string;
  name?: string;
  company_uuid?: string;
  type?: string;
}

/** "sub_admin", " Sub-Admin " -> "SUB-ADMIN"; anything else unchanged. */
const normaliseRoleKey = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/_/g, '-');

/**
 * The company's own row for a built-in role, by stored name. The uuid differs
 * from plan to plan, so it is looked up in the list the server just returned
 * rather than written down anywhere. Empty when the list has no such row.
 */
export const systemRoleUuid = (
  rolesList: PlatformRoleRow[] | null | undefined,
  parent: PresetParent,
): string => {
  const row = (rolesList || []).find(
    (role) =>
      (role?.company_uuid === 'PREDEFINED' || String(role?.type || '').toLowerCase() === 'system') &&
      normaliseRoleKey(role?.name) === parent,
  );
  return String(row?.role_uuid || '');
};

/* Turn a preset into a permission object, using only keys the company actually
   has. Anything not listed stays off, so a preset can never grant more than it
   says on the tin. */
export const buildPresetPermission = (
  preset: RolePreset,
  companyPlanFeatures: Record<string, any>,
): Record<string, any> => {
  if (!companyPlanFeatures || typeof companyPlanFeatures !== 'object') return {};

  /* A tiered preset defers to the rules, box by box. */
  if (preset.tier) return buildDefaultPermission(companyPlanFeatures, preset.tier).permission;

  const enableEverything = (node: any): any => {
    if (typeof node === 'boolean') return true;
    if (!node || typeof node !== 'object' || Array.isArray(node)) return node;
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, enableEverything(v)]));
  };

  /* Administrator gets whatever the company has, whatever shape it is in. */
  if (preset.features === null) return enableEverything(companyPlanFeatures);

  /* Everything not named by the preset is switched OFF, not left as the company
     has it. Passing the company's own value through would hand the role whatever
     the company happens to have enabled — so "Reports only" would quietly
     carry billing and people as well, which is the opposite of what it says. */
  const disableEverything = (node: any): any => {
    if (typeof node === 'boolean') return false;
    if (!node || typeof node !== 'object' || Array.isArray(node)) return node;
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, disableEverything(v)]));
  };

  const wanted = new Set(preset.features);
  return Object.fromEntries(
    Object.entries(companyPlanFeatures).map(([featureKey, featureValue]) => [
      featureKey,
      wanted.has(featureKey) ? enableEverything(featureValue) : disableEverything(featureValue),
    ]),
  );
};
