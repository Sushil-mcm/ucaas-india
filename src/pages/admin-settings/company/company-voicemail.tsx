import { useEffect, useMemo, useState } from 'react';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ScrollText, Voicemail } from 'lucide-react';

import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { handleAlert } from '@/lib/utils';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  saveCompanyDefaults,
} from '@/lib/company-defaults';

/**
 * Company voicemail
 * -----------------------------------------------------------------------------
 * Setting voicemail rules once for the whole organisation is standard in
 * established business phone systems. Here there was no such screen: the
 * company record already
 * carried `settings.voicemail_pin`, other code already read it, but the only
 * editor for it was the per-person dialog. The company-level card that would
 * have written it sits commented out in
 * src/pages/admin-settings/templates/user-settings/add-edit-user-settings/settings/index.tsx
 * (lines 124-157), so the value was displayed and copied around but could never
 * be set at company level. This page is the missing editor.
 *
 * Storage follows the rest of Company info: the reserved user_template row
 * called "Company Default", whose `settings` column is a free-form JSON blob.
 * The EXISTING key is reused — no new namespace — because other code already
 * reads it:
 *
 *   settings.voicemail_pin = {
 *     value:             string,          // the PIN
 *     users:             ISELECTVALUE[],  // shared-voicemail recipients
 *     voicemail_to_text: 'YES' | 'NO',
 *     override:          boolean,
 *   }
 *
 * `users` is not edited here (picking named people as everyone's shared
 * mailbox is a per-person choice, not a company rule) but it is spread through
 * untouched on save, as is the rest of the settings blob.
 *
 * ---------------------------------------------------------------------------
 * WHAT ACTUALLY TAKES EFFECT (grepped when this file was written)
 * ---------------------------------------------------------------------------
 * `override` — REAL. Read by src/lib/company-policy.ts:32
 *   (POLICY_FIELDS.voicemail = 'voicemail_pin.override'), compared at
 *   src/lib/company-policy.ts:74, and consumed by
 *   src/components/common-settings/index.tsx:48 (useCompanyPolicy) through
 *   canEditField, which disables the Voicemail Settings button on a person's
 *   own settings page. It is also read at
 *   src/pages/admin-settings/people/update-forwarding/index.tsx:787,
 *   where a true flag copies this whole voicemail_pin block onto a user when an
 *   admin applies this record as their template.
 *
 * `voicemail_to_text` — STORED. Nothing reads the company copy except the
 *   template-copy path above. The per-person editors
 *   (src/components/common-settings/voicemail-dialog/index.tsx:113-115) read
 *   and write each person's own value, never this one, so changing it here
 *   turns transcription on for nobody who already exists.
 *
 * `value` (the PIN) — STORED. No screen in this product asks for a voicemail
 *   PIN at any point; the key is only carried between form and record
 *   (src/pages/settings/general/index.tsx:177,
 *   src/components/common-settings/voicemail-dialog/index.tsx:62). Nothing
 *   checks it when a mailbox is opened.
 *
 * Keep those notes honest. If the backend starts acting on a key, change that
 * card's `status` and rewrite its note — a stale reassurance here is worse than
 * no page. "Coming soon" means we have not built it; "In this app only" means
 * the browser does the work and nothing behind it checks again.
 */

const VOICEMAIL_KEY = 'voicemail_pin';

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 10;

interface VoicemailForm {
  /* Blank means "no company PIN recorded", which is the shipped state. */
  pin: string;
  voicemail_to_text: boolean;
  override: boolean;
}

const DEFAULT_FORM: VoicemailForm = {
  pin: '',
  /* Both flags start off. `override` off is the safer of its two readings:
     nobody is silently handed a company PIN, and the personal lock behaves the
     way it did before this page existed. */
  voicemail_to_text: false,
  override: false,
};

const toSettingsObject = (rawSettings: any): Record<string, any> => {
  if (!rawSettings) return {};
  if (typeof rawSettings === 'string') {
    try {
      const parsed = JSON.parse(rawSettings);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof rawSettings === 'object' ? rawSettings : {};
};

const toGreetingsObject = (rawGreetings: any): Record<string, any> =>
  toSettingsObject(rawGreetings);

const buildFormFromSettings = (settings: Record<string, any>): VoicemailForm => {
  const voicemail = settings?.[VOICEMAIL_KEY] || {};
  const pin = voicemail?.value;

  return {
    pin: typeof pin === 'number' || typeof pin === 'string' ? String(pin) : DEFAULT_FORM.pin,
    /* Stored as the strings 'YES'/'NO', never as a boolean. Anything else — an
       older record, a missing key — reads as off rather than as on. */
    voicemail_to_text: voicemail?.voicemail_to_text === 'YES',
    override: voicemail?.override === true,
  };
};

const validateForm = (form: VoicemailForm): Record<string, string> => {
  const errors: Record<string, string> = {};
  const pin = form.pin.trim();

  /* Blank is allowed and means no company PIN. A PIN that has been typed must
     be digits only, because a mailbox is opened from a phone keypad. */
  if (pin) {
    if (!/^\d+$/.test(pin)) {
      errors.pin = 'Use digits only — a PIN is typed on a phone keypad';
    } else if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) {
      errors.pin = `Enter between ${PIN_MIN_LENGTH} and ${PIN_MAX_LENGTH} digits`;
    }
  }

  return errors;
};

/**
 * The honesty badge. A card is only ever marked 'active' or 'app-only' for a key
 * something in this product genuinely reads today.
 */
const CompanyVoicemail = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VoicemailForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    data: companyDefaultTemplate = null,
    isLoading,
    isError,
  } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });

  const savedSettings = useMemo(
    () => toSettingsObject(companyDefaultTemplate?.settings),
    [companyDefaultTemplate],
  );

  const savedForm = useMemo(() => buildFormFromSettings(savedSettings), [savedSettings]);

  useEffect(() => {
    setForm(savedForm);
    setErrors({});
  }, [savedForm]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  const { mutate: saveVoicemail, isPending: isSaving } = useMutation({
    mutationFn: saveCompanyDefaults,
    onSuccess: (response: any) => {
      handleAlert({
        text: response?.data?.message || 'Company voicemail settings saved',
        type: 'success',
      });
      /* The whole company record is invalidated, not just this card. The
         personal-settings lock (useCompanyPolicy) and the other company cards
         read the same row, so a save here must make them re-read — otherwise
         the next card merges onto a stale blob and drops what was just
         written. */
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['userTemplateList'] });
    },
  });

  const updateForm = (patch: Partial<VoicemailForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      handleAlert({ text: 'Please fix the highlighted fields', type: 'error' });
      return;
    }

    /* Merge at both levels, never replace. The outer spread keeps the other
       company cards' keys; the inner spread keeps `users` and anything else
       already inside voicemail_pin, so the stored shape is unchanged and only
       the three fields on this page move. */
    const nextSettings = {
      ...savedSettings,
      [VOICEMAIL_KEY]: {
        ...(savedSettings?.[VOICEMAIL_KEY] || {}),
        value: form.pin.trim(),
        voicemail_to_text: form.voicemail_to_text ? 'YES' : 'NO',
        override: form.override,
      },
    };

    saveVoicemail({
      uuid: companyDefaultTemplate?.uuid,
      settings: nextSettings,
      greetings: toGreetingsObject(companyDefaultTemplate?.greetings),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <Loader />
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-200/15">
      <div className="flex min-h-[65px] flex-col justify-center border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-lg font-semibold text-gray-900">Voicemail</p>
        <p className="text-xs text-gray-500">
          The voicemail settings the company starts people on, and whether a person may change them
          on their own phone.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-[1040px] min-h-0 flex-col gap-4">
          {isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
              <p className="text-sm font-semibold text-gray-900">
                We could not load the saved settings
              </p>
              <p className="text-xs text-gray-500">
                What you see below are the built-in defaults, not your saved values. Reload before
                you save, or you may overwrite settings you cannot currently see.
              </p>
            </div>
          )}

          {!companyDefaultTemplate && !isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-gray-900">No company voicemail saved yet</p>
              <p className="text-xs text-gray-500">
                Nothing has been set for your company yet. Choose what you want below and save.
              </p>
            </div>
          )}

          <SettingCard
            icon={<Voicemail className="h-5 w-5" />}
            title="Who may change voicemail settings"
            description="The one setting on this page that something already acts on — and it is read in two different ways."
            status="app-only"
            note="Works in this app. When this is off, a person cannot open their own voicemail settings here and an admin changes them instead."
          >
            <SettingRow
              label="Let people change their own voicemail settings"
              description="Left off, a person cannot open their own voicemail settings and an admin changes them instead. Be aware of the second reading: a new person set up from this record then also starts with the PIN and the voicemail-to-text choice below, so everyone set up that way shares one PIN."
              control={
                <Switch
                  checked={form.override}
                  onCheckedChange={(checked: boolean) => updateForm({ override: checked })}
                />
              }
            />
          </SettingCard>

          <SettingCard
            icon={<ScrollText className="h-5 w-5" />}
            title="Voicemail to text"
            description="Whether a message is written out as text as well as left as audio."
            status="app-only"
            note="Works in this app, in one place: setting somebody up from these company settings. It does not change anyone already set up."
          >
            <SettingRow
              label="Write messages out as text"
              description="Stored as YES or NO, the same wording the per-person voicemail dialog writes, so both screens agree on what they are reading."
              control={
                <Switch
                  checked={form.voicemail_to_text}
                  onCheckedChange={(checked) => updateForm({ voicemail_to_text: checked })}
                />
              }
            />
          </SettingCard>

          <SettingCard
            icon={<KeyRound className="h-5 w-5" />}
            title="Voicemail PIN"
            description="The PIN a person would type to hear their messages from a phone."
            status="coming-soon"
            note="Coming soon. Mailboxes do not ask for a PIN yet, so this one guards nothing today. Anyone you set up from these settings still receives it, so choose a PIN you are happy to share."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Input
                  label="Starting PIN"
                  inputMode="numeric"
                  maxLength={PIN_MAX_LENGTH}
                  placeholder="Leave blank for no PIN"
                  value={form.pin}
                  error={errors.pin}
                  onChange={(event) => updateForm({ pin: event.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Digits only, {PIN_MIN_LENGTH} to {PIN_MAX_LENGTH} of them. Six or more is the
                  usual advice, because a four-digit PIN can be guessed by hand. Blank means no
                  company PIN is recorded.
                </p>
              </div>
            </div>
          </SettingCard>

          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Saved for your whole company. Your other settings are not affected.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save voicemail settings'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyVoicemail;
