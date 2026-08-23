import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import VisaCardImage from '@/assets/images/visa-card.png';
import CardImage from '@/assets/images/cardimage.png?url';
import { useGetSavedCards } from '@/hooks/common';
import { handleAlert } from '@/lib/utils';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import Loader from '../custom/loader';
import { getPaymentErrorMessage } from './payment-error';

const PAYMENT_TYPES = {
  NEW_CARD: 'New Card',
  SAVED_CARD: 'Saved Cards',
};

const PaymentScreen = forwardRef(
  (
    {
      onSuccessPayment = () => {},
      submitButtonText = 'Pay',
      isSavedPaymentCard = false,
      onSuccess3dsPayment = () => {},
      onFailure3dsPayment = () => {},
      isApiLoad = false,
      enableSaveCard = true,
      showIsSaveCard = true,
      showIsStaticSaveCard = false,
      // staticSavedCards = []
    }: any,
    ref,
  ) => {
    const stripe: any = useStripe();
    const elements: any = useElements();
    const [cardHolderName, setCardHolderName] = useState('');
    const [error, setError] = useState<string | undefined | null>(null);
    const [loader, setLoader] = useState(false);
    const [selectedCard, setSelectedCard] = useState<any>(null);
    const [paymentType, setPaymentType] = useState<any>(
      isSavedPaymentCard ? PAYMENT_TYPES.NEW_CARD : PAYMENT_TYPES.SAVED_CARD,
    );

    const [isSavedCard, setIsSavedCard] = useState(false);

    const { data: dataGetSavedCards, isLoading: isLoadingSavedCard } =
      useGetSavedCards(enableSaveCard);

    const isStripeError = !stripe || !elements;
    const isDisabled = isLoadingSavedCard
      ? true
      : paymentType === PAYMENT_TYPES.NEW_CARD
        ? isStripeError || !cardHolderName
        : !selectedCard;

    // const { mutate: mutateAddCard, isPending } = useMutation({
    //   mutationFn: addCard,
    // });

    const isLoading = [loader, isApiLoad].includes(true);
    const hasSavedCards = Boolean(dataGetSavedCards?.length);
    const shouldShowSubmitButton = paymentType === PAYMENT_TYPES.NEW_CARD || hasSavedCards;

    const resetPaymentState = () => {
      elements?.getElement(CardNumberElement)?.clear();
      elements?.getElement(CardExpiryElement)?.clear();
      elements?.getElement(CardCvcElement)?.clear();
      setCardHolderName('');
      setError(null);
      setLoader(false);
      setSelectedCard(null);
      setIsSavedCard(false);
      setPaymentType(isSavedPaymentCard ? PAYMENT_TYPES.NEW_CARD : PAYMENT_TYPES.SAVED_CARD);
    };

    const handle3DSFailure = (paymentError: unknown) => {
      const message = getPaymentErrorMessage(paymentError);

      setLoader(false);
      setError(message);
      handleAlert({ text: message, type: 'error' });
      onFailure3dsPayment(paymentError, message);
    };

    const handle3DS = async (clientSecret: unknown = null) => {
      if (!stripe || !elements) {
        handle3DSFailure('Payment service is unavailable. Please try again.');
        return;
      }

      if (typeof clientSecret !== 'string' || !clientSecret.trim()) {
        handle3DSFailure('Unable to authenticate this payment. Please try again.');
        return;
      }

      setLoader(true);

      let result;
      try {
        result = await stripe.confirmCardPayment(clientSecret);
      } catch (paymentError) {
        handle3DSFailure(paymentError);
        return;
      }

      if (result?.error) {
        handle3DSFailure(result.error);
      } else if (result?.paymentIntent && result?.paymentIntent.status === 'succeeded') {
        setLoader(false);
        setError(null);
        onSuccess3dsPayment(result.paymentIntent);
      } else {
        handle3DSFailure(result?.paymentIntent || result);
      }
    };

    useImperativeHandle(ref, () => ({
      handle3DSPayment: (clientSecret: unknown) => {
        return handle3DS(clientSecret);
      },
      resetPaymentState,
    }));

    const handlePay = async () => {
      if (isDisabled) return;
      if (paymentType === PAYMENT_TYPES.NEW_CARD) {
        if (isStripeError) return handleAlert({ text: 'Stripe was not working.', type: 'error' });
        try {
          setLoader(true);
          const cardElement = elements.getElement(CardNumberElement);
          const { error: createPaymentError, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement as any,
          });
          if (createPaymentError) {
            setLoader(false);
            setError(createPaymentError?.message);
          } else {
            setLoader(false);
            setError(null);
            // if (isSavedCard) {
            //   mutateAddCard({
            //     payment_method_id: paymentMethod?.id || paymentMethod?.payment_method_id,
            //   });
            // }
            onSuccessPayment({
              ...paymentMethod,
              isSavedCard,
              cardHolderName,
              paymentType: 'NEW_CARD',
              setLoader,
            });
          }
        } catch (error) {
          setLoader(false);
          return error;
        }
      } else {
        setLoader(false);
        onSuccessPayment({ ...selectedCard, setLoader });
      }
    };

    const RenderCardComponents = {
      ...(isSavedPaymentCard === false && {
        [PAYMENT_TYPES.SAVED_CARD]: (
          <SavedCards
            cards={dataGetSavedCards}
            selectedCard={selectedCard}
            setSelectedCard={setSelectedCard}
          />
        ),
      }),
      [PAYMENT_TYPES.NEW_CARD]: (
        <NewCard
          error={error}
          cardHolderName={cardHolderName}
          setCardHolderName={setCardHolderName}
          isSavedCard={isSavedCard}
          setIsSavedCard={setIsSavedCard}
          showIsSaveCard={showIsSaveCard}
        />
      ),
    };

    useEffect(() => {
      setSelectedCard(null);
    }, [paymentType]);

    if (isLoadingSavedCard) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader variant="blue" />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full">
        <Tabs
          defaultValue={paymentType}
          value={paymentType}
          onValueChange={(v) => setPaymentType(v)}
          className="flex w-full"
        >
          {(enableSaveCard || showIsStaticSaveCard) && (
            <div className="border-b border-gray-200 w-full">
              <TabsList className="flex text-sm font-semibold text-center  p-0 rounded-none min-h-10 ">
                {Object?.values(PAYMENT_TYPES)?.map((v: any) => {
                  return (
                    <TabsTrigger
                      key={v}
                      className="data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 px-6  text-gray-700 cursor-pointer h-full rounded-none w-2/4 m-auto relative flex gap-1 bg-transparent font-semibold data-[state=active]:shadow-2xs "
                      value={v}
                    >
                      {v}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          )}

          <TabsContent value={paymentType}>{RenderCardComponents[paymentType]}</TabsContent>
        </Tabs>
        {shouldShowSubmitButton ? (
          <div className="flex justify-end">
            <Button
              variant={'outline'}
              onClick={handlePay}
              disabled={isDisabled || isLoading}
              className="w-full max-w-36"
            >
              {isLoading ? <Loader variant="blue" /> : submitButtonText}
            </Button>
          </div>
        ) : null}
      </div>
    );
  },
);

export default PaymentScreen;

const SavedCards = ({ cards, selectedCard, setSelectedCard }: any) => {
  return (
    <div
      className="w-full flex flex-col gap-2 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 
                rounded-xl pr-1"
    >
      {cards?.length > 0
        ? cards?.map(({ uuid = '', last4 = '', ...card }) => (
            <label key={uuid} htmlFor={uuid} className="cursor-pointer">
              <input
                type="radio"
                id={uuid}
                name="saved-card-list"
                checked={selectedCard?.uuid === uuid}
                onChange={() =>
                  setSelectedCard({ uuid, last4, paymentType: 'SAVED_CARD', ...card })
                }
                className="peer hidden"
              />
              <div
                className="flex items-center gap-4 px-3
                            rounded-xl border border-gray-300 
                            peer-checked:border-primary peer-checked:bg-primary/10 
                            transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <img src={VisaCardImage} alt="Visa Card" className="w-10 h-10 object-contain" />

                <div className="flex items-center gap-2 text-gray-900">
                  <p className="text-md font-semibold tracking-wider">****</p>
                  <p className="text-md font-semibold tracking-wider">{last4}</p>
                </div>
              </div>
            </label>
          ))
        : 'No saved card '}
    </div>
  );
};

const NewCard = ({
  error,
  cardHolderName,
  setCardHolderName,
  isSavedCard,
  setIsSavedCard,
  showIsSaveCard,
}: any) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 mt-2">
        <img src={CardImage} alt="Card Image" className="h-full" />
      </div>
      {error && <p className="text-red-500 font-normal">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex gap-1.5 w-full flex-col">
          <p className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
            Card Holder Name
          </p>
          <Input
            placeholder="Name"
            value={cardHolderName}
            onChange={(e) => setCardHolderName(e.target.value)}
            className="p-3 min-h-10"
          />
        </div>
        <div className="flex gap-1.5 w-full flex-col">
          <p className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
            Card Number
          </p>
          <CardNumberElement
            options={{
              showIcon: true,
              placeholder: '**** **** **** ****',
            }}
            className="stripe-element w-full border normal-case border-gray-300 focus:shadow-secondary/5 focus:ring-white shadow-secondary/5 disabled:bg-gray-300 disabled:text-slate-500 disabled:border-gray-200 disabled:shadow-none text-gray-700 placeholder:text-gray-700 bg-white shadow-sm text-sm hover:border-primary rounded-xl focus:border-primary p-3 min-h-10"
          />
        </div>
        <div className="flex gap-1.5 w-full flex-col">
          <p className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
            Expiration Date
          </p>
          <CardExpiryElement className="stripe-element w-full border normal-case border-gray-300 focus:shadow-secondary/5 focus:ring-white shadow-secondary/5 disabled:bg-gray-300 disabled:text-slate-500 disabled:border-gray-200 disabled:shadow-none text-gray-700 placeholder:text-gray-700 bg-white shadow-sm text-sm hover:border-primary rounded-xl focus:border-primary p-3 min-h-10" />
        </div>
        <div className="flex gap-1.5 w-full flex-col">
          <p className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
            CVC
          </p>
          <CardCvcElement className="stripe-element w-full border normal-case border-gray-300 focus:shadow-secondary/5 focus:ring-white shadow-secondary/5 disabled:bg-gray-300 disabled:text-slate-500 disabled:border-gray-200 disabled:shadow-none text-gray-700 placeholder:text-gray-700 bg-white shadow-sm text-sm hover:border-primary rounded-xl focus:border-primary p-3 min-h-10" />
        </div>
      </div>
      {showIsSaveCard && (
        <div className="flex gap-2 cursor-pointer">
          <Checkbox id="1" value={isSavedCard} onCheckedChange={(e) => setIsSavedCard(e)} />
          <Label htmlFor="1" className="cursor-pointer">
            Save this card for future payments
          </Label>
        </div>
      )}
    </div>
  );
};
