import type { DialpadSession } from '@/context/dialpad-context';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import CustomAvatar from '@/components/custom/custom-avatar';
import { isExtensionDialTarget, normalizeDialTargetUserPart } from '@/lib/extension-utility';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ConferenceMember = {
  name?: string;
  fsServer?: string;
  username?: string;
  number?: string;
  extension?: string;
  uniqueId?: string;
  profile?: string;
  avatar?: string;
  joined?: string | number | null;
  joined_at?: string | number | null;
  joinedAt?: string | number | null;
  start_time?: string | number | null;
  left?: string | null;
  is_owner?: boolean;
};

type DialpadConferenceMembersListProps = {
  onBack: () => void;
  session: DialpadSession | null;
};

const getMemberDisplayName = (member: ConferenceMember) =>
  `${member?.name || member?.username || ''}`.trim() ||
  `${member?.number || member?.extension || ''}`.trim() ||
  'Unknown Member';

const getMemberDialTarget = (member: ConferenceMember) =>
  String(member?.extension || member?.number || '').trim();

const isMemberLoggedInUser = (
  member: ConferenceMember,
  loggedInUserTargets: Set<string>,
): boolean =>
  [member?.extension, member?.number, member?.username, member?.uniqueId]
    .map((value) => normalizeMemberIdentifierForMatch(value))
    .filter(Boolean)
    .some((target) => loggedInUserTargets.has(target));

const normalizeMemberIdentifierForMatch = (value: unknown): string => {
  const normalizedValue = normalizeDialTargetUserPart(value).toLowerCase();
  if (!normalizedValue) return '';
  if (/^\+?\d+$/.test(normalizedValue)) return normalizedValue.replace(/^\+/, '');
  return normalizedValue;
};

const parseTimestampMs = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    const parsedNumeric = Number(rawValue);
    if (!Number.isFinite(parsedNumeric)) return null;
    return parsedNumeric < 1_000_000_000_000 ? parsedNumeric * 1000 : parsedNumeric;
  }

  const parsedDateMs = Date.parse(rawValue);
  if (!Number.isFinite(parsedDateMs)) return null;
  return parsedDateMs;
};

const getMemberJoinedAtMs = (member: ConferenceMember): number | null =>
  parseTimestampMs(member?.joined ?? member?.joined_at ?? member?.joinedAt ?? member?.start_time);

const formatElapsed = (elapsedMs: number): string => {
  const safeSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const twoDigit = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${twoDigit(hours)}:${twoDigit(minutes)}:${twoDigit(seconds)}`
    : `${twoDigit(minutes)}:${twoDigit(seconds)}`;
};

const DialpadConferenceMembersList = ({ onBack, session }: DialpadConferenceMembersListProps) => {
  const { socketEventsManager } = useSocketEvents();
  const { user } = useUser();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const conferenceId = String(session?.conferenceData?.conference_id || '').trim();
  const loggedInUserTargets = useMemo(() => {
    return new Set(
      [
        user?.user_info?.extension,
        user?.sip_credentials?.extension,
        user?.extension,
        user?.user_info?.username,
        user?.sip_credentials?.username,
      ]
        .map((target) => normalizeMemberIdentifierForMatch(target))
        .filter(Boolean),
    );
  }, [
    user?.extension,
    user?.sip_credentials?.extension,
    user?.sip_credentials?.username,
    user?.user_info?.extension,
    user?.user_info?.username,
  ]);

  const handleConferenceMemberHangup = (member: ConferenceMember) => {
    console.log('[DialpadConferenceMembersList] Hangup member', member);
    socketEventsManager?.emit('remove-call-conf', {
      data: {
        confId: conferenceId,
        uniqueId: String(member?.uniqueId || '').trim(),
        fsServer: member?.fsServer,
        type: 'remove-call-conf',
      },
    });
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const conferenceData = session?.conferenceData;
  const members = (
    Array.isArray(conferenceData?.conference_members) ? conferenceData.conference_members : []
  ) as ConferenceMember[];

  const activeMembers = members.filter((member) => !member?.left);
  const memberCount = activeMembers.length;
  const isLoggedInUserConferenceOwner = activeMembers.some(
    (member) => member?.is_owner === true && isMemberLoggedInUser(member, loggedInUserTargets),
  );

  return (
    <div className="flex h-full min-h-0 flex-col w-full">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#2d466b] transition max-[380px]:px-1.5 max-[380px]:py-0.5 max-[380px]:text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs md:text-[13px] hover:bg-[#edf3ff]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="mt-2 rounded-xl border border-ucass-active-bg bg-[#f8fbff] px-2.5 py-2">
        <p className="text-[12px] font-semibold text-[#1f2f47] sm:text-[13px]">
          {memberCount} Conference Members
        </p>
      </div>

      {activeMembers.length === 0 ? (
        <div className="py-3 text-center text-[12px] text-[#6f809a] sm:py-4 sm:text-sm">
          No conference members found
        </div>
      ) : (
        <div className="mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain touch-pan-y pr-1 sm:mt-3 sm:space-y-2">
          {activeMembers.map((member, index) => {
            const memberName = getMemberDisplayName(member);
            const memberDialTarget = getMemberDialTarget(member);
            const memberNumber = memberDialTarget || '-';
            const normalizedPresenceTarget = normalizeDialTargetUserPart(memberDialTarget);
            const shouldShowPresence =
              Boolean(normalizedPresenceTarget) && isExtensionDialTarget(normalizedPresenceTarget);
            const joinedAtMs = getMemberJoinedAtMs(member);
            const joinedTimerLabel = joinedAtMs ? formatElapsed(nowMs - joinedAtMs) : '--:--';
            const isLoggedInUserMember = isMemberLoggedInUser(member, loggedInUserTargets);

            return (
              <div
                key={`${memberNumber}-${index}`}
                className="rounded-xl border border-ucass-active-bg bg-[#f8fbff] p-2 max-[380px]:p-1.5 sm:p-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <CustomAvatar
                    name={memberName}
                    image={String(member?.profile || member?.avatar || '').trim()}
                    size="34"
                    showPresence={shouldShowPresence}
                    extension={shouldShowPresence ? normalizedPresenceTarget : ''}
                    isActivityInfo={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#1f2f47] sm:text-[13px]">
                        {memberName}
                      </p>
                      {isLoggedInUserConferenceOwner && !isLoggedInUserMember ? (
                        <button
                          type="button"
                          onClick={() => handleConferenceMemberHangup(member)}
                          className="shrink-0 rounded-md border border-[#f4b6b6] bg-[#fff1f1] px-2 py-0.5 text-[10px] font-semibold text-[#be2626] transition hover:bg-[#ffe3e3] sm:px-2.5 sm:text-[11px]"
                        >
                          Hangup
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] text-[#6f809a] sm:text-xs">
                        {memberNumber}
                      </p>
                      <p className="shrink-0 text-[10px] font-semibold text-[#55749d] sm:text-[11px]">
                        {joinedTimerLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DialpadConferenceMembersList;
