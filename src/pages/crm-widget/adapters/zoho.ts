/**
 * Zoho CRM adapter — PhoneBridge / telephony widget.
 *
 * Zoho embeds us as an iframe whose URL is the "Start URL" of a Telephony
 * connected app (Developer Console -> extension -> Connected App -> Telephony).
 * Inside that iframe Zoho exposes ZOHO.embeddedApp, documented events:
 *
 *   Dial          agent clicked a call icon next to a phone field
 *   DialerActive  the softphone panel was toggled
 *   PageLoad      a record detail page was opened
 *
 * ZOHO.embeddedApp.init() MUST be called only after every .on() is registered,
 * or the events registered late never fire.
 *
 * Deliberately does NOT write Call records. crm-integration-api already logs
 * every call to Zoho server-side from the CDR (ZohoRepository.createCallLog),
 * which is the only path that sees the real duration and disposition. Logging
 * here too would double every call in Zoho.
 */
import type { CrmAdapter, CrmCallEvent, CrmHost } from './types';

const SDK_URL = 'https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js';
const SDK_ELEMENT_ID = 'zoho-embedded-app-sdk';

declare global {
  interface Window {
    ZOHO?: any;
  }
}

/** Inject Zoho's SDK once; resolve when window.ZOHO exists. */
const loadSdk = (): Promise<any> =>
  new Promise((resolve, reject) => {
    if (window.ZOHO) {
      resolve(window.ZOHO);
      return;
    }
    const existing = document.getElementById(SDK_ELEMENT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    const done = () => (window.ZOHO ? resolve(window.ZOHO) : reject(new Error('ZOHO SDK absent')));
    script.addEventListener('load', done);
    script.addEventListener('error', () => reject(new Error('ZOHO SDK failed to load')));
    if (!existing) {
      script.id = SDK_ELEMENT_ID;
      script.src = SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

/**
 * Zoho's Dial payload is not stable across versions and differs by the field
 * that was clicked, so read every key it is known to use rather than one.
 */
const readNumber = (data: any): string =>
  String(
    data?.Number ?? data?.number ?? data?.phone ?? data?.Phone ?? data?.mobile ?? data?.Mobile ?? '',
  ).trim();

export const createZohoAdapter = (): CrmAdapter => {
  let zoho: any = null;

  const dialer = () => zoho?.CRM?.UI?.Dialer;

  return {
    id: 'zoho',
    label: 'Zoho CRM',

    async connect(host: CrmHost) {
      zoho = await loadSdk();

      zoho.embeddedApp.on('Dial', (data: any) => {
        const number = readNumber(data);
        if (!number) return;
        host.dial({
          number,
          recordId: data?.EntityId ?? data?.entityId,
          entity: data?.Entity ?? data?.entity,
        });
      });

      zoho.embeddedApp.on('DialerActive', () => {
        host.setVisible(true);
      });

      // Registration must come before init(), never after.
      await zoho.embeddedApp.init();
    },

    onCallStarted(_event: CrmCallEvent) {
      // Bring Zoho's own softphone frame forward so the agent sees the call.
      try {
        dialer()?.maximize?.();
      } catch (_e) {
        /* the host may not expose the dialer on every page */
      }
    },

    onCallEnded(_event: CrmCallEvent) {
      try {
        dialer()?.minimize?.();
      } catch (_e) {
        /* ignore */
      }
    },

    dispose() {
      zoho = null;
    },
  };
};
