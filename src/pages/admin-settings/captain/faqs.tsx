import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Search, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AssistantSwitcher, useSelectedAssistant } from './assistant-switcher';

const CAPTAIN_API_BASE = '/captain-api/api/captain';

type Faq = {
  id: string;
  assistant_id: string;
  question: string;
  answer: string;
  status: 'draft' | 'approved';
  created_at: string;
};

const emptyForm = { question: '', answer: '', status: 'approved' as const };
const textAreaClass =
  'w-full resize-none rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2.5 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none transition-all placeholder:text-[#9A948F] hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10';

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

  const fetchFaqs = async (assistantId: string, searchTerm = '') => {
    if (!assistantId) return;
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ assistant_id: assistantId });
      if (searchTerm) params.set('search', searchTerm);
      const res = await fetch(`${CAPTAIN_API_BASE}/faqs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load FAQs');
      setFaqs(json.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load FAQs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(() => fetchFaqs(selectedId, search), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedId]);

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
        const res = await fetch(`${CAPTAIN_API_BASE}/faqs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json())?.message || 'Failed to update FAQ');
      } else {
        const res = await fetch(`${CAPTAIN_API_BASE}/faqs`, {
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
    if (!window.confirm('Delete this FAQ? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/faqs/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete FAQ');
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete FAQ');
    } finally {
      setDeletingId(null);
    }
  };

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
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9A948F]" />
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

      <div className="flex-1 overflow-auto rounded-2xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#9A948F]">Loading...</div>
        ) : faqs.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <HelpCircle className="size-6 text-gray-300" />
            <div className="text-sm font-medium text-[#2E2D35]">No FAQs yet</div>
            <div className="text-xs text-[#9A948F]">Click "Add FAQ" to create your first one.</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {faqs.map((faq) => (
              <div key={faq.id} className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#FBE2C8]/45">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-[#2E2D35]">{faq.question}</div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        faq.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {faq.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[#9A948F]">{faq.answer}</div>
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
                    onClick={() => handleDelete(faq.id)}
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
          <DialogTitle className="text-base font-bold text-[#2E2D35]">
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
                className="min-h-10 rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none transition-all hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10"
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
    </div>
  );
};

export default CaptainFaqs;
