/**
 * Being assigned to a running campaign, and being on duty, is what makes an
 * agent available to it. There is no separate "join" step to wait for.
 *
 * Until 13 Sep the workspace waited: an administrator put somebody on a
 * campaign, the campaign started, and nothing happened until that person
 * noticed a card and pressed a button. Every minute between the two is a
 * minute the dialer has an idle seat it has been told about and cannot use.
 * So the workspace joins them itself.
 *
 * Two things make that dangerous, and both are handled here rather than in
 * the screen:
 *
 *  1. **The join names a browser tab.** It writes this tab's SIP contact onto
 *     the agent's row (`sip_contact` -> `ring_contact`) and the queue script
 *     rings that one contact. If every open tab auto-joined, the last one to
 *     run would take the ring and the agent would sit in the tab they are
 *     looking at while calls rang in one they are not - which is exactly the
 *     fault that dropped customers on 12 Sep. So exactly one tab is elected
 *     (`electRingOwner`) and only that tab may auto-join; the others keep the
 *     honest "joined in another tab" wording commit 7acc277 gave them, and
 *     the "Ring this tab instead" repair.
 *
 *  2. **Availability is a promise the agent has to be able to keep.** The
 *     join endpoint writes `status: Available, state: Waiting` over the
 *     person's row, which is the same field the duty axis uses. Asserting it
 *     while they are on a break would cancel the break; asserting it during a
 *     call would tell the picker they are free. So the rules below refuse
 *     unless the person is on duty, off the phone, registered, and their
 *     microphone is already allowed - a call that rings into a denied
 *     microphone is worse than no call.
 *
 * The join endpoint itself (`POST /api/call-queue/agent/status`) is a plain
 * `$set` of status, state and ring_contact on one row - proven against the
 * live campaign-api bundle on 13 Sep - so repeating it is harmless. We still
 * only send it once per campaign per session, and let the existing contact
 * watcher in dialpad-context re-send it when the softphone re-registers.
 */

/* ── what state a campaign is in, in words an agent can act on ───────────── */

export type CampaignRunState = 'running' | 'not_started' | 'paused' | 'completed' | 'unknown';

export const campaignRunState = (status: unknown): CampaignRunState => {
  const value = String(status ?? '')
    .trim()
    .toUpperCase();
  if (value === 'PROCESSING') return 'running';
  if (value === 'NEW') return 'not_started';
  if (value === 'PAUSE' || value === 'PAUSED') return 'paused';
  if (value === 'COMPLETE' || value === 'COMPLETED') return 'completed';
  return 'unknown';
};

/**
 * What the workspace says about a campaign the person is assigned to but
 * cannot work. The old screen said nothing at all: it listed only PROCESSING
 * campaigns, so an owner who assigned himself to a campaign that had not been
 * started saw an empty workspace and read it as a bug.
 */
export const RUN_STATE_LABEL: Record<CampaignRunState, string> = {
  running: 'Running',
  not_started: 'Not started',
  paused: 'Paused — waiting for an administrator',
  completed: 'Completed',
  unknown: 'State unknown',
};

export const isWorkableRunState = (state: CampaignRunState): boolean => state === 'running';

const idOf = (row: any): string => String(row?._id ?? row?.id ?? '').trim();

/** Is this person on the campaign's member list? */
export const isCampaignMember = (campaign: any, userUuid: unknown): boolean => {
  const me = String(userUuid ?? '').trim();
  if (!me) return false;
  const members = campaign?.members;
  if (!Array.isArray(members)) return false;
  return members.some((member: any) => String(member?.user_uuid ?? '').trim() === me);
};

/**
 * The assigned campaigns, split into the ones that can be worked now and the
 * ones that only need saying. Completed campaigns are dropped: an agent can
 * do nothing with them and they were the bulk of the list (14 of 42 for the
 * person who reported this).
 */
export const splitAssignedCampaigns = <T,>(
  rows: T[],
): { running: T[]; notRunning: Array<{ campaign: T; state: CampaignRunState; label: string }> } => {
  const running: T[] = [];
  const notRunning: Array<{ campaign: T; state: CampaignRunState; label: string }> = [];
  (Array.isArray(rows) ? rows : []).forEach((row: any) => {
    const state = campaignRunState(row?.campaignStatus);
    if (state === 'completed') return;
    if (state === 'running') {
      running.push(row as T);
      return;
    }
    notRunning.push({ campaign: row as T, state, label: RUN_STATE_LABEL[state] });
  });
  return { running, notRunning };
};

/**
 * Drop rows whose id is in `ids`.
 *
 * The running list and the company list are two reads taken at two moments,
 * and they disagree the instant an administrator starts a campaign: on 13 Sep
 * the owner saw "1234sk · Processing" on a running card and "1234sk · Not
 * started" in the assigned list underneath it, at the same time. The running
 * list is member-scoped and answers the only question that matters here -
 * which campaigns can be worked now - so it wins, and anything it names is
 * removed from the other list rather than shown twice with two states.
 */
export const withoutCampaignIds = <T,>(rows: T[], ids: Iterable<unknown>): T[] => {
  const drop = new Set<string>();
  for (const id of ids || []) {
    const value = String(id ?? '').trim();
    if (value) drop.add(value);
  }
  return (Array.isArray(rows) ? rows : []).filter((row) => !drop.has(idOf(row)));
};

/** Merge two lists of campaign rows, keeping the first row seen for each id. */
export const mergeCampaignRows = <T,>(...lists: Array<T[] | undefined | null>): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  lists.forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((row) => {
      const id = idOf(row);
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(row);
    });
  });
  return out;
};

/* ── may this tab join this campaign by itself? ──────────────────────────── */

export type DutyValue = 'on_duty' | 'on_break' | 'off_duty' | '' | null | undefined;

export type AutoJoinBlock =
  | 'ok'
  | 'no_campaign'
  | 'not_member'
  | 'not_running'
  | 'duty_unknown'
  | 'off_duty'
  | 'on_break'
  | 'busy'
  | 'not_registered'
  | 'no_microphone'
  | 'left_by_hand'
  | 'other_campaign'
  | 'already_joined'
  | 'ring_elsewhere';

export type AutoJoinDecision = {
  /** True only when the screen should send the join for this campaign now. */
  join: boolean;
  block: AutoJoinBlock;
  /** One plain sentence, or '' when there is nothing worth saying. */
  why: string;
};

export type AutoJoinInput = {
  campaign: any;
  userUuid: unknown;
  /** True when the server, not this browser, places the campaign's calls. */
  isServerDialled: boolean;
  duty: DutyValue;
  /** The campaign this tab is already working, if any. */
  joinedCampaignId?: unknown;
  /** Any call or wrap-up panel open in this tab. */
  isBusy: boolean;
  isRegistered: boolean;
  hasSipContact: boolean;
  /** The browser has already been granted the microphone. */
  microphoneGranted: boolean;
  /** The agent pressed Leave on this campaign in this session. */
  leftByHand: boolean;
  /** This tab is the elected owner of the ring. */
  ownsRing: boolean;
};

const no = (block: AutoJoinBlock, why = ''): AutoJoinDecision => ({ join: false, block, why });

/**
 * The order is deliberate: the reasons an agent can do something about come
 * before the ones they cannot, so the sentence the card shows is the useful
 * one.
 */
export const autoJoinDecision = (input: AutoJoinInput): AutoJoinDecision => {
  const campaignId = idOf(input.campaign);
  if (!campaignId) return no('no_campaign');
  if (!isCampaignMember(input.campaign, input.userUuid)) return no('not_member');
  if (!isWorkableRunState(campaignRunState(input.campaign?.campaignStatus))) {
    return no('not_running');
  }

  /* Preview campaigns are joined too (owner, 14 Sep: "as long as the agent
     was picked for the campaign they should be ready"). Until then preview
     kept its Join button because a manual Join also pulls a batch of records
     and locks them to the agent, and doing that to somebody who has not
     asked would park real leads on an empty chair. The automatic join does
     NOT pull records: it puts the person on the campaign - on the roster,
     Available on its queue - and the records are fetched only when they
     open the dialer and ask for the next contact. */

  const joined = String(input.joinedCampaignId ?? '').trim();
  if (joined === campaignId) return no('already_joined');
  if (joined) return no('other_campaign');

  if (input.leftByHand) {
    return no('left_by_hand', 'You left this campaign. Press Join, or go off duty and back on.');
  }

  const duty = String(input.duty ?? '').trim();
  if (!duty) return no('duty_unknown');
  if (duty === 'on_break') return no('on_break', 'On a break — you will be joined when you are back.');
  if (duty !== 'on_duty') return no('off_duty', 'Go on duty and you will be joined automatically.');

  if (input.isBusy) return no('busy');
  if (!input.isRegistered || !input.hasSipContact) {
    return no('not_registered', 'Waiting for this window to register for calls.');
  }
  if (!input.microphoneGranted) {
    return no('no_microphone', 'Press Join once to allow the microphone.');
  }
  if (!input.ownsRing) return no('ring_elsewhere');

  return {
    join: true,
    block: 'ok',
    why: input.isServerDialled
      ? 'Joined automatically — you are on duty'
      : 'Joined automatically — open the dialer and take the next contact when you are ready',
  };
};

/**
 * Which one campaign a tab joins by itself.
 *
 * The dialer works one campaign at a time (`joinedCampaignId` is one value,
 * and the ring contact is refreshed for one campaign), so joining every
 * running campaign at once would leave stale ring targets on all but one of
 * them the next time the softphone re-registered - the 12 Sep fault again,
 * multiplied. One is chosen, in the order the server returned them (newest
 * first), and the rest keep saying plainly that another campaign is being
 * worked.
 */
export const pickAutoJoinCampaign = <T,>(
  candidates: T[],
  decide: (campaign: T) => AutoJoinDecision,
): { campaign: T; decision: AutoJoinDecision } | null => {
  for (const campaign of Array.isArray(candidates) ? candidates : []) {
    const decision = decide(campaign);
    if (decision.join) return { campaign, decision };
  }
  return null;
};

/* ── which tab owns the ring ─────────────────────────────────────────────── */

export type RingTab = {
  tabId: string;
  /** The tab is on screen (document.visibilityState === 'visible'). */
  visible: boolean;
  /** When this tab last said it was alive, in epoch milliseconds. */
  lastSeen: number;
};

/** A tab that has not checked in for this long is treated as gone. */
export const TAB_STALE_MS = 20000;

/**
 * A heartbeat is fresh when it is recent AND not from the future. The future
 * half matters: a record written by a machine whose clock was ahead - or one
 * left behind by a clock change - would otherwise win the election for ever
 * and no tab could take the ring back.
 */
export const isFreshStamp = (stamp: number, now: number, windowMs: number): boolean => {
  const value = Number(stamp) || 0;
  if (value <= 0) return false;
  const age = now - value;
  return age <= windowMs && age >= -windowMs;
};

/**
 * Exactly one winner, decided the same way in every tab so they cannot
 * disagree: a tab the agent is looking at beats one they are not, the more
 * recently active of two equals wins, and a dead heat is broken on the tab id
 * so the answer never depends on who asked.
 */
export const electRingOwner = (
  tabs: RingTab[],
  now: number = Date.now(),
  staleMs: number = TAB_STALE_MS,
): string => {
  const live = (Array.isArray(tabs) ? tabs : []).filter(
    (tab) => tab && String(tab.tabId || '') && isFreshStamp(Number(tab.lastSeen || 0), now, staleMs),
  );
  if (!live.length) return '';
  const best = live.reduce((winner, tab) => {
    if (Boolean(tab.visible) !== Boolean(winner.visible)) return tab.visible ? tab : winner;
    const tabSeen = Number(tab.lastSeen) || 0;
    const winnerSeen = Number(winner.lastSeen) || 0;
    if (tabSeen !== winnerSeen) return tabSeen > winnerSeen ? tab : winner;
    return String(tab.tabId) < String(winner.tabId) ? tab : winner;
  });
  return String(best.tabId);
};

/* ── where the browser keeps the two facts above ─────────────────────────── */

export const CAMPAIGN_TABS_STORAGE_KEY = 'mcm_campaign_tabs';
export const CAMPAIGN_LEFT_STORAGE_KEY = 'mcm_campaign_left';

/** An explicit Leave is forgotten after this long, so a browser left open
 *  overnight does not carry yesterday's refusal into today's shift. */
export const LEFT_MARK_TTL_MS = 12 * 60 * 60 * 1000;

type MinimalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const localStore = (given?: MinimalStorage | null): MinimalStorage | null => {
  if (given) return given;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readJson = (store: MinimalStorage | null, key: string): any => {
  if (!store) return null;
  try {
    return JSON.parse(store.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const writeJson = (store: MinimalStorage | null, key: string, value: unknown): void => {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: the tab simply never wins the election, which is safe */
  }
};

export const makeTabId = (): string => {
  try {
    const cryptoApi: any = typeof crypto !== 'undefined' ? crypto : null;
    if (cryptoApi?.randomUUID) return String(cryptoApi.randomUUID());
  } catch {
    /* fall through */
  }
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Say this tab is alive, and how visible it is. */
export const publishRingTab = (
  tabId: unknown,
  visible: boolean,
  now: number = Date.now(),
  store?: MinimalStorage | null,
  staleMs: number = TAB_STALE_MS,
): void => {
  const id = String(tabId ?? '').trim();
  const target = localStore(store);
  if (!id || !target) return;
  const bag = readJson(target, CAMPAIGN_TABS_STORAGE_KEY);
  const next: Record<string, { visible: boolean; lastSeen: number }> = {};
  if (bag && typeof bag === 'object') {
    Object.entries(bag as Record<string, any>).forEach(([key, value]) => {
      const lastSeen = Number(value?.lastSeen) || 0;
      /* Prune as we go: a tab that was closed without a pagehide would
         otherwise keep the ring for ever. */
      if (key !== id && isFreshStamp(lastSeen, now, staleMs)) {
        next[key] = { visible: Boolean(value?.visible), lastSeen };
      }
    });
  }
  next[id] = { visible: Boolean(visible), lastSeen: now };
  writeJson(target, CAMPAIGN_TABS_STORAGE_KEY, next);
};

export const readRingTabs = (
  store?: MinimalStorage | null,
  now: number = Date.now(),
  staleMs: number = TAB_STALE_MS,
): RingTab[] => {
  const target = localStore(store);
  const bag = readJson(target, CAMPAIGN_TABS_STORAGE_KEY);
  if (!bag || typeof bag !== 'object') return [];
  return Object.entries(bag as Record<string, any>)
    .map(([tabId, value]) => ({
      tabId,
      visible: Boolean(value?.visible),
      lastSeen: Number(value?.lastSeen) || 0,
    }))
    .filter((tab) => isFreshStamp(tab.lastSeen, now, staleMs));
};

export const dropRingTab = (tabId: unknown, store?: MinimalStorage | null): void => {
  const id = String(tabId ?? '').trim();
  const target = localStore(store);
  if (!id || !target) return;
  const bag = readJson(target, CAMPAIGN_TABS_STORAGE_KEY);
  if (!bag || typeof bag !== 'object') return;
  const next = { ...(bag as Record<string, any>) };
  delete next[id];
  writeJson(target, CAMPAIGN_TABS_STORAGE_KEY, next);
};

/* An explicit Leave, remembered so nothing puts the agent straight back. It
   is shared across the browser's tabs on purpose: the agent left the
   campaign, not the window. */

export const rememberCampaignLeft = (
  campaignId: unknown,
  now: number = Date.now(),
  store?: MinimalStorage | null,
): void => {
  const id = String(campaignId ?? '').trim();
  const target = localStore(store);
  if (!id || !target) return;
  const bag = readJson(target, CAMPAIGN_LEFT_STORAGE_KEY);
  const next: Record<string, number> = {};
  if (bag && typeof bag === 'object') {
    Object.entries(bag as Record<string, any>).forEach(([key, value]) => {
      const at = Number(value) || 0;
      if (now - at <= LEFT_MARK_TTL_MS) next[key] = at;
    });
  }
  next[id] = now;
  writeJson(target, CAMPAIGN_LEFT_STORAGE_KEY, next);
};

export const hasCampaignLeft = (
  campaignId: unknown,
  now: number = Date.now(),
  store?: MinimalStorage | null,
): boolean => {
  const id = String(campaignId ?? '').trim();
  if (!id) return false;
  const bag = readJson(localStore(store), CAMPAIGN_LEFT_STORAGE_KEY);
  if (!bag || typeof bag !== 'object') return false;
  const at = Number((bag as Record<string, any>)[id]) || 0;
  return at > 0 && now - at <= LEFT_MARK_TTL_MS;
};

export const forgetCampaignLeft = (campaignId: unknown, store?: MinimalStorage | null): void => {
  const id = String(campaignId ?? '').trim();
  const target = localStore(store);
  if (!id || !target) return;
  const bag = readJson(target, CAMPAIGN_LEFT_STORAGE_KEY);
  if (!bag || typeof bag !== 'object') return;
  const next = { ...(bag as Record<string, any>) };
  delete next[id];
  writeJson(target, CAMPAIGN_LEFT_STORAGE_KEY, next);
};

/* ── is the ring record this browser is holding still worth anything? ────── */

/** A ring record older than a shift is not evidence of anything. */
export const RING_RECORD_TTL_MS = 12 * 60 * 60 * 1000;

export type HeldRingVerdict =
  /** Nothing is held. */
  | 'empty'
  /** The running list has not arrived, so nothing can be judged yet. */
  | 'unknown'
  /** Held, and the campaign is one this person can work right now. */
  | 'valid'
  /** Written too long ago to mean anything. */
  | 'expired'
  /** Deleted, completed, paused, or this person is no longer a member. */
  | 'campaign_gone';

/**
 * The 13 Sep lock-out.
 *
 * `mcm_campaign_ring` held `{campaignId: 6aa68597…}` for a campaign that had
 * since been DELETED. Nothing ever checked it against the server, so the
 * "you are working another campaign" guard fired on every campaign the owner
 * tried afterwards - including a brand-new one he was a member of - and the
 * only way out was clearing the browser's storage by hand. A record that
 * names a campaign the person cannot work is not a reason to refuse them; it
 * is rubbish, and it is dropped.
 *
 * Judged only once the workable list is known, so a page that is still
 * loading never throws away a good record.
 */
export const checkHeldRingRecord = (input: {
  record: { campaignId?: unknown; at?: unknown } | null | undefined;
  /** Ids of the campaigns this person is assigned to and could work now. */
  workableCampaignIds: Iterable<unknown>;
  /** False while that list has not arrived. */
  listIsKnown: boolean;
  now?: number;
  ttlMs?: number;
}): HeldRingVerdict => {
  const held = String(input.record?.campaignId ?? '').trim();
  if (!held) return 'empty';

  const now = Number(input.now) || Date.now();
  const ttl = Number(input.ttlMs) || RING_RECORD_TTL_MS;
  if (!isFreshStamp(Number(input.record?.at) || 0, now, ttl)) return 'expired';

  if (!input.listIsKnown) return 'unknown';

  for (const id of input.workableCampaignIds || []) {
    if (String(id ?? '').trim() === held) return 'valid';
  }
  return 'campaign_gone';
};

/** The verdicts that mean the record must be thrown away. */
export const shouldDropHeldRing = (verdict: HeldRingVerdict): boolean =>
  verdict === 'expired' || verdict === 'campaign_gone';

/** Going off duty and coming back is a fresh start, which is what the agent
 *  means by it. */
export const clearCampaignLeftMarks = (store?: MinimalStorage | null): void => {
  const target = localStore(store);
  if (!target) return;
  try {
    target.removeItem(CAMPAIGN_LEFT_STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
};
