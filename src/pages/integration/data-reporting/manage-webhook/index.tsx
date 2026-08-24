import { SearchLine } from '@/assets/icons';
import TableManager from '@/components/custom/table-manager';
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
      <div className="mcm-intpage-head mcm-intpage-head-row">
        <div>
          <div className="mcm-intpage-eyebrow">Integration</div>
          <h1>Manage Webhook</h1>
          <p>Endpoints the console posts to when calls, messages or contacts change.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search webhooks"
            className="pl-10 min-h-9 rounded-lg"
            IconPosition="left-0 pl-2 inset-y-0"
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith(' ')) return;
              setSearch(value);
            }}
            Icon={<SearchLine className="text-gray-700" />}
          />
          <button type="button" className="btn primary" onClick={handleOpen}>
            <Icon name="PlusIcon" className="w-3 h-3" />
            New webhook
          </button>
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
