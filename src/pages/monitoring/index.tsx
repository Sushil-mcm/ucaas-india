import { useState } from 'react';
import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import { MonitoringTopbarProvider } from './topbar';
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
  const [topbar, setTopbar] = useState<HTMLDivElement | null>(null);

  /* `mcm-monitoring` scopes this section's table treatment. TableManager
     renders on ~79 screens, so restyling `.table-scroll` unscoped would
     change all of them. */
  return (
    <div className="mcm-page mcm-admin mcm-monitoring">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div ref={setTopbar} className="mcm-topbar" />
        <div className="sm:flex flex-col md:flex-row xs:gap-1 md:gap-0 w-full flex-1 min-h-0">
          {/* No `title`. The bar above already reads "Monitoring › All Calls",
              so a "MONITORING" heading here repeated the word ~40px below
              itself and spent a 62px band to do it. PageSidebarLayout skips
              its header block when there is no title, so the category list
              starts at the top of the column. */}
          {/* Not collapsible: this list is the only way to move between the
              Monitoring screens, so hiding it strands you on whichever one
              you are looking at. */}
          <PageSidebarLayout content={<Sidebar />} isTab={false} collapsible={false} />
          <MonitoringTopbarProvider value={topbar}>
            <SuspenseOutlet />
          </MonitoringTopbarProvider>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
