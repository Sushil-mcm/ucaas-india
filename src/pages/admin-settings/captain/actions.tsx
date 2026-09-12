import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Play, Wrench, Search, Plug, Zap, MessageSquare, ChevronLeft, ChevronRight, ChevronDown, Users, ClipboardList, MousePointerClick, Bot, Paperclip, Mic, Volume2, ThumbsUp, ThumbsDown, MoreHorizontal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AssistantSwitcher, useSelectedAssistant } from './assistant-switcher';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';


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
  config: Record<string, any>;
  operation_type: 'read' | 'write';
  enabled: boolean;
  kind: 'http' | 'composio' | 'lead' | 'form' | 'button' | 'widget' | 'api_widget';
  composio_tool_slug: string | null;
  composio_connection_id: string | null;
};

type Toolkit = { slug: string; name: string; description: string; logo: string | null; tools_count: number; categories: string[]; auth_schemes?: string[] };
type Connection = { id: string; toolkit_slug: string; toolkit_name: string; connected_account_id: string; status: string; logo?: string | null };

const fieldClass =
  'min-h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-primary';



const CaptainActions = () => {
  const navigate = useNavigate();
  const { assistants, selectedId, selectAssistant, isLoading: isLoadingAssistants } = useSelectedAssistant();
  const [mainTab, setMainTab] = useState<'my-actions' | 'create-action'>('my-actions');
  const [actionsSearch, setActionsSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageReady, setIsPageReady] = useState(false);
  const [error, setError] = useState('');

  // Composio — real third-party app connections (Gmail, Slack, GitHub, ...),
  // same shape as floatchat's real Composio setup. Connect an app via OAuth,
  // then browse and enable its real actions; enabled ones become ordinary
  // rows in `tools` above (kind: 'composio') and flow through the exact same
  // tool-calling loop as manual HTTP Actions.
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [toolkitSearch, setToolkitSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>(['']);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [myActionsTypeFilter, setMyActionsTypeFilter] = useState<'all' | 'app' | 'custom_tool'>('all');
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [isLoadingToolkits, setIsLoadingToolkits] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [seedingApps, setSeedingApps] = useState<Set<string>>(new Set());
  const [disconnectTarget, setDisconnectTarget] = useState<Connection | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [connectedToolkit, setConnectedToolkit] = useState<{ slug: string; name: string; description: string; logo: string | null } | null>(null);
  const [previewModalKind, setPreviewModalKind] = useState<'lead' | 'form' | 'button' | 'custom' | null>(null);
  const [previewAssistantId, setPreviewAssistantId] = useState<string>('');



  useEffect(() => {
    if (selectedId) setPreviewAssistantId(selectedId);
  }, [selectedId]);

  const previewModalData = useMemo(() => {
    if (!previewModalKind) return null;
    switch (previewModalKind) {
      case 'lead':
        return {
          icon: <Users className="size-6 text-purple-400" />,
          title: 'Collect leads',
          description: "Capture the visitor's name, email and phone.",
          userMessage: 'Notify the sales team that the Acme deal closed',
          assistantReply: "Done, I've posted to #sales-team on Slack: 'The Acme deal has just closed. Great work, team!' The message was delivered successfully.",
        };
      case 'form':
        return {
          icon: <ClipboardList className="size-6 text-purple-400" />,
          title: 'Custom form',
          description: 'Ask visitors any custom questions with a structured form.',
          userMessage: 'I would like to submit my onboarding details',
          assistantReply: 'Sure! Please fill out the form below to complete onboarding.',
        };
      case 'button':
        return {
          icon: <MousePointerClick className="size-6 text-purple-400" />,
          title: 'Buttons',
          description: 'Present quick reply buttons to guide visitors.',
          userMessage: 'What can you help me with?',
          assistantReply: 'Choose one of the options below to get started:',
        };
      case 'custom':
      default:
        return {
          icon: <Wrench className="size-6 text-purple-400" />,
          title: 'Custom action',
          description: 'Call any API, with your own auth and request/response templates.',
          userMessage: 'Notify the sales team that the Acme deal closed',
          assistantReply: "Done, I've posted to #sales-team on Slack: 'The Acme deal has just closed. Great work, team!' The message was delivered successfully.",
        };
    }
  }, [previewModalKind]);

  const handleStartCustomizing = () => {
    const kind = previewModalKind;
    const targetId = previewAssistantId || selectedId;
    setPreviewModalKind(null);
    if (!kind) return;
    navigate(`/admin-settings/captain/tools/new?kind=${kind === 'custom' ? 'http' : kind}&assistantId=${targetId}&from=actions`);
  };

  const searchReqId = useRef(0);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConnections = async (assistantId: string): Promise<Connection[]> => {
    setIsLoadingConnections(true);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/composio/connections?assistant_id=${assistantId}`);
      const json = await res.json();
      const data: Connection[] = json.data || [];
      setConnections(data);
      return data;
    } catch {
      setConnections([]);
      return [];
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const searchToolkits = async (q: string, category = categoryFilter, cursor = '') => {
    const reqId = ++searchReqId.current;
    setIsLoadingToolkits(true);
    try {
      const params = new URLSearchParams({ limit: '24' });
      if (q.trim()) params.set('search', q.trim());
      if (category && category !== 'all') params.set('category', category);
      if (cursor) params.set('cursor', cursor);

      const res = await captainFetch(`${CAPTAIN_API_BASE}/composio/toolkits?${params.toString()}`);
      const json = await res.json();
      if (reqId !== searchReqId.current) return;
      setToolkits(json.data || []);
      setNextCursor(json.next_cursor || null);
      setTotalItems(json.total_items || 0);
      setTotalPages(json.total_pages || 0);
    } catch {
      if (reqId !== searchReqId.current) return;
      setToolkits([]);
    } finally {
      setIsLoadingToolkits(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/composio/categories`);
      const json = await res.json();
      setCategories(json.data || []);
    } catch {
      setCategories([]);
    }
  };

  const handleNextPage = () => {
    if (!nextCursor || isLoadingToolkits) return;
    const newHistory = [...cursorHistory.slice(0, pageIndex + 1), nextCursor];
    const newIdx = pageIndex + 1;
    setCursorHistory(newHistory);
    setPageIndex(newIdx);
    searchToolkits(toolkitSearch, categoryFilter, nextCursor);
  };

  const handlePrevPage = () => {
    if (pageIndex <= 0 || isLoadingToolkits) return;
    const newIdx = pageIndex - 1;
    const prevCursor = cursorHistory[newIdx] || '';
    setPageIndex(newIdx);
    searchToolkits(toolkitSearch, categoryFilter, prevCursor);
  };

  const startSeeding = (appSlug: string) => {
    setSeedingApps((prev) => new Set(prev).add(appSlug));
  };

  const pollUntilToolsSeeded = (assistantId: string, appSlug: string) => {
    let attempts = 0;
    const MAX = 30;
    const prefix = `composio_dynamic_${appSlug.toLowerCase()}`;
    const check = async () => {
      if (attempts++ >= MAX) {
        setSeedingApps((prev) => { const n = new Set(prev); n.delete(appSlug); return n; });
        return;
      }
      try {
        const res = await captainFetch(`${CAPTAIN_API_BASE}/custom-tools?assistant_id=${assistantId}`);
        const json = await res.json();
        const seeded = (json.data || []).some((t: any) => t.slug?.startsWith(prefix));
        if (seeded) {
          setSeedingApps((prev) => { const n = new Set(prev); n.delete(appSlug); return n; });
          setTools(json.data || []);
          return;
        }
      } catch { /* ignore */ }
      setTimeout(check, 3000);
    };
    setTimeout(check, 4000);
  };

  const pollUntilActive = (assistantId: string, appSlug: string) => {
    let attempts = 0;
    const MAX = 20;
    const check = async () => {
      if (attempts++ >= MAX) return;
      const conns = await fetchConnections(assistantId);
      const active = conns.find((c) => c.toolkit_slug === appSlug && c.status === 'ACTIVE');
      if (active) {
        startSeeding(appSlug);
        captainFetch(`${CAPTAIN_API_BASE}/composio/seed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assistant_id: assistantId }),
        })
          .then(() => fetchConnections(assistantId))
          .then(() => {
            const tk = toolkits.find((t) => t.slug === appSlug);
            if (tk) setConnectedToolkit({ slug: tk.slug, name: tk.name, description: tk.description, logo: tk.logo });
            pollUntilToolsSeeded(assistantId, appSlug);
          })
          .catch(() => {
            setSeedingApps((prev) => { const n = new Set(prev); n.delete(appSlug); return n; });
          });
      } else {
        setTimeout(check, 3000);
      }
    };
    setTimeout(check, 3000);
  };

  const enableToolkit = async (toolkit: Toolkit) => {
    if (!selectedId) return;
    if (isSlotLimitReached) {
      setError('Maximum limit of 25 toolkit slots reached. Please delete an action before connecting an app.');
      return;
    }
    setIsConnecting(toolkit.slug);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/composio/enable-toolkit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant_id: selectedId, toolkit_slug: toolkit.slug }),
      });
      if (!res.ok) throw new Error('Failed to enable toolkit');
      startSeeding(toolkit.slug);
      await fetchConnections(selectedId);
      setConnectedToolkit({ slug: toolkit.slug, name: toolkit.name, description: toolkit.description, logo: toolkit.logo });
      pollUntilToolsSeeded(selectedId, toolkit.slug);
    } catch (err: any) {
      setError(err?.message || 'Failed to enable toolkit');
      setSeedingApps((prev) => { const n = new Set(prev); n.delete(toolkit.slug); return n; });
    } finally {
      setIsConnecting(null);
    }
  };

  const connectToolkit = async (toolkit: Toolkit) => {
    if (!selectedId) return;
    if (isSlotLimitReached) {
      setError('Maximum limit of 25 toolkit slots reached. Please delete an action before connecting an app.');
      return;
    }

    const isNoAuth = !!(toolkit.auth_schemes?.length && toolkit.auth_schemes.every((s) => s === 'NO_AUTH'));
    if (isNoAuth) {
      return enableToolkit(toolkit);
    }

    setIsConnecting(toolkit.slug);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/composio/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: selectedId,
          toolkit_slug: toolkit.slug,
          toolkit_name: toolkit.name,
          redirect_url: `${window.location.origin}/oauth-success.html`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to start connection');

      const redirectUrl = json?.data?.redirect_url || json?.redirect_url;
      if (!redirectUrl) throw new Error('No connection URL returned from service');

      const width = 520;
      const height = 680;
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
      const popup = window.open(
        redirectUrl,
        'composio-connect',
        `width=${width},height=${height},left=${left},top=${top}`,
      );
      await fetchConnections(selectedId);

      if (popup) {
        const appSlug = toolkit.slug;
        const aid = selectedId;
        let popupPollCount = 0;
        const popupPoll = setInterval(() => {
          popupPollCount++;
          if (popup.closed || popupPollCount > 75) {
            clearInterval(popupPoll);
            if (popup.closed && aid) pollUntilActive(aid, appSlug);
          }
        }, 800);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start connection');
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnectApp = (conn: Connection) => {
    setDisconnectTarget(conn);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    setIsDisconnecting(true);
    const target = disconnectTarget;
    try {
      const params = new URLSearchParams({
        app_name: target.toolkit_slug,
        ...(selectedId ? { assistant_id: selectedId } : {}),
      });
      await captainFetch(`${CAPTAIN_API_BASE}/composio/connections/${target.id}?${params}`, { method: 'DELETE' });

      if (selectedId) {
        const remaining = await fetchConnections(selectedId);
        const ghosts = remaining.filter(
          (c) => c.toolkit_slug === target.toolkit_slug && c.status !== 'ACTIVE',
        );
        await Promise.allSettled(
          ghosts.map((g) =>
            captainFetch(`${CAPTAIN_API_BASE}/composio/connections/${g.id}?app_name=${target.toolkit_slug}&assistant_id=${selectedId}`, {
              method: 'DELETE',
            }),
          ),
        );
        await fetchConnections(selectedId);
        fetchTools(selectedId);
      }
      setDisconnectTarget(null);
    } catch {
      // ignore
    } finally {
      setIsDisconnecting(false);
    }
  };

  const reconnectApp = async (conn: Connection) => {
    try {
      await captainFetch(`${CAPTAIN_API_BASE}/composio/connections/${conn.id}`, { method: 'DELETE' });
      setConnections((prev) => prev.filter((c) => c.id !== conn.id));
    } catch {
      // ignore
    }
    await connectToolkit({ slug: conn.toolkit_slug, name: conn.toolkit_name, description: '', logo: null, tools_count: 0, categories: [] });
  };

  useEffect(() => {
    if (!isPageReady) return;
    searchToolkits(toolkitSearch);
    fetchCategories();
  }, [mainTab]);

  useEffect(() => {
    if (!isPageReady) return;
    if (selectedId) fetchConnections(selectedId);
  }, [selectedId]);

  const fetchTools = async (assistantId: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/custom-tools?assistant_id=${assistantId}`);
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
    if (!isLoadingAssistants && !isPageReady) {
      if (selectedId) {
        Promise.all([
          fetchTools(selectedId),
          fetchConnections(selectedId),
          searchToolkits('', 'all', ''),
          fetchCategories(),
        ]).finally(() => setIsPageReady(true));
      } else {
        setIsLoading(false);
        setIsPageReady(true);
      }
    }
  }, [selectedId, isLoadingAssistants]);

  // Composio actions are managed per-app inside "Manage" (grouped under their
  // connected app card above) — this list is just the manual/custom HTTP
  // actions, which don't belong to any app.
  // A library widget (`kind: 'widget'`, no assistant_id) belongs on the standalone
  // Widgets page, not here — Chatwoot's own Actions list has no kind-based filter
  // at all; it hides library widgets purely by scoping its tools query to the
  // current assistant, which a library widget never matches. Our `/custom-tools`
  // list deliberately widens that query to also include assistant-less rows (the
  // "Use widget from library" picker reuses this same endpoint), so the
  // equivalent filter here has to be assistant-scoped too — excluding only a
  // *library* widget, never a real "Show widget" action (kind: 'widget' WITH an
  // assistant_id), which belongs in this list exactly like any other action.
  const filteredTools = useMemo(() => {
    const q = actionsSearch.trim().toLowerCase();
    const manual = tools.filter((t) => t.kind !== 'composio' && !(t.kind === 'widget' && !t.assistant_id));
    if (!q) return manual;
    return manual.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }, [tools, actionsSearch]);

  const filteredConnections = useMemo(() => {
    const q = actionsSearch.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((c) => c.toolkit_name.toLowerCase().includes(q));
  }, [connections, actionsSearch]);

  const visibleToolkits = useMemo(() => {
    if (categoryFilter === 'all') return toolkits;
    return toolkits.filter((tk) => tk.categories.includes(categoryFilter));
  }, [toolkits, categoryFilter]);

  const totalUsedSlots = connections.length + tools.filter((t) => t.kind !== 'composio').length;
  const isSlotLimitReached = totalUsedSlots >= 25;

  const connectionFor = (toolkitSlug: string) => connections.find((c) => c.toolkit_slug === toolkitSlug);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await captainFetch(`${CAPTAIN_API_BASE}/custom-tools/${deleteTarget.id}`, { method: 'DELETE' });
      setTools((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // silently ignore — item is removed from UI optimistically
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditTool = (t: Tool) => {
    const targetId = t.assistant_id || selectedId || (assistants.length ? assistants[0].id : '');
    const kindParam = (!t.kind || (t.kind as string) === 'custom') ? 'http' : t.kind;
    navigate(`/admin-settings/captain/tools/edit?id=${t.id}&kind=${kindParam}&assistantId=${targetId}&from=actions`);
  };

  const isInitializing = isLoadingAssistants || !isPageReady;

  if (isInitializing) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <div className="size-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary dark:border-gray-700 dark:border-t-primary" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 overflow-y-auto p-6">
      <div className="flex items-start gap-3 border-b border-gray-100 pb-5 dark:border-gray-700">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
          <MessageSquare className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-950 dark:text-gray-100">Actions</h2>
          <p className="text-sm text-gray-500 dark:text-muted-foreground">
            Integrate Actions to give Captain AI access to your business data across CRM, Finance &amp; Accounting,
            HR &amp; Recruiting, Sales, E-commerce, File Storage, Issue Tracking, and more. Captain can look up
            contacts, invoices, employees, orders, and more directly from your connected apps.
          </p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}

      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setMainTab('my-actions')}
            className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium ${mainTab === 'my-actions' ? 'border-primary text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
          >
            <Zap className="size-3.5" />
            My actions
          </button>
          <button
            type="button"
            onClick={() => setMainTab('create-action')}
            className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium ${mainTab === 'create-action' ? 'border-primary text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
          >
            <Plus className="size-3.5" />
            Create action
          </button>
        </div>
        <span className="pb-2.5 text-xs font-medium text-gray-400 dark:text-neutral-400">
          {totalUsedSlots} of 25 toolkit slots used
        </span>
      </div>

      {mainTab === 'my-actions' && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
              <Input type="text" value={actionsSearch} onChange={(e) => setActionsSearch(e.target.value)} placeholder="Search your actions..." className="pl-9" />
            </div>
            <select value={myActionsTypeFilter} onChange={(e) => setMyActionsTypeFilter(e.target.value as any)} className={`${fieldClass} w-40`}>
              <option value="all">All types</option>
              <option value="app">Apps</option>
              <option value="custom_tool">Custom tools</option>
            </select>
            <AssistantSwitcher assistants={assistants} selectedId={selectedId} onSelect={selectAssistant} />
          </div>

          {isLoading || (isLoadingConnections && myActionsTypeFilter !== 'custom_tool') ? (
            <div className="flex h-48 items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/60">
              <div className="size-5 animate-spin rounded-full border-2 border-gray-200 dark:border-border border-t-primary" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading actions...</span>
            </div>
          ) : (myActionsTypeFilter === 'app' && filteredConnections.length === 0) ||
            (myActionsTypeFilter === 'custom_tool' && filteredTools.length === 0) ||
            (myActionsTypeFilter === 'all' && filteredConnections.length === 0 && filteredTools.length === 0) ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 px-5 py-16 text-center dark:border-gray-700">
              <Zap className="size-8 text-gray-300 dark:text-muted-foreground" />
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {actionsSearch ? 'No matching actions found' : 'No actions yet'}
              </div>
              <p className="max-w-xs text-xs text-gray-400 dark:text-muted-foreground">
                {actionsSearch ? 'Try a different search query or filter.' : 'Connect an app or create a custom action to get started.'}
              </p>
              {!actionsSearch && (
                <Button type="button" variant="primary" onClick={() => setMainTab('create-action')} disabled={!selectedId}>
                  Create action
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {myActionsTypeFilter !== 'custom_tool' &&
                filteredConnections.map((conn) => {
                  const tk = toolkits.find((t) => t.slug === conn.toolkit_slug);
                  return (
                    <div
                      key={conn.id}
                      onClick={() => {
                        if (conn.status === 'ACTIVE') {
                          navigate(`/admin-settings/captain/actions/toolkit/${conn.toolkit_slug}?assistantId=${selectedId}`);
                        }
                      }}
                      className={`flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80 transition-all shadow-xs hover:shadow-md ${conn.status === 'ACTIVE' ? 'cursor-pointer hover:border-blue-500/50 dark:hover:border-blue-500/50' : 'hover:border-amber-500/50 dark:hover:border-amber-500/50'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {conn.logo || tk?.logo ? (
                            <img src={conn.logo || tk?.logo || ''} alt={conn.toolkit_name} className="size-7 rounded-lg object-contain shadow-xs shrink-0" />
                          ) : (
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                              <Plug className="size-4" />
                            </div>
                          )}
                          <div className="truncate text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-500 transition-colors">
                            {conn.toolkit_name}
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-2xs ${conn.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                            : conn.status === 'RECONNECT_NEEDED'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50'
                              : 'bg-red-50 text-red-600 border border-red-200/60 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50'
                            }`}
                        >
                          <span className={`size-1.5 rounded-full ${conn.status === 'ACTIVE' ? 'bg-emerald-500' : conn.status === 'RECONNECT_NEEDED' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                          {conn.status === 'ACTIVE' ? 'Connected' : conn.status === 'RECONNECT_NEEDED' ? 'Reconnect needed' : conn.status}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-3">
                        {tk?.description || 'Connected integration for your assistant.'}
                      </p>

                      <div className="mt-auto pt-2 border-t border-gray-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                        {conn.status === 'ACTIVE' ? (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            className="flex-1 h-8 rounded-xl text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin-settings/captain/actions/toolkit/${conn.toolkit_slug}?assistantId=${selectedId}`);
                            }}
                          >
                            <Play className="size-3 fill-current" />
                            Open playground
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1 h-8 rounded-xl text-xs font-semibold gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              reconnectApp(conn);
                            }}
                            disabled={isConnecting === conn.toolkit_slug}
                          >
                            <RefreshCw className={`size-3 ${isConnecting === conn.toolkit_slug ? 'animate-spin' : ''}`} />
                            {isConnecting === conn.toolkit_slug ? 'Connecting...' : 'Reconnect'}
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            disconnectApp(conn);
                          }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-neutral-800 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="Disconnect app"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {myActionsTypeFilter !== 'app' &&
                filteredTools.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openEditTool(t)}
                    className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80 transition-all shadow-xs hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-500/50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                          {t.kind === 'composio' ? <Plug className="size-4" /> : t.kind === 'lead' ? <Users className="size-4" /> : t.kind === 'form' ? <ClipboardList className="size-4" /> : t.kind === 'button' ? <MousePointerClick className="size-4" /> : <Wrench className="size-4" />}
                        </div>
                        <div className="truncate text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-500 transition-colors" title={t.title}>
                          {t.title}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-2xs ${t.enabled !== false
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                          : 'bg-neutral-100 text-neutral-500 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
                          }`}
                      >
                        <span className={`size-1.5 rounded-full ${t.enabled !== false ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                        {t.enabled !== false ? 'Connected' : 'Disabled'}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-3">
                      {t.description || `${t.http_method} · ${t.endpoint_url || 'No endpoint'}`}
                    </p>

                    <div className="mt-auto pt-2 border-t border-gray-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="flex-1 h-8 rounded-xl text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTool(t);
                        }}
                      >
                        <Play className="size-3 fill-current" />
                        Open playground
                      </Button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(t);
                        }}
                        className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-neutral-800 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete action"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {mainTab === 'create-action' && isLoadingToolkits && (
        <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary dark:border-gray-700 dark:border-t-primary" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading apps...</p>
        </div>
      )}
      {mainTab === 'create-action' && !isLoadingToolkits && (
        <>
          {isSlotLimitReached && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
              You have reached the maximum limit of 25 toolkit slots. Please delete an action before connecting an app or creating a new action.
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                value={toolkitSearch}
                onChange={(e) => {
                  const q = e.target.value;
                  setToolkitSearch(q);
                  setCursorHistory(['']);
                  setPageIndex(0);
                  if (searchDebounce.current) clearTimeout(searchDebounce.current);
                  searchDebounce.current = setTimeout(() => searchToolkits(q, categoryFilter, ''), 300);
                }}
                placeholder="Search apps — Gmail, Slack, GitHub, Notion..."
                className="pl-9"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCursorHistory(['']);
                setPageIndex(0);
                searchToolkits(toolkitSearch, e.target.value, '');
              }}
              className={`${fieldClass} w-48`}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Browse apps to connect</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div
              onClick={() => {
                if (isSlotLimitReached) {
                  setError('Maximum limit of 25 toolkit slots reached. Please delete an action before creating a new one.');
                  return;
                }
                setPreviewAssistantId(selectedId || (assistants[0]?.id ? String(assistants[0].id) : ''));
                setPreviewModalKind('custom');
              }}
              className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80 transition-all hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Wrench className="size-4" />
                  </div>
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">Custom action</div>
                </div>
              </div>
              <p className="line-clamp-2 text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-3">
                Call any API, with your own auth and request/response templates.
              </p>
              <div className="mt-auto pt-2 border-t border-gray-100 dark:border-neutral-800/80">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 rounded-xl text-xs font-medium dark:border-neutral-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewAssistantId(selectedId || (assistants[0]?.id ? String(assistants[0].id) : ''));
                    setPreviewModalKind('custom');
                  }}
                >
                  Create
                </Button>
              </div>
            </div>

            <div
              onClick={() => {
                setPreviewAssistantId(selectedId || (assistants[0]?.id ? String(assistants[0].id) : ''));
                setPreviewModalKind('lead');
              }}
              className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80 transition-all hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Users className="size-4" />
                  </div>
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">Collect leads</div>
                </div>
              </div>
              <p className="line-clamp-2 text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-3">
                Capture visitor name, email, and phone directly in the chat.
              </p>
              <div className="mt-auto pt-2 border-t border-gray-100 dark:border-neutral-800/80">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 rounded-xl text-xs font-medium dark:border-neutral-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewAssistantId(selectedId || (assistants[0]?.id ? String(assistants[0].id) : ''));
                    setPreviewModalKind('lead');
                  }}
                >
                  Create
                </Button>
              </div>
            </div>

            <div
              onClick={() => {
                setPreviewAssistantId(selectedId || (assistants[0]?.id ? String(assistants[0].id) : ''));
                setPreviewModalKind('form');
              }}
              className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80 transition-all hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <ClipboardList className="size-4" />
                  </div>
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">Custom form</div>
                </div>
              </div>
              <p className="line-clamp-2 text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-3">
                Ask visitors any custom questions with a structured form.
              </p>
              <div className="mt-auto pt-2 border-t border-gray-100 dark:border-neutral-800/80">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 rounded-xl text-xs font-medium dark:border-neutral-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewAssistantId(selectedId || (assistants[0]?.id ? String(assistants[0].id) : ''));
                    setPreviewModalKind('form');
                  }}
                >
                  Create
                </Button>
              </div>
            </div>

            <div
              onClick={() => {
                setPreviewAssistantId(selectedId || (assistants[0]?.id ? String(assistants[0].id) : ''));
                setPreviewModalKind('button');
              }}
              className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80 transition-all hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <MousePointerClick className="size-4" />
                  </div>
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">Custom buttons</div>
                </div>
              </div>
              <p className="line-clamp-2 text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-3">
                Give visitors clickable options to open links or send messages.
              </p>
              <div className="mt-auto pt-2 border-t border-gray-100 dark:border-neutral-800/80">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 rounded-xl text-xs font-medium dark:border-neutral-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewAssistantId(selectedId || (assistants[0]?.id ? String(assistants[0].id) : ''));
                    setPreviewModalKind('button');
                  }}
                >
                  Create
                </Button>
              </div>
            </div>

            {isLoadingToolkits ? (
              <div className="col-span-full flex h-16 items-center justify-center gap-2">
                <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading apps...</span>
              </div>
            ) : (
              visibleToolkits.map((tk) => {
                const conn = connectionFor(tk.slug);
                const isNoAuth = tk.auth_schemes && tk.auth_schemes.length > 0 && tk.auth_schemes.every((s) => s === 'NO_AUTH');
                return (
                  <div
                    key={tk.slug}
                    onClick={() => {
                      if (conn?.status === 'ACTIVE') {
                        navigate(`/admin-settings/captain/actions/toolkit/${conn.toolkit_slug}?assistantId=${selectedId}`);
                      }
                    }}
                    className={`flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80 transition-all ${conn?.status === 'ACTIVE' ? 'cursor-pointer hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-md' : ''
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {tk.logo ? <img src={tk.logo} alt="" className="size-7 rounded-lg object-contain shadow-xs" /> : <Plug className="size-5 text-gray-400 dark:text-muted-foreground" />}
                        <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{tk.name}</div>
                      </div>
                      {conn && (
                        <span
                          className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-2xs ${conn.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                            : 'bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50'
                            }`}
                        >
                          <span className={`size-1.5 rounded-full ${conn.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          {conn.status === 'ACTIVE' ? 'Connected' : 'Reconnect needed'}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-gray-500 dark:text-neutral-400 leading-relaxed mb-3">{tk.description}</p>
                    <div className="mt-auto pt-2 border-t border-gray-100 dark:border-neutral-800/80">
                      {seedingApps.has(tk.slug) ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled
                          className="w-full h-8 rounded-xl text-xs font-semibold gap-1.5 bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50 cursor-not-allowed"
                        >
                          <RefreshCw className="size-3 animate-spin" />
                          Seeding tools...
                        </Button>
                      ) : conn ? (
                        conn.status === 'ACTIVE' ? (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            className="w-full h-8 rounded-xl text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin-settings/captain/actions/toolkit/${conn.toolkit_slug}?assistantId=${selectedId}`);
                            }}
                          >
                            <Play className="size-3 fill-current" />
                            Open playground
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full h-8 rounded-xl text-xs font-semibold gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
                            disabled={isConnecting === tk.slug}
                            onClick={(e) => {
                              e.stopPropagation();
                              reconnectApp(conn);
                            }}
                          >
                            <RefreshCw className={`size-3 ${isConnecting === tk.slug ? 'animate-spin' : ''}`} />
                            {isConnecting === tk.slug ? 'Connecting...' : 'Reconnect'}
                          </Button>
                        )
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full h-8 rounded-xl text-xs font-medium dark:border-neutral-700"
                          disabled={!selectedId || isConnecting === tk.slug}
                          onClick={() => connectToolkit(tk)}
                        >
                          {isConnecting === tk.slug ? 'Opening...' : isNoAuth ? 'Enable' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pb-2 pt-4 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-muted-foreground">
              Showing {toolkits.length} of {totalItems.toLocaleString()} apps
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pageIndex === 0 || isLoadingToolkits}
                onClick={handlePrevPage}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                Page {pageIndex + 1} of {totalPages || 1}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!nextCursor || pageIndex + 1 >= totalPages || isLoadingToolkits}
                onClick={handleNextPage}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!previewModalKind} onOpenChange={(open) => { if (!open) setPreviewModalKind(null); }}>
        <DialogContent className="max-w-4xl p-6 sm:p-10 bg-white dark:bg-[#16161e] border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-white rounded-3xl overflow-hidden shadow-2xl">
          <DialogTitle className="sr-only">{previewModalData?.title || 'Action Preview'}</DialogTitle>
          <DialogDescription className="sr-only">Preview of {previewModalData?.title}</DialogDescription>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-2">
            <div className="w-[310px] sm:w-[330px] rounded-2xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-[#0e0e13] overflow-hidden shadow-2xl flex flex-col shrink-0">
              <div className="h-12 px-3.5 bg-gray-100 dark:bg-[#141419] border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-gray-900 dark:bg-neutral-900 border border-gray-700 dark:border-neutral-700 flex items-center justify-center text-white">
                    <Bot className="size-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white tracking-wide">AI Agent</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 dark:text-muted-foreground">
                  <MoreHorizontal className="size-4" />
                </div>
              </div>

              <div className="bg-white dark:bg-card p-4 flex flex-col justify-between min-h-[380px] select-none">
                <div className="flex flex-col gap-3">
                  <div className="text-[12px] text-gray-800 dark:text-foreground font-normal leading-relaxed">
                    Hey, how can I help?
                  </div>

                  <div className="self-end max-w-[85%] rounded-2xl bg-gray-100 dark:bg-muted px-3 py-2 text-[11px] text-gray-800 dark:text-foreground shadow-2xs border border-gray-200/60 dark:border-border/60 leading-relaxed font-normal">
                    {previewModalData?.userMessage || 'Notify the sales team that the Acme deal closed'}
                  </div>

                  <div className="flex flex-col gap-1.5 max-w-[95%]">
                    <div className="text-[11px] text-gray-800 dark:text-foreground leading-relaxed font-normal">
                      {previewModalData?.assistantReply || "Done, I've posted to #sales-team on Slack: 'The Acme deal has just closed. Great work, team!' The message was delivered successfully."}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-muted-foreground pt-0.5">
                      <span>Just now</span>
                      <ThumbsUp className="size-3 text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-muted-foreground transition cursor-pointer" />
                      <ThumbsDown className="size-3 text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-muted-foreground transition cursor-pointer" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-full border border-gray-200 dark:border-border bg-white dark:bg-card px-3 py-1.5 flex items-center justify-between text-gray-400 dark:text-muted-foreground text-xs shadow-2xs">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Bot className="size-3.5 text-gray-400 dark:text-muted-foreground" />
                    <span>Ask a question...</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 dark:text-muted-foreground">
                    <Mic className="size-3.5" />
                    <Volume2 className="size-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-4 sm:px-8">
              <div className="size-14 rounded-2xl bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 shadow-inner">
                {previewModalData?.icon}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight mb-2">
                {previewModalData?.title}
              </h2>

              <p className="text-xs sm:text-sm text-gray-500 dark:text-muted-foreground max-w-sm mb-7 leading-relaxed">
                {previewModalData?.description}
              </p>

              <div className="w-full max-w-xs flex flex-col items-start gap-1.5 mb-7 text-left">
                <label className="text-xs font-medium text-gray-500 dark:text-muted-foreground">Set up for assistant</label>
                <div className="relative w-full">
                  <select
                    value={previewAssistantId}
                    onChange={(e) => setPreviewAssistantId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e24] pl-9 pr-8 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 dark:focus:border-neutral-700 cursor-pointer"
                  >
                    {assistants.map((ast) => (
                      <option key={ast.id} value={String(ast.id)} className="bg-white dark:bg-[#1e1e24] text-gray-900 dark:text-white">
                        {ast.name || `Assistant #${ast.id}`}
                      </option>
                    ))}
                  </select>
                  <Bot className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-muted-foreground pointer-events-none" />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartCustomizing}
                className="rounded-full bg-black text-white px-8 py-2.5 text-xs font-semibold border border-gray-700 dark:border-neutral-700 hover:bg-gray-900 dark:hover:bg-neutral-900 transition-all cursor-pointer shadow-lg active:scale-98"
              >
                Start customizing
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      <Dialog open={!!disconnectTarget} onOpenChange={(open) => { if (!open && !isDisconnecting) setDisconnectTarget(null); }}>
        <DialogContent showCloseButton={false} className="max-w-sm rounded-2xl p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
          <DialogHeader className="text-left gap-1.5">
            <DialogTitle className="text-base font-bold text-gray-950 dark:text-white">
              Disconnect {disconnectTarget?.toolkit_name}?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Any of its enabled actions will stop working. You can reconnect it anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex-row justify-end gap-2.5 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isDisconnecting}
              onClick={() => setDisconnectTarget(null)}
              className="h-9 px-4 rounded-xl text-xs font-medium border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDisconnecting}
              onClick={confirmDisconnect}
              className="h-9 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-xs"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete custom action confirmation modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false} className="max-w-sm rounded-2xl p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
          <DialogHeader className="text-left gap-1.5">
            <DialogTitle className="text-base font-bold text-gray-950 dark:text-white">
              Delete {deleteTarget?.title || 'this action'}?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              The assistant will no longer be able to call this action. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex-row justify-end gap-2.5 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="h-9 px-4 rounded-xl text-xs font-medium border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="h-9 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-xs cursor-pointer"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-connection success modal (Floatchat 2-column style) */}
      <Dialog open={!!connectedToolkit} onOpenChange={(open) => { if (!open) setConnectedToolkit(null); }}>
        <DialogContent showCloseButton={true} className="max-w-3xl rounded-3xl p-6 sm:p-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left Column: AI Agent preview card mockup */}
            <div className="hidden md:flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 shadow-inner h-[400px]">
              {/* Card top bar */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-blue-600/20 text-blue-500 dark:text-blue-400">
                    <Bot className="size-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">AI Agent</span>
                </div>
                <MoreHorizontal className="size-4 text-gray-400 dark:text-gray-500" />
              </div>

              {/* Chat messages mockup */}
              <div className="flex flex-col gap-3 py-2 text-xs overflow-hidden">
                <div className="self-start text-gray-600 dark:text-gray-300">
                  Hey, how can I help?
                </div>
                <div className="self-end rounded-xl bg-gray-200 dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[85%]">
                  Notify the sales team that the Acme deal closed
                </div>
                <div className="flex flex-col gap-1.5 self-start">
                  <div className="rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[95%] shadow-2xs">
                    Done, I've posted to #sales-team on Slack: &quot;The Acme deal has just closed. Great work, team!&quot; The message was delivered successfully.
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 pl-1">
                    <span>Just now</span>
                    <ThumbsUp className="size-3 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300" />
                    <ThumbsDown className="size-3 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300" />
                  </div>
                </div>
              </div>

              {/* Mock input bar */}
              <div className="flex items-center justify-between rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-gray-400 dark:text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Paperclip className="size-3.5 text-gray-400 dark:text-muted-foreground" />
                  <span className="text-gray-400 dark:text-muted-foreground text-[11px]">Ask a question...</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 dark:text-muted-foreground">
                  <Mic className="size-3.5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200" />
                  <Volume2 className="size-3.5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200" />
                </div>
              </div>
            </div>

            {/* Right Column: Toolkit details & action */}
            <div className="flex flex-col items-center text-center justify-center">
              {connectedToolkit?.logo ? (
                <img src={connectedToolkit.logo} alt="" className="size-16 rounded-2xl object-contain shadow-md" />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500">
                  <Plug className="size-8" />
                </div>
              )}

              <h2 className="mt-4 text-2xl font-bold text-gray-950 dark:text-white tracking-tight">{connectedToolkit?.name}</h2>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400 max-w-sm">
                {connectedToolkit?.description}
              </p>

              <div className="mt-6 w-full text-left">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <Bot className="size-3.5 text-gray-400 dark:text-muted-foreground" />
                  Set up for assistant
                </label>
                <div className="relative">
                  <select
                    value={selectedId}
                    onChange={(e) => selectAssistant(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 pl-3 pr-8 text-sm text-gray-900 dark:text-gray-100 shadow-inner outline-none transition-all focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {assistants.map((a) => (
                      <option key={a.id} value={a.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                type="button"
                className="mt-5 w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                onClick={() => {
                  const slug = connectedToolkit?.slug;
                  setConnectedToolkit(null);
                  if (slug) navigate(`/admin-settings/captain/actions/toolkit/${slug}?assistantId=${selectedId}`);
                }}
              >
                <Play className="size-3.5 fill-current" />
                Open playground
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default CaptainActions;
