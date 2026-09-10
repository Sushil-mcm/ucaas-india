import TableManager from '@/components/custom/table-manager';
import { useRef, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { USD_TO_INR_RATE } from '@/lib/billing-money';
import { ReportsPageLayout } from '../../reports-content-layout';
import { convertDateFormateApis, formatSecondsToMMSS, handleAlert, MEDIA_URL } from '@/lib/utils';
import { SearchLine } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { callListById, localCallList } from '@/services/api';
import { CALL_DIRECTIONS, FORWARD_ICONS } from '@/pages/dashboard/constant';
import CustomTooltip from '@/components/custom/custom-tooltip';
import NumberWithFlag from '@/components/custom/number-with-flag';
import AudioModal from '@/pages/phone/audio-dialog';
import { ACTIVITYLIST } from '@/components/activity-list/constants';

import { handleStatus } from '../constant';
import SideDrawer from '@/components/custom/side-drawer';
import IVRDetailsView from '@/components/activity-list/side-drawers/ivr-details-view';
import DepartmentDetailsView from '@/components/activity-list/side-drawers/department-details-view';
import QueueDetailsView from '@/components/activity-list/side-drawers/queue-details-view';
import DetailsModal from '@/components/activity-list/side-drawers/details-modal';
import { getUserNameByExtension, findUserByExtension } from '@/lib/extension-utility';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { useUser } from '@/hooks/use-user';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useNavigate } from 'react-router-dom';
import { useRecordingAccess } from '@/hooks/use-recording-access';
import { useCompanyFeatures } from '@/hooks/rbac';

const LocalCallList = ({
  // Only true when this report renders inside another already-open modal
  // (the "Open a full report page" dialog, reports-tab.tsx) — a "To" queue/
  // IVR link's `<SideDrawer>` there is a second portal stacking underneath
  // that dialog's own Radix z-index, technically open but invisible.
  detailsAsModal = false,
}: { detailsAsModal?: boolean } = {}) => {
  const tableRef = useRef<any>(null);
  const navigate = useNavigate();
  const { user } = useUser();
  const { makeCall, sessions } = useDialpad();
  const { createNewChat, createPrivateChatId, usersOnlineStatus } = useSocketEvents();
  const { canPlayRecording } = useRecordingAccess();
  const { features } = useCompanyFeatures();
  const callLogActionAccess = features?.plan_features?.reports?.action || {};

  const extension = user?.user_info?.extension;
  const isMeOnCall = usersOnlineStatus?.find((u) => u?.userId == extension)?.onCall;

  const iamOnCall = Object.values(sessions || {}).some((session: any) => {
    const status = String(session?.status || '').toLowerCase();
    return ['ringing', 'connecting', 'confirmed', 'calling'].includes(status);
  });

  const getDisplayDestinationNumber = (data: any) => {
    if (data?.direction === 'Outbound') {
      return data?.destination_number;
    }
    if (!data?.forward_type) {
      return data?.destination_number;
    }
    if (data?.forward_type === 'EXTENSION' || data?.forward_type === 'VOICEMAIL') {
      return data?.forward_value;
    }
    if (data?.forward_type === 'DEPARTMENT') {
      return data?.destination_number;
    }
    return data?.forward_value || data?.destination_number;
  };

  const handleMakeCall = (data: any) => {
    const resolvedNumber = getDisplayDestinationNumber(data);
    const otherUser = findUserByExtension(extensionUsers, resolvedNumber);
    const isSelf = resolvedNumber === extension || (otherUser && otherUser.uuid === user?.uuid);
    if (!resolvedNumber || iamOnCall || isSelf) {
      console.log('noooo', resolvedNumber, 'iamOnCall', iamOnCall, 'isSelf', isSelf);
      return;
    }
    makeCall(String(resolvedNumber));
  };

  const handleOpenAudio = (src: string) => {
    serRecordingUrl(src);
    setModalState(true);
  };

  const handleChat = (data: any) => {
    const resolvedNumber = getDisplayDestinationNumber(data);
    const otherUser = findUserByExtension(extensionUsers, resolvedNumber);
    const isSelf = resolvedNumber === extension || (otherUser && otherUser.uuid === user?.uuid);
    if (isSelf) return;

    if (otherUser && otherUser.uuid) {
      createNewChat({ ...otherUser });
      navigate(
        `/messenger?channel=chat&type=all&chatId=${createPrivateChatId([user?.uuid, otherUser?.uuid])}&exact=true`,
      );
    } else {
      handleAlert({ text: 'User not found', type: 'error' });
      // navigate(`/inbox?formState=contact&number=${resolvedNumber}`);
    }
  };

  const [search, setSearch] = useState('');

  const [drawerState, setDrawerState] = useState({
    department: false,
    IVR: false,
    QUEUE: false,
  });

  const [rowData, setRowData] = useState({});
  const [recordingUrl, serRecordingUrl] = useState<any>('');
  const [modalState, setModalState] = useState<any>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { users: extensionUsers = [] } = useUsersDirectory();
  const departmentList: any[] = [];

  const handleRefetchTableData = () => {
    if (!tableRef?.current) return;
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 450);
    tableRef.current.refetchTable().then(() => {
      handleAlert({ text: 'Refreshed', type: 'success' });
    });
  };

  const columns = [
    {
      header: 'Date',
      accessorKey: 'start_stamp',
      cell: ({ row }: any) => {
        const data = row?.original;
        const type = data?.forward_type;
        let displayDirection = data?.direction;

        if (type === ACTIVITYLIST?.VOICEMAIL) {
          displayDirection = ACTIVITYLIST?.Voicemail;
        } else if (type === ACTIVITYLIST?.MESSAGE) {
          displayDirection = ACTIVITYLIST?.Announcement;
        } else if (
          data?.direction === ACTIVITYLIST?.Inbound &&
          data?.billsec === 0 &&
          data?.is_voicemail === 0
        ) {
          displayDirection = ACTIVITYLIST?.Missed;
        } else {
          displayDirection = data?.direction;
        }

        return (
          <CustomTooltip text={displayDirection} side="right">
            <span className="inline-flex items-center gap-2 w-fit">
              {CALL_DIRECTIONS[displayDirection]}
              {convertDateFormateApis(data?.start_stamp, 'MMM DD, hh:mm A')}
            </span>
          </CustomTooltip>
        );
      },
    },

    {
      header: 'From',
      accessorKey: 'caller_id_number',
      cell: ({ row }: any) => {
        const data = row?.original;

        return (
          <span className="flex flex-col">
            <div className="flex gap-1 items-center">
              <Icon name="Grid" className="w-3 h-3 text-grey-500" />
              {data?.caller_id_number
                ? getUserNameByExtension(
                    extensionUsers,
                    data.caller_id_number,
                    data.caller_id_number,
                  )
                : '---'}
            </div>

            <small className="italic">{`(${data?.caller_id_number || 'Unknown'})`}</small>
          </span>
        );
      },
    },
    {
      header: 'To',
      accessorKey: 'destination_number',
      cell: ({ row }: any) => {
        const data = row?.original;
        const selectedDepartment =
          data?.forward_type === 'DEPARTMENT'
            ? departmentList?.find((item: any) => item?.uuid === data?.forward_value)
            : null;
        const callDirection = data?.direction;

        if (callDirection === 'Outbound') {
          return <NumberWithFlag number={data?.destination_number} />;
        } else {
          if (!data?.forward_type) {
            return (
              <span className="flex flex-col">
                <div className="flex gap-1 items-center">
                  <Icon name="Grid" className="w-3 h-3 text-grey-500" />
                  {data?.to_display_name || 'Unknown'}
                </div>
                {/* <small className="italic">{`(${data?.destination_number || 'Unknown'})`}</small> */}
              </span>
            );
          }
          const type =
            data?.forward_type === ACTIVITYLIST?.MESSAGE
              ? ACTIVITYLIST.ANNOUNCEMENT
              : data?.forward_type;
          return (
            <span className="flex flex-col  items-start">
              <div className="flex gap-1">
                <span className="flex justify-center">{FORWARD_ICONS[type]}</span>
                {selectedDepartment?.name ? (
                  selectedDepartment?.name
                ) : data?.forward_type === 'DEPARTMENT' ||
                  data?.forward_type === 'IVR' ||
                  data?.forward_type === 'QUEUE' ? (
                  <span
                    className="text-ucass-active hover:underline cursor-pointer"
                    onClick={() => {
                      if (data?.forward_type === 'DEPARTMENT') {
                        setDrawerState((prev) => ({ ...prev, department: true }));
                      } else if (data?.forward_type === 'IVR') {
                        setDrawerState((prev) => ({ ...prev, IVR: true }));
                      } else if (data?.forward_type === 'QUEUE') {
                        setDrawerState((prev) => ({ ...prev, QUEUE: true }));
                      }

                      setRowData({
                        ...row?.original,
                        contactId: row?.original?.sipcall_id,
                        callID: row?.original?.sipcall_id,
                      });
                    }}
                  >
                    {data?.forward_name}
                  </span>
                ) : (
                  data?.forward_name
                )}
              </div>
              <small className="italic">
                {data?.forward_type === 'EXTENSION' || data?.forward_type === 'VOICEMAIL'
                  ? `(${data?.forward_value})`
                  : ''}
                {data?.forward_type === 'DEPARTMENT'
                  ? data?.to_display_name
                    ? data?.to_display_name
                    : ''
                  : ''}
              </small>
            </span>
          );
        }
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const data = row?.original;
        const status =
          data?.status === 'SUCCESS'
            ? 'answered'
            : data?.status?.toLowerCase()?.replaceAll('_', ' ') || '---';
        return (
          <div className="w-full flex">
            <div
              className={`flex items-center gap-1 text-[12px] text capitalize rounded-full px-2 py-0.5 ${handleStatus(status)}`}
            >
              {status}
            </div>
            {data?.forward_type?.toLowerCase() === 'conference' && (
              <div className="flex items-center  ml-2 gap-1 text-[12px] text capitalize rounded-full px-2 py-0.5 bg-[# EFF8FF] border border-[#B2DDFF] text-[#175CD3]">
                Conference
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Duration',
      accessorKey: 'billsectotal',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.billsectotal ? (
          formatSecondsToMMSS(Number(data?.billsectotal || 0))
        ) : (
          <span>{data?.billsec?.slice(3)}</span>
        );
      },
    },
    {
      header: 'Wait Time',
      accessorKey: 'waitsec',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.waitsec ? (
          formatSecondsToMMSS(Number(data?.waitsec || 0))
        ) : (
          <span>{data?.billsec?.slice(3)}</span>
        );
      },
    },

    {
      header: 'Charge',
      accessorKey: 'charge',
      cell: ({ row }: any) => {
        const value = Number(row?.original?.charge ?? 0);
        return `₹${(value * USD_TO_INR_RATE).toFixed(2)}`;
      },
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original;
        const resolvedNumber = getDisplayDestinationNumber(data);
        const otherUser = findUserByExtension(extensionUsers, resolvedNumber);
        const isSelf = resolvedNumber === extension || (otherUser && otherUser.uuid === user?.uuid);

        let callTooltipText = 'Call';
        let callDisabled = false;
        if (isSelf) {
          callTooltipText = 'You cannot call yourself';
          callDisabled = true;
        } else if (iamOnCall || isMeOnCall) {
          callTooltipText = 'On call';
          callDisabled = true;
        }

        let chatTooltipText = 'Chat';
        let chatDisabled = false;
        if (isSelf) {
          chatTooltipText = 'You cannot chat with yourself';
          chatDisabled = true;
        }

        const hasRecording = data?.recording_file || null;
        const recordingSrcUrl = data?.recording_file
          ? `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${data.recording_file}`
          : '';

        return (
          <span className="flex text-center gap-2 items-center">
            {callLogActionAccess?.call_recording_listen && canPlayRecording(data).allowed && (
              <CustomTooltip text={hasRecording ? 'Play' : 'No recording available'} side="top">
                <div
                  className={`${
                    hasRecording
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                      : 'cursor-not-allowed bg-gray-100 text-gray-300'
                  } flex items-center justify-center rounded-full w-8 h-8`}
                  onClick={() => {
                    if (!hasRecording) return;
                    handleOpenAudio(recordingSrcUrl);
                  }}
                >
                  <Icon name="PlayLine" className="w-4.5 h-4.5" />
                </div>
              </CustomTooltip>
            )}
            <CustomTooltip text={callTooltipText} side="top">
              <span
                className={`${
                  callDisabled
                    ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                } flex items-center justify-center rounded-full w-8 h-8`}
                onClick={() => !callDisabled && handleMakeCall(data)}
              >
                <Icon name="PhoneIcon" className="w-4 h-4" />
              </span>
            </CustomTooltip>
            <CustomTooltip text={chatTooltipText} side="top">
              <span
                className={`${
                  chatDisabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-primary/20 text-primary hover:bg-primary hover:text-white cursor-pointer'
                } flex items-center justify-center rounded-full w-8 h-8`}
                onClick={() => !chatDisabled && handleChat(data)}
              >
                <Icon name="MessageIcon" className="w-4 h-4" />
              </span>
            </CustomTooltip>
          </span>
        );
      },
    },
  ];

  const Filters = (
    <div className="flex items-center gap-2 filters">
      <div className="w-full sm:w-52 lg:w-60">
        <Input
          placeholder="Search"
          className="pl-10 h-9 min-h-9 rounded-lg"
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith(' ')) return;
            setSearch(e.target.value);
          }}
          IconPosition="left-0 pl-2 inset-y-0"
          Icon={<SearchLine className=" text-gray-700 dark:text-mcm-ink-2" />}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleRefetchTableData()}
        className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white dark:bg-mcm-surface border border-primary text-primary hover:bg-primary hover:text-white"
      >
        <Icon name="Refresh" className={`w-5 h-5 ${isLoading ? 'animate-refresh-nudge' : ''}`} />
      </Button>
    </div>
  );

  return (
    <ReportsPageLayout filters={Filters}>
      <div className="w-full  p-3 flex flex-col gap-2">
        {/* <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 md:grid-cols-5">
          {tabs.map((tab) => (
            <div
              key={tab.label}
              onClick={() => handleTabClick(tab.label)}
              className={`cursor-pointer flex min-h-10 min-w-[10.75rem] flex-col items-center justify-center gap-1 rounded-lg border p-3 py-2 text-center transition-all duration-200 sm:min-w-0  ${activeTab === tab.label
                ? 'border-ucass-primary-200 bg-ucass-primary-200/40 '
                : 'border-gray-200 dark:border-mcm-line hover:bg-gray-50 dark:hover:bg-mcm-surface-3 bg-white dark:bg-mcm-surface'
                }`}
            >
              <div
                className={`min-w-8  px-1 rounded-full flex items-center justify-center  text-base font-semibold leading-none `}
              >
                {tab.count}
              </div>
              <span
                className={`mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-mcm-ink-3 ${activeTab === tab.label ? 'text-primary' : 'text-gray-600 dark:text-mcm-ink-2'
                  }`}
              >
                {tab.label}
              </span>
            </div>
          ))}
        </div> */}
        <TableManager
          {...{
            tableRef,
            splitStickyHeader: true,
            tableMaxHeight: '55vh',
            fetcherKey: 'localCallListingLog',
            fetcherFn: localCallList,
            // onSuccess: (data: any) => {
            //   setCallStats(data?.data?.data?.result?.call_stats || null);
            // },
            columns,
            search,
            emptyTablePlaceholder: 'No call records found',
            descriptionEmptyTable: 'Start making or receiving calls to generate call logs.',

            //for extra row
            hasSubRows: true,
            showMoreData: (_) => _?.count > 1,
            makeSubRowPayload: (_) => ({ sipcall_id: _?.sipcall_id }),
            subRowsMutateFn: callListById,
            subRowsMutateKey: 'callListById',
          }}
        />
        <AudioModal
          modalState={modalState}
          setModalState={setModalState}
          srcUrl={recordingUrl}
          serRecordingUrl={serRecordingUrl}
        />
        {drawerState?.IVR &&
          (detailsAsModal ? (
            <DetailsModal
              isOpen={drawerState.IVR}
              onClose={() => setDrawerState((prev) => ({ ...prev, IVR: false }))}
            >
              <IVRDetailsView rowData={rowData} variant="modal" />
            </DetailsModal>
          ) : (
            <SideDrawer
              isTab
              isOpen={drawerState?.IVR}
              handleClose={() => setDrawerState((prev) => ({ ...prev, IVR: false }))}
              content={<IVRDetailsView rowData={rowData} />}
            />
          ))}
        {drawerState?.department && (
          <SideDrawer
            isTab
            isOpen={drawerState?.department}
            handleClose={() => setDrawerState((prev) => ({ ...prev, department: false }))}
            content={
              <DepartmentDetailsView
                notesTab={false}
                showOnlyDepartmentInfo={true}
                rowData={rowData}
              />
            }
          />
        )}
        {drawerState?.QUEUE &&
          (detailsAsModal ? (
            <DetailsModal
              isOpen={drawerState.QUEUE}
              onClose={() => setDrawerState((prev) => ({ ...prev, QUEUE: false }))}
            >
              <QueueDetailsView rowData={rowData} variant="modal" />
            </DetailsModal>
          ) : (
            <SideDrawer
              isTab
              isOpen={drawerState?.QUEUE}
              handleClose={() => setDrawerState((prev) => ({ ...prev, QUEUE: false }))}
              content={<QueueDetailsView rowData={rowData} />}
            />
          ))}
      </div>
    </ReportsPageLayout>
  );
};

export default LocalCallList;
