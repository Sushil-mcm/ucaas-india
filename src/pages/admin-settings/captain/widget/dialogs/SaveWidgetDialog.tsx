// Name a freshly-built widget and optionally link it to an assistant.
// Ported from Chatwoot's SaveWidgetDialog.vue.

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Assistant } from '../helpers/types';

export default function SaveWidgetDialog({
  open,
  onOpenChange,
  assistants,
  defaultTitle = '',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistants: Assistant[];
  defaultTitle?: string;
  onConfirm: (payload: { title: string; assistantId: number | null }) => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [assistantId, setAssistantId] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setAssistantId('');
      setError('');
    }
  }, [open, defaultTitle]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('A name is required.');
      return;
    }
    if (trimmed.length > 55) {
      setError('Keep the name under 55 characters.');
      return;
    }
    onConfirm({ title: trimmed, assistantId: assistantId ? Number(assistantId) : null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-card">
        <DialogHeader>
          <DialogTitle>Save your widget</DialogTitle>
          <DialogDescription>
            Give your widget a name. You can optionally link it to an assistant to make it available as a tool.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Contact Form"
              autoFocus
            />
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              Assistant <span className="font-normal text-gray-400 dark:text-muted-foreground">(optional)</span>
            </Label>
            <select
              value={assistantId}
              onChange={(e) => setAssistantId(e.target.value)}
              className="h-10 rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-700 dark:text-foreground outline-none focus:border-primary dark:focus:border-primary"
            >
              <option value="">No assistant</option>
              {assistants.map((a) => (
                <option key={String(a.id)} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
