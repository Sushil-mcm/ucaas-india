// One widget in the library grid: a live (non-interactive) preview, the title,
// when it was last updated, an Edit button and a menu (Rename / Assign / Delete).
// Ported from Chatwoot's WidgetCard.vue.

import { useState } from 'react';
import { MoreHorizontal, Pencil, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import WidgetRenderer from './WidgetRenderer';
import WidgetSettingsDialog from './dialogs/WidgetSettingsDialog';
import WidgetAssignDialog from './dialogs/WidgetAssignDialog';
import { deriveWidgetConfigFromTool } from './helpers/templates';
import { timeAgo } from './helpers/time-ago';
import { updateWidget } from './helpers/api';
import type { CustomTool } from './helpers/types';

export default function WidgetCard({
  tool,
  onEdit,
  onDelete,
  onUpdated,
  onError,
}: {
  tool: CustomTool;
  onEdit: (tool: CustomTool) => void;
  onDelete: (tool: CustomTool) => void;
  onUpdated: () => void;
  onError: (message: string) => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const config = tool.config?.widget || deriveWidgetConfigFromTool(tool);

  const rename = async (title: string) => {
    try {
      await updateWidget(tool.id, { title });
      setRenameOpen(false);
      onUpdated();
    } catch (err) {
      onError((err as Error).message || 'Failed to update widget.');
    }
  };

  return (
    <>
      <div
        className="flex cursor-pointer flex-col rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card transition-all duration-150 hover:border-gray-300 dark:hover:border-border hover:shadow-sm"
        onClick={() => onEdit(tool)}
      >
        <div className="pointer-events-none h-52 overflow-hidden rounded-t-xl border-b border-gray-100 dark:border-border bg-gray-50/70 dark:bg-muted/70 p-4">
          <WidgetRenderer schema={config.schema || []} layout={config.layout || []} />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-foreground">{tool.title}</span>
            <span className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">Last updated {timeAgo(tool.updated_at)}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" onClick={() => onEdit(tool)}>
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  <Pencil className="size-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAssignOpen(true)}>
                  <Link2 className="size-4" />
                  Assign to tools
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(tool)}>
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <WidgetSettingsDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentTitle={tool.title}
        onConfirm={rename}
      />
      <WidgetAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        widget={tool}
        onAssigned={() => {
          setAssignOpen(false);
          onUpdated();
        }}
      />
    </>
  );
}
