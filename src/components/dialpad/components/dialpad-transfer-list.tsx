import { getUserList } from '@/services/api';
import { useDialpad } from '@/hooks/use-dialpad';
import { useUser } from '@/hooks/use-user';
import { useTransferPermissions } from '@/hooks/use-transfer-permissions';
import CustomAvatar from '@/components/custom/custom-avatar';
import { handleAlert } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AsYouType, parsePhoneNumber } from 'libphonenumber-js/max';
import { ArrowRightLeft, ChevronLeft, MergeIcon, PhoneCall } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MAX_DIAL_LENGTH } from '../constants';

type TransferListUser = {
  uuid: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  extension?: string;
  profile?: string | null;
};

type DialpadTransferListProps = {
  onBack: () => void;
  onOpenMerge?: () => void;
};

const getUserDisplayName = (user: TransferListUser) => {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return fullName || user.email || 'Unknown User';
};

const normalizeTransferTarget = (value?: string | null) => (value || '').replace(/\s+/g, '').trim();

const isFeatureCode = (value: string) => value.startsWith('*') || value.startsWith('#');

const sanitizeExternalTransferInput = (value: string): string =>
  String(value || '')
    .replace(/[^0-9*#+]/g, '')
    .slice(0, MAX_DIAL_LENGTH);

const formatExternalTransferInput = (value: string): string => {
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

const normalizeTransferTargetForMatch = (value?: string | null) => {
  const normalizedValue = normalizeTransferTarget(value).toLowerCase();
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

const isSessionConnected = (statusValue?: string) =>
  ['accepted', 'confirmed'].includes(String(statusValue || '').toLowerCase());

const DialpadTransferList = ({ onBack, onOpenMerge }: DialpadTransferListProps) => {
  const { handleTransfer, activeSpeakFirstTarget, sessions, activeSessionId } = useDialpad();

  /* The company's transfer rules. These are toll-fraud controls, so the check
     runs here AND again in the action handler — a button left enabled by a
     stale render must not be a way through.
     
     Being straight about what this is: a check in the browser is not real
     protection, because the transfer leaves over SIP and the switch accepts it
     regardless. What it does is stop an agent transferring somewhere they were
     never meant to, and make the admin's setting mean something. The enforcing
     gate has to live in the call switch. */
  const transferPermissions = useTransferPermissions();
  const activeCallDirection = activeSessionId
    ? (sessions as any)?.[activeSessionId]?.direction
    : undefined;
  const { user } = useUser();
  const [externalTransferNumber, setExternalTransferNumber] = useState('');
  const formattedExternalTransferNumber = formatExternalTransferInput(externalTransferNumber);
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['dialpadTransferUserList'],
    queryFn: () => getUserList({ page: 1, limit: 99999999, displayType: 'dropdown' }),
    select: (response: any) => (response?.data?.data?.result?.rows || []) as TransferListUser[],
  });

  const loggedInUserExtension = normalizeTransferTarget(
    user?.user_info?.extension || user?.sip_credentials?.extension || user?.extension,
  );
  const transferListUsers = useMemo(() => {
    return users.filter((transferUser) => {
      if (!transferUser?.uuid || !transferUser?.extension) return false;

      const transferUserExtension = normalizeTransferTarget(transferUser.extension);
      return transferUserExtension !== loggedInUserExtension;
    });
  }, [loggedInUserExtension, users]);
  const activeSpeakFirstTargetRaw = normalizeTransferTarget(activeSpeakFirstTarget);
  const activeSpeakFirstTargetMatch = normalizeTransferTargetForMatch(activeSpeakFirstTarget);
  const isSpeakFirstLocked = Boolean(activeSpeakFirstTargetRaw);
  const transferTargetsByUserId = useMemo(() => {
    const nextMap = new Map<string, string>();
    transferListUsers.forEach((transferUser) => {
      if (!transferUser?.uuid) return;
      nextMap.set(transferUser.uuid, normalizeTransferTargetForMatch(transferUser.extension));
    });
    return nextMap;
  }, [transferListUsers]);
  const firstTransferUserIdByTarget = useMemo(() => {
    const nextMap = new Map<string, string>();
    transferListUsers.forEach((transferUser) => {
      if (!transferUser?.uuid) return;
      const normalizedTarget = normalizeTransferTargetForMatch(transferUser.extension);
      if (!normalizedTarget || nextMap.has(normalizedTarget)) return;
      nextMap.set(normalizedTarget, transferUser.uuid);
    });
    return nextMap;
  }, [transferListUsers]);
  const transferListTargetSet = useMemo(() => {
    return new Set(
      transferListUsers
        .map((transferUser) => normalizeTransferTargetForMatch(transferUser.extension))
        .filter(Boolean),
    );
  }, [transferListUsers]);
  const activeSessionTargetSet = useMemo(() => {
    const nextSet = new Set<string>();
    Object.values(sessions).forEach((session) => {
      if (['ended', 'failed'].includes(session.status)) return;
      const normalizedRemoteNumber = normalizeTransferTargetForMatch(session.remoteNumber);
      const normalizedExtension = normalizeTransferTargetForMatch(session.extension);
      if (normalizedRemoteNumber) nextSet.add(normalizedRemoteNumber);
      if (normalizedExtension) nextSet.add(normalizedExtension);
    });
    return nextSet;
  }, [sessions]);
  const consultSessionByTarget = useMemo(() => {
    const nextMap = new Map<string, any>();

    const addSessionTarget = (targetValue: string | undefined, targetSession: any) => {
      const normalizedTarget = normalizeTransferTargetForMatch(targetValue);
      if (!normalizedTarget || nextMap.has(normalizedTarget)) return;
      nextMap.set(normalizedTarget, targetSession);
    };

    Object.values(sessions)
      .filter((session) => !['ended', 'failed'].includes(session.status))
      .sort((left, right) => {
        const leftConnectedWeight = isSessionConnected(left.status) ? 1 : 0;
        const rightConnectedWeight = isSessionConnected(right.status) ? 1 : 0;
        if (leftConnectedWeight !== rightConnectedWeight) {
          return rightConnectedWeight - leftConnectedWeight;
        }
        return right.startedAt - left.startedAt;
      })
      .forEach((session) => {
        addSessionTarget(session.remoteNumber, session);
        addSessionTarget(session.extension, session);
      });

    return nextMap;
  }, [sessions]);
  const hasInternalActiveTarget = transferListUsers.some(
    (user) => normalizeTransferTargetForMatch(user.extension) === activeSpeakFirstTargetMatch,
  );
  const sanitizedExternalTransferNumber = sanitizeExternalTransferInput(externalTransferNumber);
  const normalizedExternalTransferNumber = normalizeTransferTarget(sanitizedExternalTransferNumber);
  const activeExternalSpeakFirstTarget =
    isSpeakFirstLocked && !hasInternalActiveTarget ? activeSpeakFirstTargetRaw : '';
  const activeExternalSpeakFirstTargetMatch =
    isSpeakFirstLocked && !hasInternalActiveTarget ? activeSpeakFirstTargetMatch : '';
  const isExternalActiveTarget = Boolean(activeExternalSpeakFirstTarget);
  const externalConsultSession = isExternalActiveTarget
    ? consultSessionByTarget.get(activeExternalSpeakFirstTargetMatch)
    : null;
  const shouldShowExternalMerge = Boolean(
    externalConsultSession && isSessionConnected(externalConsultSession.status),
  );
  const effectiveExternalTransferTarget = isExternalActiveTarget
    ? activeExternalSpeakFirstTarget
    : normalizedExternalTransferNumber;
  const isExternalNumberValid = effectiveExternalTransferTarget.length >= 3;
  const externalTransferCheck = transferPermissions.canTransferTo(
    effectiveExternalTransferTarget,
    { direction: activeCallDirection },
  );
  /* Shown under the field rather than only disabling the button: an agent who
     cannot transfer needs to know why, mid-call, without asking anyone. */
  const externalTransferBlockedReason = isExternalNumberValid
    ? externalTransferCheck.reason
    : null;
  const isExternalTransferAllowed = isExternalNumberValid && externalTransferCheck.allowed;


  const showDuplicateTargetAlert = () => {
    handleAlert({
      text: 'This extension or number already exists in the list or was already added.',
      type: 'error',
    });
  };

  const isDuplicateExternalTarget = (target: string) => {
    const normalizedTarget = normalizeTransferTargetForMatch(target);
    if (!normalizedTarget) return false;
    if (isExternalActiveTarget && normalizedTarget === activeExternalSpeakFirstTargetMatch) {
      return false;
    }
    return (
      transferListTargetSet.has(normalizedTarget) ||
      activeSessionTargetSet.has(normalizedTarget) ||
      normalizedTarget === activeSpeakFirstTargetMatch
    );
  };

  const handleExternalTransferAction = (type: 'speak_first' | 'transfer_now') => {
    const nextTarget = effectiveExternalTransferTarget;
    if (nextTarget.length < 3) return;

    /* Re-checked at the moment of action, not just when the button rendered. */
    const check = transferPermissions.canTransferTo(nextTarget, {
      direction: activeCallDirection,
    });
    if (!check.allowed) {
      handleAlert({ text: check.reason || 'This transfer is not allowed.', type: 'error' });
      return;
    }

    if (isDuplicateExternalTarget(nextTarget)) {
      showDuplicateTargetAlert();
      return;
    }

    handleTransfer(type, nextTarget);
    setExternalTransferNumber('');
  };

  const handleInternalTransferAction = (
    type: 'speak_first' | 'transfer_now',
    userTarget: string,
    isDuplicateTargetInList: boolean,
  ) => {
    const normalizedUserTarget = normalizeTransferTarget(userTarget);
    if (!normalizedUserTarget) return;

    if (isDuplicateTargetInList) {
      showDuplicateTargetAlert();
      return;
    }

    handleTransfer(type, userTarget);
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
                Transfer to External Number
              </p>
            </div>
            {isExternalActiveTarget ? (
              <div className="inline-flex items-center gap-1">
                {shouldShowExternalMerge ? (
                  <button
                    type="button"
                    title="Merge"
                    aria-label="Merge"
                    onClick={onOpenMerge}
                    disabled={!onOpenMerge}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ucass-active-bg bg-white text-[#2a4a78] transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-ucass-active-bg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MergeIcon className="h-3 w-3" />
                  </button>
                ) : null}
                <button
                  type="button"
                  title="Transfer Now"
                  aria-label="Transfer Now"
                  disabled={!isExternalTransferAllowed}
                  onClick={() =>
                    isExternalTransferAllowed && handleExternalTransferAction('transfer_now')
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-primary disabled:cursor-not-allowed disabled:bg-ucass-active-bg"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  title="Attended Transfer"
                  aria-label="Attended Transfer"
                  disabled={!isExternalTransferAllowed || isSpeakFirstLocked}
                  onClick={() =>
                    isExternalTransferAllowed && handleExternalTransferAction('speak_first')
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ucass-active-bg bg-white text-[#2a4a78] transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-ucass-active-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PhoneCall className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Blind transfer"
                  aria-label="Blind transfer"
                  disabled={!isExternalTransferAllowed || isSpeakFirstLocked}
                  onClick={() =>
                    isExternalTransferAllowed && handleExternalTransferAction('transfer_now')
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-primary disabled:cursor-not-allowed disabled:bg-ucass-active-bg"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-2">
            <input
              value={formattedExternalTransferNumber}
              onChange={(event) =>
                setExternalTransferNumber(sanitizeExternalTransferInput(event.target.value))
              }
              inputMode="tel"
              placeholder="Enter number"
              disabled={isSpeakFirstLocked}
              className="w-full rounded-lg border border-[#d2ddef] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#1f2f47] outline-none transition placeholder:text-[#90a0b8] max-[380px]:px-2 max-[380px]:py-1 max-[380px]:text-[11px] sm:px-3 sm:py-2 sm:text-sm md:text-[14px] focus:border-[#8ec0ff] focus:ring-2 focus:ring-[#8ec0ff]/30"
            />
            {/* Says why, rather than only greying the button out. An agent who
                cannot complete a transfer needs the reason while the caller is
                still on the line. */}
            {externalTransferBlockedReason && (
              <p className="mt-1.5 text-[11px] font-medium text-red-600" role="alert">
                {externalTransferBlockedReason}
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-3 text-center text-[12px] text-[#6f809a] sm:py-4 sm:text-sm">
            Loading users...
          </div>
        ) : transferListUsers.length === 0 ? (
          <div className="py-3 text-center text-[12px] text-[#6f809a] sm:py-4 sm:text-sm">
            No users found
          </div>
        ) : (
          <div className="mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain touch-pan-y pr-1 sm:mt-3 sm:space-y-2">
            {transferListUsers.map((user) => {
              const displayName = getUserDisplayName(user);
              const normalizedUserTarget = transferTargetsByUserId.get(user.uuid) || '';
              const firstUserIdForTarget =
                firstTransferUserIdByTarget.get(normalizedUserTarget) || '';
              const isDuplicateTargetInList = Boolean(
                normalizedUserTarget && firstUserIdForTarget && firstUserIdForTarget !== user.uuid,
              );
              const isUserActiveTarget =
                isSpeakFirstLocked && normalizedUserTarget === activeSpeakFirstTargetMatch;
              const userConsultSession = isUserActiveTarget
                ? consultSessionByTarget.get(normalizedUserTarget)
                : null;
              const shouldShowUserMerge = Boolean(
                userConsultSession && isSessionConnected(userConsultSession.status),
              );
              const isUserActionDisabled = isSpeakFirstLocked && !isUserActiveTarget;

              return (
                <div
                  key={user.uuid}
                  className="rounded-xl border border-ucass-active-bg bg-[#f8fbff] p-2 max-[380px]:p-1.5 sm:p-2.5"
                >
                  <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CustomAvatar
                          name={displayName}
                          image={user?.profile || ''}
                          size="34"
                          extension={String(user?.extension || '').trim()}
                          showPresence={Boolean(String(user?.extension || '').trim())}
                          isActivityInfo={false}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[#1f2f47] max-[380px]:text-[11px] sm:text-sm md:text-[13px]">
                            {displayName}
                          </p>
                          <p className="truncate text-[11px] text-[#6f809a] max-[380px]:text-[10px] sm:text-xs">
                            Ext. {user.extension}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 inline-flex items-center gap-1">
                      {isUserActiveTarget ? (
                        <>
                          {shouldShowUserMerge ? (
                            <button
                              type="button"
                              title="Merge"
                              aria-label="Merge"
                              onClick={onOpenMerge}
                              disabled={!onOpenMerge}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ucass-active-bg bg-white text-[#2a4a78] transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-ucass-active-bg disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <MergeIcon className="h-3 w-3" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            title="Transfer Now"
                            aria-label="Transfer Now"
                            onClick={() =>
                              handleInternalTransferAction(
                                'transfer_now',
                                user?.extension || '',
                                isDuplicateTargetInList,
                              )
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-primary"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            title="Attended Transfer"
                            aria-label="Attended Transfer"
                            disabled={isUserActionDisabled}
                            onClick={() =>
                              handleInternalTransferAction(
                                'speak_first',
                                user?.extension || '',
                                isDuplicateTargetInList,
                              )
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ucass-active-bg bg-white text-[#2a4a78] transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-ucass-active-bg disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PhoneCall className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title="Blind transfer"
                            aria-label="Blind transfer"
                            disabled={isUserActionDisabled}
                            onClick={() =>
                              handleInternalTransferAction(
                                'transfer_now',
                                user?.extension || '',
                                isDuplicateTargetInList,
                              )
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white transition max-[380px]:h-6 max-[380px]:w-6 sm:h-8 sm:w-8 hover:bg-primary disabled:cursor-not-allowed disabled:bg-ucass-active-bg"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                          </button>
                        </>
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

export default DialpadTransferList;
