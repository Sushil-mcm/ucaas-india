import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callList } from '@/services/api';
import { groupContiguousRunsSmart, cn } from '@/lib/utils';
import { useFetchContact } from '@/hooks/common';
import { useCompanyFeatures } from '@/hooks/rbac';
import { LogContent } from '@/pages/phone';
import Loader from '@/components/custom/loader';

type ContactCallLogContentProps = {
  phoneNumber?: string | null;
  className?: string;
  tabType?: 'all' | 'call' | 'recording' | 'voicemail';
  hideInnerHeader?: boolean;
  headerContactName?: string;
  headerContactNumber?: string;
  onHeaderBack?: () => void;
  state?: any;
};

const ContactCallLogContent = ({
  phoneNumber,
  className,
  tabType = 'all',
  hideInnerHeader = false,
  headerContactName,
  headerContactNumber,
  onHeaderBack,
  state,
}: ContactCallLogContentProps) => {
  console.log(state, 'statestate+++');

  const fetchPayload = state ? { page: 1, limit: 100, filter: [state] } : undefined;
  const { data: dataFetchContact, isPending: isContactLoading } = useFetchContact(fetchPayload);
  const { features } = useCompanyFeatures();
  const callAccess = features?.plan_features?.advance_call_management?.access;
  const [manualCallLogData, setManualCallLogData] = useState<any | null>(null);

  const normalizedPhone = useMemo(
    () =>
      String(phoneNumber || '')
        .trim()
        .replace(/\s+/g, ''),
    [phoneNumber],
  );

  const { data: callRows = [], isLoading: isCallListLoading } = useQuery({
    queryKey: ['contactCallLogContentByPhone', normalizedPhone],
    queryFn: () =>
      callList({
        page: 1,
        limit: 100,
        filter: [{ key: 'phone', value: normalizedPhone }],
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: Boolean(normalizedPhone),
  });

  const groupedCallLogs = useMemo(() => {
    if (!Array.isArray(callRows) || !callRows.length) return [];

    const mappedRows = callRows.map((item: any) => {
      const getNumber =
        item?.direction === 'Outbound' ? item?.destination_number : item?.caller_id_number;
      const filterNumber = String(getNumber || '').replace(/^\s*\+|\s+/g, '');
      const contactMap = dataFetchContact?.[filterNumber] || {};
      const contactUserName = contactMap?.first_name
        ? `${contactMap.first_name}${contactMap.last_name ? ` ${contactMap.last_name}` : ''}`
        : 'Unknown Contact';

      return {
        ...item,
        contact_username: contactUserName,
        contact_id: contactMap?.id || null,
      };
    });

    return groupContiguousRunsSmart(mappedRows);
  }, [callRows, dataFetchContact]);

  const getEntrySelectionKey = (entry: any) =>
    String(
      entry?.main?.id ||
        entry?.main?.xml_cdr_uuid ||
        entry?.main?.sipcall_id ||
        entry?.main?.start_stamp ||
        '',
    );

  const getEntryNumber = (entry: any) => {
    const number =
      entry?.main?.direction === 'Outbound'
        ? entry?.main?.destination_number
        : `${entry?.main?.caller_id_number || ''}`;
    return String(number || '').replace(/ /g, '');
  };

  const defaultCallLogData = useMemo(() => {
    if (!groupedCallLogs?.length) return {};
    const firstEntry = groupedCallLogs[0];
    return {
      ...firstEntry,
      number: getEntryNumber(firstEntry),
    };
  }, [groupedCallLogs]);

  const callLogData = useMemo(() => {
    if (!manualCallLogData || !Object.keys(manualCallLogData).length) {
      return defaultCallLogData;
    }

    const selectedKey = getEntrySelectionKey(manualCallLogData);
    if (!selectedKey) return defaultCallLogData;

    const selectedEntry = groupedCallLogs.find(
      (entry: any) => getEntrySelectionKey(entry) === selectedKey,
    );
    if (!selectedEntry) return defaultCallLogData;

    return {
      ...selectedEntry,
      number: getEntryNumber(selectedEntry),
    };
  }, [manualCallLogData, groupedCallLogs, defaultCallLogData]);

  const handleSetCallLogData = (nextValue: any) => {
    if (!nextValue || !Object.keys(nextValue).length) {
      setManualCallLogData(null);
      return;
    }
    setManualCallLogData(nextValue);
  };

  useEffect(() => {
    setManualCallLogData(null);
  }, [normalizedPhone]);

  const renderFallbackPane = (content: ReactNode) => (
    <div className="w-full h-full min-h-[inherit] bg-white flex items-center justify-center text-gray-700 p-4 text-center">
      {content}
    </div>
  );

  const isLoading = isCallListLoading || isContactLoading;

  if (isLoading) {
    return (
      <div className={cn('h-full flex flex-col min-h-0', className)}>
        {renderFallbackPane(<Loader variant="blue" size="sm" />)}
      </div>
    );
  }

  if (!normalizedPhone) {
    return (
      <div className={cn('h-full flex flex-col min-h-0', className)}>
        {renderFallbackPane('Contact phone number is not available.')}
      </div>
    );
  }

  if (!groupedCallLogs?.length) {
    return (
      <div className={cn('h-full flex flex-col min-h-0', className)}>
        {renderFallbackPane('No call logs found for this contact.')}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full flex flex-col min-h-0',
        hideInnerHeader
          ? '[&>div]:h-full [&>div]:min-h-0 [&>div[data-log-view=logs]>div:first-child]:hidden [&>div[data-log-view=logs]>div:nth-child(2)]:h-full [&>div[data-log-view=logs]>div:nth-child(2)]:min-h-0 [&>div[data-log-view=logs]>div:nth-child(3)]:h-full [&>div[data-log-view=logs]>div:nth-child(3)]:min-h-0'
          : '',
        className,
      )}
    >
      <LogContent
        logData={callLogData}
        tabType={tabType}
        setLogData={handleSetCallLogData}
        callAccess={callAccess}
        onHeaderBack={onHeaderBack}
        headerContactName={headerContactName}
        headerContactNumber={headerContactNumber}
      />
    </div>
  );
};

export default ContactCallLogContent;
