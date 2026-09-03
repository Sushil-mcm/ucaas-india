import { ConnectIcon, FacebookIcon, SettingsLine, Warning } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { connectMetaChannel, handleAlert } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeOmniStatus, getSocialMediaChannelList, deleteOmniChannel } from '@/services/api';
import Loader from '@/components/custom/loader';
import { CircleCheckIcon, Trash2 } from 'lucide-react';

import { useUser } from '@/hooks/use-user';

const FacebookChannel = () => {
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const { data: channelList = [], isLoading: isLodingChannelList } = useQuery({
    queryKey: ['getSocialMediaChannelList'],
    queryFn: () => getSocialMediaChannelList(),
    select: (data) => data?.data?.data?.result || [],
  });

  const facebookData =
    channelList &&
    channelList?.find((item: { name: string; type: string }) =>
      ['messenger', 'facebook'].includes(item?.type),
    );

  const isFacebookConnected = !!facebookData;

  const handleConnect = () => {
    connectMetaChannel('messenger', setLoading, user?.company_info?.uuid);
  };
  const queryClient = useQueryClient();
  const { mutate: mutateStatusChange } = useMutation({
    mutationFn: changeOmniStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getSocialMediaChannelList'] });
    },
  });

  const { mutate: mutateDeleteChannel, isPending: isDeleting } = useMutation({
    mutationFn: deleteOmniChannel,
    onSuccess: () => {
      handleAlert({ text: 'Channel deleted successfully!', type: 'success' });
      setIsDeleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['getSocialMediaChannelList'] });
    },
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.message || 'Failed to delete channel',
        type: 'error',
      });
    },
  });
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFacebookModalOpen(true);
          }
        }}
        className="w-full bg-white rounded-xl p-4 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] hover:decoration flex flex-col gap-4 text-left "
      >
        <div className="w-full flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-3 items-center text-sm">
              <div className="w-9 h-9 flex items-center justify-center p-2 rounded-full bg-ucass-active-bg text-ucass-active">
                <FacebookIcon className="w-8 h-8" />
              </div>
              <h6 className={`font-medium`}>Facebook Comments & Messenger</h6>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Connect your Facebook Business account and set up Messenger for your page.
          </p>

          {isLodingChannelList ? (
            <div className="p-3">
              <Loader variant="blue" />
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${isFacebookConnected ? 'bg-green-50' : 'bg-yellow-50'}`}
            >
              <div className={isFacebookConnected ? 'text-green-600' : 'text-yellow-600'}>
                {isFacebookConnected ? (
                  <CircleCheckIcon className="w-5 h-5" />
                ) : (
                  <Warning className="w-4 h-4" />
                )}
              </div>

              <p
                className={`font-medium text-sm leading-relaxed ${
                  isFacebookConnected ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                {isFacebookConnected ? 'Facebook is connected' : 'Setup required'}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {!isFacebookConnected ? (
              <div
                className="flex gap-1 items-center text-primary text-sm cursor-pointer"
                onClick={() => setIsFacebookModalOpen(true)}
              >
                <ConnectIcon className="w-5 h-5" />
                <h6 className={`font-medium`}>Connect Account </h6>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <div
                  className="flex gap-1 items-center text-primary text-sm cursor-pointer"
                  onClick={handleConnect}
                >
                  <SettingsLine className="w-5 h-5" />
                  <h6 className={`font-medium`}>Manage Settings </h6>
                </div>
                <div
                  className="flex gap-1 items-center text-red-500 hover:text-red-600 text-sm cursor-pointer"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  <h6 className={`font-medium`}>Delete</h6>
                </div>
              </div>
            )}

            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <p className="text-gray-500 text-sm">Active</p>
              <Switch
                disabled={!isFacebookConnected}
                checked={facebookData?.status === 1}
                onCheckedChange={(checked) => {
                  if (facebookData?.uuid) {
                    mutateStatusChange({
                      uuid: facebookData.uuid,
                      status: checked ? 1 : 0,
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isFacebookModalOpen} onOpenChange={setIsFacebookModalOpen}>
        <DialogContent className="w-[520px] max-w-[95vw] p-0 overflow-hidden border-gray-200">
          <div className="p-6 flex flex-col gap-5">
            <DialogHeader className="gap-2 text-left">
              <DialogTitle>Facebook Setup</DialogTitle>
              <DialogDescription>
                Connect your Facebook Business account and set up Messenger for your page.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-start gap-5">
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect Facebook Page'}
              </Button>
              <div className="flex flex-col gap-2">
                <p>To connect your Facebook page you must be the admin of the page.</p>
                <p>
                  Need Help?{' '}
                  <a
                    href="javascript:void(0)"
                    className="text-primary hover:text-primary/80 font-semibold"
                  >
                    Watch Tutorial
                  </a>{' '}
                  or{' '}
                  <a
                    href="javascript:void(0)"
                    className="text-primary hover:text-primary/80 font-semibold"
                  >
                    Chat with us
                  </a>
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="w-[400px] max-w-[95vw] p-6 border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold">Delete Channel</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to delete this channel? This action cannot be undone and will
              disconnect your integration.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (facebookData?.uuid) {
                    mutateDeleteChannel({ uuid: facebookData.uuid });
                  }
                }}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacebookChannel;
