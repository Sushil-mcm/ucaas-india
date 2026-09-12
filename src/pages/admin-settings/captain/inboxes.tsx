import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare, Settings2, MessagesSquare, Search, Plus, Globe, Trash2, ChevronDown,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleAlert } from '@/lib/utils';
import { DeleteConfirmDialog } from '@/components/captain/DeleteConfirmDialog';
import { useSelectedAssistant } from './assistant-switcher';
import InboxDetail, { InboxSummary } from './inbox-detail';
import AddInboxWizard from './add-inbox-wizard';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';


type ChannelToggle = { channel_type: string; enabled: boolean };

const CaptainInboxes = () => {
  const { assistants, selectedId } = useSelectedAssistant();
  const [, setToggles] = useState<Record<string, boolean>>({});
  const [, setIsLoading] = useState(true);
  const [, setSavingChannel] = useState<string | null>(null);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { inboxId: activeInboxId } = useParams<{ inboxId?: string; tab?: string }>();
  const goToInboxList = () => navigate('/admin-settings/captain/inboxes');
  const goToInbox = (id: string) => navigate(`/admin-settings/captain/inboxes/${id}`);

  const [inboxes, setInboxes] = useState<InboxSummary[]>([]);
  const [isLoadingInboxes, setIsLoadingInboxes] = useState(true);
  const [isAddInboxOpen, setIsAddInboxOpen] = useState(false);
  const [inboxSearch, setInboxSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [inboxToDelete, setInboxToDelete] = useState<string | null>(null);

  const fetchInboxes = async () => {
    setIsLoadingInboxes(true);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inboxes`);
      if (!res.ok) {
        // Non-OK likely means no inboxes exist yet — treat as empty
        setInboxes([]);
        return;
      }
      const json = await res.json();
      setInboxes(json?.data || []);
      setError('');
    } catch {
      setInboxes([]);
    } finally {
      setIsLoadingInboxes(false);
    }
  };

  useEffect(() => {
    fetchInboxes();
  }, []);

  const confirmDelete = (id: string) => setInboxToDelete(id);

  const deleteInbox = async () => {
    if (!inboxToDelete) return;
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inboxes/${inboxToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setInboxes((prev) => prev.filter((i) => i.id !== inboxToDelete));
      handleAlert({ text: 'Inbox deleted', type: 'success' });
    } catch {
      handleAlert({ text: 'Could not delete the inbox', type: 'error' });
    } finally {
      setInboxToDelete(null);
    }
  };

  const toggleInboxEnabled = async (id: string, next: boolean) => {
    setInboxes((prev) => prev.map((i) => (i.id === id ? { ...i, enabled: next } : i)));
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inboxes/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      handleAlert({ text: next ? 'Inbox enabled' : 'Inbox disabled', type: 'success' });
    } catch {
      setInboxes((prev) => prev.map((i) => (i.id === id ? { ...i, enabled: !next } : i)));
      handleAlert({ text: 'Could not update the inbox', type: 'error' });
    }
  };

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

  const fetchToggles = async (assistantId: string) => {
    if (!assistantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inbox-channels?assistant_id=${assistantId}`);
      if (!res.ok) {
        // Non-OK likely means no channels exist yet — treat as empty, not an error
        setToggles({});
        return;
      }
      const json = await res.json();
      const map: Record<string, boolean> = {};
      (json.data as ChannelToggle[]).forEach((c) => {
        map[c.channel_type] = c.enabled;
      });
      setToggles(map);
    } catch {
      // Only real network failures reach here — silently default to empty
      setToggles({});
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
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inbox-channels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant_id: targetId, channel_type: channelType, enabled: next }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to update channel');
      handleAlert({ text: next ? 'Channel enabled' : 'Channel disabled', type: 'success' });
    } catch (err: any) {
      setToggles((prev) => ({ ...prev, [channelType]: !next }));
      setError(err?.message || 'Failed to update channel');
      handleAlert({ text: err?.message || 'Failed to update channel', type: 'error' });
    } finally {
      setSavingChannel(null);
    }
  };

  const CHANNEL_GROUP_META: Record<string, { label: string; icon: any }> = {
    website: { label: 'Website', icon: MessageSquare },
  };

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
        <h2 className="text-lg font-bold text-gray-950 dark:text-foreground">Inboxes</h2>
        <p className="text-sm text-gray-500 dark:text-muted-foreground">
          A channel is the mode of communication your customer chooses to interact with you. An inbox is where you
          manage interactions for a specific channel — create as many as you need, independent of one another.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
          <Input type="text" value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)} placeholder="Search inboxes..." className="pl-9" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-muted-foreground">{inboxes.length} inbox{inboxes.length === 1 ? '' : 'es'}</span>
          <Button type="button" variant="primary" size="sm" onClick={() => setIsAddInboxOpen(true)}>
            <Plus className="size-3.5" />
            Add Inbox
          </Button>
        </div>
      </div>

      {isLoadingInboxes ? (
        <div className="flex h-20 items-center justify-center text-sm text-gray-500 dark:text-muted-foreground">Loading...</div>
      ) : inboxes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-6 text-center text-sm text-gray-400 dark:text-muted-foreground dark:border-gray-700">
          No inboxes yet — click "Add Inbox" to create your first one.
        </div>
      ) : Object.keys(groupedInboxes).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-6 text-center text-sm text-gray-400 dark:text-muted-foreground dark:border-gray-700">
          No inboxes match "{inboxSearch}".
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
          {Object.entries(groupedInboxes).map(([channelType, rows]) => {
            const meta = CHANNEL_GROUP_META[channelType] || { label: channelType, icon: Globe };
            const GroupIcon = meta.icon;
            const isCollapsed = collapsedGroups[channelType];
            return (
              <div key={channelType} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setCollapsedGroups((prev) => ({ ...prev, [channelType]: !prev[channelType] }))}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    <GroupIcon className="size-4 text-gray-400 dark:text-muted-foreground" />
                    {meta.label}
                    <span className="font-normal text-gray-400 dark:text-muted-foreground">{rows.length} inbox{rows.length === 1 ? '' : 'es'}</span>
                  </span>
                  <ChevronDown className={`size-4 text-gray-400 dark:text-muted-foreground transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isCollapsed && (
                  <div className="flex flex-col divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700 dark:border-gray-700">
                    {rows.map((inbox) => {
                      const isLegacy = !!inbox.legacy_assistant_id;
                      return (
                        <div key={inbox.id} className="flex items-center justify-between gap-4 px-5 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                              <MessageSquare className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-gray-900 dark:text-foreground">{inbox.name}</div>
                              <div className="truncate text-xs text-primary">
                                {meta.label}{inbox.website_domain ? ` · ${inbox.website_domain}` : ''}{inbox.assistant_name ? ` · AI: ${inbox.assistant_name}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              title="Conversations"
                              onClick={() => navigate(`/admin-settings/captain/inboxes/${inbox.id}/conversations`)}
                              className="flex size-8 items-center justify-center rounded-lg border border-gray-200 dark:border-border text-gray-500 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted"
                            >
                              <MessagesSquare className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Configure"
                              onClick={() => goToInbox(inbox.id)}
                              className="flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                            >
                              <Settings2 className="size-3.5" />
                            </button>
                            {!isLegacy && (
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => confirmDelete(inbox.id)}
                                className="flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-300 dark:text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:text-red-500 dark:border-gray-600 dark:hover:bg-red-900/30"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                            <div className="ml-1 flex items-center border-l border-gray-100 pl-2.5 dark:border-gray-700">
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
        onClose={() => {
          setIsAddInboxOpen(false);
          fetchInboxes();
        }}
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

      <DeleteConfirmDialog
        open={!!inboxToDelete}
        onOpenChange={(open) => !open && setInboxToDelete(null)}
        itemLabel="inbox"
        description="Are you sure you want to delete this website inbox? Its embed script will stop working immediately."
        onConfirm={deleteInbox}
      />
    </div>
  );
};

export default CaptainInboxes;
