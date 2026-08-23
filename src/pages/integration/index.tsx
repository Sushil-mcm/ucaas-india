import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import '@/components/mcm/mcm-page.css';

const Integration = () => {
  return (
    <div className="mcm-page mcm-admin">
      <div className="sm:flex flex-col md:flex-row xs:gap-1 md:gap-0 w-full min-w-0 overflow-hidden h-full">
        <PageSidebarLayout isTab={false} title="Integration" content={<Sidebar />} />
        <SuspenseOutlet />
      </div>
    </div>
  );
};

export default Integration;
