import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoMeeting, VideoParticipant } from './demo-data';

/**
 * The video console's state machine, kept out of the components so the stage
 * and the intelligence panel act on exactly the same meeting — the panel's
 * "admit" and "mute all" have to be visible on the tiles immediately, and the
 * stage's mic button has to be visible in the participant list.
 *
 * Mirrors `phone/console/use-console-call.ts` in shape. Where that hook binds
 * to a real jssip session, this one currently drives demo meetings; the
 * seams marked TODO are where the Jitsi conference (see
 * `@/context/jitsi-context` and `@/hooks/use-jitsi`) gets wired in.
 */

export type VideoView = 'hub' | 'green' | 'live' | 'recap' | 'schedule' | 'join';
export type StageLayout = 'gallery' | 'speaker' | 'sidebar' | 'together';
export type BackdropMode = 'off' | 'blur' | 'office' | 'brand';

export type MediaState = {
  mic: boolean;
  cam: boolean;
  sharing: boolean;
  backdrop: BackdropMode;
  /** background noise removal, as Meet/Webex market it */
  noise: boolean;
  /** auto-framing / people focus */
  autoframe: boolean;
  camDevice: string;
  micDevice: string;
  spkDevice: string;
};

export type Reaction = { id: number; emoji: string; offset: number };

export const mmss = (total: number) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const DEFAULT_MEDIA: MediaState = {
  mic: false,
  cam: true,
  sharing: false,
  backdrop: 'blur',
  noise: true,
  autoframe: true,
  camDevice: 'FaceTime HD Camera',
  micDevice: 'MacBook Pro Microphone',
  spkDevice: 'MacBook Pro Speakers',
};

export const useVideoConsole = (meetings: VideoMeeting[]) => {
  const [view, setView] = useState<VideoView>('hub');
  const [meeting, setMeeting] = useState<VideoMeeting | null>(null);
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [media, setMedia] = useState<MediaState>(DEFAULT_MEDIA);
  const [layout, setLayout] = useState<StageLayout>('gallery');
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [ai, setAi] = useState(true);
  const [hand, setHand] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lobbyOn, setLobbyOn] = useState(true);
  const [pinned, setPinned] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [toast, setToast] = useState('');

  const reactionSeq = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  /* ---------------------------------------------------------- lifecycle -- */

  const openMeeting = useCallback((next: VideoMeeting) => {
    setMeeting(next);
    setParticipants(next.participants);
    setPinned(null);
    setView(next.state === 'past' ? 'recap' : 'green');
  }, []);

  const join = useCallback(
    (next?: VideoMeeting) => {
      const target = next || meeting;
      if (!target) return;
      // TODO: replace with the Jitsi conference join once the console is the
      // real meeting surface — `useJitsi().joinMeeting(target.roomId)`.
      setMeeting(target);
      setParticipants(target.participants);
      setElapsed(target.state === 'live' ? Math.abs(target.startsInMins) * 60 : 0);
      setRecording(target.recorded);
      setView('live');
      showToast(`Joined ${target.title}`);
    },
    [meeting, showToast],
  );

  const leave = useCallback(() => {
    setView(meeting ? 'recap' : 'hub');
    setMedia((m) => ({ ...m, sharing: false }));
    setHand(false);
    setPinned(null);
    showToast('You left the meeting');
  }, [meeting, showToast]);

  const backToHub = useCallback(() => {
    setView('hub');
    setMeeting(null);
    setParticipants([]);
  }, []);

  /** The two hub actions that open a form rather than a room. */
  const openSchedule = useCallback(() => {
    setMeeting(null);
    setParticipants([]);
    setView('schedule');
  }, []);

  const openJoin = useCallback(() => {
    setMeeting(null);
    setParticipants([]);
    setView('join');
  }, []);

  /* ------------------------------------------------------------- timers -- */

  useEffect(() => {
    if (view !== 'live') return undefined;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [view]);

  // Demo behaviour: rotate the active speaker so the speaking ring, the tile
  // order and the panel's "speaking" dot all have something to react to.
  useEffect(() => {
    if (view !== 'live') return undefined;
    const id = setInterval(() => {
      setParticipants((list) => {
        const candidates = list.filter((p) => !p.muted && !p.waiting);
        if (!candidates.length) return list;
        const current = candidates.findIndex((p) => p.speaking);
        const nextId = candidates[(current + 1) % candidates.length].id;
        return list.map((p) => ({ ...p, speaking: p.id === nextId }));
      });
    }, 5200);
    return () => clearInterval(id);
  }, [view]);

  /* -------------------------------------------------------- self + media -- */

  const patchMedia = useCallback((patch: Partial<MediaState>) => {
    setMedia((m) => ({ ...m, ...patch }));
  }, []);

  // the self tile has to mirror the dock, or the two disagree on screen
  useEffect(() => {
    setParticipants((list) =>
      list.map((p) =>
        p.self ? { ...p, muted: !media.mic, camOff: !media.cam, sharing: media.sharing, hand } : p,
      ),
    );
  }, [media.mic, media.cam, media.sharing, hand]);

  const toggleMic = useCallback(() => {
    setMedia((m) => {
      showToast(m.mic ? 'Microphone muted' : 'Microphone on');
      return { ...m, mic: !m.mic };
    });
  }, [showToast]);

  const toggleCam = useCallback(() => {
    setMedia((m) => {
      showToast(m.cam ? 'Camera off' : 'Camera on');
      return { ...m, cam: !m.cam };
    });
  }, [showToast]);

  const toggleShare = useCallback(() => {
    setMedia((m) => {
      showToast(m.sharing ? 'Stopped sharing' : 'Sharing your screen');
      return { ...m, sharing: !m.sharing };
    });
  }, [showToast]);

  const toggleHand = useCallback(() => {
    setHand((h) => {
      showToast(h ? 'Hand lowered' : 'Hand raised');
      return !h;
    });
  }, [showToast]);

  const toggleRecording = useCallback(() => {
    setRecording((r) => {
      showToast(r ? 'Recording stopped' : 'Recording started — everyone is notified');
      return !r;
    });
  }, [showToast]);

  /* --------------------------------------------------------- moderation -- */

  const admit = useCallback(
    (id: string) => {
      setParticipants((list) => list.map((p) => (p.id === id ? { ...p, waiting: false } : p)));
      showToast('Admitted to the meeting');
    },
    [showToast],
  );

  const admitAll = useCallback(() => {
    setParticipants((list) => list.map((p) => ({ ...p, waiting: false })));
    showToast('Everyone admitted');
  }, [showToast]);

  const removeParticipant = useCallback(
    (id: string) => {
      setParticipants((list) => list.filter((p) => p.id !== id));
      showToast('Participant removed');
    },
    [showToast],
  );

  const toggleParticipantMute = useCallback((id: string) => {
    setParticipants((list) => list.map((p) => (p.id === id ? { ...p, muted: !p.muted } : p)));
  }, []);

  const muteAll = useCallback(() => {
    setParticipants((list) =>
      list.map((p) => (p.self ? p : { ...p, muted: true, speaking: false })),
    );
    showToast('Everyone except you is muted');
  }, [showToast]);

  const lowerAllHands = useCallback(() => {
    setParticipants((list) => list.map((p) => ({ ...p, hand: false })));
    setHand(false);
    showToast('All hands lowered');
  }, [showToast]);

  const react = useCallback((emoji: string) => {
    reactionSeq.current += 1;
    const id = reactionSeq.current;
    // spread them sideways so a burst does not stack into one column
    const offset = (id % 5) * 18;
    setReactions((list) => [...list, { id, emoji, offset }]);
    setTimeout(() => setReactions((list) => list.filter((r) => r.id !== id)), 2600);
  }, []);

  /* ------------------------------------------------------------ derived -- */

  const inRoom = useMemo(() => participants.filter((p) => !p.waiting), [participants]);
  const waiting = useMemo(() => participants.filter((p) => p.waiting), [participants]);
  const hands = useMemo(() => inRoom.filter((p) => p.hand), [inRoom]);
  const sharer = useMemo(() => inRoom.find((p) => p.sharing) || null, [inRoom]);
  const activeSpeaker = useMemo(
    () =>
      inRoom.find((p) => p.id === pinned) || inRoom.find((p) => p.speaking) || inRoom[0] || null,
    [inRoom, pinned],
  );

  return {
    meetings,
    view,
    meeting,
    participants,
    inRoom,
    waiting,
    hands,
    sharer,
    activeSpeaker,
    media,
    layout,
    elapsed,
    recording,
    captions,
    ai,
    hand,
    locked,
    lobbyOn,
    pinned,
    reactions,
    toast,
    setLayout,
    setCaptions,
    setAi,
    setLocked,
    setLobbyOn,
    setPinned,
    patchMedia,
    openMeeting,
    join,
    leave,
    backToHub,
    openSchedule,
    openJoin,
    toggleMic,
    toggleCam,
    toggleShare,
    toggleHand,
    toggleRecording,
    admit,
    admitAll,
    removeParticipant,
    toggleParticipantMute,
    muteAll,
    lowerAllHands,
    react,
    showToast,
  };
};

export type VideoConsole = ReturnType<typeof useVideoConsole>;
