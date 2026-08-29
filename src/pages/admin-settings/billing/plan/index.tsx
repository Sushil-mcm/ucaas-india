import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { useEffect, useRef, useState } from 'react';
import { durationMap, RequestedPlanDurationMap, RequestedPlanStatusMap } from '../constants';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Icon } from '@/assets/icons/icon';
import { formatDate, handleAlert } from '@/lib/utils';
import { useGetMyPlanDetails, useGetPlans } from '@/hooks/common';
import {
  cancelUpgradeRequestPlan,
  getTaxesAndFees,
  renewPlan,
  upgradeRequestPlan,
  upgradeTrialPlan,
} from '@/services/api';
import ChangePlan, { UPGRADE_PLAN_TYPES } from './change-plan';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyFeatures } from '@/hooks/rbac';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import moment from 'moment';
import LicenseManagement from './license-management';
import DIDList from './dids-list';
import InvoiceDetails from '../invoice/invoice-details';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import PaymentScreen from '@/components/payment';
import { CARDS_TYPE } from '@/constants/common-const';
import Loader from '@/components/custom/loader';
import Storage from './storage';
import PlanUsageTable from './usage-table';
import AgentCosting from './agent-costing';

/* The card surface used below is defined here. Without this the classes
   render as plain divs, which is worse than the boxes they replaced. */
import '@/components/mcm/mcm-page.css';
import { normalizeDidCountries } from '@/lib/did-countries';
import RateDetails, { RateType } from './rate-details';

interface RateModalState {
  title: string;
  countries: ReturnType<typeof normalizeDidCountries>;
  rateTypes: RateType[];
  rateCardIds: Partial<Record<RateType, string>>;
}

const POST_PAYMENT_REFRESH_DELAY_MS = 4000;

const normalizeRateCardId = (value: any) => {
  if (typeof value === 'string') return value.trim();
  return String(value?.uuid || value?.value || '').trim();
};

const Plan = () => {
  const { user: userInfoData, refetch } = useUser();
  const [isOpenChangePlan, setIsOpenChangePlan] = useState<boolean>(false);
  const [cancelRequestPlan, setCancelRequestPlan] = useState<boolean>(false);
  const [invoiceDownloadModal, setIsInvoiceDownloadModal] = useState<boolean>(false);
  const { data: dataGetPlans } = useGetPlans();
  const { data: dataGetMyPlanDetails } = useGetMyPlanDetails();
  const [isCancelSubscriptionAlert, setIsCancelSubscriptionAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('revoke-plan');
  const [rateModal, setRateModal] = useState<RateModalState | null>(null);
  const companyInfo = userInfoData?.company_info || {};
  const isAdmin = userInfoData?.user_info?.role === 'ADMIN';
  const aiUsageItems = [
    {
      label: 'Available AI Call Minutes',
      value: companyInfo?.ai_call_free_minutes ?? 0,
    },
    {
      label: 'Available AI Message Replies',
      value: companyInfo?.ai_message_free_reply ?? 0,
    },
  ];
  const currentPlanDetails = dataGetMyPlanDetails?.current_plan_details || {};
  const currentPlanFromList = dataGetPlans?.find(
    (plan: any) => plan?.uuid === (currentPlanDetails?.plan_uuid || companyInfo?.plan_uuid),
  );
  const planDataSources = [
    companyInfo,
    currentPlanDetails,
    userInfoData?.plan_info?.dataValues,
    userInfoData?.plan_info,
    currentPlanFromList,
  ];
  const getRateCardId = (...keys: string[]) => {
    for (const source of planDataSources) {
      for (const key of keys) {
        const rateCardId = normalizeRateCardId(source?.[key]);
        if (rateCardId) return rateCardId;
      }
    }

    return '';
  };
  const callRateCardId = getRateCardId(
    'outbound_ratecard_uuid',
    'outbound_rate_card_uuid',
    'outbound_rate_card',
  );
  const smsRateCardId = getRateCardId('sms_rate_card_uuid');
  const mmsRateCardId = getRateCardId('mms_rate_card_uuid');
  const faxRateCardId = getRateCardId('fax_rate_card_uuid');
  const countryRateItems: Array<RateModalState & { label: string; buttonLabel: string }> = [
    {
      label: 'Available Minutes',
      buttonLabel: 'Check Available Minutes',
      title: 'Available Minutes',
      countries: normalizeDidCountries(companyInfo?.allow_did_countries),
      rateTypes: ['call'],
      rateCardIds: { call: callRateCardId },
    },
    {
      label: 'Available FAX',
      buttonLabel: 'Check Available FAX',
      title: 'Available FAX',
      countries: normalizeDidCountries(companyInfo?.allow_fax_countries),
      rateTypes: ['fax'],
      rateCardIds: { fax: faxRateCardId },
    },
    {
      label: 'Available SMS/MMS',
      buttonLabel: 'Check Available SMS/MMS',
      title: 'Available SMS/MMS',
      countries: normalizeDidCountries(companyInfo?.allow_sms_countries),
      rateTypes: ['sms', 'mms'],
      rateCardIds: { sms: smsRateCardId, mms: mmsRateCardId },
    },
  ];
  const isPlanExpired = dataGetMyPlanDetails?.current_plan_details?.plan_status === 'EXPIRED';
  const requestedPlanInfo = userInfoData?.plan_info?.plan_requests || null;
  const tempReqPlan = dataGetPlans?.find(
    (item: any) => item?.uuid === requestedPlanInfo?.plan_uuid,
  );

  const [isPaymentInitiate, setIsPaymentInitiate] = useState(false);
  const [isRenewPaymentInitiate, setIsRenewPaymentInitiate] = useState(false);
  const paymentRef = useRef<any>(null);

  const { features } = useCompanyFeatures();
  const planFeatures = features?.plan_features?.billing || {};
  const aiFeatures = features?.plan_features?.ai?.IS_SHOW || false;
  const totalPaybleLicences = dataGetMyPlanDetails?.license_detail?.payable_licenses || 0;
  const queryClient: any = useQueryClient();
  const [getTaxes, setGetTaxes] = useState<any>({});

  function getDaysLeftUntilExpiration() {
    const today = moment().startOf('day');
    const expirationDate = dataGetMyPlanDetails?.current_plan_details?.plan_expiration_date;

    if (!expirationDate || !moment(expirationDate).isValid()) {
      return 0; // fallback
    }

    const expiration = moment(expirationDate).startOf('day');
    const daysLeft = expiration.diff(today, 'days');
    return Math.max(daysLeft, 0);
  }
  const { mutateAsync: mutateTaxCalculate, isPending: isPendingTaxCalculation } = useMutation({
    mutationFn: getTaxesAndFees,
    onSuccess: (data) => {
      setGetTaxes(data?.data?.data?.result || {});
      setIsPaymentInitiate(true);
      // window.location.reload()
    },
  });

  const { mutate: mutateUpgradeTrialPlan, isPending: isPendingUpgradeTrialPlan } = useMutation({
    mutationFn: upgradeTrialPlan,
    onSuccess: async ({ data }) => {
      if (data?.data?.result?.status === 'requires_action') {
        paymentRef.current.handle3DSPayment(data?.data?.result?.client_secret);
        return;
      }
      await paymentSuccess(data, 'Plan upgraded successfully');
    },
    onError: () => {
      setIsRenewPaymentInitiate(false);
    },
  });

  const { mutate: mutateCancelUpgradeRequestPlan, isPending: isPendingCancelUpgradeRequestPlan } =
    useMutation({
      mutationFn: cancelUpgradeRequestPlan,
      onSuccess: ({ data }) => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['getMyPlanDetails'] });
        handleAlert({
          text: data?.data?.message || 'Plan req cancelled successfully',
          type: 'success',
        });
        setCancelRequestPlan(false);
      },
    });

  const { mutate: mutateCancelSubscription, isPending: isPendingCancelSubscription } = useMutation({
    mutationFn: upgradeRequestPlan,
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['getMyPlanDetails'] });
      handleAlert({
        text: 'Subscription cancellation request sent successfully',
        type: 'success',
      });
      setIsCancelSubscriptionAlert(false);
    },
  });

  useEffect(() => {
    refetch();
  }, []);
  const [selectedManagementTab, setSelectedManagementTab] = useState<string>('License');
  const managementTabList = aiFeatures
    ? ['License', 'DID(s)', 'Storage', 'AI']
    : ['License', 'DID(s)', 'Storage'];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['License', 'DID(s)', 'Storage', 'AI'].includes(tabParam)) {
      setSelectedManagementTab(tabParam);
    }
  }, []);

  const RenderTabComponents = {
    'DID(s)': <DIDList />,
    License: (
      <LicenseManagement
        dataGetMyPlanDetails={dataGetMyPlanDetails}
        restrictPlan={requestedPlanInfo?.action_type}
      />
    ),
    Storage: <Storage />,
    ...(aiFeatures
      ? {
          AI: <AgentCosting />,
        }
      : {}),
  };

  const requestedCostObj = Array.isArray(requestedPlanInfo?.plan?.cost)
    ? requestedPlanInfo?.plan?.cost.find(
        (v: any) => durationMap[requestedPlanInfo?.duration] === v.type,
      )
    : null;

  const { mutate: mutateRenewPlan } = useMutation({
    mutationFn: renewPlan,
    onSuccess: async ({ data }) => {
      await paymentSuccess(data, 'Plan renewed successfully');
    },
    onError: () => {
      setIsRenewPaymentInitiate(false);
    },
  });
  const onSuccessPayment = (data: any) => {
    setIsRenewPaymentInitiate(true);
    const isNewCardRequest = data?.paymentType === 'NEW_CARD';
    const payload = {
      currency: 'usd',
      plan_uuid: userInfoData?.company_info?.plan_uuid,
      type: isNewCardRequest ? CARDS_TYPE.NEW_CARD : CARDS_TYPE.SAVED_CARD,
      company_uuid: userInfoData?.company_info?.uuid,
      ...(isNewCardRequest ? { payment_method_id: data?.id } : { card_id: data?.uuid }),
    };
    if (companyInfo?.is_trial === 'Y') {
      mutateUpgradeTrialPlan({
        ...payload,
        tax_calculation_id: getTaxes?.tax_calculation_id || '',
        licenses: getTaxes?.licenses || '',
        plan_duration: companyInfo?.plan_duration,
      });
    } else {
      mutateRenewPlan(payload);
    }
  };

  const paymentSuccess = async (data: any, fallbackMessage = 'Payment completed successfully') => {
    paymentRef.current?.resetPaymentState();
    setGetTaxes({});
    setIsPaymentInitiate(false);
    setIsRenewPaymentInitiate(false);
    handleAlert({ text: data?.data?.message || fallbackMessage, type: 'success' });

    await queryClient.invalidateQueries({ refetchType: 'none' });
    await new Promise((resolve) => window.setTimeout(resolve, POST_PAYMENT_REFRESH_DELAY_MS));
    await queryClient.refetchQueries({ type: 'active' });
  };

  const handlePlanCancelSubscription = () => {
    mutateCancelSubscription({
      requested_plan_uuid: companyInfo?.plan_uuid,
      type: UPGRADE_PLAN_TYPES.REQUESTED,
      // duration: upgradePlanReq?.plan_duration?.toString(),
      action_type: 'CANCEL',
    });
  };
  return (
    <>
      <section className="w-full bg-gray-200/15 overflow-x-auto overflow-y-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
          <div>
            <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
              Billing
              <div className="-rotate-90 text-gray-800">
                <Icon name="ChevronIcon" className="w-5 h-5" />
              </div>
              <span className="text-primary text-md">Plan Summary</span>
            </p>
            <p className="text-gray-500 text-xs">
              What you are paying for today, what changes at the next renewal, and what the plan
              includes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {requestedPlanInfo?.action_type === 'CANCEL' ? (
              <>
                <span className="text-xs text-red-500 italic">
                  A cancellation request is <span className="font-bold">active</span>, with
                  cancellation set for{' '}
                  <span className="font-bold">
                    {`${
                      dataGetMyPlanDetails?.current_plan_details?.plan_expiration_date
                        ? moment(
                            dataGetMyPlanDetails?.current_plan_details.plan_expiration_date,
                          ).format('DD MMM, YYYY')
                        : 'NA'
                    }.`}
                  </span>{' '}
                  Revoke to continue your subscription
                </span>
                <Button
                  variant={'default'}
                  onClick={() => {
                    setCancelRequestPlan(true);
                    setAlertMessage('revoke-plan');
                  }}
                  className="border-green-600 text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700"
                  size={'sm'}
                >
                  {isPendingCancelSubscription ? <Loader /> : 'Revoke Request'}
                </Button>
              </>
            ) : (
              <Button
                variant={'default'}
                onClick={() => setIsCancelSubscriptionAlert(true)}
                className="border-red-500 text-red-500 bg-red-500/10 hover:bg-red-500/20 hover:text-red-500"
                size={'sm'}
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>

        <div className="w-full p-3 flex flex-col gap-3">
          {/* The page showed today's price and next period's price in two
              separate boxes with nothing joining them, so a plan change read as
              a contradiction — "$49.99/user" above "$2/user". This states the
              change once, in words, before either figure appears. */}
          {(() => {
            const nowPrice = Number(
              dataGetMyPlanDetails?.current_plan_details?.discount_enabled
                ? dataGetMyPlanDetails?.current_plan_details?.discount_price
                : dataGetMyPlanDetails?.current_plan_details?.original_price,
            );
            const nextPrice = Number(dataGetMyPlanDetails?.next_billing_details?.original_price);
            if (!Number.isFinite(nowPrice) || !Number.isFinite(nextPrice)) return null;
            if (nowPrice === nextPrice) return null;
            const cheaper = nextPrice < nowPrice;
            const renews = dataGetMyPlanDetails?.next_billing_details?.next_billing_date;
            return (
              <div className={`mcm-planchange${cheaper ? ' down' : ' up'}`}>
                <strong>
                  Your plan changes at the next renewal — ${nowPrice.toFixed(2)} to $
                  {nextPrice.toFixed(2)} per user
                </strong>
                <span>
                  {cheaper ? 'A downgrade you requested takes effect' : 'The new rate applies'}
                  {renews ? ` on ${moment(renews).format('D MMM YYYY')}` : ''}. Everything below
                  reflects today's plan until then.
                </span>
              </div>
            );
          })()}
          <div className="flex flex-col sm:flex-row gap-3 h-[calc(100vh_-_9.7rem)] overflow-auto">
            <div className="flex flex-col gap-2 sm:w-1/2 h-full">
              <div className="border border-gray-200 rounded-xl w-full h-full p-3 bg-white overflow-y-auto">
                <div className="w-full flex flex-col gap-3">
                  <div className="mcm-setcard p-3 flex flex-col gap-3">
                    <div className="w-full flex items-center justify-between gap-2">
                      <h6 className="font-semibold text-gray-900 text-md">Current Plan</h6>
                      <div className="flex items-center gap-1">
                        {planFeatures?.action?.change_plan &&
                          dataGetMyPlanDetails?.current_plan_details?.is_trial == 'N' && (
                            <div className="flex justify-start gap-2">
                              {requestedPlanInfo ? (
                                <>
                                  <CustomTooltip text="Please cancel your current plan request before upgrading to new plan.">
                                    <Button size={'sm'} disabled={true}>
                                      Change Plan
                                    </Button>
                                  </CustomTooltip>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size={'sm'}
                                    onClick={() => setIsOpenChangePlan(true)}
                                    variant={'outline'}
                                  >
                                    Change Plan
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'N' && (
                          <Button
                            variant={'outline'}
                            size={'sm'}
                            onClick={() => setIsInvoiceDownloadModal(true)}
                          >
                            Download Invoice
                          </Button>
                        )}
                        {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'Y' && (
                          <Button
                            size={'sm'}
                            variant={'outline'}
                            disabled={isPendingTaxCalculation}
                            onClick={() => {
                              mutateTaxCalculate({
                                company_uuid: companyInfo?.uuid,
                                licenses: totalPaybleLicences,
                                type: 'TRIAL_PLAN_UPGRADE',
                              });
                            }}
                          >
                            {isPendingTaxCalculation && <Loader variant="blue" />}
                            Upgrade Now
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-primary text-md">
                        {dataGetMyPlanDetails?.current_plan_details?.plan_name || ''}{' '}
                        {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'Y' && (
                          <span className="text-green">(Trial)</span>
                        )}
                      </h4>
                      <span
                        className={`rounded-sm px-4 py-1 ${RequestedPlanStatusMap[dataGetMyPlanDetails?.current_plan_details?.plan_status]?.color || 'bg-green-100 text-green-600'}  cursor-pointer text-xs`}
                      >
                        {RequestedPlanStatusMap[
                          dataGetMyPlanDetails?.current_plan_details?.plan_status
                        ]?.label || 'NA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 text-base xxl:text-lg">
                        $
                        {dataGetMyPlanDetails?.current_plan_details?.discount_enabled
                          ? dataGetMyPlanDetails?.current_plan_details?.discount_price
                          : dataGetMyPlanDetails?.current_plan_details?.original_price}
                        /
                        {dataGetMyPlanDetails?.current_plan_details?.plan_duration === 12
                          ? 'year'
                          : 'month'}
                        /user
                      </h4>
                      {/* <span className="text-sm">
                        Auto-renews on{' '}
                        {dataGetMyPlanDetails?.current_plan_details?.plan_expiration_date
                          ? moment(
                              dataGetMyPlanDetails?.current_plan_details.plan_expiration_date,
                            ).format('DD MMM')
                          : 'NA'}
                      </span> */}
                    </div>
                    <div className="w-full">
                      <div className="flex flex-col gap-2 border-t border-gray-100 px-0 pt-3">
                        <h4 className="font-semibold text-gray-900 text-sm w-full">
                          Last billing charges for{' '}
                          {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'Y'
                            ? 1
                            : dataGetMyPlanDetails?.last_billing?.total_license}{' '}
                          licenses
                          {/* {moment(dataGetMyPlanDetails?.last_billing?.created_at).format(
                            'DD MMM, YYYY',
                          )}{' '}
                          : */}
                        </h4>
                        <span className="text-gray-900 text-sm border-t border-grey-200 w-full pt-2 font-medium">
                          {moment(dataGetMyPlanDetails?.last_billing?.created_at).format(
                            'DD MMM, YYYY',
                          )}{' '}
                          : $
                          {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'Y'
                            ? 0
                            : dataGetMyPlanDetails?.last_billing?.tax_detail?.plan_cost || 0}{' '}
                          X{' '}
                          {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'Y'
                            ? 1
                            : dataGetMyPlanDetails?.last_billing?.total_license}{' '}
                          = $
                          {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'Y'
                            ? 0
                            : dataGetMyPlanDetails?.last_billing?.tax_detail?.sub_total}{' '}
                          <sup className="text-gray-700 font-normal">(excl. Tax)</sup>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Next Billing */}

                  {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'N' &&
                  requestedPlanInfo?.action_type !== 'CANCEL' ? (
                    <div className="mcm-setcard p-3 flex flex-col gap-3">
                      <div className="w-full flex items-center justify-between gap-2">
                        <h6 className="font-semibold text-gray-900 text-md">Next Billing</h6>
                        <div className="flex items-center gap-1">
                          {planFeatures?.action?.change_plan && (
                            <div className="flex justify-start gap-2">
                              {isPlanExpired ||
                              dataGetMyPlanDetails?.current_plan_details?.is_trial === 'Y' ||
                              (!isPlanExpired &&
                                getDaysLeftUntilExpiration() <= 3 &&
                                getDaysLeftUntilExpiration() >= 0) ? (
                                <Button
                                  size={'sm'}
                                  variant={'outline'}
                                  disabled={isPendingTaxCalculation}
                                  onClick={() => {
                                    mutateTaxCalculate({
                                      company_uuid: companyInfo?.uuid,
                                      licenses: totalPaybleLicences,
                                      type: 'RENEWAL',
                                    });
                                  }}
                                >
                                  {isPendingTaxCalculation && <Loader variant="blue" />}Renew Now
                                </Button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900  text-base xxl:text-lg">
                          ${dataGetMyPlanDetails?.next_billing_details?.original_price}/
                          {dataGetMyPlanDetails?.current_plan_details?.plan_duration === 12
                            ? 'year'
                            : 'month'}
                          /user
                        </h4>
                        <span className="text-sm">
                          Auto-renews on{' '}
                          {dataGetMyPlanDetails?.next_billing_details?.next_billing_date
                            ? moment(
                                dataGetMyPlanDetails?.next_billing_details.next_billing_date,
                              ).format('DD MMM, YYYY')
                            : 'NA'}
                        </span>
                      </div>
                      <div className="w-full">
                        <div className="flex flex-col gap-2 border-t border-gray-100 px-0 pt-3">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            Next billing charges for {totalPaybleLicences} licenses :
                          </h4>
                          <span className="text-gray-900 text-sm border-t border-grey-200 w-full pt-2 font-medium">
                            ${dataGetMyPlanDetails?.next_billing_details?.original_price} X{' '}
                            {totalPaybleLicences} = $
                            {dataGetMyPlanDetails?.next_billing_details?.next_billing_amount || 0}{' '}
                            <sup className="text-gray-700 font-normal">(excl. Tax)</sup>
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isAdmin && (
                    <div className="mcm-setcard p-3 flex flex-col gap-3">
                      <h6 className="font-semibold text-gray-900 text-md">Usage</h6>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {aiUsageItems.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-lg border border-grey-200 bg-white px-3 py-2"
                          >
                            <span className="text-xs font-medium text-gray-600">{item.label}</span>
                            <p className="mt-1 text-lg font-semibold text-gray-900">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {countryRateItems.map(({ label, buttonLabel, ...rateDetails }) => (
                          <div
                            key={label}
                            className="flex items-center justify-between gap-3 rounded-lg border border-grey-200 bg-white px-3 py-2"
                          >
                            <p className="text-sm font-semibold text-gray-900">{label}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={!rateDetails.countries.length}
                              onClick={() => setRateModal(rateDetails)}
                            >
                              {buttonLabel}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Two progress bars, hidden behind a `hidden` attribute with a note
                      saying they would come back when ready. A bar shows roughly how full
                      something is and nothing else - not what you were given, not what you
                      spent, not what is left. Replaced with the four numbers somebody
                      actually needs, and shown rather than hidden. */}
                  <PlanUsageTable
                    lines={[
                      {
                        service: 'Calling',
                        included:
                          Number(dataGetMyPlanDetails?.current_plan_details?.call_duration) || 0,
                        used:
                          Number(dataGetMyPlanDetails?.current_plan_details?.call_duration_used) ||
                          0,
                        unit: 'minutes',
                      },
                      {
                        service: 'SMS / MMS',
                        included: Number(dataGetMyPlanDetails?.current_plan_details?.sms) || 0,
                        used: Number(dataGetMyPlanDetails?.current_plan_details?.sms_used) || 0,
                        unit: 'messages',
                      },
                    ]}
                  />
                  {/* <div className="mcm-setcard p-3 flex flex-col gap-3">
                    <h6 className="font-semibold text-gray-900 text-md border-b border-grey-200 pb-3">
                      Billing & Payments
                    </h6>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold text-gray-900 text-sm w-1/2">
                        Last payment for plan
                      </h4>
                      <h4 className="font-semibold text-gray-700 flex items-center justify-end gap-2 text-sm w-1/2">
                        {dataGetMyPlanDetails?.last_billing?.total_amount ? (
                          <>
                            $
                            {Number(dataGetMyPlanDetails?.last_billing?.total_amount || 0)?.toFixed(
                              0,
                            )}{' '}
                            <span className="text-gray-500 font-normal">
                              {moment(dataGetMyPlanDetails?.last_billing?.created_at).format(
                                'DD MMM, YYYY',
                              )}
                            </span>
                          </>
                        ) : (
                          '$0'
                        )}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold text-gray-900 text-sm w-1/2 flex items-center gap-2">
                        Next payment for plan
                        <CustomTooltip
                          text={
                            <>
                              Your next payment reflects active licenses. Revoked licenses are
                              <br />
                              removed, and any newly added licenses are included in the bill.
                            </>
                          }
                          side="right"
                        >
                          <span className="inline-flex items-center">
                            <Icon name={'NoticeLine'} className="w-4 h-4 cursor-pointer" />
                          </span>
                        </CustomTooltip>
                      </h4>
                      <h4 className="font-semibold text-gray-700 flex items-center justify-end gap-2  text-sm w-1/2">
                        ${dataGetMyPlanDetails?.next_billing_details?.next_billing_amount || 0}{' '}
                        <span className="text-gray-500 font-normal">
                          {moment(
                            dataGetMyPlanDetails?.current_plan_details?.plan_expiration_date,
                          ).format('DD MMM, YYYY')}
                        </span>
                      </h4>
                    </div>
                    <div className="w-full">
                      <Button
                        variant={'outline'}
                        size={'sm'}
                        onClick={() => setIsInvoiceDownloadModal(true)}
                      >
                        Download Invoice
                      </Button>
                    </div>
                  </div> */}
                </div>

                {/* ---Requested Plan---- */}
                {requestedPlanInfo && requestedPlanInfo?.action_type !== 'CANCEL' ? (
                  <div className="border-t border-gray-200 w-full pt-3 mt-3 bg-white flex gap-3">
                    <div className="w-1/2">
                      <h6 className="font-semibold text-gray-900 text-md">Requested Plan</h6>
                      <div className="flex items-center gap-2 my-2">
                        <h4 className="font-semibold text-primary text-md">
                          {tempReqPlan?.plan_name || 'NA'}
                        </h4>
                        <span
                          className={`rounded-sm px-4 py-1 text-xs ${
                            RequestedPlanStatusMap[requestedPlanInfo?.status]?.color ||
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {RequestedPlanStatusMap[requestedPlanInfo?.status]?.label || 'NA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-900 text-lg">
                          $
                          {requestedCostObj?.discount_enabled
                            ? requestedCostObj?.discount_price
                            : requestedCostObj?.original_price}
                          /{RequestedPlanDurationMap[Number(requestedPlanInfo?.duration)]}/user
                        </h4>
                      </div>
                      <Button
                        variant={'outline'}
                        size={'sm'}
                        onClick={() => {
                          setCancelRequestPlan(true);
                          setAlertMessage('cancel-plan');
                        }}
                      >
                        Cancel Request Plan
                      </Button>
                    </div>
                    <div className=" w-1/2">
                      <div className="mcm-setcard p-3 mt-2 flex flex-col gap-3 w-full">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-gray-900 text-sm w-1/2">
                            Requested Date
                          </h4>
                          <h4 className="font-medium text-gray-500 flex items-center justify-end gap-2 text-sm w-1/2">
                            {formatDate(requestedPlanInfo?.created_at) || 'NA'}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-gray-900 text-sm w-1/2">
                            Activation Date
                          </h4>
                          <h4 className="font-medium text-gray-500 flex items-center justify-end gap-2 text-sm w-1/2">
                            {formatDate(
                              dataGetMyPlanDetails?.current_plan_details?.plan_expiration_date,
                            ) || 'NA'}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl sm:w-1/2 p-3 w-full bg-white xs:mt-1 sm:mt-0">
              <Tabs
                defaultValue={selectedManagementTab}
                value={selectedManagementTab}
                onValueChange={(v) => setSelectedManagementTab(v)}
                className="flex w-full h-full"
              >
                <div className="border-b border-gray-200 w-full">
                  <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none min-h-10 ">
                    {managementTabList?.map((tab: any) => {
                      return (
                        <TabsTrigger
                          className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6 text-gray-700 cursor-pointer h-full rounded-none flex-1 relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs"
                          value={tab}
                        >
                          {tab}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                <TabsContent
                  value={selectedManagementTab}
                  className="h-[calc(100vh_-_14.8rem)] overflow-y-auto overflow-x-hidden min-w-0"
                >
                  {RenderTabComponents[selectedManagementTab as keyof typeof RenderTabComponents]}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {isOpenChangePlan && (
            <ChangePlan
              {...{
                open: isOpenChangePlan,
                setOpen: setIsOpenChangePlan,
                planFeatures,
                dataGetMyPlanDetails,
              }}
            />
          )}

          <AlertConfirm
            open={cancelRequestPlan}
            setOpen={setCancelRequestPlan}
            onConfirm={() => mutateCancelUpgradeRequestPlan({ plan_uuid: requestedPlanInfo?.uuid })}
            descriptionTextComp={
              <div className="text-md">
                {alertMessage === 'revoke-plan'
                  ? 'Are you sure, you want to revoke your plan cancellation request?'
                  : 'Are you sure, you want to cancel your current requested plan?'}
              </div>
            }
            apiLoading={isPendingCancelUpgradeRequestPlan}
          />
        </div>
      </section>

      {isCancelSubscriptionAlert && (
        <AlertConfirm
          open={isCancelSubscriptionAlert}
          setOpen={setIsCancelSubscriptionAlert}
          onConfirm={() => handlePlanCancelSubscription()}
          descriptionTextComp={
            <div className="text-md">Are you sure you want to cancel your subscription?</div>
          }
          apiLoading={isPendingCancelSubscription}
          headerText="Confirm Cancellation"
        />
      )}

      {invoiceDownloadModal && (
        <InvoiceDetails
          {...{
            info: dataGetMyPlanDetails?.last_billing,
            drawerState: invoiceDownloadModal,
            setDrawerState: () => {
              setIsInvoiceDownloadModal(false);
            },
          }}
        />
      )}

      {rateModal && (
        <Dialog open={true} onOpenChange={(open) => !open && setRateModal(null)}>
          <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>{rateModal.title}</DialogTitle>
              <DialogDescription>
                Rates are calculated using the Free Credit amount available in your plan.
              </DialogDescription>
            </DialogHeader>
            <RateDetails
              countries={rateModal.countries}
              credits={Number(companyInfo?.credits) || 0}
              rateTypes={rateModal.rateTypes}
              rateCardIds={rateModal.rateCardIds}
            />
          </DialogContent>
        </Dialog>
      )}

      {isPaymentInitiate && (
        <Dialog open={isPaymentInitiate} onOpenChange={setIsPaymentInitiate}>
          <DialogContent
            className="w-2/5 p-3 max-h-[99%] overflow-y-auto bg-white"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            showCloseButton={false}
          >
            <div className="flex flex-col gap-1.5  text-900/80">
              <div className="font-semibold truncate text-md flex items-center justify-between">
                {dataGetMyPlanDetails?.current_plan_details?.is_trial == 'Y' ? 'Upgrade' : 'Renew'}{' '}
                Plan
                <div
                  onClick={() => setIsPaymentInitiate(false)}
                  className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
                >
                  <CloseIcon className="w-3 h-3" />
                </div>
              </div>
            </div>
            <div className="px-3">
              <PaymentScreen
                ref={paymentRef}
                onSuccessPayment={onSuccessPayment}
                isSavedPaymentCard={false}
                enableSaveCard={true}
                onSuccess3dsPayment={() => paymentSuccess(null, 'Plan upgraded successfully')}
                onFailure3dsPayment={() => {
                  setIsPaymentInitiate(false);
                  setIsRenewPaymentInitiate(false);
                }}
                isApiLoad={isRenewPaymentInitiate || isPendingUpgradeTrialPlan}
                submitButtonText={`Pay $${getTaxes?.total_amount || 0}`}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Plan;
