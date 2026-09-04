import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import ActivityPageHead from '@/components/custom/activity-page-head';
import '@/components/mcm/mcm-page.css';

/**
 * Monitoring stacks in three bands: the app navbar, then this section's head
 * spanning left to right, then the split between the category list and the
 * screen itself.
 *
 * The head is the one Phone, Chat, Agent Chat, Inbox, Video and Campaign
 * carry, sitting in .mcm-actpage above the row rather than inside the content
 * column — so the title lines up with those screens instead of starting at the
 * sidebar's edge. The rail's own "MONITORING" heading is hidden for the same
 * reason it is on Campaign and Video: the head above already says it.
 *
 * The four screens under here keep their own bar, minus the "Monitoring ›"
 * prefix it used to open with. Two of those bars hold controls (All Extensions
 * its filters, Call Queue its active-queue segment), so the bar stays and only
 * the repeated section name goes.
 */
const Monitoring = () => {
  return (
    <div className="mcm-actpage">
      <ActivityPageHead
        title="Monitoring"
        description="Live calls, extensions, queues and departments as they are happening, with who is on what right now."
      />
      <div className="mcm-page mcm-admin">
        <div className="sm:flex flex-col md:flex-row xs:gap-1 md:gap-0 w-full h-full">
          <PageSidebarLayout title="Monitoring" hideHeading content={<Sidebar />} isTab={false} />
          <SuspenseOutlet />
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
