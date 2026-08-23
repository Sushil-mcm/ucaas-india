import { useUser } from './use-user';

type FeatureMap = Record<string, any>;

const asFeatureMap = (value: unknown): FeatureMap => {
  if (typeof value === 'string') {
    try {
      return asFeatureMap(JSON.parse(value));
    } catch {
      return {};
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as FeatureMap)
    : {};
};

/**
 * Both company features and role permissions have used wrapped and unwrapped
 * shapes over time. Convert every supported response into the module map that
 * contains keys such as `chat`, `account_setting`, and `campaign`.
 */
export const extractPlanFeatures = (source: unknown): FeatureMap => {
  let current = asFeatureMap(source);

  // The current company response is `plan_features.plan_features`, while role
  // permissions are normally `permission.plan_features`.
  for (let depth = 0; depth < 3 && 'plan_features' in current; depth += 1) {
    current = asFeatureMap(current.plan_features);
  }

  const monitoringActions = asFeatureMap(
    asFeatureMap(current.monitoring_features).action,
  );

  // Keep older custom roles that used the misspelled key working while all
  // consumers use the canonical `whisper` key from the current response.
  if (!('whisper' in monitoringActions) && 'wishper' in monitoringActions) {
    return {
      ...current,
      monitoring_features: {
        ...asFeatureMap(current.monitoring_features),
        action: {
          ...monitoringActions,
          whisper: monitoringActions.wishper,
        },
      },
    };
  }

  return current;
};

export const useCompanyFeatures = () => {
  const { user } = useUser();
  const { user_info, company_info } = user || {};
  const IS_ADMIN = user_info?.role === 'ADMIN';
  const companyPlanFeatures = extractPlanFeatures(company_info?.plan_features);
  const rolePermission =
    user_info?.custom_role_data?.permission ??
    user_info?.role_data?.permission ??
    user_info?.permission;
  const rolePlanFeatures = extractPlanFeatures(rolePermission);
  const planFeatures = IS_ADMIN ? companyPlanFeatures : rolePlanFeatures;

  return {
    features: { plan_features: planFeatures },
    companyFeatures: { plan_features: companyPlanFeatures },
    planFeatures,
    companyPlanFeatures,
    user_info,
    user,
    IS_ADMIN,
  };
};
