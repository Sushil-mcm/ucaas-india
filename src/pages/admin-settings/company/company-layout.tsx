/* The frame around every company settings screen.
 *
 * These nine screens used to be one page holding `activeSection` in state, so
 * all nine shared a single URL. Nothing could be linked to, a reload always
 * landed back on the first section, the back button skipped the whole area, and
 * one permission guarded the lot — including Security, which sits behind the
 * phone-system permission and therefore opens for anyone who can view the phone
 * system.
 *
 * Each section is now a route. This component holds only what they share: the
 * heading, the sub-navigation, and the outlet the section renders into. The nav
 * is built from the same table the router uses, so a section cannot appear in
 * one and not the other.
 *
 * The heading and the switcher are one header block (`cs-head` + `tabnav` in
 * mcm-page.css) rather than a heading followed by a separate strip. The row is
 * not in a container of its own: it sits on the header's surface, and the
 * header's closing hairline is the line the tabs stand on, with the open
 * section marked by a 3px accent rule laid over that hairline. Twelve sections
 * do not fit across a laptop, so the row scrolls sideways — by wheel, by
 * dragging, by keyboard focus, or with the chevron that appears at whichever
 * end still has sections behind it.
 *
 * `tabnav` is deliberately not `ptabstrip`, the strip used by admin home,
 * billing, call coverage, departments and numbers. Restyling that class would
 * have redesigned five other pages; this is its own component, and those pages
 * are untouched.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useUser } from '@/hooks/use-user';
import { COMPANY_ROOT, COMPANY_RULES_PATH, COMPANY_SECTIONS } from './company-sections';

import '@/components/mcm/mcm-page.css';

const SECTION_LABELS = new Map(COMPANY_SECTIONS.map((section) => [section.path, section.label]));

/* A slug turned back into words, for a screen nested inside a section. Sections
   themselves never come through here — their wording is the one in
   COMPANY_SECTIONS, so the crumb and the tab cannot say different things. */
const humanise = (slug: string) => slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/* A record's id, not a place with a name. A crumb reading "8f3c-…" tells nobody
   anything, so these are left out of the trail and the screen they belong to
   ends it instead. */
const IS_ID = /^\d+$|^[0-9a-f]{8}-[0-9a-f]{4}-/i;

const CompanyLayout = () => {
  const { user } = useUser();
  const { pathname } = useLocation();

  /* Twelve sections do not fit across the strip on a laptop, so the tabs past
     Policies were reachable only by dragging a scrollbar that was hidden — the
     row just looked as if it stopped at Security. These two flags drive a
     chevron at whichever end still has tabs behind it. */
  const railRef = useRef<HTMLElement | null>(null);
  const markerRef = useRef<HTMLSpanElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [markerReady, setMarkerReady] = useState(false);

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    /* A pixel of slack: browsers hand back fractional scroll positions on
       zoomed or scaled displays, so an exact comparison never reaches the end
       and the right chevron would stay up forever. */
    const furthest = rail.scrollWidth - rail.clientWidth;
    setCanScrollLeft(rail.scrollLeft > 1);
    setCanScrollRight(rail.scrollLeft < furthest - 1);
  }, []);

  /* Puts the marker under the open section's label. Coordinates are taken
     inside the scrolling content, so they hold whatever the row is scrolled to
     and the marker travels with the tabs without being repositioned. */
  const placeMarker = useCallback(() => {
    const rail = railRef.current;
    const marker = markerRef.current;
    if (!rail || !marker) return;

    const tab = rail.querySelector<HTMLElement>('[aria-current="page"]');
    const label = tab?.querySelector<HTMLElement>('.tabnav-label');
    if (!tab || !label) {
      /* No section of this area is open — a redirect in flight, say. Better an
         absent marker than one parked under the wrong word. */
      marker.style.width = '0px';
      return;
    }

    /* Measured rectangles rather than offsetLeft/offsetWidth, which are whole
       numbers. At any zoom that is not 100%, or on a display whose scale factor
       is fractional, a tab's real edges fall between pixels — rounded offsets
       leave the marker up to a pixel adrift of the word it belongs to, and the
       error is different for every tab. Rects keep the fraction.

       Subtracting the row's own left edge and adding back how far it is
       scrolled turns viewport coordinates into content coordinates, which is
       what the marker is positioned in. The row has no border or padding, so
       its border box and the marker's containing block are the same box. */
    const rowBox = rail.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const left = labelBox.left - rowBox.left + rail.scrollLeft;
    marker.style.transform = `translateX(${left}px)`;
    /* A real width, not a scaled-up seed — see .tabnav-marker for what scaling
       one pixel by sixty does to the marker as soon as the page is zoomed. */
    marker.style.width = `${labelBox.width}px`;
  }, []);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    measure();
    rail.addEventListener('scroll', measure, { passive: true });

    /* The strip has to re-measure when the window changes width and when the
       sidebar collapses — the second one moves the strip's edges without the
       window resizing at all, so a resize listener alone would miss it. */
    const observer = new ResizeObserver(() => {
      measure();
      placeMarker();
    });
    observer.observe(rail);

    /* Labels change width when the webfont lands, and the marker is cut to a
       label. Without this it keeps the fallback font's width until something
       else moves it. */
    document.fonts?.ready.then(placeMarker).catch(() => {});

    /* Turns a normal wheel — the one that scrolls the page up and down — into
       sideways movement while the pointer is over the strip. A trackpad's
       sideways swipe already works and is left alone. Registered by hand
       because React marks its own onWheel listener passive, and a passive
       listener cannot stop the page scrolling behind the strip. */
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (rail.scrollWidth <= rail.clientWidth) return;
      event.preventDefault();
      rail.scrollLeft += event.deltaY;
    };
    rail.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      rail.removeEventListener('scroll', measure);
      rail.removeEventListener('wheel', onWheel);
      observer.disconnect();
    };
  }, [measure, placeMarker]);

  /* Place the marker before the browser paints, then allow it to animate. Doing
     it in this order means the first section opens with the marker already
     under it, rather than sliding in from the left edge on arrival. */
  useLayoutEffect(() => {
    placeMarker();
    const frame = requestAnimationFrame(() => setMarkerReady(true));
    return () => cancelAnimationFrame(frame);
  }, [pathname, placeMarker]);

  /* Open Security from a bookmark and the strip should already be showing
     Security, not scrolled back to Phone rules with the open tab off-screen. */
  useEffect(() => {
    railRef.current?.querySelector('[aria-current=\'page\']')?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [pathname]);

  const nudge = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    /* Most of a screenful, not all of it: leaving a couple of tabs in view
       keeps a landmark, so it is obvious where the row has moved to. */
    rail.scrollBy({ left: direction * rail.clientWidth * 0.7, behavior: 'smooth' });
  };

  const companyName =
    user?.company_info?.company_name || user?.user_info?.company_name || 'your company';

  /* The trail below Company, read off the address rather than kept in a second
     list. The first segment is the open section; anything after it is a screen
     inside that section, and it appears in the trail on its own the day such a
     route is added — nobody has to remember to come back here for it. */
  const trail = useMemo(() => {
    const rest = pathname.startsWith(`${COMPANY_ROOT}/`)
      ? pathname.slice(COMPANY_ROOT.length + 1)
      : '';
    let href = COMPANY_ROOT;
    return rest
      .split('/')
      .filter((segment) => segment && !IS_ID.test(segment))
      .map((segment) => {
        href += `/${segment}`;
        return { href, label: SECTION_LABELS.get(segment) ?? humanise(segment) };
      });
  }, [pathname]);

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--ground)]">
      {/* Title, description and section switcher are one block on one surface.
          The tabs used to sit below this header on the page ground, which made
          them the only band of grey between the white header and the white
          content — so the row read as a container nobody had drawn. Sharing the
          header's surface means the row needs no box of its own, and the
          header's hairline becomes the line the tabs sit on. */}
      <header className="cs-head">
        {/* The full path down to the open section, and past it if that section
            ever holds screens of its own. Every step but the last is a link, so
            the trail is a way back up and not only a label. */}
        <nav className="cs-crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/admin-settings">Admin settings</Link>
            </li>
            {/* Named and addressed exactly as the sidebar entry that leads here,
                from the one constant both read, so the two cannot come to say
                different things or point at different screens. It lands on the
                first section rather than the company overview, which is a
                different screen and not what this step means. */}
            <li>
              {trail.length ? (
                <Link to={COMPANY_RULES_PATH}>Company Rules</Link>
              ) : (
                <span aria-current="page">Company Rules</span>
              )}
            </li>
            {trail.map((crumb, index) => (
              <li key={crumb.href}>
                {index === trail.length - 1 ? (
                  <span aria-current="page">{crumb.label}</span>
                ) : (
                  <Link to={crumb.href}>{crumb.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <h1 className="cs-title">Company Phone Preferences</h1>
        <p className="cs-sub">The phone rules for {companyName}, kept in one place.</p>

        <div className={markerReady ? 'tabnav is-ready' : 'tabnav'}>
          {/* Links rather than buttons, so each section can be opened in a new
              tab, bookmarked, and sent to someone in a support reply. They also
              switch only on click — never on hover or focus — so arrowing along
              the row cannot change section by accident. */}
          <nav className="tabnav-scroll" aria-label="Company settings" ref={railRef}>
            {COMPANY_SECTIONS.map((item) => (
              <NavLink
                key={item.path}
                to={`/admin-settings/company/${item.path}`}
                className="tabnav-tab"
              >
                {/* data-label carries the same words a second time, hidden, to
                    reserve the width this label takes once it is the bold open
                    one. See .tabnav-label. */}
                <span className="tabnav-label" data-label={item.label}>
                  {item.label}
                </span>
              </NavLink>
            ))}

            {/* One marker for the row, so switching section slides it across
                rather than blinking it out here and in there. Inside the
                scroller so it keeps its place when the row is scrolled. */}
            <span className="tabnav-marker" ref={markerRef} aria-hidden="true" />
          </nav>

          {/* Drawn only when there is something that way to reach, so no
              chevron is a reliable "nothing is hidden". */}
          {canScrollLeft && (
            <button
              type="button"
              className="tabnav-more back"
              onClick={() => nudge(-1)}
              tabIndex={-1}
              aria-hidden="true"
            >
              {/* The chevron sits on a surface of its own — see .tabnav-chip. */}
              <span className="tabnav-chip">
                <ChevronLeft size={15} strokeWidth={2.25} />
              </span>
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              className="tabnav-more"
              onClick={() => nudge(1)}
              tabIndex={-1}
              aria-hidden="true"
            >
              <span className="tabnav-chip">
                <ChevronRight size={15} strokeWidth={2.25} />
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Same 12px inset as the header above, so the title, the tabs and the
          content below all sit on one left edge. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-4">
        <Outlet />
      </div>
    </section>
  );
};

export default CompanyLayout;
