import moment from 'moment';

/**
 * When a call happened, in the viewer's own time.
 *
 * `call_history.start_stamp` is written by FreeSWITCH in the switch's local
 * time and stored with no zone on it — "2026-09-07 10:27:16". This host runs on
 * UTC (`timedatectl`: Etc/UTC), so those strings are UTC.
 *
 * `moment("2026-09-07 10:27:16")` reads a zone-less string as the BROWSER's
 * local time, so every call time in the console was shown shifted by the
 * viewer's own offset: a call placed at 15:57 in India was labelled 10:27, five
 * and a half hours earlier. Near the day boundary it was also filed under the
 * wrong date, which is what made a call just placed look like it had never been
 * logged at all.
 *
 * Reading the stamp as UTC and converting to local is right for both shapes the
 * API can return: a zone-less string is UTC, and one that does carry an offset
 * is honoured as written.
 */
export const callMoment = (stamp: unknown) => moment.utc(stamp as any).local();

/** Milliseconds since the epoch, or 0 when there is no usable stamp. */
export const callTimestamp = (stamp: unknown): number => {
  if (!stamp) return 0;
  const at = callMoment(stamp);
  return at.isValid() ? at.valueOf() : 0;
};
