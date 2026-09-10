// Thin fetch wrappers for the captain-api custom-tools endpoints the widget
// feature uses. Same inline-fetch style as the other Captain pages.

import type { Assistant, CustomTool, WidgetConfig } from './types';

import { CAPTAIN_API_BASE as BASE, captainFetch } from '@/lib/captain-api';

async function jsonOrThrow(res: Response) {
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      body?.detail || body?.message || body?.error || `Request failed (${res.status})`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return body;
}

export type WidgetListResult = { items: CustomTool[]; totalCount: number; currentPage: number };

export async function listWidgets(params: {
  page?: number;
  searchKey?: string;
} = {}): Promise<WidgetListResult> {
  const qs = new URLSearchParams({ kind: 'widget', page: String(params.page || 1) });
  if (params.searchKey) qs.set('searchKey', params.searchKey);
  const body = await jsonOrThrow(await captainFetch(`${BASE}/custom_tools?${qs.toString()}`));
  return {
    items: body.payload || body.data || [],
    totalCount: body.meta?.total_count ?? (body.payload || []).length,
    currentPage: body.meta?.current_page ?? (params.page || 1),
  };
}

export async function getWidget(id: number): Promise<CustomTool> {
  return jsonOrThrow(await captainFetch(`${BASE}/custom_tools/${id}`));
}

export async function createWidget(input: {
  title: string;
  description?: string;
  config: { widget: WidgetConfig; [k: string]: unknown };
  assistantId?: number | null;
}): Promise<CustomTool> {
  return jsonOrThrow(
    await captainFetch(`${BASE}/custom_tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_tool: {
          title: input.title,
          kind: 'widget',
          description: input.description || '',
          config: input.config,
        },
        // Kept top-level too — the router reads assistant_id from the raw body.
        assistant_id: input.assistantId || undefined,
        title: input.title,
        kind: 'widget',
        description: input.description || '',
        config: input.config,
      }),
    }),
  );
}

export async function updateWidget(
  id: number,
  patch: Partial<Pick<CustomTool, 'title' | 'description' | 'config'>>,
): Promise<CustomTool> {
  return jsonOrThrow(
    await captainFetch(`${BASE}/custom_tools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_tool: patch, ...patch }),
    }),
  );
}

export async function deleteWidget(id: number): Promise<void> {
  const res = await captainFetch(`${BASE}/custom_tools/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) await jsonOrThrow(res);
}

export async function widgetAiBuilder(
  toolId: number | null,
  payload: {
    message: string;
    kind: string;
    current_config: WidgetConfig;
    history: { role: string; content: string }[];
    available_tool_slugs?: string[];
    image_data?: string;
    image_mime_type?: string;
  },
): Promise<{ config: WidgetConfig }> {
  const path = toolId
    ? `${BASE}/custom_tools/${toolId}/widget_ai_builder`
    : `${BASE}/custom_tools/widget_ai_builder`;
  return jsonOrThrow(
    await captainFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function listAssistants(): Promise<Assistant[]> {
  const body = await jsonOrThrow(await captainFetch(`${BASE}/assistants`));
  return (body.data || []).map((a: any) => ({ ...a, id: a.id }));
}

// http-kind tools on an assistant — the "Call a tool" button picker.
export async function listHttpTools(assistantId?: number | null): Promise<CustomTool[]> {
  const qs = new URLSearchParams({ page: '1' });
  if (assistantId) qs.set('assistant_id', String(assistantId));
  const body = await jsonOrThrow(await captainFetch(`${BASE}/custom_tools?${qs.toString()}`));
  return (body.payload || body.data || []).filter((t: CustomTool) => t.kind === 'http');
}

// Tools a widget design can be copied onto (Assign dialog).
const ASSIGNABLE_KINDS = ['lead', 'form', 'button', 'api_widget'];
export async function listAssignableTools(): Promise<CustomTool[]> {
  const body = await jsonOrThrow(await captainFetch(`${BASE}/custom_tools?page=1`));
  return (body.payload || body.data || []).filter((t: CustomTool) => ASSIGNABLE_KINDS.includes(t.kind));
}

// After saving a tool's widget, write the same design back to the library widget
// it was copied from (its `config.source_widget_id`), so the next copy made from
// that library widget is current. Ported from Chatwoot's syncSourceWidget:
//   - does NOT fan out — other tools copied from the same source keep their own
//     snapshots
//   - a source that was deleted, isn't a genuine `kind: 'widget'`, or is the
//     tool itself is a silent no-op, never an error
export async function syncSourceWidget(opts: {
  sourceWidgetId: number | null | undefined;
  currentToolId: number;
  widgetConfig: WidgetConfig;
}): Promise<void> {
  const { sourceWidgetId, currentToolId, widgetConfig } = opts;
  if (!sourceWidgetId || !widgetConfig) return;
  if (Number(sourceWidgetId) === Number(currentToolId)) return;

  let source: CustomTool;
  try {
    source = await getWidget(Number(sourceWidgetId));
  } catch {
    return; // library widget was deleted — the tool's own copy is already saved
  }
  if (!source?.id || source.kind !== 'widget') return;

  await updateWidget(source.id, {
    config: { ...(source.config || {}), widget: widgetConfig },
  });
}
