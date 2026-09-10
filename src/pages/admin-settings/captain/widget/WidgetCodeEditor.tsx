// A plain monospace editor for the widget's { schema, layout } JSON. No editor
// dependency in this app, so it's a styled <textarea> with a line-number gutter.
// Debouncing / parse-error handling lives in the parent (WidgetBuilder).

import { useLayoutEffect, useRef } from 'react';

export default function WidgetCodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lineCount = value.split('\n').length;

  useLayoutEffect(() => {
    const ta = taRef.current;
    const gutter = gutterRef.current;
    if (!ta || !gutter) return;
    const sync = () => {
      gutter.scrollTop = ta.scrollTop;
    };
    ta.addEventListener('scroll', sync);
    return () => ta.removeEventListener('scroll', sync);
  }, []);

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card font-mono text-[13px]">
      <div
        ref={gutterRef}
        aria-hidden
        className="select-none overflow-hidden bg-gray-50 dark:bg-muted px-3 py-3 text-right text-gray-300 dark:text-muted-foreground"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="leading-[1.5]">
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        wrap="off"
        className="flex-1 resize-none overflow-auto bg-transparent px-3 py-3 leading-[1.5] text-gray-900 dark:text-foreground outline-none"
      />
    </div>
  );
}
