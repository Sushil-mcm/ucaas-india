import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageSidebarLayout from '@/layout/page-sidebar-layout';
import Calls from './calls';
import Recordings from './recordings';
import Voicemails from './voicemails';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import moment from 'moment';
import { User } from '@/assets/icons';
import { handleDownloadFile, MEDIA_URL } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import TranscriptInfo from './transcript-info';
import { useGetExtensions } from '@/hooks/common';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { AuthenticatedAudio } from '@/components/custom/authenticated-media';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AudioLines, X } from 'lucide-react';
import { useCompanyFeatures } from '@/hooks/rbac';
import Loader from '@/components/custom/loader';
import { useDialpad } from '@/hooks/use-dialpad';
import type { DialpadModalSize } from '@/context/dialpad-context';
import Dialpad from '@/components/dialpad';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { getUserNameByExtension } from '@/lib/extension-utility';
import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialVal, handleDate } from '@/components/custom/date-dropdown/constant';

export const initialDrawerState = {
  url: '',
  src: '',
};
export const initialCallDetails = {
  sipCallId: '',
  callID: '',
};
export interface ICallDetails {
  sipCallId: string;
  callID: string;
}
type LogViewMode = 'logs' | 'call-intelligence';

const parseDurationToSeconds = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value !== 'string') return 0;
  const normalized = value.trim();
  if (!normalized) return 0;
  const timeParts = normalized.split(':').map(Number);
  if (timeParts.some((part) => Number.isNaN(part))) return 0;
  if (timeParts.length === 3) {
    return timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
  }
  if (timeParts.length === 2) {
    return timeParts[0] * 60 + timeParts[1];
  }
  return 0;
};

const formatTrackDuration = (value: unknown) => {
  const totalSeconds = parseDurationToSeconds(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const isMeaningfulValue = (value: unknown) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  const lowered = normalized.toLowerCase();
  return lowered !== 'undefined' && lowered !== 'null' && lowered !== 'na';
};

const getObjectLogs = (value: unknown) =>
  Array.isArray(value) ? value.filter((item: any) => item && typeof item === 'object') : [];

const InnerSidebarPhone = ({ logData, setLogData, setTabType, callAccess, filterDate }: any) => {
  const [activeTab, setActiveTab] = useState('calls');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'calls') setTabType('call');
    else if (tab === 'recordings') setTabType('recording');
    else if (tab === 'voicemails') setTabType('voicemail');
  };

  return (
    <Tabs
      defaultValue="calls"
      className="flex  w-full"
      value={activeTab}
      onValueChange={handleTabChange}
    >
      <div className="px-0">
        <div className="border-b border-[#EEE7DD] w-full">
          <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none min-h-10 w-full">
            <TabsTrigger
              className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary  data-[state=active]:text-primary border-b-2 px-4 text-[#2E2D35] cursor-pointer h-full rounded-none w-2/4   m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs "
              value="calls"
            >
              Calls
            </TabsTrigger>
            {callAccess?.RECORDING && (
              <TabsTrigger
                className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-4 text-[#2E2D35] cursor-pointer h-full rounded-none w-2/4  m-auto relative flex gap-1 bg-transparent font-semibold  data-[state=active]:shadow-2xs"
                value="recordings"
              >
                Recordings
              </TabsTrigger>
            )}
            <TabsTrigger
              className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-4 text-[#2E2D35] cursor-pointer h-full rounded-none w-2/4  m-auto relative flex gap-1 bg-transparent font-semibold  data-[state=active]:shadow-2xs"
              value="voicemails"
            >
              Voicemails
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
      <TabsContent value="calls">
        <Calls tabType="call" logData={logData} setLogData={setLogData} filterDate={filterDate} />
      </TabsContent>
      <TabsContent value="recordings">
        <Recordings
          tabType="recording"
          logData={logData}
          setLogData={setLogData}
          filterDate={filterDate}
        />
      </TabsContent>
      <TabsContent value="voicemails">
        <Voicemails
          tabType="voicemail"
          logData={logData}
          setLogData={setLogData}
          filterDate={filterDate}
        />
      </TabsContent>
    </Tabs>
  );
};

export const LogContent = ({
  logData,
  tabType,
  setLogData,
  onHeaderBack,
  headerContactName,
  // headerContactNumber,
}: any) => {
  const { users: extensionUsers = [] } = useUsersDirectory();
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const { makeCall, sessions } = useDialpad();
  const reportsActionAccess = features?.plan_features?.reports?.action;
  const canShowTranscriptionAction = Boolean(
    features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION,
  );
  const navigate = useNavigate();
  const mainCallLogs = getObjectLogs(logData?.main?.call_logs);
  const legacyLogs = getObjectLogs(logData?.acc_logs);
  const selectedMainLog = logData?.main && typeof logData.main === 'object' ? [logData.main] : [];
  const logs = mainCallLogs.length
    ? mainCallLogs
    : legacyLogs.length
      ? legacyLogs
      : selectedMainLog;
  const hasLogs = logs.length > 0;
  const companyUuid = String(user?.company_info?.uuid ?? '').trim();
  const hasCompanyUuid = isMeaningfulValue(companyUuid);
  const [{ url, src }, setTranscriptionState] = useState<any>(initialDrawerState);
  const [activeView, setActiveView] = useState<LogViewMode>('logs');
  const [callDetails, setCallDetails] = useState<ICallDetails>(initialCallDetails);
  const [downloadingMap, setDownloadingMap] = useState<Record<string, boolean>>({});
  const [visibleAudioId, setVisibleAudioId] = useState<string | null>(null);
  const [trackDurationMap, setTrackDurationMap] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const { data: extensionList } = useGetExtensions({
    page: 1,
    limit: 1000,
    filters: [],
    search: '',
  });
  const pauseAllInlineAudio = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
    setVisibleAudioId(null);
  };

  const setInlineAudioRef = (id: string, node: HTMLAudioElement | null) => {
    if (node) {
      audioRefs.current[id] = node;
      return;
    }
    delete audioRefs.current[id];
  };

  const toggleInlineAudio = (id: string) => {
    if (visibleAudioId === id) {
      const currentAudio = audioRefs.current[id];
      currentAudio?.pause();
      if (currentAudio) currentAudio.currentTime = 0;
      setVisibleAudioId(null);
      return;
    }

    if (visibleAudioId) {
      const currentAudio = audioRefs.current[visibleAudioId];
      currentAudio?.pause();
      if (currentAudio) currentAudio.currentTime = 0;
    }
    setVisibleAudioId(id);
  };

  const getOptimisticTrackLength = (id: string, fallback: unknown) => {
    const resolvedDuration = trackDurationMap[id];
    if (typeof resolvedDuration === 'number' && resolvedDuration > 0) {
      return formatTrackDuration(resolvedDuration);
    }
    return formatTrackDuration(fallback);
  };

  useEffect(() => {
    setActiveView('logs');
    setCallDetails(initialCallDetails);
    setTranscriptionState(initialDrawerState);
    pauseAllInlineAudio();
    setTrackDurationMap({});
  }, [logData?.main?.id]);

  useEffect(() => {
    if (!visibleAudioId) return;
    const audio = audioRefs.current[visibleAudioId];
    if (!audio) return;
    audio.play().catch((error) => {
      console.error('Unable to play recording', error);
    });
  }, [visibleAudioId]);

  function handleOpenTranscription(
    transcriptUrl: string,
    recordingSrc: string,
    details: ICallDetails,
  ) {
    pauseAllInlineAudio();
    setTranscriptionState({ url: transcriptUrl, src: recordingSrc });
    setCallDetails(details);
    setActiveView('call-intelligence');
  }

  const handleMakeCall = (
    number: string,
    dialpadSize: DialpadModalSize = 'mini',
    extraHeaders: string[] = [],
  ) => {
    const normalizedNumber = String(number || '').trim();
    if (!normalizedNumber) return;

    const contactName =
      `${logData?.main?.first_name || ''} ${logData?.main?.last_name || ''}`.trim();
    const baseHeaders = [
      contactName ? `X-ContactName: ${contactName}` : '',
      logData?.main?.contact_id ? `X-ContactUuid: ${logData?.main?.contact_id}` : '',
    ].filter(Boolean) as string[];

    pauseAllInlineAudio();
    setLogData({});

    makeCall(normalizedNumber, {
      size: dialpadSize,
      extraHeaders: [...baseHeaders, ...extraHeaders],
    });
  };

  const contact_number = ['Inbound', 'Missed'].includes(logData?.main?.direction)
    ? logData?.main?.caller_id_number
    : logData?.main?.destination_number;
  const normalizedContactNumber = String(contact_number ?? '').trim();
  const canCallOrMessage = isMeaningfulValue(normalizedContactNumber);
  const resolvedHeaderName = logData?.main?.contact_name
    ? logData?.main?.contact_name
    : logData?.main?.contact_username
      ? logData?.main?.contact_username
      : headerContactName
        ? headerContactName
        : ['Missed', 'Inbound'].includes(logData?.main?.direction)
          ? logData?.main?.caller_id_number
          : logData?.main?.destination_number;

  const displayNumberExtraHeaders =
    logData?.main?.caller_id_number !== logData?.main?.display_caller_number &&
    isMeaningfulValue(logData?.main?.display_caller_number)
      ? [`X-DisplayNumber: ${String(logData?.main?.display_caller_number).trim()}`]
      : [];
  const handleHeaderBack = () => {
    if (activeView === 'call-intelligence') {
      pauseAllInlineAudio();
      setActiveView('logs');
      setCallDetails(initialCallDetails);
      return;
    }
    if (typeof onHeaderBack === 'function') {
      pauseAllInlineAudio();
      onHeaderBack();
      return;
    }
    pauseAllInlineAudio();
    setLogData({});
  };
  const iamOnCall = Object.values(sessions || {}).some((session: any) => {
    const status = String(session?.status || '').toLowerCase();
    return ['ringing', 'connecting', 'confirmed', 'calling'].includes(status);
  });

  console.log('🚀 ~ LogContent ~ logData:', logData);
  return (
    <>
      {!logData || !logData?.main ? (
        <div className="flex h-full min-h-0 w-full items-center justify-center gap-3 overflow-hidden p-3">
          <div className="flex lg:h-full lg:min-h-0 w-full items-center justify-center ">
            <Dialpad />
          </div>
        </div>
      ) : logData && logData?.main ? (
        // <div className="w-full bg-white  flex flex-col ">
        <div className="w-full bg-white flex flex-col " data-log-view={activeView}>
          {activeView === 'call-intelligence' ? (
            <div className="flex items-center w-full px-3 h-16 gap-2 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-none border-b border-[rgba(225,200,165,0.9)] min-h-[65px]">
              <CustomTooltip text="Back" side="top">
                <button
                  type="button"
                  onClick={handleHeaderBack}
                  className="flex items-center justify-center rounded-full w-9 h-9 text-[#9A948F] hover:bg-[#FBE2C8]/40 hover:text-[#2E2D35] shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </CustomTooltip>
              <p className="font-semibold text-[#2E2D35] text-md">Call Intelligence</p>
            </div>
          ) : (
            <div className="flex items-center w-full px-3 h-16 gap-2 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-none border-b border-[rgba(225,200,165,0.9)] min-h-[65px] ">
              <CustomTooltip text="Back" side="top">
                <button
                  type="button"
                  onClick={handleHeaderBack}
                  className="flex items-center justify-center rounded-full w-9 h-9 text-[#9A948F] hover:bg-[#FBE2C8]/40 hover:text-[#2E2D35] shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </CustomTooltip>
              <div className="relative">
                {resolvedHeaderName ? (
                  <CustomAvatar name={resolvedHeaderName} />
                ) : (
                  <div className="rounded-full bg-gray-300 flex items-center justify-center h-10 w-10">
                    <User className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <p className="font-semibold text-[#2E2D35] truncate text-md max-w-[calc(100vw_-_38rem)] w-full">
                    {resolvedHeaderName}{' '}
                    {isMeaningfulValue(logData?.main?.contact_type) && (
                      <span className="inline-flex items-center rounded bg-[#EFF8FF] border border-[#B2DDFF] px-1.5 py-0.5 text-[10px] font-bold text-[#175CD3] uppercase tracking-wider">
                        {logData.main.contact_type}
                      </span>
                    )}
                  </p>
                  <p className="text-[#2E2D35] truncate text-sm">
                    {logData?.main?.display_caller_number}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CustomTooltip text={'Call'} side="top">
                    <div
                      className={`${canCallOrMessage && !iamOnCall ? 'bg-green-100 text-green-500 hover:bg-green-400 hover:text-white cursor-pointer' : 'bg-gray-200 text-gray-500 cursor-not-allowed'} flex items-center justify-center rounded-full w-8 h-8`}
                      onClick={() => {
                        if (!canCallOrMessage || iamOnCall) return;
                        handleMakeCall(normalizedContactNumber, 'mini', displayNumberExtraHeaders);
                      }}
                    >
                      <Icon name="PhoneIcon" />
                    </div>
                  </CustomTooltip>
                  <CustomTooltip text="SMS" side="top">
                    <span
                      onClick={() => {
                        if (!canCallOrMessage) return;
                        navigate(`/inbox?formState=contact&number=${normalizedContactNumber}`);
                      }}
                      role="button"
                      className={`${canCallOrMessage ? 'cursor-pointer bg-[#FBE2C8]/40 text-[#2E2D35]/80 hover:bg-primary hover:text-white' : 'cursor-not-allowed bg-[#F0DFC5] text-[#9A948F]'} flex items-center justify-center rounded-full w-8 h-8`}
                    >
                      <Icon name="Letter" className="w-5 h-5" />
                    </span>
                  </CustomTooltip>
                </div>
              </div>
            </div>
          )}

          <div className="h-[calc(100vh_-_8rem)] min-h-0 overflow-hidden p-3 bg-white">
            {activeView === 'call-intelligence' ? (
              <div className="h-full min-h-0 overflow-hidden border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] rounded-xl bg-white">
                <TranscriptInfo
                  initialData={src}
                  callDetails={callDetails}
                  transcriptSrcURL={url}
                  setTranscriptionState={setTranscriptionState}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2 h-full overflow-auto">
                {hasLogs ? (
                  logs.map((log: any, index: number) => {
                    const direction = String(log?.direction ?? '').trim();
                    const isOutbound = direction === 'Outbound';
                    const isInbound = direction === 'Inbound';
                    const isMissed = direction === 'Missed';
                    const isAnsweredCall = parseDurationToSeconds(log?.billsec) > 0;
                    const recordingFile = String(log?.recording_file_url ?? '').trim();
                    const transcriptFile = String(log?.transcript_file ?? '').trim();
                    const hasRecording = isMeaningfulValue(recordingFile) && hasCompanyUuid;
                    const hasTranscription = isMeaningfulValue(transcriptFile) && hasCompanyUuid;
                    const logId = String(
                      log?.id ||
                        recordingFile ||
                        `${log?.start_stamp || 'nostamp'}-${log?.extension || 'noext'}-${index}`,
                    );
                    const recordingSrc = hasRecording
                      ? `${MEDIA_URL}/${companyUuid}/recording/${recordingFile}`
                      : '';
                    const transcriptSrc = hasTranscription
                      ? `${MEDIA_URL}/${companyUuid}/recording/${transcriptFile}`
                      : '';
                    const isInlineVisible = visibleAudioId === logId;
                    const trackLength = getOptimisticTrackLength(logId, log?.billsec);
                    const selectedUser = extensionList?.find(
                      (ex: any) => String(ex?.extension ?? '') === String(log?.extension ?? ''),
                    );
                    const rowContactNumber =
                      tabType === 'recording'
                        ? isInbound
                          ? log?.destination_number
                          : log?.caller_id_number
                        : ['all', 'call', 'voicemail'].includes(tabType)
                          ? isOutbound
                            ? log?.destination_number
                            : log?.caller_id_number
                          : isOutbound
                            ? log?.destination_number
                            : log?.caller_id_number;
                    const displayContactNumber = isMeaningfulValue(rowContactNumber)
                      ? String(rowContactNumber).trim()
                      : 'NA';
                    const rawStartStamp = String(log?.start_stamp ?? '').trim();
                    const formattedStartStamp =
                      rawStartStamp && moment(rawStartStamp).isValid()
                        ? moment(rawStartStamp).format('DD MMM, h:mm A')
                        : 'NA';
                    const viaDid = isMeaningfulValue(log?.via_did)
                      ? String(log?.via_did).trim()
                      : 'NA';
                    const isDownloadPending = !!downloadingMap[logId];

                    return (
                      <div
                        key={logId}
                        className=" border border-gray-100 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] rounded-xl p-3 bg-white "
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between gap-3">
                            <div className="flex flex-col gap-1 w-5/6 lg:w-4/6 xl:w-3/6">
                              <div className="flex gap-2 items-center justify-between">
                                <div className="bg-white gap-2 flex">
                                  <p className="font-semibold text-sm">
                                    {isOutbound ? 'Called By :' : 'Received By :'}
                                  </p>
                                  {selectedUser ? (
                                    <div className=" flex items-center justify-center">
                                      <div className=" rounded-md  flex items-center w-full gap-3">
                                        <div className="flex">
                                          <p className="text-sm">
                                            {selectedUser?.first_name || 'NA'}{' '}
                                            {selectedUser?.last_name || ''}{' '}
                                            {/* <small>({selectedUser?.extension || 'NA'})</small> */}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm">
                                      {isOutbound
                                        ? displayContactNumber
                                        : getUserNameByExtension(
                                            extensionUsers,
                                            log?.destination_number,
                                            log?.destination_number,
                                          )}
                                    </p>
                                  )}
                                </div>
                                <p className="font-medium text-sm">{formattedStartStamp}</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <p className="font-semibold text-sm">Via DID:</p>
                                  <p className="text-sm">{viaDid}</p>
                                </div>
                                <div className="flex gap-0.5 justify-end items-center">
                                  <p className="text-[#9A948F] flex items-center gap-0.5 text-xs">
                                    {hasRecording && reportsActionAccess?.call_recording_listen && (
                                      <span>
                                        <Icon name="SoundWave" className="w-4" />
                                      </span>
                                    )}
                                    {isMeaningfulValue(log?.recording_file) &&
                                      log?.is_voicemail && (
                                        <span>
                                          <Icon name="VoicemailLineIcon" className="w-4" />
                                        </span>
                                      )}
                                    <span>{trackLength}</span>
                                  </p>
                                  <div
                                    className={`flex ${
                                      isInbound
                                        ? isAnsweredCall
                                          ? 'text-green-400'
                                          : 'text-red'
                                        : isOutbound
                                          ? 'text-green-400'
                                          : ''
                                    }`}
                                  >
                                    {isOutbound ? (
                                      <Icon
                                        name="OutgoingCallStrokeIcon"
                                        className="text-green-400 w-4.5 h-4.5"
                                      />
                                    ) : isInbound || isMissed ? (
                                      isAnsweredCall ? (
                                        <Icon
                                          name="IncomingCallStrokeIcon"
                                          className="text-primary w-4.5 h-4.5"
                                        />
                                      ) : (
                                        <Icon
                                          name="MissedCallStrokeIcon"
                                          className="text-red-500 w-4.5 h-4.5"
                                        />
                                      )
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {reportsActionAccess?.call_recording_listen && (
                                <>
                                  <CustomTooltip
                                    text={
                                      hasRecording
                                        ? isInlineVisible
                                          ? 'Hide recording'
                                          : 'Show recording'
                                        : hasCompanyUuid
                                          ? 'No recording available'
                                          : 'Recording source unavailable'
                                    }
                                    side="top"
                                  >
                                    <button
                                      type="button"
                                      className={`${
                                        hasRecording
                                          ? 'bg-ucass-active-bg text-ucass-active hover:bg-ucass-active hover:text-white cursor-pointer'
                                          : 'cursor-not-allowed bg-[#F0DFC5] border-transparent'
                                      } flex items-center justify-center rounded-full w-8 h-8`}
                                      onClick={() => {
                                        if (!hasRecording) return;
                                        toggleInlineAudio(logId);
                                      }}
                                      disabled={!hasRecording}
                                      aria-label={
                                        isInlineVisible
                                          ? 'Hide recording player'
                                          : 'Show recording player'
                                      }
                                    >
                                      {isInlineVisible ? (
                                        <X className="w-5 h-5" />
                                      ) : (
                                        <AudioLines className="w-5 h-5" />
                                      )}
                                    </button>
                                  </CustomTooltip>
                                  <CustomTooltip
                                    text={
                                      hasRecording
                                        ? 'Download'
                                        : hasCompanyUuid
                                          ? 'No recording available to download'
                                          : 'Recording source unavailable'
                                    }
                                    side="top"
                                  >
                                    <div
                                      onClick={() => {
                                        if (!hasRecording || isDownloadPending) return;
                                        handleDownloadFile({
                                          fileUrl: recordingSrc,
                                          name: 'recording',
                                          setLoading: (loading) =>
                                            setDownloadingMap((prev: any) => ({
                                              ...prev,
                                              [logId]: loading,
                                            })),
                                        });
                                      }}
                                      className={`flex items-center justify-center rounded-full w-8 h-8 
  ${
    hasRecording
      ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-500 hover:text-white cursor-pointer'
      : 'cursor-not-allowed bg-[#F0DFC5] border-transparent'
  }`}
                                    >
                                      {isDownloadPending ? (
                                        <Loader />
                                      ) : (
                                        <Icon name="Download" className="w-5 h-5 " />
                                      )}
                                    </div>
                                  </CustomTooltip>
                                </>
                              )}

                              {canShowTranscriptionAction && (
                                <CustomTooltip
                                  text={
                                    hasTranscription
                                      ? 'View transcription'
                                      : hasCompanyUuid
                                        ? 'No transcription available'
                                        : 'Transcription source unavailable'
                                  }
                                  side="top"
                                >
                                  <div
                                    onClick={() => {
                                      if (!hasTranscription) return;
                                      handleOpenTranscription(transcriptSrc, recordingSrc, {
                                        sipCallId: String(log?.sipcall_id ?? ''),
                                        callID: String(log?.xml_cdr_uuid ?? ''),
                                      });
                                    }}
                                    className={` flex items-center justify-center rounded-full w-8 h-8 ${hasTranscription ? ' bg-purple-100 text-purple-500 hover:bg-purple-400 hover:text-white cursor-pointer' : 'cursor-not-allowed bg-[#F0DFC5] border-transparent'}`}
                                  >
                                    <Icon name="TranscriptLineIcon" className="w-5 h-5 " />
                                  </div>
                                </CustomTooltip>
                              )}
                            </div>
                          </div>
                          {hasRecording &&
                            reportsActionAccess?.call_recording_listen &&
                            isInlineVisible && (
                              <AuthenticatedAudio
                                ref={(node) => setInlineAudioRef(logId, node)}
                                src={recordingSrc}
                                controls
                                preload="metadata"
                                onLoadedMetadata={(event) => {
                                  const metadataDuration = event.currentTarget.duration;
                                  if (!Number.isFinite(metadataDuration) || metadataDuration <= 0) {
                                    return;
                                  }
                                  setTrackDurationMap((prev) => ({
                                    ...prev,
                                    [logId]: metadataDuration,
                                  }));
                                }}
                                onDurationChange={(event) => {
                                  const metadataDuration = event.currentTarget.duration;
                                  if (!Number.isFinite(metadataDuration) || metadataDuration <= 0) {
                                    return;
                                  }
                                  setTrackDurationMap((prev) => ({
                                    ...prev,
                                    [logId]: metadataDuration,
                                  }));
                                }}
                                className="w-full mt-2 h-10"
                              />
                            )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-[#EEE7DD] bg-white px-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#2E2D35]">No logs available</p>
                      <p className="mt-1 text-xs text-[#9A948F]">
                        Call records will appear here once this contact has activity.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full p-3 flex items-center justify-center h-full gap-3 overflow-y-auto">
          <div className="w-full flex items-center justify-center">No recod found!</div>
        </div>
      )}
    </>
  );
};

const Phone = () => {
  const [logData, setLogData] = useState<any>({});
  const [tabType, setTabType] = useState('call');
  const [mobileView, setMobileView] = useState<'dialpad' | 'listing'>('dialpad');
  const [dropdownVal, setDropdownVal] = useState(() => ({
    ...dropdownCallInitialVal,
    date_type: 'Today',
    value: handleDate('Today'),
  }));
  const { features } = useCompanyFeatures();
  const callAccess = features?.plan_features?.advance_call_management?.access;
  const { setIsDialerEnable } = useUser();

  useEffect(() => {
    if (Object.keys(logData).length) {
      setIsDialerEnable(true);
      setMobileView('dialpad'); // Switch to details view when an item is selected
    } else {
      setIsDialerEnable(false);
    }
  }, [logData]);

  return (
    <div className="flex h-full w-full flex-col lg:flex-row overflow-hidden relative">
      {/* Mobile Toggle */}
      <div className="lg:hidden flex border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] shrink-0 shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] z-10 w-full">
        <button
          className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
            mobileView === 'dialpad' ? 'border-b-2 border-primary text-primary' : 'text-[#9A948F]'
          }`}
          onClick={() => setMobileView('dialpad')}
        >
          Dialpad & Info
        </button>
        <button
          className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
            mobileView === 'listing' ? 'border-b-2 border-primary text-primary' : 'text-[#9A948F]'
          }`}
          onClick={() => setMobileView('listing')}
        >
          Listing
        </button>
      </div>

      <div
        className={`w-full lg:w-auto h-full flex-col lg:flex shrink-0 min-h-0 ${
          mobileView === 'listing' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <PageSidebarLayout
          title="Phone"
          action={
            <DateDropdown
              dropdownVal={dropdownVal}
              setDropdownVal={setDropdownVal}
              customPickerPlacement="bottom"
            />
          }
          content={
            <InnerSidebarPhone
              logData={logData}
              setLogData={setLogData}
              setTabType={setTabType}
              callAccess={callAccess}
              filterDate={dropdownVal.value}
            />
          }
        />
      </div>

      <div
        className={`w-full lg:flex-1 h-full flex-col lg:flex min-w-0 min-h-0 ${
          mobileView === 'dialpad' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <LogContent
          logData={logData}
          tabType={tabType}
          setLogData={setLogData}
          callAccess={callAccess}
          onHeaderBack={() => {
            setMobileView('listing');
            setLogData({});
          }}
        />
      </div>
    </div>
  );
};

export default Phone;
