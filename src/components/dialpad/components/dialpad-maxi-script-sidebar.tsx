import Loader from '@/components/custom/loader';
import TextEditor from '@/components/custom/text-editor';
import { getCallScriptDetail } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

type DialpadMaxiScriptSidebarProps = {
  scriptId: string;
  sessionId?: string | null;
};

type ScriptNode = {
  type?: string;
  children?: Array<{ text?: string }>;
};

type CallScriptDetail = {
  _id?: string;
  name?: string;
  script?: ScriptNode[] | string | null;
  content?: ScriptNode[] | string | null;
};

const EMPTY_SCRIPT_BLOCKS = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const resolveScriptDetailPayload = (response: any): CallScriptDetail | null => {
  if (!response) return null;
  return (
    response?.data?.data?.result ||
    response?.data?.result ||
    response?.data?.data ||
    response?.result ||
    null
  );
};

const resolveScriptBlocks = (scriptDetail: CallScriptDetail | null): ScriptNode[] => {
  const rawScript = scriptDetail?.script ?? scriptDetail?.content;

  if (Array.isArray(rawScript)) return rawScript;

  if (typeof rawScript === 'string') {
    const normalizedScript = rawScript.trim();
    if (!normalizedScript) return EMPTY_SCRIPT_BLOCKS;

    try {
      const parsed = JSON.parse(normalizedScript);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [
        {
          type: 'paragraph',
          children: [{ text: normalizedScript }],
        },
      ];
    }

    return [
      {
        type: 'paragraph',
        children: [{ text: normalizedScript }],
      },
    ];
  }

  if (rawScript && typeof rawScript === 'object') {
    if (Array.isArray((rawScript as any).children)) return [rawScript];
    return EMPTY_SCRIPT_BLOCKS;
  }

  return EMPTY_SCRIPT_BLOCKS;
};

const DialpadMaxiScriptSidebar = ({ scriptId, sessionId }: DialpadMaxiScriptSidebarProps) => {
  const normalizedScriptId = String(scriptId || '').trim();

  const {
    data: scriptDetail,
    isLoading: isScriptLoading,
    isError: isScriptError,
  } = useQuery({
    queryKey: ['getCallScriptDetail', 'dialpad-maxi-script-sidebar', normalizedScriptId],
    queryFn: () => getCallScriptDetail({ scriptId: normalizedScriptId }),
    select: (response: any) => resolveScriptDetailPayload(response),
    enabled: Boolean(normalizedScriptId),
  });

  const scriptTitle = String(scriptDetail?.name || '').trim() || 'Call Script';
  const scriptBlocks = useMemo(() => resolveScriptBlocks(scriptDetail ?? null), [scriptDetail]);
  const hasScriptContent = useMemo(
    () =>
      scriptBlocks.some((block) =>
        Array.isArray(block?.children)
          ? block.children.some((child) => String(child?.text || '').trim().length > 0)
          : false,
      ),
    [scriptBlocks],
  );

  return (
    <aside className="h-full min-h-0 rounded-2xl border border-ucass-active-bg bg-white p-2.5">
      <div className="flex h-full min-h-0 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a7396] sm:text-xs">
          Script
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-[#2b4568]">{scriptTitle}</p>

        {!normalizedScriptId ? (
          <p className="mt-2 text-[13px] text-[#6c809e] sm:text-sm">No script assigned.</p>
        ) : isScriptLoading ? (
          <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">
            <Loader variant="blue" />
          </div>
        ) : isScriptError ? (
          <p className="mt-2 text-[13px] text-[#6c809e] sm:text-sm">Unable to load script.</p>
        ) : hasScriptContent ? (
          <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-xl border border-ucass-active-bg p-2">
            <TextEditor
              key={`${sessionId || 'session'}-${normalizedScriptId}`}
              initialValue={scriptBlocks}
              readOnly={true}
              maxHeight="h-full text-sm"
            />
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-[#6c809e] sm:text-sm">
            Script content not available.
          </p>
        )}
      </div>
    </aside>
  );
};

export default DialpadMaxiScriptSidebar;
