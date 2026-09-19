import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useAgentDuty } from '@/hooks/use-agent-duty';
import { getCallQueueInvolvements } from '@/services/api';
import { getMonitoringLiveCalls } from '@/pages/monitoring/live-call-helpers';
import { CAMPAIGN_RING_STORAGE_KEY, readCampaignRingContact, sameSipContact } from '@/lib/campaign-join-state';
import {
  buildAgentWorkList,
  type AgentReadiness,
  type AgentWorkRow,
} from '@/lib/agent-work-list';

/**
 * The agent's own work list, assembled from the three places the platform
 * already publishes it - this browser's SIP sessions, the company's live
 * call-centre calls, and the campaign live board - plus the queues this person
 * is actually a member of so other people's queues are never listed.
 *
 * No new endpoint and no new polling: the two live sources are sockets the app
 * is already connected to, and the queue membership is one cached read
 * (`/api/call-queue/queue-involvement`, which returns exactly the queues whose
 * `members` name this user).
 */

const QUEUE_INVOLVEMENT_KEY = ['agent-work-list', 'queue-involvement'] as const;

export type AgentWorkList = {
  rows: AgentWorkRow[];
  readiness: AgentReadiness;
  /** Ticks once a second so every wait on screen counts up. */
  nowMs: number;
  /** The campaign this tab is joined to, for the "ring this tab" repair. */
  joinedCampaignId: string;
};

export const useAgentWorkList = (): AgentWorkList => {
  const { sessions, isRegistered, sipContact, joinedCampaignId, activeCampaign } = useDialpad();
  const { liveCalls, eventLiveCallsData, socketEventsManager } = useSocketEvents();
  const { mine: myDuty } = useAgentDuty();

  /* The campaign board, for customers who answered and are holding. The same
     payload the campaign card already listens to; a second listener on one
     socket costs nothing and keeps this hook self-contained. */
  const [board, setBoard] = useState<any>(null);
  useEffect(() => {
    if (!socketEventsManager) return;
    const onStats = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      setBoard({ ...payload, receivedAt: Date.now() });
    };
    socketEventsManager.on('campaign-live-stats', onStats);
    return () => {
      socketEventsManager.off('campaign-live-stats', onStats);
    };
  }, [socketEventsManager]);

  /* One tick a second, so a wait counts up without anything else changing. */
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const involvement = useQuery({
    queryKey: QUEUE_INVOLVEMENT_KEY,
    queryFn: () => getCallQueueInvolvements({}),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { myQueueIds, queueNames } = useMemo(() => {
    const payload: any = involvement.data;
    const rows: any[] =
      payload?.data?.data?.rows ||
      payload?.data?.data ||
      payload?.data?.result ||
      payload?.data ||
      [];
    const ids: string[] = [];
    const names: Record<string, string> = {};
    (Array.isArray(rows) ? rows : []).forEach((row: any) => {
      const id = String(row?.uuid || row?._id || '').trim();
      if (!id) return;
      ids.push(id);
      names[id] = String(row?.name || '').trim();
    });
    return { myQueueIds: ids, queueNames: names };
  }, [involvement.data]);

  const campaignId = String(joinedCampaignId || '').trim();
  const boardCampaignId = String(board?.campaignId || '').trim();
  const campaignRows: any[] = useMemo(() => {
    /* Only this tab's own campaign. A board for another campaign says nothing
       about work that could reach this agent. */
    if (!campaignId || boardCampaignId !== campaignId) return [];
    return Array.isArray(board?.calls?.rows) ? board.calls.rows : [];
  }, [board, boardCampaignId, campaignId]);

  const sessionValues = useMemo(() => Object.values(sessions || {}), [sessions]);
  const hasLiveSession = sessionValues.some((session: any) => {
    const status = String(session?.status || '').toLowerCase();
    return Boolean(status) && !['ended', 'failed'].includes(status);
  });
  /* A wrap-up panel outlives the call it belongs to, and an agent inside one is
     not free either - the same rule the auto-join uses. */
  const hasEndedSessionOpen = sessionValues.some((session: any) =>
    ['ended', 'failed'].includes(String(session?.status || '').toLowerCase()),
  );

  const duty: AgentReadiness['duty'] =
    myDuty?.duty === 'on_duty'
      ? 'on'
      : myDuty?.duty === 'on_break'
        ? 'break'
        : myDuty?.duty === 'off_duty'
          ? 'off'
          : 'unknown';

  /* Re-read whenever another window moves the ring (the storage event fires
     in the OTHER windows) and on a slow tick, so this window's sentence about
     where calls ring is never a stale one from when it was opened (14 Sep:
     it said "waiting for the switch to ring you" while the switch rang, and
     auto-answered, another window). */
  const [ringVersion, setRingVersion] = useState(0);
  useEffect(() => {
    const bump = () => setRingVersion((v) => v + 1);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CAMPAIGN_RING_STORAGE_KEY) bump();
    };
    window.addEventListener('storage', onStorage);
    const id = window.setInterval(bump, 5000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(id);
    };
  }, []);
  const ringIsElsewhere = useMemo(() => {
    void ringVersion;
    if (!campaignId) return false;
    const stored = readCampaignRingContact(campaignId);
    if (!stored || !sipContact) return false;
    return !sameSipContact(stored, sipContact);
  }, [campaignId, sipContact, ringVersion]);

  const readiness: AgentReadiness = {
    duty,
    busy: hasLiveSession || hasEndedSessionOpen,
    registered: Boolean(isRegistered && sipContact),
    offersStopped: Boolean(myDuty?.missed_too_many),
    ringIsElsewhere,
  };

  const rows = useMemo(
    () =>
      buildAgentWorkList({
        sessions: sessions || {},
        liveCalls: getMonitoringLiveCalls(liveCalls, eventLiveCallsData),
        myQueueIds,
        queueNames,
        campaignRows,
        campaignName: String(activeCampaign?.name || '').trim(),
        campaignBoardAgeMs: board?.receivedAt ? nowMs - Number(board.receivedAt) : Number.MAX_SAFE_INTEGER,
        nowMs,
      }),
    [
      activeCampaign?.name,
      board?.receivedAt,
      campaignRows,
      eventLiveCallsData,
      liveCalls,
      myQueueIds,
      nowMs,
      queueNames,
      sessions,
    ],
  );

  return { rows, readiness, nowMs, joinedCampaignId: campaignId };
};
