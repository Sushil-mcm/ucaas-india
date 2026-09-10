import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type BulkDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  type: 'faq' | 'document';
  onConfirm: () => Promise<void>;
};

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedIds,
  type,
  onConfirm,
}: BulkDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const count = selectedIds.size;
  const isMultiple = count > 1;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const title = type === 'faq' ? 'Delete FAQs' : 'Delete Documents';
  const description = isMultiple
    ? `Are you sure you want to delete ${count} ${type === 'faq' ? 'FAQs' : 'documents'}? This action cannot be undone.`
    : `Are you sure you want to delete this ${type}? This action cannot be undone.`;
  const confirmLabel = isMultiple
    ? `Delete ${count} ${type === 'faq' ? 'FAQs' : 'documents'}`
    : `Delete ${type === 'faq' ? 'FAQ' : 'document'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-2xl p-6">
        <DialogTitle className="text-base font-bold text-gray-950 dark:text-gray-100">
          {title}
        </DialogTitle>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? 'Deleting...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
