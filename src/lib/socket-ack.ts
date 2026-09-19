/**
 * A socket request that cannot wait forever.
 *
 * Three of the agent workspace's most important moves are socket emits with
 * an acknowledgement callback and no timeout at all:
 *
 *   campaign-preview-contact-list on Join   - no ack, "Joining…" forever;
 *   campaign-preview-contact-list on poll   - no ack, the waiting ring keeps
 *                                             restarting and never fetches
 *                                             again, because the "a fetch is
 *                                             in flight" flag is only cleared
 *                                             inside the callback;
 *   campaign-skip-lead                      - the ack was discarded, so a
 *                                             lost skip looked like a done one.
 *
 * Socket.IO delivers an acknowledgement or it does not; there is no error
 * path. So the timeout has to be ours. This wraps the callback so that it
 * fires exactly once - the server's answer if it arrives in time, otherwise a
 * failure - retries once, and hands the caller a plain sentence to show.
 *
 * Pure except for the timers: the emitter is passed in, so a test can drive
 * the whole thing with a fake clock and a fake socket.
 */

export const SOCKET_ACK_TIMEOUT_MS = 10_000;

export type AckEmitter = (onAck: (response: any) => void) => void;

export type EmitWithAckOptions = {
  /** How long to wait for each attempt. */
  timeoutMs?: number;
  /** Attempts after the first. One by default: slow networks get a second go. */
  retries?: number;
  /** The server answered in time. Called once. */
  onAck: (response: any) => void;
  /** Every attempt timed out. Called once, with a sentence for the person. */
  onTimeout: (message: string) => void;
  /** Between attempts, so a screen can say it is trying again. */
  onRetry?: (attempt: number) => void;
  /** What the request was about, for the sentence: "join the campaign". */
  what?: string;
  setTimer?: (fn: () => void, ms: number) => any;
  clearTimer?: (handle: any) => void;
};

/** The one sentence a person sees when the campaign service never answered. */
export const ackTimeoutMessage = (what?: string): string =>
  `The campaign service did not answer${what ? ` when trying to ${what}` : ''}. Check your connection and try again.`;

export type AckHandle = { cancel: () => void };

/**
 * Emit, wait, retry once, then give up out loud.
 *
 * Returns a handle whose `cancel()` stops the timers and makes any later
 * acknowledgement a no-op - for a component that unmounts while a request is
 * in flight.
 */
export const emitWithAck = (emit: AckEmitter, options: EmitWithAckOptions): AckHandle => {
  const timeoutMs = Number.isFinite(options.timeoutMs as number)
    ? Math.max(0, Number(options.timeoutMs))
    : SOCKET_ACK_TIMEOUT_MS;
  const retries = Number.isFinite(options.retries as number)
    ? Math.max(0, Number(options.retries))
    : 1;
  const setTimer = options.setTimer || ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer || ((handle) => clearTimeout(handle));

  let settled = false;
  let cancelled = false;
  let timer: any = null;

  const stopTimer = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  const attempt = (number: number) => {
    if (cancelled || settled) return;
    if (number > 0) options.onRetry?.(number);

    emit((response: any) => {
      /* A late acknowledgement from a timed-out attempt must not reopen a
         request the screen has already given up on and moved past. */
      if (cancelled || settled) return;
      settled = true;
      stopTimer();
      options.onAck(response);
    });

    /* A fake or in-process socket can answer inside `emit` itself, before
       there is a timer to clear; do not start one for a request already
       settled or it ticks on forever. */
    if (cancelled || settled) return;

    timer = setTimer(() => {
      timer = null;
      if (cancelled || settled) return;
      if (number < retries) {
        attempt(number + 1);
        return;
      }
      settled = true;
      options.onTimeout(ackTimeoutMessage(options.what));
    }, timeoutMs);
  };

  attempt(0);

  return {
    cancel: () => {
      cancelled = true;
      stopTimer();
    },
  };
};
