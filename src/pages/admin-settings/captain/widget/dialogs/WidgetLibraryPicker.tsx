// Pick a standalone library widget to use as this tool's design.
// Ported from Chatwoot's WidgetLibraryPicker.vue.

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import WidgetRenderer from '../WidgetRenderer';
import { listWidgets } from '../helpers/api';
import { deriveWidgetConfigFromTool } from '../helpers/templates';
import type { CustomTool, WidgetConfig } from '../helpers/types';

export default function WidgetLibraryPicker({
  open,
  onOpenChange,
  excludeToolId = null,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeToolId?: number | null;
  onSelect: (payload: { widget: WidgetConfig; sourceWidgetId: number }) => void;
}) {
  const [widgets, setWidgets] = useState<CustomTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomTool | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setSearch('');
    setError('');
    setIsLoading(true);
    listWidgets({ page: 1 })
      .then((res) => setWidgets(res.items.filter((w) => String(w.id) !== String(excludeToolId))))
      .catch(() => setError('Failed to load widgets.'))
      .finally(() => setIsLoading(false));
  }, [open, excludeToolId]);

  const configFor = (tool: CustomTool): WidgetConfig => tool.config?.widget || deriveWidgetConfigFromTool(tool);

  const filtered = widgets.filter((w) => w.title.toLowerCase().includes(search.toLowerCase()));

  const confirm = () => {
    if (!selected) return;
    onSelect({ widget: configFor(selected), sourceWidgetId: selected.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white dark:bg-card">
        <DialogHeader>
          <DialogTitle>Use widget from library</DialogTitle>
          <DialogDescription>Select an existing widget to use as a starting point.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search widgets..."
            className="w-full rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted px-3 py-2 text-sm text-gray-900 dark:text-foreground placeholder:text-gray-400 dark:placeholder:text-muted-foreground focus:border-primary dark:focus:border-primary focus:outline-none"
          />

          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-500">{error}</div>
          ) : !filtered.length ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-muted-foreground">No widgets available in your library.</div>
          ) : (
            <div className="grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
              {filtered.map((tool) => {
                const isSelected = selected?.id === tool.id;
                const cfg = configFor(tool);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={`relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                      isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 dark:border-border bg-white dark:bg-card hover:border-gray-300 dark:hover:border-border'
                    }`}
                    onClick={() => setSelected(tool)}
                  >
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary">
                        <Check className="size-3 text-white" />
                      </span>
                    )}
                    <span className="flex min-w-0 items-center gap-2 pr-6">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-foreground">{tool.title}</span>
                      <span className="shrink-0 rounded bg-gray-100 dark:bg-muted px-1.5 py-0.5 text-xs text-gray-500 dark:text-muted-foreground">Widget</span>
                    </span>
                    <div className="pointer-events-none w-full overflow-hidden rounded-lg bg-gray-50 dark:bg-muted p-2">
                      <WidgetRenderer schema={cfg.schema || []} layout={cfg.layout || []} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selected} onClick={confirm}>
            Use this widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
