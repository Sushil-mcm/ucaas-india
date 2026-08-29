/* What you are paying, what is next, and what you have paid — on one page.
 *
 * Billing was six menu items: Statement, Plan, Licences & Resources, Modules &
 * Access, Credit & Payment, Invoices. Everything a customer needs is in there
 * somewhere, but the three questions they actually arrive with —
 *
 *   what am I paying for
 *   what will I be charged next, and when
 *   what have I been charged before
 *
 * — are spread across three of those pages, and nothing answers them together.
 * Established phone systems put exactly these three on one screen, and they are
 * right to: somebody checking their bill is not browsing.
 *
 * Nothing here is a new figure. Every number comes from the same endpoints the
 * existing pages already use, so this cannot disagree with them — and each block
 * links to the page that owns that thing rather than duplicating its controls.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { cardList, getInvoice, getMyPlanDetails } from '@/services/api';

const money = (value: unknown): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toFixed(2)}`;
};

const onDate = (value: unknown): string => {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const BillingSummary = () => {
  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ['getMyPlanDetails'],
    queryFn: () => getMyPlanDetails(),
    staleTime: 60 * 1000,
  });

  const { data: cardData } = useQuery({
    queryKey: ['cardList'],
    queryFn: () => cardList(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: invoiceData } = useQuery({
    queryKey: ['getInvoice', 'summary'],
    queryFn: () => getInvoice({ page: 1, limit: 5 } as any),
    staleTime: 60 * 1000,
    retry: false,
  });

  const plan = (planData as any)?.data?.data ?? (planData as any)?.data ?? {};
  const current = plan?.current_plan_details ?? {};
  const next = plan?.next_billing_details ?? {};

  const cards = useMemo(() => {
    const rows =
      (cardData as any)?.data?.data?.result?.rows ??
      (cardData as any)?.data?.data?.rows ??
      (cardData as any)?.data?.data ??
      [];
    return Array.isArray(rows) ? rows : [];
  }, [cardData]);

  /* The card that will actually be charged. Showing "a card is saved" when three
     are saved and the wrong one is default would be worse than showing none. */
  const defaultCard = useMemo(
    () => cards.find((c: any) => c?.is_default === 'Y' || c?.is_default === true) ?? cards[0],
    [cards],
  );

  const invoices = useMemo(() => {
    const rows =
      (invoiceData as any)?.data?.data?.result?.rows ??
      (invoiceData as any)?.data?.data?.rows ??
      [];
    return Array.isArray(rows) ? rows.slice(0, 5) : [];
  }, [invoiceData]);

  const isTrial = current?.is_trial === 'Y';
  const expired = String(current?.plan_status || '').toUpperCase() === 'EXPIRED';

  return (
    <AdminPage
      title="Billing summary"
      description="What you are paying for, what is due next, and what you have paid before."
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <SettingCard
          title="Your plan"
          description={
            expired
              ? 'This plan has expired. Renew it to keep calls working.'
              : isTrial
                ? 'You are on a trial. Choose a plan before it ends to keep your numbers.'
                : 'What you are paying for at the moment.'
          }
          aside={
            <Link to="/admin-settings/billing/plan">
              <Button type="button" variant="outline">
                {expired || isTrial ? 'Choose a plan' : 'Change plan'}
              </Button>
            </Link>
          }
        >
          <SettingRow
            label="Plan"
            description={planLoading ? 'Loading…' : current?.plan_name || 'No plan yet'}
          />
          <SettingRow
            label="Billed"
            description={
              current?.plan_duration ? `Every ${current.plan_duration}` : 'Billing period not set'
            }
            control={
              <span className="text-sm font-semibold text-gray-900">
                {money(
                  current?.discount_enabled ? current?.discount_price : current?.original_price,
                )}
              </span>
            }
          />
          <SettingRow
            label="Next charge"
            description={
              expired
                ? 'Nothing is scheduled while the plan is expired.'
                : `Due ${onDate(current?.plan_expiration_date)}${
                    next?.total_license ? ` for ${next.total_license} licences` : ''
                  }`
            }
            control={
              <span className="text-sm font-semibold text-gray-900">
                {expired ? '—' : money(next?.original_price ?? current?.original_price)}
              </span>
            }
          />
        </SettingCard>

        <SettingCard
          title="How it gets paid"
          description="The card charged when your plan renews or you buy a number."
          aside={
            <Link to="/admin-settings/billing/purchase">
              <Button type="button" variant="outline">
                {defaultCard ? 'Manage cards' : 'Add a card'}
              </Button>
            </Link>
          }
        >
          {defaultCard ? (
            <SettingRow
              label={`${defaultCard?.brand || defaultCard?.card_type || 'Card'} ending ${
                defaultCard?.last4 || defaultCard?.last_four || '••••'
              }`}
              description={
                cards.length > 1
                  ? `This is the one that gets charged. ${cards.length - 1} other ${cards.length === 2 ? 'card is' : 'cards are'} saved.`
                  : 'This is the one that gets charged.'
              }
            />
          ) : (
            /* Said plainly rather than left blank: no card means a renewal will
               fail, and that is worth knowing before it happens rather than
               after the calls stop. */
            <SettingRow
              label="No card saved"
              description="Add one so your plan can renew and numbers can be bought without interruption."
            />
          )}
        </SettingCard>

        <SettingCard
          title="What you have paid"
          description="Your most recent bills."
          aside={
            <Link to="/admin-settings/billing/invoices">
              <Button type="button" variant="outline">
                All invoices
              </Button>
            </Link>
          }
        >
          {invoices.length === 0 ? (
            <SettingRow
              label="Nothing billed yet"
              description="Invoices appear here once your first payment goes through."
            />
          ) : (
            invoices.map((inv: any, i: number) => (
              <SettingRow
                key={inv?.uuid || inv?.invoice_number || i}
                label={`Invoice ${inv?.invoice_number ?? inv?.id ?? ''}`.trim()}
                description={`${onDate(inv?.paid_on || inv?.created_at)}${
                  inv?.description ? ` — ${inv.description}` : ''
                }`}
                control={
                  <span className="text-sm font-semibold text-gray-900">
                    {money(inv?.total_amount ?? inv?.amount)}
                  </span>
                }
              />
            ))
          )}
        </SettingCard>
      </div>
    </AdminPage>
  );
};

export default BillingSummary;
