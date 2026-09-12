import type { DialpadSession } from '@/context/dialpad-context';
import { FaPhone } from '@/assets/icons';
import { useDialpad } from '@/hooks/use-dialpad';
import DialpadSessionSummaryCard from './dialpad-session-summary-card';

/* A call is "in progress" once the far end has answered; anything earlier is
   a ring, not a conversation. Same statuses the context uses to decide whether
   a new incoming call may take the active slot. */
const IN_CALL_STATUSES = new Set(['accepted', 'confirmed']);

type DialpadRingingScreenProps = {
  session: DialpadSession | null;
  onAccept: () => void;
  onReject: () => void;
};

const DialpadRingingScreen = ({ session, onAccept, onReject }: DialpadRingingScreenProps) => {
  const { sessions } = useDialpad();
  /* Call waiting: this ring arrived while another call is in progress. The
     switch only sends it here when the person's rule allows a second call (or
     has no rule); answering holds the current call (switchActiveSession), and
     rejecting sends the caller on to the person's after-ring destination. */
  const isCallWaiting = Object.values(sessions || {}).some(
    (other) => other?.id !== session?.id && IN_CALL_STATUSES.has(String(other?.status || '')),
  );
  return (
    <div className="flex h-full flex-col items-center justify-center px-2.5 py-2.5 text-center max-[380px]:px-2 max-[380px]:py-2 sm:px-4 sm:py-4 w-full">
      <div className="w-full rounded-[24px] border border-ucass-active-bg bg-ucass-active-bg px-3 py-4  max-[380px]:px-2.5 max-[380px]:py-3 sm:rounded-[28px] sm:px-4 sm:py-5 md:px-5 md:py-6">
        <div className="mx-auto mb-3 max-w-[420px] text-left sm:mb-4">
          <DialpadSessionSummaryCard
            session={session}
            statusLabel={isCallWaiting ? 'Call Waiting' : 'Incoming Call'}
            showTimer={false}
          />
          {isCallWaiting ? (
            <p className="mt-2 text-xs text-[#557095]">
              Answering puts your current call on hold. Rejecting sends this caller to your
              after-ring destination.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 max-[380px]:gap-1 sm:mt-5 sm:gap-2 md:gap-4">
          <button
            type="button"
            onClick={onReject}
            className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-[#ffe4e8] px-2 text-[11px] font-semibold text-[#be2237] transition max-[380px]:h-8 max-[380px]:text-[10px] sm:h-10 sm:gap-1.5 sm:px-3 sm:text-xs md:h-12 md:gap-2 md:px-4 md:text-sm hover:bg-red-600 hover:text-white"
          >
            <FaPhone className="-rotate-[135deg] h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
            Reject
          </button>

          <button
            type="button"
            onClick={onAccept}
            className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-[#dff8ea] px-2 text-[11px] font-semibold text-[#1f9c4b] transition max-[380px]:h-8 max-[380px]:text-[10px] sm:h-10 sm:gap-1.5 sm:px-3 sm:text-xs md:h-12 md:gap-2 md:px-4 md:text-sm hover:bg-green-600 hover:text-white"
          >
            <FaPhone className="-scale-x-100 h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialpadRingingScreen;
