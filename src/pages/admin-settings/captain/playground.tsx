import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, UserCheck, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CAPTAIN_API_BASE = '/captain-api/api/captain';

type Assistant = { id: string; name: string };
type Source = { id: string; question: string; score: number };
type Message = { role: 'user' | 'assistant'; content: string; handoff?: boolean; sources?: Source[] };

const CaptainPlayground = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [assistantId, setAssistantId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${CAPTAIN_API_BASE}/assistants`)
      .then((res) => res.json())
      .then((json) => {
        const list = json.data || [];
        setAssistants(list);
        if (list.length) setAssistantId(list[0].id);
      })
      .catch(() => setError('Failed to load assistants'));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !assistantId || isSending) return;
    setError('');
    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/assistants/${assistantId}/playground`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to get a response');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: json.data.reply, handoff: json.data.handoff, sources: json.data.sources },
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
          <div className="text-lg font-bold text-[#2E2D35]">Playground</div>
          <div className="text-sm text-[#9A948F]">Test your assistant live before deploying it.</div>
        </div>
        <select
          value={assistantId}
          onChange={(e) => {
            setAssistantId(e.target.value);
            setMessages([]);
          }}
          className="min-h-10 rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none transition-all hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10"
        >
          {assistants.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-[#EEE7DD] bg-[#FBE2C8]/50 p-5"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[#9A948F]">
            <Bot className="size-8 text-gray-300" />
            Send a message to start testing this assistant.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-4" />
              </div>
            )}
            <div className={`flex max-w-[70%] flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-br-sm bg-primary text-white'
                    : 'rounded-bl-sm border border-gray-100 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] text-[#2E2D35]'
                }`}
              >
                {m.content}
              </div>
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
                      className="inline-flex items-center gap-1 rounded-full border border-[#EEE7DD] bg-white px-2.5 py-1 text-xs text-[#9A948F]"
                    >
                      <BookOpen className="size-3" />
                      {s.question}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {m.role === 'user' && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F0DFC5] text-[#9A948F]">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}
        {isSending && (
          <div className="flex items-end gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-4" />
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3.5 py-2.5 text-sm text-[#9A948F] shadow-sm">
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
        <Button type="button" variant="primary" onClick={handleSend} disabled={!input.trim() || isSending || !assistantId}>
          <Send className="size-4" />
          Send
        </Button>
      </div>
    </div>
  );
};

export default CaptainPlayground;
