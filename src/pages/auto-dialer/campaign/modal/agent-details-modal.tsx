import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { Dispatch, SetStateAction } from 'react';
import { ModalState } from '..';
import TableManager from '@/components/custom/table-manager';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';

const AgentDetailsModal = ({
  modalState,
  setModalState,
}: {
  modalState: ModalState;
  setModalState: Dispatch<SetStateAction<ModalState>>;
}) => {
  const { open = false, data = [], type } = modalState || {};
  const columns = [
    {
      header: 'Name',
      accessorKey: 'first_name',
      cell: ({ row }: any) => {
        const data = row?.original;
        const name = data?.label;
        return (
          <div className="flex items-center gap-2 w-full">
            <div className="flex ">
              {/* <CustomAvatar name={name} extension={data?.value} /> */}
              <CustomAvatar
                name={name}
                showPresence
                extension={data?.value}
                image={data?.profile}
              />
            </div>
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between  gap-2">
                <div className="flex flex-col items-start ">
                  <p className="capitalize">{name}</p>
                  <small className="text-primary text-[10px]">{data?.role}</small>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Icon name="Grid" className="w-4 h-4 " />
                  <div>{data?.value}</div>
                </div>
              </div>
              <div className="text-gray-500 flex justify-between">
                <div>{data?.email}</div>
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  const handleClose = () => setModalState({ open: false, data: [], type: null });
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-1/2 p-3 max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            {type || 'Total Members'}
            <div
              onClick={handleClose}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="w-full h-full flex flex-col gap-2">
          <TableManager
            {...{
              columns,
              staticData: data || [],
              showPagination: false,
              isHeightSet: true,
              customClass: 'max-h-[500px]',
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentDetailsModal;
