import { useState } from 'react';
import { Globe, Mail, Phone, Building2, UserRound, Bot, UserCheck, ChevronDown, X, Plus } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import {
  Conversation, Agent, Priority, PRIORITY_OPTS, priorityMeta, hostnameOf, isOnline,
} from './conversation-helpers';

type Props = {
  conversation: Conversation | null;
  isAllScope: boolean;
  agents: Agent[];
  onAssignAgent: (a: Agent | null) => void;
  onAssignToMe: () => void;
  onSetPriority: (p: Priority) => void;
  onSetLabels: (labels: string[]) => void;
  onToggleResolved: () => void;
  onClose: () => void;
};

const Section = ({
  title, defaultOpen = true, children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => (
  <details open={defaultOpen} className="border-b border-gray-200 px-4 py-3 dark:border-gray-700 [&_svg.chev]:open:rotate-180">
    <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-foreground">
      {title}
      <ChevronDown className="chev size-4 text-muted-foreground transition-transform" />
    </summary>
    <div className="mt-3 space-y-3">{children}</div>
  </details>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-xs font-medium text-foreground">{children}</div>
  </div>
);

const selectClass =
  'h-8 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs text-foreground outline-none focus:border-primary dark:focus:border-primary dark:border-gray-600 dark:bg-gray-700';

const ConversationInfoPanel = (props: Props) => {
  const { conversation: c, isAllScope, agents, onAssignAgent, onAssignToMe, onSetPriority, onSetLabels, onToggleResolved, onClose } = props;
  const [labelDraft, setLabelDraft] = useState('');

  if (!c) {
    return (
      <div className="hidden w-[19rem] shrink-0 items-center justify-center border-l border-gray-200 bg-white px-6 text-center dark:border-gray-700 dark:bg-gray-800 lg:flex">
        <div>
          <UserRound className="mx-auto mb-3 size-8 text-muted-foreground/40" strokeWidth={1.8} />
          <p className="text-xs text-muted-foreground">Select a conversation to view contact details.</p>
        </div>
      </div>
    );
  }

  const labels = c.labels ?? [];
  const addLabel = () => {
    const v = labelDraft.trim().toLowerCase();
    if (v && !labels.includes(v)) onSetLabels([...labels, v]);
    setLabelDraft('');
  };
  const removeLabel = (l: string) => onSetLabels(labels.filter((x) => x !== l));

  return (
    <div className="hidden w-[19rem] shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:flex">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <span className="text-xs font-semibold text-foreground">Contact</span>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="border-b border-gray-200 px-4 py-5 text-center dark:border-gray-700">
        <div className="relative mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {getInitials(c.visitor_name || 'Visitor') || <UserRound className="size-6" />}
          {isOnline(c.last_message_at) && (
            <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-card bg-green-500" />
          )}
        </div>
        <h3 className="mt-2 text-sm font-semibold text-foreground">{c.visitor_name || 'Anonymous Visitor'}</h3>
        {isOnline(c.last_message_at) && (
          <span className="text-[11px] font-medium text-green-500">Online</span>
        )}
        {c.page_url && hostnameOf(c.page_url) && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Globe className="size-3" />
            {hostnameOf(c.page_url)}
          </span>
        )}
        <div className="mt-3 space-y-1.5 text-left">
          {[
            { icon: Mail, val: c.visitor_email },
            { icon: Phone, val: null as string | null },
            { icon: Building2, val: null as string | null },
          ].map(({ icon: Icon, val }, i) => (
            <div key={i} className="flex items-center gap-2">
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className={`text-xs ${val ? 'text-foreground' : 'italic text-muted-foreground'}`}>
                {val || 'Not available'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Section title="Conversation Actions">
        <Field label="Assigned Agent">
          <div className="flex items-center gap-1.5">
            <select
              className={selectClass}
              value={c.assigned_agent_uuid || ''}
              onChange={(e) => {
                const a = agents.find((x) => x.uuid === e.target.value) || null;
                onAssignAgent(a);
              }}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.uuid} value={a.uuid}>{a.name}</option>
              ))}
              {c.assigned_agent_uuid && !agents.some((a) => a.uuid === c.assigned_agent_uuid) && (
                <option value={c.assigned_agent_uuid}>{c.assigned_agent_name}</option>
              )}
            </select>
            {!c.assigned_agent_uuid && (
              <button type="button" onClick={onAssignToMe} className="whitespace-nowrap text-[11px] font-semibold text-primary hover:underline">
                Me
              </button>
            )}
          </div>
        </Field>

        <Field label="Priority">
          <select
            className={selectClass}
            value={c.priority ?? ''}
            onChange={(e) => onSetPriority((e.target.value || null) as Priority)}
          >
            <option value="">None</option>
            {PRIORITY_OPTS.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
          {priorityMeta(c.priority ?? null) && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={`size-2 rounded-full ${priorityMeta(c.priority ?? null)!.dot}`} />
              {priorityMeta(c.priority ?? null)!.label}
            </span>
          )}
        </Field>

        <Field label="Conversation Labels">
          <div className="flex flex-wrap gap-1">
            {labels.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {l}
                <button type="button" onClick={() => removeLabel(l)} className="hover:text-foreground">
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
              placeholder="Add label"
              className="h-7 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 text-[11px] text-foreground outline-none focus:border-primary dark:focus:border-primary dark:border-gray-600 dark:bg-gray-700"
            />
            <button
              type="button"
              onClick={addLabel}
              disabled={!labelDraft.trim()}
              className="rounded-md border border-border p-1 text-muted-foreground hover:bg-accent disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </Field>

        <Field label="Handled by">
          <span className="flex items-center gap-1.5">
            {c.owner === 'human' ? (
              <><UserCheck className="size-3 text-amber-500" /> Human agent</>
            ) : (
              <><Bot className="size-3 text-primary" /> AI</>
            )}
          </span>
        </Field>
        <Field label="Resolution">
          <div className="flex items-center justify-between">
            <span className="capitalize">{c.status || 'open'}</span>
            <button type="button" onClick={onToggleResolved} className="text-[11px] font-semibold text-primary hover:underline">
              {c.status === 'resolved' ? 'Reopen' : 'Resolve'}
            </button>
          </div>
        </Field>
        {c.csat_rating != null && (
          <Field label="CSAT Rating">
            {c.csat_rating} / 5{c.csat_feedback ? ` — "${c.csat_feedback}"` : ''}
          </Field>
        )}
      </Section>

      <Section title="Conversation Information" defaultOpen={false}>
        {isAllScope && c.inbox_name && <Field label="Inbox">{c.inbox_name}</Field>}
        <Field label="Initiated At">{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</Field>
        {c.page_url && (
          <Field label="Referrer">
            <a href={c.page_url} target="_blank" rel="noreferrer" className="block truncate text-primary hover:underline">
              {c.page_url}
            </a>
          </Field>
        )}
      </Section>
    </div>
  );
};

export default ConversationInfoPanel;
