export const MONITOR_ACTION_CODES = ['*86', '*87', '*88', '*89'] as const;

export const MONITOR_ACTION_LABELS: Record<string, string> = {
  '*86': 'Whisper',
  '*87': 'Listen',
  '*88': 'Barge',
  '*89': 'Intercept',
};

const TERMINAL_DIALPAD_SESSION_STATUSES = new Set(['ended', 'failed']);

export const normalizeMonitorDialValue = (value: unknown) =>
  String(value || '').replace(/\s+/g, '').trim();

export const getMonitorTargetCallId = (call: any) => {
  if (!call || typeof call !== 'object') return '';
  const isOutbound = String(call?.direction || '').toLowerCase() === 'outbound';
  const rawCallId = isOutbound ? call?.call_uuid : call?.b_leg_uuid || call?.call_uuid;
  return normalizeMonitorDialValue(rawCallId);
};

export const getMonitorActionFromDialTarget = (dialTarget: unknown) => {
  const normalizedDialTarget = normalizeMonitorDialValue(dialTarget);
  if (!normalizedDialTarget) return null;

  const actionCode = MONITOR_ACTION_CODES.find((code) => normalizedDialTarget.startsWith(code));
  if (!actionCode) return null;

  const targetCallId = normalizeMonitorDialValue(normalizedDialTarget.slice(actionCode.length));
  return {
    actionCode,
    targetCallId,
  };
};

export const isDialpadMonitoringSessionActiveForCall = (
  sessions: Record<string, any> | undefined,
  callId: string,
) => {
  const normalizedCallId = normalizeMonitorDialValue(callId);
  if (!normalizedCallId) return false;

  return Object.values(sessions || {}).some((session: any) => {
    const sessionStatus = String(session?.status || '').toLowerCase();
    if (TERMINAL_DIALPAD_SESSION_STATUSES.has(sessionStatus)) return false;

    const monitorAction = getMonitorActionFromDialTarget(session?.remoteNumber || session?.extension);
    if (!monitorAction?.targetCallId) return false;

    return monitorAction.targetCallId === normalizedCallId;
  });
};
