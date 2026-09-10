// Captain > Build > Widgets — a library of reusable interactive UI widgets the
// assistant can render to a customer. Ported from Chatwoot's captain/widgets/
// Index.vue. Backend: captain-api custom_tools (kind='widget').

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, ChevronDown, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleAlert } from '@/lib/utils';
import WidgetCard from './widget/WidgetCard';
import WidgetCreatedDialog from './widget/dialogs/WidgetCreatedDialog';
import ConfirmDialog from './widget/dialogs/ConfirmDialog';
import { createWidget, deleteWidget, listWidgets } from './widget/helpers/api';
import { buildStarterWidgetConfig, NEW_WIDGET_DEFAULT_TITLE } from './widget/helpers/templates';
import { draftStore } from './widget/helpers/draft-store';
import type { CustomTool } from './widget/helpers/types';

const PER_PAGE = 25;
const BUILDER_PATH = '/admin-settings/captain/widgets';

type ConnectionFilter = '' | 'connected' | 'not_connected';

export default function CaptainWidgets() {
  const navigate = useNavigate();

  const [widgets, setWidgets] = useState<CustomTool[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [connection, setConnection] = useState<ConnectionFilter>('');

  const [createdOpen, setCreatedOpen] = useState(false);
  const [lastCreatedWidget, setLastCreatedWidget] = useState<CustomTool | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CustomTool | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const fetchWidgets = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setIsLoading(true);
        setError('');
      }
      try {
        const res = await listWidgets({ page, searchKey: debouncedSearch || undefined });
        setWidgets(res.items);
        setTotalCount(res.totalCount);
      } catch (err) {
        setError((err as Error).message || 'Failed to load widgets.');
      } finally {
        setIsLoading(false);
      }
    },
    [page, debouncedSearch],
  );

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  // A widget built in the builder comes back through the draft store. Like
  // Chatwoot's Index.vue#checkPendingDraft, create it straight away (with the
  // draft's name — "New Widget" by default, renamed later from the card menu)
  // and show the "widget created" dialog. No intermediate name/assistant prompt.
  useEffect(() => {
    const draft = draftStore.get();
    // pendingCreate is only set once the builder's Save button was actually
    // clicked for this not-yet-created widget — config.widget alone is set the
    // moment "+Custom widget" is clicked (the starter config), before any edit,
    // so it can't tell "the user saved" apart from "they opened and left".
    if (!draft?.pendingCreate || !draft?.config?.widget) return;
    (async () => {
      try {
        const createdTool = await createWidget({
          title: draft.title || NEW_WIDGET_DEFAULT_TITLE,
          description: draft.description,
          config: draft.config as { widget: NonNullable<typeof draft.config.widget> },
          assistantId: draft.assistant_id ?? undefined,
        });
        setLastCreatedWidget(createdTool);
        setCreatedOpen(true);
      } catch (err) {
        handleAlert({ text: (err as Error).message || 'Failed to save widget.', type: 'error' });
      } finally {
        draftStore.clear();
        setPage(1);
        fetchWidgets();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const filtered = useMemo(() => {
    if (!connection) return widgets;
    return widgets.filter((w) =>
      connection === 'connected' ? w.assistant_id != null : w.assistant_id == null,
    );
  }, [widgets, connection]);

  // The connection filter is client-side, over whichever page is currently
  // loaded — it has no server-side count of its own. Chatwoot's own widgets
  // page has this same limitation and still shows the raw unfiltered total
  // in its "Showing X of Y" footer even while filtered, which reads as
  // broken (1 card on screen next to "Showing 1-4 of 4"). Showing the
  // filtered count instead — and pinning to a single page, since we can't
  // correctly paginate a subset that might span multiple server pages — is
  // a deliberate improvement past what Chatwoot does here.
  const totalPages = connection ? 1 : Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const displayTotal = connection ? filtered.length : totalCount;
  const hasActiveFilters = Boolean(search) || Boolean(connection);

  const goToCreate = () => {
    draftStore.set({
      id: null,
      kind: 'widget',
      title: NEW_WIDGET_DEFAULT_TITLE,
      description: '',
      assistant_id: null,
      config: { widget: buildStarterWidgetConfig() },
    });
    navigate(`${BUILDER_PATH}/new`);
  };

  // "Add to an Action" on the just-created-widget dialog: hand this widget's
  // design to the create-action wizard as a new "Show widget" action, the same
  // way WidgetSection's "Edit widget" round-trip already does. Ported from
  // Chatwoot's widgets/Index.vue#onAddToAction — source_widget_id keeps this
  // action's copy of the design in sync with the library widget (syncSourceWidget).
  const handleAddToAction = () => {
    const widget = lastCreatedWidget;
    if (!widget) return;
    const assistantId = widget.assistant_id ?? null;
    draftStore.set({
      id: null,
      kind: 'widget',
      title: widget.title,
      description: widget.description || '',
      assistant_id: assistantId,
      config: { ...(widget.config || {}), source_widget_id: widget.id },
      wizard_state: {
        action_type: 'show_widget',
        title: widget.title,
        description: widget.description || '',
      },
    });
    const qs = new URLSearchParams({ kind: 'http', from: 'widgets' });
    if (assistantId) qs.set('assistantId', String(assistantId));
    navigate(`/admin-settings/captain/tools/new?${qs.toString()}`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteWidget(pendingDelete.id);
      handleAlert({ text: 'Widget deleted.', type: 'success' });
      const nextCount = totalCount - 1;
      if (widgets.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchWidgets({ silent: true });
      setTotalCount(Math.max(0, nextCount));
    } catch (err) {
      handleAlert({ text: (err as Error).message || 'Failed to delete widget.', type: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  const rangeStart = displayTotal === 0 ? 0 : connection ? 1 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = connection ? filtered.length : Math.min(page * PER_PAGE, totalCount);

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-bold text-gray-950 dark:text-foreground">Widgets</div>
        <Button type="button" variant="primary" onClick={goToCreate}>
          <Plus className="size-4" />
          Custom widget
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-9 w-72 items-center gap-2 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted px-3 sm:w-96">
          <Search className="size-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 dark:text-foreground placeholder:text-gray-400 dark:placeholder:text-muted-foreground outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={connection}
            onChange={(e) => setConnection(e.target.value as ConnectionFilter)}
            className="h-9 appearance-none rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted pl-3 pr-8 text-sm text-gray-900 dark:text-foreground outline-none cursor-pointer"
          >
            <option value="">All</option>
            <option value="connected">Connected</option>
            <option value="not_connected">Not connected</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400 dark:text-muted-foreground">Loading…</div>
        ) : !widgets.length ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <LayoutDashboard className="size-10 text-gray-300 dark:text-muted-foreground" />
            <p className="text-base font-medium text-gray-900 dark:text-foreground">No widgets yet</p>
            <p className="max-w-sm text-sm text-gray-500 dark:text-muted-foreground">
              Widgets are interactive cards — forms, buttons, prompts — that your assistant can show to a
              customer mid-conversation.
            </p>
            <Button variant="primary" onClick={goToCreate}>
              <Plus className="size-4" />
              Create a widget
            </Button>
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tool) => (
              <WidgetCard
                key={tool.id}
                tool={tool}
                onEdit={(t) => navigate(`${BUILDER_PATH}/${t.id}`)}
                onDelete={(t) => setPendingDelete(t)}
                onUpdated={() => fetchWidgets({ silent: true })}
                onError={(message) => handleAlert({ text: message, type: 'error' })}
              />
            ))}
          </div>
        ) : hasActiveFilters ? (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-muted-foreground">No widgets match your search.</div>
        ) : null}
      </div>

      {!isLoading && widgets.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-border pt-3 text-xs text-gray-500 dark:text-muted-foreground">
          <span>
            Showing {rangeStart} – {rangeEnd} of {displayTotal} item{displayTotal === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md border border-gray-200 dark:border-border disabled:opacity-40"
              disabled={page <= 1 || !!connection}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span>
              {page} of {totalPages}
            </span>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md border border-gray-200 dark:border-border disabled:opacity-40"
              disabled={page >= totalPages || !!connection}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      <WidgetCreatedDialog open={createdOpen} onOpenChange={setCreatedOpen} onAddToAction={handleAddToAction} />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this widget?"
        description={pendingDelete ? `"${pendingDelete.title}" will be permanently removed.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
