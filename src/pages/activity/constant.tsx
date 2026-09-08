import { DateFilterTypes, handleDate } from '@/components/custom/date-dropdown/constant';
import moment from 'moment';

export type RouterContextType = {
  isExpanded?: boolean;
};

export const activityTypes = [
  { id: 1, label: 'All', value: 'all' },
  { id: 2, label: 'Call', value: 'call' },
  { id: 3, label: 'Session', value: 'session' },
];

export function generateTimings(startTime: Date, endTime: Date) {
  const start = moment(startTime);
  const end = moment(endTime);
  const timings = [];

  for (let m = start?.clone(); m.isBefore(end); m.add(1, 'hour')) {
    timings.push(m.format('h:mmA'));
  }

  return timings;
}

export const USER_ACTIVITY_CONST = {
  CALL: 'call',
  CALL_STARTS: 'call_start',
  CALL_END: 'call_end',
  ONLINE: 'online',
  OFFLINE: 'offline',
  SESSION: 'session',
  ALL: 'all',
  TODAY: 'Today',
  THIS_WEEK: 'This Week',
  DEPARTMENT: 'DEPARTMENT',
  EXTENSION: 'EXTENSION',
  VOICEMAIL: 'VOICEMAIL',
  QUEUE: 'QUEUE',
  IVR: 'IVR',
};

export const userActivityDateInitialVal = {
  value: handleDate('Today'),
  date_type: 'Today',
  dateOptions: DateFilterTypes,
};
export function roundToNextHour(date: Date) {
  const d = new Date(date);

  if (d?.getMinutes() > 0 || d?.getSeconds() > 0 || d?.getMilliseconds() > 0) {
    if (d?.getHours() === 23) {
      d?.setHours(23, 59, 59, 999);
    } else {
      d?.setHours(d?.getHours() + 1, 0, 0, 0);
    }
  } else {
    d?.setMinutes(0, 0, 0);
  }
  return d;
}

interface ActivityAreaProps {
  range: {
    startDate: Date | undefined;
    endDate: Date | undefined;
  };
  duration: { id: number; label: string; value: { start_date: any; end_date: any } } | null;
  timings: string[];
}

interface RangeDate {
  id: string;
  date?: Date;
  label?: string;
}

interface ActivityTimeProps {
  activityDetails: RangeDate;
  timings: string[];
}
interface Activity {
  id: string;
  timestamp: string;
  activity: string;
  data?: any;
}
interface TimePickerProps {
  startTime: Date;
  endTime: Date;
  setStartTime: (date: Date) => void;
  setEndTime: (date: Date) => void;
  startLabel?: string;
  endLabel?: string;
  width?: string;
}
export type { ActivityAreaProps, RangeDate, ActivityTimeProps, TimePickerProps, Activity };
