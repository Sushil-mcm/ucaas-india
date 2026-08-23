import { useMemo } from 'react';
import type { DialpadSession } from '@/context/dialpad-context';
import CreateContactNew from '@/pages/new-contact/create-new-contact';
import { useDialpad } from '@/hooks/use-dialpad';

type DialpadMaxiTabContactInfoProps = {
  activeSession: DialpadSession | null;
  typedNumber: string;
};

const DialpadMaxiTabContactInfo = ({
  activeSession,
  typedNumber,
}: DialpadMaxiTabContactInfoProps) => {
  const { refreshSessionContactInfo } = useDialpad();
  const normalizedTypedNumber = typedNumber.trim();
  const formContactData = useMemo(() => {
    const sessionContactInfo = activeSession?.contactInfo;
    if (!sessionContactInfo) return null;
    if (Array.isArray(sessionContactInfo))
      return sessionContactInfo.length ? sessionContactInfo : null;
    if (typeof sessionContactInfo === 'object') {
      return Object.keys(sessionContactInfo).length ? sessionContactInfo : null;
    }
    return sessionContactInfo;
  }, [activeSession?.contactInfo]);
  const prefillPhone = useMemo(() => {
    if (!activeSession) return normalizedTypedNumber;
    if (formContactData) return '';
    return String(activeSession.remoteNumber || activeSession.extension || '').trim();
  }, [activeSession, formContactData, normalizedTypedNumber]);

  return (
    <div className="h-full rounded-2xl border border-ucass-active-bg bg-white px-3 py-3 max-[380px]:px-2.5 max-[380px]:py-2.5 sm:px-4 sm:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] max-[380px]:text-[10px] sm:text-xs">
        Contact Info
      </p>
      {activeSession ? (
        <CreateContactNew
          contactData={formContactData}
          prefillPhone={prefillPhone}
          hideCancelButton
          isDisable={false}
          setIsDisable={() => void 0}
          setDrawerState={() => void 0}
          keepFormDataAfterSave
          setTabData={(savedContact) => {
            if (activeSession?.id) refreshSessionContactInfo(activeSession.id, savedContact);
          }}
        />
      ) : (
        <p className="mt-2 text-[13px] text-[#6c809e] max-[380px]:text-xs sm:text-sm">
          No active session available.
        </p>
      )}
    </div>
  );
};

export default DialpadMaxiTabContactInfo;
