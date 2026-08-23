import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import '@/components/mcm/mcm-page.css';

const Reports = () => {
  return (
    <div className="mcm-page mcm-admin">
      <div className="flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto md:flex-row md:overflow-hidden xs:gap-1 md:gap-0">
        <PageSidebarLayout isTab={false} title="Reports" content={<Sidebar />} />
        <SuspenseOutlet />
      </div>
    </div>
  );
};

export default Reports;
