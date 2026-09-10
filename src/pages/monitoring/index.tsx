import { useState } from 'react';
import { SuspenseOutlet } from '@/components/custom/route-suspense';
import Sidebar from './sidebar';
import { MonitoringTopbarProvider } from './topbar';
import '@/components/mcm/mcm-page.css';

/**
 * Monitoring stacks in three bands: the app navbar, then the page's own bar,
 * then the category switcher — a horizontal tab strip, not a left column.
 *
 * It used to be a fixed-width sidebar down the left edge. On the tables this
 * section is built around (Actions is the widest column and always the last
 * one) that sidebar was real width taken away from the table permanently, on
 * every screen, whether or not you were even looking at the category list —
 * the Actions column sat past the fold and needed a horizontal scroll to
 * reach on anything but a very wide window. A tab strip spends that width
 * only on its own row, so the table gets the full width back.
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
        <div className="mcm-monitor-topnav-row">
          <Sidebar />
        </div>
        <div className="flex w-full flex-1 min-h-0 flex-col">
          <MonitoringTopbarProvider value={topbar}>
            <SuspenseOutlet />
          </MonitoringTopbarProvider>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
