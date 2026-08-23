import { useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import moment from 'moment';
import { Icon } from '@/assets/icons/icon';
import { handleDate } from './constant';
import CustomSelect from '../custom-select';
import { Button } from '@/components/ui/button';
import useMediaQuery from '@/hooks/use-media-query';

const DateDropdown = ({
  dropdownVal,
  setDropdownVal = () => {},
  customPickerPlacement = 'inline',
}: any) => {
  const isCompact = useMediaQuery('(max-width: 767px)');
  const showCustomPickerBelow = customPickerPlacement === 'bottom';
  const [dateRange, setDateRange] = useState<any>({
    from: moment().format('YYYY-MM-DD'),
    to: moment().format('YYYY-MM-DD'),
  });

  const [timeRange, setTimeRange] = useState({
    from: '',
    to: '',
  });

  const { dateOptions = [], date_type = '' } = dropdownVal;

  const updateDateState = (value: any) => {
    setDropdownVal((prev: any) => ({
      ...prev,
      date_type: value,
      value: ['Custom', 'Custom Date/Time'].includes(value) ? prev.value : handleDate(value),
    }));
    if (value === 'Custom Date/Time') {
      setDateRange((prev: any) => ({
        ...prev,
        from: moment().format('YYYY-MM-DD'),
        to: moment().format('YYYY-MM-DD'),
      }));
      setTimeRange((prev) => ({ ...prev, from: '', to: '' }));
    }
  };

  const isValidTime = (time: any) => {
    return moment(time, 'HH:mm', true).isValid();
  };

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="w-full min-w-0 sm:w-40 lg:w-44">
        <CustomSelect
          options={dateOptions.map(({ label, value }: any) => ({ label, value }))}
          value={dateOptions?.find((opt: any) => opt.value === date_type) || null}
          handleChange={(selectedOption) => {
            updateDateState(selectedOption?.value);
          }}
        />
      </div>
      {date_type && date_type === 'Custom' ? (
        <div
          className={
            showCustomPickerBelow
              ? 'absolute right-0 top-full z-50 mt-2 flex w-72 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg'
              : 'flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap'
          }
        >
          <div
            className={
              showCustomPickerBelow ? 'min-w-0 flex-1' : 'min-w-0 flex-1 sm:w-56 sm:flex-none'
            }
          >
            <div className="relative flex min-w-0 items-center">
              <ReactDatePicker
                placeholderText="Select date"
                selectsRange={true}
                onChange={(dates) => {
                  const [from, to] = dates;
                  setDateRange((prev: any) => ({ ...prev, from, to }));
                }}
                startDate={dateRange.from ? new Date(dateRange.from) : undefined}
                endDate={dateRange.to ? new Date(dateRange.to) : undefined}
                monthsShown={isCompact ? 1 : 2}
                className="h-9 min-h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm shadow-none hover:border-primary focus:border-primary focus:outline-none"
                showMonthDropdown
                showYearDropdown
                peekNextMonth
                dropdownMode="select"
                dateFormat="yyyy-MM-dd"
                maxDate={moment().toDate()}
                popperPlacement={showCustomPickerBelow ? 'bottom-end' : undefined}
              />
              <div
                className="flex items-center justify-center cursor-pointer absolute rounded right-2 bg-transparent"
                onClick={() => setDateRange((prev: any) => ({ ...prev, from: '', to: '' }))}
              >
                <Icon
                  name="CloseIcon"
                  className="w-4 h-4 bg-gray-500 hover:bg-gray-500/80 rounded-full text-white p-1"
                />
              </div>
            </div>
          </div>
          <div>
            <Button
              variant={'outline'}
              disabled={!dateRange?.to}
              className="h-9 min-h-9 max-h-9 shrink-0 rounded-lg px-3 py-0"
              onClick={() =>
                setDropdownVal((prev: any) => ({
                  ...prev,
                  value: handleDate(date_type, dateRange),
                }))
              }
            >
              Apply
            </Button>
          </div>
        </div>
      ) : date_type && date_type === 'Custom Date/Time' ? (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
            <ReactDatePicker
              placeholderText="Select time"
              selected={dateRange.from ? new Date(dateRange.from) : undefined}
              onChange={(date) => {
                setDateRange((prev: any) => ({
                  ...prev,
                  from: date,
                  to: date,
                }));
              }}
              className="h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-none hover:border-primary focus:border-primary focus:outline-none"
              showMonthDropdown
              showYearDropdown
              peekNextMonth
              dropdownMode="select"
              dateFormat="yyyy-MM-dd"
              maxDate={moment().toDate()}
            />
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-none">
            <ReactDatePicker
              placeholderText="Start"
              selected={
                isValidTime(timeRange.from) ? moment(timeRange.from, 'HH:mm').toDate() : null
              }
              onChange={(time) => {
                const formattedStartTime = moment(time).format('HH:mm');
                const newEndTime = moment(time).add(15, 'minutes').format('HH:mm');
                setTimeRange((prev) => ({
                  ...prev,
                  from: formattedStartTime,
                  to: newEndTime,
                }));
              }}
              className="h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-none hover:border-primary focus:border-primary focus:outline-none"
              showTimeSelect
              showTimeSelectOnly
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Start Time"
              dateFormat="HH:mm"
            />
            <ReactDatePicker
              placeholderText="End"
              selected={isValidTime(timeRange.to) ? moment(timeRange.to, 'HH:mm').toDate() : null}
              onChange={(time) => {
                setTimeRange((prev) => ({
                  ...prev,
                  to: moment(time).format('HH:mm'),
                }));
              }}
              className="h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-none hover:border-primary focus:border-primary focus:outline-none"
              showTimeSelect
              showTimeSelectOnly
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="End Time"
              minTime={
                timeRange.from
                  ? moment(timeRange.from, 'HH:mm').add(1, 'minute').toDate()
                  : undefined
              }
              maxTime={
                timeRange.from
                  ? moment(timeRange.from, 'HH:mm').hours(23).minutes(59).toDate()
                  : undefined
              }
              dateFormat="HH:mm"
              disabled={!timeRange.from}
            />
          </div>

          <Button
            variant={'outline'}
            className="h-9 min-h-9 max-h-9 shrink-0 rounded-lg px-3 py-0"
            disabled={
              !dateRange.from ||
              !timeRange.from ||
              !timeRange.to ||
              [timeRange.from, timeRange.to].includes('Invalid date')
            }
            onClick={() =>
              setDropdownVal((prev: any) => ({
                ...prev,
                value: handleDate(date_type, dateRange, timeRange),
              }))
            }
          >
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default DateDropdown;
