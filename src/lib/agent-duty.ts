/* The duty axis of an agent's day, as the server reports it.
 *
 * Presence (Available / Busy / Do not disturb, src/hooks/use-my-presence.ts)
 * says what the person's phone does. Duty says whether the queues and
 * campaigns may ring them: on duty, on a break with a reason, or off duty.
 * One duty change applies to every queue the person is on. A change asked
 * for during a queue call is parked and applied when the call ends; the
 * server reports it as `pending` so both the agent and the supervisor can
 * see what comes next. */

export type Duty = 'on_duty' | 'on_break' | 'off_duty';

export interface AgentDuty {
  user_uuid: string;
  extension: string;
  name: string;
  duty: Duty;
  on_call: boolean;
  reason: string;
  reason_id: string;
  /* Epoch seconds of the last duty change. */
  since: number;
  pending: { duty: Duty; reason: string; reason_id: string; source: string } | null;
  no_answer_count: number;
  max_no_answer: number;
  missed_too_many: boolean;
  queues: number;
}

export const DUTY_LABEL: Record<Duty, string> = {
  on_duty: 'On duty',
  on_break: 'On break',
  off_duty: 'Off duty',
};

/* Same tone words the presence chip uses, so one colour means one thing. */
export const dutyTone = (duty: AgentDuty | null | undefined): 'good' | 'warn' | 'idle' | 'busy' => {
  if (!duty) return 'idle';
  if (duty.missed_too_many) return 'busy';
  if (duty.duty === 'on_duty') return 'good';
  if (duty.duty === 'on_break') return 'warn';
  return 'idle';
};

/* "On break · Lunch", "Off duty", "On duty". */
export const describeDuty = (duty: AgentDuty | null | undefined): string => {
  if (!duty) return 'Off duty';
  if (duty.duty === 'on_break') return duty.reason ? `On break · ${duty.reason}` : 'On break';
  return DUTY_LABEL[duty.duty];
};

export const describePending = (duty: AgentDuty | null | undefined): string => {
  const p = duty?.pending;
  if (!p) return '';
  if (p.duty === 'on_break') return `next: ${p.reason ? `break · ${p.reason}` : 'break'} (after this call)`;
  return `next: ${DUTY_LABEL[p.duty].toLowerCase()} (after this call)`;
};

/* Seconds in the current state; never negative, never NaN. */
export const secondsInState = (duty: AgentDuty | null | undefined, nowMs = Date.now()): number => {
  const since = Number(duty?.since) || 0;
  if (!since) return 0;
  return Math.max(0, Math.floor(nowMs / 1000) - since);
};

export const clock = (seconds: number): string => {
  /* NaN (a report row with no figure) showed as "NaN:NaN"; it reads as 0:00. */
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};

/* A soft limit: how far over the reason's allowance a break is, in whole
   minutes, or 0. Nothing is enforced by this - the number is shown to the
   agent and the supervisor and counted later. */
export const overBy = (
  duty: AgentDuty | null | undefined,
  limitMinutes: number | null | undefined,
  nowMs = Date.now(),
): number => {
  if (!duty || duty.duty !== 'on_break' || !limitMinutes || limitMinutes <= 0) return 0;
  const over = secondsInState(duty, nowMs) - limitMinutes * 60;
  return over > 0 ? Math.ceil(over / 60) : 0;
};

/* Missed-call feedback (the queue engine's max_no_answer). The engine stops
   offering calls after N unanswered rings in a row and says nothing; the
   duty list carries the count, and the person clears it with "Ready again"
   (the duty action `ready`, which resets the count on every row). */
export const missedCallNotice = (duty: AgentDuty | null | undefined): string | null => {
  if (!duty?.missed_too_many) return null;
  const n = Number(duty.no_answer_count) || 0;
  return `You missed ${n} queue call${n === 1 ? '' : 's'} in a row, so calls are not being offered to you.`;
};

/* Fired on window by the dialpad when an incoming call ends without being
   answered - the very moment the engine counts a miss - so the duty list is
   re-read straight away instead of at the next timed refresh. */
export const INCOMING_UNANSWERED_EVENT = 'mcm:incoming-call-unanswered';
export const MISSED_REFETCH_DELAY_MS = 2500;
