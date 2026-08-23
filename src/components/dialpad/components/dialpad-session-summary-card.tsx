import type { DialpadSession } from '@/context/dialpad-context';
import CustomAvatar from '@/components/custom/custom-avatar';
import DialpadCallTimer from './dialpad-call-timer';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useEffect } from 'react';
import { getDialpadSessionStatusLabel } from '../session-status';
import DialpadConferenceMembersPreview from './dialpad-conference-members-preview';
import { getDialpadSessionDisplayInfo } from '../session-display';
import { isExtensionDialTarget, normalizeDialTargetUserPart } from '@/lib/extension-utility';

type DialpadSessionSummaryCardProps = {
  session: DialpadSession | null;
  statusLabel?: string;
  showTimer?: boolean;
  onConferenceMembersClick?: () => void;
};

const DialpadSessionSummaryCard = ({
  session,
  statusLabel,
  showTimer = true,
  onConferenceMembersClick,
}: DialpadSessionSummaryCardProps) => {
  console.log('🚀 ~ DialpadSessionSummaryCard ~ session:', session);
  const { getMatchedLiveCallBySession, ensureSessionContactInfo } = useDialpad();
  const { liveCalls = [] } = useSocketEvents();

  useEffect(() => {
    if (!session) return;
    getMatchedLiveCallBySession(liveCalls, session);
  }, [getMatchedLiveCallBySession, liveCalls, session?.direction, session?.headers, session?.id]);

  const conferenceData = session?.conferenceData;
  const conferenceMembers = Array.isArray(conferenceData?.conference_members)
    ? conferenceData.conference_members
    : [];
  const { contactName, contactNumber, isConferenceSession, isMonitoringCall } =
    getDialpadSessionDisplayInfo(session);
  const normalizedPresenceTarget = normalizeDialTargetUserPart(session?.extension || contactNumber);
  const shouldShowPresence =
    Boolean(normalizedPresenceTarget) && isExtensionDialTarget(normalizedPresenceTarget);
  const avatarImage = String(
    session?.contactInfo?.profile || session?.contactInfo?.avatar || '',
  ).trim();

  useEffect(() => {
    if (!session || isConferenceSession || isMonitoringCall) return;
    void ensureSessionContactInfo(session);
  }, [ensureSessionContactInfo, isConferenceSession, isMonitoringCall, session]);

  if (!session) return null;
  const resolvedStatusLabel = statusLabel || getDialpadSessionStatusLabel(session);

  const sessionStatus = session.status || 'idle';
  const isTerminalStatus = sessionStatus === 'ended' || sessionStatus === 'failed';
  const isProgressStatus =
    sessionStatus === 'incoming' ||
    sessionStatus === 'ringing' ||
    sessionStatus === 'calling' ||
    sessionStatus === 'connecting';

  const badgeClass = isTerminalStatus
    ? 'bg-[#fef2f4] text-[#b33a49]'
    : isProgressStatus
      ? 'bg-ucass-active-bg text-[#2a5ec4]'
      : 'bg-[#f4f8ff] text-[#1d5fd9]';
  const dotClass = isTerminalStatus ? 'bg-[#b33a49]' : 'bg-[#1d5fd9]';

  return (
    <div className="flex items-start justify-between gap-2 rounded-2xl border border-[#e3e9f3] bg-white p-1 xl:p-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 max-[380px]:gap-2 xl:gap-3">
        <CustomAvatar
          name={contactName}
          image={avatarImage}
          size="40"
          showPresence={shouldShowPresence}
          extension={shouldShowPresence ? normalizedPresenceTarget : ''}
          isActivityInfo={false}
        />
        <div className="min-w-0">
          <p className="truncate sm:max-w-28 xl:max-w-32 xxl:max-w-40 block text-[14px] font-semibold text-[#1f2f47] max-[380px]:text-[12.5px] sm:text-[14px] xl:text-base">
            {contactName}
          </p>
          {isConferenceSession ? (
            <DialpadConferenceMembersPreview
              members={conferenceMembers}
              onClick={onConferenceMembersClick}
              className="mt-0.5"
            />
          ) : !isMonitoringCall ? (
            <>
              <p className="truncate text-[12px] text-[#6c7c95] max-[380px]:text-[11px] sm:text-[12px] xl:text-sm  items-center flex">
                {contactNumber}
              </p>
            </>
          ) : null}
          {session?.contactInfo?.type && (
            <p className="truncate text-[9px] items-center flex  text-emerald-600 tracking-wider  rounded-full p-0.5 w-30 ">
              {session?.contactInfo?.type}
            </p>
          )}
        </div>
      </div>

      <div className="ml-1 flex shrink-0 flex-col items-end">
        <div
          className={`flex min-w-[4.5rem] max-w-full items-center justify-center gap-1 rounded-full py-1 text-[10px] font-medium max-[380px]:px-2 max-[380px]:text-[11px] sm:px-2 sm:py-1 xl:gap-2 xl:px-2.5 xl:py-1.5 xl:text-xs ${badgeClass}`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-1.5 sm:w-1.5 xl:w-2 xl:h-2 ${dotClass}`}
          />
          <span className="max-w-[5.5rem] truncate sm:max-w-[6rem] xl:max-w-[7.5rem]">
            {resolvedStatusLabel}
          </span>
        </div>
        {showTimer ? <DialpadCallTimer connectedAt={session.connectedAt} /> : null}
      </div>
    </div>
  );
};

export default DialpadSessionSummaryCard;
