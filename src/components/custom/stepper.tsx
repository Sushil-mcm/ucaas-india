import { DoneIcon } from '@/assets/icons';
import { FC } from 'react';

interface IStepperProps {
  steps: any[];
  currentStep: number;
  stepperTitle?: string;
  customClass?: string;
  customStep?: string;
  mobileHorizontal?: boolean;
}
const Stepper: FC<IStepperProps> = ({
  steps,
  currentStep,
  customClass,
  customStep,
  mobileHorizontal = false,
}) => {
  return (
    <div className={`p-3 bg-white ${customClass}`}>
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
              className={`${handleChange ? 'pointer' : ''} relative flex ${mobileHorizontal ? 'xxl:min-w-fit xxl:shrink-0 items-center pr-0 lg:w-full lg:pr-3 lg:last:w-max' : 'w-full items-start pr-0 sm:items-center sm:pr-3 sm:last:w-max'} sm:last-of-type:pr-0 after:hidden after:content-[''] after:w-full after:h-h-0.5 after:border-b-1 ${mobileHorizontal ? 'lg:after:inline-block' : 'sm:after:inline-block'} last:after:w-0 ${currentStep > index + 1 ? 'after:border-primary' : ' after:border-gray-200 '}`}
            >
              <div
                className={`relative flex items-center ${mobileHorizontal ? 'min-h-11 gap-2 pr-2 lg:min-h-14 lg:gap-3 lg:pr-3' : 'min-h-14 gap-3 pr-3'}`}
              >
                <div
                  className={`flex items-center justify-center rounded-full border text-primary shrink-0 ${mobileHorizontal ? 'h-7 w-7 text-sm lg:h-8 lg:w-8' : 'w-8 h-8'} ${customStep} ${(currentStep ?? 0) >= step.number || step.number === 1 ? 'bg-ucass-primary-200 border-primary ' : 'bg-gray-100 border-gray-200 '}`}
                >
                  <p
                    className={` ${(currentStep ?? 0) >= step.number || step.number === 1 ? 'bg-transparent text-primary' : ' text-gray-900/80'} cursor-pointer text-md font-semibold`}
                  >
                    {currentStep > index + 1 ? <DoneIcon className="text-primary" /> : step.number}
                  </p>
                </div>
                <p
                  className={`${mobileHorizontal ? 'text-xs lg:text-sm' : 'text-sm'} font-semibold whitespace-nowrap ${(currentStep ?? 0) >= step.number || step.number === 1 ? 'text-primary' : ' text-gray-900/80 '}`}
                >
                  {step.title}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Stepper;
