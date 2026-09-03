import LogoIcon from '@/assets/images/LogoIcon.svg';
import Desktop from '@/assets/images/Desktop.svg';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { EyeLine, EyeLineOff } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import * as yup from 'yup';
import { newPassword } from '@/services/api';
import PasswordRulesIndicator, { PASSWORD_RULES } from './password-rules-indicator';
import { getEnv, handleAlert } from '@/lib/utils';
import Loader from '@/components/custom/loader';
import { useOrganization } from '@/hooks/use-organisation';

export const newPasswordSchema = yup.object({
  password: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters long')
    .matches(PASSWORD_RULES.minLength.regex, PASSWORD_RULES.minLength.message)
    .matches(PASSWORD_RULES.lowercase.regex, PASSWORD_RULES.lowercase.message)
    .matches(PASSWORD_RULES.uppercase.regex, PASSWORD_RULES.uppercase.message)
    .matches(PASSWORD_RULES.number.regex, PASSWORD_RULES.number.message)
    .matches(PASSWORD_RULES.specialChar.regex, PASSWORD_RULES.specialChar.message)
    .matches(PASSWORD_RULES.noSpaces.regex, PASSWORD_RULES.noSpaces.message)
    .notOneOf([yup.ref('old_password')], 'New password must not match with old password'),

  confirm_password: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Confirm password must match with new password'),
});

const ResetPassword = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const { mainSiteInfo } = useOrganization();
  const token = queryParams.get('token');
  const [showPassword, setShowPassword] = useState<any>({
    new_password: false,
    confirm_password: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      password: '',
      confirm_password: '',
    },
    resolver: yupResolver(newPasswordSchema),
  });

  const password = watch('password');

  const { mutate: newPasswordMutate, isPending } = useMutation({
    mutationFn: newPassword,
    onSuccess: (data) => {
      handleAlert({ text: data?.data?.data?.message, type: 'success' });
      navigate('/');
    },
  });

  const handleFormSubmit = (data: any) => {
    const { password } = data;
    const payload = {
      token: token,
      password,
    };
    newPasswordMutate(payload);
  };

  const togglePasswordVisibility = (field: any) => {
    setShowPassword((prev: any) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };
  const [largeLogoError, setLargeLogoError] = useState(false);

  useEffect(() => {
    setLargeLogoError(false);
  }, [mainSiteInfo?.large_logo]);
  return (
    <>
      <div className="w-full flex md:min-h-screen xs:min-h-0">
        <section className="sm:w-5/12 xs:w-full">
          <div className="container mx-auto p-8 max-w-full">
            <div className="h-8" onClick={() => navigate('/')}>
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
            <form
              className="pt-16 sm:min-h-[calc(100vh_-_6rem)] xs:min-h-0 flex flex-col justify-center items-center"
              onSubmit={handleSubmit(handleFormSubmit)}
            >
              <div className="flex flex-col xxl:w-2/3 xl:w-3/4 lg:w-4/5 md:w-11/12 xs:w-full gap-8">
                <div className="flex flex-col gap-3">
                  <h1 className="text-4xl text-black font-semibold">Recover your password</h1>
                  <h6 className="text-base text-grey-800 font-normal">
                    Enter a new password below
                  </h6>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                      <Input
                        onIconClick={() => togglePasswordVisibility('new_password')}
                        Icon={showPassword?.new_password ? <EyeLineOff /> : <EyeLine />}
                        placeholder="Enter new password"
                        label="New Password"
                        required
                        type={showPassword?.new_password ? 'text' : 'password'}
                        {...register('password')}
                        error={errors?.password?.message}
                      />
                      <PasswordRulesIndicator password={password} />
                    </div>
                    <Input
                      onIconClick={() => togglePasswordVisibility('confirm_password')}
                      Icon={showPassword?.confirm_password ? <EyeLineOff /> : <EyeLine />}
                      placeholder="Enter confirm password"
                      label="Confirm Password"
                      required
                      type={showPassword?.confirm_password ? 'text' : 'password'}
                      {...register('confirm_password')}
                      error={errors?.confirm_password?.message}
                    />
                  </div>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader variant="blue" /> : 'Reset Password'}
                  </Button>
                </div>
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
            </form>
          </div>
        </section>
        <section className="w-7/12 bg-ucass-gray overflow-hidden sm:block xs:hidden">
          <div className="flex flex-col justify-between h-screen xl:gap-10 xs:gap-8">
            <div className="container m-auto pt-8 md:px-24 sm:px-8">
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
    </>
  );
};

export default ResetPassword;
