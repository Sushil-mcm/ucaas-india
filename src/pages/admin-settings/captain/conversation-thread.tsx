import { useEffect, useRef } from 'react';
import {
  AlertTriangle, Bot, UserRound, Lock, ChevronDown, MoreHorizontal,
  CheckCheck, MessagesSquare, PanelLeftOpen, Link2, Globe, Ban, FileText,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { getInitials } from '@/lib/utils';
import { FormattedMessage } from '@/components/captain/FormattedMessage';
import { Conversation, ThreadMessage, messageTime, isOutgoing, isOnline } from './conversation-helpers';

type Props = {
  conversation: Conversation | null;
  messages: ThreadMessage[];
  isAllScope: boolean;
  listCollapsed: boolean;
  onExpandList: () => void;
  onToggleResolved: () => void;
  onMarkOpen: () => void;
  onSnooze: () => void;
  onMarkPending: () => void;
  onAssignToMe: () => void;
  onHandBackToAi: () => void;
  onCopyLink: () => void;
  onToggleBlock: () => void;
  onSendTranscript: () => void;
};

const ActivityLine = ({ text }: { text: string }) => (
  <div className="my-3 flex items-center gap-3">
    <div className="h-px flex-1 bg-border" />
    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{text}</span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const NoteCard = ({ m }: { m: ThreadMessage }) => (
  <div className="my-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
      <Lock className="size-3" />
      {m.author_name || 'Private note'}
      <span className="font-normal opacity-80">· {messageTime(m.created_at)}</span>
    </div>
    <p className="whitespace-pre-wrap">{m.content}</p>
  </div>
);

const Bubble = ({ m }: { m: ThreadMessage }) => {
  const out = isOutgoing(m.role);
  const isAgent = m.role === 'agent';
  return (
    <div className={`flex items-end gap-2 ${out ? 'justify-end' : 'justify-start'}`}>
      {!out && (
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="size-3.5" />
        </div>
      )}
      <div className="max-w-[70%]">
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
            !out
              ? 'rounded-bl-md border border-gray-200 bg-gray-100 text-foreground dark:border-gray-600 dark:bg-gray-700'
              : 'rounded-br-md bg-violet-600 text-white'
          }`}
        >
          <FormattedMessage content={m.content} isUser={!out} />
          <div className={`mt-1 flex items-center gap-1 text-[10px] ${out ? 'text-white/70' : 'text-muted-foreground'}`}>
            <span>{messageTime(m.created_at)}</span>
            {out && !m.pending && <CheckCheck className="size-3" />}
          </div>
        </div>
      </div>
      {out && (
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-950">
          {isAgent ? 'A' : <Bot className="size-3.5" />}
        </div>
      )}
    </div>
  );
};

const ConversationThread = (props: Props) => {
  const {
    conversation: c, messages, isAllScope, listCollapsed, onExpandList,
    onToggleResolved, onMarkOpen, onSnooze, onMarkPending, onAssignToMe, onHandBackToAi,
    onCopyLink, onToggleBlock, onSendTranscript,
  } = props;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, c?.id]);

  const resolved = c?.status === 'resolved';

  return (
    <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-2.5">
          {listCollapsed && (
            <button
              type="button"
              onClick={onExpandList}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Show list"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          )}
          {c && (
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(c.visitor_name || 'Visitor') || <UserRound className="size-4" />}
              {isOnline(c.last_message_at) && (
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-green-500" />
              )}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold lowercase text-foreground">
                {c ? c.visitor_name || 'visitor' : 'Select a conversation'}
              </h3>
              {c && !c.visitor_email && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="size-3.5 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>Visitor identity not verified (no email)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {c && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="size-3" />
                {isAllScope && c.inbox_name ? c.inbox_name : 'Website'}
              </p>
            )}
          </div>
        </div>

        {c && (
          <div className="flex items-center gap-1.5">
            {/* Resolve split-button */}
            <div className="flex overflow-hidden rounded-lg border border-primary">
              <button
                type="button"
                onClick={onToggleResolved}
                className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary dark:hover:bg-primary hover:text-primary-foreground dark:bg-gray-900"
              >
                {resolved ? 'Reopen' : 'Resolve'}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="border-l border-primary bg-gray-50 px-1.5 text-primary transition-colors hover:bg-primary dark:hover:bg-primary hover:text-primary-foreground dark:bg-gray-900">
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onToggleResolved}>
                    {resolved ? 'Reopen conversation' : 'Resolve conversation'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSnooze} disabled={c.status === 'snoozed'}>
                    Snooze
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onMarkPending} disabled={c.status === 'pending'}>
                    Mark as pending
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onMarkOpen} disabled={c.status === 'open'}>
                    Mark open
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAssignToMe} disabled={!!c.assigned_agent_uuid}>
                  Assign to me
                </DropdownMenuItem>
                {c.owner === 'human' && (
                  <DropdownMenuItem onClick={onHandBackToAi}>Hand back to AI</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleBlock} className={c.blocked ? '' : 'text-red-600'}>
                  <Ban className="mr-2 size-3.5" /> {c.blocked ? 'Unblock contact' : 'Block contact'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSendTranscript}>
                  <FileText className="mr-2 size-3.5" /> Send transcript
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCopyLink}>
                  <Link2 className="mr-2 size-3.5" /> Copy conversation link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-6 py-4">
        {!c ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <MessagesSquare className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Please select a conversation from left pane</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="pt-10 text-center text-xs text-muted-foreground">No messages yet.</div>
        ) : (
          messages.map((m) =>
            m.message_type === 'activity' ? (
              <ActivityLine key={m.id} text={m.content} />
            ) : m.message_type === 'note' ? (
              <NoteCard key={m.id} m={m} />
            ) : (
              <Bubble key={m.id} m={m} />
            ),
          )
        )}
      </div>
    </div>
  );
};

export default ConversationThread;
