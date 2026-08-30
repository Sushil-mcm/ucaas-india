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
 * Every figure on the row is worked out by `allowance-meter`, which is the only
 * place that decides what an allowance means. That matters here more than
 * anywhere: this table used to convert its inputs to numbers before looking at
 * them, so a plan that had not loaded read as "0 minutes included", and an
 * unlimited plan read as "999,999,999 minutes" with a bar at nought per cent.
 * Both are wrong facts about what somebody was sold.
 */

import { SettingCard } from '@/components/mcm/setting-card';
import { allowanceMeter, isRunningLow, RUNNING_LOW_PERCENT } from '@/lib/allowance-meter';

export interface UsageLine {
  service: string;
  /* Straight off the plan record. Deliberately not narrowed to a number: null,
     undefined and the unlimited sentinel all have to survive as far as the
     meter, which is what tells them apart. */
  included: unknown;
  used: unknown;
  /* Minutes, messages, pages — whatever this service is counted in. */
  unit: string;
}

const PlanUsageTable = ({ lines }: { lines: UsageLine[] }) => {
  const rows = lines.map((line) => ({ line, meter: allowanceMeter(line.included, line.used, line.unit) }));

  /* A service with nothing included is charged as it is used, and saying "0 of
     0" about it is noise dressed as information. One we cannot read is kept —
     staying silent about an allowance somebody is paying for would be worse. */
  const shown = rows.filter(({ meter }) => meter.kind !== 'none');
  const allUnknown = shown.length > 0 && shown.every(({ meter }) => meter.kind === 'unknown');

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
      ) : allUnknown ? (
        <div className="py-3">
          <p className="text-xs text-gray-600">
            Your allowances could not be read just now. Nothing is wrong with your account — reload
            the page, and the Usage screen shows the same figures.
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
              {shown.map(({ line, meter }) => (
                <tr key={line.service}>
                  <td className="border-b border-gray-100 py-2.5 pr-4 font-medium text-gray-900">
                    {line.service}
                  </td>
                  <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums text-gray-700">
                    {meter.includedText}
                  </td>
                  <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums text-gray-700">
                    {meter.usedText}
                  </td>
                  <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums font-medium text-gray-900">
                    {meter.leftText}
                  </td>
                  {/* The percentage last and quiet: it is the least useful of
                      the four, and putting it first is what made the old bars
                      the only thing anybody could see. Absent where there is
                      nothing to be a percentage of — an unlimited allowance has
                      no "how full", and a bar stuck at nought would read as one. */}
                  <td className="border-b border-gray-100 py-2.5 text-right tabular-nums">
                    {meter.percent === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span
                        className={
                          isRunningLow(meter) ? 'font-semibold text-amber-700' : 'text-gray-500'
                        }
                      >
                        {meter.percent}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {shown.some(({ meter }) => isRunningLow(meter)) ? (
            <p className="mcm-setrow-note mt-3">
              Some allowances are more than {RUNNING_LOW_PERCENT}% used. Anything past the included
              amount is charged at your usual rate — nothing stops working.
            </p>
          ) : null}
        </div>
      )}
    </SettingCard>
  );
};

export default PlanUsageTable;
