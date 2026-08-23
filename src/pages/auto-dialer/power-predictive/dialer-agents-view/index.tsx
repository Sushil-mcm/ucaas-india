import {
  CallDropped,
  CallForward,
  CallIncoming,
  CheckMarkIcon,
  ChevronIcon,
  Graph,
  Leads,
  PhoneCalling,
} from '@/assets/icons';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { FC, useState } from 'react';

interface IAutoDialer {
  createdAt: string;
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  campaignStatus: string;
  totalCount: number;
  passed: number;
  failed: number;
  _id: any;
}

interface IDialerAgentProps {
  selectedCampaign: IAutoDialer | null;
  setSelectedCampaign: (state: IAutoDialer | null) => void;
}

const DialerAgentList: FC<IDialerAgentProps> = ({ setSelectedCampaign, selectedCampaign }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const columns = [
    {
      header: 'AGENT',
      accessorKey: 'agent',
    },
    {
      header: 'STATUS',
      accessorKey: 'status',
    },
    {
      header: 'TIME IN STATUS',
      accessorKey: 'phone',
    },
    {
      header: 'CALLS HANDLED',
      accessorKey: 'caller_id',
    },
    {
      header: 'AVERAGE HANDLE TIME',
      accessorKey: 'extension',
    },
    {
      header: 'ACTIONS',
      accessorKey: 'action',
    },
  ];

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh_-_8.8rem)] overflow-auto">
      <div className="flex items-center justify-between">
        <h5 className="text-gray-900 flex items-center gap-1.5 font-semibold">
          Campaign Monitoring
        </h5>
        <Button type="button" variant={'outline'} onClick={() => setSelectedCampaign(null)}>
          <ChevronIcon className="w-5 h-5 rotate-90" /> Back
        </Button>
      </div>
      <div className="border border-gray-200 rounded-xl py-3 px-2">
        <div className="flex flex-wrap gap-y-2.5">
          <div className="w-1/3 px-1.5">
            <div className="flex justify-between border border-primary rounded-xl w-full p-3 gap-1 bg-white">
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 truncate text-sm">Calls Ringing</p>
                <h2 className="text-gray-800 truncate text-2xl font-semibold">0</h2>
              </div>
              <div className="flex items-center justify-center rounded-xl w-8 h-8 bg-gray-100 text-primary">
                <PhoneCalling className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="w-1/3 px-1.5">
            <div className="flex justify-between border border-primary rounded-xl w-full p-3 gap-1 bg-white">
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 truncate text-sm">Calls Connected</p>
                <h2 className="text-gray-800 truncate text-2xl font-semibold">0</h2>
              </div>
              <div className="flex items-center justify-center rounded-xl w-8 h-8 bg-gray-100 text-primary">
                <CheckMarkIcon className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="w-1/3 px-1.5">
            <div className="flex justify-between border border-primary rounded-xl w-full p-3 gap-1 bg-white">
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 truncate text-sm">Calls Transferred</p>
                <h2 className="text-gray-800 truncate text-2xl font-semibold">0</h2>
              </div>
              <div className="flex items-center justify-center rounded-xl w-8 h-8 bg-gray-100 text-primary">
                <CallForward className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="w-1/3 px-1.5">
            <div className="flex justify-between border border-primary rounded-xl w-full p-3 gap-1 bg-white">
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 truncate text-sm">Calls in IVR</p>
                <h2 className="text-gray-800 truncate text-2xl font-semibold">0</h2>
              </div>
              <div className="flex items-center justify-center rounded-xl w-8 h-8 bg-gray-100 text-primary">
                <Graph className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="w-1/3 px-1.5">
            <div className="flex justify-between border border-primary rounded-xl w-full p-3 gap-1 bg-white">
              <div className="flex flex-col ">
                <p className="font-semibold text-gray-900 truncate text-sm">Inbound Calls</p>
                <h2 className="text-gray-800 truncate text-2xl font-semibold">0</h2>
              </div>
              <div className="flex items-center justify-center rounded-xl w-8 h-8 bg-gray-100 text-primary">
                <CallIncoming className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="w-1/3 px-1.5">
            <div className="flex justify-between border border-primary rounded-xl w-full p-3 gap-1 bg-white">
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 truncate text-sm">VM Dropped</p>
                <h2 className="text-gray-800 truncate text-2xl font-semibold">0</h2>
              </div>
              <div className="flex items-center justify-center rounded-xl w-8 h-8 bg-gray-100 text-primary">
                <CallDropped className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="w-1/3 px-1.5">
            <div className="flex justify-between border border-primary rounded-xl w-full p-3 gap-1 bg-white">
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 truncate text-sm">ACD</p>
                <h2 className="text-gray-800 truncate text-2xl font-semibold">0</h2>
              </div>
              <div className="flex items-center justify-center rounded-xl w-8 h-8 bg-gray-100 text-primary">
                <Leads className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="w-1/3 px-1.5">
            <div className="flex justify-between border border-primary rounded-xl w-full p-3 gap-1 bg-white">
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 truncate text-sm">ASR</p>
                <h2 className="text-gray-800 truncate text-2xl font-semibold">0</h2>
              </div>
              <div className="flex items-center justify-center rounded-xl w-8 h-8 bg-gray-100 text-primary">
                <CallDropped className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`cursor-pointer transition-all duration-300 `}>
        <div onClick={() => setIsCollapsed((prev) => !prev)}>
          <h5 className={`text-gray-900 flex items-center gap-1.5 font-semibold mt-2`}>
            {selectedCampaign?.name}
          </h5>
        </div>
      </div>
      {/* Inner content */}
      {isCollapsed && (
        <TableManager
          {...{
            columns,
          }}
        />
      )}
      {/* Inner content */}
    </div>
  );
};

export default DialerAgentList;
