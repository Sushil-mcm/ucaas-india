import React, { useMemo } from 'react';
import moment from 'moment';
import MinuteMark from './minute-mark';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  USER_ACTIVITY_CONST,
  COMING_ACTIVITY,
  getActivityIcon,
  RangeDate,
  Activity,
} from './constant';

interface ActivityTimeStripsProps {
  activityDetails: RangeDate;
  timings: string[];
  activities: Array<{ activity: Activity[] }>;
  activityType: { value: string };
  expandedItem: string | null;
  setExpandedItem: (value: string | null) => void;
}

const FIVE_MINUTE_INTERVALS = 12;
const HOUR_DIVISIONS = 5;
const NO_ACTION_TEXT = 'No action';

const ActivityTimeStrips = ({
  activityDetails,
  timings,
  activities,
  activityType,
  expandedItem,
  setExpandedItem,
}: ActivityTimeStripsProps) => {
  const targetDate = useMemo(
    () => moment.parseZone(activityDetails?.date)?.format('DD-MM-YYYY'),
    [activityDetails?.date],
  );

  const filteredActivities = useMemo(() => {
    const filterByType = (activity: Activity) => {
      if (activityType?.value === USER_ACTIVITY_CONST?.CALL) {
        return [USER_ACTIVITY_CONST?.CALL_STARTS, USER_ACTIVITY_CONST?.CALL_END]?.includes(
          activity?.activity,
        );
      }
      if (activityType?.value === USER_ACTIVITY_CONST?.SESSION) {
        return [USER_ACTIVITY_CONST?.ONLINE, USER_ACTIVITY_CONST?.OFFLINE]?.includes(
          activity?.activity,
        );
      }
      return activityType?.value === USER_ACTIVITY_CONST?.ALL;
    };

    return (
      activities?.flatMap((data) =>
        data?.activity?.filter((val: Activity) => {
          const activityDate = moment.parseZone(val?.timestamp)?.format('DD-MM-YYYY');
          return targetDate === activityDate && filterByType(val);
        }),
      ) ?? []
    );
  }, [activities, targetDate, activityType?.value]);

  const fiveMinutePositions = useMemo(
    () =>
      Array.from({ length: FIVE_MINUTE_INTERVALS }, (_, i) => (i * 100) / FIVE_MINUTE_INTERVALS),
    [],
  );

  const handleAccordionChange = (value: string) => {
    setExpandedItem(value === activityDetails?.id ? value : null);
  };

  const RenderHourActivities = ({
    hourActivities,
    time,
  }: {
    hourActivities: Activity[];
    time: string;
  }) => {
    return hourActivities?.map((activity) => {
      const activityMoment = moment.parseZone(activity?.timestamp);
      const baseTimeMoment = moment
        .parseZone(`${moment(activityMoment)?.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD hh:mm A')
        .utcOffset(activityMoment?.utcOffset(), true);

      const minutes = activityMoment?.diff(baseTimeMoment, 'minutes');
      const position = Math.min(100, Math.max(0, (minutes / 60) * 100));
      const isDataArray = Array.isArray(activity?.data);
      const isTopPosition = [
        USER_ACTIVITY_CONST?.CALL_STARTS,
        USER_ACTIVITY_CONST?.ONLINE,
      ]?.includes(activity?.activity);

      return (
        <Tooltip key={`${activity?.id}-${activity?.timestamp}`}>
          <TooltipTrigger asChild>
            <div
              className={`absolute -translate-y-1/2 z-3 cursor-pointer flex flex-col items-center ${
                isTopPosition ? 'top-3.5' : '-bottom-0.5'
              }`}
              style={{ left: `${position}%` }}
            >
              {activity?.activity === USER_ACTIVITY_CONST?.CALL_END
                ? getActivityIcon(activity?.activity)
                : activity?.data && Array.isArray(activity?.data)
                  ? getActivityIcon(activity?.activity)
                  : activity?.data?.forward_type
                    ? getActivityIcon(activity?.data?.forward_type)
                    : getActivityIcon(activity?.data?.Direction)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="text-white text-sm space-y-1 capitalize">
              <div>
                {activity?.activity === USER_ACTIVITY_CONST?.CALL_END
                  ? COMING_ACTIVITY[activity?.activity as keyof typeof COMING_ACTIVITY]
                  : activity?.data && Array.isArray(activity?.data)
                    ? COMING_ACTIVITY[activity?.activity as keyof typeof COMING_ACTIVITY]
                    : activity?.data?.forward_type
                      ? COMING_ACTIVITY[
                          activity?.data?.forward_type as keyof typeof COMING_ACTIVITY
                        ]
                      : COMING_ACTIVITY[activity?.data?.Direction as keyof typeof COMING_ACTIVITY]}
              </div>
              {isDataArray && (
                <>
                  <p>
                    <span className="font-semibold">Device</span>:{' '}
                    {activity?.data?.[0]?.device_type}
                  </p>
                  <p>
                    <span className="font-semibold">IP</span>:{' '}
                    {activity?.data?.[0]?.ip_address || '---'}
                  </p>
                  <p>
                    <span className="font-semibold">Browser</span>:{' '}
                    {activity?.data?.[0]?.browser_version}
                  </p>
                  <p>
                    <span className="font-semibold">OS</span>: {activity?.data?.[0]?.os_version}
                  </p>
                </>
              )}
              <p>
                <span className="font-semibold">Time</span>: {activityMoment?.format('hh:mm A')}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    });
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={expandedItem === activityDetails?.id ? activityDetails?.id : ''}
      onValueChange={handleAccordionChange}
    >
      <AccordionItem
        value={activityDetails?.id}
        className="border border-dashed border-primary/40 rounded-lg bg-white mb-2 p-2 last:border-b-1"
      >
        <AccordionTrigger className="flex items-center p-0">
          <div className="flex items-center w-full bg-gray-50 sm:p-2 xs:py-2 xs:px-0">
            <div className="w-[10%] text-center">
              <div className="bg-ucass-primary-200 text-primary text-xs px-2 py-1 rounded">
                {activityDetails?.label}
              </div>
            </div>
            <div className="flex-1 flex justify-between px-2">
              {fiveMinutePositions?.map((_, i) => (
                <div key={i} className="text-xs text-gray-600">
                  {i * HOUR_DIVISIONS}
                </div>
              ))}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-1">
          {timings?.map((time: string) => {
            const baseTime = moment(time, 'hh:mm A')?.format('HH');
            const hourActivities = filteredActivities?.filter((activity) => {
              const activityHour = moment.parseZone(activity?.timestamp)?.format('HH');
              return activityHour === baseTime;
            });

            return (
              <div key={time} className="flex items-center mb-1 h-12">
                <div className="w-[10%] text-center text-xs text-gray-700">{time}</div>
                <div className="relative flex-1 h-full bg-white ml-2">
                  <div
                    className={`absolute top-1/2 left-0 w-full border-t ${
                      hourActivities?.length ? 'border-primary/30' : 'border-red-200'
                    }`}
                  ></div>
                  {fiveMinutePositions?.map((pos, i) => (
                    <MinuteMark key={i} position={pos} />
                  ))}
                  {hourActivities?.length > 0 &&
                    fiveMinutePositions?.map((pos, i) => (
                      <div
                        key={`marker-${i}`}
                        className="absolute top-1/2 left-0 z-3 -translate-y-1/2"
                        style={{ left: `${pos}%`, transformOrigin: 'center' }}
                      >
                        <div className="h-2 bg-gray-400 border-l border-primary/30"></div>
                      </div>
                    ))}

                  <TooltipProvider>
                    {hourActivities?.length ? (
                      <RenderHourActivities {...{ hourActivities, time }} />
                    ) : (
                      <div className="flex justify-center max-w-28 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-red-200 rounded px-4 py-1 text-xs text-red-500 bg-white z-10">
                        {NO_ACTION_TEXT}
                      </div>
                    )}
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default React.memo(ActivityTimeStrips);
