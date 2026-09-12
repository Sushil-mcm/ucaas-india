import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MonitorUp, MonitorX } from 'lucide-react';
import { useDialpad } from '@/hooks/use-dialpad';
import { useUser } from '@/hooks/use-user';
import { getHeaderFirstValue } from './session-display';
import { mediaUploadUrl, myCoachingTeams, saveScreenRecording } from '@/services/api';
import {
  ActiveCapture,
  DISPLAY_CONSTRAINTS,
  IN_CALL_STATUSES,
  OVER_STATUSES,
  captureSourceFor,
  screenFileName,
  startCapture,
  stopCapture,
} from '@/lib/screen-capture';

/* Agent screen capture, in the app.
 *
 * Watches the softphone's sessions. When a call that a queue or a coaching
 * team says to capture is answered, records the agent's shared screen until
 * it ends, uploads the file beside the call's audio recording and links it.
 * See src/lib/screen-capture.ts for the rules and the browser constraints;
 * the one that shapes this component is that a screen can only be shared on
 * a click, so the agent shares it once for the shift from the pill this
 * renders, and calls after that are recorded without another prompt.
 *
 * Mounted once, next to the dialpad overlay. Renders nothing unless a rule
 * applies to this agent right now. */

const REQUEST_TIMEOUT_MS = 30000;

const ScreenCaptureController = () => {
  const { sessions } = useDialpad();
  const { user } = useUser();
  const companyUuid = String(user?.company_info?.uuid || '').trim();
  const extension = String(user?.user_info?.extension || '').trim();

  const teams = useQuery({
    queryKey: ['myCoachingTeams'],
    queryFn: myCoachingTeams,
    enabled: Boolean(companyUuid),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const coachingTeamsWithScreen = useMemo(
    () =>
      ((teams.data?.data?.data?.result?.training || []) as any[])
        .filter((t) => t?.record_screen === true)
        .map((t) => ({ uuid: String(t.uuid) })),
    [teams.data],
  );

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState('');
  const captures = useRef<Record<string, ActiveCapture>>({});
  const finishing = useRef<Set<string>>(new Set());

  /* Which live sessions this agent should be capturing, and why. */
  const wanted = useMemo(() => {
    const out: Record<string, { source: 'queue' | 'coaching'; source_id: string }> = {};
    Object.values(sessions || {}).forEach((session: any) => {
      const status = String(session?.status || '').toLowerCase();
      if (OVER_STATUSES.has(status)) return;
      const source = captureSourceFor({
        queueId: session?.queueMetaData?.id,
        queueSettings: session?.queueMetaData?.response?.settings ?? session?.queueMetaData?.response?.data?.settings ?? null,
        coachingTeamsWithScreen,
      });
      if (source) out[session.id] = source;
    });
    return out;
  }, [sessions, coachingTeamsWithScreen]);
  const required = Object.keys(wanted).length > 0 || coachingTeamsWithScreen.length > 0;

  const share = useCallback(async () => {
    if (asking) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setNotice('This browser cannot share a screen.');
      return;
    }
    setAsking(true);
    setNotice('');
    try {
      const next = await Promise.race([
        navigator.mediaDevices.getDisplayMedia(DISPLAY_CONSTRAINTS),
        new Promise<MediaStream>((_, reject) => setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT_MS)),
      ]);
      next.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => setStream((current) => (current === next ? null : current)));
      });
      setStream(next);
    } catch (error: any) {
      setNotice(
        error?.name === 'NotAllowedError'
          ? 'Screen sharing was refused. Your calls will not be screen-recorded until you share.'
          : 'Screen sharing could not start.',
      );
    } finally {
      setAsking(false);
    }
  }, [asking]);

  const stopSharing = useCallback(() => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }, [stream]);

  /* Finish one capture: stop, upload, link. Nothing here can touch the call. */
  const finish = useCallback(
    async (callId: string) => {
      const capture = captures.current[callId];
      if (!capture || finishing.current.has(callId)) return;
      finishing.current.add(callId);
      delete captures.current[callId];
      try {
        const done = await stopCapture(capture);
        if (!done || !companyUuid) return;
        const ask = await mediaUploadUrl({ uuid: companyUuid, type: 'recording', file_name: screenFileName(capture.callId) });
        const result = ask?.data?.data?.result;
        if (!result?.url || !result?.file_name) throw new Error('no upload address');
        const put = await fetch(result.url, {
          method: 'PUT',
          headers: { 'Content-Type': done.blob.type || 'video/webm' },
          body: done.blob,
        });
        if (!put.ok) throw new Error(`storage refused (${put.status})`);
        await saveScreenRecording({
          call_uuid: capture.callId,
          extension: capture.extension,
          file_name: result.file_name,
          mime: done.blob.type || 'video/webm',
          size_bytes: done.blob.size,
          duration_seconds: done.durationSeconds,
          started_at: capture.startedAt.toISOString(),
          ended_at: done.endedAt.toISOString(),
          source: capture.source.source,
          source_id: capture.source.source_id,
        });
      } catch (error: any) {
        setNotice(`A screen recording could not be saved (${error?.message || 'error'}).`);
      } finally {
        finishing.current.delete(callId);
      }
    },
    [companyUuid],
  );

  /* Start on answer, stop on hang-up. */
  useEffect(() => {
    Object.values(sessions || {}).forEach((session: any) => {
      const status = String(session?.status || '').toLowerCase();
      const source = wanted[session.id];
      const callId = String(getHeaderFirstValue(session?.headers, 'x-cid') || session?.id || '').trim();
      if (source && stream && IN_CALL_STATUSES.has(status) && !captures.current[session.id] && callId) {
        const capture = startCapture(stream, callId, source, extension);
        if (capture) captures.current[session.id] = capture;
      }
      if (OVER_STATUSES.has(status) && captures.current[session.id]) void finish(session.id);
    });
    /* Sessions that vanished without an ended status. */
    Object.keys(captures.current).forEach((sessionId) => {
      if (!sessions?.[sessionId]) void finish(sessionId);
    });
  }, [sessions, wanted, stream, extension, finish]);

  /* The shared stream stopping mid-call (the browser's own "Stop sharing")
     ends every capture on it. */
  useEffect(() => {
    if (stream) return;
    Object.keys(captures.current).forEach((sessionId) => void finish(sessionId));
  }, [stream, finish]);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  if (!required && !stream) return null;
  const recordingNow = Object.keys(captures.current).length > 0;
  return (
    <div
      className="fixed left-1/2 top-2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#d8e4f8] bg-white/95 px-3 py-1.5 text-xs shadow-[0_8px_24px_rgba(25,58,112,0.16)]"
      role="status"
    >
      {stream ? (
        <>
          <span className={`inline-block h-2 w-2 rounded-full ${recordingNow ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-[#1b2e4b]">
            {recordingNow ? 'Recording your screen for this call' : 'Screen sharing on for your calls'}
          </span>
          <button
            type="button"
            onClick={stopSharing}
            className="inline-flex items-center gap-1 rounded-full bg-[#ffdfe3] px-2 py-0.5 text-[#be2237] hover:bg-[#ffc7cf]"
          >
            <MonitorX className="h-3 w-3" /> Stop
          </button>
        </>
      ) : (
        <>
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-[#1b2e4b]">
            Screen capture is on for your calls. Share your screen once for this shift.
          </span>
          <button
            type="button"
            onClick={share}
            disabled={asking}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-white hover:opacity-90 disabled:opacity-60"
          >
            <MonitorUp className="h-3 w-3" /> {asking ? 'Asking…' : 'Share screen'}
          </button>
        </>
      )}
      {notice ? <span className="text-[#be2237]">{notice}</span> : null}
    </div>
  );
};

export default ScreenCaptureController;
