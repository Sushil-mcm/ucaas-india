/* Deciding which fields a User Settings Template puts onto a person, pulled out
 * of src/pages/admin-settings/people/update-forwarding/index.tsx (seSettingsData /
 * setGreetingsData) so the decision can be reused somewhere other than that one
 * form.
 *
 * That page originally decided this by calling react-hook-form's setValue
 * directly inside two functions, field by field, each guarded by
 * readRuleFlags(...).apply — see src/lib/company-rule-flags.ts for what apply
 * actually means. Useful for one form, a dead end for anything else: a future
 * "apply this template to many people at once" screen has no form to call
 * setValue on, only person records to build save payloads for.
 *
 * So this module answers the same question — "given a template, which fields
 * should move onto a person, and to what value" — as a plain list of
 * {path, value} instructions, with no React and no form involved. The
 * single-person page now builds that list and feeds it through setValue
 * itself; a bulk screen can fold the same list onto a person's stored record
 * instead. One decision, two ways of executing it, instead of two decisions
 * that can quietly drift apart.
 *
 * The field set, the conditions and the values written are copied exactly as
 * the form used them — this is a change in shape, not in behaviour.
 */

import { readRuleFlags } from '@/lib/company-rule-flags';
import { getHolidaysFormVal } from '@/lib/utils';

export interface TemplateFieldWrite {
  /** A dot path into the form/record, e.g. 'settings.operational_hours.regional'. */
  path: string;
  value: any;
}

/**
 * Which settings fields a template applies, and what it applies them to.
 *
 * `forceDisplayNumber` exists because the single-person page always writes
 * display_number the moment a template is chosen, regardless of that field's
 * own apply flag — outgoing caller ID is the one setting already wired to a
 * live call today (see the User Settings Templates page), so leaving it
 * unset would be the one field on the page that visibly does nothing.
 */
export const buildTemplateSettingsWrites = (
  templateSettings: any,
  options: { forceDisplayNumber?: boolean } = {},
): TemplateFieldWrite[] => {
  const writes: TemplateFieldWrite[] = [];

  if (readRuleFlags(templateSettings, 'regional').apply) {
    writes.push({
      path: 'settings.operational_hours.regional',
      value: templateSettings?.operational_hours?.regional,
    });
  }

  if (
    readRuleFlags(templateSettings, 'display_number').apply ||
    options.forceDisplayNumber
  ) {
    const maskingType = templateSettings?.display_number?.masking?.type;
    const typeValue = typeof maskingType === 'object' ? maskingType?.value : maskingType;
    const typeLabel =
      typeof maskingType === 'object'
        ? maskingType?.label
        : templateSettings?.display_number?.masking?.label;

    writes.push({
      path: 'settings.display_number',
      value: {
        incoming: templateSettings?.display_number?.incoming || { label: 'Yes', value: true },
        masking: {
          type: { label: typeLabel || 'None', value: typeValue || 'N' },
          value: templateSettings?.display_number?.masking?.value || '',
        },
        show_number_if_blocked: templateSettings?.display_number?.show_number_if_blocked || 'NO',
      },
    });
  }

  if (readRuleFlags(templateSettings, 'business_hours').apply) {
    writes.push({
      path: 'settings.operational_hours',
      value: templateSettings?.operational_hours,
    });
    const holidays =
      templateSettings?.operational_hours?.holidays &&
      templateSettings?.operational_hours?.holidays?.length
        ? getHolidaysFormVal(templateSettings.operational_hours.holidays)
        : [];
    writes.push({ path: 'settings.operational_hours.holidays', value: holidays });
    writes.push({
      path: 'settings.operational_hours.closed_hour_action',
      value: {
        type: {
          label: templateSettings?.operational_hours?.closed_hour_action?.type_label || '',
          value: templateSettings?.operational_hours?.closed_hour_action?.type || '',
        },
        value: {
          label: templateSettings?.operational_hours?.closed_hour_action?.value_label || '',
          value: templateSettings?.operational_hours?.closed_hour_action?.value || '',
        },
        enabled: templateSettings?.operational_hours?.closed_hour_action?.enabled,
        personal: templateSettings?.operational_hours?.closed_hour_action?.personal,
      },
    });
  }

  if (readRuleFlags(templateSettings, 'voicemail').apply) {
    writes.push({ path: 'settings.voicemail_pin', value: templateSettings?.voicemail_pin });
  }

  if (readRuleFlags(templateSettings, 'recording').apply) {
    writes.push({ path: 'settings.recording', value: templateSettings?.recording });
  }

  if (readRuleFlags(templateSettings, 'transcription').apply) {
    writes.push({
      path: 'settings.transcription',
      value: templateSettings?.transcription?.enabled || false,
    });
  }

  if (readRuleFlags(templateSettings, 'ai_call_monitoring').apply) {
    writes.push({
      path: 'settings.ai_call_monitoring',
      value: templateSettings?.ai_call_monitoring?.enabled || false,
    });
  }

  return writes;
};

/**
 * Which greeting fields a template applies. Same one-flag problem as
 * settings, same fix — see readRuleFlags. Paths are given with the trailing
 * `.override` because that is where the greeting's own flag actually lives,
 * and because the bare key `voicemail` is already a *settings* rule pointing
 * at `voicemail_pin` — writing the greeting path out in full keeps this flag
 * from being read off that unrelated node.
 *
 * `welcome_greeting`/`on_hold_music` vs `welcome`/`hold`: both spellings
 * exist in stored data depending on when the record was saved. Whichever key
 * is actually present on this template decides which one is read.
 */
export const buildTemplateGreetingsWrites = (templateGreetings: any): TemplateFieldWrite[] => {
  const writes: TemplateFieldWrite[] = [];

  const welcomeGreetingKey = templateGreetings?.welcome_greeting ? 'welcome_greeting' : 'welcome';
  const onHoldMusicKey = templateGreetings?.on_hold_music ? 'on_hold_music' : 'hold';
  const welcomeGreetingData = templateGreetings?.welcome_greeting || templateGreetings?.welcome;
  const onHoldMusicData = templateGreetings?.on_hold_music || templateGreetings?.hold;

  if (readRuleFlags(templateGreetings, `${welcomeGreetingKey}.override`).apply) {
    writes.push({
      path: 'greetings.welcome_greeting',
      value: {
        enabled: welcomeGreetingData?.enabled || false,
        value: {
          label: welcomeGreetingData?.label || 'Select',
          value: welcomeGreetingData?.value || '',
        },
      },
    });
  }

  if (readRuleFlags(templateGreetings, 'voicemail.override').apply) {
    writes.push({
      path: 'greetings.voicemail',
      value: {
        enabled: templateGreetings?.voicemail?.enabled || false,
        value: {
          label: templateGreetings?.voicemail?.label || 'Select',
          value: templateGreetings?.voicemail?.value || '',
        },
      },
    });
  }

  if (readRuleFlags(templateGreetings, 'ring_tone.override').apply) {
    writes.push({
      path: 'greetings.ring_tone',
      value: {
        enabled: templateGreetings?.ring_tone?.enabled || false,
        value: {
          label: templateGreetings?.ring_tone?.label || 'Select',
          value: templateGreetings?.ring_tone?.value || '',
        },
      },
    });
  }

  if (readRuleFlags(templateGreetings, `${onHoldMusicKey}.override`).apply) {
    writes.push({
      path: 'greetings.on_hold_music',
      value: {
        enabled: onHoldMusicData?.enabled || false,
        value: {
          label: onHoldMusicData?.label || 'Select',
          value: onHoldMusicData?.value || '',
        },
      },
    });
  }

  return writes;
};

/**
 * Folds a list of {path, value} writes onto a plain object, cloning only the
 * nodes along each path — everything off every path stays the same reference
 * the caller passed in. This is the non-form counterpart to calling setValue
 * for each write: a bulk screen builds a person's save payload by starting
 * from that person's own record and folding the template's writes over it,
 * the same way the single-person form folds them over its current values.
 */
export const applyFieldWrites = (target: Record<string, any>, writes: TemplateFieldWrite[]): any =>
  writes.reduce((record, { path, value }) => {
    const [head, ...rest] = path.split('.');
    const base =
      record && typeof record === 'object' && !Array.isArray(record) ? { ...record } : {};
    base[head] = rest.length ? applyFieldWrites(base[head] || {}, [{ path: rest.join('.'), value }]) : value;
    return base;
  }, target);
