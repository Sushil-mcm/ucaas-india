import { useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Code, Link2, Strikethrough, List, ListOrdered, Undo2, Redo2,
} from 'lucide-react';

type Props = {
  value: string;
  onChange: (html: string) => void;
  maxLength?: number;
  placeholder?: string;
  minHeight?: number;
};

const runCmd = (cmd: string, arg?: string) => {
  try {
    document.execCommand(cmd, false, arg);
  } catch {
    /* execCommand is deprecated but still the pragmatic choice; ignore failures */
  }
};

/** Lightweight rich-text field (contentEditable + toolbar), Chatwoot-style.
 * Emits an HTML string; the widget renders it with innerHTML. Uncontrolled
 * internally — the incoming `value` only seeds the DOM, so React never manages
 * the editable node's children and can't fight the caret. */
const RichTextField = ({ value, onChange, maxLength = 500, placeholder, minHeight = 120 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>('');
  const [count, setCount] = useState(0);

  // Seed once on mount, and re-seed only if the outside value changes to
  // something the editor didn't itself produce (e.g. switching inboxes).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if ((value || '') !== lastEmitted.current) {
      el.innerHTML = value || '';
      lastEmitted.current = value || '';
      setCount((el.textContent || '').length);
    }
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    if ((el.textContent || '').length > maxLength) {
      const trimmed = (el.textContent || '').slice(0, maxLength);
      el.textContent = trimmed;
    }
    const html = el.innerHTML;
    setCount((el.textContent || '').length);
    if (html !== lastEmitted.current) {
      lastEmitted.current = html;
      onChange(html);
    }
  };

  const btn = (title: string, Icon: any, cmd: () => void) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // keep the editor's selection
        cmd();
        emit();
        ref.current?.focus();
      }}
      className="rounded p-1.5 text-gray-500 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-muted hover:text-gray-800 dark:hover:text-foreground"
    >
      <Icon className="size-3.5" />
    </button>
  );

  return (
    <div className="rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 dark:border-border px-2 py-1">
        {btn('Bold', Bold, () => runCmd('bold'))}
        {btn('Italic', Italic, () => runCmd('italic'))}
        {btn('Code', Code, () => runCmd('formatBlock', 'pre'))}
        {btn('Link', Link2, () => {
          const url = window.prompt('Link URL');
          if (url) runCmd('createLink', url);
        })}
        {btn('Strikethrough', Strikethrough, () => runCmd('strikeThrough'))}
        {btn('Bulleted list', List, () => runCmd('insertUnorderedList'))}
        {btn('Numbered list', ListOrdered, () => runCmd('insertOrderedList'))}
        <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-muted" />
        {btn('Undo', Undo2, () => runCmd('undo'))}
        {btn('Redo', Redo2, () => runCmd('redo'))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        style={{ minHeight }}
        className="prose prose-sm max-w-none px-3 py-2.5 text-sm text-gray-700 dark:text-foreground outline-none empty:before:text-gray-400 dark:empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
      <div className="px-3 pb-1.5 text-right text-[11px] text-gray-400 dark:text-muted-foreground">
        {count} / {maxLength}
      </div>
    </div>
  );
};

export default RichTextField;
