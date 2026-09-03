import { Icon } from '@/assets/icons/icon';
import type { IconType } from '@/assets/icons/type';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRoutePrefetchHandlers } from '@/router/route-prefetch';

export const meetingSidebarArr = (features: any, IS_ADMIN: boolean) =>
  [
    {
      title: 'Upcoming Meetings',
      path: '/video',
      value: 'upcoming-meetings',
      type: 'normal',
      icon: 'UcomingMeetingIcon',
    },
    {
      title: 'Ongoing Meetings',
      path: '/video/ongoing-meetings',
      value: 'ongoing-meetings',
      type: 'normal',
      icon: 'OngoingMeetingsOutlinedIcon',
    },
    {
      title: 'Invited Meetings',
      path: '/video/invited-meetings',
      value: 'invited-meetings',
      type: 'normal',
      icon: 'InvitedMeetingsOutlinedIcon',
    },
    {
      title: 'Past Meetings',
      path: '/video/past-meetings',
      value: 'past-meetings',
      type: 'normal',
      icon: 'PastMeetingIcon',
    },
    {
      title: 'Recordings',
      type: 'accordion',
      value: 'recordings',
      icon: 'VideoRecordIcon',
      enabled: Boolean(features?.plan_features?.video?.access?.RECORDING),
      visible: Boolean(features?.plan_features?.video?.access?.RECORDING),
      children: [
        {
          title: 'All Recordings',
          icon: 'FolderIcon',
          path: '/video/recordings/all',
          enabled: Boolean(features?.plan_features?.video?.access?.RECORDING),
          visible: Boolean(features?.plan_features?.video?.access?.RECORDING),
        },
        {
          title: 'My Recordings',
          icon: 'UserIcon',
          path: '/video/recordings/my',
          enabled: Boolean(features?.plan_features?.video?.access?.RECORDING),
          visible: Boolean(features?.plan_features?.video?.access?.RECORDING),
        },
        {
          title: 'Shared with me',
          icon: 'ShareIcon',
          path: '/video/recordings/shared-with-me',
          enabled: Boolean(features?.plan_features?.video?.access?.RECORDING),
          visible: Boolean(features?.plan_features?.video?.access?.RECORDING),
        },
      ],
    },
  ]
    ?.filter(Boolean)
    ?.filter((item) => {
      if (IS_ADMIN) return true;
      return item.visible !== false;
    });

const Sidebar = () => {
  const [manualActiveItem, setManualActiveItem] = useState<{
    pathname: string;
    value: string;
  } | null>(null);
  const { features } = useCompanyFeatures();
  const { user = {} } = useUser();
  const { pathname } = useLocation();
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';
  const sidebarItems = useMemo(() => meetingSidebarArr(features, IS_ADMIN), [features, IS_ADMIN]);

  const activeItem = useMemo(() => {
    const activeAccordionValue =
      sidebarItems.find(
        (item: any) =>
          item?.type === 'accordion' &&
          item?.children?.some((child: any) => child?.path === pathname),
      )?.value || '';

    return activeAccordionValue;
  }, [pathname, sidebarItems]);

  const openAccordionItem =
    manualActiveItem?.pathname === pathname ? manualActiveItem.value : activeItem;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">
      <div className="h-full min-h-0 flex flex-col gap-0.5 p-2">
        {sidebarItems?.map(
          ({ type, icon = '', path, title, children, value, enabled }: any, index: number) => {
            const isActive = value === activeItem;

            if (type === 'accordion') {
              return (
                <Accordion
                  key={index}
                  type="single"
                  collapsible
                  value={openAccordionItem}
                  onValueChange={(nextValue) => setManualActiveItem({ pathname, value: nextValue })}
                >
                  <AccordionItem value={value} className="">
                    <AccordionTrigger
                      className="items-center p-0"
                      isActive={isActive}
                      activeHeaderClassName="[&>button[data-state=open]]:rounded-xl [&>button[data-state=open]]:bg-[#E78B50]/10 [&>button[data-state=open]]:text-[#B5642F]"
                      activeIconClassName="text-[#B5642F]"
                    >
                      <div className="flex min-h-12 w-full items-center gap-2.5 px-3 py-3 text-sm font-medium rounded-xl hover:bg-white/50 transition-colors">
                        <Icon name={icon as IconType} className="h-5 w-5" />
                        {title}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-[#E78B50]/[0.04] backdrop-blur-md rounded-xl mt-0.5 px-2 py-1">
                      {children?.map(
                        (
                          {
                            title: childTitle,
                            path: childPath,
                            icon: childIcon,
                            enabled: childEnabled,
                          }: any,
                          childIndex: number,
                        ) => (
                          <Tile
                            key={`${value},${childIndex}`}
                            title={childTitle}
                            path={childPath}
                            icon={childIcon}
                            children={children}
                            enabled={childEnabled}
                            child
                          />
                        ),
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            }

            return (
              <Tile
                key={index}
                title={title}
                path={path}
                icon={icon}
                children={children}
                enabled={enabled}
              />
            );
          },
        )}
      </div>
    </div>
  );
};

export default Sidebar;

const Tile = ({
  title,
  path,
  icon,
  isAccordionTrigger = false,
  enabled,
  child = false,
  children,
}: any) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isEnabled = enabled !== false;

  const isActive = pathname === path;
  const isChildrenExist = Boolean(children && children?.length);

  const handleClick = () => {
    if (isAccordionTrigger || !isEnabled || !path) return;
    navigate(path);
  };

  return (
    <div
      className={`group flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${isActive ? (isChildrenExist ? 'text-[#B5642F]' : 'bg-white/80 backdrop-blur-md text-[#B5642F] shadow-[0_2px_8px_rgba(154,52,18,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]') : 'text-gray-900/80 hover:bg-white/50'} ${child ? 'py-2 mt-0.5' : ''} ${!isEnabled ? 'text-gray-400 opacity-60' : ''}`}
      {...getRoutePrefetchHandlers(path)}
      onClick={handleClick}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
        style={isActive && !isChildrenExist ? { background: 'rgba(231,139,80,0.14)' } : undefined}
      >
        <Icon name={icon as IconType} className="h-5 w-5" />
      </span>
      <p className="truncate text-sm font-medium">{title}</p>
      {!isEnabled && <span className="text-xs">🔒</span>}
    </div>
  );
};
