import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import '@/components/mcm/mcm-page.css';

/**
 * Monitoring stacks in three bands: the app navbar, then the page's own bar
 * spanning left to right, then the split between the category list and the
 * screen itself.
 *
 * The page bar used to live inside the content column, so it started at the
 * sidebar's edge and sat level with the sidebar's "Monitoring" heading. It is
 * now hoisted above that row — see `./topbar` for why the pages still render
 * their own bar into it rather than the layout rebuilding it from the route.
 *
 * A callback ref, not a plain one: the container has to be in state so that
 * publishing it re-renders the children. With a plain ref the pages would look
 * for it on their first render, before this element is committed, find
 * nothing, and fall back to rendering inline.
 */
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
