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

const getEntryNumber = (main: any = {}) => {
  const number =
    main?.direction === 'Outbound' ? main?.destination_number : `${main?.caller_id_number || ''}`;
  return String(number || '').replace(/ /g, '');
};

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
    const getNumber =
      item?.direction === 'Outbound' ? item?.destination_number : item?.caller_id_number;

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

                  return (
                    <div
                      onClick={() => {
                        setLogData(buildLogData({ ...main, count }));
                        setSelectedId(main?.id);
                      }}
                      key={main?.id}
                      className={`flex cursor-pointer ${selectedId === main?.id ? 'bg-gray-100' : 'bg-white'}`}
                    >
                      <div className="flex items-center w-full px-3 h-16 gap-2">
                        <div className="relative">
                          {main?.contact_username ? (
                            <CustomAvatar name={main?.contact_username} />
                          ) : (
                            <div className="rounded-full bg-gray-500 flex items-center justify-center">
                              <User className="h-9 w-9" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-between text-sm w-[calc(100%_-_3rem)] gap-1">
                          <div className="flex justify-between gap-2">
                            <p className=" text-gray-900 font-medium truncate">
                              {main?.contact_name
                                ? main?.contact_name
                                : main?.contact_username
                                  ? main?.contact_username
                                  : ['Missed', 'Inbound'].includes(main?.direction)
                                    ? main?.caller_id_number !== main?.display_caller_number
                                      ? main?.display_caller_number
                                      : main?.caller_id_number
                                    : main?.destination_number}{' '}
                              {main?.count ? `(${main?.count})` : ''}
                            </p>
                            <p className="text-gray-500 text-end  whitespace-nowrap text-xs">
                              {relativeTime}
                            </p>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex gap-1">
                              <div className="text-gray-900/80 truncate pr-2 text-xs">
                                {['Missed', 'Inbound'].includes(main?.direction) ? (
                                  <NumberWithFlag number={main?.display_caller_number} />
                                ) : (
                                  <>
                                    {main?.is_voicemail ? (
                                      <div className="flex">
                                        <div>
                                          {main?.forward_type === 'VOICEMAILGROUP' ? (
                                            main?.forward_name ? (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  {main?.forward_name}
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                  {members?.join(', ')}
                                                </TooltipContent>
                                              </Tooltip>
                                            ) : (
                                              <p>Department Voicemail</p>
                                            )
                                          ) : main?.forward_type === 'VOICEMAIL' ? (
                                            main?.forward_name ? (
                                              <div className="flex items-start gap-1 flex-col font-semibold">
                                                <p>{main?.forward_name}</p>
                                                <p>{`Ext. ${main?.forward_value}`}</p>
                                              </div>
                                            ) : (
                                              <p>Voicemail</p>
                                            )
                                          ) : (
                                            <p>{main?.forward_type?.toLowerCase()}</p>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        {main?.display_caller_number ? (
                                          <div className="flex items-center justify-start gap-2">
                                            <div className="flex flex-col">
                                              {/* {['Outbound'].includes(main?.direction) && (
                                                <p color="textPrimary">{main?.contact_name}</p>
                                              )} */}
                                              {main?.display_caller_number?.length < 5 && (
                                                <p className="text-gray-900/80 truncate">{`${main?.display_caller_number}`}</p>
                                              )}
                                              {main?.display_caller_number?.length > 5 && (
                                                <div className="text-gray-900/80 truncate">
                                                  {
                                                    <NumberWithFlag
                                                      number={main?.display_caller_number}
                                                    />
                                                  }
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex justify-start items-center">
                                            {main?.forward_type === 'EXTENSION' ? (
                                              <div className="flex items-center gap-2">
                                                {main?.forward_value?.length < 5 && <></>}
                                                <div className="flex flex-col">
                                                  <p>{main?.forward_value}</p>
                                                  {main?.forward_value?.length < 5 && (
                                                    <p>{`Ext. ${main?.forward_value}`}</p>
                                                  )}
                                                  {main?.forward_value?.length > 5 && (
                                                    <p>{`Ph. ${main?.forward_value}`}</p>
                                                  )}
                                                </div>
                                              </div>
                                            ) : main?.forward_type === 'DEPARTMENT' ||
                                              main?.forward_type === 'VOICEMAILGROUP' ? (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  {main?.forward_name}
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                  {members?.join(', ')}
                                                </TooltipContent>
                                              </Tooltip>
                                            ) : main?.forward_type === 'IVR' ? (
                                              <div className="flex items-center gap-1"></div>
                                            ) : main?.forward_type === 'NUMBER' ? (
                                              <div className="flex flex-col">
                                                <p>{main?.forward_type?.toLowerCase()}</p>
                                                <p>{main?.forward_value}</p>
                                              </div>
                                            ) : (
                                              <>
                                                <p>{main?.forward_type?.toLowerCase()}</p>
                                                <p>{handleMembers(main?.members)}</p>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-0.5 justify-end items-center">
                              <p className="text-gray-500 flex items-center gap-0.5 text-xs">
                                {main?.recording_file &&
                                reportsActionAccess?.call_recording_listen ? (
                                  <span>
                                    <Icon name="SoundWave" className="w-4" />
                                  </span>
                                ) : null}
                                {main?.is_voicemail && main?.recording_file ? (
                                  <span>
                                    <Icon name="VoicemailLineIcon" className="w-4" />
                                  </span>
                                ) : null}
                                <span>{duration?.slice(3)}</span>
                              </p>
                              <div
                                className={`flex ${
                                  main?.direction === 'Inbound'
                                    ? main?.billsec !== '00:00:00'
                                      ? 'text-green-400'
                                      : 'text-red'
                                    : main?.direction === 'Outbound'
                                      ? 'text-green-400'
                                      : null
                                }`}
                              >
                                {main?.direction === 'Outbound' ? (
                                  <Icon
                                    name="OutgoingCallStrokeIcon"
                                    className="text-green-400 w-4.5 h-4.5"
                                  />
                                ) : ['Inbound', 'Missed'].includes(main?.direction) ? (
                                  main?.billsec === '00:00:00' ? (
                                    <Icon
                                      name="MissedCallStrokeIcon"
                                      className="text-red-500 w-4.5 h-4.5"
                                    />
                                  ) : (
                                    <Icon
                                      name="IncomingCallStrokeIcon"
                                      className="text-primary w-4.5 h-4.5"
                                    />
                                  )
                                ) : null}
                              </div>
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
                <p className="text-md font-medium text-gray-900">
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
