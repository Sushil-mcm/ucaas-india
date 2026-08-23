import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActivityList from '../../../components/activity-list/activity-list';
import LeadContactDetails from './LeadContactDetails';
import NotesView from '@/components/activity-list/side-drawers/notes-view';

const LeadContactActivity = ({ rowData }: { rowData: any }) => {
  const contactId = rowData?._id;
  const tabList = ['Logs', 'Notes'];

  return (
    <div className="flex gap-2 w-full pt-3">
      <div className="min-w-[22rem] pb-2 max-w-[22rem]">
        <LeadContactDetails rowData={rowData} />
      </div>
      <Tabs defaultValue="Logs" className="w-[calc(100%-22rem)] border rounded-lg gap-0">
        <div className="border-b border-gray-200 w-full">
          <TabsList className="flex text-sm font-semibold text-center p-0 rounded-none min-h-10">
            {tabList?.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6 text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="Logs">
          <ActivityList activityType="leadContactActivityLists" contactId={contactId as string} />
        </TabsContent>
        <TabsContent value="Notes">
          <NotesView contactId={contactId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeadContactActivity;
