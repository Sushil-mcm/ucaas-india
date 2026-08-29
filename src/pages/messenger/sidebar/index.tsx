import { FilterIcon, UserLine, UsersGroupLine } from '@/assets/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import FBChats from './fb-chats';
import InstaChats from './insta-chats';
import WhatsappChats from './whatsapp-chats';
import { useEffect, useMemo, useState } from 'react';
import CreateDirectChat from '../drawers/create-direct-chat';
import CreateTeamChat from '../drawers/create-team-chat';
import SideDrawer from '@/components/custom/side-drawer';
import SendWhatsappMessage from '../drawers/send-whatsapp-message';
import PageSidebarLayout from '@/layout/page-sidebar-layout';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useQuery } from '@tanstack/react-query';
import { allOmniChannelsList } from '@/services/api';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import TelegramChats from './telegram-chats';
import WebsiteChats from './website-chats';
import CaptainChats from './captain-chats';
import AllChannelsChats from './all-channels-chats';
import { Plus, Copy } from 'lucide-react';
import { CHANNELS_ICON, ChatChannels } from '../constants';
import { canUseOmniChannel, getAllowedOmniChannels } from '../omni-permissions';
type ChannelType = keyof typeof CHANNELS_ICON;

const Sidebar = ({
  handleChatType = () => null,
  chatType = '',
  setSelectedChat,
  selectedChat,
  setselectedChannelType,
  selectedChannelType,
  isCompactLayout = false,
}: {
  handleChatType: any;
  setSelectedChat: any;
  chatType: '' | 'whatsapp' | 'instagram' | 'facebook' | 'messenger' | 'telegram' | 'chat' | 'website' | 'captain' | 'all_channels';
  selectedChat?: any;
  setselectedChannelType?: any;
  selectedChannelType?: any;
  isCompactLayout?: boolean;
}) => {
  console.log(selectedChannelType, 'selectedChannelType');

  const [showCreateChatModal, setShowCreateChatModal] = useState('');
  const { features } = useCompanyFeatures();
  const chatAccess = features?.plan_features?.chat || {};
  const omniAccess = features?.plan_features?.omni_channel || {};
  const canViewWhatsapp = canUseOmniChannel(omniAccess, 'whatsapp');
  const canViewFacebook =
    canUseOmniChannel(omniAccess, 'facebook') || canUseOmniChannel(omniAccess, 'messenger');
  const canViewInstagram = canUseOmniChannel(omniAccess, 'instagram');
  const canViewTelegram = canUseOmniChannel(omniAccess, 'telegram');
  function handleAddButtonClick() {
    if (chatType === 'whatsapp') {
      setShowCreateChatModal('whatsapp');
    }
  }

  const { data: omniChannels } = useQuery({
    queryKey: ['allOmniChannelsList'],
    queryFn: () => allOmniChannelsList(),
    select: (data: any) => data?.data?.data?.rows,
  });
  const allowedOmniChannels = useMemo(
    () => getAllowedOmniChannels(omniAccess, omniChannels || []),
    [omniAccess, omniChannels],
  );

  useEffect(() => {
    if (!selectedChannelType && allowedOmniChannels?.length > 0 && chatType) {
      const matched = allowedOmniChannels.find((item: any) => item.type === chatType);
      if (matched) {
        setselectedChannelType(matched);
      }
    }
  }, [selectedChannelType, allowedOmniChannels, chatType, setselectedChannelType]);

  const selectedChannelUsername =
    selectedChannelType?.username ||
    selectedChannelType?.phone ||
    selectedChannelType?.number ||
    '';

  return (
    <PageSidebarLayout
      headerCustomClass={
        ['whatsapp', 'instagram', 'facebook', 'messenger', 'telegram'].includes(chatType)
          ? 'w-[calc(100%-90px)]'
          : ''
      }
      title={
        ['whatsapp', 'instagram', 'facebook', 'messenger', 'telegram'].includes(chatType) ? (
          <div className="flex flex-col gap-1">
            <p className="text-gray-900 font-semibold text-lg leading-5 capitalize">
              {selectedChannelType?.name || ''}
            </p>
            {chatType === 'facebook' || chatType === 'messenger' ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-primary font-medium text-xs hover:underline cursor-pointer"
                  onClick={() => {
                    if (selectedChannelUsername) {
                      window.open(selectedChannelUsername, '_blank');
                    }
                  }}
                >
                  Click here
                </span>
                <span className="text-gray-300 text-xs">|</span>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!selectedChannelUsername) return;
                    try {
                      await navigator.clipboard.writeText(selectedChannelUsername);
                      handleAlert({ text: 'Link copied successfully!', type: 'success' });
                    } catch (err) {
                      console.error('Failed to copy link: ', err);
                    }
                  }}
                  className="text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                  title="Copy Link"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-normal">Copy Link</span>
                </button>
              </div>
            ) : (
              <p
                className="text-primary font-normal text-xs truncate cursor-pointer max-w-52"
                onClick={() => {
                  if (['whatsapp', 'instagram', 'telegram'].includes(chatType)) return;
                  if (!selectedChannelUsername) return;
                  window.open(selectedChannelUsername, '_blank');
                }}
              >
                {`${
                  chatType === 'instagram'
                    ? 'ID:'
                    : chatType === 'telegram'
                      ? 'Username:'
                      : 'Ph No.'
                } ${selectedChannelUsername}`}
              </p>
            )}
          </div>
        ) : (
          selectedChannelType?.label || selectedChannelType?.name || 'Chats'
        )
      }
      icon={CHANNELS_ICON[chatType as ChannelType]}
      action={
        <div className="flex relative items-center gap-2">
          {(chatAccess?.access?.DIRECT_MESSAGE || chatAccess?.access?.TEAM_MESSAGE) &&
          !['instagram', 'facebook', 'messenger', 'telegram'].includes(chatType) ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                {
                  <div
                    className={
                      'cursor-pointer flex items-center justify-center rounded-full w-10 h-10 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white'
                    }
                    onClick={handleAddButtonClick}
                  >
                    <Plus width={18} height={18} />
                  </div>
                }
              </DropdownMenuTrigger>
              {chatType === 'chat' && (
                <DropdownMenuContent>
                  {chatAccess?.access?.DIRECT_MESSAGE && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        setShowCreateChatModal('direct');
                      }}
                    >
                      <UserLine className="text-gray-900 w-8 h-8" /> Direct Message
                    </DropdownMenuItem>
                  )}
                  {chatAccess?.access?.TEAM_MESSAGE && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        setShowCreateChatModal('team');
                      }}
                    >
                      <UsersGroupLine className="text-gray-900 w-8 h-8" />
                      Create New Team
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="cursor-pointer flex items-center justify-center rounded-full w-10 h-10 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white">
                <FilterIcon className="w-6 h-6" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ChatChannels?.map((item: any, index: number) => {
                return (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => {
                      handleChatType(item.value);
                      setselectedChannelType(item);
                    }}
                  >
                    {item.icon()} {item.label}
                  </DropdownMenuItem>
                );
              })}
              {allowedOmniChannels && allowedOmniChannels?.length
                ? allowedOmniChannels.map((item: any, index: number) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => {
                        handleChatType(item.type);
                        setselectedChannelType(item);
                      }}
                    >
                      {CHANNELS_ICON[item?.type as ChannelType]} {capitalizeFirstLetter(item.type)}
                    </DropdownMenuItem>
                  ))
                : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
      content={
        <section className="w-full h-full min-h-0">
          <div className="flex flex-col h-full min-h-0">
            {chatType === 'whatsapp' && canViewWhatsapp && (
              <WhatsappChats
                setSelectedChat={setSelectedChat}
                selectedChat={selectedChat}
                selectedChannelType={selectedChannelType}
                isCompactLayout={isCompactLayout}
              />
            )}
            {(chatType === 'facebook' || chatType === 'messenger') && canViewFacebook && (
              <FBChats
                setSelectedChat={setSelectedChat}
                selectedChat={selectedChat}
                selectedChannelType={selectedChannelType}
                isCompactLayout={isCompactLayout}
              />
            )}
            {chatType === 'telegram' && canViewTelegram && (
              <TelegramChats
                setSelectedChat={setSelectedChat}
                selectedChat={selectedChat}
                selectedChannelType={selectedChannelType}
                isCompactLayout={isCompactLayout}
              />
            )}
            {chatType === 'instagram' && canViewInstagram && (
              <InstaChats
                setSelectedChat={setSelectedChat}
                selectedChat={selectedChat}
                selectedChannelType={selectedChannelType}
                isCompactLayout={isCompactLayout}
              />
            )}
            {chatType === 'website' && (
              <WebsiteChats setSelectedChat={setSelectedChat} selectedChat={selectedChat} isCompactLayout={isCompactLayout} />
            )}
            {chatType === 'captain' && (
              <CaptainChats setSelectedChat={setSelectedChat} selectedChat={selectedChat} isCompactLayout={isCompactLayout} />
            )}
            {chatType === 'all_channels' && (
              <AllChannelsChats setSelectedChat={setSelectedChat} selectedChat={selectedChat} isCompactLayout={isCompactLayout} />
            )}
          </div>
          {showCreateChatModal === 'direct' && (
            <SideDrawer
              width="45%"
              isHeader
              isOpen={showCreateChatModal === 'direct'}
              handleClose={() => setShowCreateChatModal('')}
              content={
                <CreateDirectChat
                  handleClose={() => {
                    setShowCreateChatModal('');
                  }}
                />
              }
            />
          )}
          {showCreateChatModal === 'team' && (
            <SideDrawer
              width="450px"
              isHeader
              isOpen={showCreateChatModal === 'team'}
              handleClose={() => setShowCreateChatModal('')}
              content={
                <CreateTeamChat
                  handleClose={() => {
                    setShowCreateChatModal('');
                  }}
                />
              }
            />
          )}
          {showCreateChatModal === 'whatsapp' && (
            <SideDrawer
              width="45%"
              title="Send WhatsApp Message"
              isOpen={showCreateChatModal === 'whatsapp'}
              handleClose={() => setShowCreateChatModal('')}
              content={
                <SendWhatsappMessage
                  handleClose={() => {
                    setShowCreateChatModal('');
                  }}
                  selectedChannelType={selectedChannelType}
                />
              }
            />
          )}
        </section>
      }
    />
  );
};

export default Sidebar;
