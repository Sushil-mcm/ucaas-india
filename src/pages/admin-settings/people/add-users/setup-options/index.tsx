import { userInitialState } from '../../../constants';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import OrderSummary from '../order-summary';
import PaymentScreen from '@/components/payment';
import { KeyRound, Mail, ShieldCheck, Users } from 'lucide-react';

/* Order matches the reference: the recommended option first, then the two
   "you set it yourself" options. Copy is the platform's existing wording
   for each choice, not new content. */
const SIGN_IN_OPTIONS = [
  {
    value: 'email',
    icon: Mail,
    title: 'Invite link',
    description: 'They get an email with a link to choose their own password.',
    recommended: true,
  },
  {
    value: 'common',
    icon: Users,
    title: 'One password for everyone',
    description: 'You set a password now and tell them yourself.',
  },
  {
    value: 'individual',
    icon: KeyRound,
    title: 'A password for each person',
    description: 'You set everyone’s password now and tell each of them.',
  },
];

const WHAT_HAPPENS_NEXT = [
  {
    title: 'Each person gets an email',
    description: 'Sent to the address you entered for them, with a link to choose a password.',
  },
  {
    title: 'They choose their own password',
    description: 'The link works for 3 days.',
  },
  {
    title: 'Link ran out?',
    description: 'Send it again from the People list.',
  },
];

const initialsOf = (field: typeof userInitialState) => {
  const first = field?.first_name?.trim()?.[0] || '';
  const last = field?.last_name?.trim()?.[0] || '';
  return (first + last).toUpperCase() || '?';
};

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
  const userCount = watchUsers?.length || 0;

  const selectPasswordType = (value: string) => {
    setTypeOfPassword(value);
    setValue('password_type', value, { shouldValidate: true });
  };

  return (
    <div className="mcm-setup-options flex min-h-0 flex-col gap-2 overflow-y-auto pt-2 pr-1">
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
            customClass="w-full mcm-order-summary"
            mainCustomClass="w-full xl:w-1/2"
            subtitle="Review your license details"
            note="Final amount may vary based on selected location and license type."
            onCalculationChange={setPaymentCalculation}
          />
        </div>
      ) : (
        <>
          <div className="mcm-setup-heading">
            <h4>How should they sign in?</h4>
            <p>
              This applies to all {userCount} person{userCount === 1 ? '' : 's'} in this invite.
            </p>
          </div>

          <RadioGroup
            className="mcm-setup-cards"
            value={passwordType}
            onValueChange={selectPasswordType}
          >
            {SIGN_IN_OPTIONS.map((option) => {
              const Icon = option.icon;
              const inputId = `password-${option.value}`;
              return (
                <div
                  key={option.value}
                  className={`mcm-setup-card${passwordType === option.value ? ' is-selected' : ''}`}
                  onClick={() => selectPasswordType(option.value)}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={inputId}
                    className="mcm-setup-card-radio"
                  />
                  {option.recommended ? (
                    <span className="mcm-setup-card-badge">Recommended</span>
                  ) : null}
                  <span className="mcm-setup-card-icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <Label htmlFor={inputId} className="mcm-setup-card-title">
                    {option.title}
                  </Label>
                  <p className="mcm-setup-card-desc">{option.description}</p>
                </div>
              );
            })}
          </RadioGroup>

          <div className="mcm-setup-detail">
            {passwordType === 'email' ? (
              <>
                <h5 className="mcm-setup-detail-title">What happens next</h5>
                <div className="mcm-setup-next-grid">
                  {WHAT_HAPPENS_NEXT.map((step, index) => (
                    <div className="mcm-setup-next-step" key={step.title}>
                      <span className="mcm-setup-next-num">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="mcm-setup-next-step-title">{step.title}</p>
                        <p className="mcm-setup-next-step-desc">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mcm-setup-note">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  No password is ever sent by email.
                </p>
              </>
            ) : null}

            {passwordType === 'common' ? (
              <>
                <h5 className="mcm-setup-detail-title">One password for everyone</h5>
                <p className="mcm-setup-detail-desc">
                  You’ll need to tell them this password yourself — it isn’t emailed. They also get
                  the invite link, in case they’d rather choose their own.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    type="password"
                    label="Password"
                    required
                    placeholder="Enter a password"
                    {...register(`password`)}
                    error={errors?.password?.message}
                    showEye={true}
                  />
                  <Input
                    type="password"
                    label="Confirm password"
                    required
                    placeholder="Type it again"
                    {...register(`confirm_password`)}
                    error={errors?.confirm_password?.message}
                    showEye={true}
                  />
                </div>
              </>
            ) : null}

            {passwordType === 'individual' ? (
              <>
                <h5 className="mcm-setup-detail-title">A password for each person</h5>
                <p className="mcm-setup-detail-desc">
                  You’ll need to tell each person their password yourself — none are emailed. They
                  also get the invite link.
                </p>
                <div className="mcm-setup-table">
                  <div className="mcm-setup-table-head">
                    <span>Person</span>
                    <span>Password</span>
                    <span>Confirm password</span>
                  </div>
                  {watchUsers?.map((field: typeof userInitialState, index: number) => {
                    const fullName = [field?.first_name, field?.last_name]
                      .filter(Boolean)
                      .join(' ')
                      .trim();
                    return (
                      <div className="mcm-setup-table-row" key={index}>
                        <div className="mcm-setup-table-person">
                          <span className="mcm-setup-avatar">{initialsOf(field)}</span>
                          <div className="min-w-0">
                            <p className="mcm-setup-person-name">
                              {fullName || `Person ${index + 1}`}
                            </p>
                            <p className="mcm-setup-person-email">{field?.email}</p>
                          </div>
                        </div>
                        <Input
                          showEye={true}
                          placeholder="Password"
                          type="password"
                          {...register(`users.${index}.password`)}
                          error={errors?.users?.[index]?.password?.message}
                        />
                        <Input
                          showEye={true}
                          placeholder="Type it again"
                          type="password"
                          {...register(`users.${index}.confirm_password`)}
                          error={errors?.users?.[index]?.confirm_password?.message}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>

          {orderSummary?.totalPayableUnit > 0 ? (
            <div className="mcm-invite-side w-full">
              <OrderSummary
                orderSummary={orderSummary}
                dataGetMyPlanDetails={dataGetMyPlanDetails}
                customClass="w-full mcm-order-summary"
                subtitle="Review your license details"
                note="Final amount may vary based on selected location and license type."
                onCalculationChange={setPaymentCalculation}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default SetupOption;
