import FullPageLoader from '@/components/custom/full-page-loader';
import { useUser } from '@/hooks/use-user';
import { PLAN_PENDING_FLAG_KEY } from '@/lib/utils';
import React from 'react';
import { Navigate } from 'react-router-dom';

function AuthRemover({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loader } = useUser();
  const isPlanPendingFromStorage =
    typeof window !== 'undefined' ? localStorage.getItem(PLAN_PENDING_FLAG_KEY) === 'true' : false;

  if (loader) {
    return <FullPageLoader />;
  }

  if (!user?.token || isPlanPendingFromStorage) {
    return children;
  }

  return <Navigate to={'/dashboard'} replace={true} />;
}

export default AuthRemover;
