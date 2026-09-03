import { convertDateFormateApis, handleAlert } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDispositionInLeadContatc, getCallQueueNotesList } from '@/services/api';
import { Send } from '@/assets/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useUser } from '@/hooks/use-user';
import type { DialpadSession } from '@/context/dialpad-context';
import Loader from '../custom/loader';

export const DIALER_TAB_CONSTANT = {
  SUMMARY: 'Call Activity',
  TRANSCRIPT: 'Transcript',
  NOTES: 'Notes',
};

export const toNullableString = (value: unknown): string | null => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;

  const lowerCaseValue = normalized.toLowerCase();
  if (lowerCaseValue === 'undefined' || lowerCaseValue === 'null') return null;

  return normalized;
};

const getHeaderFirstValue = (
  headers: DialpadSession['headers'] | undefined,
  headerName: string,
): string => {
  if (!headers) return '';

  const normalizedHeaderName = headerName.trim().toLowerCase();
  const matchingHeaderEntry = Object.entries(headers).find(
    ([name]) => name.trim().toLowerCase() === normalizedHeaderName,
  );

  if (!matchingHeaderEntry) return '';

  const [, values] = matchingHeaderEntry;
  if (!Array.isArray(values) || values.length === 0) return '';

  return String(values[0] || '').trim();
};

const getNotesListFromResponse = (response: any) => {
  const candidateRows = [
    response?.data?.data?.result?.rows,
    response?.data?.result?.rows,
    response?.data?.data?.rows,
    response?.data?.rows,
    response?.data?.data?.result,
    response?.data?.result,
    response?.data?.data,
    response?.data,
  ];
  const rows = candidateRows.find((item) => Array.isArray(item)) || [];

  const allNotes = rows.flatMap((row: any) => {
    if (!row || typeof row !== 'object') return [];

    const rowSipCallId =
      toNullableString(row?.sipcallId) ?? toNullableString(row?.sipCallId) ?? undefined;

    if (Array.isArray(row?.notes) && row.notes.length > 0) {
      return row.notes.map((item: any) => ({
        ...item,
        sipcallId:
          toNullableString(item?.sipcallId) ?? toNullableString(item?.sipCallId) ?? rowSipCallId,
      }));
    }

    return [
      {
        ...row,
        sipcallId: rowSipCallId,
      },
    ];
  });

  return allNotes.sort((a: any, b: any) => {
    const left = new Date(a?.createdAt || 0).getTime();
    const right = new Date(b?.createdAt || 0).getTime();
    return left - right;
  });
};

const NotesWidget = ({
  contactId,
  sipCallId,
  activeSession,
  extraPayload,
  sipCallIdMode = false,
  readOnly = false,
  initialNotes = [],
  customClass = 'h-[calc(100vh_-_191px)]',
  defaultValue = '',
  drawerCallData,
}: {
  contactId?: string | null;
  sipCallId?: string;
  activeSession?: DialpadSession | null;
  extraPayload?: any;
  customClass?: string;
  defaultValue?: string;
  sipCallIdMode?: boolean;
  readOnly?: boolean;
  initialNotes?: any[];
  drawerCallData?: any;
}) => {
  console.log(
    drawerCallData?.caller_id_name,
    drawerCallData,
    'drawerCallData?.caller_id_namedrawerCallData?.caller_id_name',
  );

  const { user } = useUser();
  const [note, setNote] = useState<string>('');
  const scrollNoteRef = useRef<HTMLDivElement>(null);
  const resolvedContactId =
    toNullableString(contactId) ??
    toNullableString(activeSession?.liveCallData?.contact_uuid) ??
    toNullableString(getHeaderFirstValue(activeSession?.headers, 'x-contactuuid')) ??
    toNullableString(activeSession?.contactInfo?._id) ??
    null;
  const resolvedSipCallId =
    toNullableString(sipCallId) ??
    toNullableString(activeSession?.liveCallData?.sip_call_id) ??
    null;
  const resolvedRemotePhone =
    toNullableString(getHeaderFirstValue(activeSession?.headers, 'x-originalnumber')) ??
    toNullableString(activeSession?.remoteNumber) ??
    toNullableString(activeSession?.liveCallData?.called_number) ??
    toNullableString(extraPayload?.contactPhone) ??
    toNullableString(extraPayload?.phone) ??
    null;
  const hasValidRemotePhone = !!resolvedRemotePhone;
  const { mutate: noteMutate, isPending: isNotePending } = useMutation({
    mutationFn: addDispositionInLeadContatc,
    onSuccess: (data) => {
      refetch();
      setNote('');
      handleAlert({
        text: data?.data?.message || 'Note added successfully!',
        type: 'success',
      });
    },
  });
  const canSubmit = !!note?.trim() && !isNotePending;
  const normalizedInitialNotes = useMemo(() => {
    if (!Array.isArray(initialNotes)) return [];

    return initialNotes
      .map((item: any) => ({
        ...item,
        createdAt: item?.createdAt || item?.created_at || null,
        sipcallId:
          toNullableString(item?.sipcallId) ?? toNullableString(item?.sipCallId) ?? undefined,
      }))
      .sort((a: any, b: any) => {
        const left = new Date(a?.createdAt || 0).getTime();
        const right = new Date(b?.createdAt || 0).getTime();
        return left - right;
      });
  }, [initialNotes]);

  const {
    data: notesList = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['getAllNotesByUUid', sipCallIdMode ? resolvedSipCallId : resolvedRemotePhone],
    queryFn: () =>
      getCallQueueNotesList({
        ...(sipCallIdMode
          ? {
              sipCallId: resolvedSipCallId,
              phone: resolvedRemotePhone || drawerCallData?.caller_id_number,
            }
          : { phone: resolvedRemotePhone }),
      }),
    select: getNotesListFromResponse,
    enabled: !readOnly && (hasValidRemotePhone || (sipCallIdMode && !!resolvedSipCallId)),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const renderedNotes = readOnly ? normalizedInitialNotes : notesList;

  const handleNoteSave = () => {
    if (!note?.trim()) return;

    const userName = `${user?.user_info?.first_name} ${user?.user_info?.last_name}`;
    const queueId = toNullableString(activeSession?.queueMetaData?.id);
    const campaignId =
      toNullableString(activeSession?.campaignMetaData?.id) ??
      toNullableString(extraPayload?.campaign_detail?.campaignId) ??
      null;
    const liveForwardType = String(activeSession?.liveCallData?.forward_type || '')
      .trim()
      .toUpperCase();
    const liveCampaignType = String(activeSession?.liveCallData?.campaign_type || '')
      .trim()
      .toUpperCase();
    const isQueueCallSession = Boolean(
      queueId ||
      (liveForwardType === 'QUEUE' && toNullableString(activeSession?.liveCallData?.forward_value)),
    );
    console.log('🚀 ~ handleNoteSave ~ liveCallData:', activeSession);
    const isCampaignCallSession = Boolean(
      campaignId || liveForwardType === 'CAMPAIGN' || liveCampaignType,
    );
    const sessionSipCallId =
      resolvedSipCallId ??
      toNullableString(getHeaderFirstValue(activeSession?.headers, 'x-cid')) ??
      toNullableString(getHeaderFirstValue(activeSession?.headers, 'call-id')) ??
      null;
    const source = !sessionSipCallId
      ? 'CONTACT'
      : isCampaignCallSession
        ? 'LEAD'
        : isQueueCallSession
          ? 'QUEUE'
          : 'CALL';

    const campaignNumberId =
      toNullableString(activeSession?.liveCallData?.campaign_number_uuid) ||
      toNullableString(getHeaderFirstValue(activeSession?.headers, 'x-campaignnumberuuid')) ||
      toNullableString(extraPayload?.campaign_detail?.campaignNumberId) ||
      null;
    const contactPhone = resolvedRemotePhone || drawerCallData?.caller_id_number || '';
    const contactName =
      toNullableString(activeSession?.liveCallData?.contact_name) ??
      toNullableString(
        `${activeSession?.contactInfo?.name?.first || ''} ${activeSession?.contactInfo?.name?.last || ''}`,
      ) ??
      toNullableString(activeSession?.remoteName) ??
      null;

    const campaignName =
      toNullableString(activeSession?.campaignMetaData?.response?.name) ??
      toNullableString(activeSession?.liveCallData?.campaign_name) ??
      toNullableString(extraPayload?.campaign_detail?.campaignName) ??
      null;
    const campaignType =
      toNullableString(activeSession?.campaignMetaData?.response?.dialMethod) ??
      toNullableString(activeSession?.liveCallData?.campaign_type) ??
      null;
    const queueName = toNullableString(activeSession?.queueMetaData?.response?.name);
    const serviceDetail =
      source === 'LEAD'
        ? {
            name: campaignName,
            type: campaignType ?? 'CAMPAIGN',
            uuid: campaignId,
          }
        : source === 'QUEUE'
          ? {
              name: queueName,
              type: 'QUEUE',
              uuid: queueId,
            }
          : {
              name: null,
              type: null,
              uuid: null,
            };

    const payload = {
      note: {
        note: note?.trim(),
        name: toNullableString(userName),
        extension: toNullableString(user?.user_info?.extension),
        user_uuid: toNullableString(user?.uuid),
        createdAt: moment().utc().format(),
      },
      contactId: resolvedContactId,
      contactName,
      contactPhone,
      sipCallId: sessionSipCallId,
      source,
      serviceDetail,
      wrap_time_sec: null,
      campaignNumberId: campaignNumberId ? campaignNumberId : null,
      queueUuid: source === 'QUEUE' ? queueId : null,
      // ...(extraPayload ? { ...extraPayload } : {}),
    };

    noteMutate(payload);
  };

  useEffect(() => {
    if (scrollNoteRef.current) {
      scrollNoteRef.current.scrollTop = scrollNoteRef.current.scrollHeight;
    }
  }, [renderedNotes]);

  useEffect(() => {
    if (defaultValue) {
      setNote(defaultValue);
    }
  }, [defaultValue]);

  if (!readOnly && isLoading) {
    return (
      <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl overflow-hidden flex-1 flex min-h-0">
        <div className="w-full h-full bg-ucass-active-bg flex items-center justify-center text-[#2E2D35] p-4 text-center">
          <Loader variant="blue" size="sm" />
        </div>
      </div>
    );
  }

  return (
    <section
      className={`w-full flex flex-col overflow-hidden rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] ${customClass}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#EEE7DD] bg-ucass-active-bg px-4 py-3">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-[#2E2D35]">Notes</h3>
        </div>
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#2E2D35]">
          {renderedNotes?.length || 0} {renderedNotes?.length === 1 ? 'note' : 'notes'}
        </span>
      </header>

      <div className="w-full min-h-0 flex-1 overflow-y-auto bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-4 py-3" ref={scrollNoteRef}>
        {renderedNotes && renderedNotes?.length ? (
          <ul className="w-full flex flex-col gap-3">
            {renderedNotes?.map((item: any, index: number) => (
              <li
                className="w-full rounded-xl border border-[#EEE7DD] bg-ucass-active-bg p-3"
                key={item?._id || item?.createdAt || `${index}-${item?.name || 'note'}`}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-white text-[11px] font-semibold text-primary">
                      {(item?.name || 'U')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w: string) => w[0]?.toUpperCase())
                        .join('')}
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#2E2D35]">
                        {item?.name || 'Unknown User'}
                      </span>
                      <small className="text-xs font-medium text-[#9A948F]">
                        {convertDateFormateApis(item?.createdAt, 'MMM DD, hh:mm A')}
                      </small>
                    </div>
                  </div>
                  {item?.sipcallId && (
                    <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[11px] font-semibold text-yellow-700">
                      Via Call
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-primary/40 pl-2 text-sm leading-6 text-[#2E2D35]">
                  {item?.note}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-[#EEE7DD] bg-ucass-active-bg px-4">
            <div className="text-center">
              <p className="text-sm font-semibold text-[#2E2D35]">No notes yet</p>
              <p className="mt-1 text-xs text-[#9A948F]">
                Capture call highlights and follow-ups here.
              </p>
            </div>
          </div>
        )}
      </div>

      {!readOnly && (
        <footer className="border-t border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3">
          <div className="flex items-center gap-2">
            <div className="w-full rounded-xl border border-[#EEE7DD] bg-ucass-active-bg px-3 py-2">
              <textarea
                className="w-full min-h-[36px] max-h-[96px] resize-none border-0 bg-transparent text-sm leading-6 text-[#2E2D35] placeholder:text-[#9A948F] focus:outline-none"
                value={note}
                placeholder="Write a note..."
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleNoteSave}
              className={`${canSubmit ? 'cursor-pointer bg-primary text-white' : 'cursor-not-allowed bg-[#F0DFC5] text-[#9A948F]'} inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-transparent`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </footer>
      )}
    </section>
  );
};

export default NotesWidget;
