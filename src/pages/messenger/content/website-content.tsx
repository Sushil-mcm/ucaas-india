import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  getConversationMessages,
  pauseConversationAi,
  resumeConversationAi,
  sendAgentMessage,
  type AgentMessage,
} from '@/services/agentic-api';

const bubbleAlign = (role: AgentMessage['role']) => (role === 'user' ? 'items-start' : 'items-end');
const bubbleClass = (role: AgentMessage['role']) =>
  role === 'user'
    ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
    : role === 'agent'
      ? 'bg-primary text-white rounded-br-sm'
      : 'bg-indigo-50 text-indigo-900 rounded-br-sm';

const WebsiteContent = ({ selectedChat, onBackToList }: { selectedChat: any; onBackToList?: () => void }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['websiteConversationMessages', selectedChat?.id],
    queryFn: () => getConversationMessages(selectedChat.id),
    enabled: Boolean(selectedChat?.id),
    refetchInterval: 4000,
    select: (res: any) => (res?.data?.data as AgentMessage[]) ?? [],
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const { mutate: mutateSend, isPending: isSending } = useMutation({
    mutationFn: (content: string) => sendAgentMessage(selectedChat.id, content),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['websiteConversationMessages', selectedChat.id] });
      queryClient.invalidateQueries({ queryKey: ['websiteConversations'] });
    },
  });

  const { mutate: mutateToggleAi } = useMutation({
    mutationFn: (resume: boolean) => (resume ? resumeConversationAi(selectedChat.id) : pauseConversationAi(selectedChat.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['websiteConversations'] }),
  });

  if (!selectedChat) return null;

  const label = selectedChat.contactName || selectedChat.contactEmail || 'Website visitor';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          {onBackToList && (
            <button onClick={onBackToList} className="p-1.5 rounded-lg hover:bg-gray-100 lg:hidden">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm shrink-0">
            {label.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{label}</p>
            <p className="text-xs text-gray-400 truncate">
              {selectedChat.contactEmail && selectedChat.contactName ? selectedChat.contactEmail : selectedChat.inboxName || 'Website'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Bot className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">AI replying</span>
          <Switch
            checked={!selectedChat.aiPaused}
            onCheckedChange={(checked) => mutateToggleAi(checked)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
        {messages
          .filter((m) => m.role !== 'system' && m.role !== 'tool')
          .map((m) => (
            <div key={m.id} className={`flex flex-col ${bubbleAlign(m.role)}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${bubbleClass(m.role)}`}>
                {m.content}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                {m.role === 'user' ? label : m.role === 'agent' ? 'You' : 'AI assistant'}
              </span>
            </div>
          ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-200 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim()) mutateSend(draft.trim());
            }
          }}
          placeholder="Reply as an agent — this pauses the AI on this conversation…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm max-h-24"
        />
        <Button onClick={() => draft.trim() && mutateSend(draft.trim())} disabled={isSending || !draft.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default WebsiteContent;
