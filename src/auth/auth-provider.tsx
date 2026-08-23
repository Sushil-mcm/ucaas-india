import FullPageLoader from '@/components/custom/full-page-loader';
import { useUser } from '@/hooks/use-user';
import { PLAN_PENDING_FLAG_KEY } from '@/lib/utils';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loader } = useUser();
  const location = useLocation();
  const isPhoneLinesAuthRoute = location.pathname === '/phone-lines-auth';
  const isPlanPendingFromStorage =
    typeof window !== 'undefined' ? localStorage.getItem(PLAN_PENDING_FLAG_KEY) === 'true' : false;

  if (loader) {
    return <FullPageLoader />;
  }

  if (!user?.token) {
    return <Navigate to="/" state={{ from: location }} replace={true} />;
  }

  if (isPlanPendingFromStorage) {
    return <Navigate to="/renew-plan" state={{ from: location }} replace={true} />;
  }

  if (isPhoneLinesAuthRoute) {
    return user?.company_info?.free_did ? <Navigate to="/dashboard" replace={true} /> : children;
  }

  if (!user?.company_info?.free_did) {
    return (
      <Navigate
        to="/phone-lines-auth"
        state={{ from: location, isLogin: true, planUuid: user?.plan_uuid }}
        replace={true}
      />
    );
  }

  return children;
}

export default AuthProvider;
