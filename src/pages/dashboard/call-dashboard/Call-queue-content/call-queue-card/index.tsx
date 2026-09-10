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
import { useSocketEvents } from '@/hooks/use-socket-events';
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
    agent = [],
  } = queue || {};
  const { activeQueueData, setActiveQueueData } = useDialpad();
  const hasFiredUnavailableOnUnloadRef = useRef(false);
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    data: [],
    type: null,
  });

  const { liveQueueCalls } = useSocketEvents();
  /* Extension first, name second: names are editable and can collide across
     divisions, the extension is the queue's actual address. */
  const live = (Array.isArray(liveQueueCalls) ? liveQueueCalls : []).find(
    (row: any) =>
      (row?.extension && String(row.extension) === String(extension)) ||
      String(row?.name || '').toLowerCase() === String(name || '').toLowerCase(),
  );
  const waitingNow = Number(live?.waiting_count ?? live?.waiting ?? 0);
  const avgWait = Number(live?.avg_wait_time_sec || 0);
  const availableNow = Number(live?.available_count || 0);
  const sla = Number(live?.sla_within_20_sec_percent || 0);

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

  /* Opaque surfaces, not glass. The card used to be a translucent blue-tinted
     gradient (0.72 -> 0.5 alpha) over a 26px backdrop-blur, sitting on the
     Performance page's warm radial gradients (`perf-warm-toolbar`). All three
     cards shared identical CSS yet each rendered a different shade, because
     glass samples whatever is behind it and each card sits over a different
     part of the orange wash. The panels nested inside then stacked more alpha
     on an already-translucent parent, so their edges melted into the card.
     Glass cannot be position-independent; an opaque fill is what makes the
     three cards agree wherever they land in the grid.

     `bg-[var(--surface)]` rather than `bg-white dark:bg-mcm-surface` on purpose. mcm-page.css rewrites
     any rounded `.bg-white dark:bg-mcm-surface` inside `.mcm-page` to `var(--glass-surface)` and
     `var(--glass-border)`, which silently put this card back to 0.85-alpha
     glass and dropped the border colour set here. The arbitrary-value class
     is the same colour without matching that selector.

     Colours are the page's own tokens: `--surface` (#ffffff) for the card,
     `--surface-2` (#fbf3e8) for the panels inside it so they read as
     contained, `--line` (#eee7dd) for every edge. The shadow is warm to match
     `--pl-glass-shadow`; the blue one it carried before is what made the card
     read as cold against the peach ground. */
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_10px_30px_-5px_rgba(234,88,12,0.10),0_4px_12px_-2px_rgba(60,40,30,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_35px_-5px_rgba(234,88,12,0.18)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-base font-bold capitalize text-[var(--ink)]">{name}</p>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1">
            <Icon name="Grid" className="w-3.5 h-3.5 text-[var(--ink-2)]" />
            <span className="truncate text-xs font-semibold text-[var(--ink-2)]">
              {extension || ''}
            </span>
          </div>
          {/* `data-slot="button"` is not decorative: mcm-page.css resets every
              bare <button> inside `.mcm-page` (background:none, color:inherit)
              at a specificity that outranks Tailwind utilities, and exempts
              this attribute. Without it the fill and text colour below are
              silently dropped and the control renders as plain text. */}
          <button
            onClick={handleMakeAvailable}
            type="button"
            data-slot="button"
            disabled={isPending}
            aria-label={isAvailable ? `Leave ${name} queue` : `Join ${name} queue`}
            className={`inline-flex h-8 min-w-[76px] shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              isAvailable
                ? 'border border-rose-300 bg-white dark:bg-mcm-surface text-rose-600 shadow-[0_1px_3px_rgba(190,60,60,0.14)] hover:border-rose-400 hover:bg-rose-50'
                : 'border border-transparent bg-primary text-white shadow-[0_3px_10px_rgba(194,98,46,0.32)] hover:brightness-95 hover:shadow-[0_4px_14px_rgba(194,98,46,0.4)]'
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
        </div>
      </div>

      {/* Members Section */}
      {members && members?.length > 0 && (
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)]">
            Members
          </span>
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
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-2)] text-xs shadow-[0_2px_6px_rgba(120,90,60,0.16)] cursor-pointer transition-transform hover:z-10 hover:-translate-y-0.5"
                  >
                    {member?.profile ? (
                      <img
                        className="h-full w-full rounded-full object-cover"
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
                              'initials-fallback w-full h-full flex items-center justify-center rounded-full text-primary capitalize text-sm font-semibold';
                            fallback.textContent = initials;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold capitalize text-primary">
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
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-primary text-[11px] font-semibold text-white shadow-[0_2px_6px_rgba(194,98,46,0.28)] cursor-pointer transition-transform hover:z-10 hover:-translate-y-0.5 hover:brightness-95"
              >
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manager now leads the live-state grid below it: the queue's owner
          is who this card names first, the numbers are the state of what
          they own. No "MANAGER" caption - the avatar and the email already
          say what this panel is, so the word would spend a row saying
          nothing. */}
      <div className="flex items-center gap-2.5 rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5">
        <CustomAvatar
          size="30"
          name={parsedManager?.name}
          extension={extension}
          image={parsedManager?.profile}
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold leading-tight text-[var(--ink)]">
            {parsedManager?.name}
          </span>
          <CustomTooltip text={parsedManager?.email}>
            <small className="truncate text-[11px] leading-tight text-[var(--ink-2)]">
              {parsedManager?.email || 'No email'}
            </small>
          </CustomTooltip>
        </div>
      </div>

      {/* Live state. This page sits under Performance and carried none of it:
          three cards naming a queue, its manager and some avatars, with no way
          to tell which queue is in trouble. The figures come from the same
          `liveQueueCalls` feed the Wallboard reads, matched on extension first
          and name second, so a card and the Wallboard cannot disagree. */}
      <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)]">
        <div className="grid grid-cols-4 divide-x divide-[var(--line)]">
          <div className="px-2 py-1.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)]">
              Waiting
            </p>
            <p
              className={`mt-1 text-lg font-bold leading-none ${
                waitingNow > 4
                  ? 'text-[#C0261F]'
                  : waitingNow > 0
                    ? 'text-[#C2670A]'
                    : 'text-[var(--ink)]'
              }`}
            >
              {live ? waitingNow : '--'}
            </p>
          </div>
          <div className="px-2 py-1.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)]">
              Avg wait
            </p>
            <p className="mt-1 text-lg font-bold leading-none text-[var(--ink)]">
              {live ? `${avgWait}s` : '--'}
            </p>
          </div>
          <div className="px-2 py-1.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)]">
              Available
            </p>
            <p className="mt-1 text-lg font-bold leading-none text-[var(--ink)]">
              {live ? (
                <>
                  {availableNow}
                  <span className="text-[11px] font-medium text-[var(--ink-2)]">
                    /{members?.length || 0}
                  </span>
                </>
              ) : (
                '--'
              )}
            </p>
          </div>
          <div className="px-2 py-1.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)]">SLA</p>
            <p
              className={`mt-1 text-lg font-bold leading-none ${
                sla >= 80 ? 'text-[#0F766E]' : sla >= 70 ? 'text-[#C2670A]' : 'text-[#C0261F]'
              }`}
            >
              {live ? `${sla}%` : '--'}
            </p>
          </div>
        </div>
        {/* The SLA number alone needs reading; the bar is comparable across
            the three cards at a glance, which is how this page is scanned. */}
        {live && (
          <div className="h-1 w-full bg-[var(--line)]">
            <div
              className={`h-full transition-all duration-500 ${
                sla >= 80 ? 'bg-[#0F766E]' : sla >= 70 ? 'bg-[#C2670A]' : 'bg-[#C0261F]'
              }`}
              style={{ width: `${Math.min(Math.max(sla, 0), 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Members Modal */}
      {modalState?.open && (
        <QueueMemberModal modalState={modalState} setModalState={setModalState} />
      )}
    </div>
  );
};

export default CallQueueCard;
