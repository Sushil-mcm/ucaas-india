import { CUSTOM_HOURS_SCHEDULE_OPTIONS } from '@/constants/forwarding-consts';

export const TAB_CONSTANT = {
  BASIC_INFORMATION: 'Basic Information',
  SETTINGS: 'Settings & Permissions',
  QUEUE_SETTINGS: 'Queue Settings',
  ADD_MEMBERS: 'Add Member',
  RING_STRATEGY: 'Ring Strategy',
  GREETING_NOTIFICATION: 'Media',
};

/* How many callers may wait, and how long they may wait for.
 *
 * This was a hand-written list of 3 to 30, offered in a dropdown. Thirty is an
 * order of magnitude below what established systems allow — they hold 500 on a
 * standard plan and 1,000 on their top plan — and a ceiling that low silently
 * turns callers away on any busy morning, with nothing in the interface saying
 * it happened.
 *
 * A dropdown of 500 entries is unusable, so this is a number field now. The
 * stored shape is unchanged: still `{ label, value }`, so the payload builder
 * and the saved records do not move.
 *
 * The 1,000 ceiling is deliberately not offered yet. It belongs to the top plan,
 * and there is no plan flag for queue size to read — inventing a key would read
 * as `undefined` and quietly give everyone the lower number anyway. */
export const MAX_WAITING_CALLERS_LIMITS = { min: 1, max: 500 };

/* 10 seconds to 300 minutes, matching what established systems allow. The old
   floor of 60 seconds ruled out short overflow queues that hand off quickly. */
export const QUEUE_TIMEOUT_LIMITS = { min: 10, max: 18000 };

/* What happens while a caller waits.
 *
 * Three settings that established systems have: an offer of a callback when
 * the queue is busy, announcements of position and expected wait, and a
 * message that repeats on an interval rather than only playing once.
 *
 * All three are acted on by the phone system: the switch says the position,
 * the queue service works out the wait, and the callback is offered by the
 * switch, kept in line by the queue service and rung back through the same
 * path an outbound campaign call takes. The callback keys (`key`,
 * `confirm_number`) were added when the offer became real; a queue saved
 * before then reads them from these defaults.
 */
export const WAITING_DEFAULTS = {
  announce_position: false,
  announce_wait_time: false,
  callback: {
    enabled: false,
    /* Offer a callback once more than this many people are ahead, or once the
       wait (measured or estimated) passes this many minutes. Either can be
       turned off by setting it to zero; both off means the offer never goes
       out. */
    offer_after_callers: 5,
    offer_after_minutes: 5,
    /* The key the caller presses, and whether the number they called from is
       read back and confirmed before it is taken (a withheld number is always
       asked for). */
    key: '1',
    confirm_number: true,
    max_attempts: 3,
    retry_after_minutes: 15,
    expires_after_hours: 24,
  },
};

/* Every key a caller can press for the callback offer. */
export const CALLBACK_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#'].map((key) => ({
  label: key,
  value: key,
}));

export const WAITING_LIMITS = {
  offer_after_callers: { min: 0, max: MAX_WAITING_CALLERS_LIMITS.max },
  offer_after_minutes: { min: 0, max: 300 },
  max_attempts: { min: 1, max: 10 },
  retry_after_minutes: { min: 1, max: 240 },
  expires_after_hours: { min: 1, max: 168 },
  /* Established systems will not repeat a delay message more often than every
     30 seconds, and callers find anything faster than that badgering. */
  delay_interval_seconds: { min: 30, max: 600 },
};

export const DELAY_GREETING_DEFAULT_INTERVAL = 60;

/* How the queue behaves after the call, and who it prefers to ring.
 *
 * Three settings established systems have and we did not.
 *
 * Wrap-up: we only ever had a timer. Their setting is the *prompt mode* — the
 * timer is secondary. "Optional wrap-up" and "wrap-up you cannot skip" are
 * different products to a supervisor, and a timer alone cannot say which.
 *
 * Last agent: send a repeat caller back to whoever they spoke to last. Three
 * modes, matching the reference, plus how far back to look.
 *
 * Service level: the target reporting measures against, so a supervisor sees
 * "84% against a 80% target" instead of a bare average with nothing to judge it
 * by.
 *
 * As with the waiting settings, these are stored and read back but nothing acts
 * on them yet, and every control says so on screen. */
export const WRAPUP_PROMPT_MODES = [
  { value: 'OPTIONAL', label: 'Optional — the agent may skip it' },
  { value: 'MANDATORY', label: 'Required — no time limit' },
  { value: 'MANDATORY_TIMEOUT', label: 'Required, then moves on when time runs out' },
  { value: 'MANDATORY_FORCED_TIMEOUT', label: 'Required, and forced closed when time runs out' },
  { value: 'AGENT_REQUESTED', label: 'Only when the agent asks for it' },
];

/* The mode existing queues get. It is what a plain timer already behaved like,
   so no queue changes behaviour the first time it is opened and saved. */
export const WRAPUP_DEFAULT_MODE = 'MANDATORY_TIMEOUT';

export const LAST_AGENT_MODES = [
  { value: 'DISABLED', label: 'Off' },
  { value: 'QUEUE_MEMBERS_ONLY', label: 'Only if they are still in this queue' },
  { value: 'ANY_AGENT', label: 'Any agent who handled them' },
];

export const AFTER_CALL_DEFAULTS = {
  wrapup_prompt: WRAPUP_DEFAULT_MODE,
  last_agent: {
    mode: 'DISABLED',
    /* How far back to look for the previous agent. Beyond a few days the caller
       rarely remembers the person, and the wait to reach them is not worth it. */
    window_hours: 24,
  },
  service_level: {
    enabled: false,
    /* Answer this share of calls within this many seconds. 80 in 20 is the
       long-standing contact centre convention, so it is the starting point. */
    percent: 80,
    seconds: 20,
    /* Hang-ups faster than this are misdials, not abandonment, and are left out
       of the abandon rate and the service level. Five seconds is the usual
       floor; a queue may lower it to zero to count every hang-up. Read by
       src/lib/queue-service-target.ts, and applied whether or not a target is
       set — a misdial is a misdial either way. */
    short_abandon_seconds: 5,
  },
};

export const AFTER_CALL_LIMITS = {
  window_hours: { min: 1, max: 720 },
  percent: { min: 1, max: 100 },
  seconds: { min: 1, max: 3600 },
  /* Zero means count every hang-up. Above a minute nobody is "too quick". */
  short_abandon: { min: 0, max: 60 },
};

/* Widening the ring instead of failing.
 *
 * Established systems ring the best-matched people first and then *add* more
 * people after a timer, rather than choosing one group and giving up. Ours only
 * ever rang one set: whoever was on the queue, all at once or in order.
 *
 * Every member sits in a tier, calls start at tier 1, and each tier is added
 * after its own delay. A queue where everyone is tier 1 behaves exactly as it
 * does today, which is why that is the default for existing members. The queue
 * service honours the switch and the delay (since 2 Sep 2026). */
export const MEMBER_TIERS = [
  { value: 1, label: 'Tier 1 — rings first' },
  { value: 2, label: 'Tier 2 — added next' },
  { value: 3, label: 'Tier 3 — added last' },
];

export const ESCALATION_DEFAULTS = {
  enabled: false,
  /* Seconds before the next tier is added. Below about 15 seconds nobody has
     had a fair chance to answer, so widening that fast just rings more phones
     for no reason. */
  widen_after_seconds: 30,
  /* Lowest rating allowed in the first step. 0 means anybody, which is what a
     queue that has never rated its people should do. */
  minimum_rating: 0,
};

export const ESCALATION_LIMITS = {
  widen_after_seconds: { min: 15, max: 600 },
  minimum_rating: { min: 0, max: 100 },
};

/* Skills this queue asks for.
 *
 * A skill is rated per PERSON (1-5 stars, on their profile), not per queue.
 * The queue names the skills it needs and the lowest rating that counts; the
 * queue service offers only people who hold them, best rated first, and the
 * ring strategy breaks ties. No skills named = the queue rings exactly as it
 * always has. */
export const ROUTING_DEFAULTS = {
  required_skills: [] as string[],
  min_stars: 1,
  evaluation: 'ALL' as 'ALL' | 'ANY',
  /* Between queues that share people. 1-10; 5 is normal. */
  priority: 5,
  /* One row per category: any one of the row's skills at the row's bar, and
     every row must be met. The flat fields above are written from these for
     older pickers. See src/lib/queue-requirements.ts. */
  requirements: [] as any[],
  order: 'best_first' as 'best_first' | 'fair',
};

/* What a row does while the caller waits. Each row has its own clock. */
export const ROW_RELAX_OPTIONS = [
  { value: 'never', label: 'Hold for the whole wait', description: 'Never loosen this row.' },
  { value: 'one_star', label: 'Drop to 1 star after a while', description: 'Anyone who holds the skill at all, after the seconds below.' },
  { value: 'one_star_then_drop', label: 'Drop to 1 star, then drop the row', description: 'One star after the seconds below, then the row stops mattering after twice that.' },
  { value: 'drop', label: 'Drop the row after a while', description: 'The row stops mattering after the seconds below.' },
  { value: 'ladder', label: 'Follow the ring widening', description: 'One notch lower each round, in step with the tiers. Needs "Widen the ring" switched on.' },
];

export const ROW_MATCH_OPTIONS = [
  { value: 'ANY', label: 'Any one of them', description: 'Holding one of the skills is enough.' },
  { value: 'ALL', label: 'All of them', description: 'A person must hold every skill in the row.' },
];

/* How much a row weighs when the people who qualify are put in order.
 *
 * This only ever changes the ORDER. It never changes who qualifies - every row
 * still has to be met. The five labels used to be "Normal", "2x - counts
 * double", "3x", "4x", "5x - counts most": two carried an explanation and two
 * did not, and "counts most" described it being the largest on offer rather
 * than what it does. Each one now says the same kind of thing. */
export const ROW_WEIGHTS = [
  { value: 1, label: 'Normal', description: 'Counts once when ranking.' },
  { value: 2, label: 'Double', description: 'This row counts twice as much as a normal row.' },
  { value: 3, label: 'Triple', description: 'This row counts three times as much as a normal row.' },
  { value: 4, label: 'Four times', description: 'This row counts four times as much as a normal row.' },
  { value: 5, label: 'Five times', description: 'This row counts five times as much as a normal row.' },
];

/* Who rings first among the people who qualify. */
export const ROUTING_ORDERS = [
  { value: 'best_first', label: 'Best rated first', description: 'The highest score among those who qualify rings first; the ring strategy breaks ties.' },
  { value: 'fair', label: 'Share the work', description: 'The rows only decide who qualifies; the ring strategy decides the order, so your best person does not take every call.' },
];

/* Between queues that share the same people, a free person goes to the
   caller from the higher-priority queue first; at the same priority, to
   whoever has waited longest, across queues. Four words, not ten numbers. */
export const ROUTING_PRIORITIES = [
  { value: 1, label: 'Low', description: 'Other queues\u2019 callers are served first.' },
  { value: 5, label: 'Normal', description: 'First come, first served across queues.' },
  { value: 8, label: 'High', description: 'Served before Normal and Low queues.' },
  { value: 10, label: 'Urgent', description: 'Served before every other queue.' },
];

export const ROUTING_EVALUATIONS = [
  { value: 'ALL', label: 'All of them', description: 'A person must hold every skill listed.' },
  { value: 'ANY', label: 'Any one of them', description: 'Holding one of the skills is enough.' },
];

export const CALL_QUEUE_INIITAL_VALUES = {
  name: '',
  extension: '',
  site_uuid: null,
  description: '',
  script: null,
  script_enabled: false,
  settings: {
    wrapup_time: 30,
    regional: {
      timezone: {},
      country_code: {},
      country: {},
      time_format: 12,
    },
    operational_hours: {
      type: '24_hours',
      value: CUSTOM_HOURS_SCHEDULE_OPTIONS,
    },
    recording: {
      on_demand: {
        enabled: false,
        recording_on: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34331.mp3',
        recording_Off: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34332.mp3',
      },
      automatic: {
        enabled: false,
        value: 'incoming',
        label: 'Incoming',
        recording_on: 'ad98d65d-fcf8-4d4d-bc77-ee1426c34333.mp3',
      },
    },
    display_number: {
      incoming: {
        label: 'Yes',
        value: true,
      },
      masking: {
        type: { value: 'N', label: 'None' },
        value: '',
      },
      show_number_if_blocked: 'NO',
    },
    ring_strategy: {
      value: { label: 'Ring All', value: 'ring-all' },
      leave_room_if_no_agent: true,
      max_wait_time: {
        callers: {
          label: 5,
          value: 5,
        },
        queue_timeout: 60,
        after_max_wait_time: {
          type: { label: 'Send to voicemail', value: 'VOICEMAIL' },
          value: {},
          personal: true,
          label: '',
          name: '',
        },
      },
    },
    transcription: false,
    waiting: WAITING_DEFAULTS,
    after_call: AFTER_CALL_DEFAULTS,
    escalation: ESCALATION_DEFAULTS,
    routing: ROUTING_DEFAULTS,
  },
  greetings: {
    welcome: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
    hold: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
    waiting: {
      value: null,
      enabled: true,
    },
    /* Repeats while the caller waits, unlike `welcome` which plays once. */
    delay: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
      interval_seconds: DELAY_GREETING_DEFAULT_INTERVAL,
    },
    ring_tone: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
    no_agent_available: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
    all_agent_busy: {
      value: {
        label: '',
        value: '',
      },
      enabled: false,
    },
  },
  members: [],
  agentDisposition: [],
};

export const CALL_DISTRIBUTION_DATA = [
  {
    label: 'Ring All',
    value: 'ring-all',
  },
  {
    label: 'Longest Idle Agent',
    value: 'longest-idle-agent',
  },
  {
    label: 'Round Robin',
    value: 'round-robin',
  },
  {
    label: 'Top Down',
    value: 'top-down',
  },
  {
    label: 'Agent With Least Talk Time',
    value: 'agent-with-least-talk-time',
  },
  {
    label: 'Agent With Fewest Calls',
    value: 'agent-with-fewest-calls',
  },
  // {
  //   label: 'Sequentially By Agent Order',
  //   value: 'sequentially-by-agent-order',
  // },
  {
    label: 'Random',
    value: 'random',
  },
];

/* What choosing each strategy actually means, rather than what it does.
 *
 * These read "Rings the agent in position but remember last tried agent" before,
 * which describes the mechanism to somebody who already knows it and tells an
 * admin nothing about which to pick. Each one now says the consequence - who
 * ends up taking the calls, and what that costs - because that is the decision
 * being made, not the algorithm. */
export const DEPARTMENT_RING_STRATEGY_DESC = {
  'ring-all':
    'Everybody\u2019s phone rings at once and the first to pick up gets the call. Quickest to answer, but every call interrupts everybody.',
  'longest-idle-agent':
    'Whoever has gone longest without a call is tried first. Spreads the work evenly and stops the same person taking everything.',
  'round-robin':
    'Tried one at a time, and the next call starts with the next person rather than going back to the top. Everybody takes a fair turn.',
  'top-down':
    'Always starts at the top of the list. Your most experienced people take most of the calls, and the rest only hear the busy ones.',
  'agent-with-least-talk-time':
    'Whoever has spent least time on calls is tried first. Evens out time on the phone rather than the number of calls, so one long call counts for more than several short ones.',
  'agent-with-fewest-calls':
    'Whoever has taken fewest calls is tried first. Evens out the number of calls, even if some take much longer than others.',
  random: 'Tried in a different order each time. No pattern, and no one person favoured.',
};
