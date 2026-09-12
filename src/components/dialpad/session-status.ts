import type { DialpadSession } from '@/context/dialpad-context';

/**
 * What the agent is told a call is doing.
 *
 * Every label here maps to a SIP response actually observed in production on
 * 8 September 2026, counted over the switch's own state transitions rather than
 * guessed from the RFC. The codes that occur, most frequent first:
 *
 *   200 (661)  180 (234)  183 (243)  100 (313)   - progress and answer
 *   500 (83)   487 (27)   480 (13)   486 (9)
 *   503 (7)    410 (7)    603 (6)    408 (3)
 *   478 (2)    481 (1)    484 (1)
 *
 * Before this, all of the terminal codes except busy/rejected/cancelled fell
 * through one branch and the agent read "Call Failed" - including the two
 * largest real buckets, 500 and the codec rejection behind the India route. An
 * agent who cannot tell "they are engaged" from "the carrier refused the call"
 * redials the wrong ones and reports the wrong fault.
 */

export type CallTone = 'idle' | 'progress' | 'live' | 'ended' | 'failed';

export type DialpadSessionState = {
  /** Short label for the status line. */
  label: string;
  /** Drives the colour/animation. Never inferred from the label text. */
  tone: CallTone;
  /** The longer "what do I do about it" line, when there is one worth saying. */
  detail?: string;
};

/**
 * SIP response code to what it means for the person on the phone.
 *
 * Worded for an agent, not an engineer: the label says what happened and the
 * detail says whether redialling is worth anything. `retryable` is the
 * distinction that matters most - a busy number is worth trying again in a
 * minute, a disconnected one never is.
 */
const SIP_CODE_MEANING: Record<
  number,
  { label: string; detail?: string; tone?: CallTone }
> = {
  403: { label: 'Not allowed', detail: 'This destination is barred for your account.' },
  404: { label: 'Number not found', detail: 'The number does not exist on the network.' },
  408: { label: 'No answer', detail: 'The far end never responded.' },
  410: {
    label: 'Number disconnected',
    detail: 'This number is no longer in service. Redialling will not help.',
  },
  478: { label: 'Cannot route', detail: 'No route to this destination.' },
  480: { label: 'Unavailable', detail: 'Their phone is switched off or unreachable.' },
  481: { label: 'Call already ended', detail: 'The other side had already cleared it.' },
  484: { label: 'Incomplete number', detail: 'Check the digits and dial again.' },
  486: { label: 'Busy', detail: 'They are on another call.', tone: 'ended' },
  487: { label: 'Cancelled', tone: 'ended' },
  488: {
    label: 'Audio not supported',
    detail: 'The carrier refused our audio format. This is a carrier fault, not the number.',
  },
  500: {
    label: 'Carrier error',
    detail: 'The carrier failed to place the call. Worth trying again.',
  },
  502: { label: 'Carrier error', detail: 'A gateway between us and them failed.' },
  503: {
    label: 'Service unavailable',
    detail: 'The carrier is refusing calls right now. Worth trying again shortly.',
  },
  504: { label: 'Carrier timeout', detail: 'The carrier did not answer in time.' },
  603: { label: 'Declined', detail: 'They rejected the call.', tone: 'ended' },
};

/**
 * Q.850 cause to the same agent-readable meaning.
 *
 * Separate from the SIP table on purpose: the two numbering schemes overlap
 * without agreeing. Q.850 17 is busy, SIP 17 is nothing; SIP 486 is busy, Q.850
 * 486 is nothing. Merging them would map real causes to wrong words.
 *
 * These arrive when the switch clears the leg with a BYE or CANCEL carrying a
 * Reason header rather than answering the INVITE with a failure. Cause 88 is the
 * one behind the India route: the carrier answers with no voice codec, so the
 * switch has nothing to negotiate and rejects the call.
 */
const Q850_MEANING: Record<number, { label: string; detail?: string; tone?: CallTone }> = {
  1: { label: 'Number not found', detail: 'The number is not allocated on the network.' },
  17: { label: 'Busy', detail: 'They are on another call.', tone: 'ended' },
  18: { label: 'No answer', detail: 'The far end never responded.' },
  19: { label: 'No answer', tone: 'ended' },
  21: { label: 'Declined', detail: 'They rejected the call.', tone: 'ended' },
  22: {
    label: 'Number disconnected',
    detail: 'This number is no longer in service. Redialling will not help.',
  },
  27: { label: 'Destination unavailable', detail: 'The far end is out of order.' },
  28: { label: 'Incomplete number', detail: 'Check the digits and dial again.' },
  34: { label: 'Network busy', detail: 'The carrier has no circuits free. Try again.' },
  38: { label: 'Network fault', detail: 'The carrier network is out of order.' },
  41: {
    label: 'Carrier error',
    detail: 'The carrier failed to place the call. Worth trying again.',
  },
  88: {
    label: 'Audio not supported',
    detail:
      'The carrier answered without a usable audio format, so the call could not carry sound. This is a carrier fault, not the number.',
  },
  102: { label: 'Carrier timeout', detail: 'The carrier did not respond in time.' },
};

/**
 * The fallback for a failure with no SIP code on it - a local media fault, a
 * dropped websocket, an ICE failure. JsSIP's `cause` is all there is here.
 */
const causeMeaning = (cause: string): { label: string; detail?: string } => {
  if (cause.includes('rtp timeout') || cause.includes('media')) {
    return {
      label: 'Audio lost',
      detail: 'The call connected but no audio arrived. Usually a network or carrier fault.',
    };
  }
  if (cause.includes('user denied media')) {
    return { label: 'Microphone blocked', detail: 'Allow microphone access and dial again.' };
  }
  if (cause.includes('connection') || cause.includes('websocket')) {
    return { label: 'Not connected', detail: 'Your phone lost its connection to the server.' };
  }
  if (cause.includes('authentication')) {
    return { label: 'Sign-in problem', detail: 'Your phone could not authenticate.' };
  }
  if (cause.includes('busy')) return { label: 'Busy', detail: 'They are on another call.' };
  if (cause.includes('rejected') || cause.includes('declined')) return { label: 'Declined' };
  if (cause.includes('canceled') || cause.includes('cancelled')) return { label: 'Cancelled' };
  if (
    cause.includes('no answer') ||
    cause.includes('request timeout') ||
    cause.includes('expires') ||
    cause.includes('unavailable')
  ) {
    return { label: 'No answer' };
  }
  return { label: 'Call failed' };
};

export const getDialpadSessionState = (session: DialpadSession | null): DialpadSessionState => {
  if (!session) return { label: 'Idle', tone: 'idle' };

  const cause = (session.cause || '').toLowerCase();
  const code = session.sipStatusCode;

  if (session.status === 'failed') {
    /* A SIP response code first, then a Q.850 cause off the Reason header.
       Which one arrives depends on how the switch tore the call down, and the
       agent should not have to care. */
    const byCode =
      (typeof code === 'number' ? SIP_CODE_MEANING[code] : undefined) ||
      (typeof session.q850Cause === 'number' ? Q850_MEANING[session.q850Cause] : undefined);
    if (byCode) return { label: byCode.label, tone: byCode.tone || 'failed', detail: byCode.detail };
    const byCause = causeMeaning(cause);
    /* An unmapped code is still worth showing. "Call failed (509)" can be
       looked up and reported; a bare "Call failed" cannot. */
    return {
      label:
        typeof code === 'number'
          ? `${byCause.label} (${code})`
          : typeof session.q850Cause === 'number'
            ? `${byCause.label} (Q.850 ${session.q850Cause})`
            : byCause.label,
      tone: 'failed',
      detail: byCause.detail || session.sipReasonPhrase,
    };
  }

  if (session.status === 'ended') {
    /* A call that never connected did not "hang up" - it failed, and 200 is the
       only code that means the two sides actually spoke. */
    if (!session.hasAnswered) {
      /* A SIP response code first, then a Q.850 cause off the Reason header.
       Which one arrives depends on how the switch tore the call down, and the
       agent should not have to care. */
    const byCode =
      (typeof code === 'number' ? SIP_CODE_MEANING[code] : undefined) ||
      (typeof session.q850Cause === 'number' ? Q850_MEANING[session.q850Cause] : undefined);
      if (byCode) return { label: byCode.label, tone: byCode.tone || 'ended', detail: byCode.detail };
    }
    if (session.eventOriginator === 'remote') return { label: 'They hung up', tone: 'ended' };
    if (session.eventOriginator === 'local') return { label: 'You hung up', tone: 'ended' };
    return { label: 'Call ended', tone: 'ended' };
  }

  /* Live-call flags win over the plain state: an agent needs to see Hold and
     Mute more urgently than they need to be reminded the call is connected. */
  const activeFlags: string[] = [];
  if (session.isOnHold) activeFlags.push('On hold');
  if (session.isMuted) activeFlags.push('Muted');
  if (!session.isSpeakerOn) activeFlags.push('Speaker off');
  if (activeFlags.length) return { label: activeFlags.join(' + '), tone: 'live' };

  if (session.status === 'confirmed') return { label: 'Connected', tone: 'live' };
  /* 200 OK is in but the dialog is not yet confirmed. They have picked up; media
     is a moment behind. Brief, and honest about which of the two has happened. */
  if (session.status === 'accepted') {
    return { label: 'Answered', tone: 'progress', detail: 'Connecting audio…' };
  }
  if (session.status === 'incoming') return { label: 'Incoming', tone: 'progress' };
  if (session.status === 'ringing') {
    /* 180 wins over 183 and is never withdrawn: once the far end has alerted,
       it has alerted, even if further early media follows. 183 on its own is a
       carrier tone or announcement and is no promise that a phone is ringing -
       calling that "Ringing" tells the agent something the switch does not
       know. Only 180 earns the word. */
    if (session.hasAlerting) return { label: 'Ringing', tone: 'progress' };
    if (session.hadEarlyMedia) {
      /* 183 with early media says the carrier is sending us audio, usually
         ringback. Strictly it is not proof the far end is alerting - only 180 is
         - and this branch used to say "Connecting" for that reason.

         Product decision (Pablo, 9 Sep): say "Ringing". The agent is hearing
         ringback in their ear at this point, and a screen that disagrees with
         what they can hear reads as broken rather than as precise. Every
         commercial dialler labels audible ringback "Ringing".

         What it costs, kept here so nobody has to rediscover it: on a route that
         plays a tone for a call that will never ring - the India/46 Labs case,
         where the carrier answers with a codec-less SDP - the agent now sees
         "Ringing" for a call that is not ringing anywhere. The `detail` below is
         deliberately unchanged and still tells the truth, so any surface showing
         detail keeps the distinction. Only the one-word label was relaxed. */
      return {
        label: 'Ringing',
        tone: 'progress',
        detail: 'The carrier is playing a tone. Their phone may not be ringing yet.',
      };
    }
    /* An inbound session should never reach here - it stays `incoming` because
       nothing in this app calls JsSIP's progress() - but if it ever does, the
       phone alerting is OUR phone and "Calling" would be exactly backwards.
       Guarded rather than assumed: this rests on a library's internals. */
    if (session.direction === 'incoming') return { label: 'Ringing', tone: 'progress' };
    /* Outbound progress with no code we recognise: the call is under way but
       nothing has told us the far end is alerting, so do not claim it is. */
    return { label: 'Calling', tone: 'progress' };
  }
  /* Both of these are the same thing to the person who pressed dial: the call is
     going out and nothing has come back. `connecting` is JsSIP sending the
     INVITE, which used to relabel "Calling" as "Connecting" before any progress
     arrived - a step backwards in meaning for an event the agent cannot act on.
     The outbound sequence an agent now sees is:
       Calling  ->  Ringing (only on 180)  ->  Answered  ->  Connected
     with "Connecting" appearing instead of Ringing when all the far end sent
     was early media. */
  if (session.status === 'calling' || session.status === 'connecting') {
    return { label: 'Calling', tone: 'progress' };
  }

  return { label: session.status, tone: 'progress' };
};

/** The label alone, for the places that only render text. */
export const getDialpadSessionStatusLabel = (session: DialpadSession | null) =>
  getDialpadSessionState(session).label;
