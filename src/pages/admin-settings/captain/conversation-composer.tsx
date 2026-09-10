import { useRef, useState } from 'react';
import { Smile, Paperclip, PenLine, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

type Mode = 'reply' | 'note';

type Props = {
  disabled?: boolean;
  onSend: (message: string, isPrivate: boolean) => Promise<void> | void;
  signatureName?: string;
};

const ConversationComposer = ({ disabled, onSend, signatureName }: Props) => {
  const [mode, setMode] = useState<Mode>('reply');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [useSignature, setUseSignature] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const isNote = mode === 'note';

  const submit = async () => {
    const body = useSignature && signatureName && !isNote ? `${text.trim()}\n\n— ${signatureName}` : text.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    try {
      await onSend(body, isNote);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  const insertAtCaret = (chunk: string) => {
    const ta = taRef.current;
    if (!ta) {
      setText((t) => t + chunk);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    setText(text.slice(0, start) + chunk + text.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + chunk.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className={`shrink-0 border-t ${isNote ? 'border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'}`}>
      {/* tabs + tools */}
      <div className="flex items-center justify-between px-3 pt-2.5">
        <div className="flex items-center gap-4">
          {(['reply', 'note'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`border-b-2 pb-1.5 text-xs font-semibold transition-colors ${
                mode === m
                  ? isNote
                    ? 'border-amber-500 text-amber-600'
                    : 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'reply' ? 'Reply' : 'Private Note'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" disabled className="cursor-not-allowed rounded-md p-1 text-violet-500 opacity-70">
                  <Sparkles className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>AI assist — coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md p-1 hover:bg-accent hover:text-foreground"
            title={expanded ? 'Shrink' : 'Expand'}
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        <textarea
          ref={taRef}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={expanded ? 10 : 3}
          placeholder="Shift + enter for new line. Start with '/' to select a Canned Response."
          className={`w-full resize-none rounded-xl border bg-gray-50 px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:ring-4 dark:bg-gray-700 ${
            isNote
              ? 'border-amber-400/60 focus:border-amber-400 focus:ring-amber-500/10'
              : 'border-border focus:border-primary focus:ring-primary/10'
          }`}
        />

        {!isNote && (
          <p className="mt-2 text-xs text-muted-foreground">
            Message signature is not configured, please configure it in profile settings.{' '}
            <button
              type="button"
              onClick={() => setUseSignature((v) => !v)}
              className="font-medium text-primary hover:underline"
            >
              {useSignature ? 'Signature on — click to turn off' : 'Add a one-off signature'}
            </button>
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <TooltipProvider>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Popover>
                <PopoverTrigger className="rounded-md p-1.5 hover:bg-accent hover:text-foreground" title="Emoji">
                  <Smile className="size-4" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto border-none p-0 shadow-lg">
                  <EmojiPicker
                    emojiStyle={EmojiStyle.NATIVE}
                    theme={Theme.AUTO}
                    lazyLoadEmojis
                    width={320}
                    height={380}
                    onEmojiClick={(e) => insertAtCaret(e.emoji)}
                  />
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" disabled className="cursor-not-allowed rounded-md p-1.5 opacity-50">
                    <Paperclip className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Attachments aren&apos;t supported yet</TooltipContent>
              </Tooltip>
              {!isNote && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setUseSignature((v) => !v)}
                      className={`rounded-md p-1.5 hover:bg-accent hover:text-foreground ${useSignature ? 'text-primary' : ''}`}
                    >
                      <PenLine className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{useSignature ? 'Signature on' : 'Add signature'}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          <Button
            type="button"
            variant={isNote ? 'outline' : 'primary'}
            size="sm"
            disabled={sending || disabled || !text.trim()}
            onClick={submit}
          >
            {sending ? 'Sending...' : isNote ? 'Add note (CTRL + ↵)' : 'Send (CTRL + ↵)'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConversationComposer;
