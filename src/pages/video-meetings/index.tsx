import { Icon } from '@/assets/icons/icon';
import type { IconType } from '@/assets/icons/type';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar, { meetingSidebarArr } from './sidebar';

const VideoMeetings = () => {
  const { features } = useCompanyFeatures();
  const { user = {} } = useUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const IS_ADMIN = user?.user_info?.role === 'ADMIN';

  const mobileNavItems = useMemo(() => {
    return meetingSidebarArr(features, IS_ADMIN).flatMap((item: any) => {
      if (item?.type === 'accordion' && Array.isArray(item?.children)) {
        return item.children
          .filter((child: any) => child?.visible !== false && child?.enabled !== false)
          .map((child: any) => ({
            title: child.title,
            path: child.path,
            icon: child.icon,
          }));
      }

      return [
        {
          title: item.title,
          path: item.path,
          icon: item.icon,
        },
      ];
    });
  }, [IS_ADMIN, features]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
      <div className="hidden h-full md:block">
        <PageSidebarLayout isTab={false} title="Meetings" content={<Sidebar />} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white md:hidden">
          <div className="px-4 pt-4">
            <h2 className="text-lg font-semibold text-gray-900">Meetings</h2>
            <p className="text-xs text-gray-500">Browse meeting sections</p>
          </div>

          <div className="flex gap-2 overflow-x-auto px-3 py-3">
            {mobileNavItems.map((item: any) => {
              const isActive = pathname === item.path;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary bg-ucass-primary-200 text-primary'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-gray-50',
                  )}
                >
                  <Icon name={item.icon as IconType} className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <SuspenseOutlet />
        </div>
      </div>
    </div>
  );
};

export default VideoMeetings;
