import { ConnectIcon, InstagramLineIcon, SettingsLine, Warning } from '@/assets/icons';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSocialMediaChannelList, changeOmniStatus, deleteOmniChannel } from '@/services/api';
import Loader from '@/components/custom/loader';
import { CircleCheckIcon, Trash2 } from 'lucide-react';

import { useUser } from '@/hooks/use-user';

const InstagramChannel = () => {
  const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: channelList = [], isLoading: isLodingChannelList } = useQuery({
    queryKey: ['getSocialMediaChannelList'],
    queryFn: () => getSocialMediaChannelList(),
    select: (data) => data?.data?.data?.result || [],
  });

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

  const instagramData =
    channelList &&
    channelList?.find((item: { name: string; type: string }) => item?.type === 'instagram');

  const isInstagramConnected = !!instagramData;

  const handleConnect = () => {
    connectMetaChannel('instagram', setLoading, user?.company_info?.uuid);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsInstagramModalOpen(true);
          }
        }}
        className="w-full bg-white rounded-xl p-4 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] hover:decoration flex flex-col gap-4 text-left "
      >
        <div className={`w-full flex flex-col gap-4`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-3 items-center text-sm">
              <div className="w-9 h-9 flex items-center justify-center p-2 rounded-full bg-pink-100 text-pink-800">
                <InstagramLineIcon className="w-8 h-8" />
              </div>
              <h6 className={`font-medium`}>Instagram</h6>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Connect your Instagram Business account and set up chat on your page.
          </p>

          {isLodingChannelList ? (
            <div className="p-3">
              <Loader variant="blue" />
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${isInstagramConnected ? 'bg-green-50' : 'bg-yellow-50'}`}
            >
              <div className={isInstagramConnected ? 'text-green-600' : 'text-yellow-600'}>
                {isInstagramConnected ? (
                  <CircleCheckIcon className="w-5 h-5" />
                ) : (
                  <Warning className="w-4 h-4" />
                )}
              </div>

              <p
                className={`font-medium text-sm leading-relaxed ${
                  isInstagramConnected ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                {isInstagramConnected ? 'Instagram is connected' : 'Setup required'}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {!isInstagramConnected ? (
              <div
                className="flex gap-1 items-center text-primary text-sm cursor-pointer"
                onClick={() => setIsInstagramModalOpen(true)}
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
                disabled={!isInstagramConnected}
                checked={instagramData?.status === 1}
                onCheckedChange={(checked) => {
                  if (instagramData?.uuid) {
                    mutateStatusChange({
                      uuid: instagramData.uuid,
                      status: checked ? 1 : 0,
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isInstagramModalOpen} onOpenChange={setIsInstagramModalOpen}>
        <DialogContent className="w-[680px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-0 border-gray-200">
          <div className="p-6 flex flex-col gap-5">
            <DialogHeader className="gap-2 text-left">
              <DialogTitle>Instagram Setup</DialogTitle>
              <DialogDescription>
                Connect your Instagram Business account and set up chat on your page.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-start gap-5">
              <div className="flex flex-col gap-1">
                <h6 className={`font-medium`}>Connect Instagram Pages</h6>
                <p className="text-grey-600 font-medium text-sm leading-relaxed">
                  Connect your Instagram Business account with UCAAS Chat to exchange messages and
                  receive reactions to your Stories. Facebook Messenger is included so you can
                  communicate with your Facebook followers as well.
                </p>
              </div>

              <Button onClick={handleConnect} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect Instagram'}
              </Button>

              <div className="flex flex-col gap-3 border-t border-grey-300 mt-1.5 pt-3 w-full">
                <h6 className={`font-medium`}>Integration Guideline</h6>
                <div className="flex bg-grey flex-col p-3 gap-2">
                  <p>Change your Instagram account from Creator to Business</p>
                  <a href="javascript:void(0)" className="text-primary hover:text-primary/80">
                    <p>How to set up a business account.</p>
                  </a>
                </div>
                <div className="flex bg-grey flex-col p-3 gap-2">
                  <p>Link your Instagram business account to a Facebook fan page.</p>
                  <a href="javascript:void(0)" className="text-primary hover:text-primary/80">
                    <p>How to link to a Facebook fan page.</p>
                  </a>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p>
                  Still Need Help?{' '}
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
                  if (instagramData?.uuid) {
                    mutateDeleteChannel({ uuid: instagramData.uuid });
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

export default InstagramChannel;
