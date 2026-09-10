// Shown right after a widget is created. Ported from Chatwoot's
// WidgetCreatedDialog.vue. The "Add to an Action" shortcut is wired up by the
// caller (see widgets.tsx#handleAddToAction) — it hands this widget's design
// to the create-action wizard as a new "Show widget" action.

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, Zap, ChevronRight } from 'lucide-react';

export default function WidgetCreatedDialog({
  open,
  onOpenChange,
  onAddToAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToAction?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-card">
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Check className="size-4 text-green-600" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-foreground">Widget successfully created</h3>
              <p className="text-sm text-gray-500 dark:text-muted-foreground">Ready to go, here's how you can put it to work:</p>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-muted disabled:opacity-50"
            disabled={!onAddToAction}
            onClick={() => {
              onOpenChange(false);
              onAddToAction?.();
            }}
          >
            <Zap className="size-5 shrink-0 text-violet-500" />
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-foreground">Add to an Action</span>
              <span className="text-xs text-gray-500 dark:text-muted-foreground">
                Run a specific action when a customer engages with this widget.
              </span>
            </div>
            <ChevronRight className="ml-auto size-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
          </button>

          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card px-4 py-2 text-sm font-medium text-gray-900 dark:text-foreground transition-colors hover:bg-gray-50 dark:hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
