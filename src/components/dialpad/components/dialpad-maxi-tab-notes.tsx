import NotesWidget from '@/components/notes';
import type { DialpadSession } from '@/context/dialpad-context';
import { useMemo } from 'react';

type DialpadMaxiTabNotesProps = {
  activeSession: DialpadSession | null;
};

const DialpadMaxiTabNotes = ({ activeSession }: DialpadMaxiTabNotesProps) => {
  const formContactData = useMemo(() => {
    if (!activeSession) return null;
    return activeSession.contactInfo ?? null;
  }, [activeSession]);
  const sipCallId = String(activeSession?.liveCallData?.sip_call_id || '').trim();
  const contactId = activeSession?.liveCallData?.contact_uuid ?? formContactData?._id;
  return activeSession ? (
    <NotesWidget sipCallId={sipCallId} contactId={contactId} activeSession={activeSession} />
  ) : (
    <div className="h-full rounded-2xl border border-ucass-active-bg bg-white px-3 py-3 max-[380px]:px-2.5 max-[380px]:py-2.5 sm:px-4 sm:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] max-[380px]:text-[10px] sm:text-xs">
        Notes
      </p>
      <p className="mt-2 text-[13px] text-[#6c809e] max-[380px]:text-xs sm:text-sm">
        No active session available.
      </p>
    </div>
  );
};

export default DialpadMaxiTabNotes;
