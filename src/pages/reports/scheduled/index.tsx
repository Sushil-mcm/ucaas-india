/* Scheduled reports.
 *
 * A report somebody looks at every Monday morning should arrive on its own. This
 * screen is where a company says which report, how often, and to whom; the
 * sending is done by a cron on the server every quarter hour, which is why a new
 * schedule shows a next-send time rather than sending straight away.
 *
 * The last outcome is shown per row on purpose. A schedule that silently stopped
 * working - a mailbox that no longer exists, a report that errored - is the whole
 * failure mode of a feature like this, and the person who set it up is the only
 * one who can fix it.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon, IconName } from '@/assets/icons/icon';
import AlertConfirm from '@/components/custom/alert-confirm';
import CustomTooltip from '@/components/custom/custom-tooltip';
import SideDrawer from '@/components/custom/side-drawer';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import {
  deleteReportSchedule,
  listReportSchedules,
  listReportScheduleTypes,
  runReportScheduleNow,
  toggleReportSchedule,
} from '@/services/api';
import ReportsPageLayout from '../reports-content-layout';
import ScheduleForm from './schedule-form';

const WEEKDAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ordinal = (day: number): string => {
  const remainderTen = day % 10;
  const remainderHundred = day % 100;
  if (remainderTen === 1 && remainderHundred !== 11) return `${day}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${day}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${day}rd`;
  return `${day}th`;
};

/* "Every Monday at 07:00 Asia/Kolkata" reads as a sentence; three separate
   columns for frequency, day and hour do not. */
const describe = (schedule: any): string => {
  const at = `${String(schedule?.send_hour ?? 0).padStart(2, '0')}:00`;
  const zone = String(schedule?.timezone || 'UTC').replace(/_/g, ' ');
  if (schedule?.frequency === 'weekly') {
    return `Every ${WEEKDAY_NAMES[Number(schedule?.send_day) || 1]} at ${at} ${zone}`;
  }
  if (schedule?.frequency === 'monthly') {
    return `On the ${ordinal(Number(schedule?.send_day) || 1)} of each month at ${at} ${zone}`;
  }
  return `Every day at ${at} ${zone}`;
};

/* The server stores UTC; the reader wants their own clock. */
const localTime = (value: any): string => {
  if (!value) return '--';
  const parsed = new Date(String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ScheduledReports = () => {
  const queryClient = useQueryClient();
  const { user = {} } = useUser();
  const isAdmin = String(user?.user_info?.role || '').toUpperCase() === 'ADMIN';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);

  const { data: typesResponse } = useQuery({
    queryKey: ['reportScheduleTypes'],
    queryFn: listReportScheduleTypes,
    staleTime: 60 * 60 * 1000,
  });
  const reportTypes = useMemo(
    () => (typesResponse as any)?.data?.data?.result || [],
    [typesResponse],
  );
  const labelFor = (value: string) =>
    reportTypes.find((option: any) => option.value === value)?.label || value;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['reportSchedules'] });

  const { mutate: mutateToggle } = useMutation({
    mutationFn: toggleReportSchedule,
    onSuccess: refresh,
  });

  const { mutate: mutateDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteReportSchedule,
    onSuccess: () => {
      handleAlert({ text: 'Schedule deleted', type: 'success' });
      setPendingDelete(null);
      refresh();
    },
  });

  const { mutate: mutateRunNow } = useMutation({
    mutationFn: runReportScheduleNow,
    onSuccess: () => {
      /* The cron runs every quarter hour, so this queues rather than sends.
         Saying so is the difference between patience and a bug report. */
      handleAlert({
        text: 'Queued. It will be emailed within the next fifteen minutes.',
        type: 'success',
      });
      refresh();
    },
  });

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        return (
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{data.name}</p>
            <p className="truncate text-xs text-gray-500">{labelFor(data.report_type)}</p>
          </div>
        );
      },
    },
    {
      header: 'When',
      accessorKey: 'frequency',
      cell: ({ row }: any) => (
        <p className="text-gray-800">{describe(row?.original || {})}</p>
      ),
    },
    {
      header: 'Send to',
      accessorKey: 'recipients',
      cell: ({ row }: any) => {
        const list: string[] = row?.original?.recipients || [];
        if (!list.length) return <p className="text-gray-400">--</p>;
        return (
          <CustomTooltip text={list.join(', ')} side="top">
            <p className="max-w-56 truncate text-gray-800">
              {list[0]}
              {list.length > 1 ? ` +${list.length - 1}` : ''}
            </p>
          </CustomTooltip>
        );
      },
    },
    {
      header: 'Next send',
      accessorKey: 'next_run_at',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        if (Number(data.enabled) === 0) return <p className="text-gray-400">Paused</p>;
        return <p className="text-gray-800">{localTime(data.next_run_at)}</p>;
      },
    },
    {
      header: 'Last send',
      accessorKey: 'last_run_at',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        if (!data.last_run_at) return <p className="text-gray-400">Not yet</p>;
        const failed = String(data.last_status || '') === 'failed';
        return (
          <div className="min-w-0">
            <p className={failed ? 'text-red-600' : 'text-gray-800'}>{localTime(data.last_run_at)}</p>
            {failed && (
              <CustomTooltip text={data.last_error || 'It did not send'} side="top">
                <p className="max-w-56 truncate text-xs text-red-500">
                  {data.last_error || 'It did not send'}
                </p>
              </CustomTooltip>
            )}
          </div>
        );
      },
    },
    {
      header: 'Active',
      accessorKey: 'enabled',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        const isEnabled = Number(data.enabled) !== 0;
        if (!isAdmin) {
          return (
            <p className={isEnabled ? 'text-gray-800' : 'text-gray-400'}>
              {isEnabled ? 'On' : 'Paused'}
            </p>
          );
        }
        return (
          <div className="flex justify-center">
            <CustomTooltip text={isEnabled ? 'Pause this schedule' : 'Start sending again'} side="top">
              <span className="inline-flex">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(next: boolean) =>
                    mutateToggle({ uuid: data.uuid, enabled: next })
                  }
                />
              </span>
            </CustomTooltip>
          </div>
        );
      },
      meta: { textAlign: 'center' },
    },
    {
      header: 'Actions',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row?.original || {};
        const actions = [
          {
            icon: 'MailIcon',
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'Send it now',
            cb: () => mutateRunNow({ uuid: data.uuid }),
          },
          {
            icon: 'EditStrokIcon',
            className: 'bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white',
            tooltipText: 'Edit',
            cb: () => {
              setEditing(data);
              setDrawerOpen(true);
            },
          },
          {
            icon: 'TrashBin',
            className: 'bg-red-100 text-red-400 hover:bg-red-500 hover:text-white',
            tooltipText: 'Delete',
            cb: () => setPendingDelete(data),
          },
        ];

        if (!isAdmin) {
          return <p className="text-center text-gray-400">--</p>;
        }

        return (
          <div className="flex items-center justify-center gap-2">
            {actions.map((action, index) => (
              <CustomTooltip key={index} text={action.tooltipText} side="top">
                <div
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full ${action.className}`}
                  onClick={action.cb}
                >
                  <Icon name={action.icon as IconName} className="h-5 w-5" />
                </div>
              </CustomTooltip>
            ))}
          </div>
        );
      },
      meta: { textAlign: 'center' },
    },
  ];

  return (
    <ReportsPageLayout
      filters={
        isAdmin ? (
          <div className="filters">
            <Button
              type="button"
              variant="outline"
              className="min-h-9"
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              <Icon name="Plus" className="h-3 w-3" /> New schedule
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <TableManager
          {...{
            columns,
            fetcherKey: 'reportSchedules',
            fetcherFn: listReportSchedules,
            /* This endpoint answers with a plain array, not the paged
               `{rows, count}` the default reader expects. */
            select: (response: any) => response?.data?.data?.result || [],
            emptyTablePlaceholder: 'No scheduled reports yet',
            descriptionEmptyTable:
              'A scheduled report is emailed on its own, as a link to a CSV file. Set one up and the people who need it stop asking for it.',
          }}
        />
      </div>

      {drawerOpen && (
        <SideDrawer
          isOpen={drawerOpen}
          title={editing ? 'Edit schedule' : 'New schedule'}
          isHeader
          isTab={false}
          width="w-full sm:w-[32rem]"
          handleClose={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
          content={
            <ScheduleForm
              schedule={editing}
              reportTypes={reportTypes}
              onDone={() => {
                setDrawerOpen(false);
                setEditing(null);
              }}
            />
          }
        />
      )}

      {pendingDelete && (
        <AlertConfirm
          {...{
            open: Boolean(pendingDelete),
            setOpen: () => setPendingDelete(null),
            apiLoading: isDeleting,
            headerText: 'Delete this schedule?',
            descriptionTextComp: `"${pendingDelete?.name}" will stop being emailed. Reports already sent are unaffected.`,
            confirmBtnText: 'Delete',
            onConfirm: () => mutateDelete({ uuid: pendingDelete.uuid }),
          }}
        />
      )}
    </ReportsPageLayout>
  );
};

export default ScheduledReports;
