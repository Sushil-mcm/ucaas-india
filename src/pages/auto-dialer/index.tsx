import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import CampaignSidebar from './sidebar';
import '@/components/mcm/mcm-page.css';
import '@/components/custom/activity-page-head.css';

const AutoDialer = () => {
  return (
    /* Was a full-width ActivityPageHead line above the rail, same as Phone/
       Chat/Agent Chat/Inbox/Video -- but that meant the sidebar's own
       border-right only ever spanned the panel below it, never that row,
       reading as a gap before the divider "started". Title now lives
       inline at the top of the sidebar column itself (CampaignSidebar, in
       ./sidebar/index.tsx) instead, same fix as Agent Chat/Video/Inbox.
       Keeping `.mcm-actpage` for its layout CSS, imported directly below
       rather than via the component. */
    <div className="mcm-actpage">
      <div className="mcm-page mcm-admin cmp-shell">
        <div className="flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto lg:flex-row lg:overflow-hidden xs:gap-1 lg:gap-0">
          {/* `title` stays even though the heading is hidden: the layout reads it
              to decide the glass sidebar treatment and the responsive topbar, so
              dropping it would restyle the panel rather than just unlabel it. */}
          <PageSidebarLayout
            isTab={false}
            title="Campaign"
            hideHeading
            widthClass="w-full min-w-0 lg:w-[19rem] lg:min-w-[19rem] lg:max-w-[19rem]"
            content={<CampaignSidebar />}
            collapsible={false}
          />
          {/* `min-w-0` is the whole fix for the page running off the right of the
              screen. A flex item defaults to min-width:auto, so this column
              refused to be narrower than the campaign table inside it - the
              column grew, the page grew with it, and the KPI strip, the "New
              campaign" button and the Actions column were all cut off at 100%
              zoom. With this the column takes the room it is given and the table
              scrolls inside its own frame, which is what it was already built to
              do. */}
          <div className="min-h-0 min-w-0 flex-1">
            <SuspenseOutlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoDialer;
