import { useState } from 'react';
import { useGetMyPlanDetails } from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import Loader from '@/components/custom/loader';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import LicenseManagement from '@/pages/admin-settings/billing/plan/license-management';
import DIDList from '@/pages/admin-settings/billing/plan/dids-list';
import Storage from '@/pages/admin-settings/billing/plan/storage';
import AgentCosting from '@/pages/admin-settings/billing/plan/agent-costing';
import '@/components/mcm/mcm-page.css';

/**
 * Billing ▸ Licences & resources.
 *
 * These four views used to sit in the right-hand column of Plan Summary, beside
 * unrelated pricing information. They answer a different question — "what have
 * we consumed of what we bought, and who holds it" — so they get their own
 * screen rather than competing for attention with the plan's cost.
 *
 * The tab components are unchanged; only where they live has moved.
 */

const TABS = [
  { key: 'licence', label: 'Licences' },
  { key: 'numbers', label: 'Numbers' },
  { key: 'storage', label: 'Storage' },
  { key: 'ai', label: 'AI' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const BillingResources = () => {
  const [tab, setTab] = useState<TabKey>('licence');
  const { user } = useUser();
  const { data: planData = {}, isPending, isError } = useGetMyPlanDetails(undefined, true);

  const planStatus = (user as any)?.company_info?.plan_status;
  const restrictPlan = planStatus === 'EXPIRED';

  if (isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center p-5">
        <Loader variant="blue" size="lg" />
      </div>
    );
  }

  /* Every tab below is built from the plan. Rendering them without it would show
     a company with no seats, no allowances and nothing on the bill — an account
     that looks cancelled. Better to say the read failed. */
  if (isError) {
    return (
      <AdminPage
        section="Billing"
        title="Licences & resources"
        description="What this account holds — seats, numbers, storage and AI usage — and who is using them."
      >
        <div className="p-3">
          <p className="text-sm font-semibold text-gray-900">
            Your plan details could not be loaded
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Nothing about your account has changed and no seat has been affected. Reload the page —
            if it keeps happening, the Plan screen shows the same figures.
          </p>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      section="Billing"
      title="Licences & resources"
      description="What this account holds — seats, numbers, storage and AI usage — and who is using them."
      filters={
        <div className="ptabstrip">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={tab === entry.key ? 'on' : ''}
              onClick={() => setTab(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'licence' ? (
        <LicenseManagement dataGetMyPlanDetails={planData} restrictPlan={restrictPlan} />
      ) : null}
      {tab === 'numbers' ? <DIDList /> : null}
      {tab === 'storage' ? <Storage /> : null}
      {tab === 'ai' ? <AgentCosting /> : null}
    </AdminPage>
  );
};

export default BillingResources;
