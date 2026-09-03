import ContactCallLogContent from '@/components/custom/contact-call-log-content';
import type { DialpadSession } from '@/context/dialpad-context';

type DialpadMaxiTabCallHistoryProps = {
  activeSession: DialpadSession | null;
};

const DialpadMaxiTabCallHistory = ({ activeSession }: DialpadMaxiTabCallHistoryProps) => {
  const contactPhone = activeSession?.remoteNumber || activeSession?.liveCallData?.called_number;

  return activeSession ? (
    <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
      <ContactCallLogContent
        phoneNumber={contactPhone}
        hideInnerHeader={true}
        className="h-full min-h-0"
        state={{}}
      />
    </div>
  ) : (
    <div className="h-full rounded-2xl border border-ucass-active-bg bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-3 max-[380px]:px-2.5 max-[380px]:py-2.5 sm:px-4 sm:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] max-[380px]:text-[10px] sm:text-xs">
        Call History
      </p>
      <p className="mt-2 text-[13px] text-[#6c809e] max-[380px]:text-xs sm:text-sm">
        No active session available.
      </p>
    </div>
  );
};

export default DialpadMaxiTabCallHistory;
