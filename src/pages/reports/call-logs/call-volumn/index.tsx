import { callVolumeList } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import { ReportsPageLayout } from '../../reports-content-layout';
import moment from 'moment';
import { useEffect } from 'react';

const CallVolume = () => {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { mutate: mutateCallVolumeList, data: dataCallVolumeList } = useMutation({
    mutationFn: callVolumeList,
    mutationKey: ['getCallVolume'],
  });
  const { headers: activitiesHeaders = {}, rows: activitiesRows = [] } =
    dataCallVolumeList?.data?.data?.result || {};

  const getCallOpacity = (value: any) => {
    if (!value || value == '-') return 'bg-white';
    let seconds = 0;
    const minuteMatch = value.match(/(\d+)m/);
    const secondMatch = value.match(/(\d+)s/);
    if (minuteMatch) {
      seconds += parseInt(minuteMatch[1], 10) * 60;
    }
    if (secondMatch) {
      seconds += parseInt(secondMatch[1], 10);
    }
    if (seconds < 60) {
      return 'bg-gray-100';
    }
    if (seconds < 60 && seconds <= 600) {
      return 'bg-gray-200';
    }
    if (seconds > 600 && seconds <= 1200) {
      return 'bg-gray-300';
    }
    return 'bg-gray-400';
  };

  const activitiesDays = activitiesHeaders?.days ?? [];
  const activitiesTimeSlots = activitiesRows?.map((r: { time: string }) => r.time) ?? [];
  const formatTimeToAmPm = (time: string) => moment(time, ['HH:mm', 'HH:mm:ss']).format('h a');
  const getShortDayName = (dayName: string) => moment(dayName, 'dddd').format('ddd');

  const getActivityValue = (dayKey: string, time: string) => {
    const row = activitiesRows?.find((r: { time: string }) => r.time === time);
    return (row as Record<string, string>)?.[dayKey] ?? '-';
  };

  useEffect(() => {
    mutateCallVolumeList({
      timezone: browserTimezone,
    });
  }, []);

  console.log(activitiesTimeSlots, 'activitiesDays');
  return (
    <>
      <ReportsPageLayout>
        <div className="w-full h-full flex flex-col sm:p-4 max-h-[cal(100vh-180px)] overflow-y-auto">
          <div className="w-full flex head">
            <div className="w-full min-h-14 flex justify-center items-center text-sm bg-gray-200 border-r-0 border-l border-gray-200">
              Time
            </div>
            {activitiesDays?.map((dayKey: string) => {
              const dayKeyArr = dayKey ? dayKey?.split(' ') : '';
              return (
                <div className="w-full min-h-14 flex flex-col justify-center items-center text-sm bg-gray-200 border-r-0 border-l border-gray-200">
                  <span className="sm:hidden">{getShortDayName(dayKeyArr?.[0])}</span>
                  <span className="hidden sm:inline">{dayKeyArr?.[0]}</span>
                  <span className="text-xs">({dayKeyArr?.[1]})</span>
                </div>
              );
            })}
          </div>
          {activitiesTimeSlots?.map((time: string) => {
            return (
              <>
                <div className="w-full flex">
                  <div className="w-full min-h-14 flex justify-center items-center text-sm bg-white border-r-0 border-b border-l border-gray-200">
                    {formatTimeToAmPm(time)}
                  </div>
                  {activitiesDays?.map((dayKey: string) => {
                    const value = getActivityValue(dayKey, time);
                    return (
                      <div
                        className={`w-full min-h-14 flex justify-center items-center text-sm border-r-0 last-of-type:border-r border-b border-l border-gray-200 ${getCallOpacity(value)}`}
                      >
                        {value}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })}
        </div>
        <div className="w-full bg-white p-4 flex items-center justify-center gap-2 border-t border-gray-200">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-700 text-sm font-medium">Low Engagement</span>
            <span className="bg-gray-100 p-2.5 rounded-sm"></span>
            {/* <span className="text-gray-700 text-sm font-medium">Most Busy Hours</span> */}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-gray-200 p-2.5 rounded-sm"></span>
            {/* <span className="text-gray-700 text-sm font-medium">Most Busy Day</span> */}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-gray-300 p-2.5 rounded-sm"></span>
            {/* <span className="text-gray-700 text-sm font-medium">Low Engagement</span> */}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-gray-400 p-2.5 rounded-sm"></span>
            <span className="text-gray-700 text-sm font-medium">High Engagement</span>
          </div>
        </div>
      </ReportsPageLayout>
    </>
  );
};

export default CallVolume;
