import { FC, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import { useCompanyFeatures } from '@/hooks/rbac';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ShieldCheck } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { getRoutePrefetchHandlers } from '@/router/route-prefetch';

const Sidebar: FC = () => {
  const [manualActiveItem, setManualActiveItem] = useState<{
    pathname: string;
    value: string;
  } | null>(null);
  const { pathname } = useLocation();
  const { features } = useCompanyFeatures();
  const { user = {} } = useUser();
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';
  const menuItems = [
    {
      key: 'settings.basic_info',
      label: 'Basic Info',
      icon: <Icon name="SettingsUserIcon" className="w-6 h-6 p-0.5" />,
      path: '/settings/basic-info',
    },
    {
      key: 'settings.general',
      label: 'General',
      icon: <Icon name="SettingsUserIcon2" className="w-5 h-5" />,
      path: '/settings/general',
    },
    {
      key: 'settings.phone',
      label: 'Phone',
      icon: <Icon name="PhoneCallingLine" className="w-5 h-5" />,
      path: '/settings/phone',
    },
    {
      key: 'settings.notification',
      label: 'Notification',
      icon: <Icon name="NotificationLine2" className="w-5 h-5" />,
      path: '/settings/notification',
    },
    {
      key: 'settings.greetings',
      label: 'Greetings',
      icon: <Icon name="GreetingIcon2" className="w-5 h-5" />,
      path: '/settings/greetings',
    },
    {
      label: 'Media Files',
      type: 'accordion',
      value: 'media',
      icon: <Icon name="MediaFilesIcon" className="w-5 h-5" />,
      key: 'settings.media',
      visible: Boolean(features?.plan_features?.settings?.action?.greeting?.view),
      children: [
        {
          label: 'All',
          path: '/settings/media',
          icon: <Icon name="MenuLines" className="w-5 h-5" />,
        },
        {
          label: 'Voicemail',
          path: '/settings/media/type-voicemail',
          icon: <Icon name="VoicemailLineIcon" className="w-5 h-5" />,
        },
        {
          label: 'Greetings',
          path: '/settings/media/type-greeting',
          icon: <Icon name="GreetingIcon2" className="w-5 h-5" />,
        },
        {
          label: 'Prompt',
          path: '/settings/media/type-prompt',
          icon: <Icon name="Chat" className="w-5 h-5" />,
        },
      ].filter(Boolean),
    },
    {
      key: 'security',
      label: 'Security & Privacy',
      icon: <ShieldCheck className="w-5 h-5" />,
      path: '/settings/security',
    },
  ]
    ?.filter(Boolean)
    ?.filter((item) => {
      if (IS_ADMIN) return true;
      return item?.visible !== false;
    });

  const activeItem = useMemo(() => pathname?.split('/')[2] || '', [pathname]);
  const openAccordionItem =
    manualActiveItem?.pathname === pathname ? manualActiveItem.value : activeItem;

  return (
    // <div className="flex flex-col w-full h-[calc(100vh_-_8.5rem)] overflow-auto">
    <div className="flex md:flex-col w-full lg:h-[calc(100vh-8.5rem)] overflow-auto">
      <div className="divide-y divide-gray-200 h-full flex flex-row md:flex-col">
        {menuItems?.map(({ type, icon = '', path, label, children, value }) => {
          const isActive = path === pathname;
          if (type === 'accordion') {
            return (
              <Accordion
                type="single"
                value={openAccordionItem}
                onValueChange={(v) => {
                  setManualActiveItem({ pathname, value: v });
                }}
                collapsible
              >
                <AccordionItem value={value} className="">
                  <AccordionTrigger className="p-0 items-center" isActive={isActive}>
                    <div className="flex items-center w-full px-3 min-h-12 gap-2 cursor-pointer font-medium whitespace-nowrap">
                      {icon}
                      {label}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border md:border-0  md:bg-ucass-primary-200/20 bg-white z-10 relative">
                    {children?.map(({ label, path, icon, enabled }: any) => {
                      return <Tile {...{ label, path, icon, children, enabled }} />;
                    })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          } else {
            return <Tile {...{ label, path, icon, children }} />;
          }
        })}
      </div>
    </div>
  );
};

export default Sidebar;

const Tile = ({ label, path, icon, children, enabled }: any) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = pathname === path;
  const isEnabled = enabled !== false;

  const isChildrenExist = Boolean(children && children?.length);
  return (
    <div
      className={`flex items-center w-full px-3  min-h-14 h-14 gap-2 cursor-pointer ${isActive ? (isChildrenExist ? 'text-primary' : 'text-primary bg-ucass-primary-200/50 border-r-primary border-r-2') : 'text-gray-900/80'} ${isChildrenExist ? 'pl-10' : ''} ${!isEnabled ? 'text-gray-400 opacity-60' : ''}`}
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
