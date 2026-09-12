/**
 * HubspotBridge — glue between HubSpot's Calling Extensions SDK and our existing
 * jssip dialpad (DialpadContext). No telephony here; it just:
 *   HubSpot  -> us:  onDialNumber  => dialpad.makeCall(number)
 *   us -> HubSpot:   outgoing/answered/ended  (so HubSpot logs the call)
 *
 * Rendered only inside /hubspot-dialer (the chrome-less iframe HubSpot embeds).
 * Renders nothing.
 */
import CallingExtensions from '@hubspot/calling-extensions-sdk';
import { useEffect, useRef } from 'react';
import { useDialpad } from '@/hooks/use-dialpad';
import { useUser } from '@/hooks/use-user';

type ReportState = {
  sessionId?: string;
  outgoing?: boolean;
  answered?: boolean;
  ended?: boolean;
};

const HubspotBridge = () => {
  const { makeCall, openDialpad, sessions, activeSessionId, isRegistered } = useDialpad();
  const { user } = useUser();

  const ctiRef = useRef<any>(null);
  const reportRef = useRef<ReportState>({});
  // keep latest dial fns in a ref so the SDK init effect runs once
  const dialRef = useRef({ makeCall, openDialpad });
  dialRef.current = { makeCall, openDialpad };

  // ---- init the HubSpot Calling Extensions SDK once ----
  useEffect(() => {
    // The SDK's TS types mark every handler required; we only need a few, so the
    // handlers object is intentionally loosely typed.
    const eventHandlers: any = {
        // HubSpot iframe is ready -> tell it our widget state.
        onReady: () => {
          try {
            cti.initialized({ isLoggedIn: true });
          } catch (_e) {
            /* ignore */
          }
        },
        // Agent clicked "Call" on a number in HubSpot.
        onDialNumber: (data: any) => {
          const number = String(
            data?.phoneNumber || data?.toNumber || data?.number || '',
          ).trim();
          if (!number) return;
          try {
            dialRef.current.openDialpad?.('mini');
            dialRef.current.makeCall?.(number);
          } catch (_e) {
            /* ignore */
          }
        },
        onEngagementCreated: () => void 0,
        onVisibilityChanged: () => void 0,
        onCreateEngagementSucceeded: () => void 0,
        onCreateEngagementFailed: () => void 0,
        onCallerIdMatchSucceeded: () => void 0,
        onCallerIdMatchFailed: () => void 0,
        onNavigateToRecordFailed: () => void 0,
        onPublishToChannelSucceeded: () => void 0,
        onPublishToChannelFailed: () => void 0,
        onSetWidgetUrlFailed: () => void 0,
    };
    const cti: any = new CallingExtensions({ debugMode: false, eventHandlers } as any);
    ctiRef.current = cti;
    return () => {
      ctiRef.current = null;
    };
  }, []);

  // ---- reflect softphone registration as HubSpot login state ----
  useEffect(() => {
    const cti = ctiRef.current;
    if (!cti) return;
    try {
      if (isRegistered) cti.userLoggedIn?.();
      else cti.userLoggedOut?.();
    } catch (_e) {
      /* ignore */
    }
  }, [isRegistered]);

  // ---- report the active call's lifecycle back to HubSpot ----
  useEffect(() => {
    const cti = ctiRef.current;
    if (!cti) return;
    const session = activeSessionId ? sessions?.[activeSessionId] : null;
    if (!session) return;

    // reset tracking when a new session becomes active
    if (reportRef.current.sessionId !== session.id) {
      reportRef.current = { sessionId: session.id };
    }
    const rep = reportRef.current;
    const status = String(session.status || '').toLowerCase();

    if (!rep.outgoing && session.direction === 'outgoing') {
      rep.outgoing = true;
      try {
        cti.outgoingCall?.({
          phoneNumber: session.remoteNumber,
          callStartTime: session.startedAt || Date.now(),
          createEngagement: true, // HubSpot creates the call engagement/log
        });
      } catch (_e) {
        /* ignore */
      }
    }

    if (
      !rep.answered &&
      (session.hasAnswered || status === 'accepted' || status === 'confirmed')
    ) {
      rep.answered = true;
      try {
        cti.callAnswered?.({ externalCallId: session.id });
      } catch (_e) {
        /* ignore */
      }
    }

    if (!rep.ended && (status === 'ended' || status === 'failed')) {
      rep.ended = true;
      try {
        cti.callEnded?.({
          externalCallId: session.id,
          callEndStatus: status === 'failed' ? 'FAILED' : 'COMPLETED',
        });
        cti.callCompleted?.({
          hideWidget: false,
          engagementProperties: {
            hs_call_body: `Call with ${session.remoteName || session.remoteNumber || ''}`,
          },
        });
      } catch (_e) {
        /* ignore */
      }
    }
  }, [sessions, activeSessionId, user]);

  return null;
};

export default HubspotBridge;
