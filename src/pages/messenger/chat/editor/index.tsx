import {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
  CSSProperties,
} from 'react';
import { Editor, Transforms, Range, createEditor } from 'slate';
import { Slate, Editable, ReactEditor, withReact } from 'slate-react';
import {
  BlockButton,
  ElementRender,
  insertMention,
  Leaf,
  MarkButton,
  Toolbar,
  toggleMark,
  withLinks,
  withMentions,
} from './utils';
import { withHistory } from 'slate-history';
import { Node } from 'slate';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Maximize2, Minimize2 } from 'lucide-react';

const EVERYONE_USER = {
  uuid: '__everyone__',
  name: 'everyone',
  isEveryone: true,
};

const chatExpandedStates: Record<string, boolean> = {};
const chatManualCollapseStates: Record<string, boolean> = {};

export const defaultEditorValue = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
] as any;

const cloneSlateValue = <T,>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

export const createDefaultEditorValue = () => cloneSlateValue(defaultEditorValue);

const slateNodesToString = (value: any): string => {
  try {
    if (!Array.isArray(value)) return '';
    return value
      .map((node: any) => {
        try {
          return Node.string(node);
        } catch {
          return '';
        }
      })
      .join('\n')
      .trim();
  } catch {
    return '';
  }
};

const isValidSlateNode = (node: any): boolean => {
  try {
    if (!node || typeof node !== 'object') return false;

    if (node.text !== undefined) {
      return typeof node.text === 'string';
    }

    if (node.type && node.children) {
      if (typeof node.type !== 'string') return false;
      if (!Array.isArray(node.children)) return false;
      return node.children.every((child: any) => isValidSlateNode(child));
    }

    return false;
  } catch {
    return false;
  }
};

const isValidSlateValue = (value: any): boolean => {
  try {
    if (!Array.isArray(value)) return false;
    if (value.length === 0) return false;
    return value.every((node: any) => isValidSlateNode(node));
  } catch {
    return false;
  }
};

const sanitizeSlateValue = (value: any): any => {
  try {
    if (!value) return createDefaultEditorValue();
    if (!isValidSlateValue(value)) return createDefaultEditorValue();
    return cloneSlateValue(value);
  } catch {
    return createDefaultEditorValue();
  }
};

const trimSlateValue = (value: any[]): any[] => {
  try {
    if (!value || !Array.isArray(value) || value.length === 0) return value;

    const isTrulyEmpty = (node: any): boolean => {
      if (node.text !== undefined) return node.text.trim() === '';
      if (node.type === 'mention' || node.type === 'link') return false;
      if (node.children) return node.children.every(isTrulyEmpty);
      return true;
    };

    let start = 0;
    while (start < value.length && isTrulyEmpty(value[start])) start++;

    let end = value.length - 1;
    while (end >= start && isTrulyEmpty(value[end])) end--;

    if (start > end) return createDefaultEditorValue();

    const trimmedNodes = JSON.parse(JSON.stringify(value.slice(start, end + 1)));

    const trimLeading = (node: any) => {
      if (node.text !== undefined) {
        node.text = node.text.replace(/^\s+/, '');
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (trimLeading(child)) return true;
        }
      }
      return false;
    };

    const trimTrailing = (node: any) => {
      if (node.text !== undefined) {
        node.text = node.text.replace(/\s+$/, '');
        return true;
      }
      if (node.children) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          if (trimTrailing(node.children[i])) return true;
        }
      }
      return false;
    };

    trimLeading(trimmedNodes[0]);
    trimTrailing(trimmedNodes[trimmedNodes.length - 1]);
    return trimmedNodes;
  } catch {
    return value;
  }
};

const isEditorEmpty = (editor: Editor) => {
  return editor.children.length === 1 && Node.string(editor)?.trim() === '';
};

const focusEditor = (editor: Editor) => {
  (ReactEditor as any).focus(editor as any);
  Transforms.select(editor, Editor.end(editor, []));
};

const resetEditor = (editor: Editor) => {
  const childrens: any = Node.children(editor, [], { reverse: true });
  childrens.forEach(([, path]: any) => {
    Transforms.removeNodes(editor, { at: path });
  });
  Transforms.insertNodes(editor, createDefaultEditorValue());
};

const replaceEditorValue = (editor: Editor, newValue: Node[]) => {
  try {
    const sanitizedValue = sanitizeSlateValue(newValue);
    const existing: any = Node.children(editor, [], { reverse: true });
    existing.forEach(([, path]: any) => {
      try {
        Transforms.removeNodes(editor, { at: path });
      } catch {
        // no-op
      }
    });
    Transforms.insertNodes(editor, cloneSlateValue(sanitizedValue));
  } catch {
    try {
      const existing: any = Node.children(editor, [], { reverse: true });
      existing.forEach(([, path]: any) => {
        try {
          Transforms.removeNodes(editor, { at: path });
        } catch {
          // no-op
        }
      });
      Transforms.insertNodes(editor, createDefaultEditorValue());
    } catch {
      // no-op
    }
  }
};

const TextEditor = (
  {
    initialValue = defaultEditorValue,
    onChange,
    readOnly = false,
    fromPinned = false,
    fromThread = false,
    placeholder = 'Type something or drag and drop files...',
    onPressEnterWithoutShift = () => null,
    onPaste = () => null,
    onDrop = () => null,
    isLoading = false,
    availableUsers = [],
    className = '',
    allowEveryoneMention = false,
    fromMeetChat = false,
    chatId = '',
  }: any,
  ref: any,
) => {
  const validatedInitialValue = useMemo(() => {
    try {
      const sanitized = sanitizeSlateValue(initialValue);
      const normalized = readOnly ? trimSlateValue(sanitized) : sanitized;
      return cloneSlateValue(normalized);
    } catch {
      return createDefaultEditorValue();
    }
  }, [JSON.stringify(initialValue), readOnly]);

  const editor = useMemo(() => withMentions(withLinks(withReact(withHistory(createEditor())))), []);

  const initialTextLength = useMemo(() => {
    return slateNodesToString(validatedInitialValue).length;
  }, [validatedInitialValue]);

  const [textLength, setTextLength] = useState(initialTextLength);

  useEffect(() => {
    setTextLength(initialTextLength);
  }, [initialTextLength]);

  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (chatId && chatExpandedStates[chatId] !== undefined) {
      return chatExpandedStates[chatId];
    }
    return false;
  });
  const manualCollapseRef = useRef<boolean>(
    chatId ? Boolean(chatManualCollapseStates[chatId]) : false,
  );

  useEffect(() => {
    if (chatId) {
      setIsExpanded(chatExpandedStates[chatId] || false);
      manualCollapseRef.current = Boolean(chatManualCollapseStates[chatId]);
    }
  }, [chatId]);

  useEffect(() => {
    if (readOnly) return;
    if (textLength > 610 && !isExpanded && !manualCollapseRef.current) {
      setIsExpanded(true);
      if (chatId) {
        chatExpandedStates[chatId] = true;
      }
      return;
    }

    if (textLength <= 610 && isExpanded) {
      setIsExpanded(false);
      if (chatId) {
        chatExpandedStates[chatId] = false;
      }
    }

    if (textLength <= 610 && manualCollapseRef.current) {
      manualCollapseRef.current = false;
      if (chatId) {
        chatManualCollapseStates[chatId] = false;
      }
    }
  }, [readOnly, textLength, isExpanded, chatId]);

  const toggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      const isManualCollapse = !next && textLength > 610;
      manualCollapseRef.current = isManualCollapse;
      if (chatId) {
        chatExpandedStates[chatId] = next;
        chatManualCollapseStates[chatId] = isManualCollapse;
      }
      return next;
    });
  };

  const editorStyle = useMemo<CSSProperties>(() => {
    if (readOnly) return { overflowWrap: 'break-word' };

    let height: string | undefined = undefined;
    let minHeight: string | undefined = undefined;
    let maxHeight: string | undefined = undefined;

    if (textLength > 610) {
      height = '15vh';
      minHeight = '15vh';
      maxHeight = '15vh';
    }

    if (isExpanded) {
      height = fromMeetChat ? 'calc(20vh + 100px)' : 'calc(20vh + 270px)';
      minHeight = fromMeetChat ? 'calc(20vh + 100px)' : 'calc(20vh + 270px)';
      maxHeight = fromMeetChat ? 'calc(20vh + 100px)' : 'calc(20vh + 270px)';
    }

    return {
      overflowWrap: 'break-word',
      height,
      minHeight,
      maxHeight,
      transition:
        'height 0.2s ease-in-out, min-height 0.2s ease-in-out, max-height 0.2s ease-in-out',
    };
  }, [readOnly, textLength, isExpanded]);

  const [mentionSearch, setMentionSearch] = useState('');
  const [target, setTarget] = useState(null);
  const [index, setIndex] = useState(0);
  const textRef = useRef<any>(null);

  const filteredUsers = useMemo(() => {
    try {
      if (!Array.isArray(availableUsers)) return [];

      const users = availableUsers
        .filter((user: any) => {
          if (!user) return false;
          const displayName =
            user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
          if (!displayName) return false;
          return displayName.toLowerCase().includes((mentionSearch || '').toLowerCase());
        })
        .slice(0, 5);

      if (allowEveryoneMention && 'everyone'.includes((mentionSearch || '').toLowerCase())) {
        users.unshift(EVERYONE_USER);
      }

      return users.slice(0, 5);
    } catch {
      return [];
    }
  }, [availableUsers, mentionSearch]);

  useImperativeHandle(
    ref,
    () => ({
      isEditorEmpty() {
        try {
          return isEditorEmpty(editor);
        } catch {
          return true;
        }
      },
      focusEditor() {
        try {
          return focusEditor(editor);
        } catch {
          return undefined;
        }
      },
      resetEditor() {
        try {
          return resetEditor(editor);
        } catch {
          return undefined;
        }
      },
      replaceEditorValue(newVal: any) {
        try {
          const sanitizedValue = sanitizeSlateValue(newVal);
          return replaceEditorValue(editor, sanitizedValue);
        } catch {
          try {
            resetEditor(editor);
          } catch {
            // no-op
          }
          return undefined;
        }
      },
      insertText(text: string) {
        try {
          (ReactEditor as any).focus(editor as any);
          Editor.insertText(editor, text);
        } catch {
          // no-op
        }
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (target && filteredUsers.length > 0 && textRef.current) {
      try {
        const domRange = (ReactEditor as any)?.toDOMRange(editor as any, target);
        const rect = domRange.getBoundingClientRect();
        const dropdown = textRef.current;

        setTimeout(() => {
          if (!dropdown || !textRef.current) return;

          const dropdownHeight = dropdown.offsetHeight || 200;
          const dropdownWidth = dropdown.offsetWidth || 300;
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          let top = rect.top - dropdownHeight - 8;
          let left = rect.left;

          const spaceAbove = rect.top;
          const spaceBelow = viewportHeight - rect.bottom;

          if (spaceAbove < dropdownHeight + 20 && spaceBelow > dropdownHeight + 20) {
            top = rect.bottom + 8;
          } else if (spaceAbove < dropdownHeight + 20 && spaceBelow < dropdownHeight + 20) {
            if (spaceAbove > spaceBelow) {
              top = Math.max(10, rect.top - dropdownHeight);
            } else {
              top = Math.min(viewportHeight - dropdownHeight - 10, rect.bottom);
            }
          }

          if (left + dropdownWidth > viewportWidth - 20) {
            left = Math.max(10, viewportWidth - dropdownWidth - 20);
          }
          if (left < 10) left = 10;

          top = Math.max(10, Math.min(top, viewportHeight - dropdownHeight - 10));

          dropdown.style.top = `${top}px`;
          dropdown.style.left = `${left}px`;
        }, 0);
      } catch {
        if (textRef.current) {
          textRef.current.style.top = '0px';
          textRef.current.style.left = '0px';
        }
      }
    }
  }, [filteredUsers.length, editor, index, mentionSearch, target]);

  const onKeyDown = useCallback(
    (e: any) => {
      if (target) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setIndex((prev) => (prev >= filteredUsers.length - 1 ? 0 : prev + 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setIndex((prev) => (prev <= 0 ? filteredUsers.length - 1 : prev - 1));
            break;
          case 'Tab':
          case 'Enter':
            e.preventDefault();
            if (filteredUsers.length > 0 && index >= 0 && index < filteredUsers.length) {
              try {
                const selectedUser = filteredUsers[index];
                if (selectedUser && selectedUser.uuid) {
                  const displayName =
                    selectedUser?.name ||
                    `${selectedUser?.first_name || ''} ${selectedUser?.last_name || ''}`.trim() ||
                    'Unknown User';

                  Transforms.select(editor, target);
                  insertMention(editor, {
                    name: displayName,
                    uuid: selectedUser.uuid,
                    isEveryone: selectedUser.uuid === '__everyone__',
                  });
                  setTarget(null);
                  setIndex(0);
                }
              } catch {
                setTarget(null);
                setIndex(0);
              }
            } else if (!e.shiftKey && e.key === 'Enter') {
              onPressEnterWithoutShift();
            }
            break;
          case 'Escape':
            e.preventDefault();
            setTarget(null);
            break;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            toggleMark(editor, 'bold');
            break;
          case 'i':
            e.preventDefault();
            toggleMark(editor, 'italic');
            break;
          case 'u':
            e.preventDefault();
            toggleMark(editor, 'underline');
            break;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey && !target) {
        e.preventDefault();
        onPressEnterWithoutShift();
      }
    },
    [filteredUsers, index, target, editor, onPressEnterWithoutShift],
  );

  const isOnlyEmoji = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (/[0-9]/.test(trimmed)) return false;

    const emojiRegex =
      /^[\p{Extended_Pictographic}\p{Emoji}\p{Emoji_Component}\p{Emoji_Modifier}\p{Regional_Indicator}\s]+$/u;

    return emojiRegex.test(trimmed);
  };

  const handleChange = (newValue: any) => {
    try {
      if (!isValidSlateValue(newValue)) return;
      onChange?.(newValue);

      const text = slateNodesToString(newValue);
      setTextLength(text.length);

      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        try {
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
        } catch {
          // no-op
        }
      }
      setTarget(null);
    } catch {
      setTarget(null);
    }
  };

  return (
    <div
      key={readOnly ? JSON.stringify(validatedInitialValue) : chatId || 'editor'}
      id="slate-container"
      className="w-full h-auto break-words "
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const items = e.dataTransfer.files || [];
        const files = [];
        for (let i = 0; i < items.length; i++) {
          files.push(items[i]);
        }
        onDrop(files);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <Slate editor={editor as any} initialValue={validatedInitialValue} onChange={handleChange}>
        {!readOnly && (
          <Toolbar className="">
            <MarkButton format="bold" icon="format_bold" />
            <MarkButton format="italic" icon="format_italic" />
            <MarkButton format="underline" icon="format_underlined" />
            <MarkButton format="code" icon="code" />
            <BlockButton format="numbered-list" icon="format_list_numbered" />
            <BlockButton format="bulleted-list" icon="format_list_bulleted" />
            {textLength > 610 && (
              <button
                type="button"
                onClick={toggleExpand}
                className="ml-auto p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors flex items-center justify-center cursor-pointer"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
          </Toolbar>
        )}
        <Editable
          disabled={isLoading}
          className={`${
            readOnly
              ? ` rounded-md text-black ${
                  isOnlyEmoji(slateNodesToString(validatedInitialValue))
                    ? 'text-[20px]'
                    : 'text-[13px]'
                } py-2 px-2 items-start flex flex-col w-full break-words ${
                  fromPinned ? 'break-words' : ''
                }`
              : 'overflow-x-hidden min-h-11 break-words max-h-[130px] xl:max-h-[170px] overflow-y-auto'
          } outline-0 text-black text-[13px] leading-5 h-auto py-0 px-2 ${fromThread ? 'break-words' : ''} ${className}`}
          style={editorStyle}
          readOnly={readOnly}
          renderLeaf={(props) => <Leaf {...props} />}
          renderElement={(props) => <ElementRender {...props} />}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          autoFocus={!readOnly}
          onPaste={(e) => {
            const items = e.clipboardData.items || [];
            const files = [];
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.kind === 'file') {
                const blob = item.getAsFile();
                files.push(blob);
              }
            }
            onPaste(files);
          }}
        />
        {target && filteredUsers && filteredUsers?.length > 0 && (
          <div
            ref={textRef}
            className="fixed z-50 p-2 shadow-2xl bg-white border border-gray-200 rounded-lg max-w-xs min-w-48 backdrop-blur-sm"
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {Array.isArray(filteredUsers) &&
              filteredUsers
                .map((user: any, i: number) => {
                  if (!user || !user.uuid) return null;

                  const displayName =
                    user?.name ||
                    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
                    'Unknown User';

                  return (
                    <div
                      key={user.uuid || i}
                      onMouseDown={(e) => {
                        try {
                          e.preventDefault();
                          e.stopPropagation();
                          if (target && editor) {
                            Transforms.select(editor, target);
                            insertMention(editor, {
                              name: displayName,
                              uuid: user.uuid,
                              isEveryone: user.uuid === '__everyone__',
                            });
                            setTarget(null);
                            setIndex(0);
                          }
                        } catch {
                          setTarget(null);
                          setIndex(0);
                        }
                      }}
                      className={`px-2 py-1 cursor-pointer mb-1 rounded text-sm transition-colors ${
                        i === index ? 'bg-ucass-active-bg text-ucass-active' : 'hover:bg-gray-100 '
                      }`}
                    >
                      <div className="flex gap-2 items-center">
                        <CustomAvatar
                          name={displayName}
                          showPresence={false}
                          size="35"
                          image={user?.profile || ''}
                        />
                        <div className="flex flex-col gap-1">
                          <div className="font-medium truncate max-w-40">{displayName}</div>
                          {user.email && (
                            <div className="text-xs text-gray-500 truncate max-w-40">
                              {user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
          </div>
        )}
      </Slate>
    </div>
  );
};

export default forwardRef(TextEditor);
