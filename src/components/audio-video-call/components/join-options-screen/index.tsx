import { SpeakerLine } from '@/assets/icons';
import CustomTooltip from '@/components/custom/custom-tooltip';
import CustomSelect from '@/components/custom/custom-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAvCall } from '@/hooks/use-av-call';
import { normalizeMeetingCallType } from '@/lib/meeting-links';
import { handleAlert } from '@/lib/utils';
import { stopMediaStream } from '@/services/jitsi/media-cleanup';
import { VideoIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { CALL_STATUS_CONST } from '../../constants';
import { ensureCallMediaAccess, useCallEligibility } from '../../hooks/use-call-eligibility';

export const applyCallJoinPreference = (setState: any, callType: 'audio' | 'video') => {
  const normalizedType = normalizeMeetingCallType(callType);
  const isVideoCall = normalizedType === 'video';
  setState((prev: any) => ({
    ...prev,
    isVideoCall,
    isLocalVideoMuted: !isVideoCall,
    isAVVideoMuted: !isVideoCall,
    isAVAudioMuted: false,
  }));
};

const JoinOptionsScreen = ({
  handleCallUpdate,
  incominCallData,
  setLocalCallStatus,
  callType,
}: {
  callingUserdetails: any;
  recevierUserdetails: any;
  isHost: boolean;
  handleCallUpdate: any;
  incominCallData: any;
  setLocalCallStatus: any;
  callType?: string;
}) => {
  const { setValue, watch } = useForm({
    mode: 'all',
    defaultValues: {
      audio_device: null as any,
      video_device: null as any,
      speaker_device: null as any,
    },
  });

  const {
    errors,
    devices,
    handleChangeSpeakerDevice,
    initializeSystemAVConfig,
    speakerDeviceId,
    cameraDeviceId,
    micDeviceId,
    isLocalAudioMuted,
    setState,
  } = useAvCall();
  const normalizedCallType = normalizeMeetingCallType(incominCallData?.callType || callType);
  const removeListenerRef = useRef<any>(null);
  const {
    isAudioCallReady,
    isVideoCallReady,
    audioBlockReason,
    videoBlockReason,
    refresh: refreshEligibility,
  } = useCallEligibility({
    fallbackDevices: devices || null,
  });

  useEffect(() => {
    let mounted = true;
    const initializeTracks = async () => {
      try {
        const response = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: normalizedCallType === 'video',
        });

        response?.getTracks()?.forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.log('Error initializing media permissions:', err);
      }

      if (!mounted) return;
      removeListenerRef.current = await initializeSystemAVConfig();
      if (!mounted) {
        removeListenerRef.current?.();
        removeListenerRef.current = null;
        return;
      }
      await refreshEligibility();
    };

    initializeTracks();

    return () => {
      mounted = false;
      if (typeof removeListenerRef.current === 'function') {
        removeListenerRef.current();
      }
    };
  }, [initializeSystemAVConfig, normalizedCallType, refreshEligibility]);

  // Create preview tracks for the join options screen
  useEffect(() => {
    let cancelled = false;
    const createPreviewTracks = async () => {
      if (normalizedCallType !== 'video') return;
      if (!micDeviceId || !cameraDeviceId || !window.JitsiMeetJS || !devices) return;

      try {
        // Create preview tracks using getUserMedia (not Jitsi tracks)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: micDeviceId },
          video: { deviceId: cameraDeviceId },
        });
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        // Attach video to preview element
        const video: any = document.querySelector('#avCallPreviewVideo');
        if (video) {
          video.srcObject = stream;
        }

        // Store stream reference for cleanup
        stopMediaStream((window as any).__previewStream);
        (window as any).__previewStream = stream;
      } catch (err: any) {
        console.error('Error creating preview:', err);
        setState((prev: any) => ({
          ...prev,
          errors: { ...prev.errors, localVideo: err?.message },
        }));
      }
    };

    if (normalizedCallType === 'video' && micDeviceId && cameraDeviceId && devices) {
      const timer = setTimeout(() => {
        createPreviewTracks();
      }, 300);

      return () => {
        cancelled = true;
        clearTimeout(timer);
        // Cleanup preview stream when leaving join options
        const stream = (window as any).__previewStream;
        if (stream) {
          stopMediaStream(stream);
          (window as any).__previewStream = null;
        }
        const video = document.querySelector<HTMLVideoElement>('#avCallPreviewVideo');
        if (video) video.srcObject = null;
      };
    }
  }, [micDeviceId, cameraDeviceId, devices, normalizedCallType, setState]);

  useEffect(() => {
    handleChangeSpeakerDevice();
  }, [speakerDeviceId]);

  useEffect(() => {
    if (devices) {
      setValue('audio_device', {
        label: devices?.micDevices[0]?.label,
        value: devices?.micDevices[0]?.deviceId,
      });
      setValue('video_device', {
        label: devices?.cameraDevices[0]?.label,
        value: devices?.cameraDevices[0]?.deviceId,
      });
      setValue('speaker_device', {
        label: devices?.speakerDevices[0]?.label,
        value: devices?.speakerDevices[0]?.deviceId,
      });
    }
  }, [devices]);

  const handleJoinWithVideo = async () => {
    const mediaAccess = await ensureCallMediaAccess('video');
    if (mediaAccess.fallbackCallType === 'audio') {
      handleAlert({ text: mediaAccess.reason, type: 'info' });
      applyCallJoinPreference(setState, 'audio');
      handleCallUpdate(CALL_STATUS_CONST.CONNECTED, false);
      if (incominCallData?.receiverId?.length > 1) {
        setLocalCallStatus(CALL_STATUS_CONST.CONNECTED);
      }
      return;
    }

    if (!mediaAccess.ok) {
      handleAlert({ text: mediaAccess.reason, type: 'error' });
      await refreshEligibility();
      return;
    }

    if (!isVideoCallReady) {
      handleAlert({
        text: videoBlockReason || 'Video call requirements are not met.',
        type: 'error',
      });
      return;
    }

    // Clean up preview stream before joining
    const previewStream = (window as any).__previewStream;
    if (previewStream) {
      stopMediaStream(previewStream);
      (window as any).__previewStream = null;
    }

    applyCallJoinPreference(setState, 'video');
    handleCallUpdate(CALL_STATUS_CONST.CONNECTED, true);
    if (incominCallData?.receiverId?.length > 1) {
      setLocalCallStatus(CALL_STATUS_CONST.CONNECTED);
    }
  };

  const handleJoinWithAudio = async () => {
    const mediaAccess = await ensureCallMediaAccess('audio');
    if (!mediaAccess.ok) {
      handleAlert({ text: mediaAccess.reason, type: 'error' });
      await refreshEligibility();
      return;
    }

    if (!isAudioCallReady) {
      handleAlert({
        text: audioBlockReason || 'Voice call requirements are not met.',
        type: 'error',
      });
      return;
    }

    // Clean up preview stream before joining
    const previewStream = (window as any).__previewStream;
    if (previewStream) {
      stopMediaStream(previewStream);
      (window as any).__previewStream = null;
    }

    applyCallJoinPreference(setState, 'audio');
    handleCallUpdate(CALL_STATUS_CONST.CONNECTED, false);
    if (incominCallData?.receiverId?.length > 1) {
      setLocalCallStatus(CALL_STATUS_CONST.CONNECTED);
    }
  };

  return (
    <div className="w-screen h-screen flex bg-white">
      <div className="flex min-h-screen w-full h-full">
        <div className="w-full flex flex-col items-center justify-center gap-8 px-8">
          <div className="flex items-center justify-center w-full max-w-7xl gap-8">
            <div className="flex-1 max-w-3xl">
              <div className="w-full aspect-video flex items-center justify-center relative bg-black rounded-xl">
                {normalizedCallType === 'video' ? (
                  <video
                    style={{ transform: 'rotateY(180deg)' }}
                    className="pointer-events-none w-full h-full rounded-xl object-cover"
                    autoPlay
                    playsInline
                    id="avCallPreviewVideo"
                  ></video>
                ) : (
                  <div className="text-white text-center px-6">
                    <div className="text-lg font-semibold">Voice Call</div>
                    <div className="text-sm text-gray-300 mt-1">
                      Camera preview is not required for voice calls.
                    </div>
                  </div>
                )}
                {errors?.['localVideo'] && (
                  <div className="absolute inset-0 flex justify-center items-center rounded-xl bg-black text-md text-white leading-7 px-10 text-center">
                    {`${errors['localVideo']} - Your Camera device is being used by another application`}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex flex-col gap-4">
                <h3 className="text-gray-900 font-semibold text-xl">Call Settings</h3>

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
                  <Label>Audio Status</Label>
                  <div className="text-sm text-gray-600">
                    {isLocalAudioMuted ? 'Microphone is muted' : 'Microphone is active'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CustomTooltip text={audioBlockReason || 'Join with voice call'} side="top">
              <span>
                <Button
                  className="cursor-pointer"
                  type="button"
                  onClick={handleJoinWithAudio}
                  disabled={!isAudioCallReady}
                >
                  <SpeakerLine className="w-5 h-5" />
                  Join with audio
                </Button>
              </span>
            </CustomTooltip>
            <CustomTooltip text={videoBlockReason || 'Join with video call'} side="top">
              <span>
                <Button
                  variant={'outline'}
                  type="button"
                  onClick={handleJoinWithVideo}
                  disabled={!isVideoCallReady}
                >
                  <VideoIcon className="w-5 h-5" />
                  Join with Video
                </Button>
              </span>
            </CustomTooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinOptionsScreen;
