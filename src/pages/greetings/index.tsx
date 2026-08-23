import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import '@/components/mcm/mcm-page.css';

const Greetings = () => {
  return (
    <div className="mcm-page mcm-admin">
      <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
        <PageSidebarLayout isTab={false} title="Greetings" content={<Sidebar />} />
        <SuspenseOutlet />
      </div>
    </div>
  );
};

export default Greetings;
