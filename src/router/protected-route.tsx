import React from 'react';
import { Navigate } from 'react-router-dom';
import UpgradeRequired from '@/components/plan-upgrade-required';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';

interface FeatureGuard {
  feature?: string; // plan level (IS_SHOW)
  permission?: string; // user level (action.view)
}

interface ProtectedRouteProps {
  element: React.ReactElement;
  guard?: FeatureGuard;
  trialRestricted?: boolean;
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  guard,
  trialRestricted = false,
}) => {
  const { features, companyFeatures, IS_ADMIN } = useCompanyFeatures();
  const { user } = useUser();

  const resolve = (obj: unknown, path?: string) => {
    if (!path) return undefined;
    return path
      .split('.')
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
        obj,
      );
  };

  if (trialRestricted && user?.company_info?.is_trial === 'Y') {
    return <UpgradeRequired />;
  }

  // Plan availability must always come from the company subscription, even
  // when the signed-in user has a custom role.
  const featureAvailable = resolve(companyFeatures.plan_features, guard?.feature);

  if (guard?.feature && featureAvailable !== true) {
    return IS_ADMIN ? (
      <UpgradeRequired featureKey={guard.feature} />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  }

  /* ---------- PERMISSION CHECK ---------- */
  const hasPermission = resolve(features.plan_features, guard?.permission);

  // A missing key is not permission. This prevents stale/incorrect paths from
  // silently allowing a protected page.
  if (guard?.permission && hasPermission !== true) {
    return IS_ADMIN ? (
      <UpgradeRequired featureKey={guard.permission} />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  }

  return element;
};

export default ProtectedRoute;
