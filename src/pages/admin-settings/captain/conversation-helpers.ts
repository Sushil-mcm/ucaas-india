export type MessageType = 'text' | 'note' | 'activity';

/**
 * The states captain-api stores on a conversation.
 *
 * All four are real: `snoozed` and `pending` are set by its snooze and
 * mark-pending endpoints. This type used to list only `open` and `resolved`
 * while `StatusFilter` listed all four, so the badges and filters for the other
 * two were type errors — which is what broke `tsc -b`. Both now derive from
 * here so they cannot drift apart again.
 */
export type ConversationStatus = 'open' | 'resolved' | 'pending' | 'snoozed';

export type Conversation = {
  id: string;
  inbox_id?: string | null;
  inbox_name?: string | null;
  contact_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  page_url: string | null;
  owner: 'ai' | 'human' | null;
  status?: ConversationStatus | null;
  assigned_agent_uuid?: string | null;
  assigned_agent_name?: string | null;
  csat_rating?: number | null;
  csat_feedback?: string | null;
  priority?: Priority;
  labels?: string[];
  snoozed_until?: string | null;
  blocked?: boolean;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string | null;
};

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | null;

export type Agent = { uuid: string; name: string; email?: string | null };

export const PRIORITY_OPTS: { v: Exclude<Priority, null>; label: string; dot: string }[] = [
  { v: 'urgent', label: 'Urgent', dot: 'bg-red-500' },
  { v: 'high', label: 'High', dot: 'bg-orange-500' },
  { v: 'medium', label: 'Medium', dot: 'bg-amber-400' },
  { v: 'low', label: 'Low', dot: 'bg-sky-400' },
];

export const priorityMeta = (p: Priority) => PRIORITY_OPTS.find((o) => o.v === p) || null;

export type ThreadMessage = {
  id: string;
  role: 'visitor' | 'assistant' | 'agent' | 'note' | 'activity';
  content: string;
  message_type: MessageType;
  author_name?: string | null;
  created_at: string;
  pending?: boolean;
};

export type InboxOption = { id: string; name: string };

export type AssigneeTab = 'all' | 'mine' | 'unassigned';
export type StatusFilter = ConversationStatus | 'all';
export type SortOrder = 'newest' | 'oldest' | 'created_newest' | 'created_oldest';

export type ListMeta = { all: number; mine: number; unassigned: number };

/** "3m", "5h", "2d", "Sep 4" — compact, Chatwoot-style. */
export const shortAgo = (iso: string | null): string => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 45) return 'now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** "1mo • now" — created-ago • last-activity-ago (matches the screenshot). */
export const dualTimestamp = (createdAt: string | null, lastAt: string | null): string => {
  const created = shortAgo(createdAt);
  const last = shortAgo(lastAt || createdAt);
  return created && last && created !== last ? `${created} • ${last}` : last || created;
};

export const clockTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/** "Sep 7, 10:29 AM" — Chatwoot's message-bubble timestamp. */
export const messageTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

export const hostnameOf = (url: string | null): string => {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

export const isOutgoing = (role: ThreadMessage['role']) => role === 'assistant' || role === 'agent';

/** Presence heuristic — captain-api has no realtime presence, so treat a
 * conversation as "online" when it had activity in the last 3 minutes. */
export const ONLINE_WINDOW_MS = 3 * 60 * 1000;
export const isOnline = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && Date.now() - t < ONLINE_WINDOW_MS;
};

export const agentName = (user: any): string =>
  `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Agent';
