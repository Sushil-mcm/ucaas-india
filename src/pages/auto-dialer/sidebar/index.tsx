import { FC, ReactElement, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import { useCompanyFeatures } from '@/hooks/rbac';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { IconType } from '@/assets/icons/type';
import { useUser } from '@/hooks/use-user';
import { getRoutePrefetchHandlers } from '@/router/route-prefetch';
export interface MenuItem {
  label: string;
  value: string;
  icon: ReactElement;
  key: string;
  path: string;
  type?: 'normal' | 'accordion';
  enabled?: boolean;
  visible?: boolean;
  extraPaths?: string[];
  children?: MenuItem[];
}
const campaignMenuItems = (features: any, IS_ADMIN: boolean): MenuItem[] =>
  (
    [
      {
        label: 'Campaign List',
        value: 'all-campaigns',
        icon: <Icon name="PhoneCallingLine" className="w-5 h-5" />,
        key: 'all-campaigns',
        path: '/campaign/all-campaigns',
        enabled: Boolean(features?.plan_features?.campaign?.IS_SHOW),
        visible: Boolean(features?.plan_features?.campaign?.action?.view),
      },
      {
        label: 'Leads',
        value: 'leads',
        key: 'lead',
        icon: <Icon name="LeadsIcon" className="w-5 h-5" />,
        path: '/campaign/leads',
        enabled: Boolean(features?.plan_features?.campaign?.IS_SHOW),
        visible: Boolean(features?.plan_features?.campaign?.action?.view),
      },
      {
        label: 'Call Scripts',
        value: 'call-scripts',
        icon: <Icon name="CallScriptIcon" className="w-5 h-5" />,
        key: 'call-scripts',
        path: '/campaign/call-scripts',
        enabled: Boolean(features?.plan_features?.campaign?.IS_SHOW),
        visible: Boolean(features?.plan_features?.campaign?.action?.view),
      },
      {
        label: 'Dispositions',
        value: 'dispositions',
        icon: <Icon name="ListIcon" className="w-5 h-5" />,
        key: 'dispositions',
        path: '/campaign/dispositions',
        enabled: Boolean(features?.plan_features?.campaign?.IS_SHOW),
        visible: Boolean(features?.plan_features?.campaign?.action?.view),
      },
      {
        label: 'Statistics',
        value: 'campaign-logs',
        icon: <Icon name="CampaignLogsIcon" className="w-5 h-5" />,
        key: 'campaign-logs',
        path: '/campaign/logs',
        enabled: Boolean(features?.plan_features?.campaign?.IS_SHOW),
        visible: Boolean(features?.plan_features?.campaign?.action?.view),
      },
      // {
      //   label: 'Disposition Logs',
      //   value: 'disposition-logs',
      //   icon: <Icon name="LogsIcon" className="w-5 h-5" />,
      //   key: 'disposition-logs',
      //   path: '/campaign/disposition-logs',
      //   enabled: Boolean(features?.plan_features?.campaign?.IS_SHOW),
      //   visible: Boolean(features?.plan_features?.campaign?.action?.view),
      // },
      {
        label: 'DNC',
        value: 'dnc',
        icon: <Icon name="LogsIcon" className="w-5 h-5" />,
        key: 'dnc',
        path: '/campaign/dnc',
        enabled: Boolean(features?.plan_features?.campaign?.IS_SHOW),
        visible: Boolean(features?.plan_features?.campaign?.action?.view),
      },
    ] as MenuItem[]
  )
    .filter(Boolean)
    .filter((item) => {
      if (IS_ADMIN) return true;
      return item.visible !== false;
    });
const CampaignSidebar: FC = () => {
  const [manualActiveItem, setManualActiveItem] = useState<{
    pathname: string;
    value: string;
  } | null>(null);
  const { pathname } = useLocation();
  const { features } = useCompanyFeatures();
  const { user = {} } = useUser();
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';

  const activeItem = useMemo(() => pathname?.split('/')[2] || '', [pathname]);
  const openAccordionItem =
    manualActiveItem?.pathname === pathname ? manualActiveItem.value : activeItem;

  return (
    <div className="flex w-full overflow-auto lg:h-[calc(100vh_-_8.5rem)] lg:flex-col">
      <div className="flex h-full min-w-max flex-row divide-x divide-gray-200 lg:min-w-0 lg:flex-col lg:divide-x-0 lg:divide-y">
        {campaignMenuItems(features, IS_ADMIN)?.map(
          ({ type, icon = '', path, label, children, value, enabled }, index: number) => {
            const isActive = value === activeItem;
            if (type === 'accordion') {
              return (
                <Accordion
                  key={index}
                  type="single"
                  value={openAccordionItem}
                  onValueChange={(v) => {
                    setManualActiveItem({ pathname, value: v });
                  }}
                  collapsible
                >
                  <AccordionItem value={value} className="">
                    <AccordionTrigger
                      className="p-0 items-center"
                      isActive={isActive}
                      activeHeaderClassName="[&>button[data-state=open]]:bg-[#E78B50]/10 [&>button[data-state=open]]:text-[#B5642F]"
                      activeIconClassName="text-[#B5642F]"
                    >
                      <div className="flex h-12 min-w-max items-center gap-2 px-3 font-medium lg:h-14 lg:w-full lg:min-w-0">
                        <Icon name={icon as IconType} className="w-6 h-6 p-0.5" />
                        {label}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-[#E78B50]/[0.05]">
                      {children?.map(({ label, path, icon, enabled }: any, index: number) => {
                        return <Tile key={index} {...{ label, path, icon, children, enabled }} />;
                      })}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            } else {
              return <Tile key={index} {...{ label, path, icon, children, enabled }} />;
            }
          },
        )}
      </div>
    </div>
  );
};

export default CampaignSidebar;

const Tile = ({ label, path, icon, children, extraPaths = [], enabled }: any) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isEnabled = enabled !== false;
  const isActive =
    pathname === path || pathname.startsWith(path + '/') || extraPaths.includes(pathname);

  const isChildrenExist = Boolean(children && children?.length);
  return (
    <div
      className={`flex h-12 min-w-max items-center gap-2 px-3 cursor-pointer lg:h-14 lg:w-full lg:min-w-0 ${
        isActive
          ? isChildrenExist
            ? 'text-[#B5642F]'
            : 'text-[#B5642F] bg-[#E78B50]/10 border-b-2 border-b-[#E78B50] lg:border-b-0 lg:border-r-2 lg:border-r-[#E78B50]'
          : 'text-gray-900/80'
      } ${isChildrenExist ? 'pl-10 lg:pl-10' : ''} ${!isEnabled ? 'text-gray-400 opacity-60' : ''}`}
      {...getRoutePrefetchHandlers(path)}
      onClick={() => {
        if (!isEnabled || !path) return;
        navigate(path);
      }}
    >
      {icon}
      <p className="font-medium truncate text-sm">{label}</p>
      {!isEnabled && <span className="text-xs">🔒</span>}
    </div>
  );
};
