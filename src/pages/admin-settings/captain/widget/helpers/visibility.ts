// A visibility rule is either a leaf condition ({ field, op, value }) or a group
// ({ combinator: 'and' | 'or', conditions: [leaf | group, ...] }) that nests
// arbitrarily deep. Ported from Chatwoot's shared/helpers/widgetVisibility.js so
// the renderer decides what counts as on-screen by the exact rule it renders by.

import type { VisibilityCondition, VisibilityRule } from './types';

type Values = Record<string, unknown>;

const evaluateCondition = ({ field, op, value }: VisibilityCondition, values: Values): boolean => {
  const current = values[field];
  const isBlank = current === undefined || current === null || current === '';
  switch (op) {
    case 'neq':
      return current !== value;
    case 'gt':
      return Number(current) > Number(value);
    case 'lt':
      return Number(current) < Number(value);
    case 'contains':
      return String(current ?? '').includes(String(value ?? ''));
    case 'not_contains':
      return !String(current ?? '').includes(String(value ?? ''));
    case 'is_empty':
      return isBlank;
    case 'is_not_empty':
      return !isBlank;
    default:
      return current === value;
  }
};

export const evaluateVisibility = (rule: VisibilityRule | undefined | null, values: Values): boolean => {
  if (!rule) return true;
  if ('combinator' in rule) {
    const conditions = rule.conditions || [];
    return rule.combinator === 'or'
      ? conditions.some((c) => evaluateVisibility(c, values))
      : conditions.every((c) => evaluateVisibility(c, values));
  }
  return evaluateCondition(rule, values);
};

export const isNodeVisible = (
  node: { visibleWhen?: VisibilityRule } | undefined | null,
  values: Values,
): boolean => evaluateVisibility(node?.visibleWhen, values);
