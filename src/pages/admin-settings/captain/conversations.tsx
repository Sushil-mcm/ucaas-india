import { useNavigate, useParams } from 'react-router-dom';
import ConversationsView from './conversations-view';

const Conversations = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  return (
    <ConversationsView
      scope="all"
      activeConversationId={conversationId || null}
      onOpenConversation={(id) => navigate(`/admin-settings/captain/conversations/${id}`)}
    />
  );
};

export default Conversations;
