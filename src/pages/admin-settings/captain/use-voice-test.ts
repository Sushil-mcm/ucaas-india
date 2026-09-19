import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
} from 'livekit-client';
import { CAPTAIN_API_BASE, captainErrorMessage, captainFetch } from '@/lib/captain-api';

export type VoiceChannel = {
  id: number;
  phone_number: string;
  label?: string;
  assistant_id: number | null;
  enabled: boolean;
};

export type VoiceLine = { id: string; who: 'you' | 'agent'; text: string; final: boolean };

export type VoiceStatus = 'idle' | 'connecting' | 'waiting' | 'live' | 'ended' | 'error';

// Browser voice test for an assistant, over LiveKit.
export function useVoiceTest(assistantId: string | null) {
  const [channels, setChannels] = useState<VoiceChannel[]>([]);
  const [channelId, setChannelId] = useState('');
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [agentState, setAgentState] = useState('');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [lines, setLines] = useState<VoiceLine[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await captainFetch(`${CAPTAIN_API_BASE}/voice/channels`);
        const json = res.ok ? await res.json() : null;
        setChannels(json?.data || []);
      } catch {
        setChannels([]);
      }
    })();
  }, []);

  const numbers = channels.filter(
    (c) => c.enabled && String(c.assistant_id) === String(assistantId),
  );

  useEffect(() => {
    setChannelId(numbers.length ? String(numbers[0].id) : '');
  }, [assistantId, channels]);

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const hangUp = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) await room.disconnect();
    if (audioRef.current) audioRef.current.innerHTML = '';
    setAgentState('');
    setMuted(false);
    setStartedAt(null);
  }, []);

  useEffect(() => () => void hangUp(), [hangUp]);
  useEffect(() => {
    void hangUp();
    setStatus('idle');
    setLines([]);
    setElapsed(0);
  }, [assistantId, hangUp]);

  const goLive = () => {
    setStatus('live');
    setStartedAt((s) => s ?? Date.now());
  };

  const start = async () => {
    if (!channelId || roomRef.current) return;
    setError('');
    setLines([]);
    setElapsed(0);
    setStatus('connecting');
    try {
      const res = await captainFetch(
        `${CAPTAIN_API_BASE}/voice/channels/${channelId}/test-session`,
        { method: 'POST' },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          res.status === 404 || res.status === 405
            ? 'Voice testing is not installed on the server yet.'
            : captainErrorMessage(json, `Could not start the voice test (${res.status})`),
        );
      }
      const { url, token } = json?.data || json || {};
      if (!url || !token) throw new Error('The server did not return a voice session.');

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio && audioRef.current) {
          audioRef.current.appendChild(track.attach());
        }
      });
      room.on(RoomEvent.ParticipantConnected, (p: Participant) => {
        if (p.isAgent) goLive();
      });
      room.on(RoomEvent.ParticipantAttributesChanged, (_changed, p: Participant) => {
        const state = p.attributes?.['lk.agent.state'];
        if (p.isAgent && state) setAgentState(state);
      });
      room.on(RoomEvent.ParticipantDisconnected, (p: Participant) => {
        if (p.isAgent) {
          setStatus('ended');
          void hangUp();
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        setStatus((s) => (s === 'error' ? s : 'ended'));
        setStartedAt(null);
      });

      room.registerTextStreamHandler('lk.transcription', async (reader, info) => {
        const id = reader.info.attributes?.['lk.segment_id'] || reader.info.id;
        const who: VoiceLine['who'] =
          info.identity === room.localParticipant.identity ? 'you' : 'agent';
        let text = '';
        for await (const chunk of reader) {
          text += chunk;
          const snapshot = text;
          setLines((prev) => {
            const at = prev.findIndex((l) => l.id === id);
            const line = { id, who, text: snapshot, final: false };
            if (at === -1) return [...prev, line];
            const next = [...prev];
            next[at] = line;
            return next;
          });
        }
        setLines((prev) => prev.map((l) => (l.id === id ? { ...l, final: true } : l)));
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      if ([...room.remoteParticipants.values()].some((p) => p.isAgent)) goLive();
      else setStatus('waiting');
    } catch (err: any) {
      await hangUp();
      setStatus('error');
      setError(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it in the browser and try again.'
          : err?.message || 'Could not start the voice test.',
      );
    }
  };

  const end = async () => {
    await hangUp();
    setStatus('ended');
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    await room.localParticipant.setMicrophoneEnabled(muted);
    setMuted(!muted);
  };

  return {
    numbers,
    channelId,
    setChannelId,
    status,
    agentState,
    muted,
    error,
    lines,
    elapsed,
    audioRef,
    inCall: status === 'connecting' || status === 'waiting' || status === 'live',
    start,
    end,
    toggleMute,
  };
}
