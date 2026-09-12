/**
 * Who places the call in each campaign mode.
 *
 *   Preview      the agent sees the record, then dials from their own phone.
 *   Progressive  the server dials one contact per idle agent and rings the
 *                agent through the campaign's queue when someone answers.
 *   Predictive   as progressive, but the server dials ahead of the agents
 *                becoming free, corrected by the measured answer and abandon
 *                rates.
 *
 * Until the dialer engine and the switch route were deployed, progressive
 * campaigns were dialled from the agent's browser like preview without the
 * countdown. SERVER_DIALS_PROGRESSIVE is the switch between the two
 * behaviours: leave it false until campaign-api runs the engine and the
 * switch has the campaign route (backend-patches/campaign-api/
 * apply-outbound-dialer.sh and backend-patches/fs-xml-api/
 * apply-campaign-context.sh), or a progressive agent will sit waiting for a
 * call that nothing places.
 */
/* 6 Sep 2026: the engine is deployed (campaign-api, DIALER_ENGINE_ENABLED),
   the switch has the campaign context and the originator reaches the rate
   service, so progressive agents now wait for the server's call. */
export const SERVER_DIALS_PROGRESSIVE = true;

export const normalizeDialMode = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase();

/** True when the server, not the agent's browser, places this campaign's calls. */
export const isServerDialed = (dialMethod: unknown): boolean => {
  const mode = normalizeDialMode(dialMethod);
  if (mode.includes('PREDICTIVE')) return true;
  if (mode === 'PROGRESSIVE') return SERVER_DIALS_PROGRESSIVE;
  return false;
};

/** Modes where the pacing controls (lines, calls per agent, abandon cap) mean something. */
export const hasPacingControls = (dialMethod: unknown): boolean => {
  const mode = normalizeDialMode(dialMethod);
  return mode === 'PREDICTIVE' || mode === 'PROGRESSIVE';
};

export const HEALTH_LABEL: Record<
  string,
  { label: string; tone: 'good' | 'warn' | 'crit' | 'neu' }
> = {
  running: { label: 'Dialling normally', tone: 'good' },
  waiting_for_agents: { label: 'Waiting for agents', tone: 'crit' },
  waiting_for_contacts: { label: 'Waiting for contacts', tone: 'crit' },
  outside_hours: { label: 'Outside calling hours', tone: 'warn' },
  line_limit: { label: 'At the line limit', tone: 'warn' },
  predictive_floor: { label: 'Too few agents to dial ahead', tone: 'warn' },
  /* The abandon cap is a pacing knob, never a stop: over it the dialer places
     one call per free agent until the windowed rate is back under. */
  abandon_cap: { label: 'Over the abandon cap', tone: 'warn' },
  /* "Agents dial from their records" is accurate but it was the widest thing
     in the campaign table's status column by a distance, and it set the width
     of a column that every other row filled with one short word. The sentence
     lives in the chip's tooltip instead. */
  agent_driven: { label: 'Agents dial', tone: 'neu' },
  paused: { label: 'Paused', tone: 'neu' },
  stopping: { label: 'Stopping', tone: 'warn' },
  completed: { label: 'Completed', tone: 'neu' },
  not_started: { label: 'Not started', tone: 'neu' },
};

export const CALL_STATUS_LABEL: Record<string, string> = {
  dialing: 'Dialling',
  ringing: 'Ringing',
  answered: 'Answered, waiting for agent',
  offering: 'Ringing agent',
  talking: 'Talking',
  ended: 'Ended',
};

export const OUTCOME_LABEL: Record<string, string> = {
  ANSWERED: 'Answered',
  ABANDONED: 'Abandoned',
  MACHINE: 'Answering machine',
  NO_ANSWER: 'No answer',
  BUSY: 'Busy',
  FAILED: 'Failed',
  CANCEL: 'Cancelled',
};

export const DUTY_LABEL: Record<string, string> = {
  idle: 'Idle',
  on_call: 'On a call',
  wrap_up: 'Wrapping up',
  break: 'On break',
  offline: 'Offline',
};

/* A finer word for the agent row when the board says why: not joined to this
   campaign (so the dialer will not ring them), or in the wait after a call. */
export const AGENT_PHASE_LABEL: Record<string, string> = {
  not_joined: 'Not joined',
  wait_after_call: 'Waiting after call',
};

export const agentDutyLabel = (agent: { duty?: string; phase?: string | null; status?: string } | null | undefined): string =>
  (agent?.phase && AGENT_PHASE_LABEL[agent.phase]) || DUTY_LABEL[agent?.duty || ''] || agent?.status || '—';
