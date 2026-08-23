import { MeetingCallType, normalizeMeetingCallType } from '@/lib/meeting-links';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MediaPermissionState = PermissionState | 'unsupported' | 'unknown';

type DeviceInventory = {
  micCount: number;
  cameraCount: number;
  speakerCount: number;
};

type FallbackDevices = {
  micDevices?: any[];
  cameraDevices?: any[];
  speakerDevices?: any[];
} | null;

type EligibilitySnapshot = {
  hasChecked: boolean;
  isLoading: boolean;
  microphonePermission: MediaPermissionState;
  cameraPermission: MediaPermissionState;
  deviceInventory: DeviceInventory;
};

export type VideoJoinAudioFallback = {
  canFallback: boolean;
  reason: string;
};

const EMPTY_DEVICE_INVENTORY: DeviceInventory = {
  micCount: 0,
  cameraCount: 0,
  speakerCount: 0,
};

const queryPermissionState = async (
  permissionName: 'microphone' | 'camera',
): Promise<MediaPermissionState> => {
  if (typeof navigator === 'undefined') return 'unknown';
  if (!navigator.permissions?.query) return 'unsupported';

  try {
    const status = await navigator.permissions.query({
      name: permissionName as PermissionName,
    });
    return status.state as PermissionState;
  } catch {
    return 'unsupported';
  }
};

const getDeviceInventoryFromList = (list: MediaDeviceInfo[]) => ({
  micCount: list.filter((device) => device.kind === 'audioinput').length,
  cameraCount: list.filter((device) => device.kind === 'videoinput').length,
  speakerCount: list.filter((device) => device.kind === 'audiooutput').length,
});

const getDeviceInventoryFromFallback = (fallbackDevices?: FallbackDevices): DeviceInventory => ({
  micCount: Array.isArray(fallbackDevices?.micDevices)
    ? fallbackDevices?.micDevices?.length || 0
    : 0,
  cameraCount: Array.isArray(fallbackDevices?.cameraDevices)
    ? fallbackDevices?.cameraDevices?.length || 0
    : 0,
  speakerCount: Array.isArray(fallbackDevices?.speakerDevices)
    ? fallbackDevices?.speakerDevices?.length || 0
    : 0,
});

const getDeviceInventory = async (fallbackInventory: DeviceInventory): Promise<DeviceInventory> => {
  if (!navigator?.mediaDevices?.enumerateDevices) {
    return fallbackInventory;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inventory = getDeviceInventoryFromList(devices || []);

    if (inventory.micCount || inventory.cameraCount || inventory.speakerCount) {
      return inventory;
    }

    return fallbackInventory;
  } catch {
    return fallbackInventory;
  }
};

export const getCallBlockReason = (
  callType: MeetingCallType,
  snapshot: EligibilitySnapshot,
): string => {
  const normalizedType = normalizeMeetingCallType(callType);
  const { microphonePermission, cameraPermission, deviceInventory, isLoading, hasChecked } =
    snapshot;

  if (!hasChecked) return '';
  if (isLoading) return 'Checking devices and permissions...';

  if (!deviceInventory.micCount) {
    return 'No microphone device found';
  }

  if (microphonePermission === 'denied') {
    return 'Microphone permission is blocked. Enable it from browser site settings.';
  }

  if (microphonePermission === 'prompt') {
    return 'Enable microphone permission before joining the call.';
  }

  if (normalizedType === 'video') {
    if (!deviceInventory.cameraCount) {
      return 'No camera device found';
    }

    if (cameraPermission === 'denied') {
      return 'Camera permission is blocked. Enable it from browser site settings.';
    }

    if (cameraPermission === 'prompt') {
      return 'Enable camera permission before joining the video call.';
    }
  }

  return '';
};

export const getVideoToAudioFallback = (snapshot: EligibilitySnapshot): VideoJoinAudioFallback => {
  const audioBlockReason = getCallBlockReason('audio', snapshot);
  if (audioBlockReason) {
    return { canFallback: false, reason: '' };
  }

  if (!snapshot.hasChecked || snapshot.isLoading) {
    return { canFallback: false, reason: '' };
  }

  if (!snapshot.deviceInventory.cameraCount) {
    return {
      canFallback: true,
      reason: 'This is a video call. Joined with audio because no camera device is available.',
    };
  }

  if (snapshot.cameraPermission === 'denied' || snapshot.cameraPermission === 'prompt') {
    return {
      canFallback: true,
      reason: 'This is a video call. Joined with audio because camera permission is not enabled.',
    };
  }

  return { canFallback: false, reason: '' };
};

const mapGetUserMediaError = (error: any, callType: MeetingCallType): string => {
  const normalizedType = normalizeMeetingCallType(callType);
  const defaultMessage =
    normalizedType === 'video'
      ? 'Unable to access camera/microphone right now.'
      : 'Unable to access microphone right now.';

  if (!error) return defaultMessage;
  const errorName = `${error?.name || ''}`.toLowerCase();

  if (errorName.includes('notallowed') || errorName.includes('permissiondenied')) {
    return normalizedType === 'video'
      ? 'Camera and microphone permission are required for video calls.'
      : 'Microphone permission is required for voice calls.';
  }

  if (errorName.includes('notfound') || errorName.includes('devicesnotfound')) {
    return normalizedType === 'video'
      ? 'Required camera/microphone devices were not found.'
      : 'A microphone device was not found.';
  }

  if (errorName.includes('notreadable') || errorName.includes('trackstart')) {
    return 'Required device is busy in another app. Close it and try again.';
  }

  return defaultMessage;
};

const isDeviceBusyError = (error: any) => {
  const errorName = `${error?.name || ''}`.toLowerCase();
  return errorName.includes('notreadable') || errorName.includes('trackstart');
};

export const ensureCallMediaAccess = async (
  callType: MeetingCallType,
): Promise<{ ok: boolean; reason: string; fallbackCallType?: MeetingCallType }> => {
  if (!navigator?.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      reason: 'Media device APIs are not supported in this browser.',
    };
  }

  const normalizedType = normalizeMeetingCallType(callType);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: normalizedType === 'video',
    });

    stream?.getTracks?.().forEach((track) => {
      try {
        track.stop();
      } catch {
        // no-op
      }
    });

    return { ok: true, reason: '' };
  } catch (error: any) {
    if (normalizedType === 'video') {
      const errorName = `${error?.name || ''}`.toLowerCase();
      const isCameraPermissionError =
        errorName.includes('notallowed') || errorName.includes('permissiondenied');
      const isCameraBusyError = isDeviceBusyError(error);
      const isCameraNotFoundError =
        errorName.includes('notfound') || errorName.includes('devicesnotfound');

      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        audioOnlyStream?.getTracks?.().forEach((track) => {
          try {
            track.stop();
          } catch {
            // no-op
          }
        });

        if (isCameraPermissionError) {
          return {
            ok: true,
            reason:
              'This is a video call. Joined with audio because camera permission is not enabled.',
            fallbackCallType: 'audio',
          };
        }

        if (isCameraBusyError) {
          return {
            ok: true,
            reason:
              'This is a video call. Joined with audio because camera is being used by another application.',
            fallbackCallType: 'audio',
          };
        }

        if (isCameraNotFoundError) {
          return {
            ok: true,
            reason:
              'This is a video call. Joined with audio because no camera device is available.',
            fallbackCallType: 'audio',
          };
        }

        return {
          ok: true,
          reason:
            'This is a video call. Joined with audio because camera is unavailable right now.',
          fallbackCallType: 'audio',
        };
      } catch {
        return {
          ok: false,
          reason:
            'Unable to access microphone. Microphone permission/device is required to join this call.',
        };
      }
    }

    if (isDeviceBusyError(error)) {
      return {
        ok: false,
        reason: 'Microphone is being used by another application. Close it and try again.',
      };
    }
    return { ok: false, reason: mapGetUserMediaError(error, normalizedType) };
  }
};

export const useCallEligibility = ({
  fallbackDevices = null,
  autoRefresh = false,
  minRefreshIntervalMs = 5000,
}: {
  fallbackDevices?: FallbackDevices;
  autoRefresh?: boolean;
  minRefreshIntervalMs?: number;
} = {}) => {
  const [snapshot, setSnapshot] = useState<EligibilitySnapshot>({
    hasChecked: false,
    isLoading: false,
    microphonePermission: 'unknown',
    cameraPermission: 'unknown',
    deviceInventory: EMPTY_DEVICE_INVENTORY,
  });
  const latestSnapshotRef = useRef(snapshot);
  const lastRefreshAtRef = useRef(0);
  const inFlightRefreshRef = useRef<Promise<EligibilitySnapshot> | null>(null);
  const fallbackInventory = useMemo(
    () => getDeviceInventoryFromFallback(fallbackDevices),
    [
      fallbackDevices?.micDevices?.length,
      fallbackDevices?.cameraDevices?.length,
      fallbackDevices?.speakerDevices?.length,
    ],
  );

  useEffect(() => {
    latestSnapshotRef.current = snapshot;
  }, [snapshot]);

  const refresh = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const now = Date.now();
      const currentSnapshot = latestSnapshotRef.current;
      const refreshTooSoon =
        !force &&
        currentSnapshot.hasChecked &&
        now - lastRefreshAtRef.current < minRefreshIntervalMs;

      if (refreshTooSoon) {
        return currentSnapshot;
      }

      if (inFlightRefreshRef.current) {
        return inFlightRefreshRef.current;
      }

      const refreshPromise = (async () => {
        setSnapshot((prev) => ({ ...prev, isLoading: true }));

        const [microphonePermission, cameraPermission, deviceInventory] = await Promise.all([
          queryPermissionState('microphone'),
          queryPermissionState('camera'),
          getDeviceInventory(fallbackInventory),
        ]);

        const nextSnapshot: EligibilitySnapshot = {
          hasChecked: true,
          isLoading: false,
          microphonePermission,
          cameraPermission,
          deviceInventory,
        };
        lastRefreshAtRef.current = Date.now();
        setSnapshot(nextSnapshot);
        return nextSnapshot;
      })();

      inFlightRefreshRef.current = refreshPromise;

      try {
        return await refreshPromise;
      } finally {
        inFlightRefreshRef.current = null;
      }
    },
    [fallbackInventory, minRefreshIntervalMs],
  );

  useEffect(() => {
    if (!autoRefresh) return;
    void refresh();
  }, [autoRefresh, refresh]);

  useEffect(() => {
    if (!autoRefresh || !navigator?.mediaDevices?.addEventListener) return;

    const handleDeviceChange = () => {
      void refresh();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [autoRefresh, refresh]);

  const audioBlockReason = useMemo(() => getCallBlockReason('audio', snapshot), [snapshot]);
  const videoBlockReason = useMemo(() => getCallBlockReason('video', snapshot), [snapshot]);

  const isAudioCallReady = !audioBlockReason;
  const isVideoCallReady = !videoBlockReason;

  return {
    ...snapshot,
    isAudioCallReady,
    isVideoCallReady,
    audioBlockReason,
    videoBlockReason,
    refresh,
  };
};
