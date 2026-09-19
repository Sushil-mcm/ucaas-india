import { pickableReasons, type BreakReason } from './break-reasons';

/**
 * What "Leave" means, when an agent presses it on a campaign card.
 *
 * Until 14 Sep 2026 Leave only took the person off the campaign and left their
 * duty alone. In practice nobody leaves a campaign for no reason: they are
 * going on a break, stepping away from the desk, or finishing for the day -
 * and because none of that was recorded, the dialer kept them on duty on every
 * other queue and the duty report showed a full shift with a hole in it. So
 * Leave asks, and the answer writes the duty as well.
 *
 * Four answers, because the fourth is real: an agent moving from one campaign
 * to another is still working and must not be put on a break to do it.
 *
 * Pure: choices and reasons in, one duty change out. The screen does the
 * asking; this decides what is sent.
 */

export type LeaveChoice = 'break' | 'away' | 'off_duty' | 'stay';

export type LeaveDutyChange = {
  /** The duty API's own words: a break, or the end of the shift. */
  action: 'break' | 'end';
  reason_id?: string;
  reason?: string;
} | null;

/** Used when the company has not named a reason of its own for this. */
export const AWAY_FALLBACK_REASON = { id: 'away_from_desk', name: 'Away from desk' } as const;

/** The plainest break, for a company whose list an agent may not pick from. */
export const BREAK_FALLBACK_REASON = { id: 'break', name: 'Break' } as const;

const clean = (value: unknown): string => String(value ?? '').trim();

/**
 * The company's own "away from desk" reason when it has one, so an admin who
 * adds it with a limit and a category gets it used here without another
 * change; otherwise a plain label that still reads correctly on the chip.
 */
export const awayReason = (reasons: ReadonlyArray<BreakReason> | null | undefined): { id: string; name: string } => {
  const list = Array.isArray(reasons) ? reasons : [];
  const match = list.find((r) => /away|desk/i.test(clean(r?.name)) || /away|desk/i.test(clean(r?.id)));
  return match ? { id: match.id, name: match.name } : { ...AWAY_FALLBACK_REASON };
};

/** The break reasons this agent may choose, with a safe answer for an empty list. */
export const leaveBreakReasons = (reasons: ReadonlyArray<BreakReason> | null | undefined): Array<{ id: string; name: string }> => {
  const list = pickableReasons((Array.isArray(reasons) ? reasons : []) as BreakReason[]);
  if (!list.length) return [{ ...BREAK_FALLBACK_REASON }];
  return list.map((r) => ({ id: r.id, name: r.name }));
};

export const leaveDutyChange = (input: {
  choice: LeaveChoice;
  /** Which break reason was ticked, for the break answer. */
  reasonId?: string | null;
  reasons?: ReadonlyArray<BreakReason> | null;
  /** False when the company locks an agent out of their own duty. */
  canChangeOwn?: boolean;
}): LeaveDutyChange => {
  const choice = input.choice;
  if (choice === 'stay') return null;
  /* A company that sets its people's duty for them still lets them leave a
     campaign; it just does not let the screen write the duty. */
  if (input.canChangeOwn === false) return null;
  if (choice === 'off_duty') return { action: 'end' };
  if (choice === 'away') {
    const away = awayReason(input.reasons);
    return { action: 'break', reason_id: away.id, reason: away.name };
  }
  const offered = leaveBreakReasons(input.reasons);
  const wanted = clean(input.reasonId);
  const picked = offered.find((r) => r.id === wanted) || offered[0];
  return { action: 'break', reason_id: picked.id, reason: picked.name };
};

/** The words on the four answers, in the order they are offered. */
export const LEAVE_CHOICES: Array<{ choice: LeaveChoice; label: string; detail: string }> = [
  { choice: 'break', label: 'Taking a break', detail: 'You stay signed in. No calls are offered until you are back.' },
  { choice: 'away', label: 'Away from my desk', detail: 'Recorded as a break so the reports know where the time went.' },
  { choice: 'off_duty', label: 'Ending my shift', detail: 'Signs you off duty on every campaign and queue.' },
  { choice: 'stay', label: 'Moving to another campaign', detail: 'You stay on duty and keep taking calls from your queues.' },
];

/** One sentence for the confirmation, so the agent reads what will happen. */
export const leaveOutcomeSentence = (change: LeaveDutyChange): string => {
  if (!change) return 'You stay on duty.';
  if (change.action === 'end') return 'You will be signed off duty.';
  return `You will be on a break${change.reason ? ` — ${change.reason}` : ''}.`;
};
