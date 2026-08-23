import { useEffect, useState } from 'react';
import { AUTO_PURCHASE_MIN_BALANCE_DATA } from '../constants';
import { Switch } from '@/components/ui/switch';
import CustomSelect from '@/components/custom/custom-select';
import AmountSection from './amount-section';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import Loader from '@/components/custom/loader';
import { autoPurchasePlan, updateLowBalanceSettings } from '@/services/api';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { Input } from '@/components/ui/input';

interface AutoPurchaseProps {
  hasAutoPurchase: boolean;
  setHasAutoPurchase: (val: boolean) => void;
  isLowBalanceAlertEnabled: boolean;
}

export const AutoPurchase = ({
  hasAutoPurchase,
  setHasAutoPurchase,
  isLowBalanceAlertEnabled,
}: AutoPurchaseProps) => {
  const { user, refetch } = useUser();
  const { user_info: userInfo } = user || {};
  const [selectedMinAmount, setSelectedMinAmount] = useState(AUTO_PURCHASE_MIN_BALANCE_DATA[0]);
  const [selectedAmount, setSelectedAmount] = useState(20);

  const { mutate: mutateAutoPurchasePlan, isPending: isPendingAutoPurchasePlan } = useMutation({
    mutationFn: autoPurchasePlan,
    onSuccess: ({ data }) => {
      handleAlert({ text: data?.data?.message, type: 'success' });
      refetch();
    },
  });

  const handleAutoPurchase = () => {
    const payload = {
      enabled: hasAutoPurchase,
      threshold_amount: selectedMinAmount?.value,
      refill_amount: selectedAmount,
    };

    mutateAutoPurchasePlan(payload);
  };

  useEffect(() => {
    if (userInfo?.auto_recharge_setting) {
      setSelectedAmount(Number(userInfo?.auto_recharge_setting?.refill_amount || 20));
      const minAmountIndex = AUTO_PURCHASE_MIN_BALANCE_DATA.findIndex(
        (item) => item.value === Number(userInfo?.auto_recharge_setting?.threshold_amount),
      );
      setSelectedMinAmount(
        AUTO_PURCHASE_MIN_BALANCE_DATA[minAmountIndex !== -1 ? minAmountIndex : 0],
      );
    }
  }, [userInfo]);

  return (
    <div className="border border-gray-200 rounded-xl p-3 gap-3 flex flex-col w-full justify-between bg-white">
      <div className="flex flex-col gap-3">
        <h5 className="text-gray-900 flex items-center gap-1.5 font-semibold">
          Activate Auto Purchase
        </h5>
        <div className="flex flex-col gap-2 my-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-md font-medium cursor-pointer text-sm">
              Would you like proceed with auto purchase?
            </div>
            <Switch
              className="cursor-pointer"
              disabled={isLowBalanceAlertEnabled}
              onCheckedChange={(checked) => {
                setHasAutoPurchase(checked);
                if (!checked) {
                  mutateAutoPurchasePlan({
                    enabled: checked,
                    threshold_amount: selectedMinAmount?.value,
                    refill_amount: selectedAmount,
                  });
                }
              }}
              checked={hasAutoPurchase}
            />
          </div>
          <p className="text-gray-800 text-sm">
            Enable automatic credit top-ups using your saved card when the balance is low.
          </p>
        </div>
        {hasAutoPurchase && (
          <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex flex-col">
              <p className="text-gray-600 font-medium pr-5 text-sm mb-3">
                Auto top-up is enabled when your balance falls below a certain amount
              </p>
              <CustomSelect
                className="w-full"
                options={AUTO_PURCHASE_MIN_BALANCE_DATA}
                value={selectedMinAmount}
                handleChange={(val) => setSelectedMinAmount(val)}
                menuPlacement="top"
              />
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <h5 className="text-gray-900 flex items-center gap-1.5 font-semibold">
                Auto top-up with:
              </h5>
              <AmountSection
                selectedAmount={selectedAmount}
                setSelectedAmount={setSelectedAmount}
              />
            </div>
          </div>
        )}
        {hasAutoPurchase && (
          <div className="flex justify-end">
            <Button
              className="w-full max-w-36"
              variant={'outline'}
              type="button"
              onClick={handleAutoPurchase}
              disabled={!selectedAmount || !selectedMinAmount?.value || isPendingAutoPurchasePlan}
            >
              {isPendingAutoPurchasePlan ? <Loader variant="blue" /> : 'Submit'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

interface LowBalanceAlertProps {
  isLowBalanceAlertEnabled: boolean;
  setIsLowBalanceAlertEnabled: (val: boolean) => void;
  hasAutoPurchase: boolean;
}

export const LowBalanceAlert = ({
  isLowBalanceAlertEnabled,
  setIsLowBalanceAlertEnabled,
  hasAutoPurchase,
}: LowBalanceAlertProps) => {
  const { user, refetch } = useUser();
  const { user_info: userInfo } = user || {};
  const [lowBalanceAmount, setLowBalanceAmount] = useState<string | number>('10');

  const { mutate: mutateLowBalanceAlert, isPending: isPendingLowBalanceAlert } = useMutation({
    mutationFn: updateLowBalanceSettings,
    onSuccess: ({ data }) => {
      handleAlert({
        text: data?.data?.message || 'Low Balance Alert settings saved successfully!',
        type: 'success',
      });
      refetch();
    },
  });

  const handleLowBalanceAlert = () => {
    if (isLowBalanceAlertEnabled && Number(lowBalanceAmount || 0) <= 0) {
      handleAlert({
        text: `Threshold amount should be more than 0`,
        type: 'error',
      });
      return;
    }
    mutateLowBalanceAlert({
      enabled: isLowBalanceAlertEnabled,
      on_amount: Number(lowBalanceAmount || 0).toFixed(2),
    });
  };

  useEffect(() => {
    const lowBalanceObj = userInfo?.low_balance_settings || userInfo?.low_balance_setting;
    if (lowBalanceObj) {
      setLowBalanceAmount(Number(lowBalanceObj.on_amount || 10));
    } else if (user || userInfo) {
      const lowBalanceSettingRaw = user?.low_balance_alert || userInfo?.low_balance_alert;
      const lowBalanceSetting =
        typeof lowBalanceSettingRaw === 'string'
          ? JSON.parse(lowBalanceSettingRaw)
          : lowBalanceSettingRaw;
      if (lowBalanceSetting) {
        setLowBalanceAmount(
          Number(lowBalanceSetting?.on_amount || lowBalanceSetting?.amount || 10),
        );
      }
    }
  }, [user, userInfo]);

  return (
    <div className="border border-gray-200 rounded-xl p-3 gap-3 flex flex-col w-full justify-between bg-white">
      <div className="flex flex-col gap-3">
        <h5 className="text-gray-900 flex items-center gap-1.5 font-semibold">Low Balance Alert</h5>
        <div className="flex flex-col gap-2 my-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-md font-medium cursor-pointer text-sm">
              Would you like to enable low balance alert?
            </div>
            <Switch
              className="cursor-pointer"
              disabled={hasAutoPurchase}
              onCheckedChange={(checked) => {
                setIsLowBalanceAlertEnabled(checked);
                if (!checked) {
                  mutateLowBalanceAlert({
                    enabled: checked,
                    on_amount: Number(lowBalanceAmount || 0).toFixed(2),
                  });
                }
              }}
              checked={isLowBalanceAlertEnabled}
            />
          </div>
          <p className="text-gray-800 text-sm">
            Receive an notification when your balance falls below the specified threshold.
          </p>
        </div>
        {isLowBalanceAlertEnabled && (
          <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
            <div className="w-full">
              <Input
                type="number"
                label="Threshold Amount ($)"
                placeholder="Enter amount"
                value={lowBalanceAmount}
                onChange={(e) => {
                  setLowBalanceAmount(e.target.value);
                }}
              />
            </div>
          </div>
        )}
        {isLowBalanceAlertEnabled && (
          <div className="flex justify-end">
            <Button
              className="w-full max-w-36"
              variant={'outline'}
              type="button"
              onClick={handleLowBalanceAlert}
              disabled={
                !lowBalanceAmount || Number(lowBalanceAmount) <= 0 || isPendingLowBalanceAlert
              }
            >
              {isPendingLowBalanceAlert ? <Loader variant="blue" /> : 'Submit'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoPurchase;
