import type { DialpadSession } from '@/context/dialpad-context';
import { Phone, PhoneOff, UserCircle2 } from 'lucide-react';

type DialpadIncomingCallPopupProps = {
  session: DialpadSession;
  onAccept: () => void;
  onReject: () => void;
};

const DialpadIncomingCallPopup = ({
  session,
  onAccept,
  onReject,
}: DialpadIncomingCallPopupProps) => {
  const name = session.remoteName || 'Unknown Contact';
  const number = session.remoteNumber || 'Unknown Number';

  return (
    <div className="mb-3 rounded-2xl border border-[#d8e4f8] bg-[#f6f9ff] px-3 py-3 shadow-[0_12px_25px_rgba(25,58,112,0.12)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ucass-active-bg text-primary">
          <UserCircle2 className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#557095]">
            New Call Incoming
          </p>
          <p className="truncate text-sm font-semibold text-[#1b2e4b]">{name}</p>
          <p className="truncate text-xs text-[#647a9c]">{number}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReject}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffdfe3] text-[#be2237] transition hover:bg-[#ffc7cf]"
            aria-label="Reject incoming call"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcf7e7] text-[#1f9c4b] transition hover:bg-[#c7efd8]"
            aria-label="Accept incoming call"
          >
            <Phone className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialpadIncomingCallPopup;
