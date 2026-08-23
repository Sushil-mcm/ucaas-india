import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Icon } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import NumberWithFlag from '@/components/custom/number-with-flag';
import TableManager from '@/components/custom/table-manager';
import AudioModal from '@/pages/phone/audio-dialog';
import { CALL_DIRECTIONS, FORWARD_ICONS } from '@/pages/dashboard/constant';
import { handleStatus } from '@/pages/reports/call-logs/constant';
import { convertDateFormateApis, MEDIA_URL, SecondsTohhmmss } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useDialpad } from '@/hooks/use-dialpad';
import { useCompanyFeatures } from '@/hooks/rbac';

import SideDrawer from '@/components/custom/side-drawer';
import TranscriptInfo from '@/pages/phone/transcript-info';
import { initialDrawerState } from '@/pages/phone';
import { ACTIVITYLIST, CallRecordInterface } from '../activity-list/constants';
import { RawCallLog } from './constants';
import NotesView from '../activity-list/side-drawers/notes-view';
export interface Note {
  note: string;
  creator_uuid: string;
  created_at: string;
}
interface ActivityListProps {
  data?: CallRecordInterface[];
}
const CallHistoryLogs = ({ data }: ActivityListProps) => {
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const reportsActionAccess = features?.plan_features?.reports?.action || {};
  const canShowTranscriptionAction = Boolean(
    features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION,
  );
  const { makeCall } = useDialpad();
  const navigate = useNavigate();
  const [recordingUrl, setRecordingUrl] = useState('');
  const [modalState, setModalState] = useState(false);
  const [{ url, src }, setTranscriptionState] = useState<any>(initialDrawerState);
  const [sipcallId, setSipcallId] = useState<string>('');
  const [drawerCallData, setDrawerCallData] = useState<RawCallLog | null>(null);
  const [drawerState, setDrawerState] = useState({
    transcription: false,
    notes: false,
  });
  const handleOpenAudio = (src: string) => {
    setRecordingUrl(src);
    setModalState(true);
  };
  const handleMakeCall = (data: RawCallLog) => {
    const number = String(data?.caller_id_number || '').trim();
    if (!number) return;
    makeCall(number);
  };
  const handleOpenTranscription = (data: RawCallLog) => {
    const url = `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${data?.transcript_file}`;
    const src = `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${data?.recording_file}`;
    setTranscriptionState({ url, src });
    setDrawerState((prev) => ({ ...prev, transcription: true }));
  };
  const columns = useMemo<ColumnDef<RawCallLog>[]>(
    () => [
      {
        accessorKey: 'start_stamp',
        header: 'Date',
        cell: ({ row }) => {
          const { start_stamp, direction, is_voicemail, billsec, forward_type, status } =
            row?.original || {};
          let displayDirection = direction;

          if (forward_type === ACTIVITYLIST?.VOICEMAIL && status === ACTIVITYLIST?.VOICEMAIL) {
            displayDirection = ACTIVITYLIST?.Voicemail;
          } else if (forward_type === ACTIVITYLIST?.MESSAGE) {
            displayDirection = ACTIVITYLIST?.Announcement;
          } else if (!is_voicemail && billsec === 0 && direction === ACTIVITYLIST?.Inbound) {
            displayDirection = ACTIVITYLIST?.Missed;
          } else {
            displayDirection = direction;
          }

          return (
            <CustomTooltip text={displayDirection}>
              <div className="flex items-center gap-2">
                {CALL_DIRECTIONS[displayDirection]}
                <div className="flex flex-col items-start">
                  <span> {convertDateFormateApis(start_stamp, 'MMM DD,')}</span>
                  <span className="text-xs">{convertDateFormateApis(start_stamp, 'hh:mm A')}</span>
                </div>
              </div>
            </CustomTooltip>
          );
        },
      },
      {
        id: 'callInfo',
        header: 'Call Info',
        cell: ({ row }) => {
          const {
            direction, //ok
            caller_destination,
            extension, //ok
            destination_number,
            caller_id_number,
            did_name,
            forward_type,
            forward_name,
          } = row?.original || {};
          const viaContent = (
            <div className="flex gap-1">
              <span className="text-sm min-w-10 font-semibold">DID:</span>
              <span className="flex gap-0.5 items-center">
                <NumberWithFlag
                  number={
                    direction == ACTIVITYLIST.Outbound ? caller_id_number : caller_destination
                  }
                />
                {did_name && <span className="text-xs italic">({did_name})</span>}
              </span>
            </div>
          );

          return (
            <div className="flex flex-col gap-1">
              <div className="flex gap-1 items-center">
                <span className="text-sm min-w-10 font-semibold">From:</span>
                {direction == ACTIVITYLIST?.Inbound && caller_id_number ? (
                  <NumberWithFlag number={caller_id_number} />
                ) : (
                  <span className="flex items-center gap-1">
                    <CustomTooltip text={forward_type} side="left">
                      {FORWARD_ICONS[ACTIVITYLIST?.EXTENSION]}
                    </CustomTooltip>

                    {forward_name}
                    <small className="italic">{extension ? `(${extension})` : '--'}</small>
                  </span>
                )}
              </div>
              {viaContent}
              <div className="flex gap-1">
                <span className="text-sm min-w-10 font-semibold">To:</span>
                {direction == ACTIVITYLIST?.Outbound && destination_number ? (
                  <span className="flex gap-1">
                    {forward_type == ACTIVITYLIST?.PHONE && (
                      <CustomTooltip text={forward_type} side="left">
                        {FORWARD_ICONS[ACTIVITYLIST?.PHONE]}
                      </CustomTooltip>
                    )}
                    <NumberWithFlag number={destination_number} />
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CustomTooltip text={forward_type} side="left">
                      {FORWARD_ICONS[ACTIVITYLIST?.DEPARTMENT]}
                    </CustomTooltip>
                    {forward_name}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: 'billsec',
        header: 'Duration',
        cell: ({ getValue }) => {
          const billsec = (getValue() || 0) as number;
          return (
            <div className="w-full font--sm d--flex align-items--center gap--sm">
              {SecondsTohhmmss(billsec)}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue, row }) => {
          const { direction, is_voicemail, billsec } = row?.original || {};
          const isZeroDuration = billsec === 0 && !is_voicemail;

          const displayStatus = isZeroDuration
            ? direction === ACTIVITYLIST?.Inbound
              ? ACTIVITYLIST?.Missed
              : direction === ACTIVITYLIST?.Outbound
                ? ACTIVITYLIST?.Cancelled
                : ((getValue() ?? '') as string)
            : ((getValue() ?? '') as string);

          const status = displayStatus?.toLowerCase();
          return <span className={`${handleStatus(status)} capitalize`}>{status || '--'}</span>;
        },
      },
      {
        accessorKey: 'action',
        header: 'Action',
        meta: { textAlign: 'center' },
        cell: ({ row }) => {
          const number = row?.original?.caller_id_number;
          const hasTranscription = Boolean(row?.original?.transcript_file);
          const recordFile = row?.original?.recording_file;
          const recordingSrcUrl = `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${recordFile}`;
          return (
            <span className="flex text-center gap-2 items-center">
              {reportsActionAccess?.call_recording_listen ? (
                <CustomTooltip text={recordFile ? 'Play' : 'No recording available'} side="top">
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
                <CustomTooltip text="Notes" side="top">
                  <div
                    onClick={() => {
                      // console.log(row?.original, 'NOttteees');

                      setDrawerState((prev) => ({ ...prev, notes: true }));
                      setSipcallId(row?.original?.sipcall_id);
                      setDrawerCallData(row?.original);
                    }}
                    className="bg-yellow-100 text-yellow-500 hover:bg-yellow-400 hover:text-white cursor-pointer flex items-center justify-center rounded-full w-8 h-8"
                  >
                    <Icon name="NotesViewIcon" className="w-4 h-4" />
                  </div>
                </CustomTooltip>
              ) : null}
              {canShowTranscriptionAction ? (
                <CustomTooltip
                  text={hasTranscription ? 'View transcription' : 'No transcription available'}
                  side="top"
                >
                  <div
                    onClick={() => {
                      if (!hasTranscription) return;
                      handleOpenTranscription(row.original);
                    }}
                    className={` flex items-center justify-center rounded-full w-8 h-8 ${hasTranscription ? ' bg-purple-100 text-purple-500 hover:bg-purple-400 hover:text-white cursor-pointer' : 'cursor-not-allowed bg-gray-200 border-transparent'}`}
                  >
                    <Icon name="TranscriptLineIcon" className="w-4 h-4" />
                  </div>
                </CustomTooltip>
              ) : null}
              {reportsActionAccess?.call ? (
                <CustomTooltip text="Call" side="top">
                  <div
                    className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-green-100 text-green-500 hover:bg-green-400 hover:text-white"
                    onClick={() => handleMakeCall(row.original)}
                  >
                    <Icon name="PhoneIcon" className="w-4 h-4" />
                  </div>
                </CustomTooltip>
              ) : null}
              {reportsActionAccess?.sms ? (
                <CustomTooltip text="SMS" side="top">
                  <div
                    onClick={() => navigate(`/inbox?formState=contact&number=${number}`)}
                    className="text-primary bg-primary/20 hover:bg-primary hover:text-white cursor-pointer flex items-center justify-center rounded-full w-8 h-8"
                  >
                    <Icon name="MessageStrokIcon" className="w-4 h-4" />
                  </div>
                </CustomTooltip>
              ) : null}
            </span>
          );
        },
      },
    ],
    [user, reportsActionAccess, navigate, canShowTranscriptionAction],
  );

  return (
    <div className="w-full bg-white flex flex-col gap-3">
      <TableManager columns={columns} staticData={data} showPagination={false} />
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
          handleClose={() => setDrawerState((prev) => ({ ...prev, notes: false }))}
          content={
            <NotesView
              sipcall_id={sipcallId}
              customClass=" mt-4 h-[calc(100vh_-_100px)]"
              drawerCallData={drawerCallData}
            />
          }
        />
      )}
    </div>
  );
};

export default CallHistoryLogs;
