// Single reusable delete-confirmation modal for Captain — replaces the native
// window.confirm() used across assistants/faqs/documents/scenarios/widgets/
// inboxes, which can't be themed and looks jarring against dark mode. Mirrors
// BulkDeleteDialog's look so single- and multi-delete confirmations match.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type DeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What's being deleted, lowercase singular — e.g. "assistant", "FAQ", "document". */
  itemLabel: string;
  /** Optional specific name to call out in the description, e.g. the record's title. */
  itemName?: string;
  /** Overrides the generated description entirely, for callers that need custom copy. */
  description?: string;
  onConfirm: () => Promise<void> | void;
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemLabel,
  itemName,
  description,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const title = `Delete ${itemLabel.charAt(0).toUpperCase()}${itemLabel.slice(1)}`;
  const body =
    description ??
    `Are you sure you want to delete ${itemName ? `"${itemName}"` : `this ${itemLabel}`}? This action cannot be undone.`;

  return (
    <Dialog open={open} onOpenChange={(next) => !isDeleting && onOpenChange(next)}>
      <DialogContent className="w-full max-w-md rounded-2xl p-6">
        <DialogTitle className="text-base font-bold text-gray-950 dark:text-gray-100">
          {title}
        </DialogTitle>
        <p className="text-sm text-gray-600 dark:text-gray-300">{body}</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleConfirm}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
