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
      <div className="h-full min-h-0 divide-y divide-gray-200">
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
                    <AccordionTrigger className="items-center p-0" isActive={isActive}>
                      <div className="flex min-h-14 w-full items-center gap-2 px-3 py-3 text-sm font-medium">
                        <Icon name={icon as IconType} className="h-6 w-6 p-0.5" />
                        {title}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-ucass-primary-200/20">
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
      className={`flex min-h-14 w-full items-center gap-2 px-3 py-3 cursor-pointer ${isActive ? (isChildrenExist ? 'text-primary' : 'border-r-2 border-r-primary bg-ucass-primary-200/50 text-primary') : 'text-gray-900/80'} ${child ? 'border-t border-gray-200 pl-10' : ''} ${!isEnabled ? 'text-gray-400 opacity-60' : ''}`}
      {...getRoutePrefetchHandlers(path)}
      onClick={handleClick}
    >
      <Icon name={icon as IconType} className="h-6 w-6 p-0.5" />
      <p className="truncate text-sm font-medium">{title}</p>
      {!isEnabled && <span className="text-xs">🔒</span>}
    </div>
  );
};
