// import { getSessionData } from '@/components/dialer/utils';

import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import { getRunningCampaigns, makeCallQueueAvailable } from '@/services/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  CAMPAIGN_STATUS_CONST,
  RUNNING_CAMPAIGN_TAB_CONST,
} from '@/pages/auto-dialer/campaign/const';
import moment from 'moment';
import { CALL_STATUS_CONST } from '@/components/audio-video-call/constants';
import { useCampaign } from '@/hooks/use-campaign';
import AlertConfirm from '../custom/alert-confirm';
import { DIALER_TYPE } from '@/pages/auto-dialer/campaign/add-edit-campaign/consts';

const AgentRunningCampignOuter = () => {
  const {
    setActiveTab,
    isStartCampaign,
    setIsStartCampaign,
    setActiveItem,
    skipState,
    setSkipState,
    timer,
    setTimer,
    setDispositionTimer,
    contacts,
    setContacts,
    callWrapupState,
    setCallWrapupState,
    isRunHandleCampaignEvents,
    activeCallSessionData,
    setActiveCallSessionData,
    selectedContact,
    setSelectedContact,
    setIsShowAlert,
    selectedCampaign,
    setSelectedCampaign,
    setIsTranscriptOn,
    setIsTranscriptOnOnce,
    setIsContactLoading,
    setIsCampaignCall,
    timerRef,
    dispositionTimerRef,
    isMountedRef,
    setCampaignList,
    isShowAlert,
    setIsRunHandleCampaignEvents,
    isStopCampaign,
    setIsStopCampaign,
    setWaitingState,
    isWaitingMoreCampaignCall,
    setIsWaitingMoreCampaignCall,
    isCampaignCall,
  } = useCampaign();

  const { handleRemoveUser, user } = useUser();
  const [terminatedTime, setTerminatedTime] = useState<any>(null);

  // Refs to always access latest state in socket callbacks
  const contactsRef = useRef(contacts);
  const selectedCampaignRef = useRef(selectedCampaign);
  const activeCallSessionDataRef = useRef(activeCallSessionData);
  const selectedContactRef = useRef(selectedContact);
  const callWrapupStateRef = useRef(callWrapupState);
  const isStartCampaignRef = useRef(isStartCampaign);
  const isWaitingMoreCampaignCallRef = useRef(isWaitingMoreCampaignCall);

  // Keep refs in sync with state
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    selectedCampaignRef.current = selectedCampaign;
  }, [selectedCampaign]);

  useEffect(() => {
    activeCallSessionDataRef.current = activeCallSessionData;
  }, [activeCallSessionData]);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    callWrapupStateRef.current = callWrapupState;
  }, [callWrapupState]);

  useEffect(() => {
    isStartCampaignRef.current = isStartCampaign;
  }, [isStartCampaign]);

  useEffect(() => {
    isWaitingMoreCampaignCallRef.current = isWaitingMoreCampaignCall;
  }, [isWaitingMoreCampaignCall]);

  const {
    socketEventsManager,
    ongoingCampaignActivity,
    setOngoingCampaignActivity,
    // setLiveTranscriptionList, // Unused here now
    disconnectSocket,
    setCallSummary,
  } = useSocketEvents();

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
  };

  const {
    data: campaignList = [],
    refetch: refetchCampaigns,
    isLoading: isCampaignListLoading,
  } = useQuery({
    queryKey: ['getRunningCampaignsList'],
    queryFn: () => getRunningCampaigns(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  useEffect(() => {
    if (campaignList?.length > 0 && !isCampaignListLoading) {
      setCampaignList(campaignList);
    }
  }, [campaignList, isCampaignListLoading]);

  const { mutateAsync: mutateMakeAvailable } = useMutation({
    mutationFn: makeCallQueueAvailable,
  });

  const handleMakeAvailable = useCallback(
    async (campaignId: string, status: string = 'On Break', state: string = 'Waiting') => {
      try {
        const payload = {
          campaign_uuid: campaignId,
          status,
          state,
        };
        console.log('🚀 ~ AgentRunningCampignOuter ~ payload:', payload);
        // await mutateMakeAvailable(payload);
      } catch (error) {
        console.error('Failed to make available:', error);
      }
    },
    [mutateMakeAvailable],
  );

  const handleMakeAvailableRef = useRef(handleMakeAvailable);

  useEffect(() => {
    handleMakeAvailableRef.current = handleMakeAvailable;
  }, [handleMakeAvailable]);

  const handleEndDisposition = () => {
    console.log('under end disposition');
    // if (!isMountedRef.current) return;
    if (isStopCampaign) {
      stopCampaign();
      return;
    }
    setIsRunHandleCampaignEvents(false);
    setIsTranscriptOn(false);
    setIsTranscriptOnOnce(false);
    stopDispositionTimer();
    setActiveCallSessionData(null);
    // setLiveTranscriptionList([]); // Persistent transcripts
    setSelectedContact(null);
    setCallWrapupState({
      note: null,
      disposition: null,
      rescheduleTime: null,
    });
    setIsCampaignCall(false);
    if (selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE) {
      handleRequestNextCall();
      setIsWaitingMoreCampaignCall(true);
    }
    // Use ref to get latest campaign state
    const currentCampaign = selectedCampaignRef.current;
    if (
      ongoingCampaignActivity?._id === currentCampaign?.value &&
      ongoingCampaignActivity?.campaignStatus === CAMPAIGN_STATUS_CONST.PAUSE
    )
      handleOngoingCampaignActivity();
    else handleSkipContact();
  };

  const startTimer = () => {
    stopTimer();
    // Use ref to get latest campaign settings
    const currentCampaign = selectedCampaignRef.current;
    const previewTime = currentCampaign?.dialerSetting?.preview_time || 0;
    setTimer(previewTime);

    timerRef.current = setInterval(() => {
      setTimer((prev: any) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // helper to format mm:ss

  const getContacts = () => {
    // if (!isMountedRef.current) return;
    setIsContactLoading(true);
    // socketEventsManager?.emit(
    //   'campaign-preview-contact-list',
    //   {
    //     data: {
    //       campaignId: selectedCampaign?.value,
    //       user_uuid: user?.uuid,
    //       company_uuid: user?.company_info?.uuid,
    //     },
    //   },
    //   (data: any) => {
    //     console.log('data', data);
    //   },
    // );
  };

  const handleSkipContact = (index: number = 0) => {
    if (selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE) return;
    // if (!isMountedRef.current) return;
    stopTimer();
    // Use ref to get the latest contacts state
    const currentContacts = contactsRef.current;
    if (currentContacts?.length === 1) {
      setContacts([]);
      setActiveItem('');
      setWaitingState(true);
      setTimeout(() => {
        getContacts();
      }, 10000);
    } else {
      const updated = currentContacts.filter((_: any, i: any) => i !== index);
      setContacts(updated);
      // Use ref to get latest campaign settings
      const currentCampaign = selectedCampaignRef.current;
      if (currentCampaign?.dialMethod === DIALER_TYPE.NORMAL) handleMakeCall(updated?.[0]);
      if (updated.length > 0) {
        setActiveItem(updated[0]?._id);
      } else {
        setActiveItem('');
      }
      if (currentContacts.length > 1) {
        startTimer();
      }
    }
    setIsCampaignCall(false);
    setIsShowAlert({ isShow: false, index: 0 });
  };

  const handleMakeCall = (data: any) => {
    setSelectedContact(data);
    const number = data?.contacts?.[0]?.phone;
    console.log('🚀 ~ handleMakeCall ~ number:', number);
    const _name = `${user?.user_info?.first_name} ${user?.user_info?.last_name}`;
    console.log('_name', _name);
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
    setSkipState((prev: any) => ({
      ...prev,
      skippedCount: 0,
    }));

    // _makeCall(_name, number, '', extraHeaders);
    setCallSummary('');
    setIsCampaignCall(true);
  };

  const startCampaign = () => {
    if (!selectedCampaign?.value) return;
    handleStartStop('INSERT');
    stopTimer();
    setContacts([]);
    // setIsStartCampaign(true);
    if (selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE) {
      handleRequestNextCall();
      // if (!activeCallKey) setIsWaitingMoreCampaignCall(true);
    } else {
      getContacts();
      startTimer();
    }
  };

  const handleRequestNextCall = () => {
    socketEventsManager?.emit(
      'campaign-system-events',
      {
        campaignId: selectedCampaign?.value,
        queue: selectedCampaign?.queue || '',
      },
      (res: any) => {
        const firstLevel = Array.isArray(res) ? res[0] : null;
        const eventPayload = Array.isArray(firstLevel) ? firstLevel[0] : firstLevel;
        const campaignStatusFromEvent = String(eventPayload?.campaignStatus || '')
          .trim()
          .toUpperCase();
        if (campaignStatusFromEvent === 'COMPLETED') {
          stopCampaignRef.current?.();
        }
      },
    );
  };

  const stopCampaign = async () => {
    // Use ref to get latest campaign state before clearing it
    const currentCampaign = selectedCampaignRef.current;

    // If dialMethod is PREDICTIVE, call handleMakeAvailable with status "On Break" and state "Waiting"
    if (currentCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE && currentCampaign?.value) {
      await handleMakeAvailable(currentCampaign.value, 'On Break', 'Waiting');
    }

    handleStartStop('DELETE');
    stopTimer();
    setIsStartCampaign(false);
    setContacts([]);
    setTimer(0);
    setSelectedCampaign(null);
    stopDispositionTimer();
    setActiveCallSessionData(null);
    setSelectedContact(null);
    setIsCampaignCall(false);
    isMountedRef.current = false;
    setIsStopCampaign(false);
    setWaitingState(false);
    setSkipState({
      skippedCount: 0,
      totalCount: 0,
    });
    setIsShowAlert({ isShow: false, index: 0 });
    setIsWaitingMoreCampaignCall(false);
    // if (activeCallKey) _terminate(activeCallKey);
  };

  const stopCampaignRef = useRef(stopCampaign);

  useEffect(() => {
    stopCampaignRef.current = stopCampaign;
  }, [stopCampaign]);

  // Ref to store the waiting interval
  const waitingTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 30-second timeout for waiting for call in predictive campaign
  useEffect(() => {
    // Clear any existing timeout
    if (waitingTimeoutRef.current) {
      clearInterval(waitingTimeoutRef.current);
      waitingTimeoutRef.current = null;
    }

    // If waiting for call, start 30-second interval checks.
    if (
      isWaitingMoreCampaignCall &&
      selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE &&
      isStartCampaign
    ) {
      waitingTimeoutRef.current = setInterval(() => {
        const activeCallStatus = String(activeCallSessionDataRef.current?._status || '')
          .trim()
          .toLowerCase();
        const hasActiveCall = Boolean(
          activeCallStatus && !['ended', 'failed'].includes(activeCallStatus),
        );
        if (hasActiveCall) {
          return;
        }

        // Check again if still waiting and no call came.
        const currentCampaign = selectedCampaignRef.current;
        if (
          isWaitingMoreCampaignCallRef.current &&
          currentCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE
        ) {
          // Request next call instead of stopping campaign.
          socketEventsManager?.emit(
            'campaign-system-events',
            {
              campaignId: currentCampaign?.value,
              queue: currentCampaign?.queue || '',
            },
            (res: any) => {
              const firstLevel = Array.isArray(res) ? res[0] : null;
              const eventPayload = Array.isArray(firstLevel) ? firstLevel[0] : firstLevel;
              const campaignStatusFromEvent = String(eventPayload?.campaignStatus || '')
                .trim()
                .toUpperCase();
              if (campaignStatusFromEvent === 'COMPLETED') {
                stopCampaignRef.current?.();
              }
            },
          );
        }
      }, 30000);
    }

    // Cleanup on unmount or when conditions change
    return () => {
      if (waitingTimeoutRef.current) {
        clearInterval(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
    };
  }, [
    isWaitingMoreCampaignCall,
    selectedCampaign?.dialMethod,
    isStartCampaign,
    socketEventsManager,
  ]);

  useEffect(() => {
    if (skipState.skippedCount > 0 && skipState.skippedCount === skipState.totalCount) {
      stopCampaign();
    }
  }, [skipState]);

  const handleStartStop = (eventType: string = 'INSERT') => {
    socketEventsManager?.emit('campaign-event-logs', {
      // doc: {
      campaignDetail: {
        campaignName: selectedCampaign?.label,
        campaignId: selectedCampaign?.value,
        companyId: selectedCampaign?.companyId,
      },
      eventType: eventType,
      userDetail: {
        name: `${user?.user_info?.first_name} ${user?.user_info?.last_name}`,
        email: user?.user_info?.email,
        extension: user?.user_info?.extension,
        user_uuid: user?.uuid,
        company_uuid: user?.company_info?.uuid,
      },
      // },
    });
  };

  useEffect(() => {
    if (timer === 0 && contacts.length) {
      if (contacts?.length) {
        handleCampaignEvents({ skippingContact: false, doNothing: true }, contacts?.[0]);
        // handleSkipContact();
      } else {
        // Disconnect socket first to prevent any socket events from firing
        disconnectSocket();
        // Small delay to ensure socket cleanup completes before clearing user data
        setTimeout(() => {
          handleRemoveUser();
        }, 100);
      }
    }
  }, [timer]);

  // useEffect(() => {
  //   if (
  //     activeCallKey &&
  //     _uiSessions &&
  //     _uiSessions[activeCallKey] &&
  //     [
  //       CALL_STATUS_CONST.CONNECTING,
  //       CALL_STATUS_CONST.RINING,
  //       CALL_STATUS_CONST.CONNECTED,
  //     ].includes(_uiSessions[activeCallKey]?._status)
  //   ) {
  //     setIsWaitingMoreCampaignCall(false);
  //     const forwardType =
  //       _uaSessions?.[activeCallKey]?._request?.headers?.['X-Forwardtype']?.[0]?.raw;
  //     if (forwardType === 'CAMPAIGN' && selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE) {
  //       const numberUuid =
  //         _uaSessions?.[activeCallKey]?._request?.headers?.['X-Campaignnumberuuid']?.[0]?.raw;
  //       setIsCampaignCall(true);
  //       setSelectedContact({ _id: numberUuid });
  //       handleGetContatcInfo();
  //     }

  //     setActiveCallSessionData(getSessionData(activeCallKey, _uiSessions));
  //   }
  // }, [activeCallKey, _uiSessions?.[activeCallKey]]);

  // const handleGetContatcInfo = () => {
  //   console.log(
  //     'number uuid',
  //     _uaSessions?.[activeCallKey]?._request?.headers?.['X-Campaignnumberuuid'],
  //   );
  //   const numberUuid =
  //     _uaSessions?.[activeCallKey]?._request?.headers?.['X-Campaignnumberuuid']?.[0]?.raw;
  //   socketEventsManager?.emit(
  //     'campaign-contact-details',
  //     {
  //       campaignNumberUuid: numberUuid,
  //     },
  //     (data: any) => {
  //       console.log('data', data);
  //     },
  //   );
  // };

  const handleOngoingCampaignActivity = () => {
    if (
      ongoingCampaignActivity?._id === selectedCampaign?.value &&
      ongoingCampaignActivity?.campaignStatus === CAMPAIGN_STATUS_CONST.PAUSE
    )
      stopCampaign();
    handleAlert({
      text: `${ongoingCampaignActivity?.name} has been ${ongoingCampaignActivity?.campaignStatus === CAMPAIGN_STATUS_CONST.PAUSE ? 'paused' : 'started'} by admin `,
      type:
        ongoingCampaignActivity?.campaignStatus === CAMPAIGN_STATUS_CONST.PAUSE
          ? 'error'
          : 'success',
    });
    refetchCampaigns();
    setOngoingCampaignActivity(null);
  };

  const stopDispositionTimer = () => {
    clearInterval(dispositionTimerRef.current);
    dispositionTimerRef.current = null;
  };

  const startDipositionTimer = () => {
    stopTimer();
    // Use ref to get latest campaign settings
    const currentCampaign = selectedCampaignRef.current;
    const previewTime = currentCampaign?.dialerSetting?.wrapup_time || 0;
    setDispositionTimer(previewTime);

    dispositionTimerRef.current = setInterval(() => {
      setDispositionTimer((prev: any) => {
        if (prev <= 1) {
          if (selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE) handleEndDisposition();
          else handleCampaignEvents();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCampaignEvents = (
    extraPayload: any = { skippingContact: false, doNothing: false },
    contact: any = null,
  ) => {
    if (selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE) return;
    const _name = `${user?.user_info?.first_name} ${user?.user_info?.last_name}`;
    console.log('🚀 ~ handleMakeCall ~ _name:', _name);
    console.log('🚀 ~ handleMakeCall ~ _name:', _name);
    console.log('🚀 ~ handleMakeCall ~ _name:', _name);
    // Use refs to get latest state
    const currentCampaign = selectedCampaignRef.current;
    const currentCallWrapupState = callWrapupStateRef.current;
    const currentActiveCallSessionData = activeCallSessionDataRef.current;
    const currentSelectedContact = selectedContactRef.current;

    const dispositionDetails = currentCampaign?.agentDisposition?.find(
      (item: any) => item._id === currentCallWrapupState?.disposition,
    );
    const name = contact
      ? `${contact?.contacts?.[0]?.firstName || ''} ${contact?.contacts?.[0]?.lastName || ''}`
      : `${currentSelectedContact?.contacts?.[0]?.firstName || ''} ${currentSelectedContact?.contacts?.[0]?.lastName || ''}`;
    const second =
      currentActiveCallSessionData?._joined_at && terminatedTime
        ? terminatedTime.diff(
            currentActiveCallSessionData?._joined_at
              ? moment(currentActiveCallSessionData?._joined_at)
              : moment(),
            'seconds',
          )
        : 0;

    const payload = {
      userDetail: {
        value: user?.user_info?.extension,
        label: _name,
        email: user?.user_info?.email,
        role: user?.user_info?.custom_role_data?.name || user?.user_info?.role_data?.name,
        user_uuid: user?.uuid,
      },
      campaignId: currentCampaign?.value,
      siteId: currentCampaign?.siteId,
      companyId: currentCampaign?.companyId,
      campaignNumberId: contact?._id || currentSelectedContact?._id,
      contactId: contact?.contactId || currentSelectedContact?.contactId,
      contactName: name,
      contactNumber:
        contact?.contacts?.[0]?.phone || currentSelectedContact?.contacts?.[0]?.phone || '',
      contactEmail:
        contact?.contacts?.[0]?.email || currentSelectedContact?.contacts?.[0]?.email || '',
      didNumber: currentCampaign?.callerId,
      sipCallId: currentActiveCallSessionData?._callID,
      callScheduleDate: currentCallWrapupState?.reschedule?.utc,
      isCallSchedule: !!currentCallWrapupState?.reschedule?.utc,
      callDate: moment().format('YYYY-MM-DD'),
      callDuration: second || 0,
      callStatus:
        currentActiveCallSessionData?._status === CALL_STATUS_CONST.CONNECTED
          ? 'Answered'
          : 'Not Answered',
      isDisposition: !!dispositionDetails?.disposition?.name,
      disposition: {
        disposition: dispositionDetails?.disposition?.name || '',
        colorCode: dispositionDetails?.disposition?.colorCode || '',
      },
      ...extraPayload,
    };

    if (extraPayload?.skippingContact === true || extraPayload?.doNothing === true) {
      setSkipState((prev: any) => ({
        ...prev,
        skippedCount: prev.skippedCount + 1,
      }));
      handleAlert({ text: 'Contact Skipped', type: 'success' });
    }

    socketEventsManager?.emit('campaign-agent-activity-action', {
      data: payload,
    });
    // campaignEventMutate(payload);
  };

  useEffect(() => {
    if (ongoingCampaignActivity && ongoingCampaignActivity?._id) {
      if (
        ongoingCampaignActivity?._id === selectedCampaign?.value &&
        ongoingCampaignActivity?.campaignStatus === CAMPAIGN_STATUS_CONST.PAUSE
      )
        setContacts([]);
      // if (!activeCallKey && !activeCallSessionData?._status) handleOngoingCampaignActivity();
    }
  }, [ongoingCampaignActivity]);

  useEffect(() => {
    if (activeCallSessionData?._status && isCampaignCall) {
      setTerminatedTime(moment());
      handleTabChange('Disposition');
      startDipositionTimer();
      // if (activeCallSessionData?._status === CALL_STATUS_CONST.CONNECTED) {
      //   setTerminatedTime(moment());
      //   handleTabChange('Disposition');
      //   startDipositionTimer();
      // } else handleCampaignEvents();
    } else
      handleTabChange(
        selectedCampaign?.agentScripting
          ? RUNNING_CAMPAIGN_TAB_CONST.SCRIPT
          : RUNNING_CAMPAIGN_TAB_CONST.INFO,
      );
  }, [activeCallSessionData]);

  useEffect(() => {
    if (['busy', 'dnd'].includes(user?.socket_status)) {
      // if (activeCallKey) {
      //   _terminate(activeCallKey);
      //   handleCampaignEvents();
      // }
      if (isStartCampaign) stopCampaign();
    }
  }, [user?.socket_status]);

  // Set up socket event listeners with refs for latest state
  useEffect(() => {
    if (!socketEventsManager) return;

    const handleContactAssignments = (response: any) => {
      if (response) {
        const data = response?.data?.result?.rows || [];
        setContacts(data);
        if (data?.length) {
          // Use ref to get latest campaign settings
          const currentCampaign = selectedCampaignRef.current;
          if (currentCampaign?.dialMethod === DIALER_TYPE.NORMAL) {
            handleMakeCall(data[0]);
          }
          setSkipState({ totalCount: data?.length || 0, skippedCount: 0 });
          setActiveItem(data[0]?._id);
          startTimer();
        } else {
          handleAlert({
            text: 'No assigned contacts left for this campaign',
            type: 'warning',
          });
          stopCampaign();
        }
        setWaitingState(false);
        setIsContactLoading(false);
      }
    };

    const handleAgentActivitySuccess = (response: any) => {
      if (selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE) return;
      if (response) {
        if (response?.success) {
          // Use ref to get latest call session data
          const currentCallSessionData = activeCallSessionDataRef.current;
          if (
            !isRunHandleCampaignEvents &&
            currentCallSessionData?._status === CALL_STATUS_CONST.CONNECTED
          )
            return;
          if (currentCallSessionData?._callID) {
            handleEndDisposition();
          } else {
            handleSkipContact();
          }
          setTerminatedTime(null);
          setIsRunHandleCampaignEvents(false);
        }
      }
    };

    const handleGetContactInfo = (response: any) => {
      if (response) {
        console.log('response', response);
        if (response?.success) {
          setSelectedContact(response?.data?.[0] || null);
        }
      }
    };

    socketEventsManager.on('campaign-contact-assignments', handleContactAssignments);
    socketEventsManager.on('agentActivitySuccess', handleAgentActivitySuccess);
    socketEventsManager.on('contact-detail-response', handleGetContactInfo);

    return () => {
      socketEventsManager.off('campaign-contact-assignments', handleContactAssignments);
      socketEventsManager.off('agentActivitySuccess', handleAgentActivitySuccess);
      socketEventsManager.off('contact-detail-response', handleGetContactInfo);
    };
  }, [
    socketEventsManager,
    handleMakeCall,
    startTimer,
    stopCampaign,
    handleEndDisposition,
    handleSkipContact,
  ]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // If campaign is running and it's PREDICTIVE, make available with "On Break" status
      if (isStartCampaignRef.current) {
        const currentCampaign = selectedCampaignRef.current;
        if (currentCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE && currentCampaign?.value) {
          handleMakeAvailableRef
            .current(currentCampaign.value, 'On Break', 'Waiting')
            .catch(() => {});
        }
      }

      isMountedRef.current = false;
      // Clean up timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (dispositionTimerRef.current) {
        clearInterval(dispositionTimerRef.current);
        dispositionTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isStartCampaign) {
      startCampaign();
    }
  }, [isStartCampaign]);

  useEffect(() => {
    if (isStopCampaign) stopCampaign();
  }, [isStopCampaign]);

  useEffect(() => {
    if (isRunHandleCampaignEvents) {
      if (selectedCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE) handleEndDisposition();
      else handleCampaignEvents();
    }
  }, [isRunHandleCampaignEvents]);

  console.log('isRunHandleCampaignEvents', isRunHandleCampaignEvents);

  // useEffect(() => {
  //   const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  //     if (isStartCampaignRef.current) {
  //       // Use refs to get latest state
  //       const currentCampaign = selectedCampaignRef.current;

  //       // For PREDICTIVE campaigns, make available with "On Break" status before stopping
  //       if (currentCampaign?.dialMethod === DIALER_TYPE.PREDICTIVE && currentCampaign?.value) {
  //         try {
  //           const accessToken = localStorage.getItem(SESSION_NAME);
  //           const apiBaseUrl = getEnv().VITE_API_BASE_URL;
  //           const payload = {
  //             queue_extension: currentCampaign.queue_extension,
  //             status: 'On Break',
  //             state: 'Waiting',
  //           };

  //           // Use fetch with keepalive for reliable delivery during page unload (same as video meeting pattern)
  //           const url = `${apiBaseUrl}/api/call-queue/agent/status`;
  //           fetch(url, {
  //             method: 'POST',
  //             body: JSON.stringify(payload),
  //             headers: {
  //               'Content-Type': 'application/json',
  //               Authorization: `Bearer ${accessToken}`,
  //             },
  //             keepalive: true, // This ensures the request completes even after page unload
  //           }).catch(() => {
  //             // Silent fail if request doesn't complete
  //           });
  //         } catch (error) {
  //           console.log('error', error);
  //           // Silent fail if any error occurs during page unload
  //         }
  //       }

  //       // Stop the campaign
  //       stopCampaignRef.current?.();
  //     }
  //     // Prevent default browser behavior (like video meeting does)
  //     event.preventDefault();
  //     event.returnValue = '';
  //   };

  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   window.addEventListener('pagehide', handleBeforeUnload);

  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //     window.removeEventListener('pagehide', handleBeforeUnload);
  //   };
  // }, []);

  return (
    <>
      {' '}
      {isShowAlert?.isShow && (
        <AlertConfirm
          {...{
            onConfirm: () => {
              handleCampaignEvents({ skippingContact: true, doNothing: false }, contacts?.[0]);
              // handleSkipContact(isShowAlert?.index);
            },
            descriptionTextComp: 'Are you sure, you want to skip this contact?',
            open: isShowAlert?.isShow,
            setOpen: () => {
              setIsShowAlert({ isShow: false, index: 0 });
            },
          }}
        />
      )}
    </>
  );
};

export default AgentRunningCampignOuter;
