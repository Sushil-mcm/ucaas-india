import DatePicker from 'react-datepicker';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

import { handleAlert } from '@/lib/utils';

type DialpadScheduleCallbackProps = {
  onSave: (selectedDateTime: Date) => void;
  isLoading?: boolean;
};

const DialpadScheduleCallback = ({ onSave, isLoading }: DialpadScheduleCallbackProps) => {
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(() => {
    const now = new Date();
    // Default to the next 15-minute block to avoid being in the past immediately
    const ms = 1000 * 60 * 15;
    return new Date(Math.ceil(now.getTime() / ms) * ms);
  });

  const filterPassedTime = (time: Date) => {
    const currentDate = new Date();
    const selectedDate = selectedDateTime || new Date();

    if (selectedDate.toDateString() === currentDate.toDateString()) {
      return time.getTime() > currentDate.getTime();
    }
    return true;
  };

  return (
    <div className="rounded-xl border border-[#d4e1f6] bg-ucass-active-bg p-2.5 sm:p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] sm:text-xs">
        Schedule Callback
      </p>

      <div className="w-full relative">
        <DatePicker
          selected={selectedDateTime}
          onChange={(date) => {
            setSelectedDateTime(date);
          }}
          showTimeSelect
          minDate={new Date()}
          filterTime={filterPassedTime}
          dateFormat="yyyy-MM-dd HH:mm"
          className="border border-gray-300 focus:border-primary focus:ring-0 focus:outline-none shadow-secondary/5 disabled:bg-gray-300 disabled:text-slate-500 disabled:border-gray-200 disabled:shadow-none text-gray-700 placeholder:text-gray-700 bg-white shadow-sm text-sm hover:border-primary rounded-xl w-full px-3 min-h-10 custom-className"
        />
      </div>

      <button
        type="button"
        onClick={() => {
          if (!selectedDateTime) return;
          if (selectedDateTime < new Date()) {
            handleAlert({ text: 'Past time cannot be scheduled', type: 'error' });
            return;
          }
          onSave(selectedDateTime);
        }}
        disabled={!selectedDateTime || isLoading}
        className="mt-2 w-full inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save'
        )}
      </button>
    </div>
  );
};

export default DialpadScheduleCallback;
