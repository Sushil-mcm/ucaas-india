import { useCallback } from 'react';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';

/**
 * Inbound-SMS unread counts.
 *
 * The socket layer already maintains these end to end — `sms-notification`
 * updates `smsUnreadCountArray` live and `get-inbound-sms-count-new` seeds it
 * on connect — but until now nothing in the UI read them. This hook is the
 * missing consumer; it does not introduce a second source of truth.
 *
 * Entry shape: { senderNumber, didNumber, count }
 */

const digitsOf = (value?: string) => String(value || '').replace(/\D/g, '');

/**
 * The same number reaches us in several shapes across the SMS endpoints and
 * the socket payloads — "+1 256 808 1010", "+12568081010", "12568081010" — so
 * compare on digits alone, and allow a suffix match for numbers stored without
 * their country code.
 */
export const isSameNumber = (a?: string, b?: string) => {
  const left = digitsOf(a);
  const right = digitsOf(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  return shorter.length >= 7 && longer.endsWith(shorter);
};

export const useSmsUnread = (didNumber?: string) => {
  const {
    smsUnreadCountArray = [],
    setSmsUnreadCountArray,
    updateSmsCount,
    getUnreadSMSCount,
  } = useSocketEvents();
  const { user } = useUser();

  const matches = useCallback(
    (row: any, otherNumber?: string) =>
      isSameNumber(row?.senderNumber, otherNumber) && isSameNumber(row?.didNumber, didNumber),
    [didNumber],
  );

  const getUnread = useCallback(
    (otherNumber?: string) => {
      if (!otherNumber || !didNumber) return 0;
      const entry = (smsUnreadCountArray || []).find((row: any) => matches(row, otherNumber));
      return Number(entry?.count || 0);
    },
    [didNumber, matches, smsUnreadCountArray],
  );

  const markRead = useCallback(
    (otherNumber?: string) => {
      if (!otherNumber || !didNumber) return;
      if (!getUnread(otherNumber)) return;

      // Drop it locally first so the badge clears the moment the thread opens,
      // rather than waiting on the server round trip.
      setSmsUnreadCountArray?.((prev: any[]) =>
        (prev || []).filter((row: any) => !matches(row, otherNumber)),
      );

      updateSmsCount?.({
        uuid: user?.uuid,
        senderNumber: otherNumber,
        didNumber,
        count: 0,
      });
    },
    [didNumber, getUnread, matches, setSmsUnreadCountArray, updateSmsCount, user?.uuid],
  );

  return { getUnread, markRead, refreshUnread: getUnreadSMSCount };
};

export default useSmsUnread;
