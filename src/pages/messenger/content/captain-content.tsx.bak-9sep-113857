import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { ArrowLeft, Send, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import CustomAvatar from '@/components/custom/custom-avatar';
import TextEditor, { defaultEditorValue } from '@/pages/messenger/chat/editor';
import { isDemoMode } from '@/lib/demo-mode';
import { demoCaptainMessages } from '@/lib/demo-contact-centre';

const CAPTAIN_API_BASE = '/captain-api/api/captain';

type CaptainMessage = { id: string; role: 'visitor' | 'assistant' | 'agent'; content: string; created_at: string };

const bubbleClass = (role: CaptainMessage['role']) =>
  role === 'visitor'
    ? 'bg-white text-gray-900 border border-gray-200'
    : role === 'agent'
      ? 'bg-primary text-white'
      : 'bg-indigo-500 text-white';

// Same Slate document shape the rest of the messenger sends — a visitor/agent
// message here is just a plain string, so pull the text back out on send.
function extractPlainText(nodes: any): string {
  try {
    if (!Array.isArray(nodes)) return '';
    return nodes
      .map((node: any) => (Array.isArray(node.children) ? node.children.map((c: any) => c.text || '').join('') : ''))
      .join('\n')
      .trim();
  } catch {
    return '';
  }
}

const CaptainContent = ({ selectedChat, onBackToList }: { selectedChat: any; onBackToList?: () => void }) => {
  const queryClient = useQueryClient();
  const [draftValue, setDraftValue] = useState<any>(defaultEditorValue);
  const editorRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['captainConversationMessages', selectedChat?.id],
    queryFn: async () => {
      if (isDemoMode()) return { data: demoCaptainMessages(selectedChat.id) };
      const res = await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${selectedChat.id}/messages`);
      return res.json();
    },
    enabled: Boolean(selectedChat?.id),
    refetchInterval: isDemoMode() ? false : 4000,
    select: (json: any) => (json?.data as CaptainMessage[]) ?? [],
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const { mutate: mutateSend, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      if (isDemoMode()) {
        const newMessage: CaptainMessage = {
          id: `${selectedChat.id}-msg-${Date.now()}`,
          role: 'agent',
          content,
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData(
          ['captainConversationMessages', selectedChat.id],
          (old: any) => ({ data: [...(old?.data || []), newMessage] }),
        );
        return { success: true };
      }
      const res = await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${selectedChat.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });
      return res.json();
    },
    onSuccess: () => {
      editorRef.current?.resetEditor?.();
      setDraftValue(defaultEditorValue);
      /* Demo mode already appended the message straight into the cache
         above — invalidating here would re-run queryFn and hand back the
         static seed, silently dropping what was just "sent". */
      if (!isDemoMode()) {
        queryClient.invalidateQueries({ queryKey: ['captainConversationMessages', selectedChat.id] });
        queryClient.invalidateQueries({ queryKey: ['captainConversations'] });
      }
    },
  });

  const handleSend = () => {
    if (editorRef.current?.isEditorEmpty?.()) return;
    const text = extractPlainText(draftValue);
    if (!text) return;
    mutateSend(text);
  };

  const { mutate: mutateToggleAi } = useMutation({
    mutationFn: async (resume: boolean) => {
      if (isDemoMode()) return;
      if (resume) {
        await fetch(`${CAPTAIN_API_BASE}/widget-conversations/${selectedChat.id}/hand-back-to-ai`, { method: 'POST' });
      }
      // Pausing (handing to a human) happens implicitly the moment an agent sends
      // a reply — mirrored below so the switch reflects intent immediately.
    },
    onSuccess: () => {
      if (!isDemoMode()) queryClient.invalidateQueries({ queryKey: ['captainConversations'] });
    },
  });

  if (!selectedChat) return null;

  const label = selectedChat.visitor_name || selectedChat.visitor_email || 'Website visitor';
  const aiPaused = selectedChat.owner === 'human';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-[#EEE7DD] dark:border-mcm-line">
        <div className="flex items-center gap-2 min-w-0">
          {onBackToList && (
            <button onClick={onBackToList} className="p-1.5 rounded-lg hover:bg-[#FBE2C8]/40 dark:hover:bg-mcm-surface-3/40 lg:hidden">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <CustomAvatar name={label} size="36" showPresence={false} />
          <div className="min-w-0">
            <p className="font-medium text-[#2E2D35] dark:text-mcm-ink truncate">{label}</p>
            <p className="text-xs text-[#9A948F] dark:text-mcm-ink-3 truncate">
              {selectedChat.visitor_email && selectedChat.visitor_name ? selectedChat.visitor_email : selectedChat.assistant_name || 'Captain'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Bot className="w-4 h-4 text-[#9A948F] dark:text-mcm-ink-3" />
          <span className="text-xs text-[#9A948F] dark:text-mcm-ink-3">AI replying</span>
          <Switch checked={!aiPaused} onCheckedChange={(checked) => mutateToggleAi(checked)} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((m) => {
          const isVisitor = m.role === 'visitor';
          const senderName = isVisitor ? label : m.role === 'agent' ? 'You' : 'AI assistant';
          return (
            <div key={m.id} className={`flex items-start gap-2 ${isVisitor ? 'justify-start' : 'flex-row-reverse justify-start'}`}>
              <CustomAvatar name={isVisitor ? label : m.role === 'agent' ? 'You' : 'AI Assistant'} size="32" showPresence={false} />
              <div className={`flex max-w-[70%] flex-col gap-1 ${isVisitor ? 'items-start' : 'items-end'}`}>
                <div className="flex items-baseline gap-1.5 px-1 text-xs text-[#9A948F] dark:text-mcm-ink-3">
                  <span className="font-medium text-[#9A948F] dark:text-mcm-ink-3">{senderName}</span>
                  <span>{moment(m.created_at).format('h:mm A')}</span>
                </div>
                <div className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${bubbleClass(m.role)}`}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-[#EEE7DD] dark:border-mcm-line p-3">
        <div className="min-w-0 flex-1">
          <TextEditor
            ref={editorRef}
            initialValue={defaultEditorValue}
            onChange={setDraftValue}
            onPressEnterWithoutShift={handleSend}
            placeholder="Reply as an agent — this pauses the AI on this conversation…"
            availableUsers={[]}
            isLoading={isSending}
            className="m-0"
          />
        </div>
        <Button onClick={handleSend} disabled={isSending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CaptainContent;
