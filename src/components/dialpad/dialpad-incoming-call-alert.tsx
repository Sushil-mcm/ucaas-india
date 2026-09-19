import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { visibleIncomingAlerts } from '@/lib/incoming-alert-visibility';
import { Phone, PhoneOff, ChevronDown, ChevronUp } from 'lucide-react';
import type { DialpadSession } from '@/context/dialpad-context';
import { useDialpad } from '@/hooks/use-dialpad';
import { getDialpadSessionDisplayInfo } from './session-display';

/**
 * The one place a ringing call can never hide.
 *
 * The dialpad answers calls perfectly well - the problem was finding it. It is
 * a small draggable panel that the context shrinks to `micro` the moment a call
 * arrives, it can be parked anywhere on screen, it disappears entirely on the
 * /phone route (the console draws its own), and any dialog, drawer or menu
 * opened over it wins on z-index. An agent on a preview campaign was hunting
 * for their own ringing call.
 *
 * So the ring gets its own banner: rendered into <body> through a portal, so no
 * transformed or overflow-hidden ancestor can clip or reposition it, pinned to
 * the top centre of the viewport, above every other layer in the app, on every
 * route. It carries Answer and Decline itself, so the agent never has to find
 * the dialpad at all - and when the tab is in the background the page title
 * flashes and a desktop notification fires, because a banner nobody is looking
 * at is no better than a panel nobody can find.
 */

/* Above everything: the app's own top layer is z-[99999] (toasts) and Radix
   portals land wherever they please. Nothing outbids this. */
const ALERT_Z_INDEX = 2147483000;

/* The same three statuses the dialpad itself treats as "still ringing". */
const RINGING_STATUSES = new Set(['incoming', 'connecting', 'ringing']);

/* A call is a conversation only once the far end answered. */
const IN_CALL_STATUSES = new Set(['accepted', 'confirmed']);

const isRingingIncoming = (session: DialpadSession | null | undefined) =>
  Boolean(
    session &&
      session.direction === 'incoming' &&
      RINGING_STATUSES.has(String(session.status || '').toLowerCase()),
  );

const formatElapsed = (startedAt: number | undefined, now: number) => {
  if (!startedAt) return '0:00';
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/* What the call is FOR, when the switch told us: a queue name, a campaign
   name, or nothing. It is the difference between "answer this" and "why is
   this ringing". */
const getCallContextLabel = (session: DialpadSession) => {
  const queueName = String(
    session?.queueMetaData?.response?.name || session?.queueMetaData?.response?.queue_name || '',
  ).trim();
  if (queueName) return `Queue · ${queueName}`;

  const campaignName = String(
    session?.campaignMetaData?.response?.name ||
      session?.campaignMetaData?.response?.campaign_name ||
      '',
  ).trim();
  if (campaignName) return `Campaign · ${campaignName}`;

  if (session?.campaignMetaData?.id) return 'Campaign call';
  if (session?.queueMetaData?.id) return 'Queue call';
  return 'Direct call';
};

type IncomingCallRowProps = {
  session: DialpadSession;
  now: number;
  onAnswer: (sessionId: string) => void;
  onDecline: (sessionId: string) => void;
  onShow: (sessionId: string) => void;
};

const IncomingCallRow = ({ session, now, onAnswer, onDecline, onShow }: IncomingCallRowProps) => {
  const { contactName, contactNumber } = getDialpadSessionDisplayInfo(session);
  const name = contactName || session.remoteName || 'Unknown caller';
  const number = contactNumber || session.remoteNumber || '';
  const contextLabel = getCallContextLabel(session);

  return (
    <div className="flex items-center gap-3 px-4 py-3 max-[560px]:flex-wrap max-[560px]:gap-2">
      <button
        type="button"
        onClick={() => onShow(session.id)}
        title="Open the dialer on this call"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="dialpad-incoming-alert__icon relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e7f8ee] text-[#1f9c4b]">
          <Phone className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1d4ed8]">
              Incoming call
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#557095] tabular-nums">
              {formatElapsed(session.startedAt, now)}
            </span>
          </span>
          <span className="block truncate text-[17px] font-bold leading-tight text-[#10203a]">
            {name}
          </span>
          <span className="block truncate text-[13px] text-[#557095]">
            {number ? `${number} · ` : ''}
            {contextLabel}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-2 max-[560px]:w-full">
        <button
          type="button"
          onClick={() => onDecline(session.id)}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#ffe4e8] px-4 text-sm font-semibold text-[#be2237] transition hover:bg-red-600 hover:text-white max-[560px]:flex-1"
        >
          <PhoneOff className="h-4 w-4" />
          Decline
        </button>
        <button
          type="button"
          onClick={() => onAnswer(session.id)}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#1f9c4b] px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(31,156,75,0.35)] transition hover:bg-[#188040] max-[560px]:flex-1"
        >
          <Phone className="h-4 w-4" />
          Answer
        </button>
      </div>
    </div>
  );
};

const DialpadIncomingCallAlert = () => {
  const location = useLocation();
  const {
    sessions,
    answerCall,
    endCall,
    openDialpad,
    setActiveSessionId,
    activeSessionId,
    isDialpadOpen,
  } = useDialpad();

  /* Bring the dialer forward without resizing whatever the agent is working
     in - see dialpad-work-list.tsx for the fault this avoids. */
  const surfaceDialer = useCallback(() => {
    if (!isDialpadOpen) openDialpad('mini');
  }, [isDialpadOpen, openDialpad]);

  const [now, setNow] = useState(() => Date.now());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const originalTitleRef = useRef<string>('');
  const notifiedSessionIdsRef = useRef<Set<string>>(new Set());
  const notificationsRef = useRef<Map<string, Notification>>(new Map());

  const ringingSessions = useMemo(
    () => Object.values(sessions || {}).filter(isRingingIncoming),
    [sessions],
  );
  const isRinging = ringingSessions.length > 0;
  const leadSession = ringingSessions[0] || null;
  const hasEstablishedCall = useMemo(
    () =>
      Object.values(sessions || {}).some((session) =>
        IN_CALL_STATUSES.has(String(session?.status || '').toLowerCase()),
      ),
    [sessions],
  );

  /* One ticker for every row, and only while something rings. */
  useEffect(() => {
    if (!isRinging) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isRinging]);

  /* A new ring always comes back expanded: collapsing is for the call you are
     already looking at, not the next one. */
  useEffect(() => {
    if (!isRinging) setIsCollapsed(false);
  }, [isRinging]);

  /* The tab title flashes while a call rings, so a browser window buried behind
     a CRM still says so on its tab. */
  useEffect(() => {
    if (!isRinging || !leadSession) return;
    if (typeof document === 'undefined') return;

    if (!originalTitleRef.current) originalTitleRef.current = document.title;
    const savedTitle = originalTitleRef.current;
    const { contactName } = getDialpadSessionDisplayInfo(leadSession);
    const callerLabel = contactName || leadSession.remoteNumber || 'Unknown caller';
    const ringingTitle = `📞 Incoming call — ${callerLabel}`;

    let showsRingingTitle = false;
    const flash = () => {
      showsRingingTitle = !showsRingingTitle;
      document.title = showsRingingTitle ? ringingTitle : savedTitle;
    };
    flash();
    const interval = window.setInterval(flash, 1000);

    return () => {
      window.clearInterval(interval);
      document.title = savedTitle;
      originalTitleRef.current = '';
    };
  }, [isRinging, leadSession]);

  /* A desktop notification for the case the banner cannot solve: the agent is
     in another tab or another application entirely. Permission is asked for the
     first time a call actually rings - never on a cold page load. */
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (ringingSessions.length > 0 && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined);
    }
    if (Notification.permission !== 'granted') return;

    ringingSessions.forEach((session) => {
      if (notifiedSessionIdsRef.current.has(session.id)) return;
      notifiedSessionIdsRef.current.add(session.id);
      /* Only when the page is not in front: an on-screen banner plus an OS
         notification for the same call is just noise. */
      if (!document.hidden) return;

      try {
        const { contactName, contactNumber } = getDialpadSessionDisplayInfo(session);
        const notification = new Notification('Incoming call', {
          body: `${contactName || 'Unknown caller'}${contactNumber ? ` · ${contactNumber}` : ''}`,
          tag: `dialpad-incoming-${session.id}`,
          requireInteraction: true,
        });
        notification.onclick = () => {
          window.focus();
          surfaceDialer();
          notification.close();
        };
        notificationsRef.current.set(session.id, notification);
      } catch {
        /* Notifications are a nicety; the banner is the guarantee. */
      }
    });

    /* Close the notification for anything that has stopped ringing. */
    const stillRinging = new Set(ringingSessions.map((session) => session.id));
    notificationsRef.current.forEach((notification, sessionId) => {
      if (stillRinging.has(sessionId)) return;
      try {
        notification.close();
      } catch {
        /* already gone */
      }
      notificationsRef.current.delete(sessionId);
      notifiedSessionIdsRef.current.delete(sessionId);
    });
  }, [ringingSessions, surfaceDialer]);

  useEffect(
    () => () => {
      notificationsRef.current.forEach((notification) => {
        try {
          notification.close();
        } catch {
          /* already gone */
        }
      });
      notificationsRef.current.clear();
    },
    [],
  );

  const handleAnswer = useCallback(
    (sessionId: string) => {
      if (!sessionId) return;
      /* answerCall already switches the active session (and holds whatever
         was live), so the banner must not do it a second time. */
      answerCall(sessionId);
      /* Answered from the banner, the agent still wants the call controls -
         mute, hold, transfer, notes - so the dialer comes with it. Only sized
         when it was shut: `openDialpad` always applies the size it is given,
         and forcing 'mini' on an open campaign dialer collapses a full page
         into a corner box at the worst possible moment. */
      surfaceDialer();
    },
    [answerCall, surfaceDialer],
  );

  const handleDecline = useCallback(
    (sessionId: string) => {
      if (!sessionId) return;
      endCall(sessionId);
    },
    [endCall],
  );

  const handleShow = useCallback(
    (sessionId: string) => {
      if (!sessionId) return;
      /* Looking at a ringing call must not disturb a conversation already in
         progress: making it the active session would replace the live call's
         controls with an Accept/Reject screen, which is exactly what the
         dialpad's own call-waiting rule exists to prevent. With nothing live,
         showing the caller is free. */
      if (!hasEstablishedCall && sessionId !== activeSessionId) {
        setActiveSessionId(sessionId);
      }
      surfaceDialer();
    },
    [activeSessionId, hasEstablishedCall, setActiveSessionId, surfaceDialer],
  );

  // The visible dialer already offers Answer/Decline for its active call.
  // Keep the banner for a hidden dialer and for another waiting call only.
  const visibleRingingSessions = visibleIncomingAlerts(
    ringingSessions, activeSessionId, isDialpadOpen || location.pathname.startsWith('/phone'),
  );
  if (!visibleRingingSessions.length || typeof document === 'undefined') return null;

  const waitingCount = visibleRingingSessions.length;

  return createPortal(
    <>
      {/* A pulse around the edge of the screen. Peripheral vision catches it
          even when the agent is reading something else entirely. */}
      <div
        className="dialpad-incoming-alert__glow pointer-events-none fixed inset-0"
        style={{ zIndex: ALERT_Z_INDEX - 1 }}
        aria-hidden="true"
      />

      <div
        role="alert"
        aria-live="assertive"
        className="pointer-events-none fixed left-1/2 top-3 flex w-[min(620px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col items-stretch"
        style={{ zIndex: ALERT_Z_INDEX }}
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="dialpad-incoming-alert__card pointer-events-auto mx-auto flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#10203a] shadow-[0_10px_30px_rgba(16,32,58,0.25)] ring-1 ring-[#c3d6ff]"
          >
            <span className="dialpad-incoming-alert__icon flex h-6 w-6 items-center justify-center rounded-full bg-[#e7f8ee] text-[#1f9c4b]">
              <Phone className="h-3.5 w-3.5" />
            </span>
            {waitingCount > 1 ? `${waitingCount} calls ringing` : 'Call ringing'}
            <ChevronDown className="h-4 w-4 text-[#557095]" />
          </button>
        ) : (
          /* White card, light-blue edge and header — the app's own palette.
             Green is spent only where it means something: the ringing dot,
             the handset, and the Answer button. A solid green header made the
             whole banner read as one big green block and buried the one green
             thing the agent actually has to hit. */
          <div className="dialpad-incoming-alert__card pointer-events-auto overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(16,32,58,0.32)] ring-1 ring-[#c3d6ff]">
            <div className="flex items-center justify-between border-b border-[#dbe5fb] bg-[#eef4ff] px-4 py-1.5">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1f9c4b]" aria-hidden="true" />
                {waitingCount > 1 ? `${waitingCount} calls ringing` : 'Call ringing now'}
              </span>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                title="Shrink this banner (the call keeps ringing)"
                className="flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-[#3f6ad0] transition hover:bg-white hover:text-[#1d4ed8]"
              >
                Shrink
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#eef2f9]">
              {visibleRingingSessions.map((session) => (
                <IncomingCallRow
                  key={session.id}
                  session={session}
                  now={now}
                  onAnswer={handleAnswer}
                  onDecline={handleDecline}
                  onShow={handleShow}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
};

export default DialpadIncomingCallAlert;
