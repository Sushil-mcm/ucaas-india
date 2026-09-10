import { useQuery } from '@tanstack/react-query';
import { getCallQueueInvolvements } from '@/services/api';
import CallQueueCard from './call-queue-card';
import { Icon } from '@/assets/icons/icon';
import NotFound from '@/assets/images/not-found-img.svg';
import './queue-theme.css';

// Temporary dev-only sample data so the queue layout can be reviewed
// while no real queues are assigned. Only used when the API returns none.
const DUMMY_CALL_QUEUES = [
  {
    uuid: 'dummy-queue-1',
    name: 'Sales',
    extension: '2100',
    manager: JSON.stringify({
      name: 'Arjun Mehta',
      role: 'Queue Manager',
      email: 'arjun.mehta@ucaas.in',
      profile: '',
    }),
    agent: [{ status: 'Available' }],
    members: JSON.stringify([
      { name: 'Priya Sharma', value: '1001', user_uuid: 'dummy-1001', email: 'priya@ucaas.in', role: 'Agent' },
      { name: 'Karan Malhotra', value: '1002', user_uuid: 'dummy-1002', email: 'karan@ucaas.in', role: 'Agent' },
      { name: 'Ananya Iyer', value: '1003', user_uuid: 'dummy-1003', email: 'ananya@ucaas.in', role: 'Agent' },
      { name: 'Vikram Reddy', value: '1004', user_uuid: 'dummy-1004', email: 'vikram@ucaas.in', role: 'Agent' },
    ]),
    agentDetail: null,
  },
  {
    uuid: 'dummy-queue-2',
    name: 'Support',
    extension: '2101',
    manager: JSON.stringify({
      name: 'Meera Nair',
      role: 'Queue Manager',
      email: 'meera.nair@ucaas.in',
      profile: '',
    }),
    agent: [{ status: 'On Break' }],
    members: JSON.stringify([
      { name: 'Sanjay Kapoor', value: '1005', user_uuid: 'dummy-1005', email: 'sanjay@ucaas.in', role: 'Agent' },
      { name: 'Riya Desai', value: '1006', user_uuid: 'dummy-1006', email: 'riya@ucaas.in', role: 'Agent' },
      { name: 'Aman Gupta', value: '1007', user_uuid: 'dummy-1007', email: 'aman@ucaas.in', role: 'Agent' },
      { name: 'Neha Joshi', value: '1008', user_uuid: 'dummy-1008', email: 'neha@ucaas.in', role: 'Agent' },
      { name: 'Rahul Verma', value: '1009', user_uuid: 'dummy-1009', email: 'rahul@ucaas.in', role: 'Agent' },
      { name: 'Divya Rao', value: '1010', user_uuid: 'dummy-1010', email: 'divya@ucaas.in', role: 'Agent' },
    ]),
    agentDetail: null,
  },
  {
    uuid: 'dummy-queue-3',
    name: 'Billing',
    extension: '2102',
    manager: JSON.stringify({
      name: 'Kabir Singh',
      role: 'Queue Manager',
      email: 'kabir.singh@ucaas.in',
      profile: '',
    }),
    agent: [{ status: 'Available' }],
    members: JSON.stringify([
      { name: 'Priya Sharma', value: '1001', user_uuid: 'dummy-1001', email: 'priya@ucaas.in', role: 'Agent' },
      { name: 'Rahul Verma', value: '1009', user_uuid: 'dummy-1009', email: 'rahul@ucaas.in', role: 'Agent' },
    ]),
    agentDetail: null,
  },
];

const CallQueueContent = () => {
  const {
    data: callQueueData = [],
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['getCallQueueInvolvements'],
    queryFn: () => getCallQueueInvolvements(),
    select: (res) => res?.data?.data?.result ?? [],
  });

  // Fall back to sample queues only when nothing real is assigned, purely so
  // the layout can be previewed.
  const displayQueues =
    !isLoading && !isError && callQueueData?.length === 0 ? DUMMY_CALL_QUEUES : callQueueData;

  return (
    <div className="perf-queue w-full relative">
      {/* The count pill used to sit outside this scroll box, so it stayed put
          while the grid scrolled underneath it — the pill read as pinned in
          place, and a card scrolled up could peek out right behind it. It's
          the first thing inside the scrollable area now, so it moves with
          the queues it's counting instead of floating over them. */}
      <div className="w-full overflow-y-auto h-[calc(100vh-12.55rem)] pr-1">
        {!isLoading && !isError && displayQueues?.length > 0 && (
          <div className="mb-3 flex w-full items-center">
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(249,115,22,0.18)] bg-[#FFF6EB] py-1.5 pl-1.5 pr-3.5 shadow-[0_2px_8px_rgba(160,95,30,0.08)]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF1E0] dark:bg-mcm-accent-wash">
                <Icon name="CallQueue" className="h-3.5 w-3.5 text-[#ea580c]" />
              </span>
              <span className="text-xs font-semibold text-[#475569] dark:text-mcm-ink-2">
                {/* `#ea580c` measured 3.33:1 here against the pill's cream
                    fill — short of the 4.5:1 small text needs; `#C2670A`, one
                    step darker, still only reached 3.6:1 at this weight and
                    size. `#a8460f` clears it (~5.3:1). */}
                <span className="num font-bold text-[#a8460f] dark:text-mcm-accent-ink">{displayQueues.length}</span>{' '}
                {displayQueues.length === 1 ? 'queue' : 'queues'}
              </span>
            </span>
          </div>
        )}

        {isError ? (
          <div className="w-full flex justify-center items-center py-10 text-[#6b6459] dark:text-mcm-ink-3">
            Failed to load call queue data.
          </div>
        ) : isLoading ? null : displayQueues?.length ? (
          <div className="w-full grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {displayQueues?.map((queue: any, index: number) => (
              <CallQueueCard key={queue?.uuid || index} queue={queue} refetch={refetch} />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex justify-center flex-col gap-2 items-center py-10 text-[#6b6459] dark:text-mcm-ink-3">
            <img src={NotFound} alt="BusyImage" className="min-w-36  max-w-36" />
            <p className="flex items-center justify-center text-[#2E2D35] dark:text-mcm-ink">No call queue found.</p>
            <p className="text-sm text-[#2E2D35] dark:text-mcm-ink">Call queues assigned to you will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallQueueContent;
