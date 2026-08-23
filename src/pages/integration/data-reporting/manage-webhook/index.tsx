import { SearchLine } from '@/assets/icons';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import AddPathModal from '../modal/AddPathModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
// import Breadcrumb from '@/components/custom/breadcrumb';
import { editForm } from '../../constant';
import { Icon } from '@/assets/icons/icon';

// const breadcrumbData = [{ label: 'Data & Reporting' }, { label: 'Manage Webhook' }];

const ManageWebhook = () => {
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState(false);
  const [editForm, setEditForm] = useState<editForm>({ isEdit: false, formData: {} });
  const columns = [
    {
      header: 'Created Date',
      accessorKey: 'created_at',
    },
    {
      header: 'Type',
      accessorKey: 'type',
    },
    {
      header: 'Path',
      accessorKey: 'path',
    },
  ];
  const handleClose = () => setModalState(false);
  const handleOpen = () => {
    setEditForm({ isEdit: false, formData: {} });
    setModalState(true);
  };
  return (
    <div className="w-full min-w-0 bg-gray-200/15 flex flex-col overflow-hidden">
      {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
      <div className="flex min-h-[65px] flex-col gap-3 border-b border-gray-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-1 text-lg font-semibold text-gray-900">
          Data & Reporting
          <div className="shrink-0 -rotate-90 text-gray-800">
            <Icon name="ChevronIcon" className="w-5 h-5" />
          </div>
          <span className="text-primary text-md truncate">Manage Webhook</span>
        </div>
        <div className="filters flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Input
            placeholder="Search"
            className="min-h-9 min-w-0 rounded-lg pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            IconPosition="left-0 pl-2 inset-y-0"
            Icon={<SearchLine className=" text-gray-700" />}
          />
          <Button
            type="button"
            variant={'outline'}
            onClick={handleOpen}
            className="min-h-9 shrink-0"
          >
            Add Zapier Trigger Webhook
          </Button>
        </div>
      </div>

      <>
        <div className="w-full p-3 flex flex-col gap-2">
          <TableManager
            {...{
              // fetcherKey: 'callListingLog',
              // fetcherFn: callList,
              columns,
              search,
              emptyTablePlaceholder: 'No webhook found',
              descriptionEmptyTable:
                'Create a webhook to enable real-time data integration with Zapier.',
            }}
          />
        </div>
        <Dialog open={modalState} onOpenChange={setModalState}>
          <DialogContent className="w-[calc(100vw_-_2rem)] max-w-lg p-3" showCloseButton={false}>
            <AddPathModal handleClose={handleClose} editForm={editForm} />
          </DialogContent>
        </Dialog>
      </>
    </div>
  );
};

export default ManageWebhook;
