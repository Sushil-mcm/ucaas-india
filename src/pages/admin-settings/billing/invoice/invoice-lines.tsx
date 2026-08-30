/* What one charge was actually made up of, opened out under its own row.
 *
 * A single "Amount" column is the commonest cause of a billing support ticket.
 * Somebody sees $327.60, has no idea which part of it was tax, and writes in to
 * ask — or worse, assumes the tax was a price rise. Opening the row answers it
 * without a modal, a page load or a phone call.
 *
 * **Tax is itemised on the line, not bolted on at the bottom.** The platform
 * records tax per licence as well as in total, so a five-seat charge shows five
 * seats at their net price with their own tax beside them. A single tax line at
 * the foot of an invoice tells a finance team the total but not the rate they
 * were charged at per unit, which is exactly what they need when reclaiming it.
 *
 * Every figure here comes from the tax record saved with the charge at the time
 * it was taken — not recalculated now. Recalculating would quietly "fix"
 * historic invoices whenever a rate changed, which is the last thing anybody
 * wants from a document their accountant has already filed. Where the record is
 * missing a figure, the line says so rather than showing zero.
 */

import { UNAVAILABLE, dateOrUnavailable, knownNumber, moneyOrUnavailable } from '@/lib/billing-money';

interface Line {
  label: string;
  detail?: string;
  quantity: number | null;
  net: number | null;
  tax: number | null;
  total: number | null;
}

/* Turn one saved charge into the lines it was built from.
 *
 * Most charges are a single thing — a top-up, a number, a month of a plan. A
 * licence charge is the one that genuinely has a quantity, and it is also the
 * one people query, so it gets the per-seat treatment. */
const linesOf = (invoice: any): Line[] => {
  const tax = invoice?.tax_detail ?? {};
  const seats = knownNumber(tax?.licenses) ?? knownNumber(invoice?.total_license);
  const perSeatNet = knownNumber(tax?.plan_cost);
  const perSeatTax = knownNumber(tax?.tax_per_license);

  /* A per-seat charge with a known unit price: show the unit maths, because
     "5 × $60.00" is checkable and "$300.00" is not. */
  if (seats !== null && seats > 0 && perSeatNet !== null) {
    const net = perSeatNet * seats;
    const lineTax = perSeatTax === null ? null : perSeatTax * seats;
    return [
      {
        label: invoice?.purchase_detail?.plan_name || invoice?.type || 'Licences',
        detail: `${seats} × ${moneyOrUnavailable(perSeatNet)} each${
          perSeatTax === null ? '' : `, plus ${moneyOrUnavailable(perSeatTax)} tax each`
        }`,
        quantity: seats,
        net,
        tax: lineTax,
        total: lineTax === null ? null : net + lineTax,
      },
    ];
  }

  /* Everything else is one line. Saying so honestly beats inventing a
     breakdown the platform never recorded. */
  return [
    {
      label: invoice?.type || 'Charge',
      detail: invoice?.desc || undefined,
      quantity: null,
      net: knownNumber(tax?.sub_total) ?? knownNumber(invoice?.amount),
      tax: knownNumber(tax?.tax_amount),
      total: knownNumber(tax?.total_amount) ?? knownNumber(invoice?.total_amount),
    },
  ];
};

const InvoiceLines = ({ invoice }: { invoice: any }) => {
  const lines = linesOf(invoice);
  const tax = invoice?.tax_detail ?? {};
  const where = tax?.tax_location ?? {};
  const place = [where?.city, where?.state, where?.country].filter(Boolean).join(', ');
  const discount = knownNumber(invoice?.promo_discount);
  const refunded = knownNumber(invoice?.refund_amount);

  return (
    <div className="text-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse">
          <thead>
            <tr>
              {['Item', 'Net', 'Tax', 'Total'].map((h, i) => (
                <th
                  key={h}
                  className={`border-b border-gray-200 pb-1.5 pr-4 text-[10px] font-semibold uppercase tracking-wide text-gray-500 last:pr-0 ${
                    i === 0 ? 'text-left' : 'text-right'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={`${line.label}-${i}`}>
                <td className="border-b border-gray-100 py-2 pr-4 align-top">
                  <span className="font-medium text-gray-900">{line.label}</span>
                  {line.detail ? (
                    <p className="mt-0.5 max-w-[26rem] text-gray-600">{line.detail}</p>
                  ) : null}
                </td>
                <td className="border-b border-gray-100 py-2 pr-4 text-right align-top tabular-nums">
                  {moneyOrUnavailable(line.net)}
                </td>
                <td className="border-b border-gray-100 py-2 pr-4 text-right align-top tabular-nums">
                  {moneyOrUnavailable(line.tax)}
                </td>
                <td className="border-b border-gray-100 py-2 text-right align-top tabular-nums font-medium text-gray-900">
                  {moneyOrUnavailable(line.total)}
                </td>
              </tr>
            ))}
            {discount !== null && discount > 0 ? (
              <tr>
                <td className="border-b border-gray-100 py-2 pr-4 text-gray-700" colSpan={3}>
                  Promotion applied{invoice?.promo_applied ? ` (${invoice.promo_applied})` : ''}
                </td>
                <td className="border-b border-gray-100 py-2 text-right tabular-nums text-green-700">
                  -{moneyOrUnavailable(discount)}
                </td>
              </tr>
            ) : null}
            {refunded !== null && refunded > 0 ? (
              <tr>
                <td className="border-b border-gray-100 py-2 pr-4 text-gray-700" colSpan={3}>
                  Refunded on {dateOrUnavailable(invoice?.refund_date)}
                </td>
                <td className="border-b border-gray-100 py-2 text-right tabular-nums text-green-700">
                  -{moneyOrUnavailable(refunded)}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1.5 text-gray-600">
        <div>
          <dt className="inline font-medium text-gray-700">Tax rate: </dt>
          <dd className="inline tabular-nums">
            {knownNumber(tax?.tax_percentage) === null
              ? UNAVAILABLE
              : `${Number(tax.tax_percentage).toFixed(2)}%`}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-700">Taxed at: </dt>
          <dd className="inline">{place || UNAVAILABLE}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-700">Paid by: </dt>
          <dd className="inline">
            {invoice?.mode || UNAVAILABLE}
            {invoice?.last_four_digit ? ` ending ${invoice.last_four_digit}` : ''}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-700">Charged on: </dt>
          <dd className="inline">{dateOrUnavailable(invoice?.created_at)}</dd>
        </div>
      </dl>

      {/* Said here rather than left to be discovered. The platform has no
          invoice-document service, so nothing on this screen can hand over a
          stamped PDF — and a picture of a web page is not an invoice. Better to
          say so than to offer a download that an accountant later rejects. */}
      <p className="mt-3 text-[11px] text-gray-500">
        A formal PDF invoice is not available yet. These figures are the record of what was
        charged; your accounts team can use them directly.
      </p>
    </div>
  );
};

export default InvoiceLines;
