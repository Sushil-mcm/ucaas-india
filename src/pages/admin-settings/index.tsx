import PageSidebarLayout from '@/layout/page-sidebar-layout';
import Sidebar from './sidebar';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import AccountStateBanner from '@/components/mcm/account-state-banner';
import { useAdminVisitRecorder } from './use-admin-shortcuts';
import '@/components/mcm/mcm-page.css';

const AdminSettings = () => {
  /* Every Admin screen renders inside this layout, so this is the one place
     that sees them all — which is what "Recently used" needs. */
  useAdminVisitRecorder();

  return (
    /* One scope for the whole Admin area: the console tokens and the
       Tailwind compatibility layer retint every page underneath, so each
       screen inherits the design system instead of restating it. */
    <div className="mcm-page mcm-admin">
      <div className="flex h-full min-h-0 w-full flex-col gap-1 lg:flex-row lg:gap-0">
        <PageSidebarLayout isTab={false} title="Admin Hub" content={<Sidebar />} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Above every admin screen, because what it says applies to the whole
              console. Seven screens quietly disable their buttons when the plan
              lapses and none of them says why — this is the sentence that was
              missing. It renders nothing when the account is fine. */}
          <AccountStateBanner />
          <div className="flex min-h-0 min-w-0 flex-1">
            <SuspenseOutlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
