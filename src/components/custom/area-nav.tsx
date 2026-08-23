import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { Icon } from '@/assets/icons/icon';
import type { IconType } from '@/assets/icons/type';
import { AREA_VIEWS, NAV_AREAS, areaOfPath, type NavArea } from './nav-areas';
import { navList, navListBottom } from './sidebar';

/**
 * The console's top-level area nav.
 *
 * It reads the same RBAC-filtered nav items the sidebar renders, so an area
 * only appears when the signed-in user can actually reach something inside it.
 * Choosing an area navigates to its first available item; the sidebar then
 * derives the same active area from the URL, which keeps the two in step
 * without either one owning the other's state.
 */
const AreaNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { features } = useCompanyFeatures();
  const { user = {} } = useUser();
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';

  const items = useMemo(
    () => [...navList(features, IS_ADMIN), ...navListBottom(features, IS_ADMIN)],
    [features, IS_ADMIN],
  );

  const areas = useMemo(
    () =>
      NAV_AREAS.map((area) => ({
        area,
        entries: items.filter((item) => area.items.includes(item.name)),
      })).filter(({ entries }) => entries.length > 0),
    [items],
  );

  const activeArea = useMemo(() => areaOfPath(pathname, items), [pathname, items]);

  const openArea = ({ area, entries }: { area: NavArea; entries: typeof items }) => {
    if (area.id === activeArea) return;
    // Areas that navigate by views open at their view home; the rest open at
    // their first reachable route item.
    const target = AREA_VIEWS[area.id]?.base || entries[0]?.link;
    if (target) navigate(target);
  };

  if (areas.length < 2) return null;

  return (
    <nav className="mcm-areanav" aria-label="Areas">
      {areas.map(({ area, entries }) => {
        const isActive = area.id === activeArea;
        return (
          <button
            key={area.id}
            type="button"
            className={cn('mcm-areanav-btn', isActive && 'is-active')}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => openArea({ area, entries })}
          >
            <Icon name={area.icon as IconType} className="h-4 w-4" />
            <span>{area.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default AreaNav;
