/* The extras you can have on top of your plan, and which you already have.
 *
 * An add-on here is a licence bought per seat, not a switch on this page. So
 * this screen tells you what each one does, what it saves you doing, and
 * whether your plan already includes it — and it is honest that buying one is
 * not something this screen can do yet.
 *
 * Two things are deliberately absent. There is no price, because nothing in the
 * platform supplies one and a number invented here is a number somebody would
 * budget against. And there is no purchase button, because the only endpoint
 * that buys licences charges the amount the browser sends it rather than the
 * amount it works out itself — a button here would be a button that trusts the
 * browser with a price.
 *
 * What IS real is the badge on each card. Whether your plan includes an add-on
 * is read from the plan the platform reports for your company, so it is the
 * truth about this account rather than a guess.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { useCompanyFeatures } from '@/hooks/rbac';
import {
  ADD_ONS,
  STATE_LABEL,
  addOnState,
  countByState,
  priceText,
  type AddOn,
  type AddOnState,
} from '@/lib/addons';

const PILL: Record<AddOnState, string> = {
  included: 'border-green-200 bg-green-50 text-green-800',
  'not-included': 'border-gray-200 bg-gray-50 text-gray-600',
  unknown: 'border-amber-200 bg-amber-50 text-amber-800',
};

const AddOnCard = ({ addOn, state }: { addOn: AddOn; state: AddOnState }) => {
  const [open, setOpen] = useState(false);

  return (
    <SettingCard
      title={addOn.name}
      description={addOn.summary}
      aside={
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${PILL[state]}`}
        >
          {STATE_LABEL[state]}
        </span>
      }
    >
      <SettingRow label="What it saves you" description={addOn.replaces} />
      <SettingRow
        label="How it is charged"
        description={addOn.billing}
        control={
          /* Not a price. Nothing supplies one, and this is the one screen where
             a made-up figure would be believed and budgeted against. */
          <span className="text-xs text-gray-500">{priceText()}</span>
        }
      />

      {addOn.detail?.length ? (
        <>
          <button
            type="button"
            className="mt-1 self-start text-xs font-medium text-primary hover:underline"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Hide detail' : 'How it works'}
          </button>
          {open ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {addOn.detail.map((line) => (
                <li key={line} className="text-xs leading-relaxed text-gray-600">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </SettingCard>
  );
};

const AddOns = () => {
  /* The COMPANY's plan, deliberately - not `features`, which for a non-admin is
     narrowed to what their own role exposes. This page answers "what does this
     company have", and a role that hides a feature does not mean the company is
     not paying for it. */
  const { companyPlanFeatures } = useCompanyFeatures();
  const planFeatures = companyPlanFeatures;

  const counts = useMemo(() => countByState(planFeatures), [planFeatures]);
  const unreadable = counts.unknown === ADD_ONS.length;

  return (
    <AdminPage
      title="Add-ons"
      description="Extras you can have on top of your plan, and which ones you already have."
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <SettingCard
          title="What this page can and cannot tell you"
          description={
            unreadable
              ? 'Your plan could not be read just now, so none of the cards below can say whether you have that add-on.'
              : `${counts.included} of ${ADD_ONS.length} are on your plan already.`
          }
          status="coming-soon"
          note="Prices are not shown because the platform does not publish them yet, and add-ons cannot be bought from here. To add or remove one, speak to your account manager — they take effect as licences on your plan."
        >
          <SettingRow
            label="An add-on is a licence, not a switch"
            description="Each one is bought per seat, the same way your plan is, and changes what that person's line can do. Adding one is a change to your bill, not a setting you turn on."
          />
          <SettingRow
            label="Looking for what a call abroad costs?"
            description="The full price list, country by country, is on the destinations page — that is live today and does not depend on any add-on."
            control={
              <Link to="/admin-settings/calling-rates/destinations">
                <Button type="button" variant="outline">
                  Destinations and rates
                </Button>
              </Link>
            }
          />
        </SettingCard>

        {ADD_ONS.map((addOn) => (
          <AddOnCard key={addOn.id} addOn={addOn} state={addOnState(planFeatures, addOn)} />
        ))}
      </div>
    </AdminPage>
  );
};

export default AddOns;
