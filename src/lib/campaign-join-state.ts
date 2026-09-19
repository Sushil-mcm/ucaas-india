/**
 * Which browser tab a campaign's calls ring, and what the Join button should
 * therefore say.
 *
 * Joining a campaign writes this tab's SIP contact onto the agent's row on the
 * server (`sip_contact` -> `ring_contact`), and the queue script rings that one
 * contact. So a second tab pressing Join does not "also join": it takes the
 * ring away from the first tab, which then sits on "Waiting for call" while
 * every call goes somewhere the agent is not looking. On 13 Sep the owner
 * pressed Join repeatedly across tabs for exactly this reason - the button said
 * "Join Campaign" every time, because the browser had no idea it was already
 * joined.
 *
 * Two things are known, and neither on its own is enough:
 *
 *   - the SERVER knows the person is on a campaign's roster (read once on load
 *     from the campaign-event-logs roster), but no browser-reachable endpoint
 *     returns the stored `ring_contact`, so the server cannot say WHICH tab;
 *   - this BROWSER knows which contact it last sent with a join, because it
 *     wrote it to localStorage, which every tab of the browser can read.
 *
 * Together they cover the cases that matter. What they cannot see is a join
 * made from a different browser or a different machine; that lands as
 * "joined, but not from this window", which is still the truth and still
 * offers the honest repair ("Ring this tab instead").
 */

export type CampaignJoinState =
  /** Nobody has joined this campaign from this person's account. */
  | 'not_joined'
  /** Joined, and this tab is the one the calls ring. */
  | 'joined_here'
  /** Joined, but another tab of this browser holds the ring. */
  | 'joined_other_tab'
  /** The server says joined; this browser has no record of which tab. */
  | 'joined_unknown_tab'
  /** This person is working a different campaign right now. */
  | 'joined_other_campaign';

export type CampaignJoinAction = 'join' | 'ring_here' | 'open' | 'switch' | 'none';

export type CampaignJoinDescription = {
  state: CampaignJoinState;
  /** True whenever the person is on this campaign's roster. */
  isJoined: boolean;
  /** True only when this tab is the one the dialer will ring. */
  ringsHere: boolean;
  /** The primary button's words. */
  buttonLabel: string;
  /** What pressing the primary button should do. */
  action: CampaignJoinAction;
  /** One plain sentence under the card, or '' when there is nothing to say. */
  note: string;
};

const clean = (value: unknown): string => String(value ?? '').trim();

/**
 * Contacts are compared on their user@host, not the whole URI: jsSIP writes
 * `sip:<token>@<token>.invalid;transport=ws` and the parameters are not part
 * of the identity the switch stores.
 */
export const normalizeSipContact = (value: unknown): string => {
  const raw = clean(value).toLowerCase();
  if (!raw) return '';
  const withoutBrackets = raw.replace(/^</, '').replace(/>$/, '');
  const withoutScheme = withoutBrackets.replace(/^sips?:/, '');
  return (withoutScheme.split(';')[0] || '').trim();
};

export const sameSipContact = (left: unknown, right: unknown): boolean => {
  const a = normalizeSipContact(left);
  const b = normalizeSipContact(right);
  return Boolean(a) && a === b;
};

export const describeCampaignJoin = (input: {
  /** The campaign this card is about. */
  campaignId: unknown;
  /** The campaign this browser tab believes it joined, if any. */
  joinedCampaignId?: unknown;
  /** The campaign the server's roster puts this person on, if any. */
  rosterCampaignId?: unknown;
  /** The contact this browser last sent when joining `campaignId`. */
  lastJoinedContact?: unknown;
  /** This tab's own SIP contact. */
  myContact?: unknown;
  /** A join request is in flight for this campaign. */
  isPending?: boolean;
  /** The name of the campaign currently holding this person, when known. */
  otherCampaignName?: unknown;
}): CampaignJoinDescription => {
  const campaignId = clean(input.campaignId);
  const joinedHere = clean(input.joinedCampaignId);
  const roster = clean(input.rosterCampaignId);
  const myContact = clean(input.myContact);
  const lastContact = clean(input.lastJoinedContact);

  const isJoined = Boolean(campaignId) && (joinedHere === campaignId || roster === campaignId);
  const isOnAnother =
    !isJoined &&
    Boolean(campaignId) &&
    ((Boolean(joinedHere) && joinedHere !== campaignId) ||
      (Boolean(roster) && roster !== campaignId));

  if (input.isPending) {
    return {
      state: isJoined ? 'joined_here' : 'not_joined',
      isJoined,
      ringsHere: false,
      buttonLabel: isJoined ? 'Moving the ring…' : 'Joining…',
      action: 'none',
      note: '',
    };
  }

  if (isOnAnother) {
    /* This used to be a dead end: "Leave it first to join this one", with no
       button to press and nothing naming the campaign being complained about.
       On 13 Sep the owner read it on three cards at once while off duty and
       working none of them - because one stale claim on a fourth campaign
       blocks every other card. A person who wants to work this campaign is
       telling us where their calls should ring, so let them say it in one
       press, and name the campaign that currently holds them. */
    const other = clean(input.otherCampaignName);
    return {
      state: 'joined_other_campaign',
      isJoined: false,
      ringsHere: false,
      buttonLabel: 'Switch to this campaign',
      action: 'switch',
      note: other
        ? `Your calls ring for ${other} right now. Switching moves them here.`
        : 'Your calls ring for another campaign right now. Switching moves them here.',
    };
  }

  if (!isJoined) {
    return {
      state: 'not_joined',
      isJoined: false,
      ringsHere: false,
      buttonLabel: 'Join Campaign',
      action: 'join',
      note: '',
    };
  }

  /* Joined. The only remaining question is whether the calls ring here. */
  if (!myContact) {
    return {
      state: 'joined_unknown_tab',
      isJoined: true,
      ringsHere: false,
      buttonLabel: 'Ring this tab instead',
      action: 'ring_here',
      note: 'You are joined, but this window is not registered for calls yet.',
    };
  }

  if (!lastContact) {
    return {
      state: 'joined_unknown_tab',
      isJoined: true,
      ringsHere: false,
      buttonLabel: 'Ring this tab instead',
      action: 'ring_here',
      note: 'You are joined, but not from this window — calls may ring somewhere else.',
    };
  }

  if (sameSipContact(lastContact, myContact)) {
    return {
      state: 'joined_here',
      isJoined: true,
      ringsHere: true,
      buttonLabel: 'Open dialer',
      action: 'open',
      note: '',
    };
  }

  return {
    state: 'joined_other_tab',
    isJoined: true,
    ringsHere: false,
    buttonLabel: 'Ring this tab instead',
    action: 'ring_here',
    note: 'You are joined in another tab — calls ring there.',
  };
};

/* ── where the browser remembers which tab joined ────────────────────────── */

export const CAMPAIGN_RING_STORAGE_KEY = 'mcm_campaign_ring';

type RingRecord = { campaignId: string; contact: string; at: number };

type MinimalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const storage = (given?: MinimalStorage | null): MinimalStorage | null => {
  if (given) return given;
  try {
    return window.localStorage;
  } catch {
    /* private mode, or no DOM at all (tests) */
    return null;
  }
};

/** What this browser last sent as the ring contact for `campaignId`, or ''. */
export const readCampaignRingContact = (
  campaignId: unknown,
  store?: MinimalStorage | null,
): string => {
  const id = clean(campaignId);
  const target = storage(store);
  if (!id || !target) return '';
  try {
    const parsed = JSON.parse(target.getItem(CAMPAIGN_RING_STORAGE_KEY) || 'null') as RingRecord | null;
    if (!parsed || clean(parsed.campaignId) !== id) return '';
    return clean(parsed.contact);
  } catch {
    return '';
  }
};

/**
 * The whole record: which campaign this browser last pointed a ring at, and
 * where. A tab that did not press Join itself has no other way to know that
 * another tab of the same browser is already joined - it would otherwise
 * offer a bare Join and take the call away from the window the agent is
 * actually watching, which is the fault commit 7acc277 set out to end.
 */
export const readCampaignRingRecord = (
  store?: MinimalStorage | null,
): { campaignId: string; contact: string; at: number } => {
  const empty = { campaignId: '', contact: '', at: 0 };
  const target = storage(store);
  if (!target) return empty;
  try {
    const parsed = JSON.parse(
      target.getItem(CAMPAIGN_RING_STORAGE_KEY) || 'null',
    ) as RingRecord | null;
    if (!parsed) return empty;
    return {
      campaignId: clean(parsed.campaignId),
      contact: clean(parsed.contact),
      /* When it was written. A record with no timestamp, or one from another
         day, is not evidence of anything - see checkHeldRingRecord. */
      at: Number(parsed.at) || 0,
    };
  } catch {
    return empty;
  }
};

/** Record that this browser has pointed `campaignId`'s ring at `contact`. */
export const writeCampaignRingContact = (
  campaignId: unknown,
  contact: unknown,
  store?: MinimalStorage | null,
): void => {
  const id = clean(campaignId);
  const target = storage(store);
  if (!id || !target) return;
  try {
    const record: RingRecord = { campaignId: id, contact: clean(contact), at: Date.now() };
    target.setItem(CAMPAIGN_RING_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* nothing to do: the button falls back to "not from this window" */
  }
};

/** Forget the record, on leave. */
export const clearCampaignRingContact = (store?: MinimalStorage | null): void => {
  const target = storage(store);
  if (!target) return;
  try {
    target.removeItem(CAMPAIGN_RING_STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
};
