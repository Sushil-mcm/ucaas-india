import type { DialpadSession } from '@/context/dialpad-context';
import { getDialpadSessionStatusLabel } from '../session-status';
import { getDialpadSessionDisplayInfo } from '../session-display';

type DialpadSessionSwitcherProps = {
  sessions: DialpadSession[];
  activeSessionId: string | null;
  onSwitchSession: (sessionId: string) => void;
};

const getDialpadSessionSwitcherLabel = (session: DialpadSession, statusLabel: string) => {
  const { contactName, contactNumber, isConferenceSession, isMonitoringCall } =
    getDialpadSessionDisplayInfo(session);
  if (isConferenceSession || isMonitoringCall) return `${contactName} - ${statusLabel}`;

  return `${contactName} (${contactNumber || '-'}) - ${statusLabel}`;
};

const DialpadSessionSwitcher = ({
  sessions,
  activeSessionId,
  onSwitchSession,
}: DialpadSessionSwitcherProps) => {
  if (sessions.length <= 1) return null;

  return (
    <div className="mb-2 rounded-2xl border border-[#e5edf8] bg-white px-2.5 py-1.5 max-[380px]:mb-1.5 max-[380px]:px-2 max-[380px]:py-1 sm:mb-2.5 sm:px-3 sm:py-2 md:mb-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5f789a] max-[380px]:text-[9px] sm:mb-1.5 sm:text-[11px]">
        Call Sessions
      </div>

      <select
        value={activeSessionId ?? ''}
        onChange={(event) => onSwitchSession(event.target.value)}
        className="w-full rounded-xl border border-[#d6e3f5] bg-ucass-active-bg px-2 py-1.5 text-[12px] font-medium text-[#274368] outline-none transition max-[380px]:px-1.5 max-[380px]:py-1 max-[380px]:text-[11px] sm:px-2.5 sm:py-2 sm:text-sm md:text-[14px] focus:border-ucass-active-bg focus:ring-2 focus:ring-ucass-active-bg/35"
      >
        {sessions.map((session) => {
          const statusLabel = getDialpadSessionStatusLabel(session);
          const label = getDialpadSessionSwitcherLabel(session, statusLabel);
          return (
            <option key={session.id} value={session.id}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default DialpadSessionSwitcher;
