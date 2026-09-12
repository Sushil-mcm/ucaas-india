import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, GitBranch, X, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { handleAlert } from '@/lib/utils';
import { AssistantSwitcher, useSelectedAssistant } from './assistant-switcher';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';
import { BulkSelectBar } from '@/components/captain/BulkSelectBar';
import { BulkDeleteDialog } from '@/components/captain/BulkDeleteDialog';
import { DeleteConfirmDialog } from '@/components/captain/DeleteConfirmDialog';

const HIDE_SUGGESTIONS_KEY = 'captain_scenarios_hide_suggestions';

type Scenario = {
  id: string;
  assistant_id: string;
  title: string;
  description: string | null;
  instruction: string;
  enabled: boolean;
  tools: string[];
  created_at: string;
};

type ToolMeta = { id: string; title: string; description: string };

type ScenarioForm = {
  title: string;
  description: string;
  instruction: string;
  enabled: boolean;
};

const emptyForm: ScenarioForm = {
  title: '',
  description: '',
  instruction: '',
  enabled: true,
};

// Port of Chatwoot's getToolsFromInstruction (Index.vue): a scenario's tool list
// is derived from `(tool://tool_id)` mentions written into the instruction. Also
// tolerate a bare `@tool_id` so admins can jot tools without markdown link syntax.
const getToolsFromInstruction = (instruction: string): string[] => {
  const fromLinks = [...(instruction.matchAll(/\(tool:\/\/([^)\s]+)\)/g) ?? [])].map((m) => m[1]);
  const fromMentions = [...(instruction.matchAll(/(?:^|\s)@([a-z0-9_]+)/gi) ?? [])].map((m) => m[1]);
  return [...new Set([...fromLinks, ...fromMentions])];
};

// Port of Chatwoot's scenariosExample. `handoff` -> `handoff_to_human` to match
// this codebase's built-in tool id.
const scenarioExamples: Array<ScenarioForm & { tools: string[] }> = [
  {
    title: 'Prospective Buyer',
    description: 'Handle customers who are showing interest in purchasing a license',
    instruction:
      'If someone is interested in purchasing a license, ask them for the following:\n\n' +
      '1. How many licenses are they willing to purchase?\n' +
      '2. Are they migrating from another platform?\n\n' +
      'Once these details are collected:\n' +
      '1. Add a private note with the information you collected using [Add Private Note](tool://add_private_note)\n' +
      '2. Add the label "sales" to the conversation using [Add Label](tool://add_label_to_conversation)\n' +
      '3. Reply saying "one of us will reach out soon" with an estimated timeline, then [Handoff to Human](tool://handoff_to_human)',
    enabled: true,
    tools: ['add_private_note', 'add_label_to_conversation', 'handoff_to_human'],
  },
];

const textAreaClass =
  'w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition-all placeholder:text-gray-400 hover:border-primary dark:hover:border-primary focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400';

const CaptainScenarios = () => {
  const { assistants, selectedId, selectAssistant } = useSelectedAssistant();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [tools, setTools] = useState<ToolMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScenarioForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hideSuggestions, setHideSuggestions] = useState(
    () => localStorage.getItem(HIDE_SUGGESTIONS_KEY) === '1',
  );

  const fetchScenarios = async (assistantId: string) => {
    if (!assistantId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants/${assistantId}/scenarios`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load scenarios');
      setScenarios(json.data || []);
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.message || 'Failed to load scenarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) fetchScenarios(selectedId);
    else setIsLoading(false);
  }, [selectedId]);

  useEffect(() => {
    captainFetch(`${CAPTAIN_API_BASE}/assistants/tools/list`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setTools(j.data || []))
      .catch(() => setTools([]));
  }, []);

  const filteredScenarios = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scenarios;
    return scenarios.filter((s) =>
      [s.title, s.description || '', s.instruction].some((v) => v.toLowerCase().includes(q)),
    );
  }, [scenarios, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Scenario) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description || '',
      instruction: s.instruction,
      enabled: s.enabled,
    });
    setError('');
    setIsModalOpen(true);
  };

  const persistScenario = async (
    payload: ScenarioForm & { tools: string[] },
    id?: string,
  ) => {
    const url = id
      ? `${CAPTAIN_API_BASE}/assistants/${selectedId}/scenarios/${id}`
      : `${CAPTAIN_API_BASE}/assistants/${selectedId}/scenarios`;
    const res = await captainFetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save');
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.instruction.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      await persistScenario(
        { ...form, tools: getToolsFromInstruction(form.instruction) },
        editingId || undefined,
      );
      setIsModalOpen(false);
      fetchScenarios(selectedId);
      handleAlert({ text: editingId ? 'Scenario updated' : 'Scenario created', type: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Failed to save scenario');
      handleAlert({ text: err?.message || 'Failed to save scenario', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const addExample = async (ex: ScenarioForm & { tools: string[] }) => {
    if (!selectedId) return;
    setError('');
    try {
      await persistScenario({ ...ex, tools: getToolsFromInstruction(ex.instruction) });
      fetchScenarios(selectedId);
      handleAlert({ text: `Added "${ex.title}"`, type: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Failed to add scenario');
      handleAlert({ text: err?.message || 'Failed to add scenario', type: 'error' });
    }
  };

  const addAllExamples = async () => {
    for (const ex of scenarioExamples) await addExample(ex);
  };

  const dismissSuggestions = () => {
    localStorage.setItem(HIDE_SUGGESTIONS_KEY, '1');
    setHideSuggestions(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await captainFetch(`${CAPTAIN_API_BASE}/assistants/${selectedId}/scenarios/${id}`, {
        method: 'DELETE',
      });
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      handleAlert({ text: 'Scenario deleted', type: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Failed to delete');
      handleAlert({ text: err?.message || 'Failed to delete scenario', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  // Chatwoot has no bulk-delete endpoint either — it Promise.all()s single deletes.
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          captainFetch(`${CAPTAIN_API_BASE}/assistants/${selectedId}/scenarios/${id}`, {
            method: 'DELETE',
          }),
        ),
      );
      setScenarios((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      handleAlert({ text: 'Scenarios deleted', type: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Failed to delete scenarios');
      handleAlert({ text: err?.message || 'Failed to delete scenarios', type: 'error' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleToggle = async (s: Scenario) => {
    const next = !s.enabled;
    setScenarios((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: next } : x)));
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants/${selectedId}/scenarios/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error('request failed');
      handleAlert({ text: next ? 'Scenario enabled' : 'Scenario disabled', type: 'success' });
    } catch {
      setScenarios((prev) => prev.map((x) => (x.id === s.id ? s : x)));
      handleAlert({ text: 'Could not update the scenario', type: 'error' });
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCardHover = (isHovered: boolean, id: string) => {
    setHoveredCard(isHovered ? id : null);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const previewTools = getToolsFromInstruction(form.instruction);

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <AssistantSwitcher assistants={assistants} selectedId={selectedId} onSelect={selectAssistant} pageTitle="Scenarios" />
        <Button type="button" variant="primary" onClick={openCreateModal} disabled={!selectedId}>
          <Plus className="size-4" />
          Add a scenario
        </Button>
      </div>

      <div className="text-sm text-gray-500 dark:text-muted-foreground">
        Give your assistant some context—like &ldquo;what to do when a user is stuck,&rdquo; or
        &ldquo;how to act during a refund request.&rdquo; Matching conversations are routed to a
        specialised sub-agent.
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      {selectedId && !hideSuggestions && (
        <div className="rounded-2xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800 dark:text-foreground">Example scenarios</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addAllExamples}>
                Add all
              </Button>
              <button type="button" onClick={dismissSuggestions} className="rounded-md p-1 text-gray-400 dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {scenarioExamples.map((ex) => (
              <div key={ex.title} className="rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-foreground">{ex.title}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => addExample(ex)}>
                    Add this
                  </Button>
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">{ex.description}</div>
                <div className="mt-1 text-xs font-medium text-gray-400 dark:text-muted-foreground">
                  Tools used: {ex.tools.map((t) => `@${t}`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedId && (
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scenarios..."
            className="pl-9"
          />
        </div>
      )}

      <BulkSelectBar
        items={filteredScenarios}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSelectAllLabel={(count, allSelected) =>
          allSelected ? `Unselect all (${count})` : `Select all (${count})`
        }
        selectedCountLabel={(count) => `${count} selected`}
        deleteLabel="Delete"
        onDelete={() => setIsBulkDeleteDialogOpen(true)}
        isDeleting={isBulkDeleting}
      />

      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : !selectedId ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-muted-foreground">
            Select an assistant to view scenarios.
          </div>
        ) : scenarios.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-gray-500 dark:text-muted-foreground">
            <GitBranch className="size-6 text-gray-300 dark:text-muted-foreground" />
            No scenarios found. Create or add examples to begin.
          </div>
        ) : filteredScenarios.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-muted-foreground">
            No scenarios found for this search.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-border">
            {filteredScenarios.map((s) => {
              const isExpanded = expandedIds.has(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onMouseEnter={() => handleCardHover(true, s.id)}
                  onMouseLeave={() => handleCardHover(false, s.id)}
                >
                  <div className="flex flex-1 items-start gap-3">
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedIds.has(s.id)}
                        onCheckedChange={() => toggleSelected(s.id)}
                        className={`transition-opacity ${
                          hoveredCard === s.id || selectedIds.size > 0 ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    </div>
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                      <GitBranch className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-950 dark:text-foreground">{s.title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 dark:bg-muted text-gray-500 dark:text-muted-foreground'
                          }`}
                        >
                          {s.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {s.description && <div className="mt-0.5 text-sm text-gray-500 dark:text-muted-foreground">{s.description}</div>}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpanded(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleExpanded(s.id);
                          }
                        }}
                        aria-label={isExpanded ? 'Show less' : 'Show more'}
                        className="mt-1 cursor-pointer whitespace-pre-wrap text-xs text-gray-400 outline-none dark:text-muted-foreground"
                      >
                        <div className={isExpanded ? '' : 'line-clamp-2'}>{s.instruction}</div>
                        {!isExpanded && (
                          <ChevronDown className="mx-auto mt-0.5 size-3.5 text-gray-300 dark:text-muted-foreground/70" />
                        )}
                      </div>
                      {s.tools?.length > 0 && (
                        <div className="mt-1.5 text-xs font-medium text-gray-400 dark:text-muted-foreground">
                          Tools used: {s.tools.map((t) => `@${t}`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch checked={s.enabled} onCheckedChange={() => handleToggle(s)} />
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(s)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructiveOutline"
                      size="sm"
                      disabled={deletingId === s.id}
                      onClick={() => setPendingDeleteId(s.id)}
                    >
                      <Trash2 className="size-3.5" />
                      {deletingId === s.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-border bg-white dark:bg-card px-6 py-4">
            <DialogTitle className="text-base font-bold text-gray-950 dark:text-foreground">
              {editingId ? 'Edit scenario' : 'Create a scenario'}
            </DialogTitle>
          </div>

          <div className="flex flex-col gap-5 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Enter a name for the scenario"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe how and where this scenario will be used"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>How to handle</Label>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">
                Instructions for the sub-agent when this scenario is triggered. Reference a tool by
                writing <code className="rounded bg-gray-100 dark:bg-muted px-1">[Label](tool://tool_id)</code> —
                those tools become the only ones this scenario can use.
              </p>
              <textarea
                value={form.instruction}
                onChange={(e) => setForm((f) => ({ ...f, instruction: e.target.value }))}
                rows={7}
                className={textAreaClass}
                placeholder={
                  'When a customer mentions a billing issue, first look up their account details. ' +
                  'Apologise and add a private note with [Add Private Note](tool://add_private_note)...'
                }
              />
              {previewTools.length > 0 && (
                <div className="text-xs font-medium text-gray-400 dark:text-muted-foreground">
                  Tools used: {previewTools.map((t) => `@${t}`).join(', ')}
                </div>
              )}
              {tools.length > 0 && (
                <details className="text-xs text-gray-500 dark:text-muted-foreground">
                  <summary className="cursor-pointer select-none">Available tool ids</summary>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {tools.map((t) => (
                      <li
                        key={t.id}
                        title={t.description}
                        className="rounded-md bg-gray-100 dark:bg-muted px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:text-muted-foreground"
                      >
                        {t.id}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Enabled</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Disable to pause this scenario without deleting it</div>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div>
            )}
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 dark:border-border bg-white dark:bg-card px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={
                isSaving ||
                !form.title.trim() ||
                !form.description.trim() ||
                !form.instruction.trim()
              }
              onClick={handleSave}
            >
              {isSaving ? 'Saving...' : editingId ? 'Update changes' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BulkDeleteDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        selectedIds={selectedIds}
        type="scenario"
        onConfirm={handleBulkDelete}
      />

      <DeleteConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        itemLabel="scenario"
        itemName={scenarios.find((s) => s.id === pendingDeleteId)?.title}
        onConfirm={() => handleDelete(pendingDeleteId!)}
      />
    </div>
  );
};

export default CaptainScenarios;
