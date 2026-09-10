// Recursively renders one { combinator, conditions } node of a state's
// visibility tree. Controlled: the parent passes the group and gets a fully
// rebuilt group back via onChange. Ported from Chatwoot's WidgetConditionGroup.vue.

import { Plus, ListTree, Trash2 } from 'lucide-react';
import { VISIBILITY_OPS, VISIBILITY_OP_LABELS, VISIBILITY_OPS_WITHOUT_VALUE } from './helpers/templates';
import { newCondition, newConditionGroup } from './helpers/builder-transform';
import type { EditGroup, EditNode } from './helpers/builder-transform';
import type { WidgetField } from './helpers/types';

export default function WidgetConditionGroup({
  group,
  schemaFields,
  nested = false,
  onChange,
}: {
  group: EditGroup;
  schemaFields: Pick<WidgetField, 'key' | 'label'>[];
  nested?: boolean;
  onChange: (next: EditGroup) => void;
}) {
  const patchConditions = (conditions: EditNode[]) => onChange({ ...group, conditions });
  const replaceAt = (index: number, node: EditNode) =>
    patchConditions(group.conditions.map((c, i) => (i === index ? node : c)));

  return (
    <div className="flex flex-col gap-2">
      {group.conditions.length > 1 && (
        <select
          value={group.combinator}
          onChange={(e) => onChange({ ...group, combinator: e.target.value as 'and' | 'or' })}
          className="h-8 rounded-md border border-gray-300 dark:border-border bg-white dark:bg-card px-2 text-xs text-gray-900 dark:text-foreground"
        >
          <option value="and">All of</option>
          <option value="or">Any of</option>
        </select>
      )}

      {group.conditions.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          {item.kind === 'group' ? (
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted p-3">
              <WidgetConditionGroup
                group={item}
                schemaFields={schemaFields}
                nested
                onChange={(next) => replaceAt(index, next)}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <select
                value={item.field}
                onChange={(e) => replaceAt(index, { ...item, field: e.target.value })}
                className="h-9 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-2 text-sm text-gray-900 dark:text-foreground"
              >
                <option value="" disabled>
                  Select a field
                </option>
                {schemaFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label || f.key}
                  </option>
                ))}
              </select>
              <select
                value={item.op}
                onChange={(e) => replaceAt(index, { ...item, op: e.target.value })}
                className="h-9 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-2 text-sm text-gray-900 dark:text-foreground"
              >
                {VISIBILITY_OPS.map((op) => (
                  <option key={op} value={op}>
                    {VISIBILITY_OP_LABELS[op]}
                  </option>
                ))}
              </select>
              {!VISIBILITY_OPS_WITHOUT_VALUE.includes(item.op) && (
                <input
                  type="text"
                  value={item.value}
                  placeholder="e.g. yes"
                  onChange={(e) => replaceAt(index, { ...item, value: e.target.value })}
                  className="h-9 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-900 dark:text-foreground"
                />
              )}
            </div>
          )}
          {group.conditions.length > 1 && (
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center text-gray-400 dark:text-muted-foreground transition-colors hover:text-red-500 dark:hover:text-red-500"
              onClick={() => patchConditions(group.conditions.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-muted-foreground transition-colors hover:text-gray-900 dark:hover:text-foreground"
          onClick={() => patchConditions([...group.conditions, newCondition()])}
        >
          <Plus className="size-3.5" />
          Add condition
        </button>
        {!nested && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-border px-2 py-1 text-xs font-medium text-gray-500 dark:text-muted-foreground transition-colors hover:border-gray-300 dark:hover:border-border hover:text-gray-900 dark:hover:text-foreground"
            onClick={() => patchConditions([...group.conditions, newConditionGroup()])}
          >
            <ListTree className="size-3.5" />
            Add condition group
          </button>
        )}
      </div>
    </div>
  );
}
