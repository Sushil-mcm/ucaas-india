/* Agent screen capture: the rules and the recorder, kept apart from React.
 *
 * What it is. While an agent is on a call that a queue ("Also record the
 * agent's screen") or a coaching team ("Also record the trainees' screens")
 * says to capture, the browser records the agent's shared screen and stores
 * the video next to the call's audio recording. Supervisors and coaches open
 * it from the call record.
 *
 * How it works in a browser. Screen sharing needs a click: getDisplayMedia is
 * only granted inside a user gesture, so it cannot start by itself when a
 * call is answered automatically. The agent therefore shares their screen
 * ONCE for the shift (one click, one browser prompt); the stream stays open,
 * and this module starts and stops a MediaRecorder on it per call. No stream
 * means no capture, and the softphone says so.
 *
 * What is stored. One .webm per call per agent, uploaded through the same
 * presigned-URL path the company logo and fax uploads use, under the
 * company's `recording` folder as `<call id>_screen.webm`, then linked in
 * tenant-api (screen_recordings). Nothing here can fail the call.
 */

export type CaptureSource = { source: 'queue' | 'coaching'; source_id: string };

export interface CaptureRuleInput {
  /* The queue this session came through, with its settings, when known. */
  queueId?: string;
  queueSettings?: { screen_capture?: unknown } | null;
  /* The coaching teams the agent is a trainee of that want screens. */
  coachingTeamsWithScreen?: { uuid: string }[];
}

/* Whether this call should be captured, and which rule said so. The coaching
   rule wins the label when both apply; either alone is enough. */
export const captureSourceFor = (input: CaptureRuleInput): CaptureSource | null => {
  const team = (input.coachingTeamsWithScreen || [])[0];
  if (team?.uuid) return { source: 'coaching', source_id: String(team.uuid) };
  const wanted = input.queueSettings?.screen_capture;
  if (input.queueId && (wanted === true || wanted === 'true' || wanted === 1)) {
    return { source: 'queue', source_id: String(input.queueId) };
  }
  return null;
};

/* Statuses that mean "the far end has answered" - recording starts here. */
export const IN_CALL_STATUSES = new Set(['accepted', 'confirmed']);
export const OVER_STATUSES = new Set(['ended', 'failed']);

export const screenFileName = (callId: string) =>
  `${String(callId || '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, 60)}_screen.webm`;

/* The recorder's mime: VP8 in WebM is what every browser that can share a
   screen can also record; VP9 is smaller where it exists. */
export const pickRecorderMime = (isSupported: (mime: string) => boolean): string => {
  for (const mime of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
    if (isSupported(mime)) return mime;
  }
  return '';
};

/* A low frame rate and bitrate: this is a record of what was on screen, not a
   film. Five frames a second at ~400 kbit/s is readable and keeps a ten-minute
   call near 30 MB, under the upload limits in front of storage. */
export const DISPLAY_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: { frameRate: { ideal: 5, max: 8 } },
  audio: false,
};
export const RECORDER_BITS_PER_SECOND = 400_000;

export interface ActiveCapture {
  callId: string;
  recorder: MediaRecorder;
  chunks: Blob[];
  startedAt: Date;
  source: CaptureSource;
  extension: string;
}

/* Start recording the shared stream for one call. Returns null when the
   browser cannot record (no MediaRecorder, no supported mime). */
export const startCapture = (
  stream: MediaStream,
  callId: string,
  source: CaptureSource,
  extension: string,
  RecorderCtor: typeof MediaRecorder | undefined = typeof MediaRecorder !== 'undefined' ? MediaRecorder : undefined,
): ActiveCapture | null => {
  if (!RecorderCtor || !stream || stream.getVideoTracks().length === 0) return null;
  const mime = pickRecorderMime((m) => Boolean(RecorderCtor.isTypeSupported?.(m)));
  if (!mime) return null;
  let recorder: MediaRecorder;
  try {
    recorder = new RecorderCtor(stream, { mimeType: mime, videoBitsPerSecond: RECORDER_BITS_PER_SECOND });
  } catch {
    return null;
  }
  const capture: ActiveCapture = { callId, recorder, chunks: [], startedAt: new Date(), source, extension };
  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) capture.chunks.push(event.data);
  };
  recorder.start(2000);
  return capture;
};

/* Stop one capture and hand back the finished file (null when nothing was
   recorded, e.g. the call ended before the first chunk). */
export const stopCapture = (capture: ActiveCapture): Promise<{ blob: Blob; durationSeconds: number; endedAt: Date } | null> =>
  new Promise((resolve) => {
    const finish = () => {
      const endedAt = new Date();
      const blob = new Blob(capture.chunks, { type: capture.recorder.mimeType || 'video/webm' });
      const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - capture.startedAt.getTime()) / 1000));
      resolve(blob.size > 0 ? { blob, durationSeconds, endedAt } : null);
    };
    try {
      if (capture.recorder.state === 'inactive') return finish();
      capture.recorder.onstop = finish;
      capture.recorder.stop();
    } catch {
      finish();
    }
  });
