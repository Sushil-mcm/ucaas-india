import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FC } from 'react';
import { CloseIcon } from '@/assets/icons';
import TableManager from './table-manager';
import { ColumnDef } from '@tanstack/react-table';
import { capitalizeFirstLetter, convertDateFormateApis } from '@/lib/utils';
import moment from 'moment';

interface UserLoginActivityProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  selectedUser?: any;
}
const UserLoginActivityModal: FC<UserLoginActivityProps> = ({
  modalState,
  setModalState,
  selectedUser,
}) => {
  const todaySessions = selectedUser?.sessions?.filter((item: any) =>
    moment(item?.joinTimestamp).isSame(moment(), 'day'),
  );
  const columns: ColumnDef<any>[] = [
    {
      header: 'Login Time',
      accessorKey: 'joinTimestamp',
      cell: ({ row }: any) => {
        const data = row?.original;
        return <div>{convertDateFormateApis(data?.joinTimestamp, 'MMM DD, YYYY hh:mm a')}</div>;
      },
    },
    {
      header: 'Device',
      accessorKey: 'device_type',
      cell: ({ getValue }: any) => capitalizeFirstLetter(getValue()),
    },
    {
      header: 'Browser',
      accessorKey: 'browser_version',
    },
    {
      header: 'OS',
      accessorKey: 'os_version',
      cell: ({ getValue }: any) => capitalizeFirstLetter(getValue()),
    },
    {
      header: 'IP',
      accessorKey: 'ip_address',
      //   cell: ({ row }: any) => {
      //     const data = row?.original;
      //     return <div>{SecondsTohhmmss(data?.duration)}</div>;
      //   },
    },
  ];

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent className="md:w-3/6 p-3 max-h-[99%] overflow-y-auto" showCloseButton={false}>
        <div className="w-full overflow-x-auto flex flex-col gap-3">
          <div className="flex flex-col gap-1.5  text-900/80">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              Login Activity
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <TableManager
              {...{
                columns,
                showPagination: false,
                staticData: todaySessions,
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserLoginActivityModal;
