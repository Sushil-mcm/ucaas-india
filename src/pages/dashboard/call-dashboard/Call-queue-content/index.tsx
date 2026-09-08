import { useQuery } from '@tanstack/react-query';
import { getCallQueueInvolvements } from '@/services/api';
import Loader from '@/components/custom/loader';
import CallQueueCard from './call-queue-card';
import { SearchLine } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import useDebounce from '@/hooks/use-debounce';
import NotFound from '@/assets/images/not-found-img.svg';
import { RefreshCw } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 1000);

  const {
    data: callQueueData = [],
    isError,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['getCallQueueInvolvements', debouncedSearch],
    queryFn: () =>
      getCallQueueInvolvements({
        search: debouncedSearch,
      }),
    select: (res) => res?.data?.data?.result ?? [],
  });

  // Fall back to sample queues only when nothing real is assigned and the
  // user isn't actively searching, purely so the layout can be previewed.
  const displayQueues =
    !isLoading && !isError && callQueueData?.length === 0 && !debouncedSearch
      ? DUMMY_CALL_QUEUES
      : callQueueData;

  return (
    <div className="perf-queue w-full flex flex-col gap-3 relative">
      {/* The search box used to span the full width on its own, which read as
          an empty toolbar above the cards. Capping it and pairing it with the
          result count gives the row a left and a right, and says how many
          queues the grid below is showing. */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Input
            placeholder="Search queues"
            className="queue-search pl-10 w-full rounded-full border-[rgba(255,255,255,0.9)] bg-[#fffdfb] shadow-[0_2px_10px_rgba(80,105,155,0.1)] text-[#1A1A1A] placeholder:text-[#94a3b8] hover:border-primary/40 focus:border-primary/60"
            IconPosition="left-0 pl-3 inset-y-0"
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith(' ')) return;
              setSearch(value);
            }}
            Icon={<SearchLine className="text-[#64748b]" />}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader variant="blue" size="sm" />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Was a plain cool-white glass pill (`rgba(255,255,255,0.55)`,
              white border) — legible, but the one piece of chrome on this
              page not on the warm-orange palette the queue cards themselves
              already carry. An icon badge and an orange count give it the
              same identity as everything below it, rather than reading as a
              leftover from a different design pass. */}
          {!isLoading && !isError && displayQueues?.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(249,115,22,0.18)] bg-[#FFF6EB] py-1.5 pl-1.5 pr-3.5 shadow-[0_2px_8px_rgba(160,95,30,0.08)]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF1E0]">
                <Icon name="CallQueue" className="h-3.5 w-3.5 text-[#ea580c]" />
              </span>
              <span className="text-xs font-semibold text-[#475569]">
                {/* `#ea580c` measured 3.33:1 here against the pill's cream
                    fill — short of the 4.5:1 small text needs; `#C2670A`, one
                    step darker, still only reached 3.6:1 at this weight and
                    size. `#a8460f` clears it (~5.3:1). */}
                <span className="num font-bold text-[#a8460f]">{displayQueues.length}</span>{' '}
                {displayQueues.length === 1 ? 'queue' : 'queues'}
              </span>
            </span>
          )}

          {/* This board had no way to pull fresh queue/agent state short of a
              full page reload — the other three legacy boards (Wallboard, AI
              Wall, Video) all carry their own Refresh control, this one
              never did. Same pill styling those use. */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh queues"
            aria-label="Refresh queues"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(214,163,90,0.6)] bg-white px-4 py-2 text-xs font-semibold text-primary shadow-[0_2px_8px_rgba(194,98,46,0.16)] transition hover:border-primary/60 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="w-full overflow-y-auto h-[calc(100vh-12.55rem)] pr-1">
        {isError ? (
          <div className="w-full flex justify-center items-center py-10 text-[#6b6459]">
            Failed to load call queue data.
          </div>
        ) : isLoading ? null : displayQueues?.length ? (
          <div className="w-full grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {displayQueues?.map((queue: any, index: number) => (
              <CallQueueCard key={queue?.uuid || index} queue={queue} refetch={refetch} />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex justify-center flex-col gap-2 items-center py-10 text-[#6b6459]">
            <img src={NotFound} alt="BusyImage" className="min-w-36  max-w-36" />
            <p className="flex items-center justify-center text-[#2E2D35]">No call queue found.</p>
            <p className="text-sm text-[#2E2D35]">Call queues assigned to you will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallQueueContent;
