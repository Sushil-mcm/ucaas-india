import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TableManager from '@/components/custom/table-manager';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AudioModal from '@/pages/phone/audio-dialog';
import { Icon } from '@/assets/icons/icon';
import CustomTooltip from '@/components/custom/custom-tooltip';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { callList, calendarMeetingList } from '@/services/api';
import { convertDateFormateApis, formatSecondsToMMSS, MEDIA_URL } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useDialpad } from '@/hooks/use-dialpad';
import PerfStatCard from './stat-card';
import moment from 'moment';
import { useRecordingAccess } from '@/hooks/use-recording-access';
import './callbacks-theme.css';

const CallbacksTab = () => {
  const { user } = useUser();
  /* Whether this person may play this particular recording, on top of the
     plan permission above. */
  const { canPlayRecording } = useRecordingAccess();
  const { features } = useCompanyFeatures();
  const { makeCall } = useDialpad();
  const callLogActionAccess = features?.plan_features?.reports?.action || {};
  const [modalState, setModalState] = useState<any>(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [view, setView] = useState<'tasks' | 'voicemail'>('tasks');

  const { data: tasks = [] } = useQuery({
    queryKey: ['performanceCallbackTasksSummary'],
    queryFn: () =>
      calendarMeetingList({ page: 1, limit: 200, filters: [{ key: 'category', value: 'TASK' }] }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: 10000,
  });

  const { data: voicemails = [] } = useQuery({
    queryKey: ['performanceCallbackVoicemailSummary'],
    queryFn: () => callList({ page: 1, limit: 200, type: 'voicemail' }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: 10000,
  });

  const now = moment();
  const overdueCount = tasks.filter(
    (task: any) => task?.startTime && moment(task.startTime).isBefore(now),
  ).length;
  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((task: any) => {
      const source = task?.source ? String(task.source) : 'Unspecified';
      map[source] = (map[source] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const todayVoicemails = voicemails.filter((row: any) =>
    moment(row?.start_stamp).isSame(now, 'day'),
  );
  const totalVoicemailDurationToday = todayVoicemails.reduce(
    (sum: number, row: any) => sum + (Number(row?.billsectotal) || 0),
    0,
  );

  const taskColumns = [
    {
      header: 'Task',
      accessorKey: 'name',
      cell: ({ row }: any) => row.original?.name || 'Untitled task',
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: ({ row }: any) =>
        row.original?.createdAt ? moment(row.original.createdAt).format('MMM DD, hh:mm A') : '—',
    },
    {
      header: 'Due',
      accessorKey: 'startTime',
      cell: ({ row }: any) =>
        row.original?.startTime ? moment(row.original.startTime).format('MMM DD, hh:mm A') : '—',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <span className="capitalize">{String(row.original?.status || '—').toLowerCase()}</span>
      ),
    },
  ];

  const voicemailColumns = [
    {
      header: 'Left at',
      accessorKey: 'start_stamp',
      cell: ({ row }: any) => convertDateFormateApis(row.original?.start_stamp, 'MMM DD, hh:mm A'),
    },
    {
      header: 'From',
      accessorKey: 'caller_id_number',
      cell: ({ row }: any) => <NumberWithFlag number={row.original?.caller_id_number} />,
    },
    {
      header: 'DID',
      accessorKey: 'via_did',
      cell: ({ row }: any) => <NumberWithFlag number={row.original?.via_did} />,
    },
    {
      header: 'Length',
      accessorKey: 'billsectotal',
      cell: ({ row }: any) =>
        row.original?.billsectotal ? formatSecondsToMMSS(Number(row.original.billsectotal)) : '—',
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const data = row.original;
        const hasRecording = data?.recording_file || null;
        const recordingSrcUrl = hasRecording
          ? `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${data.recording_file}`
          : '';

        return (
          <span className="flex items-center gap-2">
            {callLogActionAccess?.call_recording_listen && canPlayRecording(data).allowed && (
              <CustomTooltip text={hasRecording ? 'Play' : 'No recording available'} side="top">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    hasRecording
                      ? 'cursor-pointer bg-ucass-active-bg text-ucass-active hover:bg-ucass-active hover:text-white'
                      : 'cursor-not-allowed border-transparent opacity-50'
                  }`}
                  onClick={() => {
                    if (!hasRecording) return;
                    setRecordingUrl(recordingSrcUrl);
                    setModalState(true);
                  }}
                >
                  <Icon name="PlayLine" className="h-4.5 w-4.5" />
                </div>
              </CustomTooltip>
            )}
            {callLogActionAccess?.call && (
              <CustomTooltip text="Call back" side="top">
                <span
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-green-100 text-green-500 hover:bg-green-400 hover:text-white"
                  onClick={() => makeCall(data?.caller_id_number)}
                >
                  <Icon name="PhoneIcon" className="h-4 w-4" />
                </span>
              </CustomTooltip>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="perf-callbacks flex w-full flex-col gap-4 px-[22px] py-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <PerfStatCard label="Scheduled tasks" value={String(tasks.length)} />
        <PerfStatCard
          label="Overdue tasks"
          value={String(overdueCount)}
          tone={overdueCount > 0 ? 'danger' : 'default'}
        />
        <PerfStatCard
          label="Tasks by source"
          value={bySource.length ? bySource[0][0] : '—'}
          sub={
            bySource.length
              ? bySource.map(([source, count]) => `${source}: ${count}`).join(' · ')
              : undefined
          }
        />
        <PerfStatCard label="Voicemails today" value={String(todayVoicemails.length)} />
        <PerfStatCard
          label="Voicemail time today"
          value={formatSecondsToMMSS(totalVoicemailDurationToday)}
        />
      </div>
      <Tabs value={view} onValueChange={(value) => setView(value as 'tasks' | 'voicemail')}>
        <TabsList className="h-9">
          <TabsTrigger value="tasks" className="cursor-pointer">
            Scheduled tasks
          </TabsTrigger>
          <TabsTrigger value="voicemail" className="cursor-pointer">
            Queue voicemail
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'tasks' && (
        <TableManager
          columns={taskColumns}
          fetcherKey="performanceCallbackTaskList"
          fetcherFn={calendarMeetingList}
          select={(data: any) => data?.data?.data?.result?.rows || []}
          extraParams={{ filters: [{ key: 'category', value: 'TASK' }] }}
          emptyTablePlaceholder="No scheduled tasks"
          descriptionEmptyTable="Callback and follow-up tasks you schedule show up here."
        />
      )}
      {view === 'voicemail' && (
        <TableManager
          columns={voicemailColumns}
          fetcherKey="performanceVoicemailList"
          fetcherFn={callList}
          extraParams={{ type: 'voicemail' }}
          emptyTablePlaceholder="No voicemail records found"
          descriptionEmptyTable="Voicemails left on queues and extensions show up here."
        />
      )}
      <AudioModal
        modalState={modalState}
        setModalState={setModalState}
        srcUrl={recordingUrl}
        serRecordingUrl={setRecordingUrl}
      />
    </div>
  );
};

export default CallbacksTab;
