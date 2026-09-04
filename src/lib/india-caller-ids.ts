import type { CallerIdOption } from '@/components/dialpad/types';

/**
 * The account's Indian outbound numbers, offered in the dialpad's "Calling as"
 * list alongside whatever `useGetAssignedDIDNumbers` returns.
 *
 * They are listed here rather than coming back from that endpoint because they
 * are not provisioned as assigned DIDs on this account. That difference matters
 * and is worth being plain about: what the person you ring actually sees is
 * decided server-side — by the DID the platform places the call on, or by the
 * From on the Twilio TwiML app — never by this array. Picking one here saves it
 * as the account's caller ID through the same `updateUserDID` call a real DID
 * uses, so if the platform owns the number it takes effect properly, and if it
 * does not the save fails visibly instead of the dialpad quietly showing an
 * Indian number while the call goes out on something else.
 *
 * Once these are assigned as DIDs they will arrive from the API on their own
 * and should be deleted from here, or they will appear twice.
 */
/**
 * True for the numbers above.
 *
 * The dialpad's caller-ID list draws a flag in place of these labels rather
 * than printing "India 1" … "India 10": ten rows all saying India told you
 * nothing the number beside it did not, and the count was only ever there to
 * keep the ids apart. Matching on the id prefix rather than `country`, because
 * an assigned DID from the API can be Indian too and those keep their real
 * labels ("Main DID", "DID 2").
 */
export const isIndiaCallerIdOption = (option?: { id?: string } | null) =>
  Boolean(option?.id?.startsWith('india-caller-id-'));

export const INDIA_CALLER_ID_OPTIONS: CallerIdOption[] = [
  { id: 'india-caller-id-1', label: 'India 1', country: 'IN', number: '+918037683127' },
  { id: 'india-caller-id-2', label: 'India 2', country: 'IN', number: '+918037683128' },
  { id: 'india-caller-id-3', label: 'India 3', country: 'IN', number: '+918037683129' },
  { id: 'india-caller-id-4', label: 'India 4', country: 'IN', number: '+918037683130' },
  { id: 'india-caller-id-5', label: 'India 5', country: 'IN', number: '+918037683131' },
];
