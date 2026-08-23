import { Refresh, SearchLine } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CallList from './call-list';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useSocketEvents } from '@/hooks/use-socket-events';

const Calls = ({
  tabType = '',
  logData,
  setLogData,
  filterDate,
}: {
  tabType: string;
  logData: any;
  setLogData: any;
  filterDate?: { from?: string; to?: string };
}) => {
  console.log('🚀 ~ Calls ~ logData:', logData);
  const callListRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const { socketEventsManager } = useSocketEvents();

  const handleRefresh = async () => {
    if (callListRef?.current) {
      setIsLoading(true);
      try {
        await callListRef.current.refetchList();
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (socketEventsManager) {
      socketEventsManager.on('wallet-updated', () => {
        handleRefresh();
      });
    }
  }, [socketEventsManager]);

  return (
    <div className="flex flex-col items-center gap-2 w-full ">
      <div className="flex items-center w-full gap-2 px-3">
        <Input
          placeholder="Search calls"
          className="pl-10"
          IconPosition="left-0 pl-2 inset-y-0"
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith(' ')) return;
            setSearch(e.target.value);
          }}
          Icon={<SearchLine className=" text-gray-700" />}
        />
        <Button
          className="cursor-pointer flex items-center justify-center rounded-xl w-10 h-10 bg-white border border-gray-300 text-gray-400 hover:bg-primary hover:text-white"
          type="button"
          variant={'ghost'}
          onClick={handleRefresh}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Refresh className="w-5 h-5" />}
        </Button>
      </div>
      <Tabs defaultValue="all" className="w-full ">
        <div className="border-b border-gray-200 w-full">
          <TabsList className=" w-full bg-white p-0 rounded-none  ">
            <TabsTrigger
              className="cursor-pointer  data-[state=active]:text-primary data-[state=active]:shadow-none  data-[state=active]:border-b-2 px-4 data-[state=active]:border-b-primary data-[state=active]:rounded-none border-b-2 h-full font-semibold data-[state=inactive]:text-gray-700"
              value="all"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              className="cursor-pointer  data-[state=active]:text-primary data-[state=active]:shadow-none  data-[state=active]:border-b-2 px-4 data-[state=active]:border-b-primary data-[state=active]:rounded-none border-b-2 h-full font-semibold data-[state=inactive]:text-gray-700"
              value="outgoing"
            >
              Outgoing
            </TabsTrigger>
            <TabsTrigger
              className="cursor-pointer  data-[state=active]:text-primary data-[state=active]:shadow-none  data-[state=active]:border-b-2 px-4 data-[state=active]:border-b-primary data-[state=active]:rounded-none border-b-2 h-full font-semibold data-[state=inactive]:text-gray-700"
              value="incoming"
            >
              Incoming
            </TabsTrigger>
            <TabsTrigger
              className="cursor-pointer  data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2  px-4 data-[state=active]:border-b-primary data-[state=active]:rounded-none border-b-2 h-full font-semibold data-[state=inactive]:text-gray-700"
              value="missed"
            >
              Missed
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="all">
          <CallList
            type="all"
            tabType={tabType}
            filter={[]}
            logData={logData}
            setLogData={setLogData}
            ref={callListRef}
            search={search}
            filterDate={filterDate}
          />
        </TabsContent>
        <TabsContent value="outgoing">
          <CallList
            type="outgoing"
            tabType={tabType}
            filter={[{ key: 'direction', value: 'Outbound' }]}
            logData={logData}
            setLogData={setLogData}
            ref={callListRef}
            search={search}
            filterDate={filterDate}
          />
        </TabsContent>
        <TabsContent value="incoming">
          <CallList
            type="incoming"
            tabType={tabType}
            filter={[{ key: 'direction', value: 'Inbound' }]}
            logData={logData}
            setLogData={setLogData}
            ref={callListRef}
            search={search}
            filterDate={filterDate}
          />
        </TabsContent>
        <TabsContent value="missed">
          <CallList
            type="missed"
            tabType={tabType}
            filter={[{ key: 'direction', value: 'Missed' }]}
            logData={logData}
            setLogData={setLogData}
            ref={callListRef}
            search={search}
            filterDate={filterDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Calls;
