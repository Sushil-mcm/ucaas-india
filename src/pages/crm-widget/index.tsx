/**
 * /crm-widget — the single embedded widget every CRM gets.
 *
 * One UI, one route. Which CRM is hosting it only changes which adapter is
 * loaded (see adapters/), never the widget itself:
 *   - Zoho / HubSpot embed it as an iframe (their telephony/calling extensions)
 *   - the MCM Chrome extension opens it as a panel for CRMs with no embed slot
 *
 * The panel is the existing maxi dialpad, so it already carries the full call
 * surface: dialer, in-call controls, DTMF, transfer/merge, contact info, call
 * history and notes. This page adds the CRM glue and the message/email actions.
 *
 * NOTE: this route is the only one on the host allowed to be framed by a CRM
 * (nginx `location = /crm-widget` + unified-embeddable-headers.conf). Every
 * other route stays X-Frame-Options: SAMEORIGIN.
 */
import { useEffect, useMemo, useRef } from 'react';
import DialpadGlobalOverlay from '@/components/dialpad/dialpad-global-overlay';
import { useDialpad } from '@/hooks/use-dialpad';
import { detectCrmId } from './adapters';
import CrmBridge from './crm-bridge';

const CrmWidgetPage = () => {
  const { openDialpad, makeCall, isRegistered, sessions, activeSessionId } = useDialpad();
  const dialedRef = useRef(false);

  const crmId = useMemo(() => detectCrmId(), []);

  const activeSession = activeSessionId ? sessions?.[activeSessionId] : null;
  const activeNumber = String(activeSession?.remoteNumber || '').trim();

  // Open straight into the full panel — the widget IS the dialpad here, so the
  // mini size would waste the frame the CRM already gave us.
  useEffect(() => {
    openDialpad?.('maxi');
  }, [openDialpad]);

  // Auto-dial ?dial=<number>, used by the Chrome extension's click-to-call.
  // Waits for registration, and fires once per page load.
  useEffect(() => {
    if (dialedRef.current || !isRegistered) return;
    let dial = '';
    try {
      dial = new URLSearchParams(window.location.search).get('dial') || '';
    } catch (_e) {
      dial = '';
    }
    if (!dial) return;
    dialedRef.current = true;
    openDialpad?.('maxi');
    makeCall?.(dial);
  }, [isRegistered, makeCall, openDialpad]);

  // Message and email open the full app in a new tab rather than re-implementing
  // the inbox inside a CRM iframe: the agent gets threads, history and
  // attachments, and no CRM needs a popup permission for it.
  const openInApp = (path: string) => {
    try {
      window.open(`${window.location.origin}${path}`, '_blank', 'noopener,noreferrer');
    } catch (_e) {
      /* popup blocked */
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <CrmBridge crmId={crmId} />

      <div className="min-h-0 flex-1">
        <DialpadGlobalOverlay />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 px-3 py-2">
        <button
          type="button"
          disabled={!activeNumber}
          onClick={() =>
            openInApp(`/inbox?formState=contact&number=${encodeURIComponent(activeNumber)}`)
          }
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 enabled:hover:bg-gray-50 disabled:opacity-40"
        >
          Message
        </button>
        <button
          type="button"
          disabled={!activeNumber}
          onClick={() =>
            openInApp(`/contacts?search=${encodeURIComponent(activeNumber)}`)
          }
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 enabled:hover:bg-gray-50 disabled:opacity-40"
        >
          Open contact
        </button>
        <span className="ml-auto text-xs text-gray-400">
          {isRegistered ? 'Connected' : 'Connecting…'}
        </span>
      </div>
    </div>
  );
};

export default CrmWidgetPage;
