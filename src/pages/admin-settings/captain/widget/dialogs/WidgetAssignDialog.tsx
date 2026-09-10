// Copy this widget's design onto one or more existing lead/form/button/api_widget
// tools. Ported from Chatwoot's WidgetAssignDialog.vue.

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { listAssignableTools, updateWidget } from '../helpers/api';
import type { CustomTool } from '../helpers/types';

const KIND_LABELS: Record<string, string> = {
  http: 'API',
  api_widget: 'API + Widget',
  lead: 'Collect leads',
  form: 'Form',
  button: 'Button',
};

export default function WidgetAssignDialog({
  open,
  onOpenChange,
  widget,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: CustomTool;
  onAssigned: (count: number) => void;
}) {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setSearch('');
    setError('');
    setIsLoading(true);
    listAssignableTools()
      .then(setTools)
      .catch(() => setError('Failed to load tools.'))
      .finally(() => setIsLoading(false));
  }, [open]);

  const filtered = tools.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const confirm = async () => {
    if (!selected.length) return;
    const widgetConfig = widget.config?.widget;
    if (!widgetConfig) {
      setError('This widget has no design yet. Edit it first.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await Promise.all(
        selected.map((id) => {
          const tool = tools.find((t) => t.id === id);
          return updateWidget(id, {
            config: { ...(tool?.config || {}), widget: widgetConfig, source_widget_id: widget.id },
          });
        }),
      );
      onAssigned(selected.length);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to assign widget. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-card">
        <DialogHeader>
          <DialogTitle>Assign widget to tools</DialogTitle>
          <DialogDescription>
            Select the tools that should use the "{widget.title}" widget. The design is applied to each.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted px-3 py-2 text-sm text-gray-900 dark:text-foreground placeholder:text-gray-400 dark:placeholder:text-muted-foreground focus:border-primary dark:focus:border-primary focus:outline-none"
          />

          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-muted-foreground">Loading…</div>
          ) : !filtered.length ? (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-muted-foreground">No custom tools found.</div>
          ) : (
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {filtered.map((tool) => {
                const isSelected = selected.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    role="checkbox"
                    tabIndex={0}
                    aria-checked={isSelected}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-gray-50 dark:hover:bg-muted'
                    }`}
                    onClick={() => toggle(tool.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggle(tool.id);
                      }
                    }}
                  >
                    <input type="checkbox" tabIndex={-1} className="pointer-events-none shrink-0 accent-primary" checked={isSelected} readOnly />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-foreground">{tool.title}</span>
                      <span className="text-xs text-gray-400 dark:text-muted-foreground">{KIND_LABELS[tool.kind] || tool.kind}</span>
                    </div>
                    {tool.config?.widget?.layout?.length ? (
                      <span className="shrink-0 text-xs text-amber-600">Has widget</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selected.length || isSubmitting} onClick={confirm}>
            {selected.length ? `Assign to ${selected.length} tool${selected.length === 1 ? '' : 's'}` : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
