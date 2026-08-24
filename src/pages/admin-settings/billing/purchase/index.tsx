import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TopUp from './top-up';
import ManageCards from './manage-cards';
import { useState } from 'react';
// import Breadcrumb from '@/components/custom/breadcrumb';
import { Icon } from '@/assets/icons/icon';
// const breadcrumbData = [{ label: 'Billing' }, { label: 'Purchase' }];

const Purchase = () => {
  const [activeTab, setActiveTab] = useState('top-up');

  const tabArr = [
    {
      value: 'top-up',
      label: 'Top Up Credits',
    },
    {
      value: 'manage-cards',
      label: 'Manage cards',
    },
  ];

  const tabLookUp: any = {
    'top-up': <TopUp />,
    'manage-cards': <ManageCards />,
  };
  return (
    <section className="w-full bg-gray-200/15 overflow-x-auto overflow-y-hidden">
      {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <div>
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
            Billing
            <div className="-rotate-90 text-gray-800">
              <Icon name="ChevronIcon" className="w-5 h-5" />
            </div>
            <span className="text-primary text-md">Plan</span>
          </p>
          <p className="text-gray-500 text-xs">
            Change plan, add licences, or buy numbers and credit.
          </p>
        </div>
        <div className="flex gap-2"></div>
      </div>

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
