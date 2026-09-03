/* The four screens that decide access, in the order they should be used.
 *
 * They were built one at a time and ended up as four unrelated entries in the
 * sidebar, so an administrator landing on any one of them had no way of knowing
 * there were three more, or which came first. Access is not four settings; it is
 * one decision made in four steps, and the steps have an order:
 *
 *   1. Understand the kinds of person, and what each is meant to be able to do.
 *   2. Set what a role can do.
 *   3. Set how far that reaches — which locations or departments.
 *   4. Choose what a brand-new person starts on.
 *
 * This strip sits at the top of each of them and says where you are in that
 * order. It is deliberately the same list on every screen, in the same order,
 * with the current one marked: the shape of the area should be learnable from
 * any one of its pages.
 */

import { useNavigate } from 'react-router-dom';

export interface AreaStep {
  step: number;
  title: string;
  path: string;
  /** What this step decides, in a few words. */
  purpose: string;
}

export const ACCESS_STEPS: AreaStep[] = [
  {
    step: 1,
    title: 'How access works',
    path: '/admin-settings/access-control',
    purpose: 'The six kinds of person and what each one is for',
  },
  {
    step: 2,
    title: 'Roles',
    path: '/admin-settings/roles',
    purpose: 'What a role can do',
  },
  {
    step: 3,
    title: 'Admin scope',
    path: '/admin-settings/admin-scope',
    purpose: 'How far it reaches',
  },
  {
    step: 4,
    title: 'Default permissions',
    path: '/admin-settings/default-permissions',
    purpose: 'What a new person starts on',
  },
];

/** The reference table. Reachable from step 1, and its own entry in the nav. */
export const MATRIX_PATH = '/admin-settings/capability-matrix';

/**
 * The strip. `current` is the path of the screen showing it, so the step you are
 * on is marked rather than offered as a link to itself.
 */
export const AreaNav = ({ current }: { current: string }) => {
  const navigate = useNavigate();

  return (
    <nav className="flex flex-wrap items-center gap-1.5" aria-label="Access control steps">
      {ACCESS_STEPS.map((item) => {
        const here = item.path === current;
        return (
          <button
            key={item.path}
            type="button"
            disabled={here}
            title={item.purpose}
            onClick={() => navigate(item.path)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              here
                ? 'border-primary bg-primary/10 text-primary cursor-default'
                : 'border-[#EEE7DD] bg-white text-[#2E2D35] hover:border-primary hover:text-primary'
            }`}
          >
            <span className="opacity-60">{item.step}.</span> {item.title}
          </button>
        );
      })}
    </nav>
  );
};

export default AreaNav;
