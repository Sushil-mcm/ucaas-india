import type { DialpadSession } from '@/context/dialpad-context';
import { isServerDialed } from '@/lib/campaign-dial-mode';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
// import { handleAlert } from '@/lib/utils';
import {
  // addDispositionInLeadContatc,
  createEventAndTask,
  makeCallQueueAvailable,
  saveNoteInLeadContact,
  // queueDisposition,
} from '@/services/api';
import moment from 'moment';
import { CalendarClock, Clock3, NotebookPen, Phone, PhoneOff, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DialpadCountdownRingTimer from './dialpad-countdown-ring-timer';
import { holdsForLabel, wrapupVerdict } from '@/lib/wrapup-rule';
import { tickedDisposition, useDispositionSave } from '@/hooks/use-disposition-save';
import DialpadScheduleCallback from './dialpad-schedule-callback';
import DialpadSessionSummaryCard from './dialpad-session-summary-card';
import { getDialpadSessionState } from '../session-status';
import { formatDialpadDuration } from './dialpad-call-timer';
import { handleAlert } from '@/lib/utils';
import { isExtensionDialTarget } from '@/lib/extension-utility';
import { getMonitoringCallLabel } from '../session-display';

type DialpadEndedScreenProps = {
  session: DialpadSession | null;
  onAddNotes: () => void;
  onCallAgain: () => void;
  onClose: () => void;
};

/* The wait before the next lead is no longer a constant here. Leaving
   nextContactDelayMs unset hands the decision to dialpad-campaign-overview,
   the one reader, which resolves it from the campaign's wait_after_call, the
   company default, or the built-in number (src/lib/campaign-timers.ts). */

// const getScheduleCallbackSuccessMessage = (response: any): string => {
//   return (
//     response?.data?.data?.result?.messages ||
//     response?.data?.result?.messages ||
//     response?.data?.data?.message ||
//     response?.data?.message ||
//     'Callback scheduled successfully.'
//   );
// };

const getHeaderFirstValueFromSessionHeaders = (
  headers: DialpadSession['headers'] | undefined,
  headerName: string,
): string => {
  if (!headers) return '';

  const normalizedHeaderName = headerName.trim().toLowerCase();
  const matchingHeaderEntry = Object.entries(headers).find(
    ([name]) => name.trim().toLowerCase() === normalizedHeaderName,
  );
  if (!matchingHeaderEntry) return '';

  const [, values] = matchingHeaderEntry;
  if (!Array.isArray(values) || values.length === 0) return '';
  return String(values[0] || '').trim();
};

/** How long the no-answer strip waits before moving to the next contact.
    Long enough to read it and reach a button, short enough not to drag. */
const NO_ANSWER_STRIP_SECONDS = 10;

const DialpadEndedScreen = ({
  session,
  onAddNotes,
  onCallAgain,
  onClose,
}: DialpadEndedScreenProps) => {
  const {
    clearAllSessions,
    clearSession,
    setCampaignContactCards,
    setActiveCampaign,
    makeCall,
    patchSession,
    sipContact,
  } = useDialpad();
  const { save: saveDisposition } = useDispositionSave();
  const { socketEventsManager } = useSocketEvents();
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
  const wrapupAvailabilityCallRef = useRef<string | null>(null);
  const [isScheduleCallbackOpen, setIsScheduleCallbackOpen] = useState(false);
  const [noAnswerCountdown, setNoAnswerCountdown] = useState<number | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const unansweredCampaignHandledSessionRef = useRef<string | null>(null);
  const endedCampaignWithoutWrapupHandledSessionRef = useRef<string | null>(null);
  const currentUserUuid = user?.uuid || '';
  const currentCompanyUuid = user?.company_info?.uuid || '';

  const normalizedCause = (session?.cause || '').toLowerCase();
  /* Still used by the wrap-up timer and the queue/campaign paths below. */
  const isRejectedCause = normalizedCause.includes('rejected');

  /* The shared reader, not a second copy of the rules. This screen used to
     decide the wording itself off `session.cause` alone, which knows nothing
     about the SIP response, so every carrier failure -- 500, the codec
     rejection on the India route, 480, 410 -- collapsed into "Call Failed".
     getDialpadSessionState reads the status code and the Q.850 cause the
     switch actually sent, so the agent is told "Busy", "Number disconnected"
     or "Carrier error (500)" and can act on it. */
  const endState = getDialpadSessionState(session);
  const endStatus = endState.label;

  /* The reason line: the plain-English explanation when there is one, falling
     back to the switch's raw cause. */
  const causeLabel = endState.detail || session?.cause || 'No reason available';
  const queueWrapupTimeSeconds = Number(
    session?.queueMetaData?.response?.settings?.wrapup_time ?? 0,
  );
  const campaignWrapupTimeSeconds = Number(
    session?.campaignMetaData?.response?.dialerSetting?.wrapup_time ?? 0,
  );
  const queueIdFromSession = String(session?.queueMetaData?.id || '').trim();
  const campaignIdFromSession = String(session?.campaignMetaData?.id || '').trim();
  const forwardTypeFromHeader = getHeaderFirstValueFromSessionHeaders(
    session?.headers,
    'x-forwardtype',
  )
    .trim()
    .toUpperCase();
  const shouldForceCampaignFromHeader =
    Boolean(queueIdFromSession && campaignIdFromSession) && forwardTypeFromHeader === 'CAMPAIGN';
  const hasQueueWrapupTimer = Number.isFinite(queueWrapupTimeSeconds) && queueWrapupTimeSeconds > 0;
  const hasCampaignWrapupTimer =
    Number.isFinite(campaignWrapupTimeSeconds) && campaignWrapupTimeSeconds > 0;
  const wrapupTimerSource = isRejectedCause
    ? null
    : shouldForceCampaignFromHeader
      ? hasCampaignWrapupTimer
        ? 'campaign'
        : null
      : hasQueueWrapupTimer
        ? 'queue'
        : hasCampaignWrapupTimer
          ? 'campaign'
          : null;
  const wrapupTimeSeconds =
    wrapupTimerSource === 'queue'
      ? queueWrapupTimeSeconds
      : wrapupTimerSource === 'campaign'
        ? campaignWrapupTimeSeconds
        : 0;
  const shouldShowWrapupTimer = Boolean(wrapupTimerSource);
  const wrapupReferenceTimestampMs =
    session?.endedAt || session?.connectedAt || session?.startedAt || 0;
  const liveForwardType = String(session?.liveCallData?.forward_type || '')
    .trim()
    .toUpperCase();
  const liveCampaignType = String(session?.liveCallData?.campaign_type || '')
    .trim()
    .toUpperCase();
  const isQueueCallFromSession = shouldForceCampaignFromHeader
    ? false
    : Boolean(
        queueIdFromSession ||
        (liveForwardType === 'QUEUE' && String(session?.liveCallData?.forward_value || '').trim()),
      );
  const isCampaignCallFromSession = shouldForceCampaignFromHeader
    ? true
    : Boolean(campaignIdFromSession || liveForwardType === 'CAMPAIGN' || liveCampaignType);
  const campaignIdForNoAnswerFetch = String(
    campaignIdFromSession || session?.liveCallData?.forward_value || '',
  ).trim();
  const isOutgoingNoAnswerCampaignCall = Boolean(
    isCampaignCallFromSession &&
    String(session?.direction || '').toLowerCase() === 'outgoing' &&
    !session?.hasAnswered &&
    ['ended', 'failed'].includes(String(session?.status || '').toLowerCase()),
  );
  /* Which of the five wrap-up rules this queue chose. Every queue call used to
     hide the close button outright, so "optional" and "cannot be skipped" were
     the same product - the supervisor's choice was saved and ignored.
     
     The half that still is not honoured is "may leave early once the call is
     labelled": whether a disposition has been picked is held in the disposition
     tab, a different component, so it is passed as false here. That makes every
     mandatory mode behave exactly as it does today, and only the modes that let
     the agent go are newly obeyed. Nothing gets stricter than it was. */
  const wrapupRule = wrapupVerdict({
    /* A queue call reads the queue's rule; a campaign call reads the
       campaign's (dialerSetting.wrapup_mode, same five values). */
    mode:
      session?.queueMetaData?.response?.settings?.after_call?.wrapup_prompt ||
      session?.campaignMetaData?.response?.dialerSetting?.wrapup_mode,
    totalSeconds: wrapupTimeSeconds,
    elapsedSeconds: wrapupReferenceTimestampMs
      ? Math.max(0, Math.floor((Date.now() - Number(wrapupReferenceTimestampMs)) / 1000))
      : 0,
    /* Set by the disposition tab: either the agent saved a label, or there
       was never one to save. A mandatory wrap-up cannot hold the agent
       hostage to a choice that does not exist - see dispositionUnavailable
       on DialpadSession. Both count as "labelled" for mayLeave. */
    hasDisposition: Boolean(session?.dispositionSaved) || Boolean(session?.dispositionUnavailable),
  });

  /* The campaign wrap-up ran out with nothing saved and the rule requires a
     label: the screen stays, at 0:00, until one is saved. Close is hidden
     for the same reason the timer no longer moves on. */
  const hasDispositionForRule =
    Boolean(session?.dispositionSaved) || Boolean(session?.dispositionUnavailable);
  const isHeldForLabel = Boolean(session?.wrapupHeld) && !hasDispositionForRule;
  const shouldHideCloseButton =
    (isQueueCallFromSession || isCampaignCallFromSession) &&
    !isRejectedCause &&
    /* Both a queue and a campaign now carry a rule of their own. */
    (!wrapupRule.mayLeave || isHeldForLabel);
  const sessionDialTarget = String(session?.remoteNumber || session?.extension || '').trim();
  const isExtensionCallSession = isExtensionDialTarget(sessionDialTarget);
  const monitorCallLabel = getMonitoringCallLabel(
    session?.remoteNumber || session?.extension || '',
  );
  const isMonitoringCall = Boolean(monitorCallLabel);
  const isEndedSession = String(session?.status || '').toLowerCase() === 'ended';
  const shouldShowMonitoringCloseButton = isMonitoringCall && isEndedSession;
  const shouldShowBottomActionButtons = !isMonitoringCall;
  const shouldShowCloseButton = shouldShowMonitoringCloseButton || !shouldHideCloseButton;

  const shouldShowCallAgainButton = !isQueueCallFromSession && !isCampaignCallFromSession;
  const callDurationSeconds = useMemo(() => {
    const callStartTimeMs = Number(session?.connectedAt || session?.startedAt || 0);
    const callEndTimeMs = Number(session?.endedAt || Date.now());

    if (!callStartTimeMs || !Number.isFinite(callStartTimeMs)) return 0;
    if (!Number.isFinite(callEndTimeMs)) return 0;

    return Math.max(0, Math.floor((callEndTimeMs - callStartTimeMs) / 1000));
  }, [session?.connectedAt, session?.endedAt, session?.startedAt]);

  const getHeaderFirstValue = useCallback(
    (headerName: string): string => {
      return getHeaderFirstValueFromSessionHeaders(session?.headers, headerName);
    },
    [session?.headers],
  );

  const getCampaignNextAction = useCallback(
    (status: string) => {
      const campaignNumberId = String(
        session?.liveCallData?.campaign_number_uuid ||
          getHeaderFirstValue('x-campaignnumberuuid') ||
          '',
      ).trim();
      const contactId = String(
        session?.liveCallData?.contact_uuid || getHeaderFirstValue('x-contactuuid') || '',
      ).trim();
      const contactName = String(
        session?.liveCallData?.contact_name || session?.remoteName || '',
      ).trim();
      const contactNumber = String(
        getHeaderFirstValue('x-originalnumber') ||
          session?.remoteNumber ||
          session?.liveCallData?.called_number ||
          '',
      ).trim();
      const campaignId = String(
        session?.campaignMetaData?.id || session?.liveCallData?.forward_value || '',
      ).trim();

      const callStartTimeMs = Number(session?.connectedAt || session?.startedAt || 0);
      const callEndTimeMs = Number(session?.endedAt || Date.now());
      const durationSeconds = callStartTimeMs
        ? Math.max(0, Math.floor((callEndTimeMs - callStartTimeMs) / 1000))
        : 0;

      return {
        campaign_number: {
          _id: campaignNumberId || undefined,
          campaignId: campaignId || undefined,
          contactId: contactId || undefined,
          contactName: contactName || undefined,
          contactNumber: contactNumber || undefined,
        },
        status,
        duration: durationSeconds,
      };
    },
    [
      getHeaderFirstValue,
      session?.campaignMetaData?.id,
      session?.connectedAt,
      session?.endedAt,
      session?.liveCallData?.called_number,
      session?.liveCallData?.campaign_number_uuid,
      session?.liveCallData?.contact_name,
      session?.liveCallData?.contact_uuid,
      session?.liveCallData?.forward_value,
      session?.remoteName,
      session?.remoteNumber,
      session?.startedAt,
    ],
  );

  const fetchCampaignPreviewContacts = useCallback(
    async (campaignId: string, options?: { status?: string }) => {
      const normalizedCampaignId = String(campaignId || '').trim();
      if (!normalizedCampaignId) return;
      if (!socketEventsManager || !currentUserUuid || !currentCompanyUuid) return;

      const campaignDialMethod = String(
        session?.campaignMetaData?.response?.dialMethod ||
          session?.liveCallData?.campaign_type ||
          '',
      )
        .trim()
        .toUpperCase();
      const isPredictiveCampaign = isServerDialed(campaignDialMethod);

      if (isPredictiveCampaign) {
        socketEventsManager.emit(
          'campaign-system-events',
          {
            body: {
              campaignId: normalizedCampaignId,
              queue:
                session?.liveCallData?.queue || session?.campaignMetaData?.response?.queue || '',
              user_uuid: currentUserUuid,
              userDetail: userDetailsPayload,
            },
          },
          (res: any) => {
            const firstLevel = Array.isArray(res) ? res[0] : null;
            const eventPayload = Array.isArray(firstLevel) ? firstLevel[0] : firstLevel;
            const campaignStatusFromEvent = String(eventPayload?.campaignStatus || '')
              .trim()
              .toUpperCase();
            if (['COMPLETED', 'COMPLETE', 'PAUSE'].includes(campaignStatusFromEvent)) {
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
            campaign_uuid: normalizedCampaignId,
            status: 'Available',
            state: 'Waiting',
            sip_contact: sipContact,
          });
          console.log('makeCallQueueAvailable response:', availabilityResponse);
        } catch (error) {
          console.error('makeCallQueueAvailable failed for predictive campaign:', error);
        }

        return;
      }

      setCampaignContactCards([]);
      setActiveCampaign((prev: any) => {
        const currentStatus = String(
          prev?.manualStatus || prev?.campaignStatus || '',
        ).toUpperCase();
        if (['COMPLETED', 'COMPLETE', 'PAUSE'].includes(currentStatus)) return prev;

        return {
          ...(prev || {}),
          manualStatus: 'PROCESSING',
          nextContactDelayMs: undefined,
          deferredNextAction: getCampaignNextAction(options?.status || ''),
        };
      });
    },
    [
      currentCompanyUuid,
      currentUserUuid,
      getCampaignNextAction,
      session?.campaignMetaData?.response?.dialMethod,
      session?.campaignMetaData?.response?.queue,
      session?.liveCallData?.campaign_type,
      session?.liveCallData?.queue,
      setActiveCampaign,
      setCampaignContactCards,
      socketEventsManager,
      userDetailsPayload,
    ],
  );

  const handleQueueWrapupTimeEnds = useCallback(async () => {
    const queueId = String(session?.queueMetaData?.id || '').trim();
    const sessionId = String(session?.id || '').trim();
    if (!queueId || !sessionId) return;

    const callKey = `queue:${sessionId}:${queueId}`;
    if (wrapupAvailabilityCallRef.current === callKey) return;

    wrapupAvailabilityCallRef.current = callKey;

    try {
      await makeCallQueueAvailable({
        queue_uuid: queueId,
        status: 'Available',
        state: 'Waiting',
      });
      clearAllSessions();
    } catch (error) {
      wrapupAvailabilityCallRef.current = null;
      console.error('Failed to mark queue available after wrap-up timer end', error);
    }
  }, [clearAllSessions, session?.id, session?.queueMetaData?.id]);

  /* When the campaign wrap-up runs out (live test, 9 Sep: both predictive
     calls ended with the tick lost when the 15 s passed):
       1. a label is ticked and not saved  -> save it now, then move on as a
          Save press would (the hook clears the session and asks for the next
          contact);
       2. nothing is ticked and the rule requires a label -> stay here, timer
          at 0:00, until one is saved; the next contact waits;
       3. otherwise -> close and move on, as before.
     A save that fails falls through to 2, so the label is never silently
     dropped: the agent sees the screen and can press Save. */
  const handleCampaignWrapupTimeEnds = useCallback(async () => {
    const campaignId = String(session?.campaignMetaData?.id || '').trim();
    const sessionId = String(session?.id || '').trim();
    if (!campaignId || !sessionId) return;

    const callKey = `campaign:${sessionId}:${campaignId}`;
    if (wrapupAvailabilityCallRef.current === callKey) return;

    wrapupAvailabilityCallRef.current = callKey;

    const ticked = tickedDisposition(session);
    if (ticked) {
      const saved = await saveDisposition(session, ticked);
      if (saved) return;
    }

    const labelled =
      Boolean(session?.dispositionSaved) || Boolean(session?.dispositionUnavailable);
    const mode = session?.campaignMetaData?.response?.dialerSetting?.wrapup_mode;
    if (!labelled && holdsForLabel(mode)) {
      patchSession(sessionId, { wrapupHeld: true });
      return;
    }

    try {
      clearSession(sessionId);
      void fetchCampaignPreviewContacts(campaignId, { status: '' });
    } catch (error) {
      wrapupAvailabilityCallRef.current = null;
      console.error('Failed to fetch campaign contacts after wrap-up timer end', error);
    }
  }, [clearSession, fetchCampaignPreviewContacts, patchSession, saveDisposition, session]);

  const handleWrapupTimeEnds = useCallback(() => {
    if (wrapupTimerSource === 'queue') {
      void handleQueueWrapupTimeEnds();
      return;
    }

    if (wrapupTimerSource === 'campaign') {
      void handleCampaignWrapupTimeEnds();
    }
  }, [handleCampaignWrapupTimeEnds, handleQueueWrapupTimeEnds, wrapupTimerSource]);

  useEffect(() => {
    if (!isExtensionCallSession) return;
    if (!isScheduleCallbackOpen) return;
    setIsScheduleCallbackOpen(false);
  }, [isExtensionCallSession, isScheduleCallbackOpen]);

  useEffect(() => {
    const sessionId = String(session?.id || '').trim();
    if (!sessionId) return;
    if (!campaignIdForNoAnswerFetch) return;
    if (!isOutgoingNoAnswerCampaignCall) return;
    if (unansweredCampaignHandledSessionRef.current === sessionId) return;

    /* A no-answer used to jump straight to the next lead, which felt like the
       call had been swallowed. Now a short strip says what happened and gives
       the agent a moment to retry or schedule a callback before moving on. */
    unansweredCampaignHandledSessionRef.current = sessionId;
    setNoAnswerCountdown(NO_ANSWER_STRIP_SECONDS);
  }, [campaignIdForNoAnswerFetch, isOutgoingNoAnswerCampaignCall, session?.id]);

  const moveOnAfterNoAnswer = useCallback(() => {
    const sessionId = String(session?.id || '').trim();
    setNoAnswerCountdown(null);
    if (sessionId) clearSession(sessionId);
    if (campaignIdForNoAnswerFetch) {
      void fetchCampaignPreviewContacts(campaignIdForNoAnswerFetch, { status: 'NOT_DIALED' });
    }
  }, [campaignIdForNoAnswerFetch, clearSession, fetchCampaignPreviewContacts, session?.id]);

  useEffect(() => {
    if (noAnswerCountdown === null) return;
    if (noAnswerCountdown <= 0) {
      moveOnAfterNoAnswer();
      return;
    }
    const timer = setTimeout(() => setNoAnswerCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [moveOnAfterNoAnswer, noAnswerCountdown]);

  const handleRetryNoAnswer = useCallback(() => {
    const sessionId = String(session?.id || '').trim();
    const target = String(session?.remoteNumber || '').trim();
    setNoAnswerCountdown(null);
    if (sessionId) clearSession(sessionId);
    if (!target) return;
    // Same lead, same campaign headers, so the switch treats it as the same attempt context.
    void makeCall(target, { extraHeaders: Array.isArray(session?.extraHeaders) ? session.extraHeaders : [] });
  }, [clearSession, makeCall, session?.extraHeaders, session?.id, session?.remoteNumber]);

  useEffect(() => {
    const sessionId = String(session?.id || '').trim();
    if (!sessionId) return;
    if (!campaignIdForNoAnswerFetch) return;
    if (!isCampaignCallFromSession) return;
    if (isOutgoingNoAnswerCampaignCall) return;
    if (isRejectedCause) return;
    if (shouldShowWrapupTimer) return;
    if (!['ended', 'failed'].includes(String(session?.status || '').toLowerCase())) return;
    if (endedCampaignWithoutWrapupHandledSessionRef.current === sessionId) return;

    endedCampaignWithoutWrapupHandledSessionRef.current = sessionId;
    clearSession(sessionId);
    void fetchCampaignPreviewContacts(campaignIdForNoAnswerFetch, { status: '' });
  }, [
    campaignIdForNoAnswerFetch,
    clearSession,
    fetchCampaignPreviewContacts,
    isCampaignCallFromSession,
    isOutgoingNoAnswerCampaignCall,
    isRejectedCause,
    session?.id,
    session?.status,
    shouldShowWrapupTimer,
  ]);

  const handleSaveScheduleCallback = useCallback(
    async (selectedDateTime: Date) => {
      const queueId = String(session?.queueMetaData?.id || '').trim();
      const campaignId = String(session?.campaignMetaData?.id || '').trim();
      const forwardTypeFromHeaderForSave = getHeaderFirstValue('x-forwardtype')
        .trim()
        .toUpperCase();
      const shouldForceCampaignForSave =
        Boolean(queueId && campaignId) && forwardTypeFromHeaderForSave === 'CAMPAIGN';
      const isQueueCallSession = shouldForceCampaignForSave ? false : Boolean(queueId);
      const hasCampaignSession = shouldForceCampaignForSave ? true : Boolean(campaignId);
      const callbackScheduledDate = selectedDateTime.toISOString();
      const userName =
        `${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`.trim();
      const contactPhone =
        getHeaderFirstValue('x-originalnumber') ||
        session?.remoteNumber ||
        session?.liveCallData?.called_number ||
        '';
      // const elapsedSeconds = wrapupReferenceTimestampMs
      //   ? Math.max(0, Math.floor((Date.now() - wrapupReferenceTimestampMs) / 1000))
      //   : 0;
      // const currentWrapupSnapshot = Math.max(0, Math.floor(wrapupTimeSeconds - elapsedSeconds));
      const sipCallId =
        session?.liveCallData?.sip_call_id ||
        getHeaderFirstValue('x-cid') ||
        getHeaderFirstValue('call-id') ||
        session?.id ||
        '';

      // const campaignNumberId = String(
      //   session?.liveCallData?.campaign_number_uuid ||
      //   getHeaderFirstValue('x-campaignnumberuuid') ||
      //   '',
      // ).trim();
      // const contactId = String(
      //   session?.liveCallData?.contact_uuid || getHeaderFirstValue('x-contactuuid') || '',
      // ).trim();
      // const campaignName =
      //   session?.campaignMetaData?.response?.name || session?.liveCallData?.campaign_name || '';
      // const campaignType =
      //   session?.campaignMetaData?.response?.dialMethod ||
      //   session?.liveCallData?.campaign_type ||
      //   'CAMPAIGN';
      const contactName =
        session?.liveCallData?.contact_name ||
        `${session?.contactInfo?.name?.first || ''} ${session?.contactInfo?.name?.last || ''}`.trim() ||
        session?.remoteName ||
        '';
      // const queueName = session?.queueMetaData?.response?.name || '';

      const eventTaskPayload = {
        name: 'Call Back Schedule',
        startTime: moment(selectedDateTime).format('YYYY-MM-DD HH:mm:ss'),
        description: '',
        category: 'TASK',
        reminderMode: ['EMAIL', 'NOTIFICATION'],
        reminder: true,
        mode: 'CALL',
        requestStatus: 'CALLBACK_SCHEDULED',
        source: isQueueCallSession ? 'QUEUE' : hasCampaignSession ? 'LEAD' : 'CONTACT',
        sipCallId: sipCallId || null,
        didNumber: user?.user_info?.caller_id || '',
        timezone:
          user?.settings?.operational_hours?.regional?.timezone?.value ||
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          'Asia/Kolkata',
        members: [
          {
            extension: String(user?.user_info?.extension || '').trim(),
            email: String(user?.user_info?.email || user?.email || '').trim(),
            name: userName,
            type: String(user?.role || user?.user_info?.role || 'ADMIN').toUpperCase(),
            user_uuid: String(user?.uuid || '').trim(),
          },
        ],
        details: {
          contactName: contactName || ' ',
          contactPhone: contactPhone || '',
        },
      };

      setIsScheduling(true);
      try {
        const response = await createEventAndTask(eventTaskPayload);

        handleAlert({
          text: response?.data?.data?.message || 'Callback scheduled successfully',
          type: 'success',
        });
        setIsScheduleCallbackOpen(false);
      } catch (error) {
        console.error('Failed to schedule queue callback disposition', error);
      } finally {
        setIsScheduling(false);
      }

      /* Until now the chosen date was only logged: the lead never became a
         scheduled callback and nothing ever dialled it. The campaign service's
         note-and-disposition save sets the lead to CALLBACK_SCHEDULED with the
         date, which both the preview list and the server dialer pick up when
         it comes due. */
      if (hasCampaignSession) {
        const campaignNumberId =
          getHeaderFirstValue('x-campaignnumberuuid') ||
          String((session as any)?.liveCallData?.campaign_number_uuid || '').trim();
        const contactUuid =
          getHeaderFirstValue('x-contactuuid') ||
          String((session as any)?.liveCallData?.contact_uuid || '').trim();
        try {
          /* Only the keys the campaign service's validator names; anything
             else is a 400. */
          await saveNoteInLeadContact({
            contact_uuid: contactUuid || null,
            sipcall_id: sipCallId || null,
            phone: contactPhone || null,
            note: null,
            creator_uuid: String(user?.uuid || '').trim(),
            campaign_detail: {
              campaignId,
              campaignNumberId: campaignNumberId || null,
              campaignName: session?.campaignMetaData?.response?.name || '',
              campaignType: session?.campaignMetaData?.response?.dialMethod || '',
            },
            callback_scheduled_date: callbackScheduledDate,
          });
          handleAlert({
            text: `Callback scheduled for ${moment(selectedDateTime).format('D MMM, h:mm a')}. The lead will be dialled again then.`,
            type: 'success',
          });
          setNoAnswerCountdown(null);
          const sessionId = String(session?.id || '').trim();
          if (sessionId) clearSession(sessionId);
          if (campaignId && !isServerDialed(session?.campaignMetaData?.response?.dialMethod)) {
            void fetchCampaignPreviewContacts(campaignId, { status: '' });
          }
        } catch (error: any) {
          handleAlert({
            text: `Could not schedule the callback: ${error?.response?.data?.error?.message || error?.message || 'unknown error'}`,
            type: 'error',
          });
        }
      }
      setIsScheduleCallbackOpen(false);
    },
    [
      getHeaderFirstValue,
      clearSession,
      fetchCampaignPreviewContacts,
      user?.uuid,
      session?.campaignMetaData?.id,
      session?.campaignMetaData?.response?.agentDisposition,
      session?.campaignMetaData?.response?.dialMethod,
      session?.campaignMetaData?.response?.name,
      session?.queueMetaData?.id,
      session?.queueMetaData?.response?.agentDisposition,
      session?.queueMetaData?.response?.name,
      session?.contactInfo?.name?.first,
      session?.contactInfo?.name?.last,
      session?.id,
      session?.liveCallData?.called_number,
      session?.liveCallData?.campaign_name,
      session?.liveCallData?.campaign_number_uuid,
      session?.liveCallData?.campaign_type,
      session?.liveCallData?.contact_name,
      session?.liveCallData?.contact_uuid,
      session?.liveCallData?.sip_call_id,
      session?.remoteName,
      session?.remoteNumber,
      user?.user_info?.extension,
      user?.user_info?.first_name,
      user?.user_info?.last_name,
      user?.uuid,
      wrapupReferenceTimestampMs,
      wrapupTimeSeconds,
    ],
  );

  return (
    <div className="flex h-full  flex-col w-full justify-between xl:gap-10">
      <div className="mt-1 mb-2 rounded-2xl  bg-white   md:mb-4">
        <div className="mb-2.5 sm:mb-3">
          <DialpadSessionSummaryCard session={session} statusLabel={endStatus} showTimer={false} />
        </div>

        <div className="rounded-xl border border-red-100  px-2.5 py-1.5 text-[11px] font-medium text-red-600  bg-red-50  max-[380px]:px-2 max-[380px]:py-1.5 max-[380px]:text-[10px] sm:px-3 sm:py-2 sm:text-xs flex items-center gap-2 ">
          <PhoneOff className="h-3 w-3 max-[380px]:h-3 max-[380px]:w-3 sm:h-3.5 sm:w-3.5" />
          {endStatus}
        </div>

        <p className="mt-2.5 rounded-xl border border-[#e8edf6] bg-[#f9fbff] px-2.5 py-1.5 text-[11px] font-medium text-primary max-[380px]:px-2 max-[380px]:py-1.5 max-[380px]:text-[10px] sm:mt-3 sm:px-3 sm:py-2 sm:text-xs">
          Cause: {causeLabel}
        </p>

        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#d9e5f6] bg-ucass-active-bg px-2.5 py-1.5 text-[11px] font-semibold text-[#2f4f79] max-[380px]:px-2 max-[380px]:py-1.5 max-[380px]:text-[10px] sm:px-3 sm:py-2 sm:text-xs">
          <span className="flex items-center gap-2">
            <Clock3 className="h-3 w-3 max-[380px]:h-3 max-[380px]:w-3 sm:h-3.5 sm:w-3.5" />
            Duration
          </span>
          <span className="font-mono">{formatDialpadDuration(callDurationSeconds)}</span>
        </div>

        {noAnswerCountdown !== null ? (
          <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            <p className="font-semibold">No answer. Next contact in {noAnswerCountdown}s.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                onClick={handleRetryNoAnswer}
              >
                Retry now
              </button>
              <button
                type="button"
                className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-[11px] font-semibold text-amber-900"
                onClick={() => {
                  setNoAnswerCountdown(null);
                  setIsScheduleCallbackOpen(true);
                }}
              >
                Schedule callback
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-1 text-[11px] font-semibold text-amber-900 underline"
                onClick={moveOnAfterNoAnswer}
              >
                Next contact
              </button>
            </div>
          </div>
        ) : null}

        {shouldShowWrapupTimer ? (
          <div className="mt-3 flex w-full flex-col items-center justify-center gap-1.5 sm:mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] max-[380px]:text-[10px] sm:text-xs">
              {wrapupTimerSource === 'queue' ? 'Queue Wrap-up Time' : 'Campaign Wrap-up Time'}
            </p>
            <DialpadCountdownRingTimer
              currentTimeSeconds={wrapupTimeSeconds}
              referenceTimestampMs={wrapupReferenceTimestampMs}
              onTimeEnds={handleWrapupTimeEnds}
            />
            {isHeldForLabel ? (
              <p className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[12px] font-medium text-amber-900">
                Pick an outcome for this call and save it. The next contact waits until you do.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {!shouldShowBottomActionButtons && !shouldShowCloseButton ? null : (
        <div className="mt-auto grid grid-cols-1 gap-1.5 sm:gap-2">
          {shouldShowBottomActionButtons ? (
            <>
              {!isExtensionCallSession ? (
                isScheduleCallbackOpen ? (
                  <DialpadScheduleCallback
                    onSave={handleSaveScheduleCallback}
                    isLoading={isScheduling}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsScheduleCallbackOpen(true)}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#d4e1f6] bg-ucass-active-bg text-[12px] font-semibold text-[#2f4f79] transition max-[380px]:h-8 max-[380px]:text-[11px] sm:h-10 sm:gap-2 sm:text-sm"
                  >
                    <CalendarClock className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
                    Schedule Callback
                  </button>
                )
              ) : null}

              {!isExtensionCallSession ? (
                <button
                  type="button"
                  onClick={onAddNotes}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#d4e1f6] bg-ucass-active-bg text-[12px] font-semibold text-[#2f4f79] transition max-[380px]:h-8 max-[380px]:text-[11px] sm:h-10 sm:gap-2 sm:text-sm"
                >
                  <NotebookPen className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
                  Add Notes
                </button>
              ) : null}

              {shouldShowCallAgainButton && session?.direction === 'outgoing' ? (
                <button
                  type="button"
                  onClick={onCallAgain}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary text-[12px] font-semibold text-white transition max-[380px]:h-8 max-[380px]:text-[11px] sm:h-10 sm:gap-2 sm:text-sm"
                >
                  <Phone className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
                  Call Again
                </button>
              ) : null}
            </>
          ) : null}

          {!isCampaignCallFromSession ? (
            <button
              type="button"
              onClick={clearAllSessions}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-[12px] font-semibold text-red-600 transition hover:bg-red-100 max-[380px]:h-8 max-[380px]:text-[11px] sm:h-10 sm:gap-2 sm:text-sm"
            >
              <Trash2 className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
              Clear All Sessions
            </button>
          ) : null}

          {shouldShowCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl  bg-red-600 text-white text-[12px] font-semibold  transition max-[380px]:h-8 max-[380px]:text-[11px] sm:h-10 sm:gap-2 sm:text-sm"
            >
              <PhoneOff className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
              Close
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default DialpadEndedScreen;
