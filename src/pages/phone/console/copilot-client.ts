/* ============================================================================
 * COPILOT CLIENT — the frontend half of the agreed backend contract.
 *
 * Architecture decided with the team:
 *   - a dedicated `copilot` agent type (not the customer-facing chat agents)
 *   - past conversations live in a separate call store, queried at runtime
 *     (transcripts are NOT ingested into the marketing knowledge base)
 *   - proactive suggestions are pushed by a backend worker over the socket
 *     that Ask-Copilot already uses
 *   - transcript and suggested phrasings stay in the caller's language;
 *     coaching notes come back in the agent's UI language
 *
 * `COPILOT_BACKEND_ENABLED` is the master switch. Either position is safe:
 *
 *   OFF (current) — the console runs entirely on its own derived output. The
 *     socket listener is not attached and no copilot request is made.
 *   ON — the `copilot.suggestion` listener attaches, so proactive cards and
 *     say-this-next render the moment the backend worker starts emitting, with
 *     no frontend release. `context` and `feedback` stay inert regardless until
 *     `copilotContext` / `copilotFeedback` exist in @/services/api — they are
 *     optional-chained, so they resolve to undefined rather than firing at a
 *     route that would 404 once per call.
 *
 * Live output always wins when present; the derived cards remain the fallback,
 * so a quiet backend degrades the panel rather than emptying it.
 *
 * Backend contract (see the Copilot spec doc):
 *   POST /api/ai/copilot/context   { sipCallId, phone, contactId }
 *        -> { brief: BriefRow[], facts: Record<string, string> }
 *   POST /api/ai/copilot/recap     { sipCallId }
 *        -> { reason, happened, outcome[], actions[], stats[] }
 *   POST /api/ai/copilot/feedback  { sipCallId, suggestionId, vote, comment? }
 *   socket event `copilot.suggestion`
 *        -> { sipCallId, id, kind, level?, title, body, cites?, confidence,
 *             sayNext?: { text, language } }
 * ==========================================================================*/

import { useEffect, useMemo, useState } from 'react';
import { useDialpad } from '@/hooks/use-dialpad';
import type { DialpadSession } from '@/context/dialpad-context';
import type { BriefRow, CopilotCard } from './copilot-adapter';

/**
 * Master switch for the copilot backend integration. See the header comment for
 * exactly what each position does. Set to true when the backend worker starts
 * emitting `copilot.suggestion`.
 */
export const COPILOT_BACKEND_ENABLED = false;

export type CopilotSuggestion = CopilotCard & {
  confidence?: number;
  sayNext?: { text: string; language?: string };
};

const sipCallIdOf = (session: DialpadSession | null) => {
  if (!session) return '';
  const headers = session.headers || {};
  const header = (name: string) => {
    const entry = Object.entries(headers).find(
      ([k]) => k.trim().toLowerCase() === name.toLowerCase(),
    );
    const values = entry?.[1];
    return Array.isArray(values) && values.length ? String(values[0] || '').trim() : '';
  };
  return String(
    session.liveCallData?.sip_call_id || header('x-cid') || header('call-id') || '',
  ).trim();
};

/**
 * Proactive cards and say-this-next, pushed by the backend worker that follows
 * the transcript stream. Subscribes to the same socket Ask-Copilot uses.
 */
export const useCopilotSuggestions = (session: DialpadSession | null) => {
  const { dialpadAiSocket } = useDialpad();
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
  const sipCallId = sipCallIdOf(session);

  // a new call starts a clean slate
  useEffect(() => {
    setSuggestions([]);
  }, [session?.id]);

  useEffect(() => {
    if (!COPILOT_BACKEND_ENABLED || !dialpadAiSocket || !sipCallId) return;

    const onSuggestion = (payload: any) => {
      const data = Array.isArray(payload) ? payload[1] : payload;
      if (!data || typeof data !== 'object') return;
      if (String(data.sipCallId || '').trim() !== sipCallId) return;

      setSuggestions((prev) => {
        const next: CopilotSuggestion = {
          id: String(data.id || `${Date.now()}`),
          kind: data.kind || 'context',
          level: data.level,
          title: String(data.title || 'Copilot'),
          body: String(data.body || ''),
          src: 'Copilot · live',
          source: 'live',
          cites: Array.isArray(data.cites) ? data.cites : undefined,
          confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
          sayNext: data.sayNext,
        };
        // suggestions are replaced by id, so a refined one supersedes its draft
        const without = prev.filter((s) => s.id !== next.id);
        return [...without, next];
      });
    };

    dialpadAiSocket.on('copilot.suggestion', onSuggestion);
    return () => {
      dialpadAiSocket.off('copilot.suggestion', onSuggestion);
    };
  }, [dialpadAiSocket, sipCallId]);

  const sayNext = useMemo(() => {
    const withSay = suggestions.filter((s) => s.sayNext?.text);
    const latest = withSay[withSay.length - 1];
    return latest?.sayNext
      ? { text: latest.sayNext.text, src: 'Copilot · live', source: 'live' as const }
      : null;
  }, [suggestions]);

  return {
    /** empty until the backend ships — callers fall back to derived cards */
    cards: COPILOT_BACKEND_ENABLED ? suggestions : [],
    sayNext: COPILOT_BACKEND_ENABLED ? sayNext : null,
    isLive: COPILOT_BACKEND_ENABLED,
  };
};

/**
 * Pre-call brief and enrichment facts. Returns null until the backend exists,
 * which keeps the console on `buildBrief()`'s honest "not connected" rows.
 */
export const useCopilotContext = (session: DialpadSession | null) => {
  const [brief, setBrief] = useState<BriefRow[] | null>(null);
  const sipCallId = sipCallIdOf(session);
  const phone = String(session?.remoteNumber || '').trim();

  useEffect(() => {
    if (!COPILOT_BACKEND_ENABLED || (!sipCallId && !phone)) {
      setBrief(null);
      return;
    }
    let cancelled = false;
    // Deliberately lazy: the endpoint is only imported when the flag is on, so
    // no dead route reference ships while the backend is pending.
    import('@/services/api')
      .then((api: any) => api.copilotContext?.({ sipCallId, phone }))
      .then((res: any) => {
        if (cancelled) return;
        const rows = res?.data?.data?.result?.brief || res?.data?.brief;
        setBrief(Array.isArray(rows) ? rows : null);
      })
      .catch(() => {
        if (!cancelled) setBrief(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sipCallId, phone]);

  return brief;
};

/** Thumbs up/down on a suggestion — the training signal for the copilot. */
export const sendCopilotFeedback = async (input: {
  sipCallId: string;
  suggestionId: string;
  vote: 'up' | 'down';
  comment?: string;
}) => {
  if (!COPILOT_BACKEND_ENABLED) return false;
  try {
    const api: any = await import('@/services/api');
    await api.copilotFeedback?.(input);
    return true;
  } catch {
    return false;
  }
};
