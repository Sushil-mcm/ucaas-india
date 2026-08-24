/* eslint-disable no-constant-condition */
import { InfoIcon } from '@/assets/icons';
import { useCompanyFeatures } from '@/hooks/rbac';
import TelegramChannel from './telegram-channel';
import WhatsappChannel from './whatsapp-channel';
import InstagramChannel from './instagram-channel';
import FacebookChannel from './facebook-channel';
const SocialMediaChannels = () => {
  const { features } = useCompanyFeatures();
  const ominiChannelAccess = features?.plan_features?.omni_channel?.access || {};
  return (
    <section className="w-full flex flex-col bg-gray-200/15">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <div>
          <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
            Social Media Channels
          </p>
          <p className="text-gray-500 text-xs">
            The WhatsApp, Instagram, Facebook and Telegram accounts connected to this workspace.
          </p>
        </div>
        {/* <div className="flex gap-2">
          <Button type="button" variant={'outline'}>
            <Plus className="w-3 h-3" />
            Add Channel
          </Button>
          <Button type="button" className="bg-white" variant={'secondary'}>
            <Refresh className="w-4 h-4" />
            Refresh
          </Button>
        </div> */}
      </div>
      <div className="w-full p-3 flex flex-col gap-3 overflow-y-auto">
        <div className="flex sm:items-center gap-2 bg-white rounded-lg p-3 shadow-[1px_1px_2px_rgba(0,0,0,0.05)]">
          <div className="w-9 h-9 flex items-center justify-center p-2 rounded-full bg-indigo-50 text-indigo-500">
            <InfoIcon />
          </div>
          <p className="text-gray-700 font-medium text-sm">
            Connect your business accounts to engage with customers across multiple platforms.
            Manage all your conversations in one place. Chat with social media users in UCAAS Chat!
            Make sure no fans or customers are lost.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ominiChannelAccess?.FACEBOOK ? <FacebookChannel /> : null}
          {ominiChannelAccess?.INSTAGRAM ? <InstagramChannel /> : null}
          {ominiChannelAccess?.WHATSAPP ? <WhatsappChannel /> : null}
          {/* {ominiChannelAccess?.TELEGRAM ? ( */}
          {true ? <TelegramChannel /> : null}
        </div>
      </div>
    </section>
  );
};

export default SocialMediaChannels;
