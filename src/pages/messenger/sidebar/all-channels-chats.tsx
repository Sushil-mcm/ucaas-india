import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { Globe } from 'lucide-react';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import CustomAvatar from '@/components/custom/custom-avatar';

const CAPTAIN_API_BASE = '/captain-api/api/captain';

// Best-effort preview text — internal chat messages are Slate documents,
// Captain messages are already plain strings.
function extractPreviewText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    try {
      return value
        .map((node: any) => (Array.isArray(node?.children) ? node.children.map((c: any) => c.text || '').join('') : ''))
        .join(' ')
        .trim();
    } catch {
      return '';
    }
  }
  if (typeof value === 'object' && typeof value.content === 'string') return value.content;
  return '';
}

type MergedRow = {
  key: string;
  kind: 'internal' | 'captain';
  name: string;
  preview: string;
  timestamp: number;
  raw: any;
};

const AllChannelsChats = ({
  setSelectedChat,
  selectedChat,
}: {
  setSelectedChat: (chat: any) => void;
  selectedChat?: any;
  isCompactLayout?: boolean;
}) => {
  const { user } = useUser();
  const { allChats = [] } = useSocketEvents();

  const { data: captainConversations = [] } = useQuery({
    queryKey: ['captainConversations', user?.uuid],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.uuid) params.set('agent_user_id', user.uuid);
      const res = await fetch(`${CAPTAIN_API_BASE}/messenger-conversations?${params.toString()}`);
      return res.json();
    },
    refetchInterval: 5000,
    select: (json: any) => json?.data ?? [],
  });

  const merged: MergedRow[] = useMemo(() => {
    const internalRows: MergedRow[] = (Array.isArray(allChats) ? allChats : [])
      .filter((chat: any) => !chat?.isDeleted)
      .map((chat: any) => {
        const otherUser = chat?.users?.find((u: any) => u?.uuid !== user?.uuid);
        const name = chat?.isGroupChat
          ? chat?.name || 'Group'
          : `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim() || 'Unknown';
        const ts = chat?.lastMessage?.createdAt
          ? new Date(chat.lastMessage.createdAt).getTime()
          : chat?.createdAt
            ? new Date(chat.createdAt).getTime()
            : 0;
        return {
          key: `internal-${chat.chatId}`,
          kind: 'internal',
          name,
          preview: extractPreviewText(chat?.lastMessage?.message) || 'Attachment',
          timestamp: ts,
          raw: chat,
        };
      });

    const captainRows: MergedRow[] = captainConversations.map((c: any) => ({
      key: `captain-${c.id}`,
      kind: 'captain',
      name: c.visitor_name || c.visitor_email || 'Website visitor',
      preview: c.last_message || '',
      timestamp: c.last_message_at ? new Date(c.last_message_at).getTime() : 0,
      raw: c,
    }));

    return [...internalRows, ...captainRows].sort((a, b) => b.timestamp - a.timestamp);
  }, [allChats, captainConversations, user?.uuid]);

  if (!merged.length) {
    return <div className="flex h-full items-center justify-center p-6 text-sm text-gray-400">No conversations yet</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {merged.map((row) => {
        const isActive =
          row.kind === 'internal' ? selectedChat?.chatId === row.raw.chatId : selectedChat?.id === row.raw.id;
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => setSelectedChat({ ...row.raw, __channelKind: row.kind })}
            className={`flex items-center gap-3 border-b border-gray-100 p-3 text-left hover:bg-gray-50 ${isActive ? 'bg-indigo-50' : ''}`}
          >
            <div className="relative shrink-0">
              <CustomAvatar name={row.name} size="36" showPresence={false} />
              {row.kind === 'captain' && (
                <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-white ring-2 ring-white">
                  <Globe className="size-2.5" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-gray-900">{row.name}</p>
                <span className="shrink-0 text-[11px] text-gray-400">{row.timestamp ? moment(row.timestamp).fromNow() : ''}</span>
              </div>
              <p className="truncate text-xs text-gray-500">{row.preview}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default AllChannelsChats;
