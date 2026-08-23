import React, { useCallback, useMemo } from 'react';
import { useEffect, useState } from 'react';
import { ReportsPageLayout } from '../../reports-content-layout';
import { useParams } from 'react-router-dom';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import ReactDatePicker from 'react-datepicker';
import {
  ActivityAreaProps,
  activityTypes,
  generateTimings,
  roundToNextHour,
  TimePickerProps,
  USER_ACTIVITY_CONST,
  userActivityDateInitialVal,
} from './constatnts';
import CustomSelect from '@/components/custom/custom-select';
import { useSocketEvents } from '@/hooks/use-socket-events';
import DateDropdown from '@/components/custom/date-dropdown';
import { useUser } from '@/hooks/use-user';
import Loader from '@/components/custom/loader';
import ActivityArea from '@/pages/activity/activity-area';

const todayDate = moment().format('YYYY-MM-DD');
const ActivityCallLogs = () => {
  const { id } = useParams();
  const { userActivity, activityLoader } = useSocketEvents();
  const { user } = useUser();
  const timezone = user?.settings?.operational_hours?.regional?.timezone?.value || 'America/Denver';
  function getDate(date = new Date()) {
    return new Date(new Date(date)?.toLocaleString('en-US', { timeZone: timezone }));
  }
  const startOfDay = getDate();
  startOfDay?.setHours(0, 0, 0, 0);
  const currentTime = roundToNextHour(getDate());
  const [startTime, setStartTime] = useState(startOfDay);
  const [endTime, setEndTime] = useState(currentTime);
  const [activityType, setActivityType] = useState(activityTypes[0]);
  const [dropdownVal, setDropdownVal] = useState(userActivityDateInitialVal);
  const { date_type = USER_ACTIVITY_CONST.TODAY, value = { from: todayDate, to: todayDate } } =
    dropdownVal || {};

  const sTime = useMemo(() => moment(startTime)?.format('hh:mm A'), [startTime]);
  const eTime = useMemo(() => moment(endTime)?.format('hh:mm A'), [endTime]);

  const [activityAreaProps, setActivityAreaProps] = useState<ActivityAreaProps | any>({
    duration: date_type,
    range: { startDate: undefined, endDate: undefined },
    timings: generateTimings(startOfDay, currentTime),
    activityType: activityTypes[0],
  });

  const handleApply = useCallback(() => {
    const newProps = {
      range: { startDate: value?.from, endDate: value?.to },
      duration: date_type,
      timings: generateTimings(startTime, endTime),
      activityType,
    };
    setActivityAreaProps(newProps);
    userActivity({
      ...newProps,
      startTime: sTime,
      endTime: eTime,
      startDate: value?.from,
      endDate: value?.to,
      userId: id,
    });
  }, [value?.from, value?.to, date_type, startTime, endTime, activityType, sTime, eTime, id]);

  useEffect(() => {
    setActivityAreaProps({
      range: { startDate: value?.from, endDate: value?.to },
      duration: date_type,
      timings: generateTimings(startTime, endTime),
      activityType: activityTypes?.[0],
    });
  }, []);

  useEffect(() => {
    if (id) {
      handleApply();
    }
  }, [id]);

  useEffect(() => {
    if (!id && userActivity) {
      handleApply();
    }
  }, [userActivity]);

  const Filters = (
    <div className="flex items-center gap-2 filters">
      <div className="flex gap-1">
        <DateDropdown
          {...{
            dropdownVal,
            setDropdownVal,
          }}
        />
      </div>
      <div className="flex min-w-28 gap-1 max-h-9 h-9">
        <TimePicker
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
        />
      </div>
      <div className="flex w-32 gap-1">
        <CustomSelect
          label=""
          options={activityTypes}
          handleChange={(value) => {
            setActivityType(value);
          }}
          value={activityType}
          placeholder={'Select Type'}
        />
      </div>
      <Button
        className="min-h-9 w-auto! "
        variant={'outline'}
        type="button"
        onClick={handleApply}
        disabled={activityLoader}
      >
        {activityLoader ? <Loader variant="blue" /> : 'Submit'}
      </Button>
    </div>
  );

  return (
    <ReportsPageLayout filters={Filters}>
      <div className="p-3 pb-0 overflow-auto max-h-[calc(100vh-130px)] ">
        {activityLoader ? (
          <div className="flex justify-center">
            <Loader variant="blue" size="sm" />
          </div>
        ) : (
          <ActivityArea
            range={activityAreaProps?.range}
            duration={activityAreaProps?.duration}
            timings={activityAreaProps?.timings}
            activityType={activityAreaProps?.activityType}
          />
        )}
      </div>
    </ReportsPageLayout>
  );
};

export default ActivityCallLogs;

const TimePicker: React.FC<TimePickerProps> = ({
  startTime,
  endTime,
  setStartTime,
  setEndTime,
}) => {
  const maxTime = new Date();
  maxTime?.setHours(23, 45, 0, 0);

  return (
    <div className="flex w-full gap-2 items-center">
      <div className="relative w-28">
        <ReactDatePicker
          selected={startTime}
          onChange={(date) => setStartTime(date as Date)}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={60}
          timeCaption="Time"
          dateFormat="h:mm aa"
          className="w-full px-2 py-2 min-h-10 border border-gray-200 rounded-xl hover:border-primary focus:outline-none focus:ring-1 focus:ring-ucass-active focus:border-transparent text-sm"
        />
      </div>
      <span className="">-</span>
      <div className="relative w-28">
        <ReactDatePicker
          selected={endTime}
          onChange={(date) => setEndTime(date as Date)}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={60}
          timeCaption="Time"
          dateFormat="h:mm aa"
          minTime={startTime}
          maxTime={maxTime}
          className="w-full px-2 py-2  min-h-10 border border-gray-200 rounded-xl hover:border-primary focus:outline-none focus:ring-1 focus:ring-ucass-active focus:border-transparent text-sm"
        />
      </div>
    </div>
  );
};
