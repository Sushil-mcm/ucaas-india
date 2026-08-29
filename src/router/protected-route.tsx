import React from 'react';
import { Navigate } from 'react-router-dom';
import UpgradeRequired from '@/components/plan-upgrade-required';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';

interface FeatureGuard {
  feature?: string; // plan level (IS_SHOW)
  permission?: string; // user level (action.view)
  /* For pages that must be administrator-only but have no permission key yet.
     A permission string the backend does not return reads as "no permission"
     and locks everyone out, so a page cannot be given its own key until the API
     ships it. This gate depends on nothing the backend has to add. */
  adminOnly?: boolean;
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

  /* Checked before the plan and permission gates: an administrator-only page is
     not an upgrade problem, so a non-admin is sent away rather than shown a
     screen offering them a bigger plan. */
  if (guard?.adminOnly && !IS_ADMIN) {
    return <Navigate to="/dashboard" replace />;
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
