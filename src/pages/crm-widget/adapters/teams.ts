/**
 * Microsoft Teams adapter — personal tab.
 *
 * Teams is not a CRM, so there is no click-to-call event to receive and no
 * activity to write back: the tab is simply a host that gives the softphone a
 * home inside Teams. What Teams DOES require is a handshake — a tab that never
 * calls app.initialize() then app.notifySuccess() is shown as "There was a
 * problem reaching this app", however healthy the page itself is. That
 * handshake is the whole job of this adapter.
 *
 * Microphone: Teams gates device access on the manifest declaring
 * "devicePermissions": ["media"]. With that in place the ordinary
 * navigator.mediaDevices.getUserMedia() prompt works on the Teams web and
 * desktop clients, which is what the jssip softphone already calls — so nothing
 * here has to request it.
 *
 * The SDK is loaded from Microsoft's CDN rather than bundled: the tab must run
 * the version the host client expects, and pinning it in our build would mean a
 * redeploy every time that moves.
 */
import type { CrmAdapter, CrmHost } from './types';

const SDK_URL = 'https://res.cdn.office.net/teams-js/2.24.0/js/MicrosoftTeams.min.js';
const SDK_ELEMENT_ID = 'microsoft-teams-js-sdk';

declare global {
  interface Window {
    microsoftTeams?: any;
  }
}

const loadSdk = (): Promise<any> =>
  new Promise((resolve, reject) => {
    if (window.microsoftTeams) {
      resolve(window.microsoftTeams);
      return;
    }
    const existing = document.getElementById(SDK_ELEMENT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () =>
      window.microsoftTeams
        ? resolve(window.microsoftTeams)
        : reject(new Error('Teams SDK loaded but window.microsoftTeams is absent')),
    );
    script.addEventListener('error', () => reject(new Error('Teams SDK failed to load')));
    if (!existing) {
      script.id = SDK_ELEMENT_ID;
      script.src = SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

export const createTeamsAdapter = (): CrmAdapter => {
  let teams: any = null;

  return {
    id: 'teams',
    label: 'Microsoft Teams',

    async connect(_host: CrmHost) {
      teams = await loadSdk();
      await teams.app.initialize();

      // Tell Teams the tab is up. Without this the host shows its own error
      // frame and the user never sees the dialer at all.
      try {
        teams.app.notifySuccess();
      } catch (_e) {
        /* older hosts expose this only after a successful initialize */
      }
    },

    dispose() {
      teams = null;
    },
  };
};
