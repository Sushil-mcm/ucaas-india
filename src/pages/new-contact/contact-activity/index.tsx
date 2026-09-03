import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import CreateContactNew from '../create-new-contact';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getContactList } from '@/services/api';
import { Icon } from '@/assets/icons/icon';
import { useDialpad } from '@/hooks/use-dialpad';
import CustomAvatar from '@/components/custom/custom-avatar';
import ContactCallLogContent from '@/components/custom/contact-call-log-content';
import '@/styles/warm-glass.css';

const ContactActivity = () => {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contactId = searchParams.get('contactId');
  const isLeadList = searchParams.get('isLeadList') === 'true';
  const [showDialer, setShowDialer] = useState(false);
  const [numberToAdd, setNumberToAdd] = useState('');

  const { makeCall } = useDialpad();

  const { data: contactData } = useQuery({
    queryKey: ['getContactListById', contactId, isLeadList],
    queryFn: () =>
      getContactList({
        filters: [{ key: 'id', value: contactId }],
        page: 1,
        limit: 1,
        ...(isLeadList ? { isLeadList: true } : {}),
      }),
    select: (data) => data?.data?.data?.result?.rows?.[0] || null,
    enabled: Boolean(contactId && contactId !== 'add'),
  });
  const contactPhone = useMemo(() => {
    const apiPhone = contactData?.contact?.phone || contactData?.phone || '';
    const fallbackPhone = numberToAdd || '';
    return String(apiPhone || fallbackPhone)
      .trim()
      .replace(/\s+/g, '');
  }, [contactData, numberToAdd]);
  const contactDisplayName = useMemo(() => {
    const firstName =
      contactData?.name?.first || contactData?.firstName || contactData?.first_name || '';
    const lastName =
      contactData?.name?.last || contactData?.lastName || contactData?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }, [contactData]);

  useEffect(() => {
    if (searchParams.get('contactId')) {
      const contactId = searchParams.get('contactId');

      if (contactId === 'add' && searchParams.get('number')) {
        setNumberToAdd(searchParams.get('number') || '');
      }
    } else {
      navigate(isLeadList ? '/campaign/leads' : '/contact');
    }
  }, [isLeadList, navigate, searchParams]);

  useEffect(() => {
    window.addEventListener('OPEN_ACTIVITY_DIALER', openDialer);
    window.addEventListener('CLOSE_ACTIVITY_DIALER', closeDialer);

    return () => {
      window.removeEventListener('OPEN_ACTIVITY_DIALER', openDialer);
      window.removeEventListener('CLOSE_ACTIVITY_DIALER', closeDialer);
    };
  }, []);

  const closeDialer = useCallback(() => {
    setShowDialer(false);
  }, []);
  const openDialer = useCallback(() => {
    setShowDialer(true);
  }, []);
  const fallbackHeaderName = contactDisplayName || 'Unknown Contact';
  const fallbackHeaderNumber = contactPhone || '';
  const contactUuid = contactData?._id || contactData?.uuid || '';

  const handleHeaderCallAction = useCallback(() => {
    const normalizedNumber = String(contactPhone || '').trim();
    if (!normalizedNumber) return;

    const extraHeaders = [
      contactDisplayName ? `X-ContactName: ${contactDisplayName}` : '',
      contactUuid ? `X-ContactUuid: ${contactUuid}` : '',
    ].filter(Boolean) as string[];

    makeCall(normalizedNumber, { size: 'mini', extraHeaders });
  }, [contactDisplayName, contactPhone, contactUuid, makeCall]);

  const renderUnifiedHeader = () => (
    <div className="flex items-center w-full px-3 h-16 gap-2 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-none border-b border-[rgba(225,200,165,0.9)] min-h-[65px]">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center justify-center rounded-full w-9 h-9 text-[#9A948F] hover:bg-[#FBE2C8]/40 hover:text-[#2E2D35] shrink-0"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="relative">
        <CustomAvatar
          name={fallbackHeaderName || fallbackHeaderNumber}
          type="contact"
          image={contactData?.profile?.contactPic}
        />
      </div>
      <div className="flex flex-col min-w-0">
        <p className="font-semibold text-[#2E2D35] truncate text-md">{fallbackHeaderName}</p>
        {fallbackHeaderNumber ? (
          <p className="text-[#2E2D35] truncate text-sm">{fallbackHeaderNumber}</p>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled={!fallbackHeaderNumber}
          onClick={handleHeaderCallAction}
          className={`flex items-center justify-center rounded-full w-8 h-8 ${
            fallbackHeaderNumber
              ? 'bg-green-100 text-green-500 hover:bg-green-400 hover:text-white cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          aria-label="Call"
          title={fallbackHeaderNumber ? 'Call' : 'No number available'}
        >
          <Icon name="PhoneIcon" />
        </button>
        <button
          type="button"
          disabled={!fallbackHeaderNumber}
          onClick={() => navigate(`/inbox?formState=contact&number=${fallbackHeaderNumber}`)}
          className={`flex items-center justify-center rounded-full w-8 h-8 ${
            fallbackHeaderNumber
              ? 'bg-[#FBE2C8]/40 text-[#2E2D35]/80 hover:bg-primary hover:text-white cursor-pointer'
              : 'bg-[#FBE2C8]/40 text-[#9A948F] cursor-not-allowed'
          }`}
          aria-label="SMS"
          title={fallbackHeaderNumber ? 'SMS' : 'No number available'}
        >
          <Icon name="Letter" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden bg-white flex flex-col mcm-warm-glass">
      <div className="bg-white overflow-hidden">{renderUnifiedHeader()}</div>

      <div className="grid grid-cols-1 md:grid-cols-[26rem_minmax(0,1fr)] flex-1 min-h-0">
        <div className="flex flex-col p-3 gap-2 min-h-0 border-r">
          <p className="px-1 text-xs font-semibold tracking-wide text-[#9A948F] uppercase">
            Contact Details
          </p>
          <section className="bg-white overflow-hidden flex-1 min-h-0">
            {showDialer ? (
              <div className="flex items-center justify-center w-full h-full min-h-0 bg-white">
                <div className="flex items-center justify-center p-5">
                  {/* <CommonDialerWidget isShowCrossIcon={false} isSidebar={true} /> */}
                </div>
              </div>
            ) : (
              <div className="p-3 h-full min-h-0 overflow-hidden">
                <CreateContactNew
                  contactData={contactData}
                  isDisable={false}
                  prefillPhone={numberToAdd}
                  isLead={isLeadList}
                  hideCancelButton={true}
                  keepFormDataAfterSave={true}
                />
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-2 min-h-0">
          <section className="bg-white overflow-hidden flex-1 min-h-0">
            <ContactCallLogContent
              phoneNumber={contactPhone}
              hideInnerHeader={true}
              className="h-full min-h-0"
              state={state}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContactActivity;
