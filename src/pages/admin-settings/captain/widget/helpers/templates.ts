// Widget builder constants + the starter/derived configs a brand-new widget
// opens on. Ported from Chatwoot's components-next/captain/pageComponents/
// customTool/templates.js (the widget-relevant parts).

import type { WidgetConfig } from './types';

export const WIDGET_FIELD_TYPES = ['text', 'email', 'text_area', 'select'] as const;
export const FIELD_TYPES_FOR_WIDGET = ['text', 'email', 'text_area', 'select'];

// submit / open_url / send_message / call_tool / dismiss — the actions a widget
// button can take (open_url maps to onClick.type 'navigate').
export const WIDGET_BUTTON_ACTIONS = ['submit', 'open_url', 'send_message', 'call_tool', 'dismiss'] as const;

export const VISIBILITY_OPS = [
  'eq',
  'neq',
  'gt',
  'lt',
  'contains',
  'not_contains',
  'is_empty',
  'is_not_empty',
] as const;

export const VISIBILITY_OPS_WITHOUT_VALUE = ['is_empty', 'is_not_empty'];

export const VISIBILITY_OP_LABELS: Record<string, string> = {
  eq: 'equals',
  neq: 'does not equal',
  gt: 'is greater than',
  lt: 'is less than',
  contains: 'contains',
  not_contains: 'does not contain',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
};

export const BUTTON_ACTION_LABELS: Record<string, string> = {
  submit: 'Submit the form',
  open_url: 'Open URL',
  send_message: 'Send message',
  call_tool: 'Call a tool',
  dismiss: 'Close the widget',
};

export const LABEL_FONT_SIZES = ['sm', 'base', 'lg', 'xl'];
export const BUTTON_ALIGNMENTS = ['left', 'center', 'right'];

export const NEW_WIDGET_DEFAULT_TITLE = 'New Widget';

// The sample a brand-new standalone widget starts from — a titled card with a
// line of text, so the builder opens on something visible.
export const buildStarterWidgetConfig = (): WidgetConfig => ({
  schema: [],
  layout: [
    {
      type: 'card',
      id: 'starter_card',
      title: 'Hello World',
      titleStyle: { fontSize: '20px', fontWeight: '700' },
      children: [{ type: 'text', id: 'starter_text', content: 'This is a sample widget' }],
    },
  ],
});

type DerivableTool = {
  id?: number | null;
  kind?: string;
  title?: string;
  config?: {
    widget?: WidgetConfig;
    fields?: { key?: string; name?: string; label?: string; type?: string; required?: boolean; placeholder?: string; enabled?: boolean }[];
    buttons?: { label?: string; action?: string; url?: string; message?: string }[];
    title?: string;
  } | null;
};

// The config the builder opens on for a given tool:
//   - if it already has a saved `config.widget` (e.g. assigned from the library),
//     edit that
//   - a `button` tool -> a card of its buttons
//   - a `lead`/`form` tool -> a card with a form of its fields + a Submit button
//   - anything else -> the "Hello World" starter
// Mirrors Chatwoot's deriveWidgetConfigFromTool so "Edit widget" on a plain
// lead/form/button tool opens on something recognisable, not a blank sample.
export const deriveWidgetConfigFromTool = (tool: DerivableTool | null): WidgetConfig => {
  const widget = tool?.config?.widget;
  if (widget && Array.isArray(widget.schema) && Array.isArray(widget.layout)) return widget;

  const config = tool?.config || {};

  if (tool?.kind === 'button') {
    const children = (config.buttons || [])
      .filter((b) => b.label)
      .map((b, index) => ({
        type: 'button' as const,
        id: `derived_button_${index}`,
        label: b.label as string,
        onClick:
          b.action === 'open_url'
            ? { type: 'navigate' as const, url: b.url || '' }
            : { type: 'send_message' as const, message: b.message || '' },
      }));
    return {
      schema: [],
      layout: [{ type: 'card', id: 'derived_card', title: config.title || tool.title || '', children }],
    };
  }

  if (tool?.kind === 'lead' || tool?.kind === 'form') {
    const schema = (config.fields || [])
      .filter((f) => (f.key || f.name) && f.label && f.enabled !== false)
      .map((f) => ({
        key: (f.key || f.name) as string,
        label: f.label as string,
        type: (FIELD_TYPES_FOR_WIDGET.includes(f.type || '') ? f.type : 'text') as WidgetConfig['schema'][number]['type'],
        required: f.required === true,
        ...(f.placeholder ? { placeholder: f.placeholder } : {}),
      }));
    const children: WidgetConfig['layout'][number]['children'] = [];
    if (schema.length) {
      children.push({ type: 'form', id: 'derived_form', fields: schema.map((s) => s.key) });
    }
    children.push({ type: 'button', id: 'derived_submit', label: 'Submit', onClick: { type: 'submit' } });
    return {
      schema,
      layout: [{ type: 'card', id: 'derived_card', title: tool.title || '', children }],
    };
  }

  return buildStarterWidgetConfig();
};

// When a widget override exists, the Fields section must reflect the widget's
// own schema (not the raw config.fields) so that every edit made in the field
// editor is reflected in the widget preview. Ported from Chatwoot's
// CollectLeadsForm.deriveLeadFieldsFromWidget.
export const deriveLeadFieldsFromWidget = (
  widget: WidgetConfig | null | undefined,
): { key: string; label: string; type: string; required: boolean; enabled: boolean; placeholder?: string }[] => {
  if (!widget?.schema?.length) return [];
  return widget.schema.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type || 'text',
    required: f.required === true,
    enabled: true,
    placeholder: f.placeholder || '',
  }));
};

// Same as above but for form-kind fields (no enabled toggle).
export const deriveFormFieldsFromWidget = (
  widget: WidgetConfig | null | undefined,
): { key: string; label: string; type: string; required: boolean; placeholder?: string }[] => {
  if (!widget?.schema?.length) return [];
  return widget.schema.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type || 'text',
    required: f.required === true,
    placeholder: f.placeholder || '',
  }));
};

export const SOURCE_WIDGET_ID_KEY = 'source_widget_id';

// Sets/removes the `source_widget_id` link on a tool's config — the library
// widget an assigned design was copied from. Ported from Chatwoot's templates.js.
export const withSourceWidgetId = (
  config: Record<string, unknown> | null | undefined,
  sourceWidgetId: number | null | undefined,
): Record<string, unknown> => {
  const next = { ...(config || {}) };
  const id = sourceWidgetId == null || sourceWidgetId === ('' as unknown) ? null : Number(sourceWidgetId);
  if (id) next[SOURCE_WIDGET_ID_KEY] = id;
  else delete next[SOURCE_WIDGET_ID_KEY];
  return next;
};

// The library picker emits either a bare config or `{ widget, sourceWidgetId }`.
export const unwrapLibrarySelect = (
  payload: WidgetConfig | { widget: WidgetConfig; sourceWidgetId?: number | null } | null | undefined,
): { widget: WidgetConfig | null; sourceWidgetId: number | null } => {
  if (!payload) return { widget: null, sourceWidgetId: null };
  if ('widget' in payload && payload.widget) {
    return { widget: payload.widget, sourceWidgetId: payload.sourceWidgetId ?? null };
  }
  return { widget: payload as WidgetConfig, sourceWidgetId: null };
};

// A "state" is a layout node carrying its own `visibleWhen`; a "function" is a
// button whose onClick does something other than submit. Recursive, so nested
// cards/forms count too. Ported from WidgetSection.vue.
const walkLayout = (nodes: WidgetConfig['layout'] | undefined, score: (n: WidgetConfig['layout'][number]) => number): number =>
  (nodes || []).reduce(
    (count, node) => count + score(node) + walkLayout(node.children as WidgetConfig['layout'] | undefined, score),
    0,
  );

export const countWidgetStates = (layout: WidgetConfig['layout'] | undefined): number =>
  walkLayout(layout, (n) => (n.visibleWhen ? 1 : 0));

export const countWidgetFunctions = (layout: WidgetConfig['layout'] | undefined): number =>
  walkLayout(layout, (n) => (n.onClick && n.onClick.type !== 'submit' ? 1 : 0));
