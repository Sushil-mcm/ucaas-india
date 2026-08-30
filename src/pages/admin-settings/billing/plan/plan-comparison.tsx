/* What each plan actually includes, side by side.
 *
 * Choosing a plan here showed three things: the name, the price and how many
 * seats. Not how many minutes, not how many texts, nothing about AI. So the one
 * question somebody is actually asking — "what do I get for the extra twelve
 * dollars" — could not be answered on the screen where they answer it.
 *
 * The figures come from the same catalogue the rest of billing reads, so a
 * price shown here cannot disagree with a price charged elsewhere.
 *
 * Every row here is something the platform genuinely counts: minutes, texts and
 * numbers. A service the platform holds an allowance for but measures nothing
 * against carries "Not counted yet" on its own row rather than being shown
 * identically to the measured ones — a customer who plans around an allowance
 * nobody counts finds out at the worst possible moment.
 *
 * Unlimited is a word in this table, never a number. Two of these plans include
 * unlimited domestic calling, and the plan record has to hold that as a very
 * large figure because the column takes whole numbers. Printing it would put
 * "999,999,999 minutes" on a pricing table.
 */

import { SettingCard } from '@/components/mcm/setting-card';
import {
  PLANS,
  PLAN_ADD_ONS,
  describeAllowance,
  isUnlimited,
  yearlySavingPercent,
  type PlanDefinition,
} from '@/lib/plan-catalogue';
import { formatMoney, moneyOrUnavailable } from '@/lib/billing-money';

interface Row {
  label: string;
  value: (plan: PlanDefinition) => string;
  rate?: (plan: PlanDefinition) => string | undefined;
  /* False where the platform holds an allowance for this but counts nothing
     against it. Said on the row rather than in a footnote nobody reads. */
  counted: boolean;
}

const ROWS: Row[] = [
  {
    label: 'Domestic calling',
    counted: true,
    value: (p) => describeAllowance(p.includes.domesticMinutes, 'minutes'),
    /* No rate line where calling is unlimited: there is no "then", because the
       allowance cannot run out. Printing one would imply it could. */
    rate: (p) =>
      !isUnlimited(p.includes.domesticMinutes) && p.overage?.domesticMinuteRate !== undefined
        ? `then ${formatMoney(p.overage.domesticMinuteRate)} a minute`
        : undefined,
  },
  {
    label: 'Text messages',
    counted: true,
    value: (p) => describeAllowance(p.includes.sms, 'texts'),
    rate: (p) =>
      !isUnlimited(p.includes.sms) && p.overage?.smsRate !== undefined
        ? `then ${formatMoney(p.overage.smsRate)} each`
        : undefined,
  },
  {
    label: 'Numbers included',
    counted: true,
    value: (p) =>
      p.includes.numbers
        ? `${p.includes.numbers} number${p.includes.numbers === 1 ? '' : 's'}`
        : 'Bought separately',
  },
];

const PlanComparison = () => (
  <>
    <SettingCard
      title="What each plan includes"
      description="The same figures the bill is worked out from, so what you see here is what you are charged."
    >
      <div className="scroller overflow-x-auto py-2">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-gray-200 pb-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Per seat
              </th>
              {PLANS.map((plan) => (
                <th
                  key={plan.id}
                  className="border-b border-gray-200 pb-2 pr-4 text-left last:pr-0"
                >
                  <span className="block text-sm font-semibold text-gray-900">{plan.name}</span>
                  <span className="block text-xs font-normal tabular-nums text-gray-600">
                    {moneyOrUnavailable(plan.monthlyPerSeat)} a month
                  </span>
                  {/* The yearly price beside the monthly one, because paying for
                      a year is cheaper and somebody comparing plans should not
                      have to find that out on the next screen. The saving is
                      worked out from the two prices rather than written down, so
                      it cannot disagree with them. */}
                  <span className="block text-xs font-normal tabular-nums text-gray-500">
                    {moneyOrUnavailable(plan.yearlyPerSeat)} a year
                    {yearlySavingPercent(plan) ? ` · save ${yearlySavingPercent(plan)}%` : ''}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td className="border-b border-gray-100 py-2.5 pr-4 align-top">
                  <span className="font-medium text-gray-900">{row.label}</span>
                  {!row.counted ? (
                    <span className="mt-0.5 block text-[11px] text-amber-700">Not counted yet</span>
                  ) : null}
                </td>
                {PLANS.map((plan) => {
                  const rate = row.rate?.(plan);
                  return (
                    <td
                      key={plan.id}
                      className="border-b border-gray-100 py-2.5 pr-4 align-top tabular-nums text-gray-800 last:pr-0"
                    >
                      {row.value(plan)}
                      {rate ? (
                        <span className="mt-0.5 block text-xs text-gray-500">{rate}</span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mcm-setrow-note is-info mt-2">
        An allowance is used first and costs nothing. Once it is gone the service carries on and
        each further minute or message is charged from your balance — it does not stop working.
      </p>
    </SettingCard>

    <SettingCard
      title="Sold alongside a plan"
      description="These are licences on top of your plan rather than part of it."
      status="coming-soon"
      note="Add-ons cannot be bought from here yet. Speak to your account manager to add or remove one."
    >
      <div className="scroller overflow-x-auto py-2">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr>
              {['Add-on', 'Price', 'Charged', 'Includes', 'After that'].map((h, i) => (
                <th
                  key={h}
                  className={`border-b border-gray-200 pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 last:pr-0 ${
                    i === 0 ? 'text-left' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_ADD_ONS.map((addOn) => (
              <tr key={addOn.id}>
                <td className="border-b border-gray-100 py-2.5 pr-4 font-medium text-gray-900">
                  {addOn.name}
                  <span className="mt-0.5 block text-xs font-normal text-gray-600">
                    {addOn.summary}
                  </span>
                </td>
                <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums text-gray-800">
                  {addOn.monthlyPrice === 0 ? '—' : moneyOrUnavailable(addOn.monthlyPrice)}
                </td>
                <td className="border-b border-gray-100 py-2.5 pr-4 text-gray-600">
                  per {addOn.per}
                </td>
                <td className="border-b border-gray-100 py-2.5 pr-4 tabular-nums text-gray-800">
                  {addOn.included
                    ? `${addOn.included.units.toLocaleString()} ${addOn.included.unit}`
                    : '—'}
                </td>
                <td className="border-b border-gray-100 py-2.5 tabular-nums text-gray-600">
                  {addOn.overageRate !== undefined
                    ? `$${addOn.overageRate.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} each`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingCard>
  </>
);

export default PlanComparison;
