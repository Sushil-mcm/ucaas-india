import { useState } from 'react';
import ZapierViewModal from '../modal/ZapierViewModal';
import { ChevronIcon } from '@/assets/icons';
// import Breadcrumb from '@/components/custom/breadcrumb';
import { reportingData } from '../../constant';
import { Icon } from '@/assets/icons/icon';

// const breadcrumbData = [{ label: 'Data & Reporting' }, { label: 'Zapier' }];

const Zapier = () => {
  const zapierItems = reportingData['zapier']?.items;
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const handleClose = () => setModalOpen(null);
  const handleConnect = (name: string) => setModalOpen(name);
  return (
    <div className="w-full min-w-0 bg-gray-200/15 flex flex-col overflow-hidden">
      {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
      <div className="flex min-h-[65px] items-center justify-between border-b border-gray-200 bg-white p-3">
        <div className="flex min-w-0 items-center gap-1 text-lg font-semibold text-gray-900">
          Data & Reporting
          <div className="shrink-0 -rotate-90 text-gray-800">
            <Icon name="ChevronIcon" className="w-5 h-5" />
          </div>
          <span className="text-primary text-md truncate">Zapier</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 p-3 overflow-y-auto xs:max-h-[62vh] md:max-h-full">
        {zapierItems?.map((item, index) => (
          <div
            key={index}
            className="flex flex-col justify-between items-baseline border border-gray-200 rounded-lg bg-white p-3 w-full gap-5 h-full"
          >
            <div className="flex flex-col gap-2">
              <div className="flex shrink-0 items-center justify-center bg-gray-100 rounded-lg p-3 h-16 w-16">
                <img src={item.icon} alt={item.title} className="w-10" />
              </div>
              <h4 className="text-start font-semibold text-primary">{item.title}</h4>
              <p className="text-gray-700 text-sm whitespace-normal ">{item.description}</p>
            </div>
            <div
              className="flex items-start justify-start text-primary hover:text-primary/90 cursor-pointer"
              onClick={() => handleConnect(item?.id)}
            >
              Connect
              <ChevronIcon className="-rotate-90 mt-1" />
            </div>
          </div>
        ))}
      </div>
      {modalOpen && (
        <ZapierViewModal
          handleClose={handleClose}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
        />
      )}
    </div>
  );
};

export default Zapier;
