import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import '@/components/mcm/mcm-page.css';

const Settings = () => {
  return (
    /* Same scope as Admin: the console tokens and the compatibility layer
       retint every Settings screen underneath in one move. */
    <div className="mcm-page mcm-admin">
      <div className="sm:flex flex-col md:flex-row xs:gap-1 md:gap-0 w-full h-full">
        <PageSidebarLayout isTab={false} title="Settings" content={<Sidebar />} />
        {/* right content */}
        <div className="w-full  xs:overflow-auto  xs:max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-65px)]">
          <SuspenseOutlet />
        </div>

        {/* right content */}
      </div>
    </div>
  );
};

export default Settings;
