/* Office rules: the middle level in company -> office -> person.
 *
 * The backend stores and versions each section independently. This screen keeps
 * that boundary intact: Save only sends sections that materially changed, so
 * editing opening hours cannot overwrite recording and two administrators can
 * safely work on different rules at the same time.
 */

import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Clock,
  History,
  LockKeyhole,
  Mic,
  PhoneOutgoing,
  ScrollText,
  ShieldCheck,
  Voicemail,
} from 'lucide-react';

import BussinessHoursModal from '@/components/custom/bussiness-hours-dialog';
import Loader from '@/components/custom/loader';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import AutomaticCallRecordingModal from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/settings/automatic-call-recording';
import DisplayNumberModal from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/settings/display-number-dialog';
import { settingsInitialState } from '@/pages/admin-settings/templates/user-settings/add-edit-user-settings/constants';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';
import {
  readRuleFlags,
  writeRuleFlags,
  type PolicyField,
  type RuleFlags,
} from '@/lib/company-rule-flags';
import { describeRecording } from '@/lib/recording-description';
import { describeWeeklyHours, readWeeklyHours } from '@/lib/location-hours';
import { handleAlert } from '@/lib/utils';
import {
  OFFICE_POLICY_SECTIONS,
  canonicalOfficePolicyJson,
  describeOfficePolicyError,
  isOfficePolicyConflict,
  listOfficePolicies,
  saveOfficePolicy,
  type OfficePolicyRows,
  type OfficePolicySection,
} from '@/lib/site-policy-api';
import { siteList } from '@/services/api';

const SECTION_FIELD: Record<OfficePolicySection, PolicyField> = {
  voicemail_pin: 'voicemail',
  recording: 'recording',
  transcription: 'transcription',
  ai_call_monitoring: 'ai_call_monitoring',
  display_number: 'display_number',
  operational_hours: 'business_hours',
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));

const asRuleNode = (value: any): Record<string, any> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return clone(value);
  if (typeof value === 'boolean') return { enabled: value };
  return {};
};

/* A new office starts by displaying the company value as a convenient draft,
   but with both policy flags off. Merely opening this page therefore creates no
   office rule and changes nobody. */
const buildDraft = (
  companySettings: Record<string, any>,
  rows: OfficePolicyRows,
): Record<string, any> => {
  const next: Record<string, any> = clone(settingsInitialState);

  OFFICE_POLICY_SECTIONS.forEach((section) => {
    const saved = rows[section]?.settings;
    const inherited = companySettings?.[section];
    const fallback = (settingsInitialState as any)?.[section];
    let node = asRuleNode(saved ?? inherited ?? fallback);

    /* An office governs voicemail-to-text, never a person's secret PIN or
       shared-mailbox recipients. Company defaults contain those keys, so
       remove them before they can enter an office draft or save payload. */
    if (section === 'voicemail_pin') {
      const { value: _pin, users: _users, ...officeVoicemail } = node;
      node = officeVoicemail;
    }

    /* The location record owns the timezone. An office-hours rule owns the
       schedule only; copying company regional data here would create a second,
       conflicting owner for the same location clock. */
    if (section === 'operational_hours') {
      const { regional: _regional, ...hours } = node;
      node = hours;
    }

    if (!rows[section]) {
      node = { ...node, apply: false, locked: false, override: false };
    }
    next[section] = node;
  });

  return next;
};

const sectionValue = (settings: Record<string, any>, section: OfficePolicySection): any => {
  const node = clone(settings?.[section] || {});
  if (section === 'voicemail_pin') {
    const { value: _pin, users: _users, ...officeVoicemail } = node;
    return officeVoicemail;
  }
  if (section !== 'operational_hours') return node;
  const { regional: _regional, ...hours } = node;
  return hours;
};

const formatUpdated = (value?: string | null): string => {
  if (!value) return 'Not saved yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Saved' : date.toLocaleString();
};

const displayNumberSummary = (value: any): string => {
  const type = value?.masking?.type?.value;
  if (!type || type === 'N') return 'No caller-ID change';
  return `${value?.masking?.type?.label || 'Caller ID rule'}${
    value?.masking?.value ? ` · ${value.masking.value}` : ''
  }`;
};

const OfficePolicy = () => {
  const { locationId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hoursOpen, setHoursOpen] = useState(false);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>('');

  const form = useForm<any>({
    defaultValues: {
      basic: { site: { value: locationId } },
      settings: clone(settingsInitialState),
    },
  });
  const {
    watch,
    setValue,
    reset,
    formState: { isDirty },
  } = form;
  const settings = watch('settings') || {};

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['siteList'],
    queryFn: () => siteList({ page: 1, limit: 1000 }),
    select: (response: any) => response?.data?.data?.result?.rows || [],
  });
  const site = useMemo(
    () => sites.find((candidate: any) => `${candidate?.uuid || ''}` === locationId),
    [sites, locationId],
  );

  const {
    data: companyDefaults = null,
    isLoading: companyLoading,
    isError: companyError,
  } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });

  const {
    data: rows = {},
    isLoading: policiesLoading,
    isError: policiesError,
  } = useQuery<OfficePolicyRows>({
    queryKey: ['officePolicies', locationId],
    queryFn: () => listOfficePolicies(locationId),
    enabled: Boolean(locationId),
  });

  useEffect(() => {
    if (companyLoading || policiesLoading) return;
    reset({
      basic: { site: { value: locationId } },
      settings: buildDraft(companyDefaults?.settings || {}, rows),
    });
  }, [companyDefaults, companyLoading, locationId, policiesLoading, reset, rows]);

  const writeFlags = (section: OfficePolicySection, change: Partial<RuleFlags>) => {
    const field = SECTION_FIELD[section];
    const current = readRuleFlags(settings, field);
    const next = writeRuleFlags(settings, field, {
      apply: current.apply,
      locked: current.locked,
      ...change,
    });
    setValue('settings', next, { shouldDirty: true });
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async () => {
      let savedCount = 0;
      let skippedCount = 0;

      for (const section of OFFICE_POLICY_SECTIONS) {
        const field = SECTION_FIELD[section];
        const flags = readRuleFlags(settings, field);
        const current = rows[section];
        const next = sectionValue(settings, section);

        /* An untouched draft borrowed from the company is not an office rule.
           It becomes one only after an admin applies or locks it. */
        if (!current && !flags.apply && !flags.locked) {
          skippedCount += 1;
          continue;
        }
        if (
          current &&
          canonicalOfficePolicyJson(current.settings) === canonicalOfficePolicyJson(next)
        ) {
          skippedCount += 1;
          continue;
        }

        try {
          await saveOfficePolicy({
            siteUuid: locationId,
            section,
            settings: next,
            version: current?.version || 0,
          });
          savedCount += 1;
        } catch (error: any) {
          error.officePolicySavedCount = savedCount;
          throw error;
        }
      }

      return { savedCount, skippedCount };
    },
    onSuccess: async ({ savedCount }) => {
      await queryClient.invalidateQueries({ queryKey: ['officePolicies', locationId] });
      handleAlert({
        text: savedCount
          ? `${savedCount} office ${savedCount === 1 ? 'rule' : 'rules'} saved and versioned.`
          : 'Nothing has changed.',
        type: 'success',
      });
    },
    onError: async (error: any) => {
      await queryClient.invalidateQueries({ queryKey: ['officePolicies', locationId] });
      const alreadySaved = Number(error?.officePolicySavedCount || 0);
      const prefix = alreadySaved
        ? `${alreadySaved} ${alreadySaved === 1 ? 'rule was' : 'rules were'} saved before the problem. `
        : '';
      handleAlert({
        text: isOfficePolicyConflict(error)
          ? `${prefix}Someone else changed this office rule. The latest version has been reloaded; review it and save again.`
          : `${prefix}${describeOfficePolicyError(error)}`,
        type: 'error',
      });
    },
  });

  const ruleRows = (section: OfficePolicySection, what: string) => {
    const field = SECTION_FIELD[section];
    const office = readRuleFlags(settings, field);
    const company = readRuleFlags(companyDefaults?.settings, field);
    const companyWins = company.locked;

    return (
      <>
        {companyWins ? (
          <div className="mx-4 mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-gray-700">
            <span className="font-semibold text-gray-900">Company rule wins.</span> The company has
            locked this setting, so this office keeps its saved rule for audit purposes but cannot
            override it.
          </div>
        ) : null}
        <SettingRow
          label="Apply the office value"
          description={`On, people at this office receive this ${what}. Off, the next level in the hierarchy decides.`}
          control={
            <Switch
              checked={office.apply}
              disabled={companyWins || saving}
              onCheckedChange={(checked) => writeFlags(section, { apply: checked })}
            />
          }
        />
        <SettingRow
          label="Lock personal changes"
          description={`On, people at this office cannot change their own ${what}. A company lock always outranks this one.`}
          control={
            <Switch
              checked={office.locked}
              disabled={companyWins || saving}
              onCheckedChange={(checked) => writeFlags(section, { locked: checked })}
            />
          }
        />
      </>
    );
  };

  const sectionMeta = (section: OfficePolicySection) => {
    const row = rows[section];
    const office = readRuleFlags(settings, SECTION_FIELD[section]);
    const company = readRuleFlags(companyDefaults?.settings, SECTION_FIELD[section]);
    const source = company.locked
      ? 'Company locked'
      : office.apply
        ? 'Office value applies'
        : office.locked
          ? 'Personal value frozen'
          : 'No office override';

    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
        <span className="rounded-sm bg-gray-100 px-2 py-1 font-semibold text-gray-700">{source}</span>
        <span>v{row?.version || 0}</span>
        <span>·</span>
        <span>{formatUpdated(row?.updated_at)}</span>
        {row?.updated_by_name ? (
          <>
            <span>·</span>
            <span>by {row.updated_by_name}</span>
          </>
        ) : null}
      </div>
    );
  };

  if (sitesLoading || companyLoading || policiesLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <Loader />
      </div>
    );
  }

  if (!site) {
    return (
      <AdminPage
        section="Company"
        title="Office rules"
        description="The requested location could not be found in your company."
      >
        <div className="p-6 text-center">
          <Button type="button" variant="outline" onClick={() => navigate('/admin-settings/company')}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to locations
          </Button>
        </div>
      </AdminPage>
    );
  }

  const companySettings = companyDefaults?.settings || {};
  const companyLocked = (section: OfficePolicySection) =>
    readRuleFlags(companySettings, SECTION_FIELD[section]).locked;

  return (
    <AdminPage
      section="Company"
      title={`Office rules · ${site?.name || 'Location'}`}
      description="The middle layer between company defaults and each person's own settings."
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin-settings/company')}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Locations
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={saving || !isDirty || policiesError || companyError}
            onClick={() => save()}
          >
            {saving ? 'Saving…' : 'Save office rules'}
          </Button>
        </div>
      }
    >
      <FormProvider {...form}>
        <form
          id="office-policy-form"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {policiesError || companyError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              The current hierarchy could not be loaded completely. Saving is disabled so an
              unseen rule cannot be overwritten.
            </div>
          ) : null}

          <SettingCard
            title="How the hierarchy works"
            description="There is one owner at each level and one resolver decides which value wins."
            icon={<Building2 className="h-4 w-4" />}
            note="Company first, then office, then person. A lock stops the levels below it. Every office section has its own version and audit history."
          >
            <SettingRow
              label="Precedence"
              description="A company lock always wins. Otherwise an applied office value wins over a person's value. If this office has no rule, the person keeps their own setting."
              control={
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  Company <span className="text-gray-400">→</span> Office{' '}
                  <span className="text-gray-400">→</span> Person
                </span>
              }
            />
            <SettingRow
              label="Location clock"
              description="The location record remains the single owner of timezone; the office policy below controls only its opening schedule."
              control={<span className="text-xs font-medium text-gray-700">{site?.timezone || 'Not set'}</span>}
            />
          </SettingCard>

          <SettingCard
            title="Opening hours"
            description="The schedule used for people assigned to this office. The location timezone above is not duplicated here."
            icon={<Clock className="h-4 w-4" />}
            aside={
              <Button
                type="button"
                variant="outline"
                disabled={companyLocked('operational_hours') || saving}
                onClick={() => setHoursOpen(true)}
              >
                Change schedule
              </Button>
            }
            note={sectionMeta('operational_hours')}
          >
            <SettingRow
              label="Office schedule"
              description={
                hoursError || describeWeeklyHours(readWeeklyHours(settings?.operational_hours))
              }
            />
            {ruleRows('operational_hours', 'opening-hours schedule')}
          </SettingCard>

          <SettingCard
            title="Call recording"
            description="Whether calls are recorded automatically or may be recorded on demand for this office."
            icon={<Mic className="h-4 w-4" />}
            aside={
              <Button
                type="button"
                variant="outline"
                disabled={companyLocked('recording') || saving}
                onClick={() => setRecordingOpen(true)}
              >
                Change recording
              </Button>
            }
            note={sectionMeta('recording')}
          >
            <SettingRow
              label="Recording mode"
              description={describeRecording({
                automaticEnabled: settings?.recording?.automatic?.enabled,
                onDemandEnabled: settings?.recording?.on_demand?.enabled,
                direction: settings?.recording?.automatic?.value,
              })}
            />
            {ruleRows('recording', 'recording setting')}
          </SettingCard>

          <SettingCard
            title="Voicemail to text"
            description="Whether voicemail messages for people at this office are also written out as text."
            icon={<Voicemail className="h-4 w-4" />}
            note={sectionMeta('voicemail_pin')}
          >
            <SettingRow
              label="Write voicemail as text"
              description="This office rule does not set or expose anybody's voicemail PIN."
              control={
                <Switch
                  checked={settings?.voicemail_pin?.voicemail_to_text === 'YES'}
                  disabled={companyLocked('voicemail_pin') || saving}
                  onCheckedChange={(checked) =>
                    setValue(
                      'settings.voicemail_pin.voicemail_to_text',
                      checked ? 'YES' : 'NO',
                      { shouldDirty: true },
                    )
                  }
                />
              }
            />
            {ruleRows('voicemail_pin', 'voicemail-to-text setting')}
          </SettingCard>

          <SettingCard
            title="Call transcription"
            description="Write recorded calls out as searchable text for this office."
            icon={<ScrollText className="h-4 w-4" />}
            note={sectionMeta('transcription')}
          >
            <SettingRow
              label="Transcribe recorded calls"
              description="Turning this off also turns off AI call monitoring in this office draft."
              control={
                <Switch
                  checked={Boolean(settings?.transcription?.enabled)}
                  disabled={companyLocked('transcription') || saving}
                  onCheckedChange={(checked) => {
                    setValue('settings.transcription.enabled', checked, { shouldDirty: true });
                    if (!checked) {
                      setValue('settings.ai_call_monitoring.enabled', false, { shouldDirty: true });
                    }
                  }}
                />
              }
            />
            {ruleRows('transcription', 'transcription setting')}
          </SettingCard>

          <SettingCard
            title="AI call monitoring"
            description="Create recaps and sentiment from transcribed calls for this office."
            icon={<ShieldCheck className="h-4 w-4" />}
            note={sectionMeta('ai_call_monitoring')}
          >
            <SettingRow
              label="Monitor transcribed calls"
              description="Requires transcription at the effective level."
              control={
                <Switch
                  checked={Boolean(settings?.ai_call_monitoring?.enabled)}
                  disabled={
                    companyLocked('ai_call_monitoring') ||
                    !settings?.transcription?.enabled ||
                    saving
                  }
                  onCheckedChange={(checked) =>
                    setValue('settings.ai_call_monitoring.enabled', checked, {
                      shouldDirty: true,
                    })
                  }
                />
              }
            />
            {ruleRows('ai_call_monitoring', 'call-monitoring setting')}
          </SettingCard>

          <SettingCard
            title="Displayed number"
            description="What people at this office show or transform on calls."
            icon={<PhoneOutgoing className="h-4 w-4" />}
            aside={
              <Button
                type="button"
                variant="outline"
                disabled={companyLocked('display_number') || saving}
                onClick={() => setDisplayOpen(true)}
              >
                Change number rule
              </Button>
            }
            note={sectionMeta('display_number')}
          >
            <SettingRow
              label="Caller-ID rule"
              description={displayNumberSummary(settings?.display_number)}
            />
            {ruleRows('display_number', 'displayed-number setting')}
          </SettingCard>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <History className="mt-0.5 h-4 w-4 text-gray-400" />
              <span>
                Every material save creates an immutable history record and an office-policy event.
                Unchanged sections are skipped.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-gray-400" />
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !isDirty || policiesError || companyError}
              >
                {saving ? 'Saving…' : 'Save office rules'}
              </Button>
            </div>
          </div>

          {hoursOpen ? (
            <BussinessHoursModal
              modalState={hoursOpen}
              setModalState={setHoursOpen}
              setError={setHoursError}
              data={{ settings }}
            />
          ) : null}
          {recordingOpen ? (
            <AutomaticCallRecordingModal
              modalState={recordingOpen}
              setModalState={setRecordingOpen}
            />
          ) : null}
          {displayOpen ? (
            <DisplayNumberModal
              modalState={displayOpen}
              setModalState={setDisplayOpen}
              data={{ settings }}
            />
          ) : null}
        </form>
      </FormProvider>
    </AdminPage>
  );
};

export default OfficePolicy;
