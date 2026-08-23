import { useUsersDirectory } from '@/hooks/use-users-directory';
import CustomAvatar from './custom-avatar';

const GroupedAvatar = ({
  visibleAvatar = 2,
  userArray = [],
  onOtherClick = () => null,
}: {
  visibleAvatar?: number;
  userArray: any[];
  onOtherClick?: () => void;
}) => {
  const visibleUsers = (Array.isArray(userArray) ? userArray : []).slice(0, visibleAvatar);
  const remainingCount = Math.max(
    0,
    (Array.isArray(userArray) ? userArray.length : 0) - visibleUsers.length,
  );
  const { getUserProfileByUuid } = useUsersDirectory();
  return (
    <div className="flex -space-x-2 text-xs" onClick={onOtherClick}>
      {visibleUsers.map((user, index) => (
        <CustomAvatar
          key={user?.uuid || `avatar-${index}`}
          name={user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
          extension={user?.extension}
          size="32"
          showPresence={false}
          grouped={true}
          image={user?.profile || user?.avatar || getUserProfileByUuid(user?.uuid) || ''}
        />
      ))}
      {remainingCount > 0 && (
        <div
          style={{
            minWidth: '32px',
            backgroundColor: '#E0E0E0',
          }}
          className="rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold text-gray-700 cursor-pointer w-8 h-8 z-10"
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default GroupedAvatar;
