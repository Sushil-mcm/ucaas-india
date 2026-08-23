import React, { useCallback, useMemo } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import ActivityArea from '../activity/activity-area';
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
} from './constant';
import CustomSelect from '@/components/custom/custom-select';
import { useSocketEvents } from '@/hooks/use-socket-events';
import DateDropdown from '@/components/custom/date-dropdown';
import { useUser } from '@/hooks/use-user';
import Loader from '@/components/custom/loader';
import '@/components/mcm/mcm-page.css';

const todayDate = moment().format('YYYY-MM-DD');
const UserActivity = () => {
  const { id } = useParams();
  const { userActivity, activityLoader } = useSocketEvents();
  const { user } = useUser();
  const timezone = user?.settings?.operational_hours?.regional?.timezone?.value || 'America/Denver';
  function getDate(date = new Date()) {
    return new Date(new Date(date)?.toLocaleString('en-US', { timeZone: timezone }));
  }
  const naviagte = useNavigate();
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

  return (
    <section className="mcm-page mcm-admin">
      <div className="w-full h-full overflow-x-auto overflow-y-hidden">
        <div className="flex-col sm:flex-row flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">Activity</p>
          <div className="sm:flex sm:items-center gap-2 filters xs:grid xs:grid-cols-2 ">
            <div className="flex gap-1">
              <DateDropdown
                {...{
                  dropdownVal,
                  setDropdownVal,
                }}
              />
            </div>
            <div className="flex min-w-28 gap-1">
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
            <div className="flex gap-2">
              <Button
                className="min-h-9 min-w-20"
                variant={'outline'}
                type="button"
                onClick={handleApply}
                disabled={activityLoader}
              >
                {activityLoader ? <Loader variant="blue" /> : 'Submit'}
              </Button>
              <Button
                className="min-h-9"
                variant={'outline'}
                type="button"
                onClick={() => naviagte(-1)}
              >
                Back
              </Button>
            </div>
          </div>
        </div>

        <div className="sm:p-4 xs:p-0 overflow-auto max-h-[calc(100vh-130px)] pb-0">
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

        {/* <ActivityFooter /> */}
      </div>
    </section>
  );
};

export default UserActivity;

// const ActivityFooter = () => {
//   const isExpanded = false;

//   return (
//     <div
//       className={`fixed bottom-0 ${
//         isExpanded ? 'left-[164px]' : 'left-[80px]'
//       } w-full h-[50px] bg-gray-100 border-t border-gray-400 px-[20px] flex items-center gap-[20px]`}
//     >
//       {activitySummaryArray.map((activity) => (
//         <div key={activity.id} className="flex items-center gap-[5px]">
//           {activity.icon}
//           <span className="text-sm font-medium text-gray-900">
//             {activity.value} {activity.label}
//           </span>
//         </div>
//       ))}
//     </div>
//   );
// };

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
