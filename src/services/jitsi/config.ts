export const DOMAIN = 'meet.mycountrymobile.com';
export const MUC = 'conference.meet.mycountrymobile.com';
export const FOCUS = 'focus.meet.mycountrymobile.com';
export const SERVICEURL = 'wss://meet.mycountrymobile.com/xmpp-websocket';
export const WEBSOCKETKEEPALIVEURL = 'https://meet.mycountrymobile.com/_unlock';
export const DEFAULT_MEETING_URL = `https://meet.mycountrymobile.com`;

interface JitsiConfig {
  applicationName: string;
  serviceUrl?: string;
  hosts: {
    domain: string;
    muc: string;
    focus: string;
  };
  disableSimulcast: boolean;
  constraints: {
    video: {
      height: {
        ideal: number;
        max: number;
        min: number;
      };
    };
  };
  enableP2P: boolean;
  p2p: {
    enabled: boolean;
    enableUnifiedOnChrome: boolean;
    disableH264: boolean;
    useStunTurn: boolean;
  };
  transcription: {
    enabled: boolean;
    useAppLanguage: boolean;
    preferredLanguage: string;
    autoTranscribeOnRecord: boolean;
    translationLanguages: string[];
    translationLanguagesHead: string[];
  };
  useStunTurn: boolean;
  useTurnUdp: boolean;
  bosh: string;
  websocket: string;
  websocketKeepAliveUrl: string;
  clientNode: string;
  desktopSharingSources: string[];
  desktopSharingChromeSources: string[];
  enableLipSync: boolean;
  enableSaveLogs: boolean;
  disableRtx: boolean;
  enableScreenshotCapture: boolean;
  channelLastN: number;
  videoQuality: {
    maxBitratesVideo: {
      low: number;
      standard: number;
      high: number;
    };
    minHeightForQualityLvl: {
      [key: number]: 'standard' | 'high';
    };
  };
  useNewBandwidthAllocationStrategy: boolean;
  startBitrate: string;
  disableAudioLevels: boolean;
  audioLevelsInterval: number;
  fileRecordingsEnabled: boolean;
  localRecording: {
    disable: boolean;
    notifyAllParticipants: boolean;
  };
  stereo: boolean;
  forceJVB121Ratio: number;
  enableTalkWhileMuted: boolean;
  mouseMoveCallbackInterval: number;
  enableNoAudioDetection: boolean;
  enableNoisyMicDetection: boolean;
  disableLocalVideoFlip: boolean;
  enableUserRolesBasedOnToken: boolean;
  enableLayerSuspension: boolean;
  enableUnifiedOnChrome: boolean;
  enableWelcomePage: boolean;
  enableInsecureRoomNameWarning: boolean;
  hiddenDomain: string;
  e2eping: {
    pingInterval: number;
  };
  abTesting: Record<string, unknown>;
  testing: {
    callStatsThreshold: number;
    capScreenshareBitrate: number;
  };
  enableReactions: boolean;
  disableVirtualBackground: boolean;
  enableBackgroundAlpha: boolean;
  disabledSounds: string[];
  disableModeratorIndicator: boolean;
}

export const config: JitsiConfig = {
  applicationName: 'mycountrymobile',
  hosts: {
    domain: DOMAIN,
    muc: MUC,
    focus: FOCUS,
  },
  disableSimulcast: false,
  constraints: {
    video: {
      height: { ideal: 720, max: 720, min: 240 },
    },
  },
  enableP2P: false,
  p2p: {
    enabled: false,
    enableUnifiedOnChrome: true,
    disableH264: true,
    useStunTurn: true,
  },
  transcription: {
    enabled: false,
    useAppLanguage: false,
    preferredLanguage: 'en-US',
    autoTranscribeOnRecord: false,
    translationLanguages: ['en', 'es', 'fr'],
    translationLanguagesHead: ['en'],
  },
  useStunTurn: true,
  useTurnUdp: false,
  bosh: 'https://' + DOMAIN + '/http-bind',
  websocket: SERVICEURL,
  websocketKeepAliveUrl: WEBSOCKETKEEPALIVEURL,
  clientNode: WEBSOCKETKEEPALIVEURL,
  desktopSharingSources: ['screen', 'window'],
  desktopSharingChromeSources: ['screen', 'window', 'tab'],
  enableLipSync: false,
  enableSaveLogs: false,
  disableRtx: false,
  enableScreenshotCapture: false,
  channelLastN: 25,
  videoQuality: {
    maxBitratesVideo: { low: 200000, standard: 500000, high: 1500000 },
    minHeightForQualityLvl: {
      360: 'standard',
      720: 'high',
    },
  },
  useNewBandwidthAllocationStrategy: true,
  startBitrate: '800',
  disableAudioLevels: false,
  audioLevelsInterval: 400,
  fileRecordingsEnabled: true,
  localRecording: {
    disable: false,
    notifyAllParticipants: true,
  },
  stereo: false,
  forceJVB121Ratio: -1,
  enableTalkWhileMuted: true,
  mouseMoveCallbackInterval: 1000,
  enableNoAudioDetection: true,
  enableNoisyMicDetection: true,
  disableLocalVideoFlip: false,
  enableUserRolesBasedOnToken: false,
  enableLayerSuspension: true,
  enableUnifiedOnChrome: true,
  enableWelcomePage: true,
  enableInsecureRoomNameWarning: false,
  hiddenDomain: '',
  e2eping: { pingInterval: -1 },
  abTesting: {},
  testing: { callStatsThreshold: 1, capScreenshareBitrate: 1 },
  enableReactions: true,
  disableVirtualBackground: false,
  enableBackgroundAlpha: true,
  disabledSounds: [
    'ASKED_TO_UNMUTE_SOUND',
    'E2EE_OFF_SOUND',
    'E2EE_ON_SOUND',
    'INCOMING_MSG_SOUND',
    'KNOCKING_PARTICIPANT_SOUND',
    'LIVE_STREAMING_OFF_SOUND',
    'LIVE_STREAMING_ON_SOUND',
    'NO_AUDIO_SIGNAL_SOUND',
    'NOISY_AUDIO_INPUT_SOUND',
    'OUTGOING_CALL_EXPIRED_SOUND',
    'OUTGOING_CALL_REJECTED_SOUND',
    'OUTGOING_CALL_RINGING_SOUND',
    'OUTGOING_CALL_START_SOUND',
    'PARTICIPANT_JOINED_SOUND',
    'PARTICIPANT_LEFT_SOUND',
    'RAISE_HAND_SOUND',
    'REACTION_SOUND',
    'RECORDING_OFF_SOUND',
    'RECORDING_ON_SOUND',
    'TALK_WHILE_MUTED_SOUND',
  ],
  disableModeratorIndicator: true,
};
