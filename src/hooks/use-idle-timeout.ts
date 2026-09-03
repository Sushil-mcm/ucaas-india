/* Idle timeout — the one company security setting that a browser can actually
 * enforce.
 * -----------------------------------------------------------------------------
 * Admin > Company info > Security writes `settings.company_security.idle_timeout`
 * as `{ enabled: boolean, seconds: number | null }` into the reserved
 * "Company Default" template row. Until this hook existed nothing read it, and
 * that card said so in as many words.
 *
 * Signing an idle person out is a client-side action, so unlike MFA, the IP
 * allowlist and SAML — all of which need the backend before they mean anything —
 * this one works from here. What it is NOT is a security boundary: the token
 * still lives in localStorage, and someone determined can keep a session alive
 * by other means. It is the same protection established business phone systems give you in the
 * browser: an unattended console stops being an open console.
 *
 * Design notes, because each one is load-bearing:
 *
 *  - **One sign-out path.** The app already has exactly one way to end a session
 *    from underneath the user: axios sets `window.isSessionTerminated`, clears
 *    SESSION_NAME and fires the `unauthorized-session` event, which the header
 *    picks up and turns into the "Session Terminated" dialog. This hook fires
 *    the same three steps and nothing else. A second logout route would leave
 *    sockets, SIP registration and query cache in different states depending on
 *    which one ran.
 *
 *  - **Never during a call.** This is a phone system. Being dumped mid-call is
 *    far worse than any timeout. The clock is suppressed whenever there is a
 *    live SIP session in the dialpad context or the user is in a video room,
 *    and it restarts from the moment the last of those ends.
 *
 *  - **Deadlines, not ticks.** The expiry is computed from a stored timestamp
 *    and a single self-rescheduling `setTimeout`. A background tab whose timers
 *    were throttled to a crawl still expires the instant it comes back, because
 *    nothing depends on how many times the timer actually fired.
 *
 *  - **Returning to the tab does not reset the clock.** It re-checks it. If
 *    coming back counted as activity, leaving the tab open in a background
 *    window would defeat the setting entirely — which is the one case the
 *    setting exists for. Any real pointer or key event a moment later resets it
 *    normally.
 *
 *  - **Tabs talk to each other.** People run this console in two tabs. Activity
 *    is broadcast through localStorage so a tab you are not looking at cannot
 *    expire and take the shared token — and your active tab — down with it.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAvCall } from '@/hooks/use-av-call';
import { useDialpad } from '@/hooks/use-dialpad';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { SESSION_NAME } from '@/lib/utils';

const SECURITY_KEY = 'company_security';

/* other established systems' own range, and the range the settings page validates against: 5
   minutes to 8 hours. Clamped again here rather than trusted, because the
   stored blob is free-form JSON that other tooling can write. A stored `5`
   meaning "5 minutes" would otherwise be read as five seconds and sign
   everyone out on a loop. */
const IDLE_MIN_SECONDS = 300;
const IDLE_MAX_SECONDS = 28_800;

/** How long the countdown runs before the session actually ends. */
const WARNING_SECONDS = 60;

/** A mousemove storm must not turn into a write storm. */
const ACTIVITY_THROTTLE_MS = 1_000;

/** Cross-tab beacons are rarer still — they only need to be fresh, not exact. */
const BROADCAST_THROTTLE_MS = 5_000;

/** Mirrors `isLiveSessionStatus` in dialpad-context: everything except these
    two statuses is a call that is still happening in some form. */
const TERMINAL_SESSION_STATUSES = new Set(['ended', 'failed']);

const ACTIVITY_STORAGE_KEY = 'mcm-idle-last-activity';
const OVERLAY_ID = 'mcm-idle-timeout-warning';

export interface UseIdleTimeoutOptions {
  /** Extra "do not sign this person out right now" signal for callers that know
      about work this hook cannot see. ORed with the call detection below. */
  isBusy?: boolean;
}

export interface UseIdleTimeoutState {
  /** True only when a valid, enabled timeout was found and the clock is armed. */
  enabled: boolean;
  /** The clamped value in use, or 0 when the hook is doing nothing. */
  idleSeconds: number;
}

const toObject = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? (value as Record<string, any>) : {};
};

const hasStoredSession = (): boolean => Boolean(localStorage.getItem(SESSION_NAME));

const formatIdleLabel = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest ? `${hourPart} ${rest} minute${rest === 1 ? '' : 's'}` : hourPart;
};

/**
 * Reads the company idle timeout and enforces it.
 *
 * Does nothing at all — no listeners, no timer, no query cost beyond the shared
 * company-defaults fetch — when there is no session, when the setting is
 * missing, or when `enabled` is not true.
 */
export const useIdleTimeout = (options: UseIdleTimeoutOptions = {}): UseIdleTimeoutState => {
  const { isBusy = false } = options;

  const { sessions } = useDialpad();
  const { isRoomJoined } = useAvCall();

  /* Same key the settings pages use, so this shares their cache entry rather
     than adding a request. `retry: false` because a tenant whose account cannot
     read templates should fail once and stay quiet, not retry on a loop. */
  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    enabled: hasStoredSession(),
    staleTime: 5 * 60 * 1_000,
    retry: false,
  });

  const idleSeconds = useMemo(() => {
    const settings = toObject(companyDefaults?.settings);
    const idle = toObject(settings?.[SECURITY_KEY]?.idle_timeout);

    // Anything other than an explicit `true` means "leave people alone".
    if (idle.enabled !== true) return 0;

    const raw = Number(idle.seconds);
    if (!Number.isFinite(raw) || raw <= 0) return 0;

    return Math.min(IDLE_MAX_SECONDS, Math.max(IDLE_MIN_SECONDS, Math.round(raw)));
  }, [companyDefaults]);

  /* A call the SIP stack still considers alive — ringing and connecting count,
     because hanging up on a call that has not connected yet is just as bad. */
  const hasLiveCall = useMemo(
    () =>
      Object.values(sessions || {}).some(
        (session) => !TERMINAL_SESSION_STATUSES.has(String(session?.status || '').toLowerCase()),
      ),
    [sessions],
  );

  const isBusyNow = Boolean(isBusy) || hasLiveCall || Boolean(isRoomJoined);

  const busyRef = useRef(isBusyNow);
  const evaluateRef = useRef<(() => void) | null>(null);

  /* Busy is read through a ref inside the timer so the listeners and the timer
     are set up once per timeout value, not once per call state change. The
     falling edge matters on its own: when the last call ends the clock has to
     start from *then*, not from whenever the user last touched the keyboard. */
  useEffect(() => {
    const wasBusy = busyRef.current;
    busyRef.current = isBusyNow;
    if (wasBusy !== isBusyNow) evaluateRef.current?.();
  }, [isBusyNow]);

  useEffect(() => {
    if (!idleSeconds) return;
    if (!hasStoredSession()) return;

    const idleMs = idleSeconds * 1_000;
    const warningMs = Math.min(WARNING_SECONDS * 1_000, Math.floor(idleMs / 2));
    const idleLabel = formatIdleLabel(idleSeconds);

    let lastActivity = Date.now();
    let lastBroadcast = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let overlay: HTMLDivElement | null = null;
    let countdownNode: HTMLSpanElement | null = null;
    let hasSignedOut = false;

    /* ---------------------------------------------------------------- warning */

    const hideWarning = () => {
      if (!overlay) return;
      overlay.remove();
      overlay = null;
      countdownNode = null;
    };

    const showWarning = (secondsLeft: number) => {
      if (overlay) {
        if (countdownNode) countdownNode.textContent = String(secondsLeft);
        return;
      }

      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-live', 'assertive');
      overlay.setAttribute('aria-label', 'You are about to be signed out');
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:2147483000',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'background:rgba(15,23,42,0.55)',
        'padding:16px',
        'font-family:inherit',
      ].join(';');

      const card = document.createElement('div');
      card.style.cssText = [
        'width:100%',
        'max-width:420px',
        'border-radius:14px',
        'background:#ffffff',
        'box-shadow:0 20px 45px rgba(15,23,42,0.28)',
        'padding:20px',
        'color:#111827',
      ].join(';');

      const title = document.createElement('p');
      title.textContent = 'Still there?';
      title.style.cssText = 'margin:0;font-size:16px;font-weight:600;';

      const body = document.createElement('p');
      body.style.cssText = 'margin:8px 0 0;font-size:13px;line-height:1.5;color:#4b5563;';
      body.append(
        document.createTextNode(
          `Your company signs people out after ${idleLabel} without activity. You will be signed out in `,
        ),
      );

      countdownNode = document.createElement('span');
      countdownNode.textContent = String(secondsLeft);
      countdownNode.style.cssText = 'font-weight:700;color:#b91c1c;';
      body.append(countdownNode);
      body.append(document.createTextNode(' seconds.'));

      const note = document.createElement('p');
      note.textContent = 'Calls are never interrupted — the timer pauses while you are on a call.';
      note.style.cssText = 'margin:8px 0 0;font-size:12px;line-height:1.5;color:#6b7280;';

      const actions = document.createElement('div');
      actions.style.cssText = 'margin-top:16px;display:flex;justify-content:flex-end;';

      const stay = document.createElement('button');
      stay.type = 'button';
      stay.textContent = 'Stay signed in';
      stay.style.cssText = [
        'cursor:pointer',
        'border:0',
        'border-radius:10px',
        'background:#f2994a',
        'color:#ffffff',
        'font-size:13px',
        'font-weight:600',
        'padding:9px 16px',
      ].join(';');
      stay.addEventListener('click', () => {
        markActivity(true);
        hideWarning();
        evaluate();
      });

      actions.append(stay);
      card.append(title, body, note, actions);
      overlay.append(card);
      document.body.append(overlay);
      stay.focus();
    };

    /* --------------------------------------------------------------- sign out */

    /* Deliberately identical to the 401 branch of the axios response
       interceptor. The header's `unauthorized-session` listener does the rest:
       it dismisses toasts and opens the Session Terminated dialog, whose Okay
       button runs the user context's own cleanup. */
    const signOut = () => {
      if (hasSignedOut) return;
      hasSignedOut = true;
      hideWarning();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      try {
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      } catch {
        /* Private-mode localStorage failures must not stop the sign-out. */
      }
      (window as any).isSessionTerminated = true;
      localStorage.removeItem(SESSION_NAME);
      window.dispatchEvent(new CustomEvent('unauthorized-session'));
    };

    /* ------------------------------------------------------------------ clock */

    const schedule = (delayMs: number) => {
      if (timer) clearTimeout(timer);
      // Never busy-loop, never sleep so long that the deadline is missed.
      timer = setTimeout(evaluate, Math.max(250, Math.min(delayMs, idleMs)));
    };

    function evaluate() {
      if (hasSignedOut) return;

      // Somebody else already ended this session — stand down rather than fire
      // a second termination event on top of theirs.
      if (!hasStoredSession() || (window as any).isSessionTerminated === true) {
        hasSignedOut = true;
        hideWarning();
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        return;
      }

      const now = Date.now();

      if (busyRef.current) {
        // On a call: hold the clock at "now" so it restarts from the hang-up.
        lastActivity = now;
        broadcast(now);
        hideWarning();
        schedule(idleMs - warningMs);
        return;
      }

      const msLeft = lastActivity + idleMs - now;

      if (msLeft <= 0) {
        signOut();
        return;
      }

      if (msLeft <= warningMs) {
        showWarning(Math.max(1, Math.ceil(msLeft / 1_000)));
        // One-second ticks only inside the countdown, and only to repaint the
        // number — the deadline itself is still the timestamp above.
        schedule(Math.min(1_000, msLeft));
        return;
      }

      hideWarning();
      schedule(msLeft - warningMs);
    }

    evaluateRef.current = evaluate;

    /* --------------------------------------------------------------- activity */

    const broadcast = (stamp: number) => {
      if (stamp - lastBroadcast < BROADCAST_THROTTLE_MS) return;
      lastBroadcast = stamp;
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(stamp));
      } catch {
        /* A tab that cannot write simply loses cross-tab sync. */
      }
    };

    function markActivity(force = false) {
      const now = Date.now();
      if (!force && now - lastActivity < ACTIVITY_THROTTLE_MS) return;
      lastActivity = now;
      broadcast(now);
    }

    const onActivity = () => {
      const wasWarning = Boolean(overlay);
      markActivity(wasWarning);
      // Only re-run the clock immediately when the countdown is on screen; the
      // rest of the time the already-scheduled timer will pick the new
      // timestamp up on its own, which is what keeps mousemove cheap.
      if (wasWarning) {
        hideWarning();
        evaluate();
      }
    };

    /* Coming back to the tab re-checks the deadline, it does not extend it —
       otherwise a console parked in a background window would never expire. */
    const onVisibility = () => {
      if (document.visibilityState === 'visible') evaluate();
    };

    /* Another tab saw real activity. Adopt the newer timestamp so an idle tab
       cannot sign out a colleague who is working in the one next to it. */
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVITY_STORAGE_KEY || !event.newValue) return;
      const stamp = Number(event.newValue);
      if (!Number.isFinite(stamp) || stamp <= lastActivity) return;
      lastActivity = stamp;
      hideWarning();
      evaluate();
    };

    const passive = { passive: true } as AddEventListenerOptions;
    const passiveCapture = { passive: true, capture: true } as AddEventListenerOptions;

    window.addEventListener('pointerdown', onActivity, passive);
    window.addEventListener('pointermove', onActivity, passive);
    window.addEventListener('keydown', onActivity, passive);
    window.addEventListener('wheel', onActivity, passive);
    window.addEventListener('touchstart', onActivity, passive);
    window.addEventListener('touchmove', onActivity, passive);
    // Scroll does not bubble, so it is caught on the way down instead.
    document.addEventListener('scroll', onActivity, passiveCapture);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);

    markActivity(true);
    evaluate();

    return () => {
      if (timer) clearTimeout(timer);
      timer = null;
      evaluateRef.current = null;
      hideWarning();
      window.removeEventListener('pointerdown', onActivity, passive);
      window.removeEventListener('pointermove', onActivity, passive);
      window.removeEventListener('keydown', onActivity, passive);
      window.removeEventListener('wheel', onActivity, passive);
      window.removeEventListener('touchstart', onActivity, passive);
      window.removeEventListener('touchmove', onActivity, passive);
      document.removeEventListener('scroll', onActivity, passiveCapture);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, [idleSeconds]);

  return { enabled: idleSeconds > 0, idleSeconds };
};

export default useIdleTimeout;
