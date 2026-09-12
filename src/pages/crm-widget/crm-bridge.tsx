/**
 * CrmBridge — the one piece of glue between the softphone and whichever CRM is
 * hosting the widget. Written once; the per-CRM differences live in adapters/.
 *
 *   CRM  -> softphone   adapter calls host.dial()  => dialpad.makeCall()
 *   softphone -> CRM    session transitions        => adapter.onCall*()
 *
 * Renders nothing.
 */
import { useEffect, useRef } from 'react';
import { useDialpad } from '@/hooks/use-dialpad';
import { createAdapter } from './adapters';
import type { CrmAdapter, CrmCallEvent } from './adapters';

type ReportedState = {
  sessionId?: string;
  started?: boolean;
  answered?: boolean;
  ended?: boolean;
};

const CrmBridge = ({ crmId }: { crmId: string }) => {
  const { makeCall, openDialpad, sessions, activeSessionId, isRegistered } = useDialpad();

  const adapterRef = useRef<CrmAdapter | null>(null);
  const reportedRef = useRef<ReportedState>({});

  // Latest dial fns in a ref, so the adapter is created exactly once and never
  // re-subscribes to the host SDK on re-render.
  const dialRef = useRef({ makeCall, openDialpad });
  dialRef.current = { makeCall, openDialpad };

  useEffect(() => {
    const adapter = createAdapter(crmId);
    adapterRef.current = adapter;

    void Promise.resolve(
      adapter.connect({
        dial: ({ number }) => {
          dialRef.current.openDialpad?.('maxi');
          dialRef.current.makeCall?.(number);
        },
        setVisible: (visible) => {
          if (visible) dialRef.current.openDialpad?.('maxi');
        },
      }),
    ).catch((error) => {
      // A host SDK that never loads must not take the softphone down with it:
      // the agent can still dial manually from the widget.
      console.error(`CrmBridge ~ ${crmId} adapter failed to connect:`, error);
    });

    return () => {
      adapter.dispose?.();
      adapterRef.current = null;
    };
  }, [crmId]);

  // Softphone registration -> host agent-availability state.
  useEffect(() => {
    adapterRef.current?.setLoggedIn?.(isRegistered);
  }, [isRegistered]);

  // Session transitions -> host call lifecycle. Each transition fires once per
  // session; the guard resets when a different session becomes active.
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    const session = activeSessionId ? sessions?.[activeSessionId] : null;
    if (!session) return;

    if (reportedRef.current.sessionId !== session.id) {
      reportedRef.current = { sessionId: session.id };
    }
    const reported = reportedRef.current;
    const status = String(session.status || '').toLowerCase();

    const event: CrmCallEvent = {
      sessionId: session.id,
      number: session.remoteNumber,
      name: session.remoteName,
      direction: session.direction,
      startedAt: session.startedAt,
      status,
    };

    if (!reported.started) {
      reported.started = true;
      adapter.onCallStarted?.(event);
    }

    if (!reported.answered && (session.hasAnswered || status === 'accepted' || status === 'confirmed')) {
      reported.answered = true;
      adapter.onCallAnswered?.(event);
    }

    if (!reported.ended && (status === 'ended' || status === 'failed')) {
      reported.ended = true;
      adapter.onCallEnded?.(event);
    }
  }, [sessions, activeSessionId]);

  return null;
};

export default CrmBridge;
