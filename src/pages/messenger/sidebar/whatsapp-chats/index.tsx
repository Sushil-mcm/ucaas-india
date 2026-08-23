import CustomAvatar from '@/components/custom/custom-avatar';
import Loader from '@/components/custom/loader';
import { Input } from '@/components/ui/input';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { getOmniChats } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotFound from '@/assets/images/not-found-img.svg';
const WhatsappChats = ({
  setSelectedChat,
  selectedChat,
  selectedChannelType,
  isCompactLayout = false,
}: {
  setSelectedChat: any;
  selectedChat?: any;
  selectedChannelType: any;
  isCompactLayout?: boolean;
}) => {
  const [searchKey, setSearchKey] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { omniChannelData } = useSocketEvents();
  const chatID = location?.search?.split('&')?.[1]?.split('=')?.[1] || '';

  const {
    data: omniWhatsappData = [],
    isLoading,
    refetch: omniWhatsappRefetch,
  } = useQuery({
    queryKey: [`getOmniChats-whatsapp`, { did_number: selectedChannelType?.omni_number || '' }],
    queryFn: ({ queryKey }) => getOmniChats(queryKey[1]),
    select: (data) => data?.data?.data?.result || [],
  });
  const filteredChats =
    (omniWhatsappData &&
      omniWhatsappData?.filter(
        (item: any) =>
          (item?.toName || '').toLowerCase().includes(searchKey?.toLowerCase()) ||
          (item?.to || '').toLowerCase().includes(searchKey?.toLowerCase()),
      )) ||
    [];

  useEffect(() => {
    if (isLoading || !filteredChats?.length) return;

    const matchedChat = filteredChats.find((item: any) => item?.chatId === chatID);
    if (matchedChat) {
      if (selectedChat?.chatId !== matchedChat.chatId) {
        setSelectedChat(matchedChat);
      }
      return;
    }

    if (!selectedChat && !isCompactLayout) {
      setSelectedChat(filteredChats[0]);
      navigate(`${location.pathname}?chatType=whatsapp&chatId=${filteredChats[0]?.chatId}`, {
        replace: true,
      });
    }
  }, [
    chatID,
    filteredChats,
    isCompactLayout,
    isLoading,
    location.pathname,
    navigate,
    selectedChat?.chatId,
    setSelectedChat,
  ]);

  useEffect(() => {
    if (
      omniWhatsappData?.length > 0 &&
      omniChannelData?.omni_details &&
      omniChannelData?.omni_details?.channel_category === 'whatsapp'
    ) {
      omniWhatsappRefetch();
    }
  }, [omniChannelData, chatID]);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="p-2">
        <Input
          className="w-full hover:border-gray-300 focus:border-gray-300"
          placeholder="Search..."
          value={searchKey}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith(' ')) return;
            setSearchKey(e.target.value);
          }}
        />
      </div>
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-auto">
        <ul role="list" className="divide-y divide-gray-200 overflow-auto h-full">
          {isLoading ? (
            <div className="flex justify-center items-center mt-2">
              <Loader variant="blue" />
            </div>
          ) : filteredChats?.length > 0 ? (
            filteredChats?.map((item: any) => (
              // ${isActive ? 'bg-gray-100' : ''}
              <li
                className={`flex  hover:bg-gray cursor-pointer ${selectedChat?.chatId === item.chatId ? 'bg-gray-100' : ''} `}
                onClick={() => {
                  setSelectedChat(item);
                  navigate(`${location.pathname}?chatType=whatsapp&chatId=${item?.chatId}`);
                }}
              >
                <div className="flex items-center w-full px-3 h-16 gap-2">
                  <div className="relative">
                    <CustomAvatar name={item?.toName || 'Unknown Contact'} showPresence={false} />
                  </div>

                  <div
                    className={`flex flex-col justify-between text-sm w-[calc(100%_-_3rem)] gap-1`}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="flex items-center gap-1  w-[calc(100%_-_7rem)]">
                        <p className=" text-gray-900 truncate font-medium">
                          {item?.toName || item?.to || 'Unknown Contact'}
                        </p>
                      </div>

                      <p className="text-gray-800 text-end  whitespace-nowrap text-xs">
                        {item?.metaData?.timestamp
                          ? moment(item?.metaData?.timestamp).fromNow()
                          : ''}
                      </p>
                    </div>

                    <div className="flex justify-between gap-2">
                      <p className="text-gray-800 text-end  whitespace-nowrap text-xs truncate">
                        {(() => {
                          try {
                            const msg = item?.metaData?.lastMessage;
                            if (!msg) return '';

                            const text = Array.isArray(JSON.parse(msg))
                              ? JSON.parse(msg)
                                  .map((m: any) => m.text)
                                  .join(' ')
                              : msg;

                            const words = text.split(' ');
                            return words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
                          } catch {
                            return item?.metaData?.lastMessage || '';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex flex-col justify-center items-center gap-1 py-5 h-full w-full mx-auto">
                <img src={NotFound} alt="BusyImage" className="min-w-28 w-28" />
                <p className="text-md font-medium text-gray-900 text-sm">No conversations yet</p>
                <p className="text-md  text-gray-700 text-sm">
                  Please add a user first to begin chatting.
                </p>
              </div>
            </div>
          )}
        </ul>
      </div>
    </div>
  );
};

export default WhatsappChats;
