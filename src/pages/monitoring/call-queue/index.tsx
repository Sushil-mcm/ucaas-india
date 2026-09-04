import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import TableManager from '@/components/custom/table-manager';
import CustomSelect from '@/components/custom/custom-select';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { getCallQueueInvolvements, getRunningCampaigns } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import NotFound from '@/assets/images/not-found-img.svg';
import { QUEUE_TYPE, STATE_TYPE_NAME } from '../constants';
import Timer from '@/components/timer';
import { capitalizeFirstLetter } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import CustomTooltip from '@/components/custom/custom-tooltip';
import {
  CallBarge,
  CallIntersection,
  CallListen,
  CallWhisper,
  ImPhoneHangUp,
} from '@/assets/icons';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useDialpad } from '@/hooks/use-dialpad';
import { CallPathCell, CallPathDialog } from '../call-path-cell';
import {
  findMonitoringCallForMember,
  getMonitoringCallDid,
  getMonitoringCallTimestamp,
  getMonitoringContactValue,
  getMonitoringLiveCalls,
  isActiveMonitoringCall,
  isMonitoringCallForForwardValue,
} from '../live-call-helpers';

type QueueSortedMember = {
  member: any;
  index: number;
  hasActiveCall: boolean;
};

const getQueueId = (item: any) =>
  item?.uuid ||
  item?.queue_uuid ||
  item?.campaign_uuid ||
  item?._id ||
  item?.id ||
  item?.value ||
  null;

const CallQueueMonitoring = ({ queueType }: { queueType: string }) => {
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [selectedCallPath, setSelectedCallPath] = useState<any>(null);
  const { liveCalls, socketEventsManager, eventLiveCallsData } = useSocketEvents();

  // const [queueData, setQueueData] = useState<{ agents: any[]; members: any[] }>({
  //   agents: [],
  //   members: [],
  // });
  const { makeCall } = useDialpad();
  const { user } = useUser();
  // const { user_info } = user;
  const { features } = useCompanyFeatures();
  const monitoringAccessActions = features?.plan_features?.monitoring_features?.action;

  // const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // console.log(intervalRef, setQueueData);

  const liveCallsData = getMonitoringLiveCalls(liveCalls, eventLiveCallsData);
  const isCampaignMonitoring = queueType === QUEUE_TYPE.campaign;
  const activeForwardType = isCampaignMonitoring ? QUEUE_TYPE.campaign : QUEUE_TYPE.queue;
  const allQueueCalls =
    liveCallsData?.filter((call: any) => {
      const forwardType = String(call?.forward_type || '').toUpperCase();
      const callType = String(call?.call_type || '').toUpperCase();
      const hasQueueIdentifier = Boolean(call?.queue_uuid || call?.queue_id);
      const hasCampaignIdentifier = Boolean(call?.campaign_uuid || call?.campaign_id);
      const hasMatchingIdentifier =
        activeForwardType === QUEUE_TYPE.queue ? hasQueueIdentifier : hasCampaignIdentifier;

      return (
        isActiveMonitoringCall(call) &&
        (forwardType === activeForwardType ||
          callType === activeForwardType ||
          hasMatchingIdentifier)
      );
    }) || [];
  const openedQueueId = activeQueueId;

  const getQueueMembers = (members: any) => {
    try {
      const parsed = typeof members === 'string' ? JSON.parse(members || '[]') : members;
      if (!Array.isArray(parsed)) return [];

      return Array.from(
        new Map(
          parsed.map((member: any, index: number) => [
            member?.user_uuid ||
              member?.uuid ||
              member?.extension ||
              member?.value ||
              member?.email ||
              index,
            member,
          ]),
        ).values(),
      );
    } catch (error) {
      console.error('Error parsing monitoring members:', error);
      return [];
    }
  };

  const getMemberDetails = (member: any) => {
    const userDetail = member?.user_detail || member?.user || member?.user_info || {};
    const firstName = member?.first_name || userDetail?.first_name || '';
    const lastName = member?.last_name || userDetail?.last_name || '';
    const fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`.trim();

    return {
      name:
        member?.name ||
        member?.label ||
        fullName ||
        userDetail?.name ||
        userDetail?.label ||
        member?.email ||
        userDetail?.email ||
        'Unknown User',
      extension:
        member?.extension ||
        member?.value ||
        member?.number ||
        member?.agent_extension ||
        member?.user_extension ||
        userDetail?.extension ||
        userDetail?.value ||
        '',
      profile:
        member?.profile ||
        member?.imageUrl ||
        member?.image ||
        userDetail?.profile ||
        userDetail?.imageUrl ||
        userDetail?.image ||
        '',
      role:
        member?.custom_role_data?.name ||
        member?.role_data?.name ||
        member?.role ||
        userDetail?.custom_role_data?.name ||
        userDetail?.role_data?.name ||
        userDetail?.role ||
        '',
      email: member?.email || userDetail?.email || '',
    };
  };

  const { data: runningCampaignList = [], isPending: isPendingRunningCampaigns } = useQuery({
    queryKey: ['getRunningCampaignsList'],
    queryFn: () => getRunningCampaigns(),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: isCampaignMonitoring,
  });

  const { data: assignedQueueList = [], isPending: isPendingAssignedQueues } = useQuery({
    queryKey: ['getCallQueueInvolvements', 'monitoring'],
    queryFn: () => getCallQueueInvolvements(),
    select: (res) => res?.data?.data?.result ?? [],
    enabled: !isCampaignMonitoring,
  });

  const callQueueList = useMemo(() => {
    const sourceList = isCampaignMonitoring ? runningCampaignList : assignedQueueList;
    if (!Array.isArray(sourceList)) return [];

    return sourceList.map((item: any, index: number) => {
      const id = getQueueId(item) || `monitoring-option-${index}`;
      return {
        ...item,
        label: item?.label || item?.name || item?.campaignName || item?.queueName || 'Untitled',
        value: id,
      };
    });
  }, [assignedQueueList, isCampaignMonitoring, runningCampaignList]);

  const isPending = isCampaignMonitoring ? isPendingRunningCampaigns : isPendingAssignedQueues;

  const getRowClassName = (row: any) => {
    const currentQueueCalls = getQueueLiveCallsByUuid();
    const callInfo = findMonitoringCallForMember(currentQueueCalls, row?.original);
    if (!callInfo) return '';
    const status = callInfo?.status || '';

    switch (status) {
      case 'ringing':
      case 'waiting':
        return 'bg-yellow-500/30';
      case 'answered':
      case 'bridged':
      case 'on_hold':
        return 'bg-green-500/30';
      default:
        return '';
    }
  };

  const getQueueLiveCallsByUuid = (queueUuid?: string) => {
    const selectedQueueId = queueUuid || openedQueueId;
    if (!selectedQueueId) return [];

    return allQueueCalls.filter((call: any) =>
      isMonitoringCallForForwardValue(call, selectedQueueId),
    );
  };

  const getQueueLiveCallsWaitingByUuid = (queueUuid?: string) => {
    const selectedQueueId = queueUuid || openedQueueId;
    if (!selectedQueueId) return [];

    return allQueueCalls.filter(
      (call: any) =>
        isMonitoringCallForForwardValue(call, selectedQueueId) &&
        (!call?.status || call?.status === 'waiting'),
    );
  };

  const sortMembersWithActiveCallsFirst = (members: any[] = [], queueUuid?: string) => {
    const currentQueueCalls = getQueueLiveCallsByUuid(queueUuid);

    return members
      .map<QueueSortedMember>((member, index) => {
        const callInfo = findMonitoringCallForMember(currentQueueCalls, member);
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

  const monitorCall = (code: string, callId: any) => {
    makeCall(`${code}${callId}`);
  };

  const terminateCallSession = (call: any) => {
    const callId = call?.direction === 'outbound' ? call?.call_uuid : call?.b_leg_uuid;
    socketEventsManager?.emit('call-hangup', { data: { call_uuid: callId } });
  };

  const agentColumns = [
    {
      header: 'Members',
      accessorKey: 'user_detail',
      cell: ({ row }: any) => {
        const member = row?.original;
        const memberDetails = getMemberDetails(member);
        return (
          <div className="flex items-center gap-2 w-full">
            <div className="flex ">
              <CustomAvatar
                name={memberDetails.name}
                showPresence
                extension={memberDetails.extension}
                image={memberDetails.profile}
              />
            </div>
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between  gap-2">
                <div className="flex flex-col items-start ">
                  <p className="capitalize text-sm">{memberDetails.name}</p>
                  <small className="text-primary text-[10px]">{memberDetails.role}</small>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Icon name="Grid" className="w-4 h-4 " />
                  <div className="text-xs">{memberDetails.extension}</div>
                </div>
              </div>
              <p className="text-gray-500 flex justify-between text-sm">
                <div>{memberDetails.email}</div>
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
        const currentQueueCalls = getQueueLiveCallsByUuid();
        const callInfo = findMonitoringCallForMember(currentQueueCalls, data);
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
        const currentQueueCalls = getQueueLiveCallsByUuid();
        const callInfo = findMonitoringCallForMember(currentQueueCalls, data);
        return <>{getMonitoringCallDid(callInfo)}</>;
      },
    },
    {
      header: 'Duration',
      accessorKey: 'value',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentQueueCalls = getQueueLiveCallsByUuid();
        const callInfo = findMonitoringCallForMember(currentQueueCalls, data);
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
        const currentQueueCalls = getQueueLiveCallsByUuid();
        const callInfo = findMonitoringCallForMember(currentQueueCalls, data);
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
        const currentQueueCalls = getQueueLiveCallsByUuid();
        const callInfo = findMonitoringCallForMember(currentQueueCalls, data);
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
        const currentQueueCalls = getQueueLiveCallsByUuid();
        const callInfo = findMonitoringCallForMember(currentQueueCalls, data);

        return <CallPathCell call={callInfo} onOpen={setSelectedCallPath} />;
      },
    },
    {
      header: 'Actions',
      accessorKey: 'user_uuid',
      cell: ({ row }: any) => {
        const data = row?.original;
        const currentQueueCalls = getQueueLiveCallsByUuid();
        const callInfo = findMonitoringCallForMember(currentQueueCalls, data);
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
  const memberColumns = [
    {
      header: 'Name',
      accessorKey: 'contact_name',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <>{data?.contact_name || 'Unknown Caller'}</>;
      },
    },
    {
      header: 'Phone',
      accessorKey: 'cid_number',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <>{data?.caller_number || 'Unknown Number'}</>;
      },
    },
    {
      header: 'State',
      accessorKey: 'state',
      cell: () => {
        return <>Waiting</>;
      },
    },
    {
      header: 'Waiting Time',
      accessorKey: 'duration',
      cell: ({ row }: any) => {
        const timestamp = getMonitoringCallTimestamp(row.original);
        return <Timer startTime={timestamp} />;
      },
    },
    {
      header: 'Call Path',
      accessorKey: 'current_context',
      cell: ({ row }: any) => {
        return <CallPathCell call={row?.original} onOpen={setSelectedCallPath} />;
      },
    },
  ];

  useEffect(() => {
    if (!callQueueList?.length) {
      setActiveQueueId(null);
      return;
    }

    const hasActiveQueue = callQueueList.some((item: any) => getQueueId(item) === activeQueueId);
    if (hasActiveQueue) return;

    const firstQueueId = getQueueId(callQueueList[0]);
    setActiveQueueId(firstQueueId);
  }, [activeQueueId, callQueueList]);

  return (
    <>
      <section className="w-full  ">
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          {/* "Monitoring ›" dropped — the section head above the rail says it.
              The chevron into the selected queue's name stays, since that one
              is a real step down rather than a repeat. */}
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
            <span className="text-primary text-md">
              {queueType === QUEUE_TYPE.campaign ? 'Campaign' : 'Call Queue'}{' '}
            </span>
            {activeQueueId && (
              <>
                <div className="-rotate-90 text-gray-800">
                  <Icon name="ChevronIcon" className="w-5 h-5" />
                </div>
                <span className="text-primary text-md font-medium">
                  {callQueueList?.find((item: any) => getQueueId(item) === activeQueueId)?.name}
                </span>
              </>
            )}
          </p>
          <div className="flex gap-2 ">
            <CustomSelect
              options={callQueueList}
              value={callQueueList?.find((item: any) => getQueueId(item) === activeQueueId)}
              handleChange={(option: any) => {
                if (option) {
                  const queueId = getQueueId(option);
                  setActiveQueueId(queueId);
                }
              }}
              className="w-64"
              isClearable={false}
              placeholder={isCampaignMonitoring ? 'Select Campaign' : 'Select Queue'}
            />
          </div>
        </div>
        <div className="w-full p-3 flex flex-col gap-2 overflow-y-auto h-[calc(100vh-8rem)]">
          {isPending ? (
            <div>Loading...</div>
          ) : (
            <>
              {callQueueList && callQueueList?.length ? (
                callQueueList
                  ?.filter((item: any) => getQueueId(item) === activeQueueId)
                  ?.map((item: any) => {
                    const queueId = getQueueId(item);
                    const members = getQueueMembers(item?.members);
                    const sortedMembers = sortMembersWithActiveCallsFirst(members, queueId);

                    return (
                      <div key={queueId} className="flex flex-col gap-4">
                        {/* <div className="flex items-center justify-between bg-white p-4 rounded-lg border ">
                        <h2 className="text-xl text-gray-900">{item?.name}</h2>
                      </div> */}
                        <div>
                          <div className="text-sm font-semibold text-gray-800 mb-2">
                            Agents ({members?.length})
                          </div>
                          <TableManager
                            {...{
                              columns: agentColumns,
                              staticData: sortedMembers || [],
                              showPagination: false,
                              getRowClassName,
                              emptyTablePlaceholder: 'No queue calls available',
                              descriptionEmptyTable:
                                'Calls routed through queues will appear here.',
                            }}
                          />
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-gray-800 mb-2">
                            Waiting Callers ({getQueueLiveCallsWaitingByUuid()?.length})
                          </div>
                          <TableManager
                            {...{
                              columns: memberColumns,
                              staticData: getQueueLiveCallsWaitingByUuid() || [],
                              showPagination: false,
                              getRowClassName: () => 'bg-yellow-500/30',
                              emptyTablePlaceholder: 'No queue calls available',
                              descriptionEmptyTable:
                                'Calls routed through queues will appear here.',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full mx-auto">
                  <img src={NotFound} alt="BusyImage" className="min-w-36 w-36" />
                  <p className="text-md font-medium text-gray-900">
                    {' '}
                    No {queueType === QUEUE_TYPE.campaign ? 'campaign' : 'queue'} calls available
                  </p>
                  <p className="text-sm text-gray-700">
                    Calls routed through{' '}
                    {queueType === QUEUE_TYPE.campaign ? 'campaigns' : 'queues'} will appear here.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <CallPathDialog call={selectedCallPath} onClose={() => setSelectedCallPath(null)} />
    </>
  );
};

export default CallQueueMonitoring;
