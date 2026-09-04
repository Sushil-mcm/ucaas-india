import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import CampaignSidebar from './sidebar';
import '@/components/mcm/mcm-page.css';

const AutoDialer = () => {
  return (
    <div className="mcm-page mcm-admin cmp-shell">
      <div className="flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto lg:flex-row lg:overflow-hidden xs:gap-1 lg:gap-0">
        {/* `title` stays even though the heading is hidden: the layout reads it
            to decide the glass sidebar treatment and the responsive topbar, so
            dropping it would restyle the panel rather than just unlabel it. */}
        <PageSidebarLayout
          isTab={false}
          title="Campaign"
          hideHeading
          content={<CampaignSidebar />}
          collapsible={false}
        />
        <div className="min-h-0 flex-1">
          <SuspenseOutlet />
        </div>
      </div>
    </div>
  );
};

export default AutoDialer;
