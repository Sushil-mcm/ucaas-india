// The config <-> draft bridge for the widget builder. A faithful port of the
// pure functions in Chatwoot's WidgetBuilder.vue: it turns a { schema, layout }
// config into an editable draft (fields / buttons / states / preserved nodes),
// and serialises a draft back into { schema, layout }. Used by the live preview,
// the Save-dirty check, and the Code & States tabs.

import { LABEL_FONT_SIZES, BUTTON_ALIGNMENTS, VISIBILITY_OPS_WITHOUT_VALUE, WIDGET_BUTTON_ACTIONS } from './templates';
import type {
  StyleBag,
  VisibilityRule,
  WidgetConfig,
  WidgetField,
  WidgetNode,
} from './types';

// ── editing-only condition tree ("kind" discriminated) ────────────────────────

export type EditCondition = { kind: 'condition'; field: string; op: string; value: string };
export type EditGroup = { kind: 'group'; combinator: 'and' | 'or'; conditions: EditNode[] };
export type EditNode = EditCondition | EditGroup;

export type DraftField = {
  name: string;
  label: string;
  type: WidgetField['type'];
  options: { value: string; label: string }[] | null;
  required: boolean;
  placeholder: string;
  labelFontSize: string;
  inputWidth: string;
  color: string;
  borderColor: string;
  style: StyleBag | null;
  labelStyle: StyleBag | null;
  visibility: EditGroup | null;
};

export type DraftButton = {
  label: string;
  action: string;
  url: string;
  message: string;
  toolSlug: string;
  color: string;
  borderColor: string;
  textColor: string;
  width: string;
  align: string;
  style: StyleBag | null;
  visibility: EditGroup | null;
};

export type DraftState = { visibility: EditGroup; targets: { kind: 'field' | 'button'; id: string | number }[] };

export type DraftChild = WidgetNode & { visibility: EditGroup | null };

export type DraftBundle = {
  cardTitle: string;
  cardWidth: string;
  cardStyle: StyleBag | null;
  cardTitleStyle: StyleBag | null;
  formStyle: StyleBag | null;
  fields: DraftField[];
  buttons: DraftButton[];
  states: DraftState[];
  cardChildren: DraftChild[];
};

// ── small pure helpers ───────────────────────────────────────────────────────

export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const styleFrom = (source: unknown): StyleBag | null =>
  source && typeof source === 'object' && Object.keys(source as object).length ? { ...(source as StyleBag) } : null;

export const slugify = (s: string): string =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'field';

export const newCondition = (): EditCondition => ({ kind: 'condition', field: '', op: 'eq', value: '' });
export const newConditionGroup = (): EditGroup => ({ kind: 'group', combinator: 'and', conditions: [newCondition()] });

// ── visibility converters ────────────────────────────────────────────────────

const conditionFromBackend = (raw: any): EditNode => {
  if (raw?.combinator) {
    return {
      kind: 'group',
      combinator: raw.combinator === 'or' ? 'or' : 'and',
      conditions: (raw.conditions || []).map(conditionFromBackend),
    };
  }
  return { kind: 'condition', field: raw?.field || '', op: raw?.op || 'eq', value: raw?.value ?? '' };
};

// The root of a target's visibility is always edited as a group, even when the
// saved config is a single flat condition.
export const visibilityFromBackend = (raw: any): EditGroup | null => {
  if (!raw) return null;
  const node = conditionFromBackend(raw);
  return node.kind === 'group' ? node : { kind: 'group', combinator: 'and', conditions: [node] };
};

const pruneCondition = (node: EditNode): EditNode | null => {
  if (node.kind === 'group') {
    const conditions = node.conditions.map(pruneCondition).filter(Boolean) as EditNode[];
    return conditions.length ? { ...node, conditions } : null;
  }
  if (!node.field) return null;
  if (!VISIBILITY_OPS_WITHOUT_VALUE.includes(node.op) && !node.value) return null;
  return node;
};

const conditionToBackend = (node: EditNode): any => {
  if (node.kind === 'group') {
    return { combinator: node.combinator, conditions: node.conditions.map(conditionToBackend) };
  }
  const condition: any = { field: node.field, op: node.op };
  if (!VISIBILITY_OPS_WITHOUT_VALUE.includes(node.op)) condition.value = node.value;
  return condition;
};

export const buildVisibleWhen = (visibility: EditNode | null | undefined): VisibilityRule | null => {
  if (!visibility) return null;
  const pruned = pruneCondition(visibility);
  if (!pruned) return null;
  const backend = conditionToBackend(pruned);
  // A root group holding exactly one plain condition simplifies to that bare
  // condition — the flat shape a single-condition widget has always produced.
  if (
    pruned.kind === 'group' &&
    Array.isArray(backend.conditions) &&
    backend.conditions.length === 1 &&
    pruned.conditions[0].kind === 'condition'
  ) {
    return backend.conditions[0];
  }
  return backend;
};

export const conditionFieldKeys = (node: EditNode | null | undefined): string[] => {
  if (!node) return [];
  if (node.kind === 'group') return node.conditions.flatMap(conditionFieldKeys);
  return node.field ? [node.field] : [];
};

// ── states ───────────────────────────────────────────────────────────────────

const targetMatches = (target: DraftState['targets'][number], kind: string, id: string | number) =>
  target.kind === kind && target.id === id;

const deriveStates = (fieldsState: DraftField[], buttonsState: DraftButton[]): DraftState[] => {
  const groups = new Map<string, DraftState>();
  const add = (visibility: EditGroup | null, target: DraftState['targets'][number]) => {
    if (!visibility) return;
    const key = stableStringify(visibility);
    if (!groups.has(key)) groups.set(key, { visibility, targets: [] });
    groups.get(key)!.targets.push(target);
  };
  fieldsState.forEach((f) => add(f.visibility, { kind: 'field', id: f.name }));
  buttonsState.forEach((b, index) => add(b.visibility, { kind: 'button', id: index }));
  return [...groups.values()];
};

// A field its own state tests can never be hidden by it.
export const visibilityForTarget = (
  statesList: DraftState[],
  kind: 'field' | 'button',
  id: string | number,
): EditGroup | null => {
  const state = statesList.find((candidate) =>
    candidate.targets.some((target) => targetMatches(target, kind, id)),
  );
  if (!state) return null;
  if (kind === 'field' && conditionFieldKeys(state.visibility).includes(id as string)) return null;
  return state.visibility;
};

// ── config -> draft ──────────────────────────────────────────────────────────

export const deriveDraftState = (config: WidgetConfig): DraftBundle => {
  const card = (config.layout || [])[0] || ({} as WidgetNode);
  const schemaByKey: Record<string, WidgetField> = Object.fromEntries(
    (config.schema || []).map((field) => [field.key, field]),
  );
  const children = card.children || [];
  const formNode = children.find((child) => child.type === 'form');

  const fieldsState: DraftField[] = [];
  (formNode?.fields || []).forEach((key) => {
    const field = schemaByKey[key];
    if (!field) return;
    fieldsState.push({
      name: field.key,
      label: field.label || '',
      type: field.type,
      options: field.options || null,
      required: field.required === true,
      placeholder: field.placeholder || '',
      labelFontSize: LABEL_FONT_SIZES.includes(field.labelFontSize as string) ? (field.labelFontSize as string) : '',
      inputWidth: field.inputWidth || '',
      color: field.color || '',
      borderColor: field.borderColor || '',
      style: styleFrom(field.style),
      labelStyle: styleFrom(field.labelStyle),
      visibility: visibilityFromBackend(field.visibleWhen),
    });
  });

  const buttonsState: DraftButton[] = [];
  children
    .filter((child) => child.type === 'button')
    .forEach((button) => {
      const onClick: any = button.onClick || {};
      const action = onClick.type === 'navigate' ? 'open_url' : onClick.type;
      buttonsState.push({
        label: button.label || '',
        action: (WIDGET_BUTTON_ACTIONS as readonly string[]).includes(action) ? action : 'submit',
        url: onClick.url || '',
        message: onClick.message || '',
        toolSlug: onClick.tool_slug || '',
        color: button.color || '',
        borderColor: button.borderColor || '',
        textColor: button.textColor || '',
        width: button.width || '',
        align: BUTTON_ALIGNMENTS.includes(button.align as string) ? (button.align as string) : '',
        style: styleFrom(button.style),
        visibility: visibilityFromBackend(button.visibleWhen),
      });
    });

  return {
    cardTitle: card.title || '',
    cardWidth: card.width || '',
    cardStyle: styleFrom(card.style),
    cardTitleStyle: styleFrom(card.titleStyle),
    formStyle: styleFrom(formNode?.style),
    fields: fieldsState,
    buttons: buttonsState,
    states: deriveStates(fieldsState, buttonsState),
    cardChildren: children.map((child) => ({
      ...child,
      visibility: visibilityFromBackend(child.visibleWhen),
    })),
  };
};

// ── draft -> config ──────────────────────────────────────────────────────────

export const schemaFromFields = (fieldsList: DraftField[], statesList: DraftState[] = []): WidgetField[] =>
  fieldsList
    .filter((field) => field.label)
    .map((field) => {
      const visibleWhen = buildVisibleWhen(visibilityForTarget(statesList, 'field', field.name));
      return {
        key: field.name || slugify(field.label),
        label: field.label,
        type: field.type || 'text',
        required: field.required === true,
        ...(field.options ? { options: field.options } : {}),
        ...(field.placeholder ? { placeholder: field.placeholder } : {}),
        ...(field.labelFontSize ? { labelFontSize: field.labelFontSize as WidgetField['labelFontSize'] } : {}),
        ...(field.inputWidth ? { inputWidth: field.inputWidth } : {}),
        ...(field.color ? { color: field.color } : {}),
        ...(field.borderColor ? { borderColor: field.borderColor } : {}),
        ...(field.style ? { style: field.style } : {}),
        ...(field.labelStyle ? { labelStyle: field.labelStyle } : {}),
        ...(visibleWhen ? { visibleWhen } : {}),
      } as WidgetField;
    });

const buildOnClick = (button: DraftButton) => {
  if (button.action === 'open_url') return { type: 'navigate', url: button.url };
  if (button.action === 'send_message') return { type: 'send_message', message: button.message };
  if (button.action === 'call_tool') return { type: 'call_tool', tool_slug: button.toolSlug };
  if (button.action === 'dismiss') return { type: 'dismiss' };
  return { type: 'submit' };
};

const BUILDER_OWNED_FORM_KEYS = ['type', 'id', 'fields', 'style'];

const childWithVisibility = (child: DraftChild): WidgetNode => {
  const { visibility, visibleWhen: _saved, ...rest } = child as DraftChild & { visibleWhen?: unknown };
  const built = buildVisibleWhen(visibility);
  return { ...(rest as WidgetNode), ...(built ? { visibleWhen: built } : {}) };
};

const childrenFromTemplate = (
  template: DraftChild[],
  formNode: WidgetNode | null,
  buttonNodes: WidgetNode[],
): WidgetNode[] => {
  if (!template.length) return [...(formNode ? [formNode] : []), ...buttonNodes];

  const out: WidgetNode[] = [];
  let formPlaced = false;
  let buttonIndex = 0;

  template.forEach((child) => {
    if (!formPlaced && child.type === 'form') {
      formPlaced = true;
      if (!formNode) return;
      const preservedEntries = Object.entries(childWithVisibility(child)).filter(
        ([key]) => !BUILDER_OWNED_FORM_KEYS.includes(key),
      );
      out.push({ ...Object.fromEntries(preservedEntries), ...formNode } as WidgetNode);
      return;
    }
    if (child.type === 'button') {
      const replacement = buttonNodes[buttonIndex];
      buttonIndex += 1;
      if (replacement) out.push(replacement);
      return;
    }
    out.push(childWithVisibility(child));
  });

  if (formNode && !formPlaced) out.unshift(formNode);
  out.push(...buttonNodes.slice(buttonIndex));
  return out;
};

export const layoutFromState = (
  cardTitle: string,
  fieldsList: DraftField[],
  buttonsList: DraftButton[],
  cardWidth = '',
  cardStyle: StyleBag | null = null,
  formStyle: StyleBag | null = null,
  cardTitleStyle: StyleBag | null = null,
  templateChildren: DraftChild[] = [],
  statesList: DraftState[] = [],
): WidgetNode[] => {
  const schema = schemaFromFields(fieldsList, statesList);
  const formNode: WidgetNode | null = schema.length
    ? {
        type: 'form',
        id: 'preview_form',
        fields: schema.map((f) => f.key),
        ...(formStyle ? { style: formStyle } : {}),
      }
    : null;

  const buttonNodes: WidgetNode[] = buttonsList
    .filter((button) => button.label)
    .map((button, index) => {
      const visibleWhen = buildVisibleWhen(visibilityForTarget(statesList, 'button', index));
      return {
        type: 'button',
        id: `preview_button_${index}`,
        label: button.label,
        onClick: buildOnClick(button) as WidgetNode['onClick'],
        ...(button.color ? { color: button.color } : {}),
        ...(button.borderColor ? { borderColor: button.borderColor } : {}),
        ...(button.textColor ? { textColor: button.textColor } : {}),
        ...(button.width ? { width: button.width } : {}),
        ...(button.align ? { align: button.align as WidgetNode['align'] } : {}),
        ...(button.style ? { style: button.style } : {}),
        ...(visibleWhen ? { visibleWhen } : {}),
      } as WidgetNode;
    });

  const children = childrenFromTemplate(templateChildren, formNode, buttonNodes);

  return [
    {
      type: 'card',
      id: 'preview_card',
      title: cardTitle,
      ...(cardWidth ? { width: cardWidth } : {}),
      ...(cardStyle ? { style: cardStyle } : {}),
      ...(cardTitleStyle ? { titleStyle: cardTitleStyle } : {}),
      children,
    },
  ];
};

// derive -> serialize, used to compute the "nothing changed yet" baseline.
export const configOutputFor = (config: WidgetConfig): WidgetConfig => {
  const s = deriveDraftState(config);
  return {
    schema: schemaFromFields(s.fields, s.states),
    layout: layoutFromState(
      s.cardTitle,
      s.fields,
      s.buttons,
      s.cardWidth,
      s.cardStyle,
      s.formStyle,
      s.cardTitleStyle,
      s.cardChildren,
      s.states,
    ),
  };
};
