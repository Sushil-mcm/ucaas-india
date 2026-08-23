import Loader from '@/components/custom/loader';
import { useJitsi } from '@/hooks/use-jitsi';
import { useMeetingSessionId } from '@/hooks/use-meeting-session-id';
import { useUser } from '@/hooks/use-user';
import { leaveMeeting, validateMeet } from '@/services/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PreMeetLayout from './pre-meet';
import DuringMeet from './during-meet';
import PostMeetLayout from './post-meet';
import MeetError from './meet-error-modal';
import { AxiosError } from 'axios';
import {
  GUEST_MEETING_TOKEN_KEY,
  GUEST_MEETING_TOKEN_UPDATED_EVENT,
  handleAlert,
  parseResponse,
  SESSION_NAME,
  removeEnvPrefix,
} from '@/lib/utils';
import GuestScreen from './guest-screen';
import { useSocketEvents } from '@/hooks/use-socket-events';

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
  meetingInvities: [],
  endUtc: null,
};

const VideoSection = () => {
  const {
    isJitsiLoaded,
    setRoomCode,
    roomCode,
    createConnection,
    isJitsiConnection,
    setWaitingScreen,
    isMeetingEnded,
    isRoomJoined,
    getAVPermissions,
    setIsHost,
    setUserName,
    setIsMember,
    setLobbyScreen,
    endMeetingForSelf,
    endMeetingForAll,
    userEmail,
    isHost,
  } = useJitsi();
  const { socketEventsManager, handleTerminateCall, handleMeetDecline } = useSocketEvents();
  const { user, handleSetUser } = useUser();
  const sessionId = useMeetingSessionId();
  const [searchParams] = useSearchParams();
  const [meetState, setMeetState] = useState(initialState);
  const [apiMeetingData, setApiMeetingData] = useState(initialState);
  const [readyForMeet, setReadyForMeet] = useState(false);
  const [viewType, setViewType] = useState('grid');
  const [modalState, setModalState] = useState(false);
  const [startUtcTime, setStartUtcTime] = useState({
    time: '',
    timeZone: '',
    message: '',
  });
  const latestGuestStateRef = useRef({ isGuest: false, hasUuid: false });
  const navigate = useNavigate();
  const postMeetingRedirectPath = user?.isGuest && !user?.uuid ? '/' : '/dashboard';

  useEffect(() => {
    latestGuestStateRef.current = {
      isGuest: Boolean(user?.isGuest),
      hasUuid: Boolean(user?.uuid),
    };
  }, [user?.isGuest, user?.uuid]);

  const clearGuestMeetingSession = useCallback(() => {
    sessionStorage.removeItem(GUEST_MEETING_TOKEN_KEY);
    window.dispatchEvent(new Event(GUEST_MEETING_TOKEN_UPDATED_EVENT));
    if (user?.isGuest && !user?.uuid) {
      handleSetUser({
        isGuest: false,
        guest_meeting_token: undefined,
        guest_info: undefined,
      });
    }
  }, [handleSetUser, user?.isGuest, user?.uuid]);
  const {
    data: meetingData,
    isError,
    error: meetError,
    isFetched,
  } = useQuery({
    queryKey: [
      'validateMeet',
      {
        meetingId: roomCode,
        token: user?.token ? user?.token : undefined,
        sessionId,
        confirm: false,
      },
    ],
    queryFn: ({ queryKey }) => validateMeet(queryKey[1]),
    select: (data) => data?.data?.data?.result,
    enabled: Boolean(roomCode),
  });

  const { mutate: leaveMeetingMutate } = useMutation({
    mutationKey: ['leaveMeeting'],
    mutationFn: leaveMeeting,
    onSuccess: () => {
      handleEndMeeting();
    },
  });

  // Leave meeting when user closes tab, closes browser, or refreshes
  useEffect(() => {
    if (!roomCode) return;

    const leavePayload = {
      meetingId: roomCode,
      sessionId,
      type: isHost ? 'host' : user?.uuid ? 'user' : 'guest',
    };

    const handleConfirmedUnload = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      leaveMeetingMutate(leavePayload);
    };

    window.addEventListener('pagehide', handleConfirmedUnload);

    return () => {
      window.removeEventListener('pagehide', handleConfirmedUnload);
    };
  }, [isRoomJoined, roomCode, sessionId, isHost, user?.uuid, leaveMeetingMutate]);

  const handleEndMeeting = () => {
    clearGuestMeetingSession();
    if (user?.uuid) handleSocketEvent();
    endMeetingForSelf(false);
    if (isHost) navigate(postMeetingRedirectPath);
  };

  const handleSocketEvent = () => {
    socketEventsManager?.emit(
      'user-presence-update',
      {
        doc: {
          userId: user?.user_info?.extension,
          domain: user?.sip_credentials?.domain,
          uuid: user?.uuid,
          status: 'online',
          onCall: false,
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
  };

  useEffect(() => {
    if (!meetingData?._id && meetingData?.sessionId && meetingData?.sessionId !== sessionId) {
      handleAlert({ text: 'Session is already opened in another tab', type: 'error' });
      endMeetingForSelf(false);
      navigate(postMeetingRedirectPath);
    }
  }, [meetingData, sessionId, endMeetingForSelf, navigate, postMeetingRedirectPath]);

  useEffect(() => {
    if (isError) {
      const axiosError = meetError as AxiosError<any>;
      const res = axiosError?.response?.data?.error?.message;

      const errorResponse = parseResponse(res);
      const isGuest = errorResponse?.password === true;

      setMeetState((prev) => ({
        ...prev,
        isGuest: isGuest,
        isPasswordRequired: errorResponse?.password ? true : false,
      }));
      if (errorResponse && !isGuest) {
        setModalState(true);
        setStartUtcTime({
          time: errorResponse?.data?.start_local_time,
          timeZone: errorResponse?.data?.timezone,
          message: errorResponse?.message ? errorResponse?.message : errorResponse,
        });
      }
    }
  }, [isError]);

  useEffect(() => {
    getAVPermissions().then((res: any) => {
      if (!res) {
        try {
          navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((response) => {
            response?.getTracks()?.forEach((track) => {
              track.stop();
            });
          });
        } catch (err) {
          console.log('Getting Media Devicess', err);
        }
      } else {
        console.log('Media access granted');
      }
    });
  }, []);

  useEffect(() => {
    if (searchParams && searchParams.get('meetCode')) {
      setRoomCode((searchParams.get('meetCode') || '') as string);
    }
  }, []);

  useEffect(() => {
    if (roomCode && isJitsiLoaded) {
      createConnection();
    }
  }, [roomCode, isJitsiLoaded]);

  useEffect(() => {
    const currentUserName = user?.uuid
      ? `${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`.trim()
      : user?.guest_info?.name || '';

    if (currentUserName) {
      setUserName(currentUserName);
    }
  }, [user?.user_info, user?.guest_info, user?.uuid]);

  useEffect(() => {
    if (meetingData && Object.keys(meetingData)) {
      setApiMeetingData(meetingData);
      const token = localStorage.getItem(SESSION_NAME);
      const {
        hostName = '',
        meetingId,
        isHost,
        duration,
        name,
        isHostJoined,
        allowHost,
        passwordRequired = false,
        meeting_invites = {},
      } = meetingData;
      if (!isHostJoined && allowHost === 'N') {
        setWaitingScreen(true);
      }
      if (allowHost === 'N') {
        setLobbyScreen(true);
      }

      if (isHost) {
        setIsHost(true);
      }
      const members = meeting_invites?.user_detail || [];
      const isMemberInInvites = members?.some((el: any) => el.email === userEmail);

      setIsMember(!!token || isMemberInInvites || false);

      localStorage.setItem('host_name', hostName);
      setMeetState((prev) => ({
        ...prev,
        meetName: name ?? 'Meeting',
        hostName: hostName ?? '',
        isGuest: token ? false : true,
        isPasswordRequired: passwordRequired,
        meetUniqueKey: meetingId,
        meetDuration: duration,
        isPortalUser: Boolean(token),
        isMeetDuration: true,
        isAvCall: false,
        meetingInvities: meeting_invites?.user_detail?.length ? meeting_invites?.user_detail : [],
      }));
      if (token) setReadyForMeet(true);
    }
  }, [meetingData]);

  useEffect(() => {
    if (!apiMeetingData?.endUtc) return;

    const endTime = new Date(apiMeetingData.endUtc).getTime();
    const alertedMinutes = new Set<number>();

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = endTime - now;
      const diffMinutes = Math.ceil(diffMs / (1000 * 60));

      // Show alert at last 5,4,3,2,1 mins
      if ([5, 4, 3, 2, 1].includes(diffMinutes) && !alertedMinutes.has(diffMinutes)) {
        if (isMeetingEnded && !isMeetingEnded?.value && isRoomJoined) {
          alertedMinutes.add(diffMinutes);
          handleAlert({
            text: `Meeting will end in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`,
            type: 'warning',
          });
        }
      }

      // Stop timer when meeting ends
      if (diffMs <= 0) {
        clearInterval(interval);
        const meetingActorUuid = user?.uuid || user?.guest_info?.uuid;
        if (isHost) {
          handleTerminateCall({
            chatId: roomCode || removeEnvPrefix(roomCode) || '',
            userID: meetingActorUuid,
          });
          if (user?.uuid) handleSocketEvent();
          endMeetingForAll();
          navigate(postMeetingRedirectPath);
        } else {
          handleMeetDecline({
            chatId: roomCode || removeEnvPrefix(roomCode) || '',
            userID: meetingActorUuid,
          });
          if (user?.uuid) handleSocketEvent();
          endMeetingForSelf(false, 'Meeting has ended');
        }
      }
    }, 1000); // Check every second for exact countdown precision

    return () => clearInterval(interval);
  }, [
    apiMeetingData?.endUtc,
    endMeetingForSelf,
    isMeetingEnded,
    isRoomJoined,
    navigate,
    postMeetingRedirectPath,
    isHost,
    user,
    roomCode,
    handleTerminateCall,
    handleMeetDecline,
  ]);

  useEffect(() => {
    return () => {
      sessionStorage.removeItem(GUEST_MEETING_TOKEN_KEY);
      window.dispatchEvent(new Event(GUEST_MEETING_TOKEN_UPDATED_EVENT));
      if (latestGuestStateRef.current.isGuest && !latestGuestStateRef.current.hasUuid) {
        handleSetUser({
          isGuest: false,
          guest_meeting_token: undefined,
          guest_info: undefined,
        });
      }
    };
  }, [handleSetUser]);

  // Ending a meeting intentionally disconnects Jitsi before rendering the
  // post-meeting state. Do not send participants back to the connection loader
  // after the host ends the meeting for everyone.
  if (!isMeetingEnded?.value && (!isJitsiLoaded || !isJitsiConnection || !isFetched)) {
    return (
      <div className="w-screen min-h-screen bg-white ">
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
      {meetState?.isGuest && !meetState?.isGuestAuthorized && !readyForMeet ? (
        <GuestScreen
          meetState={meetState}
          isPasswordRequired={meetState.isPasswordRequired}
          isPasswordAuth={meetState.isPasswordAuth}
          isGuest={meetState.isGuest}
          setMeetState={setMeetState}
          setReadyForMeet={setReadyForMeet}
          setStartUtcTime={setStartUtcTime}
          setMeetingData={setApiMeetingData}
        />
      ) : null}
      {readyForMeet && !isMeetingEnded?.value && (
        <>
          {isMeetingEnded && !isMeetingEnded?.value && !isRoomJoined && (
            <PreMeetLayout meetState={meetState} setMeetState={setMeetState} />
          )}

          {isMeetingEnded && !isMeetingEnded?.value && isRoomJoined && (
            <DuringMeet
              meetState={meetState}
              apiMeetingData={apiMeetingData}
              viewType={viewType}
              setViewType={setViewType}
              meetingData={meetingData}
            />
          )}
        </>
      )}
      {isMeetingEnded && isMeetingEnded?.value && !meetingData?.isHost && <PostMeetLayout />}
      {modalState && (
        <MeetError
          startUtcTime={startUtcTime}
          modalState={modalState}
          setModalState={setModalState}
        />
      )}
    </>
  );
};

export default VideoSection;
