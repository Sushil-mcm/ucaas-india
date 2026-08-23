import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { useOrganization } from '@/hooks/use-organisation';
import { normalizeMeetingCallType } from '@/lib/meeting-links';
import type { MeetingCallType } from '@/lib/meeting-links';
import { getMeetingInviteIdentity, removeMeetingInvite } from '@/lib/meeting-invites';
import { getEnv } from '@/lib/utils';
import { MicIcon, PhoneIcon, VideoIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useDraggable } from '@/hooks/userDraggable';

const MeetRinging = () => {
  const { user } = useUser();
  const { mainSiteInfo } = useOrganization();
  const {
    callingInProgress,
    meetWindows,
    setMeetWindows,
    setMeetInitiateModalData,
    setMeetingAcceptingChatId,
    handleMeetDecline,
    allChats,
    handleMeetMissed,
  } = useSocketEvents();

  const { position, dragging, handleMouseDown } = useDraggable();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const acceptedCallRef = useRef(false);

  const ringData = meetWindows && meetWindows?.length > 0 ? meetWindows?.[0] : null;
  const ringInviteIdentity = getMeetingInviteIdentity(ringData);
  const ringCallType = normalizeMeetingCallType(ringData?.callType);
  const audioAcceptTooltip = 'Join with only audio';
  const videoAcceptTooltip = 'Join with audio and video';
  const notificationIcon = useMemo(() => {
    const iconPath = String(mainSiteInfo?.fav_icon || mainSiteInfo?.small_logo || '').trim();

    if (iconPath) {
      if (/^(https?:|data:|blob:)/i.test(iconPath)) return iconPath;
      const baseUrl = String(getEnv().VITE_API_BASE_URL || '').replace(/\/$/, '');
      const normalizedPath = iconPath.replace(/^\/+/, '');
      return baseUrl ? `${baseUrl}/${normalizedPath}` : `/${normalizedPath}`;
    }

    return document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href || '/fav.ico';
  }, [mainSiteInfo?.fav_icon, mainSiteInfo?.small_logo]);

  const currentConversation = useMemo(() => {
    return (
      (allChats &&
        allChats?.length > 0 &&
        allChats?.find((c: any) => c?.chatId === ringData?.chatId)) ||
      null
    );
  }, [allChats, ringData?.chatId]);

  const currentChat = useMemo(() => {
    return currentConversation?.users || [];
  }, [currentConversation]);

  const isChatMuted = useMemo(() => {
    return currentConversation?.isMuted?.includes(user?.uuid) ?? false;
  }, [currentConversation, user?.uuid]);

  const senderData = currentChat?.find((u: any) => u?.uuid === ringData?.senderId) || null;

  const haveIJoinedTheCall =
    currentChat?.find((u: any) => u?.uuid === user?.uuid)?.callStatus === 'joined' || false;

  function stopRingingAlerts() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (notificationRef.current) {
      notificationRef.current.close();
    }
  }

  const removeCurrentInvite = useCallback(() => {
    setMeetWindows((prev: any) => removeMeetingInvite(prev, ringInviteIdentity));
  }, [ringInviteIdentity, setMeetWindows]);

  function handleAccept(preferredCallType: MeetingCallType) {
    if (!ringData?.chatId) return;
    if (acceptedCallRef.current) return;

    const requestedCallType = preferredCallType;
    acceptedCallRef.current = true;

    // Stop missed-call timeout immediately so accept processing is never bypassed.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMeetingAcceptingChatId(ringData?.chatId || null);
    stopRingingAlerts();
    setMeetInitiateModalData({
      chatId: ringData?.chatId,
      callType: requestedCallType,
      incomingCallType: ringCallType,
      senderId: ringData?.senderId,
      skipPreJoinMediaCheck: true,
    });
    setMeetWindows([]);
    setMeetingAcceptingChatId(null);
  }

  useEffect(() => {
    acceptedCallRef.current = false;
  }, [ringInviteIdentity]);

  function handleDecline() {
    if (!ringData?.chatId) return;
    stopRingingAlerts();
    if (haveIJoinedTheCall) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setMeetingAcceptingChatId(null);
      removeCurrentInvite();
      return;
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setMeetingAcceptingChatId(null);
      handleMeetDecline({
        chatId: ringData?.chatId,
        userID: user?.uuid,
      });
      removeCurrentInvite();
    }
  }

  // Set up 30-second timer to auto-decline
  useEffect(() => {
    if (!callingInProgress || !ringData?.chatId) {
      setMeetingAcceptingChatId(null);
    }
  }, [callingInProgress, ringData?.chatId, setMeetingAcceptingChatId]);

  useEffect(() => {
    if (callingInProgress && ringData?.chatId) {
      // Browser notification
      const showNotification = async () => {
        if ('Notification' in window) {
          try {
            if (Notification.permission === 'default') {
              await Notification.requestPermission();
            }
            if (Notification.permission === 'granted') {
              notificationRef.current = new Notification(
                ringCallType === 'audio' ? 'Incoming Voice Call' : 'Incoming Video Call',
                {
                  body: `${senderData?.name || 'Someone'} is calling...`,
                  icon: notificationIcon,
                  tag: 'incoming-call',
                  requireInteraction: true,
                },
              );
              notificationRef.current.onclick = () => {
                window.focus();
                notificationRef.current?.close();
              };
            }
          } catch (error) {
            console.error('Error showing notification:', error);
          }
        }
      };
      showNotification();

      timerRef.current = setTimeout(() => {
        handleMeetMissed({
          chatId: ringData?.chatId,
          userID: user?.uuid,
        });
        removeCurrentInvite();
      }, 30000); // 30 seconds
      if (haveIJoinedTheCall) {
        handleDecline();
      }
      // Cleanup timer on unmount
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (notificationRef.current) {
          notificationRef.current.close();
        }
      };
    }
  }, [
    callingInProgress,
    haveIJoinedTheCall,
    ringInviteIdentity,
    ringData?.chatId,
    user?.uuid,
    ringCallType,
    senderData?.name,
    notificationIcon,
    removeCurrentInvite,
  ]);

  // Play ringtone audio only when chat isn't muted and stop on cleanup/state changes
  useEffect(() => {
    if (!callingInProgress || !ringData?.chatId || isChatMuted) return;

    // Create and configure audio element
    const audio = new Audio('/tones/incoming-call.ogg');
    audio.loop = true;
    audioRef.current = audio;
    // Play audio
    audio.play().catch((error) => {
      console.error('Error playing ringtone:', error);
    });
    // Cleanup: stop and remove audio when dependencies change/unmount
    return () => {
      audio.pause();
      audio.currentTime = 0;
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [callingInProgress, ringInviteIdentity, ringData?.chatId, isChatMuted]);

  if (!callingInProgress || !ringData?.chatId) return;

  return (
    <div
      className="fixed top-8 left-1/2 z-[1000] cursor-move"
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
        transition: dragging ? 'none' : 'transform 0.1s ease',
      }}
    >
      <div className="w-full min-w-[340px] bg-gray-800 flex items-center justify-between gap-4 px-3 py-2 rounded-full shadow-2xl border border-gray-700">
        <div className="flex items-center gap-3">
          <CustomAvatar
            name={senderData?.name}
            showPresence={false}
            size="44"
            extension={senderData?.extension}
            image={senderData?.avatar}
          />
          <div className="flex flex-col">
            <p className="text-white text-[10px] font-medium opacity-80 uppercase tracking-wider">
              {ringCallType === 'audio' ? 'Incoming Voice Call' : 'Incoming Video Call'}
            </p>
            <p className="text-white text-sm font-semibold truncate max-w-[150px]">
              {senderData?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pr-1">
          <CustomTooltip text={audioAcceptTooltip} side="top">
            <span className="inline-flex">
              <button
                type="button"
                onClick={() => {
                  void handleAccept('audio');
                }}
                className="w-11 h-11 flex items-center justify-center text-white rounded-full transition-colors shadow-lg bg-green-500 hover:bg-green-600 cursor-pointer"
                aria-label="Join with only audio"
                title="Join with only audio"
              >
                <MicIcon size={20} />
              </button>
            </span>
          </CustomTooltip>
          <CustomTooltip text={videoAcceptTooltip} side="top">
            <span className="inline-flex">
              <button
                type="button"
                onClick={() => {
                  void handleAccept('video');
                }}
                className="w-11 h-11 flex items-center justify-center text-white rounded-full transition-colors shadow-lg bg-green-500 hover:bg-green-600 cursor-pointer"
                aria-label="Join with audio and video"
                title="Join with audio and video"
              >
                <VideoIcon size={20} />
              </button>
            </span>
          </CustomTooltip>
          <button
            type="button"
            onClick={handleDecline}
            className="w-11 h-11 flex items-center justify-center text-white rounded-full transition-colors shadow-lg bg-red-500 hover:bg-red-600 cursor-pointer"
            title="Decline Call"
          >
            <PhoneIcon size={20} className="rotate-[135deg]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetRinging;
