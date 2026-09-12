import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Plus, Search, HelpCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AssistantSwitcher, useSelectedAssistant } from './assistant-switcher';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';
import { BulkSelectBar } from '@/components/captain/BulkSelectBar';
import { BulkDeleteDialog } from '@/components/captain/BulkDeleteDialog';
import { DeleteConfirmDialog } from '@/components/captain/DeleteConfirmDialog';


type Faq = {
  id: string;
  assistant_id: string;
  question: string;
  answer: string;
  status: 'draft' | 'approved';
  created_at: string;
};

const emptyForm = { question: '', answer: '', status: 'approved' as const };
// The Documents page leaves this hint (per assistant) when a document is added,
// so this page knows FAQs are being generated in the background and polls for
// them instead of showing a stale "No FAQs yet" until a manual reload.
const faqPendingKey = (assistantId: string) => `captain_faq_pending_${assistantId}`;
const FAQ_PENDING_WINDOW_MS = 3 * 60 * 1000;
const textAreaClass =
  'w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition-all placeholder:text-gray-400 hover:border-primary dark:hover:border-primary focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400';

const CaptainFaqs = () => {
  const { assistants, selectedId, selectAssistant } = useSelectedAssistant();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ question: string; answer: string; status: 'draft' | 'approved' }>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // `silent` re-fetches in place (used by the background-generation poll) without
  // flashing the full-page loader or clearing an existing error.
  const fetchFaqs = async (assistantId: string, searchTerm = '', opts?: { silent?: boolean }) => {
    if (!assistantId) return;
    if (!opts?.silent) {
      setIsLoading(true);
      setError('');
    }
    try {
      const params = new URLSearchParams({ assistant_id: assistantId });
      if (searchTerm) params.set('search', searchTerm);
      const res = await captainFetch(`${CAPTAIN_API_BASE}/faqs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load FAQs');
      setFaqs(json.data || []);
    } catch (err: any) {
      if (!opts?.silent) setError(err?.message || 'Failed to load FAQs');
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedId) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => fetchFaqs(selectedId, search), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedId]);

  // Poll for freshly-generated FAQs after a document was added on the Documents
  // page. Runs only while the hint is fresh and the list is still empty; stops
  // as soon as FAQs arrive or the window closes.
  useEffect(() => {
    if (!selectedId) return;
    const key = faqPendingKey(selectedId);
    let startedAt = 0;
    try {
      startedAt = Number(localStorage.getItem(key)) || 0;
    } catch {
      startedAt = 0;
    }
    const expired = !startedAt || Date.now() - startedAt > FAQ_PENDING_WINDOW_MS;
    if (expired || faqs.length > 0) {
      if (startedAt) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    const timer = setInterval(() => {
      if (Date.now() - startedAt > FAQ_PENDING_WINDOW_MS) {
        clearInterval(timer);
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        return;
      }
      fetchFaqs(selectedId, search, { silent: true });
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, faqs.length]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (faq: Faq) => {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, status: faq.status });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      if (editingId) {
        const res = await captainFetch(`${CAPTAIN_API_BASE}/faqs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json())?.message || 'Failed to update FAQ');
      } else {
        const res = await captainFetch(`${CAPTAIN_API_BASE}/faqs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, assistant_id: selectedId }),
        });
        if (!res.ok) throw new Error((await res.json())?.message || 'Failed to create FAQ');
      }
      setIsModalOpen(false);
      fetchFaqs(selectedId, search);
    } catch (err: any) {
      setError(err?.message || 'Failed to save FAQ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/faqs/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete FAQ');
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete FAQ');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCardSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCardHover = (isHovered: boolean, id: string) => {
    setHoveredCard(isHovered ? id : null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          captainFetch(`${CAPTAIN_API_BASE}/faqs/${id}`, { method: 'DELETE' }),
        ),
      );
      setFaqs((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.message || 'Failed to delete FAQs');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (!selectedId && !isLoading) {
    return (
      <div className="flex h-full w-full flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <AssistantSwitcher assistants={assistants} selectedId={selectedId} onSelect={selectAssistant} pageTitle="FAQs" />
          <Button type="button" variant="primary" disabled>
            <Plus className="size-4" />
            Add FAQ
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <Bot className="size-10 text-gray-300 dark:text-muted-foreground" />
          <div className="text-base font-bold text-gray-950 dark:text-foreground">No AI Assistant Found</div>
          <p className="max-w-sm text-xs text-gray-500 dark:text-muted-foreground">
            You need to create an AI assistant before you can add FAQs for it to use.
          </p>
          <Link
            to="/admin-settings/captain/assistants"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            Create Assistant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <AssistantSwitcher assistants={assistants} selectedId={selectedId} onSelect={selectAssistant} pageTitle="FAQs" />
        <Button type="button" variant="primary" onClick={openCreateModal} disabled={!selectedId}>
          <Plus className="size-4" />
          Add FAQ
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search FAQs..."
          className="pl-9"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      <BulkSelectBar
        items={faqs}
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

      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : faqs.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <HelpCircle className="size-6 text-gray-300 dark:text-gray-600" />
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">No FAQs yet</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Click "Add FAQ" to create your first one.</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onMouseEnter={() => handleCardHover(true, faq.id)}
                onMouseLeave={() => handleCardHover(false, faq.id)}
              >
                <div className="flex flex-1 items-start gap-3">
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.has(faq.id)}
                      onCheckedChange={() => handleCardSelect(faq.id)}
                      className={`transition-opacity ${
                        hoveredCard === faq.id || selectedIds.size > 0 ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-950 dark:text-gray-100">{faq.question}</div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          faq.status === 'approved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300'
                        }`}
                      >
                        {faq.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{faq.answer}</div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(faq)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructiveOutline"
                    size="sm"
                    disabled={deletingId === faq.id}
                    onClick={() => setPendingDeleteId(faq.id)}
                  >
                    <Trash2 className="size-3.5" />
                    {deletingId === faq.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full max-w-lg rounded-2xl p-6">
          <DialogTitle className="text-base font-bold text-gray-950 dark:text-gray-100">
            {editingId ? 'Edit FAQ' : 'Add FAQ'}
          </DialogTitle>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Question</Label>
              <Input
                type="text"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="e.g. What are your business hours?"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Answer</Label>
              <textarea
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                rows={4}
                className={textAreaClass}
                placeholder="e.g. We're open Monday to Friday, 9am to 6pm."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'approved' }))}
                className="min-h-10 rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-700 dark:text-foreground shadow-sm outline-none transition-all hover:border-primary dark:hover:border-primary focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="approved">Approved</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSaving || !form.question.trim() || !form.answer.trim()}
              onClick={handleSave}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BulkDeleteDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        selectedIds={selectedIds}
        type="faq"
        onConfirm={handleBulkDelete}
      />

      <DeleteConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        itemLabel="FAQ"
        onConfirm={() => handleDelete(pendingDeleteId!)}
      />
    </div>
  );
};

export default CaptainFaqs;
