import { useState } from 'react';
import { ChevronIcon } from '@/assets/icons';
import { cn } from '@/lib/utils';

const PageSidebarLayout = ({
  title = '',
  content = null,
  action = null,
  icon = null,
  isTab = true,
  headerCustomClass = '',
  fullHeightOnMobile = false,
}: {
  title?: string;
  headerCustomClass?: string;
  icon?: any;
  content: any;
  action?: any;
  isTab?: boolean;
  fullHeightOnMobile?: boolean;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isAdminResponsiveTopbar = !isTab && title === 'Admin Hub';
  const isCampaignResponsiveTopbar = !isTab && title === 'Campaign';
  return (
    <section
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative bg-white transition-all duration-300  ease-in-out',
        isCampaignResponsiveTopbar
          ? 'h-auto lg:h-full'
          : isAdminResponsiveTopbar
            ? 'h-auto lg:h-full'
            : isTab
              ? fullHeightOnMobile
                ? 'h-full'
                : 'h-auto lg:h-full'
              : title === 'Reports'
                ? 'h-auto md:h-full'
                : 'h-full',
        isCampaignResponsiveTopbar
          ? hovered
            ? 'border-b border-primary lg:border-r lg:border-b-0'
            : 'border-b border-gray-200 lg:border-r lg:border-b-0'
          : isAdminResponsiveTopbar
            ? hovered
              ? 'border-b border-primary lg:border-r lg:border-b-0'
              : 'border-b border-gray-200 lg:border-r lg:border-b-0'
            : title === 'Reports'
              ? hovered
                ? 'border-b border-primary md:border-r md:border-b-0'
                : 'border-b border-gray-200 md:border-r md:border-b-0'
              : hovered
                ? 'border-r border-primary'
                : 'border-r border-gray-200 ',
        collapsed
          ? 'w-[0rem] min-w-[0rem]'
          : isTab
            ? 'w-full min-w-0 lg:min-w-[19rem] lg:max-w-[19rem] xl:min-w-[22rem] xl:max-w-[22rem]'
            : title === 'Reports'
              ? 'w-full min-w-0 max-w-full md:min-w-[14rem] md:max-w-[14rem]'
              : isCampaignResponsiveTopbar
                ? 'w-full min-w-0 max-w-full lg:min-w-[16rem] lg:max-w-[16rem]'
                : isAdminResponsiveTopbar
                  ? 'w-full min-w-0 max-w-full lg:min-w-[16rem] lg:max-w-[16rem]'
                  : 'md:min-w-[16rem] md:max-w-[16rem] w-full xs:max-h-32 md:max-h-full',
      )}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute z-30 top-10 -right-3 transition-all ease-in-out duration-200 border border-gray-200 rounded-full p-0.5 cursor-pointer hidden',
          isCampaignResponsiveTopbar ? 'lg:flex' : isAdminResponsiveTopbar ? 'lg:flex' : 'md:flex',
          collapsed || hovered
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
          hovered ? 'bg-primary text-white' : 'bg-white text-gray-600',
        )}
      >
        <ChevronIcon
          className={cn(
            'w-5 h-5 transition-transform duration-200',
            collapsed ? '-rotate-90' : 'rotate-90',
          )}
        />
      </button>

      <div className={cn('flex flex-col', fullHeightOnMobile ? 'h-full' : 'h-auto sm:h-full')}>
        {(title || action) && (
          <div
            className={cn(
              'flex items-center justify-between p-3 transition-opacity duration-300 border-b border-gray-200 min-h-[65px]',
              title === 'Reports' && 'min-h-14 md:min-h-[65px]',
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100',
            )}
          >
            <div className={`flex gap-1 items-center ${headerCustomClass}`}>
              <span>{icon}</span>
              <h4 className="text-gray-900 font-semibold text-lg">{title}</h4>
            </div>
            {action && action}
          </div>
        )}

        <div
          className={cn(
            'transition-all duration-500 ease-in-out flex-1 min-h-0',
            fullHeightOnMobile
              ? 'overflow-hidden'
              : isCampaignResponsiveTopbar
                ? 'lg:overflow-hidden'
                : isAdminResponsiveTopbar
                  ? 'lg:overflow-hidden'
                  : 'md:overflow-hidden',
          )}
          onMouseEnter={() => setHovered(true)}
        >
          {collapsed ? null : content}
        </div>
      </div>
    </section>
  );
};

export default PageSidebarLayout;
