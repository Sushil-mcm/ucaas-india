import PaymentScreen from '@/components/payment';
import { handleAlert } from '@/lib/utils';
import { addFund } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import AmountSection, { customAmountError } from './amount-section';
import BalanceBar, { money } from './balance-bar';
import LowBalanceSettings from './low-balance-settings';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import { formatMoney, knownNumber } from '@/lib/billing-money';
import { invalidateUserDetails } from '@/hooks/use-user-details';

const TopUp = () => {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(20);
  const [customAmount, setCustomAmount] = useState('');

  /* The one number the Pay button charges. A typed amount always wins, because
     typing is the more deliberate act - and because the two can never both be
     set (see amount-section). Everything downstream reads THIS, so the label and
     the charge cannot disagree about what is being paid. */
  const amountToCharge = customAmount ? Number(customAmount) : selectedAmount;
  const amountError = customAmountError(customAmount);
  const canPay = Boolean(amountToCharge) && !amountError;

  const paymentRef = useRef<any>(null);
  const { user } = useUser();
  const { user_info: userInfo } = user || {};
  const queryClient = useQueryClient();
  const { features } = useCompanyFeatures();
  const isAutoRechargeEnabled = features?.plan_features?.billing?.action?.view || false;

  /* The two saved records, read straight off the account.
     They used to be copied into local state by a pair of effects so two cards
     could each own a switch; the settings panel below now owns its own draft,
     so the only thing left to read them for is the balance bar's status line -
     and reading them directly means the bar cannot lag behind a save. */
  const lowBalanceSettings =
    userInfo?.low_balance_settings || userInfo?.low_balance_setting || null;
  const autoRecharge = userInfo?.auto_recharge_setting || null;

  const { mutate: mutateAddFund, isPending: isPendingAddFund } = useMutation({
    mutationFn: addFund,
  });

  const onSuccessPayment = (data: any) => {
    const isNewCardRequest = data?.paymentType === 'NEW_CARD';
    const setLoader = data?.setLoader;

    mutateAddFund(
      {
        type: isNewCardRequest ? 'new-card' : 'saved-card',
        charge_amount: amountToCharge,
        ...(isNewCardRequest ? { payment_method_id: data?.id } : { card_id: data?.uuid }),
        save: data?.isSavedCard,
      },
      {
        onSuccess: (data) => {
          const fundData = data?.data?.data?.result;
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
    setCustomAmount('');
    handleAlert({ text: message, type: 'success' });
    queryClient.invalidateQueries({ queryKey: ['useGetSavedCards'] });
    /* The balance lives on the USER record, and only the card list was being
       refreshed - so paying left the balance bar and the header showing the old
       figure until somebody reloaded the page. Refreshing the user is what makes
       the money appear where it was just added. */
    invalidateUserDetails(queryClient);
    navigate('/admin-settings/billing/invoices');
  };

  return (
    <>
      {/* What credit actually pays for. The page offered an amount field with no
          statement of what the money buys, which is the difference between a
          subscription (seats, billed per period) and consumption (usage, drawn
          down as you go). */}
      <div className="mcm-creditwhat">
        <strong>Credit covers usage beyond what your plan includes</strong>
        <ul>
          <li>Calls to destinations not bundled with your plan, charged per minute</li>
          {/* Careful wording. Text messages have a monthly allowance on every
              plan; picture messages do not, so saying "above your allowance"
              about them would describe an allowance nobody was sold. */}
          <li>Text messages above your monthly allowance, charged per message</li>
          <li>Picture messages, charged per message</li>
          <li>AI call minutes and message replies once the included pool runs out</li>
          <li>Fax pages</li>
        </ul>
        <span>
          Seats and your monthly plan fee are billed separately on Plan — credit is never used for
          those.
        </span>
      </div>

      <BalanceBar
        settings={{
          alertEnabled: Boolean(lowBalanceSettings?.enabled),
          alertAt: Number(lowBalanceSettings?.on_amount ?? 0),
          rechargeEnabled: Boolean(autoRecharge?.enabled),
          rechargeAt: Number(autoRecharge?.threshold_amount ?? 0),
          rechargeAmount: Number(autoRecharge?.refill_amount ?? 0),
        }}
      />

      <div className="flex sm:flex-row flex-col justify-between  w-full gap-3">
        <div className="border border-gray-200 rounded-xl p-3 gap-1 flex flex-col w-full bg-white">
          <h5 className="text-gray-900 flex items-center gap-1.5 font-semibold">Top-up Now</h5>
          <p className="text-gray-700 flex items-center gap-1.5 text-sm mb-2">
            Add to your balance. Anything unused stays on the account.
          </p>
          <div className="w-full mt-2">
            <AmountSection
              selectedAmount={selectedAmount}
              setSelectedAmount={setSelectedAmount}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
            />
          </div>
          {/* The number the top-up is actually for. An amount on its own does not
              answer "will that be enough?" - the balance it produces does. */}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-[13px] text-gray-600">New balance after top-up</span>
            <span className="text-[13px] font-semibold text-gray-900">
              {(() => {
                const current = knownNumber((user as any)?.company_info?.amount);
                if (current === null || !canPay || !amountToCharge) return '—';
                return money(current + Number(amountToCharge)) ?? '—';
              })()}
            </span>
          </div>

          <div className="w-full mt-4">
            <PaymentScreen
              ref={paymentRef}
              onSuccessPayment={onSuccessPayment}
              isSavedPaymentCard={false}
              onSuccess3dsPayment={() => handleSuccess()}
              // onFailure3dsPayment={handle3DSFailure}
              isApiLoad={isPendingAddFund}
              /* The amount somebody picked, written as money. There is always
                 one — the buttons above cannot select nothing — but it is
                 formatted through the same function as every other figure so
                 "Pay $20.00" reads like the rest of billing. */
              submitButtonText={
                canPay && formatMoney(amountToCharge) ? `Pay ${formatMoney(amountToCharge)}` : 'Pay'
              }
            />
          </div>
        </div>

        {isAutoRechargeEnabled && (
          <div className="w-full">
            <LowBalanceSettings />
          </div>
        )}
      </div>
    </>
  );
};

export default TopUp;
