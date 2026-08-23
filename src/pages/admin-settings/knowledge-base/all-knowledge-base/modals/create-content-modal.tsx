import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CloseIcon } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Loader from '@/components/custom/loader';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContentModalInitialValues, createContentModaSchema } from '../../constants';
import { getAIAgentToken, userAddContent } from '@/services/api';
import { getObjectLength, handleAlert } from '@/lib/utils';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import TextEditor from '@/components/custom/text-editor';

const DEFAULT_EDITOR_VALUE = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const cloneSlateValue = (value: any) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const applyTextMarksToMarkdown = (node: any) => {
  let text = String(node?.text || '');
  if (!text) return text;
  if (node?.code) text = `\`${text}\``;
  if (node?.bold) text = `**${text}**`;
  if (node?.italic) text = `*${text}*`;
  if (node?.underline) text = `<u>${text}</u>`;
  return text;
};

const serializeInlineNodeToMarkdown = (node: any): string => {
  if (!node || typeof node !== 'object') return '';

  if (node?.text !== undefined) {
    return applyTextMarksToMarkdown(node);
  }

  if (node?.type === 'link') {
    const linkText = Array.isArray(node?.children)
      ? node.children.map((child: any) => serializeInlineNodeToMarkdown(child)).join('')
      : '';
    return `[${linkText || node?.url || ''}](${node?.url || ''})`;
  }

  if (node?.type === 'mention') {
    return `@${node?.character || ''}`;
  }

  if (Array.isArray(node?.children)) {
    return node.children.map((child: any) => serializeInlineNodeToMarkdown(child)).join('');
  }

  return '';
};

const serializeSlateValueToMarkdown = (value: any): string => {
  if (!Array.isArray(value)) return '';

  const serializeBlock = (node: any): string => {
    if (!node || typeof node !== 'object') return '';

    if (node?.type === 'bulleted-list') {
      const items = Array.isArray(node?.children) ? node.children : [];
      return items
        .map((item: any) => {
          const itemText = serializeInlineNodeToMarkdown(item).trim();
          return itemText ? `- ${itemText}` : '- ';
        })
        .join('\n');
    }

    if (node?.type === 'numbered-list') {
      const items = Array.isArray(node?.children) ? node.children : [];
      return items
        .map((item: any, index: number) => {
          const itemText = serializeInlineNodeToMarkdown(item).trim();
          return `${index + 1}. ${itemText}`;
        })
        .join('\n');
    }

    return serializeInlineNodeToMarkdown(node);
  };

  return value
    .map((node: any) => serializeBlock(node))
    .join('\n')
    .trim();
};

const parseMarkdownInline = (text: string): any[] => {
  const safeText = String(text || '');
  if (!safeText) return [{ text: '' }];

  const nodes: any[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|<u>(.*?)<\/u>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(safeText)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ text: safeText.slice(lastIndex, match.index) });
    }

    if (match[2] !== undefined && match[3] !== undefined) {
      nodes.push({
        type: 'link',
        url: match[3],
        children: [{ text: match[2] }],
      });
    } else if (match[4] !== undefined) {
      nodes.push({ text: match[4], code: true });
    } else if (match[5] !== undefined) {
      nodes.push({ text: match[5], bold: true });
    } else if (match[6] !== undefined) {
      nodes.push({ text: match[6], italic: true });
    } else if (match[7] !== undefined) {
      nodes.push({ text: match[7], underline: true });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < safeText.length) {
    nodes.push({ text: safeText.slice(lastIndex) });
  }

  return nodes.length ? nodes : [{ text: '' }];
};

const markdownToSlateValue = (markdown: string): any[] => {
  const source = String(markdown || '').replace(/\r\n/g, '\n');
  if (!source.trim()) return cloneSlateValue(DEFAULT_EDITOR_VALUE);

  const lines = source.split('\n');
  const blocks: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const numberedMatch = line.match(/^\s*\d+\.\s+(.*)$/);

    if (bulletMatch) {
      const listItems: any[] = [];
      let currentIndex = i;
      while (currentIndex < lines.length) {
        const currentLine = lines[currentIndex];
        const currentBullet = currentLine.match(/^\s*[-*]\s+(.*)$/);
        if (!currentBullet) break;
        listItems.push({
          type: 'list-item',
          children: parseMarkdownInline(currentBullet[1]),
        });
        currentIndex += 1;
      }
      blocks.push({
        type: 'bulleted-list',
        children: listItems.length ? listItems : [{ type: 'list-item', children: [{ text: '' }] }],
      });
      i = currentIndex - 1;
      continue;
    }

    if (numberedMatch) {
      const listItems: any[] = [];
      let currentIndex = i;
      while (currentIndex < lines.length) {
        const currentLine = lines[currentIndex];
        const currentNumbered = currentLine.match(/^\s*\d+\.\s+(.*)$/);
        if (!currentNumbered) break;
        listItems.push({
          type: 'list-item',
          children: parseMarkdownInline(currentNumbered[1]),
        });
        currentIndex += 1;
      }
      blocks.push({
        type: 'numbered-list',
        children: listItems.length ? listItems : [{ type: 'list-item', children: [{ text: '' }] }],
      });
      i = currentIndex - 1;
      continue;
    }

    blocks.push({
      type: 'paragraph',
      children: parseMarkdownInline(line),
    });
  }

  return blocks.length ? blocks : cloneSlateValue(DEFAULT_EDITOR_VALUE);
};

const isValidSlateNode = (node: any): boolean => {
  if (!node || typeof node !== 'object') return false;

  if (node.text !== undefined) return typeof node.text === 'string';

  if (node.type && Array.isArray(node.children)) {
    return node.children.every((child: any) => isValidSlateNode(child));
  }

  return false;
};

const isValidSlateValue = (value: any) => {
  if (!Array.isArray(value) || !value.length) return false;
  return value.every((node: any) => isValidSlateNode(node));
};

const parseSlateValue = (value: any) => {
  if (!value) return null;
  if (isValidSlateValue(value)) return cloneSlateValue(value);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (isValidSlateValue(parsed)) return cloneSlateValue(parsed);
    } catch {
      return null;
    }
  }

  return null;
};

interface AddGroupLeadModalProps {
  modalState: boolean;
  setModalState: (state: boolean) => void;
  group?: any;
  rowData?: any;
  selectedCreateType?: string;
  selectedLeads?: string[];
  origin?: string;
  onSuccess?: (payload?: { ingestionIdCreated?: string; type?: 'text' }) => void;
}

function CreateContentModal({
  modalState,
  setModalState,
  rowData,
  origin,
  onSuccess = () => {},
}: AddGroupLeadModalProps) {
  const { isEdit = false, formData = {} } = rowData || {};
  const queryClient: any = useQueryClient();
  const [editorKey, setEditorKey] = useState(0);
  const [editorInitialValue, setEditorInitialValue] = useState<any>(
    cloneSlateValue(DEFAULT_EDITOR_VALUE),
  );
  const [editorValue, setEditorValue] = useState<any>(cloneSlateValue(DEFAULT_EDITOR_VALUE));
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<any>({
    defaultValues: createContentModalInitialValues,
    resolver: yupResolver(createContentModaSchema),
    mode: 'onSubmit',
  });

  const { mutateAsync: mutateGetToken, isPending: isPendingGetToken } = useMutation({
    mutationFn: getAIAgentToken,
    mutationKey: ['getAIAgentToken'],
  });

  const { mutate, isPending } = useMutation({
    mutationFn: userAddContent,
    mutationKey: ['userAddContent'],
    onSuccess: (data) => {
      if (isEdit || origin === 'create_agent') {
        queryClient.invalidateQueries({
          queryKey: ['AIUserKnowledgeBase'],
          exact: false,
        });
      }
      handleAlert({
        text: data?.data?.data?.message || 'Content added successfully.',
        type: 'success',
      });
      setModalState(false);
      onSuccess({
        ingestionIdCreated: data?.data?.ingestionId,
        type: 'text',
      });
    },
  });

  useEffect(() => {
    if (!modalState) return;

    if (formData && getObjectLength(formData) && isEdit) {
      const { name = '', text = '' } = formData;
      const legacySlateValue =
        parseSlateValue(formData?.richText) ||
        parseSlateValue(formData?.editorData) ||
        parseSlateValue(formData?.text);
      const restoredSlateValue = legacySlateValue || markdownToSlateValue(text);
      const markdownText = serializeSlateValueToMarkdown(restoredSlateValue);
      reset({ name, text: markdownText });
      setEditorInitialValue(restoredSlateValue);
      setEditorValue(restoredSlateValue);
      setEditorKey((prev) => prev + 1);
      return;
    }
    reset(createContentModalInitialValues);
    setEditorInitialValue(cloneSlateValue(DEFAULT_EDITOR_VALUE));
    setEditorValue(cloneSlateValue(DEFAULT_EDITOR_VALUE));
    setEditorKey((prev) => prev + 1);
  }, [
    modalState,
    isEdit,
    formData?.name,
    formData?.text,
    formData?.richText,
    formData?.editorData,
    reset,
  ]);

  const onSubmit = async (values: any) => {
    const response = await mutateGetToken();
    const tokenId = response?.data?.data?.result?.tokenId;
    if (tokenId) {
      const markdownText = serializeSlateValueToMarkdown(editorValue || DEFAULT_EDITOR_VALUE);
      const payload = {
        name: values?.name || '',
        text: markdownText || values?.text || '',
        scope: 'global',
        token: tokenId,
        ingestionId: isEdit ? formData?.ingestionId : undefined,
      };
      mutate(payload);
    }
  };

  return (
    <Dialog open={modalState} onOpenChange={(val) => setModalState(val)}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] sm:w-[90vw] md:w-[80vw] lg:w-[62vw] xl:w-[46vw] 2xl:w-1/3 max-w-[900px] p-3 sm:p-4 max-h-[90vh] overflow-hidden"
        showCloseButton={false}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full h-full min-h-0 flex flex-col gap-3 sm:gap-4"
        >
          <div className="flex flex-col gap-1.5 text-900/80">
            <div className="font-semibold truncate text-md flex items-center justify-between">
              {`${isEdit ? 'Update' : 'Create'} Content`}
              <div
                onClick={() => setModalState(false)}
                className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              >
                <CloseIcon className="w-3 h-3" />
              </div>
            </div>
          </div>
          <div className="w-full min-h-0 flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            <h5 className="text-gray-500 font-medium text-sm">
              Manually add the information to a blank document.
            </h5>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Enter name"
                  label="Name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  error={errors?.name?.message}
                />
              )}
            />
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <div className="flex items-start">
                  {errors?.text?.message && <ErrorTooltip text={errors?.text?.message} />}
                </div>
              </div>
              <Controller
                control={control}
                name="text"
                render={({ field }) => (
                  <div
                    className={`w-full min-h-[170px] sm:min-h-[220px] overflow-hidden rounded-xl border p-2 ${
                      errors?.text ? 'border-red-500' : 'border-gray-200'
                    }`}
                  >
                    <TextEditor
                      key={editorKey}
                      initialValue={editorInitialValue}
                      onChange={(value: any) => {
                        setEditorValue(value);
                        const markdownText = serializeSlateValueToMarkdown(value);
                        field.onChange(markdownText);
                      }}
                      placeholder="Type or paste your content here..."
                      maxHeight="max-h-[320px]"
                    />
                  </div>
                )}
              />
            </div>
          </div>
          <div className="shrink-0 grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 bg-white">
            <Button
              variant={'transparent'}
              type="button"
              onClick={() => setModalState(false)}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              disabled={isPendingGetToken || isPending}
              variant={'outline'}
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="w-full"
            >
              {(isPendingGetToken || isPending) && <Loader variant="blue" />}Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateContentModal;
