import React from 'react';
import { Editor, Element as SlateElement, Transforms } from 'slate';
import { RenderElementProps, RenderLeafProps, useSlate } from 'slate-react';
import { css, cx } from '@emotion/css';
import isUrl from 'is-url';
import { Bold, Code, Italic, List, ListOrdered, Underline } from 'lucide-react';

// -------------------- Custom Types --------------------

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  highlight?: boolean;
};

type MentionElement = {
  type: 'mention';
  character: string;
  userId: string;
  isEveryone?: boolean;
  children: CustomText[];
};

type LinkElement = {
  type: 'link';
  url: string;
  children: CustomText[];
};

type ParagraphElement = {
  type: 'paragraph';
  align?: 'left' | 'center' | 'right' | 'justify';
  children: CustomText[];
};

type ListElement = {
  type: 'bulleted-list' | 'numbered-list' | 'list-item';
  children: CustomText[];
};

type CustomElement = MentionElement | LinkElement | ParagraphElement | ListElement;

declare module 'slate' {
  interface CustomTypes {
    Editor: any;
    Element: CustomElement;
    Text: CustomText;
  }
}

// -------------------- Mention Characters --------------------

export const CHARACTERS = [
  'Luke Skywalker',
  'Leia Organa',
  'Han Solo',
  'Chewbacca',
  'Yoda',
  'Darth Vader',
  'Obi-Wan Kenobi',
  'R2-D2',
  'C-3PO',
  'Lando Calrissian',
  'Rey',
  'Kylo Ren',
];

// -------------------- Insert Functions --------------------

export const insertLink = (editor: Editor, url: string) => {
  const link: LinkElement = {
    type: 'link',
    url,
    children: [{ text: url }],
  };
  Transforms.insertNodes(editor, link);
};

export const insertMention = (editor: Editor, character: string, userId: string = '') => {
  const mention: MentionElement = {
    type: 'mention',
    character,
    userId,
    children: [{ text: '' }],
  };
  Transforms.insertNodes(editor, mention);
  Transforms.move(editor);
};

// -------------------- Plugins --------------------

export const withMentions = (editor: Editor): Editor => {
  const { isInline, isVoid } = editor;
  editor.isInline = (element: SlateElement) => element.type === 'mention' || isInline(element);
  editor.isVoid = (element: SlateElement) => element.type === 'mention' || isVoid(element);
  return editor;
};

export const withLinks = (editor: any): any => {
  const { insertData, insertText, isInline }: any = editor;

  editor.isInline = (element: SlateElement) => element.type === 'link' || isInline(element);

  editor.insertText = (text: string) => {
    if (isUrl(text)) {
      insertLink(editor, text);
    } else {
      insertText(text);
    }
  };

  editor.insertData = (data: DataTransfer) => {
    const text = data.getData('text/plain');
    if (isUrl(text)) {
      insertLink(editor, text);
    } else {
      insertData(data);
    }
  };

  return editor;
};

// -------------------- UI Components --------------------

export const Leaf: React.FC<RenderLeafProps> = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  if (leaf.italic) {
    children = <em>{children}</em>;
  }
  if (leaf.underline) {
    children = <u>{children}</u>;
  }
  if (leaf.code) {
    children = (
      <code
        className={css`
          background-color: #eee;
          padding: 2px 4px;
          font-family: monospace;
          border-radius: 4px;
          font-size: 90%;
        `}
      >
        {children}
      </code>
    );
  }

  return (
    <span
      {...attributes}
      {...(leaf.highlight && { 'data-cy': 'search-highlighted' })}
      className={css`
        font-weight: ${leaf.bold ? 'bold' : 'normal'};
        background-color: ${leaf.highlight ? '#ffeeba' : 'transparent'};
      `}
    >
      {children}
    </span>
  );
};

export const ElementRender: React.FC<RenderElementProps> = ({ attributes, children, element }) => {
  switch (element.type) {
    // case 'mention':
    //   return (
    //     <span
    //       {...attributes}
    //       contentEditable={false}
    //       className={css`
    //         padding: 3px;
    //         background-color: #eee;
    //         border-radius: 4px;
    //         margin: 0 2px;
    //         font-weight: bold;
    //       `}
    //     >
    //       @{(element as MentionElement).character}
    //       {children}
    //     </span>
    //   );
    case 'link':
      return (
        <a
          {...attributes}
          href={(element as LinkElement).url}
          target="_blank"
          rel="noopener noreferrer"
          contentEditable={false}
          style={{ color: 'blue', textDecoration: 'underline' }}
        >
          {children}
        </a>
      );
    case 'bulleted-list':
      return (
        <ul {...attributes} style={{ listStyleType: 'disc', paddingLeft: 24 }}>
          {children}
        </ul>
      );
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'numbered-list':
      return (
        <ol {...attributes} style={{ listStyleType: 'decimal', paddingLeft: 24 }}>
          {children}
        </ol>
      );
    default:
      return <p {...attributes}>{children}</p>;
  }
};

export const Button = React.forwardRef<
  HTMLSpanElement,
  {
    className?: string;
    active?: boolean;
    reversed?: boolean;
  } & React.HTMLAttributes<HTMLSpanElement>
>(({ className, active, reversed, ...props }, ref) => (
  <span
    {...props}
    ref={ref}
    className={cx(
      className,
      css`
        cursor: pointer;
        color: ${reversed ? (active ? 'white' : '#aaa') : active ? 'black' : '#ccc'};
      `,
    )}
  />
));

export const Icon = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => {
    const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
      format_bold: Bold,
      format_italic: Italic,
      format_underlined: Underline,
      code: Code,
      format_list_numbered: ListOrdered,
      format_list_bulleted: List,
    };

    const iconName = typeof children === 'string' ? children : '';
    const IconComponent = iconMap[iconName];

    return (
      <span
        {...props}
        ref={ref}
        className={cx(
          className,
          css`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            vertical-align: middle;
          `,
        )}
      >
        {IconComponent ? <IconComponent size={18} /> : null}
      </span>
    );
  },
);

export const Menu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      data-test-id="menu"
      className={cx(
        className,
        css`
          & > * {
            display: inline-block;
          }
          & > * + * {
            margin-left: 15px;
          }
        `,
      )}
    />
  ),
);

export const Toolbar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Menu
      {...props}
      ref={ref}
      className={cx(
        className,
        css`
          position: relative;
          padding: 1px 18px 17px;
          margin: 0 -20px;
          border-bottom: 2px solid #eee;
          margin-bottom: 20px;
        `,
      )}
    />
  ),
);

// -------------------- Formatting Logic --------------------

const LIST_TYPES: any = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

const isAlignType = (format: string) => TEXT_ALIGN_TYPES.includes(format);
const isListType = (format: string) => LIST_TYPES.includes(format);

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format, isAlignType(format) ? 'align' : 'type');
  const isList = isListType(format);

  Transforms.unwrapNodes(editor, {
    match: (n: any) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      typeof (n as SlateElement).type === 'string' &&
      LIST_TYPES.includes((n as SlateElement).type),
    split: true,
  });

  let newProperties: any;

  if (isAlignType(format)) {
    newProperties = { align: isActive ? undefined : format };
  } else {
    newProperties = { type: isActive ? 'paragraph' : isList ? 'list-item' : format };
  }

  Transforms.setNodes<SlateElement>(editor, newProperties as any);

  if (!isActive && isList) {
    const block: SlateElement = {
      type: format,
      children: [],
    } as any;
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (
  editor: Editor,
  format: string,
  blockType: 'type' | 'align' = 'type',
): boolean => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n): n is SlateElement =>
        SlateElement.isElement(n) &&
        (blockType === 'align' ? (n as any).align === format : (n as SlateElement).type === format),
    }),
  );

  return !!match;
};

const isMarkActive = (editor: Editor, format: string): boolean => {
  const marks: any = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

// -------------------- Toolbar Buttons --------------------

export const BlockButton: React.FC<{ format: string; icon: string }> = ({ format, icon }) => {
  const editor = useSlate();
  return (
    <Button
      active={isBlockActive(editor, format, isAlignType(format) ? 'align' : 'type')}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  );
};

export const MarkButton: React.FC<{ format: string; icon: string }> = ({ format, icon }) => {
  const editor = useSlate();
  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  );
};
