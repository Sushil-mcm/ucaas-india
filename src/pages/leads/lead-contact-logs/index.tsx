import AllLeadsList from '@/pages/leads/all-leads-list';
import AllNewContactsList from '@/pages/new-contact/all-contacts-list';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CONTACT_TABS_CONST, LEAD_TABS_CONST } from '../const';

type LeadContactLogsProps = {
  groupData?: any;
  embedded?: boolean;
  onBack?: () => void;
  setDrawerState?: any;
  setShowDeleteConfirmation?: (contact: any) => void;
  contextType?: 'new-contact' | 'leads';
};

function LeadContactLogs({
  groupData,
  embedded = false,
  onBack,
  setDrawerState,
  setShowDeleteConfirmation,
  contextType,
}: LeadContactLogsProps) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { data: routeData, from } = state || {};
  const data = groupData || routeData;

  const resolvedContext: 'new-contact' | 'leads' =
    contextType || (from === 'new-contact' ? 'new-contact' : 'leads');

  const isLeadList = resolvedContext === 'leads';
  const groupName = data?.groupName || data?.name || '';
  const safeSetDrawerState = setDrawerState || (() => {});
  const safeSetShowDeleteConfirmation = setShowDeleteConfirmation || (() => {});
  const payloadExtraParams: any = {
    groupId: data?._id,
    isLeadList,
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (resolvedContext === 'new-contact') {
      navigate('/contact', {
        state: { defaultTab: CONTACT_TABS_CONST.CONTACT_GROUP_LIST },
      });
      return;
    }

    navigate('/campaign/leads', { state: { defaultTab: LEAD_TABS_CONST.LEAD_GROUP_LIST } });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-gray-200/15">
      {!embedded && (
        <div className="flex min-h-[65px] w-full items-center justify-between border-b bg-white px-3 sm:px-4">
          <div className="cursor-pointer" onClick={handleBack}>
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 shrink-0" />
              <h3 className="font-semibold text-gray-900 break-words">
                {isLeadList ? 'Leads' : 'Contact'} - ({groupName})
              </h3>
            </div>
          </div>
        </div>
      )}

      <div className="flex w-full min-h-0 flex-1 flex-col gap-2">
        {resolvedContext === 'new-contact' ? (
          <AllNewContactsList
            setDrawerState={safeSetDrawerState}
            setShowDeleteConfirmation={safeSetShowDeleteConfirmation}
            payloadExtraParams={payloadExtraParams}
            actionMode="edit-delete"
          />
        ) : (
          <AllLeadsList
            setDrawerState={safeSetDrawerState}
            setShowDeleteConfirmation={safeSetShowDeleteConfirmation}
            setSelectedLeads={() => void 0}
            payloadExtraParams={payloadExtraParams}
            actionMode="edit-delete"
          />
        )}
      </div>
    </div>
  );
}

export default LeadContactLogs;
