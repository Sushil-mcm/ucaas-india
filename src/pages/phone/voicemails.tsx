import { Refresh, SearchLine } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import CallList from './call-list';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const Voicemails = ({
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
  const callListRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

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
  return (
    <div className="flex flex-col items-center gap-2 w-full">
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
      <CallList
        type="all"
        tabType={tabType}
        logData={logData}
        setLogData={setLogData}
        ref={callListRef}
        search={search}
        filterDate={filterDate}
      />
    </div>
  );
};

export default Voicemails;
