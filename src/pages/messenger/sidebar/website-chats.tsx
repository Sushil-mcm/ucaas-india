import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { GlobeIcon } from '@/assets/icons';
import { listConversations, type WebsiteConversation } from '@/services/agentic-api';

const WebsiteChats = ({
  setSelectedChat,
  selectedChat,
}: {
  setSelectedChat: (chat: any) => void;
  selectedChat?: any;
  isCompactLayout?: boolean;
}) => {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['websiteConversations'],
    queryFn: () => listConversations(),
    // Lightweight poll so a visitor's new message shows up without a
    // dedicated agent-side realtime channel — good enough for v1.
    refetchInterval: 5000,
    select: (res: any) => (res?.data?.data as WebsiteConversation[]) ?? [],
  });

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-400">Loading…</div>;
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full text-center p-6">
        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
          <GlobeIcon className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-500">No website conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      {conversations.map((c) => {
        const isActive = selectedChat?.id === c.id;
        const label = c.contactName || c.contactEmail || 'Website visitor';
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedChat(c)}
            className={`flex items-center gap-3 p-3 text-left border-b border-gray-100 hover:bg-gray-50 ${
              isActive ? 'bg-indigo-50' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-medium text-sm">
              {label.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                <span className="text-[11px] text-gray-400 shrink-0">{moment(c.lastMessageAt).fromNow()}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    c.aiPaused ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {c.aiPaused ? 'You' : 'AI'}
                </span>
                <span className="text-xs text-gray-400 truncate">{c.inboxName || 'Website'}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default WebsiteChats;
