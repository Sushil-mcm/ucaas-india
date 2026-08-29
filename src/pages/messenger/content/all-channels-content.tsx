import Chat from '@/pages/messenger/chat';
import CaptainContent from './captain-content';

// Routes to whichever real content renderer matches the selected row's
// origin — the actual internal Chat system for internal conversations, the
// Captain content view for website ones. No new chat UI invented here.
const AllChannelsContent = ({ selectedChat, onBackToList }: { selectedChat: any; onBackToList?: () => void }) => {
  if (!selectedChat) return null;

  if (selectedChat.__channelKind === 'captain') {
    return <CaptainContent selectedChat={selectedChat} onBackToList={onBackToList} />;
  }

  return <Chat chatId={selectedChat.chatId} onBackToList={onBackToList} />;
};

export default AllChannelsContent;
