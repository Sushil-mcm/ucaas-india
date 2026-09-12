import { DoneIcon } from '@/assets/icons';
import { FC, ReactNode } from 'react';

interface IStepperProps {
  steps: any[];
  currentStep: number;
  stepperTitle?: string;
  customClass?: string;
  customStep?: string;
  mobileHorizontal?: boolean;
  /* A heading for the whole panel, not a single step -- optional and
     undefined at every other call site, so this only renders where a
     caller actually passes one. */
  panelTitle?: string;
  panelSubtitle?: string;
  /* Arbitrary content under that heading -- undefined everywhere except
     Directory's invite dialog, which uses it for the license-count pills. */
  panelFooter?: ReactNode;
  /* Opt-in, every other caller unaffected. When the root itself sits in a
     taller box that stretches to match a scrolling sibling (Locations'
     own rail: `align-self: stretch`, so its own border-right can span the
     full height instead of just this panel's content), the heading+step
     list need their own `position: sticky` -- the ROOT can't be the
     sticky element there, since a stretched box is already exactly as
     tall as the scrollable range, leaving no slack for it to lag behind
     and catch. Wraps just the title+list (not panelFooter, which nothing
     using this prop currently passes) in a sticky container instead. */
  stickyPanel?: boolean;
}
const Stepper: FC<IStepperProps> = ({
  steps,
  currentStep,
  customClass,
  customStep,
  mobileHorizontal = false,
  panelTitle,
  panelSubtitle,
  panelFooter,
  stickyPanel = false,
}) => {
  const titleAndSteps = (
    <>
      {panelTitle ? (
        <div className="mcm-stepper-panel-head">
          <h3>{panelTitle}</h3>
          {panelSubtitle ? <p>{panelSubtitle}</p> : null}
        </div>
      ) : null}
      <ol
        className={`mx-auto flex w-full max-w-4xl ${mobileHorizontal ? 'items-center gap-2 overflow-x-auto pb-1 lg:w-4/5 lg:gap-0 lg:overflow-visible' : 'flex-col gap-3 sm:w-4/5 sm:flex-row sm:items-center sm:gap-0'}`}
      >
        {steps.map((step, index) => {
          const handleChange = step?.handleChange || null;
          return (
            <li
              onClick={() => {
                if (handleChange) handleChange(step);
              }}
              key={index}
              className={`${handleChange ? 'pointer' : ''} relative flex ${mobileHorizontal ? 'xxl:min-w-fit xxl:shrink-0 items-center pr-0 lg:w-full lg:pr-3 lg:last:w-max' : 'w-full items-start pr-0 sm:items-center sm:pr-3 sm:last:w-max'} sm:last-of-type:pr-0 after:hidden after:content-[''] after:w-full after:h-h-0.5 after:border-b-1 ${mobileHorizontal ? 'lg:after:inline-block' : 'sm:after:inline-block'} last:after:w-0 ${currentStep > index + 1 ? 'after:border-primary' : ' after:border-gray-200 dark:after:border-mcm-line '}`}
            >
              <div
                className={`relative flex items-center ${mobileHorizontal ? 'min-h-11 gap-2 pr-2 lg:min-h-14 lg:gap-3 lg:pr-3' : 'min-h-14 gap-3 pr-3'}`}
              >
                <div
                  className={`flex items-center justify-center rounded-full border text-primary shrink-0 ${mobileHorizontal ? 'h-7 w-7 text-sm lg:h-8 lg:w-8' : 'w-8 h-8'} ${customStep} ${(currentStep ?? 0) >= step.number || step.number === 1 ? 'bg-ucass-primary-200 border-primary ' : 'bg-gray-100 dark:bg-mcm-surface-3 border-gray-200 dark:border-mcm-line '}`}
                >
                  <p
                    /* `dark:text-[#2b1f12]`: the active circle is filled
                       `bg-ucass-primary-200`, and in dark that token and
                       `--primary` are both #ffab5e -- so an orange numeral sat
                       on an identical orange fill and vanished. Light is
                       unaffected: its fill is a pale peach behind #f2994a. */
                    className={` ${(currentStep ?? 0) >= step.number || step.number === 1 ? 'bg-transparent text-primary dark:text-[#2b1f12]' : ' text-gray-900/80 dark:text-mcm-ink-2'} cursor-pointer text-md font-semibold`}
                  >
                    {currentStep > index + 1 ? (
                      <DoneIcon className="text-primary dark:text-[#2b1f12]" />
                    ) : (
                      step.number
                    )}
                  </p>
                </div>
                <div>
                  <p
                    className={`${mobileHorizontal ? 'text-xs lg:text-sm' : 'text-sm'} font-semibold whitespace-nowrap ${(currentStep ?? 0) >= step.number || step.number === 1 ? 'text-primary' : ' text-gray-900/80 dark:text-mcm-ink-2 '}`}
                  >
                    {step.title}
                  </p>
                  {/* Optional, undefined everywhere this component already
                      renders elsewhere in the app -- only a caller that adds
                      a `description` to its own step objects gets this
                      second line. */}
                  {step.description ? (
                    <p className="mt-0.5 text-xs whitespace-normal text-gray-500 dark:text-mcm-ink-3">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );

  return (
    <div
      className={`p-3 bg-white dark:bg-mcm-surface ${panelFooter ? 'flex h-full flex-col' : ''} ${customClass}`}
    >
      {stickyPanel ? (
        <div style={{ position: 'sticky', top: 0 }}>{titleAndSteps}</div>
      ) : (
        titleAndSteps
      )}
      {panelFooter ? <div className="mt-auto">{panelFooter}</div> : null}
    </div>
  );
};

export default Stepper;
