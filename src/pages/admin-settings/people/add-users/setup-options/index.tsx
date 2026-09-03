import { userInitialState } from '../../../constants';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import OrderSummary from '../order-summary';
import PaymentScreen from '@/components/payment';

const SetupOption = ({
  orderSummary,
  status = '',
  paymentProps,
  setTypeOfPassword,
  dataGetMyPlanDetails,
  setPaymentCalculation,
}: any) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  }: any = useFormContext();

  // Watch current value of password_type
  const passwordType = watch('password_type');
  const watchUsers = watch('users');

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pt-2 pr-1">
      {status === 'show_payment' ? (
        <div className="flex flex-col xl:flex-row gap-5">
          <section className="w-full xl:w-1/2 border border-grey-200 p-3 rounded-xl flex items-center justify-center">
            <PaymentScreen
              ref={paymentProps?.paymentRef}
              onSuccessPayment={paymentProps?.onSuccessPayment}
              isSavedPaymentCard={false}
              onSuccess3dsPayment={paymentProps?.handle3DSSuccess}
              onFailure3dsPayment={paymentProps?.handle3DSFailure}
              isApiLoad={paymentProps?.isApiLoad}
            />
          </section>
          <OrderSummary
            orderSummary={orderSummary}
            dataGetMyPlanDetails={dataGetMyPlanDetails}
            customClass="w-full"
            mainCustomClass="w-full xl:w-1/2"
            onCalculationChange={setPaymentCalculation}
          />
        </div>
      ) : (
        <RadioGroup
          className="gap-4"
          value={passwordType}
          onValueChange={(value) => {
            setTypeOfPassword(value);
            setValue('password_type', value, { shouldValidate: true });
          }}
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="common" id="password-common" className="cursor-pointer" />
            <Label htmlFor="password-common" className="cursor-pointer">
              Give Common Password
            </Label>
          </div>

          {passwordType === 'common' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5 w-full">
                <Input
                  type="password"
                  label="Password"
                  required
                  placeholder="Password"
                  {...register(`password`)}
                  error={errors?.password?.message}
                  showEye={true}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <Input
                  type="password"
                  label="Confirm Password"
                  required
                  placeholder="Confirm Password"
                  {...register(`confirm_password`)}
                  error={errors?.confirm_password?.message}
                  showEye={true}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <RadioGroupItem
              value="individual"
              id="password-individual"
              className="cursor-pointer"
            />
            <Label htmlFor="password-individual" className="cursor-pointer">
              Individual Password
            </Label>
          </div>

          {passwordType === 'individual' && (
            <div className="flex flex-col gap-4">
              {watchUsers?.map((field: typeof userInitialState, index: number) => {
                return (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" key={index}>
                    <Input label={index === 0 && 'User'} value={field?.first_name} disabled />

                    <Input
                      showEye={true}
                      label={index === 0 && 'Password'}
                      placeholder="Password"
                      type="password"
                      {...register(`users.${index}.password`)}
                      error={errors?.users?.[index]?.password?.message}
                    />
                    <Input
                      showEye={true}
                      label={index === 0 && 'Confirm Password'}
                      placeholder="Confirm Password"
                      type="password"
                      {...register(`users.${index}.confirm_password`)}
                      error={errors?.users?.[index]?.confirm_password?.message}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-3">
            <RadioGroupItem value="email" id="password-email" className="cursor-pointer" />
            <Label htmlFor="password-email" className="cursor-pointer">
              Send via Email
            </Label>
          </div>
        </RadioGroup>
      )}
    </div>
  );
};

export default SetupOption;
