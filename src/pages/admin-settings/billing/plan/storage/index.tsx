import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useRef } from 'react';
import { billingStorage, buyExtraStorage, getProratedCost } from '@/services/api';
import { useGetMyPlanDetails, useGetPlans } from '@/hooks/common';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PaymentScreen from '@/components/payment';
import { handleAlert } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

// Register
ChartJS.register(ArcElement, Tooltip, Legend);

const Storage = () => {
  const { user } = useUser();
  const isTrial = user?.company_info?.is_trial === 'Y';
  const { data: planList } = useGetPlans();
  const { data: dataGetMyPlanDetails } = useGetMyPlanDetails();
  const [extraGb, setExtraGb] = useState(1);

  const current_plan = planList?.find(
    (item: any) => item?.uuid === dataGetMyPlanDetails?.current_plan_details?.plan_uuid,
  );
  const perGbPrice = Number(current_plan?.per_gb_price || 0);
  const totalPrice = (extraGb * perGbPrice).toFixed(2);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const paymentRef = useRef<any>(null);
  const queryClient = useQueryClient();

  const { data: apiRes, isLoading } = useQuery({
    queryKey: ['billingStorage'],
    queryFn: billingStorage,
  });

  const { mutate: mutateBuyStorage, isPending: isPendingBuyStorage } = useMutation({
    mutationFn: buyExtraStorage,
  });

  const { mutate: mutateGetProratedCost, isPending: isPendingProrated } = useMutation({
    mutationFn: getProratedCost,
  });

  const [proratedData, setProratedData] = useState<any>(null);

  const onSuccessPayment = (data: any) => {
    const isNewCardRequest = data?.paymentType === 'NEW_CARD';
    const setLoader = data?.setLoader;

    mutateBuyStorage(
      {
        extra_storage_space: extraGb,
        ...(isNewCardRequest ? { payment_method_id: data?.id } : { card_id: data?.uuid }),
      },
      {
        onSuccess: (res) => {
          const buyData = res?.data?.data?.result;

          console.log(buyData, 'buyDatabuyData', data);

          if (buyData?.requires_action) {
            paymentRef.current.handle3DSPayment(buyData?.payment_intent_id);
            return;
          }
          setLoader(false);
          handlePaymentSuccess(
            res?.data?.data?.message ||
              'Storage purchased successfully, Storage will be updated in few minutes',
          );
        },
        onError: (err: any) => {
          handleAlert({ text: err?.response?.data?.message || 'Purchase failed', type: 'error' });
          setLoader(false);
        },
      },
    );
  };

  const handlePaymentSuccess = (
    message = 'Storage purchased successfully, Storage will be updated in few minutes',
  ) => {
    paymentRef.current?.resetPaymentState();
    handleAlert({ text: message, type: 'success' });
    setShowPaymentModal(false);
    setExtraGb(1);
    setProratedData(null);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['billingStorage'] });
    }, 5000);
  };

  const result = apiRes?.data?.data?.result;

  /* ---------------- DATA ---------------- */
  const { chartData, used, total, percentage } = useMemo(() => {
    if (!result) {
      return { chartData: null, used: 0, total: 0, percentage: 0 };
    }

    const used = Number(result.used_storage?.total_size_gb || 0);
    const total = Number(result.total_allowed_storage_gb || 0);

    const safeUsed = Math.min(used, total);
    const free = Math.max(total - used, 0);

    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

    return {
      used,
      total,
      percentage,
      chartData: {
        labels: ['Used', 'Free'],
        datasets: [
          {
            data: [safeUsed, free],
            backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(200, 200, 200, 0.3)'],
            borderWidth: 0,
          },
        ],
      },
    };
  }, [result]);

  /* ---------------- OPTIONS ---------------- */
  const options = {
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const totalVal = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percent = ((value / totalVal) * 100).toFixed(1);
            return `${context.label}: ${value} GB (${percent}%)`;
          },
        },
      },
    },
  };

  /* ---------------- UI ---------------- */
  if (isLoading) {
    return <div style={{ textAlign: 'center' }}>Loading...</div>;
  }

  if (!chartData) {
    return <div style={{ textAlign: 'center' }}>No data available</div>;
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        paddingBottom: '12px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
          padding: '20px 16px',
          boxSizing: 'border-box',
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>Storage Usage</h3>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Monitor your storage consumption
          </p>
        </div>

        {/* CHART */}
        <div
          style={{
            position: 'relative',
            margin: '20px auto',
            width: '100%',
            maxWidth: '300px',
            aspectRatio: '1 / 1',
          }}
        >
          <Pie data={chartData} options={options} />

          {/* CENTER TEXT */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: percentage > 90 ? '#ef4444' : '#111',
              }}
            >
              {percentage}%
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Used</div>
          </div>
        </div>
      </div>

      {/* USAGE TEXT */}
      <div style={{ textAlign: 'center', marginBottom: '12px', padding: '0 16px' }}>
        <span style={{ fontWeight: 600 }}>{used} GB</span>
        <span style={{ color: '#666' }}> of {total} GB used</span>
      </div>

      {/* PROGRESS BAR */}
      <div
        style={{
          height: '6px',
          borderRadius: '6px',
          background: '#eee',
          overflow: 'hidden',
          marginBottom: '16px',
          marginLeft: '16px',
          marginRight: '16px',
        }}
      >
        <div
          className={percentage <= 90 ? 'bg-ucass-primary' : ''}
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: '100%',
            background: percentage > 90 ? 'linear-gradient(90deg, #ef4444, #f87171)' : undefined,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* DETAILS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px',
          fontSize: '12px',
          padding: '0 16px',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <div className="cardItem">
          <strong>Objects</strong>
          <div>{result.used_storage?.total_objects}</div>
        </div>

        <div className="cardItem">
          <strong>Size (GB)</strong>
          <div>{result.used_storage?.total_size_gb}</div>
        </div>

        <div className="cardItem">
          <strong>Size (MB)</strong>
          <div>{result.used_storage?.total_size_mb}</div>
        </div>

        <div className="cardItem">
          <strong>Extra</strong>
          <div>{result.extra_storage_space_gb} GB</div>
        </div>

        <div className="cardItem">
          <strong>Plan Free</strong>
          <div>{result.plan_free_storage_gb} GB</div>
        </div>

        <div className="cardItem">
          <strong>Total Allowed</strong>
          <div>{result.total_allowed_storage_gb} GB</div>
        </div>
      </div>

      {/* PURCHASE SECTION */}
      {!isTrial && (
        <div
          style={{
            marginTop: '30px',
            padding: '24px 16px',
            backgroundColor: '#f9fafb',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            margin: '20px 16px 12px 16px',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111' }}>
              Need more space?
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
              Add extra storage to your plan for <strong>${perGbPrice} per GB</strong>.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                overflow: 'hidden',
                height: '42px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <button
                onClick={() => setExtraGb((prev) => Math.max(1, prev - 1))}
                style={{
                  width: '40px',
                  height: '100%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                -
              </button>
              <input
                type="number"
                value={extraGb}
                onChange={(e) => setExtraGb(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '50px',
                  border: 'none',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: 600,
                  outline: 'none',
                  color: '#111',
                }}
              />
              <button
                onClick={() => setExtraGb((prev) => prev + 1)}
                style={{
                  width: '40px',
                  height: '100%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                +
              </button>
            </div>

            <div
              style={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginRight: 'auto' }}
            >
              GB
            </div>

            <button
              onClick={() => {
                mutateGetProratedCost(
                  { cost: totalPrice },
                  {
                    onSuccess: (res) => {
                      setProratedData(res?.data?.data?.result);
                      setShowPaymentModal(true);
                    },
                    onError: (err: any) => {
                      handleAlert({
                        text: err?.response?.data?.message || 'Failed to get prorated cost',
                        type: 'error',
                      });
                    },
                  },
                );
              }}
              disabled={isPendingProrated}
              className="bg-ucass-active hover:opacity-90"
              style={{
                flex: '1',
                minWidth: '150px',
                height: '42px',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: isPendingProrated ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isPendingProrated ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isPendingProrated) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isPendingProrated) {
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isPendingProrated ? 'Fetching Cost...' : `Buy Now $${totalPrice}`}
            </button>
          </div>
        </div>
      )}

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Purchase</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-4">
              You are purchasing <strong>{extraGb} GB</strong> of extra storage for{' '}
              <strong>${totalPrice}</strong>.
              {proratedData && (
                <span className="block mt-2 p-2 bg-ucass-active-bg border border-ucass-active-bg rounded-md text-ucass-active">
                  Prorated cost for remaining <strong>{proratedData.remainingDays || 0}</strong>{' '}
                  days: <strong>${proratedData.proratedCost}</strong>
                </span>
              )}
            </p>
            <PaymentScreen
              ref={paymentRef}
              onSuccessPayment={onSuccessPayment}
              isSavedPaymentCard={false}
              onSuccess3dsPayment={() => handlePaymentSuccess()}
              onFailure3dsPayment={() => setShowPaymentModal(false)}
              isApiLoad={isPendingBuyStorage}
              submitButtonText={`Pay $${proratedData?.proratedCost || totalPrice}`}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Storage;
