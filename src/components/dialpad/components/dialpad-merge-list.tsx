import type { DialpadSession } from '@/context/dialpad-context';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import CustomAvatar from '@/components/custom/custom-avatar';
import { isExtensionDialTarget, normalizeDialTargetUserPart } from '@/lib/extension-utility';
import { handleAlert } from '@/lib/utils';
import { getHeaderFirstValue } from '@/components/dialpad/session-display';
import { ChevronLeft, MergeIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getDialpadSessionStatusLabel } from '../session-status';
import { getDialpadSessionDisplayInfo } from '../session-display';

type DialpadMergeListProps = {
  onBack: () => void;
  session: DialpadSession | null;
};

const getDisplayName = (session: DialpadSession) =>
  getDialpadSessionDisplayInfo(session).contactName;

const getDisplayNumber = (session: DialpadSession) =>
  getDialpadSessionDisplayInfo(session).contactNumber || '-';
const normalizeMergeTarget = (value?: string | null) => (value || '').replace(/\s+/g, '').trim();
const MAX_CONFERENCE_CONNECTED_MEMBERS = 5;

const getConnectedConferenceMembersCount = (targetSession?: DialpadSession | null) => {
  const conferenceMembers = Array.isArray(targetSession?.conferenceData?.conference_members)
    ? targetSession?.conferenceData?.conference_members
    : [];
  return conferenceMembers.filter((conferenceMember: any) => !conferenceMember?.left).length;
};

const DialpadMergeList = ({ onBack, session }: DialpadMergeListProps) => {
  const { sessions, activeSessionId } = useDialpad();
  const { socketEventsManager } = useSocketEvents();
  const { user } = useUser();
  const [isMerging, setIsMerging] = useState(false);
  const [mergingSessionId, setMergingSessionId] = useState<string | null>(null);
  const [addedMergeTargets, setAddedMergeTargets] = useState<Record<string, boolean>>({});
  const mergeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSessionId = session?.id || activeSessionId;
  const currentSession = currentSessionId ? sessions[currentSessionId] : null;
  const conferenceId = String(session?.conferenceData?.conference_id || '').trim();
  const isCurrentSessionConnected = Boolean(
    currentSession && ['accepted', 'confirmed'].includes(currentSession.status),
  );

  const otherLiveSessions = useMemo(
    () =>
      Object.values(sessions)
        .filter((session) => !['ended', 'failed'].includes(session.status))
        .filter((session) => session.id !== currentSessionId)
        .sort((left, right) => right.startedAt - left.startedAt),
    [currentSessionId, sessions],
  );
  const firstSessionIdByMergeTarget = useMemo(() => {
    const nextMap = new Map<string, string>();
    otherLiveSessions.forEach((liveSession) => {
      const normalizedTarget = normalizeMergeTarget(getDisplayNumber(liveSession));
      if (!normalizedTarget || nextMap.has(normalizedTarget)) return;
      nextMap.set(normalizedTarget, liveSession.id);
    });
    return nextMap;
  }, [otherLiveSessions]);

  const showDuplicateTargetAlert = () => {
    handleAlert({
      text: 'This extension or number already exists in the list or was already added.',
      type: 'error',
    });
  };

  const handleMerge = (targetSession: DialpadSession) => {
    if (isMerging) return;
    const normalizedTarget = normalizeMergeTarget(getDisplayNumber(targetSession));
    if (!normalizedTarget) return;
    const connectedConferenceMembers = Math.max(
      getConnectedConferenceMembersCount(session),
      getConnectedConferenceMembersCount(currentSession),
      getConnectedConferenceMembersCount(targetSession),
    );

    if (connectedConferenceMembers > MAX_CONFERENCE_CONNECTED_MEMBERS) {
      handleAlert({
        text: 'Maximum conference members limit reached',
        type: 'error',
      });
      return;
    }

    const firstSessionIdForTarget = firstSessionIdByMergeTarget.get(normalizedTarget) || '';
    const isDuplicateTargetInList = Boolean(
      firstSessionIdForTarget && firstSessionIdForTarget !== targetSession.id,
    );

    if (isDuplicateTargetInList || addedMergeTargets[normalizedTarget]) {
      showDuplicateTargetAlert();
      return;
    }

    setIsMerging(true);
    setMergingSessionId(targetSession.id);
    const conferenceOwner = String(
      user?.user_info?.extension || user?.sip_credentials?.extension || user?.extension || '',
    ).trim();

    // The switch needs one leg of each call: it moves that leg together with
    // whoever it is bridged to. For a call this phone dialled the record carries
    // the phone's own leg as call_uuid and often no b_leg_uuid at all, so until
    // 5 Sep 2026 both ids went out empty, the server logged "missing UUIDs" and
    // nothing happened while this panel closed as if the merge had worked.
    const legOf = (live: any) => String(live?.b_leg_uuid || live?.call_uuid || '').trim();
    // The phone always knows each call's SIP Call-ID (X-cid for calls it
    // received); the server can resolve its own leg from that when the live
    // record never arrived, which is the normal case for plain browser calls.
    const sipIdOf = (s: DialpadSession | null | undefined) =>
      String(
        s?.liveCallData?.sip_call_id ||
          getHeaderFirstValue(s?.headers, 'x-cid') ||
          getHeaderFirstValue(s?.headers, 'call-id') ||
          '',
      ).trim();
    const anchorSession = session || currentSession;
    const payload = {
      confId: conferenceId || targetSession?.conferenceData?.conference_id || '',
      callerUniqueId: legOf(session?.liveCallData) || legOf(currentSession?.liveCallData),
      childUniqueId: targetSession?.conferenceData?.conference_id
        ? String(currentSession?.liveCallData?.call_uuid || '')
        : legOf(targetSession?.liveCallData) ||
          (currentSession?.liveCallData?.direction === 'inbound'
            ? String(currentSession?.liveCallData?.call_uuid || '')
            : legOf(currentSession?.liveCallData)),
      callerSipCallId: sipIdOf(anchorSession),
      childSipCallId: sipIdOf(targetSession),
      direction: currentSession?.liveCallData?.direction,
      conferenceOwner,
    };

    const callerKey = payload.callerUniqueId || payload.callerSipCallId;
    const childKey = payload.childUniqueId || payload.childSipCallId;
    if (!callerKey || !childKey || callerKey === childKey) {
      setIsMerging(false);
      setMergingSessionId(null);
      handleAlert({
        text: 'These calls cannot be merged yet: the switch has not reported both call ids. Try again in a moment.',
        type: 'error',
      });
      return;
    }

    setAddedMergeTargets((previousState) => ({
      ...previousState,
      [normalizedTarget]: true,
    }));

    mergeTimeoutRef.current = setTimeout(() => {
      socketEventsManager?.emit('add-call-conf', {
        data: payload,
      });
      setIsMerging(false);
      setMergingSessionId(null);
      onBack();
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (!mergeTimeoutRef.current) return;
      clearTimeout(mergeTimeoutRef.current);
      mergeTimeoutRef.current = null;
    };
  }, []);


  return (
    <div className="flex h-full min-h-0 flex-col w-full">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isMerging}
          className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#2d466b] transition max-[380px]:px-1.5 max-[380px]:py-0.5 max-[380px]:text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs md:text-[13px] hover:bg-[#edf3ff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className=" bg-white">
        {otherLiveSessions.length === 0 ? (
          <div className="py-3 text-center text-[12px] text-[#6f809a] sm:py-4 sm:text-sm">
            No other sessions found
          </div>
        ) : (
          <div className="mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain touch-pan-y pr-1 sm:mt-3 sm:space-y-2">
            {otherLiveSessions.map((targetSession) => {
              const displayName = getDisplayName(targetSession);
              const displayNumber = getDisplayNumber(targetSession);
              const normalizedMergeTarget = normalizeMergeTarget(displayNumber);
              const firstSessionIdForTarget =
                firstSessionIdByMergeTarget.get(normalizedMergeTarget) || '';
              const isDuplicateTargetInList = Boolean(
                normalizedMergeTarget &&
                firstSessionIdForTarget &&
                firstSessionIdForTarget !== targetSession.id,
              );
              const isAlreadyAddedTarget = Boolean(
                normalizedMergeTarget && addedMergeTargets[normalizedMergeTarget],
              );
              const shouldHideMergeActionButton = isDuplicateTargetInList || isAlreadyAddedTarget;
              const statusLabel = getDialpadSessionStatusLabel(targetSession);
              const normalizedPresenceTarget = normalizeDialTargetUserPart(
                targetSession?.extension || displayNumber,
              );
              const shouldShowPresence =
                Boolean(normalizedPresenceTarget) &&
                isExtensionDialTarget(normalizedPresenceTarget);

              return (
                <div
                  key={targetSession.id}
                  className="rounded-xl border border-ucass-active-bg bg-[#f8fbff] p-2 max-[380px]:p-1.5 sm:p-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CustomAvatar
                          name={displayName}
                          image={String(
                            (typeof targetSession?.contactInfo?.profile === 'string'
                              ? targetSession?.contactInfo?.profile
                              : targetSession?.contactInfo?.profile?.contactPic) ||
                              targetSession?.contactInfo?.avatar ||
                              '',
                          ).trim()}
                          size="34"
                          showPresence={shouldShowPresence}
                          extension={shouldShowPresence ? normalizedPresenceTarget : ''}
                          isActivityInfo={false}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1f2f47]">
                            {displayName}
                          </p>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-[#6f809a]">{displayNumber}</p>
                            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5f789a]">
                              {statusLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 gap-2">
                    {shouldHideMergeActionButton ? (
                      <span className="inline-flex items-center justify-center rounded-lg bg-[#5f7392] px-2 py-1.5 text-xs font-semibold text-white">
                        Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isMerging}
                        onClick={() => {
                          handleMerge(targetSession);
                        }}
                        className="rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-primary flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:bg-ucass-active-bg"
                      >
                        {isCurrentSessionConnected ? <MergeIcon className="h-3 w-3" /> : null}
                        {isMerging && mergingSessionId === targetSession.id
                          ? 'Merging...'
                          : 'Merge'}
                      </button>
                    )}
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

export default DialpadMergeList;
