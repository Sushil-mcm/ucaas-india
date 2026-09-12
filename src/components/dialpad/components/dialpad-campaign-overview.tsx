import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  getCampaignDetail,
  getDispositions,
  makeCallQueueAvailable,
  validateCampaignLeadAssignment,
} from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { campaignWindow, explainEmptyOffer } from '@/lib/campaign-window';
import { resolveCampaignDispositions, resolveSkipReasons } from '@/lib/campaign-skip-reasons';
import { useAgentDuty } from '@/hooks/use-agent-duty';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { cn, handleAlert } from '@/lib/utils';
import { AlertTriangle, Clock3, LoaderCircle, PhoneCall } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DialpadCampaignContactCard, {
  type CampaignContactCard,
  type CampaignSkipStatus,
} from './dialpad-campaign-contact-card';
import DialpadCountdownRingTimer from './dialpad-countdown-ring-timer';
import { getHeaderFirstValue } from '../session-display';

import { isServerDialed } from '@/lib/campaign-dial-mode';
import { nextOfferDelayMs, resolveCampaignTimer } from '@/lib/campaign-timers';
import { useCampaignTimers } from '@/hooks/use-campaign-timers';
type DialpadScreenState = 'idle' | 'ringing' | 'connected' | 'ended';

type DialpadCampaignOverviewProps = {
  campaignContactCards: CampaignContactCard[] | null;
  dialpadScreen: DialpadScreenState;
  /* The floating dialer is a fixed 360-430px box with nothing below the
     campaign bar, so its lead card has to float above the bar to be seen at
     all. The full-page campaign dialer has a whole column to work with, and
     there that same float lands on top of the keypad and the sentiment
     gauges. Only the cramped case gets the overlay. */
  fullPage?: boolean;
};

const CAMPAIGN_OVERVIEW_ACCORDION_VALUE = 'campaign-overview';
const DEFAULT_PREVIEW_TIMER_KEY = 'campaign-preview-timer';
/* The wait after a call and the poll interval for an empty campaign are no
   longer constants here: they come from the campaign (dialerSetting.
   wait_after_call, falling back to the company default) and from the company
   (contact_retry) - see src/lib/campaign-timers.ts and Company › Campaign
   timers. The two below are UI settle delays - the moment the next card is
   allowed to appear after a skip - not timers an admin tunes, and stay put. */
const PROGRESSIVE_SKIP_NEXT_CONTACT_DELAY_MS = 10000;
const PREVIEW_SKIP_NEXT_CONTACT_DELAY_MS = 1500;
/* A live board older than this is a leftover, not the present: the engine
   pushes every few seconds while it holds a campaign and never again once
   the campaign has finished. */
const LIVE_BOARD_MAX_AGE_MS = 30000;

const isCampaignSkippingAllowed = (campaign: any) =>
  campaign?.allowSkipping === true || String(campaign?.allowSkipping).toLowerCase() === 'true';

const getCampaignPayload = (response: any) =>
  Array.isArray(response)
    ? response?.[0]?.response || response?.[0]
    : response?.response || response;

const getCampaignPayloadItems = (response: any) => {
  const payload = getCampaignPayload(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return payload ? [payload] : [];
};

const getCampaignStatus = (response: any) => {
  const payload = getCampaignPayload(response);
  const items = getCampaignPayloadItems(response);

  return String(
    payload?.campaignStatus ||
      items.find((item: any) => item?.campaignStatus)?.campaignStatus ||
      response?.campaignStatus ||
      '',
  )
    .trim()
    .toUpperCase();
};

const getCampaignRows = (response: any) => {
  const payload = getCampaignPayload(response);
  return Array.isArray(payload?.rows) ? payload.rows : [];
};

/* "Mon 09:00" for a release time, and nothing at all for a missing or past
   one - a card that promises a time it cannot name is worse than one that
   says only why. Matches the wording built from the lead rows. */
const describeHoldRelease = (at?: number | null) => {
  if (!Number.isFinite(at as number) || (at as number) <= Date.now()) return '';
  return new Date(at as number).toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* Lead statuses with nothing left to do. */
const TERMINAL_LEAD_STATUSES = new Set(['COMPLETED', 'ATTEMPT_LIMIT_EXHAUSTED', 'DNC', 'EXHAUSTED']);

const isCampaignStopStatus = (status?: string) =>
  ['COMPLETED', 'COMPLETE', 'PAUSE'].includes(String(status || '').toUpperCase());

const getLeadValidationResponse = (response: any) => {
  const responseBody = response?.data ?? response;
  const responseData = responseBody?.data ?? responseBody;
  const result = responseData?.result ?? responseBody?.result ?? response?.result;

  return {
    result,
    message:
      result?.message || responseData?.message || responseBody?.message || response?.message || '',
  };
};

const isScheduledForFuture = (contact: any) => {
  const retryDate = contact?.startExecutionDate || contact?.sipcallDetail?.[0]?.retryDate;

  return Boolean(
    contact?.requestStatus === 'SCHEDULED' &&
    retryDate &&
    new Date(retryDate).getTime() > Date.now(),
  );
};

const formatCampaignType = (value: string) => {
  return value
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Which of the campaign's numbers a preview call goes out as.
 *
 * One number is the default: the same number every time, so the customer
 * recognises it and every callback lands on one rule. When the campaign is
 * set to rotate (a local presence pool), the number whose area code matches
 * the lead's is preferred, and only otherwise is one picked at random.
 */
const pickCallerId = (
  callerIds: string[] | undefined,
  rotate: boolean | undefined,
  leadNumber: string | undefined,
) => {
  if (!Array.isArray(callerIds) || callerIds.length === 0) return '';
  const validCallerIds = callerIds.map((callerId) => String(callerId || '').trim()).filter(Boolean);
  if (!validCallerIds.length) return '';
  if (!rotate || validCallerIds.length === 1) return validCallerIds[0];
  const areaCodeOf = (value: string) => {
    const digits = String(value || '').replace(/\D/g, '');
    const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    return national.length === 10 ? national.slice(0, 3) : '';
  };
  const wanted = areaCodeOf(leadNumber || '');
  const local = wanted
    ? validCallerIds.find((callerId) => areaCodeOf(callerId) === wanted)
    : undefined;
  if (local) return local;
  const randomIndex = Math.floor(Math.random() * validCallerIds.length);
  return validCallerIds[randomIndex];
};

const DialpadCampaignOverview = ({
  campaignContactCards,
  dialpadScreen,
  fullPage = false,
}: DialpadCampaignOverviewProps) => {
  const {
    makeCall,
    setCampaignContactCards,
    openDialpad,
    closeDialpad,
    clearAllSessions,
    isDialpadOpen,
    sessions,
    activeSessionId,
    isRegistered,
    sipContact,
    activeCampaign,
    setActiveCampaign,
    startCampaignClearingTimer,
    setJoinedCampaignId,
  } = useDialpad();
  const { socketEventsManager, ongoingCampaignActivity, setOngoingCampaignActivity } =
    useSocketEvents();
  const { user } = useUser();
  const userDetailsPayload = useMemo(
    () => ({
      first_name: String(user?.user_info?.first_name || user?.first_name || '').trim(),
      last_name: String(user?.user_info?.last_name || user?.last_name || '').trim(),
      email: String(user?.user_info?.email || user?.email || '').trim(),
      extension: String(user?.user_info?.extension || '').trim(),
      user_uuid: String(user?.uuid || '').trim(),
      company_uuid: String(user?.company_info?.uuid || user?.company_uuid || '').trim(),
      domain: String(user?.sip_credentials?.domain || user?.user_info?.domain || '').trim(),
      role: String(user?.role || user?.user_info?.role || '').trim(),
      caller_id: String(user?.user_info?.caller_id || user?.caller_id || '').trim(),
    }),
    [user],
  );
  const [isSkipLoading, setIsSkipLoading] = useState(false);
  const [accordionValue, setAccordionValue] = useState('');
  const [emptyQueueTimerRunId, setEmptyQueueTimerRunId] = useState(0);
  const lastCampaignIdRef = useRef('');
  const isTryFetchingContactsPendingRef = useRef(false);
  const previewTimerSnapshotRef = useRef(0);
  const previewTimerReferenceMapRef = useRef<Record<string, number>>({});
  const contactRetryAlertShownRef = useRef(false);
  const emittedCallEventKeysRef = useRef<Set<string>>(new Set());
  const emittedWrapupEventKeysRef = useRef<Set<string>>(new Set());
  /* Preview events for the agent-day report: which lead was offered (once per
     card), and when a wrap-up began so its length can be reported when the
     session goes away. */
  const offeredPreviewCardIdsRef = useRef<Set<string>>(new Set());
  const wrapupStartedAtBySessionRef = useRef<Record<string, number>>({});
  const leadValidationCountdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leadValidationAlert, setLeadValidationAlert] = useState({
    open: false,
    message: '',
    countdown: 3,
    shouldRefresh: false,
  });

  /* An administrator pausing or completing the campaign is announced to the
     whole tenant on "campaign-state-update". Take it here directly: the shared
     context only forwarded it on a route that no longer exists. */
  useEffect(() => {
    if (!socketEventsManager) return;
    const onState = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      setOngoingCampaignActivity(payload);
    };
    socketEventsManager.on('campaign-state-update', onState);
    return () => {
      socketEventsManager.off('campaign-state-update', onState);
    };
  }, [socketEventsManager, setOngoingCampaignActivity]);

  /* The dialer already works out WHY it is not calling anybody - no contact due
     yet, nobody free, outside the hours, finished - and publishes it on
     "campaign-live-stats". Nothing was listening, so an agent waiting on a
     campaign saw a countdown that restarted for ever and no reason for it.
     Taken here so the wait can say what it is waiting for. */
  const [liveStats, setLiveStats] = useState<any>(null);
  /* The server's own word on why the last request came back empty, when the
     deployed campaign-api sends one; and when this agent last passed on a
     record, so the wait for it to come round again can be explained. */
  const [offerReason, setOfferReason] = useState('');
  /* The moment the server says those held leads are released, when it sends
     one. Kept beside the reason so the card can finish the sentence with a
     time instead of leaving the agent to guess how long "later" is. */
  const [offerHeldUntil, setOfferHeldUntil] = useState<number | null>(null);
  const lastSkipAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!socketEventsManager) return;
    const onStats = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      /* Stamped on arrival: the board stops coming the moment the engine
         drops a finished campaign, and the last push must not be quoted as
         the present for ever after. */
      setLiveStats({ ...payload, receivedAt: Date.now() });
    };
    socketEventsManager.on('campaign-live-stats', onStats);
    return () => {
      socketEventsManager.off('campaign-live-stats', onStats);
    };
  }, [socketEventsManager]);
  /* Ticks so the board's age is re-judged while nothing else changes. */
  const [boardClock, setBoardClock] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setBoardClock((c) => c + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const cards = Array.isArray(campaignContactCards) ? campaignContactCards : [];
  const totalContacts = cards.length;
  const firstCampaignCard: CampaignContactCard = cards[0] || {};
  const activeCampaignId = String(activeCampaign?._id || '').trim();
  const activeCampaignName = String(activeCampaign?.name || '').trim();
  const activeCampaignDialMethod = String(
    activeCampaign?.dialMethod || activeCampaign?.campaignType || '',
  ).trim();
  const campaignName =
    activeCampaignName || firstCampaignCard?.campaignDetail?.campaignName?.trim() || 'Campaign';
  const campaignTypeValue =
    activeCampaignDialMethod ||
    firstCampaignCard?.campaignDetail?.campaignType?.trim() ||
    'UNKNOWN';
  const normalizedCampaignType = campaignTypeValue.toUpperCase();
  /* Server-dialled modes (predictive, and progressive once the dialer service
     places its calls) share one runtime: go available, wait for the call.
     "Progressive" below then only means the browser-dialled variant. */
  const serverDialed = isServerDialed(normalizedCampaignType);
  const isProgressiveDialMethod = normalizedCampaignType === 'PROGRESSIVE' && !serverDialed;
  const isPreviewDialMethod = normalizedCampaignType === 'PREVIEW';
  const isPredictiveDialMethod = serverDialed;
  const campaignType = formatCampaignType(campaignTypeValue);
  const normalizedContactNumber = firstCampaignCard?.contactNumber?.trim() || '';
  const campaignId = activeCampaignId || firstCampaignCard?.campaignId?.trim() || '';
  const activeSession = activeSessionId ? sessions?.[activeSessionId] : null;
  const hasAnyDialpadSession = Object.keys(sessions || {}).length > 0;
  const hasLiveDialpadSession = Object.values(sessions || {}).some((sessionItem) => {
    const sessionStatus = String(sessionItem?.status || '').toLowerCase();
    return Boolean(sessionStatus && !['ended', 'failed'].includes(sessionStatus));
  });
  const progressiveAutoDialContactKey = String(
    activeCampaign?.progressiveAutoDialContactKey || '',
  ).trim();
  const campaignIdFromSession = String(
    activeSession?.campaignMetaData?.id || activeSession?.liveCallData?.forward_value || '',
  ).trim();
  const resolvedCampaignId = campaignId || campaignIdFromSession || lastCampaignIdRef.current;
  const hasCampaignSessionForCurrentCampaign = Object.values(sessions).some((sessionItem) => {
    const sessionCampaignId = String(
      sessionItem?.campaignMetaData?.id ||
        sessionItem?.liveCallData?.campaign_uuid ||
        (String(sessionItem?.liveCallData?.forward_type || '').toUpperCase() === 'CAMPAIGN'
          ? sessionItem?.liveCallData?.forward_value
          : '') ||
        getHeaderFirstValue(sessionItem?.headers, 'x-campaignuuid') ||
        '',
    ).trim();
    return Boolean(sessionCampaignId && sessionCampaignId === resolvedCampaignId);
  });
  const currentUserUuid = user?.uuid || '';
  const currentCompanyUuid = user?.company_info?.uuid || '';

  /* One preview event to campaign-api on the existing campaign-event-logs
     socket event (eventType PREVIEW_EVENT). companyId is left empty on purpose:
     campaign-api takes the company from userDetail, and the roster handler in
     the presence service, which shares this event, then has nothing to
     broadcast. Best effort - a report row is never worth blocking a call. */
  const emitPreviewEvent = useCallback(
    (
      name: 'preview_offered' | 'preview_skipped' | 'preview_dialled' | 'wrapup_ended',
      seconds: number,
      card?: any,
    ) => {
      if (!socketEventsManager || !resolvedCampaignId || !currentUserUuid) return;
      try {
        socketEventsManager.emit('campaign-event-logs', {
          campaignDetail: { campaignId: resolvedCampaignId, campaignName, companyId: '' },
          eventType: 'PREVIEW_EVENT',
          userDetail: userDetailsPayload,
          event: {
            name,
            seconds: Math.max(0, Math.round(Number(seconds) || 0)),
            at: new Date().toISOString(),
            contact_id: String(card?.contactId || '').trim(),
            campaign_number_id: String(card?._id || '').trim(),
          },
        });
      } catch {
        /* nothing to do: the report simply misses this event */
      }
    },
    [campaignName, currentUserUuid, resolvedCampaignId, socketEventsManager, userDetailsPayload],
  );
  const allowSkipping = isCampaignSkippingAllowed({
    allowSkipping: firstCampaignCard?.allowSkipping ?? activeCampaign?.allowSkipping ?? false,
  });
  const configuredPreviewTimeSeconds = Number(
    activeCampaign?.dialerSetting?.preview_time ??
      firstCampaignCard?.campaign_detail?.dialerSetting?.preview_time ??
      0,
  );
  const previewTimeSeconds =
    isPreviewDialMethod && Number.isFinite(configuredPreviewTimeSeconds)
      ? Math.max(0, configuredPreviewTimeSeconds)
      : 0;
  /* The campaign's wait after a call and the company's poll interval, in ms.
     Read through the same resolver the form uses: the campaign's own number,
     else the company default, else the built-in one - so an older campaign
     with nothing stored behaves like a new one. Refs as well as values,
     because the fetch callbacks below are memoised on other things. */
  const { timers: companyTimers } = useCampaignTimers();
  const campaignDialerSetting =
    activeCampaign?.dialerSetting ?? firstCampaignCard?.campaign_detail?.dialerSetting;
  const waitAfterCallMs =
    resolveCampaignTimer('wait_after_call', campaignDialerSetting, companyTimers) * 1000;
  const contactRetryMs =
    resolveCampaignTimer('contact_retry', null, companyTimers) * 1000;
  const waitAfterCallMsRef = useRef(waitAfterCallMs);
  const contactRetryMsRef = useRef(contactRetryMs);
  waitAfterCallMsRef.current = waitAfterCallMs;
  contactRetryMsRef.current = contactRetryMs;
  const previewTimerKey =
    firstCampaignCard?._id?.trim() ||
    firstCampaignCard?.contactId?.trim() ||
    firstCampaignCard?.contactNumber?.trim() ||
    DEFAULT_PREVIEW_TIMER_KEY;
  const previewTimerReferenceTimestampMs =
    previewTimerReferenceMapRef.current[previewTimerKey] || 0;
  const predictiveAutoCollapseKey =
    firstCampaignCard?._id?.trim() ||
    firstCampaignCard?.contactId?.trim() ||
    firstCampaignCard?.contactNumber?.trim() ||
    campaignId ||
    firstCampaignCard?.contactName?.trim() ||
    'predictive-default';
  const accordionBehaviorKey = `${isPredictiveDialMethod ? 'predictive' : 'standard'}:${predictiveAutoCollapseKey}`;
  const canCall = Boolean(normalizedContactNumber && isRegistered);
  /* The row the agent joined from comes off /api/campaign/member-based, whose
     $project names a fixed set of fields - and declineDispositions is not one
     of them. So the skip reasons an admin ticked never reached the dialer: the
     panel said "no skip reasons set up" over a campaign whose saved document
     held two. When the joined row has no such field the full document is
     fetched once and kept; a row that carries the field (a future projection,
     a detail-page join) is read as it is. */
  const joinedRowLacksSkipConfig =
    Boolean(resolvedCampaignId) && !Array.isArray(activeCampaign?.declineDispositions);
  const { data: campaignSkipConfig } = useQuery({
    queryKey: ['campaignSkipConfig', resolvedCampaignId],
    queryFn: () => getCampaignDetail({ campaignId: String(resolvedCampaignId) }),
    select: (data: any) => data?.data?.data?.result,
    enabled: joinedRowLacksSkipConfig,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  /* The company's disposition list, the same source the campaign wizard names
     its rows from. Same query key as the wizard, so the two share one fetch.
     It names any id the campaign's own rows cannot (an older save, a stripped
     projection) rather than dropping the button. */
  const { data: companyDispositions = [] } = useQuery({
    queryKey: ['getDispositionsList'],
    queryFn: () => getDispositions({ page: 1, limit: 200 }),
    select: (data: any) => data?.data?.data?.result?.rows || [],
    enabled: Boolean(resolvedCampaignId),
    staleTime: 60 * 60_000,
  });
  const skipReasonIds = Array.isArray(activeCampaign?.declineDispositions)
    ? activeCampaign.declineDispositions
    : campaignSkipConfig?.declineDispositions;
  const campaignDispositionRows =
    Array.isArray(activeCampaign?.agentDisposition) && activeCampaign.agentDisposition.length
      ? activeCampaign.agentDisposition
      : campaignSkipConfig?.agentDisposition;
  /* The reasons this campaign asks for on a skip: the dispositions the admin
     ticked as skip reasons, by id, named (src/lib/campaign-skip-reasons.ts). */
  const skipReasons = useMemo(
    () =>
      resolveSkipReasons({
        declineDispositions: skipReasonIds,
        campaignDispositions: campaignDispositionRows,
        companyDispositions,
      }),
    [skipReasonIds, campaignDispositionRows, companyDispositions],
  );
  /* Every disposition the campaign switched on for its agents. The skip panel
     offers these below the note so a skipped lead can still be dispositioned,
     not only the narrower set an admin also ticked as a skip reason. */
  const agentDispositions = useMemo(
    () => resolveCampaignDispositions({ campaignDispositions: campaignDispositionRows, companyDispositions }),
    [campaignDispositionRows, companyDispositions],
  );
  /* Another call - an incoming one, a transfer - has the agent's attention.
     The preview clock stands still until it is over, so the agent comes back
     to the same record with the same time left. */
  const interruptedByAnotherCall = useMemo(() => {
    const mine = normalizedContactNumber.replace(/\D/g, '');
    return Object.values(sessions || {}).some((sessionItem: any) => {
      const st = String(sessionItem?.status || '').toLowerCase();
      if (!st || ['ended', 'failed'].includes(st)) return false;
      const remote = String(sessionItem?.remoteNumber || '').replace(/\D/g, '');
      return !mine || !remote || !remote.endsWith(mine.slice(-7));
    });
  }, [sessions, normalizedContactNumber]);
  const canSkip = Boolean(
    allowSkipping &&
    socketEventsManager &&
    resolvedCampaignId &&
    currentUserUuid &&
    currentCompanyUuid,
  );
  const isManualProcessing =
    String(activeCampaign?.manualStatus || '')
      .trim()
      .toUpperCase() === 'PROCESSING';
  const manualCampaignStatus = String(
    activeCampaign?.manualStatus || activeCampaign?.campaignStatus || '',
  )
    .trim()
    .toUpperCase();
  const isManualStopStatus = isCampaignStopStatus(manualCampaignStatus);
  const deferredNextActionFromCampaign = activeCampaign?.deferredNextAction;
  const shouldShowProcessingLoopTimer =
    totalContacts === 0 && isManualProcessing && !leadValidationAlert.open;
  const configuredNextContactDelayMs = Number(activeCampaign?.nextContactDelayMs);
  const nextContactDelayMs = Number.isFinite(configuredNextContactDelayMs)
    ? Math.max(0, configuredNextContactDelayMs)
    : waitAfterCallMs;
  const nextContactDelaySeconds = Math.max(1, Math.ceil(nextContactDelayMs / 1000));

  /**
   * Why the campaign is not handing this agent anybody.
   *
   * Returns '' when the answer is simply "a contact is on its way", which is
   * the normal case between calls and needs no explanation. Everything else is
   * a state the agent can otherwise sit in indefinitely with a countdown
   * spinning and no idea it will never produce a call - contacts scheduled for
   * later being the one that looks most like a fault.
   */
  /* The campaign's hours, zone, consent rule and retry period. The list the
     agent joined from may not carry all of them, so while the card is empty
     the full document is fetched once and kept for a minute. */
  const { data: campaignDetailForWait } = useQuery({
    queryKey: ['campaignDetailForWait', resolvedCampaignId],
    queryFn: () => getCampaignDetail({ campaignId: String(resolvedCampaignId) }),
    select: (data: any) => data?.data?.data?.result,
    enabled: Boolean(resolvedCampaignId) && totalContacts === 0 && !isPredictiveDialMethod,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  /**
   * The reason the engine gave for holding the leads this agent cannot see, and
   * when it releases them.
   *
   * `campaignContactCards` is the raw lead list from the API - future leads
   * included; `applyNewCampaignContacts` filters them out for dialling but they
   * are still here, carrying the engine's own `dialerHeldReason` and the
   * `startExecutionDate` it pushed them to. Nothing was reading either, so an
   * agent saw "scheduled for later" and no way to find out why or for how long.
   * Reads only what is present: no reason stored means no claim made.
   */
  const heldLeadExplanation = useMemo(() => {
    const cards = Array.isArray(campaignContactCards) ? campaignContactCards : [];
    const now = Date.now();
    /* A lead that is already done (COMPLETED, EXHAUSTED, DNC) can still carry
       the retry date it was given before its last call; it is not "scheduled
       for later" and must not keep the card waiting on it. */
    const future = cards
      .filter((card: any) => !TERMINAL_LEAD_STATUSES.has(String(card?.requestStatus || '').toUpperCase()))
      .map((card: any) => ({
        reason: String(card?.dialerHeldReason || '').trim(),
        at: card?.startExecutionDate ? new Date(card.startExecutionDate).getTime() : NaN,
      }))
      .filter((row) => Number.isFinite(row.at) && row.at > now);
    if (!future.length) return null;
    const soonest = future.reduce((best, row) => (row.at < best.at ? row : best), future[0]);
    const withReason = future.find((row) => row.reason) || soonest;
    const when = Number.isFinite(soonest.at)
      ? new Date(soonest.at).toLocaleString(undefined, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    if (!withReason.reason && !when) return null;
    return { reason: withReason.reason, when };
  }, [campaignContactCards]);

  const statsReason = useMemo(() => {
    /* The engine's last stats push can predate the call that finished the
       campaign (the outcome webhook completes it, the board is dropped, and no
       later push arrives), so the campaign's own status is read first. */
    if (
      ['COMPLETED', 'COMPLETE'].includes(
        String(activeCampaign?.manualStatus || activeCampaign?.campaignStatus || '')
          .trim()
          .toUpperCase(),
      )
    ) {
      return 'Every contact on this campaign has been called.';
    }
    const stats = liveStats;
    if (!stats || String(stats?.campaignId || '') !== String(resolvedCampaignId || '')) return '';
    /* The board is the engine's view of THIS moment. Once the campaign has
       stopped, or the engine has not spoken for half a minute, the last push
       is history: a card that kept quoting "1 contact is scheduled for later"
       after the campaign had completed was reading exactly such a leftover. */
    if (isManualStopStatus) return '';
    const boardAgeMs = Date.now() - Number(stats?.receivedAt || 0);
    if (!Number.isFinite(boardAgeMs) || boardAgeMs > LIVE_BOARD_MAX_AGE_MS) return '';
    const leads = stats?.leads || {};
    const due = Number(leads?.due) || 0;
    const future = Number(leads?.future) || 0;
    const inProgress = Number(leads?.inProgress) || 0;
    const callbacks = Number(leads?.callbacks) || 0;
    const health = String(stats?.health || '');

    if (health === 'completed' || due + future + inProgress + callbacks === 0) {
      return 'Every contact on this campaign has been called.';
    }
    if (due === 0 && future > 0) {
      /* "Scheduled for later" reads as somebody's choice, and it usually is not
         one. The commonest reason by far is the per-lead calling window holding
         a number because it is outside ITS OWN local hours - the engine writes
         that sentence onto the lead as `dialerHeldReason` and the time it will
         be released as `startExecutionDate`, and the browser already receives
         both on the future leads it filters out.
         So say what is actually happening and when it ends, rather than leaving
         an agent to watch a countdown that cannot produce a call. */
      /* Two places can explain the hold and neither is always present. The
         lead rows carry it when the browser holds any - but the server drops
         held rows from the offer, so usually it holds none. The offer reply
         carries it in exactly that case. Read whichever spoke. */
      const held = heldLeadExplanation?.reason
        ? heldLeadExplanation
        : offerReason
          ? { reason: offerReason, when: describeHoldRelease(offerHeldUntil) }
          : heldLeadExplanation;
      const count = future === 1 ? '1 contact is' : `${future} contacts are`;
      if (held?.reason) {
        return `${count} being held: ${held.reason}${held.when ? ` They become callable ${held.when}.` : ''}`;
      }
      return future === 1
        ? '1 contact is scheduled for later, so there is nothing to call yet.'
        : `${future} contacts are scheduled for later, so there is nothing to call yet.`;
    }
    if (health === 'outside_hours' || stats?.window?.open === false) {
      return 'Outside this campaign’s calling hours.';
    }
    if (health === 'waiting_for_agents') return 'Waiting for an agent to become free.';
    if (health === 'line_limit') return 'Holding at the campaign’s line limit.';
    if (health === 'paused' || health === 'not_started') return 'This campaign is not running.';
    return '';
    // boardClock re-asks the age question every few seconds; it is not read.
  }, [
    liveStats,
    resolvedCampaignId,
    heldLeadExplanation,
    offerReason,
    offerHeldUntil,
    activeCampaign,
    isManualStopStatus,
    boardClock,
  ]);

  /* Three sources, most authoritative first: what the dialer engine pushes,
     what the server said when it handed back nothing, and what can be worked
     out here from the campaign document (hours, consent rule, a fresh skip).
     A countdown that will never produce a call is worse than no countdown: it
     promises one. It keeps spinning only while a contact could still arrive. */
  const { mine: myDuty } = useAgentDuty();
  const wait = useMemo(() => {
    /* Duty gates the campaign as well as the queues: on break or off duty the
       server hands out no leads, and the countdown must not pretend otherwise. */
    if (myDuty && myDuty.duty !== 'on_duty') {
      return {
        message:
          myDuty.duty === 'on_break'
            ? `You are on break${myDuty.reason ? ` (${myDuty.reason})` : ''}. Leads are offered again when you are back on duty.`
            : 'You are off duty. Start your shift (top right) to be offered leads.',
        terminal: true,
      };
    }
    if (statsReason) return { message: statsReason, terminal: !/free|line limit/i.test(statsReason) };
    if (offerReason) return { message: offerReason, terminal: !/comes back|free/i.test(offerReason) };
    const explained = explainEmptyOffer({
      campaign: campaignDetailForWait || activeCampaign,
      lastSkipAt: lastSkipAtRef.current,
    });
    return explained || { message: '', terminal: false };
    // totalContacts re-runs this each time the card empties, so a fresh skip is seen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsReason, offerReason, campaignDetailForWait, activeCampaign, totalContacts, myDuty]);
  const waitReason = wait.message;
  const isWaitTerminal = wait.terminal;

  useEffect(() => {
    if (!Array.isArray(campaignContactCards) || campaignContactCards.length === 0) return;

    const callableContacts = campaignContactCards.filter(
      (contact) => !isScheduledForFuture(contact),
    );
    if (callableContacts.length === campaignContactCards.length) {
      contactRetryAlertShownRef.current = false;
      return;
    }

    if (callableContacts.length > 0) {
      contactRetryAlertShownRef.current = false;
      setCampaignContactCards(callableContacts);
      return;
    }

    const nextRetryAt = campaignContactCards.reduce((earliest: number | null, contact: any) => {
      const retryDate = contact?.startExecutionDate || contact?.sipcallDetail?.[0]?.retryDate;
      const retryTime = retryDate ? new Date(retryDate).getTime() : NaN;

      if (!Number.isFinite(retryTime) || retryTime <= Date.now()) return earliest;
      return earliest === null ? retryTime : Math.min(earliest, retryTime);
    }, null);
    const waitMs = nextOfferDelayMs({
      callableCount: 0,
      nextRetryAt,
      nowMs: Date.now(),
      waitAfterCallMs: waitAfterCallMsRef.current,
      contactRetryMs: contactRetryMsRef.current,
    });

    setCampaignContactCards([]);
    setActiveCampaign((prev: any) => ({
      ...(prev || {}),
      manualStatus: 'PROCESSING',
      nextContactDelayMs: waitMs,
    }));

    if (!contactRetryAlertShownRef.current) {
      contactRetryAlertShownRef.current = true;
      handleAlert({
        text: 'Next campaign contact is scheduled for later. The campaign will keep running and retry automatically.',
        type: 'info',
      });
    }
  }, [campaignContactCards, setActiveCampaign, setCampaignContactCards]);

  useEffect(() => {
    if (!campaignId) return;
    lastCampaignIdRef.current = campaignId;
  }, [campaignId]);

  useEffect(() => {
    if (!isManualStopStatus) return;
    if (hasCampaignSessionForCurrentCampaign) return;

    handleAlert({
      text:
        manualCampaignStatus === 'PAUSE'
          ? 'Campaign has been paused.'
          : 'Campaign has been completed. No more contacts are available.',
      type: manualCampaignStatus === 'PAUSE' ? 'info' : 'success',
    });
    socketEventsManager?.emit('campaign-event-logs', {
      campaignDetail: {
        campaignName,
        campaignId: resolvedCampaignId,
        companyId: activeCampaign?.companyId,
      },
      eventType: 'DELETE',
      userDetail: userDetailsPayload,
    });

    /* A campaign ending is not a duty change. The leave event above is what
       the engine reads; writing On Break here put the person on break on
       every queue they belong to the moment a campaign completed. */

    previewTimerReferenceMapRef.current = {};
    previewTimerSnapshotRef.current = 0;
    setEmptyQueueTimerRunId(0);
    setCampaignContactCards(null);
    setActiveCampaign(null);
    setJoinedCampaignId(null);
    closeDialpad();
  }, [
    closeDialpad,
    hasCampaignSessionForCurrentCampaign,
    activeCampaign?.companyId,
    campaignName,
    isPredictiveDialMethod,
    isManualStopStatus,
    manualCampaignStatus,
    setActiveCampaign,
    setCampaignContactCards,
    setJoinedCampaignId,
  ]);

  useEffect(() => {
    previewTimerSnapshotRef.current = previewTimeSeconds;
  }, [previewTimeSeconds, previewTimerKey]);

  useEffect(() => {
    if (!previewTimerKey) return;
    if (totalContacts === 0) return;
    if (previewTimerKey === DEFAULT_PREVIEW_TIMER_KEY) return;

    if (previewTimeSeconds <= 0) {
      delete previewTimerReferenceMapRef.current[previewTimerKey];
      return;
    }

    if (!previewTimerReferenceMapRef.current[previewTimerKey]) {
      previewTimerReferenceMapRef.current[previewTimerKey] = Date.now();
    }
  }, [previewTimeSeconds, previewTimerKey, totalContacts]);

  useEffect(() => {
    setAccordionValue(isPredictiveDialMethod ? '' : CAMPAIGN_OVERVIEW_ACCORDION_VALUE);
  }, [accordionBehaviorKey, isPredictiveDialMethod]);

  useEffect(() => {
    if (dialpadScreen === 'ended') {
      setAccordionValue('');
    }
  }, [dialpadScreen]);

  const handleAccordionValueChange = useCallback((value: string) => {
    setAccordionValue(value);
  }, []);

  const showLeadValidationRefreshAlert = useCallback(
    (message: string) => {
      setCampaignContactCards([]);
      setLeadValidationAlert({
        open: true,
        message,
        countdown: 3,
        shouldRefresh: true,
      });
    },
    [setCampaignContactCards],
  );

  const validateLeadBeforeCall = useCallback(
    async (data: CampaignContactCard) => {
      const currentDialMethod = String(
        activeCampaign?.dialMethod || activeCampaign?.campaignType || '',
      )
        .trim()
        .toUpperCase();
      const requiresValidation = ['PROGRESSIVE', 'PREVIEW'].includes(currentDialMethod);

      if (!requiresValidation) {
        return { valid: true, shouldRefresh: false, message: '' };
      }

      if (!activeCampaignId || !data?._id) {
        return {
          valid: false,
          shouldRefresh: true,
          message:
            'This lead is no longer active on your screen. Refreshing to get the latest lead.',
        };
      }

      try {
        const response = await validateCampaignLeadAssignment({
          campaignId: activeCampaignId,
          campaignNumberId: data._id,
        });
        const { result, message } = getLeadValidationResponse(response);

        return {
          valid: result?.valid === true,
          shouldRefresh: result?.shouldRefresh === true,
          message:
            result?.message ||
            message ||
            'This lead is no longer available. Refreshing to get the latest lead.',
        };
      } catch (error: any) {
        handleAlert({
          text:
            error?.response?.data?.error?.message ||
            'Unable to validate lead assignment. Please try again.',
          type: 'error',
        });
        return { valid: false, shouldRefresh: false, message: '' };
      }
    },
    [activeCampaign?.campaignType, activeCampaign?.dialMethod, activeCampaignId],
  );

  /* Seconds the agent has looked at the current lead (the ring timer reports
     seconds LEFT; see handleSkip for why that mattered). */
  const previewSecondsUsed = useCallback(
    () =>
      previewTimeSeconds > 0
        ? Math.max(0, Math.floor(previewTimeSeconds) - Math.max(0, Math.floor(previewTimerSnapshotRef.current)))
        : 0,
    [previewTimeSeconds],
  );

  useEffect(() => {
    if (!isPreviewDialMethod) return;
    const cardId = String(firstCampaignCard?._id || '').trim();
    if (!cardId || offeredPreviewCardIdsRef.current.has(cardId)) return;
    offeredPreviewCardIdsRef.current.add(cardId);
    emitPreviewEvent('preview_offered', 0, firstCampaignCard);
  }, [emitPreviewEvent, firstCampaignCard, isPreviewDialMethod]);

  const handleCall = useCallback(async () => {
    if (!isRegistered) return;
    if (!normalizedContactNumber) return;

    /* Preview dials from the browser, so the calling hours are held here as
       well as on the server: a call outside them is refused with the same
       popup the engine's stop produces. */
    const hoursCampaign = campaignDetailForWait || activeCampaign;
    if (hoursCampaign && !campaignWindow(hoursCampaign).open) {
      window.dispatchEvent(new CustomEvent('mcm:campaign-hours-closed', { detail: hoursCampaign }));
      return;
    }

    const validationResult = await validateLeadBeforeCall(firstCampaignCard);
    if (!validationResult.valid) {
      if (validationResult.shouldRefresh) {
        showLeadValidationRefreshAlert(validationResult.message);
      }
      return;
    }

    const campaignUuid = activeCampaignId || firstCampaignCard?.campaignId?.trim() || '';
    const campaignDisplayName =
      activeCampaignName || firstCampaignCard?.campaignDetail?.campaignName?.trim() || '';
    const campaignDialMethod =
      activeCampaignDialMethod || firstCampaignCard?.campaignDetail?.campaignType?.trim() || '';
    const contactName = firstCampaignCard?.contactName?.trim() || '';
    const contactUuid = firstCampaignCard?.contactId?.trim() || '';
    const campaignNumberUuid = firstCampaignCard?._id?.trim() || '';
    const randomCallerId =
      String(activeCampaign?.selectedCallerId || '').trim() ||
      pickCallerId(
        activeCampaign?.callerId,
        activeCampaign?.rotateCallerId,
        normalizedContactNumber,
      );

    const extraHeaders = [
      `X-CampaignUuid: ${campaignUuid}`,
      `X-CampaignName: ${campaignDisplayName}`,
      `X-CampaignType: ${campaignDialMethod}`,
      `X-ContactName: ${contactName}`,
      `X-ContactUuid: ${contactUuid}`,
      `X-CampaignNumberUuid: ${campaignNumberUuid}`,
      `X-CallerId: ${randomCallerId}`,
    ];

    if (isPreviewDialMethod) emitPreviewEvent('preview_dialled', previewSecondsUsed(), firstCampaignCard);
    makeCall(normalizedContactNumber, { extraHeaders });
  }, [
    emitPreviewEvent,
    isPreviewDialMethod,
    previewSecondsUsed,
    activeCampaign?.callerId,
    activeCampaign?.selectedCallerId,
    activeCampaignDialMethod,
    activeCampaignId,
    activeCampaignName,
    firstCampaignCard?.campaignDetail?.campaignName,
    firstCampaignCard?.campaignDetail?.campaignType,
    firstCampaignCard?.campaignId,
    firstCampaignCard?.contactId,
    firstCampaignCard?.contactName,
    firstCampaignCard?._id,
    isRegistered,
    makeCall,
    normalizedContactNumber,
    showLeadValidationRefreshAlert,
    validateLeadBeforeCall,
    campaignDetailForWait,
    activeCampaign,
  ]);

  useEffect(() => {
    if (!isProgressiveDialMethod) return;
    if (!canCall) return;
    // An ended/failed campaign session remains present during wrap-up. Treat it as
    // active workflow state so changing dialpad views cannot re-dial its lead.
    if (hasLiveDialpadSession || hasCampaignSessionForCurrentCampaign) return;

    const progressiveContactKey =
      firstCampaignCard?._id?.trim() ||
      firstCampaignCard?.contactId?.trim() ||
      normalizedContactNumber ||
      '';
    if (!progressiveContactKey) return;
    if (progressiveAutoDialContactKey === progressiveContactKey) return;

    // Keep this key in DialpadProvider-backed campaign state. The campaign overview
    // unmounts in Micro view, while refs owned by this component do not survive.
    setActiveCampaign((prev: any) => ({
      ...(prev || {}),
      progressiveAutoDialContactKey: progressiveContactKey,
    }));
    handleCall();
  }, [
    canCall,
    firstCampaignCard?._id,
    firstCampaignCard?.contactId,
    hasCampaignSessionForCurrentCampaign,
    hasLiveDialpadSession,
    handleCall,
    isProgressiveDialMethod,
    normalizedContactNumber,
    progressiveAutoDialContactKey,
    setActiveCampaign,
  ]);

  const applyNewCampaignContacts = useCallback(
    (rows: any[] | null) => {
      // Always restart preview timer for freshly loaded lead cards.
      previewTimerReferenceMapRef.current = {};
      previewTimerSnapshotRef.current = previewTimeSeconds;
      const callableContacts = Array.isArray(rows)
        ? rows.filter((contact) => !isScheduledForFuture(contact))
        : rows;

      // A completed contact-list request represents a new progressive auto-dial
      // opportunity, even when the backend intentionally returns a retry lead.
      setActiveCampaign((prev: any) =>
        prev
          ? {
              ...prev,
              progressiveAutoDialContactKey: '',
            }
          : prev,
      );
      setCampaignContactCards(callableContacts);
    },
    [previewTimeSeconds, setActiveCampaign, setCampaignContactCards],
  );

  const triggerPredictiveCampaignFlow = useCallback(async () => {
    if (!socketEventsManager || !resolvedCampaignId || !currentUserUuid) return;

    socketEventsManager.emit(
      'campaign-system-events',
      {
        body: {
          campaignId: resolvedCampaignId,
          queue: activeCampaign?.queue || '',
          user_uuid: currentUserUuid,
          userDetail: userDetailsPayload,
        },
      },
      (res: any) => {
        const campaignStatusFromEvent = getCampaignStatus(res);
        if (isCampaignStopStatus(campaignStatusFromEvent)) {
          setCampaignContactCards([]);
          setActiveCampaign((prev: any) => ({
            ...(prev || {}),
            manualStatus: campaignStatusFromEvent,
          }));
          return;
        }
        console.log('campaign-system-events response:', res);
      },
    );

    try {
      const availabilityResponse = await makeCallQueueAvailable({
        campaign_uuid: resolvedCampaignId,
        status: 'Available',
        state: 'Waiting',
        /* This tab's SIP identity: the queue rings this tab, not every tab of the login. */
        sip_contact: sipContact,
      });
      console.log('makeCallQueueAvailable response:', availabilityResponse);
    } catch (error) {
      console.error('makeCallQueueAvailable failed for predictive campaign:', error);
    }
  }, [
    activeCampaign?.queue,
    currentUserUuid,
    resolvedCampaignId,
    setActiveCampaign,
    setCampaignContactCards,
    socketEventsManager,
    userDetailsPayload,
  ]);

  const handleSkip = useCallback(
    (
      status: CampaignSkipStatus = 'SKIPPED',
      options?: {
        isManual?: boolean;
        dispositionId?: string;
        dispositionName?: string;
        note?: string;
      },
    ) => {
      if (isSkipLoading) return;
      if (!socketEventsManager || !resolvedCampaignId || !currentUserUuid || !currentCompanyUuid)
        return;

      /* How long the agent looked at the record. The ring timer reports the
         seconds LEFT, and that number used to be sent as the dwell time - so a
         skip after five seconds of a thirty-second preview was recorded as
         twenty-five, and a lead that timed out was recorded as zero. */
      const durationSnapshot =
        !isProgressiveDialMethod && previewTimeSeconds > 0
          ? Math.max(
              0,
              Math.floor(previewTimeSeconds) - Math.max(0, Math.floor(previewTimerSnapshotRef.current)),
            )
          : 0;

      setIsSkipLoading(true);
      lastSkipAtRef.current = Date.now();
      if (isPreviewDialMethod) emitPreviewEvent('preview_skipped', durationSnapshot, firstCampaignCard);
      if (options?.isManual) {
        handleAlert({ text: 'Contact Skipped', type: 'success' });
      }

      try {
        socketEventsManager.emit(
          'campaign-skip-lead',
          {
            body: {
              campaignId: resolvedCampaignId,
              campaignNumberId: firstCampaignCard?._id?.trim() || '',
              userDetail: userDetailsPayload,
              next_action: {
                campaign_number: {
                  ...firstCampaignCard,
                },
                status,
                duration: durationSnapshot,
                ...(options?.dispositionId
                  ? { dispositionId: options.dispositionId, dispositionName: options.dispositionName }
                  : {}),
                /* Only sent when the agent actually wrote something, so an empty
                   box does not overwrite a note left by an earlier skip. */
                ...(options?.note ? { note: options.note } : {}),
              },
            },
          },
          /* The switch acknowledges the skip; there is nothing to do with the
             acknowledgement, and the callback is required by the emitter. */
          () => {},
        );

        if (isPredictiveDialMethod) {
          void triggerPredictiveCampaignFlow().finally(() => {
            if (!isDialpadOpen) {
              openDialpad('maxi');
            }
            setIsSkipLoading(false);
          });
          return;
        }

        setCampaignContactCards([]);
        setActiveCampaign((prev: any) => ({
          ...(prev || {}),
          manualStatus: 'PROCESSING',
          nextContactDelayMs: isPreviewDialMethod
            ? PREVIEW_SKIP_NEXT_CONTACT_DELAY_MS
            : PROGRESSIVE_SKIP_NEXT_CONTACT_DELAY_MS,
          deferredNextAction: {
            campaign_number: {
              ...firstCampaignCard,
            },
            status,
            duration: durationSnapshot,
          },
        }));
        if (!isDialpadOpen) {
          openDialpad('maxi');
        }
        setIsSkipLoading(false);
      } catch {
        setIsSkipLoading(false);
      }
    },
    [
      currentCompanyUuid,
      currentUserUuid,
      firstCampaignCard,
      isDialpadOpen,
      isProgressiveDialMethod,
      isPreviewDialMethod,
      isPredictiveDialMethod,
      isSkipLoading,
      emitPreviewEvent,
      openDialpad,
      previewTimeSeconds,
      resolvedCampaignId,
      triggerPredictiveCampaignFlow,
      setCampaignContactCards,
      socketEventsManager,
      setActiveCampaign,
      userDetailsPayload,
    ],
  );

  const handlePreviewTimerValueChange = useCallback((remainingSeconds: number) => {
    previewTimerSnapshotRef.current = Math.max(0, Math.floor(remainingSeconds));
  }, []);

  const tryfetchingNewContacts = useCallback(() => {
    if (isTryFetchingContactsPendingRef.current) return;
    if (!socketEventsManager || !resolvedCampaignId || !currentUserUuid || !currentCompanyUuid)
      return;

    // Seconds spent on the record, not seconds left on the clock (see handleSkip).
    const durationSnapshot = Math.max(
      0,
      Math.floor(previewTimeSeconds || 0) - Math.floor(previewTimerSnapshotRef.current || 0),
    );
    const defaultNextActionPayload = {
      campaign_number: {
        ...firstCampaignCard,
      },
      status: '',
      duration: durationSnapshot,
    };
    const resolvedNextActionPayload =
      deferredNextActionFromCampaign !== undefined
        ? deferredNextActionFromCampaign
        : defaultNextActionPayload;

    isTryFetchingContactsPendingRef.current = true;
    try {
      if (isPredictiveDialMethod) {
        void triggerPredictiveCampaignFlow().finally(() => {
          if (!isDialpadOpen) {
            openDialpad('maxi');
          }
          isTryFetchingContactsPendingRef.current = false;
        });
        return;
      }

      const previewContactListBody: Record<string, any> = {
        campaignId: resolvedCampaignId,
        user_uuid: currentUserUuid,
        company_uuid: currentCompanyUuid,
        userDetail: userDetailsPayload,
      };
      if (resolvedNextActionPayload !== null) {
        previewContactListBody.next_action = resolvedNextActionPayload;
      }

      socketEventsManager.emit(
        'campaign-preview-contact-list',
        {
          body: previewContactListBody,
        },
        (res: any) => {
          const campaignStatus = getCampaignStatus(res);
          if (isCampaignStopStatus(campaignStatus)) {
            setCampaignContactCards([]);
            setActiveCampaign((prev: any) => ({
              ...(prev || {}),
              manualStatus: campaignStatus,
            }));
            isTryFetchingContactsPendingRef.current = false;
            return;
          }

          const rows = getCampaignRows(res);
          const emptyOfferPayload = rows.length ? null : getCampaignPayload(res);
          setOfferReason(String(emptyOfferPayload?.reason || '').trim());
          const heldUntilMs = emptyOfferPayload?.heldUntil
            ? new Date(emptyOfferPayload.heldUntil).getTime()
            : NaN;
          setOfferHeldUntil(Number.isFinite(heldUntilMs) ? heldUntilMs : null);
          const callableContacts = rows.filter((contact: any) => !isScheduledForFuture(contact));
          const nextRetryAt = rows.reduce((earliest: number | null, contact: any) => {
            const retryDate = contact?.startExecutionDate || contact?.sipcallDetail?.[0]?.retryDate;
            const retryTime = retryDate ? new Date(retryDate).getTime() : NaN;

            if (!Number.isFinite(retryTime) || retryTime <= Date.now()) return earliest;
            return earliest === null ? retryTime : Math.min(earliest, retryTime);
          }, null);
          /* A lead in hand: the campaign's wait after a call. Nothing to
             offer: the company's check-for-leads interval, shortened to the
             next scheduled retry when that comes sooner (campaign-timers.ts). */
          const nextDelayMs = nextOfferDelayMs({
            callableCount: callableContacts.length,
            nextRetryAt,
            nowMs: Date.now(),
            waitAfterCallMs: waitAfterCallMsRef.current,
            contactRetryMs: contactRetryMsRef.current,
          });

          setActiveCampaign((prev: any) =>
            prev
              ? {
                  ...prev,
                  manualStatus: campaignStatus,
                  deferredNextAction: undefined,
                  nextContactDelayMs: nextDelayMs,
                }
              : prev,
          );
          applyNewCampaignContacts(rows);
          if (!isDialpadOpen) {
            openDialpad('maxi');
          }
          isTryFetchingContactsPendingRef.current = false;
        },
      );
    } catch {
      isTryFetchingContactsPendingRef.current = false;
    }
  }, [
    currentCompanyUuid,
    currentUserUuid,
    firstCampaignCard,
    isDialpadOpen,
    isPredictiveDialMethod,
    openDialpad,
    deferredNextActionFromCampaign,
    previewTimeSeconds,
    resolvedCampaignId,
    applyNewCampaignContacts,
    triggerPredictiveCampaignFlow,
    setActiveCampaign,
    setCampaignContactCards,
    socketEventsManager,
    userDetailsPayload,
  ]);

  useEffect(() => {
    if (!leadValidationAlert.open) {
      if (leadValidationCountdownTimeoutRef.current) {
        clearTimeout(leadValidationCountdownTimeoutRef.current);
        leadValidationCountdownTimeoutRef.current = null;
      }
      return;
    }

    if (leadValidationAlert.countdown <= 0) {
      const shouldRefresh = leadValidationAlert.shouldRefresh;
      setLeadValidationAlert({
        open: false,
        message: '',
        countdown: 3,
        shouldRefresh: false,
      });
      if (shouldRefresh) {
        setActiveCampaign((prev: any) => ({
          ...(prev || {}),
          manualStatus: 'PROCESSING',
          nextContactDelayMs: 0,
        }));
        tryfetchingNewContacts();
      }
      return;
    }

    leadValidationCountdownTimeoutRef.current = setTimeout(() => {
      setLeadValidationAlert((prev) => ({
        ...prev,
        countdown: Math.max(0, prev.countdown - 1),
      }));
    }, 1000);

    return () => {
      if (leadValidationCountdownTimeoutRef.current) {
        clearTimeout(leadValidationCountdownTimeoutRef.current);
        leadValidationCountdownTimeoutRef.current = null;
      }
    };
  }, [leadValidationAlert, setActiveCampaign, tryfetchingNewContacts]);

  const handleEmptyQueueTimerEnds = useCallback(() => {
    if (!shouldShowProcessingLoopTimer) return;
    tryfetchingNewContacts();
    setEmptyQueueTimerRunId((previousValue) => previousValue + 1);
  }, [shouldShowProcessingLoopTimer, tryfetchingNewContacts]);

  const handleLeaveCampaign = useCallback(async () => {
    if (hasCampaignSessionForCurrentCampaign) {
      handleAlert({
        text: 'There is an active call going on. Disposition the call first.',
        type: 'error',
      });
      return;
    }

    /* Leaving a campaign is not a break. The leave event below tells the
       engine to stop offering this person calls; their duty on every other
       queue is untouched. */
    try {
      /* nothing to write before the leave event */
    } finally {
      socketEventsManager?.emit('campaign-event-logs', {
        campaignDetail: {
          campaignName,
          campaignId: resolvedCampaignId,
          companyId: activeCampaign?.companyId,
        },
        eventType: 'DELETE',
        userDetail: userDetailsPayload,
      });
      startCampaignClearingTimer();
      previewTimerReferenceMapRef.current = {};
      previewTimerSnapshotRef.current = 0;
      isTryFetchingContactsPendingRef.current = false;
      setEmptyQueueTimerRunId(0);
      setCampaignContactCards(null);
      setActiveCampaign(null);
      setJoinedCampaignId(null);
      clearAllSessions();
      closeDialpad();
    }
  }, [
    activeCampaign?.companyId,
    campaignName,
    hasCampaignSessionForCurrentCampaign,
    clearAllSessions,
    closeDialpad,
    isPredictiveDialMethod,
    resolvedCampaignId,
    setActiveCampaign,
    startCampaignClearingTimer,
    setCampaignContactCards,
    setJoinedCampaignId,
    socketEventsManager,
    userDetailsPayload,
  ]);

  useEffect(() => {
    const activityCampaignId = String(ongoingCampaignActivity?._id || '').trim();
    if (!activityCampaignId || activityCampaignId !== resolvedCampaignId) return;

    const activityStatus = String(ongoingCampaignActivity?.campaignStatus || '')
      .trim()
      .toUpperCase();
    /* A campaign completing (the engine, or the outcome webhook after the last
       connected call) is announced the same way a pause is, and the card must
       stop offering and say it is finished rather than count down for ever. */
    if (activityStatus !== 'PAUSE' && !['COMPLETED', 'COMPLETE'].includes(activityStatus)) return;

    setCampaignContactCards([]);
    setActiveCampaign((prev: any) => ({
      ...(prev || {}),
      manualStatus: activityStatus,
    }));
    setOngoingCampaignActivity(null);
  }, [
    ongoingCampaignActivity,
    resolvedCampaignId,
    setActiveCampaign,
    setCampaignContactCards,
    setOngoingCampaignActivity,
  ]);

  /* On a campaign the server dials, the lead the switch actually connects is
     not always the one on the agent's card: the card came from the reservation
     feed, the call came from the queue. When a live session for this campaign
     names a different lead, the card is rebuilt from what the call itself
     carries, so the agent is looking at the person they are talking to. */
  useEffect(() => {
    if (!isProgressiveDialMethod && !isPredictiveDialMethod) return;
    const live = Object.values(sessions || {}).find((sessionItem: any) => {
      const st = String(sessionItem?.status || '').toLowerCase();
      if (!st || ['ended', 'failed'].includes(st)) return false;
      const sessionCampaignId = String(
        sessionItem?.campaignMetaData?.id ||
          sessionItem?.liveCallData?.campaign_uuid ||
          getHeaderFirstValue(sessionItem?.headers, 'x-campaignuuid') ||
          '',
      ).trim();
      return sessionCampaignId === resolvedCampaignId;
    }) as any;
    if (!live) return;
    const connectedLeadId = String(
      live?.liveCallData?.campaign_number_uuid ||
        getHeaderFirstValue(live?.headers, 'x-campaignnumberuuid') ||
        '',
    ).trim();
    if (!connectedLeadId || connectedLeadId === String(firstCampaignCard?._id || '').trim()) return;
    const decode = (value: unknown) => {
      try { return decodeURIComponent(String(value || '')); } catch { return String(value || ''); }
    };
    setCampaignContactCards([
      {
        _id: connectedLeadId,
        campaignId: resolvedCampaignId,
        contactId: String(getHeaderFirstValue(live?.headers, 'x-contactuuid') || live?.liveCallData?.contact_uuid || '').trim(),
        contactName: decode(getHeaderFirstValue(live?.headers, 'x-contactname') || live?.liveCallData?.contact_name || live?.remoteName) || 'Unknown Contact',
        contactNumber: String(getHeaderFirstValue(live?.headers, 'x-contactnumber') || live?.remoteNumber || '').trim(),
        campaignDetail: {
          campaignName: activeCampaignName || firstCampaignCard?.campaignDetail?.campaignName,
          campaignType: activeCampaignDialMethod || firstCampaignCard?.campaignDetail?.campaignType,
        },
      } as any,
    ]);
  }, [
    sessions,
    resolvedCampaignId,
    isProgressiveDialMethod,
    isPredictiveDialMethod,
    firstCampaignCard?._id,
    firstCampaignCard?.campaignDetail?.campaignName,
    firstCampaignCard?.campaignDetail?.campaignType,
    activeCampaignName,
    activeCampaignDialMethod,
    setCampaignContactCards,
  ]);

  useEffect(() => {
    if (!socketEventsManager || !resolvedCampaignId) return;

    Object.values(sessions).forEach((session) => {
      const sessionCampaignId = String(
        session?.campaignMetaData?.id ||
          session?.liveCallData?.campaign_uuid ||
          (String(session?.liveCallData?.forward_type || '').toUpperCase() === 'CAMPAIGN'
            ? session?.liveCallData?.forward_value
            : '') ||
          getHeaderFirstValue(session?.headers, 'x-campaignuuid') ||
          '',
      ).trim();
      if (sessionCampaignId !== resolvedCampaignId) return;

      const normalizedStatus = String(session?.status || '')
        .trim()
        .toLowerCase();
      const campaignNumberId = String(
        session?.liveCallData?.campaign_number_uuid ||
          getHeaderFirstValue(session?.headers, 'x-campaignnumberuuid') ||
          firstCampaignCard?._id ||
          '',
      ).trim();
      const sipcallID = String(
        session?.liveCallData?.sip_call_id ||
          getHeaderFirstValue(session?.headers, 'x-cid') ||
          getHeaderFirstValue(session?.headers, 'call-id') ||
          session?.id ||
          '',
      ).trim();

      if (normalizedStatus === 'connecting') {
        const eventKey = `CONNECTING:${campaignNumberId || sipcallID}`;
        if (!emittedCallEventKeysRef.current.has(eventKey)) {
          emittedCallEventKeysRef.current.add(eventKey);
          socketEventsManager.emit('campaign-lead-wrap', {
            type: 'CONNECTING',
            campaignId: resolvedCampaignId,
            campaignNumberId,
            status: 'CONNECTING',
            sipcallID,
            direction: session?.direction,
            phone: firstCampaignCard?.contactNumber || session?.remoteNumber,
            didNumber:
              getHeaderFirstValue(session?.headers, 'x-callerid') ||
              activeCampaign?.selectedCallerId ||
              (Array.isArray(activeCampaign?.callerId)
                ? activeCampaign.callerId[0]
                : activeCampaign?.callerId),
            userDetail: userDetailsPayload,
          });
        }
      }

      if (['ended', 'failed'].includes(normalizedStatus)) {
        const wrapupEventKey = `${session?.id}:${session?.endedAt || ''}`;
        if (session?.id && !wrapupStartedAtBySessionRef.current[String(session.id)]) {
          wrapupStartedAtBySessionRef.current[String(session.id)] =
            Number(session?.endedAt) > 0 ? Number(session.endedAt) : Date.now();
        }
        if (emittedWrapupEventKeysRef.current.has(wrapupEventKey)) return;

        emittedWrapupEventKeysRef.current.add(wrapupEventKey);
        socketEventsManager.emit('callcenter.agent-wrapup-started', {
          type: 'agent-wrapup-started',
          agentName: `${userDetailsPayload.extension}@${userDetailsPayload.domain}`,
          status: 'Wrap-Up',
          queue: activeCampaign?.queue || '',
          wrapupDuration: activeCampaign?.dialerSetting?.wrapup_time ?? 0,
          timestamp: new Date().toISOString(),
          start_time: '',
          answered_time: '',
        });
      }
    });
  }, [
    activeCampaign?.callerId,
    activeCampaign?.selectedCallerId,
    activeCampaign?.dialerSetting?.wrapup_time,
    activeCampaign?.queue,
    firstCampaignCard?._id,
    firstCampaignCard?.contactNumber,
    resolvedCampaignId,
    sessions,
    socketEventsManager,
    userDetailsPayload,
  ]);

  /* A wrap-up ends when its ended session is cleared (timer ran out, "Next
     contact", or the no-answer strip moved on). The seconds are reported for
     the agent-day report. */
  useEffect(() => {
    const started = wrapupStartedAtBySessionRef.current;
    Object.keys(started).forEach((sessionId) => {
      if (sessions?.[sessionId]) return;
      const seconds = Math.max(0, Math.round((Date.now() - started[sessionId]) / 1000));
      delete started[sessionId];
      emitPreviewEvent('wrapup_ended', seconds);
    });
  }, [emitPreviewEvent, sessions]);

  /* Closing or reloading the tab during a server-dialled campaign.

     This used to POST the agent's duty to On Break / Idle with a keepalive
     fetch. A reload, a link out of the page or a crash therefore changed the
     person's duty without them asking and without a history row (live test,
     9 Sep 18:20: the chip flipped to On break on a plain navigation). Duty is
     the person's own; a browser going away is not a break. The server's
     Disconnected sweep already takes a lost tab out of the queues.

     What the engine needs to know is that this person has left the campaign,
     which is what the Leave button says: the join ledger's DELETE. It goes on
     the socket that is already open; there is no HTTP leave route to fall
     back to (the gateway's /api/campaign/join/upsert reaches nothing), so it
     is best effort - the sweep is the backstop. */
  useEffect(() => {
    if (!resolvedCampaignId || !isPredictiveDialMethod) return;

    let didRunUnloadCleanup = false;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!didRunUnloadCleanup) {
        didRunUnloadCleanup = true;
        try {
          socketEventsManager?.emit('campaign-event-logs', {
            campaignDetail: {
              campaignName,
              campaignId: resolvedCampaignId,
              companyId: activeCampaign?.companyId,
            },
            eventType: 'DELETE',
            userDetail: userDetailsPayload,
          });
        } catch {
          // Browser unload cleanup is best-effort.
        }
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload as EventListener);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload as EventListener);
    };
  }, [
    activeCampaign?.companyId,
    campaignName,
    isPredictiveDialMethod,
    resolvedCampaignId,
    socketEventsManager,
    userDetailsPayload,
  ]);

  if (isPredictiveDialMethod && dialpadScreen === 'idle' && !hasAnyDialpadSession) {
    return (
      <div className="relative mb-2 mt-1">
        <div className="rounded-xl border border-ucass-active-bg bg-gradient-to-r from-[#f8fbff] to-[#f1f7ff] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-11 w-11 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <span className="absolute inset-1 flex items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <PhoneCall className="h-4 w-4" />
              </span>
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="text-[12px] font-semibold text-[#183960] sm:text-sm">
                Waiting for call
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[#6a7f9e] sm:text-xs">
                Connecting you to the next campaign contact.
              </p>
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[10px] font-medium text-[#5a7396]">
                  {campaignName}
                </span>
                <span className="rounded-full border border-ucass-active-bg bg-ucass-active-bg px-2 py-0.5 text-[9px] font-semibold tracking-[0.04em] text-[#1f4f8f]">
                  {campaignType}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
              <button
                type="button"
                onClick={handleLeaveCampaign}
                className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isPredictiveDialMethod) {
    return null;
  }

  if (campaignContactCards === null) {
    return null;
  }

  const leadValidationDialog = (
    <Dialog open={leadValidationAlert.open}>
      <DialogContent
        className="z-[1401] w-[calc(100vw-2rem)] max-w-[430px] gap-0 rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-0 shadow-2xl"
        overlayClassName="z-[1400]"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="flex flex-col items-center gap-4 px-6 py-7 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[#2E2D35]">Campaign lead updated</h3>
            <p className="text-sm leading-6 text-[#9A948F]">{leadValidationAlert.message}</p>
            <p className="text-sm font-semibold text-primary">
              Fetching a new lead in {leadValidationAlert.countdown}s...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (totalContacts === 0) {
    return (
      <div className="relative mb-2 mt-1 overflow-hidden rounded-2xl border border-ucass-active-bg bg-[radial-gradient(circle_at_20%_20%,rgba(177,211,255,0.35),transparent_48%),radial-gradient(circle_at_85%_80%,rgba(143,196,255,0.22),transparent_48%),linear-gradient(135deg,#f7fbff,#eef5ff)] px-3 py-3">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-ucass-active-bg/70 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-7 -left-6 h-20 w-20 rounded-full bg-ucass-active-bg/70 blur-2xl" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-2 text-left">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-ucass-active-bg bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
              <Clock3 className="h-3.5 w-3.5" />
              Campaign Queue
            </div>

            <p className="text-[12px] font-semibold leading-snug text-[#183960] sm:text-sm">
              {isWaitTerminal ? 'Nothing to call right now.' : 'Waiting for another contact.'}
            </p>
            {waitReason ? (
              <p className="text-[11px] leading-snug text-[#43648f] sm:text-xs">{waitReason}</p>
            ) : null}
          </div>

          {shouldShowProcessingLoopTimer && !isWaitTerminal ? (
            <div className="self-center sm:self-auto">
              <DialpadCountdownRingTimer
                key={`empty-queue-timer-${resolvedCampaignId || 'default'}-${emptyQueueTimerRunId}`}
                currentTimeSeconds={nextContactDelaySeconds}
                onTimeEnds={handleEmptyQueueTimerEnds}
              />
            </div>
          ) : null}
        </div>
        {leadValidationDialog}
      </div>
    );
  }

  return (
    <div className="relative mb-2 mt-1">
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={handleAccordionValueChange}
      >
        <AccordionItem value={CAMPAIGN_OVERVIEW_ACCORDION_VALUE} className="relative border-0">
          <AccordionContent
            className={cn(
              '!pb-0 !pt-0',
              fullPage
                ? 'mb-2'
                : 'absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-20',
            )}
          >
            <DialpadCampaignContactCard
              firstCampaignCard={firstCampaignCard}
              onCall={handleCall}
              onSkip={handleSkip}
              canCall={canCall}
              canSkip={canSkip}
              showCallButton={!isProgressiveDialMethod || Boolean((firstCampaignCard as any)?.previewOnly)}
              isSkipLoading={isSkipLoading}
              allowSkipping={!isProgressiveDialMethod && allowSkipping}
              previewTimeSeconds={isProgressiveDialMethod ? 0 : previewTimeSeconds}
              timerReferenceTimestampMs={
                isProgressiveDialMethod ? undefined : previewTimerReferenceTimestampMs
              }
              timerKey={previewTimerKey}
              onTimerValueChange={handlePreviewTimerValueChange}
              skipReasons={skipReasons}
              agentDispositions={agentDispositions}
              pauseTimer={interruptedByAnotherCall}
            />
          </AccordionContent>

          <AccordionTrigger
            variant="default"
            className="rounded-xl border border-ucass-active-bg bg-gradient-to-r from-[#f8fbff] to-[#f1f7ff] px-3 py-2 hover:no-underline"
          >
            <div className="flex w-full min-w-0 items-center justify-between gap-2 text-left">
              <p className="truncate text-[12px] font-semibold text-[#183960]">{campaignName}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-full border border-ucass-active-bg bg-ucass-active-bg px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-[#1f4f8f]">
                  {campaignType}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleLeaveCampaign();
                  }}
                  className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Leave
                </button>
              </div>
            </div>
          </AccordionTrigger>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default DialpadCampaignOverview;
