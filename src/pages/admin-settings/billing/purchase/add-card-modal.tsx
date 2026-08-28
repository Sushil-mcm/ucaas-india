import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { handleAlert } from '@/lib/utils';
import { addCard } from '@/services/api';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CardImage from '@/assets/images/cardimage.png?url';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { CloseIcon } from '@/assets/icons';

const AddCardModal = ({ open, setOpen }: { open: any; setOpen: any }) => {
  const queryClient = useQueryClient();
  const stripe: any = useStripe();
  const elements: any = useElements();
  const [error, setError] = useState(null);
  const [loader, setLoader] = useState(false);
  const [cardHolderName, setCardHolderName] = useState('');

  const isStripeError = !stripe || !elements;

  const { mutate: mutateAddCard, isPending } = useMutation({
    mutationFn: addCard,
    onSuccess: ({ data }: any) => {
      queryClient.invalidateQueries({ queryKey: ['useGetSavedCards'], exact: false, type: 'all' });
      handleAlert({ text: data?.data?.message || 'Card added successfully.', type: 'success' });
      setOpen(false);
    },
  });

  const handleAddCard = async () => {
    if (isStripeError) handleAlert({ text: 'Stripe was not working.', type: 'error' });
    try {
      setLoader(true);
      const cardElement = elements.getElement(CardNumberElement);
      const { error: createPaymentError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      if (createPaymentError) {
        setLoader(false);
        setError(createPaymentError?.message);
      } else {
        setError(null);
        setLoader(false);
        mutateAddCard({
          payment_method_id: paymentMethod?.id || paymentMethod?.payment_method_id,
        });
      }
    } catch (error) {
      setLoader(false);
      return error;
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:w-2/6 p-3"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5  text-900/80 ">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Add Card
            <div
              onClick={() => setOpen(false)}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

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
                className="stripe-element w-full border normal-case border-grey-400 focus:shadow-secondary/5 focus:ring-white shadow-secondary/5 disabled:bg-grey-300 disabled:text-slate-500 disabled:border-grey-300 disabled:shadow-none text-grey-700 placeholder:text-grey-700 bg-white shadow-sm text-sm hover:border-primary rounded-xl focus:border-primary p-3 min-h-10"
              />
            </div>
            <div className="flex gap-1.5 w-full flex-col">
              <p className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Expiration Date
              </p>
              <CardExpiryElement className="stripe-element w-full border normal-case border-grey-400 focus:shadow-secondary/5 focus:ring-white shadow-secondary/5 disabled:bg-grey-300 disabled:text-slate-500 disabled:border-grey-300 disabled:shadow-none text-grey-700 placeholder:text-grey-700 bg-white shadow-sm text-sm hover:border-primary rounded-xl focus:border-primary p-3 min-h-10" />
            </div>
            <div className="flex gap-1.5 w-full flex-col">
              <p className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                CVC
              </p>
              <CardCvcElement className="stripe-element w-full border normal-case border-grey-400 focus:shadow-secondary/5 focus:ring-white shadow-secondary/5 disabled:bg-grey-300 disabled:text-slate-500 disabled:border-grey-300 disabled:shadow-none text-grey-700 placeholder:text-grey-700 bg-white shadow-sm text-sm hover:border-primary rounded-xl focus:border-primary p-3 min-h-10" />
            </div>
          </div>

          <div className="flex justify-end w-full mt-3">
            <Button
              type="submit"
              variant={'primary'}
              onClick={handleAddCard}
              disabled={isPending || loader || !cardHolderName}
            >
              {isPending || loader ? <Loader variant="blue" /> : 'Add Card'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCardModal;
