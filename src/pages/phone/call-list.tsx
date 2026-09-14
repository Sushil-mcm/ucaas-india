import { User } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import Loader from '@/components/custom/loader';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFetchContact } from '@/hooks/common';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useUser } from '@/hooks/use-user';
import { convertDateFormateApis } from '@/lib/utils';
// import { callList } from '@/services/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import NotFound from '@/assets/images/not-found-img.svg';
import { fetchPhone } from '@/services/api';
import { pickCounterpartNumber } from '@/lib/call-number';
import { useCallLogRefresh } from './console/use-call-log-refresh';

const getEntryNumber = (main: any = {}) =>
  pickCounterpartNumber(main).replace(/ /g, '');

const getEntryLogs = (main: any = {}) => {
  const callLogs = Array.isArray(main?.call_logs)
    ? main.call_logs.filter((item: any) => item && typeof item === 'object')
    : [];
  return callLogs.length ? callLogs : main && Object.keys(main).length ? [main] : [];
};

const buildLogData = (main: any = {}) => {
  const accLogs = getEntryLogs(main);
  return {
    main,
    count: main?.count ?? accLogs.length,
    acc_logs: accLogs,
    number: getEntryNumber(main),
  };
};

const getFilteredData = ({ result = [], dataFetchContact = {}, search = '' }: any) => {
  if (!result?.length) return [];

  const list = result.filter((item: any) => {
    const getNumber = pickCounterpartNumber(item);

    const filterNumber = getNumber || '';
    const getUser = dataFetchContact?.[filterNumber] || {};
    const contactUserName = getUser?.first_name
      ? `${getUser.first_name}${getUser.last_name ? ` ${getUser.last_name}` : ''}`
      : 'Unknown Contact';
    const isNumberMatch = filterNumber.includes(search?.replace(/^\s*\+|\s+/g, ''));
    const isNameMatch = contactUserName?.toLowerCase()?.includes(search?.toLowerCase());
    item.contact_username = contactUserName;
    item.contact_id = getUser?.id || null;
    return isNumberMatch || isNameMatch;
  });
  return list;
};

const CallList = forwardRef(
  (
    {
      type = 'all',
      tabType = '',
      filter = [],
      setLogData,
      search,
      filterDate,
    }: {
      type: string;
      tabType: string;
      filter?: any[];
      logData?: any;
      setLogData?: any;
      search?: string;
      filterDate?: { from?: string; to?: string };
    },
    ref,
  ) => {
    const { user } = useUser();
    /* Bring a just-finished call into this list without a manual refresh. The
       hook lives with the console because that is where it was first needed,
       but the Calls, Recordings and Voicemails tabs all render this component
       with the console unmounted, so it has to be invoked here too. */
    useCallLogRefresh();
    const { data: dataFetchContact } = useFetchContact();
    const [selectedId, setSelectedId] = useState<string | number | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const { features } = useCompanyFeatures();
    const reportsActionAccess = features?.plan_features?.reports?.action;
    const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
      useInfiniteQuery({
        queryKey: ['callListing', type, tabType, filter, filterDate?.from, filterDate?.to],
        queryFn: ({ pageParam = 1 }) =>
          fetchPhone({
            page: pageParam,
            limit: 100,
            type: tabType === 'call' ? undefined : tabType,
            filter,
            filter_date: {
              from: filterDate?.from,
              to: filterDate?.to,
            },
            sort: { key: 'start_stamp', desc: true },
          }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => {
          const result = lastPage?.data?.data?.result;
          if (!result) return undefined;
          const { currentPage, totalPages } = result;
          if (!currentPage || !totalPages) return undefined;
          if (currentPage >= totalPages) return undefined;
          return currentPage + 1;
        },
      });

    const callListingData = useMemo(
      () => data?.pages.flatMap((page: any) => page?.data?.data?.result?.rows || []),
      [data],
    );

    useEffect(() => {
      if (!bottomRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 1 },
      );

      observer.observe(bottomRef.current);

      return () => {
        if (bottomRef.current) observer.unobserve(bottomRef.current);
      };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // const {
    //   data: callListingData,
    //   isPending,
    //   refetch,
    // } = useQuery({
    //   queryKey: ['callListing', type, tabType],
    //   queryFn: () =>
    //     callList({
    //       page: 1,
    //       limit: 1000,
    //       type: tabType === 'call' ? undefined : tabType,
    //       filter,
    //     }),
    //   select: (data) => data?.data?.data?.result?.rows,
    // });

    useImperativeHandle(ref, () => ({
      refetchList: () => refetch(),
    }));

    const callListData = useMemo(
      () => getFilteredData({ result: callListingData, dataFetchContact, search }),
      [callListingData, dataFetchContact, search],
    );

    function handleMembers(members = '') {
      if (!members) return '';
      const extensions = members?.split(',');
      const names: any = [];
      for (let index = 0; index < extensions.length; index++) {
        const element = extensions[index];
        if (user?.user_info?.extension === element) {
          names.unshift('You');
        } else {
          names.push(element);
        }
      }
      return ` (${names.join(',')})`;
    }

    const entries = useMemo(
      () =>
        (callListData || []).map((main: any) => ({
          main,
          count: main?.count ?? getEntryLogs(main).length,
          acc_logs: getEntryLogs(main),
        })),
      [callListData],
    );

    useEffect(() => {
      if (entries && entries.length > 0 && tabType !== 'call') {
        setLogData(buildLogData(entries[0]?.main));
        setSelectedId(entries[0]?.main?.id);
      } else {
        setLogData({});
        setSelectedId(null);
      }
    }, [tabType, entries, setLogData]);

    return (
      <div className="flex flex-col w-full h-[calc(100vh_-_17.5rem)] overflow-auto">
        {isPending ? (
          <div className="flex items-center justify-center p-5">
            <Loader variant="blue" size="sm" />
          </div>
        ) : (
          <div className="divide-y divide-gray-200 overflow-auto h-full">
            {entries && entries?.length > 0 ? (
              <>
                {entries?.map(({ main = {}, count = 0 }: any) => {
                  const duration = main?.billsec;
                  const relativeTime = convertDateFormateApis(main?.start_stamp, 'D MMM, h:mm A');

                  let members: any = [];
                  if (main?.forward_type && main?.members) {
                    members = main?.members?.split(',')?.map((item: any) => {
                      return {
                        name: item,
                        extension: item,
                      };
                    });
                  }
                  members = members?.map((item: any) => `${item?.name} (${item?.extension})`);

                  const isMissed = main?.direction === 'Missed' || (main?.direction === 'Inbound' && main?.billsec === '00:00:00');
                  const isOutbound = main?.direction === 'Outbound';
                  const isSelected = selectedId === main?.id;
                  const contactName = main?.contact_name
                    || main?.contact_username
                    || (['Missed', 'Inbound'].includes(main?.direction)
                      ? (main?.caller_id_number !== main?.display_caller_number ? main?.display_caller_number : main?.caller_id_number)
                      : main?.destination_number);
                  const hasContact = Boolean(main?.contact_name || main?.contact_username);

                  return (
                    <div
                      onClick={() => {
                        setLogData(buildLogData({ ...main, count }));
                        setSelectedId(main?.id);
                      }}
                      key={main?.id}
                      className="cursor-pointer transition-colors group"
                      style={{
                        background: isSelected ? '#fff7ed' : '#fff',
                        borderLeft: isSelected ? '3px solid #f2994a' : '3px solid transparent',
                        borderBottom: '1px solid #f5f5f4',
                      }}
                    >
                      <div className="flex items-center w-full px-3 py-3 gap-3">
                        {/* Direction indicator + Avatar */}
                        <div className="relative shrink-0">
                          {main?.contact_username ? (
                            <CustomAvatar name={main?.contact_username} size="36" />
                          ) : (
                            <div className="rounded-full flex items-center justify-center" style={{ width: 36, height: 36, background: '#f3f4f6' }}>
                              <User className="h-5 w-5" style={{ color: '#9ca3af' }} />
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full" style={{ width: 16, height: 16, background: '#fff', boxShadow: '0 0 0 1.5px #fff' }}>
                            {isOutbound ? (
                              <Icon name="OutgoingCallStrokeIcon" className="w-3.5 h-3.5 text-green-500" />
                            ) : isMissed ? (
                              <Icon name="MissedCallStrokeIcon" className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Icon name="IncomingCallStrokeIcon" className="w-3.5 h-3.5 text-green-500" />
                            )}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold truncate" style={{ color: isMissed ? '#ef4444' : '#111' }}>
                              {contactName}{main?.count ? ` (${main?.count})` : ''}
                            </p>
                            <span className="text-[11px] whitespace-nowrap shrink-0" style={{ color: '#888' }}>{relativeTime}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] truncate" style={{ color: '#666' }}>
                              {!hasContact ? (
                                <span style={{ color: '#9ca3af' }}>Not in contacts</span>
                              ) : ['Missed', 'Inbound'].includes(main?.direction) ? (
                                <NumberWithFlag number={main?.display_caller_number} />
                              ) : main?.is_voicemail ? (
                                main?.forward_type === 'VOICEMAILGROUP' ? (
                                  main?.forward_name ? (
                                    <Tooltip><TooltipTrigger>{main?.forward_name}</TooltipTrigger><TooltipContent side="right">{members?.join(', ')}</TooltipContent></Tooltip>
                                  ) : 'Department Voicemail'
                                ) : main?.forward_type === 'VOICEMAIL' ? (
                                  main?.forward_name || 'Voicemail'
                                ) : main?.forward_type?.toLowerCase()
                              ) : main?.display_caller_number ? (
                                <NumberWithFlag number={main?.display_caller_number} />
                              ) : main?.forward_type === 'EXTENSION' ? (
                                `Ext. ${main?.forward_value}`
                              ) : main?.forward_type === 'DEPARTMENT' || main?.forward_type === 'VOICEMAILGROUP' ? (
                                <Tooltip><TooltipTrigger>{main?.forward_name}</TooltipTrigger><TooltipContent side="right">{members?.join(', ')}</TooltipContent></Tooltip>
                              ) : main?.forward_type === 'NUMBER' ? (
                                main?.forward_value
                              ) : (
                                main?.forward_type?.toLowerCase()
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {main?.recording_file && reportsActionAccess?.call_recording_listen ? (
                                <Icon name="SoundWave" className="w-3.5 h-3.5" style={{ color: '#aaa' }} />
                              ) : null}
                              {main?.is_voicemail && main?.recording_file ? (
                                <Icon name="VoicemailLineIcon" className="w-3.5 h-3.5" style={{ color: '#aaa' }} />
                              ) : null}
                              <span className="text-[11px]" style={{ color: '#888' }}>{duration?.slice(3)}</span>
                              {isMissed && (
                                <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5" style={{ background: '#fef2f2', color: '#ef4444' }}>Missed</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} className="h-10 flex items-center justify-center">
                  {isFetchingNextPage && <Loader variant="blue" size="sm" />}
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full mx-auto">
                <img src={NotFound} alt="BusyImage" className="min-w-28 w-28" />
                <p className="text-md font-medium text-black">
                  {tabType == 'call' ? `No recent ${tabType}s available` : `No ${tabType}s yet`}
                </p>
                <p className="text-sm text-gray-700">
                  {tabType == 'call'
                    ? 'Start or receive a call to see it listed here.'
                    : tabType == 'voicemail'
                      ? 'Voicemail messages will appear here.'
                      : 'Start recording calls to see it listed here.'}
                </p>
              </div>
              // <div className="text-center py-4 text-gray-700">
              //   <p>{tabType == 'call' ? `No recent ${tabType}s available` : `No ${tabType}s yet`}</p>
              // </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

export default CallList;
