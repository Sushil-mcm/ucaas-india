import { Icon } from '@/assets/icons/icon';
import { useAreaNav } from './use-area-nav';
import type { IconType } from '@/assets/icons/type';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
// import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { Fragment, useEffect, useState, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getRoutePrefetchHandlers, prefetchRoute } from '@/router/route-prefetch';

export interface NavItem {
  id: number;
  name: string;
  link: string;
  isActive?: boolean;
  icon?: string;
  enabled?: boolean;
  visible?: boolean;
}

export const navList = (features: any, IS_ADMIN: boolean): NavItem[] =>
  [
    {
      id: 1,
      name: 'Home',
      link: '/dashboard',
      icon: 'HomeIcon',
    },
    {
      id: 14,
      name: 'Performance',
      link: '/performance',
      icon: 'AnalyticsIcon',
    },
    {
      id: 2,
      name: 'Phone',
      link: '/phone',
      icon: 'PhoneIcon',
    },
    {
      id: 8,
      name: 'Chat',
      link: '/messenger',
      icon: 'MessageIcon',
      enabled: Boolean(features?.plan_features?.chat?.IS_SHOW),
      visible: Boolean(features?.plan_features?.chat?.action?.view),
    },
    {
      id: 12,
      name: 'Agent Chat',
      link: '/agent-chat',
      icon: 'MessageIcon',
      enabled: Boolean(features?.plan_features?.ai?.IS_SHOW),
      visible: Boolean(features?.plan_features?.ai?.action?.agent?.view),
    },

    {
      id: 4,
      name: 'Video',
      link: '/video',
      icon: 'VideoIcon',
      enabled: Boolean(features?.plan_features?.video?.IS_SHOW),
      visible: Boolean(features?.plan_features?.video?.action?.view),
    },
    {
      id: 5,
      name: 'Inbox',
      link: '/inbox',
      icon: 'InboxIcon',
      enabled: Boolean(features?.plan_features?.messages?.IS_SHOW),
      visible:
        Boolean(features?.plan_features?.messages?.action?.send_fax) ||
        Boolean(features?.plan_features?.messages?.action?.send_message) ||
        Boolean(features?.plan_features?.messages?.action?.send_mms),
    },
    {
      id: 6,
      name: 'Contact',
      link: '/contact',
      icon: 'ContactIcon',
      enabled: Boolean(features?.plan_features?.contact?.IS_SHOW),
      visible: Boolean(features?.plan_features?.contact?.action?.view),
    },

    {
      id: 7,
      name: 'Groups',
      link: '/department/extension',
      icon: 'DepartmentIcon',
      enabled:
        Boolean(features?.plan_features?.phone_system_action?.access?.DEPARTMENT) ||
        Boolean(features?.plan_features?.account_setting?.access?.USER?.action?.view),
      visible:
        Boolean(features?.plan_features?.account_setting?.access?.USER?.action?.view) ||
        (Boolean(features?.plan_features?.phone_system_action?.access?.DEPARTMENT) &&
          Boolean(features?.plan_features?.phone_system_action?.action?.view)),
    },
    {
      id: 9,
      name: 'Campaign',
      link: '/campaign/all-campaigns',
      icon: 'DialerIcon',
      enabled: Boolean(features?.plan_features?.campaign?.IS_SHOW),
      visible: Boolean(features?.plan_features?.campaign?.action?.view),
    },
    {
      id: 10,
      name: 'Reports',
      link: '/reports',
      icon: 'ReportsLineIcon',
      enabled: Boolean(features?.plan_features?.reports?.IS_SHOW),
      visible: true,
    },
  ]
    ?.filter(Boolean)
    ?.filter((item) => {
      if (IS_ADMIN) return true;
      return item?.visible !== false && item?.enabled !== false;
    });
export const navListBottom = (features: any, IS_ADMIN: boolean): NavItem[] => {
  const permissions = features?.plan_features;
  const hasAdminAccess =
    IS_ADMIN ||
    Boolean(permissions?.account_setting?.access?.SITE?.action?.view) ||
    Boolean(permissions?.account_setting?.access?.USER?.action?.view) ||
    Boolean(permissions?.virtual_numbers?.action?.view) ||
    Boolean(permissions?.phone_system_action?.action?.view) ||
    Boolean(permissions?.ai?.IS_SHOW) ||
    Boolean(permissions?.billing?.action?.view) ||
    Boolean(permissions?.calling_rates?.action?.view) ||
    Boolean(permissions?.omni_channel?.action?.view);

  return [
    hasAdminAccess && {
      id: 13,
      name: 'Admin',
      link: '/admin-settings',
      icon: 'AdminIcon',
    },
  ].filter(Boolean) as NavItem[];
};

const Sidebar = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { groupChatUnreadCount, directMessageUnreadCount, aiChatRequests } = useSocketEvents();
  const totalUnreadCount = (groupChatUnreadCount || 0) + (directMessageUnreadCount || 0);
  const pendingAiChatCount = Array.isArray(aiChatRequests)
    ? aiChatRequests.filter((r: any) => r?.status === 'pending').length
    : 0;
  // The rail shows one area at a time, matching whichever area the top nav has
  // lit, and disappears entirely when that area holds a single item.
  const { railTop: visibleNavList, railBottom: visibleBottomNavList, hasRail } = useAreaNav();

  // Landing on an area without `?view=` shows its first view, so the rail lights
  // the same one the page opens on — unless the path itself is another view's
  // `altPaths` (e.g. `/contact`, reached from External Contacts' own "New
  // contact" button), in which case that view should light instead of the
  // area's default first item.
  const firstViewKey = (visibleNavList[0] as any)?.viewKey;
  const altPathViewKey = (visibleNavList as any[])?.find((item) =>
    item?.altPaths?.some((path: string) => pathname === path || pathname?.startsWith(`${path}/`)),
  )?.viewKey;
  const currentView = new URLSearchParams(search).get('view') || altPathViewKey || firstViewKey;

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const handleSidebarLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    link: string,
    isEnabled = true,
  ) => {
    if (!isEnabled) {
      event.preventDefault();
      return;
    }

    setIsMobileSidebarOpen(false);

    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    prefetchRoute(link);
    navigate(link, { flushSync: true });
  };

  // Home has no rail in the console, and neither does any area that narrows to
  // a single item — a one-item column only restates the page you are on.
  if (!hasRail) return null;

  return (
    <>
      <button
        type="button"
        className={`fixed top-4 z-40 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ucass-active bg-ucass-active text-white shadow-sm transition-all duration-200 hover:bg-ucass-primary-200 hover:text-primary md:hidden ${
          isMobileSidebarOpen ? 'left-[5.25rem]' : 'left-3'
        }`}
        onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
        aria-label={isMobileSidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
        aria-expanded={isMobileSidebarOpen}
        aria-controls="mobile-sidebar-nav"
      >
        {isMobileSidebarOpen ? (
          <ChevronLeft className="w-4.5 h-4.5" />
        ) : (
          <ChevronRight className="w-4.5 h-4.5" />
        )}
      </button>

      {isMobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[25] bg-black/20 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="Close sidebar menu"
        />
      )}

      <section
        id="mobile-sidebar-nav"
        className={`fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] w-20 border-r border-white/50 transition-transform duration-200 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{ background: '#fffaf4' }}
      >
        {/* This wrapper had no height, so the scroller's `h-full` below
            resolved against auto and never constrained anything — the views
            past the fold simply overflowed the rail with no way to reach
            them. */}
        <div className="flex h-full min-h-0 flex-col items-center">
          {/* The brand moved into the top bar, so the rail is nav only. */}
          <div className="rail-scroll flex h-full min-h-0 flex-col justify-between gap-1 overflow-y-auto px-2 w-full pt-4 pb-3">
            <div className="flex flex-col gap-1.5 items-center">
              {visibleNavList?.map((navItem: any, index: number) => {
                const { id, link, icon, name, enabled, viewKey, sep, altPaths } = navItem;
                /* A view item shares its path with every sibling, so the
                   `?view=` value decides which is lit — path alone would light
                   them all.

                   The same is true of the rail items that open a route of their
                   own: Tasks and Calendar are both `/calendar`, separated only
                   by the query. Comparing the whole link against the pathname
                   also never matched, because the link carries that query and
                   the pathname does not, so neither ever lit. */
                const [linkPath, linkQuery = ''] = String(link).split('?');
                const linkView = new URLSearchParams(linkQuery).get('view');
                const onAltPath = Boolean(
                  altPaths?.some((path: string) => pathname === path || pathname?.startsWith(`${path}/`)),
                );
                const onLinkPath = Boolean(pathname?.startsWith(linkPath)) || onAltPath;
                const activeLink = viewKey
                  ? onLinkPath && currentView === viewKey
                  : onLinkPath && (!linkView || new URLSearchParams(search).get('view') === linkView);
                const isEnabled = enabled !== false;

                return (
                  <Fragment key={`${id}${index}`}>
                    {sep ? (
                      <span aria-hidden className="my-1 h-px w-8 shrink-0 bg-gray-200" />
                    ) : null}
                    <NavLink
                      to={isEnabled ? link || '#' : '#'}
                      {...getRoutePrefetchHandlers(isEnabled ? link : undefined)}
                      onClick={(e) => handleSidebarLinkClick(e, link, isEnabled)}
                      onKeyDown={(e) => {
                        if (!isEnabled && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                        }
                      }}
                      aria-disabled={!isEnabled}
                      tabIndex={isEnabled ? 0 : -1}
                      className={({ isActive }) => {
                        /* `isActive` compares pathnames only, so every
                           `/directory?view=…` sibling reads as active and the
                           whole rail lights up. A view item is lit by
                           `activeLink`, which checks the view, and nothing else. */
                        /* `isActive` compares pathnames only, so it cannot
                           separate two items that share one — fall back to it
                           only where the link has no view to compare. */
                        const lit = viewKey || linkView ? activeLink : activeLink || isActive;
                        return `min-h-13 w-16 flex items-center justify-center rounded-lg relative py-1.5 ${
                          lit ? 'bg-ucass-active-bg text-ucass-active' : 'bg-transparent'
                        } hover:bg-ucass-active-bg hover:text-ucass-active ${
                          !isEnabled ? 'text-gray-400' : 'text-gray-700'
                        } ${!isEnabled ? 'cursor-not-allowed' : ''}`;
                      }}
                      // className={({ isActive }) =>
                      //   `h-14 w-17 flex items-center justify-center rounded-lg hover:bg-ucass-primary-200 relative ${
                      //     activeLink || isActive
                      //       ? 'bg-ucass-primary-200 text-primary hover:text-primary'
                      //       : 'bg-white text-gray-700'
                      //   } hover:${activeLink || isActive ? 'text-gray-700 bg-primary' : 'text-primary'}`
                      // }
                    >
                      <div
                        className={`flex flex-col items-center justify-center gap-1 ${
                          !isEnabled ? 'opacity-60' : ''
                        }`}
                      >
                        <Icon
                          name={`${icon}` as IconType}
                          className="h-[1.15rem] w-[1.15rem] relative"
                        />
                        {/* Two-word labels ("External Contacts") stack rather
                            than truncate — the tile is 64px wide, so one line
                            would cut them off mid-word. */}
                        <small className="mcm-rail-label">{name}</small>
                      </div>
                      {isEnabled && navItem?.name === 'Chat' && totalUnreadCount > 0 && (
                        <span className="bg-primary absolute text-white font-normal me-2  rounded-full -top-[2px] left-[20px] px-1  border-white border-2 text-xs  min-w-5 min-h-5 flex items-center justify-center ">
                          {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                        </span>
                      )}
                      {/* {isEnabled && navItem?.name === 'Agent Chat' && aiChatUnreadCount > 0 && (
                          <span className="bg-primary absolute text-white font-normal me-2  rounded-full -top-[2px] left-[20px] px-1  border-white border-2 text-xs  min-w-5 min-h-5 flex items-center justify-center ">
                            {aiChatUnreadCount > 9 ? '9+' : aiChatUnreadCount} */}
                      {isEnabled && navItem?.name === 'Agent Chat' && pendingAiChatCount > 0 && (
                        <span className="bg-primary absolute text-white font-normal me-2  rounded-full -top-[2px] left-[20px] px-1  border-white border-2 text-xs  min-w-5 min-h-5 flex items-center justify-center ">
                          {pendingAiChatCount > 9 ? '9+' : pendingAiChatCount}
                        </span>
                      )}
                      {!isEnabled && (
                        <span
                          className={`absolute top-1 right-1 text-xs ${!isEnabled ? 'opacity-60' : ''}`}
                        >
                          🔒
                        </span>
                      )}
                    </NavLink>
                  </Fragment>
                );
              })}
            </div>
            <div className="flex flex-col gap-1 items-center">
              {visibleBottomNavList?.map((navItem) => {
                const { id, link, icon, name } = navItem;
                return (
                  // <Tooltip key={id}>
                  //   <TooltipTrigger>
                  <NavLink
                    key={id}
                    to={link || '#'}
                    {...getRoutePrefetchHandlers(link)}
                    onClick={(e) => handleSidebarLinkClick(e, link)}
                    className={({ isActive }) =>
                      `h-14 w-17 flex items-center justify-center rounded-lg hover:bg-ucass-primary-200  ${
                        link && isActive
                          ? 'bg-ucass-primary-200 text-primary hover:text-primary'
                          : 'bg-white text-gray-700'
                      } hover:${link && isActive ? 'text-gray-700 bg-primary' : 'text-primary'}`
                    }
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Icon
                        name={`${icon}` as IconType}
                        className="h-[1.15rem] w-[1.15rem] relative"
                      />

                      <small className="text-[11px] leading-none">{name}</small>
                    </div>
                  </NavLink>
                  //   </TooltipTrigger>
                  //   <TooltipContent side="right">{name}</TooltipContent>
                  // </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Sidebar;
