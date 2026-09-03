import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { getTaxesAndFees } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useEffect } from 'react';

const OrderSummary = ({
  orderSummary = {},
  customClass = 'w-1/2',
  mainCustomClass = '',
  dataGetMyPlanDetails,
  onCalculationChange,
}: any) => {
  const { totalPayableUnit } = orderSummary || {};
  const { user: userInfo } = useUser();

  const { data: getTaxes = {}, isLoading } = useQuery({
    queryKey: ['getDepartmentAndCallLogs', totalPayableUnit],
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
  const remainingDays = expirationDate.diff(today, 'days') + 1;
  return (
    <div className={`flex justify-end gap-4 ${mainCustomClass}`}>
      <div className={`border border-grey-200 p-3 rounded-xl ${customClass}`}>
        <h5 className="font-semibold text-gray-900 truncate text-md border-b border-gray-200 pb-3">
          Order Summary
        </h5>

        <ul className="flex flex-col gap-2 pt-3 text-sm text-gray-800">
          <li className="flex items-center justify-between gap-2">
            <span className="font-semibold">Monthly License Cost:</span>

            {isLoading ? (
              <Skeleton className="h-3 w-[60px] bg-gray-200" />
            ) : (
              <>₹{getTaxes?.plan_cost}</>
            )}
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              Prorated Period ({today?.format('MMM D')} – {expirationDate?.format('MMM D')}):
            </span>{' '}
            {remainingDays} days
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
    </div>
  );
};

export default OrderSummary;
