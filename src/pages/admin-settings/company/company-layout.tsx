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
 */

import { NavLink, Outlet } from 'react-router-dom';

import { useUser } from '@/hooks/use-user';
import { COMPANY_SECTIONS } from './company-sections';

import '@/components/mcm/mcm-page.css';

/* The journey a caller actually takes. Shown at the top because every setting
   below changes one of these steps, and an admin who cannot see the path cannot
   tell which setting they need. */
const CALL_JOURNEY = [
  { step: 'Call arrives', detail: 'on a company number' },
  { step: 'Open hours?', detail: 'business hours decide' },
  { step: 'Rings the person', detail: 'for the ring time set below' },
  { step: 'No answer', detail: 'nobody picks up' },
  { step: 'Voicemail', detail: 'caller leaves a message' },
];

const CompanyLayout = () => {
  const { user } = useUser();
  const companyName =
    user?.company_info?.company_name || user?.user_info?.company_name || 'your company';

  return (
    <section className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-gray-200/15">
      <div className="flex items-start justify-between gap-4 p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <div>
          <p className="text-gray-900 font-semibold text-lg">Company Phone Preferences</p>
          <p className="text-gray-500 text-xs">
            The phone rules for {companyName}, kept in one place.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3 overflow-y-auto">
        <div>
          <div className="mcm-flowpath" aria-label="How an incoming call is handled">
            {CALL_JOURNEY.map(({ step, detail }, index) => (
              <span key={step} className="mcm-flowstep">
                <span className="chip" title={detail}>
                  {step}
                </span>
                {index < CALL_JOURNEY.length - 1 && (
                  <span aria-hidden="true" className="px-1 text-gray-400">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Links rather than buttons, so each section can be opened in a new tab,
            bookmarked, and sent to someone in a support reply. */}
        <div className="mb-3 border-b border-gray-200">
          <nav className="flex flex-wrap gap-1" aria-label="Company settings">
            {COMPANY_SECTIONS.map((item) => (
              <NavLink
                key={item.path}
                to={`/admin-settings/company/${item.path}`}
                className={({ isActive }) =>
                  `cursor-pointer px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-700 hover:text-gray-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <Outlet />
      </div>
    </section>
  );
};

export default CompanyLayout;
