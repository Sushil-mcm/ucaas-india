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
      return true;
    });
    return allowed.map((view, index) => ({
      id: 1000 + index,
      name: view.label,
      link: `${base}?view=${view.key}`,
      icon: view.icon,
      sep: view.sep,
      viewKey: view.key,
    }));
  }, [areaViews, areaConfig, currentArea, planFeatures]);

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
