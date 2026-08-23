import ActivityList from '@/components/activity-list/activity-list';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

function CampaignCallLogs() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { data } = state || {};

  const campaignUuid = data?._id || data?.campaign_uuid || '';

  const payloadExtraParams = {
    filters: [...(campaignUuid ? [{ key: 'campaign_uuid', value: campaignUuid }] : [])],
  };

  return (
    <div className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden h-full">
      <div className="w-full px-3 bg-white flex items-center justify-between border-b min-h-[65px]">
        <div className="cursor-pointer" onClick={() => navigate(-1)}>
          <div className="flex gap-2 items-center">
            <ArrowLeft className="w-6 h-5" />
            <h3 className="font-semibold text-gray-900">Leads - ({data?.name || ''})</h3>
          </div>
        </div>
      </div>

      <ActivityList
        payloadExtraParams={payloadExtraParams}
        activityType="campaignLogs"
        contactId=""
        notesOnlyAction
        showActions={true}
        emptyPlaceholder="No campaign logs found"
        description="Campaign activity will appear here once campaigns start running."
      />
    </div>
  );
}

export default CampaignCallLogs;
