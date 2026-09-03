import { Icon } from '@/assets/icons/icon';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import NumberWithFlag from '@/components/custom/number-with-flag';
import TableManager from '@/components/custom/table-manager';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { convertDateFormateApis, convertDateTimeFormateApis } from '@/lib/utils';
import { getDispositionLogSingleSummary, getDispositionLogsSummary } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const DispositionLogs = () => {
  const [openDisposition, setOpenDisposition] = useState<any>(null);
  const [disposition, setDisposition] = useState<ISELECTVALUE[]>([]);
  const { data: DispositionLogsSummary = [], isLoading } = useQuery({
    queryKey: ['getDispositionLogsSummary', disposition],
    queryFn: () =>
      getDispositionLogsSummary({
        ...(disposition?.length > 0
          ? {
              filters: [
                {
                  key: 'dispositionName',
                  value: disposition?.map(({ label }: { label: string }) => label) || [],
                },
              ],
            }
          : {}),
      }),
    select: (data) => data?.data?.data?.result || [],
  });
  const { data: dispositionDropdownMenuList = [], isLoading: isDropdownLoading } = useQuery({
    queryKey: ['getDispositionDropdownMenu'],
    queryFn: () => getDispositionLogsSummary(),
    select: (data) => data?.data?.data?.result || [],
  });
  const columns = [
    {
      header: 'Lead Info',
      accessorKey: 'contactName',

      cell: ({ row }: any) => {
        const data = row?.original;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <span className="text-sm min-w-10 font-semibold">From:</span>
              {data?.contactName}
            </div>

            <div className="flex gap-1">
              <span className="text-sm min-w-10 font-semibold">Phone:</span>
              <span className="flex gap-0.5 items-center">
                <NumberWithFlag number={data?.contactNumber} />
              </span>
            </div>

            <div className="flex gap-1">
              <span className="text-sm min-w-10 font-semibold">Email:</span>
              {data?.contactEmail}
            </div>
          </div>
        );
      },
    },

    {
      header: 'Execution Date',
      accessorKey: 'startExecutionDate',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{convertDateTimeFormateApis(data?.startExecutionDate)}</div>;
      },
    },
    {
      header: 'Call Status',
      accessorKey: 'callStatus',
      cell: ({ row }: any) => {
        const data = row?.original;
        return (
          <div className="text-center capitalize">{data?.callStatus?.toLowerCase() || '---'}</div>
        );
      },
      meta: {
        textAlign: 'center',
      },
    },
    {
      header: 'Disposition',
      accessorKey: 'callStatus',
      cell: ({ row }: any) => {
        const data = row?.original;
        return (
          <div className="text-center capitalize">{data?.disposition?.disposition || '---'}</div>
        );
      },
      meta: {
        textAlign: 'center',
      },
    },

    {
      header: 'Attempt(s)',
      accessorKey: 'totalAttempts',
      cell: ({ row }: any) => {
        const data = row?.original;
        const sipCallDetail = data?.sipcallDetail || [];
        return (
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex justify-center items-center cursor-pointer">
                <div className="inline-flex items-center justify-center min-w-5 min-h-5 px-1.5 py-0.5 text-xs font-medium text-white bg-primary rounded-full hover:bg-primary/90">
                  {data?.totalAttempts || 0}
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" side="left" sideOffset={-58}>
              <div className="flex flex-col gap-2">
                {sipCallDetail?.map((item: any) => {
                  const fullName = `${item?.assignedUser?.first_name} ${item?.assignedUser?.last_name}`;
                  const retryDate = item?.retryDate;
                  return (
                    <div
                      key={item?.assignedUser?.user_uuid}
                      className="flex items-center gap-1 w-full"
                    >
                      <div className="flex">
                        <CustomAvatar name={fullName} extension={item?.assignedUser?.extension} />
                      </div>
                      <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between  gap-2">
                          <p className="capitalize text-xs">{fullName}</p>
                          <div className="flex items-center gap-1 text-[#9A948F] text-xs">
                            <Icon name="Grid" className="w-3 h-3 " />
                            <div>{item?.assignedUser?.extension}</div>
                          </div>
                        </div>
                        <p className="text-[#9A948F] flex justify-between text-xs">
                          {item?.assignedUser?.email}
                        </p>
                        {retryDate && (
                          <div className="flex items-center gap-1 text-[#9A948F] mt-0.5">
                            <Icon name="TimerIcon" className="w-3 h-3" />
                            <span className="text-[11px] italic">
                              Retry: {convertDateFormateApis(retryDate, 'MMM DD, hh:mm A')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      },

      meta: {
        textAlign: 'center',
      },
    },
  ];

  const handleDispositionClick = (disposition: any) => {
    if (disposition?.count > 0) {
      setOpenDisposition(disposition);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between p-3 border-b border-[rgba(225,200,165,0.9)] min-h-[65px] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
        <div
          className={`flex gap-2 items-center ${openDisposition?.dispositionId ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (openDisposition && openDisposition?.dispositionId) {
              setOpenDisposition(null);
            }
          }}
        >
          {openDisposition?.count && openDisposition?.dispositionId && (
            <ArrowLeft className="w-6 h-5" />
          )}
          <h3 className="text-[#2E2D35] font-semibold text-lg">
            {openDisposition?.count && openDisposition?.dispositionId
              ? openDisposition?.dispositionName
              : 'Disposition Logs'}
          </h3>
        </div>
      </div>
      {openDisposition?.count && openDisposition?.dispositionId ? (
        <div className="w-full h-full p-3 flex flex-col gap-2 ">
          <TableManager
            {...{
              columns: columns,
              fetcherKey: 'getDispositionLogSingleSummary',
              fetcherFn: getDispositionLogSingleSummary,
              extraParams: {
                filters: [
                  {
                    key: 'dispositionName',
                    value: openDisposition?.dispositionName,
                  },
                ],
              },
            }}
            emptyTablePlaceholder="No disposition logs found"
            descriptionEmptyTable="Disposition details will be available after calls are completed"
          />
        </div>
      ) : (
        <div className="p-3 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <p className="text-[#2E2D35] font-semibold text-md flex items-center  gap-1 ">
              Campaign Dispositions
            </p>
            <div>
              <CustomSelect
                placeholder="Select disposition"
                // inputClass="team_chat"
                isClearable
                isMulti
                isLoading={isDropdownLoading}
                options={
                  (dispositionDropdownMenuList &&
                    dispositionDropdownMenuList?.length > 0 &&
                    dispositionDropdownMenuList?.map(
                      ({ dispositionName }: { dispositionName: string }) => ({
                        label: dispositionName,
                        value: dispositionName,
                      }),
                    )) ||
                  []
                }
                handleChange={(e: ISELECTVALUE[]) => setDisposition(e)}
                value={disposition}
                menuPlacement="auto"
              />
            </div>
          </div>

          <div className="bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] rounded-xl py-3 px-2 overflow-auto h-[calc(100vh-12.5rem)]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader variant="blue" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-y-2.5">
                {DispositionLogsSummary &&
                  DispositionLogsSummary?.map((disposition: any, index: number) => (
                    <div
                      className={`w-1/3 px-1.5 ${disposition?.count > 0 ? 'cursor-pointer' : ''} `}
                      key={index}
                      onClick={() => handleDispositionClick(disposition)}
                    >
                      <div className="flex justify-between border border-[rgba(225,200,165,0.9)] rounded-md w-full p-3 gap-1 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
                        <div className="flex flex-col gap-1">
                          <p
                            className="font-semibold text-[#2E2D35] truncate text-sm"
                            style={{ color: disposition?.agentDisposition?.colorCode }}
                          >
                            {disposition?.dispositionName}
                          </p>
                          <h2 className="text-[#2E2D35] truncate text-xl font-semibold">
                            {disposition?.count || 0}
                          </h2>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DispositionLogs;
