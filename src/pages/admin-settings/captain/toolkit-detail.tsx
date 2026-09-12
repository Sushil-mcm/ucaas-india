import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Send, User, UserCheck, BookOpen, Plug, ChevronDown, ChevronRight, RefreshCw, ExternalLink, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormattedMessage } from '@/components/captain/FormattedMessage';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';

type Assistant = { id: string; name: string };
type Source = { id: string; question: string; score: number };
type Message = { role: 'user' | 'assistant'; content: string; handoff?: boolean; sources?: Source[] };
type Connection = { id: string; toolkit_slug: string; toolkit_name: string; connected_account_id: string; status: string; logo?: string | null };
type ComposioAction = {
  id: string | null;
  slug: string;
  name: string;
  description: string;
  input_parameters: any;
  enabled: boolean;
  operation_type: 'read' | 'write';
};
type Toolkit = { slug: string; name: string; description: string; logo: string | null; tools_count: number; categories: string[] };

const CaptainToolkitDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Assistants
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [assistantId, setAssistantId] = useState(searchParams.get('assistantId') || '');
  const [isLoadingAssistants, setIsLoadingAssistants] = useState(true);

  // Toolkit info
  const [toolkit, setToolkit] = useState<Toolkit | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [isLoadingToolkit, setIsLoadingToolkit] = useState(true);

  // Actions
  const [actions, setActions] = useState<ComposioAction[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const isPageLoading = !hasInitiallyLoaded && (isLoadingAssistants || isLoadingToolkit || isLoadingActions);

  // Playground
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch assistants — filtered to only those that have this toolkit connected
  useEffect(() => {
    if (!slug) return;
    setIsLoadingAssistants(true);
    Promise.all([
      captainFetch(`${CAPTAIN_API_BASE}/assistants`).then((r) => r.json()),
      captainFetch(`${CAPTAIN_API_BASE}/composio/toolkit-assistants?toolkit_slug=${slug}`).then((r) => r.json()),
    ])
      .then(([aJson, taJson]) => {
        const all = (aJson.data || []).map((a: any) => ({ ...a, id: String(a.id) }));
        const withToolkit = new Set<string>((taJson.data || []).map(String));
        const filtered = withToolkit.size > 0 ? all.filter((a: any) => withToolkit.has(a.id)) : all;
        setAssistants(filtered);
        if (assistantId && filtered.some((a: any) => a.id === assistantId)) return;
        if (filtered.length) setAssistantId(String(filtered[0].id));
      })
      .catch(() => {})
      .finally(() => setIsLoadingAssistants(false));
  }, [slug]);

  // Fetch toolkit info
  useEffect(() => {
    if (!slug) return;
    setIsLoadingToolkit(true);
    captainFetch(`${CAPTAIN_API_BASE}/composio/toolkits?search=${slug}&limit=50`)
      .then((res) => res.json())
      .then((json) => {
        const match = (json.data || []).find((tk: Toolkit) => tk.slug === slug);
        if (match) setToolkit(match);
      })
      .catch(() => {})
      .finally(() => setIsLoadingToolkit(false));
  }, [slug]);

  // Fetch connection + actions for this toolkit
  useEffect(() => {
    if (!slug || !assistantId) return;
    setIsLoadingActions(true);
    Promise.all([
      captainFetch(`${CAPTAIN_API_BASE}/composio/connections?assistant_id=${assistantId}`)
        .then((res) => res.json())
        .then((json) => {
          const conn = (json.data || []).find((c: Connection) => c.toolkit_slug === slug);
          setConnection(conn || null);
        })
        .catch(() => setConnection(null)),
      captainFetch(`${CAPTAIN_API_BASE}/composio/toolkits/${slug}/tools?assistant_id=${assistantId}`)
        .then((res) => res.json())
        .then((json) => setActions(json.data?.tools || []))
        .catch(() => setActions([])),
    ]).finally(() => {
      setIsLoadingActions(false);
      setHasInitiallyLoaded(true);
    });
  }, [slug, assistantId]);

  // Auto-scroll messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const websiteUrl = useMemo(() => {
    if (slug === 'gmail') return 'https://gmail.com';
    if (slug === 'slack') return 'https://slack.com';
    if (slug === 'github') return 'https://github.com';
    if (slug === 'googlecalendar' || slug === 'google_calendar') return 'https://calendar.google.com';
    if (slug === 'notion') return 'https://notion.so';
    if (slug === 'googlesheets' || slug === 'google_sheets') return 'https://sheets.google.com';
    return `https://${slug}.com`;
  }, [slug]);

  const samplePrompts = useMemo(() => {
    if (slug === 'gmail') return ['Fetch emails', 'Create email draft', 'Delete message'];
    if (slug === 'slack') return ['Send message to #general', 'List public channels', 'Search messages'];
    if (slug === 'github') return ['List my repositories', 'Create a new issue', 'Show pull requests'];
    if (slug === 'googlecalendar' || slug === 'google_calendar') return ['List upcoming events', 'Schedule a meeting', 'Check availability'];
    if (slug === 'notion') return ['Search pages', 'Create a new page', 'List databases'];
    if (slug === 'googlesheets' || slug === 'google_sheets') return ['Read sheet data', 'Append row to sheet', 'Create spreadsheet'];
    if (actions.length > 0) return actions.slice(0, 3).map((a) => a.name);
    return [];
  }, [slug, actions]);

  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if (!text || !assistantId || isSending) return;
    setError('');
    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    if (textToSend === undefined) setInput('');
    setIsSending(true);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants/${assistantId}/playground`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to get a response');
      const payload = json?.data || json;
      const replyContent = payload?.reply || payload?.response || 'No response';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: replyContent, handoff: payload?.handoff, sources: payload?.sources },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to get a response');
    } finally {
      setIsSending(false);
    }
  };

  const resetPlayground = () => {
    setMessages([]);
    setInput('');
    setError('');
  };

  const selectedAssistant = assistants.find((a) => a.id === assistantId);

  if (isPageLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <div className="size-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary dark:border-gray-700 dark:border-t-primary" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto p-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/admin-settings/captain/actions')}
        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer"
      >
        <ArrowLeft className="size-4" />
        Back to integrations
      </button>

      {/* Two-column layout */}
      <div className="flex flex-1 gap-8 min-h-0">
        {/* LEFT COLUMN — App info + Actions */}
        <div className="flex w-[42%] shrink-0 flex-col gap-5 overflow-y-auto pr-3">
          {/* Header */}
          <div className="flex items-start gap-4">
            {toolkit?.logo ? (
              <img src={toolkit.logo} alt="" className="size-14 rounded-2xl object-contain shadow-sm" />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Plug className="size-7 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">{toolkit?.name || slug}</h1>
                {connection?.status === 'ACTIVE' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {actions.length} {actions.length === 1 ? 'action' : 'actions'}
              </p>
            </div>
          </div>

          {/* Category tags */}
          {toolkit?.categories?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {toolkit.categories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1 rounded-full border border-blue-200/60 bg-blue-50/80 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                  <Tag className="size-3" />
                  {cat}
                </span>
              ))}
            </div>
          ) : null}

          {/* Description */}
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{toolkit?.description}</p>

          {/* Website link */}
          <div>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Visit website
              <ExternalLink className="size-3" />
            </a>
          </div>

          {/* Actions list */}
          <div className="mt-2">
            <h3 className="mb-3 text-sm font-bold text-gray-950 dark:text-gray-100">Actions</h3>
            {isLoadingActions ? (
              <div className="flex items-center gap-2 py-4">
                <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary dark:border-gray-600 dark:border-t-primary" />
                <span className="text-sm text-gray-400 dark:text-muted-foreground">Refreshing actions...</span>
              </div>
            ) : actions.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No actions found for this toolkit.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {actions.map((action) => (
                  <div key={action.slug} className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedAction(expandedAction === action.slug ? null : action.slug)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50/70 dark:hover:bg-neutral-800/50 cursor-pointer"
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{action.name}</span>
                      {expandedAction === action.slug ? (
                        <ChevronDown className="size-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
                      )}
                    </button>
                    {expandedAction === action.slug && (
                      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/90 flex flex-col gap-2.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{action.description || 'No description available.'}</p>
                        {action.input_parameters && action.input_parameters.length > 0 && (
                          <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-200/60 dark:border-neutral-800">
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Parameters:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {action.input_parameters.map((p: any) => (
                                <span key={p.name} className="inline-flex items-center rounded-md bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] text-gray-600 dark:text-gray-300 font-mono">
                                  {p.name}{p.required ? ' *' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Assistant + Playground */}
        <div className="flex flex-1 flex-col gap-4 min-h-0">
          {/* Assistant selector */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <Bot className="size-3.5" />
              <span>Assistant</span>
            </div>
            <select
              value={assistantId}
              onChange={(e) => {
                setAssistantId(e.target.value);
                setMessages([]);
              }}
              className="w-full min-h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none transition-all hover:border-primary dark:hover:border-primary focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
            >
              {assistants.map((a) => (
                <option key={a.id} value={a.id} className="dark:bg-neutral-800 dark:text-gray-100">
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Playground card */}
          <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70 min-h-0">
            {/* Playground header */}
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-3.5 dark:border-neutral-800">
              <div>
                <h2 className="text-sm font-bold text-gray-950 dark:text-gray-100">Playground</h2>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Use this playground to send messages to your assistant and check if it responds accurately, quickly, and in the tone you expect.
                </p>
              </div>
              <button
                type="button"
                onClick={resetPlayground}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-neutral-800 dark:hover:text-gray-300 cursor-pointer"
                title="Reset conversation"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>

            {/* Chat area */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto p-5"
            >
              {/* Initial message when no user messages */}
              {messages.length === 0 && (
                <div className="flex flex-col gap-4">
                  {/* Assistant greeting bubble */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-sm">
                      {(selectedAssistant?.name?.[0] || 'A').toUpperCase()}
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-[#2e2b4f] px-4 py-2.5 text-sm text-white shadow-sm dark:bg-[#2b274a]">
                      Hi! What can I help you with?
                    </div>
                  </div>

                  {/* Sample prompt suggestion chips aligned to right */}
                  {samplePrompts.length > 0 && (
                    <div className="flex flex-col items-end gap-2 pt-2">
                      {samplePrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleSendText(prompt)}
                          className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-primary hover:text-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary dark:hover:text-white cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat message thread */}
              {messages.map((m, i) => (
                <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-sm">
                      {(selectedAssistant?.name?.[0] || 'A').toUpperCase()}
                    </div>
                  )}
                  <div className={`flex max-w-[75%] flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                        m.role === 'user'
                          ? 'rounded-br-sm bg-blue-600 text-white'
                          : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800 dark:border-neutral-800 dark:bg-[#2b274a] dark:text-gray-100'
                      }`}
                    >
                      <FormattedMessage content={m.content} isUser={m.role === 'user'} />
                    </div>
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
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300"
                          >
                            <BookOpen className="size-3" />
                            {s.question}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-neutral-700 dark:text-gray-300">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex items-end gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-sm">
                    {(selectedAssistant?.name?.[0] || 'A').toUpperCase()}
                  </div>
                  <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-400 shadow-sm dark:border-neutral-800 dark:bg-[#2b274a] dark:text-gray-400">
                    Typing...
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            {error && (
              <div className="mx-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div>
            )}
            <div className="flex gap-2 border-t border-gray-100 px-5 py-3.5 dark:border-neutral-800">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button type="button" variant="primary" onClick={() => handleSendText()} disabled={!input.trim() || isSending || !assistantId}>
                <Send className="size-4" />
              </Button>
            </div>
            <div className="px-5 pb-3 text-center text-[11px] text-gray-400 dark:text-gray-500">
              Messages sent here will count toward your Captain credits.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptainToolkitDetail;
