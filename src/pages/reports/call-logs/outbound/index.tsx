import { useRef, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { ReportsPageLayout } from '../../reports-content-layout';
import { useNavigate } from 'react-router-dom';
import { convertDateFormateApis, formatSecondsToMMSS, MEDIA_URL } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { FilterIcon, SearchLine } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { callList, callListById, forwardActionType } from '@/services/api';
import { CALL_DIRECTIONS, FORWARD_ICONS } from '@/pages/dashboard/constant';
import CustomTooltip from '@/components/custom/custom-tooltip';
import NumberWithFlag from '@/components/custom/number-with-flag';
import AudioModal from '@/pages/phone/audio-dialog';
import { transFilterObject } from '@/components/custom/custom-filter';
import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialVal } from '@/components/custom/date-dropdown/constant';
import { Loader2 } from 'lucide-react';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useQueries } from '@tanstack/react-query';
import { ACTIVITYLIST } from '@/components/activity-list/constants';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useDialpad } from '@/hooks/use-dialpad';

import { CALL_TYPE, FORWARD_TYPES_ARR, handleStatus, STATUS_TYPE } from '../constant';
import SideDrawer from '@/components/custom/side-drawer';
import IVRDetailsView from '@/components/activity-list/side-drawers/ivr-details-view';
import DepartmentDetailsView from '@/components/activity-list/side-drawers/department-details-view';
import QueueDetailsView from '@/components/activity-list/side-drawers/queue-details-view';
import TableManager from '@/components/custom/table-manager';

const timeStringToSeconds = (value: string | null | undefined) => {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    const seconds = Number(trimmedValue);
    return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : null;
  }

  const parts = trimmedValue.split(':').map((part) => Number(part));
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const seconds = parts.reduceRight((total, part, index) => {
    const multiplier = Math.pow(60, parts.length - 1 - index);
    return total + part * multiplier;
  }, 0);

  return Math.max(0, Math.floor(seconds));
};

const formatWaitTime = (row: any) => {
  const durationSeconds = timeStringToSeconds(row?.duration) ?? 0;
  const billsecSeconds = timeStringToSeconds(row?.billsec) ?? 0;
  const waitSeconds = Math.max(0, durationSeconds - billsecSeconds);

  return formatSecondsToMMSS(waitSeconds);
};

const Outbound = () => {
  const tableRef = useRef<any>(null);
  const { user } = useUser();
  const { makeCall } = useDialpad();
  const navigate = useNavigate();

  const [isFilter, setIsFiltered] = useState(false);
  const [filters, setFilters] = useState<{ key: string; value: string }[]>([]);
  const [dropdownVal, setDropdownVal] = useState(dropdownCallInitialVal);
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
  const { features } = useCompanyFeatures();
  const [selectedFilters, setSelectedFilters] = useState<any>({});
  const SITE_UUID_TEMP = selectedFilters?.site?.value;
  const callLogActionAccess = features?.plan_features?.reports?.action || {};
  const filterRef = useRef<any>(null);
  const { usersOnlineStatus } = useSocketEvents();
  const extension = user?.user_info?.extension;
  const isMeOnCall = usersOnlineStatus?.find((user) => user?.userId == extension)?.onCall;

  const handleMakeCall = (data: any) => {
    let number = '';
    if (data?.direction === 'Outbound') {
      number = data?.destination_number;
    } else {
      number = data?.caller_id_number;
    }

    const normalizedNumber = String(number || '').trim();
    if (!normalizedNumber) return;

    const extraHeaders = data?.via_did ? [`X-CallerId: ${data?.via_did}`] : [];
    makeCall(normalizedNumber, { extraHeaders });
  };

  const isOnCallWithUser = (data: any) => {
    console.log('🚀 ~ isOnCallWithUser ~ data:', data);
    // let number = '';
    // if (data?.direction === 'Outbound') {
    //   number = data?.destination_number;
    // } else {
    //   number = data?.caller_id_number;
    // }
    // const checkCall = Object.values(_uiSessions).find((call: any) => call?._number === number);

    // return checkCall ? true : false;
  };

  const filterFields = [
    {
      type: 'select',
      key: 'direction',
      label: 'Call Type',
      placeholder: 'Select Call Type',
      options: CALL_TYPE,
    },

    {
      type: 'text',
      key: 'search',
      label: 'Contact Name',
      placeholder: 'Enter Contact name/Number',
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      placeholder: 'Select Status',
      options: STATUS_TYPE,
    },
  ].filter(Boolean);

  const handleFilterChange = (data: any) => {
    setFilters(transFilterObject(data));
  };

  const handleFilterSelect = (data: any) => {
    setSelectedFilters(data);
  };

  const handleRefetchTableData = async () => {
    if (tableRef?.current) {
      setIsLoading(true);
      try {
        await tableRef.current.refetchTable();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFilter = () => {
    setIsFiltered((prev) => !prev);
    setFilters([]);
    setSelectedFilters({});
  };

  function handleOpenAudio(src: string) {
    serRecordingUrl(src);
    setModalState(true);
  }
  const handleReset = () => {
    setDropdownVal(dropdownCallInitialVal);
    filterRef?.current?.resetForm();
    setFilters([]);
    setSelectedFilters({});
  };
  const queries = useQueries({
    queries: FORWARD_TYPES_ARR.map((type) => ({
      queryKey: ['forwardActionType-call-forwarding', SITE_UUID_TEMP, type],
      queryFn: () =>
        forwardActionType({
          page: 1,
          limit: 1000,
          filters: [],
          search: '',
          site_uuid: SITE_UUID_TEMP,
          type,
        }),
      enabled: !!SITE_UUID_TEMP,
      select: (data: any) => data?.data?.data?.result?.rows || [],
    })),
  });
  const forwardActionTypeData: any = queries?.map((query) => query.data);

  const [
    // extensionList = [],
    departmentList = [],
    //  IVRList = [],
    //   queueList = []
  ] = forwardActionTypeData;

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
          <span>
            {data?.caller_id_number?.length > 5 ? (
              <span className="flex items-center gap-1">
                <NumberWithFlag number={data?.caller_id_number} />
              </span>
            ) : (
              <span className="flex flex-col">
                {data?.from_display_name || 'Unknown'}
                <span className="flex items-center">
                  <Icon name="Grid" className="w-3 h-3 text-grey-500" />
                  <small className="italic">{`(${data?.extension || 'Unknown'})`}</small>
                </span>
              </span>
            )}
          </span>
        );
      },
    },
    {
      header: 'DID',
      accessorKey: 'via_did',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <NumberWithFlag number={data?.via_did} />;
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
              // <span className="flex gap-1 items-start">
              //   <span className="flex">{FORWARD_ICONS['EXTENSION']}</span>
              //   <NumberWithFlag number={data?.destination_number} />
              // </span>
              <span className="flex flex-col">
                {data?.to_display_name || 'Unknown'}
                <span className="flex items-center">
                  <Icon name="Grid" className="w-3 h-3 text-grey-500" />
                  <small className="italic">{`(${data?.destination_number || 'Unknown'})`}</small>
                </span>
              </span>
            );
          }
          const type =
            data?.forward_type === ACTIVITYLIST?.MESSAGE
              ? ACTIVITYLIST.ANNOUNCEMENT
              : data?.forward_type;
          return (
            <span className="flex flex-col  items-start">
              <div className="flex gap-1 items-center">
                <span className="flex justify-center">{FORWARD_ICONS[type]}</span>
                {data?.forward_type === 'DEPARTMENT' && data?.destination_number ? (
                  data?.to_display_name || data?.forward_name
                ) : selectedDepartment?.name ? (
                  selectedDepartment?.name
                ) : data?.forward_type === 'DEPARTMENT' ||
                  data?.forward_type === 'IVR' ||
                  data?.forward_type === 'QUEUE' ? (
                  <span
                    // className="text-ucass-active hover:underline cursor-pointer"
                    className={
                      data?.forward_type === 'DEPARTMENT'
                        ? ''
                        : 'text-ucass-active hover:underline cursor-pointer'
                    }
                    onClick={() => {
                      if (data?.forward_type === 'DEPARTMENT') {
                        // setDrawerState((prev) => ({ ...prev, department: true }));
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
              {data?.forward_type === 'EXTENSION' || data?.forward_type === 'VOICEMAIL' ? (
                <small className="italic">{`(${data?.forward_value})`}</small>
              ) : data?.forward_type === 'DEPARTMENT' && data?.destination_number ? (
                <small className="italic">{`(${data?.destination_number})`}</small>
              ) : null}
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
          </div>
        );
        // <span className={`text capitalize ${handleStatus(status)}`}>{status}</span>;
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
      accessorKey: 'wait_time',
      cell: ({ row }: any) => {
        return <span>{formatWaitTime(row?.original)}</span>;
      },
    },
    {
      header: 'Charge',
      accessorKey: 'chargeTotal',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.chargeTotal ? data?.chargeTotal : data?.charge ? data?.charge : 0.0;
      },
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original;
        let number = '';
        if (data?.direction === 'Outbound') {
          number = data?.destination_number;
        } else {
          number = data?.caller_id_number;
        }
        const hasRecording = data?.recording_file || null;

        const recordingSrcUrl = data?.recording_file
          ? `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${data.recording_file}`
          : '';

        return (
          <span className="flex text-center gap-2 items-center">
            {callLogActionAccess?.call_recording_listen && (
              <CustomTooltip text={hasRecording ? 'Play' : 'No recording available'} side="top">
                <div
                  className={`${
                    hasRecording
                      ? 'bg-ucass-active-bg text-ucass-active hover:bg-ucass-active hover:text-white cursor-pointer'
                      : 'cursor-not-allowed bg-gray-200 border-transparent'
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
            {callLogActionAccess?.call && (
              <CustomTooltip text={'Call'} side="top">
                <span
                  className={`${isMeOnCall || isOnCallWithUser(data) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-100 text-green-500 hover:bg-green-400 hover:text-white cursor-pointer'}  flex items-center justify-center rounded-full w-8 h-8`}
                  onClick={() => handleMakeCall(data)}
                >
                  <Icon name="PhoneIcon" className="w-4 h-4" />
                </span>
              </CustomTooltip>
            )}
            {callLogActionAccess?.sms && (
              <CustomTooltip text="SMS" side="top">
                <Button
                  size="sm"
                  onClick={() => {
                    navigate(`/inbox?formState=contact&number=${number}`);
                  }}
                  className="rounded-full w-8 h-8 bg-primary/20 border-none text-primary hover:bg-primary hover:text-white"
                >
                  <Icon name="MessageStrokIcon" className="w-4.5 h-4.5" />
                </Button>
              </CustomTooltip>
            )}
          </span>
        );
      },
    },
  ];
  const Filters = (
    <div className="flex gap-2  filters">
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
          Icon={<SearchLine className=" text-gray-700" />}
        />
      </div>
      <DateDropdown
        {...{
          dropdownVal,
          setDropdownVal,
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => handleRefetchTableData()}
        className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Icon name="Refresh" className="w-5 h-5" />
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleFilter}
        className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
      >
        <FilterIcon className="w-5 h-5" />
      </Button>
    </div>
  );

  return (
    <ReportsPageLayout filters={Filters}>
      <div className="w-full  p-3 flex flex-col gap-2">
        <TableManager
          {...{
            tableRef,
            fetcherKey: 'callListingLog',
            fetcherFn: callList,
            columns,
            search,
            extraParams: {
              filter: [{ key: 'direction', value: 'Outbound' }, ...filters],
              filter_date: {
                from: dropdownVal?.value?.from,
                to: dropdownVal?.value?.to,
              },
            },
            emptyTablePlaceholder: 'No call records found',
            descriptionEmptyTable: 'Start making or receiving calls to generate call logs.',

            //for extra row
            hasSubRows: true,
            showMoreData: (_) => _?.count > 1,
            makeSubRowPayload: (_) => ({ sipcall_id: _?.sipcall_id }),
            subRowsMutateFn: callListById,
            subRowsMutateKey: 'callListById',
            isFilter,
            filterFields,
            handleFilterChange,
            handleReset,
            filterRef,
            handleFilterSelect,
          }}
        />
        <AudioModal
          modalState={modalState}
          setModalState={setModalState}
          srcUrl={recordingUrl}
          serRecordingUrl={serRecordingUrl}
        />
        {drawerState?.IVR && (
          <SideDrawer
            isTab
            isOpen={drawerState?.IVR}
            handleClose={() => setDrawerState((prev) => ({ ...prev, IVR: false }))}
            content={<IVRDetailsView rowData={rowData} />}
          />
        )}
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
        {drawerState?.QUEUE && (
          <SideDrawer
            isTab
            isOpen={drawerState?.QUEUE}
            handleClose={() => setDrawerState((prev) => ({ ...prev, QUEUE: false }))}
            content={<QueueDetailsView rowData={rowData} />}
          />
        )}
      </div>
    </ReportsPageLayout>
  );
};

export default Outbound;
