import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useGetPlans } from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import { useEffect, useMemo, useRef, useState } from 'react';
import { durationMap, PlanDurationMap, PRICE_FEATURES } from '../constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { handleAlert } from '@/lib/utils';
import {
  getTaxesAndFees,
  paymentCharge,
  upgradeRequestPlan,
  upgradeTrialPlan,
} from '@/services/api';
import AlertConfirm from '@/components/custom/alert-confirm';
import { Label } from '@/components/ui/label';
import PaymentScreen from '@/components/payment';
import { Check, CloseIcon } from '@/assets/icons';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export const UPGRADE_PLAN_TYPES = {
  IMMEDIATE: 'IMMEDIATE',
  REQUESTED: 'REQUESTED',
};

type PlanChangeAction = 'CURRENT' | 'UPGRADE' | 'DOWNGRADE';

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const getEffectiveCost = (costDetails: any): number | null => {
  const price = costDetails?.discount_enabled
    ? costDetails?.discount_price
    : costDetails?.original_price;

  return toFiniteNumber(price);
};

const getPlanCostDetails = (plan: any, duration: number) => {
  if (!Array.isArray(plan?.cost)) return null;

  return plan.cost.find((costDetails: any) => costDetails?.type === durationMap[duration]) || null;
};

const getPlanChangeAction = ({
  plan,
  planCost,
  currentPlanCost,
  currentPlanUuid,
  currentPlanDuration,
  selectedDuration,
  currentPlanSuperiority,
}: {
  plan: any;
  planCost: number | null;
  currentPlanCost: number | null;
  currentPlanUuid?: string;
  currentPlanDuration: number;
  selectedDuration: number;
  currentPlanSuperiority: number | null;
}): PlanChangeAction => {
  const isCurrentPlan = plan?.uuid === currentPlanUuid;
  if (isCurrentPlan && selectedDuration === currentPlanDuration) return 'CURRENT';

  if (planCost !== null && currentPlanCost !== null && planCost !== currentPlanCost) {
    return planCost > currentPlanCost ? 'UPGRADE' : 'DOWNGRADE';
  }

  const planSuperiority = toFiniteNumber(plan?.superiority);
  if (
    planSuperiority !== null &&
    currentPlanSuperiority !== null &&
    planSuperiority !== currentPlanSuperiority
  ) {
    return planSuperiority > currentPlanSuperiority ? 'UPGRADE' : 'DOWNGRADE';
  }

  if (isCurrentPlan && selectedDuration !== currentPlanDuration) {
    return selectedDuration > currentPlanDuration ? 'UPGRADE' : 'DOWNGRADE';
  }

  return 'UPGRADE';
};

const ChangePlan = ({
  open,
  setOpen,
  planFeatures,
  dataGetMyPlanDetails,
  overrideCompanyInfo,
  overrideUserInfo,
}: {
  open: any;
  setOpen: any;
  planFeatures: any;
  dataGetMyPlanDetails: any;
  overrideCompanyInfo?: {
    uuid?: string;
    is_trial?: string;
    plan_duration?: number;
    plan_status?: string;
  };
  overrideUserInfo?: { email?: string };
}) => {
  const [activePlanUuid, setActivePlanUuid] = useState<string | null>(null);
  const [planUpgradeType, setPlanUpgradeType] = useState(UPGRADE_PLAN_TYPES.REQUESTED);
  const [upgradePlanReq, setUpgradePlanReq] = useState<any>(null);
  const [isPaymentInitiate, setIsPaymentInitiate] = useState(false);
  const [planDuration, setPlanDuration] = useState(1);
  const queryClient: any = useQueryClient();
  const paymentRef = useRef<any>(null);

  const { data: getPlans, isLoading: isLoadingGetPlans } = useGetPlans();

  const { user, refetch } = useUser();
  const { user_info: ctxUserInfo, plan_info, company_info: ctxCompanyInfo } = user || {};
  const companyInfo = ctxCompanyInfo || overrideCompanyInfo || {};
  const user_info = ctxUserInfo || overrideUserInfo || {};
  const currentPlan = plan_info?.dataValues || {};
  const currentPlanDetails = dataGetMyPlanDetails?.current_plan_details || {};
  const currentPlanUuid = currentPlanDetails?.plan_uuid || currentPlan?.uuid;
  const currentPlanDuration = Number(
    companyInfo?.plan_duration || currentPlanDetails?.plan_duration || 0,
  );
  const currentPlanFromList = Array.isArray(getPlans)
    ? getPlans.find((plan: any) => plan?.uuid === currentPlanUuid)
    : null;
  const currentPlanCost =
    getEffectiveCost(currentPlanDetails) ??
    getEffectiveCost(getPlanCostDetails(currentPlanFromList, currentPlanDuration));
  const currentPlanSuperiority =
    toFiniteNumber(currentPlan?.superiority) ?? toFiniteNumber(currentPlanFromList?.superiority);
  const planCards = useMemo(() => {
    if (!Array.isArray(getPlans)) return [];

    return getPlans
      .map((plan: any, originalIndex: number) => {
        const costDetails = getPlanCostDetails(plan, planDuration);
        const planCost = getEffectiveCost(costDetails);
        const changeAction = getPlanChangeAction({
          plan,
          planCost,
          currentPlanCost,
          currentPlanUuid,
          currentPlanDuration,
          selectedDuration: planDuration,
          currentPlanSuperiority,
        });

        return { plan, costDetails, planCost, changeAction, originalIndex };
      })
      .sort((left, right) => {
        const getPosition = (card: typeof left) => {
          if (card.plan?.uuid === currentPlanUuid) return 1;
          return card.changeAction === 'DOWNGRADE' ? 0 : 2;
        };
        const positionDifference = getPosition(left) - getPosition(right);
        if (positionDifference) return positionDifference;

        if (left.planCost !== null && right.planCost !== null) {
          const costDifference = left.planCost - right.planCost;
          if (costDifference) return costDifference;
        } else if (left.planCost !== null) {
          return -1;
        } else if (right.planCost !== null) {
          return 1;
        }

        return left.originalIndex - right.originalIndex;
      });
  }, [
    currentPlanCost,
    currentPlanDuration,
    currentPlanSuperiority,
    currentPlanUuid,
    getPlans,
    planDuration,
  ]);
  const { data: getTaxes = {}, isLoading } = useQuery({
    queryKey: [
      'getTaxesAndFees',
      upgradePlanReq?.plan_uuid,
      upgradePlanReq?.plan_duration,
      dataGetMyPlanDetails?.license_detail?.payable_licenses,
    ],
    queryFn: () =>
      getTaxesAndFees({
        company_uuid: companyInfo?.uuid,
        licenses: dataGetMyPlanDetails?.license_detail?.payable_licenses,
        plan_uuid: upgradePlanReq?.plan_uuid || '',
        plan_duration: upgradePlanReq?.plan_duration,
        type:
          dataGetMyPlanDetails?.current_plan_details?.is_trial == 'N'
            ? 'PLAN_UPGRADE'
            : 'TRIAL_PLAN_UPGRADE',
      }),
    select: (data) => data?.data?.data?.result || {},
    enabled:
      !!companyInfo?.uuid &&
      !!upgradePlanReq?.plan_uuid &&
      (isPaymentInitiate ||
        (planUpgradeType === UPGRADE_PLAN_TYPES.IMMEDIATE && !!upgradePlanReq?.isConfimationModal)),
  });
  const { mutate: mutateUpgradeRequestPlan, isPending: isPendingUpgradeRequestPlan } = useMutation({
    mutationFn: upgradeRequestPlan,
    onSuccess: ({ data }: any) => {
      refetch();
      queryClient.invalidateQueries(['getMyPlanDetails'], { exact: true });
      handleAlert({ text: data?.data?.message || 'Plan upgraded successfully', type: 'success' });
      setOpen(false);
    },
  });

  const { mutate: mutateUpgradeTrialPlan, isPending: isPendingUpgradeTrialPlan } = useMutation({
    mutationFn: upgradeTrialPlan,
    onSuccess: ({ data }) => {
      if (data?.data?.result?.status === 'requires_action') {
        paymentRef.current.handle3DSPayment(data?.data?.result?.client_secret);
        return;
      }
      paymentSuccess(data);
    },
  });

  const { mutate: mutatePaymentCharge, isPending: isPendingPaymentCharge } = useMutation({
    mutationFn: paymentCharge,
    onSuccess: ({ data }) => {
      if (data?.data?.result?.status === 'requires_action') {
        paymentRef.current.handle3DSPayment(data?.data?.result?.client_secret);
        return;
      }

      paymentSuccess(data);
    },
  });

  const paymentSuccess = (data: any) => {
    paymentRef.current?.resetPaymentState();
    handleAlert({
      text: data?.data?.message || 'Payment completed successfully',
      type: 'success',
    });
    setIsPaymentInitiate(false);
    setUpgradePlanReq(null);
    setActivePlanUuid(null);
    setPlanUpgradeType(UPGRADE_PLAN_TYPES.REQUESTED);
    setPlanDuration(Number(companyInfo?.plan_duration) || 1);
    setOpen(false);
    setTimeout(() => {
      queryClient.invalidateQueries(['getMyPlanDetails'], { exact: true });
      refetch();
    }, 1000);
  };

  const onSuccessPayment = (data: any) => {
    const isNewCardRequest = data?.paymentType === 'NEW_CARD';
    const amount = getTaxes?.total_amount;

    const payload = {
      customer_email: user_info?.email || '',
      currency: 'usd',
      amount,
      payment_method_id: isNewCardRequest ? data?.id : data?.payment_method_id,
      plan_uuid: upgradePlanReq?.plan_uuid || '',
      tax_calculation_id: getTaxes?.tax_calculation_id || '',
      company_uuid: companyInfo?.uuid,
      plan_duration: upgradePlanReq?.plan_duration || planDuration,
      licenses: getTaxes?.licenses,
    };

    data.setLoader(false);
    if (companyInfo?.is_trial === 'Y') {
      mutateUpgradeTrialPlan(payload);
    } else {
      mutatePaymentCharge(payload);
    }
  };

  const activeTextClass = (_: boolean) => {
    return _ ? 'text-white' : 'text-primary';
  };

  useEffect(() => {
    if (companyInfo?.plan_duration) {
      setPlanDuration(companyInfo?.plan_duration);
    }
  }, [companyInfo]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-11/12 p-3 max-h-[99%] overflow-auto"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Change Plan
            <div
              onClick={() => setOpen(false)}
              className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="container mx-auto md:max-w-[92rem] xs:max-w-full ">
          <div className="flex justify-end gap-2 ">
            <Label>Monthly</Label>
            <Switch
              checked={planDuration === 12}
              onCheckedChange={(checked) => {
                setPlanDuration(checked ? 12 : 1);
              }}
            />
            <Label>Annually</Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoadingGetPlans ? (
            <Loader variant="blue" />
          ) : planCards.length ? (
            planCards.map((card, index) => {
              const {
                plan,
                costDetails: costObj,
                planCost: calculatedPlanCost,
                changeAction,
              } = card;
              const { plan_name, uuid, licenses } = plan;
              const isCurrentPlan = currentPlanUuid === uuid;
              const isCurrentSelection = changeAction === 'CURRENT';
              const isUpgrade = changeAction === 'UPGRADE';
              const isActive = activePlanUuid ? activePlanUuid === uuid : index === 0;
              const discount_enabled = costObj?.discount_enabled ?? false;
              const original_price = costObj?.original_price ?? 0;
              const discount = costObj?.discount ?? 0;
              const planCost = calculatedPlanCost ?? 0;
              return (
                <div
                  key={uuid || `${index}-${plan_name}`}
                  className={`p-7 rounded-xl ${
                    isActive ? 'bg-primary' : 'bg-white'
                  } shadow-sm w-1/3 cursor-pointer`}
                  onClick={() => setActivePlanUuid(uuid)}
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <h2
                          className={`text-2xl ${activeTextClass(isActive)} flex items-center gap-5 font-semibold text-gray-900 truncate`}
                        >
                          {plan_name}
                        </h2>
                        {isCurrentPlan && (
                          <small className="text-gray-900 inline-flex items-center rounded-xl bg-ucass-green px-2 py-1 font-medium uppercase tracking-widest text-xs">
                            Current Plan
                          </small>
                        )}
                      </div>
                      <h6
                        className={`text-base ${isActive ? 'text-white' : 'text-grey-800'} font-normal truncate`}
                      >
                        Upgraded Savings
                      </h6>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        {discount_enabled ? (
                          <>
                            {' '}
                            <div
                              className={`text-4xl ${activeTextClass(isActive)} font-semibold flex items-center`}
                            >{`$${planCost}`}</div>
                            <div
                              className={`text-xl line-through ${isActive ? 'text-white' : 'text-grey-800'} font-normal `}
                            >
                              ${`${original_price}`}
                            </div>
                            <div
                              className={`text-gray-900 inline-flex items-center rounded-xl bg-yellow-100 px-2 py-1 font-medium uppercase tracking-widest text-xs`}
                            >
                              {/* <div
                              className={`text-xs px-3 py-1 rounded-sm ${isActive ? 'bg-white text-primary' : 'bg-ucass-primary-200 text-primary'}`}
                            > */}
                              Discount:
                              {discount}%
                            </div>
                          </>
                        ) : (
                          <div
                            className={`text-4xl ${activeTextClass(isActive)} font-semibold flex items-center`}
                          >{`$${original_price}`}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className={`${isActive ? 'text-white' : 'text-primary'}`}>
                          /{PlanDurationMap[planDuration]}/user
                        </p>
                        <p className={`font-semibold ${isActive ? 'text-white' : 'text-primary'}`}>
                          Licences: {!licenses ? 'Unlimited' : `Up to ${licenses}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {companyInfo?.is_trial === 'Y' ? (
                        <Button
                          className={`${
                            isActive
                              ? 'text-primary bg-white border-primary hover:bg-white hover:text-primary/90'
                              : 'text-primary bg-white border-primary hover:bg-primary hover:text-white'
                          }`}
                          variant={'outline'}
                          onClick={() => {
                            setIsPaymentInitiate(true);
                            setUpgradePlanReq({
                              plan_uuid: uuid,
                              plan_duration: planDuration,
                              plan_cost: planCost,
                            });
                          }}
                        >
                          {isCurrentSelection ? 'Renew Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                        </Button>
                      ) : companyInfo?.plan_status === 'ACTIVE' && isCurrentSelection ? (
                        <span className="text-gray-900 inline-flex justify-center items-center rounded-xl bg-ucass-green px-2 py-3 text-xs font-medium uppercase tracking-widest w-full">
                          Current Plan
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant={'outline'}
                          className={`font-semibold ${isActive ? ' hover:bg-white hover:text-primary' : ''}`}
                          onClick={() => {
                            if (!planFeatures?.action?.request_plan || isCurrentSelection) {
                              setIsPaymentInitiate(true);
                              setUpgradePlanReq({
                                plan_uuid: uuid,
                                plan_duration: planDuration,
                                plan_cost: planCost,
                                isConfimationModal: false,
                                isUpgrade,
                              });
                              return;
                            }

                            setPlanUpgradeType(UPGRADE_PLAN_TYPES.REQUESTED);
                            setUpgradePlanReq({
                              plan_uuid: uuid,
                              plan_duration: planDuration,
                              plan_cost: planCost,
                              isConfimationModal: true,
                              isUpgrade,
                            });
                          }}
                        >
                          {isCurrentSelection ? 'Renew Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                        </Button>
                      )}

                      <h5
                        className={` ${isActive ? 'text-white' : ''} font-semibold text-gray-900 truncate text-md`}
                      >
                        All Advanced Features
                      </h5>
                      <ul
                        className={` list-inside ${
                          isActive ? 'text-white' : 'text-grey-800'
                        } text-gray-800 truncate text-sm flex flex-col gap-4 pb-1.5`}
                      >
                        {PRICE_FEATURES.map(({ name }, i) => {
                          return (
                            <li key={`${i + 1}-${name}`} className="flex items-center gap-2">
                              <Check className={`${isActive ? 'text-white' : 'text-primary'} `} />
                              {name}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div>No Plans are found</div>
          )}
        </div>
      </DialogContent>

      <AlertConfirm
        {...{
          apiLoading: isPendingUpgradeRequestPlan || isLoading,
          onConfirm: () => {
            if (planUpgradeType === UPGRADE_PLAN_TYPES.IMMEDIATE) {
              setIsPaymentInitiate(true);
              // We keep the modal open or handle state such that payment screen can launch?
              // Existing logic used setIsPaymentInitiate(true) which opens another dialog on top.
              // We should close the confirmation modal if we are going to payment?
              // The previous code: setUpgradePlanReq({ ...prev, isConfimationModal: false })
              setUpgradePlanReq((prev: any) => ({ ...prev, isConfimationModal: false }));
            } else {
              mutateUpgradeRequestPlan({
                requested_plan_uuid: upgradePlanReq?.plan_uuid,
                type: UPGRADE_PLAN_TYPES.REQUESTED,
                duration: upgradePlanReq?.plan_duration?.toString(),
                action_type: upgradePlanReq?.isUpgrade ? 'UPGRADE' : 'DOWNGRADE',
              });
            }
          },
          open: !!upgradePlanReq?.isConfimationModal,
          setOpen: (val: boolean) => {
            if (!val) setUpgradePlanReq((prev: any) => ({ ...prev, isConfimationModal: false }));
          },
          headerText: !upgradePlanReq?.isUpgrade ? 'Downgrade Plan' : 'Upgrade Plan',
          descriptionTextComp: (
            <>
              {!upgradePlanReq?.isUpgrade ? (
                <div className=" text-md">
                  Are you sure you want to downgrade your plan at the end of the current billing
                  cycle?
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <RadioGroup value={planUpgradeType} onValueChange={setPlanUpgradeType}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={UPGRADE_PLAN_TYPES.REQUESTED} id="24_hours" />
                      <Label htmlFor="24_hours">
                        Upgrade at the end of the current billing cycle
                      </Label>
                    </div>
                    {Number(upgradePlanReq?.plan_duration) ===
                      Number(companyInfo?.plan_duration) && (
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={UPGRADE_PLAN_TYPES.IMMEDIATE} id="imediately" />
                        <Label htmlFor="imediately">
                          Upgrade immediately (charges will apply now)
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}
            </>
          ),
        }}
      />

      {isPaymentInitiate && (
        <Dialog open={isPaymentInitiate} onOpenChange={setIsPaymentInitiate}>
          <DialogContent
            className="bg-white w-1/3"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="px-3">
              <PaymentScreen
                ref={paymentRef}
                onSuccessPayment={onSuccessPayment}
                isSavedPaymentCard={false}
                onSuccess3dsPayment={paymentSuccess}
                onFailure3dsPayment={() => setIsPaymentInitiate(false)}
                isApiLoad={isLoading || isPendingUpgradeTrialPlan || isPendingPaymentCharge}
                submitButtonText={`Pay $${getTaxes?.total_amount ?? 0}`}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default ChangePlan;
