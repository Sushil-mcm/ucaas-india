import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { Bot } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import CustomAvatar from '@/components/custom/custom-avatar';

const CAPTAIN_API_BASE = '/captain-api/api/captain';

type CaptainConversation = {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  page_url: string | null;
  status: 'open' | 'resolved';
  owner: 'ai' | 'human' | null;
  last_message: string | null;
  last_message_at: string | null;
  assistant_id: string;
  assistant_name: string;
};

const CaptainChats = ({
  setSelectedChat,
  selectedChat,
}: {
  setSelectedChat: (chat: any) => void;
  selectedChat?: any;
  isCompactLayout?: boolean;
}) => {
  const { user } = useUser();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['captainConversations', user?.uuid],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.uuid) params.set('agent_user_id', user.uuid);
      const res = await fetch(`${CAPTAIN_API_BASE}/messenger-conversations?${params.toString()}`);
      return res.json();
    },
    // Same lightweight polling approach as the native Website channel — no
    // dedicated realtime channel for Captain conversations yet.
    refetchInterval: 5000,
    select: (json: any) => (json?.data as CaptainConversation[]) ?? [],
  });

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-400">Loading…</div>;
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full text-center p-6">
        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-500">No Captain conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      {conversations.map((c) => {
        const isActive = selectedChat?.id === c.id;
        const label = c.visitor_name || c.visitor_email || 'Website visitor';
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedChat(c)}
            className={`flex items-center gap-3 p-3 text-left border-b border-gray-100 hover:bg-gray-50 ${
              isActive ? 'bg-indigo-50' : ''
            }`}
          >
            <CustomAvatar name={label} size="36" showPresence={false} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                <span className="text-[11px] text-gray-400 shrink-0">{moment(c.last_message_at).fromNow()}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    c.owner === 'human' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {c.owner === 'human' ? 'You' : 'AI'}
                </span>
                <span className="text-xs text-gray-400 truncate">{c.assistant_name}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default CaptainChats;
