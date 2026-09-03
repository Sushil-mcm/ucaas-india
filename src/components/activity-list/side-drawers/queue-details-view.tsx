import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import Loader from '@/components/custom/loader';
import CallHistoryLogs from '@/components/call-history-logs';
import { getDepartmentAndCallLogs } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { safeJSONParse } from '../constants';

const QueueDetailsView = ({ rowData }: { rowData: any }) => {
  const { callID, forward_type = '' } = rowData || {};

  const { data: departmentData = {}, isLoading: isPendingDepartmentList } = useQuery({
    queryKey: ['getDepartmentAndCallLogs', callID, forward_type],
    queryFn: () => getDepartmentAndCallLogs({ call_id: callID, type: forward_type }),
    select: (data) => data?.data?.data?.result || {},
    enabled: !!callID,
  });

  const rawQueueResult = Array.isArray(departmentData?.result)
    ? departmentData?.result?.[0] || {}
    : departmentData?.result || {};
  const queueInfo = rawQueueResult?.queue || rawQueueResult || {};
  const hasQueueInfo = Object?.keys(queueInfo || {})?.length > 0;

  const {
    members = '[]',
    manager = '{}',
    forward_call_actions = '{}',
    name = '',
    extension = '',
    description = '',
    site = '{}',
  } = queueInfo;

  const { call_handling = {} } = forward_call_actions || {};
  const { failover = {} } = call_handling;

  const departmentMembers: any = safeJSONParse(members, []);
  const managerInfo: any = safeJSONParse(manager, {});
  const siteInfo: any = safeJSONParse(site, {});
  const transformedCalls = departmentData?.calls || [];
  console.log(transformedCalls, 'transformedCallstransformedCalls', departmentData);

  return (
    <>
      {isPendingDepartmentList ? (
        <div className="flex items-center justify-center h-full">
          <Loader variant="blue" size="sm" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-3 h-[calc(100vh_-_10.3rem)] overflow-auto">
          {hasQueueInfo ? (
            <>
              <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 border border-[rgba(225,200,165,0.9)] rounded-xl">
                <div className="font-semibold text-[#2E2D35] truncate text-md mb-2">Queue Info</div>
                <div className="grid grid-cols-4 gap-4 border border-[#EEE7DD] bg-[#FBE2C8]/40 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-[#2E2D35]">Name</p>
                    <p className="text-sm text-[#9A948F]">{name || '--'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[#2E2D35]">Location</p>
                    <p className="text-sm text-[#9A948F]">
                      {siteInfo?.label || siteInfo?.name || ''}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-[#2E2D35]">Extension</p>
                    <p className="text-sm text-[#9A948F]">{extension || '--'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-[#2E2D35]">Description</p>
                    <p className="text-[#2E2D35] text-sm">
                      {description || 'No description provided'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-[#2E2D35]">If no one answers</p>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-sm text-[#2E2D35]">Type</p>
                        <p className="text-sm text-[#9A948F]">{failover?.type || '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#2E2D35]">Forward Number</p>
                        <p className="text-sm text-[#9A948F]">{failover?.value || '--'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl p-3">
                <p className="font-semibold text-[#2E2D35] truncate text-md">Department Manager</p>
                <div className="w-full mt-2">
                  <div className="flex items-center justify-between border border-[#EEE7DD] bg-[#FBE2C8]/40 rounded-xl p-3">
                    <CustomAvatar
                      name={managerInfo?.label}
                      showPresence
                      size="40"
                      extension={managerInfo?.extension}
                      image={managerInfo?.profile}
                    />
                    <div className="flex flex-col w-[calc(100%_-_3.5rem)]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="capitalize text-md truncate">{managerInfo?.label}</p>
                        <div className="flex gap-1">
                          <Icon name="Grid" className="w-4 h-4 text-[#9A948F]" />
                          <span className="text-[#9A948F] text-xs">
                            {managerInfo?.extension || managerInfo?.value || '--'}
                          </span>
                        </div>
                      </div>
                      <small className="text-primary text-[10px]">{managerInfo?.role}</small>
                      <small className="text-[#9A948F] truncate text-sm">
                        <CustomTooltip text={managerInfo?.email}>
                          <span>{managerInfo?.email}</span>
                        </CustomTooltip>
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl p-3">
                <p className="font-semibold text-[#2E2D35] truncate text-md mb-2">Members</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {departmentMembers?.length ? (
                    departmentMembers?.map((member: any) => {
                      const isMemberMatched = transformedCalls?.some(
                        (item: { destination_number: string }) =>
                          item?.destination_number === member?.value,
                      );
                      return (
                        <div
                          className={`flex items-center justify-between border ${isMemberMatched ? 'border-green-500' : 'border-red-500'} bg-[#FBE2C8]/40 rounded-xl p-3`}
                          key={member?.uuid}
                        >
                          <CustomAvatar
                            name={member?.label}
                            showPresence
                            extension={member?.extension}
                            image={member?.profile}
                          />
                          <div className="flex flex-col w-[calc(100%_-_3.5rem)]">
                            <div className="flex items-center justify-between gap-2">
                              <p className="capitalize text-sm truncate">{member?.label}</p>
                              <div className="flex gap-1">
                                <Icon name="Grid" className="w-4 h-4 text-[#9A948F]" />
                                <span className="text-[#9A948F] text-xs">
                                  {member?.extension || member?.value || '--'}
                                </span>
                              </div>
                            </div>
                            <small className="text-primary text-[10px]">{member?.role}</small>
                            <small className="text-[#9A948F] truncate text-sm flex justify-between">
                              <CustomTooltip text={member?.email}>
                                <span>{member?.email}</span>
                              </CustomTooltip>
                              <span
                                className={`${isMemberMatched ? 'text-green-500' : 'text-red-500'} text-xs`}
                              >
                                {isMemberMatched ? 'Call Picked' : 'Call Not Picked'}
                              </span>
                            </small>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[#9A948F]">No members found in this department.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 border border-[rgba(225,200,165,0.9)] rounded-xl">
              <div className="font-semibold text-[#2E2D35] truncate text-md mb-2">Queue Info</div>
              {transformedCalls?.length ? (
                <p className="text-sm text-[#9A948F]">Queue details for this call.</p>
              ) : (
                <p className="text-sm text-[#9A948F]">
                  Queue details are unavailable for this call.
                </p>
              )}
            </div>
          )}

          {transformedCalls?.length > 0 && <CallHistoryLogs data={transformedCalls || []} />}
        </div>
      )}
    </>
  );
};
export default QueueDetailsView;
