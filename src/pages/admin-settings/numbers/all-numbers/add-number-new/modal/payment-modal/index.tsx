import PaymentScreen from '@/components/payment';
import { invalidateNumberLists } from '@/lib/number-list-cache';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { buyFaxDidNumbers, didAssign, didCompleteProcess, didCreateOrder } from '@/services/api';
import { getEnv, handleAlert } from '@/lib/utils';
import { CloseIcon } from '@/assets/icons';

const PaymentModal = ({
  modalState,
  setModalState,
  handleClose,
  data,
  amount,
  billingDetails,
  IDs,
  features,
  isFaxNumber,
  faxReservationId,
}: any) => {
  const queryClient = useQueryClient();
  const paymentRef = useRef<any>(null);
  const paymentData = useRef<any>(null);

  const { mutate: mutateDIDAssign } = useMutation({
    mutationKey: ['didAssign'],
    mutationFn: didAssign,
  });

  const { mutate: mutateCreateOrder, isPending } = useMutation({
    mutationFn: isFaxNumber ? buyFaxDidNumbers : didCreateOrder,
    onSuccess: (response) => {
      const responseData = response?.data?.data ?? response?.data ?? response;
      const result = responseData?.result;

      if (result?.requires_action) {
        paymentData.current = result?.didProcessObj;
        paymentRef.current.handle3DSPayment(result?.payment_intent || result?.payment_intent_id);
        return;
      }
      handleSuccess(responseData?.message);
    },
  });
  const handleSuccess = (message = 'Order Created Successfully') => {
    paymentRef.current?.resetPaymentState();
    paymentData.current = null;
    setModalState(false);
    if (data?.groupId?.needs_registration) {
      mutateDIDAssign({
        did_number: data?.virtualNumbers?.[0]?.name as string,
        did_id: data?.virtualNumbers?.[0]?.value,
        identity_id: IDs?.identity_id,
        address_id: IDs?.address_id,
        callback_url: `${getEnv()?.VITE_API_BASE_URL}/api/identity/did/assign/callback`,
      });
    }
    handleClose();
    invalidateNumberLists(queryClient);
    if (message) handleAlert({ text: message, type: 'success' });
  };

  const { mutate: mutateDidCompleteProcess, isPending: didCompletePending } = useMutation({
    mutationKey: ['didCompleteProcess'],
    mutationFn: didCompleteProcess,
  });

  const isApiLoad = [isPending, didCompletePending].some((v) => v);

  useEffect(() => {
    if (!modalState) return;

    const forceBodyPointerEvents = () => {
      if (document?.body?.style?.pointerEvents === 'none') {
        document.body.style.pointerEvents = 'auto';
      }
    };

    forceBodyPointerEvents();
    const intervalId = window.setInterval(forceBodyPointerEvents, 75);

    return () => {
      window.clearInterval(intervalId);
      if (document?.body?.style?.pointerEvents === 'auto') {
        document.body.style.pointerEvents = '';
      }
    };
  }, [modalState]);

  const handle3DSFailure = () => {
    const failedPaymentData = paymentData.current;
    paymentData.current = null;
    setModalState(false);

    if (!failedPaymentData) return;

    mutateDidCompleteProcess({
      did_process: { ...failedPaymentData, payment_succeeded: false },
      did_ids: failedPaymentData?.requestedData?.did_ids,
    });
  };

  const handle3DSSuccess = () => {
    const confirmedPaymentData = paymentData.current;

    mutateDidCompleteProcess(
      {
        did_process: { ...confirmedPaymentData, payment_succeeded: true },
        did_ids: confirmedPaymentData?.requestedData?.did_ids,
      },
      {
        onSuccess: (data) => {
          handleSuccess(data?.data?.data?.message);
        },
      },
    );
  };
  const onSuccessPayment = (paymentMethod: any) => {
    const didCity =
      data?.areaCode?.label ||
      data?.areaCode?.value ||
      data?.city?.label ||
      data?.city?.value ||
      data?.city;

    const payload = isFaxNumber
      ? {
          did_number: data?.virtualNumbers?.[0]?.name,
          country_name: data?.location?.label,
          country_iso: data?.location?.value,
          package_uuid: data?.location?.fax_package_uuid,
          reservation_id: faxReservationId,
          did_type: data?.numberType?.value === 'toll_free' ? 'T' : 'L',
          city: '',
          state: '',
          features: ['fax'],
          payment_method_id: paymentMethod?.id || paymentMethod?.payment_method_id,
          save: Boolean(paymentMethod?.isSavedCard),
        }
      : {
          type: 'stripe',
          save: paymentMethod?.isSavedCard,
          payment_method_id: paymentMethod?.id || paymentMethod?.payment_method_id,
          did_ids: data?.virtualNumbers?.length
            ? data?.virtualNumbers?.map((item: any) => item?.value)
            : [data?.groupId?.value],
          amount,
          country: data?.location?.value,
          did_type: data?.numberType,
          ...(didCity ? { did_city: didCity } : {}),
          name: data?.did_name || '',
          site: data?.site?.value,
          callback_url: `${getEnv()?.VITE_API_BASE_URL}/api/didw/callback`,
          package_uuid: billingDetails?.package_uuid,
          package_type: billingDetails?.package_type,
          features: Array.isArray(features) ? features : [],
        };
    paymentMethod?.setLoader(false);
    mutateCreateOrder(payload);
  };
  return (
    <Dialog
      open={modalState}
      onOpenChange={(val) => {
        if (!isApiLoad) setModalState(val);
      }}
    >
      <DialogContent
        className="w-1/2 p-3 max-h-[99%] overflow-y-auto"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <section className="w-full flex">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col">
              <div className="flex justify-between items-center">
                <div className="text-gray-900 font-semibold text-lg">Checkout</div>
                <div
                  onClick={() => {
                    if (!isApiLoad) setModalState(false);
                  }}
                  className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
                >
                  <CloseIcon className="w-3 h-3" />
                </div>
              </div>
              <div className="text-gray-800 text-sm">Select and add your payment information</div>
            </div>
            <PaymentScreen
              ref={paymentRef}
              onSuccessPayment={onSuccessPayment}
              submitButtonText={`Pay $${amount || 0}`}
              // submitButtonText={`Pay $${getPriceWithTax()}`}
              isSavedPaymentCard={false}
              onSuccess3dsPayment={() => handle3DSSuccess()}
              onFailure3dsPayment={handle3DSFailure}
              isApiLoad={isApiLoad}
            />
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
