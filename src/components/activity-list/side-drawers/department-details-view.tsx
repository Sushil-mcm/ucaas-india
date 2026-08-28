import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import Loader from '@/components/custom/loader';
import { getDepartmentAndCallLogs } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import CallHistoryLogs from '@/components/call-history-logs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import NotesView from './notes-view';
import { safeJSONParse } from '../constants';

const DepartmentDetailsView = ({
  rowData,
  notesTab = true,
  showOnlyDepartmentInfo = false,
}: {
  callId?: string;
  rowData: any;
  notesTab?: boolean;
  showOnlyDepartmentInfo?: boolean;
}) => {
  const [selectedTab, setSelectedTab] = useState<string>('Logs');
  const { contactId = '', callID, forward_type = '' } = rowData || {};
  if (showOnlyDepartmentInfo) {
    return <Logs callId={callID} type={forward_type} showOnlyDepartmentInfo />;
  }
  const RenderTabComponents = {
    Logs: (
      <Logs callId={callID} type={forward_type} showOnlyDepartmentInfo={showOnlyDepartmentInfo} />
    ),
    Notes: <NotesView contactId={contactId} />,
  };
  const tabList = ['Logs', ...(notesTab ? ['Notes'] : [])];
  return (
    <section className="w-full bg-gray-200/15 flex flex-col justify-between  overflow-x-auto overflow-y-hidden gap-3 h-full">
      <Tabs
        defaultValue={selectedTab}
        value={selectedTab}
        onValueChange={(v) => setSelectedTab(v)}
        className="flex w-full"
      >
        <div className="border-b border-gray-200 w-full">
          <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none min-h-10 ">
            {tabList?.map((tab: any) => {
              return (
                <TabsTrigger
                  className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs "
                  value={tab}
                >
                  {tab}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value={selectedTab}>
          {RenderTabComponents[selectedTab as keyof typeof RenderTabComponents]}
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default DepartmentDetailsView;

const Logs = ({
  callId,
  type,
  showOnlyDepartmentInfo = false,
}: {
  callId: string;
  type: string;
  showOnlyDepartmentInfo: boolean;
}) => {
  const { data: departmentData = {}, isLoading: isPendingDepartmentList } = useQuery({
    queryKey: ['getDepartmentAndCallLogs', callId, type],
    queryFn: () => getDepartmentAndCallLogs({ call_id: callId, type }),
    select: (data) => data?.data?.data?.result || {},
    enabled: !!callId,
  });

  const rawDepartmentResult = Array.isArray(departmentData?.result)
    ? departmentData?.result?.[0] || {}
    : departmentData?.result || {};
  const departmentInfo = rawDepartmentResult?.department || rawDepartmentResult || {};
  const hasDepartmentInfo = Object?.keys(departmentInfo || {})?.length > 0;

  const {
    members = '[]',
    manager = '{}',
    forward_call_actions = '{}',
    name = '',
    extension = '',
    description = '',
    site = '{}',
  } = departmentInfo;

  const { call_handling = {} } = forward_call_actions || {};
  const { failover = {} } = call_handling;
  console.log(failover, 'failover');

  const departmentMembers: any = safeJSONParse(members, []);
  const managerInfo: any = safeJSONParse(manager, {});
  const siteInfo: any = safeJSONParse(site, {});
  const transformedCalls = departmentData?.calls || [];
  return (
    <>
      {isPendingDepartmentList ? (
        <div className="flex items-center justify-center h-full">
          <Loader variant="blue" size="sm" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-3 h-[calc(100vh_-_10.3rem)] overflow-auto">
          {hasDepartmentInfo ? (
            <>
              <div className="bg-white p-3 border border-gray-200 rounded-xl">
                <div className="font-semibold text-gray-900 truncate text-md mb-2">
                  Department Info
                </div>
                <div className="grid grid-cols-4 gap-4 border border-gray-200 bg-gray-100 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-gray-900">Name</p>
                    <p className="text-sm text-gray-500">{name || '--'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-500">{siteInfo?.label || '--'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Extension</p>
                    <p className="text-sm text-gray-500">{extension || '--'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Description</p>
                    <p className="text-gray-800 text-sm">
                      {description || 'No description provided'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">If no one answers</p>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-sm text-gray-800">Type</p>
                        <p className="text-sm text-gray-500">{failover?.type || '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">Forward Number</p>
                        <p className="text-sm text-gray-500">{failover?.value || '--'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <p className="font-semibold text-gray-900 truncate text-md">Department Manager</p>
                <div className="w-full mt-2">
                  <div className="flex items-center justify-between border border-gray-200 bg-gray-100 rounded-xl p-3">
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
                          <Icon name="Grid" className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500 text-xs">
                            {managerInfo?.extension || managerInfo?.value || '--'}
                          </span>
                        </div>
                      </div>
                      <small className="text-primary text-[10px]">{managerInfo?.role}</small>
                      <small className="text-gray-500 truncate text-sm">
                        <CustomTooltip text={managerInfo?.email}>
                          <span>{managerInfo?.email}</span>
                        </CustomTooltip>
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <p className="font-semibold text-gray-900 truncate text-md mb-2">Members</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {departmentMembers?.length ? (
                    departmentMembers?.map((member: any) => {
                      const isMemberMatched = transformedCalls?.some(
                        (item: { destination_number: string }) =>
                          item?.destination_number === member?.value,
                      );
                      return (
                        <div
                          className={`flex items-center justify-between border ${isMemberMatched ? 'border-green-500' : 'border-red-500'} bg-gray-100 rounded-xl p-3`}
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
                                <Icon name="Grid" className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-500 text-xs">
                                  {member?.extension || member?.value || '--'}
                                </span>
                              </div>
                            </div>
                            <small className="text-primary text-[10px]">{member?.role}</small>
                            <small className="text-gray-500 truncate text-sm flex justify-between">
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
                    <p className="text-sm text-gray-500">No members found in this department.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-3 border border-gray-200 rounded-xl">
              <div className="font-semibold text-gray-900 truncate text-md mb-2">
                Department Info
              </div>
              <p className="text-sm text-gray-500">
                Department details are unavailable for this call.
              </p>
            </div>
          )}

          {!showOnlyDepartmentInfo && <CallHistoryLogs data={transformedCalls || []} />}
        </div>
      )}
    </>
  );
};
