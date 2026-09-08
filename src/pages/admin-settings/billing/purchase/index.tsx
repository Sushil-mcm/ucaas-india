import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TopUp from './top-up';
import ManageCards from './manage-cards';
import { useState } from 'react';
// import Breadcrumb from '@/components/custom/breadcrumb';
// const breadcrumbData = [{ label: 'Billing' }, { label: 'Purchase' }];

const Purchase = () => {
  const [activeTab, setActiveTab] = useState('top-up');

  const tabArr = [
    {
      value: 'top-up',
      label: 'Add Credit',
    },
    {
      value: 'manage-cards',
      label: 'Payment Methods',
    },
  ];

  const tabLookUp: any = {
    'top-up': <TopUp />,
    'manage-cards': <ManageCards />,
  };
  /* Its own 65px head repeated "Billing > Credit & Payment" under the Admin
     head that had already named this screen, and the sentence beneath it goes
     to the info button there. The cool wash over the warm ground goes too. */
  useSetAdminPageMeta({
    description:
      'Top up the balance that pays for usage beyond your plan — calls, SMS and AI — and manage the cards it is charged to.',
  });

  return (
    <section className="w-full overflow-x-auto overflow-y-hidden">

      <div className="w-full p-3 flex flex-col gap-3 ">
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={(v) => setActiveTab(v)}
          className="flex w-full relative"
        >
          {' '}
          <div className="border-b border-gray-200 w-full">
            <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none min-h-10 bg-transparent">
              {tabArr?.map((v: any) => {
                return (
                  <TabsTrigger
                    className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                    value={v.value}
                  >
                    {v.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          <TabsContent value={activeTab}>
            <div className="xs:max-h-[calc(100vh-50vh)] sm:max-h-full sm:h-[calc(100vh-12rem)] overflow-auto">
              {tabLookUp[activeTab]}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default Purchase;
