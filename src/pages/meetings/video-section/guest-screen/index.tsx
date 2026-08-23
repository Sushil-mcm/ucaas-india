import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MeetingImg from '../../../../assets/images/MeetingImg.png';
import { useJitsi } from '@/hooks/use-jitsi';
import { useMeetingSessionId } from '@/hooks/use-meeting-session-id';
import { decodeHash, guestLogin, validateMeet } from '@/services/api';
import { requiredEmail, requiredString } from '@/lib/schema';
import { useUser } from '@/hooks/use-user';
import {
  GUEST_MEETING_TOKEN_KEY,
  GUEST_MEETING_TOKEN_UPDATED_EVENT,
  handleAlert,
} from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
const initialValues = {
  name: '',
  email: '',
  password: '',
};

const GuestScreen = ({
  isPasswordRequired,
  setMeetState,
  setReadyForMeet,
  setStartUtcTime,
  setMeetingData,
}: any) => {
  const { setRoomCode, setIsHost, setUserName, setUserEmail, setDisplayName, endMeetingForSelf } =
    useJitsi();
  const { user, handleSetUser } = useUser();
  const sessionId = useMeetingSessionId();
  const [disabledField, setDisabledField] = useState({ email: false, name: false });
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email');
  const nameFromUrl = searchParams.get('name');
  const hash = searchParams.get('hash');
  const navigate = useNavigate();
  const postMeetingRedirectPath = user?.isGuest && !user?.uuid ? '/' : '/dashboard';
  const GuestValidationSchema = yup.object({
    name: requiredString('Name'),
    email: requiredEmail(),
    password: yup.string().when('$isPasswordRequired', {
      is: true,
      then: (schema) =>
        schema
          .required('Password is required.')
          .min(4, 'Password must be at least 4 characters')
          .max(12, 'Password must be at most 12 characters'),
      otherwise: (schema) => schema.notRequired(),
    }),
  });

  const {
    watch,
    setValue,
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    mode: 'all',
    defaultValues: initialValues,
    resolver: yupResolver(GuestValidationSchema, { context: { isPasswordRequired } }),
  });

  const name = watch('name');
  const email = watch('email');
  const authName =
    `${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`.trim();

  const { mutate: mutateDecodeHash } = useMutation({
    mutationFn: decodeHash,
    mutationKey: ['decodeHash'],
    onSuccess: (data: any) => {
      const { name = '', email = '' } = data?.data?.data?.result || {};
      setValue('name', name);
      setValue('email', email);
      setDisabledField({
        name: !!name?.trim(),
        email: !!email?.trim(),
      });
    },
  });

  const { mutateAsync: mutateGuestLogin, isPending: isGuestLoginPending } = useMutation({
    mutationFn: guestLogin,
    mutationKey: ['guestLogin'],
    onError: (error: any) => {
      const text = error?.response?.data?.error?.message || 'Guest login failed. Please try again.';
      handleAlert({ text, type: 'error' });
    },
  });

  const { mutate: mutateValidateMeet, isPending } = useMutation({
    mutationFn: validateMeet,
    mutationKey: ['validateMeetingWithPassword'],
    onSuccess: async (data) => {
      const rest = data?.data?.data?.result || {};
      if (!rest?._id && rest?.sessionId && rest?.sessionId !== sessionId) {
        handleAlert({ text: 'Session is already opened in another tab', type: 'error' });
        endMeetingForSelf(false);
        navigate(postMeetingRedirectPath);
        return;
      }
      const userName =
        user && user?.uuid
          ? `${user?.user_info?.first_name + ' ' + user?.user_info?.last_name}`
          : user?.guest_info?.name || (watch('name') || '').trim();
      const userEmail = user?.guest_info?.email || watch('email');
      setDisplayName(userName as string);
      setUserName(userName as string);
      setUserEmail(userEmail as string);
      setMeetingData(rest);

      const { host_name = '', meetingId, passwordRequired, isHost, duration, name } = rest;

      setRoomCode(meetingId);
      // if (allowHost === 'N') {
      //   setLobbyScreen(true);
      // }
      if (isHost) {
        setIsHost(true);
      }
      setMeetState((prev: any) => ({
        ...prev,
        meetName: name ?? 'Meeting',
        hostName: host_name ?? '',
        onlyAllowAuthorized: false,
        isGuest: user && user?.uuid ? false : true,
        isPasswordRequired: passwordRequired,
        meetUniqueKey: meetingId,
        // userProfilePic: profile_pic,
        userProfilePic: '',
        isNxaUser: true,
        isLocked: false,
        meetDuration: duration,
        isScreenSharingAllowed: true,
        isGuestAuthorized: true,
      }));
      setReadyForMeet(true);
    },
    onError: (error: any) => {
      handleAlert({ text: error.response.data?.error?.message, type: 'error' });
      const errorMessage = error.response.data?.error?.message;
      const parsedError = JSON.parse(errorMessage);

      setStartUtcTime({
        time: parsedError?.data?.start_local_time,
        timeZone: parsedError?.data?.timezone,
      });
      //   setError('Your session has been expired...');
    },
  });

  useEffect(() => {
    if (hash) {
      mutateDecodeHash({ hash });
    }
  }, [hash]);

  async function handleSubmitForm(values: any) {
    const meetingId = searchParams.get('meetCode') || '';
    const guestName = (values?.name || '').trim();
    const guestEmail = values?.email || '';

    if (!user?.uuid) {
      try {
        const guestLoginResponse: any = await mutateGuestLogin({
          meetingId,
          name: guestName,
          email: guestEmail,
        });
        const guestLoginResult =
          guestLoginResponse?.data?.data?.result ||
          guestLoginResponse?.data?.result ||
          guestLoginResponse?.data ||
          {};
        const guestToken =
          guestLoginResult?.token ||
          guestLoginResult?.accessToken ||
          guestLoginResult?.access_token;
        const guestUuid = guestLoginResult?.uuid || guestLoginResult?.userUuid || '';

        if (!guestToken) {
          handleAlert({ text: 'Guest token not found. Please try again.', type: 'error' });
          return;
        }

        sessionStorage.setItem(GUEST_MEETING_TOKEN_KEY, String(guestToken));
        window.dispatchEvent(new Event(GUEST_MEETING_TOKEN_UPDATED_EVENT));
        handleSetUser({
          isGuest: true,
          guest_meeting_token: String(guestToken),
          guest_info: {
            name: guestName,
            email: guestEmail,
            uuid: guestUuid,
          },
        });
      } catch {
        return;
      }
    }

    const payload: any = {
      meetingId,
      name: guestName,
      email: guestEmail,
      sessionId,
      confirm: false,
    };
    // if (isPasswordRequired) {
    //   payload.password = values?.password || '';
    // }
    mutateValidateMeet(payload);
  }

  useEffect(() => {
    if (emailFromUrl || user?.uuid || user?.guest_info?.email) {
      setValue('email', emailFromUrl || user?.user_info?.email || user?.guest_info?.email || '');
    }
    if (nameFromUrl || user?.uuid || user?.guest_info?.name) {
      setValue('name', nameFromUrl || authName || user?.guest_info?.name || '');
    }
  }, [emailFromUrl, nameFromUrl, user, authName]);

  const isEmailDisabled = !!emailFromUrl;
  const isNameDisabled = !!nameFromUrl;

  return (
    <>
      {/* <MeetingHeader /> */}
      <div className="w-full sm:h-screen xs:h-auto flex flex-col justify-center ">
        <div className="flex max-w-[85%] mx-auto xxl:h-[calc(100%_-_14rem)] xl:h-[calc(100%_-_13.6rem)] lg:h-[calc(100%_-_12.9rem)] md:h-[calc(100%_-_12.6rem)] sm:h-[calc(100%_-_12.6rem)] xs:h-[calc(100%_-_12.6rem)] p-4">
          <div className="w-full flex items-center gap-4">
            <div className="w-1/2  flex items-center justify-center p-5">
              <form
                onSubmit={handleSubmit(handleSubmitForm)}
                className="flex flex-col gap-4 w-full bg-white  rounded-xl p-8"
              >
                {/* {isGuest && ( */}
                <>
                  <h2 className="mb-3 text-2xl font-semibold text-gray-900 leading-snug">
                    Just one step away from your meeting
                  </h2>
                </>
                {/* )} */}
                <Input
                  {...register('name')}
                  label="Name"
                  type="text"
                  placeholder="Enter name"
                  value={name}
                  error={errors?.name?.message}
                  disabled={isNameDisabled || user?.uuid || disabledField?.name}
                  maxLength={50}
                />
                <Input
                  {...register('email')}
                  label="Email"
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  error={errors?.email?.message}
                  disabled={isEmailDisabled || user?.uuid || disabledField?.email}
                />
                {/* {isPasswordRequired && (
                  <Input
                    {...register('password')}
                    label="Password"
                    type="text"
                    placeholder="Enter password"
                    value={watch('password')}
                    error={errors?.password?.message}
                    maxLength={13}
                  />
                )} */}
                <Button variant={'primary'} type="submit">
                  {isPending || isGuestLoginPending ? 'Please Wait..' : 'Join'}
                </Button>
              </form>
            </div>
            <div className="w-1/2 flex justify-end p-5">
              <img src={MeetingImg} className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuestScreen;
