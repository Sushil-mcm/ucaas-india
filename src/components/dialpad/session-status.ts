import type { DialpadSession } from '@/context/dialpad-context';

const isNoPickupCause = (cause: string) =>
  cause.includes('no answer') ||
  cause.includes('request timeout') ||
  cause.includes('expires') ||
  cause.includes('unavailable');

export const getDialpadSessionStatusLabel = (session: DialpadSession | null) => {
  if (!session) return 'Idle';

  const cause = (session.cause || '').toLowerCase();

  if (session.status === 'ended') {
    if (session.eventOriginator === 'remote') return 'Remote Hung Up';
    if (session.eventOriginator === 'local') return 'You Ended';
    return 'Call Ended';
  }

  if (session.status === 'failed') {
    if (isNoPickupCause(cause)) return 'No Pickup';
    if (cause.includes('busy')) return 'Busy';
    if (cause.includes('rejected')) return 'Rejected';
    if (cause.includes('canceled')) {
      return session.eventOriginator === 'remote' ? 'Remote Canceled' : 'Canceled';
    }
    return 'Call Failed';
  }

  const activeFlags: string[] = [];
  if (session.isOnHold) activeFlags.push('On Hold');
  if (session.isMuted) activeFlags.push('Muted');
  if (!session.isSpeakerOn) activeFlags.push('Speaker Off');
  if (activeFlags.length) return activeFlags.join(' + ');

  if (session.status === 'confirmed') return 'Connected';
  if (session.status === 'accepted') return 'In Progress';
  if (session.status === 'incoming') return 'Incoming';
  if (session.status === 'ringing') return 'Ringing';
  if (session.status === 'calling') return 'Calling';
  if (session.status === 'connecting') return 'Connecting';

  return session.status;
};
