/**
 * /hubspot-dialer — chrome-less dialer page.
 * Used two ways:
 *   1) Embedded by HubSpot's Calling Extensions iframe (via HubspotBridge).
 *   2) Opened by the MCM Chrome extension as a popup with ?dial=<number> to
 *      auto-place a click-to-call from any web CRM.
 * Reuses the existing softphone (DialpadProvider auto-registers on login).
 */
import { useEffect, useRef } from 'react';
import DialpadGlobalOverlay from '@/components/dialpad/dialpad-global-overlay';
import { useDialpad } from '@/hooks/use-dialpad';
import HubspotBridge from './hubspot-bridge';

const HubspotDialerPage = () => {
  const { openDialpad, makeCall, isRegistered } = useDialpad();
  const dialedRef = useRef(false);

  useEffect(() => {
    openDialpad?.('mini');
  }, [openDialpad]);

  // Auto-dial a number passed via ?dial= (used by the Chrome extension), once
  // the softphone is registered. Fires only once per page load.
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
    openDialpad?.('mini');
    makeCall?.(dial);
  }, [isRegistered, makeCall, openDialpad]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      <HubspotBridge />
      <DialpadGlobalOverlay />
    </div>
  );
};

export default HubspotDialerPage;
