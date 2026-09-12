import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { allNumbersList } from '@/services/api';
import {
  findDidRow,
  numberRoutedToCampaign,
  restoreNumberRouting,
  routeNumberToCampaign,
} from '../inbound-routing';

import { Ic, McmIconSprite } from '@/components/mcm/icons';
import { SocketEvents } from '@/context/socket-events-context';
import { campaignAnalytics, getCampaignDetail, playPauseCampaign } from '@/services/api';
import { capitalizeFirstLetter, convertDateFormateApis, handleAlert } from '@/lib/utils';
import { normalizeCallNumber } from '@/lib/call-number';
import {
  CALL_STATUS_LABEL,
  HEALTH_LABEL,
  agentDutyLabel,
  OUTCOME_LABEL,
  hasPacingControls,
} from '@/lib/campaign-dial-mode';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import {
  BreakdownRow,
  Crumb,
  DIAL_METHOD_LABEL,
  OutcomeDonut,
  OutcomeLegend,
  StatusPill,
  fmt,
  num,
  pct,
  readOutcomes,
} from '../campaign-ui';
import { RETRY_PERIOD_TYPE } from '../add-edit-campaign/consts';
import {
  rate,
  reportWindow,
  useCampaignHistory,
  useCampaignStates,
  useLiveSnapshot,
} from '../campaign-report-data';
import {
  CampaignAgentPerformance,
  CampaignContactBreakdown,
  CampaignDailyTable,
  CampaignDispositionMix,
  CampaignLeadTable,
  CampaignNumberTable,
  CampaignWindowSummary,
} from '../campaign-report-panels';
import CampaignPreviewTab from './campaign-preview-tab';
import CampaignSkillCoverageCard from './skill-coverage-card';
import '@/components/mcm/mcm-page.css';
import '../campaign.css';

/**
 * MCM Unified Console — campaign monitor.
 *
 * Three questions, in the order a supervisor asks them:
 *
 *   1. Is it running, and if not, what is holding it back?  The health line
 *      at the top: dialling normally, waiting for agents, waiting for
 *      contacts, outside hours, paused.
 *   2. What is happening right now?  Calls in flight (dialling, ringing,
 *      waiting for an agent, talking), which agent is free or busy, and a
 *      feed of the last events. All of it pushed by the dialer engine every
 *      few seconds on the "campaign-live-stats" socket event.
 *   3. How far through the list are we, and how did the calls go?  Lead
 *      progress and outcome counts from the stored analytics (refreshed when
 *      the engine writes a call back), plus this run's connect and abandon
 *      rates against the campaign's own cap.
 *
 * When the engine has not reported (campaign not running, or the server side
 * is not deployed yet) the live panels say so instead of showing zeros.
 */

const RETRY_UNIT_LABEL: Record<string, string> = {
  [RETRY_PERIOD_TYPE.MIN]: 'minutes',
  [RETRY_PERIOD_TYPE.HOUR]: 'hours',
  [RETRY_PERIOD_TYPE.DAY]: 'days',
};

type TabId = 'live' | 'overview' | 'agents' | 'preview' | 'config';

const DIAL_LOG_LABEL: Record<string, string> = {
  CONNECTED: 'Connected',
  ABANDONED: 'Abandoned',
  MACHINE: 'Machine',
  NO_ANSWER: 'No answer',
  BUSY: 'Busy',
  FAILED: 'Failed',
  CANCEL: 'Cancelled',
  DNC_SKIP: 'DNC skip',
  NO_CONSENT: 'No consent',
  HELD: 'Held',
  DIALING: 'Dialling',
  RINGING: 'Ringing',
  ANSWERED: 'Answered',
  OFFERING: 'Offering',
  /* The event kinds themselves, for rows the engine recorded before the call
     had an outcome. */
  DIAL: 'Dialling',
  RING: 'Ringing',
  ANSWER: 'Answered',
  OFFER: 'Offering',
  BRIDGE: 'Connected',
  END: 'Ended',
  ABANDON: 'Abandoned',
  SKIP: 'Skipped',
};
const DIAL_LOG_TONE: Record<string, string> = {
  CONNECTED: 'pos',
  ABANDONED: 'crit',
  MACHINE: 'warn',
  NO_ANSWER: 'neu',
  BUSY: 'neu',
  FAILED: 'crit',
  CANCEL: 'neu',
  DNC_SKIP: 'crit',
  NO_CONSENT: 'warn',
  HELD: 'neu',
  DIALING: 'neu',
  RINGING: 'warn',
  ANSWERED: 'warn',
  OFFERING: 'warn',
  DIAL: 'neu',
  RING: 'warn',
  ANSWER: 'warn',
  OFFER: 'warn',
  BRIDGE: 'pos',
  END: 'neu',
  ABANDON: 'crit',
  SKIP: 'warn',
};
/* Event kinds that are about one call rather than about the campaign. */
const CALL_EVENT_KINDS = ['dial', 'ring', 'answer', 'offer', 'bridge', 'end', 'abandon', 'skip'];

/** What a dial-log row is called, whether it has an outcome yet or not. */
const logLabel = (row: any) =>
  DIAL_LOG_LABEL[String(row?.outcome || '').toUpperCase()] ||
  DIAL_LOG_LABEL[String(row?.kind || '').toUpperCase()] ||
  String(row?.outcome || row?.kind || '');

const logTone = (row: any) =>
  DIAL_LOG_TONE[String(row?.outcome || '').toUpperCase()] ||
  DIAL_LOG_TONE[String(row?.kind || '').toUpperCase()] ||
  'neu';

const secondsSince = (ts?: number | null) =>
  ts ? Math.max(0, Math.floor((Date.now() - ts) / 1000)) : 0;
const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const timeOf = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const ratePct = (value: unknown) => `${(Number(value || 0) * 100).toFixed(1)}%`;

const CampaignRecord = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const queryClient: any = useQueryClient();
  const { features } = useCompanyFeatures();
  const { user } = useUser();
  const { socketEventsManager } = useContext(SocketEvents);
  const campaignAccess = features?.plan_features?.campaign?.action;

  const [searchParams] = useSearchParams();
  const { campaignDetails, campaignId } = (state || {}) as any;
  /* Router state is lost on a reload or a pasted link; the id in the query
     string is not, and the board needs one to ask for anything at all. */
  const resolvedCampaignId =
    campaignId || campaignDetails?._id || searchParams.get('campaignId') || '';

  const [tab, setTab] = useState<TabId>('live');
  const [analytics, setAnalytics] = useState<any>(campaignDetails?.campaignAnalytics || {});
  const [live, setLive] = useState<any>(null);
  const [liveReceivedAt, setLiveReceivedAt] = useState<number>(0);
  const [, setClock] = useState(0);

  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['campaignDetail', resolvedCampaignId],
    queryFn: () => getCampaignDetail({ campaignId: resolvedCampaignId }),
    select: (data: any) => data?.data?.data?.result,
    enabled: Boolean(resolvedCampaignId),
    refetchOnWindowFocus: false,
  });
  const campaign = detail || campaignDetails || {};

  /* Inbound routing of the outgoing number: read the number's rule from the
     inventory so the page can say where calls go today and offer the switch. */
  const { data: inventoryRows = [], refetch: refetchInventory } = useQuery({
    queryKey: ['allNumbersListInInventory'],
    queryFn: () => allNumbersList({ page: 1, limit: 1000 }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
  });
  const [isRouting, setIsRouting] = useState(false);
  /* The number list can lag a moment behind a change just made here, so the
     page remembers what it just did until the list catches up. */
  const [routedOverride, setRoutedOverride] = useState<boolean | null>(null);
  const inboundNumber =
    campaign?.settings?.inbound?.did_number || (campaign?.callerId || [])[0] || '';
  const inboundDidRow = findDidRow(inventoryRows, inboundNumber);
  const routedFromList = Boolean(
    inboundDidRow && numberRoutedToCampaign(inboundDidRow, campaign || {}),
  );
  const routedHere = routedOverride ?? routedFromList;
  useEffect(() => {
    if (routedOverride !== null && routedFromList === routedOverride) setRoutedOverride(null);
  }, [routedFromList, routedOverride]);
  const toggleInboundRouting = async () => {
    if (!inboundDidRow) return;
    setIsRouting(true);
    try {
      if (routedHere) {
        await restoreNumberRouting(
          inboundDidRow,
          campaign?.settings?.inbound?.previous_business_hours || null,
        );
        setRoutedOverride(false);
        handleAlert({
          text: `+${String(inboundDidRow.did_number).replace(/^\+/, '')} follows its own rule again.`,
          type: 'success',
        });
      } else {
        await routeNumberToCampaign(inboundDidRow, campaign || {});
        setRoutedOverride(true);
        handleAlert({
          text: `Calls to +${String(inboundDidRow.did_number).replace(/^\+/, '')} now go to this team.`,
          type: 'success',
        });
      }
      await refetchInventory();
    } catch (error: any) {
      handleAlert({
        text:
          error?.response?.data?.error?.message ||
          error?.message ||
          'Could not change the number routing',
        type: 'error',
      });
    } finally {
      setIsRouting(false);
    }
  };

  const { mutate: refreshAnalytics, isPending: isRefreshing } = useMutation({
    mutationFn: campaignAnalytics,
    onSuccess: (response: any) => {
      const next = response?.data?.data?.result;
      if (next) setAnalytics(next);
    },
  });

  const { mutate: mutateStatus, isPending: isTogglingStatus } = useMutation({
    mutationFn: playPauseCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignDetail', resolvedCampaignId] });
      queryClient.invalidateQueries({ queryKey: ['getCampaignListForPreview'] });
      queryClient.invalidateQueries({ queryKey: ['campaignListForKpis'] });
    },
  });

  /* ── live feed from the dialer engine ─────────────────────────────── */
  useEffect(() => {
    if (!socketEventsManager || !resolvedCampaignId) return;
    const onLive = (payload: any) => {
      if (String(payload?.campaignId) !== String(resolvedCampaignId)) return;
      setLive(payload);
      setLiveReceivedAt(Date.now());
    };
    const onAnalytics = (payload: any) => {
      if (String(payload?.campaignId) !== String(resolvedCampaignId)) return;
      refreshAnalytics({ campaignId: resolvedCampaignId });
      /* The engine recomputed the snapshot because a call ended: the leads
         and the call log have moved too. */
      queryClient.invalidateQueries({ queryKey: ['campaignOutcomeStates', resolvedCampaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaignCallHistory', resolvedCampaignId] });
    };
    const onState = (payload: any) => {
      if (String(payload?._id) !== String(resolvedCampaignId)) return;
      queryClient.invalidateQueries({ queryKey: ['campaignDetail', resolvedCampaignId] });
    };
    socketEventsManager.on('campaign-live-stats', onLive);
    socketEventsManager.on('campaign-analytics-updated', onAnalytics);
    socketEventsManager.on('campaign-state-update', onState);
    /* Ask once for the current board rather than waiting for the next push.
       The campaign document is not always loaded when this runs, and asking
       with no domain is what filled campaign-api's error log with 422
       "Missing or invalid domain" - so fall back to the viewer's own domain,
       and if even that is unknown, wait for the push instead. */
    const domain = campaign?.domain || user?.sip_credentials?.domain || user?.user_info?.domain;
    if (domain) {
      socketEventsManager.emit('campaign-live-calls', {
        domain,
        company_uuid: campaign?.company_uuid || user?.company_info?.uuid,
      });
    }
    return () => {
      socketEventsManager.off('campaign-live-stats', onLive);
      socketEventsManager.off('campaign-analytics-updated', onAnalytics);
      socketEventsManager.off('campaign-state-update', onState);
    };
  }, [
    socketEventsManager,
    resolvedCampaignId,
    campaign?.domain,
    campaign?.company_uuid,
    queryClient,
    refreshAnalytics,
  ]);

  useEffect(() => {
    if (resolvedCampaignId) refreshAnalytics({ campaignId: resolvedCampaignId });
  }, [resolvedCampaignId, refreshAnalytics]);

  /* The engine's board asked for directly, not waited for.
     The socket push is the fast path, but it only arrives every few seconds
     and only while this browser is in the tenant's room - a page opened in
     between, or with the room never joined, showed an empty Live tab for a
     running campaign. A 404 means the engine is not holding this campaign,
     which is an answer: the board simply stops refreshing and the page falls
     back to what was stored. */
  const { data: restBoard, isError: noLiveBoard } = useLiveSnapshot(
    resolvedCampaignId,
    String(campaign?.campaignStatus).toUpperCase() === 'PROCESSING',
  );
  useEffect(() => {
    if (noLiveBoard || !restBoard) return;
    setLive((current: any) =>
      current && num(current.updatedAt) > num(restBoard.updatedAt) ? current : restBoard,
    );
    setLiveReceivedAt(Date.now());
  }, [restBoard, noLiveBoard]);

  // Timers on the live rows tick once a second.
  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const outcomes = useMemo(() => readOutcomes(analytics), [analytics]);
  const { assigned, answered, noAnswer, dnc, dialed } = outcomes;

  const members: any[] = useMemo(() => {
    const raw = campaign?.members;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
      if (!Array.isArray(parsed)) return [];
      return Array.from(new Map(parsed.map((m: any) => [m?.user_uuid || m?.uuid, m])).values());
    } catch {
      return [];
    }
  }, [campaign?.members]);

  const dispositions: any[] = Array.isArray(campaign?.agentDisposition)
    ? campaign.agentDisposition
    : [];
  /* The leads store the disposition by NAME, which is what the lead query
     filters on, so the mix is counted by name. */
  const dispositionNames: string[] = useMemo(
    () =>
      Array.from(
        new Set(
          dispositions
            .map((item: any) => String(item?.disposition?.name || item?.name || '').trim())
            .filter(Boolean),
        ),
      ),
    [dispositions],
  );
  const callerIds: string[] = Array.isArray(campaign?.callerId) ? campaign.callerId : [];
  const dialer = campaign?.dialerSetting || {};
  const isRunning = String(campaign?.campaignStatus).toUpperCase() === 'PROCESSING';
  const mode = DIAL_METHOD_LABEL[campaign?.dialMethod];
  const paced = hasPacingControls(campaign?.dialMethod);

  const liveIsFresh = Boolean(live) && Date.now() - liveReceivedAt < 30000;
  /* An inbound line that is healthy is receiving calls, not "dialling normally". */
  const health = live?.health?.state
    ? String(campaign?.dialMethod).toUpperCase() === 'INBOUND' && live.health.state === 'running'
      ? { label: 'Receiving calls', tone: 'good' as const }
      : HEALTH_LABEL[live.health.state]
    : null;
  const liveCalls: any[] = Array.isArray(live?.calls?.rows) ? live.calls.rows : [];
  const activeCalls = liveCalls.filter((c) => c?.status !== 'ended');
  const recentEnded = liveCalls.filter((c) => c?.status === 'ended');
  const liveAgents: any[] = Array.isArray(live?.agents?.rows) ? live.agents.rows : [];
  const events: any[] = Array.isArray(live?.events) ? live.events : [];
  /* One row per placed call or skipped lead, newest first, plus the calls
     still up (so a ringing contact shows before its outcome exists). */
  const dialLog: any[] = useMemo(() => {
    /* Every event that concerns a call, not only the ones that carry a contact
       name. The old filter kept `phone || contactName`, and the engine only
       attaches those to a bridge, an end and a skip - so a call that was
       ringing, or answered and waiting for an agent, was recorded and then
       hidden. The log is meant to be the account of the run; if the engine
       said something happened to a call, it belongs here. */
    const ended = events.filter((e) => CALL_EVENT_KINDS.includes(String(e?.kind || '')));
    const inFlight = liveCalls
      .filter((c) => c?.status !== 'ended')
      .map((c) => ({
        ts: c.dialedAt,
        kind: c.status,
        contactName: c.contactName,
        phone: c.phone,
        outcome: c.status === 'talking' ? 'CONNECTED' : String(c.status || '').toUpperCase(),
        detail:
          c.status === 'talking'
            ? `with ${c.agentName || c.agentExtension || 'an agent'}`
            : c.attempt
              ? `attempt ${c.attempt}${c.maxAttempts ? '/' + c.maxAttempts : ''}`
              : '',
      }));
    return [...inFlight, ...ended].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 60);
  }, [events, liveCalls]);
  const run = live?.run || {};
  const leads = live?.leads || null;
  const targetAbandon = Number(dialer?.target_abandon_rate ?? 3);
  const abandonPct = Number(run?.abandonRate || 0) * 100;
  const abandonOver = abandonPct > targetAbandon;

  /* ── the three sources that do not need the engine ────────────────────
     The live board exists only while the dialer holds the campaign in
     memory, which is a small part of a campaign's life. Everything below is
     read from what the platform stored: the leads themselves and the call
     log. The page uses the board when it is there and these when it is not,
     so no panel is ever empty just because nothing is dialling. */
  /* The window is the campaign's run in the campaign's own zone: from its
     start to today, or to the day it finished once it has (row #12, 9 Sep:
     the card read "to today · Asia/Calcutta" for a New York campaign).
     Not called `window`: that shadows the global inside this component. */
  const reportRange = useMemo(
    () =>
      reportWindow({
        startDate: campaign?.startDate,
        endDate: campaign?.endDate,
        campaignStatus: campaign?.campaignStatus,
        updatedAt: campaign?.updatedAt,
        timezone: campaign?.timezone,
      }),
    [campaign?.startDate, campaign?.endDate, campaign?.campaignStatus, campaign?.updatedAt, campaign?.timezone],
  );
  const timezone = reportRange.timezone;
  /* Re-read every half minute while the campaign runs. Both used to be read
     once, when the page opened, and never again: the contact list still said
     "Dialled, no answer 1" for a lead the leads themselves had counted as
     answered for two minutes, and the call-log card was one call behind the
     header. Stopped campaigns are read once. */
  const storedRefreshSeconds = isRunning ? 30 : 0;
  const { states } = useCampaignStates(resolvedCampaignId, storedRefreshSeconds);
  const { data: history, isLoading: isHistoryLoading } = useCampaignHistory({
    campaignId: resolvedCampaignId,
    from: reportRange.from,
    to: reportRange.to,
    timezone,
    abandonCapPercent: targetAbandon,
    refreshEverySeconds: storedRefreshSeconds,
  });
  /* And the moment the campaign changes state (paused, completed, started
     again) both are re-read, so a completed page shows the finished run at
     once rather than the last reading of the running one. */
  const campaignStatusForRefresh = String(campaign?.campaignStatus || '').toUpperCase();
  useEffect(() => {
    if (!resolvedCampaignId || !campaignStatusForRefresh) return;
    queryClient.invalidateQueries({ queryKey: ['campaignOutcomeStates', resolvedCampaignId] });
    queryClient.invalidateQueries({ queryKey: ['campaignCallHistory', resolvedCampaignId] });
  }, [campaignStatusForRefresh, queryClient, resolvedCampaignId]);

  /* Lead counts from the leads, call counts from the call log. Neither comes
     from the stored analytics snapshot, which is only as fresh as the last
     time something asked it to recompute. */
  const leadTotal = num(states?.totalCall) || assigned;
  const leadDialed = num(states?.DialedCall) || dialed;
  const leadDnc = num(states?.dnc) || dnc;
  /* "Still callable" is the server's own count of leads that are scheduled,
     in progress or booked for a callback and not DNC - the same test that
     keeps a campaign running. It used to be total minus dialled minus DNC,
     which read 0 for a lead that had been reached once and is due to be
     tried again, while the agent's card said the opposite. */
  const leadRemaining = states
    ? num(states.PendingCall)
    : Math.max(0, leadTotal - leadDialed - leadDnc);
  const leadWorked = Math.max(0, leadTotal - leadRemaining);
  const historyCalls = num(history?.totals?.calls);
  const historyAnswered = num(history?.totals?.answered);
  const leadAnswered = states ? num(states.connected) : answered;
  const leadNoAnswer = states ? num(states.DialedButNotAnswered) : noAnswer;
  /* The donut takes the same shape the stored snapshot has, filled with the
     counts just read from the leads. One drawing, one source. */
  const outcomeAnalytics = states
    ? {
        assignedLeads: leadTotal,
        dialedLeads: leadDialed,
        answeredLeads: leadAnswered,
        totalCallNotAnswered: leadNoAnswer,
        totalDnc: leadDnc,
        pendingLeads: leadRemaining,
      }
    : analytics;

  const KPI_CARDS = liveIsFresh
    ? [
        {
          key: 'remaining',
          label: 'Remaining',
          value: fmt(leads?.pending),
          sub: `contacts still to call · ${num(leads?.progressPct)}% done`,
        },
        /* The engine's run counters are a ROLLING 30-DAY window, not this
           run: it seeds them from the call log every fifteen minutes so a
           restart cannot reset the abandon rate and let the dialer over-dial.
           Every card that reads them says so, because "Attempted 1" under a
           dial log that says "nothing dialled yet" is otherwise a puzzle. */
        {
          key: 'attempted',
          label: 'Attempted',
          value: fmt(run?.dialed),
          /* "In flight" counts every call the board has up, an agent's own
             preview dial included; linesInUse counts only the engine's lines
             and read 0 while an agent was talking. */
          sub: `${fmt(activeCalls.length)} in flight now · 30 days`,
        },
        {
          key: 'connected',
          label: 'Connected',
          value: fmt(run?.bridged),
          sub: `${ratePct(run?.connectRate)} connect rate · 30 days`,
          tone: 'good' as const,
        },
        {
          key: 'noanswer',
          label: 'No answer',
          value: fmt(run?.noAnswer),
          sub: `${fmt(run?.busy)} busy · ${fmt(run?.failed)} failed`,
        },
        {
          key: 'machine',
          label: 'Machine',
          value: fmt(run?.machine),
          sub: 'answering machines · 30 days',
        },
        {
          key: 'skips',
          label: 'Skipped',
          value: fmt(run?.skipped),
          sub: `${fmt(leads?.dnc)} on the do-not-call list`,
          tone: num(run?.skipped) > 0 ? ('warnv' as const) : undefined,
        },
        {
          key: 'abandon',
          label: 'Abandon rate',
          value: paced ? `${abandonPct.toFixed(1)}%` : '—',
          sub: paced
            ? `cap ${targetAbandon}% · ${fmt(run?.abandoned)} abandoned`
            : String(campaign?.dialMethod).toUpperCase() === 'INBOUND'
              ? `${fmt(run?.abandoned)} hung up before an agent answered`
              : 'preview calls cannot abandon',
          tone: paced ? (abandonOver ? ('warnv' as const) : ('good' as const)) : undefined,
        },
        ...(String(campaign?.dialMethod).toUpperCase() === 'PREDICTIVE'
          ? [
              {
                key: 'ahead',
                label: 'Dialling ahead',
                value: run?.belowPredictiveFloor ? 'paused' : `${Number(run?.callsPerAgent || 1).toFixed(1)}×`,
                sub: run?.belowPredictiveFloor
                  ? 'too few agents active; one call per free agent'
                  : `${fmt(run?.soonFreeAgents)} about to be free · answers in ~${fmt(run?.avgAnswerSec)}s · ~${fmt(run?.avgHandleSec)}s per call`,
                tone: run?.belowPredictiveFloor ? ('warnv' as const) : undefined,
              },
            ]
          : []),
        {
          key: 'agents',
          label: 'Agents',
          value: `${fmt(live?.agents?.idle)}/${fmt(live?.agents?.total)}`,
          sub: `available · ${fmt(live?.agents?.onCall)} on call · ${fmt(live?.agents?.wrapUp)} wrapping up`,
          tone: num(live?.agents?.idle) === 0 && isRunning ? ('warnv' as const) : undefined,
        },
      ]
    : /* Not dialling this second. The same eight questions, answered from the
         leads and the call log instead of the engine, so the strip keeps its
         shape and nobody has to learn a second layout. */
      [
        {
          key: 'remaining',
          label: 'Remaining',
          value: fmt(leadRemaining),
          sub: `contacts still to call · ${pct(leadWorked, leadTotal)}% done`,
        },
        /* One reading: the tiles count LEADS, the same counts the contact
           list and the Outcomes bar draw, and the call-log figures sit in
           the sub-line as calls. Connected used to be a call count next to an
           Attempted lead count, so a completed campaign said "Attempted 3 /
           Connected 2" over a contact list of one lead (row #12, 9 Sep). */
        {
          key: 'attempted',
          label: 'Attempted',
          value: fmt(leadDialed),
          sub: `leads dialled · ${fmt(historyCalls)} calls placed in the run`,
        },
        {
          key: 'connected',
          label: 'Connected',
          value: fmt(leadAnswered),
          sub: `leads answered · ${fmt(historyAnswered)} calls, ${rate(historyAnswered, historyCalls)}% of placed`,
          tone: 'good' as const,
        },
        {
          key: 'noanswer',
          label: 'No answer',
          value: fmt(leadNoAnswer),
          sub: `leads not reached · ${fmt(history?.totals?.noAnswer)} no-answer, ${fmt(history?.totals?.busy)} busy calls`,
        },
        {
          key: 'machine',
          label: 'Machine',
          value: fmt(history?.totals?.machine),
          sub: 'answering machines',
        },
        {
          key: 'dnc',
          label: 'Do not call',
          value: fmt(states?.dnc ?? dnc),
          sub: 'leads the dialer will not ring',
          tone: num(states?.dnc ?? dnc) > 0 ? ('warnv' as const) : undefined,
        },
        {
          key: 'abandon',
          label: 'Abandon rate',
          value: paced ? `${num(history?.totals?.abandonRatePercent).toFixed(1)}%` : '—',
          sub: paced
            ? `cap ${targetAbandon}% · ${fmt(history?.totals?.abandoned)} abandoned`
            : 'preview calls cannot abandon',
          tone: paced
            ? num(history?.totals?.abandonRatePercent) > targetAbandon
              ? ('warnv' as const)
              : ('good' as const)
            : undefined,
        },
        {
          key: 'agents',
          label: 'Agents',
          value: String(members.length),
          sub: members.length ? 'assigned to this campaign' : 'unassigned',
        },
      ];

  const isPreviewCampaign = String(campaign?.campaignType || campaign?.dialMethod || '').toUpperCase() === 'PREVIEW';
  const TABS: Array<[TabId, string, any, number | null]> = [
    ['live', 'Live', 'bolt', activeCalls.length || null],
    ['overview', 'Outcomes', 'chart', null],
    ['agents', 'Agents', 'users', liveIsFresh ? liveAgents.length : members.length],
    ...(isPreviewCampaign ? ([['preview', 'Preview', 'clock', null]] as Array<[TabId, string, any, number | null]>) : []),
    ['config', 'Configuration', 'sliders', null],
  ];

  const healthTone =
    health?.tone === 'good'
      ? 'pos'
      : health?.tone === 'crit'
        ? 'neg'
        : health?.tone === 'warn'
          ? 'warn'
          : 'neu';

  return (
    <div className="mcm-page cmp">
      <McmIconSprite />
      <div className="page">
        <div className="page-head">
          <div>
            {/* The campaign's name, not its database id. A 24-character hex
                string tells a reader nothing and is the first thing they see
                on the page. */}
            <Crumb
              onBack={() => navigate(-1)}
              label="Campaigns"
              trail={capitalizeFirstLetter(campaign?.name) || resolvedCampaignId}
            />
            <h1>{capitalizeFirstLetter(campaign?.name) || 'Campaign'}</h1>
            <p>
              {mode ? <span className="tag neu">{mode}</span> : null}{' '}
              {campaign?.startDate
                ? `${convertDateFormateApis(campaign?.startDate, 'DD MMM YYYY')} – ${convertDateFormateApis(campaign?.endDate, 'DD MMM YYYY')}`
                : 'No campaign window set'}
              {campaign?.description ? ` · ${campaign.description}` : ''}
            </p>
            {/* Inbound routing only. `inboundNumber` falls back to the
                campaign's caller ID, so on a Preview or Progressive campaign
                this printed "<caller id> is not in the inventory, so it cannot
                be re-routed here" - a warning about receiving calls, on a
                campaign that only makes them. It read as a fault on a healthy
                campaign. */}
            {inboundNumber && String(campaign?.dialMethod).toUpperCase() === 'INBOUND' ? (
              <p style={{ marginTop: 6 }}>
                {String(campaign?.dialMethod).toUpperCase() === 'INBOUND' ? (
                  <span className={`tag ${routedHere ? 'pos' : 'warn'}`} style={{ marginRight: 8 }}>
                    {routedHere ? 'Receiving calls' : 'Number not routed here'}
                  </span>
                ) : null}
                {routedHere
                  ? `Calls to ${inboundNumber} go to this campaign's team.`
                  : inboundDidRow
                    ? `Calls to ${inboundNumber} follow the number's own rule.`
                    : `${inboundNumber} is not in the inventory, so it cannot be re-routed here.`}{' '}
                {inboundDidRow && campaign?.queue_uuid ? (
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={isRouting}
                    onClick={toggleInboundRouting}
                  >
                    {isRouting
                      ? 'Working…'
                      : routedHere
                        ? 'Put the number back'
                        : 'Send its calls to this team'}
                  </button>
                ) : null}
              </p>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {liveIsFresh && health ? (
              <span className={`tag ${healthTone}`} title={live?.health?.reason || ''}>
                {health.tone === 'good' ? <span className="dot green" /> : null}
                {health.label}
              </span>
            ) : (
              <StatusPill status={campaign?.campaignStatus} dialMethod={campaign?.dialMethod} />
            )}
            {String(campaign?.pausedBy || '').toUpperCase() === 'HOURS' && (
              <span className="text-xs text-amber-700" title={campaign?.pausedReason || ''}>
                Stopped by calling hours
                {campaign?.pausedReason ? `: ${String(campaign.pausedReason).replace(/\.$/, '')}` : ''}
                {campaign?.timezone ? ` (${campaign.timezone})` : ''}. Starts again on its own when
                they open.
              </span>
            )}
            {campaignAccess?.pause && String(campaign?.dialMethod).toUpperCase() !== 'INBOUND' && (
              <button
                type="button"
                className={`btn ${isRunning ? 'ghost' : 'primary'} sm`}
                disabled={isTogglingStatus}
                onClick={() =>
                  mutateStatus({
                    campaignId: resolvedCampaignId,
                    campaignStatus: isRunning ? 'PAUSE' : 'PROCESSING',
                  })
                }
              >
                <Ic n={isRunning ? 'pause' : 'play'} size={13} />
                {isTogglingStatus ? 'Working…' : isRunning ? 'Pause' : 'Start campaign'}
              </button>
            )}
            <button
              type="button"
              className="btn ghost sm"
              disabled={isRefreshing || !resolvedCampaignId}
              onClick={() =>
                resolvedCampaignId && refreshAnalytics({ campaignId: resolvedCampaignId })
              }
            >
              <Ic n="refresh" size={13} className={isRefreshing ? 'pulsing' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {liveIsFresh && live?.health?.reason ? (
          <div
            className={`attn${health?.tone === 'crit' ? ' crit' : health?.tone === 'warn' ? ' warn' : ''}`}
          >
            <span className="attn-ic">
              <Ic n={health?.tone === 'good' ? 'bolt' : 'alert'} size={14} />
            </span>
            <div>
              <div className="attn-t">{health?.label}</div>
              <div className="attn-d">
                {live.health.reason}
                {live?.window && !live.window.open ? ` ${live.window.reason}` : ''}
                {Array.isArray(live?.notes) && live.notes.length ? ` ${live.notes.join(' ')}` : ''}
              </div>
            </div>
          </div>
        ) : null}

        <div className="kpis">
          {KPI_CARDS.map((kpi) => (
            <div className="kpi" key={kpi.key}>
              <div className="k">{kpi.label}</div>
              <div className={`v num${kpi.tone ? ` ${kpi.tone}` : ''}`}>{kpi.value}</div>
              <div className="d">{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div className="ptabstrip">
          {TABS.map(([id, label, icon, count]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'on' : ''}
              onClick={() => setTab(id)}
            >
              <Ic n={icon} size={15} />
              <span>{label}</span>
              {count ? <span className="cnt num">{count}</span> : null}
            </button>
          ))}
        </div>

        {/* ── live ─────────────────────────────────────────────────── */}
        {tab === 'live' && (
          <>
            {!liveIsFresh ? (
              /* No engine board. That is the normal state for a campaign that
                 is not dialling this second, and it used to leave this tab
                 with a single grey box on it. The campaign's own record is
                 still here: what its leads did, and every call it placed. */
              <>
                <div className="grid2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <CampaignWindowSummary
                      history={history}
                      isLoading={isHistoryLoading}
                      cap={targetAbandon}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <CampaignContactBreakdown states={states} />
                    <CampaignNumberTable history={history} />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <CampaignLeadTable campaignId={resolvedCampaignId} />
                </div>
              </>
            ) : (
              <>
                <div className="panel-card" style={{ marginBottom: 14 }}>
                  <div className="pc-head">
                    <h3>Live dial log</h3>
                    <span className="src live pc-right">
                      <Ic n="spark" size={10} />
                      live · {secondsSince(liveReceivedAt)}s ago
                    </span>
                  </div>
                  {dialLog.length ? (
                    <div className="tbl-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 80 }}>Time</th>
                            <th>Contact</th>
                            <th style={{ width: 160 }}>Number</th>
                            <th style={{ width: 130 }}>Outcome</th>
                            <th>Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dialLog.map((row, index) => (
                            <tr key={`${row.ts}-${index}`}>
                              <td className="num">{timeOf(row.ts)}</td>
                              <td>
                                {/* The engine names the contact in the event
                                    text when it has no separate name field, so
                                    a row is never just "Unknown". */}
                                <strong>{row.contactName || row.text || 'Unknown'}</strong>
                              </td>
                              <td className="num">
                                {/* The switch logs the number as it left for the
                                    carrier - routing prefix and all - so it is
                                    undone before anyone reads it. */}
                                {normalizeCallNumber(row.phone) || '—'}
                              </td>
                              <td>
                                <span className={`tag ${logTone(row)}`}>{logLabel(row)}</span>
                              </td>
                              <td style={{ color: 'var(--ink-3)' }}>
                                {row.detail || (row.contactName ? row.text : '')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">
                      <Ic n="phone" />
                      <b>Nothing dialled yet this run</b>
                      <p>
                        {paced
                          ? 'Every call the dialer places appears here as it is placed: who, which number, how it ended.'
                          : 'Calls agents place from their own screens appear here as the switch reports them.'}
                      </p>
                    </div>
                  )}
                  {!paced ? (
                    <div className="pc-foot">
                      This campaign is dialled by its agents, so every row here comes from what the
                      switch reports about their calls.
                    </div>
                  ) : null}
                </div>
                <div className="grid2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="panel-card">
                      <div className="pc-head">
                        <h3>Calls in flight</h3>
                        <span className="src live pc-right">
                          <Ic n="spark" size={10} />
                          live · {secondsSince(liveReceivedAt)}s ago
                        </span>
                      </div>
                      {activeCalls.length ? (
                        <div className="tbl-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Contact</th>
                                <th style={{ width: 200 }}>State</th>
                                <th style={{ width: 150 }}>Agent</th>
                                <th style={{ width: 70 }}>For</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeCalls.map((call) => (
                                <tr key={call.key}>
                                  <td>
                                    <strong>{call.contactName || 'Unknown'}</strong>
                                    <div
                                      className="num"
                                      style={{ color: 'var(--ink-3)', fontSize: 11.5 }}
                                    >
                                      {normalizeCallNumber(call.phone)}
                                      {call.origin === 'agent' ? ' · agent dialled' : ''}
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      className={`tag ${call.status === 'talking' ? 'pos' : call.status === 'answered' ? 'warn' : 'neu'}`}
                                    >
                                      {call.status === 'talking' || call.status === 'ringing' ? (
                                        <span className="dot green" />
                                      ) : null}
                                      {CALL_STATUS_LABEL[call.status] || call.status}
                                    </span>
                                  </td>
                                  <td>
                                    {call.agentName || call.agentExtension || (
                                      <span style={{ color: 'var(--ink-4)' }}>—</span>
                                    )}
                                  </td>
                                  <td className="num">
                                    {mmss(
                                      secondsSince(
                                        call.status === 'talking' ? call.bridgedAt : call.dialedAt,
                                      ),
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty">
                          <Ic n="phone" />
                          <b>No calls up right now</b>
                          <p>
                            {live?.health?.reason ||
                              'The next call appears here the moment it is placed.'}
                          </p>
                        </div>
                      )}
                      {recentEnded.length ? (
                        <div className="pc-foot">
                          Just finished:{' '}
                          {recentEnded.slice(-4).map((call) => (
                            <span className="tag neu" key={call.key}>
                              {call.contactName || normalizeCallNumber(call.phone)} ·{' '}
                              {OUTCOME_LABEL[call.outcome] || call.outcome}
                              {call.talkSec ? ` ${mmss(call.talkSec)}` : ''}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="panel-card">
                      <div className="pc-head">
                        <h3>Dialling activity</h3>
                        <span className="src pc-right">
                          last 30 days · engine up since {timeOf(live?.startedAt || Date.now())}
                        </span>
                      </div>
                      <div className="pc-body tight">
                        <div className="kv">
                          <span className="k">Dialled</span>
                          <span className="v num">{fmt(run?.dialed)}</span>
                        </div>
                        <div className="kv">
                          <span className="k">Answered</span>
                          <span className="v num">{fmt(run?.answeredLive)}</span>
                        </div>
                        <div className="kv">
                          <span className="k">Reached an agent</span>
                          <span className="v num">{fmt(run?.bridged)}</span>
                        </div>
                        <div className="kv">
                          <span className="k">Abandoned before an agent</span>
                          <span className={`v num${num(run?.abandoned) ? ' warnv' : ''}`}>
                            {fmt(run?.abandoned)}
                          </span>
                        </div>
                        <div className="kv">
                          <span className="k">
                            Waited over {num(dialer?.compliance_abandon_seconds ?? 2)}s for an agent
                          </span>
                          <span className="v num">{fmt(run?.complianceAbandoned)}</span>
                        </div>
                        <div className="kv">
                          <span className="k">No answer</span>
                          <span className="v num">{fmt(run?.noAnswer)}</span>
                        </div>
                        <div className="kv">
                          <span className="k">Busy</span>
                          <span className="v num">{fmt(run?.busy)}</span>
                        </div>
                        <div className="kv">
                          <span className="k">Failed</span>
                          <span className="v num">{fmt(run?.failed)}</span>
                        </div>
                      </div>
                      <div className="pc-foot">
                        Counted over the last 30 days from the campaign call log, re-read every
                        fifteen minutes — which is what keeps the abandon rate honest across a
                        restart. Skipped and the compliance count are from the engine itself and
                        cover the period since that last read.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="panel-card">
                      <div className="pc-head">
                        <h3>Contact list</h3>
                        <span className="tag neu num">{num(leads?.progressPct)}% done</span>
                      </div>
                      <div className="pc-body">
                        <div className="bar" style={{ marginBottom: 10 }}>
                          <i style={{ width: `${num(leads?.progressPct)}%` }} />
                        </div>
                        <BreakdownRow
                          label="Due now"
                          value={num(leads?.due)}
                          total={num(leads?.total)}
                          colour="var(--live)"
                        />
                        <BreakdownRow
                          label="Being dialled"
                          value={num(leads?.inProgress)}
                          total={num(leads?.total)}
                          colour="var(--warn)"
                        />
                        <BreakdownRow
                          label="Retry later"
                          value={num(leads?.future)}
                          total={num(leads?.total)}
                          colour="var(--surface-3)"
                        />
                        <BreakdownRow
                          label="Callbacks due"
                          value={num(leads?.callbacks)}
                          total={num(leads?.total)}
                          colour="var(--accent)"
                        />
                        <BreakdownRow
                          label="Completed"
                          value={num(leads?.completed)}
                          total={num(leads?.total)}
                          colour="var(--ink-4)"
                        />
                        <BreakdownRow
                          label="Attempts used up"
                          value={num(leads?.exhausted)}
                          total={num(leads?.total)}
                          colour="var(--crit)"
                        />
                        <BreakdownRow
                          label="Do not call"
                          value={num(leads?.dnc)}
                          total={num(leads?.total)}
                          colour="var(--crit)"
                        />
                      </div>
                    </div>

                    <div className="panel-card">
                      <div className="pc-head">
                        <h3>What just happened</h3>
                      </div>
                      <div className="pc-body tight" style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {events.length ? (
                          events.map((event, index) => (
                            <div className="kv" key={`${event.ts}-${index}`}>
                              <span className="k num" style={{ minWidth: 70 }}>
                                {timeOf(event.ts)}
                              </span>
                              <span
                                className="v"
                                style={{
                                  fontWeight: event.kind === 'abandon' ? 800 : 600,
                                  color: event.kind === 'abandon' ? 'var(--crit)' : undefined,
                                }}
                              >
                                {event.text}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="src">Nothing yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── outcomes ─────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="grid2">
            <div className="panel-card">
              <div className="pc-head">
                <h3>Contact outcomes</h3>
                <span className="src pc-right">
                  {isRefreshing ? 'refreshing…' : 'updates after every call'}
                </span>
              </div>
              <div
                className="pc-body"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
              >
                {leadTotal ? (
                  <>
                    <OutcomeDonut analytics={outcomeAnalytics} />
                    <div style={{ textAlign: 'center' }}>
                      <div className="num" style={{ fontSize: 15, fontWeight: 800 }}>
                        {fmt(leadDialed)}{' '}
                        <span style={{ color: 'var(--ink-4)', fontWeight: 600 }}>
                          of {fmt(leadTotal)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>
                        {fmt(leadRemaining)} records still callable
                      </div>
                    </div>
                    <div style={{ width: '100%' }}>
                      <BreakdownRow
                        label="Answered"
                        value={leadAnswered}
                        total={leadTotal}
                        colour="var(--live)"
                      />
                      <BreakdownRow
                        label="No answer"
                        value={leadNoAnswer}
                        total={leadTotal}
                        colour="var(--warn)"
                      />
                      <BreakdownRow
                        label="DNC / blocked"
                        value={leadDnc}
                        total={leadTotal}
                        colour="var(--crit)"
                      />
                      <BreakdownRow
                        label="Pending"
                        value={leadRemaining}
                        total={leadTotal}
                        colour="var(--surface-3)"
                      />
                    </div>
                  </>
                ) : (
                  <div className="empty">
                    <Ic n="mega" />
                    <b>Nothing dialled yet</b>
                    <p>
                      This campaign has no lead outcomes to show. Once it starts dialling, the
                      breakdown appears here.
                    </p>
                  </div>
                )}
              </div>
              <div className="pc-foot">
                <OutcomeLegend />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="panel-card">
                <div className="pc-head">
                  <h3>Dialling policy</h3>
                </div>
                <div className="pc-body tight">
                  <div className="kv">
                    <span className="k">Max attempts per record</span>
                    <span className="v num">{num(dialer?.max_attempt_per_record) || '—'}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Retry period</span>
                    <span className="v num">
                      {dialer?.default_retry_period
                        ? `${dialer.default_retry_period} ${RETRY_UNIT_LABEL[dialer?.default_retry_period_type] || ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="kv">
                    <span className="k">Wrap-up time</span>
                    <span className="v num">
                      {dialer?.wrapup_time ? `${dialer.wrapup_time}s` : '—'}
                    </span>
                  </div>
                  {paced ? (
                    <>
                      <div className="kv">
                        <span className="k">Line ceiling</span>
                        <span className="v num">{num(dialer?.max_lines) || 'none'}</span>
                      </div>
                      {String(campaign?.dialMethod).toUpperCase() === 'PREDICTIVE' ? (
                        <>
                          <div className="kv">
                            <span className="k">Max calls per agent</span>
                            <span className="v num">{num(dialer?.max_calls_per_agent) || 3}</span>
                          </div>
                          <div className="kv">
                            <span className="k">Abandon rate cap</span>
                            <span className="v num">{targetAbandon}%</span>
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  <div className="kv">
                    <span className="k">Answering machine detection</span>
                    <span className="v">
                      {dialer?.answering_detection_machine?.enabled ||
                      dialer?.answering_detection_machine?.enable ? (
                        <span className="tag warn">set, not enforced yet</span>
                      ) : (
                        <span className="tag neu">off</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {!paced ? (
                <div className="aicard">
                  <div className="ac-head">
                    <span className="ac-kind">
                      <Ic n="user" size={12} />
                      Preview campaign
                    </span>
                  </div>
                  <div className="ac-body">
                    Agents see each record first and place the call themselves, so there is no
                    pacing to tune and no risk of abandoned calls. The live tab still shows their
                    calls as they happen.
                  </div>
                </div>
              ) : null}
            </div>

            {/* Everything below is the campaign's own record: the calls it
                placed, day by day and number by number, what agents coded
                them as, and the leads themselves. None of it needs the
                campaign to be running. */}
            <CampaignWindowSummary
              history={history}
              isLoading={isHistoryLoading}
              cap={targetAbandon}
            />
            <CampaignDailyTable history={history} cap={targetAbandon} />
            <CampaignDispositionMix campaignId={resolvedCampaignId} names={dispositionNames} />
            <CampaignNumberTable history={history} />
            <div style={{ gridColumn: '1 / -1' }}>
              <CampaignLeadTable campaignId={resolvedCampaignId} />
            </div>
          </div>
        )}

        {/* ── agents ───────────────────────────────────────────────── */}
        {tab === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {liveIsFresh ? (
            <div className="kpis">
              {[
                ['Available', num(live?.agents?.idle), 'good'],
                ['On a call', num(live?.agents?.onCall), ''],
                ['Wrapping up', num(live?.agents?.wrapUp), ''],
                ['On a break', num(live?.agents?.onBreak), ''],
                ['Signed out', num(live?.agents?.offline), ''],
              ].map(([label, value, tone]: any) => (
                <div className="kpi" key={label}>
                  <div className="k">{label}</div>
                  <div className={`v num${tone ? ` ${tone}` : ''}`}>{fmt(value)}</div>
                  <div className="d">of {fmt(live?.agents?.total)} on the campaign</div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="panel-card">
            <div className="pc-head">
              <h3>Agents on this campaign</h3>
              {liveIsFresh ? (
                <span className="src live pc-right">
                  <Ic n="spark" size={10} />
                  live
                </span>
              ) : (
                <span className="tag neu num">{members.length}</span>
              )}
            </div>
            {liveIsFresh && liveAgents.length ? (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th style={{ width: 110 }}>Extension</th>
                      <th style={{ width: 150 }}>Now</th>
                      <th>On the line with</th>
                      <th style={{ width: 100 }}>For</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveAgents.map((agent: any, index: number) => (
                      <tr key={agent?.userUuid || agent?.extension || index}>
                        <td>
                          <strong>{agent?.name || 'Unknown'}</strong>
                        </td>
                        <td className="num">{agent?.extension || '—'}</td>
                        <td>
                          <span
                            className={`tag ${agent?.duty === 'idle' ? 'pos' : agent?.duty === 'on_call' ? 'acc' : agent?.duty === 'offline' ? 'neu' : 'warn'}`}
                          >
                            {agent?.duty === 'idle' ? <span className="dot green" /> : null}
                            {agentDutyLabel(agent)}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ink-3)' }}>
                          {agent?.callContact || agent?.callPhone
                            ? `${agent.callContact || ''} ${agent.callPhone ? `(${agent.callPhone})` : ''}`.trim()
                            : '—'}
                        </td>
                        <td className="num">
                          {agent?.since ? mmss(secondsSince(agent.since)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : members.length ? (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th style={{ width: 140 }}>Extension</th>
                      <th style={{ width: 180 }}>Role</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member: any, index: number) => {
                      const name =
                        member?.label ||
                        `${member?.first_name || ''} ${member?.last_name || ''}`.trim() ||
                        'Unknown';
                      return (
                        <tr key={member?.user_uuid || index}>
                          <td>
                            <strong>{name}</strong>
                          </td>
                          <td className="num">{member?.extension || '—'}</td>
                          <td>{member?.role ? capitalizeFirstLetter(member.role) : '—'}</td>
                          <td style={{ color: 'var(--ink-3)' }}>{member?.email || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <Ic n="users" />
                <b>No agents assigned</b>
                <p>Edit the campaign to add members before it can dial.</p>
              </div>
            )}
            <div className="pc-foot">
              {liveIsFresh
                ? 'Idle means signed in, available and past wrap-up: the dialer only places calls for idle agents.'
                : 'Live agent state (idle, on a call, wrapping up) shows here while the campaign runs.'}
            </div>
          </div>
          <CampaignAgentPerformance
            members={members}
            from={reportRange.from}
            to={reportRange.to}
            timezone={timezone}
          />
          </div>
        )}

        {/* ── configuration ────────────────────────────────────────── */}
        {tab === 'preview' && <CampaignPreviewTab campaignId={resolvedCampaignId} />}

        {tab === 'config' && (
          <div className="grid2">
            <CampaignSkillCoverageCard campaignId={resolvedCampaignId} />
            <div className="panel-card">
              <div className="pc-head">
                <h3>Targeting</h3>
              </div>
              <div className="pc-body tight">
                <div className="kv">
                  <span className="k">Dialing mode</span>
                  <span className="v">{mode || '—'}</span>
                </div>
                <div className="kv">
                  <span className="k">Lead groups</span>
                  <span className="v num">
                    {Array.isArray(campaign?.groupId) ? campaign.groupId.length : 0}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Caller IDs</span>
                  <span className="v num">{callerIds.length}</span>
                </div>
                <div className="kv">
                  <span className="k">Agent scripting</span>
                  <span className="v">
                    {campaign?.agentScripting ? (
                      <span className="tag pos">on</span>
                    ) : (
                      <span className="tag neu">off</span>
                    )}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Agents may skip records</span>
                  <span className="v">
                    {campaign?.allowSkipping ? (
                      <span className="tag pos">yes</span>
                    ) : (
                      <span className="tag neu">no</span>
                    )}
                  </span>
                </div>
                {liveIsFresh && live?.window ? (
                  <div className="kv">
                    <span className="k">Calling hours now</span>
                    <span className="v">
                      <span className={`tag ${live.window.open ? 'pos' : 'warn'}`}>
                        {live.window.open ? 'open' : 'closed'}
                      </span>{' '}
                      <span className="src">
                        {live.window.reason} ({live.window.timezone})
                      </span>
                    </span>
                  </div>
                ) : null}
              </div>
              {callerIds.length ? (
                <div className="pc-foot">
                  {callerIds.slice(0, 6).map((did) => (
                    <span className="tag acc num" key={did}>
                      {String(did).startsWith('+') ? did : `+${did}`}
                    </span>
                  ))}
                  {callerIds.length > 6 ? (
                    <span className="src">+{callerIds.length - 6} more</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="panel-card">
              <div className="pc-head">
                <h3>Schedule and retries</h3>
              </div>
              <div className="pc-body tight">
                <div className="kv">
                  <span className="k">Runs between</span>
                  <span className="v num">
                    {campaign?.startDate ? convertDateFormateApis(campaign.startDate, 'DD MMM YYYY') : '—'}
                    {' – '}
                    {campaign?.endDate ? convertDateFormateApis(campaign.endDate, 'DD MMM YYYY') : '—'}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Timezone</span>
                  <span className="v">{campaign?.timezone || '—'}</span>
                </div>
                <div className="kv">
                  <span className="k">Attempts per record</span>
                  <span className="v num">{num(dialer?.max_attempt_per_record) || '—'}</span>
                </div>
                <div className="kv">
                  <span className="k">Wait between attempts</span>
                  <span className="v num">
                    {dialer?.default_retry_period
                      ? `${dialer.default_retry_period} ${RETRY_UNIT_LABEL[dialer?.default_retry_period_type] || ''}`
                      : '—'}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Ring the contact for</span>
                  <span className="v num">
                    {num(dialer?.max_ring_time) ? `${num(dialer.max_ring_time)}s` : '—'}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Ring the agent for</span>
                  <span className="v num">
                    {num(dialer?.ringing_agent_time) ? `${num(dialer.ringing_agent_time)}s` : '—'}
                  </span>
                </div>
                {String(campaign?.dialMethod).toUpperCase() === 'PREVIEW' ? (
                  <div className="kv">
                    <span className="k">Preview time</span>
                    <span className="v num">
                      {num(dialer?.preview_time) ? `${num(dialer.preview_time)}s` : 'no limit'}
                    </span>
                  </div>
                ) : null}
                <div className="kv">
                  <span className="k">Wrap-up</span>
                  <span className="v num">
                    {num(dialer?.wrapup_time) ? `${num(dialer.wrapup_time)}s` : '—'}{' '}
                    <span className="src">
                      {String(dialer?.wrapup_mode || '')
                        .replace(/_/g, ' ')
                        .toLowerCase()}
                    </span>
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Leads held per agent</span>
                  <span className="v num">{num(dialer?.agent_contact_limit) || '—'}</span>
                </div>
              </div>
            </div>

            <div className="panel-card">
              <div className="pc-head">
                <h3>Compliance</h3>
              </div>
              <div className="pc-body tight">
                <div className="kv">
                  <span className="k">Only dial contacts with consent</span>
                  <span className="v">
                    {campaign?.require_consent ? (
                      <span className="tag pos">on</span>
                    ) : (
                      <span className="tag neu">off</span>
                    )}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Rotate caller ID</span>
                  <span className="v">
                    {campaign?.rotateCallerId ? (
                      <span className="tag pos">on</span>
                    ) : (
                      <span className="tag neu">off</span>
                    )}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">On the do-not-call list</span>
                  <span className="v num">{fmt(leadDnc)}</span>
                </div>
                {paced ? (
                  <>
                    <div className="kv">
                      <span className="k">Abandon cap</span>
                      <span className="v num">{targetAbandon}%</span>
                    </div>
                    <div className="kv">
                      <span className="k">Counts as abandoned after</span>
                      <span className="v num">
                        {num(dialer?.compliance_abandon_seconds ?? 2)}s waiting
                      </span>
                    </div>
                    <div className="kv">
                      <span className="k">Days over the cap in this window</span>
                      <span className={`v num${num(history?.daysOverCap) ? ' warnv' : ''}`}>
                        {fmt(history?.daysOverCap)}
                      </span>
                    </div>
                  </>
                ) : null}
                <div className="kv">
                  <span className="k">Call recording announcement</span>
                  <span className="v">
                    <span className="src">set on the queue, not the campaign</span>
                  </span>
                </div>
              </div>
              <div className="pc-foot">
                The abandon figures are the campaign call log for {reportRange.from} to {reportRange.to},
                measured the way the rule measures it: abandoned over calls a person answered.
              </div>
            </div>

            <div className="panel-card">
              <div className="pc-head">
                <h3>Dispositions</h3>
                <span className="tag neu num">{dispositions.length}</span>
              </div>
              {dispositions.length ? (
                <div className="pc-body tight">
                  {dispositions.map((item: any, index: number) => (
                    <div className="kv" key={item?._id || index}>
                      <span className="k">
                        {item?.disposition?.name || item?.name || 'Unnamed'}
                      </span>
                      <span className="v" style={{ color: 'var(--ink-3)', fontWeight: 600 }}>
                        {item?.disposition?.description || ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <Ic n="list" />
                  <b>No dispositions configured</b>
                  <p>Agents need at least one outcome code before the campaign can run.</p>
                </div>
              )}
              <div className="pc-foot">
                How often each one was used is on the Outcomes tab.
              </div>
            </div>
          </div>
        )}

        {isLoadingDetail && !detail ? (
          <div className="src" style={{ marginTop: 12 }}>
            Loading campaign configuration…
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CampaignRecord;
