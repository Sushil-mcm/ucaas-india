import TableManager from '@/components/custom/table-manager';
import { campaignUserList } from '@/services/api';
import { ArrowLeft } from 'lucide-react';
import { FC } from 'react';

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

interface ICampaignContactProps {
  selectedCampaign: IAutoDialer;
  setSelectedCampaign: (state: IAutoDialer | null) => void;
}

const CampaignConatctsList: FC<ICampaignContactProps> = ({
  selectedCampaign,
  setSelectedCampaign,
}) => {
  const columns = [
    {
      header: 'Name',
      accessorKey: 'contactName',
    },
    {
      header: 'Email',
      accessorKey: 'contactEmail',
    },
    {
      header: 'Phone',
      accessorKey: 'contactNumber',
    },
    {
      header: 'Status',
      accessorKey: 'requestStatus',
    },
  ];

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh_-_7.8rem)] overflow-auto">
      <div className="w-full px-3 bg-white flex items-center justify-between border-b min-h-[65px]">
        <div className="cursor-pointer" onClick={() => setSelectedCampaign(null)}>
          <div className="flex gap-2 items-center">
            <ArrowLeft className="w-6 h-5" />
            <h3 className="font-semibold text-gray-900">
              Campaign <span className="font-normal">{selectedCampaign?.name}</span>
            </h3>
          </div>
        </div>
      </div>
      {/* <Table columns={columns} data={data} isInfo={true} /> */}
      <div className="w-full flex flex-col gap-2 p-3 pt-0">
        <TableManager
          {...{
            columns,
            fetcherKey: 'getcampaignUserList',
            fetcherFn: campaignUserList,
            extraParams: { campaignId: selectedCampaign?._id },
          }}
        />
      </div>
    </div>
  );
};

export default CampaignConatctsList;
