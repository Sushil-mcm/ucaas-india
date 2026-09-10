// The widget builder route: header (back / title / Save / Reset) + WidgetBuilder.
// `:widgetId` is 'new' for a not-yet-created widget whose config lives only in
// the draft store until it's saved on the library page. Ported from Chatwoot's
// tools/WidgetEdit.vue.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MoreVertical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { handleAlert } from '@/lib/utils';
import WidgetBuilder, { type WidgetBuilderHandle } from './widget/WidgetBuilder';
import ConfirmDialog from './widget/dialogs/ConfirmDialog';
import { getWidget, listHttpTools, syncSourceWidget, updateWidget } from './widget/helpers/api';
import { draftStore } from './widget/helpers/draft-store';
import { timeAgo } from './widget/helpers/time-ago';
import type { CustomTool, WidgetConfig } from './widget/helpers/types';

const WIDGETS_PATH = '/admin-settings/captain/widgets';

type BuilderTool = Pick<CustomTool, 'kind' | 'title' | 'config'> & { id: number | null; updated_at?: string };

export default function CaptainWidgetBuilder() {
  const { widgetId = '' } = useParams();
  const navigate = useNavigate();
  const isDraftMode = widgetId === 'new';

  const [tool, setTool] = useState<BuilderTool | null>(null);
  const [httpTools, setHttpTools] = useState<CustomTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const builderRef = useRef<WidgetBuilderHandle>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isDraftMode) {
        const draft = draftStore.get();
        if (!draft) {
          navigate(WIDGETS_PATH, { replace: true });
          return;
        }
        setTool({
          id: null,
          kind: draft.kind as CustomTool['kind'],
          title: draft.title,
          config: draft.config,
        });
        setIsLoading(false);
        return;
      }
      try {
        const fetched = await getWidget(Number(widgetId));
        if (cancelled) return;
        // A wizard hand-off (Widget section "Edit widget") leaves a matching
        // draft holding the widget the user just picked / has unsaved — open on
        // that, not the stale server copy. The draft is NOT cleared here: the
        // wizard clears it when it restores on the way back. Mirrors Chatwoot's
        // WidgetEdit.vue.
        const draft = draftStore.get();
        const draftMatches =
          !!draft &&
          draft.id != null &&
          String(draft.id) === String(widgetId) &&
          !!draft.config?.widget;
        setTool(
          draftMatches
            ? {
                ...fetched,
                kind: (draft!.kind as CustomTool['kind']) || fetched.kind,
                title: draft!.title || fetched.title,
                config: { ...(fetched.config || {}), ...draft!.config },
              }
            : fetched,
        );
        if (fetched.assistant_id) {
          listHttpTools(fetched.assistant_id).then((t) => !cancelled && setHttpTools(t)).catch(() => {});
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [widgetId, isDraftMode, navigate]);

  // Poll the builder's dirty state so Save / Reset enable correctly.
  useEffect(() => {
    const timer = setInterval(() => {
      setHasUnsaved(builderRef.current?.hasUnsavedChanges() ?? false);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  const lastUpdated = useMemo(
    () => (tool?.updated_at ? `Last updated ${timeAgo(tool.updated_at)}` : ''),
    [tool?.updated_at],
  );

  // A library widget goes back to the library; a widget opened from another
  // tool's editor (via source_widget_id) goes back to wherever that was.
  const leaveBuilder = () => {
    if (tool?.kind === 'widget') navigate(WIDGETS_PATH);
    else navigate(-1);
  };

  const onSubmit = async (config: WidgetConfig) => {
    if (isDraftMode) {
      draftStore.updateWidget(config);
      // Marks that Save was actually clicked — the widgets list page only
      // creates the real record when this is set, not merely because a draft
      // with a starter config exists (goToCreate sets that immediately, before
      // any edit, so it can't by itself mean "the user chose to save").
      const current = draftStore.get();
      if (current) draftStore.set({ ...current, pendingCreate: true });
      navigate(-1);
      return;
    }
    if (!tool?.id) return;
    setIsSaving(true);
    try {
      await updateWidget(tool.id, { config: { ...(tool.config || {}), widget: config } });
      // If this tool's widget was copied from a library widget, write the edit
      // back to that source so the next copy is current. Best-effort — a deleted
      // or non-widget source is a no-op and never blocks the save.
      try {
        await syncSourceWidget({
          sourceWidgetId: tool.config?.source_widget_id as number | undefined,
          currentToolId: tool.id,
          widgetConfig: config,
        });
      } catch {
        /* source may have been deleted */
      }
      // Keep the wizard hand-off draft (if any) in step, so the wizard shows the
      // just-saved design when it restores — it, not us, clears the draft.
      if (draftStore.get()) draftStore.updateWidget(config);
      handleAlert({ text: 'Widget updated successfully', type: 'success' });
      leaveBuilder();
    } catch (err) {
      handleAlert({ text: (err as Error).message || 'There was an error updating the widget.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const onBack = () => {
    // Abandoning a not-yet-created widget (never saved) — drop the draft so it
    // can't be picked up and silently created on a later, unrelated visit to
    // the widgets list.
    if (isDraftMode) draftStore.clear();
    leaveBuilder();
  };

  const confirmReset = () => {
    builderRef.current?.resetToDefault();
    setResetOpen(false);
    handleAlert({ text: 'Reset to the default draft — click Save to keep it.', type: 'success' });
  };

  return (
    <div className="font-inter flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 dark:border-border px-6 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-900 dark:text-foreground transition-colors hover:bg-gray-100 dark:hover:bg-muted"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="truncate text-base font-semibold text-gray-900 dark:text-foreground">
            {tool ? tool.title : 'Edit widget'}
          </h1>
        </div>

        {tool && (
          <div className="flex shrink-0 items-center gap-3">
            {lastUpdated && <span className="text-sm text-gray-500 dark:text-muted-foreground">{lastUpdated}</span>}
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasUnsaved || isSaving}
              onClick={() => builderRef.current?.save()}
            >
              Save
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem disabled={!hasUnsaved} onClick={() => setResetOpen(true)}>
                  <RotateCcw className="size-4" />
                  Reset to default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400 dark:text-muted-foreground">Loading…</div>
      ) : notFound || !tool ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-gray-500 dark:text-muted-foreground">This widget could not be found.</p>
          <Button variant="outline" onClick={onBack}>
            Back to widgets
          </Button>
        </div>
      ) : (
        <WidgetBuilder ref={builderRef} tool={tool} httpTools={httpTools} onSubmit={onSubmit} />
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset to default widget?"
        description="This clears your current draft — fields, buttons, colors, and actions — back to the default. Nothing is saved until you click Save."
        confirmLabel="Yes, reset"
        onConfirm={confirmReset}
      />
    </div>
  );
}
