/* The plan cards on the public pricing page. Built from the live plan records;
   every decision (price per cycle, badge, bullets, which sign-up a button
   opens) lives in src/lib/pricing-cards.ts and is unit-tested there. */
import { useNavigate } from 'react-router-dom';
import { Check } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import Loader from '@/components/custom/loader';
import {
  bullets,
  ctasFor,
  maxSavingPct,
  money,
  orderPlans,
  popularUuid,
  priceView,
  seatLine,
  type Cycle,
  type PricingPlan,
} from '@/lib/pricing-cards';

type Props = {
  plans: PricingPlan[] | undefined;
  isLoading: boolean;
  cycle: Cycle;
  onCycle: (cycle: Cycle) => void;
  signupBase: string;
  onCompare: () => void;
};

const CycleToggle = ({ cycle, onCycle, saving }: { cycle: Cycle; onCycle: (c: Cycle) => void; saving: number }) => (
  <div className="flex items-center justify-center gap-3">
    <div role="tablist" aria-label="Billing cycle" className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-200">
      {(['MONTHLY', 'YEARLY'] as Cycle[]).map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={cycle === c}
          onClick={() => onCycle(c)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            cycle === c ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {c === 'MONTHLY' ? 'Monthly' : 'Annual'}
        </button>
      ))}
    </div>
    {saving > 0 && (
      <span className="rounded-full bg-ucass-green px-2.5 py-1 text-xs font-semibold text-gray-900">
        Save up to {saving}%
      </span>
    )}
  </div>
);

const PriceBlock = ({ plan, cycle }: { plan: PricingPlan; cycle: Cycle }) => {
  const view = priceView(plan, cycle);
  if (view.kind === 'quote') {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-4xl font-semibold text-gray-900">Let&apos;s talk</div>
        <p className="text-sm text-gray-500">Priced for your team, on a quote</p>
      </div>
    );
  }
  if (view.kind === 'free') {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-4xl font-semibold text-gray-900">$0</div>
        <p className="text-sm text-gray-500">per month, pay as you go</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <div className="text-4xl font-semibold text-gray-900">{money(view.perMonth)}</div>
        {view.listPerMonth !== null && (
          <div className="pb-1 text-lg text-gray-400 line-through">{money(view.listPerMonth)}</div>
        )}
      </div>
      <p className="text-sm text-gray-500">
        {view.cycle === 'YEARLY'
          ? `per user / month, billed annually (${money(view.perYear ?? 0)} a year)`
          : 'per user / month, billed monthly'}
      </p>
    </div>
  );
};

const PlanCard = ({
  plan,
  cycle,
  popular,
  signupBase,
}: {
  plan: PricingPlan;
  cycle: Cycle;
  popular: boolean;
  signupBase: string;
}) => {
  const navigate = useNavigate();
  const ctas = ctasFor(plan, cycle, signupBase);
  const points = bullets(plan);
  return (
    <article
      className={`relative flex h-full flex-col gap-5 rounded-2xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg ${
        popular ? 'ring-2 ring-primary' : 'ring-1 ring-gray-200'
      }`}
      data-plan={plan.plan_name}
    >
      {popular && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
          Most popular
        </span>
      )}
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-primary">{plan.plan_name}</h2>
        {plan.description && <p className="text-sm text-gray-600">{plan.description}</p>}
      </header>
      <PriceBlock plan={plan} cycle={cycle} />
      <div className="flex flex-col gap-2">
        <Button
          className="w-full bg-primary text-white hover:bg-primary/90"
          onClick={() => navigate(ctas.primary.href)}
        >
          {ctas.primary.label}
        </Button>
        {ctas.trial ? (
          <Button
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary hover:text-white"
            onClick={() => navigate(ctas.trial!.href)}
          >
            {ctas.trial.label}
          </Button>
        ) : ctas.note ? (
          <p className="py-2 text-center text-xs text-gray-500">{ctas.note}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-900">{seatLine(plan)}</p>
        <ul className="flex flex-col gap-2.5 text-sm text-gray-700">
          {points.map((text) => (
            <li key={text} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-primary">
                <Check />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

const PlanCards = ({ plans, isLoading, cycle, onCycle, signupBase, onCompare }: Props) => {
  const ordered = orderPlans(plans || []);
  const popular = popularUuid(ordered);
  return (
    <section className="flex flex-col gap-8" aria-label="Plans">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold text-gray-900 md:text-4xl">Plans for every size of team</h1>
        <p className="max-w-2xl text-base text-gray-600">
          Try a plan free: add a card, and nothing is charged until the trial ends. Pay only for
          the people you add, and change plans whenever you like.
        </p>
      </div>
      <CycleToggle cycle={cycle} onCycle={onCycle} saving={maxSavingPct(ordered)} />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader variant="blue" />
        </div>
      ) : ordered.length ? (
        <div className="grid w-full grid-cols-1 gap-5 pt-3 md:grid-cols-2 xl:grid-cols-4">
          {ordered.map((plan) => (
            <PlanCard
              key={plan.uuid}
              plan={plan}
              cycle={cycle}
              popular={plan.uuid === popular}
              signupBase={signupBase}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-md">
          Plans could not be loaded. Refresh the page, or{' '}
          <button type="button" className="font-semibold text-primary underline" onClick={onCompare}>
            see the feature comparison
          </button>
          .
        </div>
      )}
      <p className="text-center text-xs text-gray-500">
        Prices exclude taxes and regulatory fees, added at checkout. Cancel anytime.{' '}
        <button type="button" className="font-semibold text-primary underline underline-offset-2" onClick={onCompare}>
          Compare every feature
        </button>
      </p>
    </section>
  );
};

export default PlanCards;
