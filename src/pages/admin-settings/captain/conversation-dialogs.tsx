import { useEffect, useState } from 'react';
import { Download, Send } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export const ConfirmDialog = ({
  options, onOpenChange,
}: { options: ConfirmOptions | null; onOpenChange: (open: boolean) => void }) => {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={!!options} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant={options?.destructive ? 'destructive' : 'primary'}
            disabled={busy}
            onClick={async () => {
              if (!options) return;
              setBusy(true);
              try {
                await options.onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Working…' : options?.confirmLabel || 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const TranscriptDialog = ({
  open, onOpenChange, onSend, onDownload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (email: string) => void | Promise<void>;
  onDownload: () => void | Promise<void>;
}) => {
  const [email, setEmail] = useState('');
  /** Which of the two actions is in flight — they need separate spinners. */
  const [busy, setBusy] = useState<'send' | 'download' | null>(null);

  useEffect(() => {
    if (open) {
      setEmail('');
      setBusy(null);
    }
  }, [open]);

  const trimmed = email.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  // Only complain about what has actually been typed; an untouched field is not an error.
  const showError = trimmed !== '' && !valid;

  /** Runs one action, leaving the dialog open if it failed so it can be retried. */
  const run = async (mode: 'send' | 'download', action: () => void | Promise<void>) => {
    setBusy(mode);
    try {
      await action();
      onOpenChange(false);
    } catch {
      /* the caller has already surfaced the reason as a toast */
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send transcript</DialogTitle>
          <DialogDescription>
            Emails the full conversation transcript to the address below, and notes it on the
            conversation timeline.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5 py-1">
          <Label htmlFor="transcript-email">Send to</Label>
          <Input
            id="transcript-email"
            type="email"
            value={email}
            placeholder="name@example.com"
            autoFocus
            aria-invalid={showError}
            aria-describedby={showError ? 'transcript-email-error' : undefined}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && valid && !busy && run('send', () => onSend(trimmed))}
          />
          {showError && (
            <span id="transcript-email-error" className="text-xs text-red-500">
              Enter a valid email address.
            </span>
          )}
        </div>
        <DialogFooter className="mt-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={!!busy}
            onClick={() => run('download', onDownload)}
          >
            <Download className="size-4" />
            {busy === 'download' ? 'Preparing…' : 'Download'}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!!busy || !valid}
            onClick={() => run('send', () => onSend(trimmed))}
          >
            <Send className="size-4" />
            {busy === 'send' ? 'Sending…' : 'Send transcript'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
