/* AI Call Recap — what was discussed on a call, and what happens next.
 *
 * Unlike the composer AI features, a recap is a STORED record, not a
 * throwaway suggestion. That difference drives most of the behaviour here:
 * it is read back for free on open, only generated on request, and can be
 * edited by the person who was on the call.
 *
 * WHY GENERATION IS NOT AUTOMATIC ON OPEN. Every generation is a real model
 * call the brand pays for. Opening a call in history should cost nothing, so
 * this reads what is stored and shows a Generate button when there is none.
 * Once generated it is saved, so opening it again is free forever.
 *
 * IT IS HONEST WHEN THERE IS NOTHING TO SAY. A call with no transcript, or
 * one too short to have content, says exactly that. A recap that invented a
 * plausible paragraph about a two-second call would be worse than no recap.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, handleAlert } from '@/lib/utils';
import { generateCallRecap, getCallRecap, updateCallRecap } from '@/services/api';

export interface CallRecapData {
  call_uuid: string;
  summary: string;
  action_items: string[];
  purpose: string;
  outcome: string;
  keywords: string[];
  intent: string;
  sentiment: { positive: number; neutral: number; negative: number } | null;
  edited: boolean;
  generated_at: string | null;
  unavailable_reason?: string | null;
}

interface AiCallRecapProps {
  callUuid: string;
  /* From call_history.transcript_file. NOT a reliable "was this call
     transcribed" signal: the callback that fills this column in is
     currently broken, so it is empty on most real calls even when a
     transcript genuinely exists on disk. The backend derives the file name
     from callUuid itself and finds it either way - trust its
     unavailable_reason, not this prop, to know whether a transcript exists. */
  transcriptFile?: string | null;
  className?: string;
}

const unwrap = (response: any) =>
  response?.data?.data?.result ?? response?.data?.result ?? null;

const AiCallRecap = ({ callUuid, transcriptFile, className }: AiCallRecapProps) => {
  const [recap, setRecap] = useState<CallRecapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  /* Edit buffers, kept separate so Cancel can discard without a refetch. */
  const [draftSummary, setDraftSummary] = useState('');
  const [draftItems, setDraftItems] = useState<string[]>([]);

  /* Reads what is stored. Free - never calls the model. */
  const load = useCallback(async () => {
    if (!callUuid) return;
    setIsLoading(true);
    try {
      const response = await getCallRecap({ call_uuid: callUuid });
      setRecap(unwrap(response)?.recap ?? null);
    } catch {
      /* A missing recap is a normal state, not an error worth interrupting
         someone over - the panel simply offers to generate one. */
      setRecap(null);
    } finally {
      setIsLoading(false);
    }
  }, [callUuid]);

  useEffect(() => {
    setIsEditing(false);
    setCopied(false);
    load();
  }, [load]);

  const generate = async (force = false) => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const response = await generateCallRecap({
        call_uuid: callUuid,
        transcript_file: transcriptFile || null,
        force,
      });
      const result = unwrap(response);
      if (result) setRecap(result);
    } catch (error: any) {
      handleAlert({
        text:
          error?.response?.data?.message ||
          error?.message ||
          'The recap could not be generated. Please try again.',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = () => {
    setDraftSummary(recap?.summary || '');
    setDraftItems([...(recap?.action_items || [])]);
    setIsEditing(true);
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const response = await updateCallRecap({
        call_uuid: callUuid,
        summary: draftSummary,
        action_items: draftItems.map((i) => i.trim()).filter(Boolean),
      });
      const result = unwrap(response);
      if (result) setRecap(result);
      setIsEditing(false);
    } catch (error: any) {
      handleAlert({
        text: error?.response?.data?.message || error?.message || 'The recap could not be saved.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  /* Plain text rather than the JSON shape: what gets pasted into a ticket or
     an email should read like notes, not like a payload. */
  const copy = async () => {
    if (!recap) return;
    const lines = [`Call summary`, recap.summary];
    if (recap.action_items.length) {
      lines.push('', 'Action items:');
      recap.action_items.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    }
    if (recap.purpose) lines.push('', `Purpose: ${recap.purpose}`);
    if (recap.outcome) lines.push(`Outcome: ${recap.outcome}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      handleAlert({ text: 'Could not copy to the clipboard.', type: 'error' });
    }
  };

  const header = (
    <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-gray-900">AI Recap</p>
        {recap?.edited ? (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
            Edited
          </span>
        ) : null}
      </div>
      {recap && !recap.unavailable_reason && !isEditing ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Copy recap"
            aria-label="Copy recap"
            onClick={copy}
            className="cursor-pointer rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <ClipboardCopy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            title="Edit recap"
            aria-label="Edit recap"
            onClick={startEditing}
            className="cursor-pointer rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Regenerate from the transcript"
            aria-label="Regenerate recap"
            disabled={isGenerating}
            onClick={() => generate(true)}
            className="cursor-pointer rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
          </button>
        </div>
      ) : null}
    </div>
  );

  const body = () => {
    if (isLoading) {
      return (
        <p className="flex items-center gap-2 px-3 py-6 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading recap…
        </p>
      );
    }

    /* Whether a transcript exists is the backend's call, not this prop's -
       see the transcriptFile comment above. A stored unavailable_reason is
       the honest, already-tried answer; always offer to try again, since a
       transcript can turn up later (e.g. once uploaded to storage). */
    if (recap?.unavailable_reason && !recap.summary) {
      return (
        <div className="px-3 py-5">
          <p className="text-xs leading-relaxed text-gray-500">{recap.unavailable_reason}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={isGenerating}
            onClick={() => generate(true)}
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Try again'}
          </Button>
        </div>
      );
    }

    if (!recap?.summary) {
      return (
        <div className="px-3 py-5">
          <p className="text-xs leading-relaxed text-gray-500">
            No recap yet for this call.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="mt-3"
            disabled={isGenerating}
            onClick={() => generate(false)}
          >
            {isGenerating ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reading the call…
              </span>
            ) : (
              'Generate recap'
            )}
          </Button>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-700">Summary</label>
            <textarea
              value={draftSummary}
              onChange={(e) => setDraftSummary(e.target.value)}
              rows={5}
              className="w-full resize-y rounded-lg border border-gray-200 px-2.5 py-2 text-sm leading-relaxed text-gray-900 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-700">Action items</label>
            {draftItems.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Input
                  value={item}
                  className="h-8 flex-1"
                  onChange={(e) => {
                    const next = [...draftItems];
                    next[index] = e.target.value;
                    setDraftItems(next);
                  }}
                />
                <button
                  type="button"
                  aria-label="Remove action item"
                  onClick={() => setDraftItems(draftItems.filter((_, i) => i !== index))}
                  className="cursor-pointer rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDraftItems([...draftItems, ''])}
              className="flex cursor-pointer items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add action item
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isSaving || !draftSummary.trim()}
              onClick={save}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
            {recap.summary}
          </p>
        </div>

        {(recap.purpose || recap.outcome) && (
          <div className="flex flex-wrap gap-1.5">
            {recap.purpose ? (
              <span className="rounded border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                {recap.purpose}
              </span>
            ) : null}
            {recap.outcome ? (
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {recap.outcome}
              </span>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Action items
          </p>
          {recap.action_items.length ? (
            <ol className="flex list-decimal flex-col gap-1.5 pl-4">
              {recap.action_items.map((item, index) => (
                <li key={index} className="text-sm leading-relaxed text-gray-900">
                  {item}
                </li>
              ))}
            </ol>
          ) : (
            /* Not a failure. Plenty of calls end without anyone committing to
               anything, and saying so beats an empty space that reads as a
               bug. */
            <p className="text-xs text-gray-500">No follow-up tasks were agreed on this call.</p>
          )}
        </div>

        <p className="border-t border-gray-100 pt-2 text-[11px] text-gray-400">
          Powered by AI. This is generated from the call transcript and can make mistakes —
          please double-check anything important.
        </p>
      </div>
    );
  };

  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white', className)}>
      {header}
      {body()}
    </div>
  );
};

export default AiCallRecap;
