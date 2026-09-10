import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, PanelRight } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import ConversationList from './conversation-list';
import ConversationThread from './conversation-thread';
import ConversationComposer from './conversation-composer';
import ConversationInfoPanel from './conversation-info-panel';
import { ConfirmDialog, TranscriptDialog, ConfirmOptions } from './conversation-dialogs';
import {
  Conversation, ThreadMessage, InboxOption, ListMeta, Agent, Priority,
  AssigneeTab, StatusFilter, SortOrder, agentName,
} from './conversation-helpers';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';

const POLL_MS = 8000;
const EMPTY_META: ListMeta = { all: 0, mine: 0, unassigned: 0 };

type Props = {
  activeConversationId: string | null;
  onOpenConversation: (id: string) => void;
} & (
  | { scope: 'all' }
  | { scope: 'inbox'; inboxId: string; onBack: () => void }
);

const ConversationsView = (props: Props) => {
  const { user } = useUser();
  const { activeConversationId, onOpenConversation } = props;
  const isAllScope = props.scope === 'all';
  const scopeInboxId = props.scope === 'inbox' ? props.inboxId : null;

  const [inboxOptions, setInboxOptions] = useState<InboxOption[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inboxFilter, setInboxFilter] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [meta, setMeta] = useState<ListMeta>(EMPTY_META);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [assigneeTab, setAssigneeTab] = useState<AssigneeTab>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [search, setSearch] = useState('');
  const [listCollapsed, setListCollapsed] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const actor = useMemo(() => agentName(user), [user]);
  const listUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (user?.uuid) p.set('agent_user_id', user.uuid);
    p.set('assignee', assigneeTab);
    if (scopeInboxId) return `${CAPTAIN_API_BASE}/inboxes/${scopeInboxId}/conversations?${p}`;
    if (inboxFilter) p.set('inbox_id', inboxFilter);
    return `${CAPTAIN_API_BASE}/conversations?${p}`;
  }, [scopeInboxId, inboxFilter, assigneeTab, user?.uuid]);

  const fetchList = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setIsLoading(true);
      try {
        const res = await captainFetch(listUrl());
        const json = await res.json();
        setConversations(json.data || []);
        setMeta({ ...EMPTY_META, ...(json.meta || {}) });
      } catch {
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    },
    [listUrl],
  );

  const fetchThread = useCallback(async () => {
    if (!activeConversationId) {
      setThread([]);
      return;
    }
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/widget-conversations/${activeConversationId}/messages`);
      const json = await res.json();
      setThread((prev) => {
        const server: ThreadMessage[] = json.data || [];
        // keep optimistic (pending) messages the server hasn't echoed yet
        const serverIds = new Set(server.map((m) => m.id));
        const pending = prev.filter((m) => m.pending && !serverIds.has(m.id));
        return [...server, ...pending];
      });
    } catch {
      /* keep last thread on transient error */
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!isAllScope) return;
    captainFetch(`${CAPTAIN_API_BASE}/inboxes`)
      .then((r) => r.json())
      .then((j) => setInboxOptions((j.data || []).map((i: any) => ({ id: String(i.id), name: i.name }))))
      .catch(() => setInboxOptions([]));
  }, [isAllScope]);

  useEffect(() => {
    const url = scopeInboxId ? `${CAPTAIN_API_BASE}/agents?inbox_id=${scopeInboxId}` : `${CAPTAIN_API_BASE}/agents`;
    captainFetch(url)
      .then((r) => r.json())
      .then((j) => setAgents(j.data || []))
      .catch(() => setAgents([]));
  }, [scopeInboxId]);

  useEffect(() => {
    fetchList(true);
  }, [fetchList]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // polling — paused while the tab is hidden
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      fetchList(false);
      fetchThread();
    };
    pollRef.current = setInterval(tick, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchList, fetchThread]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId],
  );

  const patchActive = (patch: Partial<Conversation>) =>
    setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? { ...c, ...patch } : c)));

  const post = (path: string, body?: object) =>
    captainFetch(`${CAPTAIN_API_BASE}/widget-conversations/${activeConversationId}/${path}`, {
      method: ['assign', 'priority', 'labels'].includes(path) ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_name: actor, ...body }),
    });

  /** POST an action, toast the outcome, and roll back the optimistic patch on failure. */
  const runAction = async (
    path: string,
    body: object | undefined,
    successMsg: string,
    rollback?: () => void,
  ) => {
    try {
      const res = await post(path, body);
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Request failed');
      handleAlert({ text: successMsg, type: 'success' });
    } catch (e: any) {
      rollback?.();
      handleAlert({ text: e?.message || 'Something went wrong', type: 'error' });
    }
    fetchThread();
    fetchList(false);
  };

  const handleSend = async (message: string, isPrivate: boolean) => {
    if (!activeConversationId) return;
    const tempId = `tmp-${Date.now()}`;
    setThread((prev) => [
      ...prev,
      {
        id: tempId,
        role: isPrivate ? 'note' : 'agent',
        content: message,
        message_type: isPrivate ? 'note' : 'text',
        author_name: isPrivate ? actor : null,
        created_at: new Date().toISOString(),
        pending: true,
      },
    ]);
    try {
      const res = await post('reply', { message, private: isPrivate });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to send');
      if (!isPrivate) patchActive({ owner: 'human', last_message: message });
      if (isPrivate) handleAlert({ text: 'Private note added', type: 'success' });
      await fetchThread();
    } catch (e: any) {
      setError(e?.message || 'Failed to send');
      handleAlert({ text: e?.message || 'Failed to send message', type: 'error' });
      setThread((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const toggleResolved = async () => {
    if (!activeConversation) return;
    const resolving = activeConversation.status !== 'resolved';
    const prev = activeConversation.status ?? 'open';
    patchActive({ status: resolving ? 'resolved' : 'open' });
    await runAction(
      resolving ? 'resolve' : 'reopen',
      undefined,
      resolving ? 'Conversation resolved' : 'Conversation reopened',
      () => patchActive({ status: prev }),
    );
  };

  const markOpen = async () => {
    const prev = activeConversation?.status ?? 'open';
    patchActive({ status: 'open' });
    await runAction('reopen', undefined, 'Conversation marked open', () => patchActive({ status: prev }));
  };

  const handBackToAi = async () => {
    patchActive({ owner: 'ai' });
    await runAction('hand-back-to-ai', undefined, 'Handed back to the AI assistant', () =>
      patchActive({ owner: 'human' }),
    );
  };

  const assignToMe = async () => {
    if (!user?.uuid) return;
    const prev = { uuid: activeConversation?.assigned_agent_uuid, name: activeConversation?.assigned_agent_name };
    patchActive({ assigned_agent_uuid: user.uuid, assigned_agent_name: actor });
    await runAction('assign', { agent_user_uuid: user.uuid, agent_user_name: actor }, 'Assigned to you', () =>
      patchActive({ assigned_agent_uuid: prev.uuid ?? null, assigned_agent_name: prev.name ?? null }),
    );
  };

  const assignAgent = async (a: Agent | null) => {
    const prev = { uuid: activeConversation?.assigned_agent_uuid, name: activeConversation?.assigned_agent_name };
    patchActive({ assigned_agent_uuid: a?.uuid ?? null, assigned_agent_name: a?.name ?? null });
    await runAction(
      'assign',
      { agent_user_uuid: a?.uuid ?? '', agent_user_name: a?.name ?? '' },
      a ? `Assigned to ${a.name}` : 'Conversation unassigned',
      () => patchActive({ assigned_agent_uuid: prev.uuid ?? null, assigned_agent_name: prev.name ?? null }),
    );
  };

  const setPriority = async (p: Priority) => {
    const prev = activeConversation?.priority ?? null;
    patchActive({ priority: p });
    await runAction('priority', { priority: p ?? '' }, p ? `Priority set to ${p}` : 'Priority cleared', () =>
      patchActive({ priority: prev }),
    );
  };

  const setLabels = async (labels: string[]) => {
    const prev = activeConversation?.labels ?? [];
    patchActive({ labels });
    await runAction('labels', { labels }, 'Labels updated', () => patchActive({ labels: prev }));
  };

  const snooze = async () => {
    const prev = activeConversation?.status ?? 'open';
    patchActive({ status: 'snoozed' });
    await runAction('snooze', undefined, 'Conversation snoozed', () => patchActive({ status: prev }));
  };

  const markPending = async () => {
    const prev = activeConversation?.status ?? 'open';
    patchActive({ status: 'pending' });
    await runAction('mark-pending', undefined, 'Marked as pending', () => patchActive({ status: prev }));
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    handleAlert({ text: 'Conversation link copied', type: 'success' });
  };

  const doBlock = async (next: boolean) => {
    patchActive({ blocked: next });
    await runAction('block', { blocked: next }, next ? 'Contact blocked' : 'Contact unblocked', () =>
      patchActive({ blocked: !next }),
    );
  };

  const toggleBlock = () => {
    if (!activeConversation) return;
    if (activeConversation.blocked) {
      doBlock(false);
      return;
    }
    setConfirm({
      title: 'Block this contact?',
      description: 'They will not be able to send any more messages in this conversation.',
      confirmLabel: 'Block contact',
      destructive: true,
      onConfirm: () => doBlock(true),
    });
  };

  /**
   * Builds the transcript server-side. `send: true` mails it through
   * notification-api; otherwise the text comes back for the browser to save.
   */
  const requestTranscript = async (send: boolean, email = '') => {
    const res = await post('transcript', { email, send });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.detail || payload?.message || 'Request failed');
    return payload?.data || {};
  };

  /** Both handlers re-throw so the dialog stays open on failure and can be retried. */
  const emailTranscript = async (email: string) => {
    if (!activeConversationId) return;
    try {
      const data = await requestTranscript(true, email);
      // An older captain-api build ignores `send` and returns the text with a 200,
      // which would otherwise be reported as a successful send that never happened.
      if (!data?.sent) {
        throw new Error(
          'The server accepted the request but did not send the email — it may be running an older build. Restart captain-api and try again.',
        );
      }
      handleAlert({ text: `Transcript sent to ${email}`, type: 'success' });
      fetchThread();
    } catch (e: any) {
      const msg = e?.message || 'Failed to send transcript';
      setError(msg);
      handleAlert({ text: msg, type: 'error' });
      fetchThread(); // a failed send is recorded on the timeline too
      throw e;
    }
  };

  const downloadTranscript = async () => {
    if (!activeConversationId) return;
    try {
      const { text, filename } = await requestTranscript(false);
      if (text) {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `conversation-${activeConversationId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
      handleAlert({ text: 'Transcript downloaded', type: 'success' });
      fetchThread();
    } catch (e: any) {
      const msg = e?.message || 'Failed to build transcript';
      setError(msg);
      handleAlert({ text: msg, type: 'error' });
      throw e;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        {props.scope === 'inbox' && (
          <button
            type="button"
            onClick={props.onBack}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Conversations</h2>
          <p className="text-sm text-muted-foreground">
            {isAllScope
              ? 'All conversations across your Captain inboxes.'
              : 'Conversations for this inbox.'}
          </p>
        </div>
        {isAllScope && (
          <div className="relative">
            <select
              value={inboxFilter}
              onChange={(e) => setInboxFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-7 text-sm text-gray-900 outline-none focus:border-primary dark:focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All inboxes</option>
              {inboxOptions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className={`flex size-9 items-center justify-center rounded-lg border border-border transition-colors ${
            infoOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
          }`}
          title="Toggle contact panel"
        >
          <PanelRight className="size-4" />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {!listCollapsed && (
          <ConversationList
            conversations={conversations}
            meta={meta}
            isLoading={isLoading}
            isAllScope={isAllScope}
            activeConversationId={activeConversationId}
            onOpenConversation={onOpenConversation}
            assigneeTab={assigneeTab}
            onAssigneeTab={setAssigneeTab}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            sortOrder={sortOrder}
            onSortOrder={setSortOrder}
            search={search}
            onSearch={setSearch}
            inboxOptions={inboxOptions}
            inboxFilter={inboxFilter}
            onInboxFilter={setInboxFilter}
            onCollapse={() => setListCollapsed(true)}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ConversationThread
            conversation={activeConversation}
            messages={thread}
            isAllScope={isAllScope}
            listCollapsed={listCollapsed}
            onExpandList={() => setListCollapsed(false)}
            onToggleResolved={toggleResolved}
            onMarkOpen={markOpen}
            onSnooze={snooze}
            onMarkPending={markPending}
            onAssignToMe={assignToMe}
            onHandBackToAi={handBackToAi}
            onCopyLink={copyLink}
            onToggleBlock={toggleBlock}
            onSendTranscript={() => setTranscriptOpen(true)}
          />
          {activeConversation && <ConversationComposer onSend={handleSend} signatureName={actor} />}
        </div>

        {infoOpen && (
          <ConversationInfoPanel
            conversation={activeConversation}
            isAllScope={isAllScope}
            agents={agents}
            onAssignAgent={assignAgent}
            onAssignToMe={assignToMe}
            onSetPriority={setPriority}
            onSetLabels={setLabels}
            onToggleResolved={toggleResolved}
            onClose={() => setInfoOpen(false)}
          />
        )}
      </div>

      <ConfirmDialog options={confirm} onOpenChange={(o) => !o && setConfirm(null)} />
      <TranscriptDialog
        open={transcriptOpen}
        onOpenChange={setTranscriptOpen}
        onSend={emailTranscript}
        onDownload={downloadTranscript}
      />
    </div>
  );
};

export default ConversationsView;
