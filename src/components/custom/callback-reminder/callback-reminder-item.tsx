import { BellRing, Phone, X, CheckCircle2 } from 'lucide-react';

export const CallbackReminderItem = ({
  task,
  onClose,
  onCall,
  onComplete,
  stackIndex,
  isExiting,
}: {
  task: any;
  onClose: () => void;
  onCall: (phone: string) => void;
  onComplete: (id: string) => void;
  stackIndex: number;
  isExiting: boolean;
}) => {
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-[210px] flex flex-col overflow-hidden rounded-lg border border-ucass-active-bg red-200 bg-white shadow-2xl transition-all duration-200 ease-out dark:border-stone-300/50"
      style={{
        opacity: isExiting ? 0 : 1 - stackIndex * 0.12,
        pointerEvents: stackIndex === 0 ? 'auto' : 'none',
        transform: isExiting
          ? 'translateX(2rem) scale(0.95)'
          : `translateX(0) translateY(-${stackIndex * 12}px) scale(${1 - stackIndex * 0.035})`,
        zIndex: 100 - stackIndex,
      }}
    >
      <div className="flex items-start gap-3 border-b border-ucass-active-bg bg-ucass-active-bg px-4 py-2.5 shrink-0">
        <div className="flex h-9 w-9 min-w-9 items-center justify-center rounded-full bg-primary text-white">
          <BellRing className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">
            {task?.details?.contactPhone ? 'Callback Reminder' : 'Task Reminder'}
          </p>
          <p className="text-[10px] text-primary/80">Scheduled time has arrived</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 min-w-7 cursor-pointer items-center justify-center rounded-sm text-slate-500 hover:bg-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3.5 flex-1 flex flex-col justify-between min-h-0">
        <div className="flex items-start justify-between gap-4 min-h-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {task?.details?.contactPhone
                ? task?.details?.contactName || 'Unknown Contact'
                : task?.name || task?.title || 'Task Due'}
            </p>
            {task?.details?.contactPhone ? (
              <p className="mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />
                  {task.details.contactPhone}
                </span>
              </p>
            ) : null}
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
              {task?.description ||
                (task?.details?.contactPhone ? 'Scheduled Callback' : 'Scheduled Task')}
            </p>
          </div>
          <span className="rounded-sm border whitespace-nowrap border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 self-start">
            Due now
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {task?.details?.contactPhone ? (
            <button
              type="button"
              onClick={() => onCall(task?.details?.contactPhone)}
              className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white transition-all active:scale-95 shadow-sm"
            >
              <Phone className="h-3.5 w-3.5" />
              Call Now
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete(task?._id)}
              className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 text-xs font-medium text-white transition-all active:scale-95 shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Complete Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
