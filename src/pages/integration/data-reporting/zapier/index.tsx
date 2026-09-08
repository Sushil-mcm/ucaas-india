import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import { useState } from 'react';
import ZapierViewModal from '../modal/ZapierViewModal';
import { ChevronIcon } from '@/assets/icons';
// import Breadcrumb from '@/components/custom/breadcrumb';
import { reportingData } from '../../constant';

// const breadcrumbData = [{ label: 'Data & Reporting' }, { label: 'Zapier' }];

const Zapier = () => {
  const zapierItems = reportingData['zapier']?.items;
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const handleClose = () => setModalOpen(null);
  const handleConnect = (name: string) => setModalOpen(name);
  useSetAdminPageMeta({
    description:
      'Send console events into Zapier so they can trigger workflows in your other tools.',
  });

  /* The Admin head already prints this screen's name beside the sidebar's own
     title, so the block below said it a second time under an "Integration"
     eyebrow that repeats the section the nav has highlighted. The sentence is
     the only part worth keeping; it goes to the info button by the title. */
  return (
    <div className="w-full min-w-0 flex flex-col overflow-hidden">
      {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 p-3 overflow-y-auto xs:max-h-[62vh] md:max-h-full">
        {zapierItems?.map((item, index) => (
          <div
            key={index}
            className="flex flex-col justify-between items-baseline border border-[rgba(225,200,165,0.9)] rounded-lg bg-[rgba(251,249,246,0.88)] p-3 w-full gap-5 h-full"
          >
            <div className="flex flex-col gap-2">
              <div className="flex shrink-0 items-center justify-center bg-[#FBE2C8]/45 rounded-lg p-3 h-16 w-16">
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
