import ActivityList from '@/components/activity-list/activity-list';
import CustomSelect from '@/components/custom/custom-select';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { dropdownList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { campaignTypeOptions } from '../campaign/const';

const CampaignLogs = () => {
  const [campaignType, setCampaignType] = useState<ISELECTVALUE>();
  const [campaign, setCampaign] = useState<any>();
  const [disposition, setDisposition] = useState<any>();
  const [campaignStatistics, setCampaignStatistics] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  console.log(disposition, 'dispositiondisposition', campaign);

  const getCardValue = (keys: string[]) =>
    keys.reduce(
      (acc, key) => {
        if (acc !== null) return acc;
        const value = campaignStatistics?.states?.[key];
        return value !== undefined && value !== null ? value : null;
      },
      null as number | null,
    ) || 0;

  const cardStatusMap: Record<string, string> = {
    Dialed: 'DialedCall',
    Pending: 'PendingCall',
    Connected: 'connected',
    'No Answers': 'DialedButNotAnswered',
    DNC: 'dnc',
  };

  const payloadExtraParams = {
    filters: [
      ...(campaign?.value ? [{ key: 'campaign_uuid', value: campaign?.value }] : []),
      ...(campaignType?.value ? [{ key: 'campaignType', value: campaignType?.value }] : []),
      ...(disposition?.value ? [{ key: 'disposition_uuid', value: disposition?.label }] : []),
      ...(selectedCard && cardStatusMap[selectedCard]
        ? [{ key: cardStatusMap[selectedCard], value: cardStatusMap[selectedCard] }]
        : []),
    ],
  };
  const { data: campaignListData = {}, isLoading: isPendingDepartmentList } = useQuery({
    queryKey: ['dropdownList', campaignType],
    queryFn: () =>
      dropdownList({
        ...(campaignType?.value ? { search: campaignType.value } : {}),
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  return (
    // <div className="flex flex-col w-full">
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">Campaign Logs</p>
        <div className="flex items-center gap-2 filters">
          <CustomSelect
            isClearable
            placeholder="Select campaign type"
            options={campaignTypeOptions || []}
            handleChange={(e: ISELECTVALUE) => {
              setCampaignType(e);
              setCampaign(undefined);
              setDisposition(undefined);
              setSelectedCard(null);
            }}
            value={campaignType}
            inputClass="team_chat"
          />
          <CustomSelect
            isClearable
            placeholder="Select campaign name"
            isLoading={isPendingDepartmentList}
            options={
              (campaignListData &&
                campaignListData?.length > 0 &&
                campaignListData?.map(({ name, _id }: { name: string; _id: string }) => ({
                  label: name,
                  value: _id,
                }))) ||
              []
            }
            handleChange={(e: ISELECTVALUE) => {
              setCampaign(e);
              setDisposition(undefined);
              setSelectedCard(null);
            }}
            value={campaign}
            inputClass="team_chat"
          />
          {!campaign?.value ? (
            <CustomTooltip text="Please select campaign name first" side="top">
              <div className="w-full cursor-not-allowed">
                <CustomSelect
                  isDisabled
                  isClearable
                  placeholder="Disposition"
                  options={[]}
                  handleChange={() => {}}
                  value={disposition}
                  inputClass="team_chat"
                />
              </div>
            </CustomTooltip>
          ) : (
            <CustomSelect
              isClearable
              placeholder="Disposition"
              isLoading={isPendingDepartmentList}
              options={(() => {
                const selectedCampaignData =
                  campaignListData?.length &&
                  campaignListData?.find((c: any) => c._id === campaign?.value);
                const agentDispo = selectedCampaignData?.agentDisposition || [];
                return agentDispo.map(
                  ({ disposition, _id }: { disposition: any; _id: string }) => ({
                    label: disposition?.name,
                    value: _id,
                  }),
                );
              })()}
              handleChange={(e: ISELECTVALUE) => setDisposition(e)}
              value={disposition}
              inputClass="team_chat"
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 p-3">
        {[
          { label: 'Total Contacts', keys: ['totalCall', 'totalContacts'] },
          { label: 'Dialed', keys: ['DialedCall', 'dialedCall', 'dialed'] },
          { label: 'Pending', keys: ['PendingCall', 'pendingCall', 'pending'] },
          { label: 'Connected', keys: ['connected', 'Connected', 'answered'] },
          {
            label: 'No Answers',
            keys: ['DialedButNotAnswered', 'dialedButNotAnswered', 'notAnswered'],
          },
          { label: 'DNC', keys: ['dnc', 'DNC'] },
        ].map((card) => {
          const isSelected =
            selectedCard === card.label || (!selectedCard && card.label === 'Total Contacts');
          return (
            <div
              key={card.label}
              onClick={() => setSelectedCard(card.label)}
              className={`rounded-lg p-4 border flex flex-col items-center justify-center gap-1  transition-all cursor-pointer ${
                isSelected
                  ? // ? 'border-primary bg-primary/10 shadow-sm'
                    'border-primary bg-primary/10 shadow-sm'
                  : 'border-stone-300/50 bg-stone-200/30 hover:border-stone-400 hover:bg-stone-200/40'
              }`}
            >
              <span
                className={`text-gray-900 font-semibold ${card.label === 'Total Contacts' ? 'text-base' : 'text-lg'}`}
              >
                {getCardValue(card.keys)}
              </span>
              <h3
                className={`text-center text-sm font-medium ${isSelected ? 'text-slate-500' : 'text-slate-500'}`}
              >
                {card.label}
              </h3>
            </div>
          );
        })}
      </div>
      <ActivityList
        payloadExtraParams={payloadExtraParams}
        activityType="campaignLogs"
        contactId={''}
        notesOnlyAction
        onTableSuccess={(data) => {
          if (data?.data?.data?.result) {
            setCampaignStatistics(data.data.data.result);
          }
        }}
        emptyPlaceholder="No campaign logs found"
        description="Campaign activity will appear here once campaigns start running."
      />
    </div>
  );
};

export default CampaignLogs;
