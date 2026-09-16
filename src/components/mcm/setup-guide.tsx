/* The first-time setup guide.
 *
 * Modelled on the usual deployment order rather than invented: offices, then
 * users, then main line routing. the usual guidance is the same sequence with
 * organisation first. Both put locations before people, because a person
 * inherits their clock and their address from where they sit.
 *
 * It is a guide, not a cage. Every step is a link, the menu keeps working, and
 * nothing is ever blocked behind an unfinished step — an admin who only wants to
 * add one person should not have to complete a wizard first. Once everything is
 * done it stops showing entirely, so an established account is not nagged.
 *
 * Presented as a horizontal stepper (done/next/future nodes joined by a line)
 * rather than five always-expanded rows — the connecting line already carries
 * the "how far along" signal a separate progress bar used to duplicate, and
 * only the step that's actually actionable (`next`) gets its full
 * purpose/detail text, in a panel below the stepper.
 */

import { Fragment, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Headset,
  MapPin,
  Phone,
  Users,
  X,
} from 'lucide-react';
import { useSetupProgress, type SetupStepKey } from '@/hooks/use-setup-progress';

const DISMISS_KEY = 'mcm.setup-guide.dismissed';

/* One icon per step key rather than a plain number — the five keys are fixed
   (see use-setup-progress.ts), so mapping them by hand here is safe and
   reads better than a generic placeholder glyph. */
const STEP_ICONS: Record<SetupStepKey, typeof Building2> = {
  company: Building2,
  locations: MapPin,
  people: Users,
  numbers: Phone,
  handling: Headset,
};

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    /* Private windows and blocked site data throw. Showing the guide is the
       safer default — it is dismissable again. */
    return false;
  }
};

const SetupGuide = ({ companyInfo }: { companyInfo?: any }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(readDismissed);

  /* Two steps point at the page the guide is already on. Calling navigate() for
     those is a no-op, so the row looked broken — clicking it did nothing at all.
     They scroll to their section instead, and flash its outline, because a page
     that silently jumps leaves you unsure whether anything happened. */
  const goToStep = (path: string, anchor?: string) => {
    if (anchor && pathname === path) {
      const target = document.getElementById(anchor);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('mcm-flash');
        window.setTimeout(() => target.classList.remove('mcm-flash'), 1600);
        return;
      }
    }
    navigate(path);
  };
  const [expanded, setExpanded] = useState(true);
  const { steps, completed, total, next, isLoading, licences } = useSetupProgress(companyInfo);

  /* Nothing is shown while the counts are still arriving: a half-loaded guide
     would tell an established account it has set nothing up. */
  if (dismissed || isLoading) return null;

  const allDone = completed >= total - 1 && !next;
  if (allDone) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* Not being able to remember the dismissal is a small annoyance, not a
         reason to leave the panel stuck open. */
    }
  };

  const NextIcon = next ? STEP_ICONS[next.key] : null;

  return (
    <div className="rounded-xl border border-primary/20 bg-ucass-primary-200/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Finish setting up your phone system</p>
          <p className="mt-0.5 text-xs text-gray-600">
            {completed} of {total} done
            {licences ? ` · ${licences.used} of ${licences.bought} licences used` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-white/60"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Hide setup guide"
            title="Hide this"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Horizontal stepper: a filled line between two done steps, half-filled
              up to the next one, plain gray after it. Scrolls sideways instead of
              squeezing five nodes onto a narrow screen. */}
          <div className="mt-4 -mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex w-full min-w-[520px] items-start">
              {steps.map((step, index) => {
                const isNext = next?.key === step.key;
                const isLast = index === steps.length - 1;
                const StepIcon = STEP_ICONS[step.key];
                return (
                  <Fragment key={step.key}>
                    <button
                      type="button"
                      onClick={() => goToStep(step.path, step.anchor)}
                      aria-label={`${step.title}${step.done ? ' — done' : isNext ? ' — next' : ''}`}
                      className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          step.done
                            ? 'bg-green-100 text-green-700'
                            : isNext
                              ? 'bg-primary text-white'
                              : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {step.done ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </span>
                      <span
                        className={`text-[11px] leading-tight ${
                          isNext
                            ? 'font-semibold text-gray-900'
                            : step.done
                              ? 'font-medium text-gray-700'
                              : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </span>
                    </button>
                    {!isLast && (
                      <span
                        className={`mt-4 h-0.5 flex-1 ${step.done ? 'bg-primary' : 'bg-gray-200'}`}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* Only the actionable step gets its full explanation — the stepper
              above already shows where everything else stands. */}
          {next && NextIcon && (
            <button
              type="button"
              onClick={() => goToStep(next.path, next.anchor)}
              className="mt-4 flex w-full cursor-pointer items-start gap-3 rounded-lg border border-primary bg-white p-3 text-left transition-colors hover:bg-primary/5"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <NextIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{next.title}</span>
                  <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                    Next
                  </span>
                </span>
                <span className="block text-xs text-gray-600">{next.purpose}</span>
                <span className="mt-0.5 block text-xs font-medium text-gray-500">
                  {next.detail}
                </span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default SetupGuide;
