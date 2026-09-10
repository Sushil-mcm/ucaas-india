// A single in-memory slot holding a widget's in-progress state while the user is
// on the builder route. The library page and the builder are separate routes, so
// for a not-yet-created widget this is the only place its config lives until the
// Save button is clicked. Replaces Chatwoot's useCustomToolDraft composable.

import type { WidgetConfig } from './types';

export type WidgetDraft = {
  id: number | null;
  kind: string;
  title: string;
  description: string;
  assistant_id: number | null;
  config: { widget?: WidgetConfig; [k: string]: unknown };
  wizard_state?: Record<string, any>;
  // True only once the builder's own Save button has actually been clicked for
  // a not-yet-created ("new") widget — goToCreate() already populates
  // config.widget with the starter config before the user touches anything,
  // so that field alone can't tell "Save was clicked" apart from "the create
  // flow was merely opened and then abandoned" (e.g. via the back arrow).
  pendingCreate?: boolean;
};

let draft: WidgetDraft | null = null;

export const draftStore = {
  get(): WidgetDraft | null {
    return draft;
  },
  set(next: WidgetDraft | null) {
    draft = next;
  },
  updateWidget(widget: WidgetConfig) {
    if (!draft) return;
    draft = { ...draft, config: { ...draft.config, widget } };
  },
  clear() {
    draft = null;
  },
};
