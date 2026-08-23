import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { MeetingCallType, normalizeMeetingCallType } from '@/lib/meeting-links';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CALL_STATUS_CONST } from '../../constants';
import JoinOptionsScreen, { applyCallJoinPreference } from '../join-options-screen';
import ConnectedScreen from '../connected-screen';
import { chatEvents } from '@/context/socket-events';
import { handleAlert, removeEnvPrefix } from '@/lib/utils';
import { useAvCall } from '@/hooks/use-av-call';
import {
  ensureCallMediaAccess,
  getCallBlockReason,
  getVideoToAudioFallback,
  useCallEligibility,
} from '../../hooks/use-call-eligibility';

export const MeetInitiateModal = ({
  currentChat,
  callType,
  isInitiator = true,
  skipJoinOptionsForInitiator = true,
  skipJoinOptions = false,
  skipPreJoinMediaCheck = false,
  onClose,
}: {
  currentChat: any;
  callType: string;
  isInitiator?: boolean;
  skipJoinOptionsForInitiator?: boolean;
  skipJoinOptions?: boolean;
  skipPreJoinMediaCheck?: boolean;
  onClose: () => void;
}) => {
  const { user } = useUser();
  const { cleanupLocalMediaTracks, endMeeting, setState, initializeSystemAVConfig, devices } =
    useAvCall();
  const { allChats, socketEventsManager } = useSocketEvents();
  const [localCallStatus, setLocalCallStatus] = useState<string | null>(null);
  const [isMinimize, setIsMinimize] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const [autoJoinError, setAutoJoinError] = useState('');
  const autoJoinAttemptRef = useRef('');
  const chatId = currentChat?.chatId;
  const chatDetails = allChats.find((item: any) => item.chatId === chatId) || currentChat;
  const normalizedCallType = useMemo(() => normalizeMeetingCallType(callType), [callType]);
  const [effectiveModalCallType, setEffectiveModalCallType] =
    useState<MeetingCallType>(normalizedCallType);
  const shouldAutoJoin = skipJoinOptions || (isInitiator && skipJoinOptionsForInitiator);
  const { refresh: refreshEligibility, ...eligibility } = useCallEligibility({
    fallbackDevices: devices || null,
  });

  const senderId = isInitiator ? user?.uuid : currentChat?.meetMetadata?.startedBy;

  const callingUserdetails =
    chatDetails && chatDetails?.users && chatDetails?.users?.length
      ? chatDetails?.users.find((item: any) => item.uuid === senderId)
      : {};

  const recevierUserdetails =
    chatDetails && chatDetails?.users && chatDetails?.users?.length
      ? chatDetails?.users?.filter((u: any) => u.uuid !== user?.uuid)
      : [];

  const incominCallData = {
    chatId,
    callType: effectiveModalCallType,
    senderId,
    receiverId: recevierUserdetails?.map((u: any) => u.uuid) || [],
    users: chatDetails?.users,
  };

  useEffect(() => {
    setEffectiveModalCallType(normalizedCallType);
  }, [chatId, normalizedCallType]);

  const handleCallUpdate = (status: string) => {
    if (status === CALL_STATUS_CONST.CONNECTED) {
      setLocalCallStatus(CALL_STATUS_CONST.CONNECTED);
    }
    if (
      status === CALL_STATUS_CONST.ENDED ||
      status === CALL_STATUS_CONST.MISSED ||
      status === CALL_STATUS_CONST.REJECT
    ) {
      void endMeeting(false, 'Call has ended.').finally(onClose);
    }
  };

  const currentStatus = localCallStatus || CALL_STATUS_CONST.ACCEPTED;

  const attemptAutoJoin = useCallback(async () => {
    if (!shouldAutoJoin) return;
    if (!chatId) return;

    setIsAutoJoining(true);
    setAutoJoinError('');

    try {
      let effectiveCallType = normalizedCallType;
      if (skipPreJoinMediaCheck) {
        applyCallJoinPreference(setState, effectiveCallType);
        setEffectiveModalCallType(effectiveCallType);
        setLocalCallStatus(CALL_STATUS_CONST.CONNECTED);
        return;
      }

      const eligibilitySnapshot = await refreshEligibility();
      const blockReason = getCallBlockReason(effectiveCallType, eligibilitySnapshot);

      if (blockReason) {
        if (effectiveCallType === 'video') {
          const videoFallback = getVideoToAudioFallback(eligibilitySnapshot);
          if (videoFallback.canFallback) {
            effectiveCallType = 'audio';
            handleAlert({ text: videoFallback.reason, type: 'info' });
          } else {
            setAutoJoinError(blockReason);
            return;
          }
        } else {
          setAutoJoinError(blockReason);
          return;
        }
      }

      const mediaAccess = await ensureCallMediaAccess(effectiveCallType);
      if (mediaAccess.fallbackCallType === 'audio') {
        handleAlert({ text: mediaAccess.reason, type: 'info' });
        setEffectiveModalCallType('audio');
        applyCallJoinPreference(setState, 'audio');
        setLocalCallStatus(CALL_STATUS_CONST.CONNECTED);
        return;
      }

      if (!mediaAccess.ok) {
        setAutoJoinError(mediaAccess.reason || 'Unable to access required media devices.');
        await refreshEligibility();
        return;
      }

      try {
        await initializeSystemAVConfig();
      } catch (error) {
        console.log('initializeSystemAVConfig failed during auto join', error);
      }

      applyCallJoinPreference(setState, effectiveCallType);
      setEffectiveModalCallType(effectiveCallType);
      setLocalCallStatus(CALL_STATUS_CONST.CONNECTED);
    } finally {
      setIsAutoJoining(false);
    }
  }, [
    shouldAutoJoin,
    chatId,
    refreshEligibility,
    normalizedCallType,
    initializeSystemAVConfig,
    setState,
    skipPreJoinMediaCheck,
  ]);

  useEffect(() => {
    if (!shouldAutoJoin) return;
    if (currentStatus !== CALL_STATUS_CONST.ACCEPTED) return;

    const attemptKey = `${chatId || ''}-${normalizedCallType}`;
    if (!attemptKey) return;
    if (autoJoinAttemptRef.current === attemptKey) return;
    autoJoinAttemptRef.current = attemptKey;

    void attemptAutoJoin();
  }, [shouldAutoJoin, currentStatus, chatId, normalizedCallType, attemptAutoJoin]);

  // Listen for MEET_END socket event (host ended meeting for all)
  useEffect(() => {
    if (!socketEventsManager) return;

    const handleMeetEnd = async (data: any) => {
      console.log('MEET_END received', data);
      // Only act if the ended meeting matches our current room
      if (data?.chatId && chatId && removeEnvPrefix(data.chatId) !== chatId) return;
      try {
        await endMeeting(false, 'The host has ended this meeting.');
      } catch (err) {
        console.log('MEET_END endMeeting error', err);
        cleanupLocalMediaTracks();
      } finally {
        onClose();
      }
    };

    socketEventsManager.on(chatEvents.MEET_END, handleMeetEnd);

    return () => {
      socketEventsManager.off(chatEvents.MEET_END, handleMeetEnd);
    };
  }, [chatId, cleanupLocalMediaTracks, endMeeting, onClose, socketEventsManager]);

  useEffect(() => {
    return () => {
      const previewStream = (window as any).__previewStream;
      if (previewStream?.getTracks) {
        previewStream.getTracks().forEach((track: any) => track.stop());
        (window as any).__previewStream = null;
      }
      cleanupLocalMediaTracks();
    };
  }, [cleanupLocalMediaTracks]);

  return (
    <>
      {(() => {
        switch (currentStatus) {
          case CALL_STATUS_CONST.ACCEPTED:
            if (shouldAutoJoin) {
              return (
                <div
                  className={`fixed ${!isMinimize && 'inset-0'} z-[100] bg-black/50 flex justify-center items-center w-full`}
                >
                  <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
                    {isAutoJoining ? (
                      <div className="flex flex-col items-center gap-3 py-3">
                        <Loader variant="blue" size="lg" />
                        <div className="text-sm text-gray-600">
                          Preparing {normalizedCallType === 'audio' ? 'voice' : 'video'} call...
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-base font-semibold text-gray-900">
                          Unable to start {normalizedCallType === 'audio' ? 'voice' : 'video'} call
                        </div>
                        <div className="text-sm text-gray-600">
                          {autoJoinError ||
                            (normalizedCallType === 'video'
                              ? eligibility.videoBlockReason
                              : eligibility.audioBlockReason) ||
                            'Required devices or permissions are not available.'}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" onClick={onClose}>
                            Close
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              autoJoinAttemptRef.current = '';
                              void attemptAutoJoin();
                            }}
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                className={`fixed ${!isMinimize && 'inset-0'} z-[100] bg-black/50 flex justify-center items-center w-full`}
              >
                <div
                  className={`${currentStatus === CALL_STATUS_CONST.CONNECTED || currentStatus === CALL_STATUS_CONST.ACCEPTED ? 'w-full max-w-full rounded-none' : 'w-auto rounded-xl'} bg-white shadow-xl`}
                >
                  <JoinOptionsScreen
                    callingUserdetails={callingUserdetails}
                    recevierUserdetails={recevierUserdetails}
                    isHost={isInitiator}
                    handleCallUpdate={handleCallUpdate}
                    incominCallData={incominCallData}
                    setLocalCallStatus={setLocalCallStatus}
                    callType={normalizedCallType}
                    // onClose={onClose}
                  />
                </div>
              </div>
            );
          case CALL_STATUS_CONST.CONNECTED:
            return (
              <div
                className={`fixed ${!isMinimize && 'inset-0'} z-[100] bg-black flex justify-center items-center w-full max-w-[80%] max-h-[92vh] m-auto`}
              >
                <div
                  className={`${currentStatus === CALL_STATUS_CONST.CONNECTED || currentStatus === CALL_STATUS_CONST.ACCEPTED ? 'w-full max-w-full rounded-none' : 'w-auto rounded-xl'} bg-white shadow-xl`}
                >
                  <ConnectedScreen
                    incominCallData={incominCallData}
                    callingUserdetails={callingUserdetails}
                    setIsMinimize={setIsMinimize}
                    isMinimize={isMinimize}
                    handleCallUpdate={handleCallUpdate}
                    isInitiator={isInitiator}
                  />
                </div>
              </div>
            );
          default:
            return null;
        }
      })()}
    </>
  );
};

export default MeetInitiateModal;
