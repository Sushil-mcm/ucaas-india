import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Controller, UseFormReturn } from 'react-hook-form';

const PaymentAndConfirmation = ({ formInstance }: { formInstance: UseFormReturn<any> }) => {
  const {
    control,
    formState: { errors },
  } = formInstance;

  return (
    <div className="w-full min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
      <div className="w-full flex flex-col gap-2 1">
        <h3 className="text-shadow-gray-900 flex items-center gap-1.5 font-medium ">
          Payment and Confirmation
        </h3>
        <p className="text-gray-500 text-sm">
          All campaigns have a 3 month minimum commitment. This means that we bill monthly, for a
          minimum of 3 months. At the end of the initial 3 month period, campaigns renew on a
          month-to-month basis.
        </p>
        <p className="text-gray-500 text-sm">
          You will initially be charged up to $20 once you've submitted your application. This is
          non-refundable.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3 mb-4 mt-2">
        <div className="grid w-full gap-2 sm:grid-cols-2">
          <div className="w-full pb-2 border-b border-gray-200 text-sm text-gray-900">Item</div>
          <div className="w-full pb-2 border-b border-gray-200 text-sm text-gray-900">Price</div>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2">
          <div className="w-full pb-2 border-b border-gray-200 text-sm text-gray-900">
            Application fee
          </div>
          <div className="w-full pb-2 border-b border-gray-200 text-sm text-gray-900">
            $20.00 upfront one-off
          </div>
        </div>
        {/* <div className="w-full flex  gap-2">
          <div className="w-full pb-2 border-b border-gray-200 text-sm text-gray-900">Campaign - first 3 months once</div>
          <div className="w-full pb-2 border-b border-gray-200 text-sm text-gray-900">$30.00 upfront one-off</div>
        </div>
        <div className="w-full flex  gap-2">
          <div className="w-full pb-2 border-b border-gray-200 text-sm text-gray-900">Campaign - recurring fee after first 3 months</div>
          <div className="w-full pb-2 border-b border-gray-200 text-sm text-gray-900">$10.00 per month</div>
        </div> */}
      </div>
      <div className="flex items-start gap-2 sm:items-center">
        <Controller
          name="payment_terms"
          control={control}
          render={({ field }) => (
            <Checkbox id="payment_terms" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor="payment_terms">I agree with the payment terms above.</Label>
      </div>
      {errors?.payment_terms && (
        <div className="text-red-500 text-sm">{`${errors?.payment_terms?.message}`}</div>
      )}
    </div>
  );
};

export default PaymentAndConfirmation;
