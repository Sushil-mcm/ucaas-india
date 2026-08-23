import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import ScheduleEventModal from './ScheduleEventModal';
import { SCHEDULEMEETING } from '../constants';

const ScheduleModal = ({ toggle, event }: any) => {
  const [activeTab, setActiveTab] = useState<string>('event');
  const isEdit = !!event?.schedule;

  useEffect(() => {
    const getActiveTab =
      event?.schedule?.raw?.category?.toLowerCase() ||
      event?.schedule?.category?.toLowerCase() ||
      event?.category?.toLowerCase() ||
      'event';
    setActiveTab(getActiveTab);
  }, [event]);

  return (
    <Tabs
      defaultValue="event"
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex gap-4 flex-col flex-1 min-h-0"
    >
      <div className="border-b border-gray-200 w-full">
        <TabsList className="flex text-sm font-semibold text-center p-0 rounded-none min-h-10d">
          {isEdit ? (
            <TabsTrigger
              value={activeTab}
              className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6 text-gray-700 cursor-pointer h-full rounded-none w-full relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
            >
              {activeTab === SCHEDULEMEETING?.event ? 'Event' : 'Task'}
            </TabsTrigger>
          ) : (
            <>
              <TabsTrigger
                value="event"
                className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6 text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
              >
                Event
              </TabsTrigger>
              <TabsTrigger
                value="task"
                className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6 text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
              >
                Task
              </TabsTrigger>
            </>
          )}
        </TabsList>
      </div>

      <ScheduleEventModal
        {...{
          isEdit,
          handleClose: toggle,
          category: activeTab,
          schedule: event?.schedule,
          startDate: event?.start,
          openInvite: event?.openInvite,
        }}
      />
    </Tabs>
  );
};

export default ScheduleModal;
