import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAgentDuty, useBreakReasons } from '@/hooks/use-agent-duty';
import { pickableReasons } from '@/lib/break-reasons';
import {
  clock,
  describeDuty,
  describePending,
  dutyTone,
  missedCallNotice,
  overBy,
  secondsInState,
} from '@/lib/agent-duty';

/* The duty chip in the header: On duty / On break · Lunch / Off duty, with the
   running clock, and the three acts an agent has in a day - start the shift,
   take a break with a reason, end the shift. It sits beside the avatar, whose
   menu owns PRESENCE (Available / Busy / Do not disturb); the two are
   different axes and neither writes the other.

   The clock goes amber when a break passes its reason's soft allowance.
   Nothing is forced: the sentence is the enforcement, and the supervisor sees
   the same number on Performance › Agents. */
const TONE_CLASS: Record<string, string> = {
  good: 'bg-green-100 text-green-800 border-green-200',
  warn: 'bg-amber-100 text-amber-800 border-amber-200',
  busy: 'bg-red-100 text-red-800 border-red-200',
  idle: 'bg-gray-100 text-gray-700 border-gray-200',
};

const DutyControl = () => {
  const { mine, setDuty, isSaving, isLoading, canChangeOwn, ownRefusal } = useAgentDuty();
  const { reasons } = useBreakReasons();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* Not on any queue: nothing to be on duty for, so no chip. */
  if (!isLoading && !mine) return null;

  const reason = reasons.find((r) => r.id === mine?.reason_id || r.name === mine?.reason);
  const over = overBy(mine, reason?.limit_minutes ?? null, now);
  const tone = over ? 'warn' : dutyTone(mine);
  const seconds = secondsInState(mine, now);
  const pending = describePending(mine);
  const act = (action: 'start' | 'break' | 'end' | 'ready', r?: { id: string; name: string }) => {
    setDuty({ action, ...(r ? { reason_id: r.id, reason: r.name } : {}) });
    setOpen(false);
  };

  const chipBody = (
    <>
      <span className="w-2 h-2 rounded-full bg-current opacity-80" aria-hidden="true" />
      <span>{mine ? describeDuty(mine) : 'Duty'}</span>
      {mine && mine.since ? (
        <span className="tabular-nums font-normal opacity-80">{clock(seconds)}</span>
      ) : null}
      {over ? <span className="font-normal">· over by {over} min</span> : null}
      {mine?.missed_too_many ? (
        <span className="font-normal">· missed {mine.no_answer_count} calls</span>
      ) : null}
    </>
  );

  /* Under the company lock (Company › Duty policy) an agent's chip is a
     read-out: the state, the clock, and the sentence saying who sets it.
     The server refuses the change too; this only stops the menu from
     offering what would be refused. */
  if (!canChangeOwn) {
    return (
      <div
        className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${TONE_CLASS[tone]}`}
        title={ownRefusal || 'Your supervisor sets your status'}
        aria-disabled="true"
      >
        {chipBody}
        <span className="font-normal opacity-80">· {ownRefusal || 'Your supervisor sets your status'}</span>
      </div>
    );
  }
  const missed = missedCallNotice(mine);

  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* Said in the open, not behind the chip: the engine has stopped
          offering this person calls and nothing else on the screen says so.
          One press puts them back. */}
      {missed ? (
        <div
          className="inline-flex max-w-[360px] items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5"
          role="status"
        >
          <span className="truncate text-xs font-medium text-red-700" title={missed}>
            {missed}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-60"
            disabled={isSaving}
            onClick={() => act('ready')}
          >
            Ready again
          </button>
        </div>
      ) : null}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${TONE_CLASS[tone]}`}
        title={
          pending ||
          (over
            ? `Over the ${reason?.limit_minutes} minute allowance by ${over} min`
            : 'Your duty for the queues and campaigns')
        }
      >
        {chipBody}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 mt-2 shadow-xl ring-1 ring-black/5 flex flex-col gap-2">
        <div className="text-sm font-semibold text-gray-900">{mine ? describeDuty(mine) : 'Duty'}</div>
        {pending ? <div className="text-xs text-amber-700">{pending}</div> : null}
        {over ? (
          <div className="text-xs text-amber-700">
            Your {reason?.name?.toLowerCase() || 'break'} allowance is {reason?.limit_minutes} minutes.
            You are over by {over} min.
          </div>
        ) : null}
        {mine?.missed_too_many ? (
          <div className="text-xs text-red-700">
            You missed {mine.no_answer_count} queue calls in a row, so calls are not being offered to
            you. Press Ready again when you are back.
          </div>
        ) : null}
        <div className="flex flex-col gap-1 pt-1 border-t border-gray-100">
          {mine?.missed_too_many ? (
            <button
              type="button"
              className="text-left text-sm px-2 py-1.5 rounded-lg hover:bg-gray-100"
              disabled={isSaving}
              onClick={() => act('ready')}
            >
              Ready again
            </button>
          ) : null}
          {mine?.duty !== 'on_duty' ? (
            <button
              type="button"
              className="text-left text-sm px-2 py-1.5 rounded-lg hover:bg-gray-100"
              disabled={isSaving}
              onClick={() => act('start')}
            >
              {mine?.duty === 'on_break' ? 'Back from break' : 'Start shift'}
            </button>
          ) : null}
          {mine?.duty !== 'off_duty' ? (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 px-2 pt-1">
                Take a break
              </span>
              {pickableReasons(reasons).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="text-left text-sm px-2 py-1.5 rounded-lg hover:bg-gray-100 flex items-center justify-between"
                  disabled={isSaving || (mine?.duty === 'on_break' && mine?.reason_id === r.id)}
                  onClick={() => act('break', r)}
                >
                  <span>{r.name}</span>
                  {r.limit_minutes ? (
                    <span className="text-xs text-gray-500">{r.limit_minutes} min</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          {mine?.duty !== 'off_duty' ? (
            <button
              type="button"
              className="text-left text-sm px-2 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
              disabled={isSaving}
              onClick={() => act('end')}
            >
              End shift
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-gray-500">
          Duty is about the queues and campaigns. Your presence (Available, Busy, Do not disturb)
          is on your avatar.
        </p>
      </PopoverContent>
    </Popover>
    </div>
  );
};

export default DutyControl;
