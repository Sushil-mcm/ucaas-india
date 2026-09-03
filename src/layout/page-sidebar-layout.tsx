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
  collapsible = true,
}: {
  title?: string;
  headerCustomClass?: string;
  icon?: any;
  content: any;
  action?: any;
  isTab?: boolean;
  fullHeightOnMobile?: boolean;
  /** Whether the panel offers its collapse toggle. Sections whose sidebar
      is the only way to move between their screens pass `false`. */
  collapsible?: boolean;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  /* A panel that cannot be collapsed can never be in the collapsed state,
     whatever the stored value says — so the rest of the component reads
     this rather than the raw flag. */
  const collapsed = collapsible && isCollapsed;
  const [hovered, setHovered] = useState(false);
  const isAdminResponsiveTopbar = !isTab && title === 'Admin Hub';
  const isCampaignResponsiveTopbar = !isTab && title === 'Campaign';
  const isGlassSidebar = title === 'Meetings' || title === 'Campaign';
  return (
    <section
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        // `transition-colors`, not upstream's `transition-all`: the latter
        // also animates the width, so collapsing slid the panel shut and
        // dragged the page across with it. The panel snaps open and shut
        // while the hover border still eases.
        //
        // `mcm-sidepanel` is the hook the console's glass rules target; it
        // is kept alongside upstream's own glass variant for Meetings and
        // Campaign, which those two pages style directly.
        'mcm-sidepanel relative transition-colors duration-300 ease-in-out',
        isGlassSidebar
          ? 'bg-white/50 backdrop-blur-2xl shadow-[inset_-1px_0_0_rgba(255,255,255,0.6)]'
          : 'bg-white',
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
          ? 'border-b lg:border-r lg:border-b-0'
          : isAdminResponsiveTopbar
            ? hovered
              ? 'border-b border-primary lg:border-r lg:border-b-0'
              : 'border-b border-gray-200 lg:border-r lg:border-b-0'
            : title === 'Reports'
              ? hovered
                ? 'border-b border-primary md:border-r md:border-b-0'
                : 'border-b border-gray-200 md:border-r md:border-b-0'
              : isGlassSidebar
                ? 'border-r'
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
      style={
        isGlassSidebar
          ? { borderColor: hovered ? 'rgba(217,101,46,0.55)' : 'rgba(231,139,80,0.22)' }
          : undefined
      }
    >
      {collapsible && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'absolute z-30 top-10 -right-3 transition-all ease-in-out duration-200 border border-gray-200 rounded-full p-0.5 cursor-pointer hidden',
            isCampaignResponsiveTopbar ? 'lg:flex' : isAdminResponsiveTopbar ? 'lg:flex' : 'md:flex',
            collapsed || hovered
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none',
            hovered
              ? isGlassSidebar
                ? 'text-white'
                : 'bg-primary text-white'
              : 'bg-white text-gray-600',
          )}
          style={hovered && isGlassSidebar ? { background: '#E78B50' } : undefined}
        >
          <ChevronIcon
            className={cn(
              'w-5 h-5 transition-transform duration-200',
              collapsed ? '-rotate-90' : 'rotate-90',
            )}
          />
        </button>
      )}

      <div className={cn('flex flex-col', fullHeightOnMobile ? 'h-full' : 'h-auto sm:h-full')}>
        {(title || action) && (
          <div
            className={cn(
              // No `transition-opacity`: it faded the header on collapse
              // while the panel itself snaps, so the two moved at different
              // speeds. Upstream's glass border variant is kept.
              'flex items-center justify-between p-3 border-b min-h-[65px]',
              isGlassSidebar ? 'border-orange-100/60' : 'border-gray-200',
              title === 'Reports' && 'min-h-14 md:min-h-[65px]',
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100',
            )}
          >
            <div className={`flex gap-1 items-center ${headerCustomClass}`}>
              <span>{icon}</span>
              <h4
                className={cn('font-semibold text-lg', !isGlassSidebar && 'text-gray-900')}
                style={isGlassSidebar ? { color: '#8A3F1C' } : undefined}
              >
                {title}
              </h4>
            </div>
            {action && action}
          </div>
        )}

        <div
          className={cn(
            'flex-1 min-h-0',
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
