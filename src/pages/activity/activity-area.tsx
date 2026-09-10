import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { PhoneIncoming, PhoneOutgoing, Timer, Wifi } from 'lucide-react';
import ActivityTimeStrips from './activity-strips';
import { USER_ACTIVITY_CONST, Activity } from './constant';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-mcm-line bg-white dark:bg-mcm-surface p-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(194,98,15,0.08)] hover:border-orange-100">
    <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-orange-50 text-primary">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-xl font-bold text-gray-900 dark:text-mcm-ink leading-none">{value}</div>
      <div className="text-[11px] font-medium text-gray-500 dark:text-mcm-ink-3 mt-1 truncate">{label}</div>
    </div>
  </div>
);

const ActivityArea = ({ range, duration, timings, activityType }: any) => {
  const { userActivitiesList } = useSocketEvents();
  const { user } = useUser();
  const timezone = user?.settings?.operational_hours?.regional?.timezone?.value || 'Asia/Kolkata';
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

  /* A quick-glance summary above the hour-by-hour strips below — pairs
     each call_start with the next call_end (chronologically, across the
     whole visible range rather than hour-by-hour) to total up talk time,
     the one number the timeline itself never shows directly. */
  const summaryStats = useMemo(() => {
    const visibleDateKeys = new Set(dates?.map((d: any) => moment(d.date).format('DD-MM-YYYY')));
    const allActivities: Activity[] = (userActivitiesList?.data || []).flatMap(
      (entry: any) => entry?.activity || [],
    );
    const relevant = allActivities
      .filter((item) => visibleDateKeys.has(moment.parseZone(item?.timestamp).format('DD-MM-YYYY')))
      .sort((a, b) => moment.parseZone(a?.timestamp).valueOf() - moment.parseZone(b?.timestamp).valueOf());

    let inbound = 0;
    let outbound = 0;
    let onlineSessions = 0;
    let talkTimeMin = 0;
    let openCallStart: Activity | null = null;

    relevant.forEach((item) => {
      if (item?.activity === USER_ACTIVITY_CONST?.CALL_STARTS) {
        if (item?.data?.Direction === 'initiator') outbound += 1;
        else inbound += 1;
        openCallStart = item;
      } else if (item?.activity === USER_ACTIVITY_CONST?.CALL_END && openCallStart) {
        talkTimeMin += moment
          .parseZone(item?.timestamp)
          .diff(moment.parseZone(openCallStart?.timestamp), 'minutes');
        openCallStart = null;
      } else if (item?.activity === USER_ACTIVITY_CONST?.ONLINE) {
        onlineSessions += 1;
      }
    });

    return { inbound, outbound, talkTimeMin, onlineSessions };
  }, [userActivitiesList, dates]);

  const agentName =
    user?.user_info?.name ||
    `${user?.first_name || user?.user_info?.first_name || ''} ${user?.last_name || user?.user_info?.last_name || ''}`.trim() ||
    'Agent';

  return (
    <div className="w-full p-1 rounded">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard icon={<PhoneIncoming className="w-5 h-5" />} label="Inbound calls" value={summaryStats.inbound} />
        <StatCard icon={<PhoneOutgoing className="w-5 h-5" />} label="Outbound calls" value={summaryStats.outbound} />
        <StatCard icon={<Timer className="w-5 h-5" />} label="Talk time" value={`${summaryStats.talkTimeMin}m`} />
        <StatCard icon={<Wifi className="w-5 h-5" />} label="Sessions" value={summaryStats.onlineSessions} />
      </div>
      <p className="text-gray-500 dark:text-mcm-ink-3 text-xs font-medium mb-3 px-1 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        Timezone — {timezone}
      </p>
      {sortedDates?.map((date) => (
        <ActivityTimeStrips
          key={date?.id}
          activityDetails={date}
          timings={timings}
          activities={userActivitiesList?.data || []}
          activityType={activityType}
          expandedItem={expandedItem}
          setExpandedItem={setExpandedItem}
          agentName={agentName}
        />
      ))}
    </div>
  );
};

export default React.memo(ActivityArea);
