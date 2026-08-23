import { SpeakerLine } from '@/assets/icons';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJitsi } from '@/hooks/use-jitsi';
import { useUser } from '@/hooks/use-user';
import { validateMeetingPassword } from '@/services/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import { VideoIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { useSocketEvents } from '@/hooks/use-socket-events';

let removeListener: any = () => null;
type AVStep = 'av_setup' | 'password_gate' | '';

const getFriendlyPasswordError = (error: any) => {
  const safeParseJson = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const extractMessageFromObject = (value: any) => {
    if (!value || typeof value !== 'object') return '';

    return (
      value?.message ||
      value?.error?.message ||
      value?.data?.message ||
      value?.result?.message ||
      ''
    );
  };

  const candidates = [
    error?.response?.data?.error?.message,
    error?.response?.data?.message,
    error?.message,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === 'object') {
      const nestedMessage = extractMessageFromObject(candidate);
      if (nestedMessage) return nestedMessage;
      continue;
    }

    if (typeof candidate === 'string') {
      const parsed = safeParseJson(candidate) || safeParseJson(candidate.replace(/\\"/g, '"'));
      const nestedMessage = extractMessageFromObject(parsed);
      if (nestedMessage) return nestedMessage;

      if (candidate.includes('","data":')) {
        return candidate
          .split('","data":')[0]
          ?.replace(/^\{"message":"?/, '')
          .trim();
      }

      return candidate;
    }
  }

  return 'Unable to validate meeting password right now.';
};

const AVModal = ({ meetState, setMeetState }: { meetState: any; setMeetState: any }) => {
  const { user } = useUser();
  const meetingActorUuid = user?.uuid || user?.guest_info?.uuid || '';
  const { isSocketConnected } = useSocketEvents();
  const [entryStep, setEntryStep] = useState<AVStep>('av_setup');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingJoinAction, setPendingJoinAction] = useState<{ withVideo: boolean } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    if (meetingActorUuid && isSocketConnected) {
      const timer = setTimeout(() => {
        setIsSetupComplete(true);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setIsSetupComplete(false);
    }
  }, [meetingActorUuid, isSocketConnected]);

  const guestName = user?.guest_info?.name || '';
  const nameSegments = guestName.trim().split(/\s+/).filter(Boolean);
  const guestFirstName = nameSegments[0] || '';
  const guestLastName = nameSegments.slice(1).join(' ');
  const displayFirstName = user?.user_info?.first_name || guestFirstName || 'Guest';
  const displayLastName = user?.user_info?.last_name || guestLastName || '';
  const displayName = `${displayFirstName} ${displayLastName}`.trim();

  const validationSchema = yup.object().shape({
    name: meetState?.isGuest ? yup.string().required('Name is required') : yup.string(),
    audio_device: yup.mixed(),
    video_device: yup.mixed(),
    speaker_device: yup.mixed(),
  });

  const { watch, setValue } = useForm({
    mode: 'all',
    defaultValues: {
      name: '',
      audio_device: null,
      video_device: null,
      speaker_device: null,
    },
    resolver: yupResolver(validationSchema),
  });

  const { mutateAsync: validateMeetingPasswordMutate, isPending: isValidatingPassword } =
    useMutation({
      mutationFn: validateMeetingPassword,
      mutationKey: ['validateMeetingPassword'],
    });

  const {
    errors,
    AVVideoTrack,
    devices,
    isTestingMic,
    handleTestMic,
    isRoomJoined,
    joinMeetHandler,
    updateLocalVideoTrack,
    destroyAVTracks,
    handleAVVideoPreview,
    handleAVAudioPreview,
    handleChangeSpeakerDevice,
    initializeSystemAVConfig,
    cameraDeviceId,
    micDeviceId,
    speakerDeviceId,
    isAVVideoMuted,
    isHost,
  } = useJitsi();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true,
      })
      .then((response) => {
        response?.getTracks()?.forEach((track) => {
          track.stop();
        });
        (async () => {
          removeListener = await initializeSystemAVConfig();
        })();
      })
      .catch(() => {
        (async () => {
          removeListener = await initializeSystemAVConfig();
        })();
      });

    return () => {
      destroyAVTracks();
      removeListener();
    };
  }, []);

  useEffect(() => {
    handleAVVideoPreview();
  }, [cameraDeviceId]);

  useEffect(() => {
    handleAVAudioPreview();
  }, [micDeviceId]);

  useEffect(() => {
    handleChangeSpeakerDevice();
  }, [speakerDeviceId]);

  useEffect(() => {
    if (AVVideoTrack && Object.keys(AVVideoTrack).length > 0) {
      const video: any = document.querySelector('#avPreviewVideo');
      if (!video) return;

      try {
        video.srcObject = AVVideoTrack?.stream;
        const vidPromise = video?.play();
        if (vidPromise !== undefined) {
          vidPromise
            .then(() => {
              video?.play();
            })
            .catch(() => {
              video?.pause();
            });
        }
      } catch (err) {
        console.log('AV MODAL', err);
      }
    }
  }, [AVVideoTrack, isAVVideoMuted]);

  useEffect(() => {
    if (devices) {
      setValue('audio_device', {
        label: devices?.micDevices?.[0]?.label,
        value: devices?.micDevices?.[0]?.deviceId,
      });
      setValue('video_device', {
        label: devices?.cameraDevices?.[0]?.label,
        value: devices?.cameraDevices?.[0]?.deviceId,
      });
      setValue('speaker_device', {
        label: devices?.speakerDevices?.[0]?.label,
        value: devices?.speakerDevices?.[0]?.deviceId,
      });
    }
  }, [devices]);

  const continueHandle = async () => {
    await updateLocalVideoTrack();
    // await updateLocalAudioTrack();
    // closeWidget();
  };

  const proceedToJoinMeeting = async ({ withVideo = false }: { withVideo?: boolean }) => {
    if (isJoining || !isSocketConnected || !meetingActorUuid || !isSetupComplete) return;
    try {
      setIsJoining(true);
      await joinMeetHandler(meetState?.meetName, { withVideo });
      destroyAVTracks();
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmitForm = async ({ withVideo = false }: { withVideo?: boolean }) => {
    if (isJoining) return;
    const isPasswordValidationRequired = Boolean(
      meetState?.isPasswordRequired && !meetState?.isPasswordAuth && !isHost,
    );

    if (isPasswordValidationRequired) {
      setPendingJoinAction({ withVideo });
      setPasswordError('');
      setEntryStep('password_gate');
      return;
    }

    await proceedToJoinMeeting({ withVideo });
  };

  const handleValidateMeetingPassword = async () => {
    const password = meetingPassword.trim();
    const meetingId = String(meetState?.meetUniqueKey || '').trim();

    if (!password) {
      setPasswordError('Password is required.');
      return;
    }

    if (!meetingId) {
      setPasswordError('Meeting ID is missing.');
      return;
    }

    try {
      await validateMeetingPasswordMutate({ meetingId, password });
      setPasswordError('');
      setEntryStep('');
      setMeetingPassword('');
      setMeetState((prev: any) => ({ ...prev, isPasswordAuth: true }));

      const pendingAction = pendingJoinAction || { withVideo: false };
      setPendingJoinAction(null);
      await proceedToJoinMeeting({ withVideo: pendingAction.withVideo });
    } catch (error: any) {
      setPasswordError(getFriendlyPasswordError(error));
    }
  };

  const handleBackFromPasswordGate = () => {
    setEntryStep('av_setup');
    setPasswordError('');
    setMeetingPassword('');
    setPendingJoinAction(null);
  };

  return (
    <div className="w-full flex h-full">
      <div className="fixed w-full h-16 z-1">
        {meetState?.isPortalUser && (
          <header className="bg-primary px-3 py-2 flex items-center h-full">
            <nav className="flex items-center w-full" aria-label="Global">
              <div className="gap-2 flex items-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-medium text-white">
                  {displayFirstName?.[0]}
                  {displayLastName?.[0]}
                </div>
                <p className="text-white font-semibold text-lg">{displayName}</p>
              </div>
            </nav>
          </header>
        )}
      </div>

      <div className="flex min-h-full w-full pt-16 h-full">
        <div className="md:w-3/4 md:m-auto flex flex-col items-center gap-6 md:gap-12 w-full xs:py-4 md:pt-0 overflow-auto">
          {entryStep === 'av_setup' ? (
            <>
              <div className="flex md:flex-row flex-col items-center w-full">
                <div className="md:w-2/4 w-full">
                  <div
                    className={`w-full aspect-video px-3 flex items-center justify-center relative text-white ${AVVideoTrack?.stream?.active ? '' : 'bg-black-600 rounded-xl'}`}
                  >
                    {errors?.['avVideo'] || !AVVideoTrack?.stream?.active ? (
                      <div className="flex justify-center items-center w-full h-full rounded-xl object-cover text-center px-10 bg-black text-md text-white leading-7">
                        {errors?.['avVideo'] ? (
                          `${errors['avVideo']} - Your Camera device is being used by another application`
                        ) : (
                          <CustomAvatar name={displayName || 'Guest'} size="150" />
                        )}
                      </div>
                    ) : (
                      <video
                        style={{ transform: 'rotateY(180deg)' }}
                        className="pointer-events-none w-full h-full rounded-xl object-cover"
                        autoPlay
                        playsInline
                        id="avPreviewVideo"
                      ></video>
                    )}
                  </div>
                </div>

                <div className="md:w-2/4 px-6 w-full">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-gray-900 font-semibold text-lg md:mt-0 mt-2">
                      Meeting Settings
                    </h3>

                    <CustomSelect
                      label="Audio Devices"
                      value={watch('audio_device')}
                      handleChange={(e) => {
                        setValue('audio_device', e);
                      }}
                      placeholder="Select audio device"
                      options={
                        devices &&
                        devices?.micDevices &&
                        devices?.micDevices?.length &&
                        devices?.micDevices?.map((item: any) => ({
                          id: item.deviceId,
                          label: item.label,
                          value: item.deviceId,
                        }))
                      }
                    />

                    <CustomSelect
                      label="Video Devices"
                      placeholder="Select video device"
                      options={
                        devices &&
                        devices?.cameraDevices &&
                        devices?.cameraDevices?.length &&
                        devices?.cameraDevices?.map((item: any) => ({
                          id: item.deviceId,
                          label: item.label,
                          value: item.deviceId,
                        }))
                      }
                      value={watch('video_device')}
                      handleChange={(e) => {
                        setValue('video_device', e);
                      }}
                    />

                    <CustomSelect
                      label="Speaker Devices"
                      placeholder="Select speaker device"
                      options={
                        devices &&
                        devices?.speakerDevices &&
                        devices?.speakerDevices?.length &&
                        devices?.speakerDevices?.map((item: any) => ({
                          id: item.deviceId,
                          label: item.label,
                          value: item.deviceId,
                        }))
                      }
                      value={watch('speaker_device')}
                      handleChange={(e) => {
                        setValue('speaker_device', e);
                      }}
                    />

                    <div className="flex flex-col gap-1">
                      <Label>Mic Test</Label>

                      <Button type="button" variant={'outline'} onClick={handleTestMic}>
                        {isTestingMic ? 'Say Hi you will hear your voice' : 'Start Test'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {isRoomJoined && (
                  <>
                    <Button
                      variant={'secondary'}
                      onClick={(e) => {
                        e.stopPropagation();
                        // closeWidget();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="button" onClick={continueHandle}>
                      Continue
                    </Button>
                  </>
                )}

                {!isRoomJoined && (
                  <>
                    <Button
                      className="cursor-pointer"
                      type="button"
                      disabled={
                        isJoining || !isSocketConnected || !meetingActorUuid || !isSetupComplete
                      }
                      onClick={() => handleSubmitForm({ withVideo: false })}
                    >
                      <SpeakerLine className="w-5 h-5" />
                      {!isSocketConnected || !meetingActorUuid || !isSetupComplete
                        ? 'Connecting...'
                        : isJoining
                          ? 'Joining...'
                          : 'Start with audio'}
                    </Button>
                    {!errors['avVideo'] && (
                      <Button
                        variant={'outline'}
                        type="button"
                        disabled={
                          isJoining || !isSocketConnected || !meetingActorUuid || !isSetupComplete
                        }
                        onClick={() => handleSubmitForm({ withVideo: true })}
                      >
                        <VideoIcon className="w-5 h-5" />
                        {!isSocketConnected || !meetingActorUuid || !isSetupComplete
                          ? 'Connecting...'
                          : isJoining
                            ? 'Joining...'
                            : 'Start with Video'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="w-full max-w-md border border-gray-200 rounded-xl p-5 flex flex-col gap-4 bg-white">
              <h3 className="text-2xl font-semibold text-gray-900">Enter Meeting Password</h3>
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                value={meetingPassword}
                onChange={(event) => {
                  setMeetingPassword(event.target.value);
                  if (passwordError) setPasswordError('');
                }}
                error={passwordError}
                maxLength={32}
                autoFocus
              />
              {passwordError ? (
                <p className="text-sm text-red-600 leading-5">{passwordError}</p>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleBackFromPasswordGate}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleValidateMeetingPassword}
                  disabled={
                    isValidatingPassword ||
                    isJoining ||
                    !isSocketConnected ||
                    !meetingActorUuid ||
                    !isSetupComplete
                  }
                >
                  {isValidatingPassword ? 'Validating...' : isJoining ? 'Joining...' : 'Continue'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AVModal;
