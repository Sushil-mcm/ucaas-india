import {
  getMonitoringCallTimestamp,
  isMonitoringCallForMember,
} from '@/pages/monitoring/live-call-helpers';
/**
 * Only the fields the agent derivation actually reads. Performance ▸ Agents
 * passes a membership-shaped queue and Home passes a full row; both satisfy
 * this, so neither caller has to widen its own data to fit.
 */
type QueueLike = { uuid?: string; name?: string; memberKeys: string[] };

/**
 * One derivation of an agent's live row, shared by Performance ▸ Agents and the
 * Home overview — the companion to `queue-rows.ts`.
 *
 * Presence, live-call state and today's handled/AHT figures are all decided
 * here, so the floor view on Home and the detail on Performance can never
 * disagree about whether someone is on a call.
 */

const RINGING_STATUSES = [
  'ringing',
  'connecting',
  'members-offered',
  'start',
  'started',
  'waiting',
];

export const normalizePresenceStatus = (status?: string) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();
  if (normalized === 'busy') return 'Busy';
  if (['dnd', 'do_not_disturb', 'do-not-disturb'].includes(normalized)) return 'Do Not Disturb';
  return 'Available';
};

export const getAgentLiveState = (
  extension: string | undefined,
  usersOnlineStatus: any[],
  activeQueueCalls: any[],
) => {
  if (!extension) return { status: 'Offline', call: null as any };

  const liveCall = activeQueueCalls?.find((call) => isMonitoringCallForMember(call, extension));
  if (liveCall) {
    const callStatus = String(liveCall?.status || '').toLowerCase();
    if (callStatus === 'on_hold' || callStatus === 'hold')
      return { status: 'On Hold', call: liveCall };
    if (RINGING_STATUSES.includes(callStatus)) return { status: 'Ringing', call: liveCall };
    return { status: 'On Call', call: liveCall };
  }

  const presence = usersOnlineStatus?.find((u: any) => String(u?.userId) === String(extension));
  if (presence?.online) return { status: normalizePresenceStatus(presence?.status), call: null };
  return { status: 'Offline', call: null };
};

export const getCallerId = (call: any) =>
  call?.caller_id_number || call?.ani || call?.from_number || call?.destination_number || '—';

/** Every state an agent row can report, in the order a floor is read. */
export const AGENT_STATES = [
  'On Call',
  'Ringing',
  'On Hold',
  'Available',
  'Busy',
  'Do Not Disturb',
  'Offline',
] as const;

export type AgentState = (typeof AGENT_STATES)[number];

export type LiveAgentRow = {
  name: string;
  extension: string | undefined;
  image?: string;
  status: string;
  callStart: number | null;
  queueOrCampaign: string;
  callerId: string;
  isOnCall: boolean;
  handledToday: number;
  aht: number | null;
  queuesCount: number;
  incomingCalls: number;
  outgoingCalls: number;
  timeOnCallsMinutes: number;
  isOnline: boolean;
};

type BuildInput = {
  agentRows: any[];
  queues: QueueLike[];
  usersOnlineStatus: any[];
  activeQueueCalls: any[];
};

export const buildAgentRows = ({
  agentRows,
  queues,
  usersOnlineStatus,
  activeQueueCalls,
}: BuildInput): LiveAgentRow[] =>
  agentRows.map((agent: any) => {
    const extension = agent?.extension;
    const stats = agent?.stats || {};
    const answeredToday = typeof stats.answered_calls === 'number' ? stats.answered_calls : 0;
    const timeOnCalls =
      typeof stats.time_on_calls_minutes === 'number' ? stats.time_on_calls_minutes : 0;
    const aht = answeredToday ? timeOnCalls / answeredToday : null;
    const matchKeys = [agent?.uuid, agent?.user_uuid, extension]
      .filter(Boolean)
      .map((value) => String(value));
    const queuesCount = queues.filter((queue) =>
      queue.memberKeys.some((key) => matchKeys.includes(key)),
    ).length;
    const liveState = getAgentLiveState(extension, usersOnlineStatus, activeQueueCalls);
    const liveCall = liveState.call;
    const forwardValue = String(
      liveCall?.queue_uuid || liveCall?.forward_value || liveCall?.campaign_uuid || '',
    );
    const matchedQueue = forwardValue ? queues.find((q) => q.uuid === forwardValue) : null;

    return {
      name: `${agent?.first_name || ''} ${agent?.last_name || ''}`.trim() || 'Unknown',
      extension,
      image: agent?.profile || agent?.image,
      status: liveState.status,
      callStart: liveCall ? getMonitoringCallTimestamp(liveCall) : null,
      queueOrCampaign: matchedQueue?.name || '--',
      callerId: liveCall ? getCallerId(liveCall) : '--',
      isOnCall: Boolean(liveCall),
      handledToday: answeredToday,
      aht,
      queuesCount,
      incomingCalls: typeof stats.incoming_calls === 'number' ? stats.incoming_calls : 0,
      outgoingCalls: typeof stats.outgoing_calls === 'number' ? stats.outgoing_calls : 0,
      timeOnCallsMinutes: timeOnCalls,
      isOnline:
        usersOnlineStatus?.some((u: any) => String(u?.userId) === String(extension) && u?.online) ??
        false,
    };
  });

export default buildAgentRows;
