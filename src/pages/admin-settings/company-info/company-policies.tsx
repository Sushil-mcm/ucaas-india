import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Mic, PhoneOutgoing, Voicemail, Archive } from 'lucide-react';

import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { handleAlert } from '@/lib/utils';
import {
  COMPLIANT_RECORDING_ANNOUNCEMENTS,
  validateRecordingAnnouncement,
} from '@/lib/recording-announcement';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  COMPANY_DEFAULT_TEMPLATE_NAME,
  fetchCompanyDefaults,
  saveCompanyDefaults,
} from '@/lib/company-defaults';

/**
 * Company policies
 * -----------------------------------------------------------------------------
 * Company-wide rules are kept in the reserved user_template row called
 * "Company Default". Its `settings` column is a free-form JSON blob, so every
 * key written from here is namespaced under `settings.company_policies` and
 * nothing else in that blob is touched on save.
 *
 * IMPORTANT — nothing in this product reads `settings.company_policies.*` yet.
 * The call switch, the recording pipeline and the API all ignore it today, so
 * every control on this page is a stored preference, not an enforced rule.
 * Each card says so in its own words; please keep those notes accurate if the
 * backend starts honouring a key.
 */

const POLICIES_KEY = 'company_policies';
const POLICIES_SCHEMA_VERSION = 1;

/**
 * the safe default ships 20 prompt languages. We deliberately expose a shorter list:
 * these are the languages this account can actually be given recorded prompts
 * or a TTS voice for today (English, Spanish and Hindi already have AI voices
 * in Knowledge Base) plus the markets numbers are most often bought in. A short
 * list every option can be fulfilled in beats a long list where two thirds of
 * the choices silently fall back to English.
 */
const LANGUAGE_OPTIONS = [
  { label: 'English (United States)', value: 'en-US' },
  { label: 'English (United Kingdom)', value: 'en-GB' },
  { label: 'Spanish (Spain)', value: 'es-ES' },
  { label: 'Spanish (Latin America)', value: 'es-419' },
  { label: 'French (France)', value: 'fr-FR' },
  { label: 'German (Germany)', value: 'de-DE' },
  { label: 'Portuguese (Brazil)', value: 'pt-BR' },
  { label: 'Dutch (Netherlands)', value: 'nl-NL' },
  { label: 'Hindi (India)', value: 'hi-IN' },
  { label: 'Arabic (Gulf)', value: 'ar-AE' },
];

const RECORDING_MODE_OPTIONS = [
  { label: 'Off — no calls are recorded', value: 'off' },
  { label: 'Record everything', value: 'all' },
  { label: 'On demand — agents start recording themselves', value: 'on_demand' },
];

const RETENTION_MODE_OPTIONS = [
  { label: 'Keep indefinitely', value: 'indefinite' },
  { label: 'Keep for a set number of days', value: 'days' },
  { label: 'Delete immediately', value: 'immediate' },
];

const INTERNATIONAL_OPTIONS = [
  { label: 'Blocked for new users (recommended)', value: 'blocked' },
  { label: 'Allowed for new users', value: 'allowed' },
];

const PIN_MIN = 4;
const PIN_MAX = 10;
const MESSAGE_MIN_MINUTES = 3;
const MESSAGE_MAX_MINUTES = 15;
const RETENTION_MIN_DAYS = 1;
const RETENTION_MAX_DAYS = 100;

type RetentionMode = 'indefinite' | 'days' | 'immediate';

interface RetentionForm {
  mode: RetentionMode;
  days: string;
}

interface PoliciesForm {
  default_language: string;
  voicemail_min_pin_length: string;
  voicemail_max_message_minutes: string;
  voicemail_transcription_default: boolean;
  recording_mode: string;
  recording_announcement: boolean;
  recording_announcement_text: string;
  retention_recordings: RetentionForm;
  retention_voicemails: RetentionForm;
  international_new_user_default: string;
}

const DEFAULT_FORM: PoliciesForm = {
  default_language: 'en-US',
  voicemail_min_pin_length: '4',
  voicemail_max_message_minutes: '3',
  voicemail_transcription_default: false,
  recording_mode: 'off',
  // Announcement defaults on: in most places it is the caller's legal notice.
  recording_announcement: true,
  recording_announcement_text: '',
  retention_recordings: { mode: 'indefinite', days: '30' },
  retention_voicemails: { mode: 'indefinite', days: '30' },
  // established systems blocks international dialling by default as fraud prevention. Same here.
  international_new_user_default: 'blocked',
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

const toRetentionForm = (stored: any, fallback: RetentionForm): RetentionForm => {
  const mode = stored?.mode;
  const isKnownMode = mode === 'indefinite' || mode === 'days' || mode === 'immediate';
  const days = stored?.days;
  return {
    mode: isKnownMode ? mode : fallback.mode,
    days: typeof days === 'number' || typeof days === 'string' ? String(days) : fallback.days,
  };
};

const toNumericString = (value: any, fallback: string): string =>
  typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
    ? String(value)
    : fallback;

const buildFormFromSettings = (settings: Record<string, any>): PoliciesForm => {
  const policies = settings?.[POLICIES_KEY] || {};
  const voicemail = policies?.voicemail || {};
  const recording = policies?.call_recording || {};
  const retention = policies?.data_retention || {};
  const international = policies?.international_calling || {};

  return {
    default_language:
      LANGUAGE_OPTIONS.find((option) => option.value === policies?.default_language)?.value ||
      DEFAULT_FORM.default_language,
    voicemail_min_pin_length: toNumericString(
      voicemail?.min_pin_length,
      DEFAULT_FORM.voicemail_min_pin_length,
    ),
    voicemail_max_message_minutes: toNumericString(
      voicemail?.max_message_minutes,
      DEFAULT_FORM.voicemail_max_message_minutes,
    ),
    voicemail_transcription_default: Boolean(voicemail?.transcription_default),
    recording_mode:
      RECORDING_MODE_OPTIONS.find((option) => option.value === recording?.mode)?.value ||
      DEFAULT_FORM.recording_mode,
    recording_announcement:
      typeof recording?.announcement_to_caller === 'boolean'
        ? recording.announcement_to_caller
        : DEFAULT_FORM.recording_announcement,
    recording_announcement_text: `${recording?.announcement_text || ''}`,
    retention_recordings: toRetentionForm(
      retention?.call_recordings,
      DEFAULT_FORM.retention_recordings,
    ),
    retention_voicemails: toRetentionForm(retention?.voicemails, DEFAULT_FORM.retention_voicemails),
    international_new_user_default:
      INTERNATIONAL_OPTIONS.find((option) => option.value === international?.new_user_default)
        ?.value || DEFAULT_FORM.international_new_user_default,
  };
};

const buildRetentionPayload = (form: RetentionForm) => ({
  mode: form.mode,
  // `days` is only meaningful in "days" mode; keep it null otherwise so a reader
  // can never mistake a leftover number for an active limit.
  days: form.mode === 'days' ? Number(form.days) : null,
});

const buildPoliciesPayload = (form: PoliciesForm) => ({
  version: POLICIES_SCHEMA_VERSION,
  updated_at: new Date().toISOString(),
  default_language: form.default_language,
  voicemail: {
    min_pin_length: Number(form.voicemail_min_pin_length),
    max_message_minutes: Number(form.voicemail_max_message_minutes),
    transcription_default: form.voicemail_transcription_default,
  },
  call_recording: {
    mode: form.recording_mode,
    announcement_to_caller: form.recording_announcement,
    announcement_text: form.recording_announcement_text.trim(),
  },
  data_retention: {
    call_recordings: buildRetentionPayload(form.retention_recordings),
    voicemails: buildRetentionPayload(form.retention_voicemails),
  },
  international_calling: {
    new_user_default: form.international_new_user_default,
  },
});

const isWholeNumberInRange = (value: string, min: number, max: number) => {
  if (!/^\d+$/.test(value.trim())) return false;
  const parsed = Number(value);
  return parsed >= min && parsed <= max;
};

const validateForm = (form: PoliciesForm): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!isWholeNumberInRange(form.voicemail_min_pin_length, PIN_MIN, PIN_MAX)) {
    errors.voicemail_min_pin_length = `Enter a whole number between ${PIN_MIN} and ${PIN_MAX}`;
  }
  if (
    !isWholeNumberInRange(
      form.voicemail_max_message_minutes,
      MESSAGE_MIN_MINUTES,
      MESSAGE_MAX_MINUTES,
    )
  ) {
    errors.voicemail_max_message_minutes = `Enter a whole number between ${MESSAGE_MIN_MINUTES} and ${MESSAGE_MAX_MINUTES}`;
  }
  if (
    form.retention_recordings.mode === 'days' &&
    !isWholeNumberInRange(form.retention_recordings.days, RETENTION_MIN_DAYS, RETENTION_MAX_DAYS)
  ) {
    errors.retention_recordings = `Enter a whole number of days between ${RETENTION_MIN_DAYS} and ${RETENTION_MAX_DAYS}`;
  }
  if (
    form.retention_voicemails.mode === 'days' &&
    !isWholeNumberInRange(form.retention_voicemails.days, RETENTION_MIN_DAYS, RETENTION_MAX_DAYS)
  ) {
    errors.retention_voicemails = `Enter a whole number of days between ${RETENTION_MIN_DAYS} and ${RETENTION_MAX_DAYS}`;
  }

  /* The announcement check was only rendered, never enforced, so wording that
     the screen flagged in red still saved without complaint — an admin could
     reasonably conclude it had been accepted. Blank is allowed (the wording is
     optional); wording that has been entered must pass. */
  if (form.recording_announcement && form.recording_announcement_text.trim()) {
    const check = validateRecordingAnnouncement(form.recording_announcement_text);
    if (!check.valid) errors.recording_announcement_text = check.reason;
  }

  return errors;
};

const selectedOption = (options: { label: string; value: string }[], value: string) =>
  options.find((option) => option.value === value) || null;

/**
 * A per-setting honesty badge. `enforced` is only ever passed `true` once the
 * backend genuinely acts on that key — today nothing does.
 */
const StatusBadge = ({ enforced }: { enforced: boolean }) =>
  enforced ? (
    <span className="rounded-sm bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
      In effect now
    </span>
  ) : (
    <span className="rounded-sm bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
      Saved, not enforced yet
    </span>
  );

interface PolicyCardProps {
  icon: React.ReactNode;
  title: string;
  summary: string;
  enforced: boolean;
  enforcementNote: string;
  children: React.ReactNode;
}

const PolicyCard = ({
  icon,
  title,
  summary,
  enforced,
  enforcementNote,
  children,
}: PolicyCardProps) => (
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-start gap-3 border-b border-gray-200 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ucass-primary-200 text-primary">
        {icon}
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <StatusBadge enforced={enforced} />
        </div>
        <p className="text-xs text-gray-500">{summary}</p>
      </div>
    </div>
    <div className="flex flex-col gap-4 p-4">
      {children}
      <p
        className={`rounded-lg border px-3 py-2 text-xs ${
          enforced
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {enforcementNote}
      </p>
    </div>
  </div>
);

const CompanyPolicies = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PoliciesForm>(DEFAULT_FORM);
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

  const { mutate: savePolicies, isPending: isSaving } = useMutation({
    mutationFn: saveCompanyDefaults,
    onSuccess: (response: any) => {
      handleAlert({
        text: response?.data?.message || 'Company policies saved',
        type: 'success',
      });
      /* The whole company record is invalidated, not just this card. Holidays,
         emergency address and phone rules all read the same row, so a save here
         must make them re-read — otherwise the next card saves a merge built on
         a stale blob and silently drops what was just written. */
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['userTemplateList'] });
    },
  });

  const updateForm = (patch: Partial<PoliciesForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      handleAlert({ text: 'Please fix the highlighted fields', type: 'error' });
      return;
    }

    // Merge, never replace: the Company Default row also carries the rest of the
    // company defaults blob, and other screens write into it.
    const nextSettings = {
      ...savedSettings,
      [POLICIES_KEY]: buildPoliciesPayload(form),
    };

    savePolicies({
      uuid: companyDefaultTemplate?.uuid,
      settings: nextSettings,
      greetings: toGreetingsObject(companyDefaultTemplate?.greetings),
    });
  };

  const renderRetention = (
    key: 'retention_recordings' | 'retention_voicemails',
    label: string,
    helper: string,
  ) => {
    const value = form[key];
    const error = errors[key];
    return (
      <div className="flex flex-col gap-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <CustomSelect
              label={label}
              options={RETENTION_MODE_OPTIONS}
              value={selectedOption(RETENTION_MODE_OPTIONS, value.mode)}
              handleChange={(option: any) =>
                updateForm({
                  [key]: {
                    ...value,
                    mode: (option?.value || 'indefinite') as RetentionMode,
                  },
                } as Partial<PoliciesForm>)
              }
            />
            <p className="text-xs text-gray-500">{helper}</p>
          </div>
          {value.mode === 'days' && (
            <div className="flex flex-col gap-1">
              <Input
                type="number"
                min={RETENTION_MIN_DAYS}
                max={RETENTION_MAX_DAYS}
                label="Days to keep"
                value={value.days}
                error={error}
                onChange={(event) =>
                  updateForm({
                    [key]: { ...value, days: event.target.value },
                  } as Partial<PoliciesForm>)
                }
              />
              <p className="text-xs text-gray-500">
                Between {RETENTION_MIN_DAYS} and {RETENTION_MAX_DAYS} days, counted from the day the
                file was created.
              </p>
            </div>
          )}
        </div>
      </div>
    );
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
        <p className="text-lg font-semibold text-gray-900">Company policies</p>
        <p className="text-xs text-gray-500">
          One set of rules for the whole company — prompt language, voicemail, call recording, how
          long we keep files and who may dial abroad.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-[1040px] min-h-0 flex-col gap-4">
          {isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
              <p className="text-sm font-semibold text-gray-900">
                We could not load the saved policies
              </p>
              <p className="text-xs text-gray-500">
                What you see below are the built-in defaults, not your saved values. Reload before
                you save, or you may overwrite settings you cannot currently see.
              </p>
            </div>
          )}

          {!companyDefaultTemplate && !isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-gray-900">No policies saved yet</p>
              <p className="text-xs text-gray-500">
                The reserved &ldquo;{COMPANY_DEFAULT_TEMPLATE_NAME}&rdquo; record does not exist for
                this account. Saving creates it with the values below.
              </p>
            </div>
          )}

          <PolicyCard
            icon={<Globe className="h-5 w-5" />}
            title="Default language"
            summary="The language used for voicemail prompts and IVR menus when nothing more specific is set."
            enforced={false}
            enforcementNote="Saved only. Prompts and IVR menus still play in whatever language their own recording or voice was built in — this choice does not change them. It gives the platform a company answer for when prompt language becomes selectable."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <CustomSelect
                  label="Prompt language"
                  options={LANGUAGE_OPTIONS}
                  value={selectedOption(LANGUAGE_OPTIONS, form.default_language)}
                  handleChange={(option: any) =>
                    updateForm({ default_language: option?.value || DEFAULT_FORM.default_language })
                  }
                />
                <p className="text-xs text-gray-500">
                  Ten languages, not twenty. These are the ones this account can actually be given a
                  recorded prompt set or a voice for — English, Spanish and Hindi already have AI
                  voices here. A shorter list beats a long one where most choices quietly fall back
                  to English.
                </p>
              </div>
            </div>
          </PolicyCard>

          <PolicyCard
            icon={<Voicemail className="h-5 w-5" />}
            title="Voicemail policy"
            summary="PIN strength, how long a caller may talk, and whether messages are transcribed for new users."
            enforced={false}
            enforcementNote="Saved only. Voicemail PINs are not checked against this minimum anywhere yet, and a caller can still record for as long as the carrier allows. Transcription is set per user under User settings today; this value is the intended default for new users, not a switch that turns transcription on for anyone."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Input
                  type="number"
                  min={PIN_MIN}
                  max={PIN_MAX}
                  label="Minimum PIN length"
                  value={form.voicemail_min_pin_length}
                  error={errors.voicemail_min_pin_length}
                  onChange={(event) => updateForm({ voicemail_min_pin_length: event.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Between {PIN_MIN} and {PIN_MAX} digits. Six or more is the usual advice, because a
                  four-digit PIN is guessable by hand.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  type="number"
                  min={MESSAGE_MIN_MINUTES}
                  max={MESSAGE_MAX_MINUTES}
                  label="Maximum message length (minutes)"
                  value={form.voicemail_max_message_minutes}
                  error={errors.voicemail_max_message_minutes}
                  onChange={(event) =>
                    updateForm({ voicemail_max_message_minutes: event.target.value })
                  }
                />
                <p className="text-xs text-gray-500">
                  Between {MESSAGE_MIN_MINUTES} and {MESSAGE_MAX_MINUTES} minutes. Longer messages
                  cost more storage and are rarely listened to in full.
                </p>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-900">
                  Transcribe voicemail by default
                </p>
                <p className="text-xs text-gray-500">
                  New users would get voicemail-to-text switched on. Existing users keep whatever
                  they have now — changing this never edits anyone&rsquo;s current setting.
                </p>
              </div>
              <Switch
                checked={form.voicemail_transcription_default}
                onCheckedChange={(checked) =>
                  updateForm({ voicemail_transcription_default: checked })
                }
              />
            </div>
          </PolicyCard>

          <PolicyCard
            icon={<Mic className="h-5 w-5" />}
            title="Call recording policy"
            summary="Whether calls are recorded across the company, and whether callers are told."
            enforced={false}
            enforcementNote="Saved only — and this is the one to be careful with. Setting this to Off does NOT stop any recording: recording is still driven entirely by the per-user and per-template Automatic Call Recording settings, and by anyone pressing record during a call. Do not treat this card as proof that recording is off. The announcement toggle likewise plays nothing yet."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <CustomSelect
                  label="Recording mode"
                  options={RECORDING_MODE_OPTIONS}
                  value={selectedOption(RECORDING_MODE_OPTIONS, form.recording_mode)}
                  handleChange={(option: any) =>
                    updateForm({ recording_mode: option?.value || DEFAULT_FORM.recording_mode })
                  }
                />
                <p className="text-xs text-gray-500">
                  Off, record everything, or let agents start a recording themselves during a call.
                  Per-user exceptions are not part of this record yet.
                </p>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-900">Announce recording to callers</p>
                <p className="text-xs text-gray-500">
                  Play a short notice before a recorded call starts. Many countries require it, so
                  check your local rules before turning it off.
                </p>
              </div>
              <Switch
                checked={form.recording_announcement}
                onCheckedChange={(checked) => updateForm({ recording_announcement: checked })}
              />
            </div>

            {/* Compliance guidance rejects wording that mentions recording but not that a
                third party may be doing it — "this call may be recorded for
                quality purposes" is their own example of a FAILING announcement.
                The check runs as you type so the wording is fixed here rather
                than coming back as a compliance problem later. */}
            {form.recording_announcement && (
              <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-gray-900">Announcement wording</p>
                  <p className="text-xs text-gray-500">
                    It must say two things: that the call is recorded or transcribed,{' '}
                    <strong>and</strong> that a third party may be doing it. Saying only the first
                    is the most common mistake.
                  </p>
                </div>

                <textarea
                  rows={3}
                  value={form.recording_announcement_text}
                  onChange={(event) =>
                    updateForm({ recording_announcement_text: event.target.value })
                  }
                  placeholder="This call may be recorded or transcribed by us, or by a third party acting on our behalf."
                  className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-900 focus:border-primary focus:outline-none"
                />

                {form.recording_announcement_text.trim() && (
                  <p
                    role="status"
                    className={`text-xs ${
                      validateRecordingAnnouncement(form.recording_announcement_text).valid
                        ? 'text-green-700'
                        : 'text-red-600'
                    }`}
                  >
                    {validateRecordingAnnouncement(form.recording_announcement_text).reason}
                  </p>
                )}

                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-semibold text-gray-500">Wording you can use</p>
                  {COMPLIANT_RECORDING_ANNOUNCEMENTS.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      onClick={() => updateForm({ recording_announcement_text: example.text })}
                      className="cursor-pointer rounded-md border border-gray-200 p-2 text-left text-xs text-gray-700 hover:border-primary hover:bg-ucass-primary-200/30"
                    >
                      {example.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </PolicyCard>

          <PolicyCard
            icon={<Archive className="h-5 w-5" />}
            title="Data retention"
            summary="How long call recordings and voicemail messages are kept before deletion."
            enforced={false}
            enforcementNote="Saved only. Nothing deletes recordings or voicemails on this schedule today — there is no retention job behind it, so files stay until someone removes them by hand. Do not rely on this card to answer a compliance or data-deletion question."
          >
            {renderRetention(
              'retention_recordings',
              'Call recordings',
              'How long a recorded call is kept once it ends.',
            )}
            {renderRetention(
              'retention_voicemails',
              'Voicemail messages',
              'How long a voicemail is kept once it is left.',
            )}
          </PolicyCard>

          <PolicyCard
            icon={<PhoneOutgoing className="h-5 w-5" />}
            title="International calling"
            summary="Whether a newly created user may dial abroad before an admin says otherwise."
            enforced={false}
            enforcementNote="Saved only. There is no international-dialling check in the product yet, so a new user can dial abroad regardless of what this says. Blocked is the safer value to record, and it matches the way the safe default ships: off by default, because toll fraud usually shows up as international calls."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <CustomSelect
                  label="Default for new users"
                  options={INTERNATIONAL_OPTIONS}
                  value={selectedOption(INTERNATIONAL_OPTIONS, form.international_new_user_default)}
                  handleChange={(option: any) =>
                    updateForm({
                      international_new_user_default:
                        option?.value || DEFAULT_FORM.international_new_user_default,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  Applies to users created after you save. It is a starting point per user, so an
                  admin can still allow or block any individual later.
                </p>
              </div>
            </div>
          </PolicyCard>

          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Saved to the reserved &ldquo;{COMPANY_DEFAULT_TEMPLATE_NAME}&rdquo; record under
              <span className="font-semibold"> settings.company_policies</span>. Everything else in
              that record is left untouched.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save policies'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyPolicies;
