import { useMutation } from '@tanstack/react-query';
import { makeCallQueueAvailable } from '@/services/api';
import Loader from '@/components/custom/loader';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Icon } from '@/assets/icons/icon';
import { safeJSONParse } from '@/components/activity-list/constants';
import { useEffect, useRef, useState } from 'react';
import { getInitials } from '@/lib/utils';
import { useDialpad } from '@/hooks/use-dialpad';
import QueueMemberModal from '@/pages/auto-dialer/campaign/modal/new-queue-member-modal';

interface IMember {
  name: string;
  value: string;
  email: string;
  role: string;
  user_uuid?: string;
  profile?: string;
}

interface ICallQueueCardProps {
  queue: {
    name: string;
    extension: string;
    manager: any;
    uuid: string;
    agent: any;
    members?: string | IMember[];
    agentDetail: any;
  };
  refetch: any;
}

interface ModalState {
  open: boolean;
  data: IMember[];
  type: string | null;
}

const CallQueueCard = ({ queue, refetch }: ICallQueueCardProps) => {
  const {
    name = '',
    extension = '',
    manager = {},
    uuid = '',
    members: membersProp,
    agentDetail,
    agent = [],
  } = queue || {};
  const { activeQueueData, setActiveQueueData } = useDialpad();
  const hasFiredUnavailableOnUnloadRef = useRef(false);
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    data: [],
    type: null,
  });

  const parsedManager = safeJSONParse(manager, {});

  // Parse members
  let members: IMember[] = [];
  try {
    const parsedMembers = membersProp
      ? typeof membersProp === 'string'
        ? JSON.parse(membersProp || '[]')
        : membersProp
      : [];
    members = Array.isArray(parsedMembers)
      ? Array.from(new Map(parsedMembers.map((item: any) => [item.user_uuid, item])).values())
      : [];
  } catch (error) {
    console.error('Error parsing members:', error);
    members = [];
  }

  const { mutate: mutateMakeAvailable, isPending } = useMutation({
    mutationFn: makeCallQueueAvailable,
    onSuccess: (_response, variables: any) => {
      if (variables?.status === 'Available') {
        setActiveQueueData(queue);
      }
      if (variables?.status === 'On Break') {
        setActiveQueueData((previousValue: any) =>
          previousValue?.uuid === uuid ? null : previousValue,
        );
      }
      refetch();
    },
  });

  console.log('agentDetail', agentDetail);

  const isAvailable = agent?.[0]?.status === 'Available';

  const handleMakeAvailable = () => {
    const payload = {
      queue_uuid: uuid,
      status: isAvailable ? 'On Break' : 'Available',
      state: isAvailable ? 'Idle' : 'Waiting',
    };
    mutateMakeAvailable(payload);
  };

  useEffect(() => {
    if (!activeQueueData?.uuid || activeQueueData.uuid !== uuid) return;

    const makeQueueUnavailableOnReload = () => {
      if (hasFiredUnavailableOnUnloadRef.current) return;
      hasFiredUnavailableOnUnloadRef.current = true;

      void makeCallQueueAvailable({
        queue_uuid: String(activeQueueData.uuid || '').trim(),
        status: 'On Break',
        state: 'Idle',
      }).catch(() => {
        // Ignore unload API errors.
      });
    };

    window.addEventListener('beforeunload', makeQueueUnavailableOnReload);
    window.addEventListener('pagehide', makeQueueUnavailableOnReload);

    return () => {
      window.removeEventListener('beforeunload', makeQueueUnavailableOnReload);
      window.removeEventListener('pagehide', makeQueueUnavailableOnReload);
    };
  }, [activeQueueData?.uuid, uuid]);

  return (
    <div className="flex flex-col border border-gray-200 bg-gray-100 rounded-xl w-full p-3 gap-3">
      <div className="flex items-center justify-between">
        <p className="capitalize text-md font-semibold truncate">{name}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMakeAvailable}
            type="button"
            disabled={isPending}
            className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              isAvailable
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-600 text-white border-emerald-600'
            }`}
          >
            {isPending ? (
              <Loader variant={isAvailable ? 'green' : 'blue'} size="sm" />
            ) : isAvailable ? (
              'Leave'
            ) : (
              'Join'
            )}
          </button>

          <div className="flex gap-1 items-center">
            <Icon name="Grid" className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 truncate text-xs">{extension || ''}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-gray-500 uppercase">Manager</span>
        <div className="flex items-center gap-3 border rounded-lg p-2 bg-white">
          <CustomAvatar
            name={parsedManager?.name}
            extension={extension}
            image={parsedManager?.profile}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{parsedManager?.name}</span>
            <small className="text-primary text-[10px]">{parsedManager?.role}</small>
            <CustomTooltip text={parsedManager?.email}>
              <small className="text-gray-500 truncate text-xs">
                {parsedManager?.email || 'No email'}
              </small>
            </CustomTooltip>
          </div>
        </div>
      </div>

      {/* Members Section */}
      {members && members?.length > 0 && (
        <div className="flex flex-col gap-1 pt-2">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">Members</span>
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member: IMember, memberIndex: number) => {
              const username = member?.name || 'Unknown';
              const initials = getInitials(username);
              return (
                <CustomTooltip key={memberIndex} text={username} side="top">
                  <div
                    onClick={() => {
                      setModalState({ open: true, data: members || [], type: 'Total Members' });
                    }}
                    className="w-10 h-10 flex items-center justify-center border-2 border-white rounded-full bg-gray-200 dark:border-gray-800 cursor-pointer"
                  >
                    {member?.profile ? (
                      <img
                        className="w-10 h-10 rounded-full"
                        src={member.profile}
                        alt={username}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.initials-fallback')) {
                            const fallback = document.createElement('div');
                            fallback.className =
                              'initials-fallback w-full h-full flex items-center justify-center rounded-full border-2 border-gray-400 bg-gray-100 text-gray-600 capitalize text-sm font-medium';
                            fallback.textContent = initials;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center rounded-full border-2 border-gray-400 bg-gray-100 text-gray-600 capitalize text-sm font-medium">
                        {initials}
                      </div>
                    )}
                  </div>
                </CustomTooltip>
              );
            })}

            {members?.length > 5 && (
              <div
                onClick={() => {
                  setModalState({ open: true, data: members || [], type: 'Total Members' });
                }}
                className="w-10 h-10 flex items-center justify-center border-2 border-gray-500 rounded-full bg-gray-500 text-white text-xs font-medium cursor-pointer hover:bg-gray-600"
              >
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members Modal */}
      {modalState?.open && (
        <QueueMemberModal modalState={modalState} setModalState={setModalState} />
      )}
    </div>
  );
};

export default CallQueueCard;
