import type { DialpadSession } from '@/context/dialpad-context';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import CustomAvatar from '@/components/custom/custom-avatar';
import { handleAlert } from '@/lib/utils';
import { getUserList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { AsYouType, parsePhoneNumber } from 'libphonenumber-js/max';
import { ChevronLeft, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MAX_DIAL_LENGTH } from '../constants';

type AddUserListItem = {
  uuid: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  extension?: string;
  profile?: string | null;
};

type DialpadAddUserMode = 'conference' | 'pre-conference';

type DialpadAddUserListProps = {
  onBack: () => void;
  session: DialpadSession | null;
  mode: DialpadAddUserMode;
};

const getUserDisplayName = (user: AddUserListItem) => {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return fullName || user.email || 'Unknown User';
};

const normalizeNumber = (value?: string | null) => (value || '').replace(/\s+/g, '').trim();

const isFeatureCode = (value: string) => value.startsWith('*') || value.startsWith('#');

const sanitizeExternalDialInput = (value: string): string =>
  String(value || '')
    .replace(/[^0-9*#+]/g, '')
    .slice(0, MAX_DIAL_LENGTH);

const formatExternalDialInput = (value: string): string => {
  const trimmedValue = value.trim();
  const typedDigits = value.replace(/\D/g, '');

  // Keep short entries and feature codes untouched (usually extension/internal dialing).
  if (!trimmedValue || typedDigits.length <= 4 || isFeatureCode(trimmedValue)) {
    return value;
  }

  const hasExplicitCountryCode = trimmedValue.startsWith('+');
  const normalizedPhone = `+${typedDigits}`;
  const candidates = hasExplicitCountryCode
    ? [normalizedPhone]
    : [normalizedPhone, `+1${typedDigits}`];

  for (const candidate of candidates) {
    try {
      const parsed = parsePhoneNumber(candidate);
      if (parsed?.country) return parsed.formatInternational();
    } catch {
      // no-op
    }
  }

  for (const candidate of candidates) {
    try {
      const asYouTypeValue = new AsYouType().input(candidate);
      if (asYouTypeValue) return asYouTypeValue;
    } catch {
      // no-op
    }
  }

  return value;
};

const normalizeTargetForMatch = (value?: string | null) => {
  const normalizedValue = normalizeNumber(value).toLowerCase();
  if (!normalizedValue) return '';

  const withoutSipPrefix = normalizedValue.startsWith('sip:')
    ? normalizedValue.slice(4)
    : normalizedValue;
  const userPart = withoutSipPrefix.split('@')[0] || '';
  if (!userPart) return '';

  if (/^\+?\d+$/.test(userPart)) {
    return userPart.replace(/^\+/, '');
  }

  return userPart;
};

const isSessionLive = (session: DialpadSession) =>
  !['ended', 'failed'].includes(String(session.status || '').toLowerCase());

const DialpadAddUserList = ({ onBack, session, mode }: DialpadAddUserListProps) => {
  const { socketEventsManager } = useSocketEvents();
  const { user } = useUser();
  const { handleTransfer, sessions } = useDialpad();
  const [externalNumber, setExternalNumber] = useState('');
  const formattedExternalNumber = formatExternalDialInput(externalNumber);
  const [addedUserIds, setAddedUserIds] = useState<Record<string, boolean>>({});
  const [addedTargets, setAddedTargets] = useState<Record<string, boolean>>({});

  const isConferenceMode = mode === 'conference';
  const sessionStatus = String(session?.status || '').toLowerCase();
  const conferenceId = String(session?.conferenceData?.conference_id || '').trim();
  const canAddToConference = isConferenceMode && Boolean(conferenceId);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['dialpadConferenceAddUserList'],
    queryFn: () => getUserList({ page: 1, limit: 99999999, displayType: 'dropdown' }),
    select: (response: any) => (response?.data?.data?.result?.rows || []) as AddUserListItem[],
  });

  const usersWithExtension = useMemo(
    () => users.filter((listUser) => Boolean(listUser?.uuid && listUser?.extension)),
    [users],
  );
  const firstUserIdByTarget = useMemo(() => {
    const nextMap = new Map<string, string>();
    usersWithExtension.forEach((listUser) => {
      const normalizedTarget = normalizeNumber(listUser.extension);
      if (!normalizedTarget || nextMap.has(normalizedTarget)) return;
      nextMap.set(normalizedTarget, listUser.uuid);
    });
    return nextMap;
  }, [usersWithExtension]);
  const userListTargetSet = useMemo(
    () =>
      new Set(
        usersWithExtension
          .map((listUser) => normalizeTargetForMatch(listUser.extension))
          .filter(Boolean),
      ),
    [usersWithExtension],
  );
  const conferenceMemberTargetSet = useMemo(() => {
    const members = Array.isArray(session?.conferenceData?.conference_members)
      ? session.conferenceData.conference_members
      : [];
    const nextSet = new Set<string>();

    members.forEach((member: any) => {
      if (member?.left) return;

      const normalizedUserNumber = normalizeNumber(member?.number);
      const normalizedExtension = normalizeNumber(member?.extension);
      if (normalizedUserNumber) nextSet.add(normalizedUserNumber);
      if (normalizedExtension) nextSet.add(normalizedExtension);
    });

    return nextSet;
  }, [session?.conferenceData?.conference_members]);
  const liveSessions = useMemo(
    () => Object.values(sessions).filter((liveSession) => isSessionLive(liveSession)),
    [sessions],
  );
  const activeSessionTargetSet = useMemo(() => {
    const nextSet = new Set<string>();
    liveSessions.forEach((liveSession) => {
      const normalizedRemoteNumber = normalizeNumber(liveSession.remoteNumber);
      const normalizedExtension = normalizeNumber(liveSession.extension);
      if (normalizedRemoteNumber) nextSet.add(normalizedRemoteNumber);
      if (normalizedExtension) nextSet.add(normalizedExtension);
    });
    return nextSet;
  }, [liveSessions]);

  const sanitizedExternalNumber = sanitizeExternalDialInput(externalNumber);
  const normalizedExternalNumber = normalizeNumber(sanitizedExternalNumber);
  const effectiveExternalTarget = normalizedExternalNumber;
  const isExternalNumberValid = effectiveExternalTarget.length >= 3;
  const showDuplicateTargetAlert = () => {
    handleAlert({
      text: 'This extension or number already exists in the list or was already added.',
      type: 'error',
    });
  };

  useEffect(() => {
    setExternalNumber('');
    setAddedUserIds({});
    setAddedTargets({});
  }, [session?.id, mode]);

  useEffect(() => {
    if (!['ended', 'failed'].includes(sessionStatus)) return;
    setExternalNumber('');
    setAddedUserIds({});
    setAddedTargets({});
  }, [sessionStatus]);

  const handleConferenceAddUser = (
    number: string,
    options?: { clearInput?: boolean; markAddedUserId?: string },
  ) => {
    const normalizedTarget = normalizeNumber(number);
    if (!normalizedTarget || !canAddToConference) return;

    const firstUserIdForTarget = firstUserIdByTarget.get(normalizedTarget) || '';
    const isDuplicateTargetInList = Boolean(
      options?.markAddedUserId &&
      firstUserIdForTarget &&
      firstUserIdForTarget !== options.markAddedUserId,
    );
    const isAlreadyAdded =
      Boolean(addedTargets[normalizedTarget]) || conferenceMemberTargetSet.has(normalizedTarget);

    if (isDuplicateTargetInList || isAlreadyAdded) {
      showDuplicateTargetAlert();
      return;
    }

    const sipUser = String(
      user?.user_info?.extension || user?.sip_credentials?.extension || '',
    ).trim();
    const domain = String(user?.sip_credentials?.domain || user?.user_info?.domain || '').trim();

    socketEventsManager?.emit('add-call-conf', {
      data: {
        confId: conferenceId,
        sipUser,
        newcall: normalizedTarget,
        domain,
      },
    });

    const markAddedUserId = options?.markAddedUserId;
    if (markAddedUserId) {
      setAddedUserIds((previousState) => ({
        ...previousState,
        [markAddedUserId]: true,
      }));
    }

    setAddedTargets((previousState) => ({
      ...previousState,
      [normalizedTarget]: true,
    }));

    if (options?.clearInput) {
      setExternalNumber('');
    }
  };

  const isDuplicateExternalPreConferenceTarget = (target: string) => {
    if (!target) return false;
    return userListTargetSet.has(target) || activeSessionTargetSet.has(target);
  };

  const isDuplicateInternalPreConferenceTarget = (target: string) => {
    if (!target) return false;
    return activeSessionTargetSet.has(target);
  };

  const handlePreConferenceSpeakFirst = (
    target: string,
    options?: { markAddedUserId?: string; clearInput?: boolean; source?: 'internal' | 'external' },
  ) => {
    const normalizedTarget = normalizeNumber(target);
    if (!normalizedTarget) return;

    const firstUserIdForTarget = firstUserIdByTarget.get(normalizedTarget) || '';
    const isDuplicateTargetInList = Boolean(
      options?.markAddedUserId &&
      firstUserIdForTarget &&
      firstUserIdForTarget !== options.markAddedUserId,
    );

    const isDuplicateBySource =
      options?.source === 'external'
        ? isDuplicateExternalPreConferenceTarget(normalizedTarget)
        : isDuplicateInternalPreConferenceTarget(normalizedTarget);

    if (isDuplicateTargetInList || isDuplicateBySource) {
      showDuplicateTargetAlert();
      return;
    }

    handleTransfer('speak_first', normalizedTarget);
    if (options?.clearInput) {
      setExternalNumber('');
    }
    onBack();
  };

  const handleExternalAction = () => {
    if (!isExternalNumberValid) return;

    if (isConferenceMode) {
      handleConferenceAddUser(effectiveExternalTarget, { clearInput: true });
      return;
    }

    handlePreConferenceSpeakFirst(effectiveExternalTarget, {
      clearInput: true,
      source: 'external',
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col w-full">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#2d466b] transition max-[380px]:px-1.5 max-[380px]:py-0.5 max-[380px]:text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs md:text-[13px] hover:bg-[#edf3ff]"
        >
          <ChevronLeft className="h-3.5 w-3.5 max-[380px]:h-3 max-[380px]:w-3 sm:h-4 sm:w-4" />
          Back
        </button>
      </div>

      <div className=" flex min-h-0 flex-1 flex-col ">
        <div className=" rounded-xl border border-ucass-active-bg bg-[#f8fbff] p-2 mt-1 max-[380px]:p-1.5  sm:p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-[#1f2f47] max-[380px]:text-[11px] sm:text-[13px] ">
                {isConferenceMode ? 'Add User to Conference' : 'Add User to Call'}
              </p>
            </div>
            <button
              type="button"
              title="Add"
              aria-label="Add"
              disabled={
                isConferenceMode
                  ? !isExternalNumberValid || !canAddToConference
                  : !isExternalNumberValid
              }
              onClick={handleExternalAction}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-primary disabled:cursor-not-allowed disabled:bg-ucass-active-bg"
            >
              <UserPlus className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-2">
            <input
              value={formattedExternalNumber}
              onChange={(event) => setExternalNumber(sanitizeExternalDialInput(event.target.value))}
              inputMode="tel"
              placeholder="Enter number"
              className="w-full rounded-lg border border-[#d2ddef] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#1f2f47] outline-none transition placeholder:text-[#90a0b8] max-[380px]:px-2 max-[380px]:py-1 max-[380px]:text-[11px] sm:px-3 sm:py-2 sm:text-sm md:text-[14px] focus:border-[#8ec0ff] focus:ring-2 focus:ring-[#8ec0ff]/30 disabled:cursor-not-allowed disabled:bg-[#f3f6fb]"
            />
            {isConferenceMode && !canAddToConference ? (
              <p className="mt-1 text-[10px] font-medium text-[#9a6270] max-[380px]:text-[9px] sm:text-[11px]">
                Conference is unavailable for this session.
              </p>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="py-3 text-center text-[12px] text-[#6f809a] sm:py-4 sm:text-sm">
            Loading users...
          </div>
        ) : usersWithExtension.length === 0 ? (
          <div className="py-3 text-center text-[12px] text-[#6f809a] sm:py-4 sm:text-sm">
            No users found
          </div>
        ) : (
          <div className="mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain touch-pan-y pr-1 sm:mt-3 sm:space-y-2">
            {usersWithExtension.map((listUser) => {
              const displayName = getUserDisplayName(listUser);
              const normalizedListUserTarget = normalizeNumber(listUser.extension);
              const isConferenceMember = Boolean(
                normalizedListUserTarget && conferenceMemberTargetSet.has(normalizedListUserTarget),
              );
              const isAdded =
                Boolean(addedUserIds[listUser.uuid]) ||
                Boolean(normalizedListUserTarget && addedTargets[normalizedListUserTarget]) ||
                isConferenceMember;
              const shouldHideConferenceActionButton = isConferenceMode && isAdded;
              const isUserActionDisabled = isConferenceMode ? !canAddToConference : false;

              return (
                <div
                  key={listUser.uuid}
                  className="rounded-xl border border-ucass-active-bg bg-[#f8fbff] p-2 max-[380px]:p-1.5 sm:p-2.5"
                >
                  <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CustomAvatar
                          name={displayName}
                          image={listUser?.profile || ''}
                          size="34"
                          extension={String(listUser?.extension || '').trim()}
                          showPresence={Boolean(String(listUser?.extension || '').trim())}
                          isActivityInfo={false}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[#1f2f47] max-[380px]:text-[11px] sm:text-sm md:text-[13px]">
                            {displayName}
                          </p>
                          <p className="truncate text-[11px] text-[#6f809a] max-[380px]:text-[10px] sm:text-xs">
                            Ext. {listUser.extension}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 inline-flex items-center gap-1">
                      {isConferenceMode ? (
                        shouldHideConferenceActionButton ? (
                          <span className="inline-flex h-7 items-center justify-center rounded-lg bg-[#5f7392] px-2 text-[10px] font-semibold text-white max-[380px]:h-6 sm:h-8">
                            Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            title="Add"
                            aria-label="Add"
                            disabled={isUserActionDisabled}
                            onClick={() =>
                              handleConferenceAddUser(listUser?.extension || '', {
                                markAddedUserId: listUser.uuid,
                              })
                            }
                            className="inline-flex h-7 items-center justify-center rounded-lg bg-primary px-2 text-white transition max-[380px]:h-6 sm:h-8 hover:bg-primary disabled:cursor-not-allowed disabled:bg-ucass-active-bg"
                          >
                            <UserPlus className="h-3 w-3" />
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          title="Add"
                          aria-label="Add"
                          disabled={isUserActionDisabled}
                          onClick={() =>
                            handlePreConferenceSpeakFirst(listUser?.extension || '', {
                              markAddedUserId: listUser.uuid,
                              source: 'internal',
                            })
                          }
                          className="inline-flex h-7 items-center justify-center rounded-lg px-2 text-white transition max-[380px]:h-6 sm:h-8 bg-primary hover:bg-primary disabled:cursor-not-allowed disabled:bg-ucass-active-bg"
                        >
                          <UserPlus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DialpadAddUserList;
