import CustomAvatar from '@/components/custom/custom-avatar';
import { isExtensionDialTarget, normalizeDialTargetUserPart } from '@/lib/extension-utility';
import { cn } from '@/lib/utils';

type ConferenceMember = {
  name?: string;
  number?: string;
  extension?: string;
  profile?: string;
  avatar?: string;
  joined?: string | null;
  left?: string | null;
};

type DialpadConferenceMembersPreviewProps = {
  members?: ConferenceMember[];
  onClick?: () => void;
  className?: string;
  maxVisible?: number;
};

const getMemberDisplayName = (member: ConferenceMember) =>
  `${member?.name || member?.extension || member?.number || ''}`.trim() || 'Unknown Member';

const getMemberDialTarget = (member: ConferenceMember) =>
  String(member?.extension || member?.number || '').trim();

const DialpadConferenceMembersPreview = ({
  members = [],
  onClick,
  className,
  maxVisible = 3,
}: DialpadConferenceMembersPreviewProps) => {
  const activeMembers = members.filter((member) => !member?.left);
  const membersToShow = activeMembers.length > 0 ? activeMembers : members;
  const visibleMembers = membersToShow.slice(0, maxVisible);
  const remainingCount = Math.max(membersToShow.length - visibleMembers.length, 0);

  const content = (
    <>
      <div className="flex items-center -space-x-1.5">
        {visibleMembers.map((member, index) => {
          const memberDialTarget = getMemberDialTarget(member);
          const normalizedPresenceTarget = normalizeDialTargetUserPart(memberDialTarget);
          const shouldShowPresence =
            Boolean(normalizedPresenceTarget) && isExtensionDialTarget(normalizedPresenceTarget);

          return (
            <CustomAvatar
              key={`${member?.number || member?.extension || member?.name || 'member'}-${index}`}
              name={getMemberDisplayName(member)}
              image={String(member?.profile || member?.avatar || '').trim()}
              size="18"
              showPresence={false}
              extension={shouldShowPresence ? normalizedPresenceTarget : ''}
              isActivityInfo={false}
              textClass="text-[8px]"
            />
          );
        })}
        {remainingCount > 0 ? (
          <span
            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-[#dce7fa] px-1 text-[8px] font-semibold text-[#2457b4]"
            title={`${remainingCount} more`}
          >
            +{remainingCount}
          </span>
        ) : null}
      </div>
      {membersToShow.length > 0 ? (
        <span className="text-[9px] font-semibold text-[#5a7396]">
          {membersToShow.length} Members
        </span>
      ) : (
        <span className="text-[9px] font-semibold text-[#879ab6]">No Members</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex min-h-[22px] items-center gap-1.5 rounded-full border border-[#d8e4f7] bg-[#f4f8ff] px-2 py-1 hover:bg-[#ebf2ff]',
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn('inline-flex min-h-[22px] items-center gap-1.5 rounded-full', className)}>
      {content}
    </div>
  );
};

export default DialpadConferenceMembersPreview;
