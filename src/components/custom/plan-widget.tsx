import { FC, useEffect, useRef, useState } from 'react';
import { useUser } from '@/hooks/use-user';
import moment from 'moment';
import { ClockLine, CloseIcon } from '@/assets/icons';
import { Button } from '../ui/button';
import ChangePlan from '@/pages/admin-settings/billing/plan/change-plan';
import { useCompanyFeatures } from '@/hooks/rbac';
import Draggable from 'react-draggable';
import { useNavigate } from 'react-router-dom';
import { useGetMyPlanDetails } from '@/hooks/common';

const UpgradePlanWidget: FC = () => {
  const [isShowSlider, setIsShowSlider] = useState(false);
  const [isOpenChangePlan, setIsOpenChangePlan] = useState(false);
  const [hasAutoOpenedForCurrentCondition, setHasAutoOpenedForCurrentCondition] = useState(false);
  const popupRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useUser();
  const { company_info: companyInfo = {} } = user || {};
  const isPlanExpired = companyInfo?.plan_status === 'EXPIRED';
  const planExpiredOn = moment(companyInfo?.plan_expiration_date).isValid()
    ? moment(companyInfo?.plan_expiration_date).format('DD MMM YYYY [at] hh:mm A')
    : '';
  const { features } = useCompanyFeatures();
  const planFeatures = features?.plan_features?.billing || {};
  const navigate = useNavigate();
  const { data: dataGetMyPlanDetails } = useGetMyPlanDetails();

  function getDaysLeftUntilExpiration() {
    const today = moment().startOf('day');
    const expirationDate = companyInfo?.plan_expiration_date;

    if (!expirationDate || !moment(expirationDate).isValid()) {
      return null;
    }

    const expiration = moment(expirationDate).startOf('day');
    const daysLeft = expiration.diff(today, 'days');
    return daysLeft;
  }

  const daysLeftUntilExpiration = getDaysLeftUntilExpiration();
  const handleClick = () => {
    if (!isDragging) {
      setIsShowSlider(true);
    }
  };

  const isPaymentPending =
    user?.payment_verified === 0 ||
    user?.payment_verified === '0' ||
    companyInfo?.payment_verified === 0 ||
    companyInfo?.payment_verified === '0' ||
    user?.user?.payment_verified === 0 ||
    user?.user?.payment_verified === '0' ||
    user?.auth?.payment_verified === 0 ||
    user?.auth?.payment_verified === '0';

  const shouldShowPlanWidget =
    isPaymentPending ||
    isPlanExpired ||
    companyInfo?.is_trial === 'Y' ||
    (!isPlanExpired &&
      daysLeftUntilExpiration !== null &&
      daysLeftUntilExpiration <= 3 &&
      daysLeftUntilExpiration >= 0);

  useEffect(() => {
    if (shouldShowPlanWidget && !hasAutoOpenedForCurrentCondition) {
      setIsShowSlider(true);
      setHasAutoOpenedForCurrentCondition(true);
      return;
    }
    if (!shouldShowPlanWidget) {
      setIsShowSlider(false);
      setHasAutoOpenedForCurrentCondition(false);
    }
  }, [shouldShowPlanWidget, hasAutoOpenedForCurrentCondition]);

  return (
    <>
      {isShowSlider && (
        <div
          className={`w-full left-20 max-w-[calc(100%-80px))] h-16 ${isPaymentPending ? 'bg-[#e17100]' : 'bg-primary'} fixed p-4 text-white flex items-center justify-between bottom-[0rem] transition-all z-50`}
        >
          <div className="flex items-center gap-2">
            <ClockLine className="w-4 h-4" />
            <p>
              {isPaymentPending
                ? 'Your payment is pending.'
                : companyInfo?.is_trial === 'Y'
                  ? `Your trial has ${Math.max(daysLeftUntilExpiration ?? 0, 0)} day(s) remaining.`
                  : isPlanExpired
                    ? `Your Plan Expired${planExpiredOn ? ` on ${planExpiredOn}` : ''}.`
                    : (daysLeftUntilExpiration ?? -1) <= 3 && (daysLeftUntilExpiration ?? -1) > 0
                      ? `Your plan will expire in ${daysLeftUntilExpiration} days. Please renew soon to avoid interruption.`
                      : `Plan Expired! Renew now to keep accessing UCAAS services.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isPaymentPending ? null : (
              <Button
                variant={'outline'}
                className="hover:bg-white hover:text-primary/90"
                onClick={() => navigate('/admin-settings/billing/plan')}
              >
                Upgrade Now
              </Button>
            )}

            <a href="javascript:void(0)" onClick={() => setIsShowSlider(false)}>
              <CloseIcon className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
      {!isShowSlider && shouldShowPlanWidget ? (
        <Draggable
          axis="both"
          bounds="body"
          nodeRef={popupRef}
          onStart={() => setIsDragging(false)}
          onDrag={() => setIsDragging(true)}
          onStop={() => {
            setTimeout(() => setIsDragging(false), 100);
          }}
        >
          <div
            ref={popupRef}
            onClick={handleClick}
            className="flex items-center justify-center w-10 h-10 rounded-full fixed bottom-1 right-1 text-red-700 bg-red-100 hover:bg-red-700 hover:text-white shadow-xl z-50 cursor-grab active:cursor-grabbing"
          >
            <ClockLine className="w-5 h-5" />
          </div>
        </Draggable>
      ) : null}

      {isOpenChangePlan && (
        <ChangePlan
          {...{
            open: isOpenChangePlan,
            setOpen: () => {
              setIsOpenChangePlan(false);
              setIsShowSlider(false);
            },
            dataGetMyPlanDetails,
            planFeatures,
          }}
        />
      )}
    </>
  );
};

export default UpgradePlanWidget;
