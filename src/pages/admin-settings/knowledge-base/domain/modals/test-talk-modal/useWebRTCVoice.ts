import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, createLocalAudioTrack } from 'livekit-client';
import { handleAlert } from '@/lib/utils';
import {
  createWebRTCVoiceSession,
  fetchRealtimeKnowledgeContext,
  finalizeAgentSession,
  reportWebRTCVoiceUsage,
} from '@/services/api';
import { BOOTSTRAP_HI_PCM_BASE64 } from './bootstrapHiPcmBase64';

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const NOOP = () => {};

const buildSessionLimitVoiceMessage = (limitMinutes: number) => {
  const safe = Math.max(1, Math.round(Number(limitMinutes) || 5));
  return `Session time limit reached (${safe} ${safe === 1 ? 'minute' : 'minutes'}). Ending now.`;
};

const buildRealtimeInstructionsWithKnowledge = (base: string, context: string) => {
  const b = String(base || '').trim();
  const c = String(context || '').trim();
  if (!b) return '';
  if (!c) return b;
  return `${b}\n\nUse this knowledge base context whenever relevant. If context is missing the answer, state that briefly.\nCONTEXT START\n${c}\nCONTEXT END`;
};

const extractAssistantTextFromResponse = (response: any): string => {
  const parts: string[] = [];
  (Array.isArray(response?.output) ? response.output : []).forEach((item: any) => {
    if (String(item?.role || '') !== 'assistant') return;
    (Array.isArray(item?.content) ? item.content : []).forEach((p: any) => {
      const t = String(p?.transcript || p?.text || p?.output_text || '').trim();
      if (t) parts.push(t);
    });
  });
  if (!parts.length) {
    const fb = String(response?.output_text || response?.text || '').trim();
    if (fb) parts.push(fb);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const base64ToBytes = (b64: string): Uint8Array => {
  const s = String(b64 || '').trim();
  if (!s) return new Uint8Array();
  const bin = window.atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  if (!bytes?.length) return '';
  let bin = '';
  const chunk = 0x8000;
  for (let o = 0; o < bytes.length; o += chunk)
    bin += String.fromCharCode(...(bytes.subarray(o, o + chunk) as any));
  return window.btoa(bin);
};

const BOOTSTRAP_HI_PCM_BYTES = base64ToBytes(BOOTSTRAP_HI_PCM_BASE64);
const BOOTSTRAP_HI_PCM_CHUNK_SIZE = 9600;

const elapsedMs = (end: number, start: number) =>
  !start || !end ? null : Math.max(0, end - start);

const buildVoiceLatencySnapshot = (trace: any, responseDoneAt = Date.now()) => ({
  bootstrapMs: elapsedMs(trace.bootstrapResolvedAt, trace.bootstrapRequestedAt),
  connectMs: elapsedMs(trace.iceConnectedAt || trace.dataChannelOpenedAt, trace.startedAt),
  firstResponseEventMs: elapsedMs(trace.firstResponseEventAt, trace.startedAt),
  firstTurnToFirstResponseMs: elapsedMs(trace.firstResponseEventAt, trace.firstTurnSentAt),
  firstRemoteAudioMs: elapsedMs(trace.firstRemoteAudioAt, trace.startedAt),
  responseDoneMs: elapsedMs(responseDoneAt, trace.startedAt),
});

// ─── Hook ─────────────────────────────────────────────────────────────────────
export interface UseWebRTCVoiceOptions {
  agentId: string;
  token: string;
  sessionToken?: string;
  agentData?: any;
  preferredProvider?: 'livekit' | 'azure' | 'openai' | 'google' | string;
}

export function useWebRTCVoice({ agentId, token, preferredProvider }: UseWebRTCVoiceOptions) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [statusText, setStatusText] = useState('Ready to start');
  const [sessionId, setSessionId] = useState('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<any>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const livekitLocalAudioTrackRef = useRef<any>(null);
  const startAttemptRef = useRef(0);
  const sessionFinalizedRef = useRef(false);
  const activeSessionIdRef = useRef('');
  const activeModelRef = useRef('');
  const firstResponseTextRef = useRef('');
  const baseRealtimeInstructionsRef = useRef('');
  const activeRealtimeKnowledgeContextRef = useRef('');
  const lastKnowledgeLookupTextRef = useRef('');
  const latestUserTextRef = useRef('');
  const assistantDeltaByResponseRef = useRef<Record<string, string>>({});
  const reportedResponseIdsRef = useRef(new Set<string>());
  const provisionalResponseIdsRef = useRef(new Set<string>());
  const responseUserTextByIdRef = useRef<Record<string, string>>({});
  const pendingVoiceInputTurnsRef = useRef(0);
  const firstTurnDispatchCountRef = useRef(0);
  const firstTurnResponseStartedRef = useRef(false);
  const firstAssistantOutputSeenRef = useRef(false);
  const userSpeechDetectedRef = useRef(false);
  const firstRemoteAudioMarkedRef = useRef(false);
  const playbackReadyMarkedRef = useRef(false);
  const firstTurnRetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstTurnHardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstTurnHardRetryCountRef = useRef(0);
  const firstTurnLastAttemptAtRef = useRef(0);
  const firstResponseFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syntheticBootstrapCommittedRef = useRef(false);
  const sessionRestartCountRef = useRef(0);
  const sessionLimitReachedRef = useRef(false);
  const sessionLimitHandlerRef = useRef<(msg: string) => void>(NOOP);
  const sessionLimitVoiceMessageRef = useRef(buildSessionLimitVoiceMessage(5));
  const sessionLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionLimitCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionLimitFinalizeCleanupRef = useRef<() => void>(NOOP);
  const sessionLimitAnnouncementActiveRef = useRef(false);
  const sessionLimitAnnouncementAttemptsRef = useRef(0);
  const sessionLimitAnnouncementMessageRef = useRef('');
  const sessionReadyRef = useRef(false);
  const dataChannelOpenRef = useRef(false);
  const activeRemoteStreamIdRef = useRef('');
  const fallbackUsageSentRef = useRef(false);
  const fullSessionInstructionsAppliedRef = useRef(false);
  const webrtcTraceRef = useRef({
    clientTraceId: '',
    startedAt: 0,
    bootstrapRequestedAt: 0,
    bootstrapResolvedAt: 0,
    mediaReadyAt: 0,
    offerCreatedAt: 0,
    localDescriptionSetAt: 0,
    sdpRequestedAt: 0,
    sdpAnsweredAt: 0,
    remoteDescriptionSetAt: 0,
    iceConnectedAt: 0,
    remoteTrackAt: 0,
    firstRemoteAudioAt: 0,
    dataChannelOpenedAt: 0,
    firstTurnSentAt: 0,
    firstResponseEventAt: 0,
  });
  const unmountCleanupRef = useRef<any>({ stopWebRTCSession: NOOP, teardownWebRTCSession: NOOP });

  // ── reportRealtimeUsage ─────────────────────────────────────────────────────
  const reportRealtimeUsage = useCallback(
    async (payload: any) => {
      if (!activeSessionIdRef.current) return;
      if (payload.responseId && reportedResponseIdsRef.current.has(payload.responseId)) return;
      try {
        const resp = await reportWebRTCVoiceUsage({
          token,
          agentId,
          sessionId: activeSessionIdRef.current,
          ...payload,
        });
        const d = (resp as any)?.data || {};
        if (d?.limitExceeded) {
          sessionLimitHandlerRef.current(
            String(d?.message || sessionLimitVoiceMessageRef.current).trim(),
          );
          return;
        }
        if (d?.collectionCompleted) {
          sessionLimitHandlerRef.current(String(d?.message || 'Session ending.').trim());
          return;
        }
        if (d?.reaskRequired) {
          const ch = dataChannelRef.current;
          try {
            ch.send(
              JSON.stringify({
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio'],
                  instructions: `Say exactly this in one short sentence, then stop: ${d.message}`,
                },
              }),
            );
          } catch {
            /* ignore */
          }
        }
        if (payload.responseId && !payload.allowFollowup)
          reportedResponseIdsRef.current.add(payload.responseId);
      } catch {
        console.error('WebRTC usage report failed');
      }
    },
    [agentId, token],
  );

  // ── updateRealtimeKnowledgeForTurn ─────────────────────────────────────────
  const updateRealtimeKnowledgeForTurn = useCallback(
    async (userText: string) => {
      const safe = String(userText || '').trim();
      if (!safe || !token || !agentId || !activeSessionIdRef.current) return;
      const norm = safe.toLowerCase();
      if (norm === lastKnowledgeLookupTextRef.current) return;
      lastKnowledgeLookupTextRef.current = norm;
      try {
        const resp = await fetchRealtimeKnowledgeContext({
          token,
          agentId,
          sessionId: activeSessionIdRef.current,
          userText: safe,
          source: 'voice_webrtc',
        });
        const d = (resp as any)?.data || {};
        const base = String(baseRealtimeInstructionsRef.current || '').trim();
        if (!base) return;
        const ctx = String(d?.knowledgeContext || '').trim();
        if (ctx === activeRealtimeKnowledgeContextRef.current) return;
        const ch = dataChannelRef.current;
        if (!ch || ch.readyState !== 'open') return;
        const instructions = buildRealtimeInstructionsWithKnowledge(base, ctx);
        if (!instructions) return;
        activeRealtimeKnowledgeContextRef.current = ctx;
        ch.send(JSON.stringify({ type: 'session.update', session: { instructions } }));
      } catch {
        console.error('Knowledge context update failed');
      }
    },
    [agentId, token],
  );

  // ── resolveUserTextForResponse ──────────────────────────────────────────────
  const resolveUserTextForResponse = useCallback((responseId = '') => {
    const id = String(responseId || '').trim();
    if (id && typeof responseUserTextByIdRef.current[id] === 'string')
      return responseUserTextByIdRef.current[id];
    const explicit = String(latestUserTextRef.current || '').trim();
    if (explicit) {
      if (id) responseUserTextByIdRef.current[id] = explicit;
      latestUserTextRef.current = '';
      return explicit;
    }
    if (pendingVoiceInputTurnsRef.current > 0) {
      pendingVoiceInputTurnsRef.current--;
      if (id) responseUserTextByIdRef.current[id] = '[Voice input]';
      return '[Voice input]';
    }
    if (id) responseUserTextByIdRef.current[id] = '';
    return '';
  }, []);

  // ── teardownWebRTCSession ───────────────────────────────────────────────────
  const teardownWebRTCSession = useCallback((updateUi = true) => {
    startAttemptRef.current += 1;
    [
      sessionLimitCleanupTimerRef,
      sessionLimitTimerRef,
      firstTurnHardTimeoutRef,
      firstResponseFallbackTimerRef,
    ].forEach((r) => {
      if (r.current) {
        clearTimeout(r.current as any);
        r.current = null;
      }
    });
    if (firstTurnRetryTimerRef.current) {
      clearInterval(firstTurnRetryTimerRef.current);
      firstTurnRetryTimerRef.current = null;
    }
    sessionLimitFinalizeCleanupRef.current = NOOP;
    sessionLimitAnnouncementActiveRef.current = false;
    sessionLimitAnnouncementAttemptsRef.current = 0;
    sessionLimitAnnouncementMessageRef.current = '';
    sessionLimitReachedRef.current = false;
    try {
      dataChannelRef.current?.close();
    } catch {
      /* ignore */
    }
    dataChannelRef.current = null;
    try {
      if (livekitLocalAudioTrackRef.current) {
        livekitLocalAudioTrackRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    livekitLocalAudioTrackRef.current = null;
    try {
      livekitRoomRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    livekitRoomRef.current = null;
    try {
      if (pcRef.current) {
        pcRef.current.ontrack = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.close();
      }
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    localStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.onplaying = null;
      remoteAudioRef.current.srcObject = null;
    }
    activeRemoteStreamIdRef.current = '';
    assistantDeltaByResponseRef.current = {};
    reportedResponseIdsRef.current.clear();
    provisionalResponseIdsRef.current.clear();
    responseUserTextByIdRef.current = {};
    pendingVoiceInputTurnsRef.current = 0;
    latestUserTextRef.current = '';
    firstResponseTextRef.current = '';
    baseRealtimeInstructionsRef.current = '';
    activeRealtimeKnowledgeContextRef.current = '';
    lastKnowledgeLookupTextRef.current = '';
    firstTurnDispatchCountRef.current = 0;
    firstTurnResponseStartedRef.current = false;
    firstAssistantOutputSeenRef.current = false;
    userSpeechDetectedRef.current = false;
    firstRemoteAudioMarkedRef.current = false;
    playbackReadyMarkedRef.current = false;
    firstTurnLastAttemptAtRef.current = 0;
    firstTurnHardRetryCountRef.current = 0;
    syntheticBootstrapCommittedRef.current = false;
    sessionReadyRef.current = false;
    dataChannelOpenRef.current = false;
    fallbackUsageSentRef.current = false;
    fullSessionInstructionsAppliedRef.current = false;
    webrtcTraceRef.current.firstRemoteAudioAt = 0;
    if (updateUi) {
      sessionRestartCountRef.current = 0;
      setStatusText('Ready to start');
      setIsSessionActive(false);
      setIsConnecting(false);
      setIsDisconnecting(false);
    } else {
      setIsDisconnecting(false);
    }
  }, []);

  // ── emitSessionFallbackUsage ────────────────────────────────────────────────
  const emitSessionFallbackUsage = useCallback(async () => {
    const sid = String(activeSessionIdRef.current || '').trim();
    if (!sid || fallbackUsageSentRef.current) return;
    if (reportedResponseIdsRef.current.size > 0 || provisionalResponseIdsRef.current.size > 0)
      return;
    if (!firstTurnResponseStartedRef.current && !firstRemoteAudioMarkedRef.current) return;
    fallbackUsageSentRef.current = true;
    try {
      await reportWebRTCVoiceUsage({
        token,
        agentId,
        sessionId: sid,
        responseId: `session-fallback-${Date.now()}`,
        userText: '',
        assistantText: '',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        model: activeModelRef.current || undefined,
        latency: buildVoiceLatencySnapshot(webrtcTraceRef.current),
      });
    } catch {
      fallbackUsageSentRef.current = false;
    }
  }, [agentId, token]);

  // ── stopWebRTCSession ───────────────────────────────────────────────────────
  const stopWebRTCSession = useCallback(
    async (updateUi = true) => {
      setIsDisconnecting(true);
      await emitSessionFallbackUsage();
      const sid = String(activeSessionIdRef.current || '').trim();
      if (sid && !sessionFinalizedRef.current) {
        try {
          await finalizeAgentSession({
            token,
            agentId,
            sessionId: sid,
            source: 'talk_ui_stop',
            endReason: sessionLimitReachedRef.current ? 'session_limit_reached' : 'manual_end',
          });
          sessionFinalizedRef.current = true;
        } catch {
          /* ignore */
        }
      }
      teardownWebRTCSession(updateUi);
      setIsDisconnecting(false);
    },
    [agentId, emitSessionFallbackUsage, teardownWebRTCSession, token],
  );

  // ── startWebRTCSession ──────────────────────────────────────────────────────
  const startWebRTCSession = useCallback(async () => {
    if (isConnecting || isSessionActive) return;
    if (!agentId || !token) {
      setStatusText('Unable to connect');
      return;
    }
    setIsConnecting(true);
    setStatusText('Connecting to Agent...');
    const attemptId = startAttemptRef.current + 1;
    startAttemptRef.current = attemptId;
    const isStale = () => startAttemptRef.current !== attemptId;
    const clientTraceId = `webrtc-ui-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    webrtcTraceRef.current = {
      clientTraceId,
      startedAt: Date.now(),
      bootstrapRequestedAt: Date.now(),
      bootstrapResolvedAt: 0,
      mediaReadyAt: 0,
      offerCreatedAt: 0,
      localDescriptionSetAt: 0,
      sdpRequestedAt: 0,
      sdpAnsweredAt: 0,
      remoteDescriptionSetAt: 0,
      iceConnectedAt: 0,
      remoteTrackAt: 0,
      firstRemoteAudioAt: 0,
      dataChannelOpenedAt: 0,
      firstTurnSentAt: 0,
      firstResponseEventAt: 0,
    };
    firstTurnDispatchCountRef.current = 0;
    firstTurnResponseStartedRef.current = false;
    firstAssistantOutputSeenRef.current = false;
    userSpeechDetectedRef.current = false;
    firstRemoteAudioMarkedRef.current = false;
    playbackReadyMarkedRef.current = false;
    firstTurnLastAttemptAtRef.current = 0;
    firstTurnHardRetryCountRef.current = 0;
    syntheticBootstrapCommittedRef.current = false;
    sessionReadyRef.current = false;
    dataChannelOpenRef.current = false;
    fallbackUsageSentRef.current = false;
    fullSessionInstructionsAppliedRef.current = false;
    sessionLimitReachedRef.current = false;
    reportedResponseIdsRef.current.clear();
    provisionalResponseIdsRef.current.clear();
    firstResponseTextRef.current = '';
    baseRealtimeInstructionsRef.current = '';
    activeRealtimeKnowledgeContextRef.current = '';

    const MAX_SESSION_RESTARTS = 4;
    const INITIAL_FIRST_TURN_DELAY_MS = 100;
    const FIRST_RESPONSE_FALLBACK_DELAY_MS = 2000;
    const FIRST_TURN_HARD_TIMEOUT_MS = 5000;
    const FIRST_TURN_STARTUP_DEADLINE_MS = 10000;
    const CONNECTION_STARTUP_DEADLINE_MS = 30000;
    const MAX_FIRST_TURN_ATTEMPTS = 2;

    try {
      const bootstrap = await createWebRTCVoiceSession({
        token,
        agentId,
        clientTraceId,
        preferredProvider: String(preferredProvider || '').trim() || undefined,
      });
      if (isStale()) return;
      webrtcTraceRef.current.bootstrapResolvedAt = Date.now();
      const bd = (bootstrap as any)?.data || {};
      const sessionLimitMinutes = Number(bd?.sessionLimitMinutes || 0);
      sessionLimitVoiceMessageRef.current = buildSessionLimitVoiceMessage(sessionLimitMinutes);
      if (bd?.limitExceeded) {
        sessionLimitHandlerRef.current(
          String(bd?.message || sessionLimitVoiceMessageRef.current).trim(),
        );
        return;
      }
      const appSessionId = bd?.sessionId;
      const clientSecret = bd?.webrtc?.clientSecret;
      const model = bd?.webrtc?.model;
      const provider = String(bd?.webrtc?.provider || 'azure')
        .trim()
        .toLowerCase();
      const azureResource = String(bd?.webrtc?.azureResource || '');
      const openaiBaseUrl = String(bd?.webrtc?.openaiBaseUrl || 'https://api.openai.com/v1')
        .trim()
        .replace(/\/+$/, '');
      const sessionExpiresAtMs = Date.parse(String(bd?.sessionExpiresAt || ''));
      const shouldSpeakFirst = bd?.webrtc?.firstResponse?.shouldSpeakFirst !== false;
      firstResponseTextRef.current = String(bd?.webrtc?.firstResponse?.exactText || '').trim();
      baseRealtimeInstructionsRef.current = String(bd?.webrtc?.instructionsBase || '').trim();
      activeRealtimeKnowledgeContextRef.current = String(
        bd?.webrtc?.startupKnowledgeContext || '',
      ).trim();
      if (!model || (provider !== 'google' && !clientSecret))
        throw new Error('Missing realtime model or credentials');
      if (appSessionId) {
        setSessionId(appSessionId);
        activeSessionIdRef.current = appSessionId;
        sessionFinalizedRef.current = false;
      }
      if (
        ((Number.isFinite(sessionExpiresAtMs) && sessionExpiresAtMs > 0) ||
          sessionLimitMinutes > 0) &&
        !sessionLimitTimerRef.current
      ) {
        const delay =
          Number.isFinite(sessionExpiresAtMs) && sessionExpiresAtMs > 0
            ? Math.max(1000, Math.round(sessionExpiresAtMs - Date.now()))
            : Math.max(1000, Math.round(sessionLimitMinutes * 60000));
        sessionLimitTimerRef.current = setTimeout(
          () => sessionLimitHandlerRef.current(sessionLimitVoiceMessageRef.current),
          delay,
        );
      }
      activeModelRef.current = String(model || '').trim();

      if (provider === 'livekit') {
        const lk = bd?.webrtc?.livekit || bd?.livekit || {};
        const livekitUrl = String(lk?.url || bd?.webrtc?.livekitUrl || bd?.livekitUrl || '').trim();
        const livekitToken = String(
          lk?.token || bd?.webrtc?.livekitToken || bd?.livekitToken || clientSecret || '',
        ).trim();
        if (!livekitUrl || !livekitToken) throw new Error('Missing LiveKit connection details');
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          reconnectPolicy: {
            nextRetryDelayInMs: () => null,
          } as any,
        });
        livekitRoomRef.current = room;
        let livekitEndHandled = false;
        const endLivekitSession = (status = 'Call ended') => {
          if (livekitEndHandled) return;
          livekitEndHandled = true;
          teardownWebRTCSession(false);
          setStatusText(status);
          setIsSessionActive(false);
          setIsConnecting(false);
        };

        room.on(RoomEvent.TrackSubscribed, (track: any) => {
          if (track?.kind !== 'audio' || !remoteAudioRef.current) return;
          track.attach(remoteAudioRef.current);
          remoteAudioRef.current.play().catch(() => {});
        });
        room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
          try {
            track?.detach?.().forEach((el: any) => {
              if (el && typeof el.remove === 'function') el.remove();
            });
          } catch {
            /* ignore */
          }
        });
        room.on(RoomEvent.Reconnecting, () => {
          setStatusText('Call ending...');
        });
        room.on(RoomEvent.ParticipantDisconnected, () => {
          if (room.remoteParticipants.size === 0) endLivekitSession();
        });
        room.on(RoomEvent.Disconnected, () => {
          endLivekitSession();
        });

        await room.connect(livekitUrl, livekitToken, { autoSubscribe: true });
        if (isStale()) {
          try {
            room.disconnect();
          } catch {
            /* ignore */
          }
          return;
        }
        const localAudioTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        } as MediaTrackConstraints);
        livekitLocalAudioTrackRef.current = localAudioTrack;
        await room.localParticipant.publishTrack(localAudioTrack);
        room.remoteParticipants.forEach((participant: any) => {
          participant.trackPublications.forEach((publication: any) => {
            if (
              !publication?.track ||
              publication.track.kind !== 'audio' ||
              !remoteAudioRef.current
            )
              return;
            publication.track.attach(remoteAudioRef.current);
            remoteAudioRef.current.play().catch(() => {});
          });
        });
        setStatusText('Integration is live');
        setIsSessionActive(true);
        setIsConnecting(false);
        return;
      }

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      if (isStale()) {
        try {
          localStream.getTracks().forEach((t) => t.stop());
        } catch {
          /* ignore */
        }
        return;
      }
      localStreamRef.current = localStream;
      webrtcTraceRef.current.mediaReadyAt = Date.now();

      const failInitialSpeechStart = (_: string) => {
        console.log('failInitialSpeechStart', _);
        if (sessionRestartCountRef.current < MAX_SESSION_RESTARTS) {
          sessionRestartCountRef.current++;
          teardownWebRTCSession(false);
          setStatusText('Retrying agent startup...');
          setIsConnecting(false);
          setIsSessionActive(false);
          setTimeout(() => startWebRTCSession(), 350);
          return;
        }
        teardownWebRTCSession(false);
        setStatusText('Agent did not start speaking. Please retry.');
        setIsConnecting(false);
        setIsSessionActive(false);
        handleAlert({ text: 'Agent did not start speaking. Please retry.', type: 'error' });
      };

      const clearFirstResponseFallback = () => {
        if (firstResponseFallbackTimerRef.current) {
          clearTimeout(firstResponseFallbackTimerRef.current);
          firstResponseFallbackTimerRef.current = null;
        }
      };
      const clearFirstTurnHardTimeout = () => {
        if (firstTurnHardTimeoutRef.current) {
          clearTimeout(firstTurnHardTimeoutRef.current);
          firstTurnHardTimeoutRef.current = null;
        }
      };

      const markInteractionLive = () => {
        if (playbackReadyMarkedRef.current) return;
        playbackReadyMarkedRef.current = true;
        setStatusText('Integration is live');
        setIsSessionActive(true);
        setIsConnecting(false);
      };

      const syncFullSessionInstructions = () => {
        if (fullSessionInstructionsAppliedRef.current) return;
        const ch = dataChannelRef.current;
        if (!ch || ch.readyState !== 'open') return;
        const instructions = buildRealtimeInstructionsWithKnowledge(
          baseRealtimeInstructionsRef.current,
          activeRealtimeKnowledgeContextRef.current,
        );
        if (!instructions) return;
        try {
          ch.send(JSON.stringify({ type: 'session.update', session: { instructions } }));
          fullSessionInstructionsAppliedRef.current = true;
        } catch {
          /* ignore */
        }
      };

      const scheduleFirstResponseFallback = () => {
        clearFirstResponseFallback();
        if (
          !shouldSpeakFirst ||
          !webrtcTraceRef.current.firstTurnSentAt ||
          firstAssistantOutputSeenRef.current
        )
          return;
        firstResponseFallbackTimerRef.current = setTimeout(() => {
          firstResponseFallbackTimerRef.current = null;
          if (firstAssistantOutputSeenRef.current) return;
          if (firstTurnDispatchCountRef.current >= MAX_FIRST_TURN_ATTEMPTS) {
            failInitialSpeechStart('no-output');
            return;
          }
          triggerAssistantFirstTurn('no-assistant-output-retry');
          scheduleFirstResponseFallback();
        }, FIRST_RESPONSE_FALLBACK_DELAY_MS);
      };

      const scheduleFirstTurnHardTimeout = () => {
        clearFirstTurnHardTimeout();
        if (
          !shouldSpeakFirst ||
          !webrtcTraceRef.current.firstTurnSentAt ||
          firstAssistantOutputSeenRef.current
        )
          return;
        firstTurnHardTimeoutRef.current = setTimeout(() => {
          firstTurnHardTimeoutRef.current = null;
          if (firstAssistantOutputSeenRef.current) return;
          if (firstTurnHardRetryCountRef.current < 2) {
            firstTurnHardRetryCountRef.current++;
            triggerAssistantFirstTurn('hard-timeout-retry');
            scheduleFirstResponseFallback();
            return;
          }
          failInitialSpeechStart('hard-timeout');
        }, FIRST_TURN_HARD_TIMEOUT_MS);
      };

      async function sendSyntheticBootstrapAudio(channel: any) {
        if (syntheticBootstrapCommittedRef.current || !BOOTSTRAP_HI_PCM_BYTES.length) return false;
        for (let o = 0; o < BOOTSTRAP_HI_PCM_BYTES.length; o += BOOTSTRAP_HI_PCM_CHUNK_SIZE)
          channel.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: bytesToBase64(
                BOOTSTRAP_HI_PCM_BYTES.subarray(o, o + BOOTSTRAP_HI_PCM_CHUNK_SIZE),
              ),
            }),
          );
        channel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        syntheticBootstrapCommittedRef.current = true;
        return true;
      }

      async function triggerAssistantFirstTurn(reason = 'unknown') {
        if (!shouldSpeakFirst || firstAssistantOutputSeenRef.current) return;
        const retryReasons = new Set([
          'no-assistant-output-retry',
          'hard-timeout-retry',
          'provider-active-response',
          'startup-watchdog',
          'session.created',
          'session.updated',
        ]);
        if (
          firstTurnResponseStartedRef.current &&
          ![
            'no-assistant-output-retry',
            'hard-timeout-retry',
            'provider-active-response',
            'startup-watchdog',
          ].includes(reason)
        )
          return;
        if (firstTurnDispatchCountRef.current > 0 && !retryReasons.has(reason)) return;
        const now = Date.now();
        const ch = dataChannelRef.current;
        if (!ch || ch.readyState !== 'open') {
          scheduleFirstResponseFallback();
          return;
        }
        if (firstTurnDispatchCountRef.current >= MAX_FIRST_TURN_ATTEMPTS) return;
        if (firstTurnLastAttemptAtRef.current && now - firstTurnLastAttemptAtRef.current < 1200)
          return;
        firstTurnDispatchCountRef.current++;
        firstTurnLastAttemptAtRef.current = now;
        if (!webrtcTraceRef.current.firstTurnSentAt) webrtcTraceRef.current.firstTurnSentAt = now;
        try {
          try {
            ch.send(JSON.stringify({ type: 'response.cancel' }));
          } catch {
            /* ignore */
          }
          if (!(await sendSyntheticBootstrapAudio(ch)))
            throw new Error('Bootstrap audio unavailable');
          ch.send(
            JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
                instructions: firstResponseTextRef.current
                  ? `Ignore any prior bootstrap audio. Say exactly this sentence and nothing else: ${firstResponseTextRef.current}`
                  : undefined,
              },
            }),
          );
          scheduleFirstResponseFallback();
          scheduleFirstTurnHardTimeout();
        } catch (e) {
          console.error('First-turn kickoff failed:', e);
        }
      }

      function maybeMarkInteractionLive(_ = 'unknown') {
        console.log('maybeMarkInteractionLive', _);
        if (
          playbackReadyMarkedRef.current ||
          !dataChannelOpenRef.current ||
          !webrtcTraceRef.current.iceConnectedAt
        )
          return;
        if (shouldSpeakFirst && !firstAssistantOutputSeenRef.current) return;
        if (
          !shouldSpeakFirst &&
          !firstAssistantOutputSeenRef.current &&
          !userSpeechDetectedRef.current
        )
          return;
        markInteractionLive();
      }

      // ── Data channel message handler ─────────────────────────────────────────
      const assistantOutputEventTypes = new Set([
        'response.output_audio.delta',
        'response.output_audio.done',
        'response.content_part.added',
        'response.content_part.done',
        'response.output_text.delta',
        'response.output_audio_transcript.delta',
        'response.output_audio_transcript.done',
        'response.audio.delta',
        'response.audio.done',
        'response.text.delta',
        'response.text.done',
        'response.audio_transcript.delta',
        'response.audio_transcript.done',
      ]);

      function handleDataChannelMessage(raw: string) {
        if (isStale()) return;
        let e: any;
        try {
          e = JSON.parse(raw || '{}');
        } catch {
          return;
        }
        const t = String(e?.type || '');
        if (t === 'error') {
          const code = String(e?.error?.code || '').trim();
          if (
            code === 'conversation_already_has_active_response' &&
            dataChannelRef.current?.readyState === 'open'
          ) {
            try {
              dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }));
            } catch {
              /* ignore */
            }
            setTimeout(() => {
              if (!firstAssistantOutputSeenRef.current)
                triggerAssistantFirstTurn('provider-active-response');
            }, 350);
          }
          return;
        }
        if (t === 'input_audio_buffer.committed') {
          pendingVoiceInputTurnsRef.current++;
          return;
        }
        if (t === 'session.created' || t === 'session.updated') {
          sessionReadyRef.current = true;
          triggerAssistantFirstTurn(t);
          maybeMarkInteractionLive(t);
          return;
        }
        if (t === 'conversation.item.input_audio_transcription.completed') {
          const tr = String(e?.transcript || '').trim();
          if (tr) {
            latestUserTextRef.current = tr;
            if (!shouldSpeakFirst || firstAssistantOutputSeenRef.current) {
              userSpeechDetectedRef.current = true;
              clearFirstResponseFallback();
            }
            void updateRealtimeKnowledgeForTurn(tr);
          }
          return;
        }
        const responseId = String(e?.response_id || e?.response?.id || '').trim();
        const isFinal = t === 'response.done' || t === 'response.completed';
        if (t === 'response.output_text.delta' || t === 'response.output_audio_transcript.delta') {
          const delta = String(e?.delta || '');
          if (responseId && delta)
            assistantDeltaByResponseRef.current[responseId] =
              (assistantDeltaByResponseRef.current[responseId] || '') + delta;
        }
        if (t === 'response.created') {
          firstTurnResponseStartedRef.current = true;
          if (!webrtcTraceRef.current.firstResponseEventAt)
            webrtcTraceRef.current.firstResponseEventAt = Date.now();
          scheduleFirstResponseFallback();
        }
        const isAssistantOutput = assistantOutputEventTypes.has(t);
        if (isAssistantOutput) {
          firstAssistantOutputSeenRef.current = true;
          firstTurnResponseStartedRef.current = true;
          clearFirstTurnHardTimeout();
          if (firstTurnRetryTimerRef.current) {
            clearInterval(firstTurnRetryTimerRef.current);
            firstTurnRetryTimerRef.current = null;
          }
          clearFirstResponseFallback();
          syncFullSessionInstructions();
          markInteractionLive();
        }
        if (t === 'response.output_audio.done' || isFinal) {
          const rp = e?.response || {};
          const rid = String(rp?.id || e?.response_id || '').trim();
          const usage = rp?.usage || e?.usage || {};
          const promptTokens = Math.max(
            0,
            Number(usage?.input_tokens ?? usage?.prompt_tokens ?? 0) || 0,
          );
          const completionTokens = Math.max(
            0,
            Number(usage?.output_tokens ?? usage?.completion_tokens ?? 0) || 0,
          );
          const totalTokens = Math.max(
            0,
            Number(usage?.total_tokens ?? promptTokens + completionTokens) || 0,
          );
          const aText = String(
            extractAssistantTextFromResponse(rp) || assistantDeltaByResponseRef.current[rid] || '',
          ).trim();
          if (aText) {
            firstAssistantOutputSeenRef.current = true;
            clearFirstResponseFallback();
            markInteractionLive();
          }
          const snap = buildVoiceLatencySnapshot(webrtcTraceRef.current, Date.now());
          reportRealtimeUsage({
            responseId: rid,
            userText: resolveUserTextForResponse(rid),
            assistantText: aText,
            promptTokens,
            completionTokens,
            totalTokens,
            model: String(rp?.model || activeModelRef.current || ''),
            clientTraceId,
            latency: snap,
            allowFollowup: !isFinal,
            eventTypeHint: t,
          });
          if (isFinal && rid) {
            provisionalResponseIdsRef.current.delete(rid);
            delete assistantDeltaByResponseRef.current[rid];
            delete responseUserTextByIdRef.current[rid];
          }
        }
      }

      // ── Build PeerConnection ─────────────────────────────────────────────────
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.ontrack = (ev) => {
        if (!webrtcTraceRef.current.remoteTrackAt)
          webrtcTraceRef.current.remoteTrackAt = Date.now();
        const [stream] = ev.streams;
        if (remoteAudioRef.current && stream) {
          if (activeRemoteStreamIdRef.current === stream.id) return;
          activeRemoteStreamIdRef.current = stream.id;
          remoteAudioRef.current.srcObject = stream;
          if (!firstRemoteAudioMarkedRef.current) {
            remoteAudioRef.current.onplaying = () => {
              if (firstRemoteAudioMarkedRef.current) return;
              firstRemoteAudioMarkedRef.current = true;
              webrtcTraceRef.current.firstRemoteAudioAt = Date.now();
              if (firstAssistantOutputSeenRef.current) maybeMarkInteractionLive('audio-playing');
            };
          }
          remoteAudioRef.current.play().catch(() => {});
        }
      };
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          if (!webrtcTraceRef.current.iceConnectedAt)
            webrtcTraceRef.current.iceConnectedAt = Date.now();
          maybeMarkInteractionLive('ice-connected');
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setStatusText('Call disconnected');
          setIsSessionActive(false);
          setIsConnecting(false);
        }
      };
      const dataChannelLabel = provider === 'azure' ? 'realtime-channel' : 'oai-events';
      const dataChannel = pc.createDataChannel(dataChannelLabel);
      dataChannelRef.current = dataChannel;
      dataChannel.onopen = () => {
        webrtcTraceRef.current.dataChannelOpenedAt = Date.now();
        dataChannelOpenRef.current = true;
        setTimeout(() => {
          if (!isStale()) triggerAssistantFirstTurn('data-channel-open');
        }, INITIAL_FIRST_TURN_DELAY_MS);
        maybeMarkInteractionLive('data-channel-open');
      };
      dataChannel.onclose = () => {
        dataChannelOpenRef.current = false;
        clearFirstTurnHardTimeout();
        clearFirstResponseFallback();
      };
      dataChannel.onmessage = (ev) => handleDataChannelMessage(ev.data);

      if (shouldSpeakFirst) {
        firstTurnRetryTimerRef.current = setInterval(() => {
          if (isStale()) {
            if (firstTurnRetryTimerRef.current) {
              clearInterval(firstTurnRetryTimerRef.current);
              firstTurnRetryTimerRef.current = null;
            }
            return;
          }
          if (firstAssistantOutputSeenRef.current) {
            if (firstTurnRetryTimerRef.current) {
              clearInterval(firstTurnRetryTimerRef.current);
              firstTurnRetryTimerRef.current = null;
            }
            return;
          }
          const elapsed =
            webrtcTraceRef.current.startedAt > 0
              ? Date.now() - webrtcTraceRef.current.startedAt
              : 0;
          if (!dataChannelOpenRef.current) {
            if (elapsed >= CONNECTION_STARTUP_DEADLINE_MS) {
              if (firstTurnRetryTimerRef.current) {
                clearInterval(firstTurnRetryTimerRef.current);
                firstTurnRetryTimerRef.current = null;
              }
              failInitialSpeechStart('connection-startup-deadline');
            }
            return;
          }
          if (!webrtcTraceRef.current.firstTurnSentAt) {
            triggerAssistantFirstTurn('startup-watchdog');
            return;
          }
          const firstTurnElapsed = Math.max(0, Date.now() - webrtcTraceRef.current.firstTurnSentAt);
          if (firstTurnElapsed >= FIRST_TURN_STARTUP_DEADLINE_MS) {
            if (firstTurnRetryTimerRef.current) {
              clearInterval(firstTurnRetryTimerRef.current);
              firstTurnRetryTimerRef.current = null;
            }
            failInitialSpeechStart('startup-deadline');
            return;
          }
          triggerAssistantFirstTurn('startup-watchdog');
        }, 1200);
      }

      // ── Session limit handler ─────────────────────────────────────────────────
      sessionLimitHandlerRef.current = (message: string) => {
        if (sessionLimitReachedRef.current) return;
        sessionLimitReachedRef.current = true;
        handleAlert({ text: message, type: 'info' });
        setStatusText('Session time limit reached');
        setIsSessionActive(false);
        setIsConnecting(false);
        sessionLimitAnnouncementMessageRef.current = message;
        sessionLimitAnnouncementAttemptsRef.current = 0;
        sessionLimitAnnouncementActiveRef.current = false;
        const cleanup = () => {
          if (sessionLimitCleanupTimerRef.current) {
            clearTimeout(sessionLimitCleanupTimerRef.current);
            sessionLimitCleanupTimerRef.current = null;
          }
          const sid = String(activeSessionIdRef.current || '').trim();
          if (sid && !sessionFinalizedRef.current) {
            finalizeAgentSession({
              token,
              agentId,
              sessionId: sid,
              source: 'talk_ui_limit',
              endReason: 'session_limit_reached',
            })
              .catch(() => {})
              .finally(() => {
                sessionFinalizedRef.current = true;
                teardownWebRTCSession();
              });
            return;
          }
          teardownWebRTCSession();
        };
        sessionLimitFinalizeCleanupRef.current = cleanup;
        sessionLimitCleanupTimerRef.current = setTimeout(cleanup, 1200);
      };

      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      const offer = await pc.createOffer();
      webrtcTraceRef.current.offerCreatedAt = Date.now();
      await pc.setLocalDescription(offer);
      webrtcTraceRef.current.localDescriptionSetAt = Date.now();

      let sdpUrl = '';
      const sdpHeaders: Record<string, string> = {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      };
      if (provider === 'openai') sdpUrl = `${openaiBaseUrl}/realtime/calls`;
      else {
        if (!azureResource) throw new Error('Missing Azure realtime resource');
        sdpUrl = `https://${azureResource}.openai.azure.com/openai/v1/realtime/calls?webrtcfilter=on`;
      }

      webrtcTraceRef.current.sdpRequestedAt = Date.now();
      const sdpResp = await fetch(sdpUrl, { method: 'POST', headers: sdpHeaders, body: offer.sdp });
      if (isStale()) return;
      webrtcTraceRef.current.sdpAnsweredAt = Date.now();
      if (!sdpResp.ok) throw new Error((await sdpResp.text()) || 'Failed SDP negotiation');
      const answerSdp = await sdpResp.text();
      if (isStale() || !pcRef.current || pc.signalingState === 'closed') return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      webrtcTraceRef.current.remoteDescriptionSetAt = Date.now();
      setStatusText('Connecting to Agent...');
      setIsSessionActive(false);
      setIsConnecting(true);
    } catch (err: any) {
      if (startAttemptRef.current !== attemptId) return;
      console.error('WebRTC start error:', err);
      teardownWebRTCSession();
      setStatusText('Unable to connect');
      const msg = err?.response?.data?.error || err?.message || 'Failed to start voice session';
      handleAlert({ text: msg, type: 'error' });
    }
  }, [
    agentId,
    isConnecting,
    isSessionActive,
    reportRealtimeUsage,
    resolveUserTextForResponse,
    teardownWebRTCSession,
    token,
    updateRealtimeKnowledgeForTurn,
  ]);

  useEffect(() => {
    unmountCleanupRef.current = { stopWebRTCSession, teardownWebRTCSession };
  }, [stopWebRTCSession, teardownWebRTCSession]);

  useEffect(() => {
    return () => {
      unmountCleanupRef.current.stopWebRTCSession?.(false);
    };
  }, []);

  return {
    isConnecting,
    isSessionActive,
    isDisconnecting,
    statusText,
    sessionId,
    remoteAudioRef,
    startWebRTCSession,
    stopWebRTCSession,
  };
}
