import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * The full-width bar under the app navbar on Monitoring screens.
 *
 * Each category page owns its own bar content — the breadcrumb, and whatever
 * sits on the right of it: a Summary toggle on All Extensions, a queue picker
 * and a third crumb on Call Queue. So the bar cannot simply be lifted into the
 * layout and rebuilt from the route; the pages have to keep rendering it.
 *
 * The layout instead publishes a container that spans the page, and each page
 * renders its bar into that container. The bar keeps its markup and its state,
 * and lands above the sidebar rather than inside the content column.
 *
 * With no container in context the slot renders inline, which is what happens
 * when a page is embedded somewhere outside this layout — All Extensions is
 * also used that way. Falling back to inline keeps the bar visible there
 * instead of silently dropping it.
 */
const MonitoringTopbarContext = createContext<HTMLElement | null>(null);

export const MonitoringTopbarProvider = MonitoringTopbarContext.Provider;

export const MonitoringTopbarSlot = ({ children }: { children: ReactNode }) => {
  const container = useContext(MonitoringTopbarContext);

  if (!container) return <>{children}</>;

  return createPortal(children, container);
};
