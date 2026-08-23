import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import type { IconType } from '@/assets/icons/type';
import { Accordion, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { getRoutePrefetchHandlers } from '@/router/route-prefetch';
interface GreetingSidebarItem {
  title: string;
  path: string;
  value: string;
  type: 'normal' | 'accordion';
  icon: string;
  visible?: boolean;
  enabled?: boolean;
  access?: boolean;
}
const greetingSidebarArr = (features: any): GreetingSidebarItem[] => {
  const reportsAccess = features?.plan_features?.reports?.action || {};
  const items: (GreetingSidebarItem | false | undefined)[] = [
    {
      title: 'Call History',
      path: '/reports/call-history',
      value: 'call-history',
      type: 'normal',
      icon: 'PhoneCallingLine',
    },
    {
      title: 'Local Call List',
      path: '/reports/local-call-list',
      value: 'local-call-list',
      type: 'normal',
      icon: 'PhoneCallingLine',
    },
    {
      title: 'Outbound',
      path: '/reports/outbound',
      value: 'outbound',
      type: 'normal',
      icon: 'OutgoingCallStrokeIcon',
    },
    {
      title: 'Inbound',
      path: '/reports/inbound',
      value: 'inbound',
      type: 'normal',
      icon: 'IncomingCallStrokeIcon',
    },
    {
      title: 'Voicemail',
      path: '/reports/voicemail',
      value: 'voicemail',
      type: 'normal',
      icon: 'VoicemailborderIcon',
    },
    // {
    //   title: 'Call Recording',
    //   path: '/reports/call-recording',
    //   value: 'call-recording',
    //   type: 'normal',
    //   icon: 'Disc',
    //   enabled:
    //     Boolean(features?.plan_features?.advance_call_management?.access?.RECORDING) &&
    //     Boolean(reportsAccess?.call_recording_listen),
    // },
    {
      title: 'Call Volume',
      path: '/reports/call-volume',
      value: 'call-volume',
      type: 'normal',
      icon: 'CallOutgoing',
    },
    {
      title: 'Activity',
      path: '/reports/activity',
      value: 'activity',
      type: 'normal',
      icon: 'ActivityIcon',
    },
    {
      title: 'Agent Reports',
      path: '/reports/agent-reports',
      value: 'agent-reports',
      type: 'normal',
      icon: 'ReportsLineIcon',
    },
    {
      title: 'SMS-Log',
      path: '/reports/sms-log',
      value: 'sms-log',
      type: 'normal',
      icon: 'MessageStrokIcon', // Assuming mapping from earlier or similar
      enabled: Boolean(reportsAccess?.sms),
    },
  ];

  return items.filter(Boolean) as GreetingSidebarItem[];
};

const Sidebar = () => {
  const { features } = useCompanyFeatures();
  const { user = {} } = useUser();
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';

  const [activeItem, setActiveItem] = useState('');
  const sideBarItems = greetingSidebarArr(features).filter((item) => {
    if (IS_ADMIN) return true;
    return item?.visible !== false;
  });
  return (
    <div className="flex w-full overflow-x-auto overflow-y-hidden md:h-[calc(100vh_-_8.5rem)] md:flex-col md:overflow-y-auto md:overflow-x-hidden">
      <div className="flex h-full min-w-max flex-row gap-1 p-2 md:min-w-0 md:flex-col md:gap-0 md:p-0">
        {sideBarItems?.map(({ type, icon = '', path, title, value, enabled }, index: number) => {
          if (type === 'accordion') {
            return (
              <Accordion
                key={index}
                type="single"
                collapsible
                value={activeItem}
                onValueChange={(v) => {
                  setActiveItem((p) => (p === v ? '' : v));
                }}
              >
                <AccordionItem value={value} className="">
                  <AccordionTrigger className="p-0 items-center">
                    <Tile
                      {...{ title, path, icon, enabled }}
                      isAccordionTrigger={true}
                      className="w-full"
                    />
                  </AccordionTrigger>
                </AccordionItem>
              </Accordion>
            );
          } else {
            return <Tile key={index} {...{ title, path, icon, enabled }} />;
          }
        })}
      </div>
    </div>
  );
};

export default Sidebar;

const Tile = ({ title, path, icon, isAccordionTrigger = false, enabled }: any) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = pathname === path || (path === '/reports' && pathname.includes('/call-logs'));
  const isEnabled = enabled !== false;

  const handleClick = () => {
    if (isAccordionTrigger || !isEnabled || !path) return;
    navigate(path);
  };

  return (
    <div
      className={`flex h-10 min-w-max items-center gap-2 rounded-lg border border-transparent px-3 cursor-pointer md:h-14 md:w-full md:min-w-0 md:rounded-none md:border-0 ${isActive ? 'text-primary bg-ucass-primary-200/50 border-primary md:border-r-2 md:border-r-primary' : 'text-gray-900/80 hover:bg-gray-50'} ${!isEnabled ? 'text-gray-400 opacity-60' : ''}`}
      {...getRoutePrefetchHandlers(path)}
      onClick={handleClick}
    >
      <Icon name={icon as IconType} className="h-5 w-5 shrink-0" />
      <p className="truncate text-sm font-medium">{title}</p>
      {!isEnabled && <span className="text-xs">🔒</span>}
    </div>
  );
};
