// The widget builder body: AI Builder chat, Code editor, Functions (per-button
// actions) and States (conditional visibility) tabs, with a live preview panel.
// Ported from Chatwoot's WidgetBuilder.vue. Exposes save() / resetToDefault() /
// hasUnsavedChanges to the header via a ref.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Sparkles,
  Code,
  Zap,
  ToggleLeft,
  Undo2,
  Copy,
  Check,
  Image as ImageIcon,
  ArrowUp,
  Plus,
  Trash2,
  RefreshCw,
  X,
} from 'lucide-react';
import WidgetRenderer from './WidgetRenderer';
import WidgetPreviewChrome from './WidgetPreviewChrome';
import WidgetCodeEditor from './WidgetCodeEditor';
import WidgetConditionGroup from './WidgetConditionGroup';
import { widgetAiBuilder } from './helpers/api';
import { deriveWidgetConfigFromTool } from './helpers/templates';
import {
  BUTTON_ACTION_LABELS,
  VISIBILITY_OPS_WITHOUT_VALUE,
  WIDGET_BUTTON_ACTIONS,
} from './helpers/templates';
import {
  conditionFieldKeys,
  deriveDraftState,
  layoutFromState,
  newConditionGroup,
  schemaFromFields,
  stableStringify,
  configOutputFor,
} from './helpers/builder-transform';
import type { DraftBundle, DraftButton, DraftState, EditGroup } from './helpers/builder-transform';
import type { CustomTool, WidgetConfig } from './helpers/types';

const DEFAULT_BUTTON_COLOR = '#1f2937';

const TABS = [
  { key: 'ai_builder', label: 'AI Builder', Icon: Sparkles },
  { key: 'code', label: 'Code', Icon: Code },
  { key: 'functions', label: 'Functions', Icon: Zap },
  { key: 'states', label: 'States', Icon: ToggleLeft },
] as const;

const PREVIEW_MODES = [
  { key: 'widget', label: 'Widget' },
  { key: 'chat_bubble', label: 'Chat bubble' },
  { key: 'agent_page', label: 'Agent page' },
] as const;

type ChatMessage = { role: 'user' | 'assistant'; content: string; image?: string | null };
type AttachedImage = { dataUrl: string; mimeType: string; name: string };

export type WidgetBuilderHandle = {
  save: () => void;
  resetToDefault: () => void;
  hasUnsavedChanges: () => boolean;
};

type Props = {
  tool: {
    id: number | null;
    kind: string;
    title: string;
    config: { widget?: WidgetConfig; [k: string]: unknown } | null;
  };
  httpTools?: CustomTool[];
  onSubmit: (config: WidgetConfig) => void;
};

const UNDO_INTENT = /^(undo|revert)\b/i;

const compressImage = (dataUrl: string, mimeType: string, maxSize = 1024): Promise<{ dataUrl: string; mimeType: string }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) return resolve({ dataUrl, mimeType });
      if (width > height) {
        height = Math.round((height / width) * maxSize);
        width = maxSize;
      } else {
        width = Math.round((width / height) * maxSize);
        height = maxSize;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL(mimeType, 0.85), mimeType });
    };
    img.onerror = () => resolve({ dataUrl, mimeType });
    img.src = dataUrl;
  });

const WidgetBuilder = forwardRef<WidgetBuilderHandle, Props>(function WidgetBuilder(
  { tool, httpTools = [], onSubmit },
  ref,
) {
  const resolveExistingConfig = useCallback(
    (): WidgetConfig => tool.config?.widget || deriveWidgetConfigFromTool(tool),
    [tool],
  );

  const [draft, setDraft] = useState<DraftBundle>(() => deriveDraftState(resolveExistingConfig()));
  const initialConfigOutput = useMemo(() => configOutputFor(resolveExistingConfig()), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('ai_builder');
  const [previewMode, setPreviewMode] = useState<(typeof PREVIEW_MODES)[number]['key']>('widget');
  const [previewResetKey, setPreviewResetKey] = useState(0);
  const [isResettingPreview, setIsResettingPreview] = useState(false);

  const httpToolOptions = useMemo(
    () => httpTools.map((t) => ({ value: t.slug, label: t.title })),
    [httpTools],
  );

  // ── derived preview ────────────────────────────────────────────────────────
  const previewSchema = useMemo(() => schemaFromFields(draft.fields, draft.states), [draft]);
  const previewLayout = useMemo(
    () =>
      layoutFromState(
        draft.cardTitle,
        draft.fields,
        draft.buttons,
        draft.cardWidth,
        draft.cardStyle,
        draft.formStyle,
        draft.cardTitleStyle,
        draft.cardChildren,
        draft.states,
      ),
    [draft],
  );

  const currentConfigOutput = useMemo(
    () => ({ schema: previewSchema, layout: previewLayout }),
    [previewSchema, previewLayout],
  );
  const hasUnsaved = stableStringify(currentConfigOutput) !== stableStringify(initialConfigOutput);

  const visibleTabs = useMemo(
    () => (previewSchema.length ? TABS : TABS.filter((t) => t.key !== 'states')),
    [previewSchema.length],
  );

  const applyDraftConfig = useCallback((config: WidgetConfig) => {
    setDraft(deriveDraftState(config));
  }, []);

  const resetToDefault = useCallback(() => {
    applyDraftConfig(resolveExistingConfig());
  }, [applyDraftConfig, resolveExistingConfig]);

  const save = useCallback(() => {
    onSubmit({ schema: previewSchema, layout: previewLayout });
  }, [onSubmit, previewSchema, previewLayout]);

  useImperativeHandle(ref, () => ({ save, resetToDefault, hasUnsavedChanges: () => hasUnsaved }), [
    save,
    resetToDefault,
    hasUnsaved,
  ]);

  // ── Code tab: 2-way JSON <-> draft ────────────────────────────────────────
  const [codeText, setCodeText] = useState('');
  const [codeError, setCodeError] = useState('');
  const isApplyingFromCode = useRef(false);
  const codeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isApplyingFromCode.current) {
      isApplyingFromCode.current = false;
      return;
    }
    setCodeText(JSON.stringify({ schema: previewSchema, layout: previewLayout }, null, 2));
  }, [previewSchema, previewLayout]);

  const onCodeTextInput = (value: string) => {
    setCodeText(value);
    if (codeTimer.current) clearTimeout(codeTimer.current);
    codeTimer.current = setTimeout(() => {
      let parsed: any;
      try {
        parsed = JSON.parse(value);
      } catch {
        setCodeError('Invalid JSON — fix the syntax to apply your changes to the preview.');
        return;
      }
      if (!Array.isArray(parsed?.schema) || !Array.isArray(parsed?.layout)) {
        setCodeError('Invalid JSON — fix the syntax to apply your changes to the preview.');
        return;
      }
      setCodeError('');
      isApplyingFromCode.current = true;
      applyDraftConfig(parsed);
    }, 400);
  };

  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setIsCodeCopied(true);
      setTimeout(() => setIsCodeCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  // ── AI Builder tab ───────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const undoStack = useRef<WidgetConfig[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const scrollChatToBottom = () => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    });
  };

  const snapshotConfig = (): WidgetConfig =>
    JSON.parse(JSON.stringify({ schema: previewSchema, layout: previewLayout }));

  const undoAiBuilder = () => {
    const previous = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!previous) return;
    applyDraftConfig(previous);
    setChatMessages((m) => [
      ...m,
      { role: 'assistant', content: 'Reverted to the widget from before your last request.' },
    ]);
    scrollChatToBottom();
  };

  const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const compressed = await compressImage(raw, file.type);
      setAttachedImage({ dataUrl: compressed.dataUrl, mimeType: compressed.mimeType, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendAiBuilderMessage = async () => {
    const message = chatInput.trim().replace(/\n{3,}/g, '\n\n');
    if ((!message && !attachedImage) || isSending) return;

    const history = chatMessages.map(({ role, content, image }) => ({
      role,
      content: content || (image ? '(image attached)' : ''),
    }));
    setChatMessages((m) => [
      ...m,
      { role: 'user', content: message, image: attachedImage?.dataUrl || null },
    ]);
    setChatInput('');
    const imageToSend = attachedImage;
    setAttachedImage(null);
    scrollChatToBottom();

    if (UNDO_INTENT.test(message)) {
      if (undoStack.current.length > 0) {
        undoAiBuilder();
      } else {
        setChatMessages((m) => [...m, { role: 'assistant', content: "There's nothing to undo yet." }]);
        scrollChatToBottom();
      }
      return;
    }

    setIsSending(true);
    try {
      const payload: Parameters<typeof widgetAiBuilder>[1] = {
        message,
        kind: tool.kind,
        current_config: { schema: previewSchema, layout: previewLayout },
        history,
        available_tool_slugs: httpToolOptions.map((o) => o.value),
      };
      if (imageToSend) {
        payload.image_data = imageToSend.dataUrl.split(',')[1];
        payload.image_mime_type = imageToSend.mimeType;
      }
      const before = snapshotConfig();
      const { config } = await widgetAiBuilder(tool.id, payload);
      undoStack.current.push(before);
      setCanUndo(true);
      applyDraftConfig(config);
      const didChange = stableStringify(before) !== stableStringify(config);
      if (!didChange) {
        undoStack.current.pop();
        setCanUndo(undoStack.current.length > 0);
      }
      setChatMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: didChange
            ? 'Updated the widget based on your request.'
            : "I couldn't find anything to change for that request — try rephrasing it.",
        },
      ]);
    } catch (err) {
      setChatMessages((m) => [
        ...m,
        { role: 'assistant', content: (err as Error).message || "Couldn't update the widget. Please try again." },
      ]);
    } finally {
      setIsSending(false);
      scrollChatToBottom();
    }
  };

  // ── Functions tab ────────────────────────────────────────────────────────
  const patchButton = (index: number, patch: Partial<DraftButton>) =>
    setDraft((d) => ({
      ...d,
      buttons: d.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));

  const buttonActionOptions = (button: DraftButton) =>
    (WIDGET_BUTTON_ACTIONS as readonly string[])
      .filter((action) => previewSchema.length > 0 || action !== 'submit' || button.action === action)
      .map((action) => ({ value: action, label: BUTTON_ACTION_LABELS[action] }));

  // ── States tab ───────────────────────────────────────────────────────────
  const stateTargetOptions = useMemo(
    () => [
      ...draft.fields.filter((f) => f.label).map((f) => ({ kind: 'field' as const, id: f.name, label: f.label })),
      ...draft.buttons
        .filter((b) => b.label)
        .map((b, index) => ({ kind: 'button' as const, id: index, label: b.label })),
    ],
    [draft.fields, draft.buttons],
  );

  const targetOptionsFor = (state: DraftState) => {
    const tested = conditionFieldKeys(state.visibility);
    return stateTargetOptions.filter((o) => !(o.kind === 'field' && tested.includes(o.id as string)));
  };

  const isTargetSelected = (state: DraftState, o: { kind: 'field' | 'button'; id: string | number }) =>
    state.targets.some((t) => t.kind === o.kind && t.id === o.id);

  const setStates = (next: DraftState[]) => setDraft((d) => ({ ...d, states: next }));

  const patchState = (index: number, patch: Partial<DraftState>) =>
    setStates(draft.states.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const toggleStateTarget = (index: number, o: { kind: 'field' | 'button'; id: string | number }) => {
    const next = draft.states.map((s) => ({ ...s, targets: [...s.targets] }));
    const state = next[index];
    if (state.targets.some((t) => t.kind === o.kind && t.id === o.id)) {
      state.targets = state.targets.filter((t) => !(t.kind === o.kind && t.id === o.id));
    } else {
      next.forEach((other, i) => {
        if (i === index) return;
        other.targets = other.targets.filter((t) => !(t.kind === o.kind && t.id === o.id));
      });
      state.targets.push({ kind: o.kind, id: o.id });
    }
    setStates(next);
  };

  const addState = () =>
    setStates([...draft.states, { visibility: newConditionGroup(), targets: [] }]);
  const removeState = (index: number) => setStates(draft.states.filter((_, i) => i !== index));

  const stateSummary = (state: DraftState) => {
    const first = state.visibility?.conditions?.[0];
    if (!first || first.kind === 'group' || !first.field) return '';
    const value = VISIBILITY_OPS_WITHOUT_VALUE.includes(first.op) ? '' : ` ${first.value}`;
    return `${first.field} ${first.op}${value}`.trim();
  };

  const impossibleCondition = (state: DraftState) => {
    const found = new Map<string, Set<string>>();
    const walk = (node: any) => {
      if (!node) return;
      if (node.kind === 'group') {
        if (node.combinator !== 'and') return;
        (node.conditions || []).forEach(walk);
        return;
      }
      if (node.op === 'eq' && node.field) {
        if (!found.has(node.field)) found.set(node.field, new Set());
        found.get(node.field)!.add(String(node.value ?? ''));
      }
    };
    walk(state.visibility);
    const clash = [...found.entries()].find(([, values]) => values.size > 1);
    if (!clash) return null;
    const [field, values] = clash;
    const label = draft.fields.find((f) => f.name === field)?.label || field;
    return { field: label, values: [...values].join(', ') };
  };

  const resetPreviewState = () => {
    setPreviewResetKey((k) => k + 1);
    setIsResettingPreview(true);
    setTimeout(() => setIsResettingPreview(false), 500);
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex w-full min-w-0 flex-1 flex-col items-start overflow-y-auto lg:flex-row">
      <div
        className={`flex w-full min-w-0 flex-col gap-4 px-6 py-4 lg:flex-1 ${
          activeTab === 'ai_builder' ? 'h-[640px] lg:h-[calc(100vh-9rem)]' : ''
        }`}
      >
        {/* Tab bar */}
        <div className="flex shrink-0 items-center gap-6 border-b border-gray-200 dark:border-border">
          {visibleTabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`-mb-px flex items-center gap-2 border-b-[3px] pb-3 text-sm transition-colors ${
                activeTab === key
                  ? 'border-gray-900 dark:border-border font-semibold text-gray-900 dark:text-foreground'
                  : 'border-transparent font-medium text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
              }`}
              onClick={() => setActiveTab(key)}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {/* AI Builder */}
        {activeTab === 'ai_builder' && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {canUndo && (
              <div className="flex shrink-0 justify-end">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                  onClick={undoAiBuilder}
                >
                  <Undo2 className="size-3.5" />
                  Undo
                </button>
              </div>
            )}
            <div ref={chatScrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
              {chatMessages.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted shadow-sm">
                    <Sparkles className="size-8 text-gray-400 dark:text-muted-foreground" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-foreground">
                    What would you like to build?
                  </h3>
                  <p className="text-base text-gray-500 dark:text-muted-foreground">Describe a change to your widget</p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.image && (
                    <img
                      src={m.image}
                      className="max-h-32 w-auto cursor-pointer rounded-xl object-cover shadow-sm"
                      alt="Attached"
                      onClick={() => setFullScreenImage(m.image!)}
                    />
                  )}
                  {m.content && (
                    <p
                      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3.5 py-2 text-sm ${
                        m.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 dark:bg-muted text-gray-900 dark:text-foreground'
                      }`}
                    >
                      {m.content}
                    </p>
                  )}
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-gray-100 dark:bg-muted px-3.5 py-3">
                    <div className="flex gap-1">
                      <span className="size-2 animate-bounce rounded-full bg-gray-400" />
                      <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                      <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <form
              className="relative mb-0 mt-2 flex w-full flex-col rounded-2xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted shadow-sm transition-all focus-within:border-gray-900 dark:focus-within:border-border focus-within:bg-white dark:focus-within:bg-card"
              onSubmit={(e) => {
                e.preventDefault();
                sendAiBuilderMessage();
              }}
            >
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImageFileChange} />
              {attachedImage && (
                <div className="px-4 pb-1 pt-4">
                  <div className="relative inline-block size-14">
                    <img
                      src={attachedImage.dataUrl}
                      className="size-14 cursor-pointer rounded-xl border border-gray-200 dark:border-border object-cover"
                      alt="Attached"
                      onClick={() => setFullScreenImage(attachedImage.dataUrl)}
                    />
                    <button
                      type="button"
                      className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-gray-200 dark:border-border bg-white dark:bg-card shadow-sm"
                      onClick={() => setAttachedImage(null)}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </div>
              )}
              <textarea
                value={chatInput}
                rows={1}
                placeholder="Describe a widget..."
                className="m-0 block max-h-[200px] min-h-[56px] w-full resize-none rounded-2xl border-0 bg-transparent py-[17px] pl-4 pr-24 text-[15px] leading-[22px] text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-muted-foreground outline-none"
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAiBuilderMessage();
                  }
                }}
              />
              <button
                type="button"
                className={`absolute bottom-3 right-[46px] inline-flex size-8 items-center justify-center rounded-full transition-all hover:bg-gray-200 dark:hover:bg-muted ${
                  attachedImage ? 'text-primary' : 'text-gray-400 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
                }`}
                title="Attach image for the AI to reference"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="size-4" />
              </button>
              <button
                type="submit"
                className={`absolute bottom-3 right-3 inline-flex size-8 items-center justify-center rounded-full transition-colors ${
                  !chatInput.trim() && !attachedImage
                    ? 'cursor-default bg-gray-200 dark:bg-muted text-gray-400 dark:text-muted-foreground'
                    : 'bg-gray-900 text-white shadow-sm hover:opacity-80 active:scale-95'
                }`}
                disabled={(!chatInput.trim() && !attachedImage) || isSending}
              >
                <ArrowUp className="size-4" />
              </button>
            </form>
          </div>
        )}

        {/* Code */}
        {activeTab === 'code' && (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between rounded-t-xl border border-gray-200 dark:border-border bg-white dark:bg-card px-4 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-muted-foreground">JSON</span>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                onClick={copyCode}
              >
                {isCodeCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {isCodeCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="min-h-[320px] flex-1">
              <WidgetCodeEditor value={codeText} onChange={onCodeTextInput} />
            </div>
            {codeError && <p className="shrink-0 text-xs text-red-500">{codeError}</p>}
          </div>
        )}

        {/* Functions */}
        {activeTab === 'functions' && (
          <div className="flex flex-col gap-4">
            {!draft.buttons.length && (
              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                No buttons yet. Add one in the Code tab, then configure what it does here.
              </p>
            )}
            {draft.buttons.map((button, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-foreground">{button.label || 'Button'}</span>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-900 dark:text-foreground">Button color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={button.color || DEFAULT_BUTTON_COLOR}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card p-0.5"
                      onChange={(e) => patchButton(index, { color: e.target.value })}
                    />
                    {button.color && (
                      <button
                        type="button"
                        className="text-xs font-medium text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                        onClick={() => patchButton(index, { color: '' })}
                      >
                        Use default
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-900 dark:text-foreground">Action</label>
                  <select
                    value={button.action}
                    className="h-10 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-900 dark:text-foreground"
                    onChange={(e) => patchButton(index, { action: e.target.value })}
                  >
                    {buttonActionOptions(button).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {button.action === 'open_url' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-900 dark:text-foreground">URL</label>
                    <input
                      value={button.url}
                      type="text"
                      placeholder="https://example.com/"
                      className="h-10 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-900 dark:text-foreground"
                      onChange={(e) => patchButton(index, { url: e.target.value })}
                    />
                    {previewSchema.length > 0 && (
                      <p className="mb-0 text-xs text-gray-500 dark:text-muted-foreground">
                        The customer's answers are appended to this URL in order.
                      </p>
                    )}
                  </div>
                )}
                {button.action === 'send_message' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-900 dark:text-foreground">Message</label>
                    <input
                      value={button.message}
                      type="text"
                      placeholder="Thanks!"
                      className="h-10 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-900 dark:text-foreground"
                      onChange={(e) => patchButton(index, { message: e.target.value })}
                    />
                  </div>
                )}
                {button.action === 'call_tool' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-900 dark:text-foreground">Tool</label>
                    <select
                      value={button.toolSlug}
                      className="h-10 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-900 dark:text-foreground"
                      onChange={(e) => patchButton(index, { toolSlug: e.target.value })}
                    >
                      <option value="">Select a tool</option>
                      {httpToolOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {!httpToolOptions.length && (
                      <span className="text-xs text-gray-400 dark:text-muted-foreground">No HTTP tools available on this assistant yet.</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* States */}
        {activeTab === 'states' && (
          <div className="flex flex-col gap-4">
            {!stateTargetOptions.length ? (
              <p className="text-sm text-gray-500 dark:text-muted-foreground">Add a field or button first, then set when it should show.</p>
            ) : (
              <>
                {draft.states.map((state, stateIndex) => {
                  const impossible = impossibleCondition(state);
                  return (
                    <div
                      key={stateIndex}
                      className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-foreground">State {stateIndex + 1}</span>
                          {stateSummary(state) && (
                            <span className="truncate text-xs text-gray-500 dark:text-muted-foreground">{stateSummary(state)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-gray-400 dark:text-muted-foreground transition-colors hover:text-red-500 dark:hover:text-red-500"
                          onClick={() => removeState(stateIndex)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-900 dark:text-foreground">Show when</label>
                        <WidgetConditionGroup
                          group={state.visibility}
                          schemaFields={previewSchema}
                          onChange={(next: EditGroup) => patchState(stateIndex, { visibility: next })}
                        />
                        {impossible && (
                          <p className="text-xs text-red-500">
                            This can never be true — {impossible.field} cannot equal both {impossible.values} at
                            once. Change the top connector to "Any of" if these are alternatives.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-900 dark:text-foreground">Apply to</label>
                        {targetOptionsFor(state).map((o) => (
                          <label
                            key={`${o.kind}-${o.id}`}
                            className="flex items-center gap-2 text-sm text-gray-500 dark:text-muted-foreground"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 dark:border-border"
                              checked={isTargetSelected(state, o)}
                              onChange={() => toggleStateTarget(stateIndex, o)}
                            />
                            {o.label}
                            <span className="text-xs text-gray-400 dark:text-muted-foreground">{o.kind}</span>
                          </label>
                        ))}
                        {!state.targets.length && (
                          <p className="text-xs text-gray-500 dark:text-muted-foreground">
                            Pick at least one field or button, or this state does nothing.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-gray-200 dark:border-border px-3 text-sm font-medium text-gray-900 dark:text-foreground transition-colors hover:bg-gray-50 dark:hover:bg-muted"
                  onClick={addState}
                >
                  <Plus className="size-4" />
                  Add state
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preview panel */}
      <div className="top-4 flex h-[640px] w-full min-w-0 flex-col border-gray-200 dark:border-border bg-gray-50/60 dark:bg-muted/60 lg:sticky lg:h-[calc(100vh-9rem)] lg:max-w-[600px] lg:flex-1 lg:border-l">
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-6">
          <div className={`flex w-full justify-center ${previewMode === 'agent_page' ? 'h-full' : ''}`}>
            {previewMode === 'widget' ? (
              <div className="w-full rounded-lg shadow-lg">
                <WidgetRenderer key={previewResetKey} schema={previewSchema} layout={previewLayout} />
              </div>
            ) : (
              <WidgetPreviewChrome title={tool.title} fullBleed={previewMode === 'agent_page'}>
                <WidgetRenderer key={previewResetKey} schema={previewSchema} layout={previewLayout} />
              </WidgetPreviewChrome>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-center gap-2 px-6 py-4">
          <div className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-1.5 shadow-sm">
            <div className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 dark:bg-muted p-1">
              {PREVIEW_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={`h-8 rounded-full px-4 text-[13px] font-medium transition-all ${
                    previewMode === mode.key
                      ? 'bg-white dark:bg-card text-gray-900 dark:text-foreground shadow-sm'
                      : 'text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
                  }`}
                  onClick={() => setPreviewMode(mode.key)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            title="Reset preview state"
            className="flex size-[52px] items-center justify-center rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-500 dark:text-muted-foreground shadow-sm transition-colors hover:text-gray-900 dark:hover:text-foreground"
            onClick={resetPreviewState}
          >
            <RefreshCw className={`size-4 ${isResettingPreview ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {fullScreenImage && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setFullScreenImage(null)}
        >
          <img
            src={fullScreenImage}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            alt="Attached"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-opacity hover:opacity-80"
            onClick={() => setFullScreenImage(null)}
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
});

export default WidgetBuilder;
