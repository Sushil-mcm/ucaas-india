import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

export type WebsiteScanProgressStatus = 'idle' | 'loading' | 'success' | 'error';

const SCAN_STEPS = [
  'Fetching pages',
  'Reading content',
  'Grouping by type',
  'Picking the best pages',
];

type WebsiteScanProgressModalProps = {
  open: boolean;
  status: WebsiteScanProgressStatus;
};

const WebsiteScanProgressModal = ({ open, status }: WebsiteScanProgressModalProps) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setActiveStepIndex(0);
      return;
    }

    if (status !== 'loading') return;

    setActiveStepIndex(0);
    const intervalId = window.setInterval(() => {
      setActiveStepIndex((prevIndex) => Math.min(prevIndex + 1, SCAN_STEPS.length - 1));
    }, 850);

    return () => window.clearInterval(intervalId);
  }, [open, status]);

  if (!open) return null;

  const isComplete = status === 'success';
  const isError = status === 'error';

  return (
    <div
      aria-live="polite"
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-4"
    >
      <div className="w-full max-w-[390px] rounded-2xl bg-white px-7 py-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          {isComplete ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-8 w-8" />
            </div>
          ) : (
            <div
              className={`h-14 w-14 rounded-full border-4 border-slate-200 ${
                isError ? 'border-b-red-500' : 'border-b-blue-600'
              } animate-spin`}
            />
          )}
        </div>

        <h3 className="mt-5 text-lg font-bold text-gray-950">
          {isError ? 'Scan could not complete' : 'Scanning your website...'}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {isComplete
            ? 'Pages are ready.'
            : isError
              ? 'Please try again in a moment.'
              : 'Picking the best pages...'}
        </p>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-blue-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isError ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{
              width: isComplete
                ? '100%'
                : `${Math.max(25, ((activeStepIndex + 1) / SCAN_STEPS.length) * 100)}%`,
            }}
          />
        </div>

        <div className="mt-5 space-y-3 text-left">
          {SCAN_STEPS.map((step, index) => {
            const isStepComplete = isComplete || index < activeStepIndex;
            const isStepActive = !isComplete && !isError && index === activeStepIndex;

            return (
              <div key={step} className="flex items-center gap-3 text-sm text-slate-600">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isStepComplete
                      ? 'bg-emerald-500 text-white'
                      : isStepActive
                        ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isStepComplete ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isStepActive ? (
                    <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-200 border-b-blue-600" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WebsiteScanProgressModal;
