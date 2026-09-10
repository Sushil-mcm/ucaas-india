import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Link2, FileText, MoreVertical, BookOpenText, Sparkles, Trash2, Pencil, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AssistantSwitcher, useSelectedAssistant } from './assistant-switcher';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';
import { BulkSelectBar } from '@/components/captain/BulkSelectBar';
import { BulkDeleteDialog } from '@/components/captain/BulkDeleteDialog';

const textAreaClass =
  'w-full resize-none rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card px-3 py-2.5 text-sm text-gray-700 dark:text-foreground shadow-sm outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-muted-foreground hover:border-primary dark:hover:border-primary focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10';

type Document = {
  id: string;
  assistant_id: string;
  name: string;
  type: 'url' | 'pdf';
  source_url: string | null;
  status: 'processing' | 'ready' | 'failed';
  error_message: string | null;
  created_at: string;
  content_length: number;
};

type GeneratedFaq = { question: string; answer: string; selected: boolean };

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  // Backend sends a timezone-aware ISO string ("...+05:30" or "...Z"); only a
  // naive string (no offset) needs a trailing Z to be read as UTC.
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(dateStr);
  const parsed = new Date(hasTz ? dateStr : `${dateStr}Z`);
  if (Number.isNaN(parsed.getTime())) return '';
  const diffMs = Date.now() - parsed.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? '' : 's'} ago`;
}

const CaptainDocuments = () => {
  const { assistants, selectedId, selectAssistant } = useSelectedAssistant();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<'url' | 'pdf'>('url');
  const [createName, setCreateName] = useState('');
  const [createUrl, setCreateUrl] = useState('');
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFaqs, setGeneratedFaqs] = useState<GeneratedFaq[] | null>(null);
  const [isSavingFaqs, setIsSavingFaqs] = useState(false);
  const [modalError, setModalError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // `silent` re-fetches in place (used by the processing poll) without flashing
  // the full-page loader or clearing an existing error.
  const fetchDocuments = async (assistantId: string, opts?: { silent?: boolean }) => {
    if (!assistantId) return;
    if (!opts?.silent) {
      setIsLoading(true);
      setError('');
    }
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/documents?assistant_id=${assistantId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load documents');
      setDocuments(json.data || []);
    } catch (err: any) {
      if (!opts?.silent) setError(err?.message || 'Failed to load documents');
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) fetchDocuments(selectedId);
    else setIsLoading(false);
  }, [selectedId]);

  // A URL document is crawled in the background after it's created, so it comes
  // back as "processing". Poll until every document has settled — otherwise the
  // row shows "processing" forever until the user reloads the page.
  const hasProcessing = documents.some((d) => d.status === 'processing');
  useEffect(() => {
    if (!selectedId || !hasProcessing) return;
    const timer = setInterval(() => fetchDocuments(selectedId, { silent: true }), 3000);
    return () => clearInterval(timer);
  }, [selectedId, hasProcessing]);

  useEffect(() => {
    if (createdCount === null) return;
    const timer = setTimeout(() => setCreatedCount(null), 5000);
    return () => clearTimeout(timer);
  }, [createdCount]);

  const resetCreateForm = () => {
    setCreateType('url');
    setCreateName('');
    setCreateUrl('');
    setCreateFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!selectedId) return;
    if (createType === 'url' && !createUrl.trim()) return;
    if (createType === 'pdf' && (!createFile || !createName.trim())) return;
    setIsCreating(true);
    setModalError('');
    setCreatedCount(null);
    try {
      const payload: any = { assistant_id: selectedId, name: createName.trim() || undefined, type: createType };
      if (createType === 'url') {
        payload.source_url = createUrl.trim();
      } else {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
          reader.onerror = reject;
          reader.readAsDataURL(createFile as File);
        });
        payload.file_base64 = base64;
      }
      const res = await captainFetch(`${CAPTAIN_API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to create document');
      const created = json.data?.documents?.length || 0;
      // Tell the FAQs page that FAQs are being generated for this assistant so it
      // polls for them instead of showing a stale "No FAQs yet".
      try {
        localStorage.setItem(`captain_faq_pending_${selectedId}`, String(Date.now()));
      } catch {
        /* ignore */
      }
      setIsCreateOpen(false);
      resetCreateForm();
      fetchDocuments(selectedId);
      setCreatedCount(created);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/documents/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete document');
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete document');
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
          captainFetch(`${CAPTAIN_API_BASE}/documents/${id}`, { method: 'DELETE' }),
        ),
      );
      setDocuments((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.message || 'Failed to delete documents');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const openEdit = async (doc: Document) => {
    setModalError('');
    setGeneratedFaqs(null);
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditContent('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/documents/${doc.id}`);
      const json = await res.json();
      if (res.ok) setEditContent(json.data.content || '');
    } catch {
      // leave content blank; user can still see the error via modalError if save fails
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    setIsSavingEdit(true);
    setModalError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/documents/${editingDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, content: editContent }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save document');
      setEditingDoc(null);
      fetchDocuments(selectedId);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save document');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleGenerateFaqs = async () => {
    if (!editingDoc) return;
    setIsGenerating(true);
    setModalError('');
    setGeneratedFaqs(null);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/documents/${editingDoc.id}/generate-faqs`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to generate FAQs');
      const faqs: GeneratedFaq[] = (json.data.faqs || []).map((f: any) => ({ ...f, selected: true }));
      if (!faqs.length) setModalError('No FAQs could be generated from this document.');
      setGeneratedFaqs(faqs);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to generate FAQs');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedFaqs = async () => {
    if (!editingDoc || !generatedFaqs) return;
    const selected = generatedFaqs.filter((f) => f.selected);
    if (!selected.length) return;
    setIsSavingFaqs(true);
    setModalError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/faqs/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: editingDoc.assistant_id,
          document_id: editingDoc.id,
          status: 'draft',
          faqs: selected.map(({ question, answer }) => ({ question, answer })),
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save FAQs');
      setGeneratedFaqs(null);
      setEditingDoc(null);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save FAQs');
    } finally {
      setIsSavingFaqs(false);
    }
  };

  if (!selectedId && !isLoading) {
    return (
      <div className="flex h-full w-full flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <AssistantSwitcher assistants={assistants} selectedId={selectedId} onSelect={selectAssistant} pageTitle="Documents" />
          <Button type="button" variant="primary" disabled>
            <Plus className="size-4" />
            Create a new document
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card p-8 text-center">
          <Bot className="size-10 text-gray-300 dark:text-muted-foreground" />
          <div className="text-base font-bold text-gray-950 dark:text-foreground">No AI Assistant Found</div>
          <p className="max-w-sm text-xs text-gray-500 dark:text-muted-foreground">
            You need to create an AI assistant before you can add documents for it to learn from.
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
        <AssistantSwitcher assistants={assistants} selectedId={selectedId} onSelect={selectAssistant} pageTitle="Documents" />
        <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)} disabled={!selectedId}>
          <Plus className="size-4" />
          Create a new document
        </Button>
      </div>

      {createdCount !== null && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          {createdCount === 1 ? 'The document has been successfully created.' : `${createdCount} documents were successfully created.`}
        </div>
      )}

      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 p-5 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <BookOpenText className="size-7 text-primary" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          A document in Captain serves as a knowledge resource for the assistant. By connecting your help center
          pages or guides, Captain can analyze the content and generate accurate FAQs for customer inquiries.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      <BulkSelectBar
        items={documents}
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

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
          <FileText className="size-8 text-gray-300 dark:text-gray-600" />
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">No documents available</div>
          <div className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Documents are used by your assistant to generate FAQs. Import a document to provide context for your
            assistant.
          </div>
          <Button type="button" variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            Create a new document
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800"
              onMouseEnter={() => handleCardHover(true, doc.id)}
              onMouseLeave={() => handleCardHover(false, doc.id)}
            >
              <div className="flex flex-1 items-start gap-3">
                <div className="pt-1">
                  <Checkbox
                    checked={selectedIds.has(doc.id)}
                    onCheckedChange={() => handleCardSelect(doc.id)}
                    className={`transition-opacity ${
                      hoveredCard === doc.id || selectedIds.size > 0 ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-gray-950 dark:text-gray-100">{doc.name}</div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        doc.status === 'ready'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                          : doc.status === 'failed'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {doc.status === 'processing' ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="size-3 animate-spin" />
                          processing
                        </span>
                      ) : (
                        doc.status
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {doc.type === 'url' ? <Link2 className="size-3.5 shrink-0" /> : <FileText className="size-3.5 shrink-0" />}
                    {doc.source_url ? (
                      <a href={doc.source_url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                        {doc.source_url}
                      </a>
                    ) : (
                      <span>PDF upload</span>
                    )}
                  </div>
                  {doc.status === 'failed' && doc.error_message && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">{doc.error_message}</div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(doc.created_at)}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md text-gray-400 outline-none hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200">
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="dark:border-gray-700 dark:bg-gray-800">
                    <DropdownMenuItem onClick={() => openEdit(doc)} className="dark:text-gray-200 dark:focus:bg-gray-700">
                      <Pencil className="size-3.5" />
                      Edit content
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create document modal */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="w-full max-w-md rounded-2xl p-6">
          <DialogTitle className="text-base font-bold text-gray-950 dark:text-gray-100">Add a document</DialogTitle>
          <p className="-mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter the URL of the document to add it as a knowledge source, or upload a PDF.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Document Type</Label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as 'url' | 'pdf')}
                className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none transition-all hover:border-primary dark:hover:border-primary focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="url">URL</option>
                <option value="pdf">PDF File</option>
              </select>
            </div>

            {createType === 'url' ? (
              <div className="flex flex-col gap-1.5">
                <Label>URL</Label>
                <Input type="text" value={createUrl} onChange={(e) => setCreateUrl(e.target.value)} placeholder="https://example.com/help-article" />
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  Crawls this page and the pages it links to on the same site (up to 25), adding each as its
                  own document and generating FAQs from it.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label>PDF File</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 file:dark:bg-primary/20 file:dark:text-primary-foreground"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>{createType === 'url' ? 'Document Name (Optional)' : 'Name'}</Label>
              <Input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={createType === 'url' ? 'Defaults to the page URL' : 'Enter a name for the document'}
              />
            </div>

            {modalError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{modalError}</div>
            )}
            {isCreating && createType === 'url' && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary">
                Crawling the site and generating FAQs — this can take a minute...
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isCreating || (createType === 'url' ? !createUrl.trim() : !createFile || !createName.trim())}
              onClick={handleCreate}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit / generate FAQs modal */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
        <DialogContent className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
          <DialogTitle className="text-base font-bold text-gray-950 dark:text-gray-100">Edit document</DialogTitle>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Content</Label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className={textAreaClass}
                placeholder="Extracted content will appear here — edit it to correct or trim what the assistant sees."
              />
            </div>

            {modalError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{modalError}</div>
            )}

            {generatedFaqs && (
              <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Suggested FAQs ({generatedFaqs.filter((f) => f.selected).length} selected)
                </div>
                <div className="flex flex-col gap-2">
                  {generatedFaqs.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                      <Checkbox
                        checked={f.selected}
                        onCheckedChange={(checked) =>
                          setGeneratedFaqs((prev) =>
                            prev ? prev.map((item, idx) => (idx === i ? { ...item, selected: checked === true } : item)) : prev,
                          )
                        }
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.question}</div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{f.answer}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="self-end"
                  disabled={isSavingFaqs || !generatedFaqs.some((f) => f.selected)}
                  onClick={handleSaveGeneratedFaqs}
                >
                  {isSavingFaqs ? 'Saving...' : `Save ${generatedFaqs.filter((f) => f.selected).length} as FAQs (draft)`}
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleGenerateFaqs} disabled={isGenerating || !editContent}>
              <Sparkles className="size-4" />
              {isGenerating ? 'Generating...' : 'Generate FAQs from this document'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingDoc(null)}>
                Close
              </Button>
              <Button type="button" variant="primary" disabled={isSavingEdit} onClick={handleSaveEdit}>
                {isSavingEdit ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BulkDeleteDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        selectedIds={selectedIds}
        type="document"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
};

export default CaptainDocuments;
