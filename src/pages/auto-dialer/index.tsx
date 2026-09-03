import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import CampaignSidebar from './sidebar';
import '@/components/mcm/mcm-page.css';
import ActivityPageHead from '@/components/custom/activity-page-head';

const AutoDialer = () => {
  return (
    <div className="mcm-actpage">
      <ActivityPageHead title="Campaign" description="Outbound dialer campaigns, their contact lists and how each one is running." />
      <div className="mcm-page mcm-admin cmp-shell">
      <div className="flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto lg:flex-row lg:overflow-hidden xs:gap-1 lg:gap-0">
        <PageSidebarLayout isTab={false} title="Campaign" hideHeading content={<CampaignSidebar />} />
        <div className="min-h-0 flex-1">
          <SuspenseOutlet />
        </div>
      </div>
      </div>
    </div>
  );
};

export default AutoDialer;
