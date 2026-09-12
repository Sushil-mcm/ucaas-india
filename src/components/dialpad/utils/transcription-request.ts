/**
 * Asking the backend to start or stop transcribing a call.
 *
 * `handleTranscription()` in the dialpad context only moves local state — it
 * flips `transcriptionHasStarted` and appends turns. It sends nothing. So the
 * console's own Transcribe / Start buttons used to turn the badge to
 * "streaming" while no ASR was ever requested, and the pane sat on "Listening"
 * for the whole call. Only the automatic path emitted, which is why
 * transcription appeared to work for campaign calls and nowhere else.
 *
 * The socket contract lives in socket-api's SocketController: it listens for
 * `transcript`, `transcript-stop`, `transcript-restart` and
 * `transcript-prerecorded`, stamps `data.type` with the event name, and
 * republishes on the NATS subject `transcript.request` for the ESL side to act
 * on. The three events map exactly onto `DialpadTranscriptionStatus`, so the
 * status the UI already tracks is the only argument callers need.
 */
import type { DialpadSession, DialpadTranscriptionStatus } from '@/context/dialpad-context';

export const UNKNOWN_CONTACT_LABEL = 'Unknown Contact';

export const getHeaderFirstValue = (
  headers: DialpadSession['headers'] | undefined,
  headerName: string,
): string => {
  if (!headers) return '';

  const normalizedHeaderName = headerName.trim().toLowerCase();
  const matchingHeaderEntry = Object.entries(headers).find(
    ([name]) => name.trim().toLowerCase() === normalizedHeaderName,
  );

  if (!matchingHeaderEntry) return '';

  const [, values] = matchingHeaderEntry;
  if (!Array.isArray(values) || values.length === 0) return '';
  return String(values[0] || '').trim();
};

export const isTruthyHeaderValue = (value: string): boolean =>
  ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());

/**
 * Reads one of these settings whichever shape it arrives in.
 *
 * The same flag exists in two shapes across the platform: an older flat
 * `transcription: true` and the current `transcription: { enabled: true }` that
 * the user-settings screen writes and `update-forwarding` reads back. This
 * used to handle only the flat one and fall through to `false` for an object,
 * so a tenant whose settings had been saved from the current screen read as
 * "transcription off" — silently, since `false` is exactly what a genuinely
 * disabled setting returns. `campaign-mappers` already unwraps both; this is
 * the same unwrapping, in the place that decides whether to ask for ASR.
 */
export const isTruthySettingValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return isTruthyHeaderValue(value);
  if (value && typeof value === 'object') {
    return isTruthySettingValue((value as { enabled?: unknown }).enabled);
  }
  return false;
};

const getMeaningfulSpeakerName = (value: unknown): string => {
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return '';

  const lowerCaseValue = normalizedValue.toLowerCase();
  if (lowerCaseValue === 'unknown' || lowerCaseValue === 'unknown speaker') return '';

  return normalizedValue;
};

export const getSessionContactName = (session: DialpadSession | null): string => {
  const contactFirstName = String(session?.contactInfo?.name?.first || '').trim();
  const contactLastName = String(session?.contactInfo?.name?.last || '').trim();
  const contactInfoName = getMeaningfulSpeakerName(`${contactFirstName} ${contactLastName}`.trim());

  return (
    contactInfoName ||
    getMeaningfulSpeakerName(session?.liveCallData?.contact_name) ||
    getMeaningfulSpeakerName(getHeaderFirstValue(session?.headers, 'x-contactname')) ||
    getMeaningfulSpeakerName(session?.remoteName) ||
    UNKNOWN_CONTACT_LABEL
  );
};

export const getSessionSipCallId = (session: DialpadSession | null | undefined): string => {
  if (!session) return '';

  return String(
    session?.liveCallData?.sip_call_id ||
      getHeaderFirstValue(session?.headers, 'x-cid') ||
      getHeaderFirstValue(session?.headers, 'call-id') ||
      '',
  ).trim();
};

/** The socket event socket-api listens for, per transcription status. */
export const transcriptEventForStatus = (status: DialpadTranscriptionStatus): string => {
  if (status === 'stop') return 'transcript-stop';
  if (status === 'resume') return 'transcript-restart';
  return 'transcript';
};

type TranscriptionRequestOptions = {
  socketEventsManager: { emit?: (event: string, payload: unknown) => void } | null | undefined;
  session: DialpadSession | null | undefined;
  user?: any;
  status: DialpadTranscriptionStatus;
  /** Defaults to the agent's own call-monitoring setting. */
  sentimentMonitoring?: boolean;
  botEnabled?: boolean;
};

/**
 * Emits the request. Returns whether it actually went out, so a caller can
 * still move its own state when there is nothing to ask (no socket, or a call
 * whose id cannot be worked out — the ESL side keys on `sipCallId`, so a
 * request without one could never be matched to a channel).
 */
export const emitTranscriptionRequest = ({
  socketEventsManager,
  session,
  user,
  status,
  sentimentMonitoring,
  botEnabled = false,
}: TranscriptionRequestOptions): boolean => {
  if (!socketEventsManager?.emit || !session) return false;

  const sipCallId = getSessionSipCallId(session);
  if (!sipCallId) return false;

  const firstName = user?.user_info?.first_name || '';
  const lastName = user?.user_info?.last_name || '';
  const event = transcriptEventForStatus(status);

  socketEventsManager.emit(event, {
    data: {
      type: event,
      agent_extension: user?.user_info?.extension || '',
      agent_name: `${firstName} ${lastName}`.trim(),
      contact_name: getSessionContactName(session),
      contact_number: session.remoteNumber || '',
      direction: session.direction === 'outgoing' ? 'outbound' : 'inbound',
      sipCallId,
      sentiment_monitoring:
        sentimentMonitoring ?? isTruthySettingValue(user?.settings?.ai_call_monitoring),
      bot_enabled: botEnabled,
    },
  });

  return true;
};
