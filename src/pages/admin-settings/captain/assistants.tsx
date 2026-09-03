import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Plus, Sparkles, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const CAPTAIN_API_BASE = '/captain-api/api/captain';
const INSTRUCTIONS_LIMIT = 2000;

type Assistant = {
  id: string;
  name: string;
  description: string;
  config: {
    instructions?: string;
    product_name?: string;
    welcome_message?: string;
    handoff_message?: string;
    resolution_message?: string;
    temperature?: number;
    feature_faq?: boolean;
    feature_memory?: boolean;
    feature_citation?: boolean;
    feature_contact_attributes?: boolean;
  } | null;
  response_guidelines: string[] | null;
  guardrails: string[] | null;
};

const emptyForm = {
  name: '',
  description: '',
  product_name: '',
  instructions: 'This is a virtual assistant designed to help you complete tasks efficiently. Simply provide clear instructions or ask questions and it will generate a response.',
  welcome_message: 'Hi! How can I help you today?',
  handoff_message: 'Let me connect you with a team member.',
  resolution_message: 'Glad I could help! Anything else?',
  temperature: 0.3,
  feature_faq: true,
  feature_memory: true,
  feature_citation: false,
  feature_contact_attributes: false,
  response_guidelines: '',
  guardrails: '',
};

const textAreaClass =
  'w-full resize-none rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2.5 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none transition-all placeholder:text-[#9A948F] hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10';

const CaptainAssistants = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [composioAccess, setComposioAccess] = useState<{ toolkit_slug: string; toolkit_name: string; allowed: boolean }[]>([]);
  const [isLoadingComposioAccess, setIsLoadingComposioAccess] = useState(false);

  const fetchAssistants = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/assistants`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load assistants');
      setAssistants(json.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load assistants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setComposioAccess([]);
    setIsModalOpen(true);
  };

  const fetchComposioAccess = async (assistantId: string) => {
    setIsLoadingComposioAccess(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/assistants/${assistantId}/composio-access`);
      const json = await res.json();
      setComposioAccess(json.data || []);
    } catch {
      setComposioAccess([]);
    } finally {
      setIsLoadingComposioAccess(false);
    }
  };

  const toggleComposioAccess = async (toolkitSlug: string, allowed: boolean) => {
    if (!editingId) return;
    setComposioAccess((prev) => prev.map((c) => (c.toolkit_slug === toolkitSlug ? { ...c, allowed } : c)));
    try {
      await fetch(`${CAPTAIN_API_BASE}/assistants/${editingId}/composio-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolkit_slug: toolkitSlug, allowed }),
      });
    } catch {
      setComposioAccess((prev) => prev.map((c) => (c.toolkit_slug === toolkitSlug ? { ...c, allowed: !allowed } : c)));
    }
  };

  const openEditModal = (a: Assistant) => {
    setEditingId(a.id);
    fetchComposioAccess(a.id);
    setForm({
      name: a.name,
      description: a.description || '',
      product_name: a.config?.product_name || '',
      instructions: a.config?.instructions || '',
      welcome_message: a.config?.welcome_message || '',
      handoff_message: a.config?.handoff_message || '',
      resolution_message: a.config?.resolution_message || '',
      temperature: a.config?.temperature ?? 0.3,
      feature_faq: a.config?.feature_faq ?? true,
      feature_memory: a.config?.feature_memory ?? true,
      feature_citation: a.config?.feature_citation ?? false,
      feature_contact_attributes: a.config?.feature_contact_attributes ?? false,
      response_guidelines: (a.response_guidelines || []).join('\n'),
      guardrails: (a.guardrails || []).join('\n'),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    setError('');
    const payload = {
      name: form.name,
      description: form.description,
      config: {
        product_name: form.product_name,
        instructions: form.instructions,
        welcome_message: form.welcome_message,
        handoff_message: form.handoff_message,
        resolution_message: form.resolution_message,
        temperature: Number(form.temperature),
        feature_faq: form.feature_faq,
        feature_memory: form.feature_memory,
        feature_citation: form.feature_citation,
        feature_contact_attributes: form.feature_contact_attributes,
      },
      response_guidelines: form.response_guidelines.split('\n').map((s) => s.trim()).filter(Boolean),
      guardrails: form.guardrails.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      const url = editingId ? `${CAPTAIN_API_BASE}/assistants/${editingId}` : `${CAPTAIN_API_BASE}/assistants`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save assistant');
      setIsModalOpen(false);
      fetchAssistants();
    } catch (err: any) {
      setError(err?.message || 'Failed to save assistant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'default-assistant') return;
    if (!window.confirm('Delete this assistant? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/assistants/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete assistant');
      setAssistants((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete assistant');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-[#2E2D35]">Assistants</div>
          <div className="text-sm text-[#9A948F]">
            AI personas that power your Captain chatbot — instructions, guardrails, and behavior.
          </div>
        </div>
        <Button type="button" variant="primary" onClick={openCreateModal}>
          <Plus className="size-4" />
          Add Assistant
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      <div className="flex-1 overflow-auto rounded-2xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#9A948F]">Loading...</div>
        ) : assistants.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-[#9A948F]">
            <Sparkles className="size-6 text-gray-300" />
            No assistants yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {assistants.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#FBE2C8]/45">
                <div className="flex flex-1 items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#2E2D35]">{a.name}</div>
                    <div className="mt-0.5 text-sm text-[#9A948F]">{a.description}</div>
                    <div className="mt-1 line-clamp-1 text-xs text-[#9A948F]">{a.config?.instructions}</div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(a)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  {a.id !== 'default-assistant' && (
                    <Button
                      type="button"
                      variant="destructiveOutline"
                      size="sm"
                      disabled={deletingId === a.id}
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="size-3.5" />
                      {deletingId === a.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-6 py-4">
            <DialogTitle className="text-base font-bold text-[#2E2D35]">
              {editingId ? 'Edit Assistant' : 'Add Assistant'}
            </DialogTitle>
          </div>

          <div className="flex flex-col gap-5 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Support Bot"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does this assistant do?"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Instructions</Label>
                <span className="text-xs text-[#9A948F]">
                  {form.instructions.length} / {INSTRUCTIONS_LIMIT}
                </span>
              </div>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value.slice(0, INSTRUCTIONS_LIMIT) }))}
                rows={4}
                className={textAreaClass}
                placeholder="This is a virtual assistant designed to help you complete tasks efficiently..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Product Name</Label>
              <Input
                type="text"
                value={form.product_name}
                onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                placeholder="e.g. shoes, our SaaS platform, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Welcome message</Label>
                <Input
                  type="text"
                  value={form.welcome_message}
                  onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Handoff message</Label>
                <Input
                  type="text"
                  value={form.handoff_message}
                  onChange={(e) => setForm((f) => ({ ...f, handoff_message: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Features</Label>
              <div className="flex flex-col gap-3 rounded-xl border border-[#EEE7DD] bg-[#FBE2C8]/50 p-4">
                {[
                  { key: 'feature_faq' as const, label: 'Generate FAQs from resolved conversations' },
                  { key: 'feature_memory' as const, label: 'Capture key details as memories from customer interactions.' },
                  { key: 'feature_citation' as const, label: 'Include source citations in responses' },
                  { key: 'feature_contact_attributes' as const, label: 'Allow access to contact information' },
                ].map((feat) => (
                  <div key={feat.key} className="flex items-center gap-2.5">
                    <Checkbox
                      id={feat.key}
                      checked={form[feat.key]}
                      onCheckedChange={(checked) => setForm((f) => ({ ...f, [feat.key]: checked === true }))}
                    />
                    <Label htmlFor={feat.key} className="cursor-pointer text-sm font-normal text-[#2E2D35]">
                      {feat.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Wrench className="size-3.5 text-[#9A948F]" />
                Customer tools
              </Label>
              <p className="text-xs text-[#9A948F]">
                Turn a toolkit off to block it everywhere, in the Playground and in customer conversations.
              </p>
              {!editingId ? (
                <div className="rounded-xl border border-dashed border-[#EEE7DD] bg-[#FBE2C8]/50 px-4 py-3.5 text-sm text-[#9A948F]">
                  Save this assistant first, then come back here to allow or block connected apps for it.
                </div>
              ) : isLoadingComposioAccess ? (
                <div className="flex h-14 items-center justify-center text-sm text-[#9A948F]">Loading...</div>
              ) : composioAccess.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#EEE7DD] bg-[#FBE2C8]/50 px-4 py-3.5 text-sm text-[#9A948F]">
                  No Actions connected yet.{' '}
                  <Link to="/admin-settings/captain/actions" className="font-medium text-primary hover:underline">
                    Connect apps in Actions
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-[#EEE7DD]">
                  {composioAccess.map((c) => (
                    <div key={c.toolkit_slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="text-sm text-[#2E2D35]">{c.toolkit_name}</span>
                      <Switch checked={c.allowed} onCheckedChange={(checked) => toggleComposioAccess(c.toolkit_slug, checked === true)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <details className="group rounded-xl border border-[#EEE7DD]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#2E2D35] select-none">
                Advanced — response guidelines &amp; guardrails
              </summary>
              <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Response guidelines (one per line)</Label>
                  <textarea
                    value={form.response_guidelines}
                    onChange={(e) => setForm((f) => ({ ...f, response_guidelines: e.target.value }))}
                    rows={2}
                    className={textAreaClass}
                    placeholder="e.g. Keep replies under 3 sentences"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Guardrails (one per line)</Label>
                  <textarea
                    value={form.guardrails}
                    onChange={(e) => setForm((f) => ({ ...f, guardrails: e.target.value }))}
                    rows={2}
                    className={textAreaClass}
                    placeholder="e.g. Never share pricing without approval"
                  />
                </div>
              </div>
            </details>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
            )}
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={isSaving || !form.name.trim()} onClick={handleSave}>
              {isSaving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaptainAssistants;
