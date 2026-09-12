import Loader from '@/components/custom/loader';
import { scriptValuesFromCall } from '@/lib/script-variables';
import { pagesOf } from '@/lib/script-pages';
import ScriptPagesViewer from '@/components/custom/script-pages-viewer';
import {
  scriptInputsIn,
  validateScriptAnswers,
  type ScriptAnswerValue,
  type ScriptAnswers,
} from '@/lib/script-inputs';
import type { ScriptRun } from '@/components/custom/script-blocks';
import { useDialpad } from '@/hooks/use-dialpad';
import { getCallScriptDetail } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

/* The call this script is being read on, so its placeholders can be filled in.
   Built by the panel above, which already holds the lead, the caller, the
   agent and the campaign or queue. */
export type ScriptCallValues = {
  customerName?: unknown;
  customerNumber?: unknown;
  customerEmail?: unknown;
  agentName?: unknown;
  agentExtension?: unknown;
  agentEmail?: unknown;
  companyName?: unknown;
  campaignName?: unknown;
  queueName?: unknown;
};

type DialpadMaxiScriptSidebarProps = {
  scriptId: string;
  call?: ScriptCallValues;
  sessionId?: string | null;
  /* The disposition the agent has chosen so far on this call: a page can
     send the call to another page on the strength of it. */
  disposition?: string | null;
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
  pages?: unknown;
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

const DialpadMaxiScriptSidebar = ({
  scriptId,
  sessionId,
  call,
  disposition,
}: DialpadMaxiScriptSidebarProps) => {
  const normalizedScriptId = String(scriptId || '').trim();

  const {
    data: scriptDetail,
    isLoading: isScriptLoading,
    isError: isScriptError,
    error: scriptError,
  } = useQuery({
    queryKey: ['getCallScriptDetail', 'dialpad-maxi-script-sidebar', normalizedScriptId],
    queryFn: () => getCallScriptDetail({ scriptId: normalizedScriptId }),
    select: (response: any) => resolveScriptDetailPayload(response),
    enabled: Boolean(normalizedScriptId),
  });

  const scriptTitle = String(scriptDetail?.name || '').trim() || 'Call Script';
  const callValues = useMemo(() => scriptValuesFromCall(call || {}), [call]);
  /* The script is stored with its placeholders and resolved every time it is
     read, so the same script says the right name on every call. A script
     saved before pages existed is one page; the viewer reads either. */
  const pages = useMemo(
    () => pagesOf({ pages: scriptDetail?.pages, script: resolveScriptBlocks(scriptDetail ?? null) }),
    [scriptDetail],
  );
  /* Every block on every page, for the questions the script asks. */
  const scriptBlocks = useMemo(() => pages.flatMap((page) => page.body as any[]), [pages]);
  const hasScriptContent = useMemo(
    () =>
      pages.some((page) =>
        page.body.some((block: any) =>
          Array.isArray(block?.children)
            ? block.children.some((child: any) => String(child?.text || '').trim().length > 0) ||
              block.type === 'input' ||
              block.type === 'embed'
            : false,
        ),
      ),
    [pages],
  );
  /* The server says why in words when it refuses - a draft, most likely. */
  const scriptErrorText =
    (scriptError as any)?.response?.data?.error?.message ||
    (scriptError as any)?.response?.data?.message ||
    'Unable to load script.';

  /* The questions this script asks, and what the agent has answered so far.
     Answers live on the session so the disposition save (a different tab)
     can send them with the call; with no session yet - a preview lead - they
     are kept here until one exists. */
  const { sessions, patchSession } = useDialpad();
  const session = sessionId ? sessions?.[sessionId] : null;
  const scriptInputs = useMemo(() => scriptInputsIn(scriptBlocks), [scriptBlocks]);
  const [localAnswers, setLocalAnswers] = useState<ScriptAnswers>({});
  const answers: ScriptAnswers = session?.scriptAnswers ?? localAnswers;
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!sessionId || !session) return;
    if (session.scriptInputs === scriptInputs && (session.scriptId || '') === normalizedScriptId) return;
    /* The questions for the save's validation, and the script's id so the
       saved disposition says which script the answers belong to. */
    patchSession(sessionId, { scriptInputs, scriptId: normalizedScriptId });
  }, [sessionId, session, scriptInputs, normalizedScriptId, patchSession]);

  const onAnswer = useCallback(
    (key: string, value: ScriptAnswerValue) => {
      setTouched(true);
      const next = { ...answers, [key]: value };
      if (sessionId && session) patchSession(sessionId, { scriptAnswers: next });
      else setLocalAnswers(next);
    },
    [answers, sessionId, session, patchSession],
  );

  /* Problems are shown only once the agent has started answering, so a
     fresh script is not covered in red before they have read it. */
  const problems = useMemo(() => {
    if (!touched) return {};
    return Object.fromEntries(
      validateScriptAnswers(scriptInputs, answers).problems.map((p) => [p.key, p.message]),
    );
  }, [touched, scriptInputs, answers]);

  const scriptRun: ScriptRun = useMemo(
    () => ({ answers, onAnswer, values: callValues, problems }),
    [answers, onAnswer, callValues, problems],
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
          <p className="mt-2 text-[13px] text-[#6c809e] sm:text-sm">{scriptErrorText}</p>
        ) : hasScriptContent ? (
          <div className="mt-2 min-h-0 flex-1">
            <ScriptPagesViewer
              pages={pages}
              values={callValues}
              disposition={disposition}
              resetKey={`${sessionId || 'session'}-${normalizedScriptId}`}
              scriptRun={scriptRun}
              dense
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
