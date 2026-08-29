/* What is included, what has been used, and what is left.
 *
 * This existed as two progress bars — one for calls, one for messages — and had
 * been commented out with a note saying it would come back when it was ready.
 * A bar shows roughly how full something is and nothing else: not what you were
 * given, not what you have spent, not how much is left. Somebody checking
 * whether they are about to run out cannot answer that from a bar.
 *
 * Established phone systems put this in one table with the same four columns for
 * every service, and they are right to. Four numbers on a row can be compared
 * down a column; four bars cannot be compared at all.
 *
 * A service is only listed when the plan actually includes an allowance for it.
 * Showing "Fax: 0 of 0" to somebody whose plan has no fax is noise dressed as
 * information.
 */

import { SettingCard } from '@/components/mcm/setting-card';

export interface UsageLine {
  service: string;
  /* What the plan includes for the period. */
  included: number;
  used: number;
  /* Minutes, messages, pages — whatever this service is counted in. */
  unit: string;
}

const pct = (used: number, included: number): number => {
  if (!included || included <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / included) * 100)));
};

const num = (n: number): string => (Number.isFinite(n) ? n.toLocaleString() : '0');

/* Past this, somebody needs to know before the service stops rather than after.
   80 rather than 100 because a warning that arrives at the moment you run out is
   not a warning. */
const RUNNING_LOW = 80;

const PlanUsageTable = ({ lines }: { lines: UsageLine[] }) => {
  const shown = lines.filter((l) => l.included > 0);

  return (
    <SettingCard
      title="What your plan includes"
      description="Used so far this billing period, and what is left before extra charges start."
    >
      {shown.length === 0 ? (
        <div className="py-3">
          <p className="text-xs text-gray-600">
            This plan has no included allowances — calls and messages are charged as you use them.
          </p>
        </div>
      ) : (
        <div className="scroller overflow-x-auto py-2">
          <table className="w-full min-w-[26rem] border-collapse text-sm">
            <thead>
              <tr>
                {['Service', 'Included', 'Used', 'Left', ''].map((h) => (
                  <th
                    key={h}
                    className="border-b border-gray-200 px-0 pb-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 last:pr-0 last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((line) => {
                const left = Math.max(0, line.included - line.used);
                const used = pct(line.used, line.included);
                const low = used >= RUNNING_LOW;
                return (
                  <tr key={line.service}>
                    <td className="border-b border-gray-100 py-2.5 pr-4 font-medium text-gray-900">
                      {line.service}
                    </td>
                    <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums text-gray-700">
                      {num(line.included)} {line.unit}
                    </td>
                    <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums text-gray-700">
                      {num(line.used)}
                    </td>
                    <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums font-medium text-gray-900">
                      {num(left)}
                    </td>
                    {/* The percentage last and quiet: it is the least useful of
                        the four, and putting it first is what made the old bars
                        the only thing anybody could see. */}
                    <td className="border-b border-gray-100 py-2.5 text-right tabular-nums">
                      <span className={low ? 'font-semibold text-amber-700' : 'text-gray-500'}>
                        {used}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {shown.some((l) => pct(l.used, l.included) >= RUNNING_LOW) ? (
            <p className="mcm-setrow-note mt-3">
              Some allowances are nearly used up. Anything past the included amount is charged at
              your usual rate — nothing stops working.
            </p>
          ) : null}
        </div>
      )}
    </SettingCard>
  );
};

export default PlanUsageTable;
