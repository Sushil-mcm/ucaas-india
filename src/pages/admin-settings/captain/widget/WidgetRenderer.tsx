// Renders a { schema, layout } widget config as an interactive card — the same
// component used for the library-card previews and the builder's live preview.
// Ported from Chatwoot's shared/components/WidgetRenderer.vue + WidgetNode.vue.

import { createContext, useContext, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { isNodeVisible } from './helpers/visibility';
import type { OnClick, StyleBag, WidgetField, WidgetNode as TWidgetNode } from './helpers/types';

type Values = Record<string, unknown>;

type RendererCtx = {
  schemaByKey: Record<string, WidgetField>;
  values: Values;
  setValue: (key: string, value: unknown) => void;
  widgetColor: string;
  disabled: boolean;
  invalidFieldKeys: string[];
  onAction: (onClick: OnClick & { label?: string }) => void;
};

const Ctx = createContext<RendererCtx | null>(null);
const useRendererCtx = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('WidgetNode used outside WidgetRenderer');
  return ctx;
};

const SKIPS_VALIDATION = ['dismiss'];

const LABEL_FONT_SIZE_CLASSES: Record<string, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const BUTTON_ALIGN_STYLES: Record<string, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

const resolveWidth = (width?: string) => (width === 'full' ? '100%' : width);

const customStyle = (style?: StyleBag | null): CSSProperties => {
  if (!style) return {};
  const out: Record<string, string> = { ...style };
  if (style.borderColor && !style.borderStyle) out.borderStyle = 'solid';
  return out as CSSProperties;
};

// ── recursive node ───────────────────────────────────────────────────────────

function WidgetNode({ node }: { node: TWidgetNode }) {
  const { schemaByKey, values, setValue, widgetColor, disabled, invalidFieldKeys, onAction } = useRendererCtx();

  if (!isNodeVisible(node, values)) return null;

  const isFieldInvalid = (key: string) => invalidFieldKeys.includes(key);
  const isRequired = (key: string) => !!schemaByKey[key]?.required;
  const labelSizeClass = (key: string) => LABEL_FONT_SIZE_CLASSES[schemaByKey[key]?.labelFontSize || ''] || 'text-xs';

  const fieldStyle = (key: string): CSSProperties => {
    const field = schemaByKey[key];
    return {
      ...customStyle(field?.style),
      ...(field?.inputWidth ? { width: resolveWidth(field.inputWidth) } : {}),
      ...(field?.color ? { background: field.color } : {}),
      ...(field?.borderColor ? { borderColor: field.borderColor, borderStyle: 'solid' } : {}),
    };
  };

  if (node.type === 'card') {
    return (
      <div
        className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card p-4"
        style={{ ...customStyle(node.style), ...(node.width ? { width: resolveWidth(node.width) } : {}) }}
      >
        {node.title ? (
          <p className="mb-0 text-base font-semibold text-gray-900 dark:text-foreground" style={customStyle(node.titleStyle)}>
            {node.title}
          </p>
        ) : null}
        {(node.children || []).map((child) => (
          <WidgetNode key={child.id} node={child} />
        ))}
      </div>
    );
  }

  if (node.type === 'text') {
    return <p className="mb-0 whitespace-pre-wrap text-sm text-gray-500 dark:text-muted-foreground">{node.content}</p>;
  }

  if (node.type === 'form') {
    const visibleFields = (node.fields || []).filter((key) => isNodeVisible(schemaByKey[key], values));
    return (
      <div className="flex flex-col gap-3" style={customStyle(node.style)}>
        {visibleFields.map((key) => {
          const field = schemaByKey[key];
          const invalid = isFieldInvalid(key);
          const cls = `bg-white border rounded-md text-sm text-gray-900 placeholder:text-gray-400 disabled:opacity-60 ${
            invalid ? 'border-red-400' : 'border-gray-200 dark:border-border'
          }`;
          return (
            <div key={key} className="flex flex-col gap-1">
              <label
                className={`font-medium capitalize text-gray-900 dark:text-foreground ${labelSizeClass(key)}`}
                style={customStyle(field?.labelStyle)}
              >
                {field?.label || key}
                {!isRequired(key) && <span className="ml-1 font-normal text-gray-400 dark:text-muted-foreground">(optional)</span>}
              </label>
              {field?.type === 'text_area' ? (
                <textarea
                  rows={2}
                  value={String(values[key] ?? '')}
                  placeholder={field?.placeholder}
                  disabled={disabled}
                  style={fieldStyle(key)}
                  className={`px-3 py-2 ${cls}`}
                  onChange={(e) => setValue(key, e.target.value)}
                />
              ) : field?.type === 'select' ? (
                <select
                  value={String(values[key] ?? '')}
                  disabled={disabled}
                  style={fieldStyle(key)}
                  className={`h-9 px-3 ${cls}`}
                  onChange={(e) => setValue(key, e.target.value)}
                >
                  <option value="" />
                  {(field?.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field?.type === 'email' ? 'email' : 'text'}
                  value={String(values[key] ?? '')}
                  placeholder={field?.placeholder}
                  disabled={disabled}
                  style={fieldStyle(key)}
                  className={`h-9 px-3 ${cls}`}
                  onChange={(e) => setValue(key, e.target.value)}
                />
              )}
              {invalid && <p className="mb-0 text-xs text-red-500">This field is required.</p>}
            </div>
          );
        })}
      </div>
    );
  }

  if (node.type === 'options') {
    const key = node.fields?.[0];
    const options = schemaByKey[key || '']?.options || [];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = key ? values[key] === opt.value : false;
          return (
            <button
              key={opt.value}
              type="button"
              className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
                selected ? 'border-transparent text-white' : 'border-gray-200 dark:border-border text-gray-900 dark:text-foreground hover:bg-gray-50 dark:hover:bg-muted'
              }`}
              style={selected ? { background: widgetColor } : {}}
              onClick={() => {
                if (disabled || !key) return;
                setValue(key, opt.value);
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (node.type === 'button') {
    const isSubmit = node.onClick?.type === 'submit';
    return (
      <button
        type="button"
        className={`flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
          node.textColor ? '' : 'text-white'
        }`}
        disabled={disabled && isSubmit}
        style={{
          ...customStyle(node.style),
          background: node.color || widgetColor,
          ...(node.textColor ? { color: node.textColor } : {}),
          ...(node.width ? { width: resolveWidth(node.width), flexShrink: 0 } : {}),
          ...(node.align ? { alignSelf: BUTTON_ALIGN_STYLES[node.align] } : {}),
          ...(node.borderColor
            ? { borderColor: node.borderColor, borderWidth: '2px', borderStyle: 'solid' }
            : {}),
        }}
        onClick={() => {
          if (disabled && isSubmit) return;
          if (node.onClick) onAction({ ...node.onClick, label: node.label });
        }}
      >
        {node.label}
      </button>
    );
  }

  return null;
}

// ── renderer ─────────────────────────────────────────────────────────────────

export type WidgetRendererProps = {
  schema: WidgetField[];
  layout: TWidgetNode[];
  submittedValues?: { name: string; value: unknown }[];
  prefillValues?: { name: string; value: unknown }[];
  widgetColor?: string;
  onSubmit?: (values: Values) => void;
  onInvokeFunction?: (payload: OnClick & { values: Values; valueKeys: string[]; label?: string }) => void;
};

export default function WidgetRenderer({
  schema,
  layout,
  submittedValues = [],
  prefillValues = [],
  widgetColor = '#1f2937',
  onSubmit,
  onInvokeFunction,
}: WidgetRendererProps) {
  const schemaByKey = useMemo(
    () => Object.fromEntries(schema.map((f) => [f.key, f])) as Record<string, WidgetField>,
    [schema],
  );

  const [values, setValues] = useState<Values>(() => {
    const initial: Values = {};
    prefillValues.forEach((item) => {
      initial[item.name] = item.value;
    });
    submittedValues.forEach((item) => {
      initial[item.name] = item.value;
    });
    return initial;
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const setValue = (key: string, value: unknown) => setValues((prev) => ({ ...prev, [key]: value }));

  const renderedFieldKeys = useMemo(() => {
    const keys: string[] = [];
    const walk = (nodes?: TWidgetNode[]) =>
      (nodes || []).forEach((node) => {
        if (!isNodeVisible(node, values)) return;
        if (node.type === 'form') {
          keys.push(...(node.fields || []).filter((key) => isNodeVisible(schemaByKey[key], values)));
        }
        walk(node.children);
      });
    walk(layout);
    return keys;
  }, [layout, schemaByKey, values]);

  const missingRequiredKeys = useMemo(
    () =>
      renderedFieldKeys.filter((key) => {
        if (!schemaByKey[key]?.required) return false;
        const v = values[key];
        return v === undefined || v === null || String(v).trim() === '';
      }),
    [renderedFieldKeys, schemaByKey, values],
  );

  const disabled = submittedValues.length > 0;
  const invalidFieldKeys = hasAttemptedSubmit ? missingRequiredKeys : [];

  const onAction = (onClick: OnClick & { label?: string }) => {
    if (!SKIPS_VALIDATION.includes(onClick.type)) {
      setHasAttemptedSubmit(true);
      if (missingRequiredKeys.length) return;
    }
    if (onClick.type === 'submit') {
      onSubmit?.({ ...values });
      return;
    }
    if (onClick.type === 'dismiss') {
      setIsDismissed(true);
      return;
    }
    onInvokeFunction?.({ ...onClick, values: { ...values }, valueKeys: renderedFieldKeys });
  };

  if (isDismissed) {
    return <p className="mb-0 text-sm text-gray-500 dark:text-muted-foreground">You closed this.</p>;
  }

  return (
    <Ctx.Provider value={{ schemaByKey, values, setValue, widgetColor, disabled, invalidFieldKeys, onAction }}>
      <div className="flex flex-col gap-3">
        {layout.map((node) => (
          <WidgetNode key={node.id} node={node} />
        ))}
      </div>
    </Ctx.Provider>
  );
}
