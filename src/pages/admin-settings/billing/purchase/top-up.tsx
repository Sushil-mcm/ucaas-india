import PaymentScreen from '@/components/payment';
import { handleAlert } from '@/lib/utils';
import { addFund } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import AutoPurchase, { LowBalanceAlert } from './auto-purchase';
import AmountSection from './amount-section';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';

const TopUp = () => {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState(20);

  const paymentRef = useRef<any>(null);
  const { user } = useUser();
  const { user_info: userInfo } = user || {};
  const queryClient = useQueryClient();
  const { features } = useCompanyFeatures();
  const isAutoRechargeEnabled = features?.plan_features?.billing?.action?.view || false;

  const [hasAutoPurchase, setHasAutoPurchase] = useState(false);
  const [isLowBalanceAlertEnabled, setIsLowBalanceAlertEnabled] = useState(false);

  useEffect(() => {
    if (userInfo?.auto_recharge_setting) {
      setHasAutoPurchase(userInfo.auto_recharge_setting.enabled || false);
    }
  }, [userInfo]);

  useEffect(() => {
    const lowBalanceObj = userInfo?.low_balance_settings || userInfo?.low_balance_setting;
    if (lowBalanceObj) {
      setIsLowBalanceAlertEnabled(lowBalanceObj.enabled || false);
    } else if (user || userInfo) {
      const lowBalanceSettingRaw = user?.low_balance_alert || userInfo?.low_balance_alert;
      const lowBalanceSetting =
        typeof lowBalanceSettingRaw === 'string'
          ? JSON.parse(lowBalanceSettingRaw)
          : lowBalanceSettingRaw;
      if (lowBalanceSetting) {
        setIsLowBalanceAlertEnabled(lowBalanceSetting?.enabled || false);
      }
    }
  }, [user, userInfo]);

  const { mutate: mutateAddFund, isPending: isPendingAddFund } = useMutation({
    mutationFn: addFund,
  });

  const onSuccessPayment = (data: any) => {
    const isNewCardRequest = data?.paymentType === 'NEW_CARD';
    const setLoader = data?.setLoader;

    mutateAddFund(
      {
        type: isNewCardRequest ? 'new-card' : 'saved-card',
        charge_amount: selectedAmount,
        ...(isNewCardRequest ? { payment_method_id: data?.id } : { card_id: data?.uuid }),
        save: data?.isSavedCard,
      },
      {
        onSuccess: (data) => {
          const fundData = data?.data?.data?.result;
          console.log(fundData, 'buyDatabuyData 2', data);
          if (fundData?.requires_action) {
            paymentRef.current.handle3DSPayment(fundData?.payment_intent_id);
            return;
          }
          setLoader(false);
          handleSuccess(
            data?.data?.data?.message || data?.data?.message || 'Fund added successfully',
          );
        },
      },
    );
  };
  const handleSuccess = (message = 'Fund added successfully') => {
    paymentRef.current?.resetPaymentState();
    setSelectedAmount(20);
    handleAlert({ text: message, type: 'success' });
    queryClient.invalidateQueries({ queryKey: ['useGetSavedCards'] });
    navigate('/admin-settings/billing/invoices');
  };

  return (
    <>
      <div className="flex sm:flex-row flex-col justify-between  w-full gap-3">
        <div className="border border-gray-200 rounded-xl p-3 gap-1 flex flex-col w-full bg-white">
          <h5 className="text-gray-900 flex items-center gap-1.5 font-semibold">Top-up Now</h5>
          <p className="text-gray-700 flex items-center gap-1.5 text-sm mb-2">
            Select an amount to add credits to your balance.
          </p>
          <div className="w-full mt-2">
            <AmountSection selectedAmount={selectedAmount} setSelectedAmount={setSelectedAmount} />
          </div>
          <div className="w-full mt-4">
            <PaymentScreen
              ref={paymentRef}
              onSuccessPayment={onSuccessPayment}
              isSavedPaymentCard={false}
              onSuccess3dsPayment={() => handleSuccess()}
              // onFailure3dsPayment={handle3DSFailure}
              isApiLoad={isPendingAddFund}
              submitButtonText={`Pay $${selectedAmount || 0}`}
            />
          </div>
        </div>

        {isAutoRechargeEnabled && (
          <AutoPurchase
            hasAutoPurchase={hasAutoPurchase}
            setHasAutoPurchase={setHasAutoPurchase}
            isLowBalanceAlertEnabled={isLowBalanceAlertEnabled}
          />
        )}
      </div>
      <div className="w-full sm:w-[calc(50%_-_6px)] mt-3">
        <LowBalanceAlert
          isLowBalanceAlertEnabled={isLowBalanceAlertEnabled}
          setIsLowBalanceAlertEnabled={setIsLowBalanceAlertEnabled}
          hasAutoPurchase={hasAutoPurchase}
        />
      </div>
    </>
  );
};

export default TopUp;
