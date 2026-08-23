import Loader from '@/components/custom/loader';
import { useUser } from '@/hooks/use-user';
import { useEffect, useRef, useState } from 'react';
import { useAvCall } from '@/hooks/use-av-call';
import CallScreen from './meeting-screen';
import { useSocketEvents } from '@/hooks/use-socket-events';
// import { toast } from 'react-toastify';
import { normalizeMeetingCallType } from '@/lib/meeting-links';

// const AV_PERMISSION_TOAST_ID = 'av-permissions-not-granted';

const initialState = {
  meetName: '',
  hostName: '',
  isGuestAuthorized: false,
  isGuest: false,
  isPortalUser: false,
  isPasswordRequired: false,
  isPasswordAuth: false,
  meetUniqueKey: '',
  meetDuration: 0,
  isMeetDuration: true,
  isAvCall: false,
};

const ConnectedScreen = ({
  incominCallData,
  callingUserdetails,
  isMinimize,
  setIsMinimize,
  handleCallUpdate,
  isInitiator = false,
}: {
  incominCallData?: any;
  callingUserdetails?: any;
  isMinimize?: boolean;
  setIsMinimize?: any;
  handleCallUpdate?: any;
  isInitiator?: boolean;
}) => {
  const {
    isJitsiLoaded,
    setRoomCode,
    roomCode,
    createConnection,
    isJitsiConnection,
    jitsiConnection,
    isRoomJoined,
    // getAVPermissions,
    setIsHost,
    setUserName,
    joinMeetHandler,
    setState,
    initializeSystemAVConfig,
    devices,
    userID,
    cleanupLocalMediaTracks,
  } = useAvCall();
  const { user } = useUser();
  const [meetState, setMeetState] = useState(initialState);
  const [readyForMeet, setReadyForMeet] = useState(false);
  const { socketEventsManager, handleMeetInitiate } = useSocketEvents();
  const hasJoinedConferenceRef = useRef(false);
  const hasEmittedMeetAcceptRef = useRef(false);
  const removeConfigListenerRef = useRef<any>(null);
  const initializingAVRef = useRef(false);
  const normalizedCallType = normalizeMeetingCallType(incominCallData?.callType);
  const isVideoCall = normalizedCallType === 'video';

  // Unmount safety-net: if the component is destroyed without the user pressing
  // "End Call" (e.g. call data cleared externally, modal force-closed),
  // ensure all tracks are stopped so the camera/mic indicator turns off.
  useEffect(() => {
    return () => {
      cleanupLocalMediaTracks();
    };
  }, []);

  useEffect(() => {
    if (isInitiator && incominCallData?.chatId && user?.uuid) {
      handleMeetInitiate({
        chatId: incominCallData?.chatId,
        userID: user?.uuid,
        callType: incominCallData?.callType || 'video',
      });
    }
  }, []);

  // useEffect(() => {
  //   // Basic permissions check
  //   if (isJitsiLoaded) {
  //     getAVPermissions().then((res: any) => {
  //       if (!res) {
  //         if (!toast.isActive(AV_PERMISSION_TOAST_ID)) {
  //           toast.error('AV permissions not yet granted', {
  //             toastId: AV_PERMISSION_TOAST_ID,
  //           });
  //         }
  //       }
  //     });
  //   }
  // }, [isJitsiLoaded, getAVPermissions]);

  useEffect(() => {
    if (incominCallData?.chatId) {
      setRoomCode((incominCallData?.chatId || '') as string);
    }
  }, [incominCallData?.chatId]);

  useEffect(() => {
    hasJoinedConferenceRef.current = false;
    hasEmittedMeetAcceptRef.current = false;
    setReadyForMeet(false);
  }, [incominCallData?.chatId]);

  useEffect(() => {
    if (roomCode && isJitsiLoaded) {
      createConnection();
    }
  }, [roomCode, isJitsiLoaded]);

  useEffect(() => {
    if (user?.user_info) {
      setUserName(`${user?.user_info?.first_name} ${user?.user_info?.last_name || ''}`);
    }
  }, [user?.user_info]);

  useEffect(() => {
    if (incominCallData?.chatId && roomCode && isJitsiConnection && jitsiConnection) {
      let cancelled = false;
      if (hasJoinedConferenceRef.current) {
        return;
      }
      hasJoinedConferenceRef.current = true;

      const initAndJoin = async () => {
        if (initializingAVRef.current) return;
        initializingAVRef.current = true;

        if (!devices) {
          try {
            removeConfigListenerRef.current = await initializeSystemAVConfig();
          } catch (error) {
            console.log('initializeSystemAVConfig failed before joining call', error);
          }
        }

        if (cancelled) return;
        joinConference(isVideoCall);
        initializingAVRef.current = false;
      };

      initAndJoin();

      return () => {
        cancelled = true;
        initializingAVRef.current = false;
        if (typeof removeConfigListenerRef.current === 'function') {
          removeConfigListenerRef.current();
        }
      };
    }
  }, [roomCode, isJitsiConnection, jitsiConnection, isVideoCall]);

  async function joinConference(withVideo = false) {
    const meetName = `Call`;
    const isHost = callingUserdetails?.uuid === incominCallData?.senderId;
    const hostName = `${callingUserdetails?.first_name || ''} ${callingUserdetails?.last_name || ''}`;
    if (isHost) {
      setIsHost(true);
    }
    localStorage.setItem('host_name', hostName);
    setMeetState((prev) => ({
      ...prev,
      meetName: meetName,
      hostName: hostName,
      isGuest: false,
      isPasswordRequired: false,
      meetUniqueKey: incominCallData?.chatId,
      meetDuration: 0,
      isPortalUser: true,
      isMeetDuration: false,
      isAvCall: true,
      callType: incominCallData?.callType,
    }));
    setReadyForMeet(true);
    setState((prev: any) => ({
      ...prev,
      isVideoCall: withVideo,
      isAVAudioMuted: false,
      isLocalAudioMuted: false,
      isAVVideoMuted: !withVideo,
      isLocalVideoMuted: !withVideo,
    }));
    joinMeetHandler(meetName, { withVideo });
  }

  useEffect(() => {
    if (isRoomJoined && readyForMeet && !hasEmittedMeetAcceptRef.current) {
      hasEmittedMeetAcceptRef.current = true;

      socketEventsManager?.emit(
        'user-presence-update',
        {
          doc: {
            userId: user?.user_info?.extension,
            domain: user?.sip_credentials?.domain,
            uuid: user?.uuid,
            status: 'online',
            onCall: true,
            timeObj: {
              holiday_start_date: null,
              holiday_end_date: null,
            },
          },
        },
        (response: any) => {
          console.log('User-presence-update:', response);
        },
      );
    }
  }, [isRoomJoined, readyForMeet, incominCallData?.chatId, user?.uuid, userID]);

  if (!isJitsiLoaded || !isJitsiConnection || !jitsiConnection || !readyForMeet) {
    return (
      // <div className="w-screen min-h-screen bg-white ">
      <div className="max-w-[80%] min-w-[80%] max-h-[92vh] min-h-[92vh] rounded-lg bg-white ">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2  bg-white ">
          <div className="flex items-center justify-center p-5">
            <Loader variant="blue" size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isRoomJoined && readyForMeet && (
        <CallScreen
          meetState={meetState}
          setIsMinimize={setIsMinimize}
          isMinimize={isMinimize}
          handleCallUpdate={handleCallUpdate}
          incominCallData={incominCallData}
        />
      )}
    </>
  );
};

export default ConnectedScreen;
