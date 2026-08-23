import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { getRoutePrefetchHandlers } from '@/router/route-prefetch';
interface IMenuItems {
  title: string;
  path?: string;
  value: string;
  type: string;
  icon: string;
  enabled?: boolean;
  visible?: boolean;
  children?: any[];
}
const integrationSidebarArr = (features: any, IS_ADMIN: boolean): IMenuItems[] =>
  (
    [
      {
        title: 'CRM',
        path: '/integration',
        value: 'crm-integration',
        type: 'normal',
        icon: 'CRMIcon',
        visible: Boolean(features?.plan_features?.integration?.action?.view),
      },
      {
        title: 'Data & Reporting',
        type: 'accordion',
        value: 'data-reporting',
        icon: 'ReportIcon',
        visible: Boolean(features?.plan_features?.integration?.action?.view),
        children: [
          {
            title: 'Zapier',
            icon: 'ZapierIcon',
            path: '/integration/data-reporting/zapier',
          },
          {
            title: 'General settings',
            icon: 'SettingsIcon',
            path: '/integration/data-reporting/general-settings',
          },
          {
            title: 'Manage Webhook',
            icon: 'WebhookIcon',
            path: '/integration/data-reporting/manage-webhook',
          },
        ],
      },
    ] as IMenuItems[]
  )
    .filter(Boolean)
    .filter((item) => {
      if (IS_ADMIN) return true;
      return item?.visible !== false;
    });

const Sidebar = () => {
  const { features } = useCompanyFeatures();
  const { user = {} } = useUser();
  const { pathname } = useLocation();
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';
  const [manualActiveItem, setManualActiveItem] = useState<{
    pathname: string;
    value: string;
  } | null>(null);
  const menuItems = useMemo(() => integrationSidebarArr(features, IS_ADMIN), [features, IS_ADMIN]);

  const activeItem = useMemo(() => {
    if (!pathname) return '';
    const parent = menuItems?.find((item) =>
      item.children?.some((child: any) => pathname?.startsWith(child.path)),
    );
    return parent?.value || '';
  }, [pathname, menuItems]);

  const openAccordionItem =
    manualActiveItem?.pathname === pathname ? manualActiveItem.value : activeItem;

  return (
    <div className="flex md:flex-col w-full md:h-[calc(100vh-8.5rem)] overflow-auto">
      <div className="divide-y divide-gray-200 h-full flex flex-row md:flex-col">
        {menuItems?.map(
          ({ type, icon = '', children, path, title, value, enabled }, index: number) => {
            const isActive = value === activeItem;
            if (type === 'accordion') {
              return (
                <Accordion
                  type="single"
                  key={index}
                  collapsible
                  value={openAccordionItem}
                  onValueChange={(v) => {
                    setManualActiveItem({ pathname, value: v });
                  }}
                >
                  <AccordionItem value={value}>
                    <AccordionTrigger className="p-0 items-center" isActive={isActive}>
                      <Tile
                        {...{ title, path, icon }}
                        isAccordionTrigger={true}
                        className="w-full"
                      />
                    </AccordionTrigger>
                    <AccordionContent className="border md:border-0  md:bg-ucass-primary-200/20 bg-white z-10 relative">
                      {children?.map(({ title, path, icon, enabled }, index: number) => {
                        return (
                          <Tile
                            key={index}
                            {...{ title, path, icon, children, enabled }}
                            child={true}
                          />
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            } else {
              return <Tile key={value} {...{ title, path, icon, children, enabled }} />;
            }
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
  children,
  child = false,
  enabled,
}: any) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = pathname === path;
  const isChildrenExist = Boolean(children && children?.length);
  const isEnabled = enabled !== false;

  const handleClick = () => {
    if (isAccordionTrigger || !isEnabled || !path) return;
    navigate(path);
  };

  return (
    <div
      className={`flex items-center w-full px-3 min-h-14 h-14 gap-2 cursor-pointer whitespace-nowrap ${isActive ? (isChildrenExist ? 'text-primary' : 'text-primary bg-ucass-primary-200/50 border-r-primary border-r-2') : 'text-gray-900/80'} ${child ? 'border-t border-gray-200 p-0 pl-10' : ''} ${!isEnabled ? 'text-gray-400 opacity-60' : ''}`}
      {...getRoutePrefetchHandlers(path)}
      onClick={handleClick}
    >
      <Icon name={icon as IconType} className="w-5 h-5 shrink-0" />
      <p title={title} className="font-medium truncate text-sm">
        {title}
      </p>
      {!isEnabled && <span className="text-xs">🔒</span>}
    </div>
  );
};
