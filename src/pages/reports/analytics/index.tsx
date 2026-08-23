import { Hourglass, MoveDownLeft, MoveUpRight } from 'lucide-react';
import ReportsPageLayout from '../reports-content-layout';
import { InfoIcon, NotificationLine } from '@/assets/icons';
import { Switch } from '@/components/ui/switch';
import { Pie, PieChart, PieProps, Tooltip } from 'recharts';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
// import CustomSelect from '@/components/custom/custom-select';
import { useState } from 'react';
import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialValForCustom } from '@/components/custom/date-dropdown/constant';
import { useQuery } from '@tanstack/react-query';
import { callLogAnalyticsData } from '@/services/api';

// const data = [
//   {
//     name: 'Jan',
//     Incoming: 4000,
//     Outgoing: 2400,
//     Missed: 2400,
//   },
//   {
//     name: 'Feb',
//     Incoming: 3000,
//     Outgoing: 1398,
//     Missed: 2210,
//   },
//   {
//     name: 'Mar',
//     Incoming: 2000,
//     Outgoing: 9800,
//     Missed: 2290,
//   },
//   {
//     name: 'Apr',
//     Incoming: 2780,
//     Outgoing: 3908,
//     Missed: 2000,
//   },
//   {
//     name: 'May',
//     Incoming: 1890,
//     Outgoing: 4800,
//     Missed: 2181,
//   },
//   {
//     name: 'Jun',
//     Incoming: 1890,
//     Outgoing: 4800,
//     Missed: 2181,
//   },
// ];

const GAP = 120;
const HalfPie = (props: PieProps & { percentage: number }) => {
  const chartData = [
    { value: props?.percentage, fill: '#000000' },
    { value: 100 - props?.percentage, fill: '#D3D3D3' },
  ];
  return (
    <Pie
      {...props}
      stroke="none"
      dataKey="value"
      data={chartData}
      cx={100}
      cy={100}
      cornerRadius={3} // rounded arc
      paddingAngle={0}
      innerRadius={55}
      outerRadius={70}
      startAngle={180 + GAP / 2} // 240
      endAngle={0 - GAP / 2} // -60
    />
  );
};

const CallAnalytics = () => {
  // const [selectedFilter, setSelectedFilter] = useState<any>({ label: 'Today Calls', value: '1' });
  const [dropdownVal, setDropdownVal] = useState(dropdownCallInitialValForCustom);

  const getPayload = () => {
    const type = dropdownVal?.date_type;
    if (type === 'Yesterday' || type === 'Today') {
      return { type: 'day', date: dropdownVal?.value?.from };
    } else if (type === 'Last 7 Days') {
      return { type: 'week' };
    } else if (type === 'Last 30 Days' || type === 'This Month' || type === 'Last Month') {
      return { type: 'month' };
    } else {
      return { type: 'custom', from: dropdownVal?.value?.from, to: dropdownVal?.value?.to };
    }
  };

  const { data } = useQuery({
    queryKey: [
      'callLogAnalyticsData',
      dropdownVal?.date_type,
      dropdownVal?.value?.from,
      dropdownVal?.value?.to,
    ],
    queryFn: () => callLogAnalyticsData(getPayload()),
    select: (data) => data?.data?.data?.result || {},
  });

  console.log(dropdownVal, 'dropdownVal');

  const Filters = (
    <div className="flex gap-2 ">
      <DateDropdown
        {...{
          dropdownVal,
          setDropdownVal,
        }}
      />
    </div>
  );

  return (
    <ReportsPageLayout filters={Filters}>
      <div className="w-full  p-3 flex flex-col gap-3 overflow-y-auto">
        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-6 xl:grid-cols-7">
          <div className="flex h-full w-full flex-col justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 lg:col-span-2 xl:col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium text-sm">Service</span>
              <span className="text-gray-500">
                <InfoIcon className="w-4" />
              </span>
            </div>
            <div className="w-full">
              <div className="relative  ">
                {/* Center text */}
                <div className="text-gray-900 absolute top-[55%] left-[52%] text-xl font-medium -translate-x-[50%] -translate-y-[50%]">
                  {data?.summary?.serviceLevel || 0}%
                </div>
                <PieChart width={200} height={200} style={{ margin: '0 auto' }}>
                  <HalfPie isAnimationActive={true} percentage={data?.summary?.serviceLevel || 0} />
                  <Tooltip defaultIndex={0} content={() => null} active />
                </PieChart>
              </div>
            </div>
            <div className="flex gap-2 items-center justify-between ">
              <span className="text-gray-900 font-medium text-sm ">Processed calls</span>
              <Switch defaultChecked />
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-4 xl:col-span-5">
            <div className="w-full bg-white border border-gray-200 p-3 rounded-md flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <span className="rounded-sm w-12 h-12 bg-ucass-primary-200 flex items-center text-primary justify-center">
                  <MoveDownLeft className="w-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-900">Incoming ACD</p>
                  <p className="text-sm text-gray-500">{data?.summary?.incomingACD || 0}</p>
                </div>
              </div>
              <span className="rounded-full px-3 py-1.5 bg-gray-100 flex items-center gap-1 text-gray-700  text-xs">
                <span className="text-gray-900 font-medium ">Max:</span>2 hr 12 min 55 s
              </span>
            </div>
            <div className="w-full bg-white border border-gray-200 p-3 rounded-md flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <span className="rounded-sm w-12 h-12 bg-ucass-primary-200 flex items-center text-primary justify-center">
                  <MoveUpRight className="w-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-900">Outgoing ACD</p>
                  <p className="text-sm text-gray-500">{data?.summary?.outgoingACD || 0}</p>
                </div>
              </div>
              <span className="rounded-full px-3 py-1.5 bg-gray-100 flex items-center gap-1 text-gray-700  text-xs">
                <span className="text-gray-900 font-medium ">Max:</span>2 hr 12 min 55 s
              </span>
            </div>
            <div className="w-full bg-white border border-gray-200 p-3 rounded-md flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <span className="rounded-sm w-12 h-12 bg-ucass-primary-200 flex items-center text-primary justify-center">
                  <Hourglass className="w-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-900">Wait time</p>
                  <p className="text-sm text-gray-500">34 s</p>
                </div>
              </div>
              <span className="rounded-full px-3 py-1.5 bg-gray-100 flex items-center gap-1 text-gray-700  text-xs">
                <span className="text-gray-900 font-medium ">Max:</span>7 min 55 s
              </span>
            </div>
            <div className="w-full bg-white border border-gray-200 p-3 rounded-md flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <span className="rounded-sm w-12 h-12 bg-ucass-primary-200 flex items-center text-primary justify-center">
                  <NotificationLine className="w-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-900">Avg. Processing time</p>
                  <p className="text-sm text-gray-500">{data?.summary?.avgProcessingTime || 0}</p>
                </div>
              </div>
              <span className="rounded-full px-3 py-1.5 bg-gray-100 flex items-center gap-1 text-gray-700  text-xs">
                <span className="text-gray-900 font-medium ">Max:</span>13h 40 min 55 s
              </span>
            </div>
          </div>
        </div>
        <div className="w-full h-auto bg-white border border-gray-200 p-3 rounded-md  ">
          {/* <div className="flex items-center justify-end gap-2 border-b border-gray-200 pb-2 mb-2">
            <CustomSelect
              value={selectedFilter}
              options={[
                { label: 'Today Calls', value: '1' },
                { label: 'Yesterday Calls', value: '2' },
              ]}
              className="max-w-52"
              handleChange={(e: any) => setSelectedFilter(e)}

            />
            <div className="flex items-center bg-gray-100 px-2 py-1 rounded-md gap-2.5">
              <span className="text-gray-900 cursor-pointer text-sm bg-white px-2 py-1 rounded-md">
                Month
              </span>
              <span className="text-gray-500 cursor-pointer text-sm  px-2 py-1">Week</span>
              <span className="text-gray-500 cursor-pointer text-sm  px-2 py-1">Day</span>
            </div>
          </div> */}
          <div className="w-full ">
            <ResponsiveContainer width="100%" aspect={3.5}>
              <LineChart
                data={data?.chartData || []}
                margin={{
                  top: 5,
                  right: 0,
                  left: 0,
                  bottom: 5,
                }}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />

                <Line type="monotone" dataKey="Outgoing" stroke="#007BFF" />
                <Line type="monotone" dataKey="Incoming" stroke="#00BB4B" />
                <Line type="monotone" dataKey="Missed" stroke="#ff0000" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ReportsPageLayout>
  );
};

export default CallAnalytics;
