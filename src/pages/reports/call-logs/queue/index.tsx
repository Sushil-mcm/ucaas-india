import { ReportsPageLayout } from '../../reports-content-layout';
import TableManager from '@/components/custom/table-manager';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
// import { Button } from '@/components/ui/button';
import { callLogQueueList, callLogQueueReportList } from '@/services/api';
import NotFound from '@/assets/images/not-found-img.svg';

import { useMutation } from '@tanstack/react-query';
// import { Loader2 } from 'lucide-react';
// import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

const formatDuration = (seconds: number): string => {
  if (!seconds && seconds !== 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/* The percentage the queue asked to hit, from its own settings. The figure
   next to it comes from the report and is measured against the queue's own
   seconds; this is only the goal to compare it with. */
const serviceLevelTarget = (item: any): number | null => {
  const raw = item?.settings;
  let settings = raw;
  if (typeof raw === 'string') {
    try {
      settings = JSON.parse(raw || '{}');
    } catch {
      return null;
    }
  }
  const level = settings?.after_call?.service_level;
  const percent = Number(level?.percent);
  return level?.enabled && Number.isFinite(percent) && percent > 0 ? percent : null;
};

const QueueCallLogs = () => {
  // const [dropdownVal, setDropdownVal] = useState(dropdownCallInitialVal);
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tableRef = useRef<any>(null);
  const { mutate: mutateCallQueueList, data } = useMutation({
    mutationFn: callLogQueueList,
    mutationKey: ['getCallQueue'],
  });
  const columns = [
    {
      header: 'Agent',
      accessorKey: 'agent',
    },
    {
      header: 'Answered Calls',
      accessorKey: 'total_calls',
    },
    {
      header: 'Total Duration (mm:ss)',
      accessorKey: 'duration',
      cell: ({ row }: any) => (row.original.duration ? formatDuration(row.original.duration) : '-'),
    },
    {
      header: 'Avg Waiting Time (mm:ss)',
      accessorKey: 'avg_waiting_time',
      cell: ({ row }: any) =>
        row.original.avg_waiting_time ? formatDuration(row.original.avg_waiting_time) : '-',
    },
    {
      header: 'Avg Engage Time (mm:ss)',
      accessorKey: 'avg_engage_time',
      cell: ({ row }: any) =>
        row.original.avg_engage_time ? formatDuration(row.original.avg_engage_time) : '-',
    },
  ];
  const handleRefetchTableData = () => {
    mutateCallQueueList({
      page: 1,
      limit: 100,
      timezone: browserTimezone,
    });
  };

  useEffect(() => {
    handleRefetchTableData();
  }, []);
  // const Filters = (
  //   <div className="flex gap-2 ">
  //     <DateDropdown
  //       {...{
  //         dropdownVal,
  //         setDropdownVal,
  //       }}
  //     />
  //     <Button
  //       type="button"
  //       variant="outline"
  //       onClick={() => handleRefetchTableData()}
  //       className="cursor-pointer flex items-center justify-center rounded-xl w-10 h-10 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
  //     >
  //       {isPending ? (
  //         <Loader2 className="animate-spin" />
  //       ) : (
  //         <Icon name="Refresh" className="w-5 h-5" />
  //       )}
  //     </Button>
  //   </div>
  // );

  return (
    <ReportsPageLayout>
      <div className="w-full  p-3 flex flex-col gap-2 h-full overflow-y-auto">
        <div className="w-full flex flex-col gap-3">
          {data?.data?.rows?.length ? (
            data?.data?.rows?.map((item: any) => {
              return (
                <Accordion
                  type="single"
                  collapsible

                  className="w-full border rounded-md bg-white"
                  key={item?.uuid}
                >
                  <AccordionItem value="item-1" className="border-none">
                    <AccordionTrigger
                      variant="default"
                      className="p-4 hover:no-underline   rounded-none"
                    >
                      <div className="flex w-full items-center justify-between text-sm font-medium text-gray-700">
                        <span className="text-sm font-semibold text-primary">
                          {item?.name || '-'}
                        </span>

                        <div className="flex items-center gap-8 text-gray-600">
                          <span>
                            Total Calls :{' '}
                            <span className="font-semibold text-gray-800">
                              {item?.queue_stats?.total_calls || '-'}
                            </span>
                          </span>
                          <span>
                            Answered Calls :{' '}
                            <span className="font-semibold text-gray-800">
                              {item?.queue_stats?.answered_calls || '-'}
                            </span>
                          </span>
                          <span title="Hang-ups quicker than the queue's own floor are misdials and are set aside, not counted here">
                            Abandoned Calls :{' '}
                            <span className="font-semibold text-gray-800">
                              {item?.queue_stats?.missed_calls || '-'}
                            </span>
                            {Number(item?.queue_stats?.short_abandons) > 0 && (
                              <span className="text-gray-500"> (+{item.queue_stats.short_abandons} quick hang-ups set aside)</span>
                            )}
                          </span>
                          <span>
                            Avg Waiting Time :{' '}
                            <span className="font-semibold text-gray-800">
                              {formatDuration(item?.queue_stats?.avg_waiting_time)}
                            </span>
                          </span>
                          <span>
                            Avg Engage Time :{' '}
                            <span className="font-semibold text-gray-800">
                              {formatDuration(item?.queue_stats?.avg_engage_time)}
                            </span>
                          </span>
                          {item?.queue_stats?.service_level_percent !== null &&
                            item?.queue_stats?.service_level_percent !== undefined && (
                              <span
                                title={`Answered within ${item?.queue_stats?.service_level_seconds ?? 20}s, out of the calls this queue answered`}
                              >
                                Service level :{' '}
                                <span className="font-semibold text-gray-800">
                                  {item.queue_stats.service_level_percent}%
                                </span>
                                <span className="text-gray-500">
                                  {' '}
                                  of {item?.queue_stats?.counted_calls ?? 0} in{' '}
                                  {item?.queue_stats?.service_level_seconds ?? 20}s
                                  {serviceLevelTarget(item)
                                    ? ` · target ${serviceLevelTarget(item)}%`
                                    : ''}
                                </span>
                              </span>
                            )}
                                                    {Number(item?.queue_stats?.routed_calls) > 0 && (
                            <>
                              <span title="Answered by the first group the queue rang, before it widened">
                                Answered in round 1 :{' '}
                                <span className="font-semibold text-gray-800">
                                  {item?.queue_stats?.answered_first_round ?? 0}
                                </span>
                              </span>
                              <span title="Calls where the queue widened past its skill requirement">
                                Skill dropped :{' '}
                                <span className="font-semibold text-gray-800">
                                  {item?.queue_stats?.skill_dropped ?? 0}
                                </span>
                              </span>
                              <span title="Calls where a free person was kept for a higher-priority or longer-waiting caller at least once">
                                Held for priority :{' '}
                                <span className="font-semibold text-gray-800">
                                  {item?.queue_stats?.held_for_priority ?? 0}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="p-3 text-sm text-gray-600 border-t">
                      <div className="w-full flex flex-col gap-2">
                        <TableManager
                          {...{
                            tableRef,
                            fetcherKey: 'callLogQueueReportList',
                            fetcherFn: callLogQueueReportList,
                            tableMaxHeight: 'h-auto',
                            columns,
                            extraParams: {
                              queue_uuid: item?.uuid,
                              timezone: browserTimezone,
                              // filter_date: {
                              //   from: dropdownVal?.value?.from,
                              //   to: dropdownVal?.value?.to,
                              // },
                            },
                          }}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })
          ) : (
            <div className="flex flex-col justify-center items-center gap-1 py-5 h-[calc(100vh-12.7rem)] w-full mx-auto">
              {/* <Icon name="NotFound" className="text-gray-500 w-15 h-15" /> */}
              {/* <p className="text-sm text-gray-700">{emptyTablePlaceholder || descriptionEmptyTable}</p> */}
              <img src={NotFound} alt="NotFound" className="w-32" />
              <p className="text-md font-medium text-gray-900">No Call Queue Logs Found</p>
            </div>
          )}
        </div>
      </div>
    </ReportsPageLayout>
  );
};

export default QueueCallLogs;
