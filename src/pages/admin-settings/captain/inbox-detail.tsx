import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Check, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getUserList } from '@/services/api';

const CAPTAIN_API_BASE = '/captain-api/api/captain';

export type InboxSummary = {
  id: string;
  name: string;
  channel_type: string;
  website_domain: string | null;
  assistant_id: string | null;
  assistant_name: string | null;
  legacy_assistant_id: string | null;
  enabled: boolean;
};

type Field = { name: string; label: string; type: string; enabled: boolean; required: boolean };
type DaySchedule = { enabled: boolean; open: string; close: string };
type Inbox = {
  id: string;
  name: string;
  website_domain: string | null;
  assistant_id: string | null;
  assistant_name: string | null;
  legacy_assistant_id: string | null;
  sender_name_type: 'friendly' | 'professional';
  bot_name: string | null;
  widget_color: string;
  widget_position: 'left' | 'right';
  widget_type: string;
  welcome_heading: string;
  welcome_tagline: string;
  launcher_title: string | null;
  reply_time: string;
  feature_flags: { display_file_picker?: boolean; display_emoji_picker?: boolean; allow_end_conversation?: boolean; use_inbox_avatar_and_name?: boolean };
  channel_greeting_enabled: boolean;
  channel_greeting_message: string | null;
  email_collect_enabled: boolean;
  allow_messages_after_resolved: boolean;
  continuity_via_email: boolean;
  csat_enabled: boolean;
  csat_display_type: 'emoji' | 'star';
  csat_message: string | null;
  csat_survey_rule: { condition: string; labels: string[] };
  pre_chat_form_enabled: boolean;
  pre_chat_message: string | null;
  pre_chat_fields: Field[];
  business_hours_enabled: boolean;
  business_hours_timezone: string;
  business_hours_unavailable_message: string | null;
  business_hours: Record<string, DaySchedule>;
  allowed_domains: string | null;
  enable_widget_in_mobile_apps: boolean;
  identity_validation_enabled: boolean;
  identity_validation_secret: string;
  require_identity_validation: boolean;
  auto_assignment_enabled: boolean;
  collaborators: { user_uuid: string; user_name: string; user_email: string }[];
};

type TeamMember = { uuid: string; name: string; email: string };

const DAY_ORDER: { key: string; label: string }[] = [
  { key: 'sun', label: 'Sunday' },
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
];

const TABS = [
  { key: 'settings', label: 'Settings' },
  { key: 'collaborators', label: 'Collaborators' },
  { key: 'business-hours', label: 'Business Hours' },
  { key: 'csat', label: 'CSAT' },
  { key: 'pre-chat-form', label: 'Pre Chat Form' },
  { key: 'configuration', label: 'Configuration' },
  { key: 'bot-configuration', label: 'AI Assist Configure' },
];

function fieldClass() {
  return 'min-h-10 rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10';
}

function hoursBetween(open: string, close: string) {
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const diff = (ch * 60 + cm - (oh * 60 + om)) / 60;
  return diff > 0 ? `${diff}h` : '';
}

const InboxDetail = ({ inboxId, assistants, onBack }: { inboxId: string; assistants: any[]; onBack: () => void }) => {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Which tab is open lives in the URL (/captain/inboxes/:inboxId/:tab) so a
  // refresh, a shared link, or the browser's back button all land on the same
  // tab instead of always resetting to Settings.
  const navigate = useNavigate();
  const { tab: routeTab } = useParams<{ tab?: string }>();
  const activeTab = routeTab && TABS.some((t) => t.key === routeTab) ? routeTab : 'settings';
  const setActiveTab = (tab: string) => navigate(`/admin-settings/captain/inboxes/${inboxId}/${tab}`, { replace: true });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [agentSearch, setAgentSearch] = useState('');
  const [previewTab, setPreviewTab] = useState<'preview' | 'script'>('preview');
  const [previewKey, setPreviewKey] = useState(0);

  const embedOrigin = typeof window !== 'undefined' ? `https://${window.location.host}/captain-api` : '';
  // A legacy inbox mirrors a widget that's already embedded elsewhere using
  // the older data-assistant-id script — show that exact script here instead
  // of a new data-inbox-id one, since only the original is actually live.
  const embedSnippet = inbox?.legacy_assistant_id
    ? `<script src="${embedOrigin}/widget.js" data-assistant-id="${inbox.legacy_assistant_id}" async></script>`
    : `<script src="${embedOrigin}/widget.js" data-inbox-id="${inboxId}" async></script>`;

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/inboxes/${inboxId}`);
      const json = await res.json();
      setInbox(json.data);
      setSelectedAgents(new Set((json.data.collaborators || []).map((c: any) => c.user_uuid)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    getUserList({ page: 1, limit: 500 }).then((teamRes: any) => {
      const rows = teamRes?.data?.data?.result?.rows || [];
      setTeamMembers(rows.map((p: any) => ({
        uuid: p.uuid,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown',
        email: p.email || '',
      })));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxId]);

  const patch = (changes: Partial<Inbox>) => setInbox((prev) => (prev ? { ...prev, ...changes } : prev));

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const save = async (path: string, body: any) => {
    if (!inbox) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${CAPTAIN_API_BASE}/inboxes/${inboxId}/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save');
      flashSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredTeamMembers = useMemo(() => {
    const q = agentSearch.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [teamMembers, agentSearch]);

  const toggleAgent = (uuid: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  if (isLoading || !inbox) {
    return <div className="flex h-40 items-center justify-center text-sm text-[#9A948F]">Loading...</div>;
  }

  const previewUrl = inbox.legacy_assistant_id
    ? `${embedOrigin}/widget.html?assistant_id=${encodeURIComponent(inbox.legacy_assistant_id)}`
    : `${embedOrigin}/widget.html?inbox_id=${encodeURIComponent(inboxId)}`;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <button type="button" onClick={onBack} className="flex w-fit items-center gap-1 text-xs font-medium text-[#9A948F] hover:text-[#2E2D35]">
          <ChevronLeft className="size-3.5" />
          Inboxes
        </button>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#2E2D35]">{inbox.name}</h2>
          {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
        </div>
        {inbox.legacy_assistant_id && (
          <p className="text-xs text-[#9A948F]">
            This is your existing embedded widget — changes you save here update the live script immediately.
          </p>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-col gap-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-5 rounded-none border-b border-[#EEE7DD] bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-2.5 text-sm font-medium text-[#9A948F] shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-[#2E2D35] data-[state=active]:shadow-none"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
          <TabsContent value="settings" className="flex flex-col gap-5 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label>Website Name</Label>
              <Input type="text" value={inbox.name} onChange={(e) => patch({ name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Website Domain</Label>
              <Input type="text" value={inbox.website_domain || ''} onChange={(e) => patch({ website_domain: e.target.value })} placeholder="e.g. acme.com" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Sender name</Label>
              <div className="flex gap-3">
                {([
                  { key: 'friendly', title: 'Friendly', desc: "Use the agent's name in replies" },
                  { key: 'professional', title: 'Professional', desc: 'Use only the business name in replies' },
                ] as const).map((opt) => {
                  const selected = inbox.sender_name_type === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => patch({ sender_name_type: opt.key })}
                      className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-[#EEE7DD] hover:border-[#EEE7DD]'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-[#EEE7DD]'}`}>
                          {selected && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        <span className="text-sm font-medium text-[#2E2D35]">{opt.title}</span>
                      </div>
                      <div className="mt-1 pl-6 text-xs text-[#9A948F]">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Welcome Heading</Label>
              <Input type="text" value={inbox.welcome_heading} onChange={(e) => patch({ welcome_heading: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Welcome Tagline</Label>
              <textarea
                value={inbox.welcome_tagline || ''}
                onChange={(e) => patch({ welcome_tagline: e.target.value.slice(0, 255) })}
                rows={3}
                className="w-full resize-none rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2.5 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>Widget Color</Label>
                <input type="color" value={inbox.widget_color} onChange={(e) => patch({ widget_color: e.target.value })} className="h-10 w-full cursor-pointer rounded-xl border border-[#EEE7DD]" />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>Bubble Position</Label>
                <select value={inbox.widget_position} onChange={(e) => patch({ widget_position: e.target.value as any })} className={fieldClass()}>
                  <option value="right">Bottom right</option>
                  <option value="left">Bottom left</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>Type</Label>
                <select value={inbox.widget_type} onChange={(e) => patch({ widget_type: e.target.value })} className={fieldClass()}>
                  <option value="standard">Standard</option>
                  <option value="expanded_bubble">Expanded bubble</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Launcher Title (optional)</Label>
              <Input type="text" value={inbox.launcher_title || ''} onChange={(e) => patch({ launcher_title: e.target.value })} placeholder="Chat with us" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Reply time</Label>
              <select value={inbox.reply_time} onChange={(e) => patch({ reply_time: e.target.value })} className={fieldClass()}>
                <option value="in_a_few_minutes">In a few minutes</option>
                <option value="in_a_few_hours">In a few hours</option>
                <option value="in_a_day">In a day</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Widget features</Label>
              <div className="flex flex-col gap-2 rounded-xl border border-[#EEE7DD] bg-[#FBE2C8]/50 p-3">
                {[
                  { key: 'allow_end_conversation', label: 'Allow visitors to end the conversation' },
                  { key: 'display_emoji_picker', label: 'Display emoji picker on the widget' },
                  { key: 'display_file_picker', label: 'Display file picker on the widget' },
                  { key: 'use_inbox_avatar_and_name', label: "Use inbox's name and avatar for the bot" },
                ].map((f) => (
                  <div key={f.key} className="flex items-center gap-2.5">
                    <Checkbox
                      id={f.key}
                      checked={!!(inbox.feature_flags as any)[f.key]}
                      onCheckedChange={(checked) => patch({ feature_flags: { ...inbox.feature_flags, [f.key]: checked === true } })}
                    />
                    <Label htmlFor={f.key} className="cursor-pointer text-sm font-normal text-[#2E2D35]">{f.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-[#EEE7DD] p-4">
              <div className="flex items-center justify-between">
                <Label>Enable channel greeting</Label>
                <Switch checked={inbox.channel_greeting_enabled} onCheckedChange={(c) => patch({ channel_greeting_enabled: c === true })} />
              </div>
              <p className="text-xs text-[#9A948F]">Auto-greet visitors when they start a conversation and send their first message.</p>
              {inbox.channel_greeting_enabled && (
                <Input type="text" value={inbox.channel_greeting_message || ''} onChange={(e) => patch({ channel_greeting_message: e.target.value })} placeholder="Hi! Thanks for reaching out." />
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#EEE7DD] p-4">
              <div>
                <Label>Enable email collect box</Label>
                <p className="text-xs text-[#9A948F]">Enable or disable email collect box on new conversation.</p>
              </div>
              <Switch checked={inbox.email_collect_enabled} onCheckedChange={(c) => patch({ email_collect_enabled: c === true })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#EEE7DD] p-4">
              <div>
                <Label>Allow messages after conversation resolved</Label>
                <p className="text-xs text-[#9A948F]">Allow the end-user to send messages even after the conversation is resolved.</p>
              </div>
              <Switch checked={inbox.allow_messages_after_resolved} onCheckedChange={(c) => patch({ allow_messages_after_resolved: c === true })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#EEE7DD] p-4">
              <div>
                <Label>Enable conversation continuity via email</Label>
                <p className="text-xs text-[#9A948F]">Conversations will continue over email if the contact's email address is available.</p>
              </div>
              <Switch checked={inbox.continuity_via_email} onCheckedChange={(c) => patch({ continuity_via_email: c === true })} />
            </div>
            <Button
              type="button"
              variant="primary"
              className="w-fit"
              disabled={isSaving}
              onClick={() => save('settings', {
                name: inbox.name, website_domain: inbox.website_domain, sender_name_type: inbox.sender_name_type, bot_name: inbox.bot_name,
                widget_color: inbox.widget_color, widget_position: inbox.widget_position, widget_type: inbox.widget_type,
                welcome_heading: inbox.welcome_heading, welcome_tagline: inbox.welcome_tagline, launcher_title: inbox.launcher_title,
                reply_time: inbox.reply_time, feature_flags: inbox.feature_flags, channel_greeting_enabled: inbox.channel_greeting_enabled,
                channel_greeting_message: inbox.channel_greeting_message, email_collect_enabled: inbox.email_collect_enabled,
                allow_messages_after_resolved: inbox.allow_messages_after_resolved, continuity_via_email: inbox.continuity_via_email,
              })}
            >
              {isSaving ? 'Saving...' : 'Update'}
            </Button>
          </TabsContent>

          <TabsContent value="collaborators" className="flex flex-col gap-4 pt-4">
            <Label>Agents</Label>
            <p className="text-xs text-[#9A948F]">Add or remove agents from this inbox. Leave empty to allow every agent.</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9A948F]" />
              <Input type="text" value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} placeholder="Search team members..." className="pl-9" />
            </div>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-[#EEE7DD]">
              {filteredTeamMembers.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-[#9A948F]">No team members found.</div>
              ) : (
                filteredTeamMembers.map((m) => (
                  <label key={m.uuid} className="flex cursor-pointer items-center gap-2.5 border-b border-gray-50 px-4 py-2.5 last:border-0 hover:bg-[#FBE2C8]/45">
                    <Checkbox checked={selectedAgents.has(m.uuid)} onCheckedChange={() => toggleAgent(m.uuid)} />
                    <div className="min-w-0">
                      <div className="truncate text-sm text-[#2E2D35]">{m.name}</div>
                      <div className="truncate text-xs text-[#9A948F]">{m.email}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <Button
              type="button"
              variant="primary"
              className="w-fit"
              disabled={isSaving}
              onClick={() => save('collaborators', {
                agents: teamMembers.filter((m) => selectedAgents.has(m.uuid)).map((m) => ({ user_uuid: m.uuid, user_name: m.name, user_email: m.email })),
              })}
            >
              {isSaving ? 'Saving...' : 'Update'}
            </Button>

            <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
              <Label>Conversation Assignment</Label>
              <div className="flex items-center justify-between rounded-xl border border-[#EEE7DD] p-4">
                <div>
                  <div className="text-sm font-medium text-[#2E2D35]">Enable automatic conversation assignment</div>
                  <p className="text-xs text-[#9A948F]">Automatically assign incoming conversations to available agents.</p>
                </div>
                <Switch
                  checked={inbox.auto_assignment_enabled}
                  onCheckedChange={(c) => {
                    patch({ auto_assignment_enabled: c === true });
                    save('collaborators', {
                      agents: teamMembers.filter((m) => selectedAgents.has(m.uuid)).map((m) => ({ user_uuid: m.uuid, user_name: m.name, user_email: m.email })),
                      auto_assignment_enabled: c === true,
                    });
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="business-hours" className="flex flex-col gap-4 pt-4">
            <div className="flex items-center justify-between rounded-xl border border-[#EEE7DD] p-4">
              <div>
                <div className="text-sm font-medium text-[#2E2D35]">Enable business availability for this inbox</div>
                <p className="text-xs text-[#9A948F]">Shows available hours on the widget even when all agents are offline.</p>
              </div>
              <Switch checked={inbox.business_hours_enabled} onCheckedChange={(c) => patch({ business_hours_enabled: c === true })} />
            </div>
            <Label>Unavailable message for visitors</Label>
            <textarea
              value={inbox.business_hours_unavailable_message || ''}
              onChange={(e) => patch({ business_hours_unavailable_message: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2.5 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <div className="flex flex-col gap-1.5">
              <Label>Timezone</Label>
              <select value={inbox.business_hours_timezone} onChange={(e) => patch({ business_hours_timezone: e.target.value })} className={fieldClass()}>
                {['UTC', 'America/Los_Angeles', 'America/New_York', 'Asia/Kolkata', 'Asia/Jakarta', 'Europe/London'].map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-[#EEE7DD]">
              {DAY_ORDER.map((d) => {
                const sched = inbox.business_hours[d.key] || { enabled: false, open: '09:00', close: '17:00' };
                return (
                  <div key={d.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                    <Checkbox
                      checked={sched.enabled}
                      onCheckedChange={(c) => patch({ business_hours: { ...inbox.business_hours, [d.key]: { ...sched, enabled: c === true } } })}
                    />
                    <span className="w-24 text-[#2E2D35]">{d.label}</span>
                    {sched.enabled ? (
                      <>
                        <input type="time" value={sched.open} onChange={(e) => patch({ business_hours: { ...inbox.business_hours, [d.key]: { ...sched, open: e.target.value } } })} className="rounded-lg border border-[#EEE7DD] px-2 py-1 text-xs" />
                        <span className="text-[#9A948F]">—</span>
                        <input type="time" value={sched.close} onChange={(e) => patch({ business_hours: { ...inbox.business_hours, [d.key]: { ...sched, close: e.target.value } } })} className="rounded-lg border border-[#EEE7DD] px-2 py-1 text-xs" />
                        <span className="ml-auto rounded-full bg-[#FBE2C8]/40 px-2 py-0.5 text-[10px] text-[#9A948F]">{hoursBetween(sched.open, sched.close)}</span>
                      </>
                    ) : (
                      <span className="text-xs text-[#9A948F]">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="primary"
              className="w-fit"
              disabled={isSaving}
              onClick={() => save('business-hours', {
                enabled: inbox.business_hours_enabled, timezone: inbox.business_hours_timezone,
                unavailable_message: inbox.business_hours_unavailable_message, days: inbox.business_hours,
              })}
            >
              {isSaving ? 'Saving...' : 'Update business hours settings'}
            </Button>
          </TabsContent>

          <TabsContent value="csat" className="flex flex-col gap-4 pt-4">
            <div className="flex items-center justify-between rounded-xl border border-[#EEE7DD] p-4">
              <div>
                <div className="text-sm font-medium text-[#2E2D35]">Enable CSAT</div>
                <p className="text-xs text-[#9A948F]">Automatically trigger CSAT surveys at the end of conversations.</p>
              </div>
              <Switch checked={inbox.csat_enabled} onCheckedChange={(c) => patch({ csat_enabled: c === true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Display type</Label>
              <div className="flex gap-3">
                {(['emoji', 'star'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => patch({ csat_display_type: opt })}
                    className={`rounded-xl border px-4 py-2 text-sm ${inbox.csat_display_type === opt ? 'border-primary bg-primary/5' : 'border-[#EEE7DD]'}`}
                  >
                    {opt === 'emoji' ? '😡 😕 😐 🙂 😍' : '★ ★ ★ ★ ★'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Message</Label>
              <textarea
                value={inbox.csat_message || ''}
                onChange={(e) => patch({ csat_message: e.target.value.slice(0, 200) })}
                rows={2}
                placeholder="Please enter a message to show users with the form"
                className="w-full resize-none rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2.5 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Survey rule — send only if the conversation contains any of these labels (comma-separated)</Label>
              <Input
                type="text"
                value={(inbox.csat_survey_rule.labels || []).join(', ')}
                onChange={(e) => patch({ csat_survey_rule: { ...inbox.csat_survey_rule, labels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
                placeholder="e.g. sales, support"
              />
              <p className="text-xs text-[#9A948F]">Leave blank to send the survey on every resolved conversation.</p>
            </div>
            <Button
              type="button"
              variant="primary"
              className="w-fit"
              disabled={isSaving}
              onClick={() => save('csat', { enabled: inbox.csat_enabled, display_type: inbox.csat_display_type, message: inbox.csat_message, survey_rule: inbox.csat_survey_rule })}
            >
              {isSaving ? 'Saving...' : 'Update'}
            </Button>
          </TabsContent>

          <TabsContent value="pre-chat-form" className="flex flex-col gap-4 pt-4">
            <div className="flex items-center justify-between rounded-xl border border-[#EEE7DD] p-4">
              <div>
                <div className="text-sm font-medium text-[#2E2D35]">Enable pre chat form</div>
                <p className="text-xs text-[#9A948F]">Capture visitor information before they start a conversation.</p>
              </div>
              <Switch checked={inbox.pre_chat_form_enabled} onCheckedChange={(c) => patch({ pre_chat_form_enabled: c === true })} />
            </div>
            <textarea
              value={inbox.pre_chat_message || ''}
              onChange={(e) => patch({ pre_chat_message: e.target.value })}
              rows={2}
              placeholder="Share your queries or comments here."
              className="w-full resize-none rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 py-2.5 text-sm text-[#2E2D35] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <Label>Pre chat form fields</Label>
            <div className="flex flex-col gap-2 rounded-xl border border-[#EEE7DD] p-4">
              {inbox.pre_chat_fields.map((f, i) => (
                <div key={f.name} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <span className="w-28 text-sm text-[#2E2D35]">{f.label}</span>
                  <Input
                    type="text"
                    value={f.label}
                    onChange={(e) => {
                      const fields = [...inbox.pre_chat_fields];
                      fields[i] = { ...fields[i], label: e.target.value };
                      patch({ pre_chat_fields: fields });
                    }}
                    className="w-40"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[#9A948F]">
                    <Checkbox
                      checked={f.enabled}
                      onCheckedChange={(c) => {
                        const fields = [...inbox.pre_chat_fields];
                        fields[i] = { ...fields[i], enabled: c === true };
                        patch({ pre_chat_fields: fields });
                      }}
                    />
                    Enabled
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[#9A948F]">
                    <Checkbox
                      checked={f.required}
                      onCheckedChange={(c) => {
                        const fields = [...inbox.pre_chat_fields];
                        fields[i] = { ...fields[i], required: c === true };
                        patch({ pre_chat_fields: fields });
                      }}
                    />
                    Required
                  </label>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="primary"
              className="w-fit"
              disabled={isSaving}
              onClick={() => save('pre-chat-form', { enabled: inbox.pre_chat_form_enabled, message: inbox.pre_chat_message, fields: inbox.pre_chat_fields })}
            >
              {isSaving ? 'Saving...' : 'Update Pre Chat Form Settings'}
            </Button>
          </TabsContent>

          <TabsContent value="configuration" className="flex flex-col gap-5 pt-4">
            <div className="flex flex-col gap-1.5 rounded-xl border border-[#EEE7DD] p-4">
              <Label>Allowed Domains</Label>
              <p className="text-xs text-[#9A948F]">Restrict which websites can embed your chat widget. Leave blank to allow all domains (not recommended for production).</p>
              <Input type="text" value={inbox.allowed_domains || ''} onChange={(e) => patch({ allowed_domains: e.target.value })} placeholder="example.com, www.example.com" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#EEE7DD] p-4">
              <div>
                <div className="text-sm font-medium text-[#2E2D35]">Enable widget in mobile apps</div>
                <p className="text-xs text-[#9A948F]">Mobile apps don't send domain information, so allow this to avoid them being blocked.</p>
              </div>
              <Switch checked={inbox.enable_widget_in_mobile_apps} onCheckedChange={(c) => patch({ enable_widget_in_mobile_apps: c === true })} />
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-[#EEE7DD] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#2E2D35]">Identity Validation</div>
                  <p className="text-xs text-[#9A948F]">Verify user authenticity with a signed HMAC token to prevent impersonation.</p>
                </div>
                <Switch checked={inbox.identity_validation_enabled} onCheckedChange={(c) => patch({ identity_validation_enabled: c === true })} />
              </div>
              {inbox.identity_validation_enabled && (
                <>
                  <Label>Secret Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-[#EEE7DD] bg-[#FBE2C8]/45 px-3 py-2 text-xs text-[#9A948F]">{inbox.identity_validation_secret}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const res = await fetch(`${CAPTAIN_API_BASE}/inboxes/${inboxId}/regenerate-secret`, { method: 'POST' });
                        const json = await res.json();
                        patch({ identity_validation_secret: json.data.identity_validation_secret });
                      }}
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-[#2E2D35]">Require identity validation for all conversations</div>
                      <p className="text-xs text-[#9A948F]">Requests without a valid token are rejected.</p>
                    </div>
                    <Switch checked={inbox.require_identity_validation} onCheckedChange={(c) => patch({ require_identity_validation: c === true })} />
                  </div>
                </>
              )}
            </div>
            <Button
              type="button"
              variant="primary"
              className="w-fit"
              disabled={isSaving}
              onClick={() => save('configuration', {
                allowed_domains: inbox.allowed_domains, enable_widget_in_mobile_apps: inbox.enable_widget_in_mobile_apps,
                identity_validation_enabled: inbox.identity_validation_enabled, require_identity_validation: inbox.require_identity_validation,
              })}
            >
              {isSaving ? 'Saving...' : 'Update'}
            </Button>
          </TabsContent>

          <TabsContent value="bot-configuration" className="flex flex-col gap-5 pt-4">
            {inbox.legacy_assistant_id ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                This inbox mirrors an existing embedded widget — it's permanently answered by{' '}
                <strong>{inbox.assistant_name || 'its original assistant'}</strong>. To use a different assistant,
                create a new inbox instead.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>AI Assistant</Label>
                  <p className="text-xs text-[#9A948F]">Pick which Captain assistant answers this inbox automatically. Choose "None" for a human-only inbox.</p>
                  <select value={inbox.assistant_id || ''} onChange={(e) => patch({ assistant_id: e.target.value || null })} className={fieldClass()}>
                    <option value="">No AI assistant — human agents only</option>
                    {assistants.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  className="w-fit"
                  disabled={isSaving}
                  onClick={() => save('bot-configuration', { assistant_id: inbox.assistant_id })}
                >
                  {isSaving ? 'Saving...' : 'Update'}
                </Button>
              </>
            )}
          </TabsContent>
          </div>
        </Tabs>

        <div className="flex min-h-0 flex-col gap-3 rounded-2xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-[#FBE2C8]/40 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewTab('preview')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${previewTab === 'preview' ? 'bg-white text-[#2E2D35] shadow-sm' : 'text-[#9A948F]'}`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('script')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${previewTab === 'script' ? 'bg-white text-[#2E2D35] shadow-sm' : 'text-[#9A948F]'}`}
              >
                Script
              </button>
            </div>
          </div>

          {previewTab === 'preview' ? (
            <>
              <div className="flex-1 overflow-hidden rounded-xl border border-gray-100 bg-[#FBE2C8]/45">
                <iframe key={previewKey} src={previewUrl} title="Widget preview" className="h-full min-h-[420px] w-full border-0" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#9A948F]">Reflects your last saved settings.</p>
                <button type="button" onClick={() => setPreviewKey((k) => k + 1)} className="text-xs font-medium text-primary hover:underline">
                  Refresh
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-xs text-[#9A948F]">Paste this before the closing &lt;/body&gt; tag of any page you want this chatbot on.</p>
              <div className="flex items-start gap-2 rounded-xl border border-[#EEE7DD] bg-[#FBE2C8]/45 p-3">
                <code className="flex-1 overflow-x-auto whitespace-pre text-xs text-[#2E2D35]">{embedSnippet}</code>
                <button type="button" onClick={copySnippet} className="shrink-0 text-[#9A948F] hover:text-primary" title="Copy">
                  {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxDetail;
