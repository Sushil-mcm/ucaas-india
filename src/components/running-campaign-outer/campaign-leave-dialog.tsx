import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAgentDuty, useBreakReasons } from '@/hooks/use-agent-duty';
import {
  LEAVE_CHOICES,
  leaveBreakReasons,
  leaveDutyChange,
  leaveOutcomeSentence,
  type LeaveChoice,
} from '@/lib/campaign-leave';

/* What happens when an agent presses Leave on a campaign card.
 *
 * Leave used to take the person off the campaign and say nothing about their
 * duty, so somebody who left to go on a break stayed "on duty" on every other
 * queue and in every report. The owner's rule (14 Sep 2026): ask why, and put
 * them on a break, away from the desk, or off duty accordingly.
 *
 * Four answers. The fourth - moving to another campaign - is why this is a
 * question and not an automatic break: an agent switching campaigns is still
 * working. The rules live in src/lib/campaign-leave.ts so they can be read and
 * tested without a browser; this only asks and reports. */

type Props = {
  campaignName: string;
  open: boolean;
  /** Runs the leave itself; the duty change is sent here around it. */
  onConfirm: (change: ReturnType<typeof leaveDutyChange>) => void | Promise<void>;
  onCancel: () => void;
};

const CampaignLeaveDialog = ({ campaignName, open, onConfirm, onCancel }: Props) => {
  const { reasons } = useBreakReasons();
  const { canChangeOwn, ownRefusal } = useAgentDuty();
  const [choice, setChoice] = useState<LeaveChoice>('break');
  const [reasonId, setReasonId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const breakReasons = useMemo(() => leaveBreakReasons(reasons), [reasons]);

  /* Every time the question is asked it starts from the top, so yesterday's
     answer is never sent by a stray second click. A company that locks duty
     has only one honest answer, so it is the one selected. */
  useEffect(() => {
    if (!open) return;
    setChoice(canChangeOwn ? 'break' : 'stay');
    setReasonId(breakReasons[0]?.id || '');
    setSaving(false);
  }, [open, canChangeOwn, breakReasons]);

  const change = leaveDutyChange({ choice, reasonId, reasons, canChangeOwn });
  const offered = canChangeOwn ? LEAVE_CHOICES : LEAVE_CHOICES.filter((c) => c.choice === 'stay');

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm(change);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !saving ? onCancel() : undefined)}>
      <DialogContent className="mcm-dialog mcm-ws-leave w-full gap-3 sm:max-w-[30rem]">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base">Leaving {campaignName || 'this campaign'}</DialogTitle>
          <DialogDescription className="text-sm">
            {canChangeOwn
              ? 'What are you doing? Your duty is set to match, so the reports and the dialer agree with you.'
              : ownRefusal || 'Your supervisor sets your status, so leaving does not change it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {offered.map((item) => {
            const on = choice === item.choice;
            return (
              <div key={item.choice} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setChoice(item.choice)}
                  aria-pressed={on}
                  className={`mcm-ws-leave-choice w-full rounded-lg border px-3 py-2 text-left transition ${
                    on
                      ? 'is-on border-blue-300 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs text-gray-500">{item.detail}</span>
                </button>

                {/* The reasons only matter for a break, and only once it is
                    chosen: a list of seven codes above an unmade decision is
                    noise. */}
                {on && item.choice === 'break' && breakReasons.length > 1 ? (
                  <div className="mt-2 flex flex-wrap gap-2 pl-3">
                    {breakReasons.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setReasonId(r.id)}
                        aria-pressed={reasonId === r.id}
                        className={`mcm-ws-leave-reason rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          reasonId === r.id
                            ? 'is-on border-blue-300 bg-white text-blue-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="text-sm text-gray-600">
          You will be taken off {campaignName || 'the campaign'}. {leaveOutcomeSentence(change)}
        </p>

        <DialogFooter className="sm:flex-row sm:justify-end">
          <button type="button" className="btn ghost" disabled={saving} onClick={onCancel}>
            Stay on the campaign
          </button>
          <button type="button" className="btn primary" disabled={saving} onClick={confirm}>
            {saving ? 'Leaving…' : 'Leave'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignLeaveDialog;
