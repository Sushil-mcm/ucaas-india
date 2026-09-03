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
export const INDIA_CALLER_ID_OPTIONS: CallerIdOption[] = [
  { id: 'india-caller-id-1', label: 'India 1', country: 'IN', number: '+918037683127' },
  { id: 'india-caller-id-2', label: 'India 2', country: 'IN', number: '+918037683128' },
  { id: 'india-caller-id-3', label: 'India 3', country: 'IN', number: '+918037683129' },
  { id: 'india-caller-id-4', label: 'India 4', country: 'IN', number: '+918037683130' },
  { id: 'india-caller-id-5', label: 'India 5', country: 'IN', number: '+918037683131' },
  { id: 'india-caller-id-6', label: 'India 6', country: 'IN', number: '+918037683171' },
  { id: 'india-caller-id-7', label: 'India 7', country: 'IN', number: '+918037683174' },
  { id: 'india-caller-id-8', label: 'India 8', country: 'IN', number: '+918037683175' },
  { id: 'india-caller-id-9', label: 'India 9', country: 'IN', number: '+918037683176' },
  { id: 'india-caller-id-10', label: 'India 10', country: 'IN', number: '+918037683177' },
];
