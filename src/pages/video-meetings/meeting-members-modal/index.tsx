import { Dialog, DialogContent } from '@/components/ui/dialog';
import TableManager from '@/components/custom/table-manager';
import { CloseIcon } from '@/assets/icons';
export interface IUser {
  _id: string;
  userId: string;
  name: string;
  email: string;
  joinStatus: string;
  source: string;
  type: string;
  invited?: boolean;
}

interface MeetingMembersProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  members: IUser[];
  title?: string;
  filterFn?: (user: any) => boolean;
}

const MeetingMembersModal = ({
  modalState,
  setModalState,
  members,
  title = 'Attendees',
  filterFn,
}: MeetingMembersProps) => {
  const isGuestType = (type?: string) =>
    String(type || '')
      .trim()
      .toUpperCase() === 'GUEST';

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }: { row: { original: IUser } }) => {
        const { name, type } = row.original || {};
        const displayName = name?.trim() || 'Guest';
        return <>{isGuestType(type) ? `${displayName} (Guest)` : displayName}</>;
      },
    },
    { header: 'Email', accessorKey: 'email' },
  ];

  // const { data: meetingDetailInfo, isLoading } = useQuery({
  //   queryKey: ['meetingDetail', meetingId],
  //   queryFn: () => meetingDetailList({ meetingId }),
  //   enabled: !!meetingId,
  //   select: (data) => data?.data?.data?.result,
  // });

  let attendees = members || [];
  console.log(attendees, 'add=============');

  if (title === 'Invited Members') {
    attendees = attendees?.filter((member: any) => member?.invited === true);
  }

  if (filterFn) {
    attendees = attendees?.filter(filterFn);
  }

  const tableData = attendees?.map((user: any, index: number) => ({
    index: index + 1,
    name: user?.name,
    type: user?.type,
    email: user?.email || '--',
  }));

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="w-full max-w-[500px] p-3" showCloseButton={false}>
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            {title}
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <TableManager
          {...{
            columns,
            staticData: tableData,
            showPagination: false,
            customClass: 'max-h-[calc(100vh_-_26rem)]',
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default MeetingMembersModal;
