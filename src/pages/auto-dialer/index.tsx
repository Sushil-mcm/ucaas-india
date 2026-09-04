import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import CampaignSidebar from './sidebar';
import '@/components/mcm/mcm-page.css';
import ActivityPageHead from '@/components/custom/activity-page-head';

const AutoDialer = () => {
  return (
    /* One full-width line across the top, above the rail rather than beside it
       -- the same head Phone, Chat, Agent Chat and Inbox carry, and the reason
       .mcm-actpage exists: it is the flex column that keeps the head its own
       height and hands the rest to whatever follows.

       It was nested inside the content column first, which started it after
       the sidebar and made Campaign the one Activity screen whose name did not
       line up with the others. */
    <div className="mcm-actpage">
      <ActivityPageHead
        title="Campaign"
        description="Outbound calling campaigns and everything behind them — the leads they dial, the scripts agents read, how each call was dispositioned, and the numbers on the DNC list."
      />
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
    </div>
  );
};

export default AutoDialer;
