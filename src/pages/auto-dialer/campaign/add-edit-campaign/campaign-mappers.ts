import { toIso2 } from '@/lib/company-default-country';
import { effectiveCampaignCountry, hoursCountryOf } from '@/lib/campaign-country';
import moment from 'moment';
import { storedDay } from '@/lib/campaign-dates';
import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/constants/forwarding-consts';
import { CAMPAIGN_SETTINGS_CONST } from '@/constants/common-const';
import { DEFAULT_RETRY_PERIOD_TYPE, DIALER_TYPE } from './consts';
import { currentBusinessHoursRule, findDidRow } from '../inbound-routing';
import { readRouting } from '@/hooks/use-queue-skills';
import { legacyFromRows, normaliseRows } from '@/lib/queue-requirements';

type Option = { label: string; value: string };
type CampaignMember = {
  user_uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  extension: string;
  role: string;
  domain: string;
  label?: string;
  value?: string;
  uuid?: string;
};

const toBoolean = (value: any, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') return value === 1;
  return fallback;
};

const normalizeAnsweringMachineValue = (answeringMachine: any) => {
  const rawValue = answeringMachine?.value;
  if (rawValue && typeof rawValue === 'object') {
    return {
      value: rawValue?.value || '',
      label: rawValue?.label || answeringMachine?.label || '',
    };
  }

  return {
    value: rawValue || '',
    label: answeringMachine?.label || '',
  };
};

const splitNameFromLabel = (label?: string) => {
  const cleanLabel = String(label || '').trim();
  if (!cleanLabel) return { first_name: '', last_name: '' };
  const parts = cleanLabel.split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
  };
};

const normalizeMemberForPayload = (member: any, fallbackDomain = ''): CampaignMember => {
  const fallbackNames = splitNameFromLabel(member?.label);
  const first_name = String(member?.first_name ?? fallbackNames.first_name ?? '').trim();
  const last_name = String(member?.last_name ?? fallbackNames.last_name ?? '').trim();
  const extension = String(member?.extension ?? member?.value ?? '').trim();

  return {
    user_uuid: String(member?.user_uuid ?? member?.uuid ?? '').trim(),
    first_name,
    last_name,
    email: String(member?.email ?? '').trim(),
    extension,
    role: String(member?.role ?? '').trim(),
    domain: String(member?.domain ?? fallbackDomain ?? '').trim(),
  };
};

const normalizeMemberForForm = (member: any) => {
  const normalizedMember = normalizeMemberForPayload(member);
  const label =
    String(member?.label || '').trim() ||
    `${normalizedMember.first_name}${normalizedMember.last_name ? ` ${normalizedMember.last_name}` : ''}`.trim();
  const value = String(member?.value ?? normalizedMember.extension ?? '').trim();

  return {
    ...member,
    ...normalizedMember,
    uuid: member?.uuid || normalizedMember.user_uuid,
    label,
    value,
  };
};

/* The team's skill requirement, written the way the call-queue form writes
   it: the rows, plus the flat required_skills / min_stars / evaluation beside
   them for a picker that has not learnt rows yet. Read through readRouting so
   whatever else lives in settings.routing (priority) survives a save, and the
   campaign's own queue mirrors the campaign exactly. */
const buildRoutingPayload = (formRouting: any, existingRouting: any = null) => {
  const routing = readRouting({ ...(existingRouting || {}), ...(formRouting || {}) });
  const rows = normaliseRows(routing.requirements);
  const legacy = legacyFromRows(rows);
  return {
    ...routing,
    requirements: rows,
    order: routing.order,
    required_skills: legacy.required_skills,
    min_stars: legacy.min_stars,
    evaluation: legacy.evaluation,
  };
};

const buildSettingsPayload = (
  formValues: any,
  inventoryNumberList: any[] = [],
  existingInbound: any = null,
  existingRouting: any = null,
) => {
  const {
    display_number: { masking = {}, incoming = {}, show_number_if_blocked = 'NO' } = {},
    operational_hours = {},
    recording = {},
    ai_call_monitoring = {},
    transcription = {},
  } = formValues?.settings || {};
  const { hold = {}, welcome = {}, no_agent_available = {} } = formValues?.greetings || {};
  const inbound = formValues?.inbound || {};
  const automaticRecordingEnabled = toBoolean(recording?.automatic?.enabled, false);
  /* The number's rule today, kept so it can be put back after the campaign.
     Only recorded the first time the switch is turned on. */
  const firstNumber = (formValues?.callerId || [])[0];
  const didRow = findDidRow(inventoryNumberList, firstNumber?.value || firstNumber);
  const previousRule = existingInbound?.previous_business_hours ?? currentBusinessHoursRule(didRow);

  return {
    recording: {
      on_demand: {
        enabled: false,
        recording_on:
          recording?.on_demand?.recording_on || 'ad98d65d-fcf8-4d4d-bc77-ee1426c34331.mp3',
        recording_Off:
          recording?.on_demand?.recording_Off || 'ad98d65d-fcf8-4d4d-bc77-ee1426c34332.mp3',
      },
      automatic: {
        enabled: automaticRecordingEnabled,
        value: 'all',
        label: 'All',
        recording_on:
          recording?.automatic?.recording_on || 'ad98d65d-fcf8-4d4d-bc77-ee1426c34333.mp3',
      },
    },
    ai_call_monitoring: toBoolean(
      typeof ai_call_monitoring === 'boolean' ? ai_call_monitoring : ai_call_monitoring?.enabled,
    ),
    transcription: toBoolean(
      typeof transcription === 'boolean' ? transcription : transcription?.enabled,
    ),
    display_number: {
      incoming,
      masking: {
        type: masking?.type?.value || masking?.type || '',
        label: masking?.type?.label || masking?.label || '',
        value: masking?.value,
      },
      show_number_if_blocked,
    },
    operational_hours: {
      value: operational_hours?.value || CUSTOM_HOURS_SCHEDULE_OPTIONS,
      holidays: operational_hours?.holidays?.length ? operational_hours.holidays : [],
      regional: {
        override: operational_hours?.regional?.override ?? false,
        country: operational_hours?.regional?.country,
        timezone: operational_hours?.regional?.timezone,
        time_format: operational_hours?.regional?.time_format,
        country_code: operational_hours?.regional?.country_code,
      },
      /* Read by the switch for the campaign's queue: where callers go when
         the team is closed. Same shape a call queue uses. */
      closed_hour_action:
        inbound?.closed?.type === 'VOICEMAIL' && inbound?.closed?.value
          ? { enabled: true, type: 'VOICEMAIL', value: String(inbound.closed.value), label: inbound?.closed?.label || '' }
          : { enabled: false, type: '', value: '', label: '' },
    },
    /* The queue's ring order, same shape the call-queue form stores. */
    ring_strategy: {
      label: inbound?.ring_strategy?.label || 'Ring All',
      value: inbound?.ring_strategy?.value || 'ring-all',
    },
    media: {
      welcome: {
        enabled: toBoolean(welcome?.enabled, false),
        value: welcome?.value?.value || '',
        label: welcome?.value?.label || '',
      },
      hold: {
        enabled: toBoolean(hold?.enabled, false),
        value: hold?.value?.value || '',
        label: hold?.value?.label || '',
      },
      no_agent_available: {
        enabled: toBoolean(no_agent_available?.enabled, false),
        value: no_agent_available?.value?.value || '',
        label: no_agent_available?.value?.label || '',
      },
    },
    inbound: {
      route_number: toBoolean(inbound?.route_number, false),
      did_number: didRow?.did_number || (firstNumber?.value || firstNumber || ''),
      did_uuid: didRow?.uuid || existingInbound?.did_uuid || '',
      previous_business_hours: previousRule || null,
    },
    /* Who can take these calls. The form keeps it at the top level as
       `routing`; a campaign saved before the Team tab had rows still carries
       it under settings, which is the fallback. */
    routing: buildRoutingPayload(formValues?.routing ?? formValues?.settings?.routing, existingRouting),
  };
};

const buildDialerSettingsPayload = (dialerSetting: any) => {
  const answeringMachine = dialerSetting?.answering_detection_machine || {};
  const autoAnswering = dialerSetting?.auto_answering || {};
  const normalizedMachine = normalizeAnsweringMachineValue(answeringMachine);
  const retryPeriodType = dialerSetting?.default_retry_period_type;

  return {
    preview_time: dialerSetting?.preview_time,
    preview_timeout_action: dialerSetting?.preview_timeout_action || 'RETURN_TO_POOL',
    ringing_agent_time: dialerSetting?.ringing_agent_time,
    wrapup_time: dialerSetting?.wrapup_time,
    wrapup_mode:
      typeof dialerSetting?.wrapup_mode === 'string'
        ? dialerSetting.wrapup_mode
        : dialerSetting?.wrapup_mode?.value || 'MANDATORY_TIMEOUT',
    /* Seconds between wrap-up ending and the next lead. Sent only when the
       form holds a number: the server stores nothing otherwise, and the
       dialer then reads the company default (src/lib/campaign-timers.ts). */
    ...(Number.isFinite(Number(dialerSetting?.wait_after_call)) &&
    dialerSetting?.wait_after_call !== '' &&
    dialerSetting?.wait_after_call !== null
      ? { wait_after_call: Number(dialerSetting.wait_after_call) }
      : {}),
    max_ring_time: dialerSetting?.max_ring_time,
    max_attempt_per_record: dialerSetting?.max_attempt_per_record,
    default_retry_period: dialerSetting?.default_retry_period,
    default_retry_period_type:
      typeof retryPeriodType === 'string' ? retryPeriodType : retryPeriodType?.value,
    /* Row N is the wait after attempt N, and the dialer reads the ladder by
       position. A blank row used to be dropped on the way out, which moved
       every row below it up one place: a wait meant for the second attempt was
       applied after the first, and nothing on screen said so. A blank row now
       carries the campaign's own default period — which is exactly what a
       missing row falls back to anyway — so the positions stay put. Trailing
       blanks are still dropped, because they mean nothing is set past there. */
    retry_ladder: (() => {
      const rows = Array.isArray(dialerSetting?.retry_ladder)
        ? [...dialerSetting.retry_ladder]
        : [];
      const isSet = (step: any) => Number.isFinite(Number(step?.period)) && Number(step?.period) > 0;
      while (rows.length && !isSet(rows[rows.length - 1])) rows.pop();
      const fallbackPeriod = Number(dialerSetting?.default_retry_period) || 3;
      const fallbackUnit =
        (typeof retryPeriodType === 'string' ? retryPeriodType : retryPeriodType?.value) || 'min';
      return rows.map((step: any) =>
        isSet(step)
          ? {
              period: Number(step.period),
              unit: typeof step?.unit === 'string' ? step.unit : step?.unit?.value || 'min',
            }
          : { period: fallbackPeriod, unit: fallbackUnit },
      );
    })(),
    min_agents_for_predictive: Math.min(50, Math.max(1, Number(dialerSetting?.min_agents_for_predictive) || 5)),
    dial_ahead: dialerSetting?.dial_ahead === undefined ? true : Boolean(dialerSetting?.dial_ahead),
    retry_by_outcome: (() => {
      const cleaned: Record<string, { period: number; unit: string }> = {};
      for (const [outcome, rule] of Object.entries<any>(dialerSetting?.retry_by_outcome || {})) {
        const period = Number(rule?.period);
        if (!Number.isFinite(period) || period <= 0) continue;
        cleaned[outcome] = { period, unit: typeof rule?.unit === 'string' ? rule.unit : rule?.unit?.value || 'min' };
      }
      return cleaned;
    })(),
    /* Pacing for the server-side dialer. Progressive only reads the line
       ceiling; predictive reads all four. Preview ignores them. */
    max_lines: Number(dialerSetting?.max_lines ?? 0) || 0,
    max_calls_per_agent: Number(dialerSetting?.max_calls_per_agent ?? 3) || 3,
    target_abandon_rate: Number(dialerSetting?.target_abandon_rate ?? 3) || 3,
    compliance_abandon_seconds: Number(dialerSetting?.compliance_abandon_seconds ?? 2) || 0,
    answering_detection_machine: {
      /* The switch was never sent. The UI writes to `enabled`, the read-back at
         line ~321 looks for `enabled ?? enable`, and this builder omitted both —
         so answering machine detection resolved to false on every save and could
         not be turned on at all. Zero of the twelve live campaigns carry the key.
         Written as `enabled` to match the read-back and the backend's Joi schema;
         `enable` is also sent because the sibling `auto_answering` block uses that
         spelling and it is not knowable from here which one the dialer reads. */
      enabled: toBoolean(answeringMachine?.enabled ?? answeringMachine?.enable, false),
      enable: toBoolean(answeringMachine?.enabled ?? answeringMachine?.enable, false),
      type: answeringMachine?.type || 'HANGUP',
      value: normalizedMachine.value,
      label: normalizedMachine.label,
    },
    auto_answering: {
      enable: toBoolean(autoAnswering?.enabled ?? autoAnswering?.enable, false),
      /* The input hands back a string; the backend wants a whole number. */
      timeout: Number(autoAnswering?.timeout) || 2,
    },
  };
};

const buildAgentDispositionPayload = (agentDisposition: any[] = []) => {
  return agentDisposition
    .filter((item) => item?._id)
    .map((item) => ({
      _id: item?._id,
      disposition: {
        name: item?.disposition?.name || '',
      },
    }));
};

export const buildCampaignUpsertPayload = ({
  formValues,
  dialMethod,
  campaignStatus,
  selectedCampaignId,
  fallbackDomain = '',
  inventoryNumberList = [],
  existingSettings = null,
}: {
  formValues: any;
  dialMethod?: string;
  campaignStatus: string;
  selectedCampaignId?: string;
  fallbackDomain?: string;
  inventoryNumberList?: any[];
  existingSettings?: any;
}) => {
  const scriptValue = formValues?.script;
  const normalizedMembers = (formValues?.members || []).map((member: any) =>
    normalizeMemberForPayload(member, fallbackDomain),
  );
  const uniqueMemberMap = new Map<string, CampaignMember>();
  normalizedMembers.forEach((member: CampaignMember) => {
    const key = member?.user_uuid || member?.extension;
    if (!key) return;
    uniqueMemberMap.set(key, member);
  });
  const uniqueMembers = Array.from(uniqueMemberMap.values());

  const settingsPayload = buildSettingsPayload(
    formValues,
    inventoryNumberList,
    existingSettings?.inbound || null,
    existingSettings?.routing || null,
  );
  const timezone = formValues?.settings?.operational_hours?.regional?.timezone?.value || '';

  return {
    campaignStatus,
    name: formValues?.name || '',
    siteId: formValues?.siteId?.value || '',
    description: formValues?.description || '',
    startDate: formValues?.startDate ? moment(formValues.startDate).format('YYYY-MM-DD') : '',
    endDate: formValues?.endDate ? moment(formValues.endDate).format('YYYY-MM-DD') : '',
    callerId: (formValues?.callerId || []).map((item: Option) => item?.value),
    rotateCallerId: Boolean(formValues?.rotateCallerId) && (formValues?.callerId || []).length > 1,
    require_consent: Boolean(formValues?.require_consent),
    groupId: dialMethod === DIALER_TYPE.INBOUND ? [] : (formValues?.groupId || []).map((item: Option) => item?.value),
    dialerSetting: buildDialerSettingsPayload(formValues?.dialerSetting || {}),
    agentDisposition: buildAgentDispositionPayload(formValues?.agentDisposition || []),
    members: uniqueMembers,
    allowSkipping: formValues?.allowSkipping ?? true,
    declineDispositions: Array.isArray(formValues?.declineDispositions)
      ? formValues.declineDispositions.map((d: any) => String(d?._id ?? d)).filter(Boolean)
      : [],
    agentOwnedRecords: Boolean(formValues?.agentOwnedRecords),
    /* The compliance country the Calling rules and Review steps showed: an
       explicit choice, else the hours country standing in for it. Saving the
       stand-in means the dialer's calling window and the number parser get a
       real country instead of null and "the safest common rule". */
    country: effectiveCampaignCountry(formValues?.country, hoursCountryOf(formValues)).iso2 || null,
    /* Defaults to false in all three places (initial value, write, read).
       The schema makes `script` required whenever agentScripting is true, so
       defaulting to true would fail validation on every new campaign, and
       would silently flip legacy campaigns on — then block saving them. */
    agentScripting: formValues?.agentScripting ?? false,
    script: typeof scriptValue === 'string' ? scriptValue : scriptValue?.value || '',
    settings: settingsPayload,
    dialMethod: dialMethod || formValues?.dialMethod || DIALER_TYPE.PREVIEW,
    timezone,
    ...(selectedCampaignId ? { campaignId: selectedCampaignId } : {}),
  };
};

export const mapCampaignToFormDefaults = ({
  selectedCampaign,
  dataSiteList = [],
  groupList = [],
  inventoryNumberList = [],
}: {
  selectedCampaign: any;
  dataSiteList?: any[];
  groupList?: any[];
  inventoryNumberList?: any[];
}) => {
  const media = selectedCampaign?.settings?.media;
  const savedZone = String(
    selectedCampaign?.timezone ||
      selectedCampaign?.settings?.operational_hours?.regional?.timezone?.value ||
      '',
  );
  const retryPeriodLabel =
    DEFAULT_RETRY_PERIOD_TYPE.find(
      (item) => item.value === selectedCampaign?.dialerSetting?.default_retry_period_type,
    )?.label || '';

  const answeringMachine = selectedCampaign?.dialerSetting?.answering_detection_machine || {};
  const autoAnswering = selectedCampaign?.dialerSetting?.auto_answering || {};
  const normalizedMachine = normalizeAnsweringMachineValue(answeringMachine);

  const settings = selectedCampaign?.settings || CAMPAIGN_SETTINGS_CONST?.settings;

  const siteLabel = dataSiteList?.find(
    (item: { uuid: string }) => item?.uuid === selectedCampaign?.siteId,
  )?.name;

  const groupIds = (selectedCampaign?.groupId || [])
    .map((groupId: string) => {
      const group = groupList?.find(
        (item: { _id: string; groupName?: string; name?: string; leadCount?: number }) =>
          item?._id === groupId,
      );
      return group
        ? {
            label: group.groupName || group.name || groupId,
            value: groupId,
            leadCount: group.leadCount ?? 0,
          }
        : { label: groupId, value: groupId, leadCount: 0 };
    })
    .filter(Boolean);

  const callerIds = (selectedCampaign?.callerId || [])
    .map((didNumber: string) => {
      const matchedNumber = inventoryNumberList?.find(
        (item: { did_number: string }) => item?.did_number === didNumber,
      );
      if (!matchedNumber) {
        return {
          label: didNumber?.startsWith('+') ? didNumber : `+${didNumber}`,
          value: didNumber,
        };
      }
      return {
        label: `${matchedNumber?.did_number?.startsWith('+') ? matchedNumber.did_number : `+${matchedNumber.did_number}`}`,
        value: matchedNumber?.did_number,
      };
    })
    .filter(Boolean);
  const members = (selectedCampaign?.members || []).map((member: any) =>
    normalizeMemberForForm(member),
  );

  return {
    name: selectedCampaign?.name || '',
    description: selectedCampaign?.description || '',
    dialerSetting: {
      preview_time: selectedCampaign?.dialerSetting?.preview_time,
      preview_timeout_action:
        selectedCampaign?.dialerSetting?.preview_timeout_action || 'RETURN_TO_POOL',
      retry_ladder: Array.isArray(selectedCampaign?.dialerSetting?.retry_ladder)
        ? selectedCampaign.dialerSetting.retry_ladder
        : [],
      retry_by_outcome:
        selectedCampaign?.dialerSetting?.retry_by_outcome && typeof selectedCampaign.dialerSetting.retry_by_outcome === 'object'
          ? selectedCampaign.dialerSetting.retry_by_outcome
          : {},
      ringing_agent_time: selectedCampaign?.dialerSetting?.ringing_agent_time,
      wrapup_time: selectedCampaign?.dialerSetting?.wrapup_time,
      wrapup_mode: selectedCampaign?.dialerSetting?.wrapup_mode || 'MANDATORY_TIMEOUT',
      /* Left undefined for a campaign saved before this existed; the form
         fills it from the company default once that has loaded. */
      wait_after_call: selectedCampaign?.dialerSetting?.wait_after_call,
      max_ring_time: selectedCampaign?.dialerSetting?.max_ring_time,
      default_retry_period: selectedCampaign?.dialerSetting?.default_retry_period,
      default_retry_period_type: {
        label: retryPeriodLabel,
        value: selectedCampaign?.dialerSetting?.default_retry_period_type || '',
      },
      max_attempt_per_record: selectedCampaign?.dialerSetting?.max_attempt_per_record,
      max_lines: selectedCampaign?.dialerSetting?.max_lines ?? 0,
      max_calls_per_agent: selectedCampaign?.dialerSetting?.max_calls_per_agent ?? 3,
      target_abandon_rate: selectedCampaign?.dialerSetting?.target_abandon_rate ?? 3,
      compliance_abandon_seconds: selectedCampaign?.dialerSetting?.compliance_abandon_seconds ?? 2,
      min_agents_for_predictive: selectedCampaign?.dialerSetting?.min_agents_for_predictive ?? 5,
      dial_ahead: selectedCampaign?.dialerSetting?.dial_ahead === undefined ? true : Boolean(selectedCampaign?.dialerSetting?.dial_ahead),
      answering_detection_machine: {
        enabled: toBoolean(answeringMachine?.enabled ?? answeringMachine?.enable, false),
        type: answeringMachine?.type,
        value: normalizedMachine,
      },
      auto_answering: {
        enabled: toBoolean(autoAnswering?.enabled ?? autoAnswering?.enable, false),
        timeout: autoAnswering?.timeout ?? 2,
      },
    },
    greetings: {
      welcome: {
        enabled: toBoolean(media?.welcome?.enabled, false),
        value: {
          label: media?.welcome?.label || '',
          value: media?.welcome?.value || '',
        },
      },
      hold: {
        enabled: toBoolean(media?.hold?.enabled, false),
        value: {
          label: media?.hold?.label || '',
          value: media?.hold?.value || '',
        },
      },
      no_agent_available: {
        enabled: toBoolean(media?.no_agent_available?.enabled, false),
        value: {
          label: media?.no_agent_available?.label || '',
          value: media?.no_agent_available?.value || '',
        },
      },
    },
    inbound: {
      route_number: toBoolean(settings?.inbound?.route_number, false),
      ring_strategy: {
        label: settings?.ring_strategy?.label || settings?.ring_strategy?.value?.label || 'Ring All',
        value:
          (typeof settings?.ring_strategy?.value === 'string'
            ? settings.ring_strategy.value
            : settings?.ring_strategy?.value?.value) || 'ring-all',
      },
      closed: settings?.operational_hours?.closed_hour_action?.enabled
        ? {
            type: 'VOICEMAIL',
            value: String(settings.operational_hours.closed_hour_action.value || ''),
            label: settings.operational_hours.closed_hour_action.label || '',
          }
        : { type: 'NONE', value: '', label: '' },
    },
    agentDisposition: selectedCampaign?.agentDisposition || [],
    allowSkipping: toBoolean(selectedCampaign?.allowSkipping, true),
    declineDispositions: Array.isArray(selectedCampaign?.declineDispositions)
      ? selectedCampaign.declineDispositions.map(String)
      : [],
    agentOwnedRecords: toBoolean(selectedCampaign?.agentOwnedRecords, false),
    country: toIso2(selectedCampaign?.country),
    agentScripting: toBoolean(selectedCampaign?.agentScripting, false),
    /* The Team tab's requirement rows, read defensively: an older campaign
       has no block at all and gets an empty one, which means "anyone". */
    routing: readRouting(settings?.routing),
    members,
    /* Read back in the campaign's own zone: the server stores each date as
       midnight there, and formatting that instant in the browser's zone put
       the day before into the form for anyone west of the campaign. */
    startDate: storedDay(selectedCampaign?.startDate, savedZone),
    endDate: storedDay(selectedCampaign?.endDate, savedZone),
    settings: {
      ...settings,
      ai_call_monitoring: {
        enabled: toBoolean(
          typeof settings?.ai_call_monitoring === 'boolean'
            ? settings?.ai_call_monitoring
            : settings?.ai_call_monitoring?.enabled,
        ),
      },
      transcription: {
        enabled: toBoolean(
          typeof settings?.transcription === 'boolean'
            ? settings?.transcription
            : settings?.transcription?.enabled,
        ),
      },
    },
    maskingType: {
      label: selectedCampaign?.settings?.display_number?.masking?.label || '',
      value: selectedCampaign?.settings?.display_number?.masking?.type || '',
    },
    siteId: { label: siteLabel, value: selectedCampaign?.siteId },
    groupId: groupIds,
    callerId: callerIds,
    rotateCallerId: Boolean(selectedCampaign?.rotateCallerId) && callerIds.length > 1,
    require_consent: Boolean(selectedCampaign?.require_consent),
  };
};
