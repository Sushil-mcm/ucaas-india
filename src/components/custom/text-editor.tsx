import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { createEditor, Editor, Transforms, Range } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { css } from '@emotion/css';
import {
  BlockButton,
  CHARACTERS,
  ElementRender,
  insertMention,
  Leaf,
  MarkButton,
  Toolbar,
  withLinks,
  withMentions,
} from '@/lib/slate-utils';

const TextEditor = ({
  initialValue,
  onChange,
  readOnly = false,
  placeholder = 'Type something...',
  maxHeight = 'max-h-[calc(100vh_-_25.625rem)]',
}: any) => {
  const editor = useMemo(() => withMentions(withLinks(withReact(withHistory(createEditor())))), []);
  const [mentionSearch, setMentionSearch] = useState('');
  const [target, setTarget] = useState(null);
  const [index, setIndex] = useState(0);
  const ref = useRef<any>(null);
  const chars = CHARACTERS.filter((c) =>
    c.toLowerCase().startsWith(mentionSearch.toLowerCase()),
  ).slice(0, 5);

  useEffect(() => {
    if (target && chars.length > 0 && ref.current) {
      const domRange = ReactEditor.toDOMRange(editor as any, target);
      const rect = domRange.getBoundingClientRect();
      ref.current.style.top = `${rect.top + window.scrollY + 24}px`;
      ref.current.style.left = `${rect.left + window.scrollX}px`;
    }
  }, [chars.length, editor, index, mentionSearch, target]);

  const onKeyDown = useCallback(
    (e: any) => {
      if (target) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setIndex((prev) => (prev >= chars.length - 1 ? 0 : prev + 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setIndex((prev) => (prev <= 0 ? chars.length - 1 : prev - 1));
            break;
          case 'Enter':
            e.preventDefault();
            Transforms.select(editor, target);
            insertMention(editor, chars[index]);
            setTarget(null);
            break;
          case 'Escape':
            e.preventDefault();
            setTarget(null);
            break;
        }
      }
    },
    [chars, index, target],
  );

  const handleChange = (newValue: any) => {
    onChange?.(newValue);

    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);
      const path = start.path;
      const blockStart = Editor.start(editor, path.slice(0, -1));
      const beforeRange = { anchor: blockStart, focus: start };
      const beforeText = Editor.string(editor, beforeRange);
      const beforeMatch = beforeText.match(/(?:^|\s)@(\w*)$/);

      const after = Editor.after(editor, start);
      const afterRange = after && Editor.range(editor, start, after);
      const afterText = afterRange ? Editor.string(editor, afterRange) : '';
      const afterMatch = afterText.match(/^(\s|$)/);

      if (beforeMatch && afterMatch) {
        const mentionSearchText = beforeMatch[1];
        const atPosition = Editor.before(editor, start, {
          distance: mentionSearchText.length + 1,
          unit: 'character',
        });

        if (atPosition) {
          setTarget({ anchor: atPosition, focus: start } as any);
          setMentionSearch(mentionSearchText);
          setIndex(0);
          return;
        }
      }
    }
    setTarget(null);
  };

  return (
    <Slate editor={editor as any} initialValue={initialValue} onChange={handleChange}>
      <div className="flex flex-col h-full w-full">
        {!readOnly && (
          // <div className="mb-2 shrink-0">
          <Toolbar>
            <MarkButton format="bold" icon="format_bold" />
            <MarkButton format="italic" icon="format_italic" />
            <MarkButton format="underline" icon="format_underlined" />
            <MarkButton format="code" icon="code" />
            <BlockButton format="numbered-list" icon="format_list_numbered" />
            <BlockButton format="bulleted-list" icon="format_list_bulleted" />
          </Toolbar>
          // </div>
        )}

        {/* <div className="flex-1 overflow-y-auto border rounded-lg p-2"> */}
        <Editable
          className={`overflow-y-auto overflow-x-hidden break-words h-full ${maxHeight} outline-0`}
          // className={`overflow-y-auto h-full max-h-[calc(100vh_-_14.5rem)] outline-0`}
          readOnly={readOnly}
          renderLeaf={(props) => <Leaf {...props} />}
          renderElement={(props) => <ElementRender {...props} />}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          autoFocus={true}
        />
        {/* </div> */}
      </div>

      {target && chars.length > 0 && (
        <div
          ref={ref}
          className={css`
            position: absolute;
            z-index: 999;
            padding: 4px;
            background: white;
            border-radius: 4px;
            box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
          `}
        >
          {chars?.map((char, i) => (
            <div
              key={char}
              onMouseDown={() => {
                Transforms.select(editor, target);
                insertMention(editor, char);
                setTarget(null);
              }}
              className={css`
                padding: 3px 6px;
                cursor: pointer;
                background: ${i === index ? '#B4D5FF' : 'transparent'};
              `}
            >
              {char}
            </div>
          ))}
        </div>
      )}
    </Slate>
  );
};

export default TextEditor;
