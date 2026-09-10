import { useMemo } from 'react';
import {
  Search, ListFilter, ArrowDownUp, PanelLeftClose, Bot, UserCheck,
  CornerDownRight, Globe, UserRound, Check,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { getInitials } from '@/lib/utils';
import {
  Conversation, InboxOption, AssigneeTab, StatusFilter, SortOrder, ListMeta,
  dualTimestamp, priorityMeta, isOnline,
} from './conversation-helpers';

type Props = {
  conversations: Conversation[];
  meta: ListMeta;
  isLoading: boolean;
  isAllScope: boolean;
  activeConversationId: string | null;
  onOpenConversation: (id: string) => void;
  assigneeTab: AssigneeTab;
  onAssigneeTab: (t: AssigneeTab) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (s: StatusFilter) => void;
  sortOrder: SortOrder;
  onSortOrder: (s: SortOrder) => void;
  search: string;
  onSearch: (s: string) => void;
  inboxOptions: InboxOption[];
  inboxFilter: string;
  onInboxFilter: (id: string) => void;
  onCollapse: () => void;
};

const TABS: { key: AssigneeTab; label: string }[] = [
  { key: 'mine', label: 'Mine' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'all', label: 'All' },
];

const STATUS_OPTS: { v: StatusFilter; label: string }[] = [
  { v: 'open', label: 'Open' },
  { v: 'resolved', label: 'Resolved' },
  { v: 'pending', label: 'Pending' },
  { v: 'snoozed', label: 'Snoozed' },
  { v: 'all', label: 'All' },
];

const SORT_OPTS: { v: SortOrder; label: string }[] = [
  { v: 'newest', label: 'Last activity: Newest first' },
  { v: 'oldest', label: 'Last activity: Oldest first' },
  { v: 'created_newest', label: 'Created at: Newest first' },
  { v: 'created_oldest', label: 'Created at: Oldest first' },
];

const STATUS_LABEL: Record<StatusFilter, string> = {
  open: 'Open', resolved: 'Resolved', pending: 'Pending', snoozed: 'Snoozed', all: 'All',
};

const Radio = ({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
  >
    {label}
    {active && <Check className="size-3.5 text-primary" />}
  </button>
);

const ConversationList = (props: Props) => {
  const {
    conversations, meta, isLoading, isAllScope, activeConversationId, onOpenConversation,
    assigneeTab, onAssigneeTab, statusFilter, onStatusFilter, sortOrder, onSortOrder,
    search, onSearch, inboxOptions, inboxFilter, onInboxFilter, onCollapse,
  } = props;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = conversations.filter((c) => {
      if (statusFilter !== 'all' && (c.status || 'open') !== statusFilter) return false;
      if (!q) return true;
      return (
        (c.visitor_name || 'visitor').toLowerCase().includes(q) ||
        (c.last_message || '').toLowerCase().includes(q) ||
        (c.visitor_email || '').toLowerCase().includes(q)
      );
    });
    const byCreated = sortOrder.startsWith('created');
    const asc = sortOrder.endsWith('oldest');
    rows = [...rows].sort((a, b) => {
      const ta = new Date((byCreated ? a.created_at : a.last_message_at || a.created_at) || 0).getTime();
      const tb = new Date((byCreated ? b.created_at : b.last_message_at || b.created_at) || 0).getTime();
      return asc ? ta - tb : tb - ta;
    });
    return rows;
  }, [conversations, search, statusFilter, sortOrder]);

  return (
    <div className="flex w-[21rem] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">Conversations</h2>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {STATUS_LABEL[statusFilter]}
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-muted-foreground">
          {/* Filter */}
          <Popover>
            <PopoverTrigger className="rounded-md p-1.5 hover:bg-accent hover:text-foreground" title="Filter conversations">
              <ListFilter className="size-4" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3 p-3">
              <div className="text-xs font-semibold text-foreground">Filter conversations</div>
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</div>
                {STATUS_OPTS.map((o) => (
                  <Radio key={o.v} active={statusFilter === o.v} label={o.label} onClick={() => onStatusFilter(o.v)} />
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Assignee</div>
                {TABS.map((t) => (
                  <Radio key={t.key} active={assigneeTab === t.key} label={t.label} onClick={() => onAssigneeTab(t.key)} />
                ))}
              </div>
              {isAllScope && (
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Inbox</div>
                  <Radio active={!inboxFilter} label="All inboxes" onClick={() => onInboxFilter('')} />
                  {inboxOptions.map((i) => (
                    <Radio key={i.id} active={inboxFilter === i.id} label={i.name} onClick={() => onInboxFilter(i.id)} />
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  onStatusFilter('all');
                  onAssigneeTab('all');
                  onInboxFilter('');
                }}
                className="w-full rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                Clear filters
              </button>
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Popover>
            <PopoverTrigger className="rounded-md p-1.5 hover:bg-accent hover:text-foreground" title="Sort">
              <ArrowDownUp className="size-4" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3 p-3">
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</div>
                {STATUS_OPTS.map((o) => (
                  <Radio key={o.v} active={statusFilter === o.v} label={o.label} onClick={() => onStatusFilter(o.v)} />
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Order by</div>
                {SORT_OPTS.map((o) => (
                  <Radio key={o.v} active={sortOrder === o.v} label={o.label} onClick={() => onSortOrder(o.v)} />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={onCollapse}
            className="rounded-md p-1.5 hover:bg-accent hover:text-foreground"
            title="Collapse list"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
      </div>

      {/* Assignee tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 px-4 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onAssigneeTab(t.key)}
            className={`-mb-px border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              assigneeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label} <span className="ml-0.5 text-[10px] font-bold">{meta[t.key]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 p-3 dark:border-gray-700">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs text-gray-900 outline-none focus:border-primary dark:focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">Loading...</div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">No conversations here.</div>
        ) : (
          visible.map((c) => {
            const name = c.visitor_name || 'Visitor';
            const active = activeConversationId === c.id;
            const handoff = /connecting you to a human|human agent/i.test(c.last_message || '');
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenConversation(c.id)}
                className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700/60 dark:hover:bg-gray-700/50 ${
                  active ? 'bg-primary/5' : ''
                }`}
              >
                <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(name) || <UserRound className="size-4" />}
                  {isOnline(c.last_message_at) && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-green-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 truncate text-[10px] font-medium text-muted-foreground">
                      <Globe className="size-3 shrink-0" />
                      {isAllScope && c.inbox_name ? c.inbox_name : 'Website'}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {dualTimestamp(c.created_at, c.last_message_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {priorityMeta(c.priority ?? null) && (
                        <span
                          className={`size-2 shrink-0 rounded-full ${priorityMeta(c.priority ?? null)!.dot}`}
                          title={`${priorityMeta(c.priority ?? null)!.label} priority`}
                        />
                      )}
                      <span className="truncate text-[13px] font-semibold text-foreground">{name}</span>
                    </span>
                    {c.owner === 'human' ? (
                      <UserCheck className="size-3.5 shrink-0 text-amber-500" />
                    ) : (
                      <Bot className="size-3.5 shrink-0 text-primary" />
                    )}
                  </div>
                  <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    {handoff && <CornerDownRight className="mt-0.5 size-3 shrink-0" />}
                    <p className="line-clamp-1">{c.last_message || 'No messages yet'}</p>
                  </div>
                  {(c.status !== 'open' || c.assigned_agent_name || (c.labels?.length ?? 0) > 0) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {c.status === 'resolved' && (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
                          Resolved
                        </span>
                      )}
                      {c.status === 'pending' && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                          Pending
                        </span>
                      )}
                      {c.status === 'snoozed' && (
                        <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-muted-foreground">
                          Snoozed
                        </span>
                      )}
                      {c.assigned_agent_name && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {c.assigned_agent_name}
                        </span>
                      )}
                      {(c.labels ?? []).map((l) => (
                        <span key={l} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
