import { ConnectIcon, SettingsLine, Warning, WhatsappLineIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import MetaLogo from '@/assets/images/MetaLogo.png';
import { useState } from 'react';
import { connectMetaChannel, handleAlert } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSocialMediaChannelList, changeOmniStatus, deleteOmniChannel } from '@/services/api';
import Loader from '@/components/custom/loader';
import { CircleCheckIcon, Trash2 } from 'lucide-react';

import { useUser } from '@/hooks/use-user';

const WhatsappChannel = () => {
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
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

  const whatsappData =
    channelList &&
    channelList?.find((item: { name: string; type: string }) => item?.type === 'whatsapp');

  const isWhatsappConnected = !!whatsappData;

  const handleConnect = () => {
    connectMetaChannel('whatsapp', setLoading, user?.company_info?.uuid);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsWhatsappModalOpen(true);
          }
        }}
        className="w-full bg-white rounded-xl p-4 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] hover:decoration flex flex-col gap-4 text-left "
      >
        <div className={`w-full flex flex-col gap-4 `}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-3 items-center text-sm">
              <div className="w-9 h-9 flex items-center justify-center p-2 rounded-full bg-green-100 text-green-600">
                <WhatsappLineIcon className="w-8 h-8" />
              </div>
              <h6 className={`font-medium`}>WhatsApp</h6>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Create a WhatsApp Business Account with 360 dialog or Twilio and connect it.
          </p>

          {isLodingChannelList ? (
            <div className="p-3">
              <Loader variant="blue" />
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${isWhatsappConnected ? 'bg-green-50' : 'bg-yellow-50'}`}
            >
              <div className={isWhatsappConnected ? 'text-green-600' : 'text-yellow-600'}>
                {isWhatsappConnected ? (
                  <CircleCheckIcon className="w-5 h-5" />
                ) : (
                  <Warning className="w-4 h-4" />
                )}
              </div>

              <p
                className={`font-medium text-sm leading-relaxed ${
                  isWhatsappConnected ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                {isWhatsappConnected ? 'WhatsApp is connected' : 'Setup required'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {!isWhatsappConnected ? (
              <div
                className="flex gap-1 items-center text-primary text-sm cursor-pointer"
                onClick={() => setIsWhatsappModalOpen(true)}
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
                disabled={!isWhatsappConnected}
                checked={whatsappData?.status === 1}
                onCheckedChange={(checked) => {
                  if (whatsappData?.uuid) {
                    mutateStatusChange({
                      uuid: whatsappData.uuid,
                      status: checked ? 1 : 0,
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isWhatsappModalOpen} onOpenChange={setIsWhatsappModalOpen}>
        <DialogContent className="w-[720px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-0 border-gray-200">
          <div className="p-6 flex flex-col gap-5">
            <DialogHeader className="gap-2 text-left">
              <DialogTitle>WhatsApp Setup</DialogTitle>
              <DialogDescription>
                Create a WhatsApp Business Account with 360 dialog or Twilio and connect it.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-start gap-5">
              <div className="flex items-center justify-between gap-8 w-full">
                <div className="flex flex-col gap-1 pt-4">
                  <h6 className={`font-medium`}>Connect WhatsApp Business account</h6>
                  <p className="text-grey-600 font-medium text-sm leading-relaxed">
                    This integration allows your team to chat with customers over WhatsApp
                  </p>
                </div>

                <Button onClick={handleConnect} disabled={loading}>
                  {loading ? 'Adding...' : 'Add whatsapp account'}
                </Button>
              </div>
              <div className="flex flex-col gap-1 border-t border-grey-300 mt-1.5 pt-4 w-full">
                <h6 className={`font-semibold`}>Integration Guideline</h6>
                <div className="bg-grey flex flex-col gap-3 justify-center p-3 pt-0">
                  <div className="flex items-center gap-3">
                    <img src={MetaLogo} alt="Meta logo" width={'30px'} />
                    <div className="flex flex-col p-3 gap-2">
                      <p>Having trouble Integrating WhatsApp Account?</p>
                      <a href="javascript:void(0)" className="text-primary hover:text-primary/80">
                        <p>How to set up a WhatsApp?</p>
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col px-14 gap-5">
                    <div className="flex flex-col gap-2">
                      <p>
                        Ensure that you have the admin access to the Facebook Business Manager
                        account.
                      </p>
                      <ul className="list-disc text-primary gap-2 flex flex-col">
                        <li>
                          <a
                            href="https://www.facebook.com/business/help/2169003770027706?id=2190812977867143"
                            target="_blank"
                            className="inline-flex text-sm"
                          >
                            <p className="underline underline-offset-2">Go to admin access</p>
                          </a>
                        </li>
                        <li>
                          <a
                            href="https://en-gb.facebook.com/business/help/1710077379203657?id=180505742745347"
                            target="_blank"
                            className="inline-flex text-sm"
                          >
                            <p className="underline underline-offset-2">
                              Facebook business manager account
                            </p>
                          </a>
                        </li>
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2 pb-3">
                      <p>
                        You'll require a active phone number that can be authenticated through
                        either OTP or a phone call.
                      </p>
                      <ul className="list-disc text-primary">
                        <li>
                          <a
                            href="https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers"
                            target="_blank"
                            className="inline-flex text-sm"
                          >
                            <p className="underline underline-offset-2">Phone number</p>
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
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
                  if (whatsappData?.uuid) {
                    mutateDeleteChannel({ uuid: whatsappData.uuid });
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

export default WhatsappChannel;
