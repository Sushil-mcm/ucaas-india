import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import Loader from '@/components/custom/loader';
import NumberWithFlag from '@/components/custom/number-with-flag';
import TableManager from '@/components/custom/table-manager';
import AudioModal from '@/pages/phone/audio-dialog';
import { FORWARD_ICONS } from '@/pages/dashboard/constant';
import {
  contactActivityList,
  getCampaignActivtyLogs,
  getCampaignRetryCallLogs,
  getContactCampaignActivty,
} from '@/services/api';
import { convertDateFormateApis, MEDIA_URL, SecondsTohhmmss } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useDialpad } from '@/hooks/use-dialpad';
import { useCompanyFeatures } from '@/hooks/rbac';

import { ACTIVITYLIST, renderCallerInfo, CallRecordInterface } from './constants';
import { getDispositionBadgeClass } from './disposition-badges';
import { Button } from '@/components/ui/button';
import SideDrawer from '@/components/custom/side-drawer';
import DepartmentDetailsView from './side-drawers/department-details-view';
import TranscriptInfo from '@/pages/phone/transcript-info';
import NotesView from './side-drawers/notes-view';
import { initialDrawerState } from '@/pages/phone';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Activity, Clock, PhoneCall, User } from 'lucide-react';
import moment from 'moment';
export interface Note {
  note: string;
  creator_uuid: string;
  created_at: string;
}
type ActivityType = 'contactActivityLists' | 'leadContactActivityLists' | 'campaignLogs';

interface ActivityListProps {
  contactId: string;
  activityType: ActivityType;
  payloadExtraParams?: any;
  emptyPlaceholder?: string;
  description?: string;
  showActions?: boolean;
  notesOnlyAction?: boolean;
  onTableSuccess?: (data: any) => void;
}
const renderDispositionBadge = (value: string) => {
  const cleanValue = `${value || ''}`.replace(/_/g, ' ').trim();
  const label = cleanValue
    ? cleanValue.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'No Disposition';
  const badgeClass = getDispositionBadgeClass(label);
  return <span className={badgeClass}>{label}</span>;
};

const RetryCallLogs = ({ sipcallIds }: { sipcallIds: string[] }) => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['campaignRetryCallLog', sipcallIds],
    queryFn: () =>
      getCampaignRetryCallLogs({
        page: 1,
        limit: 100,
        sipcallIds,
      }),
    enabled: !!sipcallIds?.length,
    select: (response) => response?.data?.data?.result?.rows || [],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 w-72 h-24 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-2 max-h-[350px] overflow-y-auto overflow-x-hidden p-0.5">
      <h4 className="font-bold text-sm text-gray-900 border-b border-stone-300/50 pb-2 px-1 flex items-center gap-2">
        <Activity className="w-4 h-4 text-sky-600" />
        Call History
      </h4>
      {data && data?.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-3">
          {data?.map((call: any, idx: number) => {
            const displayStatus = call?.status
              ? call?.status
                  .replace(/_/g, ' ')
                  .toLowerCase()
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
              : 'Not Dialed';
            const statusLower = call?.status?.toLowerCase();
            const isAnswered = statusLower === 'answered' || statusLower === 'connected';
            const isNotDialed =
              !call?.status || statusLower === 'not_dialed' || statusLower === 'not dialed';

            return (
              <div
                key={idx}
                className="flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-stone-300/50 bg-white shadow-sm transition-all hover:border-sky-200"
              >
                <div className="flex items-center justify-between gap-2 border-b border-stone-300/50 bg-stone-100 px-2 py-1.5">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="truncate text-xs font-medium uppercase tracking-wide">
                      {convertDateFormateApis(call?.time, 'DD MMM YYYY, hh:mm A')}
                    </span>
                  </div>
                  {call?.assignedUser?.agentCallStatus && (
                    <span
                      className={`max-w-[45%] shrink-0 truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        call?.assignedUser?.agentCallStatus === 'ANSWER'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}
                    >
                      {call?.assignedUser?.agentCallStatus}
                    </span>
                  )}
                </div>

                <div className="p-2 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                        Talk Time
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {SecondsTohhmmss(call?.billsec || 0)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                        {call?.campaignType === 'PREVIEW' || call?.campaignType === 'PROGRESSIVE'
                          ? 'Ringing'
                          : 'Wait'}{' '}
                        Time
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {SecondsTohhmmss(Math.max(0, (call?.duration || 0) - (call?.billsec || 0)))}
                      </span>
                    </div>
                  </div>

                  {call?.agent && (
                    <div className="flex items-center gap-2 border-y border-stone-300/50 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-sky-600" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-[9px] text-slate-400 font-medium uppercase leading-none">
                          {call?.campaignType === 'PREVIEW' || call?.campaignType === 'PROGRESSIVE'
                            ? 'Caller'
                            : 'Receiver'}
                        </span>
                        <span className="truncate text-[10px] font-medium text-slate-500">
                          {`${call?.agent?.[0]?.first_name || ''} ${call?.agent?.[0]?.last_name || ''}`.trim()}
                          <span className="text-slate-400 font-normal ml-1">
                            ({call?.agent?.[0]?.extension})
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {call?.status && (
                    <div className="flex min-w-0 items-center justify-between gap-2 pt-1">
                      <span className="flex min-w-0 items-center gap-1 text-[10px] font-medium uppercase tracking-tighter text-slate-500">
                        <Activity className="w-3 h-3" />
                        Call Status
                      </span>
                      <div
                        className={`max-w-[60%] shrink-0 truncate rounded border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-tight ${
                          isAnswered
                            ? 'bg-green-50 border-green-200 text-green-600'
                            : isNotDialed
                              ? 'bg-slate-50 border-slate-200 text-slate-600'
                              : 'bg-red-50 border-red-200 text-red-600'
                        }`}
                      >
                        {displayStatus || '---'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 opacity-50">
          <PhoneCall className="w-8 h-8 mb-2" />
          <span className="text-xs font-medium">No history available</span>
        </div>
      )}
    </div>
  );
};

const ActivityList = ({
  contactId = '',
  activityType = 'contactActivityLists',
  payloadExtraParams,
  emptyPlaceholder,
  description,
  showActions = true,
  notesOnlyAction = false,
  onTableSuccess = () => null,
}: ActivityListProps) => {
  const [{ url, src }, setTranscriptionState] = useState<any>(initialDrawerState);
  const [sipcallId, setSipcallId] = useState<string>('');
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const reportsActionAccess = features?.plan_features?.reports?.action || {};
  const canShowTranscriptionAction = Boolean(
    features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION,
  );
  const { makeCall } = useDialpad();
  const navigate = useNavigate();
  const [recordingUrl, setRecordingUrl] = useState('');
  const [rowData, setRowData] = useState<CallRecordInterface>();
  const [modalState, setModalState] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string>('');
  const [drawerNotes, setDrawerNotes] = useState<any[]>([]);
  const [drawerState, setDrawerState] = useState({
    transcription: false,
    notes: false,
    department: false,
  });
  const handleOpenAudio = (src: string) => {
    setRecordingUrl(src);
    setModalState(true);
  };
  const handleOpenDepartmentDrawer = (data: CallRecordInterface) => {
    const { callID = '' } = data || {};
    setSelectedCallId(callID);
    setRowData({ ...data, forward_type: 'DEPARTMENT' });
    setDrawerState((prev) => ({ ...prev, department: true }));
  };

  const handleMakeCall = (data: CallRecordInterface) => {
    const number = String(data?.phone || '').trim();
    if (!number) return;

    const extraHeaders = data?.didNumber ? [`X-CallerId: ${data?.didNumber}`] : [];
    makeCall(number, { extraHeaders });
  };
  const handleOpenTranscription = (data: CallRecordInterface) => {
    const isContactActivity =
      activityType === 'contactActivityLists' || activityType === 'campaignLogs';
    const transcriptFile = isContactActivity
      ? data?.transcript_file || data?.transcriptedFile
      : data?.members?.[0]?.transcriptedFile || null;
    const recordingFile = isContactActivity ? data?.recording_file : data?.recordfile || null;
    const basePath = `${MEDIA_URL}/${user?.company_info?.uuid}/recording`;
    setTranscriptionState({
      url: `${basePath}/${transcriptFile}`,
      src: `${basePath}/${recordingFile}`,
    });

    setDrawerState((prev) => ({ ...prev, transcription: true }));
  };

  const columns = useMemo<ColumnDef<CallRecordInterface>[]>(
    () => [
      // {
      //   accessorKey: 'createdAt',
      //   header: 'Date',
      //   cell: ({ row }) => {
      //     const { createdAt } = row?.original || {};

      //     return (
      //       <div className="flex items-center gap-2">
      //         <div className="flex flex-col items-start">
      //           <span> {convertDateFormateApis(createdAt, 'MMM DD,')}</span>
      //           <span className="text-xs">{convertDateFormateApis(createdAt, 'hh:mm A')}</span>
      //         </div>
      //       </div>
      //     );
      //   },
      // },
      // {
      //   accessorKey: 'campaignDetail',
      //   header: 'Campaign Name ',
      //   cell: ({ row }: any) => {
      //     const campaignDetail = row?.original?.campaignDetail;

      //     return campaignDetail?.campaignName || '--';
      //   },
      // },
      {
        accessorKey: 'contactName',
        header: 'Contact Name ',
        cell: ({ row }: any) => {
          const data = row?.original || {};

          return data?.contactName || '--';
        },
      },
      //  <div className="flex items-center gap-1">
      //           <span className="text-sm min-w-10 font-semibold">Name:</span>
      //           {data?.contactName || ''}
      //           {/* {data?.campaignDetail?.campaignType && <small className="italic">({data?.campaignDetail?.campaignType})</small>} */}
      //         </div>
      {
        id: 'callInfo',
        header: 'Call Info',
        cell: ({ row }: any) => {
          const data = row?.original || {};

          const { type, name, value, callInitiatorOrReceivers, didNumber, didName, isVoicemail } =
            data || {};
          const originalRecordFile =
            activityType === 'contactActivityLists' ? data?.recording_file : data?.recordfile;
          const typeUpper = type?.toUpperCase();
          const isMessage = type === ACTIVITYLIST?.MESSAGE;
          const fileSource = isMessage ? value : originalRecordFile;
          const mediaPath = isMessage ? 'greeting' : 'recording';
          const recordingSrcUrl = `${MEDIA_URL}/${user?.company_info?.uuid}/${mediaPath}/${fileSource}`;
          const shouldShowPlayer = (isMessage && !!value) || (isVoicemail && !!originalRecordFile);

          const noReceivers =
            !Array.isArray(callInitiatorOrReceivers) || callInitiatorOrReceivers?.length === 0;

          const viaContent = (
            <div className="flex gap-1">
              <span className="text-sm min-w-10 font-semibold">DID:</span>
              <span className="flex gap-0.5 items-center">
                <NumberWithFlag number={didNumber} />
                {didName && <span className="text-xs italic">({didName})</span>}
              </span>
            </div>
          );

          let toContent: React.ReactNode = null;
          console.log(toContent);

          if (
            noReceivers &&
            (typeUpper === ACTIVITYLIST?.VOICEMAIL || typeUpper === ACTIVITYLIST?.MESSAGE)
          ) {
            const isVoicemail = typeUpper === ACTIVITYLIST?.VOICEMAIL;
            const icon = FORWARD_ICONS[isVoicemail ? typeUpper : ACTIVITYLIST?.ANNOUNCEMENT];
            toContent = (
              <div className="flex flex-col">
                <span className="flex items-center gap-1">
                  {icon}
                  <span>{name || '--'}</span>
                  {isVoicemail && <small className="italic">{value ? `(${value})` : '--'}</small>}

                  {shouldShowPlayer && (
                    <CustomTooltip text="Play" side="top">
                      <span
                        className="cursor-pointer flex items-center justify-center rounded-xl w-5.5 h-5.5 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                        onClick={() => handleOpenAudio(recordingSrcUrl)}
                      >
                        <Icon name="Play" className="w-3.5 h-3.5" />
                      </span>
                    </CustomTooltip>
                  )}
                </span>
              </div>
            );
          } else {
            toContent = renderCallerInfo({
              origin: 'to',
              data: row?.original,
            });
          }

          return (
            <div className="flex flex-col gap-1">
              {/* {row?.original?.direction !== ACTIVITYLIST?.Inbound && (
                <div className="flex gap-1">
                  <span className="text-sm min-w-10 font-semibold">From:</span>
                  {data?.contactNumber || ''}
                </div>
              )} */}
              {viaContent}
              {(row?.original?.direction !== ACTIVITYLIST?.Outbound ||
                activityType === 'campaignLogs') && (
                <div className="flex gap-1">
                  <span className="text-sm min-w-10 font-semibold">To:</span>
                  {data?.contactName ? (
                    <CustomTooltip text={data?.contactName} side="right">
                      <span>{data?.contactNumber || ''}</span>
                    </CustomTooltip>
                  ) : (
                    <span>{data?.contactNumber || ''}</span>
                  )}
                </div>
              )}

              {row?.original?.campaignDetail?.campaignName ? (
                <div className="flex gap-1">
                  <span className="text-sm min-w-10 font-semibold">Campaign Name:</span>
                  <span>{row?.original?.campaignDetail?.campaignName}</span>
                </div>
              ) : null}
            </div>
          );
        },
      },

      {
        accessorKey: 'billSec',
        header: 'Duration',
        cell: ({ getValue }) => {
          const billSec = (getValue() || 0) as number;
          return (
            <div className="w-full font--sm d--flex align-items--center gap--sm">
              {SecondsTohhmmss(billSec)}
            </div>
          );
        },
      },
      {
        accessorKey: 'callEndTime',
        header: 'Last Attempt',
        cell: ({ row }: any) => {
          const data = row?.original;
          const { callEndTime } = data || {};
          if (!callEndTime) return '--';

          return (
            <div className="flex flex-col leading-tight">
              <span>{moment(callEndTime).format('MMM DD, YYYY')}</span>
              <span>{moment(callEndTime).format('h:mm A')}</span>
            </div>
          );
        },
      },
      // {
      //   accessorKey: 'status',
      //   header: 'Status',
      //   cell: ({ getValue, row }) => {
      //     const { direction, isVoicemail, duration } = row?.original || {};
      //     const isZeroDuration = duration === 0 && !isVoicemail;

      //     const displayStatus = isZeroDuration
      //       ? direction === ACTIVITYLIST?.Inbound
      //         ? ACTIVITYLIST?.Missed
      //         : direction === ACTIVITYLIST?.Outbound
      //           ? ACTIVITYLIST?.FAILED
      //           : ((getValue() ?? '') as string)
      //       : ((getValue() ?? '') as string);

      //     const status = displayStatus?.toLowerCase();
      //     return <span className={`${handleStatus(status)} capitalize`}>{status || '--'}</span>;
      //   },
      // },
      ...(activityType === 'campaignLogs'
        ? [
            {
              accessorKey: 'totalCallAttempts',
              header: 'Retries',
              meta: {
                textAlign: 'center',
              },
              cell: ({ row }: any) => {
                const data = row?.original || {};
                const sipcallIds =
                  data?.sipcallDetail
                    ?.map((item: { sipcallId: string }) => item?.sipcallId)
                    ?.filter(Boolean) || [];
                const totalAttempts = Number(data?.totalCallAttempts ?? 0) || 0;

                const badge = (
                  <div className="inline-flex items-center justify-center min-w-5 min-h-5 px-1.5 py-0.5 text-xs font-medium border border-sky-600/40 bg-sky-50 hover:bg-sky-100 text-sky-600/90 rounded-sm">
                    {totalAttempts}
                  </div>
                );

                if (!sipcallIds?.length) {
                  return (
                    <div className="w-full inline-flex items-center justify-center">{badge}</div>
                  );
                }

                return (
                  <div className="w-full inline-flex items-center justify-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="cursor-pointer">{badge}</div>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2">
                        <RetryCallLogs sipcallIds={sipcallIds} />
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              },
            },
            {
              accessorKey: 'campaignNumber',
              header: 'Agent Dispositions',
              cell: ({ row }: any) => {
                const data = row?.original;
                const { disposition = {} } = data || {};
                return renderDispositionBadge(disposition?.disposition || '');
              },
            },

            {
              accessorKey: 'systemDisposition',
              header: 'System Dispositions',
              cell: ({ row }: any) => {
                const data = row?.original;
                const { systemDisposition = '' } = data || {};
                return renderDispositionBadge(systemDisposition);
              },
            },
          ]
        : []),
      ...(showActions
        ? [
            {
              accessorKey: 'action',
              header: 'Action',
              meta: { textAlign: 'center' },
              cell: ({ row }: any) => {
                const data = row?.original || {};
                const notesList = row?.original?.notes || [];
                const isNotes = notesList?.length || false;
                const hasTranscription =
                  activityType === 'contactActivityLists' || activityType === 'campaignLogs'
                    ? data?.transcript_file || data?.transcriptedFile || null
                    : data?.members?.[0]?.transcriptedFile || null;

                if (notesOnlyAction) {
                  if (!reportsActionAccess?.note && !canShowTranscriptionAction) return null;
                  return (
                    <span className="flex text-center gap-2 items-center justify-center">
                      {reportsActionAccess?.note ? (
                        <CustomTooltip text={isNotes ? 'Notes' : 'No notes available'} side="top">
                          <div
                            className={` ${isNotes ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-400 hover:text-white cursor-pointer' : 'cursor-not-allowed bg-gray-200 border-transparent'} flex items-center justify-center rounded-full w-8 h-8`}
                            onClick={() => {
                              if (!isNotes) return;
                              setDrawerNotes(Array.isArray(notesList) ? notesList : []);
                              setDrawerState((prev) => ({ ...prev, notes: true }));
                              setSipcallId(row?.original?.sipcallID);
                            }}
                          >
                            <Icon name="NotesViewIcon" className="w-4 h-4" />
                          </div>
                        </CustomTooltip>
                      ) : null}
                      {canShowTranscriptionAction ? (
                        <CustomTooltip
                          text={
                            hasTranscription ? 'View transcription' : 'No transcription available'
                          }
                          side="top"
                        >
                          <div
                            className={` flex items-center justify-center rounded-full w-8 h-8 ${hasTranscription ? ' bg-purple-100 text-purple-500 hover:bg-purple-400 hover:text-white cursor-pointer' : 'cursor-not-allowed bg-gray-200 border-transparent'}`}
                            onClick={() => {
                              if (!hasTranscription) return;
                              handleOpenTranscription(row?.original);
                            }}
                          >
                            <Icon name="TranscriptLineIcon" className="w-4 h-4" />
                          </div>
                        </CustomTooltip>
                      ) : null}
                    </span>
                  );
                }

                const number = data?.phone;
                const recordFile =
                  activityType === 'contactActivityLists'
                    ? data?.recording_file
                    : data?.recordfile || null;

                const recordingSrcUrl = `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${recordFile}`;
                return (
                  <span className="flex text-center gap-2 items-center">
                    {activityType === 'contactActivityLists' ? (
                      <CustomTooltip text="Logs" side="top">
                        <Button
                          size="sm"
                          onClick={() => handleOpenDepartmentDrawer(row?.original)}
                          className="rounded-full w-8 h-8 border-none 
               bg-orange-100 text-orange-500 hover:bg-orange-500 hover:text-white"
                        >
                          <Icon name="LogsIcon" className="w-4 h-4 " />
                        </Button>
                      </CustomTooltip>
                    ) : (
                      <>
                        {reportsActionAccess?.call_recording_listen ? (
                          <CustomTooltip
                            text={recordFile ? 'Play' : 'No recording available'}
                            side="top"
                          >
                            <div
                              className={`${
                                recordFile
                                  ? 'bg-ucass-active-bg text-ucass-active hover:bg-ucass-active hover:text-white cursor-pointer'
                                  : 'cursor-not-allowed bg-gray-200 border-transparent'
                              } flex items-center justify-center rounded-full w-8 h-8`}
                              onClick={() => {
                                if (!recordFile) return;
                                handleOpenAudio(recordingSrcUrl);
                              }}
                            >
                              <Icon name="PlayLine" className="w-4.5 h-4.5" />
                            </div>
                          </CustomTooltip>
                        ) : null}
                        {reportsActionAccess?.note ? (
                          <CustomTooltip text={isNotes ? 'Notes' : 'No notes available'} side="top">
                            <div
                              className={` ${isNotes ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-400 hover:text-white cursor-pointer' : 'cursor-not-allowed bg-gray-200 border-transparent'} flex items-center justify-center rounded-full w-8 h-8`}
                              onClick={() => {
                                if (!isNotes) return;
                                setDrawerNotes(Array.isArray(notesList) ? notesList : []);
                                setDrawerState((prev) => ({ ...prev, notes: true }));
                                setSipcallId(row?.original?.sipcallID);
                              }}
                            >
                              <Icon name="NotesViewIcon" className="w-4 h-4" />
                            </div>
                          </CustomTooltip>
                        ) : null}
                        {canShowTranscriptionAction ? (
                          <CustomTooltip
                            text={
                              hasTranscription ? 'View transcription' : 'No transcription available'
                            }
                            side="top"
                          >
                            <div
                              className={` flex items-center justify-center rounded-full w-8 h-8 ${hasTranscription ? ' bg-purple-100 text-purple-500 hover:bg-purple-400 hover:text-white cursor-pointer' : 'cursor-not-allowed bg-gray-200 border-transparent'}`}
                              onClick={() => {
                                if (!hasTranscription) return;
                                handleOpenTranscription(row?.original);
                              }}
                            >
                              <Icon name="TranscriptLineIcon" className="w-4 h-4" />
                            </div>
                          </CustomTooltip>
                        ) : null}
                      </>
                    )}
                    {reportsActionAccess?.call ? (
                      <CustomTooltip text="Call" side="top">
                        <Button
                          size="sm"
                          className="rounded-full w-8 h-8 bg-green-100  border-none text-green-400 hover:bg-green-400 hover:text-white"
                          onClick={() => handleMakeCall(row.original)}
                        >
                          <Icon name="PhoneIcon" className="w-4 h-4" />
                        </Button>
                      </CustomTooltip>
                    ) : null}

                    {reportsActionAccess?.sms ? (
                      <CustomTooltip text="SMS" side="top">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/inbox?formState=contact&number=${number}`)}
                          className="rounded-full w-8 h-8 bg-primary/20 border-none text-primary hover:bg-primary hover:text-white"
                        >
                          <Icon name="MessageStrokIcon" className="w-4 h-4" />
                        </Button>
                      </CustomTooltip>
                    ) : null}
                  </span>
                );
              },
            },
          ]
        : []),
    ],
    [
      activityType,
      notesOnlyAction,
      showActions,
      user,
      reportsActionAccess,
      canShowTranscriptionAction,
    ],
  );
  const fetchers = {
    contactActivityLists: contactActivityList,
    leadContactActivityLists: getContactCampaignActivty,
    campaignLogs: getCampaignActivtyLogs,
  };
  return (
    <div className="w-full p-3 flex flex-col gap-2">
      <TableManager
        columns={columns}
        onSuccess={onTableSuccess}
        fetcherFn={fetchers[activityType as keyof typeof fetchers]}
        fetcherKey={activityType}
        extraParams={{
          ...(activityType === 'campaignLogs' ? {} : { contact_id: contactId }),
          ...payloadExtraParams,
        }}
        emptyTablePlaceholder={emptyPlaceholder || 'No record found'}
        descriptionEmptyTable={description || ''}
      />
      <AudioModal
        modalState={modalState}
        setModalState={setModalState}
        srcUrl={recordingUrl}
        serRecordingUrl={setRecordingUrl}
      />
      {drawerState?.transcription && (
        <SideDrawer
          isHeader
          isOpen={drawerState?.transcription}
          title="Call Intelligence"
          backgroundStyle="bg-transparent"
          handleClose={() => setDrawerState((prev) => ({ ...prev, transcription: false }))}
          content={
            <TranscriptInfo
              initialData={src}
              transcriptSrcURL={url}
              setTranscriptionState={setTranscriptionState}
            />
          }
        />
      )}
      {drawerState?.notes && (
        <SideDrawer
          isHeader
          backgroundStyle="bg-transparent"
          isOpen={drawerState?.notes}
          title=""
          handleClose={() => {
            setDrawerState((prev) => ({ ...prev, notes: false }));
            setDrawerNotes([]);
            setSipcallId('');
          }}
          content={
            <NotesView
              sipcall_id={sipcallId}
              readOnly
              customClass="h-[calc(100vh_-_35px)] mt-4"
              initialNotes={drawerNotes}
            />
          }
        />
      )}
      {drawerState?.department && (
        <SideDrawer
          isTab
          isOpen={drawerState?.department}
          handleClose={() => setDrawerState((prev) => ({ ...prev, department: false }))}
          content={<DepartmentDetailsView callId={selectedCallId} rowData={rowData} />}
        />
      )}
    </div>
  );
};

export default ActivityList;
