import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loader from '@/components/custom/loader';
import { SectionHeading } from './section-heading';
import { SectionActions } from './section-actions';
import { handleAlert } from '@/lib/utils';
import { saveSection } from '@/lib/company-settings-api';
import { BREAK_REASONS_SECTION, BreakReason, LIMIT_RANGE, newReasonId } from '@/lib/break-reasons';
import { ACTIVITY_CATEGORIES, categoryOf } from '@/lib/break-reasons';
import { BREAK_REASONS_QUERY_KEY, useBreakReasons } from '@/hooks/use-agent-duty';
import CompanyQueueGrace from './company-queue-grace';

/* Company › Break reasons.
 *
 * The list an agent picks from when they step away: Lunch and Break are built
 * in and cannot be removed (renaming is fine); the company adds its own -
 * Training, Meeting, Coaching. Each reason carries a SOFT allowance in
 * minutes: the agent's clock goes amber past it and the supervisor sees
 * "over by N"; nothing forces anybody back. One list for the whole company,
 * never per queue or campaign. */
const CompanyBreakReasons = () => {
  const queryClient: any = useQueryClient();
  const { reasons: saved, version, isLoading, isError, refetch } = useBreakReasons();
  const [reasons, setReasons] = useState<BreakReason[]>([]);
  const [dirty, setDirty] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!dirty) setReasons(saved);
  }, [saved, dirty]);

  const update = (id: string, patch: Partial<BreakReason>) => {
    setReasons((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  const remove = (id: string) => {
    setReasons((prev) => prev.filter((r) => r.id !== id));
    setDirty(true);
  };
  const add = () => {
    const name = newName.trim().slice(0, 50);
    if (name.length < 2) return;
    if (reasons.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      handleAlert({ type: 'error', text: `"${name}" is already a reason.` });
      return;
    }
    setReasons((prev) => [
      ...prev,
      { id: newReasonId(name, prev), name, limit_minutes: 15, max_per_day: null, built_in: false, category: 'break', paid: true, counts_as_work: false, shrinkage: 'planned', agent_may_pick: true },
    ]);
    setNewName('');
    setDirty(true);
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      saveSection({
        section: BREAK_REASONS_SECTION,
        settings: { schema_version: 1, reasons },
        ...(typeof version === 'number' ? { version } : {}),
      }),
    onSuccess: () => {
      handleAlert({ type: 'success', text: 'Break reasons saved' });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: BREAK_REASONS_QUERY_KEY });
    },
  });

  if (isLoading) return <Loader />;
  if (isError) {
    return (
      <div className="p-4 text-sm text-red-600">
        Could not load break reasons.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        icon={<Coffee size={20} />}
        title="Activity codes"
        description="What a person can be doing when not on a call: Lunch and Break are built in and picked on the chip; codes with 'Agent may pick' off (training, meetings, time off) are placed by a schedule instead. The category decides paid, work and shrinkage defaults. Lunch and Break are built in. The minutes are an allowance, not a cut-off: past it the agent's clock turns amber and supervisors see how far over they are. One list for the whole company."
      />
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_150px_120px_120px_70px_70px_90px_80px] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
          <span>Code</span>
          <span>Category</span>
          <span>Allowance (min)</span>
          <span>Max per day</span>
          <span>Paid</span>
          <span>Work</span>
          <span>Agent may pick</span>
          <span />
        </div>
        {reasons.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_150px_120px_120px_70px_70px_90px_80px] gap-3 items-center px-4 py-2 border-b last:border-b-0 border-gray-100"
          >
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={r.name}
                maxLength={50}
                onChange={(e) => update(r.id, { name: e.target.value })}
              />
              {r.built_in ? (
                <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded-full px-1.5 whitespace-nowrap">
                  built in
                </span>
              ) : null}
            </div>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={r.category}
              aria-label={`Category of ${r.name}`}
              onChange={(e) => {
                const c = categoryOf(e.target.value);
                update(r.id, { category: c.key, paid: c.paid, counts_as_work: c.work, shrinkage: c.shrinkage });
              }}
            >
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <Input
              type="number"
              min={LIMIT_RANGE.min}
              max={LIMIT_RANGE.max}
              placeholder="none"
              value={r.limit_minutes ?? ''}
              onChange={(e) => {
                const v = Number(e.target.value);
                update(r.id, {
                  limit_minutes:
                    e.target.value === '' || !Number.isFinite(v) || v <= 0
                      ? null
                      : Math.min(LIMIT_RANGE.max, Math.round(v)),
                });
              }}
            />
            <Input
              type="number"
              min={1}
              max={20}
              placeholder="no cap"
              value={r.max_per_day ?? ''}
              onChange={(e) => {
                const v = Number(e.target.value);
                update(r.id, {
                  max_per_day:
                    e.target.value === '' || !Number.isFinite(v) || v <= 0
                      ? null
                      : Math.min(20, Math.round(v)),
                });
              }}
            />
            <input type="checkbox" aria-label={`${r.name} is paid`} checked={r.paid} onChange={(e) => update(r.id, { paid: e.target.checked })} />
            <input type="checkbox" aria-label={`${r.name} counts as work`} checked={r.counts_as_work} onChange={(e) => update(r.id, { counts_as_work: e.target.checked })} />
            <input type="checkbox" aria-label={`Agents may pick ${r.name}`} checked={r.agent_may_pick} onChange={(e) => update(r.id, { agent_may_pick: e.target.checked })} />
            <div className="flex justify-end">
              {r.built_in ? (
                <span className="text-[11px] text-gray-400" title="Built in: it can be renamed, not removed.">
                  —
                </span>
              ) : (
                <button
                  type="button"
                  className="text-xs text-red-600 underline underline-offset-2"
                  onClick={() => remove(r.id)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="w-72">
            <Input
              type="text"
              placeholder="Add a reason, e.g. Training"
              value={newName}
              maxLength={50}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-9"
            onClick={add}
            disabled={newName.trim().length < 2}
          >
            Add reason
          </Button>
        </div>
      </div>
      <SectionActions>
        <Button
          type="button"
          variant="primary"
          className="min-h-9"
          disabled={!dirty || isPending}
          onClick={() => save()}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </SectionActions>
      {/* Its own section (`queue`) and its own Save: a break reason and the
          lost-connection window are different records, and one screen must
          not save the other by accident. */}
      <CompanyQueueGrace />
    </div>
  );
};

export default CompanyBreakReasons;
