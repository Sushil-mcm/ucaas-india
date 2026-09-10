import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, UserCheck, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssistantSwitcher, useSelectedAssistant } from './assistant-switcher';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';
import PlaygroundTemplate, { type PendingTemplate } from './widget/PlaygroundTemplate';


type Source = { id: string; question: string; score: number };
type Message = {
  role: 'user' | 'assistant';
  content: string;
  handoff?: boolean;
  sources?: Source[];
  template?: PendingTemplate;
};

const FormattedMessage = ({ content, isUser }: { content: string; isUser: boolean }) => {
  if (isUser) {
    return <span>{content}</span>;
  }

  const linkRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<]+)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('[')) {
      const label = match[2];
      const url = match[3];
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all transition-colors"
        >
          {label}
        </a>
      );
    } else {
      const url = matchedStr.replace(/[.,;!?)]+$/, '');
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all transition-colors"
        >
          {url}
        </a>
      );
      const trailing = matchedStr.slice(url.length);
      if (trailing) {
        parts.push(trailing);
      }
    }
    lastIndex = match.index + matchedStr.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return (
    <div className="leading-relaxed whitespace-pre-wrap">
      {parts.length > 0 ? parts : content}
    </div>
  );
};

const CaptainPlayground = () => {
  const { assistants, selectedId: assistantId, selectAssistant } = useSelectedAssistant();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSelectAssistant = (id: string) => {
    if (id === assistantId) return;
    selectAssistant(id);
    setMessages([]);
    setError('');
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || !assistantId || isSending) return;
    setError('');
    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);
    try {
      // A template bubble has no text content — dropped from history so the
      // model isn't shown a blank assistant turn (Chatwoot: formatMessagesForApi).
      const history = messages.filter((m) => !m.template);
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants/${assistantId}/playground`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to get a response');
      const payload = json?.data || json;
      const replyContent = payload?.reply || payload?.response || 'No response';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: replyContent, handoff: payload?.handoff, sources: payload?.sources },
        // A lead/form/button/widget action the model called this turn — shown as
        // its own bubble right after the text reply (Chatwoot: pushPendingTemplates).
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

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-gray-950 dark:text-gray-100">Playground</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Test your assistant live before deploying it.</div>
        </div>
        <AssistantSwitcher assistants={assistants} selectedId={assistantId} onSelect={handleSelectAssistant} align="end" />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-gray-200 bg-white/70 p-5 shadow-inner dark:border-gray-700/80 dark:bg-gray-800/50"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <Bot className="size-8 text-gray-300 dark:text-gray-600" />
            Send a message to start testing this assistant.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                <Bot className="size-4" />
              </div>
            )}
            <div className={`flex max-w-[70%] flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              {m.template ? (
                <PlaygroundTemplate template={m.template} onPostback={(msg) => handleSend(msg)} />
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
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
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
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}
        {isSending && (
          <div className="flex items-end gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <Bot className="size-4" />
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-3.5 py-2.5 text-sm text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-700/90 dark:text-gray-400">
              Typing...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
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
        <Button type="button" variant="primary" onClick={() => handleSend()} disabled={!input.trim() || isSending || !assistantId}>
          <Send className="size-4" />
          Send
        </Button>
      </div>
    </div>
  );
};

export default CaptainPlayground;
