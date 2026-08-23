/* eslint-disable @typescript-eslint/ban-ts-comment */
//@ts-nocheck

import React, { useState, useEffect } from 'react';
import { Editor, Element as SlateElement, Transforms } from 'slate';
import { useSlate, type RenderElementProps, type RenderLeafProps } from 'slate-react';
import isUrl from 'is-url';
import { Bold, Italic, Underline, Code, List, ListOrdered } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  format_bold: Bold,
  format_italic: Italic,
  format_underlined: Underline,
  code: Code,
  format_list_numbered: ListOrdered,
  format_list_bulleted: List,
};

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

export const insertLink = (editor: Editor, url: string) => {
  const link: LinkElement = {
    type: 'link',
    url,
    children: [{ text: url }],
  };
  Transforms.insertNodes(editor, link);
};

export const insertMention = (
  editor: Editor,
  user: { name: string; uuid: string; isEveryone?: boolean },
) => {
  try {
    if (!editor) return;
    if (!user || !user.name || !user.uuid) return;

    const sanitizedName = user.name.trim();
    const sanitizedUuid = user.uuid.trim();
    if (!sanitizedName || !sanitizedUuid) return;

    if (user.isEveryone) {
      const hasEveryone =
        Array.from(
          Editor.nodes(editor, {
            match: (n) => n.type === 'mention' && n.isEveryone,
          }),
        ).length > 0;

      if (hasEveryone) return;
    }

    const mention: MentionElement = {
      type: 'mention',
      character: sanitizedName,
      userId: sanitizedUuid,
      isEveryone: user.isEveryone === true,
      children: [{ text: '' }],
    };

    Transforms.insertNodes(editor, mention);
    Transforms.move(editor);
  } catch {
    try {
      if (editor && user?.name) {
        Transforms.insertText(editor, `@${user.name} `);
      }
    } catch {
      // no-op fallback
    }
  }
};

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
    if (isUrl(text)) insertLink(editor, text);
    else insertText(text);
  };

  editor.insertData = (data: DataTransfer) => {
    const text = data.getData('text/plain');
    if (isUrl(text)) insertLink(editor, text);
    else insertData(data);
  };

  return editor;
};

export const Leaf: React.FC<RenderLeafProps> = ({ attributes, children, leaf }) => {
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.underline) children = <u>{children}</u>;
  if (leaf.code) {
    children = <code className="bg-gray-100 px-1 py-0.5 font-mono rounded">{children}</code>;
  }

  return (
    <span
      {...attributes}
      {...(leaf.highlight && { 'data-cy': 'search-highlighted' })}
      className={`${leaf.bold ? 'font-bold' : 'font-normal'} ${
        leaf.highlight ? 'bg-[#ffeeba]' : 'bg-transparent'
      }`}
    >
      {children}
    </span>
  );
};

export const ElementRender: React.FC<RenderElementProps> = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'mention': {
      const isEveryone = element.isEveryone;
      return (
        <span
          {...attributes}
          contentEditable={false}
          className={`inline-block px-1 py-0.5 mx-1 bg-ucass-active-bg text-ucass-active rounded font-medium text-sm ${
            isEveryone ? 'bg-green-100 text-green-800' : ''
          }`}
        >
          @{(element as MentionElement).character}
          {children}
        </span>
      );
    }
    case 'link':
      return (
        <a
          {...attributes}
          href={(element as LinkElement).url}
          target="_blank"
          rel="noopener noreferrer"
          contentEditable={false}
          className="text-ucass-active underline hover:text-ucass-active"
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
>(({ className, active, ...props }, ref) => (
  <span
    {...props}
    ref={ref}
    className={`${className || ''} cursor-pointer rounded ${
      active ? 'bg-gray-300 text-gray-900' : 'text-gray-500 hover:bg-gray-200'
    }`}
  />
));

export const Icon = React.forwardRef<
  HTMLSpanElement,
  { iconName: string } & React.HTMLAttributes<HTMLSpanElement>
>(({ className, iconName, ...props }, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const IconComponent = iconMap[iconName];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!IconComponent) {
    return (
      <span
        {...props}
        ref={ref}
        className={`material-icons flex items-center ${className}`}
        style={{ fontSize: '20px' }}
      >
        {iconName}
      </span>
    );
  }

  return (
    <span
      {...props}
      ref={ref}
      className={`flex items-center justify-center transition-all duration-300 ease-out ${
        isLoaded ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-4'
      } ${className}`}
      style={{ width: '20px', height: '20px' }}
    >
      <IconComponent size={16} />
    </span>
  );
});

export const Menu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div {...props} ref={ref} data-test-id="menu" className={className} />
  ),
);

export const Toolbar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    }, []);

    return (
      <Menu
        {...props}
        ref={ref}
        className={`flex items-center gap-2 p-2 pl-3 bg-gray-100 rounded-t-md transition-all duration-500 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={{
          position: 'relative',
          margin: '0',
          marginBottom: '4px',
        }}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              ...child.props,
              style: {
                ...child.props.style,
                animationDelay: `${index * 100}ms`,
              },
            } as any);
          }
          return child;
        })}
      </Menu>
    );
  },
);

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
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    };
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

export const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) Editor.removeMark(editor, format);
  else Editor.addMark(editor, format, true);
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
      <Icon iconName={icon} />
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
      <Icon iconName={icon} className="text-xs" />
    </Button>
  );
};
