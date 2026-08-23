import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import '@/components/mcm/mcm-page.css';

const Monitoring = () => {
  return (
    <div className="mcm-page mcm-admin">
      <div className="sm:flex flex-col md:flex-row xs:gap-1 md:gap-0 w-full h-full">
        <PageSidebarLayout title="Monitoring" content={<Sidebar />} isTab={false} />
        <SuspenseOutlet />
      </div>
    </div>
  );
};

export default Monitoring;
