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
import { Info } from 'lucide-react';
import CustomTooltip from '@/components/custom/custom-tooltip';

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
  const navigate = useNavigate();
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
      {/* PageSidebarLayout renders this panel with `hideHeading`, so its own
          border-right only ever spanned the space below the page-wide
          ActivityPageHead row above it, never that row -- it read as a gap
          before the divider "started". Same fix as Agent Chat/Chat: title
          inline at the top of the column the border actually wraps. */}
      <div className="flex items-center gap-1.5 px-3 pt-[26px] pb-1 bg-[#ffffff]">
        <h2 className="text-[23px] font-bold text-[#2E2D35]">Video</h2>
        <CustomTooltip
          text="Your video room: start a meeting now, schedule one ahead or join with a code, with what is upcoming, ongoing, past and invited beside it."
          side="bottom"
          className="max-w-xs"
        >
          <button
            type="button"
            className="inline-flex h-[19px] w-[19px] items-center justify-center rounded-full border border-[#EEE7DD] bg-[#FBE2C8]/25 text-black transition-colors hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
            aria-label="About Video"
          >
            <Info size={13} aria-hidden="true" />
          </button>
        </CustomTooltip>
      </div>
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
                      activeHeaderClassName="[&>button[data-active=true]]:rounded-xl [&>button[data-active=true]]:bg-[#fff1e0] [&>button[data-active=true]]:text-[#c96f1f]"
                      activeIconClassName="text-[#c96f1f]"
                    >
                      <div
                        className="flex min-h-12 w-full items-center gap-2.5 px-3 py-3 text-sm font-medium rounded-xl hover:bg-[#fff1e0]/40 transition-colors"
                        onClick={() => {
                          const firstChildPath = children?.[0]?.path;
                          if (firstChildPath) navigate(firstChildPath);
                        }}
                      >
                        <Icon name={icon as IconType} className="h-5 w-5" />
                        {title}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-[#ffffff] rounded-xl mt-0.5 px-2 py-1">
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
      className={`group flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${isActive ? (isChildrenExist ? 'text-[#c96f1f]' : 'bg-[#fff1e0] border border-[#ffd9ad] text-[#c96f1f]') : 'text-gray-900/80 hover:bg-[#fff1e0]/40'} ${child ? 'py-2 mt-0.5' : ''} ${!isEnabled ? 'text-gray-400 opacity-60' : ''}`}
      {...getRoutePrefetchHandlers(path)}
      onClick={handleClick}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
        style={isActive && !isChildrenExist ? { background: 'rgba(201,111,31,0.14)' } : undefined}
      >
        <Icon name={icon as IconType} className="h-5 w-5" />
      </span>
      <p className="truncate text-sm font-medium">{title}</p>
      {!isEnabled && <span className="text-xs">🔒</span>}
    </div>
  );
};
