import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Link2, FileText, MoreVertical, BookOpenText, Sparkles, Trash2, Pencil, Loader2, Bot, Search, CheckCircle2, AlertCircle, Globe, Database } from 'lucide-react';
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
import { DeleteConfirmDialog } from '@/components/captain/DeleteConfirmDialog';

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

/* Content length is a raw character count from the crawler. Shown as an
   approximate reading size, which is what "how much did it learn" means to
   someone looking at the list. */
function knowledgeSize(chars: number) {
  if (!chars) return '—';
  if (chars < 1000) return `${chars} chars`;
  if (chars < 1_000_000) return `${(chars / 1000).toFixed(chars < 10_000 ? 1 : 0)}k chars`;
  return `${(chars / 1_000_000).toFixed(1)}M chars`;
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready' },
  { key: 'processing', label: 'Processing' },
  { key: 'failed', label: 'Failed' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['key'];

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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  const stats = {
    total: documents.length,
    ready: documents.filter((d) => d.status === 'ready').length,
    processing: documents.filter((d) => d.status === 'processing').length,
    failed: documents.filter((d) => d.status === 'failed').length,
    chars: documents.reduce((sum, d) => sum + (d.content_length || 0), 0),
  };

  const query = search.trim().toLowerCase();
  const visibleDocs = documents.filter((doc) => {
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    if (!query) return true;
    return (
      doc.name.toLowerCase().includes(query) || (doc.source_url || '').toLowerCase().includes(query)
    );
  });

  /* The meter on each card is relative to the largest source in the set, so it
     reads as "how much of this library came from here" rather than an absolute
     size nobody has a reference for. */
  const maxChars = Math.max(1, ...documents.map((d) => d.content_length || 0));

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

      {/* Knowledge overview — what this assistant has actually learned, and
          from how many sources, rather than a paragraph explaining the concept. */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <BookOpenText className="size-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-950 dark:text-gray-100">Knowledge library</div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Pages and files your assistant reads before answering. Captain turns them into FAQs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-stretch sm:gap-2">
            <div className="rounded-xl bg-gray-50 px-3.5 py-2 text-center dark:bg-gray-900/50">
              <div className="text-base font-bold leading-tight text-gray-950 dark:text-gray-100">{stats.total}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Sources</div>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3.5 py-2 text-center dark:bg-emerald-950/40">
              <div className="text-base font-bold leading-tight text-emerald-700 dark:text-emerald-300">{stats.ready}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">Ready</div>
            </div>
            {stats.processing > 0 && (
              <div className="rounded-xl bg-amber-50 px-3.5 py-2 text-center dark:bg-amber-950/40">
                <div className="flex items-center justify-center gap-1 text-base font-bold leading-tight text-amber-700 dark:text-amber-300">
                  <Loader2 className="size-3.5 animate-spin" />
                  {stats.processing}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">Working</div>
              </div>
            )}
            {stats.failed > 0 && (
              <div className="rounded-xl bg-rose-50 px-3.5 py-2 text-center dark:bg-rose-950/40">
                <div className="text-base font-bold leading-tight text-rose-700 dark:text-rose-300">{stats.failed}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-600/70 dark:text-rose-400/70">Failed</div>
              </div>
            )}
            <div className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 px-3.5 py-2 dark:bg-gray-900/50 sm:col-span-1">
              <Database className="size-3.5 shrink-0 text-gray-400" />
              <div>
                <div className="text-base font-bold leading-tight text-gray-950 dark:text-gray-100">{knowledgeSize(stats.chars)}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Learned</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      {documents.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or URL..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.key === 'all' ? stats.total : stats[f.key as 'ready' | 'processing' | 'failed'];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === f.key
                      ? 'bg-white text-primary shadow-sm dark:bg-gray-900'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {f.label}
                  <span className="ml-1.5 text-gray-400">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <BulkSelectBar
        items={visibleDocs}
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
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <BookOpenText className="size-7 text-primary" />
            <span className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Plus className="size-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-gray-950 dark:text-gray-100">The library is empty</div>
          <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add a help centre page or upload a PDF. Captain reads it, then answers customers from it.
          </p>

          <div className="mt-6 grid w-full max-w-md gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { setCreateType('url'); setIsCreateOpen(true); }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md dark:border-gray-700"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe className="size-5" />
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Link a page</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Crawl a URL you already publish</span>
            </button>
            <button
              type="button"
              onClick={() => { setCreateType('pdf'); setIsCreateOpen(true); }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md dark:border-gray-700"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
                <FileText className="size-5" />
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Upload a PDF</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Manuals, policies, price lists</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto pb-1">
          {visibleDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-14 text-center dark:border-gray-700">
              <Search className="size-6 text-gray-300 dark:text-gray-600" />
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">No matching sources</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Try a different search term or clear the status filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleDocs.map((doc) => {
                const isUrl = doc.type === 'url';
                const isSelected = selectedIds.has(doc.id);
                const pct = Math.round(((doc.content_length || 0) / maxChars) * 100);
                return (
                  <div
                    key={doc.id}
                    onMouseEnter={() => handleCardHover(true, doc.id)}
                    onMouseLeave={() => handleCardHover(false, doc.id)}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all dark:bg-gray-800 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/15'
                        : 'border-gray-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700'
                    }`}
                  >
                    {/* Type spine — the one glance that says "web page" vs "file". */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-1 ${isUrl ? 'bg-primary' : 'bg-violet-500'}`}
                    />

                    <div className="flex items-start gap-3 p-4 pl-5">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          isUrl
                            ? 'bg-primary/10 text-primary'
                            : 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300'
                        }`}
                      >
                        {isUrl ? <Globe className="size-5" /> : <FileText className="size-5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-gray-950 dark:text-gray-100" title={doc.name}>
                          {doc.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          {isUrl && doc.source_url ? (
                            <a
                              href={doc.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-w-0 items-center gap-1 truncate hover:text-primary hover:underline"
                              title={doc.source_url}
                            >
                              <Link2 className="size-3 shrink-0" />
                              <span className="truncate">{doc.source_url}</span>
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="size-3 shrink-0" />
                              PDF upload
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleCardSelect(doc.id)}
                          className={`transition-opacity ${
                            hoveredCard === doc.id || selectedIds.size > 0 ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md text-gray-400 outline-none transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200">
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="dark:border-gray-700 dark:bg-gray-800">
                            <DropdownMenuItem onClick={() => openEdit(doc)} className="dark:text-gray-200 dark:focus:bg-gray-700">
                              <Pencil className="size-3.5" />
                              Edit content
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setPendingDeleteId(doc.id)}>
                              <Trash2 className="size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {doc.status === 'failed' && doc.error_message && (
                      <div className="mx-4 mb-3 ml-5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                        {doc.error_message}
                      </div>
                    )}

                    {/* How much of the library came from this source. */}
                    {doc.status === 'ready' && (
                      <div className="mb-3 ml-5 mr-4">
                        <div className="h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full ${isUrl ? 'bg-primary' : 'bg-violet-500'}`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5 pl-5 dark:border-gray-700/70">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          doc.status === 'ready'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : doc.status === 'failed'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {doc.status === 'ready' && <CheckCircle2 className="size-3.5" />}
                        {doc.status === 'failed' && <AlertCircle className="size-3.5" />}
                        {doc.status === 'processing' && <Loader2 className="size-3.5 animate-spin" />}
                        {doc.status === 'ready' ? knowledgeSize(doc.content_length) : doc.status}
                      </span>
                      <span className="truncate text-xs text-gray-400 dark:text-gray-500">{timeAgo(doc.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      <DeleteConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        itemLabel="document"
        onConfirm={() => handleDelete(pendingDeleteId!)}
      />
    </div>
  );
};

export default CaptainDocuments;
