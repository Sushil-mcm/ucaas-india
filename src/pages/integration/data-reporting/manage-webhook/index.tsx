import {
  AdminHeadActions,
  useSetAdminPageMeta,
} from '@/pages/admin-settings/admin-page-head';
import { SearchLine } from '@/assets/icons';
import TableManager from '@/components/custom/table-manager';
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
  useSetAdminPageMeta({
    description: 'Endpoints the console posts to when calls, messages or contacts change.',
  });

  return (
    <div className="w-full min-w-0 flex flex-col overflow-hidden">
      {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
      {/* Title and sentence belong to the Admin head; the button goes up beside
          them, and search drops onto the row above the table as a chip, the way
          every other Admin list carries it. */}
      <AdminHeadActions>
        <button type="button" className="btn primary" onClick={handleOpen}>
          <Icon name="PlusIcon" className="w-3 h-3" />
          New webhook
        </button>
      </AdminHeadActions>

      <>
        <div className="w-full p-3 flex flex-col gap-2">
          <div className="mcm-listbar">
            <label className="mcm-numsearch">
              <SearchLine />
              <input
                type="search"
                placeholder="Search webhooks"
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith(' ')) return;
                  setSearch(value);
                }}
              />
            </label>
          </div>
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
