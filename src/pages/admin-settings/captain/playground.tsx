import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Bot,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ReceiptText,
  Send,
  User,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { useSetAdminPageMeta } from '@/pages/admin-settings/admin-page-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormattedMessage } from '@/components/captain/FormattedMessage';
import { AssistantSwitcher, useSelectedAssistant } from './assistant-switcher';
import { CAPTAIN_API_BASE, captainErrorMessage, captainFetch } from '@/lib/captain-api';
import PlaygroundTemplate, { type PendingTemplate } from './widget/PlaygroundTemplate';
import { useVoiceTest } from './use-voice-test';

type Source = { id: string; question: string; score: number };
type Message = {
  role: 'user' | 'assistant';
  content: string;
  handoff?: boolean;
  sources?: Source[];
  template?: PendingTemplate;
};
type Mode = 'chat' | 'voice';

const SCENARIOS = [
  {
    key: 'technical',
    title: 'Technical issue',
    hint: 'Test troubleshooting flow',
    prompt: "My phone line isn't working. Calls drop after a few seconds. Can you help?",
    Icon: Wrench,
  },
  {
    key: 'refund',
    title: 'Refund request',
    hint: 'Test refund handling',
    prompt: 'I was charged twice this month and I would like a refund.',
    Icon: ReceiptText,
  },
  {
    key: 'feature',
    title: 'Feature inquiry',
    hint: 'Test product knowledge',
    prompt: 'Do you support call recording and call queues?',
    Icon: HelpCircle,
  },
  {
    key: 'escalation',
    title: 'Escalation',
    hint: 'Test transfer to a human',
    prompt: 'I want to speak to a real person, please.',
    Icon: UserCheck,
  },
];

const AGENT_STATE_LABEL: Record<string, string> = {
  initializing: 'Starting…',
  listening: 'Listening',
  thinking: 'Thinking…',
  speaking: 'Speaking',
};

const clock = (secs: number) =>
  `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

const CARD =
  'rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/70 to-white shadow-sm dark:border-gray-700 dark:from-gray-800/60 dark:to-gray-900';

const SectionHead = ({ Icon, title, right }: { Icon: any; title: string; right?: any }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-primary dark:bg-sky-900/40">
        <Icon className="size-5" />
      </span>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    </div>
    {right}
  </div>
);

const Tile = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
    <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{label}</div>
    <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</div>
  </div>
);

const CaptainPlayground = () => {
  useSetAdminPageMeta({
    description: 'Test your assistant by chat or voice before going live.',
  });
  const { assistants, selectedId: assistantId, selectAssistant } = useSelectedAssistant();
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [sayHint, setSayHint] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceTest(assistantId || null);
  const assistantName = assistants.find((a) => a.id === assistantId)?.name || '—';

  const handleSelectAssistant = (id: string) => {
    if (id === assistantId) return;
    selectAssistant(id);
    setMessages([]);
    setError('');
    setSayHint('');
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending, voice.lines, mode]);

  const handleSend = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || !assistantId || isSending) return;
    setError('');
    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);
    try {
      const history = messages.filter((m) => !m.template);
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants/${assistantId}/playground`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(captainErrorMessage(json, `Failed to get a response (${res.status})`));
      }
      const payload = json?.data || json;
      const replyContent = payload?.reply || payload?.response || 'No response';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: replyContent,
          handoff: payload?.handoff,
          sources: payload?.sources,
        },
        ...((payload?.pending_templates || []) as PendingTemplate[]).map((t) => ({
          role: 'assistant' as const,
          content: '',
          template: t,
        })),
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to get a response');
    } finally {
      setIsSending(false);
    }
  };

  const runScenario = (prompt: string) => {
    if (mode === 'chat') {
      void handleSend(prompt);
      return;
    }
    setSayHint(prompt);
    if (!voice.inCall) void voice.start();
  };

  const voiceStatus =
    voice.status === 'connecting'
      ? 'Connecting…'
      : voice.status === 'waiting'
        ? 'Waiting for the assistant…'
        : voice.status === 'live'
          ? AGENT_STATE_LABEL[voice.agentState] || 'Connected'
          : voice.status === 'ended'
            ? 'Call ended'
            : voice.numbers.length
              ? 'Ready to test'
              : 'No voice number';
  const statusDot =
    voice.status === 'live' || (voice.status === 'idle' && voice.numbers.length)
      ? 'bg-emerald-500'
      : voice.status === 'error' || !voice.numbers.length
        ? 'bg-gray-300'
        : 'bg-amber-400';
  const shownError = mode === 'voice' ? voice.error : error;
  const number = voice.numbers.find((n) => String(n.id) === voice.channelId);

  return (
    <div className="h-full w-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        {/* Test card */}
        <div className={`${CARD} border-sky-300 p-5 dark:border-sky-800`}>
          <div className="flex items-center justify-between gap-2">
            <AssistantSwitcher
              assistants={assistants}
              selectedId={assistantId}
              onSelect={handleSelectAssistant}
              align="start"
            />
            <span className="rounded-md bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary dark:bg-sky-900/40">
              {mode === 'voice' ? 'Voice agent' : 'Chat agent'}
            </span>
          </div>

          {/* The track has to be darker than the pill riding on it — both were
              white, so the active tab was invisible against its own container. */}
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 shadow-inner dark:bg-gray-900">
            {(['chat', 'voice'] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={voice.inCall}
                onClick={() => setMode(m)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                  mode === m
                    ? 'bg-white text-primary ring-2 ring-primary shadow-sm dark:bg-sky-900/40 dark:ring-sky-700'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                }`}
              >
                {m === 'chat' ? <MessageSquare className="size-4" /> : <Mic className="size-4" />}
                {m === 'chat' ? 'Chat' : 'Voice'}
              </button>
            ))}
          </div>

          {shownError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {shownError}
            </div>
          )}

          {mode === 'voice' ? (
            <div className="mt-5 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <span className={`size-2.5 rounded-full ${statusDot}`} />
                {voiceStatus}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {voice.numbers.length
                  ? voice.inCall
                    ? 'Speak naturally — the assistant is on the line.'
                    : 'Start a call to talk to your assistant.'
                  : 'Connect a number to this assistant under AI Voice Calls.'}
              </p>

              <div className="my-6 flex w-full items-center justify-center gap-4">
                <span className="h-px flex-1 border-t-2 border-dotted border-sky-300" />
                <div className="relative flex size-40 items-center justify-center">
                  <span
                    className={`absolute inset-0 rounded-full bg-sky-100/70 dark:bg-sky-900/30 ${
                      voice.status === 'live' && voice.agentState === 'speaking'
                        ? 'animate-ping'
                        : ''
                    }`}
                  />
                  <span className="absolute inset-4 rounded-full bg-sky-200/70 dark:bg-sky-800/40" />
                  <button
                    type="button"
                    onClick={voice.inCall ? voice.toggleMute : voice.start}
                    disabled={!voice.numbers.length || voice.status === 'connecting'}
                    className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg transition hover:scale-105 disabled:opacity-50"
                    aria-label={
                      voice.inCall ? (voice.muted ? 'Unmute' : 'Mute') : 'Start voice test'
                    }
                  >
                    {voice.muted ? <MicOff className="size-9" /> : <Mic className="size-9" />}
                  </button>
                </div>
                <span className="h-px flex-1 border-t-2 border-dotted border-sky-300" />
              </div>

              <div className="font-mono text-3xl font-bold text-gray-900 dark:text-gray-100">
                {clock(voice.elapsed)}
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-widest text-gray-500">
                Call duration
              </div>

              {voice.inCall ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={voice.end}
                  className="mt-5 h-11 rounded-full px-8"
                >
                  <PhoneOff className="size-4" />
                  End call
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={voice.start}
                  disabled={!voice.numbers.length}
                  className="mcm-voice-start-btn mt-5 h-11 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-8 text-white shadow-md"
                >
                  <Phone className="size-4" />
                  {voice.status === 'ended' || voice.status === 'error'
                    ? 'Call again'
                    : 'Start voice test'}
                </Button>
              )}
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Your mic in, the assistant's voice out — we'll ask for microphone permission.
              </p>

              {voice.numbers.length > 1 && (
                <select
                  value={voice.channelId}
                  disabled={voice.inCall}
                  onChange={(e) => voice.setChannelId(e.target.value)}
                  aria-label="Voice number"
                  className="mt-4 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  {voice.numbers.map((n) => (
                    <option key={n.id} value={String(n.id)}>
                      {n.label || n.phone_number}
                    </option>
                  ))}
                </select>
              )}

              <div className="mt-4 grid w-full grid-cols-3 gap-2 text-left">
                <Tile label="Number" value={number?.phone_number || '—'} />
                <Tile label="Assistant" value={assistantName} />
                <Tile
                  label="Status"
                  value={voice.muted ? 'Muted' : voice.inCall ? 'On call' : 'Idle'}
                />
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <span
                  className={`size-2.5 rounded-full ${assistantId ? 'bg-emerald-500' : 'bg-gray-300'}`}
                />
                {isSending ? 'Typing…' : assistantId ? 'Ready to test' : 'No assistant'}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Type a message the way a customer would.
              </p>
              <div className="mt-5 flex w-full gap-2">
                <Input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isSending || !assistantId}
                >
                  <Send className="size-4" />
                </Button>
              </div>
              <div className="mt-4 grid w-full grid-cols-2 gap-2 text-left">
                <Tile label="Assistant" value={assistantName} />
                <Tile label="Messages" value={String(messages.filter((m) => !m.template).length)} />
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="mt-3 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
                >
                  Clear conversation
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-gray-600 dark:bg-sky-900/20 dark:text-gray-300">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              <b>Tip:</b> try the scenarios on the right, and different ways of asking the same
              thing.
            </span>
          </div>
          <div ref={voice.audioRef} className="hidden" />
        </div>

        {/* Right sections */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className={`${CARD} p-5`}>
            <SectionHead
              Icon={mode === 'voice' ? Mic : MessageSquare}
              title={mode === 'voice' ? 'Live transcript' : 'Conversation'}
              right={
                mode === 'voice' && sayHint ? (
                  <span className="max-w-[55%] truncate rounded-full bg-sky-100 px-3 py-1 text-xs text-primary dark:bg-sky-900/40">
                    Say: “{sayHint}”
                  </span>
                ) : null
              }
            />
            <div
              ref={scrollRef}
              className="mt-4 h-[420px] space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60"
            >
              {mode === 'voice' ? (
                voice.lines.length ? (
                  voice.lines.map((l) => (
                    <div
                      key={l.id}
                      className={`flex ${l.who === 'you' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                          l.who === 'you'
                            ? 'rounded-br-sm bg-primary text-white'
                            : 'rounded-bl-sm border border-gray-100 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-700/90 dark:text-gray-100'
                        } ${l.final ? '' : 'opacity-70'}`}
                      >
                        {l.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-400">
                    <Mic className="size-8 text-gray-300" />
                    {voice.inCall
                      ? 'Say hello — the conversation appears here.'
                      : 'Start a voice test to see the transcript.'}
                  </div>
                )
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-400">
                  <Bot className="size-8 text-gray-300" />
                  Send a message or pick a scenario to start.
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {m.role === 'assistant' && (
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Bot className="size-4" />
                        </div>
                      )}
                      <div
                        className={`flex max-w-[75%] flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        {m.template ? (
                          <PlaygroundTemplate
                            template={m.template}
                            onPostback={(msg) => handleSend(msg)}
                          />
                        ) : (
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                              m.role === 'user'
                                ? 'rounded-br-sm bg-primary text-white'
                                : 'rounded-bl-sm border border-gray-100 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-700/90 dark:text-gray-100'
                            }`}
                          >
                            <FormattedMessage content={m.content} isUser={m.role === 'user'} />
                          </div>
                        )}
                        {m.handoff && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <UserCheck className="size-3" />
                            Handed off to a human agent
                          </span>
                        )}
                        {!!m.sources?.length && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.sources.map((s) => (
                              <span
                                key={s.id}
                                title={`Similarity ${s.score}`}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                <BookOpen className="size-3" />
                                {s.question}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {m.role === 'user' && (
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                          <User className="size-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isSending && <div className="text-sm text-gray-400">Typing…</div>}
                </>
              )}
            </div>
          </div>

          <div className={`${CARD} p-5`}>
            <SectionHead Icon={MessageSquare} title="Quick test scenarios" />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => runScenario(s.prompt)}
                  disabled={!assistantId || (mode === 'chat' ? isSending : !voice.numbers.length)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-sky-300 hover:shadow-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-900 dark:text-gray-100">
                      {s.title}
                    </span>
                    <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
                      {s.hint}
                    </span>
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                    {mode === 'voice' ? (
                      <Phone className="size-4" />
                    ) : (
                      <s.Icon className="size-4" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptainPlayground;
