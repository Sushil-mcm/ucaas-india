import TextEditor from '@/components/custom/text-editor';
import type { ScriptRun } from '@/components/custom/script-blocks';
import { resolveScriptNodes, type ScriptVariableValues } from '@/lib/script-variables';
import { nextPageId, pageLabel, type ScriptPage } from '@/lib/script-pages';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/* A script read one page at a time, the way the agent reads it.
 *
 * Shows the current page with its placeholders filled in, the choices the
 * page offers at the bottom, and Back / Next. Next follows the page's rules:
 * a choice made here, then the disposition chosen so far on the call, then
 * the following page. The trail at the top is the path this call has taken,
 * not every page the script has - a page for the other branch is never shown.
 *
 * Used live (the side panel, with the call's values) and in the editor's
 * Preview (with sample values). Both see the same component, so what the
 * admin previews is what the agent gets. */
type ScriptPagesViewerProps = {
  pages: ScriptPage[];
  values: ScriptVariableValues;
  /* The disposition the agent has chosen so far, if any. */
  disposition?: string | null;
  /* Changes when a new call starts, so the reader begins at page one again. */
  resetKey?: string;
  /* Compact type for the narrow side panel. */
  dense?: boolean;
  /* On a live call: the agent's answers so far and where a new one goes, so
     the questions and embedded pages on a page work. Absent in Preview. */
  scriptRun?: ScriptRun | null;
};

const ScriptPagesViewer = ({
  pages,
  values,
  disposition,
  resetKey = '',
  dense = false,
  scriptRun = null,
}: ScriptPagesViewerProps) => {
  /* The pages visited so far, current page last. */
  const [trail, setTrail] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    setTrail(pages[0] ? [pages[0].id] : []);
    setChoice(null);
  }, [resetKey, pages]);

  const currentId = trail[trail.length - 1] || pages[0]?.id || '';
  const current = useMemo(() => pages.find((page) => page.id === currentId) || pages[0], [pages, currentId]);
  const resolvedBody = useMemo(
    () => (current ? resolveScriptNodes(current.body, values) : []),
    [current, values],
  );
  const targetId = current ? nextPageId(pages, current.id, { choice, disposition }) : null;

  const goTo = (id: string | null) => {
    if (!id) return;
    setTrail((prev) => [...prev, id]);
    setChoice(null);
  };
  const goBack = () => {
    setTrail((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setChoice(null);
  };
  const pick = (label: string) => {
    setChoice(label);
    const id = current ? nextPageId(pages, current.id, { choice: label, disposition }) : null;
    if (id) goTo(id);
  };

  if (!current) return null;
  const many = pages.length > 1;
  const text = dense ? 'text-[12px]' : 'text-sm';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {many ? (
        <div className={`no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto pb-1 ${text} text-[#6c809e]`}>
          {trail.map((id, index) => (
            <span key={`${id}-${index}`} className="flex items-center gap-1 whitespace-nowrap">
              {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0" /> : null}
              <span className={index === trail.length - 1 ? 'font-semibold text-[#2b4568]' : ''}>
                {pageLabel(pages, id)}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-ucass-active-bg p-2">
        <TextEditor
          key={`${resetKey}-${current.id}-${trail.length}`}
          initialValue={resolvedBody}
          readOnly={true}
          maxHeight={`h-full ${text}`}
          scriptRun={scriptRun}
        />
      </div>

      {current.choices.length > 0 ? (
        <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
          {current.choices.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => pick(label)}
              className={`rounded-full border px-3 py-1 ${text} font-medium transition ${
                choice === label
                  ? 'border-primary bg-primary text-white'
                  : 'border-[#c9dcf8] bg-white text-[#243a59] hover:border-primary hover:bg-[#f3f7ff]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {many ? (
        <div className={`mt-2 flex shrink-0 items-center justify-between gap-2 ${text}`}>
          <button
            type="button"
            onClick={goBack}
            disabled={trail.length <= 1}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#5f7392] hover:bg-[#f3f7ff] disabled:cursor-default disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {targetId ? (
            <button
              type="button"
              onClick={() => goTo(targetId)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f3f7ff] px-2.5 py-1 font-semibold text-primary hover:bg-primary hover:text-white"
              title={`Next: ${pageLabel(pages, targetId)}`}
            >
              Next
              <span className="max-w-[9rem] truncate font-normal opacity-80">
                · {pageLabel(pages, targetId)}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="px-2 text-[#6c809e]">End of script</span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ScriptPagesViewer;
