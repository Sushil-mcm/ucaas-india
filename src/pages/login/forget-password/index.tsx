import LogoIcon from '@/assets/images/LogoIcon.svg';
import Desktop from '@/assets/images/Desktop.svg';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forgetPassword } from '@/services/api';
import { getEnv, handleAlert } from '@/lib/utils';
import * as yup from 'yup';
import Loader from '@/components/custom/loader';
import { useEffect, useRef, useState } from 'react';
import { useOrganization } from '@/hooks/use-organisation';
import { Turnstile, type TurnstileHandle } from '@/hooks/use-turnstile';

const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(
  window.location.hostname,
);

export const ForgetPasswordSchema = yup.object().shape({
  email: yup.string().email('Must be a valid email').required('Email is required'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { mainSiteInfo } = useOrganization();
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const canSubmit = isLocalhost || Boolean(captchaToken);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
    },
    resolver: yupResolver(ForgetPasswordSchema),
    mode: 'all',
  });

  const { mutate: changeForgetMutate, isPending } = useMutation({
    mutationFn: forgetPassword,
    onSuccess: (data) => {
      setIsEmailSent(true);
      handleAlert({ text: data?.data?.data?.message, type: 'success' });
    },
    onError: () => {
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    },
  });

  const handleFormSubmit = (data: any) => {
    if (!canSubmit) return;

    changeForgetMutate({
      ...data,
      ...(captchaToken ? { captchaToken } : {}),
    });
  };
  const [largeLogoError, setLargeLogoError] = useState(false);

  useEffect(() => {
    setLargeLogoError(false);
  }, [mainSiteInfo?.large_logo]);
  return (
    <div className="w-full flex md:min-h-screen xs:min-h-0">
      <section className="w-5/12 h-full">
        <div className="container mx-auto p-8 max-w-full">
          <div className="h-8 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src={
                mainSiteInfo?.small_logo
                  ? `${getEnv().VITE_API_BASE_URL}/${mainSiteInfo?.small_logo}`
                  : LogoIcon
              }
              alt="Logo"
              className="h-full"
            />
          </div>
          <div className="pt-16 sm:min-h-[calc(100vh_-_6rem)] xs:min-h-0 flex flex-col justify-center items-center">
            <div className="flex flex-col xxl:w-2/3 xl:w-3/4 lg:w-4/5 md:w-11/12 xs:w-full gap-8">
              <div className="flex flex-col gap-3">
                <h1 className="text-4xl text-black font-semibold">Recover your password</h1>
                <h6 className="text-base text-grey-800 font-normal">
                  Enter your email and we will send you the password reset instructions
                </h6>
              </div>
              <form onSubmit={handleSubmit(handleFormSubmit)}>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-5">
                    <Input
                      placeholder="Enter email"
                      label="Email"
                      required
                      type="email"
                      {...register('email')}
                      error={errors?.email?.message}
                    />
                  </div>
                  {!isEmailSent && (
                    <>
                      {!isLocalhost && (
                        <Turnstile
                          ref={turnstileRef}
                          action="forgot_password"
                          className="w-full"
                          onVerify={setCaptchaToken}
                          onExpire={() => setCaptchaToken(null)}
                          onError={() => setCaptchaToken(null)}
                        />
                      )}

                      {canSubmit && (
                        <Button type="submit" disabled={isPending}>
                          {isPending ? <Loader variant="blue" /> : 'Send Email'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </form>
              <p className="text-sm text-grey-800 font-normal text-center">
                Remembered your password?
                <span
                  className="text-primary hover:text-primary/80 font-semibold cursor-pointer"
                  onClick={() => navigate('/')}
                >
                  &nbsp;Log in&nbsp;
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-7/12 bg-ucass-gray overflow-hidden sm:block xs:hidden">
        <div className="flex flex-col justify-between h-screen xl:gap-10 xs:gap-8">
          <div className="container mx-auto my-auto pt-8 md:px-24 sm:px-8">
            <div className="flex flex-col gap-6">
              <h2 className="text-gray-900 font-medium text-3xl leading-10">
                Few things make me feel more powerful than setting up automations in Untitled to
                make my life easier and more efficient.
              </h2>
              <div className="flex justify-between">
                <div className="flex flex-col">
                  <p className="text-black text-lg font-semibold">&mdash; Aliah Lane</p>
                  <p className="text-grey-800 text-base font-medium">Founder, Layers.io</p>
                </div>
                <div className="flex gap-0.5">
                  <div className="text-ucass-orange hover:text-ucass-orange/80">
                    <Icon name="Star" />
                  </div>
                  <div className="text-ucass-orange hover:text-ucass-orange/80">
                    <Icon name="Star" />
                  </div>
                  <div className="text-ucass-orange hover:text-ucass-orange/80">
                    <Icon name="Star" />
                  </div>
                  <div className="text-ucass-orange hover:text-ucass-orange/80">
                    <Icon name="Star" />
                  </div>
                  <div className="text-ucass-orange hover:text-ucass-orange/80">
                    <Icon name="Star" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container ml-auto md:pl-24 sm:pl-8">
            <div className="flex justify-end">
              <div className="w-full">
                <img
                  src={
                    mainSiteInfo?.login_image && !largeLogoError
                      ? `${getEnv().VITE_API_BASE_URL}/${mainSiteInfo?.login_image}`
                      : Desktop
                  }
                  alt="Desktop"
                  className="w-full"
                  onError={() => setLargeLogoError(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ForgotPassword;
