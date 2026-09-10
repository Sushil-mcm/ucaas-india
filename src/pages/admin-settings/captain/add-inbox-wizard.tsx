import { useEffect, useState } from 'react';
import {
  Check, Facebook, MessageCircle, Smartphone, Mail, Braces, Send, MessageSquare, Instagram,
  Search, Copy, Phone, Codepen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { handleAlert } from '@/lib/utils';
import { getUserList, allNumbersList } from '@/services/api';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';


type TeamMember = { uuid: string; name: string; email: string };
type Step = 'channel' | 'create' | 'agents' | 'done';

const CHANNEL_OPTIONS: { key: string; label: string; desc: string; icon: any; live: boolean }[] = [
  { key: 'website', label: 'Website', desc: 'Create a live-chat widget', icon: MessageSquare, live: true },
  { key: 'voice', label: 'Voice / Phone Line', desc: 'Connect a phone number to Captain AI', icon: Phone, live: true },
  { key: 'facebook', label: 'Facebook', desc: 'Connect your Facebook page', icon: Facebook, live: false },
  { key: 'whatsapp', label: 'WhatsApp', desc: 'Support your customers on WhatsApp', icon: MessageCircle, live: false },
  { key: 'sms', label: 'SMS', desc: 'Integrate SMS channel with a provider', icon: Smartphone, live: false },
  { key: 'email', label: 'Email', desc: 'Connect with Gmail, Outlook, or other providers', icon: Mail, live: false },
  { key: 'api', label: 'API', desc: 'Make a custom channel using our API', icon: Braces, live: false },
  { key: 'telegram', label: 'Telegram', desc: 'Configure Telegram channel using Bot token', icon: Send, live: false },
  { key: 'instagram', label: 'Instagram', desc: 'Connect your Instagram account', icon: Instagram, live: false },
];

const STEPS: { key: Step; title: string; desc: string }[] = [
  { key: 'channel', title: 'Choose Channel', desc: 'Choose the channel you want to create.' },
  { key: 'create', title: 'Configure Channel', desc: 'Configure and link your channel.' },
  { key: 'agents', title: 'Add Agents', desc: 'Add team members to the channel.' },
  { key: 'done', title: 'Voilà!', desc: 'You are all set to go!' },
];

const fieldClass =
  'min-h-10 rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-700 dark:text-foreground shadow-sm outline-none focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10';

const AddInboxWizard = ({
  open,
  onClose,
  assistants,
  onDone,
  onOpenSettings,
}: {
  open: boolean;
  onClose: () => void;
  assistants: any[];
  onDone: () => void;
  onOpenSettings: (inboxId: string) => void;
}) => {
  const [step, setStep] = useState<Step>('channel');
  const [selectedChannel, setSelectedChannel] = useState('website');

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [color, setColor] = useState('#000000');
  const [heading, setHeading] = useState('Hi there!');
  const [tagline, setTagline] = useState('We are here to help you out!!!');
  const [greetingEnabled, setGreetingEnabled] = useState(false);
  const [assistantId, setAssistantId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Voice specific fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [transferNumber, setTransferNumber] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);

  const [createdInboxId, setCreatedInboxId] = useState<string | null>(null);
  const [createdInbox, setCreatedInbox] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [agentSearch, setAgentSearch] = useState('');
  const [isSavingAgents, setIsSavingAgents] = useState(false);
  const [copied, setCopied] = useState(false);

  const embedOrigin = typeof window !== 'undefined' ? `${window.location.origin}` : '';
  const embedSnippet = createdInboxId ? `<script>
  window.floatchatSettings = {"position":"${createdInbox?.widget_position === 'left' ? 'left' : 'right'}","type":"${createdInbox?.widget_type === 'expanded_bubble' ? 'expanded_bubble' : 'standard'}","launcherTitle":"${(createdInbox?.launcher_title || '').replace(/"/g, '\\"')}"};
  (function(d,t) {
    var BASE_URL="${embedOrigin}";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.floatchatSDK.run({
        websiteToken: '${createdInboxId}',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
</script>` : '';
  const codepenData = JSON.stringify({
    title: `${name || 'Website'} - Captain Widget Test`,
    private: true,
    html: embedSnippet,
  });

  useEffect(() => {
    if (!open) return;
    setStep('channel');
    setSelectedChannel('website');
    setName('');
    setDomain('');
    setColor('#000000');
    setHeading('Hi there!');
    setTagline('We are here to help you out!!!');
    setGreetingEnabled(false);
    setAssistantId(assistants[0]?.id || '');
    setError('');
    setCreatedInboxId(null);
    setSelectedAgents(new Set());
    setAgentSearch('');
    setCopied(false);
    setPhoneNumber('');
    setCustomPhone('');
    setTransferNumber('');

    getUserList({ page: 1, limit: 500 }).then((teamRes: any) => {
      const rows = teamRes?.data?.data?.result?.rows || [];
      setTeamMembers(rows.map((p: any) => ({
        uuid: p.uuid,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown',
        email: p.email || '',
      })));
    }).catch(() => {});

    allNumbersList({ limit: 100 }).then((res: any) => {
      const rows = res?.data?.data?.result?.rows || res?.data?.result?.rows || res?.data?.data?.rows || [];
      const list = Array.isArray(rows) ? rows : [];
      setAvailableNumbers(list);
      if (list[0]?.did_number) {
        setPhoneNumber(list[0].did_number);
      }
    }).catch(() => {});
  }, [open, assistants]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const createInbox = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    setError('');

    // Voice channel path
    if (selectedChannel === 'voice') {
      const activePhone = phoneNumber === 'custom' ? customPhone.trim() : (phoneNumber || availableNumbers[0]?.did_number || '');
      if (!activePhone) {
        setError('Please select or enter a valid phone number.');
        setIsCreating(false);
        return;
      }
      try {
        const res = await captainFetch(`${CAPTAIN_API_BASE}/voice/channels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone_number: activePhone,
            assistant_id: assistantId ? Number(assistantId) : Number(assistants[0]?.id),
            label: name.trim() || `Voice (${activePhone})`,
            transfer_number: transferNumber.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.detail || json?.message || 'Failed to connect voice line');
        setCreatedInboxId(String(json.id));
        setStep('done');
      } catch (err: any) {
        setError(err?.message || 'Failed to connect phone line');
      } finally {
        setIsCreating(false);
      }
      return;
    }

    // Website channel path
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website_domain: domain.trim() || undefined,
          widget_color: color,
          welcome_heading: heading,
          welcome_tagline: tagline,
          channel_greeting_enabled: greetingEnabled,
          assistant_id: assistantId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to create inbox');
      setCreatedInboxId(json.data.id);
      setCreatedInbox(json.data);
      setStep('agents');
      handleAlert({ text: 'Inbox created', type: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Failed to create inbox');
      handleAlert({ text: err?.message || 'Failed to create inbox', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleAgent = (uuid: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const saveAgentsAndFinish = async () => {
    if (!createdInboxId) return;
    setIsSavingAgents(true);
    try {
      const agents = teamMembers.filter((m) => selectedAgents.has(m.uuid)).map((m) => ({ user_uuid: m.uuid, user_name: m.name, user_email: m.email }));
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inboxes/${createdInboxId}/collaborators`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save agents');
      setStep('done');
      handleAlert({ text: 'Inbox agents saved', type: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Failed to save agents');
      handleAlert({ text: err?.message || 'Failed to save agents', type: 'error' });
    } finally {
      setIsSavingAgents(false);
    }
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredTeamMembers = teamMembers.filter((m) => {
    const q = agentSearch.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="grid h-[82vh] w-full max-w-4xl grid-cols-[240px_1fr] gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex flex-col gap-1 border-r border-gray-100 bg-gray-50/60 p-5 dark:border-gray-700 dark:bg-gray-900/40">
          <button type="button" onClick={onClose} className="mb-3 w-fit text-xs text-gray-400 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground">‹ Back</button>
          <DialogTitle className="mb-4 text-sm font-bold text-gray-950 dark:text-foreground">Add Channel</DialogTitle>
          <div className="flex flex-col gap-5">
            {STEPS.filter((s) => selectedChannel !== 'voice' || s.key !== 'agents').map((s, i) => (
              <div key={s.key} className="flex items-start gap-3">
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    stepIndex > i
                      ? 'bg-primary text-white'
                      : stepIndex === i
                      ? 'border-2 border-primary bg-white dark:bg-card text-primary'
                      : 'border border-gray-300 dark:border-border text-gray-400 dark:text-muted-foreground'
                  }`}
                >
                  {stepIndex > i ? <Check className="size-3.5" /> : i + 1}
                </div>
                <div>
                  <div className={`text-xs font-bold ${stepIndex === i ? 'text-primary' : 'text-gray-700 dark:text-foreground'}`}>{s.title}</div>
                  <div className="text-[11px] text-gray-400 dark:text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900">
          {step === 'channel' && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <div className="text-base font-bold text-gray-950 dark:text-foreground">Choose Channel</div>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">Select how customers will reach your Captain Assistant.</p>
              <div className="grid grid-cols-3 gap-3">
                {CHANNEL_OPTIONS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      disabled={!c.live}
                      onClick={() => {
                        setSelectedChannel(c.key);
                        setName(c.key === 'voice' ? 'Support Phone Line' : '');
                        setStep('create');
                      }}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                        c.live
                          ? 'border-gray-200 bg-white hover:border-primary dark:hover:border-primary hover:shadow-sm cursor-pointer dark:border-gray-700 dark:bg-gray-800'
                          : 'cursor-not-allowed border-gray-100 bg-gray-50/60 opacity-60 dark:border-gray-800 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        <Icon className="size-4" />
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{c.label}</div>
                      <div className="text-xs text-gray-400 dark:text-muted-foreground">{c.live ? c.desc : 'Coming soon'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'create' && selectedChannel === 'voice' && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <div className="text-base font-bold text-gray-950 dark:text-white">Voice Channel / Phone Line</div>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">Connect a phone number (DID) to Captain AI. Incoming callers will be answered directly by your AI Assistant.</p>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

              <div className="flex flex-col gap-1.5">
                <Label>Phone Line Name</Label>
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Support Line, Sales Hotline" autoFocus />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Select Phone Number</Label>
                {availableNumbers.length > 0 && (
                  <select
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={fieldClass}
                  >
                    {availableNumbers.map((num: any) => (
                      <option key={num.uuid || num.did_number} value={num.did_number}>
                        {num.did_number} {num.friendly_name ? `(${num.friendly_name})` : ''}
                      </option>
                    ))}
                    <option value="custom">+ Enter custom phone number...</option>
                  </select>
                )}
                {(availableNumbers.length === 0 || phoneNumber === 'custom') && (
                  <Input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="mt-1"
                  />
                )}
                <p className="text-xs text-gray-400 dark:text-muted-foreground">The phone number (DID) that customers will dial.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Assign Captain Assistant</Label>
                <select value={assistantId} onChange={(e) => setAssistantId(e.target.value)} className={fieldClass}>
                  {assistants.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 dark:text-muted-foreground">This assistant will converse with callers using its prompt, knowledge base FAQs, and enabled actions.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Human Fallback Transfer Number (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g. 101 or +1 (555) 999-0000"
                  value={transferNumber}
                  onChange={(e) => setTransferNumber(e.target.value)}
                />
                <p className="text-xs text-gray-400 dark:text-muted-foreground">If the caller asks for a live agent, Captain will transfer the call here.</p>
              </div>
            </div>
          )}

          {step === 'create' && selectedChannel === 'website' && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <div className="text-base font-bold text-gray-950 dark:text-foreground">Website channel</div>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">Create a channel for your website and start supporting your customers via your website widget.</p>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <div className="flex flex-col gap-1.5">
                <Label>Website Name</Label>
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Inc" autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Website Domain</Label>
                <Input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. acme.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Widget Color</Label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-24 cursor-pointer rounded-xl border border-gray-300 dark:border-border" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Welcome Heading</Label>
                <Input type="text" value={heading} onChange={(e) => setHeading(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Welcome Tagline</Label>
                <textarea
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value.slice(0, 255))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card px-3 py-2.5 text-sm text-gray-700 dark:text-foreground shadow-sm outline-none focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <span className="self-end text-xs text-gray-400 dark:text-muted-foreground">{tagline.length} / 255</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Enable channel greeting</Label>
                <select value={greetingEnabled ? 'enabled' : 'disabled'} onChange={(e) => setGreetingEnabled(e.target.value === 'enabled')} className={fieldClass}>
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </select>
                <p className="text-xs text-gray-400 dark:text-muted-foreground">Auto-send greeting messages when customers start a conversation.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>AI Assistant (optional)</Label>
                <select value={assistantId} onChange={(e) => setAssistantId(e.target.value)} className={fieldClass}>
                  <option value="">No AI assistant — human agents only</option>
                  {assistants.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 'agents' && (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
              <div className="text-base font-bold text-gray-950 dark:text-foreground">Add Agents</div>
              <p className="text-xs text-gray-500 dark:text-muted-foreground">Pick which team members can see and reply to this inbox's conversations. Leave empty to allow everyone.</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
                <Input type="text" value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} placeholder="Search team members..." className="pl-9" />
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                {filteredTeamMembers.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-muted-foreground">No team members found.</div>
                ) : (
                  filteredTeamMembers.map((m) => (
                    <label key={m.uuid} className="flex cursor-pointer items-center gap-2.5 border-b border-gray-50 dark:border-border px-4 py-2.5 last:border-0 hover:bg-gray-50 dark:hover:bg-muted">
                      <Checkbox checked={selectedAgents.has(m.uuid)} onCheckedChange={() => toggleAgent(m.uuid)} />
                      <div className="min-w-0">
                        <div className="truncate text-sm text-gray-800 dark:text-foreground">{m.name}</div>
                        <div className="truncate text-xs text-gray-400 dark:text-muted-foreground">{m.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 'done' && selectedChannel === 'voice' && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <div className="text-base font-bold text-gray-950 dark:text-white">Voilà! Phone Line Connected</div>
              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                Your phone number is now connected to Captain AI. Incoming calls will be answered with low latency by your assistant.
              </p>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
                <p className="font-semibold">Voice Channel Active</p>
                <p className="mt-1 text-xs">
                  Callers can ask questions from your FAQs and trigger enabled actions (like checking invoices, orders, or CRM records).
                </p>
              </div>
            </div>
          )}

          {step === 'done' && selectedChannel === 'website' && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <div className="text-base font-bold text-gray-950 dark:text-foreground">Voilà! You're all set</div>
              <p className="text-sm text-gray-500 dark:text-muted-foreground">Paste this before the closing &lt;/body&gt; tag of any page you want this chatbot on.</p>
              <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <code className="flex-1 overflow-x-auto whitespace-pre text-xs text-gray-700 dark:text-foreground">{embedSnippet}</code>
                <button type="button" onClick={copySnippet} className="shrink-0 text-gray-500 dark:text-muted-foreground hover:text-primary dark:hover:text-primary" title="Copy">
                  {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </button>
              </div>
              <form action="https://codepen.io/pen/define" method="POST" target="_blank" className="w-fit">
                <input type="hidden" name="data" value={codepenData} />
                <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                  <Codepen className="size-3.5" />
                  Open in CodePen
                </Button>
              </form>
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                This website inbox is live. You can fine-tune business hours, CSAT, pre-chat form, and more from its settings any time.
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-100 p-4 dark:border-gray-700">
            {step === 'create' && (
              <>
                <Button type="button" variant="outline" onClick={() => setStep('channel')}>Back</Button>
                <Button type="button" variant="primary" disabled={isCreating || !name.trim()} onClick={createInbox}>
                  {isCreating ? 'Connecting...' : selectedChannel === 'voice' ? 'Connect Phone Line' : 'Create inbox'}
                </Button>
              </>
            )}
            {step === 'agents' && (
              <Button type="button" variant="primary" disabled={isSavingAgents} onClick={saveAgentsAndFinish}>
                {isSavingAgents ? 'Saving...' : 'Continue'}
              </Button>
            )}
            {step === 'done' && (
              <>
                {selectedChannel === 'website' && (
                  <Button type="button" variant="outline" onClick={() => createdInboxId && onOpenSettings(createdInboxId)}>
                    More Settings
                  </Button>
                )}
                <Button type="button" variant="primary" onClick={onDone}>
                  All Setup Done
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddInboxWizard;
