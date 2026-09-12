import { CAMPAIGN_SETTINGS_CONST } from '@/constants/common-const';
import { DEFAULT_CAMPAIGN_TIMERS } from '@/lib/campaign-timers';

export const PREVIW_INITIALS = {
  name: '',
  siteId: {
    label: '',
    value: '',
  },
  description: '',
  startDate: '',
  endDate: '',
  callerId: [],
  /* One outgoing number is the default. Rotation is a deliberate choice, for
     local presence, never something a campaign gets by accident. */
  rotateCallerId: false,
  require_consent: false,
  /* ISO 3166-1 alpha-2. Picks the campaign's abandon rule and, just as
     importantly, tells the number parser which country a lead in local format
     belongs to. Defaults to the company's own country at create time. */
  country: '',
  groupId: [],
  dialerSetting: {
    /* The timers start from the built-in defaults here and are replaced by
       the company's own defaults (Company › Campaign timers) once those have
       loaded - see the seeding effect in index.tsx. Ranges and defaults live
       in src/lib/campaign-timers.ts, never retyped here. */
    preview_time: DEFAULT_CAMPAIGN_TIMERS.preview_time,
    preview_timeout_action: 'RETURN_TO_POOL',
    ringing_agent_time: 30,
    wrapup_time: DEFAULT_CAMPAIGN_TIMERS.wrapup_time,
    /* Same five wrap-up rules a queue has. The default is what a plain timer
       always did, so an existing campaign changes nothing. */
    wrapup_mode: DEFAULT_CAMPAIGN_TIMERS.wrapup_mode,
    /* Seconds between the wrap-up ending and the next lead being offered. */
    wait_after_call: DEFAULT_CAMPAIGN_TIMERS.wait_after_call,
    max_ring_time: 30,
    /* One attempt means a lead is never called back, which also means the retry
       ladder and the per-outcome waits below can never fire — they were being
       filled in on screen and silently ignored. Three is the ordinary starting
       point for outbound calling; an existing campaign keeps whatever it saved. */
    max_attempt_per_record: 3,
    default_retry_period: 3,
    default_retry_period_type: {
      label: 'Minutes',
      value: 'min',
    },
    /* A different wait after each attempt; empty rows use the default above. */
    retry_ladder: [],
    /* A wait per outcome; a blank entry uses the ladder or the default. */
    retry_by_outcome: {},
    /* Pacing, read by the dialer service. 0 lines = no ceiling. */
    max_lines: 0,
    max_calls_per_agent: 3,
    target_abandon_rate: 3,
    compliance_abandon_seconds: 2,
    /* Predictive only: below this many active agents the campaign paces one
       call per free agent; dial_ahead lets it dial for agents about to be free. */
    min_agents_for_predictive: 5,
    dial_ahead: true,
    answering_detection_machine: {
      /* `enabled` is what the form, the read-back and the dialer service use;
         `enable` is kept only because older saves carry that spelling. */
      enabled: false,
      enable: false,
      type: 'HANGUP',
      value: {
        label: '',
        value: '',
      },
    },
    auto_answering: {
      enabled: false,
      timeout: 2,
    },
  },
  agentDisposition: [],
  members: [],
  allowSkipping: true,
  /* Reasons an agent may give when skipping; ids from agentDisposition.
     Empty means no reason is asked for. */
  declineDispositions: [],
  /* Preview only: a lead with an owner goes only to that agent. */
  agentOwnedRecords: false,
  agentScripting: false,
  script: {
    label: '',
    value: '',
  },
  greetings: {
    welcome: { enabled: false, value: { label: '', value: '' } },
    hold: { enabled: false, value: { label: '', value: '' } },
    /* Played to a customer who answered and got no agent: the abandoned-call
       message the rules require (who called, and a number to reach). */
    no_agent_available: { enabled: false, value: { label: '', value: '' } },
  },
  /* Inbound handling while the campaign runs: route the outgoing number's
     calls to the campaign team, and where callers go outside the hours. */
  inbound: {
    route_number: false,
    ring_strategy: { label: 'Ring All', value: 'ring-all' },
    closed: { type: 'NONE', value: '', label: '' },
  },
  ...CAMPAIGN_SETTINGS_CONST,
};

export const RETRY_PERIOD_TYPE = {
  MIN: 'min',
  HOUR: 'hr',
  DAY: 'day',
};

export const DIALER_TYPE = {
  NORMAL: 'PROGRESSIVE',
  PREDICTIVE: 'PREDICTIVE',
  PREVIEW: 'PREVIEW',
  /* No dialling out: a number, a team and what callers hear. */
  INBOUND: 'INBOUND',
};

export const CAMPAIGN_TYPE_LIST = [
  {
    label: 'Preview',
    description: 'For small teams, manual review',
    value: DIALER_TYPE.PREVIEW,
  },
  {
    label: 'Progressive',
    description: 'For small to medium teams, steady flow',
    value: DIALER_TYPE.NORMAL,
  },
  {
    label: 'Predictive',
    description: 'For large teams, max. efficiency, min. idle time',
    value: DIALER_TYPE.PREDICTIVE,
  },
  {
    label: 'Inbound',
    description: 'Customers call a number; the team answers. No dialling out',
    value: DIALER_TYPE.INBOUND,
  },
];

/* Still read by the queue settings screen for its wrap-up dropdown. The
   campaign form no longer uses it: its timers are number inputs with the
   ranges from src/lib/campaign-timers.ts. */
export const TIME_LIST = [30, 35, 40, 45, 50, 55, 60];

export const MAX_ATTEMPTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const DEFAULT_RETRY_PERIOD_TYPE = [
  {
    label: 'Minutes',
    value: RETRY_PERIOD_TYPE.MIN,
  },
  {
    label: 'Hours',
    value: RETRY_PERIOD_TYPE.HOUR,
  },
  {
    label: 'Days',
    value: RETRY_PERIOD_TYPE.DAY,
  },
];

/* A running campaign cannot be edited (pause it first). A paused or
   not-yet-started one can, except for its leads and number once any call
   has been placed: those are locked from the first start. */
export const isCampaignLocked = (status?: string, dialMethod?: string) =>
  String(dialMethod || '').toUpperCase() !== 'INBOUND' &&
  ['PROCESSING', 'COMPLETED'].includes(String(status || '').toUpperCase());
export const areLeadsLocked = (status?: string) => Boolean(status) && String(status).toUpperCase() !== 'NEW';

/* What to do when the preview countdown runs out. Returning the lead is the
   default because it is the only answer that is safe everywhere: the person,
   not the timer, decides to place the call. */
export const RETRY_OUTCOMES = [
  { value: 'BUSY', label: 'Busy' },
  { value: 'NO_ANSWER', label: 'No answer' },
  { value: 'MACHINE', label: 'Answering machine' },
  { value: 'ABANDONED', label: 'Abandoned (answered, no agent free)' },
];

export const PREVIEW_TIMEOUT_ACTIONS = [
  { value: 'RETURN_TO_POOL', label: 'Give the lead back and offer the next one' },
  { value: 'DIAL', label: 'Dial the number automatically' },
];
