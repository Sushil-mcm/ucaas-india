/* What the Call recording card says is happening, in one sentence.
 *
 * The line used to read "Every call is recorded automatically" whatever the
 * direction was set to. With the direction fixed at incoming that was already
 * wrong, and it is the kind of wrong that matters: an administrator reading it
 * believes their outbound calls are recorded, finds out months later that they
 * are not, and has no recordings for the calls they most wanted.
 *
 * The direction is stored as `all`, `incoming` or `outgoing` - not `both`. Worth
 * saying because `both` is the obvious guess and every existing record uses
 * `all`, so guessing would quietly stop matching real data.
 */

export type RecordingDirection = 'all' | 'incoming' | 'outgoing';

/* Anything unrecognised falls back to describing it without a direction rather
   than asserting one. Naming the wrong direction is worse than naming none. */
const DIRECTION_SENTENCE: Record<RecordingDirection, string> = {
  all: 'Every call is recorded automatically, both the ones that come in and the ones you make.',
  incoming: 'Every call that comes in is recorded automatically. Calls you make out are not.',
  outgoing: 'Every call you make out is recorded automatically. Calls that come in are not.',
};

const UNKNOWN_DIRECTION = 'Calls are recorded automatically.';

export interface RecordingState {
  automaticEnabled?: boolean;
  onDemandEnabled?: boolean;
  direction?: string | null;
}

export const describeRecording = (state: RecordingState): string => {
  const parts: string[] = [];

  if (state.automaticEnabled) {
    const direction = String(state.direction ?? '').trim().toLowerCase();
    parts.push(
      (DIRECTION_SENTENCE as Record<string, string>)[direction] ?? UNKNOWN_DIRECTION,
    );
  }

  if (state.onDemandEnabled) {
    parts.push('People can start a recording during a call.');
  }

  /* Neither switched on is a real answer, not an empty string. A blank
     description reads as something that failed to load. */
  return parts.length ? parts.join(' ') : 'Nothing is recorded.';
};
