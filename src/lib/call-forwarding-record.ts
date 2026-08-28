/* Writing a person's `call_forwarding` record back without deleting the parts
 * you did not edit.
 *
 * Four screens save this one record, and each of them rebuilds it from its own
 * fixed list of fields:
 *
 *   - My Phone (settings/phone) writes forward_calls, status, incoming_calls,
 *     outgoing_calls — and no `dnd`.
 *   - The admin call-rules drawer writes forward_calls, dnd, incoming_calls,
 *     outgoing_calls — and no `status`.
 *   - The avatar presence menu and the presence control write forward_calls,
 *     incoming_calls, outgoing_calls, status — and no `dnd`.
 *
 * The endpoint stores what it is given, so a key missing from the list is a key
 * deleted from the record. A person saving My Phone silently cleared their own
 * do-not-disturb; an admin saving that person's call rules silently cleared
 * their presence. Neither screen shows the field it is deleting, so nothing on
 * screen says it happened.
 *
 * `incoming_calls` has the same problem one level down: both screens rebuild it
 * from a fixed list too, and only My Phone lists `closed_hour_action`, so an
 * admin save dropped the person's after-hours rule and a My Phone save dropped
 * it whenever the person's hours were set to 24-hour.
 *
 * This is the same fix already applied to the company record in
 * `user-settings-template-form.ts`: keep the keys the form owns, and carry
 * everything else on the record through untouched.
 */

const parseMaybeJson = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const isPlainObject = (value: any) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/* `stored` is the record as it came back from the API — object or JSON string.
   `written` is exactly what the calling screen builds today, unchanged: every
   key it lists still wins, including one it deliberately writes as empty. Only
   keys it does not list are taken from the stored record. */
export const mergeCallForwarding = (
  stored: any,
  written: Record<string, any>,
): Record<string, any> => {
  const storedRecord = parseMaybeJson(stored);
  const merged: Record<string, any> = { ...storedRecord, ...written };

  const storedIncoming = storedRecord?.incoming_calls;
  if (isPlainObject(storedIncoming) && isPlainObject(written?.incoming_calls)) {
    merged.incoming_calls = { ...storedIncoming, ...written.incoming_calls };
  }

  return merged;
};
