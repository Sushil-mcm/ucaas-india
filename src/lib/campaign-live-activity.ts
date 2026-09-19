/**
 * What the campaign is doing THIS SECOND, said to the agent.
 *
 * The supervisor's campaign page has a live dial log; the agent had "Standing
 * by / Waiting for call" and nothing else, so on 13 Sep the owner watched the
 * dialer place, ring and connect calls while the agent screen said only that it
 * was waiting. The engine already pushes everything needed on
 * "campaign-live-stats" - the same board the campaign page reads - so this
 * turns that board into one honest sentence for the person waiting.
 *
 * Nothing here fetches or polls: it is a pure reading of the last board the
 * page already received, plus the reason the card already works out for itself
 * when there is nothing to say (campaign-window.ts / campaign-skip-reasons.ts).
 */

export type CampaignActivityPhase =
  | 'offering_me'
  | 'talking'
  | 'offering'
  | 'answered'
  | 'ringing'
  | 'dialing'
  | 'idle'
  /** No usable board: say nothing about the present, fall back to the reason. */
  | 'unknown';

export type CampaignActivity = {
  phase: CampaignActivityPhase;
  /** The short line: "Ringing Owner test 3…". '' when nothing can be claimed. */
  headline: string;
  /** The quieter second line. */
  detail: string;
  tone: 'live' | 'warn' | 'idle';
  /** True when this comes from a board fresh enough to describe the present. */
  fromLiveBoard: boolean;
};

/** A board older than this is history, not the present. */
export const LIVE_BOARD_MAX_AGE_MS = 30000;

const clean = (value: unknown): string => String(value ?? '').trim();

const PHASE_RANK: Record<string, number> = {
  dialing: 1,
  ringing: 2,
  answered: 3,
  offering: 4,
  talking: 5,
};

const who = (call: any): string =>
  clean(call?.contactName) || clean(call?.phone) || 'this contact';

export const describeCampaignActivity = (input: {
  /** The last "campaign-live-stats" payload, with `receivedAt` stamped on arrival. */
  live: any;
  /** The campaign the agent is actually on. */
  campaignId: unknown;
  /** This agent's extension, to spot a call being offered to them. */
  myExtension?: unknown;
  /** What the card already knows about why nothing is happening. */
  idleReason?: unknown;
  now?: number;
  maxAgeMs?: number;
}): CampaignActivity => {
  const now = Number(input.now ?? Date.now());
  const maxAge = Number(input.maxAgeMs ?? LIVE_BOARD_MAX_AGE_MS);
  const live = input.live;
  const campaignId = clean(input.campaignId);
  const idleReason = clean(input.idleReason);

  const boardCampaignId = clean(live?.campaignId);
  const receivedAt = Number(live?.receivedAt || 0);
  const isFresh =
    Boolean(live) &&
    Boolean(campaignId) &&
    boardCampaignId === campaignId &&
    Number.isFinite(receivedAt) &&
    receivedAt > 0 &&
    now - receivedAt <= maxAge;

  if (!isFresh) {
    return {
      phase: 'unknown',
      headline: '',
      detail: idleReason,
      tone: 'idle',
      fromLiveBoard: false,
    };
  }

  const rows: any[] = Array.isArray(live?.calls?.rows) ? live.calls.rows : [];
  const inFlight = rows.filter((row) => clean(row?.status) && clean(row?.status) !== 'ended');

  const myExtension = clean(input.myExtension);
  const mine =
    myExtension &&
    inFlight.find(
      (row) =>
        clean(row?.agentExtension) === myExtension &&
        ['offering', 'talking'].includes(clean(row?.status)),
    );

  if (mine && clean(mine.status) === 'offering') {
    return {
      phase: 'offering_me',
      headline: 'Offering you a call',
      detail: `${who(mine)} is on the line — answer to take it.`,
      tone: 'live',
      fromLiveBoard: true,
    };
  }
  if (mine && clean(mine.status) === 'talking') {
    return {
      phase: 'talking',
      headline: `Connected — ${who(mine)}`,
      detail: '',
      tone: 'live',
      fromLiveBoard: true,
    };
  }

  if (!inFlight.length) {
    return {
      phase: 'idle',
      headline: 'Standing by',
      detail: idleReason || 'The dialer has no call out for this campaign right now.',
      tone: 'idle',
      fromLiveBoard: true,
    };
  }

  const furthest = inFlight.reduce((best, row) =>
    (PHASE_RANK[clean(row?.status)] || 0) > (PHASE_RANK[clean(best?.status)] || 0) ? row : best,
  );
  const others = inFlight.length > 1 ? ` (+${inFlight.length - 1} more out)` : '';

  switch (clean(furthest?.status)) {
    case 'talking':
      return {
        phase: 'talking',
        headline: `${who(furthest)} is talking to an agent`,
        detail: `You are next in line.${others}`,
        tone: 'live',
        fromLiveBoard: true,
      };
    case 'offering':
      return {
        phase: 'offering',
        headline: `Offering ${who(furthest)} to an agent`,
        detail: others.trim(),
        tone: 'warn',
        fromLiveBoard: true,
      };
    case 'answered':
      return {
        phase: 'answered',
        headline: `${who(furthest)} answered`,
        detail: `Looking for a free agent.${others}`,
        tone: 'warn',
        fromLiveBoard: true,
      };
    case 'ringing':
      return {
        phase: 'ringing',
        headline: `Ringing ${who(furthest)}…`,
        detail: others.trim(),
        tone: 'live',
        fromLiveBoard: true,
      };
    default:
      return {
        phase: 'dialing',
        headline: `Calling ${who(furthest)}…`,
        detail: others.trim(),
        tone: 'live',
        fromLiveBoard: true,
      };
  }
};
