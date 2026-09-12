/* The two script blocks an agent interacts with: a question to answer and a
 * page to look at. See src/lib/script-inputs.ts for the stored shape.
 *
 * One component renders each block in both places it appears:
 *
 *   edit  - the script editor. A chip that says what the block is, so the
 *           admin sees "Dropdown · Plan (required)" in the flow of the text
 *           and can delete it like a word. Nothing is answerable here.
 *   run   - the agent's panel on a call. The chip becomes the control
 *           itself: a box to tick, a list to choose from, a page in a frame.
 *           Answers go up through ScriptRunContext to whoever saves them.
 *
 * The toolbar controls at the bottom insert new blocks. They ask for the few
 * things a block needs in a small form under the toolbar rather than a
 * dialog, so the admin never loses sight of where in the script it lands. */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Transforms } from 'slate';
import { ReactEditor, useSlate, type RenderElementProps } from 'slate-react';
import { ListChecks, Globe } from 'lucide-react';
import {
  SCRIPT_INPUT_KINDS,
  makeEmbedNode,
  makeInputNode,
  keyFromLabel,
  resolveEmbedUrl,
  type ScriptAnswerValue,
  type ScriptAnswers,
  type ScriptEmbedNode,
  type ScriptInputKind,
  type ScriptInputNode,
} from '@/lib/script-inputs';
import type { ScriptVariableValues } from '@/lib/script-variables';

export type ScriptRun = {
  answers: ScriptAnswers;
  onAnswer: (key: string, value: ScriptAnswerValue) => void;
  /* What fills {{Group.Field}} in an embed's URL - the same values the text uses. */
  values: ScriptVariableValues;
  /* Keys the last validation complained about, to outline the control. */
  problems?: Record<string, string>;
};

export const ScriptRunContext = createContext<ScriptRun | null>(null);

const kindLabel = (kind: ScriptInputKind) =>
  SCRIPT_INPUT_KINDS.find((k) => k.kind === kind)?.label || kind;

/* ------------------------------------------------------------ rendering */

const Chip = ({
  attributes,
  children,
  icon,
  title,
  detail,
}: {
  attributes: RenderElementProps['attributes'];
  children: ReactNode;
  icon: ReactNode;
  title: string;
  detail?: string;
}) => (
  <div
    {...attributes}
    contentEditable={false}
    className="my-1 inline-flex max-w-full select-none items-center gap-2 rounded-lg border border-dashed border-[#9fc3ff] bg-[#eef5ff] px-2.5 py-1 text-xs text-[#2b4568]"
  >
    {icon}
    <span className="font-semibold">{title}</span>
    {detail ? <span className="truncate text-[#5a7396]">{detail}</span> : null}
    {children}
  </div>
);

export const ScriptInputElement = ({ attributes, children, element }: RenderElementProps) => {
  const run = useContext(ScriptRunContext);
  const input = element as unknown as ScriptInputNode;
  const required = input.required ? ' (required)' : '';

  if (!run) {
    const detail =
      input.kind === 'dropdown' ? `${input.label}${required} · ${(input.options || []).join(' / ')}` : `${input.label}${required}`;
    return (
      <Chip
        attributes={attributes}
        icon={<ListChecks className="h-3.5 w-3.5 shrink-0" />}
        title={kindLabel(input.kind)}
        detail={detail}
      >
        {children}
      </Chip>
    );
  }

  const value = run.answers[input.key];
  const problem = run.problems?.[input.key];
  const frame = `my-1.5 rounded-lg border px-2.5 py-2 text-sm ${
    problem ? 'border-red-400 bg-red-50' : 'border-ucass-active-bg bg-[#f7f9fc]'
  }`;
  const labelText = (
    <span className="text-[13px] font-medium text-[#243a59]">
      {input.label}
      {input.required ? <span className="text-red-500"> *</span> : null}
    </span>
  );
  const control = (() => {
    switch (input.kind) {
      case 'checkbox':
        return (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-ucass-active"
              checked={value === true}
              onChange={(e) => run.onAnswer(input.key, e.target.checked)}
            />
            {labelText}
          </label>
        );
      case 'dropdown':
        return (
          <label className="flex flex-col gap-1">
            {labelText}
            <select
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => run.onAnswer(input.key, e.target.value || null)}
            >
              <option value="">Choose…</option>
              {(input.options || []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        );
      case 'number':
        return (
          <label className="flex flex-col gap-1">
            {labelText}
            <input
              type="number"
              inputMode="decimal"
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
              value={value === null || value === undefined ? '' : String(value)}
              onChange={(e) => run.onAnswer(input.key, e.target.value === '' ? null : e.target.value)}
            />
          </label>
        );
      case 'text':
      default:
        return (
          <label className="flex flex-col gap-1">
            {labelText}
            <input
              type="text"
              maxLength={500}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => run.onAnswer(input.key, e.target.value)}
            />
          </label>
        );
    }
  })();

  return (
    <div {...attributes} contentEditable={false} className={frame}>
      {control}
      {problem ? <p className="mt-1 text-xs text-red-600">{problem}</p> : null}
      {children}
    </div>
  );
};

export const ScriptEmbedElement = ({ attributes, children, element }: RenderElementProps) => {
  const run = useContext(ScriptRunContext);
  const embed = element as unknown as ScriptEmbedNode;
  const src = useMemo(() => (run ? resolveEmbedUrl(embed.url, run.values) : ''), [run, embed.url]);

  if (!run) {
    return (
      <Chip
        attributes={attributes}
        icon={<Globe className="h-3.5 w-3.5 shrink-0" />}
        title="Embedded page"
        detail={`${embed.url} · ${embed.height}px`}
      >
        {children}
      </Chip>
    );
  }
  return (
    <div {...attributes} contentEditable={false} className="my-1.5">
      {src ? (
        <iframe
          title="Embedded page"
          src={src}
          style={{ height: embed.height }}
          className="w-full rounded-lg border border-ucass-active-bg bg-white"
          /* The page keeps its own cookies and scripts, may open a new tab,
             and cannot steer this tab anywhere. */
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 px-2.5 py-2 text-xs text-gray-500">
          This page cannot be shown: its address is not a web page.
        </p>
      )}
      {children}
    </div>
  );
};

/* ---------------------------------------------------------- inserting */

const insertBlock = (editor: any, node: ScriptInputNode | ScriptEmbedNode) => {
  ReactEditor.focus(editor);
  const at = editor.selection ? undefined : [editor.children.length];
  /* A paragraph follows so the caret has somewhere to go after the block. */
  Transforms.insertNodes(editor, [node as any, { type: 'paragraph', children: [{ text: '' }] } as any], {
    ...(at ? { at } : {}),
    select: true,
  });
};

const field = 'h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs';

/* "Insert a question…" and "Embed a page": the toolbar's script controls.
   Drawn only in a script editor (the editor is given `variables` there). */
export const ScriptBlockTools = () => {
  const editor = useSlate();
  const [open, setOpen] = useState<ScriptInputKind | 'embed' | null>(null);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(false);
  const [url, setUrl] = useState('');
  const [height, setHeight] = useState('360');
  const [error, setError] = useState('');

  const reset = () => {
    setOpen(null);
    setLabel('');
    setKey('');
    setKeyTouched(false);
    setOptions('');
    setRequired(false);
    setUrl('');
    setHeight('360');
    setError('');
  };

  const submit = () => {
    if (open === 'embed') {
      const node = makeEmbedNode(url, height);
      if (!node) return setError('Enter a web address that starts with http:// or https://.');
      insertBlock(editor, node);
      return reset();
    }
    if (!open) return;
    const node = makeInputNode(open, label.trim(), {
      key: (keyTouched ? key : keyFromLabel(label)).trim(),
      options: options.split('\n'),
      required,
    });
    if (!node) {
      return setError(
        open === 'dropdown' ? 'Give it a label and at least one choice, one per line.' : 'Give it a label.',
      );
    }
    insertBlock(editor, node);
    reset();
  };

  return (
    <span className="relative ml-2 inline-flex items-center gap-2">
      <select
        className="h-7 max-w-[170px] rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700"
        value=""
        title="Insert a question the agent answers on the call"
        onChange={(event) => {
          const kind = event.target.value as ScriptInputKind;
          event.target.value = '';
          if (!kind) return;
          reset();
          setOpen(kind);
        }}
      >
        <option value="">Insert a question…</option>
        {SCRIPT_INPUT_KINDS.map((k) => (
          <option key={k.kind} value={k.kind} title={k.hint}>
            {k.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="h-7 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700"
        title="Show a web page beside the script, with the caller's details in its address"
        onMouseDown={(e) => {
          e.preventDefault();
          reset();
          setOpen('embed');
        }}
      >
        Embed a page
      </button>

      {open ? (
        <div
          className="absolute left-0 top-9 z-30 w-[300px] rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {open === 'embed' ? (
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-gray-800">Embedded page</p>
              <label className="flex flex-col gap-1">
                Web address
                <input
                  className={field}
                  value={url}
                  autoFocus
                  placeholder="https://crm.example/lead?phone={{Customer.Number}}"
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <p className="text-[11px] text-gray-500">
                Placeholders such as {'{{Customer.Number}}'} are filled in on every call.
              </p>
              <label className="flex flex-col gap-1">
                Height (pixels, 120 to 1200)
                <input className={field} type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-gray-800">{kindLabel(open)}</p>
              <label className="flex flex-col gap-1">
                Label the agent sees
                <input
                  className={field}
                  value={label}
                  autoFocus
                  placeholder={open === 'checkbox' ? 'Consent given' : 'Plan of interest'}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    if (!keyTouched) setKey(keyFromLabel(e.target.value));
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                Saved as (key)
                <input
                  className={`${field} font-mono`}
                  value={key}
                  onChange={(e) => {
                    setKeyTouched(true);
                    setKey(e.target.value);
                  }}
                />
              </label>
              {open === 'dropdown' ? (
                <label className="flex flex-col gap-1">
                  Choices, one per line
                  <textarea
                    className="min-h-[64px] w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                    value={options}
                    onChange={(e) => setOptions(e.target.value)}
                  />
                </label>
              ) : null}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
                The agent must answer this before the call can be closed
              </label>
            </div>
          )}
          {error ? <p className="mt-2 text-red-600">{error}</p> : null}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="rounded-md px-2 py-1 text-gray-600" onClick={reset}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1 font-semibold text-white"
              onClick={submit}
            >
              Insert
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
};
