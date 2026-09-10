// Rename a widget. Ported from Chatwoot's WidgetSettingsDialog.vue.

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function WidgetSettingsDialog({
  open,
  onOpenChange,
  currentTitle,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onConfirm: (title: string) => void;
}) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setError('');
    }
  }, [open, currentTitle]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return setError('A name is required.');
    if (trimmed.length > 55) return setError('Keep the name under 55 characters.');
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-card">
        <DialogHeader>
          <DialogTitle>Rename widget</DialogTitle>
          <DialogDescription>Update the name of this widget.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>Widget name</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Contact Form" autoFocus />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
