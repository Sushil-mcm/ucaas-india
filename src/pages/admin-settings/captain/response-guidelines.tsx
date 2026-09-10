import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';

import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';

const EXAMPLES = [
  'Always respond in a friendly and professional tone.',
  'Keep responses concise — aim for under 3 sentences where possible.',
  'Use bullet points when listing more than 2 items.',
];

const ResponseGuidelines = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [assistantId, setAssistantId] = useState<string>('');
  const [items, setItems] = useState<string[]>([]);
  const [showExamples, setShowExamples] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    captainFetch(`${CAPTAIN_API_BASE}/assistants`)
      .then((r) => r.json())
      .then((j) => {
        const first = (j.data || [])[0];
        if (!first) return;
        setAssistantId(first.id);
        setItems(first.response_guidelines || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const save = async (next: string[]) => {
    if (!assistantId) return;
    setIsSaving(true);
    setError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants/${assistantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_guidelines: next }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setItems(next);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || items.includes(trimmed)) return;
    await save([...items, trimmed]);
    setDraft('');
    setAdding(false);
  };

  const removeItem = (idx: number) => {
    save(items.filter((_, i) => i !== idx));
  };

  const addExample = (ex: string) => {
    if (!items.includes(ex)) save([...items, ex]);
  };

  const addAllExamples = () => {
    const toAdd = EXAMPLES.filter((e) => !items.includes(e));
    if (toAdd.length) save([...items, ...toAdd]);
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin-settings/captain/settings')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Response Guidelines</h1>
      </div>

      <div className="max-w-3xl">
        {/* Description */}
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          The vibe and structure of your assistant's replies — clear and friendly? Short and snappy? Detailed and formal?
        </p>

        {/* Examples panel */}
        {showExamples && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Response Guidelines</span>
                <button
                  type="button"
                  onClick={addAllExamples}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Add all
                </button>
              </div>
              <button type="button" onClick={() => setShowExamples(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="size-4" />
              </button>
            </div>
            {EXAMPLES.map((ex, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-700/60">
                <span className="text-sm text-gray-700 dark:text-gray-300">{ex}</span>
                <button
                  type="button"
                  onClick={() => addExample(ex)}
                  disabled={items.includes(ex)}
                  className="shrink-0 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {items.includes(ex) ? 'Added' : 'Add this'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add button */}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Add a response guideline
          </button>
        )}

        {/* Existing items */}
        {items.length === 0 && !adding ? (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">No response guidelines found. Create or add examples to begin.</p>
        ) : (
          <div className="mb-4 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-700/60 dark:border-gray-700 dark:bg-gray-800">
            {items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">{item}</p>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="mt-0.5 shrink-0 text-gray-400 dark:text-muted-foreground hover:text-red-500 dark:hover:text-red-500"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {adding && (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <textarea
              ref={inputRef as any}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(draft); } }}
              rows={3}
              placeholder="Type in another response guideline..."
              className="w-full resize-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setAdding(false); setDraft(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addItem(draft)}
                disabled={!draft.trim() || isSaving}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Inline quick-add bar */}
        {!adding && (
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-1 items-center gap-2">
              <Plus className="size-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
              <input
                placeholder="Type in another response guideline..."
                className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    addItem(val).then(() => { (e.target as HTMLInputElement).value = ''; });
                  }
                }}
              />
            </div>
            <span className="shrink-0 text-xs text-gray-400 dark:text-muted-foreground">Add and save (↵)</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseGuidelines;
