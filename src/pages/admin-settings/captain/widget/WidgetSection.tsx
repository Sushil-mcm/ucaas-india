// The "Widget" section shown inside a custom-tool wizard (lead / form / button):
// library picker + Edit widget + a live preview + a states/functions summary.
// Ported from Chatwoot's WidgetSection.vue.

import { useState } from 'react';
import { Library, ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import WidgetRenderer from './WidgetRenderer';
import WidgetLibraryPicker from './dialogs/WidgetLibraryPicker';
import ConfirmDialog from './dialogs/ConfirmDialog';
import { countWidgetFunctions, countWidgetStates, deriveWidgetConfigFromTool } from './helpers/templates';
import { timeAgo } from './helpers/time-ago';
import type { WidgetConfig } from './helpers/types';

type SectionTool = {
  id: number | null;
  kind: string;
  title?: string;
  updated_at?: string | null;
  config?: { widget?: WidgetConfig; [k: string]: unknown } | null;
};

export default function WidgetSection({
  tool,
  onEditWidget,
  onApplyWidget,
  onResetWidget,
}: {
  tool: SectionTool;
  assistantId?: number | string | null;
  onEditWidget: () => void;
  onApplyWidget: (payload: { widget: WidgetConfig; sourceWidgetId: number }) => void;
  onResetWidget: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const override = tool.config?.widget || null;
  const hasOverride = !!override;
  const previewConfig: WidgetConfig = override || deriveWidgetConfigFromTool(tool);

  const statesCount = hasOverride ? countWidgetStates(override.layout) : 0;
  const functionsCount = hasOverride ? countWidgetFunctions(override.layout) : 0;
  const lastUpdated = tool.updated_at ? `Last updated ${timeAgo(tool.updated_at)}` : '';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5">
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
          <Library className="size-4" />
          Use widget from library
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onEditWidget}>
          Edit widget
        </Button>
        {hasOverride && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setResetOpen(true)}>
                <RotateCcw className="size-4" />
                Reset to default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-muted p-4">
        <WidgetRenderer schema={previewConfig.schema || []} layout={previewConfig.layout || []} />
      </div>

      <div className="flex items-center gap-3 divide-x divide-gray-200 dark:divide-border text-xs text-gray-500 dark:text-muted-foreground">
        {lastUpdated && <span>{lastUpdated}</span>}
        <span className="pl-3">
          {statesCount} state{statesCount === 1 ? '' : 's'}
        </span>
        <span className="pl-3">
          {functionsCount} function{functionsCount === 1 ? '' : 's'}
        </span>
      </div>

      <WidgetLibraryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeToolId={tool.id}
        onSelect={onApplyWidget}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset to the default widget?"
        description="This removes your custom widget and reverts to the design generated from this tool's fields. It won't delete the library widget it was copied from."
        confirmLabel="Yes, reset"
        onConfirm={onResetWidget}
      />
    </div>
  );
}
