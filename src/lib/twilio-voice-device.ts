import { Device } from '@twilio/voice-sdk';
import { getTwilioVoiceToken } from '@/services/api';

export const TWILIO_CALLER_ID = '+17755384044';
const TWILIO_DIAL_PREFIX = '+91';

let device: Device | null = null;
let deviceReadyPromise: Promise<Device> | null = null;

const normalizeToE164 = (raw: string): string => {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  return `${TWILIO_DIAL_PREFIX}${trimmed}`;
};

const createDevice = async (): Promise<Device> => {
  const response = await getTwilioVoiceToken();
  const token = response?.data?.data?.result?.token;
  if (!token) {
    throw new Error('Failed to obtain Twilio voice token');
  }

  const newDevice = new Device(token);
  await newDevice.register();
  return newDevice;
};

const getDevice = async (): Promise<Device> => {
  if (device) return device;
  if (!deviceReadyPromise) {
    deviceReadyPromise = createDevice()
      .then((readyDevice) => {
        device = readyDevice;
        return readyDevice;
      })
      .catch((error) => {
        deviceReadyPromise = null;
        throw error;
      });
  }
  return deviceReadyPromise;
};

export const placeTwilioCall = async (toNumber: string) => {
  const to = normalizeToE164(toNumber);
  if (!to) {
    throw new Error('A destination number is required');
  }

  const activeDevice = await getDevice();
  return activeDevice.connect({ params: { To: to } });
};
