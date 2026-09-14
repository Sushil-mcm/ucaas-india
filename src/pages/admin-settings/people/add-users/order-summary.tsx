import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { getTaxesAndFees } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useEffect } from 'react';
import { FileText, InfoIcon } from 'lucide-react';

const OrderSummary = ({
  orderSummary = {},
  customClass = 'w-1/2',
  mainCustomClass = '',
  dataGetMyPlanDetails,
  onCalculationChange,
  /* Both optional and undefined by default, so every other place this
     component renders (Admin ▸ People/Departments/License management, full
     pages rather than this dialog) looks exactly as it did before — only a
     caller that passes them gets the icon header and the footnote. */
  subtitle,
  note,
}: any) => {
  const { totalPayableUnit } = orderSummary || {};
  const { user: userInfo } = useUser();

  const { data: getTaxes = {}, isLoading } = useQuery({
    /* Was `'getDepartmentAndCallLogs'` -- copied from an unrelated query and
       never renamed. React Query caches by key, so this screen was reading
       (or matching the shape of) whatever that other query last returned
       instead of ever calling the tax endpoint below, which is why every
       amount here stayed ₹0 regardless of how many licenses were being
       added. */
    queryKey: ['getTaxesAndFees', totalPayableUnit],
    queryFn: () =>
      getTaxesAndFees({
        company_uuid: userInfo?.company_info?.uuid,
        licenses: totalPayableUnit,
      }),
    select: (data) => data?.data?.data?.result || {},
    enabled: totalPayableUnit > 0,
  });

  useEffect(() => {
    if (!getTaxes?.total_amount || !onCalculationChange) return;

    onCalculationChange({
      total_amount: Number(getTaxes.total_amount),
      tax_calculation_id: getTaxes.tax_calculation_id,
    });
  }, [getTaxes?.total_amount, getTaxes?.tax_calculation_id]);

  // const planCost = dataGetMyPlanDetails?.current_plan_details?.discount_enabled
  //   ? dataGetMyPlanDetails?.current_plan_details?.discount_price
  //   : dataGetMyPlanDetails?.current_plan_details?.original_price;

  const planExpiration = dataGetMyPlanDetails?.current_plan_details?.plan_expiration_date;

  // const proratedCost = getLicenseCalculatedPlanCost({
  //   planCost,
  //   plan_expiration_date: planExpiration,
  // });

  // const totalAmountPayable = totalPayableUnit * +proratedCost;
  // const taxPercentage = Number(dataGetMyPlanDetails?.last_billing?.tax_detail?.tax_percentage ?? 0);
  // const totalTax = (taxPercentage * (totalAmountPayable ?? 0)) / 100;

  const today = moment();
  const expirationDate = moment(planExpiration, 'YYYY-MM-DD');
  /* `plan_expiration_date` is sometimes missing from `current_plan_details`
     (a plan not yet fully provisioned) -- rather than show the moment.js
     fallout ("Invalid date", "NaN days") as if the screen were broken, a
     missing date reads as "we don't know yet" and the row says so plainly. */
  const hasValidExpiration = expirationDate.isValid();
  const remainingDays = hasValidExpiration ? Math.max(0, expirationDate.diff(today, 'days') + 1) : null;
  return (
    <div className={`flex justify-end gap-4 ${mainCustomClass}`}>
      <div className={`flex flex-col border border-grey-200 p-3 rounded-xl ${customClass}`}>
        {subtitle ? (
          <div className="flex items-center gap-2.5 border-b border-gray-200 pb-3 dark:border-mcm-line">
            <span className="mcm-order-summary-icon">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h5 className="font-semibold text-gray-900 truncate text-md dark:text-mcm-ink">
                Order Summary
              </h5>
              <p className="truncate text-xs text-gray-500 dark:text-mcm-ink-3">{subtitle}</p>
            </div>
          </div>
        ) : (
          <h5 className="font-semibold text-gray-900 truncate text-md border-b border-gray-200 pb-3 dark:text-mcm-ink dark:border-mcm-line">
            Order Summary
          </h5>
        )}

        {/* Centered in whatever room is left once the card is stretched
            to match a taller sibling (the invitee form), rather than
            sitting at the top with a growing gap below it. `note` (if
            passed) still sits at the card's own bottom edge, outside this
            block. */}
        <div className="flex flex-1 flex-col justify-center">
        <ul className="flex flex-col gap-2 pt-3 text-sm text-gray-800 dark:text-mcm-ink-2">
          <li className="flex items-center justify-between gap-2">
            <span className="font-semibold">Monthly License Cost:</span>

            {isLoading ? (
              <Skeleton className="h-3 w-[60px] bg-gray-200" />
            ) : (
              <>₹{getTaxes?.plan_cost || 0}</>
            )}
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              Prorated Period
              {hasValidExpiration ? ` (${today.format('MMM D')} – ${expirationDate.format('MMM D')})` : ''}
              :
            </span>{' '}
            {hasValidExpiration ? `${remainingDays} days` : '—'}
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="font-semibold">Prorated Charge for {totalPayableUnit} Licenses:</span>{' '}
            {isLoading ? (
              <Skeleton className="h-3 w-[150px] bg-gray-200" />
            ) : (
              <>
                ₹{getTaxes?.per_license_cost || 0} x {totalPayableUnit} = ₹
                {getTaxes?.sub_total || 0}
              </>
            )}
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="font-semibold">Total Tax:</span>
            {isLoading ? (
              <Skeleton className="h-3 w-[90px] bg-gray-200" />
            ) : (
              <div className="flex items-center gap-1">
                ₹{getTaxes?.tax_amount || 0}
                <span className="font-normal">({Number(getTaxes?.tax_percentage ?? 0) || 0}%)</span>
              </div>
            )}
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="font-semibold">Total Amount:</span>

            {isLoading ? (
              <Skeleton className="h-3 w-[60px] bg-gray-200" />
            ) : (
              <>₹{getTaxes?.total_amount || 0}</>
            )}
          </li>
        </ul>
        </div>

        {note ? (
          <p className="mcm-order-summary-note mt-3 flex items-start gap-1.5 text-xs">
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default OrderSummary;
