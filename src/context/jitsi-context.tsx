/* eslint-disable no-async-promise-executor */
import useJitsiScript from '@/hooks/use-jitsi-script';
import {
  closeAvCallModal,
  getEnv,
  handleAlert,
  removeEnvPrefix,
  showPushNotification,
} from '@/lib/utils';
import { COUNTRY_CODES } from '@/pages/meetings/video-section/utils';
import { AudioMixerEffect } from '@/services/jitsi/AudioMixerEffect';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { config } from '@/services/jitsi/config';
import {
  detachOwnedMediaElements,
  getNativeTracksFromJitsiTrack,
  stopAndDisposeJitsiTrack,
  stopMediaStream,
} from '@/services/jitsi/media-cleanup';
import { NoiseSuppressionEffect } from '@/services/jitsi/NoiseSuppressionEffect';
import moment from 'moment';
import { createContext, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import { useOrganization } from '@/hooks/use-organisation';
import HandRaiseNotify from '../assets/audio/hand-raise-notify.mp3';
import { chatEvents } from './socket-events';

function canEnableNoiseSuppression(localAudio: any) {
  if (!localAudio) {
    console.log('Noise suppression localAudioTrack not found.');
    return false;
  }

  const { channelCount } = localAudio.track.getSettings();

  if (channelCount > 1) {
    console.log('Noise suppression Stereo audio tracks are not currently supported');
    return false;
  }

  return true;
}

async function enableNoiseSuppression(track: any = null) {
  if (!canEnableNoiseSuppression(track)) return;
  try {
    await track.setEffect(new NoiseSuppressionEffect());
    console.log('Noise suppression enabled.');
  } catch (error) {
    console.error(`Failed to set noise suppression enabled to:`, error);
  }
}

window.enableNoiseSuppression = enableNoiseSuppression;

type SubtitleLanguage = 'en' | 'hi' | 'es';

const P_NAME_REQUESTING_TRANSCRIPTION = 'requestingTranscription';
const P_NAME_TRANSLATION_LANGUAGE = 'translation_language';
const P_NAME_TRANSCRIPTION_LANGUAGE = 'transcription_language';
const JSON_TYPE_TRANSLATION_RESULT = 'translation-result';
const JSON_TYPE_TRANSCRIPTION_RESULT = 'transcription-result';
const TRANSCRIBER_DIAL_NUMBER = 'jitsi_meet_transcribe';
const STABLE_SUBTITLE_FACTOR = 0.85;
const WHITEBOARD_COMMAND = 'WHITEBOARD_ACTION';
const KICK_PREPARE_MESSAGE_TYPE = 'PREPARE_KICK';
const KICK_PREPARE_ACK_MESSAGE_TYPE = 'PREPARE_KICK_ACK';
const KICK_PREPARE_DELAY_MS = 800;

interface InitialStateType {
  roomCode: string;
  isJitsiConnection: boolean;
  isHost: boolean;
  isMember: boolean;
  jitsiConnection: any;
  meetingName: string;
  userName: string;
  userEmail: string;
  hostID: string;
  userID: string;
  isRoomJoined: boolean;
  isHostJoined: boolean;
  devices: any;
  roomInstance: any;
  micDeviceId: string;
  speakerDeviceId: string;
  cameraDeviceId: string;
  AVVideoTrack: any;
  AVAudioTrack: any;
  isAVVideoMuted: boolean;
  isAVAudioMuted: boolean;
  isTranscriberEnabled: boolean;
  errors: any;
  isTestingMic: boolean;
  isLobbyEnabled: boolean;
  isLobbyJoined: boolean;
  waitingScreenEnabled: boolean;
  waitingRoomJoined: boolean;
  roomAccessRequests: any[]; // Replace 'any' with a specific type if known
  participantsIds: Set<string>;
  participantsListing: any[]; // Replace with specific participant type
  localVideoTrack: any;
  localAudioTrack: any;
  isCreatingLocalTracks: boolean;
  remoteTracks: Record<string, any[any]>; // keyed by participant ID
  isLocalVideoMuted: boolean;
  isLocalAudioMuted: boolean;
  isScreenShareEnabled: boolean;
  desktopAudioTrack: any;
  desktopVideoTrack: any;
  chatList: any[]; // Define ChatMessage type if needed
  isHandRaised: boolean;
  remoteHandRaised: string[]; // list of participant IDs
  isActiveSpeaker: boolean;
  dominantSpeaker: string;
  isMeetingEnded: {
    value: boolean;
    reason: string;
  };
  connectionQuality: Record<string, any>; // can be typed better if structure is known
  lobbyRequestNotification: Record<string, any>; // structure can be refined
  currentMaxFrameHeight: number;
  emojiReactions: any[]; // define EmojiReaction if needed
  participantPermissions: Record<string, any>; // e.g., { mic: true, cam: false }
  recordingLoader: boolean;
  isActiveRecording: boolean;
  activeRecorderSessionId: string;
  recordingTime: number;
  isInConference: boolean;
  extraParams: Record<string, any>;
  dominantParticipant: {
    id: string;
    value: number;
  };
  isAudioAllowed: boolean;
  isVideoAllowed: boolean;
  transcriptionData: any;
  whiteBoardState: any;
  isUserTranscriptionOn: boolean;
  transcriptFileUrl: string;
  subtitlesData: any[];
  isUserSubtitlesOn: boolean;
  subtitleLanguage: SubtitleLanguage;
  currentActiveScreenShareId: string;
  audioLevels: Record<string, number>;
  virtualBackgroundOptions: {
    backgroundEffectEnabled: boolean;
    selectedThumbnail: string;
    backgroundType: string | null;
    blurValue: number | null;
    virtualSource: string | null;
  };
  isVideoCall: boolean;
  isCallEnded: boolean;
}
interface JitsiContextType extends InitialStateType {
  isJitsiLoaded: boolean;
  setRoomCode: (code: string) => void;
  createConnection: () => void;
  setWaitingScreen: (val: boolean) => void;
  setLobbyRequestNotification: (data: any) => void;
  joinMeetHandler: (subject: string, options?: { withVideo?: boolean }) => Promise<void>;
  handleTestMic: () => void;
  updateLocalVideoTrack: () => void;
  muteAVVideoTrack: (options?: { forceMuted?: boolean }) => Promise<void>;
  muteAVAudioTrack: () => void;
  destroyAVTracks: () => void;
  initializeSystemAVConfig: () => void;
  handleAVVideoPreview: () => void;
  handleAVAudioPreview: () => void;
  getAVPermissions: () => Promise<any>;
  handleChangeSpeakerDevice: () => void;
  setIsHost: (value: boolean) => void;
  setIsMember: (value: any) => void;
  setLobbyScreen: (value: boolean) => void;
  setUserName: (value: string) => void;
  setUserEmail: (value: string) => void;
  setDisplayName: (value: string) => void;
  muteLocalVideoTrack: () => void;
  muteLocalAudioTrack: () => void;
  enableScreenShare: () => void;
  disableScreenShare: () => void;
  muteParticipantMic: (val: string) => void;
  muteParticipantCam: (val: string) => void;
  sendChatMessage: (val: any) => void;
  approveRoomAccessFromLobby: (val: any) => void;
  declineRoomAccessFromLobby: (val: any) => void;
  setMicDeviceId: (val: any) => void;
  setSpeakerDeviceId: (val: any) => void;
  setCameraDeviceId: (val: any) => void;
  sendEmojiReaction: (val: string) => void;
  sendHandRaisedEvent: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  enableTranscription: () => void;
  disableTranscription: () => void;
  enableSubtitles: (language: SubtitleLanguage) => void;
  disableSubtitles: () => void;
  requestRoomAccessFromLobby: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  endMeetingForSelf: (
    withNavigate?: boolean,
    reason?: string,
    isGoHome?: boolean,
    isKicked?: boolean,
  ) => Promise<void>;
  endMeetingForAll: (reason?: string) => Promise<void>;
  handleWhiteBoard: (payload: any) => void;
  isUserTranscriptionOn: boolean;
  transcriptFileUrl: string;
  subtitlesData: any[];
  isUserSubtitlesOn: boolean;
  subtitleLanguage: SubtitleLanguage;
  currentActiveScreenShareId: string;
  handlePresentatingView: any;
  setVirtualBackgroundOptions: (options: any) => void;
  kickParticipant: (id: string, reason?: string) => void;
  endMeeting: (withNavigate?: boolean, reason?: string) => Promise<void>;
  setState: any;
  cleanupLocalMediaTracks: () => Promise<void>;
}

const initOptions = {
  disableAudioLevels: false,
  disableSimulcast: false,
};

export const JitsiContext = createContext<JitsiContextType>({
  isJitsiLoaded: false,
  isJitsiConnection: false,
  jitsiConnection: null,
  isTranscriberEnabled: false,
  roomCode: '',
  setRoomCode: () => void 0,
  createConnection: () => void 0,
  setWaitingScreen: () => void 0,
  setLobbyRequestNotification: () => void 0,
  joinMeetHandler: async () => void 0,
  handleTestMic: () => void 0,
  updateLocalVideoTrack: () => void 0,
  muteAVVideoTrack: async () => void 0,
  muteAVAudioTrack: () => void 0,
  destroyAVTracks: () => void 0,
  initializeSystemAVConfig: () => void 0,
  handleAVVideoPreview: () => void 0,
  handleAVAudioPreview: () => void 0,
  handleChangeSpeakerDevice: () => void 0,
  setIsHost: () => void 0,
  setIsMember: () => void 0,
  setLobbyScreen: () => void 0,
  setUserName: () => void 0,
  setUserEmail: () => void 0,
  setDisplayName: () => void 0,
  muteLocalVideoTrack: () => void 0,
  muteLocalAudioTrack: () => void 0,
  enableScreenShare: () => void 0,
  disableScreenShare: () => void 0,
  muteParticipantMic: () => void 0,
  muteParticipantCam: () => void 0,
  sendChatMessage: () => void 0,
  sendHandRaisedEvent: () => void 0,
  sendEmojiReaction: () => void 0,
  startRecording: () => void 0,
  stopRecording: () => void 0,
  endMeetingForSelf: async () => void 0,
  endMeetingForAll: async () => void 0,
  enableTranscription: () => void 0,
  disableTranscription: () => void 0,
  enableSubtitles: () => void 0,
  disableSubtitles: () => void 0,
  requestRoomAccessFromLobby: () => void 0,
  requestNotificationPermission: () => Promise.resolve(false),
  approveRoomAccessFromLobby: () => void 0,
  setMicDeviceId: () => void 0,
  setCameraDeviceId: () => void 0,
  setSpeakerDeviceId: () => void 0,
  declineRoomAccessFromLobby: () => void 0,
  getAVPermissions: () => Promise.resolve(null),
  meetingName: '',
  isHost: false,
  isMember: false,
  userName: '',
  userEmail: '',
  hostID: '',
  userID: '',
  isRoomJoined: false,
  isHostJoined: false,
  devices: null,
  roomInstance: null,
  micDeviceId: '',
  speakerDeviceId: '',
  cameraDeviceId: '',
  AVVideoTrack: null,
  AVAudioTrack: null,
  isAVVideoMuted: false,
  isAVAudioMuted: false,
  errors: { avVideo: '' },
  isTestingMic: false,
  isLobbyEnabled: false,
  isLobbyJoined: false,
  waitingScreenEnabled: false,
  waitingRoomJoined: false,
  roomAccessRequests: [],
  participantsIds: new Set(),
  participantsListing: [],
  localVideoTrack: null,
  localAudioTrack: null,
  isCreatingLocalTracks: false,
  remoteTracks: {},
  isLocalVideoMuted: false,
  isLocalAudioMuted: false,
  isScreenShareEnabled: false,
  desktopAudioTrack: null,
  desktopVideoTrack: null,
  chatList: [],
  isHandRaised: false,
  remoteHandRaised: [],
  isActiveSpeaker: false,
  dominantSpeaker: '',
  isMeetingEnded: { value: false, reason: '' },
  connectionQuality: {},
  lobbyRequestNotification: {},
  currentMaxFrameHeight: 2160,
  emojiReactions: [],
  participantPermissions: {},
  recordingLoader: false,
  isActiveRecording: false,
  activeRecorderSessionId: localStorage.getItem('activeRecorderSessionId') || '',
  recordingTime: 0,
  isInConference: false,
  extraParams: {},
  dominantParticipant: { id: '', value: 0 },
  isAudioAllowed: true,
  isVideoAllowed: true,
  transcriptionData: [],
  whiteBoardState: {},
  handleWhiteBoard: () => void 0,
  isUserTranscriptionOn: false,
  transcriptFileUrl: '',
  subtitlesData: [],
  isUserSubtitlesOn: false,
  subtitleLanguage: 'en',
  currentActiveScreenShareId: '',
  audioLevels: {},
  handlePresentatingView: () => void 0,
  setVirtualBackgroundOptions: () => void 0,
  kickParticipant: () => void 0,
  endMeeting: async () => void 0,
  setState: () => void 0,
  cleanupLocalMediaTracks: async () => void 0,
  virtualBackgroundOptions: {
    backgroundEffectEnabled: false,
    selectedThumbnail: 'none',
    backgroundType: null,
    blurValue: null,
    virtualSource: null,
  },
  isVideoCall: false,
  isCallEnded: false,
});

const handleHandRaised = (state: any, user: any, val: string) => {
  const handRaisedIds = [...(state.remoteHandRaised || [])];
  if (val === 'true') {
    if (!handRaisedIds.includes(user?._id)) {
      handRaisedIds.push(user?._id);

      const audio = new Audio(HandRaiseNotify);
      audio.play().catch((err) => console.warn('Audio play error:', err));
    }
  } else {
    if (handRaisedIds.includes(user?._id)) {
      for (let i = 0; i < handRaisedIds.length; i++) {
        if (handRaisedIds[i] === user?._id) {
          handRaisedIds.splice(i, 1);
        }
      }
    }
  }
  return [...handRaisedIds];
};

const chatRecievedListener = (state: any, messageObj: any) => {
  return [...state.chatList, messageObj];
};

const emojiReactionReceivedListener = (state: any, messageObj: any) => {
  return [...state.emojiReactions, messageObj];
};

const parseJsonSafely = (value: any) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseWhiteboardCommandPayload = (payload: any, fromId = '') => {
  if (!payload) return null;

  const actionValue = payload?.value ?? payload?.attributes?.action ?? payload?.action ?? payload;

  const parsedAction = typeof actionValue === 'string' ? parseJsonSafely(actionValue) : actionValue;

  if (!parsedAction || typeof parsedAction !== 'object') return null;

  return {
    ...parsedAction,
    startedBy:
      normalizeParticipantId(parsedAction?.startedBy || fromId) || parsedAction?.startedBy || '',
  };
};

const isTrackMuted = (track: any): boolean => {
  if (!track) return true;
  try {
    if (typeof track?.isMuted === 'function') {
      return Boolean(track.isMuted());
    }
  } catch {
    // Fall back to muted property when track.isMuted() is unavailable or throws.
  }
  return Boolean(track?.muted);
};

type ConnectionQualitySource = 'local' | 'remote' | 'endpoint';

const normalizeParticipantId = (value: any): string => {
  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim();
    // Handle full JID-like ids and keep the resource/participant-id segment.
    const parts = raw.split('/');
    return parts[parts.length - 1] || raw;
  }
  if (value && typeof value?.getId === 'function') {
    const id = value.getId();
    if (typeof id === 'string' && id.trim()) {
      const raw = id.trim();
      const parts = raw.split('/');
      return parts[parts.length - 1] || raw;
    }
  }
  if (typeof value?.id === 'string' && value.id.trim()) {
    const raw = value.id.trim();
    const parts = raw.split('/');
    return parts[parts.length - 1] || raw;
  }
  if (typeof value?.participantId === 'string' && value.participantId.trim()) {
    const raw = value.participantId.trim();
    const parts = raw.split('/');
    return parts[parts.length - 1] || raw;
  }
  return '';
};

const getParticipantIdAliases = (value: any): string[] => {
  const aliases = new Set<string>();
  if (typeof value === 'string' && value.trim()) {
    aliases.add(value.trim());
  }
  if (value && typeof value?.getId === 'function') {
    const id = value.getId();
    if (typeof id === 'string' && id.trim()) aliases.add(id.trim());
  }
  if (typeof value?.id === 'string' && value.id.trim()) aliases.add(value.id.trim());
  if (typeof value?.participantId === 'string' && value.participantId.trim()) {
    aliases.add(value.participantId.trim());
  }
  const normalizedId = normalizeParticipantId(value);
  if (normalizedId) aliases.add(normalizedId);
  return Array.from(aliases);
};

const clampConnectionQuality = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const getPacketLossScore = (packetLoss: any): number | null => {
  if (packetLoss === null || packetLoss === undefined) return null;
  if (typeof packetLoss === 'number' && Number.isFinite(packetLoss)) return packetLoss;

  if (typeof packetLoss === 'object') {
    const candidates = [
      packetLoss.upload,
      packetLoss.download,
      packetLoss.total,
      packetLoss.loss,
      packetLoss.value,
    ]
      .map((item) =>
        typeof item === 'string' ? Number(item.replace(/[^\d.-]/g, '')) : Number(item),
      )
      .filter((item) => Number.isFinite(item));
    if (!candidates.length) return null;
    return Math.max(...candidates);
  }

  return null;
};

const getDerivedConnectionQuality = (stats: any): number | null => {
  const directCandidates = [
    stats?.connectionQuality,
    stats?.connection_quality,
    stats?.quality,
    stats?.score,
    stats?.connectionQuality?.value,
    stats?.connection_quality?.value,
  ];

  for (const candidate of directCandidates) {
    const normalized = clampConnectionQuality(candidate);
    if (normalized !== null) return normalized;
  }

  const packetLossScore = getPacketLossScore(stats?.packetLoss ?? stats?.packet_loss);
  if (packetLossScore === null) return null;
  if (packetLossScore <= 2) return 100;
  if (packetLossScore <= 4) return 70;
  if (packetLossScore <= 6) return 50;
  if (packetLossScore <= 8) return 30;
  if (packetLossScore <= 12) return 10;
  return 0;
};

const getConnectionQualityLevel = (quality: number | null): string => {
  if (quality === null) return 'unknown';
  if (quality >= 80) return 'excellent';
  if (quality >= 60) return 'good';
  if (quality >= 40) return 'fair';
  if (quality >= 20) return 'poor';
  return 'bad';
};

const normalizeConnectionQualityStats = (stats: any, source: ConnectionQualitySource) => {
  if (!stats || typeof stats !== 'object') return null;
  const hasKnownField =
    Object.prototype.hasOwnProperty.call(stats, 'connectionQuality') ||
    Object.prototype.hasOwnProperty.call(stats, 'connection_quality') ||
    Object.prototype.hasOwnProperty.call(stats, 'quality') ||
    Object.prototype.hasOwnProperty.call(stats, 'score') ||
    Object.prototype.hasOwnProperty.call(stats, 'bitrate') ||
    Object.prototype.hasOwnProperty.call(stats, 'packetLoss') ||
    Object.prototype.hasOwnProperty.call(stats, 'packet_loss') ||
    Object.prototype.hasOwnProperty.call(stats, 'jvbRTT') ||
    Object.prototype.hasOwnProperty.call(stats, 'maxEnabledResolution') ||
    Object.prototype.hasOwnProperty.call(stats, 'serverRegion');

  if (!hasKnownField) return null;

  const normalizedConnectionQuality = getDerivedConnectionQuality(stats);

  return {
    ...stats,
    connectionQuality:
      normalizedConnectionQuality === null ? stats?.connectionQuality : normalizedConnectionQuality,
    qualityLevel: getConnectionQualityLevel(normalizedConnectionQuality),
    updatedAt: Date.now(),
    source,
  };
};

export const JitsiContextProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded: isJitsiLoaded } = useJitsiScript();
  const counter = useRef<number>(0);
  const { user } = useUser();
  const { mainSiteInfo } = useOrganization();
  const navigate = useNavigate();
  const [{ roomCode = '', ...state }, setState] = useState<InitialStateType>({
    roomCode: '',
    isJitsiConnection: false,
    jitsiConnection: null,
    meetingName: '',
    isHost: false,
    isMember: false,
    userName: '',
    userEmail: '',
    hostID: '',
    userID: '',
    isRoomJoined: false,
    isTranscriberEnabled: false,
    isHostJoined: false,
    devices: null,
    roomInstance: null,
    micDeviceId: '',
    speakerDeviceId: '',
    cameraDeviceId: '',
    AVVideoTrack: null,
    AVAudioTrack: null,
    isAVVideoMuted: false,
    isAVAudioMuted: false,
    errors: { avVideo: '' },
    isTestingMic: false,
    isLobbyEnabled: false,
    isLobbyJoined: false,
    waitingScreenEnabled: false,
    waitingRoomJoined: false,
    roomAccessRequests: [],
    participantsIds: new Set(),
    participantsListing: [],
    localVideoTrack: null,
    localAudioTrack: null,
    isCreatingLocalTracks: false,
    remoteTracks: {},
    isLocalVideoMuted: false,
    isLocalAudioMuted: false,
    isScreenShareEnabled: false,
    desktopAudioTrack: null,
    desktopVideoTrack: null,
    chatList: [],
    isHandRaised: false,
    remoteHandRaised: [],
    isActiveSpeaker: false,
    dominantSpeaker: '',
    isMeetingEnded: { value: false, reason: '' },
    connectionQuality: {},
    lobbyRequestNotification: {},
    currentMaxFrameHeight: 2160,
    emojiReactions: [],
    participantPermissions: {},
    recordingLoader: false,
    isActiveRecording: false,
    activeRecorderSessionId: localStorage.getItem('activeRecorderSessionId') || '',
    recordingTime: 0,
    isInConference: false,
    extraParams: {},
    dominantParticipant: { id: '', value: 0 },
    isAudioAllowed: true,
    isVideoAllowed: true,
    transcriptionData: [],
    whiteBoardState: {},
    isUserTranscriptionOn: false,
    transcriptFileUrl: '',
    subtitlesData: [],
    isUserSubtitlesOn: false,
    subtitleLanguage: 'en',
    currentActiveScreenShareId: '',
    audioLevels: {},
    virtualBackgroundOptions: {
      backgroundEffectEnabled: false,
      selectedThumbnail: 'none',
      backgroundType: null,
      blurValue: null,
      virtualSource: null,
    },
    isVideoCall: false,
    isCallEnded: false,
  });
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});
  const {
    socketEventsManager,
    handleMeetAccept,
    updateMeetingSubtitleLanguage,
    updateMeetingSubtitleEnabled,
    setMeetInitiateModalData,
    meetInitiateModalData,
  } = useSocketEvents();
  const { user: userInfo } = useUser();
  const getMeetingExitRoute = useCallback(() => '/', [userInfo?.isGuest, userInfo?.uuid]);
  const meetingActorUuid = userInfo?.uuid || userInfo?.guest_info?.uuid;
  const transcriptionEmittedRef = useRef(false);
  const subtitleLanguageRef = useRef<SubtitleLanguage>('en');
  const preJoinVideoMutedRef = useRef(false);
  const preJoinAudioMutedRef = useRef(false);
  const initialVideoTrackEnabledRef = useRef(true);
  const joinToastReadyRef = useRef(false);
  const knownParticipantIdsRef = useRef<Set<string>>(new Set());
  const isActiveRecordingRef = useRef(state.isActiveRecording);
  const activeRecorderSessionIdRef = useRef(
    state.activeRecorderSessionId || localStorage.getItem('activeRecorderSessionId') || '',
  );
  const latestStateRef = useRef<InitialStateType | null>(null);
  const mediaGenerationRef = useRef(0);
  const avVideoPreviewGenerationRef = useRef(0);
  const avAudioPreviewGenerationRef = useRef(0);
  const isProviderMountedRef = useRef(true);
  const hadMeetingIdentityRef = useRef(false);

  latestStateRef.current = { roomCode, ...state };

  const discardCreatedTracksIfStale = async (
    generation: number,
    tracks: any[] = [],
    additionallyStale = false,
  ) => {
    if (!additionallyStale && generation === mediaGenerationRef.current) return false;
    await Promise.allSettled(tracks.map((track) => stopAndDisposeJitsiTrack(track)));
    return true;
  };

  useEffect(() => {
    isActiveRecordingRef.current = state.isActiveRecording;
  }, [state.isActiveRecording]);

  useEffect(() => {
    activeRecorderSessionIdRef.current =
      state.activeRecorderSessionId || localStorage.getItem('activeRecorderSessionId') || '';
  }, [state.activeRecorderSessionId]);

  const updateParticipantConnectionQuality = useCallback(
    (participantRef: any, stats: any, source: ConnectionQualitySource) => {
      const idAliases = getParticipantIdAliases(participantRef);
      if (!idAliases.length) return;
      const primaryParticipantId = normalizeParticipantId(participantRef) || idAliases[0];
      const normalizedStats = normalizeConnectionQualityStats(stats, source);
      if (!normalizedStats) return;

      setState((prev) => {
        const nextConnectionQuality = {
          ...(prev?.connectionQuality || {}),
        };

        idAliases.forEach((aliasId) => {
          if (!aliasId) return;
          nextConnectionQuality[aliasId] = {
            ...(nextConnectionQuality?.[aliasId] || {}),
            ...normalizedStats,
            participantId: primaryParticipantId,
          };
        });

        return {
          ...prev,
          connectionQuality: nextConnectionQuality,
        };
      });
    },
    [],
  );

  // Reset transcription emitted flag when room code changes (new meeting)
  useEffect(() => {
    transcriptionEmittedRef.current = false;
  }, [roomCode]);

  useEffect(() => {
    subtitleLanguageRef.current = state.subtitleLanguage || 'en';
  }, [state.subtitleLanguage]);

  useEffect(() => {
    preJoinVideoMutedRef.current = Boolean(state.isAVVideoMuted);
  }, [state.isAVVideoMuted]);

  useEffect(() => {
    preJoinAudioMutedRef.current = Boolean(state.isAVAudioMuted);
  }, [state.isAVAudioMuted]);

  const createConnection = useCallback(() => {
    if (!roomCode) {
      console.error('Please set room code first.');
      return;
    }
    let serviceUrl = config.websocket || config.bosh;
    serviceUrl += `?room=${getEnv()?.VITE_APP_SLUG}_${roomCode}`;
    config.serviceUrl = serviceUrl;
    if (config.websocketKeepAliveUrl) {
      config.websocketKeepAliveUrl += `?room=${getEnv()?.VITE_APP_SLUG}_${roomCode}`;
    }

    window.JitsiMeetJS.init(initOptions);
    window.JitsiMeetJS.setLogLevel(window.JitsiMeetJS.logLevels.ERROR);
    const connectionGeneration = mediaGenerationRef.current;
    const connectionRoomCode = roomCode;
    const connection = new window.JitsiMeetJS.JitsiConnection(null, null, config);
    connection.addEventListener(
      window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      handleConnectionEstablished,
    );
    connection.addEventListener(
      window.JitsiMeetJS.events.connection.CONNECTION_FAILED,
      handleConnectionFailed,
    );
    connection.connect();

    function removeConnectionListeners() {
      connection.removeEventListener(
        window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        handleConnectionEstablished,
      );
      connection.removeEventListener(
        window.JitsiMeetJS.events.connection.CONNECTION_FAILED,
        handleConnectionFailed,
      );
    }

    function handleConnectionEstablished() {
      const isStaleConnection =
        connectionGeneration !== mediaGenerationRef.current ||
        latestStateRef.current?.roomCode !== connectionRoomCode ||
        !isProviderMountedRef.current;
      if (isStaleConnection) {
        removeConnectionListeners();
        void connection.disconnect?.();
        return;
      }

      setState((prev) => ({
        ...prev,
        isJitsiConnection: true,
        jitsiConnection: connection,
      }));
      removeConnectionListeners();
    }

    function handleConnectionFailed(err: any) {
      removeConnectionListeners();
      console.log('JITSI CONNECTION FAILED:', { err });
    }
  }, [roomCode]);

  const setRoomCode = useCallback((code: string) => {
    setState((prev: InitialStateType) => ({
      ...prev,
      roomCode: code,
      isMeetingEnded: code ? { value: false, reason: '' } : prev.isMeetingEnded,
    }));
  }, []);
  const setIsHost = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, isHost: value }));
  }, []);
  const setIsMember = useCallback((value: any) => {
    setState((prev) => ({ ...prev, isMember: value }));
  }, []);
  const setLobbyScreen = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, isLobbyEnabled: value }));
  }, []);
  const requestRoomAccessFromLobby = useCallback(() => {
    const { hostID } = state;
    try {
      state.roomInstance.sendMessage({ msg: 'REQUESTED', type: 'LOBBY_APPROVED' }, hostID, false);
      counter.current = counter.current + 1;
    } catch (e) {
      console.error('requestRoomAccessFromLobby', e);
    }
  }, [state.hostID, state.roomInstance]);

  // Function to request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }
    return false;
  }, []);

  const approveRoomAccessFromLobby = useCallback(
    (data: any) => {
      state.roomInstance.sendMessage({ msg: 'APPROVED', type: 'LOBBY_APPROVED' }, data?._id, false);
      setState((prev: any) => ({
        ...prev,
        roomAccessRequests: handleRemoveUserRequest(data, prev.roomAccessRequests),
      }));
    },
    [state.roomInstance],
  );

  const declineRoomAccessFromLobby = useCallback(
    (data: any) => {
      state.roomInstance.sendMessage({ msg: 'REJECTED', type: 'LOBBY_APPROVED' }, data?._id, false);
      setState((prev: any) => {
        return {
          ...prev,
          roomAccessRequests: prev.roomAccessRequests?.filter(
            (item: any) => item?._id !== data?._id,
          ),
        };
      });
      setLobbyRequestNotification({});
    },
    [state.roomInstance],
  );

  const setIsCreatingLocalTracks = (value: boolean) => {
    setState((prev) => ({ ...prev, isCreatingLocalTracks: value }));
  };

  const setLocalVideoTrack = useCallback((track: any) => {
    setState((prev) => ({ ...prev, localVideoTrack: track }));
  }, []);
  const setLocalAudioTrack = useCallback((track: any) => {
    setState((prev) => ({ ...prev, localAudioTrack: track }));
  }, []);

  const setWaitingScreen = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, waitingScreenEnabled: value }));
  }, []);
  const setLobbyRequestNotification = useCallback((data: any) => {
    setState((prev) => ({ ...prev, lobbyRequestNotification: data }));
  }, []);

  async function getAVPermissions() {
    try {
      if (!window?.JitsiMeetJS?.mediaDevices?.isDevicePermissionGranted) {
        return false;
      }
      // Check both audio and video permissions
      const audioGranted = await window.JitsiMeetJS.mediaDevices
        .isDevicePermissionGranted('audio')
        .catch(() => false);
      const videoGranted = await window.JitsiMeetJS.mediaDevices
        .isDevicePermissionGranted('video')
        .catch(() => false);
      return audioGranted || videoGranted;
    } catch (err) {
      console.warn('Error checking AV permissions:', err);
      return false;
    }
  }

  async function muteLocalVideoTrack() {
    if (state.localVideoTrack) {
      if (state.localVideoTrack.isMuted() && state.isVideoAllowed) {
        state.localVideoTrack.unmute().then(() => {
          setState((prev) => ({ ...prev, isLocalVideoMuted: false }));
        });
      } else {
        state.localVideoTrack.mute().then(() => {
          setState((prev) => ({ ...prev, isLocalVideoMuted: true }));
        });
      }
    } else {
      if (state.isLocalVideoMuted) {
        try {
          const mediaGeneration = mediaGenerationRef.current;
          const localVideoTrack = await window.JitsiMeetJS.createLocalTracks({
            devices: ['video'],
          });
          if (await discardCreatedTracksIfStale(mediaGeneration, localVideoTrack)) return;
          const filteredTrack =
            localVideoTrack &&
            localVideoTrack.filter((track: any) => track.getType() === 'video')[0];

          setLocalVideoTrack(filteredTrack);
          setState((prev) => ({
            ...prev,
            isLocalVideoMuted: false,
            errors: { ...state.errors, localVideo: '' },
          }));
        } catch (err: any) {
          setState((prev) => ({
            ...prev,
            isLocalVideoMuted: true,
            errors: { ...state.errors, localVideo: err?.message },
          }));
          console.log(err);
        }
      }
    }
  }
  async function muteLocalAudioTrack() {
    if (state.localAudioTrack) {
      if (state.localAudioTrack.isMuted() && state.isAudioAllowed) {
        state.localAudioTrack.unmute().then(() => {
          setState((prev) => ({ ...prev, isLocalAudioMuted: false }));
        });
      } else {
        state.localAudioTrack.mute().then(() => {
          setState((prev) => ({ ...prev, isLocalAudioMuted: true }));
        });
      }
    } else {
      if (state.isLocalAudioMuted) {
        try {
          const mediaGeneration = mediaGenerationRef.current;
          const localAudioTrack = await window.JitsiMeetJS.createLocalTracks({
            devices: ['audio'],
          });
          if (await discardCreatedTracksIfStale(mediaGeneration, localAudioTrack)) return;
          const filteredTrack =
            localAudioTrack &&
            localAudioTrack.filter((track: any) => track.getType() === 'audio')[0];

          setLocalAudioTrack(filteredTrack);
          setState((prev) => ({
            ...prev,
            isLocalAudioMuted: false,
          }));
        } catch (err) {
          setState((prev) => ({
            ...prev,
            isLocalAudioMuted: true,
          }));
          console.log(err);
        }
      }
    }
  }

  async function muteAVVideoTrack(options?: { forceMuted?: boolean }) {
    const forceMuted = options?.forceMuted;
    const hasForcedValue = typeof forceMuted === 'boolean';
    const isCurrentlyMuted = Boolean(state.AVVideoTrack?.isMuted?.() || state.isAVVideoMuted);
    const shouldMute = hasForcedValue ? forceMuted : !isCurrentlyMuted;

    preJoinVideoMutedRef.current = shouldMute;
    setState((prev) => ({ ...prev, isAVVideoMuted: shouldMute }));

    if (!state.AVVideoTrack) return;

    try {
      if (shouldMute) {
        if (!state.AVVideoTrack.isMuted()) {
          await state.AVVideoTrack.mute();
        }
      } else if (state.AVVideoTrack.isMuted()) {
        await state.AVVideoTrack.unmute();
      }
    } catch (err) {
      console.log(err);
    }
  }
  async function muteAVAudioTrack() {
    if (state.AVAudioTrack) {
      if (state.AVAudioTrack.isMuted()) {
        state.AVAudioTrack.unmute().then(() => {
          preJoinAudioMutedRef.current = false;
          setState((prev) => ({ ...prev, isAVAudioMuted: false }));
        });
      } else {
        state.AVAudioTrack.mute().then(() => {
          preJoinAudioMutedRef.current = true;
          setState((prev) => ({ ...prev, isAVAudioMuted: true }));
        });
      }
    }
  }

  const addAudioTrackToRoom = useCallback(() => {
    if (state.roomInstance) {
      let isAudioTrack = false;
      state.roomInstance.getLocalTracks().forEach((track: any) => {
        if (track?.type === 'audio') {
          isAudioTrack = true;
        }
      });
      if (!isAudioTrack) {
        state.roomInstance.addTrack(state.localAudioTrack);
      }
    }
  }, [state.roomInstance, state.localAudioTrack]);

  const addVideoTrackToRoom = useCallback(() => {
    if (state.roomInstance) {
      let isVideoTrack = false;
      state.roomInstance.getLocalTracks().forEach((track: any) => {
        if (track?.type === 'video') {
          isVideoTrack = true;
        }
      });
      if (!isVideoTrack && state.localVideoTrack) {
        state.roomInstance.addTrack(state.localVideoTrack);
      }
    }
  }, [state.roomInstance, state.localVideoTrack]);

  const updateMaxFrameHeight = (participants: number) => {
    if (!state.jitsiConnection) {
      return;
    }
    let newMaxFrameHeight;

    if (participants === 1) {
      newMaxFrameHeight = 2160;
    } else {
      if (participants <= 2) {
        newMaxFrameHeight = 720;
      } else if (participants <= 4) {
        newMaxFrameHeight = 360;
      } else {
        newMaxFrameHeight = 180;
      }
    }

    if (state.roomInstance && state.currentMaxFrameHeight !== newMaxFrameHeight) {
      setState((prev) => ({
        ...prev,
        currentMaxFrameHeight: newMaxFrameHeight,
      }));

      if (state.roomInstance.getLocalTracks().some((t: any) => t.getType() === 'video')) {
        state.roomInstance.setSenderVideoConstraint(newMaxFrameHeight);
      }
      state.roomInstance.setReceiverVideoConstraint(newMaxFrameHeight);
    }
  };

  const createLocalTracks = async (caller = '') => {
    return new Promise(async (resolve) => {
      const mediaGeneration = mediaGenerationRef.current;
      setIsCreatingLocalTracks(true);
      if (!state.localAudioTrack) {
        try {
          const localAudioTrack = await window.JitsiMeetJS.createLocalTracks({
            devices: ['audio'],
            micDeviceId: state.micDeviceId || undefined,
          });
          if (await discardCreatedTracksIfStale(mediaGeneration, localAudioTrack)) {
            resolve({ success: false });
            return;
          }
          const filteredTrack =
            localAudioTrack &&
            localAudioTrack.filter((track: any) => track.getType() === 'audio')[0];

          const shouldStartAudioMuted =
            preJoinAudioMutedRef.current || Boolean(state.isAVAudioMuted);
          if (shouldStartAudioMuted) {
            await filteredTrack.mute();
            if (await discardCreatedTracksIfStale(mediaGeneration, localAudioTrack)) {
              resolve({ success: false });
              return;
            }
            setState((prev) => ({ ...prev, isLocalAudioMuted: true }));
          } else {
            setState((prev) => ({ ...prev, isLocalAudioMuted: false }));
          }
          await enableNoiseSuppression(filteredTrack);
          if (await discardCreatedTracksIfStale(mediaGeneration, localAudioTrack)) {
            resolve({ success: false });
            return;
          }
          setLocalAudioTrack(filteredTrack);

          setState((prev) => ({
            ...prev,
            errors: { ...state.errors, localAudio: '' },
          }));
        } catch (e: any) {
          setState((prev) => ({
            ...prev,
            isLocalAudioMuted: true,
            errors: { ...state.errors, localAudio: e?.message },
          }));
          console.log(e);
        }
      }
      if (!state.localVideoTrack && !caller && initialVideoTrackEnabledRef.current) {
        try {
          if (mediaGeneration !== mediaGenerationRef.current) {
            resolve({ success: false });
            return;
          }
          const localVideoTrack = await window.JitsiMeetJS.createLocalTracks({
            devices: ['video'],
            cameraDeviceId: state.cameraDeviceId || undefined,
          });
          if (await discardCreatedTracksIfStale(mediaGeneration, localVideoTrack)) {
            resolve({ success: false });
            return;
          }
          const filteredTrack =
            localVideoTrack &&
            localVideoTrack.filter((track: any) => track.getType() === 'video')[0];
          const shouldStartVideoMuted =
            preJoinVideoMutedRef.current ||
            Boolean(state.AVVideoTrack?.isMuted?.()) ||
            Boolean(state.isAVVideoMuted) ||
            Boolean(state.isLocalVideoMuted);
          if (shouldStartVideoMuted) {
            await filteredTrack.mute();
            if (await discardCreatedTracksIfStale(mediaGeneration, localVideoTrack)) {
              resolve({ success: false });
              return;
            }
            setState((prev) => ({ ...prev, isLocalVideoMuted: true }));
          } else {
            setState((prev) => ({ ...prev, isLocalVideoMuted: false }));
          }
          setLocalVideoTrack(filteredTrack);
          setState((prev) => ({
            ...prev,
            errors: { ...state.errors, localVideo: '' },
          }));
        } catch (err: any) {
          setState((prev) => ({
            ...prev,
            isLocalVideoMuted: true,
            errors: { ...state.errors, localVideo: err?.message },
          }));
          console.log(err);
        }
      }
      setIsCreatingLocalTracks(false);
      resolve({ success: true });
    });
  };

  useEffect(() => {
    if (state.isHostJoined && state.waitingScreenEnabled && !state.isLobbyEnabled) {
      setState((prev) => ({
        ...prev,
        waitingRoomJoined: false,
        isRoomJoined: true,
      }));
    }
    if (state.isHostJoined && !state.waitingScreenEnabled && state.isLobbyEnabled) {
      if (state.isHost) {
        setState((prev) => ({
          ...prev,
          isRoomJoined: true,
          isLobbyJoined: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isRoomJoined: false,
          isLobbyJoined: true,
        }));
      }
    }
    if (state.isHostJoined && state.waitingScreenEnabled && state.isLobbyEnabled) {
      setState((prev) => ({
        ...prev,
        waitingRoomJoined: false,
        isRoomJoined: prev.isHost ? true : false,
        isLobbyJoined: prev.isHost ? false : true,
      }));
    }
  }, [state.isHostJoined]);

  useEffect(() => {
    if (state.isHostJoined && state.isLobbyJoined && state.roomInstance) {
      console.log('isLobbyJoined', state.isLobbyJoined);
      requestRoomAccessFromLobby();
    }
  }, [state.isLobbyJoined, state.isHostJoined]);

  // Request notification permission when host joins the meeting
  useEffect(() => {
    if (state.isHost && state.isHostJoined) {
      requestNotificationPermission();
    }
  }, [state.isHost, state.isHostJoined, requestNotificationPermission]);

  useEffect(() => {
    // if (state.isLobbyEnabled && !state.isHost && state.isLobbyJoined) {
    //   createLocalTracks();
    // }  To create tracks in lobby

    if (state.isLobbyEnabled && state.isRoomJoined) {
      createLocalTracks();
      if (state.roomInstance?.isJoined?.()) {
        state.roomInstance.setLocalParticipantProperty('ISJOINED', `${true}`);
      }
    }
    if (!state.isLobbyEnabled && state.isRoomJoined) {
      //   if (state.webRTCType === 'Audio') {
      //     createLocalTracks('call');
      //   } else {
      createLocalTracks();
      //   }
      if (state.roomInstance?.isJoined?.()) {
        state.roomInstance.setLocalParticipantProperty('ISJOINED', `${true}`);
      }
    }
  }, [state.isRoomJoined, state.isLobbyJoined, state.isLobbyEnabled]);

  useEffect(() => {
    if (state.isRoomJoined && state.localVideoTrack && !state.isCreatingLocalTracks) {
      addVideoTrackToRoom();
    }
  }, [state.isCreatingLocalTracks, state.localVideoTrack, state.isRoomJoined]);
  useEffect(() => {
    if (state.isRoomJoined && state.localAudioTrack && !state.isCreatingLocalTracks) {
      addAudioTrackToRoom();
    }
  }, [state.isCreatingLocalTracks, state.localAudioTrack, state.isRoomJoined]);

  useEffect(() => {
    if (!state.roomInstance) return;

    const handleTrackAdded = (track: any) => {
      if (track.isLocal() && track.getType() === 'video') {
        const participantCount = (state?.participantsIds?.size ?? 0) + 1;
        updateMaxFrameHeight(participantCount);
      }
    };

    state.roomInstance.on(window.JitsiMeetJS.events.conference.TRACK_ADDED, handleTrackAdded);

    return () => {
      state.roomInstance.off(window.JitsiMeetJS.events.conference.TRACK_ADDED, handleTrackAdded);
    };
  }, [state.roomInstance, state?.participantsIds?.size]);

  const onTrackAdded = (track: any) => {
    console.log('Track Added ===>', track);
    if (track.isLocal()) {
      return;
    } else {
      const pId = track.getParticipantId();
      const trackType = track.getType();
      const videoType = track.videoType; // 'desktop' or 'camera' for video tracks

      setState((prev) => {
        const remoteTracks = { ...prev.remoteTracks };
        remoteTracks[pId] = {
          ...remoteTracks[pId],
          [videoType || trackType]: track,
        };

        const nextState: any = {
          ...prev,
          remoteTracks,
        };

        if (videoType === 'desktop' && !isTrackMuted(track)) {
          nextState.currentActiveScreenShareId = pId;
        }

        return nextState;
      });
    }
  };
  const onTrackRemoved = (track: any) => {
    console.log('Track removed ===>', track);
    if (track.isLocal()) {
      return;
    } else {
      const pId = track.getParticipantId();
      const trackType = track.getType();
      const videoType = track.videoType;

      setState((prev) => {
        if (!prev.remoteTracks[pId]) {
          return prev;
        }

        const remoteTracks = { ...prev.remoteTracks };
        const participantTracks = { ...remoteTracks[pId] };
        delete participantTracks[videoType || trackType];

        if (Object.keys(participantTracks).length === 0) {
          delete remoteTracks[pId];
        } else {
          remoteTracks[pId] = participantTracks;
        }

        const nextState: any = {
          ...prev,
          remoteTracks,
        };

        if (videoType === 'desktop' && prev.currentActiveScreenShareId === pId) {
          nextState.currentActiveScreenShareId = '';
        }

        return nextState;
      });
    }
  };

  function updateRecordingSessionData(recorderSession: any = {}) {
    const { _statusFromJicofo: status } = recorderSession;
    const recorderid = recorderSession.getID();
    const hostName = localStorage.getItem('host_name');

    if (status === 'on') {
      setState((prev: any) => ({
        ...prev,
        recordingLoader: false,
        isActiveRecording: true,
        activeRecorderSessionId: recorderid,
      }));
      localStorage.setItem('activeRecorderSessionId', recorderid);
      handleAlert({
        text: `${hostName ?? ''} started the Recording`,
        type: 'success',
      });
    }
    if (status === 'off') {
      setState((prev) => ({
        ...prev,
        recordingLoader: false,
        isActiveRecording: false,
        activeRecorderSessionId: '',
        meetingStartTime: '',
        recordingTime: 0,
      }));
      handleAlert({
        text: `${hostName ?? ''} stop the Recording`,
        type: 'success',
      });
      localStorage.removeItem('activeRecorderSessionId');
    }
  }

  const handleRemoveUserRequest = useCallback((user: any, roomAccessRequests: any[]) => {
    if (roomAccessRequests && user && roomAccessRequests.length > 0) {
      const isUserExist = roomAccessRequests.filter((u) => u?._id !== user?._id);
      if (isUserExist && isUserExist.length > 0) {
        return isUserExist;
      } else {
        return [];
      }
    }
  }, []);

  const handleRoomReqUsers = useCallback((user: any, roomAccessRequests: any[]) => {
    if (roomAccessRequests && roomAccessRequests.length > 0) {
      const isUserExist = roomAccessRequests.filter((u) => u?._id === user._id);
      if (isUserExist && isUserExist.length > 0) {
        return [...roomAccessRequests];
      } else {
        return [...roomAccessRequests, user];
      }
    } else {
      return [user];
    }
  }, []);

  const destroyAVTracks = useCallback(() => {
    avVideoPreviewGenerationRef.current += 1;
    avAudioPreviewGenerationRef.current += 1;
    const snapshot = latestStateRef.current;
    void stopAndDisposeJitsiTrack(snapshot?.AVVideoTrack);
    void stopAndDisposeJitsiTrack(snapshot?.AVAudioTrack);
    setState((prev: InitialStateType) => ({ ...prev, AVVideoTrack: null, AVAudioTrack: null }));
  }, []);

  const cleanupLocalMediaTracks = useCallback(async () => {
    mediaGenerationRef.current += 1;
    preJoinVideoMutedRef.current = false;
    preJoinAudioMutedRef.current = false;
    initialVideoTrackEnabledRef.current = true;
    const snapshot = latestStateRef.current;
    const jitsiTracks = new Set<any>([
      snapshot?.localVideoTrack,
      snapshot?.localAudioTrack,
      snapshot?.AVVideoTrack,
      snapshot?.AVAudioTrack,
      snapshot?.desktopVideoTrack,
      snapshot?.desktopAudioTrack,
    ]);

    try {
      snapshot?.roomInstance?.getLocalTracks?.().forEach((track: any) => jitsiTracks.add(track));
    } catch {
      // The room may already be leaving and no longer expose its local tracks.
    }
    jitsiTracks.delete(null);
    jitsiTracks.delete(undefined);

    const nativeTracks = new Set<MediaStreamTrack>();
    jitsiTracks.forEach((track) => {
      getNativeTracksFromJitsiTrack(track).forEach((nativeTrack) => nativeTracks.add(nativeTrack));
    });

    const micTestStream = (window as any).stream as MediaStream | null | undefined;
    const previewStream = (window as any).__previewStream as MediaStream | null | undefined;
    micTestStream?.getTracks?.().forEach((track) => nativeTracks.add(track));
    previewStream?.getTracks?.().forEach((track) => nativeTracks.add(track));

    // Stop native tracks before awaiting Jitsi disposal so browser capture indicators
    // disappear immediately. Only elements containing our owned tracks are detached.
    const disposalTasks = Array.from(jitsiTracks).map((track) => stopAndDisposeJitsiTrack(track));
    stopMediaStream(micTestStream);
    stopMediaStream(previewStream);
    detachOwnedMediaElements(nativeTracks);
    (window as any).stream = null;
    (window as any).__previewStream = null;

    // A second pass covers tracks whose readyState changed asynchronously during dispose.
    nativeTracks.forEach((track) => {
      if (track.readyState === 'live') {
        try {
          track.stop();
        } catch {
          // Ignore tracks already released by the browser.
        }
      }
    });

    if (isProviderMountedRef.current) {
      setState((prev: InitialStateType) => ({
        ...prev,
        AVVideoTrack: null,
        AVAudioTrack: null,
        localVideoTrack: null,
        localAudioTrack: null,
        desktopVideoTrack: null,
        desktopAudioTrack: null,
        isAVVideoMuted: false,
        isAVAudioMuted: false,
        isLocalVideoMuted: false,
        isLocalAudioMuted: false,
        isScreenShareEnabled: false,
        isCreatingLocalTracks: false,
        isTestingMic: false,
        currentActiveScreenShareId: '',
      }));
    }

    await Promise.allSettled(disposalTasks);
  }, []);

  // Host-ended socket messages can arrive while any screen is visible. Always tear down
  // the room, connection, Jitsi tracks, preview stream, and mic-test stream together.
  useEffect(() => {
    if (!socketEventsManager) return;

    const handleMeetEnd = async (data: any) => {
      const snapshot = latestStateRef.current;
      const activeMeetingId = snapshot?.roomCode || meetInitiateModalData?.chatId || '';
      const endedMeetingId = removeEnvPrefix(data?.chatId || '');
      if (
        !activeMeetingId ||
        (endedMeetingId && endedMeetingId !== removeEnvPrefix(activeMeetingId))
      ) {
        return;
      }

      setMeetInitiateModalData(null);
      try {
        if (snapshot?.roomInstance?.isJoined?.()) {
          await snapshot.roomInstance.leave();
        }
      } catch (error) {
        console.log('Error leaving Jitsi room after MEET_END', error);
      } finally {
        await cleanupLocalMediaTracks();
        setAudioLevels({});
        try {
          await snapshot?.jitsiConnection?.disconnect?.();
        } catch (error) {
          console.log('Error disconnecting Jitsi after MEET_END', error);
        }

        if (isProviderMountedRef.current) {
          setState((prev: InitialStateType) => ({
            ...prev,
            roomCode: '',
            roomInstance: null,
            jitsiConnection: null,
            participantsIds: new Set(),
            participantsListing: [],
            remoteTracks: {},
            connectionQuality: {},
            isRoomJoined: false,
            isLobbyJoined: false,
            waitingRoomJoined: false,
            isJitsiConnection: false,
            isInConference: false,
            isMeetingEnded: {
              value: true,
              reason: 'The host has ended this meeting.',
            },
          }));
        }
      }

      if (snapshot?.isHost && location.pathname.includes('/video-meet')) {
        navigate(getMeetingExitRoute());
      }
    };

    socketEventsManager.on(chatEvents.MEET_END, handleMeetEnd);
    return () => {
      socketEventsManager.off(chatEvents.MEET_END, handleMeetEnd);
    };
  }, [
    cleanupLocalMediaTracks,
    getMeetingExitRoute,
    meetInitiateModalData?.chatId,
    navigate,
    setMeetInitiateModalData,
    socketEventsManager,
  ]);

  // Context-level safety net for route changes, sign-out, or any caller that removes
  // the meeting UI without invoking an explicit end button.
  useEffect(() => {
    isProviderMountedRef.current = true;
    return () => {
      isProviderMountedRef.current = false;
      const snapshot = latestStateRef.current;
      void cleanupLocalMediaTracks();
      try {
        if (snapshot?.roomInstance?.isJoined?.()) {
          void snapshot.roomInstance.leave?.();
        }
      } catch {
        // The conference may already have emitted CONFERENCE_LEFT.
      }
      try {
        void snapshot?.jitsiConnection?.disconnect?.();
      } catch {
        // The connection may already be disconnected.
      }
    };
  }, [cleanupLocalMediaTracks]);

  // If an end path clears the meeting before its component unmounts, verify that no
  // context-owned local stream survived that state transition.
  useEffect(() => {
    const hasLocalMedia = Boolean(
      state.localVideoTrack ||
      state.localAudioTrack ||
      state.AVVideoTrack ||
      state.AVAudioTrack ||
      state.desktopVideoTrack ||
      state.desktopAudioTrack ||
      (window as any).stream ||
      (window as any).__previewStream,
    );
    if (state.isMeetingEnded?.value && hasLocalMedia) {
      void cleanupLocalMediaTracks();
    }
  }, [
    cleanupLocalMediaTracks,
    state.AVAudioTrack,
    state.AVVideoTrack,
    state.desktopAudioTrack,
    state.desktopVideoTrack,
    state.isMeetingEnded?.value,
    state.localAudioTrack,
    state.localVideoTrack,
  ]);

  useEffect(() => {
    const hasMeetingIdentity = Boolean(
      roomCode ||
      state.roomInstance ||
      state.isRoomJoined ||
      state.isInConference ||
      meetInitiateModalData?.chatId,
    );
    const hasContextMedia = Boolean(
      state.localVideoTrack ||
      state.localAudioTrack ||
      state.AVVideoTrack ||
      state.AVAudioTrack ||
      state.desktopVideoTrack ||
      state.desktopAudioTrack,
    );

    if (hasMeetingIdentity) {
      hadMeetingIdentityRef.current = true;
    } else if (hadMeetingIdentityRef.current && hasContextMedia) {
      void cleanupLocalMediaTracks();
    }
  }, [
    cleanupLocalMediaTracks,
    meetInitiateModalData?.chatId,
    roomCode,
    state.AVAudioTrack,
    state.AVVideoTrack,
    state.desktopAudioTrack,
    state.desktopVideoTrack,
    state.isInConference,
    state.isRoomJoined,
    state.localAudioTrack,
    state.localVideoTrack,
    state.roomInstance,
  ]);

  const handleTestMic = useCallback(() => {
    if (state.isTestingMic) {
      stopMediaStream(window.stream);
      window.stream = null;
      setState((prev) => ({ ...prev, isTestingMic: false }));
      return;
    }

    const mediaGeneration = mediaGenerationRef.current;
    const handleSuccess = (stream: MediaStream) => {
      if (mediaGeneration !== mediaGenerationRef.current || !isProviderMountedRef.current) {
        stopMediaStream(stream);
        return;
      }

      stopMediaStream(window.stream);
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.autoplay = true;
      window.stream = stream;
      audio.srcObject = stream;
    };

    const handleError = (e: any) => {
      console.error('Mic test error', e);
    };

    setState((prev) => ({ ...prev, isTestingMic: true }));
    if (navigator.mediaDevices) {
      const constraints = (window.constraints = {
        audio: true,
        video: false,
      });
      navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
    }
  }, [state.isTestingMic]);

  async function groupDevicesByKind(devices: any) {
    return {
      micDevices: devices.filter((device: any) => device.kind === 'audioinput'),
      speakerDevices: devices.filter((device: any) => device.kind === 'audiooutput'),
      cameraDevices: devices.filter((device: any) => device.kind === 'videoinput'),
    };
  }

  async function getDevices() {
    return new Promise((resolve) => {
      const { mediaDevices } = window.JitsiMeetJS;

      if (mediaDevices.isDeviceListAvailable() && mediaDevices.isDeviceChangeAvailable()) {
        mediaDevices.enumerateDevices((devices: any) => {
          resolve(devices);
        });
      } else {
        resolve([]);
      }
    });
  }
  const getMediaDevices = async () => {
    const devices = await getDevices();
    const device = await groupDevicesByKind(devices);
    return device;
  };

  function setMicDeviceId(deviceId: any) {
    setState((prev) => ({ ...prev, micDeviceId: deviceId }));
  }
  function setSpeakerDeviceId(deviceId: any) {
    setState((prev) => ({ ...prev, speakerDeviceId: deviceId }));
  }
  function setCameraDeviceId(deviceId: any) {
    setState((prev) => ({ ...prev, cameraDeviceId: deviceId }));
  }
  const setUserName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, userName: name }));
  }, []);
  const setUserEmail = useCallback((email: string) => {
    setState((prev) => ({ ...prev, userEmail: email }));
  }, []);

  const setDisplayName = useCallback((name: string = '') => {
    if (!name || !state.roomInstance) return;
    try {
      state.roomInstance.setDisplayName(name);
    } catch (e) {
      console.log('setting display name', e);
    }
  }, []);

  const initializeSystemAVConfig = () => {
    return new Promise(async (resolve) => {
      const handleDeviceChange = async () => {
        const device = await getMediaDevices();
        if (isProviderMountedRef.current) {
          setState((prev) => ({ ...prev, devices: device }));
          setCameraDeviceId(device?.cameraDevices?.[0]?.deviceId);
        }
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

      const device = await getMediaDevices();
      setState((prev) => ({ ...prev, devices: device }));
      if (!state.cameraDeviceId) {
        setCameraDeviceId(device?.cameraDevices?.[0]?.deviceId);
      }
      if (!state.micDeviceId) {
        setMicDeviceId(device?.micDevices?.[0]?.deviceId);
      }
      if (!state.speakerDeviceId) {
        setSpeakerDeviceId(device?.speakerDevices?.[0]?.deviceId);
      }

      const removeListener = () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };

      resolve(removeListener);
    });
  };

  async function updateLocalVideoTrack() {
    if (state.cameraDeviceId) {
      if (state.localVideoTrack) {
        void stopAndDisposeJitsiTrack(state.localVideoTrack);
      }
      try {
        const mediaGeneration = mediaGenerationRef.current;
        const newVideoTracks = await window.JitsiMeetJS.createLocalTracks({
          devices: ['video'],
          cameraDeviceId: state.cameraDeviceId,
        });
        if (await discardCreatedTracksIfStale(mediaGeneration, newVideoTracks)) return;
        const refTrack = newVideoTracks.filter((track: any) => track.getType() === 'video')[0];

        await state.roomInstance?.replaceTrack(state.localVideoTrack, refTrack);
        if (await discardCreatedTracksIfStale(mediaGeneration, newVideoTracks)) return;
        setLocalVideoTrack(refTrack);
      } catch (err) {
        console.log(err, 'Unable to update local video track');
      }
    }
  }

  async function handleAVVideoPreview() {
    if (state.cameraDeviceId && state.isVideoAllowed) {
      if (state.AVVideoTrack) {
        void stopAndDisposeJitsiTrack(state.AVVideoTrack);
      }
      try {
        const mediaGeneration = mediaGenerationRef.current;
        const avPreviewGeneration = ++avVideoPreviewGenerationRef.current;
        const newVideoTracks = await window.JitsiMeetJS.createLocalTracks({
          devices: ['video'],
          cameraDeviceId: state.cameraDeviceId,
        });
        if (
          await discardCreatedTracksIfStale(
            mediaGeneration,
            newVideoTracks,
            avPreviewGeneration !== avVideoPreviewGenerationRef.current,
          )
        )
          return;
        const screenVideoTrack = newVideoTracks.filter(
          (track: any) => track.getType() === 'video',
        )[0];
        // Always keep preview visible in AV modal; actual join mode is applied in initConference.
        if (screenVideoTrack?.isMuted?.()) {
          await screenVideoTrack.unmute();
        }
        if (
          await discardCreatedTracksIfStale(
            mediaGeneration,
            newVideoTracks,
            avPreviewGeneration !== avVideoPreviewGenerationRef.current,
          )
        )
          return;
        setState((prev) => ({
          ...prev,
          AVVideoTrack: screenVideoTrack,
          errors: { ...state.errors, avVideo: '' },
        }));
      } catch (err: any) {
        console.error(err, 'Creating video tracks');
        setState((prev) => ({
          ...prev,
          isAVVideoMuted: true,
          errors: { ...state.errors, avVideo: err?.message },
        }));
        preJoinVideoMutedRef.current = true;
      }
    } else {
      setState((prev) => ({ ...prev, isAVVideoMuted: true }));
      preJoinVideoMutedRef.current = true;
    }
  }

  async function handleAVAudioPreview() {
    if (state.micDeviceId && state.isAudioAllowed) {
      if (state.AVAudioTrack) {
        void stopAndDisposeJitsiTrack(state.AVAudioTrack);
      }
      try {
        const mediaGeneration = mediaGenerationRef.current;
        const avPreviewGeneration = ++avAudioPreviewGenerationRef.current;
        const newAudioTracks = await window.JitsiMeetJS.createLocalTracks({
          devices: ['audio'],
          micDeviceId: state.micDeviceId,
        });
        if (
          await discardCreatedTracksIfStale(
            mediaGeneration,
            newAudioTracks,
            avPreviewGeneration !== avAudioPreviewGenerationRef.current,
          )
        )
          return;
        const screenAudioTrack = newAudioTracks.filter(
          (track: any) => track.getType() === 'audio',
        )[0];
        setState((prev) => ({
          ...prev,
          AVAudioTrack: screenAudioTrack,
          isAVAudioMuted: false,
        }));
        preJoinAudioMutedRef.current = false;
      } catch (err) {
        console.log(err, 'creating audio tracks');
      }
    } else {
      setState((prev) => ({ ...prev, isAVAudioMuted: true }));
      preJoinAudioMutedRef.current = true;
    }
  }
  function handleChangeSpeakerDevice() {
    if (state.speakerDeviceId) {
      window.JitsiMeetJS.mediaDevices.setAudioOutputDevice(state.speakerDeviceId);
    }
  }

  const disableScreenShare = async () => {
    const roomInstance = state.roomInstance;
    const userLocalTracks = roomInstance?.getLocalTracks?.() || [];
    const localAudioTrack = userLocalTracks.find(
      (_: any) => _?.type === 'audio' && _?.videoType !== 'desktop',
    );
    const desktopTrack = userLocalTracks.find(
      (_: any) => _?.videoType === 'desktop' && _?.type === 'video',
    );

    if (desktopTrack) {
      try {
        if (roomInstance && typeof roomInstance.removeTrack === 'function') {
          await roomInstance.removeTrack(desktopTrack);
        } else if (typeof desktopTrack?.mute === 'function') {
          await desktopTrack.mute();
        }
      } catch (err) {
        console.error(err);
        try {
          await desktopTrack.mute?.();
        } catch (muteErr) {
          console.error(muteErr);
        }
      }

      try {
        await stopAndDisposeJitsiTrack(desktopTrack);
      } catch (disposeErr) {
        console.error(disposeErr);
      }
    }

    if (localAudioTrack !== null && localAudioTrack !== undefined) {
      await localAudioTrack.setEffect(undefined);
    }

    if (state.desktopAudioTrack) {
      try {
        await stopAndDisposeJitsiTrack(state.desktopAudioTrack);
      } catch (err) {
        console.error(err);
      }
    }
    setState((prev) => ({
      ...prev,
      isScreenShareEnabled: false,
      currentActiveScreenShareId: '',
      desktopAudioTrack: null,
      desktopVideoTrack: null,
    }));
    if (desktopTrack || state.isScreenShareEnabled) {
      handleAlert({ text: 'Screen sharing has been stopped', type: 'info' });
    }
  };

  const enableScreenShare = async () => {
    if (state.whiteBoardState?.isWhiteBoardopen) {
      handleAlert({ text: 'Cannot share screen while whiteboard is active', type: 'error' });
      return;
    }
    if (state.currentActiveScreenShareId) {
      handleAlert({ text: 'Another user is already sharing their screen', type: 'error' });
      return;
    }

    const userLocalTracks = state.roomInstance?.getLocalTracks() || [];
    const desktopTrack = userLocalTracks.find((_: any) => _?.videoType === 'desktop');
    const localAudioTrack = userLocalTracks.find((_: any) => _?.type === 'audio');
    let screenshareTrack: any[] = [];
    const mediaGeneration = mediaGenerationRef.current;
    try {
      screenshareTrack = await window.JitsiMeetJS.createLocalTracks({
        devices: ['desktop'],
      });
      if (await discardCreatedTracksIfStale(mediaGeneration, screenshareTrack)) return;
    } catch (err) {
      console.error('Error starting screenshare:', err);
      return;
    }
    const desktopVideoTrack = screenshareTrack.find((stream: any) => stream?.type === 'video');
    const desktopAudioTrack = screenshareTrack.find((stream: any) => stream?.type === 'audio');
    if (desktopTrack) {
      await state.roomInstance.replaceTrack(desktopTrack, desktopVideoTrack);
    } else if (desktopVideoTrack) {
      await state.roomInstance.addTrack(desktopVideoTrack);
    }
    if (await discardCreatedTracksIfStale(mediaGeneration, screenshareTrack)) return;

    if (desktopVideoTrack) {
      desktopVideoTrack.on(window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, async () => {
        try {
          desktopVideoTrack
            .mute()
            .then(async () => {
              console.log('desktop remove success');
              if (localAudioTrack) {
                await localAudioTrack.setEffect(undefined);
              }
              if (desktopAudioTrack) {
                try {
                  desktopAudioTrack.dispose();
                } catch (e) {
                  console.log(e);
                }
              }
              setState((prev) => ({
                ...prev,
                isScreenShareEnabled: false,
                currentActiveScreenShareId: '',
                desktopAudioTrack: null,
                desktopVideoTrack: null,
              }));
              handleAlert({ text: 'Screen sharing has been stopped', type: 'info' });
            })
            .catch((err: string) => {
              console.error(err);
            });
        } catch (err) {
          console.log(err, 'stopping screenSharing err', err);
        }
      });
    }
    if (desktopAudioTrack) {
      desktopAudioTrack.on(window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, async () => {
        if (localAudioTrack !== null && localAudioTrack !== undefined) {
          await localAudioTrack.setEffect(undefined);
          if (desktopAudioTrack !== null) {
            desktopAudioTrack.dispose();
          }
        } else if (desktopAudioTrack !== null) {
          await state.roomInstance.replaceTrack(desktopAudioTrack, null);
        }
        setState((prev) => ({
          ...prev,
          isScreenShareEnabled: false,
          desktopAudioTrack: null,
        }));
      });
    }

    if (localAudioTrack) {
      if (desktopAudioTrack) {
        const mixerEffect = new AudioMixerEffect(desktopAudioTrack, window.JitsiMeetJS);
        localAudioTrack.setEffect(mixerEffect);
      }
    } else {
      if (desktopAudioTrack) {
        state.roomInstance.replaceTrack(null, desktopAudioTrack);
      }
    }
    setState((prev) => ({
      ...prev,
      desktopAudioTrack: desktopAudioTrack,
      desktopVideoTrack: desktopVideoTrack,
      isScreenShareEnabled: true,
    }));
    handleAlert({ text: 'You are now sharing your screen', type: 'info' });
  };

  // async function updateLocalAudioTrack(newId) {
  //   if (newId) {
  //     if (state.localAudioTrack) {
  //       state.localAudioTrack.dispose();
  //     }
  //     try {
  //       const newAudioTracks = await window.JitsiMeetJS.createLocalTracks({
  //         devices: ['audio'],
  //         micDeviceId: newId,
  //       });
  //       const refTrack = newAudioTracks.filter((track: any) => track.getType() === 'audio')[0];
  //       setLocalAudioTrack(refTrack);
  //     } catch (err) {
  //     }
  //   }
  // }

  const setLocalParticipantLanguage = useCallback(
    ({
      language = 'en',
      transcriptionLang = false,
      translationLang = true,
    }: {
      language: 'en';
      transcriptionLang: boolean;
      translationLang: boolean;
    }) => {
      const roomInstance = state.roomInstance;
      if (language) {
        if (transcriptionLang) {
          roomInstance?.setLocalParticipantProperty(
            'transcription_language',
            COUNTRY_CODES[language][1],
          );
        }
        if (translationLang) {
          roomInstance?.setLocalParticipantProperty(
            'translation_language',
            COUNTRY_CODES[language][0],
          );
        }
      }
    },
    [state.roomInstance],
  );

  const applyWhiteboardAction = useCallback((actionPayload: any) => {
    const parsedPayload = parseWhiteboardCommandPayload(actionPayload);
    if (!parsedPayload) return;

    setState((prev) => ({
      ...prev,
      whiteBoardState: parsedPayload,
    }));
  }, []);

  const initializingConferenceListeners = async (room: any) => {
    return new Promise((resolve) => {
      const whiteboardCommandListener = (payload: any, from: string) => {
        const parsedPayload = parseWhiteboardCommandPayload(payload, from);
        if (!parsedPayload) return;

        setState((prev) => ({
          ...prev,
          whiteBoardState: parsedPayload,
        }));
      };

      room.addCommandListener(WHITEBOARD_COMMAND, whiteboardCommandListener);
      room.on(window.JitsiMeetJS.events.conference.TRACK_ADDED, onTrackAdded);
      room.on(
        window.JitsiMeetJS.events.conference.RECORDER_STATE_CHANGED,
        (recorderSession: any, id: string = '') => {
          console.log('RECORDER_STATE_CHANGED', recorderSession, id);
          if (recorderSession) {
            let message = '';
            const error = recorderSession.getError();
            const id = recorderSession.getID();
            if (id) {
              updateRecordingSessionData(recorderSession);
            }
            if (error) {
              switch (recorderSession) {
                case window.JitsiMeetJS.constants.recording.error.SERVICE_UNAVAILABLE:
                  message = 'Recorder Unavailable';
                  break;
                case window.JitsiMeetJS.constants.recording.error.RESOURCE_CONSTRAINT:
                  message = 'All recorders are busy';
                  break;
                case window.JitsiMeetJS.constants.recording.error.UNEXPECTED_REQUEST:
                  message = 'Recorder already active';
                  break;
                default:
                  message = 'Failed to start recording';
                  break;
              }
              setState((prev) => ({ ...prev, recordingLoader: false }));
              console.error(message);
            }
          }
        },
      );

      room.on(window.JitsiMeetJS.events.conference.TRACK_REMOVED, onTrackRemoved);
      room.on(window.JitsiMeetJS.events.conference.CONFERENCE_JOINED, async () => {
        const initialParticipantIds = new Set<string>(
          (room?.getParticipants?.() || [])
            .map((participant: any) => normalizeParticipantId(participant))
            .filter(Boolean),
        );
        const myParticipantId = normalizeParticipantId(room?.myUserId?.());
        if (myParticipantId) {
          initialParticipantIds.add(myParticipantId);
        }
        knownParticipantIdsRef.current = initialParticipantIds;
        joinToastReadyRef.current = true;

        setLocalParticipantLanguage({
          language: 'en',
          transcriptionLang: true,
          translationLang: true,
        });

        if (state.waitingScreenEnabled) {
          if (!state.isHost) {
            setState((prev) => ({ ...prev, waitingRoomJoined: true, isInConference: true }));
          } else {
            setState((prev) => ({
              ...prev,
              isRoomJoined: true,
              isHostJoined: true,
              hostID: room.myUserId(),
              isInConference: true,
            }));
          }
        }

        setState((prev) => ({
          ...prev,
          isRoomJoined: prev.isLobbyEnabled && prev.isHost ? true : prev.isRoomJoined,
          isHostJoined: prev.isLobbyEnabled && prev.isHost ? true : prev.isHostJoined,
          isLobbyJoined: prev.isHost ? false : prev.isLobbyEnabled,
          hostID: prev.isLobbyEnabled && prev.isHost ? room.myUserId() : prev.hostID,
          isInConference: true,
        }));

        if (!state.isLobbyEnabled && !state.waitingScreenEnabled) {
          setState((prev) => ({
            ...prev,
            isRoomJoined: true,
            isHostJoined: state.isHost ? true : prev.isHostJoined,
            isInConference: true,
          }));
          if (state.isHost) {
            setState((prev) => ({
              ...prev,
              hostID: room.myUserId(),
            }));
          }
        }
      });
      room.on(window.JitsiMeetJS.events.conference.USER_JOINED, async (id: string, user: any) => {
        console.log('USER_JOINED', user, id);
        const participantId = normalizeParticipantId(id);
        if (!participantId) {
          if (user?._displayName === 'Transcriber') {
            setState((prev) => ({
              ...prev,
              isTranscriberEnabled: true,
            }));
          }
          return;
        }

        const alreadyKnownParticipant = knownParticipantIdsRef.current.has(participantId);
        knownParticipantIdsRef.current.add(participantId);
        if (!joinToastReadyRef.current || alreadyKnownParticipant) {
          if (user?._displayName === 'Transcriber') {
            setState((prev) => ({
              ...prev,
              isTranscriberEnabled: true,
            }));
          }
          return;
        }

        const userDisplayName = user?.displayName || user?._displayName || 'User';
        const myUserId = normalizeParticipantId(room?.myUserId?.());
        if (
          myUserId &&
          participantId !== myUserId &&
          userDisplayName !== 'Transcriber' &&
          userDisplayName !== 'Recorder'
        ) {
          handleAlert({ text: `${userDisplayName} joined the meeting`, type: 'info' });
        }
        if (user?._displayName === 'Transcriber') {
          setState((prev) => ({
            ...prev,
            isTranscriberEnabled: true,
          }));
        }
      });

      room.on(window.JitsiMeetJS.events.conference.CONFERENCE_LEFT, () => {
        if (!room) {
          return;
        }
        joinToastReadyRef.current = false;
        knownParticipantIdsRef.current = new Set();
        try {
          room.removeCommandListener(WHITEBOARD_COMMAND, whiteboardCommandListener);
        } catch {
          room.removeCommandListener(WHITEBOARD_COMMAND);
        }
        setAudioLevels({});
        const connection = latestStateRef.current?.jitsiConnection;
        void (async () => {
          await cleanupLocalMediaTracks();
          try {
            await connection?.disconnect?.();
          } catch (error) {
            console.log('Error disconnecting after CONFERENCE_LEFT', error);
          }
          if (!isProviderMountedRef.current) return;
          setState((prev: any) => ({
            ...prev,
            roomCode: '',
            roomInstance: null,
            jitsiConnection: null,
            isRoomJoined: false,
            isLobbyJoined: false,
            waitingRoomJoined: false,
            cameraDeviceId: null,
            micDeviceId: null,
            isJitsiConnection: false,
            isInConference: false,
            remoteTracks: {},
            connectionQuality: {},
            whiteBoardState: {},
            isMeetingEnded: prev.isMeetingEnded?.value
              ? prev.isMeetingEnded
              : { value: true, reason: 'Meeting has ended.' },
          }));
        })();
      });
      room.on(window.JitsiMeetJS.events.conference.SUBJECT_CHANGED, (newSubject: string) => {
        setState((prev) => ({ ...prev, meetingName: newSubject }));
      });

      room.on(window.JitsiMeetJS.events.conference.USER_LEFT, (id: string, user: any) => {
        const participantId = normalizeParticipantId(id);
        const participantProperties = user?._properties;
        const isRecorder = participantProperties?.get?.('iAmRecorder') === 'true';
        const isKicked = participantProperties?.get?.('isKicked') === 'true';
        if (isRecorder) return;
        if (!participantId) return;

        setState((prev: any) => {
          const ids = new Set(prev?.participantsIds || []);
          ids.delete(participantId);

          const participantListing = Array.isArray(prev?.participantsListing)
            ? prev.participantsListing.filter(
                (participant: any) => participant?._id !== participantId,
              )
            : [];

          const currentActiveScreenShareId =
            prev?.currentActiveScreenShareId === participantId
              ? ''
              : prev?.currentActiveScreenShareId;

          const remoteTracks = { ...(prev?.remoteTracks || {}) };
          delete remoteTracks[participantId];

          const connectionQuality = { ...(prev?.connectionQuality || {}) };
          delete connectionQuality[participantId];

          const whiteBoardOwnerLeft =
            prev?.whiteBoardState?.isWhiteBoardopen &&
            normalizeParticipantId(prev?.whiteBoardState?.startedBy) === participantId;

          return {
            ...prev,
            participantsIds: ids,
            participantsListing: participantListing,
            remoteTracks,
            connectionQuality,
            roomAccessRequests: handleRemoveUserRequest(user, prev.roomAccessRequests),
            currentActiveScreenShareId: currentActiveScreenShareId,
            whiteBoardState: whiteBoardOwnerLeft
              ? { ...prev?.whiteBoardState, isWhiteBoardopen: false, updatedAt: Date.now() }
              : prev?.whiteBoardState,
          };
        });

        setAudioLevels((prev) => {
          if (!Object.prototype.hasOwnProperty.call(prev, participantId)) return prev;
          const next = { ...prev };
          delete next[participantId];
          return next;
        });

        const myUserId = normalizeParticipantId(room?.myUserId?.());
        const isJibri = typeof user?._statsID === 'string' && user?._statsID.includes('jibri');
        if (
          myUserId &&
          participantId !== myUserId &&
          !isJibri &&
          user?._displayName !== 'Transcriber'
        ) {
          handleAlert({
            text: isKicked
              ? `${user?._displayName ?? 'User'} has been kicked out of the meeting`
              : `${user?._displayName ?? 'User'} left the meeting`,
            type: 'info',
          });
        }
      });
      room.on(window.JitsiMeetJS.events.conference.DOMINANT_SPEAKER_CHANGED, (id: string) => {
        console.log('DOMINANT_SPEAKER_CHANGED', id);
        setState((prev) => ({ ...prev, dominantSpeaker: id }));
      });

      room.on(window.JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, (track: any) => {
        console.log('track update ========>', track);
        if (track.isLocal()) {
          return;
        }

        const pId = track.getParticipantId();
        const trackType = track.getType();
        const videoType = track.videoType;

        setState((prev) => {
          const remoteTracks = { ...prev.remoteTracks };
          remoteTracks[pId] = {
            ...remoteTracks[pId],
            [videoType || trackType]: track,
          };

          const nextState: any = {
            ...prev,
            remoteTracks,
          };

          // If a remote desktop track is muted/stopped, clear the active screen share ID
          if (
            videoType === 'desktop' &&
            track.isMuted() &&
            prev.currentActiveScreenShareId === pId
          ) {
            nextState.currentActiveScreenShareId = '';
          } else if (videoType === 'desktop' && !track.isMuted()) {
            nextState.currentActiveScreenShareId = pId;
          }

          return nextState;
        });
      });
      room.on(
        window.JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
        (userID: string, displayName: string) => {
          console.log('DISPLAY_NAME_CHANGED', userID, displayName);
        },
      );

      const connectionQualityEvents = window?.JitsiMeetJS?.events?.connectionQuality;
      if (connectionQualityEvents?.LOCAL_STATS_UPDATED) {
        room.on(connectionQualityEvents.LOCAL_STATS_UPDATED, (stats: any) => {
          const localParticipantIdRaw = room?.myUserId?.();
          const localParticipantId = normalizeParticipantId(localParticipantIdRaw);
          if (!localParticipantId) return;
          updateParticipantConnectionQuality(localParticipantIdRaw, stats, 'local');
        });
      }
      if (connectionQualityEvents?.REMOTE_STATS_UPDATED) {
        room.on(connectionQualityEvents.REMOTE_STATS_UPDATED, (id: string, stats: any) => {
          const participantId = normalizeParticipantId(id);
          if (!participantId) return;
          updateParticipantConnectionQuality(id, stats, 'remote');
        });
      }

      if (window?.JitsiMeetJS?.events?.conference?.ENDPOINT_STATS_RECEIVED) {
        room.on(
          window.JitsiMeetJS.events.conference.ENDPOINT_STATS_RECEIVED,
          (idOrPayload: any, statsOrUndefined?: any) => {
            const participantId = normalizeParticipantId(idOrPayload);
            const stats =
              statsOrUndefined && typeof statsOrUndefined === 'object'
                ? statsOrUndefined
                : idOrPayload;

            if (!participantId || !stats || typeof stats !== 'object') return;
            updateParticipantConnectionQuality(idOrPayload, stats, 'endpoint');
          },
        );
      }
      room.on(
        window.JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
        (id: string, lvl: any) => {
          const participantId = normalizeParticipantId(id);
          if (!participantId || typeof lvl !== 'number' || Number.isNaN(lvl)) return;
          // Improved audio level calculation for better sensitivity
          // lvl is typically 0-1, we scale to 0-30 with better resolution
          const audioLevel = Math.min(30, Math.round(lvl * 100)); // More sensitive scaling
          setAudioLevels((prev) => {
            // Update only if there's a meaningful change (reduces re-renders)
            if (
              prev[participantId] !== undefined &&
              Math.abs(prev[participantId] - audioLevel) < 1
            ) {
              return prev;
            }
            return {
              ...prev,
              [participantId]: audioLevel,
            };
          });
        },
      );

      room.on(window.JitsiMeetJS.events.conference.KICKED, (id: string, reason: string) => {
        console.log('KICKED', id, reason);

        endMeetingForSelf(false, reason || 'You have been removed from the meeting.', false, true);

        // // Dispose of local tracks when kicked
        // setState((prev: any) => {
        //   if (prev.localVideoTrack) {
        //     prev.localVideoTrack.dispose();
        //   }
        //   if (prev.localAudioTrack) {
        //     prev.localAudioTrack.dispose();
        //   }
        //   return {
        //     ...prev,
        //     localVideoTrack: null,
        //     localAudioTrack: null,
        //     isMeetingEnded: {
        //       value: true,
        //       reason: reason || 'You have been removed from the meeting',
        //     },
        //   };
        // });

        // // Leave the room
        // if (room && room.isJoined()) {
        //   room.leave();
        // }
      });
      room.on(
        window.JitsiMeetJS.events.conference.PARTICIPANT_KICKED,
        (guiltyId: string, victimId: string, reason: string) => {
          console.log('PARTICIPANT_KICKED', { guiltyId, victimId, reason });

          // Check if the current user is the one being kicked
          if (victimId === room?.myUserId?.()) {
            void endMeetingForSelf(
              false,
              reason || 'You have been removed from the meeting.',
              false,
              true,
            );
          }
        },
      );
      room.on(
        window.JitsiMeetJS.events.conference.MESSAGE_RECEIVED,
        (id: string, msg: string, ts: string) => {
          console.log('MESSAGE_RECEIVED', id, msg, ts);

          // Check if message contains transcript URL
          if (msg.includes('Transcript will be saved in') && msg.includes('transcripts')) {
            // Extract URL from message: "Transcript will be saved in [URL]"
            const urlMatch = msg.match(/https:\/\/[^\s]+/);
            const transcriptUrl = urlMatch ? urlMatch[0] : '';

            if (transcriptUrl) {
              setState((prev) => ({
                ...prev,
                transcriptFileUrl: transcriptUrl,
              }));

              // Emit save-video-transcription event only once and only if user is HOST
              if (!transcriptionEmittedRef.current && socketEventsManager && state.isHost) {
                // socketEventsManager.emit('save-video-transcription', {
                //   doc: {
                //     fileUrl: transcriptUrl,
                //     meetingId: roomCode,
                //     timestamp: new Date().toISOString(),
                //   },
                // });
                transcriptionEmittedRef.current = true;
                console.log('save-video-transcription emit is disabled', transcriptUrl);
              }
            }
          }
        },
      );
      room.on(
        window.JitsiMeetJS.events.conference.PRIVATE_MESSAGE_RECEIVED,
        (id: string, text: string) => {
          console.log('PRIVATE_MESSAGE_RECEIVED', id, text);
        },
      );
      room.on(
        window.JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED,
        async (participant: any, message: any) => {
          const { msg = '', type = '' } = message;
          if (type === KICK_PREPARE_MESSAGE_TYPE) {
            try {
              if (room?.isJoined?.()) {
                room.setLocalParticipantProperty('isKicked', 'true');
              }

              const senderId = normalizeParticipantId(participant);
              if (senderId && room?.isJoined?.()) {
                room.sendEndpointMessage(senderId, {
                  type: KICK_PREPARE_ACK_MESSAGE_TYPE,
                  msg: 'READY',
                });
              }
            } catch (err) {
              console.log('Failed to set isKicked from endpoint message', err);
            }
            return;
          }
          if (type === 'LOBBY_APPROVED') {
            if (msg === 'APPROVED') {
              setState((prev) => ({
                ...prev,
                isRoomJoined: true,
                isLobbyJoined: false,
                isInConference: true,
              }));
              return;
            }

            if (msg === 'REJECTED') {
              endMeetingForSelf(
                false,
                'Host has denied your request to join the video meeting.',
                true,
              );
              return;
            }

            if (msg === 'REQUESTED') {
              setState((prev) => ({
                ...prev,
                roomAccessRequests: handleRoomReqUsers(participant, prev.roomAccessRequests),
                lobbyRequestNotification: participant,
              }));

              // Show browser notification to host when user requests to join from lobby
              if (state.isHost && document.visibilityState !== 'visible') {
                showPushNotification({
                  title: 'New Lobby Request',
                  body: `${participant._displayName || 'A participant'} is requesting to join the meeting`,
                  icon: mainSiteInfo?.fav_icon || mainSiteInfo?.small_logo,
                  onClick: () => {
                    window.focus();
                  },
                });
              }
              return;
            }
          }
          if (type === 'GROUP_CHAT') {
            setState((prev) => ({
              ...prev,
              chatList: chatRecievedListener(prev, message),
            }));
          }
          //   if (type === 'MESSAGE_READ') {
          //     setState((prev) => ({
          //       ...prev,
          //       chatList: messageReadListener(prev, message?.uId, participant?._id),
          //     }));
          //   }
          if (type === 'ASSIGN_HOST') {
            if (msg === 'ASSIGN') {
              if (room?.isJoined?.()) {
                room.setLocalParticipantProperty('isHost', `${true}`);
              }
              setState((prev) => ({
                ...prev,
                isHost: true,
                hostID: room.myUserId(),
              }));
              handleAlert({ type: 'success', text: `My role changed, new role: Host` });
            }
          }
          if (type === 'MUTE_SINGLE_MIC') {
            try {
              setState((prev: any) => {
                try {
                  prev.localAudioTrack.mute();
                  return {
                    ...prev,
                    isLocalAudioMuted: true,
                  };
                } catch (e) {
                  console.log(e);
                  return {
                    ...prev,
                    isLocalAudioMuted: false,
                  };
                }
              });
            } catch (e) {
              console.log(e);
            }
          }
          if (type === 'MUTE_SINGLE_CAM') {
            try {
              setState((prev) => {
                prev.localVideoTrack.mute();
                return { ...prev, isLocalVideoMuted: true };
              });
            } catch (e) {
              console.log(e);
              setState((prev) => ({
                ...prev,
                isLocalVideoMuted: false,
              }));
            }
          }
          if (type === 'MUTE_ALL_MIC') {
            try {
              setState((prev) => {
                prev.localAudioTrack.mute();
                return {
                  ...prev,
                  isLocalAudioMuted: true,
                };
              });
            } catch (e) {
              console.log(e);
              setState((prev) => ({
                ...prev,
                isLocalAudioMuted: false,
              }));
            }
          }
          if (type === 'EMOJI_REACTION') {
            try {
              setState((prev) => ({
                ...prev,
                emojiReactions: emojiReactionReceivedListener(prev, msg),
              }));
            } catch (e) {
              console.log(e);
            }
          }
          if (type === 'ALLOW_SCREENSHARE') {
            try {
              setState((prev) => ({
                ...prev,
                participantPermissions: {
                  ...prev.participantPermissions,
                  allowScreenshare: true,
                },
              }));
              if (room?.isJoined?.()) {
                room.setLocalParticipantProperty('ALLOW_SCREENSHARE', 'true');
              }
              handleAlert({ type: 'success', text: 'Screenshare permission granted!' });
            } catch (e) {
              console.log(e);
            }
          }
          if (type === 'FORBID_SCREENSHARE') {
            try {
              setState((prev) => ({
                ...prev,
                participantPermissions: {
                  ...prev.participantPermissions,
                  allowScreenshare: false,
                },
              }));
              if (room?.isJoined?.()) {
                room.setLocalParticipantProperty('ALLOW_SCREENSHARE', 'false');
              }
              handleAlert({ type: 'error', text: 'Screenshare permission revoked!' });
            } catch (e) {
              console.log(e);
            }
          }

          if (type === 'WHITEBOARD_ACTION') {
            applyWhiteboardAction(message?.action);
          }
        },
      );
      room.on(
        window.JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
        async (user: any, key: string, old: string, newKey: string) => {
          const participantProperties = user?._properties;
          const isRecorder = participantProperties?.get?.('iAmRecorder') === 'true';
          console.log('PARTICIPANT_PROPERTY_CHANGED', user, user?._properties, old);
          const userId = user?._id;
          if (key === 'isHost' && newKey === 'true') {
            if (state.isHostJoined) {
              setState((prev) => ({
                ...prev,
                hostID: user?._id,
              }));
            } else {
              setState((prev) => ({
                ...prev,
                isHostJoined: true,
                hostID: user?._id,
              }));
            }
          }
          if (key === 'ISJOINED' && newKey === 'true' && !isRecorder) {
            setState((prev) => {
              const ids = new Set(prev.participantsIds);
              if (ids.has(userId)) return prev;
              ids.add(userId);
              return {
                ...prev,
                participantsIds: ids,
                participantsListing: [...prev.participantsListing, user],
              };
            });
          }
          if (key === 'HAND_RAISED') {
            setState((prev) => ({
              ...prev,
              remoteHandRaised: handleHandRaised(prev, user, newKey),
            }));
          }
        },
      );

      setState((prev) => {
        room.setDisplayName(prev.userName);
        return prev;
      });
      resolve({ success: true });
    });
  };

  const muteParticipantMic = useCallback(
    (id = '') => {
      console.log(id, state.roomInstance);

      if (state.roomInstance && state.roomInstance.isJoined() && id) {
        try {
          state.roomInstance.sendMessage({ type: 'MUTE_SINGLE_MIC' }, id);
        } catch (err) {
          console.log(err);
        }
      }
    },
    [state.roomInstance, state.isRoomJoined],
  );
  const muteParticipantCam = useCallback(
    (id = '') => {
      if (state.roomInstance && state.roomInstance.isJoined() && id) {
        try {
          state.roomInstance.sendMessage({ type: 'MUTE_SINGLE_CAM' }, id);
        } catch (err) {
          console.log(err);
        }
      }
    },
    [state.roomInstance],
  );

  const initConference = useCallback(
    async (subject: string, options?: { withVideo?: boolean }) => {
      let room: any;
      const mediaGeneration = mediaGenerationRef.current;
      try {
        if (typeof options?.withVideo === 'boolean') {
          const shouldMuteVideo = !options.withVideo;
          const shouldMuteAudio = false;
          initialVideoTrackEnabledRef.current = options.withVideo;
          preJoinVideoMutedRef.current = shouldMuteVideo;
          preJoinAudioMutedRef.current = shouldMuteAudio;
          setState((prev: any) => ({
            ...prev,
            isLocalVideoMuted: shouldMuteVideo,
            isLocalAudioMuted: shouldMuteAudio,
            isAVVideoMuted: shouldMuteVideo,
            isAVAudioMuted: shouldMuteAudio,
            isVideoCall: options.withVideo,
          }));
        }

        if (
          !state.jitsiConnection ||
          typeof state.jitsiConnection.initJitsiConference !== 'function'
        ) {
          console.warn('Jitsi connection not ready yet. Skipping join attempt.', {
            roomCode,
            hasConnection: Boolean(state.jitsiConnection),
            isJitsiConnection: state.isJitsiConnection,
          });
          return;
        }
        // room = state.jitsiConnection.initJitsiConference(roomCode, config);
        room = state.jitsiConnection.initJitsiConference(
          `${getEnv()?.VITE_APP_SLUG}_${roomCode}`,
          config,
        );
        console.log('JITSI CONFERENCE', `${getEnv()?.VITE_APP_SLUG}_${roomCode}`, config);
        joinToastReadyRef.current = false;
        knownParticipantIdsRef.current = new Set();
        if (room?.setLocalParticipantProperty) {
          room.setLocalParticipantProperty('isHost', `${state.isHost}`);

          console.log('userrrrrrrr', state, user);
          room.setLocalParticipantProperty('isMember', state?.isMember?.toString());
        }
        await initializingConferenceListeners(room);
        if (
          mediaGeneration !== mediaGenerationRef.current ||
          !isProviderMountedRef.current ||
          latestStateRef.current?.roomCode !== roomCode
        ) {
          try {
            if (room?.isJoined?.()) await room.leave();
          } catch {
            // The conference was invalidated before it finished joining.
          }
          return;
        }
        if (room) {
          room.join();
          // Emit nats-meet-invite-accept — same as connect-web after conference.join()
          handleMeetAccept({
            chatId: roomCode,
            userID: meetingActorUuid,
            jid: room.myUserId(),
          });
          if (subject && room) {
            try {
              room.setSubject(subject);
            } catch (e) {
              console.error('setting meet topic', e);
            }
          }
          setState((prev) => ({
            ...prev,
            roomInstance: room,
            userID: room.myUserId(),
          }));
        }
      } catch (err) {
        console.log('Joining conference error', err);
      }
    },
    [
      handleMeetAccept,
      meetingActorUuid,
      roomCode,
      state.isJitsiConnection,
      state.jitsiConnection,
      state.isHost,
      state.isMember,
    ],
  );

  const sendChatMessage = useCallback(
    ({ personal = false, msg = '', id = '' }: { personal: boolean; msg: string; id: string }) => {
      return new Promise((resolve, reject) => {
        if (personal && !id) {
          reject(
            new Error(
              "'For sending personal message please give user id of participant you want to send message to.'",
            ),
          );
        }
        if (!personal && !id) {
          const msgObj = {
            type: 'GROUP_CHAT',
            uId: 'id' + Math.random().toString(16).slice(2),
            msg: msg,
            senderId: state.roomInstance.myUserId(),
            receivers: Array.from(state.participantsIds),
            readers: [],
            timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
            user_name: state.userName,
          };
          setState((prev) => ({
            ...prev,
            chatList: chatRecievedListener(prev, msgObj),
          }));
          Array.from(state.participantsIds).forEach((id) => {
            state.roomInstance.sendMessage(msgObj, id);
          });
        }
        resolve({ success: true });
      });
    },
    [state.roomInstance],
  );

  const sendHandRaisedEvent = useCallback(() => {
    if (state.roomInstance && state.roomInstance.isJoined()) {
      try {
        state.roomInstance.setLocalParticipantProperty('HAND_RAISED', `${!state.isHandRaised}`);
        setState((prev) => ({ ...prev, isHandRaised: !prev.isHandRaised }));
      } catch (err) {
        console.log(err);
      }
    }
  }, [state.roomInstance, state.isHandRaised]);

  const sendEmojiReaction = useCallback(
    (reactionString = '') => {
      const msgObj = {
        type: 'EMOJI_REACTION',
        uId: 'id' + Math.random().toString(16).slice(2),
        msg: reactionString,
        senderId: state.roomInstance.myUserId(),
        receivers: Array.from(state.participantsIds),
        readers: [],
        timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
        user_name: state.userName,
      };

      setState((prev) => ({
        ...prev,
        emojiReactions: emojiReactionReceivedListener(prev, msgObj),
      }));

      Array.from(state.participantsIds).forEach((id) => {
        state.roomInstance.sendEndpointMessage(id, {
          type: 'EMOJI_REACTION',
          msg: reactionString,
        });
      });
    },
    [state.participantsIds?.size, state.roomInstance],
  );

  const startRecording = useCallback(() => {
    const appData = JSON.stringify({
      file_recording_metadata: {
        share: true,
      },
    });
    return new Promise((resolve) => {
      if (state.roomInstance) {
        setState((prev) => ({ ...prev, recordingLoader: true }));
        const message = 'Failed to start recording';
        state.roomInstance
          .startRecording({
            mode: window.JitsiMeetJS.constants.recording.mode.FILE,
            appData,
          })
          .then((res: any) => {
            // if (!state?.isTranscriberEnabled) {
            //   state.roomInstance?.setLocalParticipantProperty(P_NAME_REQUESTING_TRANSCRIPTION, true);
            //   if (
            //     state.roomInstance?.getTranscriptionStatus() ===
            //     window.JitsiMeetJS.constants.transcriptionStatus.OFF
            //   ) {
            //     state.roomInstance?.dial(TRANSCRIBER_DIAL_NUMBER).catch((error: any) => {
            //       console.error('Error dialing', error, 'FAILED TO START TRANSCRIPTION');
            //     });
            //   }
            // }
            resolve({ status: 'success', data: res });
          })
          .catch((err: any) => {
            setState((prev) => ({ ...prev, recordingLoader: false }));
            resolve({ status: 'error', message, data: err });
          });
      }
    });
  }, [state.isTranscriberEnabled, state.roomInstance]);

  const requestRecordingStop = useCallback(
    async ({ waitForRecorderOff = false }: { waitForRecorderOff?: boolean } = {}) => {
      const { roomInstance } = state;
      if (!roomInstance || !roomInstance?.isJoined?.() || !isActiveRecordingRef.current) {
        return false;
      }

      const activeRecorderSessionId =
        activeRecorderSessionIdRef.current || localStorage.getItem('activeRecorderSessionId') || '';

      if (!activeRecorderSessionId) {
        console.error('No recording session found');
        setState((prev) => ({ ...prev, recordingLoader: false }));
        return false;
      }

      setState((prev) => ({ ...prev, recordingLoader: true }));

      try {
        await Promise.resolve(roomInstance.stopRecording(activeRecorderSessionId));
      } catch (err) {
        console.error('Error stopping recording', err);
        setState((prev) => ({ ...prev, recordingLoader: false }));
        return false;
      }

      if (!waitForRecorderOff) return true;

      const timeoutAt = Date.now() + 8000;
      while (isActiveRecordingRef.current && Date.now() < timeoutAt) {
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }

      if (isActiveRecordingRef.current) {
        console.warn('Recording did not report OFF before meeting end. Continuing cleanup.');
        setState((prev) => ({ ...prev, recordingLoader: false }));
      }

      return true;
    },
    [state.roomInstance],
  );

  const stopRecording = useCallback(() => {
    void requestRecordingStop();
  }, [requestRecordingStop]);

  const endMeetingForSelf = useCallback(
    async (withNavigate = true, reason = '', isGoHome = false, isKicked = false) => {
      try {
        if (state.isScreenShareEnabled) {
          await disableScreenShare();
        }

        if (state.roomInstance) {
          if (state.roomInstance.isJoined()) {
            if (isKicked) {
              state.roomInstance?.setLocalParticipantProperty?.('isKicked', 'true');
            }
            await state.roomInstance.leave().catch((err: any) => {
              console.log('Error leaving room instance', err);
            });
          }
        }
      } catch (err) {
        console.log({ err });
      } finally {
        await cleanupLocalMediaTracks();
        setAudioLevels({});

        try {
          await state.jitsiConnection?.disconnect?.();
        } catch (connectionErr) {
          console.log('Error disconnecting Jitsi connection', connectionErr);
        }

        if (withNavigate) {
          window.close();
        }
        if (isGoHome) {
          handleAlert({ text: reason || 'You have been removed from the meeting', type: 'error' });
          navigate(getMeetingExitRoute());
        }
        if (state.isHost) {
          navigate(getMeetingExitRoute());
        }
        setState((prev) => ({
          ...prev,
          roomCode: '',
          roomInstance: null,
          jitsiConnection: null,
          isRoomJoined: false,
          isLobbyJoined: false,
          waitingRoomJoined: false,
          isJitsiConnection: false,
          isMeetingEnded: { value: true, reason: reason },
          participantsIds: new Set(),
          participantsListing: [],
          remoteTracks: {},
          connectionQuality: {},
          isInConference: false,
        }));
      }
    },
    [
      disableScreenShare,
      cleanupLocalMediaTracks,
      getMeetingExitRoute,
      navigate,
      state.isScreenShareEnabled,
      state.jitsiConnection,
      state.roomInstance,
    ],
  );

  const kickParticipant = useCallback(
    (id: string, reason: string = '') => {
      if (state.roomInstance && state.roomInstance.isJoined()) {
        const room = state.roomInstance;
        let hasKicked = false;

        const finalizeKick = () => {
          if (hasKicked) return;
          hasKicked = true;
          if (room && room.isJoined()) {
            room.kickParticipant(id, reason);
          }
        };

        const ackListener = (fromParticipant: any, ackMessage: any) => {
          const fromParticipantId = normalizeParticipantId(fromParticipant);
          const targetId = normalizeParticipantId(id);
          if (
            ackMessage?.type === KICK_PREPARE_ACK_MESSAGE_TYPE &&
            fromParticipantId &&
            targetId &&
            fromParticipantId === targetId
          ) {
            try {
              room.off(window.JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED, ackListener);
            } catch (err) {
              console.log('Failed to remove pre-kick ack listener', err);
            }
            finalizeKick();
          }
        };

        room.on(window.JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED, ackListener);

        try {
          room.sendEndpointMessage(id, { type: KICK_PREPARE_MESSAGE_TYPE, msg: reason || '' });
        } catch (err) {
          console.log('Failed to send pre-kick message', err);
        }

        window.setTimeout(() => {
          try {
            room.off(window.JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED, ackListener);
          } catch (err) {
            console.log('Failed to cleanup pre-kick ack listener', err);
          }
          finalizeKick();
        }, KICK_PREPARE_DELAY_MS);
      }
    },
    [state.roomInstance],
  );

  const endMeetingForAll = useCallback(
    async (reason: string = '') => {
      try {
        if (state?.roomInstance && state?.roomInstance?.isJoined()) {
          if (isActiveRecordingRef.current) {
            await requestRecordingStop({ waitForRecorderOff: true });
          }

          for (let index = 0; index < state?.roomInstance?.getParticipants()?.length; index++) {
            const participant = state?.roomInstance?.getParticipants()[index];
            kickParticipant(participant?._id, reason || 'ALL');
          }
          await new Promise((resolve) => {
            window.setTimeout(resolve, KICK_PREPARE_DELAY_MS + 100);
          });
          await state?.roomInstance?.leave().catch((err: any) => {
            console.log('Error leaving room instance for all', err);
          });
        }
      } catch (err: any) {
        console.log(err);
        window.close();
        return;
      } finally {
        await cleanupLocalMediaTracks();
        setAudioLevels({});

        try {
          await state.jitsiConnection?.disconnect?.();
        } catch (connectionErr) {
          console.log('Error disconnecting Jitsi connection', connectionErr);
        }

        setState((prev) => ({
          ...prev,
          roomCode: '',
          roomInstance: null,
          jitsiConnection: null,
          isRoomJoined: false,
          isLobbyJoined: false,
          waitingRoomJoined: false,
          isJitsiConnection: false,
          isMeetingEnded: { value: true, reason: reason },
          participantsIds: new Set(),
          participantsListing: [],
          remoteTracks: {},
          connectionQuality: {},
          isInConference: false,
        }));
      }
    },
    [
      cleanupLocalMediaTracks,
      getMeetingExitRoute,
      kickParticipant,
      navigate,
      requestRecordingStop,
      state?.roomInstance,
      state.jitsiConnection,
    ],
  );

  async function joinMeetHandler(subject: string, options?: { withVideo?: boolean }) {
    await initConference(subject, options);
  }

  // Simplified endMeeting for AV call components (backward compat with AvCallJitsiContext)
  const endMeeting = useCallback(
    async (withNavigate = false, reason = '') => {
      try {
        if (state.roomInstance && state.roomInstance.isJoined()) {
          await state.roomInstance.leave().then(() => {
            closeAvCallModal();
          });
        }
      } catch (err) {
        console.log({ err });
      } finally {
        await cleanupLocalMediaTracks();
        setAudioLevels({});

        try {
          await state.jitsiConnection?.disconnect?.();
        } catch (connectionErr) {
          console.log('Error disconnecting Jitsi connection', connectionErr);
        }

        setState((prev: any) => ({
          ...prev,
          roomCode: '',
          isRoomJoined: false,
          isLobbyJoined: false,
          waitingRoomJoined: false,
          localAudioTrack: null,
          localVideoTrack: null,
          cameraDeviceId: '',
          micDeviceId: '',
          isJitsiConnection: false,
          isInConference: false,
          roomInstance: null,
          jitsiConnection: null,
          isMeetingEnded: { value: true, reason: reason },
          participantsIds: new Set(),
          participantsListing: [],
          remoteTracks: {},
          connectionQuality: {},
        }));

        if (withNavigate && state?.isHost) {
          navigate(getMeetingExitRoute());
        }
      }
    },
    [
      cleanupLocalMediaTracks,
      getMeetingExitRoute,
      navigate,
      state.roomInstance,
      state.jitsiConnection,
    ],
  );

  const normalizeLanguageCode = (language: string = '') =>
    language.split(/[-_]/)[0]?.trim().toLowerCase();

  const updateSubtitleMessage = useCallback((newSubtitleMessage: any) => {
    setState((prev: any) => {
      const subtitlesData = [...(prev.subtitlesData || [])];
      const index = subtitlesData.findIndex(
        (msg: any) => msg?.participant === newSubtitleMessage?.participant,
      );
      if (index !== -1) {
        subtitlesData[index] = newSubtitleMessage;
      } else {
        subtitlesData.push(newSubtitleMessage);
      }

      return {
        ...prev,
        subtitlesData,
      };
    });
  }, []);

  const subtitlesListener = useCallback(
    (_participant: any, data: any) => {
      if (!data?.type) return;

      const selectedLanguage = subtitleLanguageRef.current || 'en';
      const selectedLanguageBase = normalizeLanguageCode(
        COUNTRY_CODES[selectedLanguage]?.[0] || 'en',
      );
      const dataLanguageBase = normalizeLanguageCode(data?.language || '');
      const isTranslationResult = data?.type === JSON_TYPE_TRANSLATION_RESULT;
      const isTranscriptionResult = data?.type === JSON_TYPE_TRANSCRIPTION_RESULT;

      if (isTranslationResult && dataLanguageBase === selectedLanguageBase) {
        updateSubtitleMessage({
          participant: data?.participant?.id,
          username: data?.participant?.name,
          message_id: data?.message_id,
          text: data?.text || '',
          language: data?.language,
          timestamp: data?.timestamp,
        });
        return;
      }

      if (!isTranscriptionResult || dataLanguageBase !== selectedLanguageBase) {
        return;
      }

      if (Number(data?.stability || 0) <= STABLE_SUBTITLE_FACTOR) {
        return;
      }

      const transcriptText = data?.transcript?.[0]?.text || '';
      updateSubtitleMessage({
        participant: data?.participant?.id,
        username: data?.participant?.name,
        message_id: data?.message_id,
        text: transcriptText,
        language: data?.language,
        timestamp: data?.timestamp,
      });
    },
    [updateSubtitleMessage],
  );

  const setLocalParticipantSubtitleLanguage = useCallback(
    (language: SubtitleLanguage = 'en') => {
      const roomInstance = state.roomInstance;
      const languageCodes = COUNTRY_CODES[language] || COUNTRY_CODES.en;
      roomInstance?.setLocalParticipantProperty(P_NAME_TRANSCRIPTION_LANGUAGE, languageCodes[1]);
      roomInstance?.setLocalParticipantProperty(P_NAME_TRANSLATION_LANGUAGE, languageCodes[0]);
    },
    [state.roomInstance],
  );

  const requestSubtitlesChange = useCallback(
    (enabled: boolean, language: SubtitleLanguage = 'en') => {
      const roomInstance = state.roomInstance;
      if (!roomInstance) return;

      if (!enabled) {
        if (roomInstance?.isJoined?.()) {
          roomInstance.setLocalParticipantProperty(P_NAME_REQUESTING_TRANSCRIPTION, false);
        }
        return;
      }

      setLocalParticipantSubtitleLanguage(language);

      if (
        roomInstance.getTranscriptionStatus() ===
        window.JitsiMeetJS.constants.transcriptionStatus.OFF
      ) {
        const randomDelay = Math.floor(Math.random() * 1500) + 500;
        setTimeout(() => {
          const isStillOff =
            roomInstance?.getTranscriptionStatus() ===
            window.JitsiMeetJS.constants.transcriptionStatus.OFF;

          if (!isStillOff) {
            roomInstance?.setLocalParticipantProperty(P_NAME_REQUESTING_TRANSCRIPTION, true);
            return;
          }

          const alreadyRequested = (roomInstance?.getParticipants?.() || []).some(
            (participant: any) => {
              const requestedValue = participant?.getProperty?.(P_NAME_REQUESTING_TRANSCRIPTION);
              return requestedValue === true || requestedValue === 'true';
            },
          );

          roomInstance?.setLocalParticipantProperty(P_NAME_REQUESTING_TRANSCRIPTION, true);
          if (!alreadyRequested) {
            roomInstance?.dial(TRANSCRIBER_DIAL_NUMBER).catch((error: any) => {
              console.error('Error dialing', error, 'FAILED TO START TRANSCRIPTION');
            });
          }
        }, randomDelay);
        return;
      }

      if (roomInstance?.isJoined?.()) {
        roomInstance.setLocalParticipantProperty(P_NAME_REQUESTING_TRANSCRIPTION, true);
      }
    },
    [setLocalParticipantSubtitleLanguage, state.roomInstance],
  );

  const enableSubtitles = useCallback(
    (language: SubtitleLanguage = 'en') => {
      const roomInstance = state.roomInstance;
      if (!roomInstance) return;

      subtitleLanguageRef.current = language;
      if (roomCode) {
        updateMeetingSubtitleLanguage(roomCode, language);
        updateMeetingSubtitleEnabled(roomCode, true);
      }
      setState((prev) => ({
        ...prev,
        subtitleLanguage: language,
        isUserSubtitlesOn: true,
      }));

      requestSubtitlesChange(true, language);
      roomInstance.off(
        window.JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED,
        subtitlesListener,
      );
      roomInstance.on(
        window.JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED,
        subtitlesListener,
      );
    },
    [
      requestSubtitlesChange,
      roomCode,
      state.roomInstance,
      subtitlesListener,
      updateMeetingSubtitleLanguage,
      updateMeetingSubtitleEnabled,
    ],
  );

  const disableSubtitles = useCallback(() => {
    const roomInstance = state.roomInstance;
    if (!roomInstance) return;

    requestSubtitlesChange(false);
    roomInstance.off(
      window.JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED,
      subtitlesListener,
    );

    setState((prev) => ({
      ...prev,
      isUserSubtitlesOn: false,
    }));
    if (roomCode) {
      updateMeetingSubtitleEnabled(roomCode, false);
    }
  }, [
    requestSubtitlesChange,
    roomCode,
    state.roomInstance,
    subtitlesListener,
    updateMeetingSubtitleEnabled,
  ]);

  const enableTranscription = useCallback(() => {
    enableSubtitles('en');
    setState((prev) => ({
      ...prev,
      isUserTranscriptionOn: true,
    }));
  }, [enableSubtitles]);

  const disableTranscription = useCallback(() => {
    disableSubtitles();
    setState((prev) => ({
      ...prev,
      isUserTranscriptionOn: false,
    }));
  }, [disableSubtitles]);

  const handleWhiteBoard = useCallback(
    (payload: any) => {
      const roomInstance = state.roomInstance;
      if (!roomInstance || !roomInstance.isJoined()) return;

      if (
        payload?.isWhiteBoardopen &&
        (state.isScreenShareEnabled || state.currentActiveScreenShareId)
      ) {
        handleAlert({ text: 'Cannot open whiteboard while screen is being shared', type: 'error' });
        return;
      }

      const actionPayload = {
        ...payload,
        startedBy:
          normalizeParticipantId(payload?.startedBy || roomInstance.myUserId?.()) ||
          payload?.startedBy ||
          '',
        startedByName: payload?.startedByName || state.userName || '',
        updatedAt: Date.now(),
      };

      try {
        roomInstance.sendCommand(WHITEBOARD_COMMAND, {
          value: JSON.stringify(actionPayload),
        });
        if (!actionPayload?.isWhiteBoardopen) {
          roomInstance.removeCommand(WHITEBOARD_COMMAND);
        }
      } catch (err) {
        console.log('WHITEBOARD_COMMAND sync failed', err);
      }

      setState((prev) => ({
        ...prev,
        whiteBoardState: actionPayload,
      }));
    },
    [state.roomInstance, state.userName],
  );

  const handlePresentatingView = (id: string = '') => {
    setState((prev) => ({
      ...prev,
      currentActiveScreenShareId: id,
    }));
  };

  const setVirtualBackgroundOptions = (options: any) => {
    setState((prev) => ({
      ...prev,
      virtualBackgroundOptions: options,
    }));
  };

  return (
    <JitsiContext.Provider
      value={{
        isJitsiLoaded,
        roomCode,
        setIsMember,
        createConnection,
        setRoomCode,
        setWaitingScreen,
        setLobbyRequestNotification,
        joinMeetHandler,
        handleTestMic,
        updateLocalVideoTrack,
        muteAVVideoTrack,
        muteAVAudioTrack,
        destroyAVTracks,
        initializeSystemAVConfig,
        handleAVVideoPreview,
        handleAVAudioPreview,
        handleChangeSpeakerDevice,
        getAVPermissions,
        setIsHost,
        setUserName,
        setUserEmail,
        setDisplayName,
        muteLocalVideoTrack,
        muteLocalAudioTrack,
        enableScreenShare,
        disableScreenShare,
        muteParticipantMic,
        muteParticipantCam,
        sendChatMessage,
        sendHandRaisedEvent,
        sendEmojiReaction,
        startRecording,
        stopRecording,
        endMeetingForSelf,
        endMeetingForAll,
        enableTranscription,
        disableTranscription,
        enableSubtitles,
        disableSubtitles,
        requestRoomAccessFromLobby,
        requestNotificationPermission,
        setLobbyScreen,
        approveRoomAccessFromLobby,
        declineRoomAccessFromLobby,
        handleWhiteBoard,
        handlePresentatingView,
        setVirtualBackgroundOptions,
        kickParticipant,
        endMeeting,
        setState,
        cleanupLocalMediaTracks,
        setMicDeviceId,
        setSpeakerDeviceId,
        setCameraDeviceId,
        ...state,
        audioLevels,
      }}
    >
      {children}
    </JitsiContext.Provider>
  );
};
