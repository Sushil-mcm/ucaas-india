import { Check } from '@/assets/icons';
// import Logo from '@/assets/images/Logo.svg';
import Logo from '@/assets/images/Logo.svg';
// import Desktop from '@/assets/images/Desktop-2.svg';
import Desktop from '@/assets/images/signup-banner-image.png';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { login, sendOtp, verifyOtp } from '@/services/api';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import Loader from '@/components/custom/loader';
import { useUser } from '@/hooks/use-user';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/assets/icons/icon';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import OtpVerification from '../signup/otp-verification';
import {
  getDeviceId,
  getEnv,
  handleAlert,
  PLAN_PENDING_COMPANY_UUID_KEY,
  PLAN_PENDING_FLAG_KEY,
  RENEW_PLAN_FROM_APP_KEY,
  SESSION_NAME,
} from '@/lib/utils';
import packageJson from '../../../package.json';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useOrganization } from '@/hooks/use-organisation';
import { Turnstile, type TurnstileHandle } from '@/hooks/use-turnstile';

const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(
  window.location.hostname,
);

type Inputs = {
  email: string;
  password: string;
};
const schema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    // .max(15, 'Password must not be more than 15 characters')
    .matches(/^\S+$/, 'Spaces are not allowed'),
  // .matches(/[A-Z]/, "Must contain at least one uppercase letter")
  // .matches(/[a-z]/, "Must contain at least one lowercase letter")
  // .matches(/[0-9]/, "Must contain at least one number")
  // .matches(/[@$!%*?&#]/, "Must contain at least one special character"),
});
const getAuthResponseData = (response: any) => {
  const responseCandidates = [
    response?.data?.data?.result,
    response?.data?.result,
    response?.data?.data,
    response?.result,
    response?.data,
    response,
  ].filter((candidate) => candidate && typeof candidate === 'object');

  const result =
    responseCandidates.find(
      (candidate) =>
        candidate?.auth ||
        candidate?.token ||
        candidate?.access_token ||
        candidate?.accessToken ||
        candidate?.sip_credentials,
    ) ||
    responseCandidates[0] ||
    {};
  const auth = result?.auth ?? result ?? {};
  const token =
    [
      result?.token,
      result?.access_token,
      result?.accessToken,
      auth?.token,
      auth?.access_token,
      auth?.accessToken,
      ...responseCandidates.flatMap((candidate) => [
        candidate?.token,
        candidate?.access_token,
        candidate?.accessToken,
        candidate?.auth?.token,
        candidate?.auth?.access_token,
        candidate?.auth?.accessToken,
      ]),
      response?.headers?.['x-access-token'],
      String(response?.headers?.authorization || '').replace(/^Bearer\s+/i, ''),
    ]
      .find((candidate) => typeof candidate === 'string' && candidate.trim())
      ?.trim() || '';

  return { result, auth, token };
};

const Login = () => {
  const { mainSiteInfo } = useOrganization();
  const { handleSetUser } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Inputs>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: yupResolver(schema),
    mode: 'onChange',
  });
  const navigate = useNavigate();
  const signUpResponseData = useRef<any>(null);
  const loginAccessTokenRef = useRef('');
  /* Kept so a trusted device can finish sign-in from the /login response alone,
     without a verify-otp round trip. */
  const loginResponseRef = useRef<any>(null);
  /* The choice has to outlive the session it was made in — it is read on the
     next sign-in, before any code is sent. */
  const REMEMBER_DEVICE_KEY = 'ucaas-remember-device';
  const [rememberDevice, setRememberDevice] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REMEMBER_DEVICE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState<{ email: string; password: string }>();
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [largeLogoError, setLargeLogoError] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const canSubmit = isLocalhost || Boolean(captchaToken);

  useEffect(() => {
    setLargeLogoError(false);
  }, [mainSiteInfo?.large_logo]);

  // If user already has plan-pending token, send them to renew-plan (no re-login)
  useEffect(() => {
    if (
      localStorage.getItem(SESSION_NAME) &&
      localStorage.getItem(PLAN_PENDING_FLAG_KEY) === 'true'
    ) {
      sessionStorage.setItem(RENEW_PLAN_FROM_APP_KEY, '1');
      navigate('/renew-plan', { replace: true });
    }
  }, [navigate]);

  const { mutate: mutateLogin, isPending: isLoginPending } = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      const { auth, token } = getAuthResponseData(data);
      loginAccessTokenRef.current = token;
      loginResponseRef.current = data;
      signUpResponseData.current = {
        ...auth,
        ...(token ? { token } : {}),
      };
      const email = auth?.email;
      if (email)
        mutateSendOtp({
          email,
          device_id: getDeviceId(),
          remember_device: rememberDevice,
        });
    },
    onError: (err: any) => {
      const data = err?.response?.data || {};
      const inner = data?.data || {};
      const message = typeof data?.message === 'string' ? data.message : '';
      const planPaymentPending =
        data?.plan_payment_pending === true || inner?.plan_payment_pending === true;
      const token = inner?.token || data?.token;

      if (token && planPaymentPending && message?.toLowerCase().includes('no longer active')) {
        localStorage.setItem(SESSION_NAME, token);
        localStorage.setItem(PLAN_PENDING_FLAG_KEY, 'true');
        const companyUuid = inner?.company_uuid || data?.company_uuid;
        if (companyUuid) {
          sessionStorage.setItem(PLAN_PENDING_COMPANY_UUID_KEY, companyUuid);
        }
        handleAlert({
          text:
            message ||
            'Your current plan is no longer active. Please renew to avoid service interruptions.',
          type: 'error',
        });
        sessionStorage.setItem(RENEW_PLAN_FROM_APP_KEY, '1');
        navigate('/renew-plan', { replace: true });
        return;
      }
      console.log({ err });
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    },
  });
  // const { mutate: mutateFinalLogin, isPending: isFinalLoginPending } = useMutation({
  //   mutationFn: login,
  //   onSuccess: (data) => {
  //     console.log(data?.data?.data?.result?.auth, 'data?.data?.data?.result?.auth');

  //     const userData = data?.data?.data?.result;
  //     const auth = data?.data?.data?.result?.auth;
  //     signUpResponseData.current = auth;

  //     const isPlanPaymentPending =
  //       auth?.isPlanPaymentPending === true || auth?.isPlanPayemntPending === true;
  //     const token = auth?.token || data?.data?.data?.result?.token;

  //     if (token && isPlanPaymentPending) {
  //       const msg =
  //         data?.data?.data?.message ||
  //         'Your current plan is no longer active. Please renew to avoid service interruptions.';
  //       localStorage.setItem(SESSION_NAME, token);
  //       if (auth?.company_uuid) {
  //         sessionStorage.setItem(PLAN_PENDING_COMPANY_UUID_KEY, auth.company_uuid);
  //       }
  //       handleAlert({ text: msg, type: 'error' });
  //       sessionStorage.setItem(RENEW_PLAN_FROM_APP_KEY, '1');
  //       navigate('/renew-plan', { replace: true });
  //       return;
  //     }

  //     const paymentVerified = auth?.payment_verified;
  //     const freeDID = auth?.free_did;

  //     if (!paymentVerified) {
  //       navigate(`/payment`, {
  //         state: {
  //           isLogin: true,
  //           signUpResponseData,
  //         },
  //       });
  //     } else if (paymentVerified && !freeDID) {
  //       navigate('/phone-lines', {
  //         state: {
  //           isLogin: true,
  //           signUpResponseData,
  //         },
  //       });
  //     } else {
  //       sessionStorage.setItem('welcomePopup', 'true');
  //       handleSetUser(userData);
  //       window.location.reload();
  //       // navigate('/dashboard')
  //     }
  //   },
  //   onError: (err: any) => {
  //     const data = err?.response?.data || {};
  //     const inner = data?.data || {};
  //     const message = typeof data?.message === 'string' ? data.message : '';
  //     const planPaymentPending =
  //       data?.plan_payment_pending === true || inner?.plan_payment_pending === true;
  //     const token = inner?.token || data?.token;

  //     if (token && planPaymentPending && message?.toLowerCase().includes('no longer active')) {
  //       localStorage.setItem(SESSION_NAME, token);
  //       localStorage.setItem(PLAN_PENDING_FLAG_KEY, 'true');
  //       const companyUuid = inner?.company_uuid || data?.company_uuid;
  //       if (companyUuid) {
  //         sessionStorage.setItem(PLAN_PENDING_COMPANY_UUID_KEY, companyUuid);
  //       }
  //       handleAlert({
  //         text:
  //           message ||
  //           'Your current plan is no longer active. Please renew to avoid service interruptions.',
  //         type: 'error',
  //       });
  //       sessionStorage.setItem(RENEW_PLAN_FROM_APP_KEY, '1');
  //       navigate('/renew-plan', { replace: true });
  //       return;
  //     }
  //     console.log({ err });
  //   },
  // });
  /* Finishes sign-in once identity is settled — either the code was verified, or
     the server recognised this device and skipped the code. Both paths land here
     so they route identically. */
  const finishSignIn = (data: any) => {
    const {
      result: userData,
      auth: verifiedAuth,
      token: verifiedToken,
    } = getAuthResponseData(data);
    const token =
      verifiedToken ||
      String(signUpResponseData.current?.token || loginAccessTokenRef.current || '').trim();
    const auth = {
      ...(signUpResponseData.current || {}),
      ...verifiedAuth,
      ...(token ? { token } : {}),
    };

    signUpResponseData.current = {
      ...auth,
      ...(token ? { token } : {}),
    };

    if (token) {
      localStorage.setItem(SESSION_NAME, token);
    }

    const isPlanPaymentPending =
      auth?.isPlanPaymentPending === true || auth?.isPlanPayemntPending === true;

    if (token && isPlanPaymentPending) {
      const msg =
        data?.data?.data?.message ||
        'Your current plan is no longer active. Please renew to avoid service interruptions.';
      localStorage.setItem(SESSION_NAME, token);
      if (auth?.company_uuid) {
        sessionStorage.setItem(PLAN_PENDING_COMPANY_UUID_KEY, auth.company_uuid);
      }
      handleAlert({ text: msg, type: 'error' });
      sessionStorage.setItem(RENEW_PLAN_FROM_APP_KEY, '1');
      navigate('/renew-plan', { replace: true });
      return;
    }

    const paymentVerified = auth?.payment_verified;
    const freeDID = auth?.free_did;

    if (!paymentVerified) {
      navigate(`/payment`, {
        state: {
          isLogin: true,
          signUpResponseData,
          accessToken: token,
          planUuid: auth?.plan_uuid,
        },
      });
    } else if (paymentVerified && !freeDID) {
      navigate('/phone-lines', {
        state: {
          isLogin: true,
          signUpResponseData,
          accessToken: token,
          planUuid: auth?.plan_uuid,
        },
      });
    } else {
      sessionStorage.setItem('welcomePopup', 'true');
      handleSetUser({ ...userData, token });
      window.location.reload();
    }
  };

  const { mutate: mutateSendOtp, isPending: isSendOtpPending } = useMutation({
    mutationFn: sendOtp,
    onSuccess: (data: any) => {
      /* The server skips the code on a device that passed one recently. */
      const payload = (data as any)?.data ?? {};
      const otpRequired = payload?.otp_required ?? payload?.data?.otp_required;

      if (otpRequired === false) {
        handleAlert({ text: 'Signed in on a recognised device', type: 'success' });
        finishSignIn(loginResponseRef.current);
        return;
      }

      handleAlert({ text: 'OTP sent successfully', type: 'success' });
      setShowOtp(true);
    },
  });
  const { mutate: mutateVerifyOtp, isPending: isPendingVerifyOtp } = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data: any) => {
      handleAlert({ text: 'OTP Verified successfully', type: 'success' });
      finishSignIn(data);
    },
    onError: (err: any) => {
      const res = err?.response?.data;
      const data = res?.data || {};
      const isMaxAttemptsReached =
        res?.retry_after_seconds != null ||
        (typeof res?.message === 'string' &&
          res.message.toLowerCase().includes('maximum number of otp verification attempts'));
      if (isMaxAttemptsReached) {
        setShowOtp(false);
        setOtp('');
        setRemainingAttempts(null);
      } else {
        const attempts =
          data?.remainingAttempts ?? data?.remaining_attempts ?? data?.attempts ?? null;
        if (typeof attempts === 'number') setRemainingAttempts(attempts);
        setOtp('');
      }
      handleAlert({ text: res?.message || 'Invalid OTP', type: 'error' });
    },
  });

  const handleVerify = () => {
    if (!formData) return;
    if (!isPendingVerifyOtp && otp?.length === 6)
      mutateVerifyOtp({ email: formData?.email, otp, device_id: getDeviceId() });
  };

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    if (!canSubmit) return;

    setFormData(data);
    const payload = {
      ...data,
      device_type: 'W',
      device_id: getDeviceId(),
      version: packageJson.version,
      ...(captchaToken ? { captchaToken } : {}),
    };
    mutateLogin(payload);
  };

  return (
    <>
      <div className="w-full h-full p-4 md:p-15 md:py-6 bg-gray-200/15 flex items-center justify-center">
        <div className="w-full lg:max-w-[60%] xxl:max-w-[70%] flex sm:flex-row flex-col xs:h-full sm:h-auto md:h-full rounded-xl bg-white shadow-sm overflow-auto">
          <section className="w-full sm:w-1/2 h-full">
            <div className="mx-auto p-5 xl:p-8 h-full flex flex-col gap-3">
              <div className="h-8">
                <img
                  src={
                    mainSiteInfo?.large_logo
                      ? `${getEnv().VITE_API_BASE_URL}/${mainSiteInfo?.large_logo}`
                      : Logo
                  }
                  alt="Logo"
                  className="h-full"
                />
              </div>
              <div className="flex flex-col justify-center items-center m-auto">
                <div className="w-full flex flex-col gap-2 xl:gap-8">
                  <div className="flex flex-col gap-1 xl:gap-3">
                    <h1 className="text-base xl:text-2xl  text-gray-900 font-bold">
                      Log in to your account
                    </h1>
                    <h6 className="text-sm xl:text-base text-gray-500 font-normal">
                      Welcome back! Please enter your details.
                    </h6>
                  </div>
                  <div className="flex flex-col gap-4">
                    <form
                      className="flex flex-col gap-1 xl:gap-5"
                      onSubmit={handleSubmit(onSubmit)}
                    >
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5">
                          <Label required>Email</Label>
                          <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                              <Input
                                placeholder="Enter Your Email"
                                type="email"
                                {...field}
                                error={errors.email?.message || ''}
                              />
                            )}
                          />
                        </div>
                        <div className="w-full flex flex-col gap-2">
                          <div className="flex flex-col gap-1.5">
                            <Label required>Password</Label>
                            <Controller
                              name="password"
                              control={control}
                              render={({ field }) => (
                                <Input
                                  placeholder="Enter Your Password"
                                  type={showPassword ? 'text' : 'password'}
                                  {...field}
                                  Icon={
                                    showPassword ? (
                                      <Icon name="EyeLineOff" />
                                    ) : (
                                      <Icon name="EyeLine" />
                                    )
                                  }
                                  onIconClick={() => setShowPassword((prev) => !prev)}
                                  error={errors.password?.message || ''}
                                />
                              )}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <Checkbox
                                className="cursor-pointer"
                                checked={rememberDevice}
                                onCheckedChange={(value) => {
                                  const next = value === true;
                                  setRememberDevice(next);
                                  try {
                                    localStorage.setItem(REMEMBER_DEVICE_KEY, next ? '1' : '0');
                                  } catch {
                                    /* private mode — the choice just won't persist */
                                  }
                                }}
                              />
                              <span className="text-sm text-gray-600">
                                Skip the code on this device for 30 days
                              </span>
                            </label>
                            <div
                              className="text-primary hover:text-primary/80 text-sm font-semibold cursor-pointer"
                              onClick={() => navigate('/forgot-password')}
                            >
                              Forgot password
                            </div>
                          </div>
                        </div>
                      </div>
                      {!isLocalhost && (
                        <Turnstile
                          ref={turnstileRef}
                          action="login"
                          className="w-full"
                          onVerify={setCaptchaToken}
                          onExpire={() => setCaptchaToken(null)}
                          onError={() => setCaptchaToken(null)}
                        />
                      )}

                      {canSubmit && (
                        <Button
                          variant={'primary'}
                          type="submit"
                          className="w-full rounded-xl"
                          disabled={isSendOtpPending || isLoginPending}
                        >
                          {isSendOtpPending || isLoginPending ? (
                            <Loader variant="blue" />
                          ) : (
                            'Sign In'
                          )}
                        </Button>
                      )}
                    </form>
                  </div>

                  <p className="text-xs xl:text-sm text-gray-800 font-normal">
                    By creating new account, you automatically agree to our
                    <a
                      target="_blank"
                      href="https://www.mycountrymobile.com/terms-and-conditions/"
                      className="text-primary hover:text-primary/80 font-bold"
                    >
                      &nbsp;Terms & Conditions
                    </a>
                    &nbsp;and
                    <a
                      target="_blank"
                      href="https://www.mycountrymobile.com/privacy-policy/"
                      className="text-primary hover:text-primary/80 font-bold"
                    >
                      &nbsp;Privacy Policy
                    </a>
                  </p>

                  <p className="text-xs xl:text-sm text-gray-800 font-normal text-center">
                    Don’t have an account?
                    <span
                      className="text-primary hover:text-primary/80 font-semibold cursor-pointer"
                      onClick={() => navigate('/pricing')}
                      // onClick={() => navigate('/phone-lines')}
                    >
                      &nbsp;Sign up&nbsp;
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>
          {/* bg-sky-200/30 */}
          <section className="w-full sm:w-1/2 bg-ucass-login-bg sm:overflow-hidden">
            <div className="mx-auto pt-8 h-full flex flex-col gap-10 justify-between">
              <div className="flex flex-col gap-3 px-8">
                <h2 className="text-gray-900 font-bold text-base xl:text-2xl ">
                  Enterprise Communication Solutions
                </h2>

                <p className="text-gray-700 text-sm">
                  Connect with your customers through our reliable and scalable communication
                  platform.
                </p>
                <div className="grid grid-cols-2 gap-2 xl:gap-3">
                  <div className="flex gap-2 items-center">
                    <span className="bg-green-500 text-white w-5 h-5 rounded-full p-1 flex items-center justify-center">
                      <Check />
                    </span>
                    <p className="text-gray-900 text-xs xxl:text-sm font-semibold">
                      Secure Communication
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="bg-green-500 text-white w-5 h-5 rounded-full p-1 flex items-center justify-center">
                      <Check />
                    </span>
                    <p className="text-gray-900 text-xs xxl:text-sm font-semibold">Global Reach</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="bg-green-500 text-white w-5 h-5 rounded-full p-1 flex items-center justify-center">
                      <Check />
                    </span>
                    <p className="text-gray-900 text-xs xxl:text-sm font-semibold">
                      Scalable Solutions
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="bg-green-500 text-white w-5 h-5 rounded-full p-1 flex items-center justify-center">
                      <Check />
                    </span>
                    <p className="text-gray-900 text-xs xxl:text-sm font-semibold">24/7 Support</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pl-8">
                <div className="w-full">
                  <img
                    src={
                      mainSiteInfo?.login_image && !largeLogoError
                        ? `${getEnv().VITE_API_BASE_URL}/${mainSiteInfo?.login_image}`
                        : Desktop
                    }
                    alt="Desktop"
                    className="w-full rounded-br-xl rounded-tl-xl"
                    onError={() => setLargeLogoError(true)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Dialog open={showOtp} onOpenChange={setShowOtp}>
        <DialogContent
          className="w-full md:w-2/5 p-3"
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <OtpVerification
            {...{
              otp,
              setOtp,
              formData: formData,
              apiLoading: isPendingVerifyOtp,
              onConfirm: () => handleVerify(),
              remainingAttempts,
              handleClose: () => {
                setShowOtp(false);
                setOtp('');
                setRemainingAttempts(null);
              },
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Login;
