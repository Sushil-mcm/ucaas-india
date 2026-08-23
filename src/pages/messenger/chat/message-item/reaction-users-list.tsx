import { useMemo } from 'react';
import { Users } from 'lucide-react';
import CustomAvatar from '@/components/custom/custom-avatar';
import { getRenderableReactionEmoji } from './helpers';

interface ReactionUsersListProps {
  emoji: string;
  reactions: Record<string, string[]>;
  currentChatUsers: any[];
  currentUserId?: string;
}

const ReactionUsersList = ({
  emoji,
  reactions,
  currentChatUsers,
  currentUserId,
}: ReactionUsersListProps) => {
  const renderableEmoji = useMemo(() => getRenderableReactionEmoji(emoji), [emoji]);

  const reactedUsers = useMemo(() => {
    try {
      if (!reactions || typeof reactions !== 'object') return [];
      if (!Array.isArray(currentChatUsers)) return [];

      const usersWhoReacted: any[] = [];
      Object.entries(reactions).forEach(([userId, emojis]) => {
        if (Array.isArray(emojis) && emojis.includes(emoji)) {
          const user = currentChatUsers.find((u: any) => u?.uuid === userId);
          if (user) {
            usersWhoReacted.push({
              uuid: user.uuid,
              name: user.name || 'Unknown User',
              extension: user.extension || '',
              profile: user.profile || '',
              isCurrentUser: userId === currentUserId,
            });
          }
        }
      });

      return usersWhoReacted.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return 0;
      });
    } catch (error) {
      console.error('Error getting users for emoji:', error);
      return [];
    }
  }, [reactions, currentChatUsers, emoji, currentUserId]);

  if (reactedUsers.length === 0) {
    return (
      <div className="w-64 py-6 text-center bg-white rounded-lg shadow-xl border">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-xs text-gray-400">No reactions found</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white rounded-lg shadow-xl border overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-amber-50/60 to-orange-50/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200">
              <span className="text-base">{renderableEmoji}</span>
            </div>
            <div className="text-xs font-semibold text-gray-700">Reacted by</div>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-xs font-semibold">
            {reactedUsers.length}
          </div>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {reactedUsers.map((user: any, index: number) => {
          const safeKey = user?.uuid || `user-${index}`;
          return (
            <div
              key={safeKey}
              className="group relative flex items-center gap-2.5 px-3 py-2.5 hover:bg-amber-50/30 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="relative flex-shrink-0 text-xs">
                <CustomAvatar
                  name={user?.name || 'Unknown User'}
                  showPresence={false}
                  extension={user?.extension || ''}
                  size="30"
                  image={user?.profile || ''}
                />
                <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-white border border-gray-200 shadow-sm">
                  <span className="text-[10px]">{renderableEmoji}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {user?.name || 'Unknown User'}
                  </span>
                  {user?.isCurrentUser ? (
                    <span className="text-[10px] font-medium text-ucass-active bg-ucass-active-bg px-1.5 py-0.5 rounded">
                      You
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReactionUsersList;
