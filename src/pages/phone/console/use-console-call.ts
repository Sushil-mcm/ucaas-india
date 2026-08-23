import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import type { DialpadSession } from '@/context/dialpad-context';

/**
 * The five call states the console renders, straight from the artifact's
 * state machine (`S.call`). Unlike the artifact these are *derived* from the
 * real jssip sessions held in DialpadContext — nothing here simulates a call.
 */
export type ConsoleCallState = 'idle' | 'incoming' | 'dialing' | 'active' | 'wrapup';

const TERMINAL = new Set(['ended', 'failed']);
const RINGING = new Set(['incoming', 'ringing', 'calling', 'connecting', 'progress']);

export const isTerminalSession = (s?: DialpadSession | null) =>
  !!s && TERMINAL.has(String(s.status || '').toLowerCase());

const isLive = (s?: DialpadSession | null) => !!s && !isTerminalSession(s);

export const sessionSeconds = (s?: DialpadSession | null, now = Date.now()) => {
  if (!s) return 0;
  const from = s.connectedAt || s.startedAt;
  if (!from) return 0;
  const to = s.endedAt || now;
  return Math.max(0, Math.floor((to - from) / 1000));
};

export const mmss = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

export const useConsoleCall = () => {
  const dialpad = useDialpad();
  const { sessions, activeSessionId } = dialpad;

  // The session the stage is bound to: the explicitly active one when it is
  // still live, otherwise the first live session (an inbound call that arrived
  // while the agent was on the dialer).
  const liveSession = useMemo(() => {
    const all = Object.values(sessions || {});
    const explicit = activeSessionId ? sessions?.[activeSessionId] : null;
    if (isLive(explicit)) return explicit as DialpadSession;
    return all.find(isLive) || null;
  }, [sessions, activeSessionId]);

  /**
   * Wrap-up is a console concept, not a SIP one: once a *connected* call ends
   * we hold the agent on the wrap-up screen until they save (or skip), which
   * is when the underlying session is finally cleared.
   */
  const [wrapupId, setWrapupId] = useState<string | null>(null);
  const prevRef = useRef<DialpadSession | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    const current = prev ? sessions?.[prev.id] : null;
    if (prev && !isTerminalSession(prev) && isTerminalSession(current) && prev.hasAnswered) {
      setWrapupId(prev.id);
    }
    prevRef.current = liveSession || (prev && sessions?.[prev.id]) || null;
  }, [sessions, liveSession]);

  /**
   * Resolve who is on the call.
   *
   * `ensureSessionContactInfo` is not self-invoking — the context exposes it and
   * the only other caller lives inside the Dialpad component, which renders
   * nothing on /phone. Without this the console would only ever know the raw
   * number: no contact name, empty screen-pop, no contact on the brief and no
   * contactId for notes. It caches per number (including misses), so calling it
   * once per session is cheap.
   */
  const ensuredRef = useRef<Record<string, boolean>>({});
  const { ensureSessionContactInfo, getMatchedLiveCallBySession } = dialpad;
  useEffect(() => {
    Object.values(sessions || {}).forEach((s) => {
      if (!s || isTerminalSession(s) || ensuredRef.current[s.id]) return;
      ensuredRef.current[s.id] = true;
      void ensureSessionContactInfo(s);
    });
  }, [sessions, ensureSessionContactInfo]);

  /**
   * Match the SIP session to the platform's live-call record, which is what
   * fills `liveCallData` — sip_call_id, the DID, campaign and contact uuids.
   * Notes, dispositions and the transcript all key off those, and like the
   * contact lookup its only other caller lives inside the Dialpad component.
   */
  const { liveCalls = [] } = useSocketEvents();
  useEffect(() => {
    Object.values(sessions || {}).forEach((s) => {
      if (!s || isTerminalSession(s)) return;
      getMatchedLiveCallBySession(liveCalls, s);
    });
  }, [liveCalls, sessions, getMatchedLiveCallBySession]);

  const wrapupSession = wrapupId ? sessions?.[wrapupId] || null : null;

  const endWrapup = useCallback(() => {
    if (wrapupId) dialpad.clearSession(wrapupId);
    setWrapupId(null);
  }, [dialpad, wrapupId]);

  const session = liveSession || wrapupSession;

  const state: ConsoleCallState = useMemo(() => {
    if (liveSession) {
      const status = String(liveSession.status || '').toLowerCase();
      if (liveSession.hasAnswered || status === 'confirmed' || status === 'accepted') {
        return 'active';
      }
      if (liveSession.direction === 'incoming') return 'incoming';
      if (RINGING.has(status) || liveSession.direction === 'outgoing') return 'dialing';
      return 'active';
    }
    if (wrapupSession) return 'wrapup';
    return 'idle';
  }, [liveSession, wrapupSession]);

  // Ticking clock for the on-screen timer. Only runs while a call is up.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state === 'idle') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  const secs = sessionSeconds(session, now);

  return {
    dialpad,
    session,
    state,
    secs,
    wrapupSession,
    endWrapup,
    isRegistered: dialpad.isRegistered,
    uaStatus: dialpad.uaStatus,
  };
};
