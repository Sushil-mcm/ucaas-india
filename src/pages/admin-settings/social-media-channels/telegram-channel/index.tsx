import { ConnectIcon, SettingsLine, TelegramIcon, Warning } from '@/assets/icons';
import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import {
  getSocialMediaChannelList,
  integrateSocialMediaChannel,
  changeOmniStatus,
  deleteOmniChannel,
} from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { telegramChannelInitialValues, telegramChannelSchema } from '../constants';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { CircleCheckIcon, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/hooks/use-user';

const TelegramChannel = () => {
  const { user } = useUser();
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    defaultValues: telegramChannelInitialValues,
    resolver: yupResolver(telegramChannelSchema),
    mode: 'onChange',
  });
  const {
    data: channelList = [],
    isLoading: isLodingChannelList,
    refetch,
  } = useQuery({
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

  const { mutate: mutateIntegrateSocialMedia, isPending } = useMutation({
    mutationKey: ['integrateSocialMediaChannel'],
    mutationFn: integrateSocialMediaChannel,
    onSuccess: (data) => {
      handleAlert({
        text:
          data?.data?.message || `Bot ${isTelegramConnected ? 'updated' : 'added'} successfully!`,
        type: 'success',
      });
      setIsTelegramModalOpen(false);
      refetch();
    },
  });

  const { mutate: mutateDeleteChannel, isPending: isDeleting } = useMutation({
    mutationFn: deleteOmniChannel,
    onSuccess: () => {
      handleAlert({ text: 'Channel deleted successfully!', type: 'success' });
      setIsDeleteModalOpen(false);
      refetch();
    },
    onError: (error: any) => {
      handleAlert({
        text: error?.response?.data?.message || 'Failed to delete channel',
        type: 'error',
      });
    },
  });

  const onSubmit = (data: any) => {
    const { token = '', username = '' } = data || {};

    const email = user?.user_info?.email || user?.email || '';
    const domain = String(user?.sip_credentials?.domain || user?.user_info?.domain || '').trim();
    const fullName =
      `${user?.first_name || user?.user_info?.first_name || ''} ${user?.last_name || user?.user_info?.last_name || ''}`.trim() ||
      user?.name ||
      user?.user_info?.name ||
      '';
    const userUuid = user?.uuid || user?.user_info?.uuid || '';
    const extension = user?.extension || user?.user_info?.extension || '';
    const companyUuid = user?.company_info?.uuid || user?.company_uuid || '';

    const currentUserMember = {
      email,
      domain,
      fullName,
      userUuid,
      extension,
      companyUuid,
    };

    let existingMembers = [];
    if (telegramData?.channel_members) {
      if (Array.isArray(telegramData.channel_members)) {
        existingMembers = telegramData.channel_members;
      } else if (typeof telegramData.channel_members === 'string') {
        try {
          existingMembers = JSON.parse(telegramData.channel_members);
        } catch {
          existingMembers = [];
        }
      }
    }

    const userExists = existingMembers.some((m: any) => m?.userUuid === userUuid);
    const updatedMembers = userExists ? existingMembers : [...existingMembers, currentUserMember];

    const payload = {
      type: 'telegram',
      token,
      username,
      channel_members: updatedMembers,
    };
    mutateIntegrateSocialMedia(payload);
  };
  const telegramData =
    channelList &&
    channelList?.find(
      (item: { name: string; type: string }) =>
        item?.name === 'Telegram' && item?.type === 'telegram',
    );

  const isTelegramConnected = !!telegramData;

  const syncTelegramForm = () => {
    const { token = '', username = '' } = telegramData || {};
    reset({ token, username });
  };

  useEffect(() => {
    syncTelegramForm();
  }, [telegramData, reset]);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e: any) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsTelegramModalOpen(true);
          }
        }}
        className="w-full bg-white rounded-xl p-4 shadow-[1px_1px_2px_rgba(0,0,0,0.05)] hover:decoration flex flex-col gap-4 text-left "
      >
        <div className="w-full flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-3 items-center text-sm">
              <div className="w-9 h-9 flex items-center justify-center p-2 rounded-full bg-sky-100 text-sky-600">
                <TelegramIcon className="w-8 h-8" />
              </div>
              <h6 className="font-medium">Telegram</h6>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Connect your Telegram bot to enable automated messaging and manage conversations in real
            time.
          </p>

          {isLodingChannelList ? (
            <div className="p-3">
              <Loader variant="blue" />
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${isTelegramConnected ? 'bg-green-50' : 'bg-yellow-50'}`}
            >
              <div className={isTelegramConnected ? 'text-green-600' : 'text-yellow-600'}>
                {isTelegramConnected ? (
                  <CircleCheckIcon className="w-5 h-5" />
                ) : (
                  <Warning className="w-4 h-4" />
                )}
              </div>

              <p
                className={`font-medium text-sm leading-relaxed ${
                  isTelegramConnected ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                {isTelegramConnected ? 'Telegram is connected' : 'Setup required'}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {!isTelegramConnected ? (
              <div
                className="flex gap-1 items-center text-primary text-sm cursor-pointer"
                onClick={() => setIsTelegramModalOpen(true)}
              >
                <ConnectIcon className="w-5 h-5" />
                <h6 className={`font-medium`}>Connect Account </h6>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <div
                  className="flex gap-1 items-center text-primary text-sm cursor-pointer"
                  onClick={() => setIsTelegramModalOpen(true)}
                >
                  <SettingsLine className="w-5 h-5" />
                  <h6 className={`font-medium`}>Manage Settings </h6>
                </div>
                <div
                  className="flex gap-1 items-center text-red-500 hover:text-red-600 text-sm cursor-pointer"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    setIsDeleteModalOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <h6 className={`font-medium`}>Delete</h6>
                </div>
              </div>
            )}

            <div
              className="flex items-center gap-2"
              onClick={(e: any) => e.stopPropagation()}
              onDoubleClick={(e: any) => e.stopPropagation()}
            >
              <p className="text-gray-500 text-sm">Active</p>
              <Switch
                disabled={!isTelegramConnected}
                checked={telegramData?.status === 1}
                onCheckedChange={(checked) => {
                  if (telegramData?.uuid) {
                    mutateStatusChange({
                      uuid: telegramData.uuid,
                      status: checked ? 1 : 0,
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={isTelegramModalOpen}
        onOpenChange={(open) => {
          setIsTelegramModalOpen(open);
          if (!open) {
            syncTelegramForm();
          }
        }}
      >
        <DialogContent className="w-[520px] max-w-[95vw] p-0 overflow-hidden border-gray-200">
          <div className="p-6 flex flex-col gap-5">
            <DialogHeader className="gap-2 text-left">
              <DialogTitle>Telegram Setup</DialogTitle>
              <DialogDescription>
                Connect your Telegram bot to enable automated messaging and manage conversations in
                real time.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200"
            >
              <p className="text-base  font-semibold mb-3">Create a Telegram Bot</p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-1">
                  <Label className="mb-0">1.</Label>
                  <p className="text-sm">
                    Open Telegram → Search <span className="font-medium">@BotFather</span>
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <Controller
                    name="username"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="2. Enter Bot Username"
                        placeholder="Enter"
                        className="text-sm"
                        error={errors?.username?.message}
                      />
                    )}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Controller
                    name="token"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="3. Enter Bot token"
                        placeholder="Enter"
                        className="text-sm"
                        error={errors?.token?.message}
                      />
                    )}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={isPending || isLodingChannelList}>
                  {isPending && <Loader variant="blue" />}
                  {isTelegramConnected ? 'Update' : 'Save'}
                </Button>
              </div>
            </form>
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
                  if (telegramData?.uuid) {
                    mutateDeleteChannel({ uuid: telegramData.uuid });
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

export default TelegramChannel;
