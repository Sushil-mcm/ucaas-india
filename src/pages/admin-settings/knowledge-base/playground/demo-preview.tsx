/**
 * The Playground's preview, in demo mode.
 *
 * Normally this panel loads an external widget from `VITE_AI_URL`. That
 * variable is unset on a preview host, so `getAiWidgetScriptUrl()` returns an
 * empty string, the loader bailed with "AI widget URL is missing." and the
 * panel sat on its spinner. There is no widget service to point at, so the fix
 * is not a URL - it is to stop pretending one is being fetched.
 *
 * What renders instead is the widget's own shape: the dark launcher card, then
 * the conversation it opens into. Following the real widget matters because
 * this screen exists to show somebody what a caller or visitor would meet, and
 * a panel that looks nothing like the thing being configured teaches the wrong
 * expectation.
 *
 * Nothing is behind either surface. A one-line note under the launcher says so,
 * and the panel header above already reads "Sandbox mode" - kept deliberately,
 * because a convincing reply from an agent badged "Live" is exactly what
 * somebody would take for a working product. Replies are canned and chosen by
 * keyword; no model is called, no audio is captured, and nothing typed here is
 * stored anywhere. No microphone is opened either: a real permission prompt for
 * something that is not happening would be worse than the spinner was.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, MessageSquare, Mic, Phone, PhoneOff, Send } from 'lucide-react';

type Mode = 'chat' | 'call';

interface DemoPreviewProps {
  agentName: string;
  mode: Mode;
}

interface ChatLine {
  id: number;
  from: 'agent' | 'caller';
  text: string;
}

/* Answers are matched on a keyword so the panel responds to what was actually
   typed rather than cycling blindly - the difference between a sandbox that can
   be demonstrated and one that reads as broken. Each answer says what a real
   agent would draw on, rather than inventing a fact about a business. */
const CANNED: Array<{ match: RegExp; reply: string }> = [
  {
    match: /\b(hour|open|close|closing|timing|time)\b/i,
    reply:
      'In the live product I would answer from the hours set on this agent. The sandbox has none to read, so there is nothing to quote.',
  },
  {
    match: /\b(price|pricing|cost|plan|quote|fee)\b/i,
    reply:
      'Pricing is answered from the pages picked for this agent, and the sandbox ingests nothing, so I have no figures to give you.',
  },
  {
    match: /\b(address|where|location|office|reach|find)\b/i,
    reply:
      'I would read the address off the scanned site. This sandbox scans nothing, so there is no address behind this reply.',
  },
  {
    match: /\b(human|agent|person|transfer|speak|someone)\b/i,
    reply:
      'A transfer would hand you to the queue or extension chosen in Advanced Settings. Nothing is dialled from the sandbox.',
  },
];

const FALLBACK =
  'That would go to this agent knowledge base for an answer. The sandbox has none connected, so this reply is canned rather than generated.';

const replyTo = (text: string) => CANNED.find((row) => row.match.test(text))?.reply || FALLBACK;

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * The widget shell: a dark header over a white body, centred in the panel.
 *
 * Both modes and every state share it, so the launcher and the conversation it
 * opens into are visibly the same surface rather than two different screens.
 */
const WidgetCard = ({
  icon,
  title,
  subtitle,
  children,
  footer,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
    <div className="flex max-h-full w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_-12px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col items-center gap-2 bg-[#111114] px-6 py-7 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#111114]">
          {icon}
        </div>
        <h3 className="mt-1 text-[22px] font-extrabold leading-tight text-white">{title}</h3>
        <p className="text-[13px] text-white/70">{subtitle}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      {footer ? <div className="px-5 pb-5 pt-1">{footer}</div> : null}
    </div>
  </div>
);

/** The widget's own call to action - a full-width black pill. */
const WidgetButton = ({
  onClick,
  icon,
  children,
  tone = 'dark',
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: 'dark' | 'danger';
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-bold text-white transition-opacity hover:opacity-90 ${
      tone === 'danger' ? 'bg-rose-600' : 'bg-[#111114]'
    }`}
  >
    {icon}
    {children}
  </button>
);

/* Said once, under the launcher, rather than as a banner across the panel: the
   point of this screen is to show the widget, and a bar above it would be the
   first thing read every time. */
const SandboxNote = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">{children}</p>
);

const ChatPreview = ({ agentName }: { agentName: string }) => {
  const [started, setStarted] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStarted(false);
    setLines([]);
    setDraft('');
  }, [agentName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  const start = () => {
    nextId.current = 2;
    setLines([
      {
        id: 0,
        from: 'agent',
        text: `Hello, this is ${agentName}. Ask me something to see how a reply appears here.`,
      },
      {
        id: 1,
        from: 'agent',
        text: 'Nothing you type is sent anywhere, and the answers are written in advance.',
      },
    ]);
    setStarted(true);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setLines((prev) => [
      ...prev,
      { id: nextId.current++, from: 'caller', text },
      { id: nextId.current++, from: 'agent', text: replyTo(text) },
    ]);
    setDraft('');
  };

  const header = {
    icon: <Bot className="h-7 w-7" />,
    title: (
      <>
        Hi, welcome <span aria-hidden="true">👋</span>
      </>
    ),
    subtitle: (
      <>
        Chat with <span className="font-bold text-white">{agentName}</span>
      </>
    ),
  };

  if (!started) {
    return (
      <WidgetCard
        {...header}
        footer={
          <>
            <WidgetButton onClick={start} icon={<MessageSquare className="h-[18px] w-[18px]" />}>
              New conversation
            </WidgetButton>
            <SandboxNote>
              Sandbox preview - no AI is connected and the replies are written in advance.
            </SandboxNote>
          </>
        }
      >
        <div className="flex min-h-[220px] flex-1 flex-col px-5 pt-5">
          <p className="text-[13px] font-bold text-primary">Your conversations</p>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FBE2C8]/50">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-bold text-primary">No recent conversations</p>
            <p className="text-xs text-slate-400">Start a new one below</p>
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      {...header}
      footer={
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Type a message..."
            maxLength={300}
            className="h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 text-[13px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111114] text-white transition-opacity disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {lines.map((line) => (
          <div
            key={line.id}
            className={`flex ${line.from === 'caller' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                line.from === 'caller'
                  ? 'rounded-br-sm bg-[#111114] text-white'
                  : 'rounded-bl-sm bg-[#FBE2C8]/50 text-slate-800'
              }`}
            >
              {line.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </WidgetCard>
  );
};

/* The call is a rehearsal of the shape of one - ringing, answered, a transcript
   filling in, a timer - and nothing more. */
const TRANSCRIPT = [
  { at: 1, from: 'agent', text: 'Thank you for calling. How can I help?' },
  { at: 4, from: 'caller', text: 'I wanted to ask about my account.' },
  { at: 7, from: 'agent', text: 'I can look that up once an account is connected.' },
  { at: 11, from: 'caller', text: 'Can I speak to someone?' },
  { at: 14, from: 'agent', text: 'A transfer would go to the queue set on this agent.' },
] as const;

const CallPreview = ({ agentName }: { agentName: string }) => {
  const [state, setState] = useState<'idle' | 'ringing' | 'connected' | 'ended'>('idle');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setState('idle');
    setSeconds(0);
  }, [agentName]);

  useEffect(() => {
    if (state === 'ringing') {
      const timer = window.setTimeout(() => setState('connected'), 1600);
      return () => window.clearTimeout(timer);
    }
    if (state === 'connected') {
      const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, [state]);

  const shownLines = useMemo(
    () => (state === 'idle' || state === 'ringing' ? [] : TRANSCRIPT.filter((l) => l.at <= seconds)),
    [seconds, state],
  );

  const header = {
    icon: <Phone className="h-7 w-7" />,
    title: (
      <>
        Prefer to Talk? <span aria-hidden="true">👋</span>
      </>
    ),
    subtitle: 'Click here to call our AI assistant',
  };

  if (state === 'idle' || state === 'ended') {
    return (
      <WidgetCard
        {...header}
        footer={
          <>
            <WidgetButton
              onClick={() => {
                setSeconds(0);
                setState('ringing');
              }}
              icon={<Phone className="h-[18px] w-[18px]" />}
            >
              {state === 'ended' ? 'Start again' : 'Start conversation'}
            </WidgetButton>
            <SandboxNote>
              Sandbox preview - no call is placed, no microphone is opened, and the transcript is
              scripted.
            </SandboxNote>
          </>
        }
      >
        <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-5 px-8 py-8 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
            <Mic className="h-9 w-9 text-slate-400" />
          </div>
          <p className="text-[15px] leading-relaxed text-slate-500">
            {state === 'ended' ? (
              <>
                Call with <span className="font-bold text-slate-800">{agentName}</span> ended after{' '}
                {formatDuration(seconds)}.
              </>
            ) : (
              <>
                Our AI agent <span className="font-bold text-slate-800">{agentName}</span> is ready
                to assist you over a voice call.
              </>
            )}
          </p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      {...header}
      footer={
        <WidgetButton
          onClick={() => setState('ended')}
          icon={<PhoneOff className="h-[18px] w-[18px]" />}
          tone="danger"
        >
          End call
        </WidgetButton>
      }
    >
      <div className="flex min-h-[220px] flex-1 flex-col px-5 py-5">
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FBE2C8]/60 text-xl font-extrabold uppercase text-primary">
            {agentName.charAt(0) || 'A'}
          </div>
          <p className="mt-1 text-sm font-bold text-slate-800">{agentName}</p>
          <p className="text-[12px] font-semibold text-slate-400">
            {state === 'ringing' ? 'Connecting...' : formatDuration(seconds)}
          </p>
        </div>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {shownLines.map((line) => (
            <div key={line.at} className="text-[12px] leading-relaxed">
              <span
                className={`font-bold ${line.from === 'agent' ? 'text-primary' : 'text-slate-800'}`}
              >
                {line.from === 'agent' ? agentName : 'Caller'}:
              </span>{' '}
              <span className="text-slate-500">{line.text}</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
};

export const PlaygroundDemoPreview = ({ agentName, mode }: DemoPreviewProps) => {
  const name = agentName?.trim() || 'This agent';
  return mode === 'call' ? <CallPreview agentName={name} /> : <ChatPreview agentName={name} />;
};

export default PlaygroundDemoPreview;
