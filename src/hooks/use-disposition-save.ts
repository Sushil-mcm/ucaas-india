import type { DialpadSession } from '@/context/dialpad-context';
import { isServerDialed } from '@/lib/campaign-dial-mode';
import { hasAnyAnswer, validateScriptAnswers, type ScriptAnswerProblem } from '@/lib/script-inputs';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import {
  addDispositionInLeadContatc,
  makeCallQueueAvailable,
  queueDisposition,
} from '@/services/api';
import { useCallback, useMemo, useState } from 'react';

/**
 * Saving a call's label (disposition) and moving the agent on.
 *
 * This used to live inside the Dispositions tab's Save button, which meant
 * the only way a label could be saved was by that button while that tab was
 * open. The campaign wrap-up timer needs the same save when it runs out with
 * a label ticked and nothing pressed (live test, 9 Sep: both predictive calls
 * ended with the tick lost), and the timer lives on the ended screen, a
 * different component. So the save is a hook both can call; the tab keeps
 * its list and its button, the ended screen gets the auto-save.
 *
 * What a save does is unchanged: a queue call posts the queue disposition and
 * puts the agent back to Available; a campaign call posts the lead
 * disposition, clears the ended session and asks for the next contact
 * (server-dialled: back to Available and wait; browser-dialled: the campaign
 * card fetches the next lead).
 */

export type DispositionItem = {
  _id?: string;
  disposition?: {
    name?: string;
  } | null;
};

const getHeaderFirstValue = (
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

/** The labels this call may be given: the campaign's on a campaign leg, else the queue's. */
export const sessionDispositions = (session: DialpadSession | null): DispositionItem[] => {
  const queueId = String(session?.queueMetaData?.id || '').trim();
  const campaignId = String(session?.campaignMetaData?.id || '').trim();
  const forwardTypeFromHeader = getHeaderFirstValue(session?.headers, 'x-forwardtype')
    .trim()
    .toUpperCase();
  const shouldForceCampaignFromHeader =
    Boolean(queueId && campaignId) && forwardTypeFromHeader === 'CAMPAIGN';

  const queueDispositionList = session?.queueMetaData?.response?.agentDisposition;
  const campaignDispositionList = session?.campaignMetaData?.response?.agentDisposition;

  if (shouldForceCampaignFromHeader && Array.isArray(campaignDispositionList))
    return campaignDispositionList;
  if (Array.isArray(queueDispositionList)) return queueDispositionList;
  if (Array.isArray(campaignDispositionList)) return campaignDispositionList;
  return [];
};

/** The label the agent has ticked on this call but not yet saved, if any. */
export const tickedDisposition = (session: DialpadSession | null): DispositionItem | null => {
  const id = String(session?.dispositionId || '').trim();
  if (!id || session?.dispositionSaved) return null;
  return sessionDispositions(session).find((item) => String(item?._id || '') === id) || null;
};

const wrapupDurationSeconds = (session: DialpadSession | null): number => {
  const queueWrapupTime = Number(session?.queueMetaData?.response?.settings?.wrapup_time ?? 0);
  const campaignWrapupTime = Number(
    session?.campaignMetaData?.response?.dialerSetting?.wrapup_time ?? 0,
  );
  const wrapupTime = queueWrapupTime > 0 ? queueWrapupTime : campaignWrapupTime;
  if (!Number.isFinite(wrapupTime) || wrapupTime <= 0) return 0;
  return Math.floor(wrapupTime);
};

/** Seconds of wrap-up left at `now`, recorded with the label as wrap_time_sec. */
export const wrapupSecondsLeft = (
  session: DialpadSession | null,
  nowTimestampMs: number = Date.now(),
): number => {
  const total = wrapupDurationSeconds(session);
  if (total <= 0) return 0;
  const reference = session?.endedAt || session?.connectedAt || session?.startedAt || 0;
  if (!reference) return total;
  const elapsed = Math.max(0, Math.floor((Math.max(nowTimestampMs, reference) - reference) / 1000));
  return Math.max(0, total - elapsed);
};

/* Sessions a save is running for right now, across every mounted caller, so
   the ended screen's auto-save and a Save press in the same second cannot
   post the label twice. */
const savingSessions = new Set<string>();

export const useDispositionSave = () => {
  const {
    clearSession,
    setCampaignContactCards,
    openDialpad,
    isDialpadOpen,
    setActiveCampaign,
    patchSession,
    sipContact,
  } = useDialpad();
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
  const currentUserUuid = user?.uuid || '';
  const currentCompanyUuid = user?.company_info?.uuid || '';
  const [isSaving, setIsSaving] = useState(false);
  /* Script questions still unanswered (or answered badly) when the save was
     asked for. The label cannot be saved over a required question left blank. */
  const [answerProblems, setAnswerProblems] = useState<ScriptAnswerProblem[]>([]);

  /**
   * Save `disposition` on `session`. Resolves true when the label was
   * recorded (the session is cleared and the next contact asked for), false
   * when nothing was saved: no label, a script problem (reported through
   * `answerProblems`), a session that is neither queue nor campaign, or a
   * request that failed.
   */
  const save = useCallback(
    async (session: DialpadSession | null, disposition: DispositionItem | null): Promise<boolean> => {
      if (!session || !disposition) return false;
      const sessionId = String(session.id || '').trim();
      if (!sessionId || savingSessions.has(sessionId)) return false;

      const queueId = String(session.queueMetaData?.id || '').trim();
      const campaignId = String(session.campaignMetaData?.id || '').trim();
      const forwardTypeFromHeader = getHeaderFirstValue(session.headers, 'x-forwardtype')
        .trim()
        .toUpperCase();
      const shouldForceCampaignFromHeader =
        Boolean(queueId && campaignId) && forwardTypeFromHeader === 'CAMPAIGN';
      const isQueueCallSession = shouldForceCampaignFromHeader ? false : Boolean(queueId);
      const isCampaignCallSession = shouldForceCampaignFromHeader ? true : Boolean(campaignId);
      if (!isQueueCallSession && !isCampaignCallSession) return false;

      /* What the agent filled into the script, cleaned against the questions
         it asked. A required question left blank stops the save here, with the
         question named, rather than saving a label over a half-done script. */
      const scriptCheck = validateScriptAnswers(
        Array.isArray(session.scriptInputs) ? session.scriptInputs : [],
        session.scriptAnswers || {},
      );
      setAnswerProblems(scriptCheck.problems);
      if (scriptCheck.problems.length) return false;
      const scriptAnswers = hasAnyAnswer(scriptCheck.answers) ? scriptCheck.answers : null;
      /* Which script was open, so the answers report can find this call. Sent
         only when it is a real id; the server ignores anything else. */
      const openScriptId = String(session.scriptId || '').trim();
      const scriptRef = /^[0-9a-fA-F]{24}$/.test(openScriptId) ? { scriptId: openScriptId } : {};

      const currentWrapupSnapshot = wrapupSecondsLeft(session);
      const dispositionName = disposition.disposition?.name || '';
      const userName =
        `${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`.trim();
      const contactPhone =
        getHeaderFirstValue(session.headers, 'x-originalnumber') ||
        session.remoteNumber ||
        session.liveCallData?.called_number ||
        '';

      savingSessions.add(sessionId);
      setIsSaving(true);
      try {
        let shouldClearAllSessions = true;

        if (isQueueCallSession) {
          const queuePayload = {
            disposition: {
              disposition: dispositionName,
              name: userName,
              extension: user?.user_info?.extension || '',
              uuid: user?.uuid || '',
              createdAt: new Date().toISOString(),
              _id: queueId,
            },
            contactName: '',
            contactPhone,
            sipCallId:
              getHeaderFirstValue(session.headers, 'x-cid') ||
              getHeaderFirstValue(session.headers, 'call-id') ||
              session.liveCallData?.sip_call_id ||
              session.id ||
              '',
            source: 'QUEUE',
            serviceDetail: {
              name: session.queueMetaData?.response?.name || '',
              type: 'QUEUE',
              uuid: queueId,
            },
            wrap_time_sec: currentWrapupSnapshot,
            queueUuid: queueId,
            ...(scriptAnswers ? { script_answers: scriptAnswers } : {}),
            ...scriptRef,
          };

          await queueDisposition(queuePayload);
          /* Labelled: wrap-up modes that let a labelled call be left early now can. */
          patchSession(sessionId, { dispositionSaved: true });
          await makeCallQueueAvailable({
            queue_uuid: queueId,
            status: 'Available',
            state: 'Waiting',
          });
          console.log('Queue disposition saved', queuePayload);
        } else if (isCampaignCallSession) {
          const campaignNumberId = String(
            session.liveCallData?.campaign_number_uuid ||
              getHeaderFirstValue(session.headers, 'x-campaignnumberuuid') ||
              '',
          ).trim();
          const contactId = String(
            session.liveCallData?.contact_uuid ||
              getHeaderFirstValue(session.headers, 'x-contactuuid') ||
              '',
          ).trim();
          const campaignName =
            session.campaignMetaData?.response?.name || session.liveCallData?.campaign_name || '';
          const campaignType =
            session.campaignMetaData?.response?.dialMethod ||
            session.liveCallData?.campaign_type ||
            'CAMPAIGN';
          const contactName =
            session.liveCallData?.contact_name ||
            `${session.contactInfo?.name?.first || ''} ${session.contactInfo?.name?.last || ''}`.trim() ||
            session.remoteName ||
            '';
          const campaignPayload = {
            disposition: {
              disposition: dispositionName,
              name: userName,
              extension: user?.user_info?.extension || '',
              uuid: user?.uuid || '',
              createdAt: new Date().toISOString(),
              _id: String(disposition?._id || '').trim(),
            },
            contactId,
            contactName,
            contactPhone,
            sipCallId:
              session.liveCallData?.sip_call_id ||
              getHeaderFirstValue(session.headers, 'x-cid') ||
              getHeaderFirstValue(session.headers, 'call-id') ||
              session.id ||
              '',
            source: 'LEAD',
            serviceDetail: {
              name: campaignName,
              type: campaignType,
              uuid: campaignId,
            },
            wrap_time_sec: currentWrapupSnapshot,
            campaignNumberId,
            /* Saved with the call and merged onto the lead (campaign-api). */
            ...(scriptAnswers ? { script_answers: scriptAnswers } : {}),
            ...scriptRef,
          };

          await addDispositionInLeadContatc(campaignPayload);
          console.log('Campaign disposition saved', campaignPayload);
          patchSession(sessionId, { dispositionSaved: true });

          const campaignDialMethod = String(campaignType || '')
            .trim()
            .toUpperCase();
          const isPredictiveCampaign = isServerDialed(campaignDialMethod);
          const shouldFetchNextContact =
            (campaignDialMethod === 'PROGRESSIVE' ||
              campaignDialMethod === 'PREVIEW' ||
              isPredictiveCampaign) &&
            !!socketEventsManager &&
            !!campaignId &&
            !!currentUserUuid &&
            !!currentCompanyUuid;

          if (shouldFetchNextContact) {
            try {
              clearSession(sessionId);
              if (isPredictiveCampaign) {
                socketEventsManager.emit(
                  'campaign-system-events',
                  {
                    body: {
                      campaignId,
                      queue:
                        session.liveCallData?.queue ||
                        session.campaignMetaData?.response?.queue ||
                        '',
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

                const availabilityResponse = await makeCallQueueAvailable({
                  campaign_uuid: campaignId,
                  status: 'Available',
                  state: 'Waiting',
                  sip_contact: sipContact,
                });
                console.log('makeCallQueueAvailable response:', availabilityResponse);

                if (!isDialpadOpen) {
                  openDialpad('maxi');
                }
              } else {
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
                    deferredNextAction: null,
                  };
                });
                if (!isDialpadOpen) {
                  openDialpad('maxi');
                }
              }
              shouldClearAllSessions = false;
            } catch (error) {
              console.error('Failed to fetch campaign contacts after disposition save', error);
            }
          }
        }

        if (shouldClearAllSessions) {
          clearSession(sessionId);
        }
        return true;
      } catch (error) {
        console.error('Failed to save disposition', error);
        return false;
      } finally {
        savingSessions.delete(sessionId);
        setIsSaving(false);
      }
    },
    [
      clearSession,
      currentCompanyUuid,
      currentUserUuid,
      isDialpadOpen,
      openDialpad,
      patchSession,
      setActiveCampaign,
      setCampaignContactCards,
      socketEventsManager,
      user,
      userDetailsPayload,
    ],
  );

  return { save, isSaving, answerProblems };
};
