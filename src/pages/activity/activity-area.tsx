import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import ActivityTimeStrips from './activity-strips';
import { USER_ACTIVITY_CONST } from './constant';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';

const ActivityArea = ({ range, duration, timings, activityType }: any) => {
  const { userActivitiesList } = useSocketEvents();
  const { user } = useUser();
  const timezone = user?.settings?.operational_hours?.regional?.timezone?.value || 'America/Denver';
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const dates = useMemo(() => {
    const newDates = [];

    const startDateStr = range?.startDate;
    const endDateStr = range?.endDate;

    const start = moment(startDateStr, 'YYYY-MM-DD');
    const end = moment(endDateStr, 'YYYY-MM-DD');

    const format = 'YYYY-MM-DD';
    const current = start?.clone();

    while (current?.isSameOrBefore(end, 'day')) {
      newDates.push({
        id: current?.format('YYYY-MM-DD'),
        date: current?.toDate(),
        label: current?.isSame(moment(), 'day')
          ? USER_ACTIVITY_CONST?.TODAY
          : current?.format(format),
      });
      current?.add(1, 'day');
    }

    return newDates;
  }, [range, duration]);

  useEffect(() => {
    if (dates && dates?.length) setExpandedItem(dates?.[dates?.length - 1]?.id || null);
  }, [dates]);

  const sortedDates = useMemo(() => {
    return [...dates]?.sort((a, b) => {
      if (a?.label === USER_ACTIVITY_CONST?.TODAY) return -1;
      if (b?.label === USER_ACTIVITY_CONST?.TODAY) return 1;
      return new Date(b?.date)?.getTime() - new Date(a?.date)?.getTime();
    });
  }, [dates]);
  return (
    <div className="w-full p-1 rounded">
      <div className="flex justify-center mb-1">
        <p className="text-gray-700 font-semibold text-sm flex items-center">
          Timezone - {timezone}
        </p>
      </div>
      {sortedDates?.map((date) => (
        <ActivityTimeStrips
          key={date?.id}
          activityDetails={date}
          timings={timings}
          activities={userActivitiesList?.data || []}
          activityType={activityType}
          expandedItem={expandedItem}
          setExpandedItem={setExpandedItem}
        />
      ))}
    </div>
  );
};

export default React.memo(ActivityArea);
