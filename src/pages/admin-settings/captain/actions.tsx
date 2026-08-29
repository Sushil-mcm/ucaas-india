import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Play, Wrench, Search, Plug, RefreshCw, Zap, MessageSquare, Lock, LockOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AssistantSwitcher, useSelectedAssistant } from './assistant-switcher';

const CAPTAIN_API_BASE = '/captain-api/api/captain';

type Param = { name: string; type: string; description: string; required: boolean };
type Tool = {
  id: string;
  assistant_id: string;
  slug: string;
  title: string;
  description: string | null;
  http_method: 'GET' | 'POST';
  endpoint_url: string;
  request_template: string | null;
  response_template: string | null;
  auth_type: 'none' | 'bearer' | 'basic' | 'header' | 'api_key';
  auth_config: Record<string, string>;
  param_schema: Param[];
  config: { data_access?: 'full' | 'limited'; allowed_response_fields?: string[] };
  operation_type: 'read' | 'write';
  security_tier: 'open' | 'standard' | 'secure' | null;
  enabled: boolean;
  kind: 'http' | 'composio';
  composio_tool_slug: string | null;
  composio_connection_id: string | null;
};

type Toolkit = { slug: string; name: string; description: string; logo: string | null; tools_count: number; categories: string[] };
type Connection = { id: string; toolkit_slug: string; toolkit_name: string; connected_account_id: string; status: string };
type ComposioAction = {
  id: string | null;
  slug: string;
  name: string;
  description: string;
  input_parameters: any;
  enabled: boolean;
  operation_type: 'read' | 'write';
  security_tier: 'open' | 'standard' | 'secure' | null;
};

type SecurityTier = 'open' | 'standard' | 'secure';
const TIER_META: Record<SecurityTier, { label: string; desc: string; icon: any; color: string }> = {
  open: { label: 'Open', desc: 'No verification — bot calls directly', icon: LockOpen, color: 'text-gray-500' },
  standard: { label: 'Standard', desc: 'Requires visitor email on file first', icon: Lock, color: 'text-blue-600' },
  secure: { label: 'Secure', desc: 'Requires OTP via SMS (not wired up yet — needs an SMS provider)', icon: Lock, color: 'text-red-600' },
};

const emptyForm = {
  title: '',
  description: '',
  http_method: 'GET' as 'GET' | 'POST',
  endpoint_url: '',
  request_template: '',
  response_template: '',
  auth_type: 'none' as Tool['auth_type'],
  auth_config: {} as Record<string, string>,
  param_schema: [] as Param[],
  data_access: 'full' as 'full' | 'limited',
  allowed_response_fields: '',
  operation_type: 'write' as 'read' | 'write',
  enabled: true,
};

const fieldClass =
  'min-h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10';
const textAreaClass =
  'w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10';

const CaptainActions = () => {
  const { assistants, selectedId, selectAssistant } = useSelectedAssistant();
  const [mainTab, setMainTab] = useState<'my-actions' | 'create-action'>('my-actions');
  const [actionsSearch, setActionsSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [samplePayload, setSamplePayload] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Composio — real third-party app connections (Gmail, Slack, GitHub, ...),
  // same shape as floatchat's real Composio setup. Connect an app via OAuth,
  // then browse and enable its real actions; enabled ones become ordinary
  // rows in `tools` above (kind: 'composio') and flow through the exact same
  // tool-calling loop as manual HTTP Actions.
  const [connections, setConnections] = useState<Connection[]>([]);
  const [toolkitSearch, setToolkitSearch] = useState('');
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [isLoadingToolkits, setIsLoadingToolkits] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [browseConnection, setBrowseConnection] = useState<Connection | null>(null);
  const [browseActions, setBrowseActions] = useState<ComposioAction[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');

  const fetchConnections = async (assistantId: string) => {
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/composio/connections?assistant_id=${assistantId}`);
      const json = await res.json();
      setConnections(json.data || []);
    } catch {
      setConnections([]);
    }
  };

  const searchToolkits = async (q: string) => {
    setIsLoadingToolkits(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/composio/toolkits${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      const json = await res.json();
      setToolkits((json.data || []).slice(0, 24));
    } catch {
      setToolkits([]);
    } finally {
      setIsLoadingToolkits(false);
    }
  };

  const connectToolkit = async (toolkit: Toolkit) => {
    if (!selectedId) return;
    setIsConnecting(toolkit.slug);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/composio/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant_id: selectedId, toolkit_slug: toolkit.slug, toolkit_name: toolkit.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to start connection');

      // A real iframe-embedded sign-in isn't possible here — Google (and most
      // OAuth providers) refuse to render their login page inside a frame at
      // all, on any site. The closest to "stays in this screen" that's
      // actually achievable is a centered popup window rather than a full
      // new browser tab — same approach WhatsApp's own Embedded Signup and
      // "Sign in with Google" use. It also auto-refreshes status on close, so
      // there's no separate "Check status" click needed once you finish.
      const width = 520;
      const height = 680;
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
      const popup = window.open(
        json.data.redirect_url,
        'composio-connect',
        `width=${width},height=${height},left=${left},top=${top},noopener`,
      );
      await fetchConnections(selectedId);

      if (popup) {
        const poll = setInterval(() => {
          if (popup.closed) {
            clearInterval(poll);
            if (selectedId) fetchConnections(selectedId);
          }
        }, 800);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start connection');
    } finally {
      setIsConnecting(null);
    }
  };

  const refreshConnection = async (conn: Connection) => {
    setIsRefreshing(conn.id);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/composio/connections/${conn.id}/refresh`, { method: 'POST' });
      const json = await res.json();
      setConnections((prev) => prev.map((c) => (c.id === conn.id ? { ...c, status: json.data.status } : c)));
    } catch {
      // non-critical
    } finally {
      setIsRefreshing(null);
    }
  };

  const disconnectApp = async (conn: Connection) => {
    if (!window.confirm(`Disconnect ${conn.toolkit_name}? Any of its enabled actions will stop working.`)) return;
    try {
      await fetch(`${CAPTAIN_API_BASE}/composio/connections/${conn.id}`, { method: 'DELETE' });
      setConnections((prev) => prev.filter((c) => c.id !== conn.id));
      if (selectedId) fetchTools(selectedId);
    } catch {
      // non-critical
    }
  };

  // A connection that expired (or failed) before OAuth was ever completed is
  // permanently dead on Composio's side — re-checking its status can never
  // turn it ACTIVE. The only fix is a brand new connect link, so this drops
  // the dead row and starts over rather than leaving a stuck "Check status" button.
  const reconnectApp = async (conn: Connection) => {
    try {
      await fetch(`${CAPTAIN_API_BASE}/composio/connections/${conn.id}`, { method: 'DELETE' });
      setConnections((prev) => prev.filter((c) => c.id !== conn.id));
    } catch {
      // non-critical — connectToolkit below will surface any real failure
    }
    await connectToolkit({ slug: conn.toolkit_slug, name: conn.toolkit_name, description: '', logo: null, tools_count: 0, categories: [] });
  };

  const openBrowseActions = async (conn: Connection) => {
    if (browseConnection?.id === conn.id) {
      setBrowseConnection(null);
      return;
    }
    setBrowseConnection(conn);
    setBrowseSearch('');
    setIsLoadingActions(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/composio/toolkits/${conn.toolkit_slug}/tools?assistant_id=${selectedId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load actions');
      setBrowseActions(json.data.tools || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load actions');
      setBrowseActions([]);
    } finally {
      setIsLoadingActions(false);
    }
  };

  const toggleComposioAction = async (action: ComposioAction) => {
    if (!browseConnection || !selectedId) return;
    if (action.enabled) {
      const match = action.id || tools.find((t) => t.composio_tool_slug === action.slug && t.composio_connection_id === browseConnection.connected_account_id)?.id;
      if (match) await fetch(`${CAPTAIN_API_BASE}/custom-tools/${match}`, { method: 'DELETE' });
      setBrowseActions((prev) => prev.map((a) => (a.slug === action.slug ? { ...a, enabled: false, id: null, security_tier: null } : a)));
    } else {
      const res = await fetch(`${CAPTAIN_API_BASE}/composio/enable-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: selectedId, connection_id: browseConnection.connected_account_id,
          composio_tool_slug: action.slug, title: action.name, description: action.description, input_parameters: action.input_parameters,
        }),
      });
      const json = await res.json();
      setBrowseActions((prev) => prev.map((a) => (a.slug === action.slug ? { ...a, enabled: true, id: json.data?.id || null } : a)));
    }
    fetchTools(selectedId);
  };

  // Sets (or clears) the security tier for one browse-panel action, enabling
  // it first if it isn't already — the tier control is available right from
  // this list, same as "My actions", without a separate enable step first.
  const setBrowseActionTier = async (action: ComposioAction, tier: SecurityTier | null) => {
    if (!browseConnection || !selectedId) return;
    let toolId = action.id;
    if (!toolId) {
      const res = await fetch(`${CAPTAIN_API_BASE}/composio/enable-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: selectedId, connection_id: browseConnection.connected_account_id,
          composio_tool_slug: action.slug, title: action.name, description: action.description, input_parameters: action.input_parameters,
        }),
      });
      const json = await res.json();
      toolId = json.data?.id || null;
    }
    if (!toolId) return;
    await fetch(`${CAPTAIN_API_BASE}/custom-tools/${toolId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: action.name, description: action.description, operation_type: action.operation_type, security_tier: tier }),
    });
    setBrowseActions((prev) => prev.map((a) => (a.slug === action.slug ? { ...a, id: toolId, enabled: true, security_tier: tier } : a)));
    fetchTools(selectedId);
  };

  // Doubles as both the "select all" checkbox above the list and the
  // toolkit-level on/off switch on the app's card — same effect either way:
  // enable (or disable) every one of this app's actions for the assistant.
  const setAllComposioActions = async (enable: boolean) => {
    if (!browseConnection || !selectedId) return;
    const targets = browseActions.filter((a) => a.enabled !== enable);
    if (!targets.length) return;
    setIsLoadingActions(true);
    for (const action of targets) {
      if (enable) {
        // eslint-disable-next-line no-await-in-loop
        await fetch(`${CAPTAIN_API_BASE}/composio/enable-tool`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistant_id: selectedId, connection_id: browseConnection.connected_account_id,
            composio_tool_slug: action.slug, title: action.name, description: action.description, input_parameters: action.input_parameters,
          }),
        });
      } else {
        const match = tools.find((t) => t.composio_tool_slug === action.slug && t.composio_connection_id === browseConnection.connected_account_id);
        // eslint-disable-next-line no-await-in-loop
        if (match) await fetch(`${CAPTAIN_API_BASE}/custom-tools/${match.id}`, { method: 'DELETE' });
      }
    }
    setBrowseActions((prev) => prev.map((a) => ({ ...a, enabled: enable })));
    fetchTools(selectedId);
    setIsLoadingActions(false);
  };

  useEffect(() => {
    searchToolkits('');
  }, []);

  useEffect(() => {
    if (selectedId) fetchConnections(selectedId);
  }, [selectedId]);

  const fetchTools = async (assistantId: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/custom-tools?assistant_id=${assistantId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load actions');
      setTools(json.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load actions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) fetchTools(selectedId);
  }, [selectedId]);

  // Composio actions are managed per-app inside "Manage" (grouped under their
  // connected app card above) — this list is just the manual/custom HTTP
  // actions, which don't belong to any app.
  const filteredTools = useMemo(() => {
    const q = actionsSearch.trim().toLowerCase();
    const manual = tools.filter((t) => t.kind !== 'composio');
    if (!q) return manual;
    return manual.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }, [tools, actionsSearch]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    toolkits.forEach((tk) => tk.categories.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [toolkits]);

  const visibleToolkits = useMemo(() => {
    if (categoryFilter === 'all') return toolkits;
    return toolkits.filter((tk) => tk.categories.includes(categoryFilter));
  }, [toolkits, categoryFilter]);

  const connectionFor = (toolkitSlug: string) => connections.find((c) => c.toolkit_slug === toolkitSlug);

  const visibleBrowseActions = useMemo(() => {
    const q = browseSearch.trim().toLowerCase();
    if (!q) return browseActions;
    return browseActions.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }, [browseActions, browseSearch]);
  const allBrowseActionsEnabled = browseActions.length > 0 && browseActions.every((a) => a.enabled);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSamplePayload({});
    setTestResult(null);
    setIsModalOpen(true);
  };

  const openEdit = (t: Tool) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description || '',
      http_method: t.http_method,
      endpoint_url: t.endpoint_url,
      request_template: t.request_template || '',
      response_template: t.response_template || '',
      auth_type: t.auth_type,
      auth_config: t.auth_config || {},
      param_schema: t.param_schema || [],
      data_access: t.config?.data_access || 'full',
      allowed_response_fields: (t.config?.allowed_response_fields || []).join(', '),
      operation_type: t.operation_type,
      enabled: t.enabled,
    });
    setSamplePayload(Object.fromEntries((t.param_schema || []).map((p) => [p.name, ''])));
    setTestResult(null);
    setIsModalOpen(true);
  };

  const addParam = () => setForm((f) => ({ ...f, param_schema: [...f.param_schema, { name: '', type: 'string', description: '', required: false }] }));
  const updateParam = (i: number, changes: Partial<Param>) =>
    setForm((f) => {
      const params = [...f.param_schema];
      params[i] = { ...params[i], ...changes };
      return { ...f, param_schema: params };
    });
  const removeParam = (i: number) => setForm((f) => ({ ...f, param_schema: f.param_schema.filter((_, idx) => idx !== i) }));

  const buildPayload = () => ({
    assistant_id: selectedId,
    title: form.title,
    description: form.description,
    http_method: form.http_method,
    endpoint_url: form.endpoint_url,
    request_template: form.request_template || null,
    response_template: form.response_template || null,
    auth_type: form.auth_type,
    auth_config: form.auth_config,
    param_schema: form.param_schema,
    config: { data_access: form.data_access, allowed_response_fields: form.allowed_response_fields.split(',').map((s) => s.trim()).filter(Boolean) },
    operation_type: form.operation_type,
    enabled: form.enabled,
  });

  const handleSave = async () => {
    if (!form.title.trim() || !form.endpoint_url.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      const url = editingId ? `${CAPTAIN_API_BASE}/custom-tools/${editingId}` : `${CAPTAIN_API_BASE}/custom-tools`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save action');
      setIsModalOpen(false);
      if (selectedId) fetchTools(selectedId);
    } catch (err: any) {
      setError(err?.message || 'Failed to save action');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this action? The assistant will no longer be able to call it.')) return;
    try {
      await fetch(`${CAPTAIN_API_BASE}/custom-tools/${id}`, { method: 'DELETE' });
      setTools((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // non-critical
    }
  };

  const handleToggleEnabled = async (t: Tool, next: boolean) => {
    setTools((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: next } : x)));
    try {
      await fetch(`${CAPTAIN_API_BASE}/custom-tools/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...t, enabled: next }),
      });
    } catch {
      setTools((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: !next } : x)));
    }
  };

  const [tierPopoverId, setTierPopoverId] = useState<string | null>(null);
  const [browseTierPopoverSlug, setBrowseTierPopoverSlug] = useState<string | null>(null);

  const setSecurityTier = async (t: Tool, tier: SecurityTier | null) => {
    setTierPopoverId(null);
    setTools((prev) => prev.map((x) => (x.id === t.id ? { ...x, security_tier: tier } : x)));
    try {
      await fetch(`${CAPTAIN_API_BASE}/custom-tools/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...t, security_tier: tier }),
      });
    } catch {
      setTools((prev) => prev.map((x) => (x.id === t.id ? { ...x, security_tier: t.security_tier } : x)));
    }
  };

  const runTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/custom-tools/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), sample_params: samplePayload }),
      });
      const json = await res.json();
      setTestResult(res.ok ? json.data.result : `Error: ${json.message}`);
    } catch (err: any) {
      setTestResult(`Error: ${err?.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex items-start gap-3 border-b border-gray-100 pb-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
          <MessageSquare className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-950">Actions</h2>
          <p className="text-sm text-gray-500">
            Integrate Actions to give Captain AI access to your business data across CRM, Finance &amp; Accounting,
            HR &amp; Recruiting, Sales, E-commerce, File Storage, Issue Tracking, and more. Captain can look up
            contacts, invoices, employees, orders, and more directly from your connected apps.
          </p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-5 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setMainTab('my-actions')}
          className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium ${mainTab === 'my-actions' ? 'border-primary text-gray-900' : 'border-transparent text-gray-500'}`}
        >
          <Zap className="size-3.5" />
          My actions
        </button>
        <button
          type="button"
          onClick={() => setMainTab('create-action')}
          className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium ${mainTab === 'create-action' ? 'border-primary text-gray-900' : 'border-transparent text-gray-500'}`}
        >
          <Plus className="size-3.5" />
          Create action
        </button>
      </div>

      {mainTab === 'my-actions' && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input type="text" value={actionsSearch} onChange={(e) => setActionsSearch(e.target.value)} placeholder="Search your actions..." className="pl-9" />
            </div>
            <AssistantSwitcher assistants={assistants} selectedId={selectedId} onSelect={selectAssistant} />
          </div>

          {connections.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-gray-950">Connected Apps</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {connections.map((conn) => {
                const tk = toolkits.find((t) => t.slug === conn.toolkit_slug);
                return (
                  <div key={conn.id} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      {tk?.logo ? <img src={tk.logo} alt="" className="size-6 rounded" /> : <Plug className="size-5 text-gray-400" />}
                      <div className="truncate text-sm font-semibold text-gray-900">{conn.toolkit_name}</div>
                    </div>
                    <p className="line-clamp-2 text-xs text-gray-400">{tk?.description || 'Connected app'}</p>
                    <div className="mt-auto flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${conn.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : conn.status === 'INITIALIZING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {conn.status}
                      </span>
                      {conn.status === 'ACTIVE' ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => openBrowseActions(conn)}>
                          {browseConnection?.id === conn.id ? 'Close' : 'Manage'}
                        </Button>
                      ) : conn.status === 'INITIALIZING' ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => refreshConnection(conn)} disabled={isRefreshing === conn.id}>
                          <RefreshCw className="size-3.5" />
                          {isRefreshing === conn.id ? 'Checking...' : 'Check status'}
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => reconnectApp(conn)} disabled={isConnecting === conn.toolkit_slug}>
                          {isConnecting === conn.toolkit_slug ? 'Opening...' : 'Reconnect'}
                        </Button>
                      )}
                      <span onClick={() => disconnectApp(conn)} className="cursor-pointer rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="size-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
              </div>
              {browseConnection && (
                <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-gray-950">{browseConnection.toolkit_name} actions</div>
                      <p className="text-xs text-gray-500">Turn on the specific actions this assistant is allowed to call.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Enable all</span>
                      <Switch checked={allBrowseActionsEnabled} onCheckedChange={(c) => setAllComposioActions(c === true)} />
                      <button type="button" onClick={() => setBrowseConnection(null)} className="ml-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                        ✕
                      </button>
                    </div>
                  </div>

                  {isLoadingActions ? (
                    <div className="flex h-24 items-center justify-center text-sm text-gray-500">Loading actions...</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                          <Input type="text" value={browseSearch} onChange={(e) => setBrowseSearch(e.target.value)} placeholder="Search this app's actions..." className="pl-9" />
                        </div>
                        <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
                          <Checkbox checked={allBrowseActionsEnabled} onCheckedChange={(c) => setAllComposioActions(c === true)} />
                          Select all
                        </label>
                      </div>
                      <div className="flex max-h-96 flex-col divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
                        {visibleBrowseActions.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-gray-400">No actions match your search.</div>
                        ) : (
                          visibleBrowseActions.map((a) => (
                            <div key={a.slug} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <Plug className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-sm font-semibold text-gray-950">{a.name}</span>
                                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Composio</span>
                                  </div>
                                  <div className="truncate text-xs text-gray-400">{a.slug}</div>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {a.operation_type === 'read' ? (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setBrowseTierPopoverSlug(browseTierPopoverSlug === a.slug ? null : a.slug)}
                                      className={`flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium hover:bg-gray-100 ${a.security_tier ? TIER_META[a.security_tier].color : 'text-gray-400'}`}
                                    >
                                      {a.security_tier ? (
                                        <>
                                          {(() => { const Icon = TIER_META[a.security_tier].icon; return <Icon className="size-3" />; })()}
                                          {TIER_META[a.security_tier].label}
                                        </>
                                      ) : (
                                        <>
                                          <LockOpen className="size-3" />
                                          Off
                                        </>
                                      )}
                                    </button>
                                    {browseTierPopoverSlug === a.slug && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setBrowseTierPopoverSlug(null)} />
                                        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-xl">
                                          <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-800">Security level</div>
                                          <div className="py-1">
                                            {(['open', 'standard', 'secure'] as const).map((level) => {
                                              const meta = TIER_META[level];
                                              const Icon = meta.icon;
                                              const active = a.security_tier === level;
                                              return (
                                                <button
                                                  key={level}
                                                  type="button"
                                                  onClick={() => { setBrowseActionTier(a, level); setBrowseTierPopoverSlug(null); }}
                                                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 ${active ? 'bg-gray-50' : ''}`}
                                                >
                                                  <Icon className={`mt-0.5 size-4 shrink-0 ${active ? meta.color : 'text-gray-400'}`} />
                                                  <span className="min-w-0 flex-1">
                                                    <span className={`block text-xs font-medium ${active ? meta.color : 'text-gray-800'}`}>{meta.label}</span>
                                                    <span className="block text-xs text-gray-400">{meta.desc}</span>
                                                  </span>
                                                  {active && <Check className={`mt-0.5 size-3.5 shrink-0 ${meta.color}`} />}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span className="rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-400" title="Write actions are staff-only — never exposed to customers">
                                    Staff only
                                  </span>
                                )}
                                <Switch checked={a.enabled} onCheckedChange={() => toggleComposioAction(a)} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {isLoading ? null : connections.length === 0 && filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 px-5 py-16 text-center">
              <Zap className="size-8 text-gray-300" />
              <div className="text-sm font-semibold text-gray-800">No connected actions yet</div>
              <p className="max-w-xs text-xs text-gray-400">Connect an app or add a custom tool from the Create action tab.</p>
              <Button type="button" variant="primary" onClick={() => setMainTab('create-action')} disabled={!selectedId}>
                Create action
              </Button>
            </div>
          ) : filteredTools.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-gray-950">Custom Actions</h3>
              {filteredTools.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {t.kind === 'composio' ? <Plug className="size-4" /> : <Wrench className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="truncate text-sm font-semibold text-gray-950">{t.title}</div>
                        {t.kind === 'composio' && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Composio</span>
                        )}
                      </div>
                      <div className="truncate text-xs text-gray-400">
                        {t.kind === 'composio' ? t.composio_tool_slug : `${t.http_method} · ${t.endpoint_url} · ${t.auth_type !== 'none' ? `Auth: ${t.auth_type}` : 'No auth'}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.operation_type === 'read' ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setTierPopoverId(tierPopoverId === t.id ? null : t.id)}
                          className={`flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium hover:bg-gray-100 ${t.security_tier ? TIER_META[t.security_tier].color : 'text-gray-400'}`}
                        >
                          {t.security_tier ? (
                            <>
                              {(() => { const Icon = TIER_META[t.security_tier].icon; return <Icon className="size-3" />; })()}
                              {TIER_META[t.security_tier].label}
                            </>
                          ) : (
                            <>
                              <LockOpen className="size-3" />
                              Off
                            </>
                          )}
                        </button>
                        {tierPopoverId === t.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setTierPopoverId(null)} />
                            <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-xl">
                              <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-800">Security level</div>
                              <div className="py-1">
                                {(['open', 'standard', 'secure'] as const).map((level) => {
                                  const meta = TIER_META[level];
                                  const Icon = meta.icon;
                                  const active = t.security_tier === level;
                                  return (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => setSecurityTier(t, level)}
                                      className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 ${active ? 'bg-gray-50' : ''}`}
                                    >
                                      <Icon className={`mt-0.5 size-4 shrink-0 ${active ? meta.color : 'text-gray-400'}`} />
                                      <span className="min-w-0 flex-1">
                                        <span className={`block text-xs font-medium ${active ? meta.color : 'text-gray-800'}`}>{meta.label}</span>
                                        <span className="block text-xs text-gray-400">{meta.desc}</span>
                                      </span>
                                      {active && <Check className={`mt-0.5 size-3.5 shrink-0 ${meta.color}`} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-400" title="Write actions are staff-only — never exposed to customers">
                        Staff only
                      </span>
                    )}
                    {t.kind !== 'composio' && (
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(t)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                    <span onClick={() => handleDelete(t.id)} className="cursor-pointer rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="size-4" />
                    </span>
                    <Switch checked={t.enabled} onCheckedChange={(c) => handleToggleEnabled(t, c === true)} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}

      {mainTab === 'create-action' && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                value={toolkitSearch}
                onChange={(e) => {
                  setToolkitSearch(e.target.value);
                  searchToolkits(e.target.value);
                }}
                placeholder="Search apps — Gmail, Slack, GitHub, Notion..."
                className="pl-9"
              />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${fieldClass} w-48`}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <h3 className="text-sm font-bold text-gray-950">Browse apps to connect</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <button type="button" onClick={openCreate} disabled={!selectedId} className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 p-4 text-left hover:border-primary hover:bg-primary/[0.02] disabled:opacity-50">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Wrench className="size-4" />
              </div>
              <div className="text-sm font-semibold text-gray-900">Custom action</div>
              <p className="text-xs text-gray-400">Call any API, with your own auth and request/response templates.</p>
            </button>

            {isLoadingToolkits ? (
              <div className="col-span-full flex h-16 items-center justify-center text-sm text-gray-500">Loading apps...</div>
            ) : (
              visibleToolkits.filter((tk) => !connectionFor(tk.slug)).map((tk) => (
                <div key={tk.slug} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    {tk.logo ? <img src={tk.logo} alt="" className="size-6 rounded" /> : <Plug className="size-5 text-gray-400" />}
                    <div className="truncate text-sm font-semibold text-gray-900">{tk.name}</div>
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-400">{tk.description}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-auto w-fit"
                    disabled={!selectedId || isConnecting === tk.slug}
                    onClick={() => connectToolkit(tk)}
                  >
                    {isConnecting === tk.slug ? 'Opening...' : 'Connect'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
          <DialogTitle className="mb-4 text-base font-bold text-gray-950">{editingId ? 'Edit Action' : 'Add Action'}</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Get Order Status" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description (tells the AI when to use this)</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className={textAreaClass}
                placeholder="Looks up an order's shipping status by order ID."
              />
            </div>
            <div className="flex gap-3">
              <div className="flex w-32 flex-col gap-1.5">
                <Label>Method</Label>
                <select value={form.http_method} onChange={(e) => setForm((f) => ({ ...f, http_method: e.target.value as any }))} className={fieldClass}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>Endpoint URL</Label>
                <Input
                  type="text"
                  value={form.endpoint_url}
                  onChange={(e) => setForm((f) => ({ ...f, endpoint_url: e.target.value }))}
                  placeholder="https://api.example.com/orders/{{ params.order_id }}"
                />
              </div>
            </div>
            {form.http_method === 'POST' && (
              <div className="flex flex-col gap-1.5">
                <Label>Request Body Template (JSON, optional)</Label>
                <textarea
                  value={form.request_template}
                  onChange={(e) => setForm((f) => ({ ...f, request_template: e.target.value }))}
                  rows={3}
                  className={`${textAreaClass} font-mono`}
                  placeholder='{"order_id": "{{ params.order_id }}"}'
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Response Template (optional — how to phrase the result for the model)</Label>
              <textarea
                value={form.response_template}
                onChange={(e) => setForm((f) => ({ ...f, response_template: e.target.value }))}
                rows={2}
                className={`${textAreaClass} font-mono`}
                placeholder="Order status: {{ response.status }}, expected {{ response.eta }}"
              />
              <p className="text-xs text-gray-400">Leave blank to pass the raw JSON response straight to the model.</p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Parameters the AI can fill in</Label>
                <Button type="button" variant="outline" size="sm" onClick={addParam}><Plus className="size-3" />Add</Button>
              </div>
              {form.param_schema.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2">
                  <Input type="text" value={p.name} onChange={(e) => updateParam(i, { name: e.target.value })} placeholder="order_id" className="w-32" />
                  <select value={p.type} onChange={(e) => updateParam(i, { type: e.target.value })} className={`${fieldClass} w-24`}>
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                  <Input type="text" value={p.description} onChange={(e) => updateParam(i, { description: e.target.value })} placeholder="description" className="flex-1" />
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <Checkbox checked={p.required} onCheckedChange={(c) => updateParam(i, { required: c === true })} />
                    Required
                  </label>
                  <span onClick={() => removeParam(i)} className="cursor-pointer text-gray-300 hover:text-red-500"><Trash2 className="size-3.5" /></span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
              <Label>Authentication</Label>
              <select value={form.auth_type} onChange={(e) => setForm((f) => ({ ...f, auth_type: e.target.value as any, auth_config: {} }))} className={fieldClass}>
                <option value="none">None</option>
                <option value="bearer">Bearer token</option>
                <option value="basic">Basic auth</option>
                <option value="header">Custom header</option>
                <option value="api_key">API key header</option>
              </select>
              {form.auth_type === 'bearer' && (
                <Input type="password" value={form.auth_config.token || ''} onChange={(e) => setForm((f) => ({ ...f, auth_config: { token: e.target.value } }))} placeholder="Token" />
              )}
              {form.auth_type === 'basic' && (
                <div className="flex gap-2">
                  <Input type="text" value={form.auth_config.username || ''} onChange={(e) => setForm((f) => ({ ...f, auth_config: { ...f.auth_config, username: e.target.value } }))} placeholder="Username" />
                  <Input type="password" value={form.auth_config.password || ''} onChange={(e) => setForm((f) => ({ ...f, auth_config: { ...f.auth_config, password: e.target.value } }))} placeholder="Password" />
                </div>
              )}
              {form.auth_type === 'header' && (
                <div className="flex gap-2">
                  <Input type="text" value={form.auth_config.key || ''} onChange={(e) => setForm((f) => ({ ...f, auth_config: { ...f.auth_config, key: e.target.value } }))} placeholder="Header name" />
                  <Input type="password" value={form.auth_config.value || ''} onChange={(e) => setForm((f) => ({ ...f, auth_config: { ...f.auth_config, value: e.target.value } }))} placeholder="Header value" />
                </div>
              )}
              {form.auth_type === 'api_key' && (
                <div className="flex gap-2">
                  <Input type="text" value={form.auth_config.name || ''} onChange={(e) => setForm((f) => ({ ...f, auth_config: { ...f.auth_config, name: e.target.value } }))} placeholder="Header name" />
                  <Input type="password" value={form.auth_config.key || ''} onChange={(e) => setForm((f) => ({ ...f, auth_config: { ...f.auth_config, key: e.target.value } }))} placeholder="API key" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
              <Label>Response data access</Label>
              <div className="flex gap-3">
                {(['full', 'limited'] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, data_access: opt }))} className={`flex-1 rounded-xl border px-3 py-2 text-left text-xs ${form.data_access === opt ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                    <div className="font-medium text-gray-800">{opt === 'full' ? 'Full response' : 'Limited fields'}</div>
                    <div className="text-gray-400">{opt === 'full' ? 'The model sees the entire API response' : 'Only the fields you list below reach the model'}</div>
                  </button>
                ))}
              </div>
              {form.data_access === 'limited' && (
                <Input type="text" value={form.allowed_response_fields} onChange={(e) => setForm((f) => ({ ...f, allowed_response_fields: e.target.value }))} placeholder="status, eta, tracking_number" />
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
              <Label>Operation type</Label>
              <p className="text-xs text-gray-400">Only read actions can ever be exposed to customers — write actions stay staff-only (Playground), no matter the security level.</p>
              <div className="flex gap-3">
                {(['read', 'write'] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, operation_type: opt }))} className={`flex-1 rounded-xl border px-3 py-2 text-left text-xs capitalize ${form.operation_type === opt ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
              <div>
                <Label>Enabled</Label>
                <p className="text-xs text-gray-400">Off means the assistant can never call this action.</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(c) => setForm((f) => ({ ...f, enabled: c === true }))} />
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
              <Label>Test this action</Label>
              {form.param_schema.map((p) => (
                <Input
                  key={p.name}
                  type="text"
                  value={samplePayload[p.name] || ''}
                  onChange={(e) => setSamplePayload((s) => ({ ...s, [p.name]: e.target.value }))}
                  placeholder={`Sample value for ${p.name}`}
                />
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={runTest} disabled={isTesting || !form.endpoint_url.trim()}>
                <Play className="size-3.5" />
                {isTesting ? 'Running...' : 'Run Test'}
              </Button>
              {testResult && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 text-xs text-gray-700">{testResult}</pre>}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="button" variant="primary" disabled={isSaving || !form.title.trim() || !form.endpoint_url.trim()} onClick={handleSave}>
              {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Action'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default CaptainActions;
