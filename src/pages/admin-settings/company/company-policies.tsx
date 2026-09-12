import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Flag, Globe, Headphones, Mic, PhoneOutgoing, ScrollText, Voicemail } from 'lucide-react';

import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { SectionHeading } from './section-heading';
import { SectionActions } from './section-actions';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { handleAlert } from '@/lib/utils';
import { COUNTRY_OPTIONS } from '@/lib/company-default-country';
import { describeRecording } from '@/lib/recording-description';
import { useUser } from '@/hooks/use-user';
import { COMPANY_ROOT } from './company-sections';
import { makeAnnouncementAudio } from './company-policies-announcement';
import {
  COMPLIANT_RECORDING_ANNOUNCEMENTS,
  validateRecordingAnnouncement,
} from '@/lib/recording-announcement';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
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
 * Who reads what (9 Sep 2026) - keep this list true when a card's badge changes:
 *   default_language / default_country     this app (new greeting language, number search)
 *   recording_access.own / admins_all      tenant-api RecordingAccessFilter withholds the
 *                                          recording file name from anyone the rule excludes
 *                                          (reads company_settings first, template row second)
 *   voicemail.min_pin_length               default-api VoicemailPinPolicy on POST /api/user/update
 *   voicemail.max_message_minutes          the switch: vm_max_seconds on every way into voicemail,
 *                                          read by save-voicemail.lua
 *   voicemail.transcription_default        NOTHING - transcription follows Phone rules > Transcription;
 *                                          the stored value is carried through untouched, not shown
 *   call_recording.mode                    NOTHING - the switch records from the Phone rules
 *                                          `recording` section; this card mirrors it, read-only
 *   call_recording.announcement_to_caller  the switch: false skips the recording notice
 *   call_recording.announcement_file       the switch: the company's own notice audio (made here
 *                                          from the wording, see company-policies-announcement.ts)
 *   data_retention.*                       default-api nightly sweep (RetentionSweepService)
 *   international_calling.new_user_default default-api CompanyPolicyService.seedNewUserSettings
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

const RETENTION_MODE_OPTIONS = [
  { label: 'Keep indefinitely', value: 'indefinite' },
  { label: 'Keep for a set number of days', value: 'days' },
  { label: 'Delete on the next nightly sweep', value: 'immediate' },
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
  recording_announcement: boolean;
  recording_announcement_text: string;
  /* The audio made from the wording, and the wording it was made from. When the
     two drift apart the file is dropped on save, so callers never hear wording
     an admin has since changed. */
  recording_announcement_file: string;
  recording_announcement_file_text: string;
  default_country: string;
  recording_access_own: boolean;
  recording_access_admins_all: boolean;
  retention_recordings: RetentionForm;
  retention_voicemails: RetentionForm;
  international_new_user_default: string;
}

const DEFAULT_FORM: PoliciesForm = {
  default_language: 'en-US',
  voicemail_min_pin_length: '4',
  voicemail_max_message_minutes: '3',
  // Announcement defaults on: in most places it is the caller's legal notice.
  recording_announcement: true,
  recording_announcement_text: '',
  recording_announcement_file: '',
  recording_announcement_file_text: '',
  /* Both true, matching how the product behaves today, so switching this on
     changes nothing until an admin decides otherwise. */
  /* Empty means not chosen, which is exactly today's behaviour. */
  default_country: '',
  recording_access_own: true,
  recording_access_admins_all: true,
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
    recording_announcement:
      typeof recording?.announcement_to_caller === 'boolean'
        ? recording.announcement_to_caller
        : DEFAULT_FORM.recording_announcement,
    recording_announcement_text: `${recording?.announcement_text || ''}`,
    recording_announcement_file: `${recording?.announcement_file || ''}`,
    recording_announcement_file_text: `${recording?.announcement_file_text || ''}`,
    /* Only a stored boolean counts as a decision. A tenant that never opened
       this page has no value here, and reading that as "no" would take away
       everyone's own recordings the day this ships. */
    default_country:
      COUNTRY_OPTIONS.find(
        (option) => option.value === String(policies?.default_country || '').toUpperCase(),
      )?.value || DEFAULT_FORM.default_country,
    recording_access_own:
      typeof policies?.recording_access?.own === 'boolean'
        ? policies.recording_access.own
        : DEFAULT_FORM.recording_access_own,
    recording_access_admins_all:
      typeof policies?.recording_access?.admins_all === 'boolean'
        ? policies.recording_access.admins_all
        : DEFAULT_FORM.recording_access_admins_all,
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

/* True when the audio on file was made from exactly this wording. */
const announcementAudioCurrent = (form: PoliciesForm): boolean =>
  Boolean(form.recording_announcement_file) &&
  form.recording_announcement_file_text.trim() === form.recording_announcement_text.trim();

/* `stored` is the section as last saved. Two keys are carried through rather than
   edited here: `voicemail.transcription_default` (nothing reads it - transcription
   is a Phone rule) and `call_recording.mode` (the switch records from the Phone
   rules `recording` section; this screen only mirrors it). Dropping them would
   read as a change to anyone diffing the history; rewriting them from this form
   would be inventing a value. */
const buildPoliciesPayload = (form: PoliciesForm, stored: any) => ({
  version: POLICIES_SCHEMA_VERSION,
  updated_at: new Date().toISOString(),
  default_language: form.default_language,
  voicemail: {
    min_pin_length: Number(form.voicemail_min_pin_length),
    max_message_minutes: Number(form.voicemail_max_message_minutes),
    transcription_default: stored?.voicemail?.transcription_default === true,
  },
  call_recording: {
    mode: typeof stored?.call_recording?.mode === 'string' ? stored.call_recording.mode : 'off',
    announcement_to_caller: form.recording_announcement,
    announcement_text: form.recording_announcement_text.trim(),
    announcement_file: announcementAudioCurrent(form) ? form.recording_announcement_file : null,
    announcement_file_text: announcementAudioCurrent(form)
      ? form.recording_announcement_file_text.trim()
      : null,
  },
  default_country: form.default_country || null,
  recording_access: {
    own: form.recording_access_own,
    admins_all: form.recording_access_admins_all,
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
const CompanyPolicies = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [form, setForm] = useState<PoliciesForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [makingAudio, setMakingAudio] = useState(false);

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

  /* What the switch actually records from: the Phone rules `recording` section.
     Read here so the card can say it, never written from here. */
  const recordingRule = useMemo(() => {
    const rule = toSettingsObject(savedSettings?.recording);
    const automatic = toSettingsObject(rule?.automatic);
    const onDemand = toSettingsObject(rule?.on_demand);
    return describeRecording({
      automaticEnabled: automatic?.enabled === true,
      direction: typeof automatic?.value === 'string' ? automatic.value : null,
      onDemandEnabled: onDemand?.enabled === true,
    });
  }, [savedSettings]);

  useEffect(() => {
    setForm(savedForm);
    setErrors({});
  }, [savedForm]);


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
      [POLICIES_KEY]: buildPoliciesPayload(form, toSettingsObject(savedSettings?.[POLICIES_KEY])),
    };

    savePolicies({
      uuid: companyDefaultTemplate?.uuid,
      settings: nextSettings,
      greetings: toGreetingsObject(companyDefaultTemplate?.greetings),
      only: [POLICIES_KEY],
    });
  };

  const handleMakeAudio = async () => {
    const text = form.recording_announcement_text.trim();
    const check = validateRecordingAnnouncement(text);
    if (!text || !check.valid) {
      setErrors((prev) => ({ ...prev, recording_announcement_text: check.reason }));
      handleAlert({ text: 'Fix the wording first.', type: 'error' });
      return;
    }
    setMakingAudio(true);
    try {
      const made = await makeAnnouncementAudio({
        text,
        locale: form.default_language,
        companyUuid: user?.company_info?.uuid,
      });
      updateForm({
        recording_announcement_file: made.file_name,
        recording_announcement_file_text: text,
      });
      handleAlert({ text: 'Audio made. Save the page and callers will hear it.', type: 'success' });
    } catch (error: any) {
      handleAlert({
        text:
          error?.response?.data?.message ||
          error?.message ||
          'The audio could not be made. Try again in a moment.',
        type: 'error',
      });
    } finally {
      setMakingAudio(false);
    }
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
            <p className="text-xs text-[#9A948F]">{helper}</p>
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
              <p className="text-xs text-[#9A948F]">
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
    <section className="cs-section flex w-full flex-col gap-4">
      <div className="cs-block">
        <SectionHeading
          icon={<ScrollText className="h-[18px] w-[18px]" />}
          title="Policies"
          description="One set of rules for the whole company — prompt language, voicemail, call recording, how long we keep files and who may dial abroad."
        />
      </div>

      <div className="w-full">
        <div className="flex w-full flex-col gap-4">
          {isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
              <p className="text-sm font-semibold text-[#2E2D35]">
                We could not load the saved policies
              </p>
              <p className="text-xs text-[#9A948F]">
                What you see below are the built-in defaults, not your saved values. Reload before
                you save, or you may overwrite settings you cannot currently see.
              </p>
            </div>
          )}

          {!companyDefaultTemplate && !isError && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-[#2E2D35]">No policies saved yet</p>
              <p className="text-xs text-[#9A948F]">
                Nothing has been set for your company yet. Choose what you want below and save.
              </p>
            </div>
          )}

          <SettingCard
            icon={<Globe className="h-5 w-5" />}
            title="Default language"
            description="The language used for voicemail prompts and IVR menus when nothing more specific is set."
            status="active"
            note="Active. Used when you record a new greeting — it opens in this language. Greetings and menus you already have keep the language they were made in."
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
                <p className="text-xs text-[#9A948F]">
                  New greetings you record will open in this language.
                </p>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            icon={<Flag className="h-5 w-5" />}
            title="Default country"
            description="The country your number search opens on."
            status="active"
            note="Active. When you buy a number, the country box starts here. You can still choose a different country for any purchase."
          >
            <CustomSelect
              label="Default country"
              options={COUNTRY_OPTIONS}
              value={selectedOption(COUNTRY_OPTIONS, form.default_country)}
              placeholder="No default chosen"
              handleChange={(option: any) => updateForm({ default_country: option?.value || '' })}
            />
          </SettingCard>

          <SettingCard
            icon={<Headphones className="h-5 w-5" />}
            title="Who may listen to call recordings"
            description="Whether people can play their own calls back, and whether admins can play anyone's."
            status="active"
            note="Active. The server leaves the recording out of the call log for anyone the rule excludes, so there is nothing for them to play, and playing any recording needs a signed-in account with the listen permission."
          >
            <SettingRow
              label="People can play their own calls"
              description="Off means nobody can listen back to their own recorded calls."
              control={
                <Switch
                  checked={form.recording_access_own}
                  onCheckedChange={(checked) => updateForm({ recording_access_own: checked })}
                />
              }
            />
            <SettingRow
              label="Admins can play anyone's calls"
              description="Off means an admin sees only their own recordings. Please tell your team before changing this — listening to someone's calls is something they expect to know about."
              control={
                <Switch
                  checked={form.recording_access_admins_all}
                  onCheckedChange={(checked) =>
                    updateForm({ recording_access_admins_all: checked })
                  }
                />
              }
            />
          </SettingCard>

          <SettingCard
            icon={<Voicemail className="h-5 w-5" />}
            title="Voicemail policy"
            description="PIN strength and how long a caller may talk."
            status="active"
            note="Active. A new or changed voicemail PIN shorter than the rule is refused wherever it is set, admins included; a PIN set before the rule keeps working until it is changed. The phone system stops a caller's message at the limit on every way into voicemail: a person's mailbox, a number pointed at voicemail, and a queue that gives up. Voicemail transcription is not set here — it follows Phone rules › Transcription."
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
                <p className="text-xs text-[#9A948F]">
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
                <p className="text-xs text-[#9A948F]">
                  Between {MESSAGE_MIN_MINUTES} and {MESSAGE_MAX_MINUTES} minutes. Longer messages
                  cost more storage and are rarely listened to in full.
                </p>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            icon={<Mic className="h-5 w-5" />}
            title="Call recording notice"
            description="Whether callers are told a call is recorded, and what they hear. Whether calls are recorded at all is a Phone rule."
            status="active"
            note="Active. The notice plays at the start of every recorded call — before an incoming call connects, and as soon as an outgoing call is answered. Off means no notice plays. Make the audio from your wording and callers hear that; otherwise they hear the stock notice."
          >
            {/* Read-only on purpose. There used to be a "Recording mode" box here
                that the switch never read, next to the Phone rule it does read -
                two answers to one question. One source of truth: the Phone rule. */}
            <div className="mb-3 rounded-lg border border-[rgba(225,200,165,0.9)] bg-[#FBE2C8]/40 p-3">
              <p className="text-xs font-semibold text-[#2E2D35]">What is recorded today</p>
              <p className="mt-0.5 text-xs text-[#2E2D35]">{recordingRule}</p>
              <p className="mt-1 text-xs text-[#9A948F]">
                Change this under{' '}
                <Link
                  to={`${COMPANY_ROOT}/phone-rules`}
                  className="font-semibold text-ucass-active underline-offset-2 hover:underline"
                >
                  Phone rules › Call recording
                </Link>
                . The phone system records from that rule; this card only controls the notice.
              </p>
            </div>
            <SettingRow
              label="Announce recording to callers"
              description="Play a short notice before a recorded call starts. Many countries require it, so check your local rules before turning it off."
              control={
                <Switch
                  checked={form.recording_announcement}
                  onCheckedChange={(checked) => updateForm({ recording_announcement: checked })}
                />
              }
            />

            {/* Compliance guidance rejects wording that mentions recording but not that a
                third party may be doing it — "this call may be recorded for
                quality purposes" is their own example of a FAILING announcement.
                The check runs as you type so the wording is fixed here rather
                than coming back as a compliance problem later. */}
            {form.recording_announcement && (
              <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-[#2E2D35]">Announcement wording</p>
                  <p className="text-xs text-[#9A948F]">
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
                  className="w-full rounded-lg border border-[rgba(225,200,165,0.9)] p-2 text-sm text-[#2E2D35] focus:border-primary focus:outline-none"
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

                {/* The wording only reaches a caller as audio. The switch plays the
                    file named here; wording without a file plays the stock notice. */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-2">
                  <p className="text-xs text-gray-700">
                    {!form.recording_announcement_text.trim() ? (
                      'No wording: callers hear the stock notice.'
                    ) : announcementAudioCurrent(form) ? (
                      <>
                        <span className="font-semibold text-green-700">Audio ready.</span> Callers
                        hear this wording ({form.recording_announcement_file}).
                      </>
                    ) : form.recording_announcement_file ? (
                      <>
                        <span className="font-semibold text-amber-700">Wording changed.</span> The
                        audio on file says the old wording; make it again, or callers get the stock
                        notice after you save.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-amber-700">No audio yet.</span> Callers
                        hear the stock notice until you make the audio from this wording.
                      </>
                    )}
                  </p>
                  {form.recording_announcement_text.trim() && !announcementAudioCurrent(form) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={makingAudio || isSaving}
                      onClick={handleMakeAudio}
                    >
                      {makingAudio ? 'Making the audio…' : 'Make the audio'}
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-semibold text-[#9A948F]">Wording you can use</p>
                  {COMPLIANT_RECORDING_ANNOUNCEMENTS.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      onClick={() => updateForm({ recording_announcement_text: example.text })}
                      className="cursor-pointer rounded-md border border-[rgba(225,200,165,0.9)] p-2 text-left text-xs text-gray-700 hover:border-primary hover:bg-ucass-primary-200/30"
                    >
                      {example.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SettingCard>

          <SettingCard
            icon={<Archive className="h-5 w-5" />}
            title="Data retention"
            description="How long call recordings and voicemail messages are kept before deletion."
            status="active"
            note="Active. A sweep runs on the server every night (03:40 UTC) and removes recordings and messages older than the limit — the audio and any transcript go, the call stays in the log without them. Until your server's sweep is switched to live mode it only reports what it would remove. Nothing is removed while a legal hold is set."
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
          </SettingCard>

          <SettingCard
            icon={<PhoneOutgoing className="h-5 w-5" />}
            title="International calling"
            description="Whether a newly created user may dial abroad before an admin says otherwise."
            status="active"
            note="Active. The server gives every newly added person this setting, whichever screen adds them, unless the admin chose for that person on the add form. It does not change anyone already added."
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
                <p className="text-xs text-[#9A948F]">
                  Applies to users created after you save. It is a starting point per user, so an
                  admin can still allow or block any individual later.
                </p>
              </div>
            </div>
          </SettingCard>

          <div className="cs-savebar">
            <p className="text-xs text-[#9A948F]">
              Saved for your whole company. Your other settings are not affected.
            </p>
            <SectionActions>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="cs-save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save settings'}
              </Button>
            </SectionActions>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyPolicies;
