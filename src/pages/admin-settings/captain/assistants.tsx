import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  Sparkles,
  Lock,
  LockOpen,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  Bold,
  Italic,
  Code,
  Link2,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DeleteConfirmDialog } from '@/components/captain/DeleteConfirmDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';

type Assistant = {
  id: string;
  name: string;
  description: string;
  config: {
    instructions?: string;
    product_name?: string;
    welcome_message?: string;
    handoff_message?: string;
    resolution_message?: string;
    temperature?: number;
    feature_faq?: boolean;
    feature_memory?: boolean;
    feature_citation?: boolean;
    feature_contact_attributes?: boolean;
    customer_allowed_tool_ids?: string[];
    customer_open_tool_ids?: string[];
    otp_required_tool_ids?: string[];
    allowed_tool_ids?: string[];
    disabled_composio_apps?: string[];
  } | null;
  response_guidelines: string[] | null;
  guardrails: string[] | null;
};

const emptyForm = {
  name: '',
  description: '',
  product_name: '',
  instructions:
    'This is a virtual assistant designed to help you complete tasks efficiently. Simply provide clear instructions or ask questions and it will generate a response.',
  welcome_message: 'Hi! How can I help you today?',
  handoff_message: 'Let me connect you with a team member.',
  resolution_message: 'Glad I could help! Anything else?',
  temperature: 0.3,
  feature_faq: true,
  feature_memory: true,
  feature_citation: false,
  feature_contact_attributes: false,
  response_guidelines: '',
  guardrails: '',
};

const CaptainAssistants = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isAssistantDropdownOpen, setIsAssistantDropdownOpen] = useState(false);

  // Security tiers & custom tools state
  const [customerAllowedToolIds, setCustomerAllowedToolIds] = useState<string[]>([]);
  const [customerOpenToolIds, setCustomerOpenToolIds] = useState<string[]>([]);
  const [otpRequiredToolIds, setOtpRequiredToolIds] = useState<string[]>([]);
  const [allowedToolIds, setAllowedToolIds] = useState<string[]>([]);
  const [disabledComposioApps, setDisabledComposioApps] = useState<string[]>([]);

  const [allTools, setAllTools] = useState<any[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const fetchToolsAbortRef = useRef<AbortController | null>(null);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [searchByApp, setSearchByApp] = useState<Record<string, string>>({});
  const [activePopover, setActivePopover] = useState<{ id: string; top: number; right: number } | null>(null);

  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  // Each toolkit's inner "max-h-96 overflow-y-auto" tool-list div, keyed by app
  // name — checking a box re-sorts the list (checked items move to top), which
  // would otherwise visibly yank the user's scroll position; see toggleToolPreservingScroll.
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Checking a box moves it to the top of its toolkit's list (checked-first sort).
  // Without this, that reorder shifts everything below the checked row, which reads
  // to the browser as a layout jump and yanks the scroll position — both the inner
  // tool-list div and (since some browsers propagate the scroll-into-view attempt
  // up the tree) the outer page — right when the user is mid-way scrolling down a
  // long list checking several boxes in a row. Snapshot both scroll positions right
  // before the toggle and restore them on the next frame, after the reorder has
  // already happened, so the list re-sorts without moving the viewport.
  const toggleToolPreservingScroll = (app: string, tool: any) => {
    const container = scrollContainerRefs.current[app];
    const innerScrollTop = container?.scrollTop;
    const pageScrollY = window.scrollY;
    toggleTool(tool);
    requestAnimationFrame(() => {
      if (container && innerScrollTop !== undefined) container.scrollTop = innerScrollTop;
      window.scrollTo({ top: pageScrollY });
    });
  };

  const fetchAssistants = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load assistants');
      setAssistants((json.data || []).map((a: any) => ({ ...a, id: String(a.id) })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load assistants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchTools = async (assistantId?: string) => {
    // Cancel any in-flight fetch so stale results never overwrite a newer call
    fetchToolsAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchToolsAbortRef.current = ctrl;

    setIsLoadingTools(true);
    try {
      const url = assistantId ? `${CAPTAIN_API_BASE}/custom-tools?assistant_id=${assistantId}` : `${CAPTAIN_API_BASE}/custom-tools`;
      const res = await captainFetch(url, { signal: ctrl.signal });
      const json = await res.json();
      if (!ctrl.signal.aborted) setAllTools(json.data || json.payload || []);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setAllTools([]);
    } finally {
      if (!ctrl.signal.aborted) setIsLoadingTools(false);
    }
  };

  const openCreatePage = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCustomerAllowedToolIds([]);
    setCustomerOpenToolIds([]);
    setOtpRequiredToolIds([]);
    setAllowedToolIds([]);
    setDisabledComposioApps([]);
    setAllTools([]);
    setExpandedApps(new Set());
    setActivePopover(null);
    setIsAssistantDropdownOpen(false);
    setViewMode('editor');
    fetchTools();
  };

  const openEditPage = (a: Assistant) => {
    setEditingId(a.id);
    const cfg = a.config || {};
    setCustomerAllowedToolIds(cfg.customer_allowed_tool_ids || []);
    setCustomerOpenToolIds(cfg.customer_open_tool_ids || []);
    setOtpRequiredToolIds(cfg.otp_required_tool_ids || []);
    setAllowedToolIds(cfg.allowed_tool_ids || []);
    setDisabledComposioApps((cfg.disabled_composio_apps || []).map((x: string) => x.toLowerCase()));
    setExpandedApps(new Set());
    setActivePopover(null);
    setIsAssistantDropdownOpen(false);
    fetchTools(a.id);

    setForm({
      name: a.name,
      description: a.description || '',
      product_name: a.config?.product_name || '',
      instructions: a.config?.instructions || '',
      welcome_message: a.config?.welcome_message || '',
      handoff_message: a.config?.handoff_message || '',
      resolution_message: a.config?.resolution_message || '',
      temperature: a.config?.temperature ?? 0.3,
      feature_faq: a.config?.feature_faq ?? true,
      feature_memory: a.config?.feature_memory ?? true,
      feature_citation: a.config?.feature_citation ?? false,
      feature_contact_attributes: a.config?.feature_contact_attributes ?? false,
      response_guidelines: (a.response_guidelines || []).join('\n'),
      guardrails: (a.guardrails || []).join('\n'),
    });
    setViewMode('editor');
  };

  // Group Composio dynamic tools by app
  const { composioGroups, customActions } = useMemo(() => {
    const groupsMap: Record<string, any[]> = {};
    const customList: any[] = [];

    allTools.forEach((tool) => {
      const slug = tool.slug || '';
      if (slug.startsWith('composio_dynamic_')) {
        const app = tool.title?.split(': ')[0]?.trim() || slug.replace('composio_dynamic_', '').split('_')[0];
        if (!groupsMap[app]) groupsMap[app] = [];
        groupsMap[app].push(tool);
      } else {
        customList.push(tool);
      }
    });

    const groups = Object.keys(groupsMap)
      .sort()
      .map((app) => ({ app, tools: groupsMap[app] }));

    return { composioGroups: groups, customActions: customList };
  }, [allTools]);

  const getToolSecurityLevel = (t: any): 'open' | 'standard' | 'secure' | 'none' => {
    const keys = [String(t.id), t.slug, `custom:${t.slug}`];
    if (keys.some((k) => customerOpenToolIds.includes(k))) return 'open';
    if (keys.some((k) => otpRequiredToolIds.includes(k))) return 'secure';
    if (keys.some((k) => customerAllowedToolIds.includes(k))) return 'standard';
    return 'none';
  };

  const isWriteTool = (t: any) => {
    if (t.operation_type === 'write' || t.operation_type === 0) return true;
    if (t.operation_type === 'read' || t.operation_type === 1) return false;
    const title = (t.title?.split(': ')[1] || t.title || t.slug || '').toLowerCase();
    const firstWord = title.includes('_') ? title.split('_')[0] : title.split(' ')[0];
    const readVerbs = ['get', 'fetch', 'list', 'search', 'find', 'read', 'retrieve', 'show', 'view'];
    return !readVerbs.includes(firstWord);
  };

  const setToolSecurityLevel = (t: any, level: 'open' | 'standard' | 'secure' | 'none') => {
    if (isWriteTool(t)) return;
    const primaryKey = `custom:${t.slug}`;
    const allKeys = [String(t.id), t.slug, primaryKey];

    setCustomerOpenToolIds((prev) => prev.filter((k) => !allKeys.includes(k)).concat(level === 'open' ? [primaryKey] : []));
    setCustomerAllowedToolIds((prev) => prev.filter((k) => !allKeys.includes(k)).concat(level === 'standard' ? [primaryKey] : []));
    setOtpRequiredToolIds((prev) => prev.filter((k) => !allKeys.includes(k)).concat(level === 'secure' ? [primaryKey] : []));
  };

  const toggleTool = (t: any) => {
    if (isWriteTool(t)) return;
    const current = getToolSecurityLevel(t);
    if (current === 'none') {
      setToolSecurityLevel(t, 'standard');
    } else {
      setToolSecurityLevel(t, 'none');
    }
  };

  const isAppEnabled = (app: string) => !disabledComposioApps.includes(app.toLowerCase());
  const toggleApp = (app: string, enable: boolean) => {
    const key = app.toLowerCase();
    setDisabledComposioApps((prev) => (enable ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const isCustomToolEnabled = (t: any) => {
    const key = `custom:${t.slug}`;
    return allowedToolIds.includes(key) || allowedToolIds.includes(String(t.id)) || allowedToolIds.includes(t.slug);
  };

  const toggleCustomTool = (t: any) => {
    const key = `custom:${t.slug}`;
    const allKeys = [key, String(t.id), t.slug];
    if (isCustomToolEnabled(t)) {
      setAllowedToolIds((prev) => prev.filter((k) => !allKeys.includes(k)));
      setCustomerOpenToolIds((prev) => prev.filter((k) => !allKeys.includes(k)));
    } else {
      setAllowedToolIds((prev) => [...prev, key]);
      setCustomerOpenToolIds((prev) => [...prev, key]);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    setError('');
    const payload = {
      name: form.name,
      description: form.description,
      config: {
        product_name: form.product_name,
        instructions: form.instructions,
        welcome_message: form.welcome_message,
        handoff_message: form.handoff_message,
        resolution_message: form.resolution_message,
        temperature: Number(form.temperature),
        feature_faq: form.feature_faq,
        feature_memory: form.feature_memory,
        feature_citation: form.feature_citation,
        feature_contact_attributes: form.feature_contact_attributes,
        customer_allowed_tool_ids: customerAllowedToolIds,
        customer_open_tool_ids: customerOpenToolIds,
        otp_required_tool_ids: otpRequiredToolIds,
        allowed_tool_ids: allowedToolIds,
        disabled_composio_apps: disabledComposioApps,
      },
      response_guidelines: form.response_guidelines.split('\n').map((s) => s.trim()).filter(Boolean),
      guardrails: form.guardrails.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      const url = editingId ? `${CAPTAIN_API_BASE}/assistants/${editingId}` : `${CAPTAIN_API_BASE}/assistants`;
      const res = await captainFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save assistant');
      setViewMode('list');
      fetchAssistants();
    } catch (err: any) {
      setError(err?.message || 'Failed to save assistant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'default-assistant') return;
    setDeletingId(id);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete assistant');
      setAssistants((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete assistant');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to format text in Description
  const applyFormatting = (prefix: string, suffix = prefix) => {
    if (!descTextareaRef.current) return;
    const start = descTextareaRef.current.selectionStart;
    const end = descTextareaRef.current.selectionEnd;
    const text = form.description;
    const selected = text.substring(start, end);
    const updated = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    setForm((f) => ({ ...f, description: updated.slice(0, 200) }));
  };

  // ═══════════════════════════════════════════════════════════════════
  // VIEW MODE: FLOATCHAT APP STYLE ASSISTANT PAGE
  // ═══════════════════════════════════════════════════════════════════
  if (viewMode === 'editor') {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto bg-white dark:bg-[#0f0f11] text-gray-900 dark:text-gray-100 p-6 md:p-8">
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-6 pb-24">
          {/* Header with Assistant Switcher & Title */}
          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAssistantDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-lg font-bold text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>{form.name || (editingId ? 'Assistant' : 'New assistant')}</span>
                <ChevronDown className="size-4 text-gray-400" />
              </button>

              {isAssistantDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAssistantDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 min-w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-800 dark:bg-[#1a1a1e]">
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Switch assistant
                    </div>
                    {assistants.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => openEditPage(a)}
                        className={[
                          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer',
                          a.id === editingId
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-semibold'
                            : 'hover:bg-gray-50 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-200',
                        ].join(' ')}
                      >
                        <span className="truncate">{a.name}</span>
                        {a.id === editingId && <Check className="size-3.5" />}
                      </button>
                    ))}
                    <div className="mt-1 border-t border-gray-100 dark:border-gray-800 pt-1">
                      <button
                        type="button"
                        onClick={openCreatePage}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        Add Assistant
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
              {editingId ? 'Edit assistant' : 'Create assistant'}
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 1. Name */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-gray-200">Name</Label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Support Bot"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-2xs outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-[#1a1a1e] dark:text-gray-100"
            />
          </div>

          {/* 2. Description with Floatchat-style Toolbar */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-gray-200">Description</Label>
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-gray-700 dark:bg-[#1a1a1e] dark:focus-within:border-blue-500">
              {/* Toolbar */}
              <div className="flex items-center gap-0.5 border-b border-gray-100 bg-gray-50/50 px-3 py-2 text-gray-500 dark:border-gray-700/60 dark:bg-[#1a1a1e] dark:text-gray-400">
                <button
                  type="button"
                  onClick={() => applyFormatting('**')}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
                  title="Bold"
                >
                  <Bold className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('*')}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
                  title="Italic"
                >
                  <Italic className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('`')}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
                  title="Code"
                >
                  <Code className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('[', '](https://)')}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
                  title="Link"
                >
                  <Link2 className="size-3.5" />
                </button>
                <div className="mx-1 h-3.5 w-px bg-gray-200 dark:bg-gray-800" />
                <button
                  type="button"
                  onClick={() => applyFormatting('\n- ')}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
                  title="Bullet list"
                >
                  <List className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('\n1. ')}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
                  title="Numbered list"
                >
                  <ListOrdered className="size-3.5" />
                </button>
                <div className="mx-1 h-3.5 w-px bg-gray-200 dark:bg-gray-800" />
                <button
                  type="button"
                  onClick={() => document.execCommand('undo')}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
                  title="Undo"
                >
                  <Undo2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => document.execCommand('redo')}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs transition-colors cursor-pointer"
                  title="Redo"
                >
                  <Redo2 className="size-3.5" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={descTextareaRef}
                value={form.description}
                maxLength={200}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 200) }))}
                rows={3}
                placeholder="What does this assistant do?"
                className="w-full resize-none bg-transparent p-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none dark:text-gray-100"
              />

              <div className="flex justify-end px-3 py-1.5 text-xs text-gray-400 font-mono">
                {form.description.length} / 200
              </div>
            </div>
          </div>

          {/* 3. Product Name */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-gray-200">Product Name</Label>
            <input
              type="text"
              value={form.product_name}
              onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
              placeholder="e.g. shoes, our SaaS platform, etc."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-2xs outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-[#1a1a1e] dark:text-gray-100"
            />
          </div>

          {/* 4. Features */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Features</h3>
            <div className="flex flex-col gap-3">
              {[
                { key: 'feature_faq' as const, label: 'Generate FAQs from resolved conversations' },
                { key: 'feature_memory' as const, label: 'Capture key details as memories from customer interactions.' },
                { key: 'feature_citation' as const, label: 'Include source citations in responses' },
                { key: 'feature_contact_attributes' as const, label: 'Allow access to contact information' },
              ].map((feat) => (
                <label key={feat.key} className="flex items-center gap-3 select-none cursor-pointer">
                  <Checkbox
                    checked={form[feat.key]}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, [feat.key]: c === true }))}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Customer tools */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Customer tools</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Turn a toolkit off to block it everywhere, in the Playground and in customer conversations. When it's on, the Playground can use every action in it, while customers only get the ones you check below, gated by the security level you set.
            </p>

            {isLoadingTools ? (
              <div className="flex h-28 items-center justify-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1e] text-sm text-gray-400">
                <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
                Loading tools...
              </div>
            ) : composioGroups.length === 0 && customActions.length === 0 ? (
              <div className="py-2 text-xs text-gray-500 dark:text-gray-400">
                No custom tools yet. Create one from the Tools page to enable it here.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Connected Composio Toolkits (e.g. Gmail) */}
                {composioGroups.map(({ app, tools }) => {
                  const isExpanded = expandedApps.has(app);
                  const selectedCount = tools.filter((t) => !isWriteTool(t) && getToolSecurityLevel(t) !== 'none').length;
                  const query = (searchByApp[app] || '').toLowerCase().trim();
                  const filteredTools = query
                    ? tools.filter(
                        (t) =>
                          (t.title || '').toLowerCase().includes(query) ||
                          (t.description || '').toLowerCase().includes(query)
                      )
                    : tools;
                  // Checked tools first, then unchecked — live, so checking a box moves
                  // it to the top right away (scroll position is preserved separately,
                  // see toggleToolPreservingScroll).
                  const visibleTools = filteredTools.slice().sort((a, b) => {
                    const aSelected = !isWriteTool(a) && getToolSecurityLevel(a) !== 'none';
                    const bSelected = !isWriteTool(b) && getToolSecurityLevel(b) !== 'none';
                    return Number(bSelected) - Number(aSelected);
                  });

                  return (
                    <div
                      key={app}
                      className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1a1a1e] overflow-hidden shadow-2xs"
                    >
                      {/* Accordion header */}
                      <div
                        className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => {
                          setExpandedApps((prev) => {
                            const next = new Set(prev);
                            if (next.has(app)) next.delete(app);
                            else next.add(app);
                            return next;
                          });
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 text-gray-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold capitalize text-gray-900 dark:text-white">
                              {app}
                            </div>
                            <div className="text-xs text-gray-400">
                              {selectedCount} of {tools.length} enabled for customers
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={isAppEnabled(app)}
                            onCheckedChange={(c) => toggleApp(app, c === true)}
                            title={isAppEnabled(app) ? `Disable ${app} toolkit` : `Enable ${app} toolkit`}
                          />
                        </div>
                      </div>

                      {/* Expanded tools list */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 dark:border-gray-800/80 p-4 flex flex-col gap-3 bg-gray-50/40 dark:bg-[#141418]">
                          {/* Search in this app */}
                          <div className="relative">
                            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={searchByApp[app] || ''}
                              onChange={(e) => setSearchByApp((prev) => ({ ...prev, [app]: e.target.value }))}
                              placeholder="Search in this app..."
                              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-[#1a1a1e] dark:text-gray-100"
                            />
                          </div>

                          <div
                            ref={(el) => { scrollContainerRefs.current[app] = el; }}
                            className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto pr-1"
                          >
                            {visibleTools.map((tool) => {
                              const isWrite = isWriteTool(tool);
                              const level = isWrite ? 'none' : getToolSecurityLevel(tool);
                              const isSelected = level !== 'none';

                              return (
                                <div
                                  key={tool.id}
                                  className={cn(
                                    "py-3 flex items-start gap-3 transition-opacity",
                                    isWrite ? "opacity-60 cursor-not-allowed select-none" : ""
                                  )}
                                  title={isWrite ? "Write tools are not allowed for customer conversations (disabled)" : undefined}
                                >
                                  {isWrite ? (
                                    <Checkbox
                                      disabled
                                      checked={false}
                                      className="mt-0.5 opacity-40 cursor-not-allowed border-gray-400 dark:border-neutral-600"
                                    />
                                  ) : (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleToolPreservingScroll(app, tool)}
                                      className="mt-0.5"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className={cn(
                                        "text-sm font-semibold flex items-center gap-1.5",
                                        isWrite ? "text-gray-400 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"
                                      )}>
                                        <span>{tool.title?.split(': ')[1] || tool.title}</span>
                                        {isWrite && (
                                          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                            WRITE
                                          </span>
                                        )}
                                      </span>

                                      {/* Security level badge only for selected read tools */}
                                      {!isWrite && isSelected && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setActivePopover(
                                              activePopover?.id === String(tool.id)
                                                ? null
                                                : { id: String(tool.id), top: rect.bottom + 4, right: window.innerWidth - rect.right }
                                            );
                                          }}
                                          className={[
                                            'flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors shrink-0',
                                            level === 'standard'
                                              ? 'text-blue-500 hover:text-blue-400'
                                              : level === 'secure'
                                              ? 'text-red-500 hover:text-red-400'
                                              : 'text-gray-400 hover:text-gray-300',
                                          ].join(' ')}
                                        >
                                          {level === 'open' ? (
                                            <LockOpen className="size-3.5" />
                                          ) : (
                                            <Lock className="size-3.5" />
                                          )}
                                          <span className="capitalize">{level}</span>
                                        </button>
                                      )}
                                    </div>

                                    {tool.description && (
                                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                                        {tool.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom Actions */}
                {customActions.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1a1a1e] shadow-2xs">
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Custom tools
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {customActions.map((tool) => (
                        <div key={tool.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141418]">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {tool.title}
                              </span>
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 uppercase">
                                {tool.kind || 'action'}
                              </span>
                            </div>
                            {tool.description && (
                              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{tool.description}</p>
                            )}
                          </div>
                          <Switch checked={isCustomToolEnabled(tool)} onCheckedChange={() => toggleCustomTool(tool)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Accordion for Instructions / Persona */}
          <details className="group rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1a1a1e] shadow-2xs">
            <summary className="flex items-center justify-between cursor-pointer list-none select-none text-sm font-semibold text-gray-700 dark:text-gray-200">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-gray-400" />
                Advanced Behavior &amp; Instructions
              </span>
              <ChevronDown className="size-4 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">System Instructions Prompt</Label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-[#141418] dark:text-gray-100"
                  placeholder="System instructions for the model..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Welcome message</Label>
                  <input
                    type="text"
                    value={form.welcome_message}
                    onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
                    className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-[#141418] dark:text-gray-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Handoff message</Label>
                  <input
                    type="text"
                    value={form.handoff_message}
                    onChange={(e) => setForm((f) => ({ ...f, handoff_message: e.target.value }))}
                    className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-[#141418] dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Bottom Action Bar (Cancel / Update) matching Floatchat app — both
              buttons split the row evenly and sit close together, rather than
              two narrow, widely-spaced pills. */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewMode('list')}
              className="h-11 flex-1 rounded-xl !border-gray-300 !bg-white !text-gray-900 text-sm font-semibold hover:!bg-gray-100 dark:!border-gray-600 dark:!bg-gray-800 dark:!text-white dark:hover:!bg-gray-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving || !form.name.trim()}
              onClick={handleSave}
              className="h-11 flex-1 rounded-xl !border-indigo-600 !bg-indigo-600 hover:!bg-indigo-500 !text-white text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              {isSaving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Floatchat-exact Security Level Popover */}
        {activePopover && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setActivePopover(null)} />
            <div
              className="fixed z-50 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-800 dark:bg-[#1e1e24]"
              style={{ top: activePopover.top, right: activePopover.right }}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400">
                Security level
              </div>
              <div className="flex flex-col gap-1">
                {[
                  {
                    key: 'open' as const,
                    label: 'Open',
                    desc: 'No verification — bot calls directly',
                    icon: LockOpen,
                    color: 'text-gray-400',
                  },
                  {
                    key: 'standard' as const,
                    label: 'Standard',
                    desc: 'Requires email + record ID',
                    icon: Lock,
                    color: 'text-blue-500',
                  },
                  {
                    key: 'secure' as const,
                    label: 'Secure',
                    desc: 'Requires OTP via SMS',
                    icon: Lock,
                    color: 'text-gray-400',
                  },
                ].map((opt) => {
                  const tool = allTools.find((t) => String(t.id) === activePopover.id);
                  const isCurrent = tool ? getToolSecurityLevel(tool) === opt.key : false;
                  const Icon = opt.icon;

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        if (tool) setToolSecurityLevel(tool, opt.key);
                        setActivePopover(null);
                      }}
                      className={[
                        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer',
                        isCurrent
                          ? 'bg-blue-50/70 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60',
                      ].join(' ')}
                    >
                      <Icon className={`size-4 mt-0.5 shrink-0 ${opt.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={[
                              'text-xs font-semibold',
                              isCurrent
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-900 dark:text-white',
                            ].join(' ')}
                          >
                            {opt.label}
                          </span>
                          {isCurrent && <Check className="size-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                          {opt.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // VIEW MODE: LIST OF ASSISTANTS
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-950 dark:text-gray-100">Assistants</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            AI personas that power your Captain chatbot — instructions, guardrails, and behavior.
          </div>
        </div>
        <Button type="button" variant="primary" onClick={openCreatePage}>
          <Plus className="size-4" />
          Add Assistant
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : assistants.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Sparkles className="size-6 text-gray-300 dark:text-gray-600" />
            No assistants yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {assistants.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex flex-1 items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-950 dark:text-gray-100">{a.name}</div>
                    <div className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{a.description}</div>
                    <div className="mt-1 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">
                      {a.config?.instructions}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditPage(a)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  {a.id !== 'default-assistant' && (
                    <Button
                      type="button"
                      variant="destructiveOutline"
                      size="sm"
                      disabled={deletingId === a.id}
                      onClick={() => setPendingDeleteId(a.id)}
                    >
                      <Trash2 className="size-3.5" />
                      {deletingId === a.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <DeleteConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        itemLabel="assistant"
        itemName={assistants.find((a) => a.id === pendingDeleteId)?.name}
        onConfirm={() => handleDelete(pendingDeleteId!)}
      />
    </div>
  );
};

export default CaptainAssistants;
