// import Breadcrumb from '@/components/custom/breadcrumb';
import TableManager from '@/components/custom/table-manager';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { getMonitorDepartmentList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { STATE_TYPE_NAME } from '../constants';
import { useUser } from '@/hooks/use-user';
import CustomTooltip from '@/components/custom/custom-tooltip';
import {
  CallBarge,
  CallIntersection,
  CallListen,
  CallWhisper,
  ImPhoneHangUp,
} from '@/assets/icons';
import Timer from '@/components/timer';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';
import { useCompanyFeatures } from '@/hooks/rbac';
import NotFound from '@/assets/images/not-found-img.svg';
import { capitalizeFirstLetter } from '@/lib/utils';
import { useDialpad } from '@/hooks/use-dialpad';
import { CallPathCell, CallPathDialog } from '../call-path-cell';
import { MonitoringTopbarSlot } from '../topbar';
import {
  findMonitoringCallForMember,
  getMonitoringCallDid,
  getMonitoringCallTimestamp,
  getMonitoringContactValue,
  getMonitoringLiveCalls,
  isActiveMonitoringCall,
  isMonitoringCallForForwardValue,
} from '../live-call-helpers';

type DepartmentSortedMember = {
  member: any;
  index: number;
  hasActiveCall: boolean;
};

const DepartmentMonitoring = () => {
  // const breadcrumbData = [{ label: 'Monitoring' }, { label: 'Department' }];
  const [collapsedItems, setCollapsedItems] = useState<any>({});
  const [selectedCallPath, setSelectedCallPath] = useState<any>(null);
  const tableRef = useRef<any>(null);
  const { user } = useUser();
  const { liveCalls, socketEventsManager, eventLiveCallsData } = useSocketEvents();
  const { features } = useCompanyFeatures();
  const monitoringAccessActions = features?.plan_features?.monitoring_features?.action;
  const { makeCall } = useDialpad();
  const liveCallsData = getMonitoringLiveCalls(liveCalls, eventLiveCallsData);
  const allDepartmentCalls =
    liveCallsData?.filter((call: any) => {
      const forwardType = String(call?.forward_type || '').toUpperCase();
      const callType = String(call?.call_type || '').toUpperCase();
      const hasDepartmentIdentifier = Boolean(call?.department_uuid || call?.department_id);

      return (
        isActiveMonitoringCall(call) &&
        (forwardType === 'DEPARTMENT' || callType === 'DEPARTMENT' || hasDepartmentIdentifier)
      );
    }) || [];
  const getDepartmentId = (item: any) =>
    item?.uuid || item?.department_uuid || item?._id || item?.id || item?.value || null;
  const getDepartmentCollapseKey = (item: any, index: number) =>
    String(getDepartmentId(item) || `department-${index}`);

  const getRowClassName = (row: any, uuid: string) => {
    const currentDepartmentrCalls = getDepartmentLiveCallsByUuid(uuid);
    const callInfo = findMonitoringCallForMember(currentDepartmentrCalls, row?.original);
    if (!callInfo) return '';
    const status = callInfo?.status || '';
    switch (status) {
      case 'ringing':
      case 'waiting':
        return 'bg-yellow-100';
      case 'answered':
      case 'bridged':
      case 'on_hold':
        return 'bg-green-100';
      default:
        return '';
    }
  };

  const monitorCall = (code: string, callId: any) => {
    makeCall(`${code}${callId}`);
  };

  const toggleCollapse = (key: any) => {
    setCollapsedItems((prev: any) => {
      const isCurrentlyOpen = prev[key];
      // Close all items and open only the clicked one (or close it if already open)
      const newState: any = {};
      Object.keys(prev).forEach((k) => {
        newState[k] = false;
      });
      newState[key] = !isCurrentlyOpen;
      return newState;
    });
  };

  const { data: departmentList, isPending } = useQuery({
    queryKey: ['getDepartmentListQuerFn'],
    queryFn: () => getMonitorDepartmentList(),
    select: (data) => data?.data?.data?.result,
  });

  const openedDepartmentId = departmentList?.find(
    (item: any, index: number) => collapsedItems?.[getDepartmentCollapseKey(item, index)],
  );

  const getDepartmentLiveCallsByUuid = (departmentUuid?: string) => {
    const selectedDepartmentId = departmentUuid || getDepartmentId(openedDepartmentId);
    if (!selectedDepartmentId) return [];

    return allDepartmentCalls.filter((call: any) =>
      isMonitoringCallForForwardValue(call, selectedDepartmentId),
    );
  };

  const getDepartmentMembers = (members: any) => {
    try {
      const parsed = typeof members === 'string' ? JSON.parse(members || '[]') : members;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing department monitoring members:', error);
      return [];
    }
  };

  const sortMembersWithActiveCallsFirst = (members: any[] = [], departmentUuid?: string) => {
    const currentDepartmentCalls = getDepartmentLiveCallsByUuid(departmentUuid);

    return members
      .map<DepartmentSortedMember>((member, index) => {
        const callInfo = findMonitoringCallForMember(currentDepartmentCalls, member);
        return {
          member,
          index,
          hasActiveCall: Boolean(callInfo && callInfo?.status !== 'waiting'),
        };
      })
      .sort((a, b) => {
        if (a.hasActiveCall !== b.hasActiveCall) {
          return a.hasActiveCall ? -1 : 1;
        }

        return a.index - b.index;
      })
      .map(({ member }) => member);
  };

  const terminateCallSession = (call: any) => {
    const callId = call?.direction === 'outbound' ? call?.call_uuid : call?.b_leg_uuid;
    socketEventsManager?.emit('call-hangup', { data: { call_uuid: callId } });
  };

  const columns = (uuid: string) => [
    {
      header: 'Agent',
      accessorKey: 'label',
      cell: ({ row }: any) => {
        const member = row?.original;
        return (
          <div className="flex items-center gap-2 w-full">
            <div className="flex ">
              <CustomAvatar
                name={member?.label}
                showPresence
                extension={member?.value}
                image={member?.profile}
              />
            </div>
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between  gap-2">
                <div className="flex flex-col items-start ">
                  <p className="capitalize text-sm">{member?.label}</p>
                  <small className="text-primary text-[10px]">{member?.role}</small>
                </div>
                <div className="flex items-center gap-1 text-[#9A948F]">
                  <Icon name="Grid" className="w-4 h-4 " />
                  <div className="text-xs">{member?.extension || member?.value || ''}</div>
                </div>
              </div>
              <p className="text-[#9A948F] flex justify-between text-sm">
                <div>{member?.email}</div>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contact',
      accessorKey: 'email',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentDepartmentrCalls = getDepartmentLiveCallsByUuid(uuid);
        const callInfo = findMonitoringCallForMember(currentDepartmentrCalls, data);
        return (
          <div>
            <p>{getMonitoringContactValue(callInfo)}</p>
          </div>
        );
      },
    },
    {
      header: 'DID',
      accessorKey: 'did',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentDepartmentrCalls = getDepartmentLiveCallsByUuid(uuid);
        const callInfo = findMonitoringCallForMember(currentDepartmentrCalls, data);
        return <>{getMonitoringCallDid(callInfo)}</>;
      },
    },
    {
      header: 'Duration',
      accessorKey: 'value',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentDepartmentrCalls = getDepartmentLiveCallsByUuid(uuid);
        const callInfo = findMonitoringCallForMember(currentDepartmentrCalls, data);
        if (!callInfo) return '00:00';
        const timestamp = getMonitoringCallTimestamp(callInfo, data);
        return (
          <div>
            <Timer startTime={timestamp} />
          </div>
        );
      },
    },
    {
      header: '	Status',
      accessorKey: 'email',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentDepartmentrCalls = getDepartmentLiveCallsByUuid(uuid);
        const callInfo = findMonitoringCallForMember(currentDepartmentrCalls, data);
        const status = callInfo?.status || (callInfo ? 'waiting' : '');
        return (
          <div>
            <p>{status ? STATE_TYPE_NAME[status as keyof typeof STATE_TYPE_NAME] : '---'}</p>
          </div>
        );
      },
    },
    {
      header: 'Direction',
      accessorKey: 'role',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentDepartmentrCalls = getDepartmentLiveCallsByUuid(uuid);
        const callInfo = findMonitoringCallForMember(currentDepartmentrCalls, data);
        return (
          <div>
            <p>{callInfo?.direction ? capitalizeFirstLetter(callInfo?.direction) : '---'}</p>
          </div>
        );
      },
    },
    {
      header: 'Call Path',
      accessorKey: 'current_context',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentDepartmentrCalls = getDepartmentLiveCallsByUuid(uuid);
        const callInfo = findMonitoringCallForMember(currentDepartmentrCalls, data);

        return <CallPathCell call={callInfo} onOpen={setSelectedCallPath} />;
      },
    },
    {
      header: 'Actions',
      accessorKey: 'user_uuid',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentDepartmentrCalls = getDepartmentLiveCallsByUuid(uuid);
        const callInfo = findMonitoringCallForMember(currentDepartmentrCalls, data);
        // const isCurrentSystemOnCall = Object.values(_uiSessions || {}).some((session: any) =>
        //   [callInfo?.agent_extension, callInfo?.called_number].includes(
        //     session?._number?.replace('+', ''),
        //   ),
        // );

        const callId =
          callInfo?.direction === 'outbound' ? callInfo?.call_uuid : callInfo?.b_leg_uuid;

        const isButtonDisabled =
          !callInfo ||
          !['bridged', 'answered'].includes(callInfo?.status) ||
          (callInfo?.called_number?.length > 4 && callInfo?.agent_extension?.length > 4) ||
          [callInfo?.agent_extension, callInfo?.called_number]?.includes(
            user?.user_info?.extension,
          );
        // &&
        //   isCurrentSystemOnCall) ||
        // monitoringCallJoined;

        if (isButtonDisabled) return '---';
        return (
          <span className="flex gap-2 items-center">
            {monitoringAccessActions?.barge && (
              <span className="cursor-pointer" onClick={() => monitorCall('*88', callId)}>
                <CustomTooltip text="Barge">
                  <CallBarge />
                </CustomTooltip>
              </span>
            )}
            {monitoringAccessActions?.listen && (
              <span className="cursor-pointer" onClick={() => monitorCall('*87', callId)}>
                <CustomTooltip text="Listen">
                  <CallListen />
                </CustomTooltip>
              </span>
            )}
            {monitoringAccessActions?.whisper && (
              <span className="cursor-pointer" onClick={() => monitorCall('*86', callId)}>
                <CustomTooltip text="Whisper">
                  <CallWhisper />
                </CustomTooltip>
              </span>
            )}

            <span className="cursor-pointer" onClick={() => monitorCall('*89', callId)}>
              <CustomTooltip text="Whisper">
                <CallIntersection />
              </CustomTooltip>
            </span>

            <span className="cursor-pointer" onClick={() => terminateCallSession(callInfo)}>
              <CustomTooltip text="Whisper">
                <ImPhoneHangUp />
              </CustomTooltip>
            </span>
            {/* {monitoringAccessActions?.hangup && <span className="cursor-pointer" onClick={() => _terminate(presenceData['Call-ID'])}>
              <CustomTooltip text="Hangup">
                <ImPhoneHangUp className="w-5 h-5" />
              </CustomTooltip>
            </span>} */}
          </span>
        );
      },
    },
  ];

  useEffect(() => {
    if (departmentList?.length) {
      const initialState: any = {};
      departmentList.forEach((item: any, index: number) => {
        const departmentKey = getDepartmentCollapseKey(item, index);
        initialState[departmentKey] = index === 0; // only first item open by default
      });
      setCollapsedItems(initialState);
    }
  }, [departmentList]);
  return (
    <>
      <section className="w-full overflow-x-auto overflow-y-hidden">
        {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
        {/* Upstream's warm bar colours, still rendered through the topbar
            slot: on Monitoring this bar is hoisted into the full-width row
            above the sidebar, so it must portal rather than sit inline. */}
        <MonitoringTopbarSlot>
          <div className="flex items-center justify-between p-3 border-b border-[rgba(225,200,165,0.9)] min-h-[65px] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
            <p className="text-[#2E2D35] font-semibold text-lg flex items-center gap-1">
              Monitoring
              <div className="-rotate-90 text-[#2E2D35]">
                <Icon name="ChevronIcon" className="w-5 h-5" />
              </div>
              <span className="text-primary text-md">Department </span>
            </p>
            <div className="flex gap-2 "></div>
          </div>
        </MonitoringTopbarSlot>
        <div className="w-full h-full   p-3 flex flex-col gap-2">
          {/* <h6 className="text-gray-900 font-semibold text-lg">Department Monitoring</h6> */}
          <div className="flex flex-col gap-2 h-[calc(100vh_-_10rem)] overflow-auto">
            {isPending ? (
              <h6 className="font-semibold text-[#2E2D35] text-md">Loading...</h6>
            ) : (
              <>
                {' '}
                {departmentList && departmentList?.length ? (
                  departmentList.map((item: any, index: number) => {
                    const departmentKey = getDepartmentCollapseKey(item, index);
                    const departmentId = getDepartmentId(item);
                    const isOpen = collapsedItems[departmentKey];
                    const members = getDepartmentMembers(item?.members);
                    const sortedMembers = sortMembersWithActiveCallsFirst(
                      members,
                      departmentId || undefined,
                    );
                    const membersCount = members?.length || 0;
                    const departmentLiveCalls = getDepartmentLiveCallsByUuid(
                      departmentId || undefined,
                    );
                    const liveCallsCount = departmentLiveCalls?.length || 0;

                    return (
                      <div key={departmentKey} className="block transition-all duration-300">
                        <div
                          className={`flex items-center justify-between gap-3 p-4 cursor-pointer rounded-lg border transition-all duration-200 ${
                            isOpen
                              ? 'bg-primary/5 border-primary shadow-sm mb-3'
                              : 'bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border-[rgba(225,200,165,0.9)] hover:border-primary/50 hover:shadow-md mb-2'
                          }`}
                          onClick={() => toggleCollapse(departmentKey)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className={`p-1.5 rounded-md transition-colors ${
                                isOpen ? 'bg-primary/10' : 'bg-[#FBE2C8]/40'
                              }`}
                            >
                              <Icon
                                name="ChevronIcon"
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isOpen ? 'text-primary' : 'text-[#9A948F] -rotate-90'
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <h6 className="font-semibold text-[#2E2D35] text-base">
                                {item?.name}
                              </h6>
                              {!isOpen && (
                                <p className="text-xs text-[#9A948F] mt-0.5">
                                  {membersCount} member{membersCount !== 1 ? 's' : ''} in department
                                </p>
                              )}
                              {isOpen && (
                                <p className="text-xs text-[#9A948F] mt-0.5">
                                  {liveCallsCount} live call{liveCallsCount !== 1 ? 's' : ''} in
                                  this department
                                </p>
                              )}
                            </div>
                          </div>
                          {!isOpen && membersCount > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-ucass-active-bg text-ucass-active text-xs font-medium rounded-full">
                                {membersCount}
                              </span>
                            </div>
                          )}
                        </div>

                        {isOpen && (
                          <div className="mb-4">
                            <TableManager
                              {...{
                                tableMaxHeight: '100%',
                                columns: columns(departmentId || ''),
                                staticData: sortedMembers,
                                showPagination: false,
                                getRowClassName: (row) => getRowClassName(row, departmentId || ''),
                                tableRef,
                                emptyTablePlaceholder: 'No department call activity',
                                descriptionEmptyTable:
                                  'Department-wise calls will be displayed here.',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full mx-auto">
                    <img src={NotFound} alt="BusyImage" className="min-w-36 w-36" />
                    <p className="text-md font-medium text-[#2E2D35]">
                      {' '}
                      No department call activity!
                    </p>
                    <p className="text-sm text-[#2E2D35]">
                      Department-wise calls will be displayed here.
                    </p>
                  </div>
                )}{' '}
              </>
            )}
          </div>
          {/* <TableManager
            {...{
              columns,
              // staticData: uniqueCalls || [],
              showPagination: false,
              getRowClassName,
            }}
          /> */}
        </div>
      </section>
      <CallPathDialog call={selectedCallPath} onClose={() => setSelectedCallPath(null)} />
    </>
  );
};

export default DepartmentMonitoring;
