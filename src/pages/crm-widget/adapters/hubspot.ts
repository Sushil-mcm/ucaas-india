/**
 * HubSpot adapter — Calling Extensions SDK.
 *
 * Ported from the standalone /hubspot-dialer bridge so HubSpot and Zoho now run
 * the same widget. Unlike Zoho, HubSpot logs the call itself: outgoingCall with
 * createEngagement:true makes HubSpot create the engagement, so there is no
 * server-side call-log path to double up against here.
 */
import CallingExtensions from '@hubspot/calling-extensions-sdk';
import type { CrmAdapter, CrmCallEvent, CrmHost } from './types';

export const createHubspotAdapter = (): CrmAdapter => {
  let cti: any = null;

  return {
    id: 'hubspot',
    label: 'HubSpot',

    connect(host: CrmHost) {
      // The SDK's types mark every handler required; we need a few, so the
      // handler map is intentionally loosely typed.
      const eventHandlers: any = {
        onReady: () => {
          try {
            cti?.initialized({ isLoggedIn: true });
          } catch (_e) {
            /* ignore */
          }
        },
        onDialNumber: (data: any) => {
          const number = String(
            data?.phoneNumber || data?.toNumber || data?.number || '',
          ).trim();
          if (!number) return;
          host.dial({ number, recordId: data?.objectId, entity: data?.objectType });
        },
        onVisibilityChanged: (data: any) => {
          host.setVisible(Boolean(data?.isMinimized) === false);
        },
        onEngagementCreated: () => void 0,
        onCreateEngagementSucceeded: () => void 0,
        onCreateEngagementFailed: () => void 0,
        onCallerIdMatchSucceeded: () => void 0,
        onCallerIdMatchFailed: () => void 0,
        onNavigateToRecordFailed: () => void 0,
        onPublishToChannelSucceeded: () => void 0,
        onPublishToChannelFailed: () => void 0,
        onSetWidgetUrlFailed: () => void 0,
      };
      cti = new CallingExtensions({ debugMode: false, eventHandlers } as any);
    },

    setLoggedIn(loggedIn: boolean) {
      try {
        if (loggedIn) cti?.userLoggedIn?.();
        else cti?.userLoggedOut?.();
      } catch (_e) {
        /* ignore */
      }
    },

    onCallStarted(event: CrmCallEvent) {
      if (event.direction !== 'outgoing') return;
      try {
        cti?.outgoingCall?.({
          phoneNumber: event.number,
          callStartTime: event.startedAt || Date.now(),
          createEngagement: true,
        });
      } catch (_e) {
        /* ignore */
      }
    },

    onCallAnswered(event: CrmCallEvent) {
      try {
        cti?.callAnswered?.({ externalCallId: event.sessionId });
      } catch (_e) {
        /* ignore */
      }
    },

    onCallEnded(event: CrmCallEvent) {
      try {
        cti?.callEnded?.({
          externalCallId: event.sessionId,
          callEndStatus: event.status === 'failed' ? 'FAILED' : 'COMPLETED',
        });
        cti?.callCompleted?.({
          hideWidget: false,
          engagementProperties: {
            hs_call_body: `Call with ${event.name || event.number || ''}`,
          },
        });
      } catch (_e) {
        /* ignore */
      }
    },

    dispose() {
      cti = null;
    },
  };
};
