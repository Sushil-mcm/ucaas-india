import { useNavigate, useParams } from 'react-router-dom';
import ConversationsView from './conversations-view';

const InboxConversations = () => {
  const { inboxId, conversationId } = useParams<{ inboxId: string; conversationId?: string }>();
  const navigate = useNavigate();

  if (!inboxId) return null;

  return (
    <ConversationsView
      scope="inbox"
      inboxId={inboxId}
      onBack={() => navigate('/admin-settings/captain/inboxes')}
      activeConversationId={conversationId || null}
      onOpenConversation={(id) => navigate(`/admin-settings/captain/inboxes/${inboxId}/conversations/${id}`)}
    />
  );
};

export default InboxConversations;
