/**
 * Filling in a person's custom profile fields.
 *
 * The company defines the *shape* in Company › Profile fields, stored on the
 * reserved "Company Default" template row under
 * `settings.company_profile_fields.fields`. This module is the other half: the
 * values for one person, stored on that person's own record under the same key.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS IS A SEPARATE, TESTED MODULE AND NOT INLINE IN A SCREEN
 *
 * `/api/user/update` REPLACES the whole user record. It has no partial mode — a
 * field the request does not carry comes back cleared. Eight places in this
 * codebase hand-roll the full-record echo that this demands, and the codebase
 * has already paid for getting it wrong: presence updates once erased people's
 * voicemail greetings because `greetings` was left out of the echo.
 *
 * So the payload builder here is pure, and it is tested. It takes the record the
 * screen was hydrated from, changes ONLY the profile-fields slot, and writes
 * everything else back untouched. It never assembles a payload from assumptions
 * about what a record contains.
 *
 * It deliberately does not become the shared helper for the other eight callers.
 * Refactoring live paths that already work — availability, greetings, holidays,
 * away dates — is a separate change with its own risk, and bundling it into a
 * new feature is how a small feature takes down voicemail.
 *
 * -----------------------------------------------------------------------------
 * SCOPE, decided by the owner 19 Sep 2026: ADMIN ONLY.
 *
 * An admin defines the fields and fills them in on a person's record. The values
 * do not appear in the directory, and a person does not edit their own. Anything
 * wider is a decision about publishing staff data and is not assumed here.
 */

/** The four shapes a definition can take. Mirrors the definition screen. */
export type ProfileFieldType = 'text' | 'number' | 'date' | 'choice';

export interface ProfileFieldDefinition {
  id: string;
  label: string;
  type: ProfileFieldType;
  required: boolean;
  choices: string[];
}

/** The key both halves agree on. Changing it orphans every value already saved. */
export const PROFILE_FIELDS_KEY = 'company_profile_fields';

const VALID_TYPES: ProfileFieldType[] = ['text', 'number', 'date', 'choice'];

/** A stored value that may arrive as an object or as encoded text. */
export const asObject = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  try {
    return JSON.parse(String(value) || '{}');
  } catch {
    return {};
  }
};

const hasKeys = (value: any) => Object.keys(value || {}).length > 0;

/**
 * The definitions an admin has set up, read off the company default template.
 *
 * A definition with no id is skipped rather than given a minted one: an id
 * minted here would not match the id the values were saved under, so it would
 * read as a different field and silently show blank. The definition screen mints
 * ids on ITS side, which is where a missing one gets repaired for good.
 */
export const readFieldDefinitions = (companySettings: unknown): ProfileFieldDefinition[] => {
  const stored = asObject(companySettings)?.[PROFILE_FIELDS_KEY]?.fields;
  if (!Array.isArray(stored)) return [];

  return stored
    .filter((entry: any) => entry && typeof entry === 'object')
    .filter((entry: any) => typeof entry?.id === 'string' && entry.id.trim())
    .map((entry: any) => ({
      id: String(entry.id),
      label: `${entry?.label ?? ''}`,
      type: VALID_TYPES.includes(entry?.type) ? entry.type : 'text',
      required: Boolean(entry?.required),
      choices: Array.isArray(entry?.choices) ? entry.choices.map((c: any) => `${c ?? ''}`) : [],
    }));
};

/**
 * One person's saved values, keyed by field id.
 *
 * Values for fields that have since been deleted are returned too. They are not
 * rendered — nothing defines them any more — but they must survive a save, so
 * that deleting a definition by mistake and restoring it does not lose what
 * people had already entered.
 */
export const readFieldValues = (person: unknown): Record<string, string> => {
  const stored = asObject(asObject(person)?.settings)?.[PROFILE_FIELDS_KEY]?.values;
  if (!stored || typeof stored !== 'object') return {};
  return Object.entries(stored).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    acc[key] = `${value}`;
    return acc;
  }, {});
};

/**
 * Which required fields are still empty.
 *
 * Only fields that are both defined and required count. A required field whose
 * definition was deleted stops being required — the admin removed the question,
 * so it cannot go on blocking a save.
 */
export const missingRequired = (
  definitions: ProfileFieldDefinition[],
  values: Record<string, string>,
): ProfileFieldDefinition[] =>
  definitions.filter((field) => field.required && !`${values?.[field.id] ?? ''}`.trim());

/**
 * The body for saving one person's profile-field values.
 *
 * The safe shape of a full-record write: the server's own data, with only the
 * edited slot changed. Every other value is read off the record and written
 * straight back. Anything that cannot be resolved is LEFT OUT rather than sent
 * empty — a blank value here reads as "clear this", not as "we did not know it".
 */
export interface PersonProfileFieldsInput {
  /** The record behind the screen: the result of the person query. */
  person: any;
  /** Values keyed by field id, as edited in the form. */
  values: Record<string, string>;
}

export const buildPersonProfileFieldsPayload = ({
  person,
  values,
}: PersonProfileFieldsInput): Record<string, any> => {
  const stored = person?.user_info || person || {};

  /* Held on the record itself in some shapes and under user_info in others —
     read from both, so a shape difference cannot silently clear a field. */
  const forwarding = asObject(person?.call_forwarding ?? stored?.call_forwarding);
  const greetings = asObject(person?.greetings ?? stored?.greetings);
  const settings = asObject(person?.settings ?? stored?.settings);

  /* MERGE, NEVER REPLACE. Holidays, policies, phone rules and away dates all
     live in this same settings blob. Rebuilding it from what this screen knows
     would drop every one of them. */
  const nextSettings = {
    ...settings,
    [PROFILE_FIELDS_KEY]: {
      ...asObject(settings?.[PROFILE_FIELDS_KEY]),
      values: { ...readFieldValues(person), ...values },
    },
  };

  const roleId = stored?.custom_role_uuid || stored?.role_uuid;
  const roleField = stored?.custom_role_uuid ? 'custom_role_uuid' : 'role_uuid';
  const siteUuid = stored?.site_uuid || '';

  return {
    first_name: stored?.first_name,
    last_name: stored?.last_name,
    job_title: stored?.job_title,
    ...(stored?.profile ? { profile: stored.profile } : {}),
    ...(stored?.caller_id ? { caller_id: stored.caller_id } : {}),
    ...(siteUuid ? { site_uuid: siteUuid } : {}),
    ...(roleId ? { [roleField]: roleId } : {}),
    ...(hasKeys(forwarding) ? { call_forwarding: forwarding } : {}),
    ...(hasKeys(greetings) ? { greetings } : {}),
    settings: nextSettings,
    uuid: person?.uuid ?? stored?.uuid,
  };
};
