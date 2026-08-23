import { FC, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import CustomAvatar from '@/components/custom/custom-avatar';
import { CloseIcon } from '@/assets/icons';
import Loader from '@/components/custom/loader';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shareRecording } from '@/services/api';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';

interface ShareRecordingModalProps {
  modalState: boolean;
  setModalState: (open: boolean) => void;
  selectedData: any;
}

const ShareRecordingModal: FC<ShareRecordingModalProps> = ({
  modalState,
  setModalState,
  selectedData = [],
}) => {
  const { user } = useUser();
  const { user_info } = user || {};
  const { meeting = {} } = selectedData || {};
  const { members = [] } = meeting || {};
  const users = members || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState<any[]>([]);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (modalState) {
      setLocalSelected([]);
      setSearchTerm('');
    }
  }, [modalState]);

  const filteredUsers =
    users
      ?.filter(
        (user: any) =>
          user?.type === 'USER' && !selectedData?.sharedVideoReceiverIds?.includes(user?.userId),
      )
      ?.filter((user: any) => {
        const name = user?.name?.toLowerCase() || '';
        const email = user?.email?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();

        return name.includes(search) || email.includes(search);
      }) || [];
  const handleSelectUser = (usr: any) => {
    setLocalSelected((prev) =>
      prev?.some((u) => u?.email === usr?.email)
        ? prev?.filter((u) => u?.email !== usr?.email)
        : [
            ...prev,
            {
              name: usr?.name,
              email: usr?.email,
              userId: usr?.userId,
            },
          ],
    );
  };

  const handleSelectAll = (isChecked: boolean) => {
    setLocalSelected(
      isChecked
        ? filteredUsers?.map((usr: any) => ({
            name: usr?.name,
            email: usr?.email,
            userId: usr?.userId,
          }))
        : [],
    );
  };

  const checkedVisibleCount = filteredUsers?.filter((user: any) =>
    localSelected?.some((u: any) => u?.email === user?.email),
  )?.length;

  const { mutate, isPending } = useMutation({
    mutationKey: ['shareRecording'],
    mutationFn: shareRecording,
    onSuccess: ({ data }) => {
      handleAlert({
        text: data?.data?.message || 'Recording shared successfully',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['recordingList'] });
      setModalState(false);
    },
  });

  const handleShareClick = () => {
    const recevierIds = [
      ...(selectedData?.sharedVideoReceiverIds || []),
      ...(localSelected?.map(({ userId }) => userId) || []),
    ];
    const payload = {
      meetingId: meeting?.meetingId,
      videoRecordingId: selectedData?._id,
      recevierId: recevierIds || [],
      senderUserDetail: {
        firstName: user_info?.first_name,
        lastName: user_info?.last_name,
        email: user_info?.email,
        userId: user_info?.uuid,
        extension: user_info?.extension,
      },
    };
    mutate(payload);
  };

  return (
    <Dialog open={modalState} onOpenChange={setModalState}>
      <DialogContent className="w-2/6 p-3" showCloseButton={false}>
        <div className="flex flex-col gap-1.5 text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Share Recording
            <div
              onClick={() => setModalState(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-gray-900 text-sm">Select users to share this recording with.</p>

          <div className="flex items-center gap-4 pr-4">
            <Input
              placeholder="Search User"
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
            />
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Label>Select All</Label>
              <Checkbox
                onCheckedChange={(e) => handleSelectAll(e as boolean)}
                checked={
                  localSelected?.length === filteredUsers?.length && filteredUsers?.length > 0
                }
              />
            </div>
          </div>

          <div className="flex flex-col h-full">
            <ul className="divide-y divide-gray-200 overflow-auto max-h-[300px] pr-3" role="list">
              {filteredUsers && filteredUsers?.length > 0 ? (
                filteredUsers?.map((user: any) => {
                  // const fullName = `${user?.first_name} ${user?.last_name || ''}`;
                  return (
                    <li key={user.email} className="flex cursor-pointer bg-white" role="menu-item">
                      <div className="flex items-center w-full h-16 gap-2">
                        <CustomAvatar
                          name={user?.name}
                          showPresence
                          extension={user?.extension}
                          image={user?.profile}
                        />
                        <div className="flex items-center justify-between text-sm w-[calc(100%_-_3rem)]">
                          <div className="flex flex-col">
                            <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                            <p className="text-gray-800 whitespace-nowrap">{user?.email}</p>
                          </div>
                          <Checkbox
                            onCheckedChange={() => handleSelectUser(user)}
                            checked={localSelected.some((u) => u?.email === user?.email)}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="text-center py-4 text-gray-700">
                  <p>No user found</p>
                </li>
              )}
            </ul>

            <div className="gap-2.5 flex items-center pt-2">
              <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">
                <h5 className="text-white font-medium text-sm">{checkedVisibleCount}</h5>
              </div>
              <div className="flex flex-col gap-0.5">
                <small className="font-light text-xs">Users selected</small>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 w-full">
          <Button variant={'transparent'} onClick={() => setModalState(false)}>
            Cancel
          </Button>
          <Button
            variant={'outline'}
            type="button"
            onClick={handleShareClick}
            disabled={checkedVisibleCount === 0 || isPending}
          >
            {isPending ? (
              <div className="flex items-center justify-center p-5">
                <Loader size="sm" />
              </div>
            ) : (
              'Share'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareRecordingModal;
