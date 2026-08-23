import { SESSION_NAME, PLAN_PENDING_FLAG_KEY, RENEW_PLAN_FROM_APP_KEY } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * When user has a token but plan is expired (plan_payment_pending), they must
 * complete renewal before accessing any protected route. This guard redirects
 * them to /renew-plan until they pay.
 */
function PlanPendingGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  const token = localStorage.getItem(SESSION_NAME);
  const isPlanPending = localStorage.getItem(PLAN_PENDING_FLAG_KEY) === 'true';
  const shouldRedirect = Boolean(token && isPlanPending);

  useEffect(() => {
    if (shouldRedirect && !hasRedirected.current) {
      hasRedirected.current = true;
      sessionStorage.setItem(RENEW_PLAN_FROM_APP_KEY, '1');
      navigate('/renew-plan', { replace: true });
    }
  }, [shouldRedirect, navigate]);

  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
}

export default PlanPendingGuard;
