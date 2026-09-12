/**
 * Route element for /crm-widget.
 *
 * A CRM embeds this page in a CROSS-ORIGIN iframe, and Chrome partitions storage
 * for third-party frames: the widget gets its own empty localStorage and cannot
 * see the session from a top-level Unified tab, however signed-in that tab is.
 *
 * The shared AuthProvider answers a missing token with <Navigate to="/" />, and
 * "/" is precisely the route a CRM may NOT frame (it still sends
 * X-Frame-Options: SAMEORIGIN -- only /crm-widget is embeddable). So inside
 * HubSpot that redirect produced a refused frame and a broken-page icon rather
 * than anything the user could act on.
 *
 * This route therefore skips AuthProvider and PlanPendingGuard on purpose and
 * renders the login form IN PLACE instead of navigating away. Signing in here
 * writes the token into the frame's own partitioned storage -- exactly where the
 * widget needs it -- and the login page finishes with window.location.reload(),
 * which reloads /crm-widget itself and comes back with a token.
 */
import { lazy, Suspense } from 'react';
import { JitsiContextProvider } from '@/context/jitsi-context';
import { SocketEventsProvider } from '@/context/socket-events-context';
import { useUser } from '@/hooks/use-user';
import CrmWidgetPage from './index';

const Login = lazy(() => import('@/pages/login'));

const CrmWidgetShell = () => {
  const { user } = useUser();

  // Render, never redirect: a navigation away from /crm-widget lands on a route
  // the CRM is not allowed to frame.
  if (!user?.token) {
    return (
      <Suspense fallback={null}>
        <Login />
      </Suspense>
    );
  }

  return (
    <SocketEventsProvider>
      <JitsiContextProvider>
        <CrmWidgetPage />
      </JitsiContextProvider>
    </SocketEventsProvider>
  );
};

export default CrmWidgetShell;
