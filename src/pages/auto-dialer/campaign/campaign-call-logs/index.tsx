import CampaignCallLogList from './call-log-list';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

function CampaignCallLogs() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { data, type } = state || {};

  const campaignUuid = data?._id || data?.campaign_uuid || '';
  /* The Answered count on the campaign list opens this page, and it must land
     on the leads it counted rather than on the whole list. "connected" is the
     server's own name for systemDisposition === ANSWERED, the same test the
     count is made with. */
  const answeredOnly = String(type || '').toUpperCase() === 'ANSWERED';

  const payloadExtraParams = {
    filters: [
      ...(campaignUuid ? [{ key: 'campaign_uuid', value: campaignUuid }] : []),
      ...(answeredOnly ? [{ key: 'connected', value: true }] : []),
    ],
  };

  return (
    <div className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden h-full">
      <div className="w-full px-3 bg-white flex items-center justify-between border-b min-h-[65px]">
        <div className="cursor-pointer" onClick={() => navigate(-1)}>
          <div className="flex gap-2 items-center">
            <ArrowLeft className="w-6 h-5" />
            <h3 className="font-semibold text-gray-900">
            {answeredOnly ? 'Answered leads' : 'Leads'} - ({data?.name || ''})
          </h3>
          </div>
        </div>
      </div>

      {/* The list and its Skill match filter; the filters above go through
          as they are. */}
      <CampaignCallLogList payloadExtraParams={payloadExtraParams} />
    </div>
  );
}

export default CampaignCallLogs;
