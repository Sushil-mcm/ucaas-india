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

/**
 * Start a supervisor monitor session the right way.
 *
 * The old screens dialled `*87<uuid>` through the softphone, which the switch
 * treated as an ordinary outbound call — it reached the carrier, not the agent.
 * Monitoring is now a request to the call manager: it answers the supervisor's
 * own phone and eavesdrops (listen), whispers, barges or intercepts the agent's
 * live channel. The supervisor's extension and domain come from the signed-in
 * session on the server, never from here, so a browser cannot monitor another
 * tenant. `code` is the same *86..*89 the buttons already use; the call manager
 * resolves it to a mode.
 *
 * The callback reports whether the call manager accepted the request. On
 * success the supervisor's phone rings as an incoming call; on failure the
 * caller should release its per-call lock and tell the user why.
 */
export const requestMonitorSession = (
  socketEventsManager: any,
  code: string,
  callId: unknown,
  onResult?: (ok: boolean, error?: string) => void,
) => {
  const call_uuid = normalizeMonitorDialValue(callId);
  if (!call_uuid || typeof socketEventsManager?.emit !== 'function') {
    onResult?.(false, 'Monitoring is not available right now.');
    return;
  }
  socketEventsManager.emit('call-monitor', { data: { code, call_uuid } }, (resp: any) => {
    onResult?.(Boolean(resp?.ok), resp?.error);
  });
};
