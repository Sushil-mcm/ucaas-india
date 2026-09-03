import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
// import CommonDialerWidget from '@/components/dialer/common-dialer-widget';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { cn, handleAlert } from '@/lib/utils';
import { createEventAndTask, saveNoteInLeadContact, userUpdateStatus } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getRescheduleOptions, RUNNING_CAMPAIGN_TAB_CONST, statusMessages } from '../const';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import { CALL_STATUS_CONST } from '@/components/audio-video-call/constants';
import NotesWidget from '@/components/notes';
import TextEditor from '@/components/custom/text-editor';
import Loader from '@/components/custom/loader';
import { useCampaign } from '@/hooks/use-campaign';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { presenceStatusArray, statusImageLookup } from '@/components/custom/header/constants';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useLocation, useNavigate } from 'react-router-dom';
import { DIALER_TYPE } from '../add-edit-campaign/consts';
import { ChevronIcon } from '@/assets/icons';
import { useCompanyFeatures } from '@/hooks/rbac';

const AgentRunningCampign = () => {
  const {
    activeTab,
    setActiveTab,
    setSkipState,
    isStartCampaign,
    setIsStartCampaign,
    activeItem,
    setActiveItem,
    timer,
    dispositionTimer,
    contacts,
    callWrapupState,
    setCallWrapupState,
    isCustomSchedule,
    setIsCustomSchedule,
    activeCallSessionData,
    selectedContact,
    setSelectedContact,
    setIsShowAlert,
    selectedCampaign,
    // isTranscriptOn,
    // setIsTranscriptOn,
    // isTranscriptOnOnce,
    // setIsTranscriptOnOnce,
    isContactLoading,
    setIsCampaignCall,
    setIsRunHandleCampaignEvents,
    setIsStopCampaign,
    isStopCampaign,
    waitingState,
    isWaitingMoreCampaignCall,
  } = useCampaign();
  const { features } = useCompanyFeatures();

  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { autoStart } = useLocation().state || {};
  const { user } = useUser();
  const [showPresence, setShowPresence] = useState(false);
  const queryClient: any = useQueryClient();
  const [waitingProgress, setWaitingProgress] = useState(0);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState(10);
  const [shouldExitAfterSubmit, setShouldExitAfterSubmit] = useState(false);

  const { socketEventsManager, ongoingCampaignActivity, callSummary, setCallSummary } =
    useSocketEvents();

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
  };

  const formatTime = (seconds: number) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleScheduleDate = (value: any) => {
    setCallWrapupState((prev: any) => ({
      ...prev,
      reschedule: value,
    }));

    if (value?.value === 'custom') {
      setIsCustomSchedule(true);
    } else {
      setIsCustomSchedule(false);
    }
  };

  const handleCustomSave = (date: any) => {
    if (date) {
      setCallWrapupState((prev: any) => ({
        ...prev,
        reschedule: {
          label: 'Custom',
          value: 'custom',
          utc: date,
        },
      }));
    }
  };

  const { mutateAsync: mutateUserUpdateStatus } = useMutation({
    mutationFn: userUpdateStatus,
    mutationKey: ['userUpdateStatus'],
    onSuccess: () => queryClient.invalidateQueries(['getUsersDetails'], { exact: true }),
  });

  const { mutate: dispositionMutate, isPending: isDispositionPending } = useMutation({
    mutationFn: saveNoteInLeadContact,
    onSuccess: (data) => {
      // if (!isMountedRef.current) return;
      if (callWrapupState?.reschedule?.utc) {
        handleRescheduleCall();
      } else {
        setIsRunHandleCampaignEvents(true);
        if (ongoingCampaignActivity?._id !== selectedCampaign?.value)
          handleAlert({
            text: data?.data?.message || 'Disposition added successfully!',
            type: 'success',
          });
      }
      // If "Submit and Exit" was clicked, navigate away after disposition is submitted
      if (shouldExitAfterSubmit) {
        setShouldExitAfterSubmit(false);
        setIsStopCampaign(true);
        // Small delay to allow cleanup before navigation
        setTimeout(() => {
          navigate('/my-campaigns');
        }, 100);
      }
    },
  });

  const { mutate: rescheduleCallMutate, isPending: isReschedulePending } = useMutation({
    mutationFn: createEventAndTask,
    onSuccess: (data) => {
      // if (!isMountedRef.current) return;
      setIsRunHandleCampaignEvents(true);
      if (ongoingCampaignActivity?._id !== selectedCampaign?.value)
        handleAlert({
          text: data?.data?.message || 'Disposition added successfully!',
          type: 'success',
        });
      // If "Submit and Exit" was clicked, navigate away after reschedule is submitted
      if (shouldExitAfterSubmit) {
        setShouldExitAfterSubmit(false);
        setIsStopCampaign(true);
        // Small delay to allow cleanup before navigation
        setTimeout(() => {
          navigate('/my-campaigns');
        }, 100);
      }
    },
  });

  const handleDispositionChange = () => {
    if (!callWrapupState?.disposition) return;
    const userName = `${user?.user_info?.first_name} ${user?.user_info?.last_name}`;
    const dispositionDetails = selectedCampaign?.agentDisposition?.find(
      (item: any) => item._id === callWrapupState?.disposition,
    );
    const payload = {
      disposition: {
        disposition: dispositionDetails?.disposition?.name,
        colorCode: dispositionDetails?.disposition?.colorCode,
        name: userName,
        extension: user?.user_info?.extension,
        uuid: user?.uuid,
      },
      campaign_detail: {
        campaignName: selectedCampaign?.label,
        campaignId: selectedCampaign?.value,
        campaignNumberId: selectedContact?._id,
      },
      sipcall_id: activeCallSessionData?._callID,
      // note: {
      //   note: callWrapupState?.note?.trim(),
      //   name: userName,
      //   extension: user?.user_info?.extension || '',
      //   uuid: user?.uuid || '',
      //   createdAt: moment().utc().format(),
      // },
      contact_uuid: selectedContact?.contactId,
      ...(callWrapupState?.reschedule?.utc
        ? { callback_scheduled_date: moment(callWrapupState.reschedule.utc).utc().format() }
        : {}),
    };
    dispositionMutate(payload);
  };

  const handleRescheduleCall = () => {
    const payload = {
      name: 'Call Back Schedule',
      startTime: moment(callWrapupState?.reschedule?.utc).format('YYYY-MM-DD HH:mm:ss'),
      description: '',
      category: 'TASK',
      reminderMode: ['EMAIL', 'NOTIFICATION'],
      reminder: true,
      mode: 'CALL',
      contactId: selectedContact?.contactId,
      sipCallId: activeCallSessionData?._callID,
      didNumber: selectedCampaign?.callerId || '',
      timezone: user?.settings?.operational_hours?.regional.timezone?.value || '',
      members: [
        {
          email: user?.user_info?.email || '',
          name: user?.user_info?.name || '',
          type: 'USER',
          user_uuid: user?.user_info?.uuid || '',
        },
      ],
      details: {
        contactName: `${selectedContact?.contacts?.[0]?.firstName || ''} ${selectedContact?.contacts?.[0]?.lastName || ''}`,
        contactPhone: selectedContact?.contacts?.[0]?.phone,
      },
    };
    rescheduleCallMutate(payload);
  };

  function statusChangeEvent(status: string, timeObj: any = undefined) {
    if (!socketEventsManager) return;
    socketEventsManager.emit('user-presence-update', {
      doc: {
        userId: user?.user_info?.extension,
        domain: user?.sip_credentials?.domain,
        uuid: user?.uuid,
        status: status,
        onCall: false,
        timeObj,
      },
    });
  }
  const handleStatusChange = async (status: string) => {
    const response = await mutateUserUpdateStatus({ socket_status: status });
    if (response?.status === 200) {
      // if (status !== 'online') {
      //   _stop();
      // } else {
      //   _start();
      // }
      statusChangeEvent(status, {
        holiday_start_date: null,
        holiday_end_date: null,
      });
    }
  };

  const handleMakeCall = (data: any) => {
    setSelectedContact(data);
    const number = data?.contacts?.[0]?.phone;
    console.log('🚀 ~ handleMakeCall ~ number:', number);
    const _name = `${user?.user_info?.first_name} ${user?.user_info?.last_name}`;
    console.log('🚀 ~ handleMakeCall ~ _name:', _name);
    const extraHeaders = [
      `X-CampaignUuid: ${data?.campaignId} `,
      `X-CampaignName: ${selectedCampaign?.label} `,
      `X-CampaignType: ${selectedCampaign?.dialMethod} `,
      `X-ContactName: ${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''} `,
      `X-ContactUuid: ${data?.contactId} `,
      `X-CampaignNumberUuid: ${data?._id} `,
      `X-CallerId: ${selectedCampaign?.callerId} `,
    ];
    console.log('🚀 ~ handleMakeCall ~ extraHeaders:', extraHeaders);
    // _makeCall(_name, number, '', extraHeaders);

    setSkipState((prev: any) => ({
      ...prev,
      skippedCount: 0,
    }));
    setCallSummary('');
    setIsCampaignCall(true);
  };

  useEffect(() => {
    if (autoStart && !isStartCampaign) {
      setIsStartCampaign(true);
    }
  }, [autoStart]);

  useEffect(() => {
    if (!selectedCampaign?.value) {
      navigate('/my-campaigns');
    }
  }, [selectedCampaign]);

  // Progress bar effect for waiting state
  useEffect(() => {
    if (waitingState) {
      setWaitingProgress(0);
      setWaitingTimeLeft(10);

      const interval = setInterval(() => {
        setWaitingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1; // Increment by 1% every 100ms (10 seconds total)
        });

        setWaitingTimeLeft((prev) => {
          const newTime = Math.max(0, prev - 0.1);
          return Math.round(newTime * 10) / 10; // Round to 1 decimal
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setWaitingProgress(0);
      setWaitingTimeLeft(10);
    }
  }, [waitingState]);

  return (
    <>
      {waitingState && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center gap-6">
              {/* Animated Icon with Timer */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-ucass-active-bg flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <Icon name="ClockSquare" className="w-10 h-10 text-primary" />
                    <span className="text-2xl font-bold text-primary mt-1">
                      {Math.ceil(waitingTimeLeft)}s
                    </span>
                  </div>
                </div>
                <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-[#F0DFC5]"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-primary transition-all duration-100"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - waitingProgress / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              {/* Content */}
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-[#2E2D35]">Please Wait</h3>
                <p className="text-[#9A948F] text-lg">Wait till waiting time completes</p>
                <p className="text-sm text-[#9A948F]">
                  You will be able to proceed once the waiting period is over
                </p>
              </div>
              :flag-in:
              {/* Progress Bar */}
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm text-[#9A948F]">
                  <span>Progress</span>
                  <span className="font-semibold text-primary">{Math.round(waitingProgress)}%</span>
                </div>
                <div className="h-3 bg-[#F0DFC5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-ucass-active-bg rounded-full transition-all duration-100 ease-linear"
                    style={{ width: `${waitingProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="w-full bg-gray-200/15 flex flex-col overflow-x-auto overflow-y-hidden  h-full">
        <div className="flex items-center justify-between p-3 border-b border-[rgba(225,200,165,0.9)] min-h-[65px] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
          <p className="text-[#2E2D35] font-semibold text-lg flex items-center gap-1">
            {selectedCampaign?.label}
          </p>
          {isStartCampaign && selectedCampaign?.dialMethod !== DIALER_TYPE.PREDICTIVE ? (
            <Button
              variant={'outline'}
              type="button"
              onClick={() => {
                if (isStopCampaign) {
                  navigate('/my-campaigns');
                  return;
                }
                setIsStopCampaign(true);
              }}
            >
              {isStopCampaign ? (
                <>
                  <Icon name="CloseIcon" className="w-2 h-2"></Icon> Quit
                </>
              ) : (
                <>
                  <Icon name="PauseMusic" className="w-4 h-4"></Icon> Stop Dialer
                </>
              )}
            </Button>
          ) : null}
        </div>
        <div className="p-3 w-full h-full relative overflow-hidden">
          <div className="bg-white w-full rounded-xl p-3 flex gap-3  h-[calc(100vh-9.5rem)] overflow-y-auto">
            {/* Waiting State - Inline */}
            {isWaitingMoreCampaignCall && (
              // <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-ucass-active-bg/50 to-indigo-50/50 rounded-xl p-8">
              <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-xl p-4">
                <div className="flex flex-col items-center gap-6 max-w-lg w-full">
                  {/* Animated Icon */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-green-600/10 flex items-center justify-center animate-pulse">
                      <Icon name="PhoneIcon" className="w-8 h-8 text-[#4EAE6E]" />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-green-600/20 animate-ping"></div>
                  </div>

                  {/* Content */}
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-[#2E2D35]">Waiting for Next Call</h3>
                    <p className="text-[#9A948F] text-base">
                      Please wait while we connect you to the next contact in the campaign
                    </p>
                  </div>

                  {/* Loading Indicator */}
                  <div className="w-full max-w-xs">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></div>
                    </div>
                  </div>

                  {/* Stop Campaign Button */}
                </div>
              </div>
            )}
            {!isWaitingMoreCampaignCall && (
              <>
                {
                  <div className="w-full max-w-[22rem]  border-r border-[#EEE7DD]  pr-3 h-full overflow-y-auto">
                    {/* dialer space */}
                    {/* <CommonDialerWidget
                      isShowCrossIcon={false}
                      isShowExpandIcon={false}
                      isSidebar={true}
                      callerId={selectedCampaign?.callerId}
                      extraInfo={{ selectedCampaign, selectedContact }}
                      isReschedule={false}
                      isOpenDrawer={false}
                      onAddNotes={() => setActiveTab(RUNNING_CAMPAIGN_TAB_CONST.NOTES)}
                      type="LEAD"
                      onTranscriptOpen={() =>
                        setActiveTab(RUNNING_CAMPAIGN_TAB_CONST.TRANSCRIPTION)
                      }
                    /> */}
                  </div>
                }
                {/* ------ */}
                <div className="w-full h-full ">
                  {/* tab space */}
                  {selectedContact?._id ? (
                    <Tabs
                      value={activeTab}
                      onValueChange={handleTabChange}
                      className="flex  w-full"
                    >
                      <div className="border-b border-[#EEE7DD] w-full">
                        <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none min-h-10 ">
                          {selectedCampaign?.agentScripting && (
                            <TabsTrigger
                              value={RUNNING_CAMPAIGN_TAB_CONST.SCRIPT}
                              className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6   text-[#2E2D35] cursor-pointer h-full rounded-none    m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                            >
                              {RUNNING_CAMPAIGN_TAB_CONST.SCRIPT}
                            </TabsTrigger>
                          )}
                          <TabsTrigger
                            value={RUNNING_CAMPAIGN_TAB_CONST.INFO}
                            className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6   text-[#2E2D35] cursor-pointer h-full rounded-none    m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                          >
                            {RUNNING_CAMPAIGN_TAB_CONST.INFO}
                          </TabsTrigger>
                          {/* {!activeCallKey && ( */}
                          <TabsTrigger
                            value={RUNNING_CAMPAIGN_TAB_CONST.DISPOSITION}
                            className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6   text-[#2E2D35] cursor-pointer h-full rounded-none    m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                          >
                            {RUNNING_CAMPAIGN_TAB_CONST.DISPOSITION}
                          </TabsTrigger>
                          {/* )} */}
                          {activeCallSessionData?._status === CALL_STATUS_CONST.CONNECTED &&
                          features?.plan_features?.advance_call_management?.access
                            ?.TRANSCRIPTION ? (
                            <>
                              <TabsTrigger
                                value={RUNNING_CAMPAIGN_TAB_CONST.TRANSCRIPTION}
                                className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6   text-[#2E2D35] cursor-pointer h-full rounded-none    m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                              >
                                {RUNNING_CAMPAIGN_TAB_CONST.TRANSCRIPTION}
                              </TabsTrigger>
                            </>
                          ) : null}
                          {/* {activeCallKey && */}
                          activeCallSessionData?._status === CALL_STATUS_CONST.CONNECTED ? (
                          <TabsTrigger
                            value={RUNNING_CAMPAIGN_TAB_CONST.NOTES}
                            className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6   text-[#2E2D35] cursor-pointer h-full rounded-none    m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                          >
                            {RUNNING_CAMPAIGN_TAB_CONST.NOTES}
                          </TabsTrigger>
                          {/* ) : null} */}
                        </TabsList>
                      </div>
                      <TabsContent value={RUNNING_CAMPAIGN_TAB_CONST.INFO}>
                        <div className="w-full">
                          <div className="w-full flex flex-col gap-2">
                            <p className="text-primary font-semibold text-sm ">
                              {selectedContact?.contacts?.[0]?.firstName || ''}{' '}
                              {selectedContact?.contacts?.[0]?.lastName || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">Dial Number :</span>{' '}
                              {selectedContact?.contacts?.[0]?.phone || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">Email :</span>{' '}
                              {selectedContact?.contacts?.[0]?.email || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">Job title :</span>{' '}
                              {selectedContact?.contacts?.[0]?.title || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">Industry :</span>{' '}
                              {selectedContact?.contacts?.[0]?.industry || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">Facebook :</span>{' '}
                              {selectedContact?.contacts?.[0]?.facebook || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">Twitter :</span>{' '}
                              {selectedContact?.contacts?.[0]?.twitter || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">City :</span>{' '}
                              {selectedContact?.contacts?.[0]?.city || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">State :</span>{' '}
                              {selectedContact?.contacts?.[0]?.state || ''}
                            </p>
                            <p className="text-[#2E2D35] text-sm">
                              <span className="font-semibold text-[#2E2D35]">Country :</span>{' '}
                              {selectedContact?.contacts?.[0]?.country?.value || ''}
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value={RUNNING_CAMPAIGN_TAB_CONST.SCRIPT}>
                        <div className="w-full">
                          <TextEditor
                            key={selectedCampaign?.scriptData?.[0]?.script}
                            initialValue={
                              selectedCampaign?.scriptData?.[0]?.script || [
                                {
                                  type: 'paragraph',
                                  children: [{ text: '' }],
                                },
                              ]
                            }
                            readOnly={true}
                            maxHeight={'max-h-[calc(100vh_-_14.1rem)]'}
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value={RUNNING_CAMPAIGN_TAB_CONST.NOTES}>
                        <NotesWidget
                          contactId={selectedContact?.contactId}
                          sipCallId={activeCallSessionData?._callID}
                          extraPayload={{
                            campaign_detail: {
                              campaignName: selectedCampaign?.label,
                              campaignId: selectedCampaign?.value,
                              campaignNumberId: selectedContact?._id,
                            },
                          }}
                          customClass="h-[calc(100vh_-_280px)]"
                        />
                      </TabsContent>
                      <TabsContent value={RUNNING_CAMPAIGN_TAB_CONST.TRANSCRIPTION}>
                        {features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION
                          ? null
                          : // <TranscriptionWidget
                            //   activeCallSessionData={activeCallSessionData}
                            //   extraPayload={{
                            //     campaign_detail: {
                            //       campaignName: selectedCampaign?.label,
                            //       campaignId: selectedCampaign?.value,
                            //       campaignNumberId: selectedContact?._id,
                            //     },
                            //   }}
                            //   customHeight={{ withSummary: 'h-[calc(100vh_-_24rem)]', withoutSummary: 'h-[calc(100vh_-_16.5rem)]' }}
                            //   {...{
                            //     isTranscriptOn,
                            //     setIsTranscriptOn,
                            //     isTranscriptOnOnce,
                            //     setIsTranscriptOnOnce,
                            //   }}
                            // />
                            null}
                      </TabsContent>
                      <TabsContent value={RUNNING_CAMPAIGN_TAB_CONST.DISPOSITION}>
                        <div className="w-full flex flex-col gap-2">
                          <div className="w-full max-w-48 mx-auto rounded-full bg-red-100 text-[#DC5049] p-2 flex items-center justify-center flex-col gap-1">
                            <p className="text-sm font-semibold">
                              Wrap up Timer | {formatTime(dispositionTimer)}
                            </p>
                          </div>
                          <div className="flex gap-3 w-full h-full">
                            <div className="w-1/2 p-3 border rounded-xl border-[#EEE7DD]">
                              <NotesWidget
                                contactId={selectedContact?.contactId}
                                sipCallId={activeCallSessionData?._callID}
                                extraPayload={{
                                  campaign_detail: {
                                    campaignName: selectedCampaign?.label,
                                    campaignId: selectedCampaign?.value,
                                    campaignNumberId: selectedContact?._id,
                                  },
                                }}
                                customClass="h-[calc(100vh_-_21.75rem)]"
                                defaultValue={callSummary?.msg || ''}
                              />
                            </div>
                            <div className="w-1/2  p-3 flex flex-col gap-2  border rounded-xl border-[#EEE7DD]">
                              <div className="flex flex-col gap-2">
                                <p className="text-[#2E2D35] font-semibold text-base flex items-center gap-1 mb-1">
                                  Reschedule Call
                                </p>
                                <div className="flex items-center gap-3 w-full">
                                  <CustomSelect
                                    isClearable
                                    options={getRescheduleOptions()}
                                    value={callWrapupState?.reschedule}
                                    handleChange={(value) => {
                                      handleScheduleDate(value);
                                    }}
                                  />
                                  {isCustomSchedule && (
                                    <DatePicker
                                      selected={
                                        callWrapupState?.reschedule?.utc
                                          ? moment(callWrapupState?.reschedule?.utc).toDate()
                                          : null
                                      }
                                      onChange={(date) => handleCustomSave(date)}
                                      showTimeSelect
                                      dateFormat="yyyy-MM-dd HH:mm"
                                      // className="border p-2 rounded"
                                      className="border border-gray-300 focus:border-primary focus:ring-0 
           focus:outline-none shadow-secondary/5 
           disabled:bg-gray-300 disabled:text-slate-500 
           disabled:border-[#EEE7DD] disabled:shadow-none 
           text-[#2E2D35] placeholder:text-[#2E2D35] 
           bg-white shadow-sm text-sm hover:border-primary 
           rounded-xl w-full px-3 min-h-10 custom-className"
                                    />
                                  )}
                                </div>
                                <p className="text-[#2E2D35] font-semibold text-base flex items-center gap-1 mb-1">
                                  Disposition
                                </p>
                                {/*  */}
                                <div className="w-full  h-[calc(100vh-28.8rem)] overflow-y-auto pr-1">
                                  <div className="w-full  grid grid-cols-2 gap-2">
                                    {selectedCampaign?.agentDisposition?.map(
                                      (item: any, index: number) => (
                                        <div
                                          className="w-full flex items-center gap-2 border border-[#EEE7DD] p-3 rounded-md "
                                          key={index}
                                        >
                                          <RadioGroup
                                            value={callWrapupState?.disposition}
                                            onValueChange={(value) =>
                                              setCallWrapupState((prev: any) => ({
                                                ...prev,
                                                disposition: value,
                                              }))
                                            }
                                          >
                                            <div className="flex items-center gap-3">
                                              <RadioGroupItem
                                                value={item?._id}
                                                className="cursor-pointer"
                                                // disabled={!!activeCallKey}
                                              />
                                            </div>
                                          </RadioGroup>
                                          <p className="text-sm">{item?.disposition?.name}</p>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="w-full flex justify-end gap-2 items-center">
                                {selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE ? (
                                  <>
                                    <Button
                                      variant={'outline'}
                                      type="button"
                                      onClick={() => {
                                        setShouldExitAfterSubmit(true);
                                        handleDispositionChange();
                                      }}
                                      disabled={
                                        !callWrapupState?.disposition ||
                                        isDispositionPending ||
                                        isReschedulePending
                                      }
                                    >
                                      {isDispositionPending || isReschedulePending
                                        ? 'Submit...'
                                        : 'Submit and Exit Campaign'}
                                    </Button>
                                    <Button
                                      variant={'outline'}
                                      type="button"
                                      onClick={() => {
                                        setShouldExitAfterSubmit(false);
                                        handleDispositionChange();
                                      }}
                                      disabled={
                                        !callWrapupState?.disposition ||
                                        isDispositionPending ||
                                        isReschedulePending
                                      }
                                    >
                                      {isDispositionPending || isReschedulePending
                                        ? 'Submit...'
                                        : 'Submit and Next Calls'}
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant={'outline'}
                                    type="button"
                                    onClick={() => handleDispositionChange()}
                                    disabled={
                                      !callWrapupState?.disposition ||
                                      isDispositionPending ||
                                      isReschedulePending
                                    }
                                  >
                                    {isDispositionPending || isReschedulePending
                                      ? 'Saving...'
                                      : 'Save and Finish'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : user?.socket_status !== 'online' ? (
                    <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
                      {' '}
                      <div className="flex flex-col gap-2 items-center text-center">
                        <h3 className="text-lg font-semibold text-[#2E2D35]">
                          {statusMessages[user?.socket_status]?.title ?? 'No active tasks'}
                        </h3>
                        <p className="text-[#2E2D35]">
                          {statusMessages[user?.socket_status]?.description ??
                            'You are ready to start receiving tasks'}
                        </p>
                      </div>
                      <Popover open={showPresence} onOpenChange={setShowPresence}>
                        <PopoverTrigger asChild>
                          <button className="cursor-pointer flex gap-2 items-center border rounded-md px-3 py-1.5 text-sm bg-white hover:bg-[#FBE2C8]/45">
                            <div>
                              {statusImageLookup[user?.socket_status] ??
                                statusImageLookup['online']}
                            </div>
                            <div className="capitalize text-[#2E2D35]">{user?.socket_status}</div>
                          </button>
                        </PopoverTrigger>

                        <PopoverContent
                          className="p-1 flex flex-col w-60"
                          side="left"
                          align="center"
                          sideOffset={6}
                        >
                          {presenceStatusArray.map((status) => {
                            const isActive = user?.socket_status === status.value;
                            return (
                              <div
                                key={status.value}
                                className={`flex items-center gap-2 w-full cursor-pointer px-2 rounded-md ${
                                  isActive
                                    ? 'bg-ucass-active-bg text-ucass-active'
                                    : 'hover:bg-[#F0DFC5]'
                                }`}
                                onClick={() => {
                                  if (!isActive) handleStatusChange(status.value);
                                }}
                              >
                                <div className="w-4 h-4">{statusImageLookup[status.value]}</div>
                                <div className="p-2">
                                  <div className="text-sm">{status.title}</div>
                                  <div className="text-xs text-[#9A948F]">{status.description}</div>
                                </div>
                              </div>
                            );
                          })}
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
                      <div className="flex flex-col gap-2 items-center text-center">
                        <h3 className="text-lg font-semibold text-[#2E2D35]">
                          {statusMessages[user?.socket_status]?.title ?? 'No active tasks'}
                        </h3>
                        <p className="text-[#2E2D35]">
                          {statusMessages[user?.socket_status]?.description ??
                            'You are ready to start receiving tasks'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* no tasks start */}
                </div>
                {/* ----- */}
                {/* {activeCallSessionData?._status !== CALL_STATUS_CONST.CONNECTED ? ( */}
                {selectedCampaign?.dialMethod !== DIALER_TYPE.PREDICTIVE ? (
                  <div
                    className={`w-full max-w-[22rem] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] transition-all ease-in-out duration-200 border border-[rgba(225,200,165,0.9)] p-2 rounded-lg rounded-tl-none flex flex-col gap-3 absolute top-6 ${collapsed ? '-right-90.5' : 'right-6'} `}
                  >
                    <button
                      onClick={() => setCollapsed(!collapsed)}
                      className={cn(
                        'absolute z-10 -top-[1px]   bg-primary text-white h-8 w-8 rounded-l-full p-0.5 cursor-pointer flex items-center justify-center',
                        collapsed ? ' -left-13.5' : ' -left-8',
                      )}
                    >
                      <ChevronIcon
                        className={cn(
                          'w-5 h-5 transition-transform duration-200',
                          collapsed ? 'rotate-90' : '-rotate-90',
                        )}
                      />
                    </button>
                    <div
                      className={`"w-full relative flex flex-col gap-3 ${selectedCampaign?.dialMethod === DIALER_TYPE.NORMAL ? 'h-[calc(100vh-11.5rem)]' : 'h-[calc(100vh-15.5rem)]'}  overflow-y-auto pr-1"`}
                    >
                      {/* <div className="w-full flex flex-col gap-3 mt-3 h-[calc(100vh-15.5rem)] overflow-y-auto pr-1"> */}
                      {/* items */}
                      {selectedCampaign?.dialMethod === DIALER_TYPE.NORMAL ? (
                        <>
                          <div className="w-full flex flex-col gap-2">
                            <h3 className="text-base font-semibold text-[#2E2D35]">Ongoing Lead</h3>
                            <div
                              className={`flex items-center justify-between gap-2 ${selectedContact?.contactId === selectedContact?.contactId ? 'py-2 px-3 bg-green-100  rounded-lg' : ''}`}
                            >
                              <p
                                className={`text-${selectedContact?.contactId === selectedContact?.contactId ? '[#4EAE6E]' : 'primary'} font-semibold text-sm flex items-center gap-1`}
                              >
                                {selectedContact?.contacts?.[0]?.firstName || ''}{' '}
                                {selectedContact?.contacts?.[0]?.lastName || ''}
                              </p>
                            </div>
                            <Accordion
                              className="rounded-md border border-[#EEE7DD] p-1"
                              type="single"
                              value={activeItem}
                              onValueChange={(v) => {
                                setActiveItem((p: any) => (p === v ? '' : v));
                              }}
                              collapsible
                            >
                              <AccordionItem value={selectedContact?._id}>
                                <AccordionTrigger
                                  variant="default"
                                  className="p-2 bg-[#FBE2C8]/45 rounded-md hover:no-underline font-semibold"
                                >
                                  Contact Details
                                </AccordionTrigger>
                                <AccordionContent className="p-2">
                                  <div className="w-full flex flex-col gap-1">
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">
                                        Dial Number :
                                      </span>{' '}
                                      {selectedContact?.contacts?.[0]?.phone || ''}
                                    </p>
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">Email :</span>{' '}
                                      {selectedContact?.contacts?.[0]?.email || ''}
                                    </p>
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">
                                        Job title :
                                      </span>{' '}
                                      {selectedContact?.contacts?.[0]?.title || ''}
                                    </p>
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">
                                        Industry :
                                      </span>{' '}
                                      {selectedContact?.contacts?.[0]?.industry || ''}
                                    </p>
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">
                                        Facebook :
                                      </span>{' '}
                                      {selectedContact?.contacts?.[0]?.facebook || ''}
                                    </p>
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">Twitter :</span>{' '}
                                      {selectedContact?.contacts?.[0]?.twitter || ''}
                                    </p>
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">City :</span>{' '}
                                      {selectedContact?.contacts?.[0]?.city || ''}
                                    </p>
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">State :</span>{' '}
                                      {selectedContact?.contacts?.[0]?.state || ''}
                                    </p>
                                    <p className="text-[#2E2D35] text-sm">
                                      <span className="font-semibold text-[#2E2D35]">Country :</span>{' '}
                                      {selectedContact?.contacts?.[0]?.country?.value || ''}
                                    </p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                          <div>
                            <div className="w-full flex flex-col gap-2">
                              {contacts?.length > 0 && (
                                <h3 className="text-base font-semibold text-[#2E2D35]">
                                  Leads in queue
                                </h3>
                              )}

                              {contacts && contacts?.length ? (
                                contacts
                                  ?.filter((item: any) => item?._id !== selectedContact?._id)
                                  ?.map((item: any, index: number) => {
                                    return (
                                      <div className="w-full flex flex-col gap-2">
                                        <div className={`flex items-center justify-between gap-2`}>
                                          <p
                                            className={`text-primary font-semibold text-sm flex items-center gap-1`}
                                          >
                                            {item?.contacts?.[0]?.firstName || ''}{' '}
                                            {item?.contacts?.[0]?.lastName || ''}
                                          </p>
                                        </div>
                                        <Accordion
                                          className="rounded-md border border-[#EEE7DD] p-1"
                                          type="single"
                                          value={activeItem}
                                          onValueChange={(v) => {
                                            if (index) return;
                                            setActiveItem((p: any) => (p === v ? '' : v));
                                          }}
                                          collapsible
                                        >
                                          <AccordionItem value={item?._id}>
                                            <AccordionTrigger
                                              variant="default"
                                              className="p-2 bg-[#FBE2C8]/45 rounded-md hover:no-underline font-semibold"
                                            >
                                              Contact Details
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2">
                                              <div className="w-full flex flex-col gap-1">
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    Dial Number :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.phone || ''}
                                                </p>
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    Email :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.email || ''}
                                                </p>
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    Job title :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.title || ''}
                                                </p>
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    Industry :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.industry || ''}
                                                </p>
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    Facebook :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.facebook || ''}
                                                </p>
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    Twitter :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.twitter || ''}
                                                </p>
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    City :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.city || ''}
                                                </p>
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    State :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.state || ''}
                                                </p>
                                                <p className="text-[#2E2D35] text-sm">
                                                  <span className="font-semibold text-[#2E2D35]">
                                                    Country :
                                                  </span>{' '}
                                                  {item?.contacts?.[0]?.country?.value || ''}
                                                </p>
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      </div>
                                    );
                                  })
                              ) : (
                                <div className="w-full flex items-center justify-center h-full">
                                  <h5 className="text-[#2E2D35] text-sm">
                                    {!isStartCampaign ? 'Select Campaign' : 'No Contacts Found!'}
                                  </h5>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {' '}
                          {!isContactLoading ? (
                            <>
                              {contacts && contacts?.length ? (
                                contacts?.map((item: any, index: number) => (
                                  <div className="w-full flex flex-col gap-2">
                                    <div
                                      className={`flex items-center justify-between gap-2 ${item?.contactId === selectedContact?.contactId ? 'py-2 px-3 bg-green-100  rounded-lg' : ''}`}
                                    >
                                      <p
                                        className={`text-${item?.contactId === selectedContact?.contactId ? '[#4EAE6E]' : 'primary'} font-semibold text-sm flex items-center gap-1`}
                                      >
                                        {item?.contacts?.[0]?.firstName || ''}{' '}
                                        {item?.contacts?.[0]?.lastName || ''}
                                      </p>
                                      <div className="flex items-center gap-2 ">
                                        {item?.contactId !== selectedContact?.contactId ? (
                                          <>
                                            {!index ? (
                                              <Button
                                                // className="shadow-none px-3 py-1 min-h-6 text-xs"
                                                className="cursor-pointer  bg-green-100   text-[#4EAE6E] hover:bg-green-400 hover:text-white flex items-center justify-center border-0"
                                                size={'sm'}
                                                type="button"
                                                onClick={() => handleMakeCall(item)}
                                              >
                                                <Icon name="PhoneIcon" className="w-4 h-4" />
                                                Dial Contact
                                              </Button>
                                            ) : null}
                                            {selectedCampaign?.allowSkipping && (
                                              <CustomTooltip text="Skip Contact" side="top">
                                                <span
                                                  onClick={() =>
                                                    setIsShowAlert({ isShow: true, index: index })
                                                  }
                                                  className="cursor-pointer"
                                                >
                                                  <Icon
                                                    name="SkipIcon"
                                                    className="w-5 h-5 text-[#9A948F]"
                                                  />
                                                </span>
                                              </CustomTooltip>
                                            )}
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                    <Accordion
                                      className="rounded-md border border-[#EEE7DD] p-1"
                                      type="single"
                                      value={activeItem}
                                      onValueChange={(v) => {
                                        if (index) return;
                                        setActiveItem((p: any) => (p === v ? '' : v));
                                      }}
                                      collapsible
                                    >
                                      <AccordionItem value={item?._id}>
                                        <AccordionTrigger
                                          variant="default"
                                          className="p-2 bg-[#FBE2C8]/45 rounded-md hover:no-underline font-semibold"
                                        >
                                          Contact Details
                                        </AccordionTrigger>
                                        <AccordionContent className="p-2">
                                          <div className="w-full flex flex-col gap-1">
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                Dial Number :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.phone || ''}
                                            </p>
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                Email :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.email || ''}
                                            </p>
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                Job title :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.title || ''}
                                            </p>
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                Industry :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.industry || ''}
                                            </p>
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                Facebook :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.facebook || ''}
                                            </p>
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                Twitter :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.twitter || ''}
                                            </p>
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                City :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.city || ''}
                                            </p>
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                State :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.state || ''}
                                            </p>
                                            <p className="text-[#2E2D35] text-sm">
                                              <span className="font-semibold text-[#2E2D35]">
                                                Country :
                                              </span>{' '}
                                              {item?.contacts?.[0]?.country?.value || ''}
                                            </p>
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  </div>
                                ))
                              ) : (
                                <div className="w-full flex items-center justify-center h-full">
                                  <h5 className="text-[#2E2D35] text-sm">
                                    {!isStartCampaign ? 'Select Campaign' : 'No Contacts Found!'}
                                  </h5>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full flex items-center justify-center h-full">
                              <Loader variant="blue" size="sm" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {isStartCampaign && selectedCampaign?.dialMethod === DIALER_TYPE.PREVIEW && (
                      <div className="w-full rounded-md bg-red-100 text-[#DC5049] p-2 flex items-center justify-center flex-col gap-1">
                        <p className="text-sm font-semibold">Preview Timer | {formatTime(timer)}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default AgentRunningCampign;
