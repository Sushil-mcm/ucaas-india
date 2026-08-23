import PageSidebarLayout from '@/layout/page-sidebar-layout';
import Sidebar from './sidebar';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import '@/components/mcm/mcm-page.css';

const AdminSettings = () => {
  return (
    /* One scope for the whole Admin area: the console tokens and the
       Tailwind compatibility layer retint every page underneath, so each
       screen inherits the design system instead of restating it. */
    <div className="mcm-page mcm-admin">
      <div className="flex h-full min-h-0 w-full flex-col gap-1 lg:flex-row lg:gap-0">
        <PageSidebarLayout isTab={false} title="Admin Hub" content={<Sidebar />} />
        <div className="flex min-h-0 min-w-0 flex-1">
          <SuspenseOutlet />
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
