import { useSocketEvents } from '@/hooks/use-socket-events';
import { darkenColor, getEnv, lightenColorWithAlpha, stringToColour } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/hooks/use-user';
import BusyImage from '@/assets/images/status/busy.png';
import DNDImage from '@/assets/images/status/do-not-disturb.png';
import CustomTooltip from './custom-tooltip';
import UserLoginActivityModal from './userLoginActivityModal';
import LightBoxPreview from '@/pages/messenger/chat/message-item/lightbox-preview';
import {
  getMonitoringLiveCalls,
  isActiveMonitoringCall,
  isMonitoringCallForMember,
} from '@/pages/monitoring/live-call-helpers';
import { fetchAuthenticatedMediaObjectUrl } from '@/hooks/use-authenticated-media';

const avatarObjectUrlCache = new Map<string, string>();
const avatarFetchPromiseCache = new Map<string, Promise<string>>();

const getAvatarSourceMeta = (
  image: string,
  companyUuid: string,
  type: string,
): { directSrc: string; apiMediaUrl: string } => {
  if (!image) {
    return { directSrc: '', apiMediaUrl: '' };
  }

  if (image.includes('blob') || image.startsWith('data:')) {
    return { directSrc: image, apiMediaUrl: '' };
  }

  return {
    directSrc: '',
    apiMediaUrl: `${getEnv().VITE_API_BASE_URL}/api/media/${companyUuid}/${type}/${image}`,
  };
};

const getCachedAvatarObjectUrl = async (apiMediaUrl: string) => {
  const cachedObjectUrl = avatarObjectUrlCache.get(apiMediaUrl);
  if (cachedObjectUrl) return cachedObjectUrl;

  const inFlightRequest = avatarFetchPromiseCache.get(apiMediaUrl);
  if (inFlightRequest) return inFlightRequest;

  const request = fetchAuthenticatedMediaObjectUrl(apiMediaUrl)
    .then((objectUrl) => {
      avatarObjectUrlCache.set(apiMediaUrl, objectUrl);
      avatarFetchPromiseCache.delete(apiMediaUrl);
      return objectUrl;
    })
    .catch((error) => {
      avatarFetchPromiseCache.delete(apiMediaUrl);
      throw error;
    });

  avatarFetchPromiseCache.set(apiMediaUrl, request);
  return request;
};

export const statusImageLookup: any = {
  busy: <img src={BusyImage} alt="BusyImage" className="w-2.5 h-2.5" />,
  dnd: <img src={DNDImage} alt="DNDImage" className="w-2.5 h-2.5" />,
  online: <div className="w-2 h-2 rounded-full bg-green-500" />,
  offline: <div className="w-2 h-2 rounded-full bg-gray-500" />,
  call: <div className="w-2 h-2 rounded-full bg-red-500" />,
};

interface AvatarProps {
  size?: string;
  name?: string;
  showPresence?: boolean;
  extension?: string;
  image?: string;
  type?: string;
  grouped?: boolean;
  isActivityInfo?: boolean;
  textClass?: string;
  /* Wins over the status this component would otherwise derive from
     usersOnlineStatus. For the signed-in user's own avatar (the header
     chip), that derivation needs a live socket presence frame to ever
     show anything but "offline" — useMyPresence's optimistic override
     (set the instant a status is picked in the avatar menu) has nothing
     to hook into here without this. Any other avatar (someone else's, in
     a list) should leave this unset and keep reading the live feed. */
  presenceOverride?: 'online' | 'busy' | 'dnd' | 'offline' | 'call';
}
const CustomAvatar = ({
  name = '',
  size = '40',
  showPresence = false,
  extension = '',
  image = '',
  grouped = false,
  type = 'profile',
  isActivityInfo = true,
  textClass,
  presenceOverride,
}: AvatarProps) => {
  const { usersOnlineStatus, liveCalls, eventLiveCallsData } = useSocketEvents();
  const liveCallsData = getMonitoringLiveCalls(liveCalls, eventLiveCallsData);
  const { user } = useUser();
  const companyUuid = user?.company_info?.uuid || '';
  const { directSrc, apiMediaUrl } = useMemo(
    () => getAvatarSourceMeta(image || '', companyUuid, type),
    [image, companyUuid, type],
  );
  const [mediaUrl, setMediaUrl] = useState(
    () => directSrc || (apiMediaUrl ? avatarObjectUrlCache.get(apiMediaUrl) || '' : ''),
  );
  const [hasImageError, setHasImageError] = useState(false);

  const [modalState, setModalState] = useState<{ isModalOpen: boolean; selectedUser: any }>({
    isModalOpen: false,
    selectedUser: null,
  });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setHasImageError(false);

    if (!image) {
      setMediaUrl('');
      return;
    }

    if (directSrc) {
      setMediaUrl(directSrc);
      return () => {
        isCancelled = true;
      };
    }

    if (!apiMediaUrl) {
      setMediaUrl('');
      return () => {
        isCancelled = true;
      };
    }

    const cachedObjectUrl = avatarObjectUrlCache.get(apiMediaUrl);
    if (cachedObjectUrl) {
      // Apply cached url synchronously to avoid initials flicker on remount/rerender.
      setMediaUrl(cachedObjectUrl);
      return () => {
        isCancelled = true;
      };
    }

    getCachedAvatarObjectUrl(apiMediaUrl)
      .then((cachedUrl) => {
        if (!isCancelled) setMediaUrl(cachedUrl);
      })
      .catch((err) => {
        if (!isCancelled) {
          setMediaUrl('');
          setHasImageError(true);
        }
        console.log(err);
      });

    return () => {
      isCancelled = true;
    };
  }, [image, directSrc, apiMediaUrl]);
  const normalizedExtension = useMemo(() => String(extension ?? '').trim(), [extension]);
  const activeUser = useMemo(() => {
    if (!normalizedExtension || !Array.isArray(usersOnlineStatus)) return null;
    return (
      usersOnlineStatus.find(
        (statusUser: any) => String(statusUser?.userId ?? '').trim() === normalizedExtension,
      ) || null
    );
  }, [usersOnlineStatus, normalizedExtension]);

  const isOnCall = useMemo(() => {
    const callFromLiveCalls = Array.isArray(liveCallsData)
      ? liveCallsData.some(
          (callItem: any) =>
            isActiveMonitoringCall(callItem) &&
            isMonitoringCallForMember(callItem, normalizedExtension),
        )
      : false;
    return callFromLiveCalls || Boolean(activeUser?.onCall);
  }, [liveCallsData, normalizedExtension, activeUser?.onCall]);

  const isOnline = Boolean(activeUser?.online);
  const userStatus = String(activeUser?.status || '').toLowerCase();
  const status = isOnCall
    ? 'call'
    : presenceOverride || (isOnline ? userStatus || 'online' : 'offline');

  const NAME = name;
  const nameColour = stringToColour(NAME);
  const lightColor = darkenColor(`${nameColour}`, 90);
  const darkColor = lightenColorWithAlpha(`${nameColour}`, 5);

  const handleAvatarImageError = () => {
    setHasImageError(true);
    setMediaUrl('');
    if (apiMediaUrl) {
      const cachedObjectUrl = avatarObjectUrlCache.get(apiMediaUrl);
      if (cachedObjectUrl) {
        avatarObjectUrlCache.delete(apiMediaUrl);
        URL.revokeObjectURL(cachedObjectUrl);
      }
      avatarFetchPromiseCache.delete(apiMediaUrl);
    }
  };

  return (
    <>
      <div
        style={{
          width: `${size}px`,
          minWidth: `${size}px`,
          height: `${size}px`,
          background: '#FFFFFF',
        }}
        className={`rounded-full border border-white relative cursor-pointer`}
        onClick={(e) => {
          if (image && mediaUrl && !hasImageError) {
            e.stopPropagation();
            setIsLightboxOpen(true);
          } else if (activeUser && activeUser?.sessions?.length && isActivityInfo && !grouped) {
            setModalState({ isModalOpen: true, selectedUser: activeUser });
          }
        }}
      >
        {showPresence && (
          <div
            className={`flex items-center justify-content-center absolute top-[25%] -right-[90%]`}
            style={{
              width: `${size}px`,
              minWidth: `${size}px`,
              height: `${size}px`,
              background: 'transparent',
            }}
          >
            <CustomTooltip
              text={
                <div className={status === 'dnd' ? '' : 'capitalize'}>
                  {status === 'dnd' ? 'DND' : status}
                </div>
              }
            >
              {statusImageLookup[status]}
            </CustomTooltip>
          </div>
        )}
        {image && mediaUrl && !hasImageError ? (
          <img
            src={mediaUrl}
            className="w-full h-full rounded-full border"
            alt=""
            onError={handleAvatarImageError}
          />
        ) : (
          <div
            style={{
              color: lightColor,
              background: darkColor,
              gap: '1.5px',
            }}
            className={`flex items-center rounded-full justify-center text-sm font-bold h-full w-full ${textClass}`}
          >
            <span className="">{NAME?.split(' ')?.[0]?.charAt(0)?.toUpperCase()}</span>
            {NAME?.split(' ')?.[1] ? (
              <span className="">{NAME?.split(' ')?.[1]?.charAt(0)?.toUpperCase()}</span>
            ) : null}
          </div>
        )}
      </div>
      {modalState?.isModalOpen && (
        <UserLoginActivityModal
          modalState={modalState?.isModalOpen}
          setModalState={() => setModalState({ isModalOpen: false, selectedUser: null })}
          selectedUser={modalState?.selectedUser}
        />
      )}
      {isLightboxOpen && (
        <LightBoxPreview
          open={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          mediaUrl={mediaUrl}
          alt={NAME || 'Avatar'}
          type="image"
          senderName={NAME}
          senderAvatar={mediaUrl}
        />
      )}
    </>
  );
};

export default CustomAvatar;
