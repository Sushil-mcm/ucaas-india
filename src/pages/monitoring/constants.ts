export const STATE_TYPE_NAME = {
  answered: 'Connected',
  bridged: 'Connected',
  on_hold: 'On Hold',
  early: 'Ringing',
  ringing: 'Ringing',
  trying: 'Trying',
  started: 'Started',
  waiting: 'Waiting',
};

export const DIRECTION_NAME = {
  initiator: 'Outgoing',
  recipient: 'Incoming',
};

const TARGET_STATES = ['early', 'ringing', 'confirmed'] as const;
type CallState = (typeof TARGET_STATES)[number];

export const getStateCounts = (users: Record<string, any>) => {
  return Object.values(users).reduce<Record<CallState, number>>(
    (counts, user) => {
      const state = user?.State?.toLowerCase() as CallState;
      if (TARGET_STATES.includes(state)) {
        counts[state] += 1;
      }
      return counts;
    },
    {
      early: 0,
      ringing: 0,
      confirmed: 0,
    },
  );
};

export const QUEUE_TYPE = {
  queue: 'QUEUE',
  campaign: 'CAMPAIGN',
} as const;
