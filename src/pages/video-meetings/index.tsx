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
import ActivityPageHead from '@/components/custom/activity-page-head';

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
    /* One full-width line across the top, above the rail rather than beside it
       -- the same head Phone, Chat, Agent Chat, Inbox and Campaign carry, and
       what .mcm-actpage is for: the head keeps its own height and the tinted
       area below takes the rest.

       It was nested in the content column first, which started it after the
       sidebar and left the title out of line with the other Activity screens.
       Out here it also sits on plain white above the sunset gradient rather
       than on top of it, which is what keeps it legible at every width. */
    <div className="mcm-actpage">
      <ActivityPageHead
        title="Video"
        description="Your video room: start a meeting now, schedule one ahead or join with a code, with what is upcoming, ongoing, past and invited beside it."
      />

      <div
        className="relative flex h-full min-h-0 w-full flex-col overflow-hidden md:flex-row"
        style={{
          background:
            'radial-gradient(75% 65% at 100% 0%, rgba(231,139,80,0.16) 0%, transparent 100%), radial-gradient(65% 60% at 0% 100%, rgba(217,101,46,0.1) 0%, transparent 100%), radial-gradient(55% 50% at 30% 15%, rgba(251,224,196,0.28) 0%, transparent 100%), #fdfbf9',
        }}
      >
        {/* Light sunset-orange blobs behind the glass layer - this is what the frosted cards blur/tint against */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full blur-[110px]"
          style={{ background: 'rgba(231,139,80,0.16)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-1/4 h-[26rem] w-[26rem] rounded-full blur-[120px]"
          style={{ background: 'rgba(217,101,46,0.13)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full blur-[110px]"
          style={{ background: 'rgba(231,139,80,0.11)' }}
        />

        <div className="relative hidden h-full md:block">
          {/* Not collapsible, same as the Inbox. This panel is how you move
              between Upcoming, Ongoing, Invited, Past and Recordings -- fold it
              away and the only route back to another view is reopening the
              panel you just closed.

              `title` stays even though the heading is hidden: the layout reads it
              to decide the glass sidebar treatment, so dropping it would restyle
              the panel rather than just unlabel it. */}
          <PageSidebarLayout
            isTab={false}
            collapsible={false}
            hideHeading
            title="Meetings"
            content={<Sidebar />}
          />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] md:hidden">
            {/* Title dropped, chips kept: the head above names the section on
                every width now, so this bar was saying it a second time. */}
            <div className="flex gap-2 overflow-x-auto px-3 py-3">
              {mobileNavItems.map((item: any) => {
                const isActive = pathname === item.path;

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md transition-colors',
                      isActive
                        ? 'shadow-sm'
                        : 'border-gray-200 bg-white text-[#2E2D35] hover:border-primary/40 hover:bg-gray-50',
                    )}
                    style={
                      isActive
                        ? {
                            borderColor: 'rgba(231,139,80,0.5)',
                            background: 'rgba(231,139,80,0.14)',
                            color: '#B5642F',
                          }
                        : undefined
                    }
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
    </div>
  );
};

export default VideoMeetings;
