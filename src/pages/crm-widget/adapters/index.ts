/**
 * Adapter registry + host detection.
 *
 * The widget is told which host is embedding it by the ?crm= parameter, which we
 * control: it is baked into the content URL configured in each host's developer
 * console or app manifest. Detection from the embedding origin is only a
 * fallback for hosts that rewrite the URL, and for the Chrome extension, which
 * embeds the same widget with no host SDK at all.
 */
import { createHubspotAdapter } from './hubspot';
import { createTeamsAdapter } from './teams';
import type { CrmAdapter } from './types';
import { createZohoAdapter } from './zoho';

/**
 * No host SDK: the widget runs on its own (Chrome extension popup).
 *
 * When a call ends it announces a summary with window.postMessage. The browser
 * extension's content script on this origin relays it to the CRM tab the call
 * was dialled from, which offers to drop a call note into that CRM -- the Tier C
 * path for CRMs we have no API connection to. With no extension installed the
 * message simply has no listener.
 *
 * Targeted at our own origin, never "*": a call summary contains a phone number.
 */
const createStandaloneAdapter = (): CrmAdapter => {
  const answeredAt = new Map<string, number>();

  return {
    id: 'standalone',
    label: 'MCM Dialer',
    connect() {
      /* nothing to subscribe to */
    },
    onCallAnswered(event) {
      answeredAt.set(event.sessionId, Date.now());
    },
    onCallEnded(event) {
      const endedAt = Date.now();
      const talkStart = answeredAt.get(event.sessionId);
      answeredAt.delete(event.sessionId);
      try {
        window.postMessage(
          {
            source: 'mcm-crm-widget',
            type: 'MCM_CALL_ENDED',
            call: {
              sessionId: event.sessionId,
              number: event.number,
              name: event.name || '',
              direction: event.direction || '',
              status: event.status || '',
              answered: talkStart !== undefined,
              startedAt: typeof event.startedAt === 'number' ? event.startedAt : endedAt,
              endedAt,
              // Talk time, measured from answer -- ringing is not duration.
              durationSec: talkStart !== undefined ? Math.max(0, Math.round((endedAt - talkStart) / 1000)) : 0,
            },
          },
          window.location.origin,
        );
      } catch (_e) {
        /* never let a notification failure affect the call UI */
      }
    },
  };
};

const FACTORIES: Record<string, () => CrmAdapter> = {
  zoho: createZohoAdapter,
  hubspot: createHubspotAdapter,
  teams: createTeamsAdapter,
  standalone: createStandaloneAdapter,
};

/** Embedding origin -> adapter id, for hosts that drop our query string. */
const ORIGIN_HINTS: Array<[RegExp, string]> = [
  [/(^|\.)zoho\.(com|in|eu|com\.au|jp)$/i, 'zoho'],
  [/(^|\.)zohocloud\.ca$/i, 'zoho'],
  [/(^|\.)hubspot\.com$/i, 'hubspot'],
  [/(^|\.)teams\.microsoft\.com$/i, 'teams'],
  [/(^|\.)cloud\.microsoft$/i, 'teams'],
  [/(^|\.)skype\.com$/i, 'teams'],
];

/** The origin that framed us, when the browser will tell us. */
const embedderOrigin = (): string => {
  try {
    const ancestors = (window.location as any).ancestorOrigins;
    if (ancestors?.length) return String(ancestors[0]);
    if (document.referrer) return new URL(document.referrer).origin;
  } catch (_e) {
    /* cross-origin restrictions */
  }
  return '';
};

export const detectCrmId = (): string => {
  try {
    const explicit = new URLSearchParams(window.location.search).get('crm');
    if (explicit && FACTORIES[explicit.toLowerCase()]) return explicit.toLowerCase();
  } catch (_e) {
    /* ignore */
  }

  const origin = embedderOrigin();
  if (origin) {
    let host = '';
    try {
      host = new URL(origin).hostname;
    } catch (_e) {
      host = '';
    }
    const hit = ORIGIN_HINTS.find(([pattern]) => pattern.test(host));
    if (hit) return hit[1];
  }

  return 'standalone';
};

export const createAdapter = (id: string): CrmAdapter =>
  (FACTORIES[id] ?? createStandaloneAdapter)();

export type { CrmAdapter, CrmCallEvent, CrmDialRequest, CrmHost } from './types';
