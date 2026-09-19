import { sameSipContact } from './campaign-join-state';

/**
 * Should THIS window take the campaign ring?
 *
 * One person, several windows, each with its own phone registration. The
 * campaign's agent row names one of them (`ring_contact`), and the switch
 * rings that one. On 14 Sep 2026 the owner had the workspace in one window
 * and the dialer in another: the customer answered, the switch rang - and
 * auto-answered - the window he was not looking at. Eight seconds later he
 * hung up on himself.
 *
 * The browser already elects one window as the ring owner (the visible one,
 * else the most recently active; `electRingOwner`). Until now that election
 * only decided which window may JOIN; moving an existing ring was a button.
 * Now the elected window claims the ring itself, when all of this is true:
 *
 *   - this browser has a campaign ring record, and it names another window;
 *   - this window is the elected owner, and has been for a moment (a window
 *     that flickers into focus for a second must not drag the ring around);
 *   - this window is registered, so the ring can actually reach it;
 *   - this window has no call up, so nothing in progress is disturbed.
 *
 * Pure. The hook does the timing and the write.
 */
export type RingClaimInput = {
  ownsRing: boolean;
  /** How long this window has been the elected owner, in ms. */
  ownedForMs: number;
  /** The browser's record: which campaign is joined, and by which contact. */
  ringRecord: { campaignId: string; contact: string };
  /** This window's own SIP contact, '' until registered. */
  sipContact: string;
  isRegistered: boolean;
  hasLiveCall: boolean;
};

export type RingClaimDecision = { claim: true; campaignId: string } | { claim: false; why: string };

/** How long a window must hold the election before it moves the ring. */
export const RING_CLAIM_SETTLE_MS = 3000;

export const decideRingClaim = (input: RingClaimInput): RingClaimDecision => {
  const campaignId = String(input.ringRecord?.campaignId || '').trim();
  const recordContact = String(input.ringRecord?.contact || '').trim();
  const mine = String(input.sipContact || '').trim();
  if (!campaignId) return { claim: false, why: 'no campaign is joined in this browser' };
  if (!input.ownsRing) return { claim: false, why: 'another window is the elected owner' };
  if (input.ownedForMs < RING_CLAIM_SETTLE_MS) return { claim: false, why: 'just became the owner; waiting to be sure' };
  if (!input.isRegistered || !mine) return { claim: false, why: 'this window is not registered for calls' };
  if (input.hasLiveCall) return { claim: false, why: 'a call is up in this window' };
  if (recordContact && sameSipContact(recordContact, mine)) return { claim: false, why: 'the ring already points here' };
  return { claim: true, campaignId };
};

/** True when calls for the joined campaign will ring a window other than this one. */
export const ringIsElsewhere = (ringRecord: { campaignId: string; contact: string }, sipContact: string): boolean => {
  const campaignId = String(ringRecord?.campaignId || '').trim();
  const contact = String(ringRecord?.contact || '').trim();
  const mine = String(sipContact || '').trim();
  if (!campaignId || !contact || !mine) return false;
  return !sameSipContact(contact, mine);
};
