/* Things a call script can ask the agent to fill in, and a page it can show.
 *
 * A script is stored as an array of rich-text nodes (see text-editor.tsx and
 * starting-templates.ts). Two more node types live in that same array, or in
 * whatever array of nodes a page of the script carries - the finders below
 * walk every array they meet, so a script split into pages is read the same
 * way as a flat one:
 *
 *   { type: 'input', kind: 'checkbox' | 'dropdown' | 'number' | 'text',
 *     key, label, options?, required?, children: [{ text: '' }] }
 *   { type: 'embed', url, height, children: [{ text: '' }] }
 *
 * Both are void blocks: the editor draws a chip for them and never lets a
 * caret inside. The empty `children` is what the editor library requires of
 * every element; it carries no content.
 *
 * `key` is what an answer is saved under, on the call and on the campaign
 * lead. It is made from the label unless the admin types one, and it is kept
 * stable so the same question asked on two calls lands in the same place.
 *
 * An embed's URL may carry {{Group.Field}} placeholders (the same ones the
 * script text uses, see script-variables.ts); each value is URL-encoded when
 * it is filled in, and only an http(s) page is ever shown. */

import type { ScriptVariableValues } from '@/lib/script-variables';

export type ScriptInputKind = 'checkbox' | 'dropdown' | 'number' | 'text';

export const SCRIPT_INPUT_KINDS: Array<{ kind: ScriptInputKind; label: string; hint: string }> = [
  { kind: 'checkbox', label: 'Checkbox', hint: 'A yes or no the agent ticks.' },
  { kind: 'dropdown', label: 'Dropdown', hint: 'One choice from a list you write.' },
  { kind: 'number', label: 'Number', hint: 'A quantity, an age, an amount.' },
  { kind: 'text', label: 'Short text', hint: 'A line the agent types.' },
];

export interface ScriptInputNode {
  type: 'input';
  kind: ScriptInputKind;
  key: string;
  label: string;
  options?: string[];
  required?: boolean;
  children: Array<{ text: string }>;
}

export interface ScriptEmbedNode {
  type: 'embed';
  url: string;
  height: number;
  children: Array<{ text: string }>;
}

export type ScriptAnswerValue = string | number | boolean | null;
export type ScriptAnswers = Record<string, ScriptAnswerValue>;

export interface ScriptAnswerProblem {
  key: string;
  label: string;
  message: string;
}

export const MAX_TEXT_ANSWER = 500;
export const MAX_ANSWER_KEYS = 50;
export const EMBED_MIN_HEIGHT = 120;
export const EMBED_MAX_HEIGHT = 1200;
export const EMBED_DEFAULT_HEIGHT = 360;

const KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const VOID_CHILDREN = [{ text: '' }];

/* "Interested in upgrade?" -> "interested_in_upgrade". A key is an identifier
   the record is saved under, so it is lower-case, no spaces, never empty. */
export const keyFromLabel = (label: unknown): string => {
  let key = String(label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  if (!key) key = 'answer';
  if (!/^[a-z]/.test(key)) key = `a_${key}`.slice(0, 64);
  return key;
};

export const isValidKey = (key: unknown): boolean => KEY_PATTERN.test(String(key ?? ''));

const cleanOptions = (raw: unknown): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  (Array.isArray(raw) ? raw : [])
    .map((o) => String(o ?? '').trim())
    .filter(Boolean)
    .forEach((o) => {
      if (seen.has(o)) return;
      seen.add(o);
      out.push(o);
    });
  return out;
};

/* A stored node as a well-formed input, or null when it cannot be one - a
   dropdown without options, an unknown kind, a key that is not a key. */
export const normaliseInputNode = (raw: unknown): ScriptInputNode | null => {
  if (!raw || typeof raw !== 'object') return null;
  const node = raw as Record<string, unknown>;
  if (node.type !== 'input') return null;
  const kind = String(node.kind || '') as ScriptInputKind;
  if (!SCRIPT_INPUT_KINDS.some((k) => k.kind === kind)) return null;
  const label = String(node.label ?? '').trim();
  const key = isValidKey(node.key) ? String(node.key) : keyFromLabel(label);
  if (!label && !isValidKey(node.key)) return null;
  const options = cleanOptions(node.options);
  if (kind === 'dropdown' && options.length === 0) return null;
  return {
    type: 'input',
    kind,
    key,
    label: label || key,
    ...(kind === 'dropdown' ? { options } : {}),
    required: Boolean(node.required),
    children: VOID_CHILDREN,
  };
};

export const makeInputNode = (
  kind: ScriptInputKind,
  label: string,
  extra: { key?: string; options?: string[]; required?: boolean } = {},
): ScriptInputNode | null =>
  normaliseInputNode({
    type: 'input',
    kind,
    label,
    key: extra.key && isValidKey(extra.key) ? extra.key : keyFromLabel(label),
    options: extra.options,
    required: extra.required,
  });

export const clampEmbedHeight = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return EMBED_DEFAULT_HEIGHT;
  return Math.max(EMBED_MIN_HEIGHT, Math.min(EMBED_MAX_HEIGHT, Math.round(n)));
};

export const normaliseEmbedNode = (raw: unknown): ScriptEmbedNode | null => {
  if (!raw || typeof raw !== 'object') return null;
  const node = raw as Record<string, unknown>;
  if (node.type !== 'embed') return null;
  const url = String(node.url ?? '').trim();
  if (!isSafeEmbedUrl(url, true)) return null;
  return { type: 'embed', url, height: clampEmbedHeight(node.height), children: VOID_CHILDREN };
};

export const makeEmbedNode = (url: string, height?: unknown): ScriptEmbedNode | null =>
  normaliseEmbedNode({ type: 'embed', url, height });

export const isScriptInputNode = (node: unknown): boolean =>
  Boolean(node && typeof node === 'object' && (node as any).type === 'input');
export const isScriptEmbedNode = (node: unknown): boolean =>
  Boolean(node && typeof node === 'object' && (node as any).type === 'embed');

/* Every node of one type, wherever it sits: the top-level array, a list's
   children, a page's body. Every array-valued property is walked, so a script
   model that grows pages or branches needs no change here. */
const collect = <T,>(nodes: unknown, pick: (node: unknown) => T | null): T[] => {
  const out: T[] = [];
  const seen = new Set<unknown>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    const hit = pick(node);
    if (hit) out.push(hit);
    Object.values(node as Record<string, unknown>).forEach((value) => {
      if (Array.isArray(value)) walk(value);
    });
  };
  walk(nodes);
  return out;
};

/* The questions a script asks, in reading order, one per key. A key used
   twice keeps the first definition: two answers cannot share a slot. */
export const scriptInputsIn = (nodes: unknown): ScriptInputNode[] => {
  const seen = new Set<string>();
  return collect(nodes, normaliseInputNode).filter((input) => {
    if (seen.has(input.key)) return false;
    seen.add(input.key);
    return true;
  });
};

export const scriptEmbedsIn = (nodes: unknown): ScriptEmbedNode[] =>
  collect(nodes, normaliseEmbedNode);

/* One raw answer, as the record should hold it. `error` is a sentence for the
   agent; `value` is null when there is no usable answer. */
export const cleanAnswer = (
  input: ScriptInputNode,
  raw: unknown,
): { value: ScriptAnswerValue; error?: string } => {
  const missing = raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim());
  switch (input.kind) {
    case 'checkbox': {
      const on = raw === true || raw === 'true' || raw === 1 || raw === '1' || raw === 'yes';
      if (input.required && !on) return { value: false, error: `${input.label} must be ticked.` };
      return { value: on };
    }
    case 'number': {
      if (missing) {
        return input.required
          ? { value: null, error: `${input.label} needs a number.` }
          : { value: null };
      }
      const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
      if (!Number.isFinite(n)) return { value: null, error: `${input.label} must be a number.` };
      return { value: n };
    }
    case 'dropdown': {
      if (missing) {
        return input.required
          ? { value: null, error: `${input.label} needs a choice.` }
          : { value: null };
      }
      const chosen = String(raw).trim();
      if (!(input.options || []).includes(chosen)) {
        return { value: null, error: `${input.label}: "${chosen}" is not one of the choices.` };
      }
      return { value: chosen };
    }
    case 'text':
    default: {
      if (missing) {
        return input.required
          ? { value: null, error: `${input.label} needs an answer.` }
          : { value: null };
      }
      const text = String(raw).trim();
      if (text.length > MAX_TEXT_ANSWER) {
        return {
          value: text.slice(0, MAX_TEXT_ANSWER),
          error: `${input.label} is over ${MAX_TEXT_ANSWER} characters.`,
        };
      }
      return { value: text };
    }
  }
};

/* What is saved with the call: only keys the script defines, cleaned, with
   blanks left out - except a checkbox, whose "not ticked" is an answer. */
export const validateScriptAnswers = (
  inputs: ScriptInputNode[],
  answers: unknown,
): { answers: ScriptAnswers; problems: ScriptAnswerProblem[] } => {
  const given = answers && typeof answers === 'object' ? (answers as Record<string, unknown>) : {};
  const out: ScriptAnswers = {};
  const problems: ScriptAnswerProblem[] = [];
  inputs.slice(0, MAX_ANSWER_KEYS).forEach((input) => {
    const { value, error } = cleanAnswer(input, given[input.key]);
    if (error) problems.push({ key: input.key, label: input.label, message: error });
    if (input.kind === 'checkbox') out[input.key] = Boolean(value);
    else if (value !== null) out[input.key] = value;
  });
  return { answers: out, problems };
};

export const hasAnyAnswer = (answers: unknown): boolean =>
  Boolean(answers && typeof answers === 'object' && Object.keys(answers as object).length > 0);

/* Saved answers as label/text pairs for a read-only view. When the script is
   at hand its labels and order are used; otherwise the keys are made readable. */
export const answersToRows = (
  answers: unknown,
  inputs: ScriptInputNode[] = [],
): Array<{ key: string; label: string; text: string }> => {
  if (!answers || typeof answers !== 'object') return [];
  const record = answers as Record<string, unknown>;
  const labelOf = (key: string) =>
    inputs.find((i) => i.key === key)?.label ||
    key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const textOf = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    return String(value).trim();
  };
  const ordered = [
    ...inputs.map((i) => i.key).filter((k) => k in record),
    ...Object.keys(record).filter((k) => !inputs.some((i) => i.key === k)),
  ];
  return ordered
    .map((key) => ({ key, label: labelOf(key), text: textOf(record[key]) }))
    .filter((row) => row.text !== '');
};

/* Same syntax as script-variables.ts, kept in step by the test. */
const TOKEN_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

/* Only a web page. Anything else (javascript:, data:, file:) is refused, and
   so is a URL with placeholders still in it unless `allowTokens` says the URL
   is a template being stored rather than a page being opened. */
export const isSafeEmbedUrl = (url: unknown, allowTokens = false): boolean => {
  const text = String(url ?? '').trim();
  if (!text || /[\s<>"'`]/.test(text.replace(TOKEN_PATTERN, 'x'))) return false;
  if (!/^https?:\/\//i.test(text)) return false;
  if (!allowTokens && /\{\{/.test(text)) return false;
  return true;
};

/* The page to open on this call: each placeholder becomes the URL-encoded
   value, or nothing when the call cannot fill it. Returns '' rather than an
   unsafe address. */
export const resolveEmbedUrl = (url: unknown, values: ScriptVariableValues): string => {
  const text = String(url ?? '').trim();
  if (!isSafeEmbedUrl(text, true)) return '';
  const filled = text.replace(TOKEN_PATTERN, (_whole, token: string) =>
    encodeURIComponent(values[token.toLowerCase()] ?? ''),
  );
  return isSafeEmbedUrl(filled) ? filled : '';
};
