import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare, Settings2, MessagesSquare, Send,
  User, Bot, UserCheck, Search, Plus, Globe, Trash2, ChevronDown,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@/hooks/use-user';
import { useSelectedAssistant } from './assistant-switcher';
import InboxDetail, { InboxSummary } from './inbox-detail';
import AddInboxWizard from './add-inbox-wizard';

const CAPTAIN_API_BASE = '/captain-api/api/captain';

type ChannelToggle = { channel_type: string; enabled: boolean };
type Conversation = {
  id: string;
  visitor_name: string | null;
  page_url: string | null;
  owner: 'ai' | 'human' | null;
  last_message: string | null;
  last_message_at: string | null;
};
type WidgetMessage = { id: string; role: 'visitor' | 'assistant' | 'agent'; content: string; created_at: string };

const CaptainInboxes = () => {
  const { user } = useUser();
  const { assistants, selectedId, selectAssistant } = useSelectedAssistant();
  const [, setToggles] = useState<Record<string, boolean>>({});
  const [, setIsLoading] = useState(true);
  const [, setSavingChannel] = useState<string | null>(null);
  const [error, setError] = useState('');

  // The open inbox (and which of its tabs is active) lives in the URL, not
  // local state — so refreshing, sharing a link, or using browser back/forward
  // all land you back on the exact same screen. Required for a production
  // deployment serving many customers, not just a single admin's live session.
  const navigate = useNavigate();
  const { inboxId: activeInboxId } = useParams<{ inboxId?: string; tab?: string }>();
  const goToInboxList = () => navigate('/admin-settings/captain/inboxes');
  const goToInbox = (id: string) => navigate(`/admin-settings/captain/inboxes/${id}`);

  // Real multi-inbox model — any number of independent website chatbots,
  // decoupled from any single assistant, same shape as floatchat's real
  // Inbox entity. Lives alongside the legacy single-widget-per-assistant flow
  // below untouched, so the widget already embedded on a live site keeps working.
  const [inboxes, setInboxes] = useState<InboxSummary[]>([]);
  const [isLoadingInboxes, setIsLoadingInboxes] = useState(true);
  const [isAddInboxOpen, setIsAddInboxOpen] = useState(false);
  const [conversationsInboxId, setConversationsInboxId] = useState<string | null>(null);
  const [inboxSearch, setInboxSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const fetchInboxes = async () => {
    setIsLoadingInboxes(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/inboxes`);
      const json = await res.json();
      setInboxes(json?.data || []);
    } catch {
      setInboxes([]);
    } finally {
      setIsLoadingInboxes(false);
    }
  };

  useEffect(() => {
    fetchInboxes();
  }, []);

  const deleteInbox = async (id: string) => {
    if (!window.confirm('Delete this website inbox? Its embed script will stop working immediately.')) return;
    try {
      await fetch(`${CAPTAIN_API_BASE}/inboxes/${id}`, { method: 'DELETE' });
      setInboxes((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // non-critical
    }
  };

  const toggleInboxEnabled = async (id: string, next: boolean) => {
    setInboxes((prev) => prev.map((i) => (i.id === id ? { ...i, enabled: next } : i)));
    try {
      await fetch(`${CAPTAIN_API_BASE}/inboxes/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
    } catch {
      setInboxes((prev) => prev.map((i) => (i.id === id ? { ...i, enabled: !next } : i)));
    }
  };

  // A legacy row (the one pre-existing widget embedded via data-assistant-id,
  // migrated into this list purely for display/management) routes its
  // actions to the original per-assistant config path instead of the new
  // per-inbox one, so the already-live embed script is never at risk of
  // drifting out of sync with what's shown here.
  const handleLegacyToggle = (row: InboxSummary, next: boolean) => {
    setInboxes((prev) => prev.map((i) => (i.id === row.id ? { ...i, enabled: next } : i)));
    handleToggle('website', next, row.legacy_assistant_id || undefined);
  };

  const groupedInboxes = useMemo(() => {
    const q = inboxSearch.trim().toLowerCase();
    const filtered = inboxes.filter((i) => !q || i.name.toLowerCase().includes(q) || (i.website_domain || '').toLowerCase().includes(q));
    const groups: Record<string, InboxSummary[]> = {};
    filtered.forEach((i) => {
      const key = i.channel_type || 'website';
      groups[key] = groups[key] || [];
      groups[key].push(i);
    });
    return groups;
  }, [inboxes, inboxSearch]);

  // Inbox-scoped conversation viewer for the new multi-inbox model — separate
  // state from the legacy per-assistant conversations dialog below it, but
  // reuses the same generic session-keyed message/reply/hand-back endpoints.
  const [inboxConversations, setInboxConversations] = useState<Conversation[]>([]);
  const [activeInboxConversationId, setActiveInboxConversationId] = useState<string | null>(null);
  const [inboxThread, setInboxThread] = useState<WidgetMessage[]>([]);
  const [inboxReplyText, setInboxReplyText] = useState('');
  const [isInboxReplying, setIsInboxReplying] = useState(false);

  const openInboxConversations = async (id: string) => {
    setConversationsInboxId(id);
    setActiveInboxConversationId(null);
    setInboxThread([]);
    try {
      const params = new URLSearchParams();
      if (user?.uuid) params.set('agent_user_id', user.uuid);
      const res = await fetch(`${CAPTAIN_API_BASE}/inboxes/${id}/conversations?${params.toString()}`);
      const json = await res.json();
      setInboxConversations(json.data || []);
    } catch {
      setInboxConversations([]);
    }
  };

  const openInboxThread = async (id: string) => {
    setActiveInboxConversationId(id);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${id}/messages`);
      const json = await res.json();
      setInboxThread(json.data || []);
    } catch {
      setInboxThread([]);
    }
  };

  const handleInboxReply = async () => {
    if (!activeInboxConversationId || !inboxReplyText.trim()) return;
    setIsInboxReplying(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${activeInboxConversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inboxReplyText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to send reply');
      setInboxThread((prev) => [...prev, { id: json.data.id, role: 'agent', content: inboxReplyText.trim(), created_at: new Date().toISOString() }]);
      setInboxReplyText('');
      setInboxConversations((prev) => prev.map((c) => (c.id === activeInboxConversationId ? { ...c, owner: 'human' } : c)));
    } catch (err: any) {
      setError(err?.message || 'Failed to send reply');
    } finally {
      setIsInboxReplying(false);
    }
  };

  const handInboxBackToAi = async () => {
    if (!activeInboxConversationId) return;
    try {
      await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${activeInboxConversationId}/hand-back-to-ai`, { method: 'POST' });
      setInboxConversations((prev) => prev.map((c) => (c.id === activeInboxConversationId ? { ...c, owner: 'ai' } : c)));
    } catch {
      // non-critical
    }
  };

  const activeInboxConversation = inboxConversations.find((c) => c.id === activeInboxConversationId) || null;

  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [thread, setThread] = useState<WidgetMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const fetchToggles = async (assistantId: string) => {
    if (!assistantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/inbox-channels?assistant_id=${assistantId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load channels');
      const map: Record<string, boolean> = {};
      (json.data as ChannelToggle[]).forEach((c) => {
        map[c.channel_type] = c.enabled;
      });
      setToggles(map);
    } catch (err: any) {
      setError(err?.message || 'Failed to load channels');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) fetchToggles(selectedId);
  }, [selectedId]);

  const handleToggle = async (channelType: string, next: boolean, assistantIdOverride?: string) => {
    const targetId = assistantIdOverride || selectedId;
    if (!targetId) return;
    setSavingChannel(channelType);
    setToggles((prev) => ({ ...prev, [channelType]: next }));
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/inbox-channels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant_id: targetId, channel_type: channelType, enabled: next }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to update channel');
    } catch (err: any) {
      setToggles((prev) => ({ ...prev, [channelType]: !next }));
      setError(err?.message || 'Failed to update channel');
    } finally {
      setSavingChannel(null);
    }
  };

  const openConversations = async (assistantIdOverride?: string) => {
    const targetId = assistantIdOverride || selectedId;
    setIsConversationsOpen(true);
    setActiveConversationId(null);
    setThread([]);
    if (!targetId) return;
    if (assistantIdOverride && assistantIdOverride !== selectedId) selectAssistant(assistantIdOverride);
    try {
      const params = new URLSearchParams({ assistant_id: targetId });
      if (user?.uuid) params.set('agent_user_id', user.uuid);
      const res = await fetch(`${CAPTAIN_API_BASE}/widget-conversations?${params.toString()}`);
      const json = await res.json();
      setConversations(json.data || []);
    } catch {
      setConversations([]);
    }
  };

  const openThread = async (id: string) => {
    setActiveConversationId(id);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${id}/messages`);
      const json = await res.json();
      setThread(json.data || []);
    } catch {
      setThread([]);
    }
  };

  const handleReply = async () => {
    if (!activeConversationId || !replyText.trim()) return;
    setIsReplying(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${activeConversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to send reply');
      setThread((prev) => [...prev, { id: json.data.id, role: 'agent', content: replyText.trim(), created_at: new Date().toISOString() }]);
      setReplyText('');
      setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? { ...c, owner: 'human' } : c)));
    } catch (err: any) {
      setError(err?.message || 'Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const handHandBackToAi = async () => {
    if (!activeConversationId) return;
    try {
      await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${activeConversationId}/hand-back-to-ai`, { method: 'POST' });
      setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? { ...c, owner: 'ai' } : c)));
    } catch {
      // non-critical
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  const CHANNEL_GROUP_META: Record<string, { label: string; icon: any }> = {
    website: { label: 'Website', icon: MessageSquare },
  };

  // Placed after every hook in this component (never before) — React requires
  // the same hooks to run in the same order on every render, and an early
  // return above any hook declaration violates that the moment this branch
  // becomes true, which is exactly what made "Configure" crash to the app's
  // generic error page instead of opening the settings view.
  if (activeInboxId) {
    return (
      <InboxDetail
        inboxId={activeInboxId}
        assistants={assistants}
        onBack={() => {
          goToInboxList();
          fetchInboxes();
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 p-6">
      <div>
        <h2 className="text-lg font-bold text-[#2E2D35]">Inboxes</h2>
        <p className="text-sm text-[#9A948F]">
          A channel is the mode of communication your customer chooses to interact with you. An inbox is where you
          manage interactions for a specific channel — create as many as you need, independent of one another.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9A948F]" />
          <Input type="text" value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)} placeholder="Search inboxes..." className="pl-9" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#9A948F]">{inboxes.length} inbox{inboxes.length === 1 ? '' : 'es'}</span>
          <Button type="button" variant="primary" size="sm" onClick={() => setIsAddInboxOpen(true)}>
            <Plus className="size-3.5" />
            Add Inbox
          </Button>
        </div>
      </div>

      {isLoadingInboxes ? (
        <div className="flex h-20 items-center justify-center text-sm text-[#9A948F]">Loading...</div>
      ) : inboxes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EEE7DD] px-5 py-6 text-center text-sm text-[#9A948F]">
          No inboxes yet — click "Add Inbox" to create your first one.
        </div>
      ) : Object.keys(groupedInboxes).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EEE7DD] px-5 py-6 text-center text-sm text-[#9A948F]">
          No inboxes match "{inboxSearch}".
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
          {Object.entries(groupedInboxes).map(([channelType, rows]) => {
            const meta = CHANNEL_GROUP_META[channelType] || { label: channelType, icon: Globe };
            const GroupIcon = meta.icon;
            const isCollapsed = collapsedGroups[channelType];
            return (
              <div key={channelType} className="rounded-2xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
                <button
                  type="button"
                  onClick={() => setCollapsedGroups((prev) => ({ ...prev, [channelType]: !prev[channelType] }))}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#2E2D35]">
                    <GroupIcon className="size-4 text-[#9A948F]" />
                    {meta.label}
                    <span className="font-normal text-[#9A948F]">{rows.length} inbox{rows.length === 1 ? '' : 'es'}</span>
                  </span>
                  <ChevronDown className={`size-4 text-[#9A948F] transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isCollapsed && (
                  <div className="flex flex-col divide-y divide-gray-100 border-t border-gray-100">
                    {rows.map((inbox) => {
                      const isLegacy = !!inbox.legacy_assistant_id;
                      return (
                        <div key={inbox.id} className="flex items-center justify-between gap-4 px-5 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FBE2C8]/40 text-[#9A948F]">
                              <MessageSquare className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-[#2E2D35]">{inbox.name}</div>
                              <div className="truncate text-xs text-primary">
                                {meta.label}{inbox.website_domain ? ` · ${inbox.website_domain}` : ''}{inbox.assistant_name ? ` · AI: ${inbox.assistant_name}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              title="Conversations"
                              onClick={() => (isLegacy ? openConversations(inbox.legacy_assistant_id || undefined) : openInboxConversations(inbox.id))}
                              className="flex size-8 items-center justify-center rounded-lg border border-[#EEE7DD] text-[#9A948F] hover:bg-[#FBE2C8]/45"
                            >
                              <MessagesSquare className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Configure"
                              onClick={() => goToInbox(inbox.id)}
                              className="flex size-8 items-center justify-center rounded-lg border border-[#EEE7DD] text-[#9A948F] hover:bg-[#FBE2C8]/45"
                            >
                              <Settings2 className="size-3.5" />
                            </button>
                            {!isLegacy && (
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => deleteInbox(inbox.id)}
                                className="flex size-8 items-center justify-center rounded-lg border border-[#EEE7DD] text-gray-300 hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                            <div className="ml-1 flex items-center border-l border-gray-100 pl-2.5">
                              <Switch
                                checked={inbox.enabled}
                                onCheckedChange={(c) => (isLegacy ? handleLegacyToggle(inbox, c === true) : toggleInboxEnabled(inbox.id, c === true))}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddInboxWizard
        open={isAddInboxOpen}
        onClose={() => setIsAddInboxOpen(false)}
        assistants={assistants}
        onDone={() => {
          setIsAddInboxOpen(false);
          fetchInboxes();
        }}
        onOpenSettings={(inboxId) => {
          setIsAddInboxOpen(false);
          fetchInboxes();
          goToInbox(inboxId);
        }}
      />

      {/* Conversation viewer + human takeover for the new multi-inbox model */}
      <Dialog open={!!conversationsInboxId} onOpenChange={(v) => !v && setConversationsInboxId(null)}>
        <DialogContent className="grid h-[80vh] w-full max-w-3xl grid-cols-[220px_1fr] gap-0 overflow-hidden rounded-2xl p-0">
          <div className="flex flex-col overflow-y-auto border-r border-gray-100">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-[#2E2D35]">Conversations</div>
            {inboxConversations.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-[#9A948F]">
                No conversations yet, or none assigned to you in this inbox.
              </div>
            ) : (
              inboxConversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openInboxThread(c.id)}
                  className={`flex flex-col gap-0.5 border-b border-gray-50 px-4 py-3 text-left hover:bg-[#FBE2C8]/45 ${
                    activeInboxConversationId === c.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#2E2D35]">
                    {c.owner === 'human' ? <UserCheck className="size-3 text-amber-600" /> : <Bot className="size-3 text-primary" />}
                    {c.visitor_name || 'Visitor'}
                  </div>
                  <div className="line-clamp-1 text-xs text-[#9A948F]">{c.last_message}</div>
                </button>
              ))
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <DialogTitle className="text-sm font-semibold text-[#2E2D35]">
                {activeInboxConversation ? (activeInboxConversation.visitor_name || 'Visitor') : 'Select a conversation'}
              </DialogTitle>
              {activeInboxConversation?.owner === 'human' && (
                <Button type="button" variant="outline" size="sm" onClick={handInboxBackToAi}>
                  Hand back to AI
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#FBE2C8]/50 p-4">
              {inboxThread.map((m) => (
                <div key={m.id} className={`flex items-end gap-2 ${m.role === 'visitor' ? 'justify-start' : 'justify-end'}`}>
                  {m.role === 'visitor' && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F0DFC5] text-[#9A948F]">
                      <User className="size-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'visitor'
                        ? 'rounded-bl-sm border border-gray-100 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] text-[#2E2D35]'
                        : m.role === 'agent'
                          ? 'rounded-br-sm bg-amber-500 text-white'
                          : 'rounded-br-sm bg-primary text-white'
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role !== 'visitor' && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {m.role === 'agent' ? <UserCheck className="size-3.5" /> : <Bot className="size-3.5" />}
                    </div>
                  )}
                </div>
              ))}
              {activeInboxConversationId && !inboxThread.length && (
                <div className="pt-10 text-center text-xs text-[#9A948F]">No messages yet.</div>
              )}
            </div>

            {activeInboxConversationId && (
              <div className="flex gap-2 border-t border-gray-100 p-3">
                <Input
                  type="text"
                  value={inboxReplyText}
                  onChange={(e) => setInboxReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInboxReply()}
                  placeholder="Reply as a human agent..."
                  className="flex-1"
                />
                <Button type="button" variant="primary" onClick={handleInboxReply} disabled={isInboxReplying || !inboxReplyText.trim()}>
                  <Send className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Widget conversations viewer + human takeover */}
      <Dialog open={isConversationsOpen} onOpenChange={setIsConversationsOpen}>
        <DialogContent className="grid h-[80vh] w-full max-w-3xl grid-cols-[220px_1fr] gap-0 overflow-hidden rounded-2xl p-0">
          <div className="flex flex-col overflow-y-auto border-r border-gray-100">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-[#2E2D35]">Conversations</div>
            {conversations.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-[#9A948F]">
                No conversations yet, or none assigned to you in this inbox.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openThread(c.id)}
                  className={`flex flex-col gap-0.5 border-b border-gray-50 px-4 py-3 text-left hover:bg-[#FBE2C8]/45 ${
                    activeConversationId === c.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#2E2D35]">
                    {c.owner === 'human' ? <UserCheck className="size-3 text-amber-600" /> : <Bot className="size-3 text-primary" />}
                    {c.visitor_name || 'Visitor'}
                  </div>
                  <div className="line-clamp-1 text-xs text-[#9A948F]">{c.last_message}</div>
                </button>
              ))
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <DialogTitle className="text-sm font-semibold text-[#2E2D35]">
                {activeConversation ? (activeConversation.visitor_name || 'Visitor') : 'Select a conversation'}
              </DialogTitle>
              {activeConversation?.owner === 'human' && (
                <Button type="button" variant="outline" size="sm" onClick={handHandBackToAi}>
                  Hand back to AI
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#FBE2C8]/50 p-4">
              {thread.map((m) => (
                <div key={m.id} className={`flex items-end gap-2 ${m.role === 'visitor' ? 'justify-start' : 'justify-end'}`}>
                  {m.role === 'visitor' && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F0DFC5] text-[#9A948F]">
                      <User className="size-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'visitor'
                        ? 'rounded-bl-sm border border-gray-100 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] text-[#2E2D35]'
                        : m.role === 'agent'
                          ? 'rounded-br-sm bg-amber-500 text-white'
                          : 'rounded-br-sm bg-primary text-white'
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role !== 'visitor' && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {m.role === 'agent' ? <UserCheck className="size-3.5" /> : <Bot className="size-3.5" />}
                    </div>
                  )}
                </div>
              ))}
              {activeConversationId && !thread.length && (
                <div className="pt-10 text-center text-xs text-[#9A948F]">No messages yet.</div>
              )}
            </div>

            {activeConversationId && (
              <div className="flex gap-2 border-t border-gray-100 p-3">
                <Input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                  placeholder="Reply as a human agent..."
                  className="flex-1"
                />
                <Button type="button" variant="primary" onClick={handleReply} disabled={isReplying || !replyText.trim()}>
                  <Send className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaptainInboxes;
