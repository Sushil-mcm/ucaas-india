import { useQuery } from '@tanstack/react-query';
import { getCallQueueInvolvements } from '@/services/api';
import Loader from '@/components/custom/loader';
import CallQueueCard from './call-queue-card';
import { SearchLine } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import useDebounce from '@/hooks/use-debounce';
import NotFound from '@/assets/images/not-found-img.svg';
const CallQueueContent = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 1000);

  const {
    data: callQueueData = [],
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['getCallQueueInvolvements', debouncedSearch],
    queryFn: () =>
      getCallQueueInvolvements({
        search: debouncedSearch,
      }),
    select: (res) => res?.data?.data?.result ?? [],
  });

  return (
    <div className="w-full flex flex-col gap-2 relative">
      <div className="relative w-full">
        <Input
          placeholder="Search"
          className="pl-10 w-full"
          IconPosition="left-0 pl-2 inset-y-0"
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith(' ')) return;
            setSearch(value);
          }}
          Icon={<SearchLine className="text-gray-700" />}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader variant="blue" size="sm" />
          </div>
        )}
      </div>

      <div className="w-full overflow-y-auto h-[calc(100vh-12.55rem)] pr-1">
        {isError ? (
          <div className="w-full flex justify-center items-center py-10 text-gray-500">
            Failed to load call queue data.
          </div>
        ) : isLoading ? null : callQueueData?.length ? (
          <div className="w-full grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {callQueueData?.map((queue: any, index: number) => (
              <CallQueueCard key={queue?.uuid || index} queue={queue} refetch={refetch} />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex justify-center flex-col gap-2 items-center py-10 text-gray-500">
            <img src={NotFound} alt="BusyImage" className="min-w-36  max-w-36" />
            <p className="flex items-center justify-center text-gray-900">No call queue found.</p>
            <p className="text-sm text-gray-700">Call queues assigned to you will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallQueueContent;
