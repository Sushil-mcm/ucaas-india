import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Send, User, BookOpen, UserCheck, RotateCcw,
  ChevronDown, Check, Server, LayoutPanelTop, LayoutTemplate, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCustomToolDraft } from '@/hooks/use-custom-tool-draft';
import WidgetSection from './widget/WidgetSection';
import { draftStore } from './widget/helpers/draft-store';
import {
  deriveWidgetConfigFromTool,
  deriveLeadFieldsFromWidget,
  deriveFormFieldsFromWidget,
  unwrapLibrarySelect,
  withSourceWidgetId,
} from './widget/helpers/templates';
import type { WidgetConfig } from './widget/helpers/types';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';
import PlaygroundTemplate, { type PendingTemplate } from './widget/PlaygroundTemplate';


// API: operation_type is integer — 0 = write, 1 = read
const OP_READ = 1;
const OP_WRITE = 0;

const FIELD_LIMITS = { lead: 10, form: 10, button: 5 };

const makeSlug = (kind: string, title: string) =>
  `${kind}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || kind}_${Date.now()}`;

let webhookRowId = 0;
const newWebhookRow = (url = ''): { id: number; url: string } => {
  webhookRowId += 1;
  return { id: webhookRowId, url };
};

type LeadField = { key: 'name' | 'email' | 'phone'; label: string; type: string; required: boolean; enabled: boolean };
type FormField = { label: string; type: 'text' | 'email' | 'phone' | 'number' | 'select'; required: boolean; placeholder: string; options: { label: string; value: string }[] };
type ToolButton = { label: string; action: 'open_url' | 'send_message'; url: string; message: string };
type Param = { name: string; type: string; description: string; required: boolean };
type Assistant = { id: string; name: string };
type Message = { role: 'user' | 'assistant'; content: string; handoff?: boolean; sources?: { id: string; question: string; score: number }[]; template?: PendingTemplate };

const inputCls =
  'w-full min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-xs outline-none transition-all focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 dark:border-neutral-700 dark:bg-neutral-800/90 dark:text-white dark:placeholder:text-neutral-500';
const selectCls =
  'min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-xs outline-none transition-all focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-800/90 dark:text-white';
const textareaCls =
  'w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-xs outline-none transition-all focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 dark:border-neutral-700 dark:bg-neutral-800/90 dark:text-white dark:placeholder:text-neutral-500';
const rowCls = 'rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 dark:border-neutral-700/60 dark:bg-neutral-800 shadow-2xs';

const defaultLeadFields = (): LeadField[] => [
  { key: 'name', label: 'Full Name', type: 'text', required: true, enabled: true },
  { key: 'email', label: 'Email Address', type: 'email', required: true, enabled: true },
  { key: 'phone', label: 'Phone Number', type: 'phone', required: false, enabled: false },
];

// ── Inline Playground ─────────────────────────────────────────────────────────

const InlinePlayground = ({ assistantId, assistantName, samplePrompts = [] }: { assistantId: string; assistantName?: string; samplePrompts?: string[] }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMessages([]); }, [assistantId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, isSending]);

  const send = async (overrideText?: string) => {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text || !assistantId || isSending) return;
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    if (overrideText === undefined) setInput('');
    setIsSending(true);
    try {
      // A template bubble has no text content — dropped from history so the
      // model isn't shown a blank assistant turn (matches playground.tsx).
      const history = messages.filter((m) => !m.template);
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants/${assistantId}/playground`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message);
      const p = json?.data || json;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: p?.reply || p?.response || 'No response', handoff: p?.handoff, sources: p?.sources },
        // A lead/form/button/widget action the model called this turn — shown as
        // its own bubble right after the text reply (matches playground.tsx).
        ...((p?.pending_templates || []) as PendingTemplate[]).map((t) => ({
          role: 'assistant' as const,
          content: '',
          template: t,
        })),
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally { setIsSending(false); }
  };

  const reset = () => { setMessages([]); setInput(''); };

  if (!assistantId) return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500">
      Select an assistant to preview
    </div>
  );

  const initial = (assistantName?.[0] || 'A').toUpperCase();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60 min-h-0">
      <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
        <div>
          <div className="text-base font-semibold text-gray-950 dark:text-white">Playground</div>
          <p className="text-xs text-gray-400 dark:text-neutral-400 mt-0.5 leading-relaxed">
            Use this playground to send messages to your assistant and check if it responds accurately, quickly, and in the tone you expect.
          </p>
        </div>
        <button type="button" onClick={reset} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-neutral-800 dark:hover:text-gray-300 cursor-pointer shrink-0 ml-2" title="Reset">
          <RotateCcw className="size-4" />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{initial}</div>
              <div className="rounded-2xl rounded-tl-sm bg-[#2e2b4f] px-4 py-2.5 text-sm text-white dark:bg-[#2b274a]">Hi! What can I help you with?</div>
            </div>
            {samplePrompts.length > 0 && (
              <div className="flex flex-col items-end gap-2 pt-2">
                {samplePrompts.map((p) => (
                  <button key={p} type="button" onClick={() => send(p)} className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition-all hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer">{p}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{initial}</div>}
            <div className={`flex max-w-[75%] flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              {m.template ? (
                <PlaygroundTemplate template={m.template} onPostback={(msg) => send(msg)} />
              ) : (
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-xs ${m.role === 'user' ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800 dark:border-neutral-800 dark:bg-[#2b274a] dark:text-gray-100'}`}>{m.content}</div>
              )}
              {m.handoff && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><UserCheck className="size-3" />Handed off to a human agent</span>}
              {!!m.sources?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {m.sources.map((s) => <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"><BookOpen className="size-3" />{s.question}</span>)}
                </div>
              )}
            </div>
            {m.role === 'user' && <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-neutral-700 dark:text-gray-300"><User className="size-4" /></div>}
          </div>
        ))}
        {isSending && (
          <div className="flex items-end gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{initial}</div>
            <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-400 dark:border-neutral-800 dark:bg-[#2b274a] dark:text-neutral-400">Typing...</div>
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-gray-100 p-4 dark:border-neutral-800">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type your message..." className={`${inputCls} flex-1`} />
        <Button type="button" variant="primary" onClick={() => send()} disabled={!input.trim() || isSending}><Send className="size-4" /></Button>
      </div>
      <div className="px-5 pb-3 text-center text-[11px] text-gray-400 dark:text-neutral-500">Messages sent here will count toward your Captain credits.</div>
    </div>
  );
};

// ── Field helpers ─────────────────────────────────────────────────────────────

const FieldRow = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-xs font-semibold text-gray-900 dark:text-white">{label}</Label>
    {children}
  </div>
);


// ── HTTP Wizard step accordion ────────────────────────────────────────────────

const StepAccordion = ({
  number,
  title,
  isOpen,
  isDone,
  isLocked,
  onToggle,
  children,
  footer,
}: {
  number: number;
  title: string;
  isOpen: boolean;
  isDone: boolean;
  isLocked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <div className="transition-all bg-transparent">
    <div
      role="button"
      tabIndex={isLocked ? -1 : 0}
      onClick={isLocked ? undefined : onToggle}
      onKeyDown={(e) => {
        if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`flex w-full items-center justify-between py-4 px-1 text-left select-none bg-transparent ${
        isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
            isDone
              ? 'bg-teal-600 text-white dark:bg-teal-500'
              : isOpen
              ? 'border-2 border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
              : 'border border-dashed border-gray-400 text-gray-400 dark:border-neutral-600 dark:text-neutral-500'
          }`}
        >
          {isDone ? <Check className="size-3" /> : number}
        </div>
        <span
          className={`text-base font-semibold ${
            isOpen
              ? 'text-gray-950 dark:text-white'
              : isLocked
              ? 'text-gray-400 dark:text-neutral-500'
              : 'text-gray-700 dark:text-neutral-300'
          }`}
        >
          {title}
        </span>
      </div>
      {!isLocked && (
        <ChevronDown
          className={`size-4 text-gray-400 dark:text-neutral-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      )}
    </div>
    {isOpen && (
      <div className="pb-6 pt-1 px-1 flex flex-col gap-4 bg-transparent">
        {children}
        {footer && <div className="pt-2">{footer}</div>}
      </div>
    )}
  </div>
);

// ── HTTP Wizard ───────────────────────────────────────────────────────────────

const ACTION_TYPE_OPTIONS = [
  {
    value: 'call_api',
    icon: Server,
    title: 'Call API',
    description: 'This action will call an API on the server. There is no need to write any client-side code.',
  },
  {
    value: 'call_api_widget',
    icon: LayoutPanelTop,
    title: 'Call API + show widget',
    description: 'This action will call an API and display the result in a widget.',
  },
  {
    value: 'show_widget',
    icon: LayoutTemplate,
    title: 'Show widget',
    description: 'This action will display a widget with content you design yourself, without calling an API.',
  },
] as const;

const DATA_ACCESS_OPTIONS = [
  {
    value: 'full',
    title: 'Full data access',
    description: 'The AI agent can see the entire JSON response.',
  },
  {
    value: 'limited',
    title: 'Limited data access',
    description: 'Restrict the response to specific fields. The AI agent will only see the fields you select.',
  },
] as const;

const defaultHttpForm = () => ({
  title: '',
  description: '',
  action_type: 'call_api' as 'call_api' | 'call_api_widget' | 'show_widget',
  http_method: 'GET' as 'GET' | 'POST',
  endpoint_url: '',
  auth_type: 'none' as 'none' | 'bearer' | 'basic' | 'header' | 'api_key',
  auth_bearer_token: '',
  auth_api_key_header: 'X-API-Key',
  auth_api_key_value: '',
  auth_basic_username: '',
  auth_basic_password: '',
  auth_header_name: '',
  auth_header_value: '',
  param_schema: [] as Param[],
  request_template: '',
  response_template: '',
  data_access: 'full' as 'full' | 'limited',
  allowed_response_fields: [] as string[],
  operation_type: 'read' as 'read' | 'write',
  sync_inputs_with_widget: false,
  enabled: true,
});

const HttpWizard = ({
  editId, assistants, assistantId, setAssistantId, onSaved, usedSlots = 0,
}: {
  editId: string | null; assistants: Assistant[]; assistantId: string; setAssistantId: (id: string) => void; onSaved: () => void; usedSlots?: number;
}) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [form, setForm] = useState(defaultHttpForm);
  const [savedToolId, setSavedToolId] = useState<string | null>(editId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 5 — Test response
  const [samplePayload, setSamplePayload] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  // HTTP status of the last "Run test" — the Create button is gated on a 2xx
  // (Chatwoot: `canSubmit = mode === 'create' ? !!testResult?.success : true`).
  const [testStatus, setTestStatus] = useState<number | null>(null);

  // Data-access step — response-field discovery
  const [daFields, setDaFields] = useState<string[]>([]);
  const [daTesting, setDaTesting] = useState(false);
  const [daError, setDaError] = useState('');

  // Edit mode — payload as loaded, so "Save changes" can be disabled when nothing changed.
  const [originalSnapshot, setOriginalSnapshot] = useState<string | null>(null);
  const snapshotPending = useRef(false);

  // Widget-section state (owned here, not by the step, so it survives unmounts)
  const [widgetDraftConfig, setWidgetDraftConfig] = useState<WidgetConfig | null>(null);
  const [widgetSourceId, setWidgetSourceId] = useState<number | null>(null);

  // Sync inputs with widget schema
  const manualParamSchemaRef = useRef<Param[]>([]);

  const widgetSchemaFields = () => widgetDraftConfig?.schema || [];

  const WIDGET_TYPE_MAP: Record<string, string> = {
    text: 'string', email: 'string', text_area: 'string', select: 'string',
  };

  const derivedParams = (): Param[] =>
    widgetSchemaFields().map((field) => ({
      name: field.key,
      type: WIDGET_TYPE_MAP[field.type] || 'string',
      description: field.label || field.key,
      required: field.required === true,
    }));

  const paramsMatch = (a: Param[], b: Param[]) =>
    a.length === b.length &&
    a.every((p, i) => p.name === b[i].name && p.type === b[i].type && p.description === b[i].description && p.required === b[i].required);

  const hasWidgetSchemaFields = widgetSchemaFields().length > 0;

  // Keep sample payload keys in sync with param schema
  useEffect(() => {
    setSamplePayload((prev) => {
      const next: Record<string, string> = {};
      form.param_schema.forEach((p) => { next[p.name] = prev[p.name] ?? ''; });
      return next;
    });
  }, [form.param_schema]);

  // Sync inputs with widget schema — mirrors Chatwoot's sync watcher in Wizard.vue
  useEffect(() => {
    if (form.sync_inputs_with_widget) {
      const derived = derivedParams();
      // Don't overwrite manually typed params that happen to match the derived ones
      // from a previous sync — only save truly hand-authored params.
      manualParamSchemaRef.current = paramsMatch(form.param_schema, derived)
        ? []
        : form.param_schema.map((p) => ({ ...p }));
      setForm((f) => ({ ...f, param_schema: derived }));
      return;
    }
    // Restoring manual params when sync is turned off
    if (manualParamSchemaRef.current.length > 0 || form.param_schema.length > 0) {
      setForm((f) => ({ ...f, param_schema: manualParamSchemaRef.current.map((p) => ({ ...p })) }));
    }
  }, [form.sync_inputs_with_widget]);

  // Re-sync when widget changes while sync is on
  useEffect(() => {
    if (!form.sync_inputs_with_widget) return;
    setForm((f) => ({ ...f, param_schema: derivedParams() }));
  }, [widgetDraftConfig]);

  // The tool config the wizard has built so far — sent to `/custom-tools/test`.
  // In edit mode `id` lets the backend swap the masked secret for the stored one.
  const testToolBody = () => ({
    ...(savedToolId ? { id: Number(savedToolId) } : {}),
    slug: `test_${Date.now()}`,
    kind: 'http',
    http_method: form.http_method,
    endpoint_url: form.endpoint_url,
    request_template: form.request_template || null,
    response_template: form.response_template || null,
    auth_type: form.auth_type,
    auth_config: buildAuthConfig(),
    param_schema: form.param_schema,
    operation_type: form.operation_type === 'read' ? OP_READ : OP_WRITE,
  });

  const runTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestStatus(null);
    try {
      // API expects { custom_tool: { ... tool data ... }, sample_params: { ... } }
      const res = await captainFetch(`${CAPTAIN_API_BASE}/custom-tools/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_tool: testToolBody(), sample_params: samplePayload }),
      });
      const json = await res.json();
      setTestStatus(typeof json?.status === 'number' ? json.status : null);
      const display = json?.body ?? json?.data ?? json;
      setTestResult(typeof display === 'string' ? display : JSON.stringify(display, null, 2));
    } catch (err: any) {
      setTestResult(`Error: ${err?.message || 'Request failed'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Data-access "Run test" — probe the endpoint, then offer its top-level JSON
  // keys as checkboxes (Chatwoot's DataAccessStep discovers keys the same way).
  const discoverFields = async () => {
    setDaTesting(true);
    setDaError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/custom-tools/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_tool: testToolBody(), sample_params: samplePayload }),
      });
      const json = await res.json();
      const raw = json?.body ?? json?.data ?? json;
      let parsed: any = raw;
      if (typeof raw === 'string') {
        try { parsed = JSON.parse(raw); } catch { throw new Error('The response is not valid JSON, so its fields cannot be listed.'); }
      }
      const sample = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!sample || typeof sample !== 'object' || Array.isArray(sample)) {
        throw new Error('The response is not a JSON object. Use Full data access, or have the endpoint return an object.');
      }
      const keys = Object.keys(sample);
      setDaFields(keys);
      // Drop any previously-picked field the endpoint no longer returns.
      setForm((f) => ({ ...f, allowed_response_fields: f.allowed_response_fields.filter((k) => keys.includes(k)) }));
    } catch (err: any) {
      setDaFields([]);
      setDaError(err?.message || 'Test failed');
    } finally {
      setDaTesting(false);
    }
  };

  // Any change to the request shape invalidates a prior test result — the
  // Create gate re-locks until the user re-runs the test (Chatwoot re-nulls
  // `testResult` on `watch(JSON.stringify(modelState))`).
  useEffect(() => {
    setTestResult(null);
    setTestStatus(null);
    setDaFields([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.http_method, form.endpoint_url, form.auth_type,
    form.auth_bearer_token, form.auth_api_key_header, form.auth_api_key_value,
    form.auth_basic_username, form.auth_basic_password, form.auth_header_name, form.auth_header_value,
    form.request_template, JSON.stringify(form.param_schema),
  ]);

  useEffect(() => {
    if (!editId) return;
    captainFetch(`${CAPTAIN_API_BASE}/custom-tools/${editId}`)
      .then((r) => r.json())
      .then((json) => {
        const t = json.data || json;
        if (!t?.id) return;
        setSavedToolId(String(t.id));
        if (t.assistant_id) setAssistantId(String(t.assistant_id));
        const cfg = t.config || {};
        const ac = t.auth_config || {};
        const schema = t.param_schema || [];
        const allowedFields: string[] = Array.isArray(cfg.allowed_response_fields)
          ? cfg.allowed_response_fields
          : (cfg.allowed_response_fields
            ? String(cfg.allowed_response_fields).split(',').map((s) => s.trim()).filter(Boolean)
            : []);
        const opType = (t.operation_type === 'read' || t.operation_type === OP_READ) ? 'read' : 'write';

        setForm({
          title: t.title || '',
          description: t.description || '',
          action_type: (t.kind === 'widget' ? 'show_widget' : t.kind === 'api_widget' ? 'call_api_widget' : 'call_api') as any,
          http_method: t.http_method || 'GET',
          endpoint_url: t.endpoint_url || '',
          auth_type: t.auth_type || 'none',
          auth_bearer_token: ac.token || ac.auth_bearer_token || '',
          auth_api_key_header: ac.header || ac.header_name || ac.auth_api_key_header || 'X-API-Key',
          auth_api_key_value: ac.value || ac.header_value || ac.auth_api_key_value || '',
          auth_basic_username: ac.username || ac.auth_basic_username || '',
          auth_basic_password: ac.password || ac.auth_basic_password || '',
          auth_header_name: ac.name || ac.header_name || ac.auth_header_name || '',
          auth_header_value: ac.value || ac.header_value || ac.auth_header_value || '',
          param_schema: schema,
          request_template: t.request_template || '',
          response_template: t.response_template || '',
          data_access: cfg.data_access || 'full',
          allowed_response_fields: allowedFields,
          operation_type: opType,
          sync_inputs_with_widget: cfg.sync_inputs_with_widget ?? false,
          enabled: t.enabled !== false,
        });
        setSamplePayload(Object.fromEntries(schema.map((p: any) => [p.name, ''])));
        setWidgetDraftConfig((cfg.widget as WidgetConfig) || null);
        setWidgetSourceId(cfg.source_widget_id ?? null);
        setDoneSteps(new Set([0, 1, 2, 3, 4, 5]));
        // Capture the baseline once the form reflects the loaded tool (next effect run).
        snapshotPending.current = true;
      })
      .catch(() => {});
  }, [editId]);

  // Baseline snapshot for the edit-mode "nothing changed" gate — taken on the
  // first render after the edit-load `setForm` has landed.
  useEffect(() => {
    if (!editId || !snapshotPending.current) return;
    setOriginalSnapshot(payloadKey());
    snapshotPending.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, widgetDraftConfig, widgetSourceId]);

  // Restore draft when returning from widget builder
  useEffect(() => {
    const draft = draftStore.get();
    if (!draft?.wizard_state) return;
    const ws = draft.wizard_state;
    setForm((f) => ({
      ...f,
      title: ws.title ?? f.title,
      description: ws.description ?? f.description,
      action_type: ws.action_type ?? f.action_type,
      http_method: ws.http_method ?? f.http_method,
      endpoint_url: ws.endpoint_url ?? f.endpoint_url,
      auth_type: ws.auth_type ?? f.auth_type,
      auth_bearer_token: ws.auth_bearer_token ?? f.auth_bearer_token,
      auth_api_key_header: ws.auth_api_key_header ?? f.auth_api_key_header,
      auth_api_key_value: ws.auth_api_key_value ?? f.auth_api_key_value,
      auth_basic_username: ws.auth_basic_username ?? f.auth_basic_username,
      auth_basic_password: ws.auth_basic_password ?? f.auth_basic_password,
      auth_header_name: ws.auth_header_name ?? f.auth_header_name,
      auth_header_value: ws.auth_header_value ?? f.auth_header_value,
      param_schema: ws.param_schema ?? f.param_schema,
      request_template: ws.request_template ?? f.request_template,
      response_template: ws.response_template ?? f.response_template,
      data_access: ws.data_access ?? f.data_access,
      allowed_response_fields: ws.allowed_response_fields ?? f.allowed_response_fields,
      operation_type: ws.operation_type ?? f.operation_type,
      sync_inputs_with_widget: ws.sync_inputs_with_widget ?? f.sync_inputs_with_widget,
      enabled: ws.enabled ?? f.enabled,
    }));
    if (draft.config?.widget) setWidgetDraftConfig(draft.config.widget as WidgetConfig);
    if (draft.config?.source_widget_id != null) setWidgetSourceId(draft.config.source_widget_id as number);
    if (draft.id && !savedToolId) setSavedToolId(String(draft.id));
    // Mark all steps done and open the Widget step
    setDoneSteps(new Set([0, 1, 2, 3, 4, 5]));
    const kind = ws.action_type === 'show_widget' ? 'widget' : ws.action_type === 'call_api_widget' ? 'api_widget' : 'http';
    if (kind === 'api_widget' || kind === 'widget') {
      const wSteps = ws.action_type === 'show_widget'
        ? ['General', 'Action type', 'Widget', 'Inputs']
        : ['General', 'Action type', 'API', 'Data access', 'Test response', 'Widget'];
      setActiveStep(wSteps.length - 1);
    }
    draftStore.clear();
  }, []);

  const buildAuthConfig = () => {
    if (form.auth_type === 'bearer') return { token: form.auth_bearer_token };
    if (form.auth_type === 'api_key') return { header: form.auth_api_key_header, value: form.auth_api_key_value };
    if (form.auth_type === 'basic') return { username: form.auth_basic_username, password: form.auth_basic_password };
    if (form.auth_type === 'header') return { name: form.auth_header_name, value: form.auth_header_value };
    return {};
  };

  const toolKind = () =>
    form.action_type === 'show_widget' ? 'widget'
      : form.action_type === 'call_api_widget' ? 'api_widget'
      : 'http';

  // The full create/update body — built entirely from local state and sent once,
  // on the final step (Chatwoot's Wizard.vue only create/updates on submit).
  const buildPayload = () => {
    const kind = toolKind();
    const isWidgetKind = kind === 'api_widget' || kind === 'widget';
    const payload: any = {
      title: form.title.trim(),
      description: form.description,
      kind,
      http_method: form.http_method,
      endpoint_url: form.endpoint_url,
      auth_type: form.auth_type,
      auth_config: buildAuthConfig(),
      param_schema: form.param_schema,
      request_template: form.request_template || null,
      response_template: form.response_template || null,
      operation_type: form.operation_type === 'read' ? OP_READ : OP_WRITE,
      enabled: form.enabled,
      customer_facing: false,
      config: {
        data_access: form.data_access,
        allowed_response_fields: form.data_access === 'limited' ? form.allowed_response_fields : [],
        sync_inputs_with_widget: form.sync_inputs_with_widget,
        ...(isWidgetKind
          ? { widget: widgetDraftConfig || undefined, source_widget_id: widgetSourceId }
          : {}),
      },
    };
    return payload;
  };

  // Stable stringify of the parts that count as "the tool" — used to detect an
  // unchanged edit so "Save changes" can be disabled.
  const payloadKey = () => {
    const p = buildPayload();
    delete p.customer_facing;
    return JSON.stringify(p);
  };

  const steps = useMemo(() => {
    if (form.action_type === 'show_widget') {
      return ['General', 'Action type', 'Widget', 'Inputs'];
    }
    if (form.action_type === 'call_api_widget') {
      return ['General', 'Action type', 'API', 'Data access', 'Test response', 'Widget'];
    }
    return ['General', 'Action type', 'API', 'Data access', 'Test response'];
  }, [form.action_type]);

  // A step whose "continue" / "save" button must stay disabled.
  const stepBlocked = (step: number): boolean => {
    const name = steps[step];
    if (name === 'Data access' && form.data_access === 'limited' && form.allowed_response_fields.length === 0) return true;
    // Create mode: the API test has to pass before the tool can be created
    // (Chatwoot gates the Test step's Create button on a successful probe).
    if (name === 'Test response' && !savedToolId && !(testStatus != null && testStatus >= 200 && testStatus < 300)) return true;
    return false;
  };

  const saveStep = async (step: number) => {
    const stepName = steps[step];
    const isLastStep = step === steps.length - 1;

    // ── per-step validation ──
    if (stepName === 'General') {
      if (!form.title.trim()) { setError('Tool name is required'); return; }
      if (form.title.trim().length > 55) { setError('Tool name must be 55 characters or fewer (OpenAI caps function names at 64).'); return; }
      if (!form.description.trim()) { setError('The "When to use" description is required.'); return; }
    }
    if (stepName === 'API' && !form.endpoint_url.trim()) { setError('Endpoint URL is required'); return; }
    if (stepName === 'Data access' && form.data_access === 'limited' && form.allowed_response_fields.length === 0) {
      setError('Pick at least one response field, or switch to Full data access.'); return;
    }
    setError('');

    // ── non-final steps: advance locally, nothing hits the backend ──
    if (!isLastStep) {
      setDoneSteps((prev) => new Set([...prev, step]));
      setActiveStep(step + 1);
      return;
    }

    // ── final step: create once (or update the existing tool in edit mode) ──
    if (!savedToolId && usedSlots >= 25) {
      setError('Maximum limit of 25 toolkit slots reached. Please delete an action before creating a new one.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (!savedToolId) {
        payload.assistant_id = assistantId;
        payload.slug = makeSlug(payload.kind, form.title);
      }
      const url = savedToolId ? `${CAPTAIN_API_BASE}/custom-tools/${savedToolId}` : `${CAPTAIN_API_BASE}/custom-tools`;
      const res = await captainFetch(url, {
        method: savedToolId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save');
      const json = await res.json();
      if (!savedToolId) setSavedToolId(String(json.data?.id || json.id || ''));
      setDoneSteps((prev) => new Set([...prev, step]));
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const currentAssistant = assistants.find((a) => a.id === assistantId);

  // No fabricated starter chips: a guessed phrase ("Use the X action") has no
  // relationship to this tool's own "When to use" trigger description, so a
  // guess that doesn't match it makes the model correctly skip the tool and
  // looks like the widget is broken. Chatwoot's Wizard.vue passes no
  // starterMessages to its embedded AssistantPlayground either — the tester
  // types their own message, same as the real Playground.
  const samplePrompts: string[] = [];

  // Edit mode: the final "Save changes" button is dead until something actually changed.
  const isUnchangedEdit = !!editId && originalSnapshot !== null && payloadKey() === originalSnapshot;

  return (
    <div className="flex flex-1 min-h-0 gap-8 overflow-hidden">
      {/* LEFT — stepped form */}
      <div className="flex w-[46%] shrink-0 flex-col overflow-y-auto pl-2 pr-3 py-1">
        <p className="text-xs text-gray-500 dark:text-neutral-400 mb-2">
          {savedToolId ? 'Editing custom action' : `${usedSlots} of 25 toolkit slots used`}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{error}</div>
        )}

        <div className="w-full flex-1 min-w-0 flex flex-col divide-y divide-gray-200 dark:divide-neutral-800">
          {steps.map((stepTitle, i) => {
            const isLocked = i > 0 && !doneSteps.has(i - 1);
            const canToggle = !isLocked;
            return (
              <StepAccordion
                key={stepTitle}
                number={i + 1}
                title={stepTitle}
                isOpen={activeStep === i}
                isDone={doneSteps.has(i)}
                isLocked={isLocked}
                onToggle={() => { if (canToggle) setActiveStep(activeStep === i ? -1 : i); }}
                footer={
                  i === steps.length - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={isSaving || isUnchangedEdit || (!savedToolId && stepBlocked(i))}
                      onClick={() => saveStep(i)}
                      className="w-auto"
                    >
                      {isSaving ? 'Saving...' : editId ? 'Save changes' : 'Create action'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={isSaving || stepBlocked(i)}
                      onClick={() => saveStep(i)}
                      className="w-auto"
                    >
                      {isSaving && activeStep === i ? 'Saving...' : 'Save and continue'}
                    </Button>
                  )
                }
              >
                {/* Step — General */}
                {stepTitle === 'General' && (
                  <>
                    <FieldRow label="Tool Name">
                      <input value={form.title} maxLength={55} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Order Lookup" className={inputCls} />
                      <p className="text-xs text-gray-400 dark:text-neutral-500">{form.title.trim().length}/55 — used to build the AI function name.</p>
                    </FieldRow>
                    <FieldRow label="When to use">
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className={textareaCls}
                        placeholder="Example: Use this action to retrieve the user's order history. Example queries: 'Show me my orders', 'What did I order last week?'..."
                      />
                    </FieldRow>
                    <FieldRow label="Assistant">
                      <select value={assistantId} onChange={(e) => setAssistantId(e.target.value)} className={`${selectCls} w-full`}>
                        <option value="">Select assistant</option>
                        {assistants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </FieldRow>
                  </>
                )}

                {/* Step — Action type */}
                {stepTitle === 'Action type' && (
                  <div className="flex flex-col gap-2.5">
                    {ACTION_TYPE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = form.action_type === opt.value;
                      return (
                        <div
                          key={opt.value}
                          role="button"
                          tabIndex={0}
                          onClick={() => setForm((f) => ({ ...f, action_type: opt.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setForm((f) => ({ ...f, action_type: opt.value }));
                            }
                          }}
                          className={`flex items-start gap-3.5 p-4 text-left rounded-xl border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/20'
                              : 'border-gray-200 bg-white hover:bg-gray-50/70 dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/50'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center size-9 rounded-lg shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                              {opt.title}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                              {opt.description}
                            </span>
                          </div>
                          <div
                            className={`flex items-center justify-center size-4 mt-0.5 rounded-full shrink-0 transition-all ${
                              isSelected
                                ? 'border-[5px] border-blue-600 dark:border-blue-400'
                                : 'border border-gray-400 dark:border-neutral-600'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step — API */}
                {stepTitle === 'API' && (
                  <>
                    <div className="flex gap-2">
                      <div className="w-28">
                        <Label className="text-xs font-semibold text-gray-900 dark:text-white mb-1.5 block">Method</Label>
                        <select value={form.http_method} onChange={(e) => setForm((f) => ({ ...f, http_method: e.target.value as 'GET' | 'POST' }))} className={`${selectCls} w-full font-mono`}>
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs font-semibold text-gray-900 dark:text-white mb-1.5 block">Endpoint URL</Label>
                        <input value={form.endpoint_url} onChange={(e) => setForm((f) => ({ ...f, endpoint_url: e.target.value }))} placeholder="https://api.example.com/orders" className={inputCls} />
                      </div>
                    </div>

                    <FieldRow label="Authentication">
                      {/* Chatwoot offers only none/bearer/basic/api_key for a new
                          action. A legacy `auth_type: 'header'` tool still loads and
                          round-trips (buildAuthConfig keeps the `header` branch), it
                          just isn't offered as a fresh choice. */}
                      <select value={form.auth_type === 'header' ? 'header' : form.auth_type} onChange={(e) => setForm((f) => ({ ...f, auth_type: e.target.value as any }))} className={`${selectCls} w-full`}>
                        <option value="none">None</option>
                        <option value="bearer">Bearer token</option>
                        <option value="api_key">API key header</option>
                        <option value="basic">Basic auth</option>
                        {form.auth_type === 'header' && <option value="header">Custom header (legacy)</option>}
                      </select>
                      {form.auth_type === 'bearer' && (
                        <input value={form.auth_bearer_token} onChange={(e) => setForm((f) => ({ ...f, auth_bearer_token: e.target.value }))} placeholder="Token" className={`${inputCls} mt-2`} />
                      )}
                      {form.auth_type === 'api_key' && (
                        <div className="flex gap-2 mt-2">
                          <input value={form.auth_api_key_header} onChange={(e) => setForm((f) => ({ ...f, auth_api_key_header: e.target.value }))} placeholder="Header name" className={`${inputCls} w-44`} />
                          <input value={form.auth_api_key_value} onChange={(e) => setForm((f) => ({ ...f, auth_api_key_value: e.target.value }))} placeholder="Value" className={inputCls} />
                        </div>
                      )}
                      {form.auth_type === 'basic' && (
                        <div className="flex gap-2 mt-2">
                          <input value={form.auth_basic_username} onChange={(e) => setForm((f) => ({ ...f, auth_basic_username: e.target.value }))} placeholder="Username" className={inputCls} />
                          <input type="password" value={form.auth_basic_password} onChange={(e) => setForm((f) => ({ ...f, auth_basic_password: e.target.value }))} placeholder="Password" className={inputCls} />
                        </div>
                      )}
                      {form.auth_type === 'header' && (
                        <div className="flex gap-2 mt-2">
                          <input value={form.auth_header_name} onChange={(e) => setForm((f) => ({ ...f, auth_header_name: e.target.value }))} placeholder="Header name" className={`${inputCls} w-44`} />
                          <input value={form.auth_header_value} onChange={(e) => setForm((f) => ({ ...f, auth_header_value: e.target.value }))} placeholder="Value" className={inputCls} />
                        </div>
                      )}
                    </FieldRow>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold text-gray-900 dark:text-white">Parameters</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, param_schema: [...f.param_schema, { name: '', type: 'string', description: '', required: false }] }))}>
                          <Plus className="size-3" />Add param
                        </Button>
                      </div>
                      {form.param_schema.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-neutral-500">No parameters — the AI will call this action with no inputs.</p>
                      )}
                      <div className="flex flex-col gap-2">
                        {form.param_schema.map((p, pIdx) => (
                          <div key={pIdx} className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-1.5 items-center rounded-xl border border-gray-200 bg-white p-2.5 dark:border-neutral-700/60 dark:bg-neutral-800">
                            <input value={p.name} onChange={(e) => setForm((f) => { const s = [...f.param_schema]; s[pIdx] = { ...s[pIdx], name: e.target.value }; return { ...f, param_schema: s }; })} placeholder="name" className={inputCls} />
                            <select value={p.type} onChange={(e) => setForm((f) => { const s = [...f.param_schema]; s[pIdx] = { ...s[pIdx], type: e.target.value }; return { ...f, param_schema: s }; })} className={`${selectCls} w-24`}>
                              <option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option>
                            </select>
                            <input value={p.description} onChange={(e) => setForm((f) => { const s = [...f.param_schema]; s[pIdx] = { ...s[pIdx], description: e.target.value }; return { ...f, param_schema: s }; })} placeholder="description" className={inputCls} />
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-neutral-300 shrink-0 cursor-pointer select-none">
                              <Checkbox checked={p.required} onCheckedChange={(c) => setForm((f) => { const s = [...f.param_schema]; s[pIdx] = { ...s[pIdx], required: c === true }; return { ...f, param_schema: s }; })} />
                              <span>Req</span>
                            </label>
                            <button type="button" onClick={() => setForm((f) => ({ ...f, param_schema: f.param_schema.filter((_, idx) => idx !== pIdx) }))} className="text-gray-400 dark:text-muted-foreground hover:text-red-500 dark:hover:text-red-500 cursor-pointer"><Trash2 className="size-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {form.http_method === 'POST' && (
                      <FieldRow label={<span>Request template <span className="text-gray-400 dark:text-muted-foreground text-xs font-normal">(optional)</span></span>}>
                        <textarea value={form.request_template} onChange={(e) => setForm((f) => ({ ...f, request_template: e.target.value }))} rows={3} className={`${textareaCls} font-mono`} placeholder={'{\n  "user_id": "{{user_id}}"\n}'} />
                      </FieldRow>
                    )}

                    <FieldRow label={<span>Response template <span className="text-gray-400 dark:text-muted-foreground text-xs font-normal">(optional)</span></span>}>
                      <textarea value={form.response_template} onChange={(e) => setForm((f) => ({ ...f, response_template: e.target.value }))} rows={3} className={`${textareaCls} font-mono`} placeholder="Order #{{order_id}} — {{status}}" />
                    </FieldRow>
                  </>
                )}

                {/* Step — Data access */}
                {stepTitle === 'Data access' && (
                  <>
                    <div className="flex flex-col gap-2.5">
                      {DATA_ACCESS_OPTIONS.map((opt) => {
                        const isSelected = form.data_access === opt.value;
                        return (
                          <div
                            key={opt.value}
                            role="button"
                            tabIndex={0}
                            onClick={() => setForm((f) => ({ ...f, data_access: opt.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setForm((f) => ({ ...f, data_access: opt.value }));
                              }
                            }}
                            className={`flex items-start gap-3.5 p-4 text-left rounded-xl border transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/20'
                                : 'border-gray-200 bg-white hover:bg-gray-50/70 dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                                {opt.title}
                              </span>
                              <span className="block text-xs text-gray-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                {opt.description}
                              </span>
                            </div>
                            <div
                              className={`flex items-center justify-center size-4 mt-0.5 rounded-full shrink-0 transition-all ${
                                isSelected
                                  ? 'border-[5px] border-blue-600 dark:border-blue-400'
                                  : 'border border-gray-400 dark:border-neutral-600'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {form.data_access === 'limited' && (() => {
                      const fieldChoices = daFields.length ? daFields : form.allowed_response_fields;
                      return (
                        <div className="flex flex-col gap-3">
                          <p className="text-xs text-gray-500 dark:text-neutral-400">
                            Run a test request, then tick the response fields the AI is allowed to see.
                          </p>
                          {form.param_schema.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <Label className="text-xs font-semibold text-gray-900 dark:text-white">Sample parameter values</Label>
                              {form.param_schema.map((p) => (
                                <div key={p.name} className="flex items-center gap-3">
                                  <span className="w-32 shrink-0 truncate rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-mono text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">{p.name}</span>
                                  <input
                                    value={samplePayload[p.name] ?? ''}
                                    onChange={(e) => setSamplePayload((prev) => ({ ...prev, [p.name]: e.target.value }))}
                                    placeholder={`${p.type} value`}
                                    className={`${inputCls} flex-1`}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            disabled={daTesting || !form.endpoint_url}
                            onClick={discoverFields}
                            className="w-auto"
                          >
                            {daTesting ? 'Testing...' : 'Run test to list fields'}
                          </Button>
                          {daError && <p className="text-xs text-red-600 dark:text-red-400">{daError}</p>}
                          {fieldChoices.length > 0 ? (
                            <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 p-3 dark:border-neutral-800">
                              {fieldChoices.map((key) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700 dark:text-neutral-300">
                                  <Checkbox
                                    checked={form.allowed_response_fields.includes(key)}
                                    onCheckedChange={(c) => setForm((f) => ({
                                      ...f,
                                      allowed_response_fields: c === true
                                        ? [...f.allowed_response_fields.filter((k) => k !== key), key]
                                        : f.allowed_response_fields.filter((k) => k !== key),
                                    }))}
                                  />
                                  <span className="font-mono text-xs">{key}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-neutral-500">Run the test to discover the fields you can expose.</p>
                          )}
                          {form.allowed_response_fields.length === 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">Select at least one field to continue.</p>
                          )}
                        </div>
                      );
                    })()}

                  </>
                )}

                {/* Step — Test response */}
                {stepTitle === 'Test response' && (
                  <>
                    <p className="text-xs text-gray-500 dark:text-neutral-400">
                      Send a test request to your endpoint with sample parameter values and see the raw response the AI will receive.
                    </p>

                    {form.param_schema.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold text-gray-900 dark:text-white">Sample parameter values</Label>
                        {form.param_schema.map((p) => (
                          <div key={p.name} className="flex items-center gap-3">
                            <span className="w-32 shrink-0 truncate rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-mono text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">{p.name}</span>
                            <input
                              value={samplePayload[p.name] ?? ''}
                              onChange={(e) => setSamplePayload((prev) => ({ ...prev, [p.name]: e.target.value }))}
                              placeholder={`${p.type} value`}
                              className={`${inputCls} flex-1`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-neutral-500">No parameters — this action takes no inputs.</p>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      disabled={isTesting || !form.endpoint_url}
                      onClick={runTest}
                      className="w-auto"
                    >
                      {isTesting ? 'Testing...' : 'Run test'}
                    </Button>

                    {testResult !== null && (
                      <div>
                        <Label className="text-xs font-semibold text-gray-900 dark:text-white mb-1.5 block">Response</Label>
                        <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs font-mono text-gray-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-300">
                          {testResult}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {/* Step — Widget */}
                {stepTitle === 'Widget' && (
                  <div className="flex flex-col gap-4 pb-2">
                    <p className="text-xs text-gray-500 dark:text-neutral-400 -mt-1 flex items-center gap-1.5">
                      <Info className="size-3.5 shrink-0" />
                      The AI will call your API and present the response inside this widget.
                    </p>
                    <WidgetSection
                      tool={{
                        id: savedToolId ? Number(savedToolId) : null,
                        kind: form.action_type === 'show_widget' ? 'widget' : 'api_widget',
                        title: form.title,
                        updated_at: null,
                        config: withSourceWidgetId(
                          { widget: widgetDraftConfig || undefined },
                          widgetSourceId,
                        ),
                      }}
                      assistantId={assistantId}
                      onEditWidget={() => {
                        // Save draft before navigating to widget builder
                        draftStore.set({
                          id: savedToolId ? Number(savedToolId) : null,
                          kind: form.action_type === 'show_widget' ? 'widget' : 'api_widget',
                          title: form.title,
                          description: form.description,
                          assistant_id: assistantId ? Number(assistantId) : null,
                          wizard_state: { ...form },
                          config: withSourceWidgetId(
                            { widget: widgetDraftConfig || undefined },
                            widgetSourceId,
                          ),
                        });
                        navigate(`/admin-settings/captain/widgets/${savedToolId || 'new'}`);
                      }}
                      onApplyWidget={(payload) => {
                        const { widget, sourceWidgetId: pickedId } = unwrapLibrarySelect(payload);
                        if (!widget) return;
                        setWidgetDraftConfig(widget);
                        setWidgetSourceId(pickedId);
                      }}
                      onResetWidget={() => {
                        // For api_widget/widget kinds, reset means back to the
                        // starter config (no widget override), not the current one.
                        setWidgetDraftConfig(
                          deriveWidgetConfigFromTool({
                            id: savedToolId ? Number(savedToolId) : null,
                            kind: form.action_type === 'show_widget' ? 'widget' : 'api_widget',
                            title: form.title,
                            config: {},
                          }),
                        );
                        setWidgetSourceId(null);
                      }}
                    />
                  </div>
                )}

                {/* Step — Inputs */}
                {stepTitle === 'Inputs' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                      <div className="flex items-center gap-2.5">
                        <Switch
                          checked={form.sync_inputs_with_widget}
                          disabled={!hasWidgetSchemaFields}
                          onCheckedChange={(c) => setForm((f) => ({ ...f, sync_inputs_with_widget: c === true }))}
                        />
                        <span
                          className={`text-sm font-medium select-none ${hasWidgetSchemaFields ? 'text-gray-900 cursor-pointer dark:text-white' : 'text-gray-400 cursor-not-allowed dark:text-neutral-500'}`}
                          onClick={() => { if (hasWidgetSchemaFields) setForm((f) => ({ ...f, sync_inputs_with_widget: !f.sync_inputs_with_widget })); }}
                        >
                          Sync inputs with widget schema
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 pl-[38px] dark:text-neutral-400">Automatically map widget schema fields to action parameters.</p>
                      {!hasWidgetSchemaFields && (
                        <p className="text-xs text-gray-400 pl-[38px] dark:text-neutral-500">Add fields to your widget first to enable syncing.</p>
                      )}
                    </div>

                    {form.sync_inputs_with_widget ? (
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold text-gray-900 dark:text-white">Schema fields</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {form.param_schema.map((p) => (
                            <span key={p.name} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-mono text-gray-700 dark:bg-neutral-800 dark:text-neutral-300">
                              {p.name}
                              {p.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                          ))}
                          {form.param_schema.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-neutral-500">No schema fields to sync.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-gray-900 dark:text-white">Inputs</Label>
                          <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, param_schema: [...f.param_schema, { name: '', type: 'string', description: '', required: false }] }))}>
                            <Plus className="size-3" />Add input
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-neutral-400">Define the input parameters the AI will collect before calling this action.</p>
                        {form.param_schema.length === 0 && (
                          <p className="text-xs text-gray-400 dark:text-neutral-500">No inputs configured.</p>
                        )}
                        <div className="flex flex-col gap-2">
                          {form.param_schema.map((p, pIdx) => (
                            <div key={pIdx} className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-1.5 items-center rounded-xl border border-gray-200 bg-white p-2.5 dark:border-neutral-700/60 dark:bg-neutral-800">
                              <input value={p.name} onChange={(e) => setForm((f) => { const s = [...f.param_schema]; s[pIdx] = { ...s[pIdx], name: e.target.value }; return { ...f, param_schema: s }; })} placeholder="name" className={inputCls} />
                              <select value={p.type} onChange={(e) => setForm((f) => { const s = [...f.param_schema]; s[pIdx] = { ...s[pIdx], type: e.target.value }; return { ...f, param_schema: s }; })} className={`${selectCls} w-24`}>
                                <option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option>
                              </select>
                              <input value={p.description} onChange={(e) => setForm((f) => { const s = [...f.param_schema]; s[pIdx] = { ...s[pIdx], description: e.target.value }; return { ...f, param_schema: s }; })} placeholder="description" className={inputCls} />
                              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-neutral-300 shrink-0 cursor-pointer select-none">
                                <Checkbox checked={p.required} onCheckedChange={(c) => setForm((f) => { const s = [...f.param_schema]; s[pIdx] = { ...s[pIdx], required: c === true }; return { ...f, param_schema: s }; })} />
                                <span>Req</span>
                              </label>
                              <button type="button" onClick={() => setForm((f) => ({ ...f, param_schema: f.param_schema.filter((_, idx) => idx !== pIdx) }))} className="text-gray-400 dark:text-muted-foreground hover:text-red-500 dark:hover:text-red-500 cursor-pointer"><Trash2 className="size-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </StepAccordion>
            );
          })}
        </div>
      </div>

      {/* RIGHT — Playground */}
      <div className="flex flex-1 min-h-0 flex-col" style={{ height: 'calc(100vh - 11rem)' }}>
        <InlinePlayground
          assistantId={assistantId}
          assistantName={currentAssistant?.name}
          samplePrompts={samplePrompts}
        />
      </div>
    </div>
  );
};

// ── Dashed-circle accordion (Floatchat style for lead/form/button) ────────────

const DashedSection = ({
  sectionKey, title, children, openSection, onToggle, isDone, footer,
}: {
  sectionKey: string; title: string; children: React.ReactNode;
  openSection: string; onToggle: (key: string) => void;
  isDone?: boolean; footer?: React.ReactNode;
}) => {
  const isOpen = openSection === sectionKey;
  return (
    <div className="transition-all bg-transparent">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(sectionKey)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(sectionKey);
          }
        }}
        className="flex w-full items-center justify-between py-4 px-1 text-left cursor-pointer select-none bg-transparent"
      >
        <div className="flex items-center gap-3">
          {isDone ? (
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-600 dark:bg-teal-500 text-white"><Check className="size-3" /></div>
          ) : (
            <div className={`flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed transition-colors ${
              isOpen ? 'border-blue-500 text-blue-500 dark:border-blue-400' : 'border-gray-400 dark:border-neutral-600'
            }`} />
          )}
          <span className={`text-base font-semibold ${isOpen ? 'text-gray-950 dark:text-white' : 'text-gray-700 dark:text-neutral-300'}`}>{title}</span>
        </div>
        <ChevronDown className={`size-4 text-gray-400 dark:text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="pb-6 pt-1 px-1 flex flex-col gap-4 bg-transparent">
          {children}
          {footer && <div className="pt-2">{footer}</div>}
        </div>
      )}
    </div>
  );
};

// ── Wizard page ───────────────────────────────────────────────────────────────

const ToolWizard = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const kind = (params.get('kind') || 'lead') as 'lead' | 'form' | 'button' | 'http' | 'api_widget' | 'widget';
  const editId = params.get('id');
  const isEdit = !!editId;

  const { getDraftTool, clearDraftTool } = useCustomToolDraft();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [assistantId, setAssistantId] = useState(params.get('assistantId') || '');
  const [usedSlots, setUsedSlots] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [leadForm, setLeadForm] = useState({ title: '', description: '', fields: defaultLeadFields(), successMessage: "Thank you! We'll be in touch soon.", dismissMessage: 'Maybe later.', webhooks: [newWebhookRow()] as { id: number; url: string }[], enabled: true });
  const [formForm, setFormForm] = useState({ title: '', description: '', fields: [{ label: '', type: 'text' as const, required: false, placeholder: '', options: [] as { label: string; value: string }[] }] as FormField[], successMessage: 'Thank you for your submission!', webhook: '', enabled: true });
  const [buttonForm, setButtonForm] = useState({ title: '', description: '', buttons: [{ label: '', action: 'send_message' as const, url: '', message: '' }] as ToolButton[], enabled: true });
  // The tool's stored config as loaded — keeps keys the wizard doesn't manage
  // (a widget design assigned from the library, and its source_widget_id link)
  // from being wiped when this form saves.
  const [loadedConfig, setLoadedConfig] = useState<Record<string, any>>({});
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string | null>(null);

  // Widget-section state: a design just picked from the library or carried back
  // from the builder. `pickedSourceId` — undefined: use the saved source link;
  // null: unlinked; number: linked. `widgetCleared`: reset requested locally.
  const [pickedWidget, setPickedWidget] = useState<WidgetConfig | null>(null);
  const [pickedSourceId, setPickedSourceId] = useState<number | null | undefined>(undefined);
  const [widgetCleared, setWidgetCleared] = useState(false);

  const currentWidget = (): WidgetConfig | null =>
    widgetCleared ? null : pickedWidget ?? (loadedConfig.widget as WidgetConfig | undefined) ?? null;
  const currentSourceId = (): number | null =>
    widgetCleared
      ? null
      : pickedSourceId !== undefined
        ? pickedSourceId
        : (loadedConfig.source_widget_id as number | undefined) ?? null;

  const backPath = '/admin-settings/captain/actions';

  // ── Section completion & dirty tracking ──────────────────────────────────

  const LEAD_SECTIONS = ['general', 'fields', 'widget', 'messages', 'destinations'] as const;
  const FORM_SECTIONS = ['general', 'inputs', 'widget', 'webhooks'] as const;
  const BUTTON_SECTIONS = ['general', 'buttons', 'widget'] as const;

  const currentSections = kind === 'lead' ? LEAD_SECTIONS : kind === 'form' ? FORM_SECTIONS : BUTTON_SECTIONS;

  const [completedSections, setCompletedSections] = useState<Set<string>>(() =>
    isEdit ? new Set(currentSections as readonly string[]) : new Set<string>()
  );
  const [initialSnapshot, setInitialSnapshot] = useState<Record<string, string>>({});

  const captureSnapshot = useCallback((): Record<string, string> => {
    if (kind === 'lead') {
      return {
        general: JSON.stringify([leadForm.title, leadForm.description, assistantId]),
        fields: JSON.stringify(leadForm.fields),
        messages: JSON.stringify([leadForm.successMessage, leadForm.dismissMessage]),
        destinations: JSON.stringify(leadForm.webhooks),
      };
    }
    if (kind === 'form') {
      return {
        general: JSON.stringify([formForm.title, formForm.description, assistantId]),
        inputs: JSON.stringify(formForm.fields),
        webhooks: JSON.stringify([formForm.webhook, formForm.successMessage]),
      };
    }
    return {
      general: JSON.stringify([buttonForm.title, buttonForm.description, assistantId]),
      buttons: JSON.stringify(buttonForm.buttons),
    };
  }, [kind, leadForm, formForm, buttonForm, assistantId]);

  const isDirty = useCallback((sectionKey: string): boolean => {
    const snap = captureSnapshot();
    return (snap as any)[sectionKey] !== initialSnapshot[sectionKey];
  }, [captureSnapshot, initialSnapshot]);

  const markComplete = useCallback((sectionKey: string) => {
    setCompletedSections((prev) => new Set([...prev, sectionKey]));
    // Update snapshot so it's no longer dirty
    setInitialSnapshot((prev) => ({ ...prev, [sectionKey]: (captureSnapshot() as any)[sectionKey] }));
  }, [captureSnapshot]);

  const saveAndContinue = useCallback((sectionKey: string) => {
    markComplete(sectionKey);
    const idx = (currentSections as readonly string[]).indexOf(sectionKey);
    if (idx >= 0 && idx < currentSections.length - 1) {
      setOpenSection(currentSections[idx + 1]);
    }
  }, [markComplete, currentSections]);

  // ── Draft state ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (kind === 'http') return;
    const draft = getDraftTool();
    if (!draft || draft.kind !== kind) return;
    // Only restore if same tool (or both are new)
    if ((draft.id ?? null) !== (editId ?? null)) return;
    if (kind === 'lead') {
      setLeadForm((f) => ({ ...f, ...draft.formState }));
      if (draft.assistantId) setAssistantId(draft.assistantId);
    } else if (kind === 'form') {
      setFormForm((f) => ({ ...f, ...draft.formState }));
      if (draft.assistantId) setAssistantId(draft.assistantId);
    } else if (kind === 'button') {
      setButtonForm((f) => ({ ...f, ...draft.formState }));
      if (draft.assistantId) setAssistantId(draft.assistantId);
    }
    setOpenSection('widget');
    clearDraftTool();
  }, []);

  // Snapshot initial state after data loads
  useEffect(() => {
    if (kind === 'http') return;
    // Delay to let form state settle
    const t = setTimeout(() => setInitialSnapshot(captureSnapshot()), 100);
    return () => clearTimeout(t);
  }, [editId]);

  // ── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    captainFetch(`${CAPTAIN_API_BASE}/assistants`).then((r) => r.json()).then((json) => {
      const list = (json.data || []).map((a: any) => ({ id: String(a.id), name: a.name }));
      setAssistants(list);
      const targetId = params.get('assistantId');
      if (targetId && list.some((a: any) => a.id === targetId)) {
        setAssistantId(targetId);
      } else if (list.length) {
        setAssistantId((prev) => prev || String(list[0].id));
      }
    }).catch(() => {});

    Promise.all([
      captainFetch(`${CAPTAIN_API_BASE}/custom-tools`).then((r) => r.json()).catch(() => ({ data: [] })),
      captainFetch(`${CAPTAIN_API_BASE}/composio/connections`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([toolsRes, connsRes]) => {
      const customTools = (toolsRes.data || toolsRes.payload || []).filter((t: any) => t.kind !== 'composio');
      const conns = connsRes.data || connsRes.payload || [];
      setUsedSlots(customTools.length + conns.length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (kind === 'http') return;
    // If returning from the widget builder, restore draft instead of fetching from API.
    const draft = draftStore.get();
    if (draft && draft.kind === kind && (draft.id != null ? String(draft.id) : null) === (editId || null)) {
      const cfg = (draft.config || {}) as Record<string, any>;
      const widget = cfg.widget as WidgetConfig | undefined;
      if (kind === 'lead') {
        const fields = (widget?.schema?.length
          ? deriveLeadFieldsFromWidget(widget).map((f) => ({ ...f, enabled: f.enabled !== false }))
          : cfg.fields || []) as LeadField[];
        setLeadForm((f) => ({
          ...f,
          title: draft.title || f.title,
          description: draft.description || f.description,
          fields: fields.length ? fields : f.fields,
          successMessage: (cfg.success_message as string) || f.successMessage,
          dismissMessage: (cfg.dismiss_message as string) || f.dismissMessage,
          webhooks: cfg.webhook_url ? [{ id: Date.now(), url: String(cfg.webhook_url) }] : f.webhooks,
        }));
      } else if (kind === 'form') {
        const fields = (widget?.schema?.length
          ? deriveFormFieldsFromWidget(widget).map((f) => ({ ...f, key: f.key || f.label.toLowerCase().replace(/\s+/g, '_') }))
          : cfg.fields || []) as FormField[];
        setFormForm((f) => ({
          ...f,
          title: draft.title || f.title,
          description: draft.description || f.description,
          fields: fields.length ? fields : f.fields,
          successMessage: (cfg.success_message as string) || f.successMessage,
          webhook: (cfg.webhook_url as string) || f.webhook,
        }));
      } else if (kind === 'button') {
        const buttons = (cfg.buttons || []) as ToolButton[];
        setButtonForm((f) => ({
          ...f,
          title: draft.title || f.title,
          description: draft.description || f.description,
          buttons: buttons.length ? buttons : f.buttons,
        }));
      }
      if (widget) { setPickedWidget(widget as WidgetConfig); setWidgetCleared(false); }
      setLoadedConfig((prev) => ({ ...prev, ...cfg }));
      if (draft.assistant_id) setAssistantId(String(draft.assistant_id));
      setOpenSection('widget');
      draftStore.clear();
      return;
    }
    if (!editId) return;
    captainFetch(`${CAPTAIN_API_BASE}/custom-tools/${editId}`).then((r) => r.json()).then((json) => {
      const tool = json.data || json;
      if (!tool?.id) return;
      if (tool.assistant_id) setAssistantId(String(tool.assistant_id));
      const cfg = tool.config || {};
      setLoadedConfig(cfg);
      setLoadedUpdatedAt(tool.updated_at || null);
      if (kind === 'lead') {
        // Support both legacy webhook_url (string) and new webhook_urls (array)
        const urls: string[] = Array.isArray(cfg.webhook_urls) ? cfg.webhook_urls : (cfg.webhook_url ? [cfg.webhook_url] : []);
        const webhooks = urls.length ? urls.map((u: string) => newWebhookRow(u)) : [newWebhookRow()];
        setLeadForm({ title: tool.title || '', description: tool.description || '', fields: cfg.fields || defaultLeadFields(), successMessage: cfg.success_message || '', dismissMessage: cfg.dismiss_message || '', webhooks, enabled: tool.enabled ?? true });
      } else if (kind === 'form') {
        const fields = (cfg.fields || [{ label: '', type: 'text', required: false }]).map((f: any) => ({
          label: f.label || '', type: f.type || 'text', required: f.required ?? false,
          placeholder: f.placeholder || '', options: f.options || [],
        }));
        setFormForm({ title: tool.title || '', description: tool.description || '', fields, successMessage: cfg.success_message || '', webhook: cfg.webhook_url || '', enabled: tool.enabled ?? true });
      } else if (kind === 'button') {
        setButtonForm({ title: tool.title || '', description: tool.description || '', buttons: cfg.buttons || [{ label: '', action: 'send_message', url: '', message: '' }], enabled: tool.enabled ?? true });
      }
      setCompletedSections(new Set(currentSections as readonly string[]));
      setTimeout(() => setInitialSnapshot(captureSnapshot()), 200);
    }).catch(() => {});
  }, [editId, kind]);

  // ── Save ─────────────────────────────────────────────────────────────────

  const save = async () => {
    let title = '';
    let body: any = { assistant_id: assistantId };
    // The widget the section is currently showing — a library pick, a design
    // carried back from the builder, or (after Reset) nothing. Mirrors
    // Chatwoot's `withSourceWidgetId({ ...(widget ? { widget } : {}) }, sourceId)`:
    // it drops both `widget` and `source_widget_id` when the user reset.
    const widget = currentWidget();
    const widgetFragment = withSourceWidgetId(
      widget ? { widget } : {},
      currentSourceId(),
    );
    if (kind === 'lead') {
      title = leadForm.title.trim();
      const webhookUrls = leadForm.webhooks.map((w) => w.url.trim()).filter(Boolean);
      body = {
        ...body, title, description: leadForm.description, kind: 'lead',
        operation_type: OP_READ, enabled: leadForm.enabled, customer_facing: true,
        ...(!isEdit && { slug: makeSlug('lead', title) }),
        config: { ...widgetFragment, fields: leadForm.fields, success_message: leadForm.successMessage, dismiss_message: leadForm.dismissMessage, webhook_urls: webhookUrls },
      };
    } else if (kind === 'form') {
      title = formForm.title.trim();
      body = {
        ...body, title, description: formForm.description, kind: 'form',
        operation_type: OP_READ, enabled: formForm.enabled, customer_facing: true,
        ...(!isEdit && { slug: makeSlug('form', title) }),
        config: {
          ...widgetFragment,
          fields: formForm.fields.map((f, i) => ({
            key: f.label.toLowerCase().replace(/\s+/g, '_') || `field_${i}`,
            label: f.label, type: f.type, required: f.required, placeholder: f.placeholder || '',
            ...(f.type === 'select' && f.options?.length ? { options: f.options.filter((o) => o.value.trim()) } : {}),
          })),
          success_message: formForm.successMessage, webhook_url: formForm.webhook || null,
        },
      };
    } else {
      title = buttonForm.title.trim();
      body = {
        ...body, title, description: buttonForm.description, kind: 'button',
        operation_type: OP_READ, enabled: buttonForm.enabled, customer_facing: true,
        ...(!isEdit && { slug: makeSlug('button', title) }),
        config: { ...widgetFragment, buttons: buttonForm.buttons.filter((b) => b.label.trim()) },
      };
    }
    if (!title) { setError('Title is required'); return; }
    if (!isEdit && usedSlots >= 25) {
      setError('Maximum limit of 25 toolkit slots reached. Please delete an action before creating a new one.');
      return;
    }
    setIsSaving(true); setError('');
    try {
      const url = isEdit ? `${CAPTAIN_API_BASE}/custom-tools/${editId}` : `${CAPTAIN_API_BASE}/custom-tools`;
      const res = await captainFetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save');
      clearDraftTool();
      navigate(backPath);
    } catch (err: any) { setError(err?.message || 'Failed to save'); }
    finally { setIsSaving(false); }
  };

  const kindLabel = kind === 'lead' ? 'Collect leads' : kind === 'form' ? 'Custom form' : kind === 'button' ? 'Buttons' : 'Custom action';

  // No fabricated starter chips here either — see the HTTP wizard's
  // samplePrompts above for why a canned phrase disconnected from this
  // specific tool's own "When to use" text is actively misleading.
  const samplePrompts: string[] = [];

  const currentAssistant = assistants.find((a) => a.id === assistantId);

  // Right panel state for lead/form/button
  const [previewTab, setPreviewTab] = useState<'live' | 'form' | 'submitted' | 'dismissed'>('live');

  // Accordion open state for lead/form/button
  const [openSection, setOpenSection] = useState<string>('general');
  const toggleSection = (key: string) => setOpenSection((prev) => (prev === key ? '' : key));

  // HttpWizard handles all three "API-family" action types (Call API, Call API +
  // show widget, Show widget) via its own action_type state — it reads the real
  // kind off the fetched tool record when editing, not off this URL param. The
  // Actions list's edit link passes the tool's actual stored kind ('api_widget'
  // / 'widget'), which isn't 'http', so it has to be routed here too or editing
  // one of these two action types opens a blank page.
  if (kind === 'http' || kind === 'api_widget' || kind === 'widget') {
    return (
      <div className="flex h-full w-full flex-col gap-5 overflow-hidden p-6">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 w-fit text-sm font-semibold text-gray-900 transition-colors hover:text-gray-600 dark:text-white dark:hover:text-gray-300 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          {isEdit ? 'Edit custom action' : 'Create custom action'}
        </button>
        <HttpWizard
          editId={editId}
          assistants={assistants}
          assistantId={assistantId}
          setAssistantId={setAssistantId}
          usedSlots={usedSlots}
          onSaved={() => navigate(backPath)}
        />
      </div>
    );
  }


  return (
    <div className="flex h-full w-full flex-col gap-5 overflow-hidden p-6">
      {/* Header */}
      <div>
        <button type="button" onClick={() => navigate(backPath)} className="flex items-center gap-2 w-fit text-sm font-semibold text-gray-900 transition-colors hover:text-gray-600 dark:text-white dark:hover:text-gray-300 cursor-pointer">
          <ArrowLeft className="size-4" />
          {isEdit ? `Edit ${kindLabel}` : kindLabel}
        </button>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {isEdit ? 'Editing custom action' : `${usedSlots} of 25 toolkit slots used`}
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">{error}</div>}

      <div className="flex flex-1 min-h-0 gap-8 overflow-hidden">
        {/* LEFT — per-kind accordion sections */}
        <div className="flex w-[46%] shrink-0 flex-col overflow-y-auto pl-2 pr-3 py-1 divide-y divide-gray-200 dark:divide-neutral-800">

          {/* ── COLLECT LEADS ─────────────────────────────────────────── */}
          {kind === 'lead' && (<>
            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="general"
              title="General"
              isDone={completedSections.has('general')}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!isDirty('general') || !leadForm.title.trim()}
                    onClick={() => saveAndContinue('general')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <FieldRow label="Title">
                <input
                  value={leadForm.title}
                  onChange={(e) => setLeadForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Get in touch"
                  className={inputCls}
                />
              </FieldRow>
              <FieldRow label="When to use">
                <textarea
                  value={leadForm.description}
                  onChange={(e) => setLeadForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className={textareaCls}
                  placeholder="Show this when a visitor wants to be contacted by our team."
                />
              </FieldRow>
              <FieldRow label="Assistant">
                <select value={assistantId} onChange={(e) => setAssistantId(e.target.value)} className={`${selectCls} w-full`}>
                  <option value="">Select assistant</option>
                  {assistants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </FieldRow>
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="fields"
              title="Fields"
              isDone={completedSections.has('fields')}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!isDirty('fields')}
                    onClick={() => saveAndContinue('fields')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">Toggle which fields are shown in the lead form and mark them as required or optional.</p>
              <div className="flex flex-col gap-2">
                {leadForm.fields.map((field, i) => (
                  <div key={field.key} className={`${rowCls} flex items-center justify-between`}>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{field.label}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 dark:text-muted-foreground">{field.type}</span>
                        <button
                          type="button"
                          onClick={() => setLeadForm((f) => ({ ...f, fields: f.fields.map((fld, idx) => idx === i ? { ...fld, required: !fld.required } : fld) }))}
                          className={['text-xs px-1.5 py-0.5 rounded-md border transition-all cursor-pointer', field.required ? 'border-blue-400 text-blue-600 dark:text-blue-400' : 'border-gray-200 text-gray-400 dark:text-muted-foreground dark:border-gray-700'].join(' ')}
                        >
                          {field.required ? 'required' : 'optional'}
                        </button>
                      </div>
                    </div>
                    <Switch checked={field.enabled} onCheckedChange={(c) => setLeadForm((f) => ({ ...f, fields: f.fields.map((fld, idx) => idx === i ? { ...fld, enabled: c === true } : fld) }))} />
                  </div>
                ))}
              </div>
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="widget"
              title="Widget"
              isDone={completedSections.has('widget')}
              footer={
                <div className="flex justify-end">
                  {/* Not dirty-gated: like Chatwoot, this just marks the section
                      done and opens the next one — picking / editing a widget is
                      still a valid "continue". */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveAndContinue('widget')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <WidgetSection
                tool={{ id: editId ? Number(editId) : null, kind: 'lead', title: leadForm.title, updated_at: loadedUpdatedAt, config: { ...loadedConfig, fields: leadForm.fields, widget: currentWidget() || undefined, source_widget_id: currentSourceId() } }}
                onEditWidget={() => {
                  const webhookUrls = leadForm.webhooks.map((w) => w.url.trim()).filter(Boolean);
                  draftStore.set({
                    id: editId ? Number(editId) : null,
                    kind: 'lead',
                    title: leadForm.title,
                    description: leadForm.description,
                    assistant_id: assistantId ? Number(assistantId) : null,
                    config: { ...loadedConfig, fields: leadForm.fields, success_message: leadForm.successMessage, dismiss_message: leadForm.dismissMessage, webhook_urls: webhookUrls, widget: currentWidget() || undefined, source_widget_id: currentSourceId() },
                  });
                  navigate(`/admin-settings/captain/widgets/${editId || 'new'}`);
                }}
                onApplyWidget={(payload) => { setPickedWidget(payload.widget); setPickedSourceId(payload.sourceWidgetId); setWidgetCleared(false); }}
                onResetWidget={() => {
                  setPickedWidget(null);
                  setPickedSourceId(null);
                  setWidgetCleared(true);
                  const savedFields = loadedConfig.fields;
                  if (savedFields?.length) {
                    setLeadForm((f) => ({ ...f, fields: savedFields }));
                  } else {
                    setLeadForm((f) => ({ ...f, fields: defaultLeadFields() }));
                  }
                }}
              />
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="messages"
              title="Messages"
              isDone={completedSections.has('messages')}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!isDirty('messages')}
                    onClick={() => saveAndContinue('messages')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <FieldRow label="Success message"><input value={leadForm.successMessage} onChange={(e) => setLeadForm((f) => ({ ...f, successMessage: e.target.value }))} placeholder="Thank you! We'll be in touch soon." className={inputCls} /></FieldRow>
              <FieldRow label="Dismiss message"><input value={leadForm.dismissMessage} onChange={(e) => setLeadForm((f) => ({ ...f, dismissMessage: e.target.value }))} placeholder="Maybe later." className={inputCls} /></FieldRow>
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="destinations"
              title="Destinations"
              isDone={completedSections.has('destinations')}
            >
              <FieldRow label={<span>Webhook URLs <span className="text-gray-400 dark:text-muted-foreground text-xs font-normal">(receives lead data on submit)</span></span>}>
                <div className="flex flex-col gap-2 w-full">
                  {leadForm.webhooks.map((row, idx) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        value={row.url}
                        onChange={(e) => {
                          const updated = leadForm.webhooks.map((w, i) => i === idx ? { ...w, url: e.target.value } : w);
                          setLeadForm((f) => ({ ...f, webhooks: updated }));
                        }}
                        placeholder="https://hooks.zapier.com/..."
                        className={`${inputCls} flex-1`}
                      />
                      {leadForm.webhooks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLeadForm((f) => ({ ...f, webhooks: f.webhooks.filter((_, i) => i !== idx) }))}
                          className="text-gray-400 dark:text-muted-foreground hover:text-red-500 dark:hover:text-red-500 cursor-pointer p-1 transition-colors"
                          title="Remove webhook URL"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {leadForm.webhooks.length < FIELD_LIMITS.lead && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit mt-1"
                      onClick={() => setLeadForm((f) => ({ ...f, webhooks: [...f.webhooks, newWebhookRow()] }))}
                    >
                      <Plus className="size-3 mr-1" /> Add webhook URL
                    </Button>
                  )}
                </div>
              </FieldRow>
            </DashedSection>
          </>)}

          {/* ── CUSTOM FORM ───────────────────────────────────────────── */}
          {kind === 'form' && (<>
            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="general"
              title="General"
              isDone={completedSections.has('general')}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!isDirty('general') || !formForm.title.trim()}
                    onClick={() => saveAndContinue('general')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <FieldRow label="Title"><input value={formForm.title} onChange={(e) => setFormForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Customer Feedback" className={inputCls} /></FieldRow>
              <FieldRow label="When to use"><textarea value={formForm.description} onChange={(e) => setFormForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={textareaCls} placeholder="Show this when a visitor wants to leave feedback." /></FieldRow>
              <FieldRow label="Assistant"><select value={assistantId} onChange={(e) => setAssistantId(e.target.value)} className={`${selectCls} w-full`}><option value="">Select assistant</option>{assistants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></FieldRow>
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="inputs"
              title="Inputs"
              isDone={completedSections.has('inputs')}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!isDirty('inputs')}
                    onClick={() => saveAndContinue('inputs')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">Add the fields visitors will fill in (up to 10).</p>
                {formForm.fields.length < FIELD_LIMITS.form && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormForm((f) => ({
                      ...f,
                      fields: [...f.fields, { label: '', type: 'text' as const, required: false, placeholder: '', options: [] }],
                    }))}
                  >
                    <Plus className="size-3 mr-1" />Add input
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {formForm.fields.map((field, i) => (
                  <div key={i} className="flex flex-col gap-2.5 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {field.label || `Field ${i + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormForm((f) => ({ ...f, fields: f.fields.filter((_, idx) => idx !== i) }))}
                        className="text-gray-400 dark:text-muted-foreground hover:text-red-500 dark:hover:text-red-500 cursor-pointer p-0.5 transition-colors"
                        title="Remove field"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-muted-foreground mb-1 block">Label</label>
                        <input
                          value={field.label}
                          onChange={(e) => setFormForm((f) => ({ ...f, fields: f.fields.map((fld, idx) => idx === i ? { ...fld, label: e.target.value } : fld) }))}
                          placeholder="e.g. Feedback"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-muted-foreground mb-1 block">Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => setFormForm((f) => ({
                            ...f,
                            fields: f.fields.map((fld, idx) => idx === i ? {
                              ...fld,
                              type: e.target.value as any,
                              options: e.target.value === 'select' && !fld.options?.length ? [{ label: '', value: '' }] : (fld.options || []),
                            } : fld),
                          }))}
                          className={`${selectCls} w-full`}
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="number">Number</option>
                          <option value="select">Dropdown select</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          value={field.placeholder || ''}
                          onChange={(e) => setFormForm((f) => ({ ...f, fields: f.fields.map((fld, idx) => idx === i ? { ...fld, placeholder: e.target.value } : fld) }))}
                          placeholder="Placeholder text"
                          className={inputCls}
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 shrink-0 cursor-pointer select-none">
                        <Checkbox
                          checked={field.required}
                          onCheckedChange={(c) => setFormForm((f) => ({ ...f, fields: f.fields.map((fld, idx) => idx === i ? { ...fld, required: c === true } : fld) }))}
                        />
                        <span>Required</span>
                      </label>
                    </div>

                    {/* Dropdown Options Editor */}
                    {field.type === 'select' && (
                      <div className="mt-1 flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-2.5 dark:border-gray-700 dark:bg-gray-800/60">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Dropdown options</span>
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              value={opt.label}
                              onChange={(e) => setFormForm((f) => ({
                                ...f,
                                fields: f.fields.map((fld, idx) => idx === i ? {
                                  ...fld,
                                  options: fld.options.map((o, oi) => oi === optIdx ? { ...o, label: e.target.value } : o),
                                } : fld),
                              }))}
                              placeholder="Option label"
                              className={`${inputCls} flex-1 text-xs`}
                            />
                            <input
                              value={opt.value}
                              onChange={(e) => setFormForm((f) => ({
                                ...f,
                                fields: f.fields.map((fld, idx) => idx === i ? {
                                  ...fld,
                                  options: fld.options.map((o, oi) => oi === optIdx ? { ...o, value: e.target.value } : o),
                                } : fld),
                              }))}
                              placeholder="Option value"
                              className={`${inputCls} flex-1 text-xs`}
                            />
                            <button
                              type="button"
                              onClick={() => setFormForm((f) => ({
                                ...f,
                                fields: f.fields.map((fld, idx) => idx === i ? {
                                  ...fld,
                                  options: fld.options.filter((_, oi) => oi !== optIdx),
                                } : fld),
                              }))}
                              className="text-gray-400 dark:text-muted-foreground hover:text-red-500 dark:hover:text-red-500 p-1 cursor-pointer"
                              title="Remove option"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit text-xs"
                          onClick={() => setFormForm((f) => ({
                            ...f,
                            fields: f.fields.map((fld, idx) => idx === i ? {
                              ...fld,
                              options: [...(fld.options || []), { label: '', value: '' }],
                            } : fld),
                          }))}
                        >
                          <Plus className="size-3 mr-1" /> Add option
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {formForm.fields.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">No inputs yet — add one above.</p>}
              </div>
              <FieldRow label="Success message"><input value={formForm.successMessage} onChange={(e) => setFormForm((f) => ({ ...f, successMessage: e.target.value }))} placeholder="Thank you for your submission!" className={inputCls} /></FieldRow>
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="widget"
              title="Widget"
              isDone={completedSections.has('widget')}
              footer={
                <div className="flex justify-end">
                  {/* Not dirty-gated: like Chatwoot, this just marks the section
                      done and opens the next one — picking / editing a widget is
                      still a valid "continue". */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveAndContinue('widget')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <WidgetSection
                tool={{ id: editId ? Number(editId) : null, kind: 'form', title: formForm.title, updated_at: loadedUpdatedAt, config: { ...loadedConfig, fields: formForm.fields.map((f, i) => ({ ...f, key: f.label.toLowerCase().replace(/\s+/g, '_') || `field_${i}` })), widget: currentWidget() || undefined, source_widget_id: currentSourceId() } }}
                onEditWidget={() => {
                  draftStore.set({
                    id: editId ? Number(editId) : null,
                    kind: 'form',
                    title: formForm.title,
                    description: formForm.description,
                    assistant_id: assistantId ? Number(assistantId) : null,
                    config: { ...loadedConfig, fields: formForm.fields.map((f, i) => ({ ...f, key: f.label.toLowerCase().replace(/\s+/g, '_') || `field_${i}` })), success_message: formForm.successMessage, webhook_url: formForm.webhook || null, widget: currentWidget() || undefined, source_widget_id: currentSourceId() },
                  });
                  navigate(`/admin-settings/captain/widgets/${editId || 'new'}`);
                }}
                onApplyWidget={(payload) => { setPickedWidget(payload.widget); setPickedSourceId(payload.sourceWidgetId); setWidgetCleared(false); }}
                onResetWidget={() => {
                  setPickedWidget(null);
                  setPickedSourceId(null);
                  setWidgetCleared(true);
                  const savedFields = loadedConfig.fields;
                  if (savedFields?.length) {
                    setFormForm((f) => ({ ...f, fields: savedFields }));
                  } else {
                    setFormForm((f) => ({ ...f, fields: [{ label: '', type: 'text' as const, required: false, placeholder: '', options: [] }] }));
                  }
                }}
              />
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="webhooks"
              title="Webhooks"
              isDone={completedSections.has('webhooks')}
            >
              <FieldRow label={<span>Webhook URL <span className="text-gray-400 dark:text-muted-foreground text-xs font-normal">(optional — receives form data on submit)</span></span>}>
                <input value={formForm.webhook} onChange={(e) => setFormForm((f) => ({ ...f, webhook: e.target.value }))} placeholder="https://hooks.zapier.com/..." className={inputCls} />
              </FieldRow>
            </DashedSection>
          </>)}

          {/* ── CUSTOM BUTTONS ────────────────────────────────────────── */}
          {kind === 'button' && (<>
            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="general"
              title="General"
              isDone={completedSections.has('general')}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!isDirty('general') || !buttonForm.title.trim()}
                    onClick={() => saveAndContinue('general')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <FieldRow label="Title"><input value={buttonForm.title} onChange={(e) => setButtonForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. What would you like to do?" className={inputCls} /></FieldRow>
              <FieldRow label="When to use"><textarea value={buttonForm.description} onChange={(e) => setButtonForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={textareaCls} placeholder="Show these buttons when a visitor asks about next steps." /></FieldRow>
              <FieldRow label="Assistant"><select value={assistantId} onChange={(e) => setAssistantId(e.target.value)} className={`${selectCls} w-full`}><option value="">Select assistant</option>{assistants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></FieldRow>
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="buttons"
              title="Buttons"
              isDone={completedSections.has('buttons')}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!isDirty('buttons')}
                    onClick={() => saveAndContinue('buttons')}
                  >
                    Save and continue
                  </Button>
                </div>
              }
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">Add up to 5 buttons.</p>
                {buttonForm.buttons.length < 5 && <Button type="button" variant="outline" size="sm" onClick={() => setButtonForm((f) => ({ ...f, buttons: [...f.buttons, { label: '', action: 'send_message' as const, url: '', message: '' }] }))}><Plus className="size-3" />Add button</Button>}
              </div>
              <div className="flex flex-col gap-2">
                {buttonForm.buttons.map((btn, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <input value={btn.label} onChange={(e) => setButtonForm((f) => ({ ...f, buttons: f.buttons.map((b, idx) => idx === i ? { ...b, label: e.target.value } : b) }))} placeholder="Button label" className={`${inputCls} flex-1`} />
                      <select value={btn.action} onChange={(e) => setButtonForm((f) => ({ ...f, buttons: f.buttons.map((b, idx) => idx === i ? { ...b, action: e.target.value as any, url: '', message: '' } : b) }))} className={`${selectCls} w-36`}>
                        <option value="send_message">Send message</option><option value="open_url">Open URL</option>
                      </select>
                      <button type="button" onClick={() => setButtonForm((f) => ({ ...f, buttons: f.buttons.filter((_, idx) => idx !== i) }))} disabled={buttonForm.buttons.length === 1} className="text-gray-400 dark:text-muted-foreground hover:text-red-500 dark:hover:text-red-500 disabled:opacity-30 cursor-pointer"><Trash2 className="size-3.5" /></button>
                    </div>
                    {btn.action === 'open_url'
                      ? <input value={btn.url} onChange={(e) => setButtonForm((f) => ({ ...f, buttons: f.buttons.map((b, idx) => idx === i ? { ...b, url: e.target.value } : b) }))} placeholder="https://example.com" className={inputCls} />
                      : <input value={btn.message} onChange={(e) => setButtonForm((f) => ({ ...f, buttons: f.buttons.map((b, idx) => idx === i ? { ...b, message: e.target.value } : b) }))} placeholder="Message to send when clicked" className={inputCls} />
                    }
                  </div>
                ))}
              </div>
            </DashedSection>

            <DashedSection
              openSection={openSection}
              onToggle={toggleSection}
              sectionKey="widget"
              title="Widget"
              isDone={completedSections.has('widget')}
            >
              <WidgetSection
                tool={{ id: editId ? Number(editId) : null, kind: 'button', title: buttonForm.title, updated_at: loadedUpdatedAt, config: { ...loadedConfig, buttons: buttonForm.buttons, widget: currentWidget() || undefined, source_widget_id: currentSourceId() } }}
                onEditWidget={() => {
                  draftStore.set({
                    id: editId ? Number(editId) : null,
                    kind: 'button',
                    title: buttonForm.title,
                    description: buttonForm.description,
                    assistant_id: assistantId ? Number(assistantId) : null,
                    config: { ...loadedConfig, buttons: buttonForm.buttons, widget: currentWidget() || undefined, source_widget_id: currentSourceId() },
                  });
                  navigate(`/admin-settings/captain/widgets/${editId || 'new'}`);
                }}
                onApplyWidget={(payload) => { setPickedWidget(payload.widget); setPickedSourceId(payload.sourceWidgetId); setWidgetCleared(false); }}
                onResetWidget={() => { setPickedWidget(null); setPickedSourceId(null); setWidgetCleared(true); }}
              />
            </DashedSection>
          </>)}

          {/* Bottom actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(backPath)}>Cancel</Button>
            <Button type="button" variant="primary" disabled={isSaving} onClick={save}>{isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save'}</Button>
          </div>
        </div>

        {/* RIGHT — per-kind preview panel */}
        <div className="flex flex-1 flex-col gap-3 min-h-0" style={{ height: 'calc(100vh - 11rem)' }}>
          {/* lead & form have Live/Form/Submitted/Dismissed tabs; button has playground */}
          {(kind === 'lead' || kind === 'form') && (
            <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit dark:border-gray-700 dark:bg-gray-800">
              {(['live', 'form', 'submitted'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setPreviewTab(tab as any)}
                  className={['rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer',
                    previewTab === tab ? 'bg-white text-gray-950 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
                  ].join(' ')}>
                  {tab}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0">
            {kind === 'lead' ? (
              previewTab === 'live' ? (
                <InlinePlayground assistantId={assistantId} assistantName={currentAssistant?.name} samplePrompts={samplePrompts} />
              ) : previewTab === 'submitted' ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-xl">✓</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{leadForm.successMessage || 'Thank you!'}</p>
                  </div>
                </div>
              ) : previewTab === 'dismissed' ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{leadForm.dismissMessage || 'Maybe later.'}</p>
                  </div>
                </div>
              ) : (
                /* form tab — live form preview */
                <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-3.5 text-base font-bold text-gray-950 dark:text-white">{leadForm.title || 'Share your details'}</div>
                    <div className="flex flex-col gap-3">
                      {leadForm.fields.filter((f) => f.enabled).map((f) => (
                        <div key={f.key} className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                          <input readOnly placeholder={f.label} className="min-h-9 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-700" />
                        </div>
                      ))}
                      {leadForm.fields.filter((f) => f.enabled).length === 0 && <p className="text-xs text-gray-400 dark:text-muted-foreground">Enable fields in the Fields section</p>}
                    </div>
                    <div className="mt-5 flex gap-2">
                      <button type="button" className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white">Submit</button>
                      <button type="button" className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-500 dark:text-muted-foreground dark:border-gray-700">Dismiss</button>
                    </div>
                  </div>
                </div>
              )
            ) : kind === 'form' ? (
              previewTab === 'live' ? (
                <InlinePlayground assistantId={assistantId} assistantName={currentAssistant?.name} samplePrompts={samplePrompts} />
              ) : previewTab === 'submitted' ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-xl">✓</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formForm.successMessage || 'Thank you for your submission!'}</p>
                  </div>
                </div>
              ) : (
                /* form tab — live custom form preview */
                <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-3.5 text-base font-bold text-gray-950 dark:text-white">{formForm.title || 'Custom Form'}</div>
                    <div className="flex flex-col gap-3">
                      {formForm.fields.map((f, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {f.label || `Field ${idx + 1}`}
                            {f.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          {f.type === 'select' ? (
                            <select disabled className="min-h-9 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-700 text-gray-600 dark:text-muted-foreground">
                              <option value="">{f.placeholder || 'Select an option...'}</option>
                              {(f.options || []).map((o, oi) => (
                                <option key={oi} value={o.value}>{o.label || o.value}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              readOnly
                              type={f.type === 'number' ? 'number' : 'text'}
                              placeholder={f.placeholder || f.label || 'Enter value...'}
                              className="min-h-9 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-700"
                            />
                          )}
                        </div>
                      ))}
                      {formForm.fields.length === 0 && <p className="text-xs text-gray-400 dark:text-muted-foreground">No inputs configured yet</p>}
                    </div>
                    <div className="mt-5 flex gap-2">
                      <button type="button" className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white">Submit</button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <InlinePlayground assistantId={assistantId} assistantName={currentAssistant?.name} samplePrompts={samplePrompts} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolWizard;
