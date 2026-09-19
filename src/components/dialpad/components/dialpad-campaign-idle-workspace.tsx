import { useEffect, useMemo, useState } from 'react';
import { Clock3, Headphones, Coffee, PhoneCall, Info } from 'lucide-react';

import DialpadWorkList from './dialpad-work-list';
import { useAgentDayToday } from '@/hooks/use-agent-day';
import { useAgentDuty } from '@/hooks/use-agent-duty';
import { DUTY_LABEL } from '@/lib/agent-duty';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';

/**
 * What the agent looks at between calls on the full-page campaign dialer.
 *
 * The pane to the right of the dialer used to render the lead's tabs whatever
 * was happening, so an agent with no call in front of them got a full screen
 * of white and one grey sentence saying the lead had no details - on a screen
 * whose whole job is to tell them where their shift stands.
 *
 * Everything here is read from something real: the duty rows for the day so
 * far, the work list for who is waiting, the campaign record for what the
 * dialer is doing. Nothing is estimated, and a figure that has not loaded says
 * so rather than showing a zero that looks like a fact.
 */

type IdleWorkspaceProps = {
  campaign: any;
  className?: string;
};

const clockText = (seconds: unknown): string => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m`;
  return total > 0 ? `${total}s` : '0m';
};

const MODE_LABEL: Record<string, string> = {
  PREVIEW: 'Preview',
  PROGRESSIVE: 'Progressive',
  PREDICTIVE: 'Predictive',
  INBOUND: 'Inbound',
};

const STATE_TONE: Record<string, string> = {
  PROCESSING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NEW: 'bg-sky-50 text-sky-700 border-sky-200',
  PAUSE: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATE_LABEL: Record<string, string> = {
  PROCESSING: 'Running',
  NEW: 'Not started',
  PAUSE: 'Paused',
  COMPLETED: 'Finished',
};

const Tile = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="min-w-0 rounded-xl border border-[#e3ecfb] bg-white px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#7e93b2]">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <p className="mt-1 text-[19px] font-semibold leading-none text-[#17385e] tabular-nums">{value}</p>
    {hint ? <p className="mt-1 truncate text-[11px] text-[#8598b6]">{hint}</p> : null}
  </div>
);

const DialpadCampaignIdleWorkspace = ({ campaign, className = '' }: IdleWorkspaceProps) => {
  const { user } = useUser();
  const duty = useAgentDuty();
  const { setDuty, canChangeOwn } = duty;
  const day = useAgentDayToday();

  /* A clock that ticks is the cheapest possible proof the screen is alive -
     the 12 Sep complaint was that a still screen looks like a broken one.
     On 14 Sep it was found stuck at 07:44 while the wall clock said 08:19:
     a 30 s interval is exactly the kind of timer a browser throttles or
     drops for a background tab, and a minute-only readout hides a stall
     for up to a minute even when it works. Now: seconds are shown, the tick
     is every second, and the clock resyncs the moment the tab is looked at
     again - so a stall is visible within a second and never survives a
     tab switch. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, []);

  const myUuid = String(duty.myUuid || (user as any)?.uuid || (user as any)?.user_uuid || '');
  const today = myUuid ? day.byUser?.[myUuid] : null;

  const campaignName = String(campaign?.campaignName || campaign?.name || '').trim();
  const mode = String(campaign?.dialMethod || '').toUpperCase();
  const state = String(campaign?.campaignStatus || '').toUpperCase();

  /* The duty row carries `duty` (on_duty / on_break / off_duty), not the queue
     row's `status`. Reading `status` here meant this screen said "Off duty" to
     everybody, for ever - including someone who had just pressed Go on duty and
     whose shift clock, two boxes away, was counting up. */
  const dutyLabel = useMemo(() => {
    const mine = duty.mine;
    if (!mine) return '';
    if (mine.duty === 'on_break') return mine.reason ? `On break — ${mine.reason}` : 'On break';
    return DUTY_LABEL[mine.duty] || 'Off duty';
  }, [duty.mine]);

  /* Off duty and on break are different repairs: one starts the shift, the
     other ends a break. Both leave the person not being offered contacts. */
  const onBreak = dutyLabel.startsWith('On break');
  const offDuty = Boolean(dutyLabel) && dutyLabel !== 'On duty';

  const dutyTone =
    dutyLabel === 'On duty'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : dutyLabel.startsWith('On break')
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';

  /* Said plainly, and only what is actually true of this moment. */
  const nextUp = useMemo(() => {
    if (state === 'PAUSE') return 'This campaign is paused, so no contact will arrive until somebody resumes it.';
    if (state === 'COMPLETED') return 'This campaign has finished. Nothing further will be offered here.';
    if (dutyLabel && dutyLabel !== 'On duty')
      return 'You are not on duty, so the dialer is not counting you as free. Go on duty to start receiving contacts.';
    if (mode === 'PREVIEW') return 'The next contact appears on the left with a countdown. You choose to call or skip.';
    if (mode === 'INBOUND') return 'This is an inbound campaign: calls arrive when a customer rings the campaign number.';
    return 'The dialer places the call and connects you once a person answers. There is nothing to dial by hand.';
  }, [state, dutyLabel, mode]);

  return (
    <section
      className={cn(
        'flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto rounded-xl bg-[#f7faff] p-3',
        className,
      )}
    >
      {/* Where the shift stands, in one line */}
      <header className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e3ecfb] bg-white px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#17385e]">
            {campaignName || 'Campaign'}
          </p>
          <p className="text-[11px] text-[#7e93b2]">
            {MODE_LABEL[mode] || 'Campaign'} dialler
          </p>
        </div>
        {state ? (
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
              STATE_TONE[state] || 'bg-slate-100 text-slate-600 border-slate-200',
            )}
          >
            {STATE_LABEL[state] || state}
          </span>
        ) : null}
        {dutyLabel ? (
          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', dutyTone)}>
            {dutyLabel}
          </span>
        ) : null}
        <span className="rounded-lg bg-[#f2f6fd] px-2.5 py-1 text-[12px] font-semibold text-[#4a6489] tabular-nums">
          {new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now)}
        </span>
      </header>

      {/* The day so far, from the duty history rather than anything guessed */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile
          icon={<Clock3 className="h-3 w-3" />}
          label="On duty"
          value={today ? clockText(today.on_duty_s) : day.isPending ? '—' : '0m'}
          hint={day.isError ? 'could not be read' : 'today so far'}
        />
        <Tile
          icon={<Headphones className="h-3 w-3" />}
          label="On calls"
          value={today ? clockText(today.on_call_s) : day.isPending ? '—' : '0m'}
          hint="campaign calls"
        />
        <Tile
          icon={<Coffee className="h-3 w-3" />}
          label="Breaks"
          value={today ? clockText(today.break_s) : day.isPending ? '—' : '0m'}
          hint={
            today && Array.isArray(today.breaks) && today.breaks.length
              ? today.breaks.map((b: any) => b.reason).filter(Boolean).join(', ')
              : 'none yet'
          }
        />
        <Tile
          icon={<PhoneCall className="h-3 w-3" />}
          label="Caller ID"
          value={String((campaign?.callerId || [])[0] || '—')}
          hint="what the customer sees"
        />
      </div>

      {/* Who is actually waiting for this person right now */}
      <DialpadWorkList framed />

      {/* Why the screen is quiet, said rather than left to be guessed at — and,
          when the reason is the person's own duty, the way to fix it right here.
          Sending somebody to the header chip to do it was a step they had to be
          told about, on the one screen where they are waiting to work. */}
      <div className="flex items-start gap-2 rounded-xl border border-[#dce8fb] bg-[#f2f7ff] px-3 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-[#4a7fd4]" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[#3f5b81]">{nextUp}</p>
          {offDuty && canChangeOwn ? (
            <button
              type="button"
              onClick={() => setDuty({ action: onBreak ? 'ready' : 'start' })}
              className="h-8 flex-none rounded-lg border border-[#d4e1f6] bg-white px-3 text-[12px] font-semibold text-[#2f4f79] transition hover:bg-[#f3f7ff]"
            >
              {onBreak ? 'End break' : 'Go on duty'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default DialpadCampaignIdleWorkspace;
