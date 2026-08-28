/* Turning two stored company defaults into values for a person who is new.
 *
 * Admin > Company > Company policies saves two settings that are explicitly
 * described on screen as "the default for a NEW user":
 *
 *   settings.company_policies.voicemail.transcription_default   (boolean)
 *   settings.company_policies.international_calling.new_user_default
 *                                                     ('blocked' | 'allowed')
 *
 * Both were written and then read by nobody, so an admin who switched
 * voicemail-to-text off for new people still got it switched on for every
 * person created afterwards. This file is the missing reader.
 *
 * Three rules it will not bend:
 *
 *   1. No company record, or no `company_policies` in it, means seed NOTHING.
 *      An account that has never opened the policies page must behave exactly
 *      as it does today; an absent key is not a default of `false`.
 *   2. It only ever fills a value nobody has set. A person an admin has
 *      deliberately configured is never quietly reset — which is also why the
 *      caller must only run this when a person is being CREATED, never when an
 *      existing one is opened for editing.
 *   3. It writes the shape the rest of the product already stores. Voicemail
 *      to text is the string 'YES' or 'NO' everywhere in this codebase, so a
 *      stored boolean is translated, not passed through.
 *
 * It is deliberately pure: no React, no query client, no network. Give it the
 * company settings blob and the current form values, get back a list of
 * `setValue` arguments plus plain sentences the screen can show the admin.
 */

/** Where the company page keeps everything this file reads. */
const POLICIES_KEY = 'company_policies';

/**
 * The form path a person's voicemail-to-text lives on, in the add/edit person
 * form and in every shared settings editor.
 * See src/components/common-settings/voicemail-dialog/index.tsx.
 */
export const VOICEMAIL_TO_TEXT_PATH = 'settings.voicemail_pin.voicemail_to_text';

/**
 * The two values that field is ever stored as. It is a string, not a boolean —
 * writing `true` here would silently disable transcription, because every
 * reader in the product compares against the literal 'YES'.
 */
export const VOICEMAIL_TO_TEXT_ON = 'YES';
export const VOICEMAIL_TO_TEXT_OFF = 'NO';

/**
 * What a person's settings start out as before anyone has chosen anything:
 * `settingsInitialState` in src/pages/admin-settings/users/constants.ts hard
 * codes 'YES'. That is a placeholder the product ships, not an admin's answer,
 * so it counts as "nobody has set this" and may be replaced by the company
 * default. Any other stored value is treated as a real decision and left alone.
 */
export const VOICEMAIL_TO_TEXT_PLACEHOLDER = VOICEMAIL_TO_TEXT_ON;

/** A single value to seed, ready to hand straight to react-hook-form. */
export interface CompanyDefaultValue {
  /** Form path, e.g. 'settings.voicemail_pin.voicemail_to_text'. */
  path: string;
  /** The value to write, already in the shape the product stores. */
  value: string;
}

/** One line of plain English about a company default, for the admin to read. */
export interface CompanyDefaultNote {
  /** Stable id, so a caller can pick one out without matching on wording. */
  id: 'voicemail_to_text' | 'international_calling';
  /** One sentence. No jargon, no field names. */
  message: string;
}

export interface CompanyNewUserDefaults {
  /** Values to seed onto the new person. Empty when nothing applies. */
  values: CompanyDefaultValue[];
  /** What was actually put onto the person. */
  applied: CompanyDefaultNote[];
  /**
   * Company defaults that are saved but could not be put onto this person,
   * because the person record has nowhere to keep them. Showing these is the
   * honest thing to do: the admin has set a rule that is not taking effect.
   */
  unavailable: CompanyDefaultNote[];
}

export interface CompanyNewUserDefaultsInput {
  /**
   * The `settings` blob from the reserved company record — see
   * src/lib/company-defaults.ts. Pass `null` or `undefined` when no company
   * record exists; nothing is seeded in that case. A JSON string is accepted
   * too, because some endpoints hand this column back unparsed.
   */
  companySettings: unknown;
  /**
   * The form's current values. Only read, never mutated. Any shape is fine;
   * missing branches are treated as "not set".
   */
  formValues: unknown;
  /**
   * Paths the admin has already changed by hand — react-hook-form's
   * `formState.dirtyFields` flattened to paths, or anything equivalent. A path
   * listed here is never written to, whatever it currently holds.
   */
  touchedPaths?: readonly string[];
}

const EMPTY_RESULT: CompanyNewUserDefaults = { values: [], applied: [], unavailable: [] };

/** Company settings arrive as an object or as an unparsed JSON string. */
const toObject = (raw: unknown): Record<string, any> | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : null;
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? (raw as Record<string, any>) : null;
};

/** Reads a dotted path without throwing on a missing branch. */
const readPath = (source: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<any>(
      (node, key) => (node && typeof node === 'object' ? (node as any)[key] : undefined),
      source,
    );

/**
 * Whether a field is still free to fill. Two ways it can be taken: the admin
 * has touched it, or it already holds a value that is not the shipped
 * placeholder.
 */
const isUnset = (current: unknown, placeholder: string): boolean => {
  if (current === undefined || current === null) return true;
  if (typeof current !== 'string') return true;
  const trimmed = current.trim();
  return trimmed === '' || trimmed === placeholder;
};

/**
 * Work out which company "default for a new person" values belong on a person
 * who is being created right now.
 *
 * Call it ONLY on the create path. On an edit it would overwrite a person an
 * admin had configured on purpose, which is the one failure mode worse than
 * the setting doing nothing at all.
 */
export const getCompanyNewUserDefaults = ({
  companySettings,
  formValues,
  touchedPaths = [],
}: CompanyNewUserDefaultsInput): CompanyNewUserDefaults => {
  const settings = toObject(companySettings);
  // Rule 1: no company record, or nothing saved from the policies page.
  if (!settings) return EMPTY_RESULT;

  const policies = toObject(settings[POLICIES_KEY]);
  if (!policies) return EMPTY_RESULT;

  const touched = new Set(touchedPaths);
  const values: CompanyDefaultValue[] = [];
  const applied: CompanyDefaultNote[] = [];
  const unavailable: CompanyDefaultNote[] = [];

  /* ---- Voicemail to text -------------------------------------------------
     Stored as a boolean by the company page, stored as 'YES' / 'NO' on a
     person. Only a real boolean counts: a missing key means the admin has
     never answered this, and inventing `false` for them would switch
     transcription off across every new person. */
  const transcriptionDefault = readPath(policies, 'voicemail.transcription_default');
  if (typeof transcriptionDefault === 'boolean') {
    const current = readPath(formValues, VOICEMAIL_TO_TEXT_PATH);
    const free =
      !touched.has(VOICEMAIL_TO_TEXT_PATH) && isUnset(current, VOICEMAIL_TO_TEXT_PLACEHOLDER);

    if (free) {
      const next = transcriptionDefault ? VOICEMAIL_TO_TEXT_ON : VOICEMAIL_TO_TEXT_OFF;
      // Nothing to do when the placeholder already equals the company answer.
      if (next !== current) {
        values.push({ path: VOICEMAIL_TO_TEXT_PATH, value: next });
        applied.push({
          id: 'voicemail_to_text',
          message: transcriptionDefault
            ? 'Voicemail messages will be written out as text, from your company policy.'
            : 'Voicemail messages will not be written out as text, from your company policy.',
        });
      }
    }
  }

  /* ---- International calling ---------------------------------------------
     Nothing to seed. A person record has no field for whether they may dial
     abroad — the only international switch in the product is a company-wide
     transfer permission, not a per-person one. Rather than write this
     somewhere it would be ignored, say plainly that it is not in effect. */
  const internationalDefault = readPath(policies, 'international_calling.new_user_default');
  if (internationalDefault === 'blocked' || internationalDefault === 'allowed') {
    unavailable.push({
      id: 'international_calling',
      message:
        internationalDefault === 'blocked'
          ? 'Your policy says new people should not be able to dial abroad. This cannot be set on a person yet, so they can still dial abroad.'
          : 'Your policy says new people may dial abroad. That is what happens today anyway, as there is no per-person setting for it yet.',
    });
  }

  return { values, applied, unavailable };
};

export default getCompanyNewUserDefaults;
