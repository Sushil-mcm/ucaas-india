import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { AREA_VIEWS, areaOfItem, areaOfPath, type AreaId } from './nav-areas';
import { navList, navListBottom, type NavItem } from './sidebar';

/**
 * Which area the app is in, and what belongs in the rail for it.
 *
 * The rail, the top nav and the page shell all need the same answer. Deriving
 * it here — from the URL and the RBAC-filtered nav lists — means none of them
 * has to tell the others, and the shell can drop the rail's gutter on the same
 * frame the rail decides not to render.
 *
 * A rail carrying a single item is worse than none: it costs a column to
 * restate the page you are already on. Home is the case that matters — the
 * console gives it no rail at all — but the rule holds for any area that
 * narrows to one item under a user's permissions.
 */
export const useAreaNav = () => {
  const { pathname } = useLocation();
  const { features, companyPlanFeatures: planFeatures } = useCompanyFeatures();
  const { user = {} } = useUser();
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';

  const topItems = useMemo(() => navList(features, IS_ADMIN), [features, IS_ADMIN]);
  const bottomItems = useMemo(() => navListBottom(features, IS_ADMIN), [features, IS_ADMIN]);

  // Resolved the same way the top bar used to resolve them for its own
  // shortcuts, before those shortcuts moved into this rail.
  const monitoringAccess = (features as any)?.plan_features?.monitoring?.action || {};
  const campaignAccess = (features as any)?.plan_features?.campaign?.IS_SHOW;
  const activityHref = (user as any)?.user_info?.uuid
    ? `/activity/${(user as any).user_info.uuid}`
    : undefined;
  const monitoringHref =
    !IS_ADMIN || !monitoringAccess?.view ? '/monitoring/department' : '/monitoring/all-calls';
  const dynamicHrefByKey: Record<string, string | undefined> = {
    'ext-activity': activityHref,
    'ext-monitoring': monitoringAccess?.view ? monitoringHref : undefined,
    'ext-campaigns': campaignAccess ? '/my-campaigns' : undefined,
  };

  const currentArea: AreaId = useMemo(
    () => areaOfPath(pathname, [...topItems, ...bottomItems]),
    [pathname, topItems, bottomItems],
  );

  const railTop = useMemo(
    () => topItems.filter((item: NavItem) => areaOfItem(item.name) === currentArea),
    [topItems, currentArea],
  );
  const railBottom = useMemo(
    () => bottomItems.filter((item: NavItem) => areaOfItem(item.name) === currentArea),
    [bottomItems, currentArea],
  );

  /**
   * An area that carries its own views shows those in the rail instead of its
   * route items — that is how the console navigates Performance. They are
   * shaped as nav items so the rail renders them without knowing the
   * difference, and they link through `?view=`, which the page already reads.
   */
  const areaConfig = AREA_VIEWS[currentArea];
  const areaViews = areaConfig?.views;
  const viewItems = useMemo(() => {
    if (!areaViews?.length) return [];
    const base = areaConfig?.base || `/${currentArea}`;
    // The plan gates that used to sit on the tab strip live here now, so a
    // tenant without video does not get a Video rail item.
    const allowed = areaViews.filter((view) => {
      if (view.feature === 'video') return Boolean(planFeatures?.video?.IS_SHOW);
      if (view.feature === 'ai') return Boolean(planFeatures?.ai?.IS_SHOW);
      if (view.feature === 'queue')
        return Boolean(planFeatures?.phone_system_action?.access?.QUEUE);
      // The three former top-bar shortcuts that depend on the signed-in user
      // — drop the rail item entirely rather than link somewhere broken.
      if (view.key in dynamicHrefByKey) return Boolean(dynamicHrefByKey[view.key]);
      return true;
    });
    return allowed.map((view, index) => {
      const resolvedHref = dynamicHrefByKey[view.key] ?? view.href;
      return {
        id: 1000 + index,
        name: view.label,
        link: resolvedHref || `${base}?view=${view.key}`,
        icon: view.icon,
        sep: view.sep,
        // A view that opens off its own href (one of the moved shortcuts)
        // is lit by its own path, same as any other route item — only the
        // in-page `?view=` tabs need the viewKey comparison.
        viewKey: resolvedHref ? undefined : view.key,
        altPaths: view.altPaths,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaViews, areaConfig, currentArea, planFeatures, activityHref, monitoringAccess?.view, campaignAccess]);

  const rail = viewItems.length ? viewItems : railTop;
  const hasRail = rail.length + railBottom.length > 1;

  return {
    currentArea,
    topItems,
    bottomItems,
    railTop: rail,
    railBottom: viewItems.length ? [] : railBottom,
    hasRail,
  };
};

export default useAreaNav;
