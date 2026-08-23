import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAISettingToken, getChatAgentList } from '@/services/api';
import { toast } from 'react-toastify';
import { useDialpad } from '@/hooks/use-dialpad';
import type { DialpadSession } from '@/context/dialpad-context';
import { contactDisplayName, toConsoleTurns } from './copilot-adapter';

/**
 * Ask-Copilot, on the platform's real AI pipeline.
 *
 * This is the same contract the dialpad's AI Assist tab uses — chat agent list
 * → per-agent token → `dialpadAiSocket` emit('question') / on('answer'), with
 * the thread stored on the session's AiInfo.AiChat. Extracted into a hook so
 * the console's ask dock and that tab cannot drift apart.
 */

type AskMessage = { role: 'q' | 'a'; text: string; pending?: boolean };

/** Keep the preamble small — the agent has a session token budget. */
const MAX_CONTEXT_TURNS = 12;
const MAX_CONTEXT_CHARS = 1800;

/**
 * Compose the call context sent alongside a question.
 *
 * The backend `context` endpoint (see the Copilot spec) does not exist yet, but
 * the socket's `text` field is free-form — so until it lands we prepend what
 * the console already knows. Without this the agent answers "what do I say
 * next?" with no idea who is on the line or what has been said, which is why
 * Ask-Copilot felt useless.
 *
 * The agent receives this; the agent-facing thread shows only the question.
 */
export const buildAskContext = (session: DialpadSession | null): string => {
  if (!session) return '';

  const facts: string[] = [];
  const name = contactDisplayName(session);
  if (name) facts.push(`Caller: ${name}`);
  if (session.remoteNumber) facts.push(`Number: ${session.remoteNumber}`);
  if (session.contactInfo?.company) facts.push(`Company: ${session.contactInfo.company}`);
  facts.push(`Direction: ${session.direction === 'incoming' ? 'inbound' : 'outbound'}`);
  const queue = session.queueMetaData?.response?.name;
  if (queue) facts.push(`Queue: ${queue}`);
  const campaign = session.campaignMetaData?.response?.name || session.liveCallData?.campaign_name;
  if (campaign) facts.push(`Campaign: ${campaign}`);
  if (!session.contactInfo) facts.push('This number is not in the contact book.');

  const turns = toConsoleTurns(session.transcriptionMessages, 'Agent', name || 'Customer')
    .filter((t) => !t.isSummary && t.text.trim())
    .slice(-MAX_CONTEXT_TURNS);

  let transcript = turns
    .map((t) => `${t.speaker === 'agent' ? 'Agent' : 'Customer'}: ${t.text.trim()}`)
    .join('\n');
  if (transcript.length > MAX_CONTEXT_CHARS) {
    transcript = `…${transcript.slice(-MAX_CONTEXT_CHARS)}`;
  }

  const parts = [
    'You are helping a support agent who is on a live call. Answer for the agent, not the customer. Be brief and specific.',
    `Call facts:\n${facts.join('\n')}`,
  ];
  if (transcript) {
    parts.push(`Recent transcript:\n${transcript}`);
  } else {
    parts.push('No transcript is available for this call yet.');
  }
  return parts.join('\n\n');
};

const resolveAiTokenValue = (response: any): string =>
  String(
    response?.data?.data?.result?.tokenId ||
      response?.data?.result?.tokenId ||
      response?.data?.data?.result?.token ||
      response?.data?.result?.token ||
      '',
  ).trim();

const resolveAiChatMessageText = (message: any): string => {
  if (!message) return '';
  const isUser = Boolean(message?.me) || String(message?.role || '').toLowerCase() === 'user';
  const candidate = isUser
    ? message?.text
    : message?.answer || message?.text || message?.message || message?.content;
  if (typeof candidate === 'string') return candidate;
  if (candidate === null || candidate === undefined) return '';
  if (typeof candidate === 'object') {
    if (typeof candidate?.text === 'string') return candidate.text;
    try {
      return JSON.stringify(candidate);
    } catch {
      return String(candidate);
    }
  }
  return String(candidate);
};

const normalizeAnswer = (payload: any): Record<string, any> | null => {
  if (payload === null || payload === undefined) return null;
  if (Array.isArray(payload)) {
    const [eventName, eventBody] = payload;
    if (
      payload.length === 2 &&
      typeof eventName === 'string' &&
      eventBody &&
      typeof eventBody === 'object' &&
      !Array.isArray(eventBody)
    ) {
      return { event: eventName, ...eventBody };
    }
    if (payload.length === 1) return normalizeAnswer(payload[0]);
    return { answer: JSON.stringify(payload), rawPayload: payload };
  }
  if (typeof payload === 'string') return { answer: payload };
  if (typeof payload === 'object') return payload as Record<string, any>;
  return { answer: String(payload) };
};

export const useCopilotAsk = (session: DialpadSession | null) => {
  const { patchSessionAiInfo, dialpadAiSocket, requestDialpadAiSocketAuth } = useDialpad();
  const [agentId, setAgentId] = useState('');
  const [thinking, setThinking] = useState(false);
  const pendingRef = useRef<any>(null);
  const sessionRef = useRef<DialpadSession | null>(null);
  const agentIdRef = useRef('');

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    agentIdRef.current = agentId;
  }, [agentId]);

  const { data: agentRows = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['getChatAgentList', 'console-copilot'],
    queryFn: () => getChatAgentList(),
    select: (data: any) => data?.data?.data?.result?.rows || [],
  });

  const agentOptions = useMemo(
    () =>
      (agentRows || [])
        .filter((a: any) => a?.agentType !== 'data')
        .map((a: any) => ({
          label: String(a?.agentName || '').trim() || 'Unnamed agent',
          value: String(a?.agent_uuid || '').trim() || String(a?.uuid || '').trim(),
        }))
        .filter((a: any) => Boolean(a.value)),
    [agentRows],
  );

  const sessionAgentId = String(session?.AiInfo?.AiAgentId || '').trim();
  const sessionToken = String(session?.AiInfo?.AiToken || '').trim();

  useEffect(() => {
    if (!agentOptions.length) {
      if (agentId) setAgentId('');
      return;
    }
    if (agentOptions.some((a: any) => a.value === agentId)) return;
    const fromSession = agentOptions.find((a: any) => a.value === sessionAgentId);
    setAgentId(fromSession ? fromSession.value : agentOptions[0].value);
  }, [agentOptions, agentId, sessionAgentId]);

  const tokenForSelected = agentId && agentId === sessionAgentId ? sessionToken : '';

  const { data: tokenResponse } = useQuery({
    queryKey: ['getAISettingToken', 'console-copilot', agentId],
    queryFn: () => getAISettingToken({ agentId }),
    enabled: Boolean(agentId && !tokenForSelected),
  });

  const aiToken = tokenForSelected || resolveAiTokenValue(tokenResponse);

  // Keep the session's AiInfo in step with the selected agent + token.
  useEffect(() => {
    const sessionId = String(session?.id || '').trim();
    if (!sessionId || !agentId) return;
    const existing = session?.AiInfo;
    const agentChanged = String(existing?.AiAgentId || '').trim() !== agentId;
    const nextChat = agentChanged ? [] : Array.isArray(existing?.AiChat) ? existing.AiChat : [];
    const normalizedToken = String(aiToken || '').trim();
    if (
      !agentChanged &&
      String(existing?.AiToken || '').trim() === normalizedToken &&
      Array.isArray(existing?.AiChat)
    ) {
      return;
    }
    patchSessionAiInfo(sessionId, {
      AiAgentId: agentId,
      AiToken: normalizedToken,
      AiChat: nextChat,
    });
  }, [session?.AiInfo, session?.id, aiToken, agentId, patchSessionAiInfo]);

  useEffect(() => {
    if (!dialpadAiSocket || !sessionToken) return;
    requestDialpadAiSocketAuth(sessionToken);
  }, [dialpadAiSocket, sessionToken, requestDialpadAiSocketAuth]);

  useEffect(() => {
    if (!dialpadAiSocket) return;

    const onAuthorized = () => {
      const payload = pendingRef.current;
      if (!payload) return;
      dialpadAiSocket.emit('question', payload);
      pendingRef.current = null;
    };

    const onUnauthorized = () => {
      const current = sessionRef.current;
      const sessionId = String(current?.id || '').trim();
      if (!sessionId) return;
      setThinking(false);
      patchSessionAiInfo(sessionId, {
        AiAgentId: String(current?.AiInfo?.AiAgentId || agentIdRef.current || '').trim(),
        AiToken: '',
        AiChat: Array.isArray(current?.AiInfo?.AiChat) ? current.AiInfo.AiChat : [],
      });
    };

    const onAnswer = (data: any) => {
      const current = sessionRef.current;
      const sessionId = String(current?.id || '').trim();
      if (!sessionId) return;
      setThinking(false);
      const answer = normalizeAnswer(data);
      if (!answer) return;
      const existingChat = Array.isArray(current?.AiInfo?.AiChat) ? current.AiInfo.AiChat : [];
      const terminal = Boolean(
        answer?.end ||
        answer?.limitExceeded ||
        String(answer?.reason || '')
          .trim()
          .toLowerCase() === 'session_limit_reached',
      );
      patchSessionAiInfo(sessionId, {
        AiAgentId: String(current?.AiInfo?.AiAgentId || agentIdRef.current || '').trim(),
        AiToken: terminal ? '' : String(current?.AiInfo?.AiToken || '').trim(),
        AiChat: [...existingChat, answer],
      });
      if (terminal) pendingRef.current = null;
    };

    dialpadAiSocket.on('authorized', onAuthorized);
    dialpadAiSocket.on('unauthorized', onUnauthorized);
    dialpadAiSocket.on('answer', onAnswer);
    return () => {
      dialpadAiSocket.off('authorized', onAuthorized);
      dialpadAiSocket.off('unauthorized', onUnauthorized);
      dialpadAiSocket.off('answer', onAnswer);
    };
  }, [dialpadAiSocket, patchSessionAiInfo]);

  useEffect(() => {
    setThinking(false);
  }, [session?.id, agentId]);

  const messages: AskMessage[] = useMemo(() => {
    const chat = Array.isArray(session?.AiInfo?.AiChat) ? session.AiInfo.AiChat : [];
    const mapped = chat
      .map((m: any) => {
        const isUser = Boolean(m?.me) || String(m?.role || '').toLowerCase() === 'user';
        return {
          role: isUser ? ('q' as const) : ('a' as const),
          text: resolveAiChatMessageText(m),
        };
      })
      .filter((m: AskMessage) => m.text);
    return thinking ? [...mapped, { role: 'a' as const, text: '', pending: true }] : mapped;
  }, [session?.AiInfo?.AiChat, thinking]);

  const noAgent = !agentsLoading && agentOptions.length === 0;
  const socketOffline = !dialpadAiSocket;

  const canAsk = Boolean(
    !noAgent &&
    !socketOffline &&
    session?.id &&
    String(session?.AiInfo?.AiAgentId || '').trim() &&
    sessionToken,
  );

  const ask = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;
      const current = sessionRef.current;
      const socket = dialpadAiSocket;
      const currentAgentId = String(current?.AiInfo?.AiAgentId || '').trim();
      const sessionId = String((current as any)?.activeSessionID || current?.id || '').trim();
      const token = String(current?.AiInfo?.AiToken || '').trim();
      // Previously a silent `return` — the send button did nothing and there
      // was no error anywhere. Say why instead.
      if (!socket) {
        toast.error('Copilot is offline — the AI service is not connected.');
        return;
      }
      if (!currentAgentId) {
        toast.error('No AI agent selected for Copilot.');
        return;
      }
      if (!sessionId || !token) {
        toast.error('Copilot is not ready for this call yet — try again in a moment.');
        return;
      }

      const existingChat = Array.isArray(current?.AiInfo?.AiChat) ? current.AiInfo.AiChat : [];
      // the thread shows what the agent typed…
      patchSessionAiInfo(sessionId, {
        AiAgentId: currentAgentId,
        AiToken: token,
        AiChat: [...existingChat, { me: true, text }],
      });
      setThinking(true);

      // …while the agent model receives it with the call wrapped around it
      const context = buildAskContext(current);
      const payload = {
        agentId: currentAgentId,
        sessionId,
        token,
        text: context ? `${context}\n\nAgent's question: ${text}` : text,
      };
      if (!socket.connected) {
        pendingRef.current = payload;
        requestDialpadAiSocketAuth(token);
        return;
      }
      socket.emit('question', payload);
    },
    [dialpadAiSocket, patchSessionAiInfo, requestDialpadAiSocketAuth],
  );

  const contextSummary = useMemo(() => {
    if (!session) return null;
    const turnCount = Array.isArray(session.transcriptionMessages)
      ? session.transcriptionMessages.filter((m) => String(m?.msg || '').trim()).length
      : 0;
    return {
      hasContact: Boolean(session.contactInfo),
      turns: Math.min(turnCount, MAX_CONTEXT_TURNS),
    };
  }, [session]);

  return {
    ask,
    socketOffline,
    contextSummary,
    messages,
    canAsk,
    noAgent,
    agentsLoading,
    agentOptions,
    agentId,
    setAgentId,
  };
};
