/**
 * What will actually happen when you press Start.
 *
 * A campaign that is "Running" and dialling nobody is the single most
 * expensive silence in this product: on 13 Sep 2026 a preview campaign sat on
 * Running for half an hour, placed no call, and nothing on the list said why.
 * Every fact needed to predict that was already known before the button was
 * pressed - the campaign's own dial method, its calling hours, the contacts it
 * had ready, and whether a single person had joined it.
 *
 * So this module answers the question the button should have answered: after
 * you press Start, will anything be called, and if not, what is missing. It is
 * a pure function of the campaign document and the dialer engine's own board,
 * so the answer it gives and the answer the engine acts on come from the same
 * numbers rather than from two guesses.
 *
 * The wording is deliberately flat. "The system will not dial" is a fact about
 * preview, not a fault, and a panel that cries about it every time would be
 * dismissed unread by the third campaign.
 */

import { campaignWindow } from './campaign-window';

export type PreflightState = 'ok' | 'warn' | 'blocked' | 'unknown';

export type PreflightCheck = {
  key: 'mode' | 'window' | 'contacts' | 'agents';
  label: string;
  state: PreflightState;
  text: string;
};

export type CampaignPreflight = {
  mode: string;
  /** Does the SERVER place the calls, or does a person place each one? */
  serverDials: boolean;
  /** The one sentence to lead with: the worst thing found, said plainly. */
  headline: string;
  tone: 'good' | 'warn' | 'crit';
  checks: PreflightCheck[];
  confirmLabel: string;
};

type Board = {
  leads?: { due?: unknown; pending?: unknown; total?: unknown; callbacks?: unknown } | null;
  agents?: { total?: unknown; idle?: unknown; notJoined?: unknown } | null;
} | null;

/* A count we can believe, or null. `0` is a real answer and must survive; an
   absent board must not read as zero of everything, which would accuse a
   perfectly healthy campaign of having no contacts. */
const count = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const MODE_TEXT: Record<string, { state: PreflightState; text: string }> = {
  PREVIEW: {
    state: 'warn',
    text: 'The system will not dial. An agent opens the campaign, reads the contact, and places each call themselves.',
  },
  PROGRESSIVE: {
    state: 'ok',
    text: 'The system dials one contact for every agent who is free.',
  },
  PREDICTIVE: {
    state: 'ok',
    text: 'The system dials ahead of the agents who are free.',
  },
  INBOUND: {
    state: 'ok',
    text: 'This is an inbound line. It receives calls; it never dials out.',
  },
};

export const campaignPreflight = ({
  campaign,
  board = null,
  now = new Date(),
}: {
  campaign: any;
  board?: Board;
  now?: Date;
}): CampaignPreflight => {
  const mode = String(campaign?.dialMethod || '').toUpperCase();
  const serverDials = mode === 'PROGRESSIVE' || mode === 'PREDICTIVE';
  const isInbound = mode === 'INBOUND';
  const checks: PreflightCheck[] = [];

  /* ── 1. what this campaign's mode means ─────────────────────────────── */
  const modeText = MODE_TEXT[mode];
  checks.push({
    key: 'mode',
    label: 'How calls are placed',
    state: modeText?.state ?? 'unknown',
    text: modeText?.text ?? 'This campaign has no dial method set.',
  });

  /* ── 2. the calling window, judged the way the engine judges it ─────── */
  const window = campaignWindow(campaign, now);
  checks.push({
    key: 'window',
    label: 'Calling hours',
    state: window.open ? 'ok' : 'blocked',
    text: window.open
      ? `${window.reason} Times are ${window.timezone}.`
      : `${window.reason} Starting it now will not place a call until the window opens. Times are ${window.timezone}.`,
  });

  /* ── 3. contacts ────────────────────────────────────────────────────── */
  const due = count(board?.leads?.due);
  const pending = count(board?.leads?.pending);
  if (isInbound) {
    checks.push({
      key: 'contacts',
      label: 'Contacts',
      state: 'ok',
      text: 'An inbound line calls nobody, so it needs no contact list.',
    });
  } else if (due === null) {
    checks.push({
      key: 'contacts',
      label: 'Contacts',
      state: 'unknown',
      /* Said rather than hidden: the engine only builds a board for a campaign
         it is holding, so before the first Start there is genuinely nothing to
         report, and a confident "0 contacts" here would be a lie. */
      text: 'Not counted yet. The dialer reports this once the campaign is running.',
    });
  } else if (due > 0) {
    checks.push({
      key: 'contacts',
      label: 'Contacts',
      state: 'ok',
      text: `${plural(due, 'contact is', 'contacts are')} ready to be called now.`,
    });
  } else if ((pending ?? 0) > 0) {
    checks.push({
      key: 'contacts',
      label: 'Contacts',
      state: 'warn',
      text: `No contact is due yet. ${plural(pending as number, 'contact is', 'contacts are')} waiting for a retry time or a callback.`,
    });
  } else {
    checks.push({
      key: 'contacts',
      label: 'Contacts',
      state: 'blocked',
      text: 'There is no contact left to call on this campaign.',
    });
  }

  /* ── 4. people ──────────────────────────────────────────────────────── */
  const total = count(board?.agents?.total);
  const idle = count(board?.agents?.idle);
  const notJoined = count(board?.agents?.notJoined);
  const joined = total === null ? null : Math.max(0, total - (notJoined ?? 0));
  if (isInbound) {
    checks.push({
      key: 'agents',
      label: 'People',
      state: joined !== null && joined === 0 ? 'warn' : 'ok',
      text:
        joined !== null && joined === 0
          ? 'Nobody is on this line yet, so a caller will wait.'
          : 'People are on the line to take calls.',
    });
  } else if (total === null) {
    checks.push({
      key: 'agents',
      label: 'People',
      state: 'unknown',
      text: 'Not counted yet. The dialer reports this once the campaign is running.',
    });
  } else if (total === 0) {
    checks.push({
      key: 'agents',
      label: 'People',
      state: 'blocked',
      text: 'Nobody is assigned to this campaign. Add people to it before starting.',
    });
  } else if (!serverDials && (joined ?? 0) === 0) {
    /* The exact case that cost half an hour: preview, people assigned, nobody
       in the dialer. The campaign runs and calls nobody, for ever. */
    checks.push({
      key: 'agents',
      label: 'People',
      state: 'blocked',
      text: `Nobody has joined the campaign yet. ${plural(total, 'person is', 'people are')} assigned, but in this mode a call only happens when one of them opens the campaign.`,
    });
  } else if (serverDials && (idle ?? 0) === 0) {
    checks.push({
      key: 'agents',
      label: 'People',
      state: 'warn',
      text: 'No agent is free right now. Dialling begins as soon as one is.',
    });
  } else {
    checks.push({
      key: 'agents',
      label: 'People',
      state: 'ok',
      text: serverDials
        ? `${plural(idle as number, 'agent is', 'agents are')} free to take a call.`
        : `${plural(joined as number, 'agent has', 'agents have')} joined the campaign.`,
    });
  }

  /* ── the verdict: the worst thing found, in its own words ───────────── */
  const blocked = checks.find((check) => check.state === 'blocked');
  const warned = checks.find((check) => check.state === 'warn');
  const headline = blocked
    ? blocked.text
    : warned
      ? warned.text
      : isInbound
        ? 'The line will be open to callers.'
        : 'The campaign will start dialling.';
  const tone: CampaignPreflight['tone'] = blocked ? 'crit' : warned ? 'warn' : 'good';

  return {
    mode,
    serverDials,
    headline,
    tone,
    checks,
    confirmLabel: blocked ? 'Start anyway' : 'Start campaign',
  };
};
