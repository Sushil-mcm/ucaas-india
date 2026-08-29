import { forwardRef } from 'react';
import FacebookContent from './facebook-content';
import InstagramContent from './instagramContent';
import TelegramContent from './telegram-content';
import WhatsappContent from './whatsapp-content';
import WebsiteContent from './website-content';
import CaptainContent from './captain-content';
import AllChannelsContent from './all-channels-content';
import NotFound from '@/assets/images/not-found-img.svg';
import { useCompanyFeatures } from '@/hooks/rbac';
import { canUseOmniChannel } from '../omni-permissions';

const Content = forwardRef<
  any,
  {
    selectedChat?: any;
    chatType?: '' | 'whatsapp' | 'instagram' | 'facebook' | 'messenger' | 'telegram' | 'chat' | 'website' | 'captain' | 'all_channels';
    selectedChannelType?: any;
    onBackToList?: () => void;
  }
>(function Content({ selectedChat, chatType = '', selectedChannelType, onBackToList }) {
  const { features } = useCompanyFeatures();
  const omniAccess = features?.plan_features?.omni_channel || {};
  const canViewInstagram = canUseOmniChannel(omniAccess, 'instagram');
  const canViewTelegram = canUseOmniChannel(omniAccess, 'telegram');
  const canViewFacebook =
    canUseOmniChannel(omniAccess, 'facebook') || canUseOmniChannel(omniAccess, 'messenger');
  const canViewWhatsapp = canUseOmniChannel(omniAccess, 'whatsapp');

  return (
    <>
      {chatType === 'instagram' && canViewInstagram && selectedChat && (
        <InstagramContent
          selectedChat={selectedChat}
          selectedChannelType={selectedChannelType}
          onBackToList={onBackToList}
        />
      )}
      {chatType === 'telegram' && canViewTelegram && selectedChat && (
        <TelegramContent
          selectedChat={selectedChat}
          selectedChannelType={selectedChannelType}
          onBackToList={onBackToList}
        />
      )}
      {(chatType === 'facebook' || chatType === 'messenger') && canViewFacebook && selectedChat && (
        <FacebookContent
          selectedChat={selectedChat}
          selectedChannelType={selectedChannelType}
          onBackToList={onBackToList}
        />
      )}
      {chatType === 'whatsapp' && canViewWhatsapp && selectedChat && (
        <WhatsappContent
          selectedChat={selectedChat}
          selectedChannelType={selectedChannelType}
          onBackToList={onBackToList}
        />
      )}
      {chatType === 'website' && selectedChat && (
        <WebsiteContent selectedChat={selectedChat} onBackToList={onBackToList} />
      )}
      {chatType === 'captain' && selectedChat && (
        <CaptainContent selectedChat={selectedChat} onBackToList={onBackToList} />
      )}
      {chatType === 'all_channels' && selectedChat && (
        <AllChannelsContent selectedChat={selectedChat} onBackToList={onBackToList} />
      )}
      {!selectedChat && (
        <div className="w-full bg-white p-3 flex items-center justify-center h-full">
          <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full mx-auto">
            <img src={NotFound} alt="BusyImage" className="min-w-36 w-36" />
            <p className="text-md font-medium text-gray-900"> No conversations yet</p>
            <p className="text-md  text-gray-700">Please add a user first to begin chatting.</p>
          </div>
        </div>
      )}
    </>
  );
});

export default Content;
