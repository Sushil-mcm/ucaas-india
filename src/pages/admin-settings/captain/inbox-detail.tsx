import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Check, RefreshCw, Search, X, Codepen, LogOut, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { handleAlert } from '@/lib/utils';
import { getUserList } from '@/services/api';
import TimezoneCombobox from './timezone-combobox';
import RichTextField from './rich-text-field';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';


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

type Field = { name: string; label: string; type: string; enabled: boolean; required: boolean; placeholder?: string };
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
  return 'min-h-10 rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card px-3 text-sm text-gray-700 dark:text-foreground shadow-sm outline-none focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10';
}

function hoursBetween(open: string, close: string) {
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const diff = (ch * 60 + cm - (oh * 60 + om)) / 60;
  return diff > 0 ? `${Math.round(diff * 10) / 10}h` : '';
}

// 30-minute steps, "HH:MM" (24h) values with "h:MM AM" labels — Chatwoot's picker.
const TIME_OPTIONS: { value: string; label: string }[] = Array.from({ length: 48 }, (_, i) => {
  const h24 = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const value = `${String(h24).padStart(2, '0')}:${m}`;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { value, label: `${h12}:${m} ${ampm}` };
});

const isAllDay = (s: DaySchedule) => s.open === '00:00' && (s.close === '23:59' || s.close === '24:00');

const REPLY_TIME_LABELS: Record<string, string> = {
  in_a_few_minutes: 'in a few minutes',
  in_a_few_hours: 'in a few hours',
  in_a_day: 'in a day',
};

// Mirrors floatchat-web-app's widget builder preview (Widget.vue): a live,
// client-rendered mock of the bubble — reflects in-progress edits instantly,
// unlike an iframe pointed at /widget.html which only shows last-saved state.
const WidgetLivePreview = ({
  inbox,
  isChatOpen,
}: {
  inbox: Inbox;
  isChatOpen: boolean;
}) => {
  const [chatState, setChatState] = useState<'active' | 'resolved' | 'csat'>('active');
  const [isClosed, setIsClosed] = useState(false);
  const [localChatMode, setLocalChatMode] = useState(isChatOpen);

  useEffect(() => {
    setLocalChatMode(isChatOpen);
    setIsClosed(false);
  }, [isChatOpen]);

  const color = inbox.widget_color || '#000000';
  const position = inbox.widget_position === 'left' ? 'left' : 'right';
  const initial = (inbox.name || 'W').trim().charAt(0).toUpperCase();
  const isExpanded = inbox.widget_type === 'expanded_bubble';
  const launcherTitle = (inbox.launcher_title || '').trim();

  const isOffline = inbox.business_hours_enabled;
  const offlineMessage =
    (inbox.business_hours_unavailable_message || '').replace(/<[^>]+>/g, '').trim() || 'We will be back online tomorrow';
  const replyTimeText = `Typically replies ${REPLY_TIME_LABELS[inbox.reply_time] || 'in a few minutes'}`;
  const headerSubtitle = isOffline ? offlineMessage : replyTimeText;

  const toggleWidget = () => {
    if (isClosed) {
       setIsClosed(false);
       setLocalChatMode(false);
    } else {
       setIsClosed(true);
       setLocalChatMode(false);
    }
  };
  
  const showCrossIcon = !isClosed && (localChatMode || !isExpanded);
  // Expanded-bubble launcher: a pill showing the launcher title next to the icon,
  // shown whenever the chat window isn't open (matches the real SDK bubble).
  const showExpandedPill = isExpanded && !!launcherTitle && !localChatMode && !showCrossIcon;

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none p-4 items-center justify-center">
      <div className={`relative w-full max-w-[320px] h-[540px] flex flex-col justify-end pointer-events-auto ${position === 'left' ? 'items-start' : 'items-end'}`}>
        {!isClosed && localChatMode ? (
          <div className="w-full flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 mb-20" style={{ height: '480px' }}>
            <div className="flex flex-col px-4 py-3" style={{ background: color }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                      {inbox.name || 'Website'}
                      {!isOffline && <span className="size-1.5 rounded-full bg-green-400 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"></span>}
                    </div>
                    <div className="text-[10px] text-white/80">{headerSubtitle}</div>
                  </div>
                </div>
                <div className="pointer-events-auto">
                  {inbox.feature_flags?.allow_end_conversation && chatState === 'active' && (
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setChatState('resolved'); }} className="text-white/80 hover:text-white bg-black/10 p-1.5 rounded-md transition-colors cursor-pointer relative z-50 pointer-events-auto" title="End conversation">
                      <LogOut className="size-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gray-50 dark:bg-[#1a1b1e] p-4 pointer-events-auto">
              {chatState === 'csat' ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-sm text-gray-500 dark:text-muted-foreground">
                  Thanks for your feedback!
                </div>
              ) : (
                <>
                  {inbox.channel_greeting_enabled && (
                    <div
                      className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-white dark:bg-[#2c2c2e] px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 shadow-sm ring-1 ring-black/5 dark:ring-0 [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: inbox.channel_greeting_message || 'Hi! Thanks for reaching out.' }}
                    />
                  )}
                  <div className="max-w-[85%] self-end rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white shadow-sm" style={{ background: color }}>
                    Hi
                  </div>
                  <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-white dark:bg-[#2c2c2e] px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 shadow-sm ring-1 ring-black/5 dark:ring-0 flex items-center gap-2 mt-1">
                    {inbox.feature_flags?.use_inbox_avatar_and_name && (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {initial}
                      </span>
                    )}
                    Hello
                  </div>
                  <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-transparent px-3 py-2 text-[10px] text-gray-400 dark:text-muted-foreground mt-2 mx-auto text-center font-medium">
                    Assigned to human agent. Please wait.
                  </div>

                  {chatState === 'resolved' && inbox.csat_enabled && (
                    <div className="mt-4 rounded-2xl bg-white dark:bg-[#2c2c2e] p-5 shadow-sm ring-1 ring-black/5 dark:ring-0">
                      <div
                        className="text-sm text-gray-700 dark:text-gray-200 mb-4 font-medium text-center [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: inbox.csat_message || 'Please rate your experience' }}
                      />
                      {inbox.csat_display_type === 'emoji' ? (
                        <div className="flex justify-between text-2xl px-2">
                          {['😡', '😕', '😐', '🙂', '😍'].map((emoji, idx) => (
                            <button key={idx} onClick={() => setChatState('csat')} className="hover:scale-125 transition-transform">{emoji}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2 text-3xl text-yellow-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setChatState('csat')} className="hover:scale-125 transition-transform">★</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {chatState === 'active' && (
              <div className="flex flex-col bg-white dark:bg-[#1a1b1e]">
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="flex-1 flex items-center bg-white dark:bg-black/20 rounded-lg px-3 border border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.1)] pointer-events-auto">
                    <input type="text" placeholder="Type your message" className="flex-1 text-[13px] bg-transparent py-2.5 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-muted-foreground" />
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 transition-colors">
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <button className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 pl-1.5 pr-1 transition-colors">
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </div>
                </div>
                <div className="pb-4 pt-1"></div>
              </div>
            )}
          </div>
        ) : (
          !isClosed && !localChatMode && (
            <div className="w-[320px] flex flex-col justify-between bg-white dark:bg-[#1c1c1e] rounded-[24px] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-6 mb-20 pointer-events-auto" style={{ height: '480px' }}>
              <div className="flex flex-col mb-5">
                {inbox.welcome_heading && <div className="text-[22px] font-bold text-gray-900 dark:text-white mb-1.5 leading-tight break-words">{inbox.welcome_heading}</div>}
                {inbox.welcome_tagline && <div className="text-sm text-gray-500 dark:text-gray-400 break-words">{inbox.welcome_tagline}</div>}
              </div>
              <div className="rounded-[20px] bg-gray-50 dark:bg-[#2c2c2e] p-5 shadow-sm flex items-start justify-between gap-3 border border-gray-100 dark:border-white/5 pointer-events-auto">
                <div className="flex flex-col w-full">
                  <div className="text-[13px] font-bold text-gray-900 dark:text-white">
                    {isOffline ? 'We are away at the moment' : 'We are Online'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 mt-0.5">
                    {headerSubtitle}
                  </div>
                  <button className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-start gap-1 w-fit mt-1 cursor-default pointer-events-auto" title="Start conversation (dummy in preview)">
                    Start Conversation <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
                {inbox.feature_flags?.use_inbox_avatar_and_name && (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm mt-0.5" style={{ background: color }}>
                    {initial}
                  </div>
                )}
              </div>
            </div>
          )
        )}
        {showExpandedPill ? (
          <div
            onClick={toggleWidget}
            className={`absolute bottom-0 flex h-14 max-w-[280px] cursor-pointer items-center gap-2.5 rounded-full px-5 text-white shadow-xl transition-transform pointer-events-auto ${position === 'left' ? 'left-0' : 'right-0'}`}
            style={{ background: color }}
          >
            <svg viewBox="0 0 24 24" className="size-6 shrink-0 fill-current"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            <span className="truncate text-sm font-semibold">{launcherTitle}</span>
          </div>
        ) : (
          <div
            onClick={toggleWidget}
            className={`absolute bottom-0 flex size-14 cursor-pointer items-center justify-center rounded-full text-white shadow-xl transition-transform pointer-events-auto ${position === 'left' ? 'left-0' : 'right-0'}`}
            style={{ background: color }}
          >
            {showCrossIcon ? <X className="size-6" /> : (
              <svg viewBox="0 0 24 24" className="size-7 fill-current"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [isPreviewChatOpen, setIsPreviewChatOpen] = useState(true);

  const embedOrigin = typeof window !== 'undefined' ? `${window.location.origin}` : '';
  const token = inbox?.legacy_assistant_id || inboxId;
  const embedSnippet = `<script>
  window.floatchatSettings = {"position":"${inbox?.widget_position === 'left' ? 'left' : 'right'}","type":"${inbox?.widget_type === 'expanded_bubble' ? 'expanded_bubble' : 'standard'}","launcherTitle":"${(inbox?.launcher_title || '').replace(/"/g, '\\"')}"};
  (function(d,t) {
    var BASE_URL="${embedOrigin}";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.floatchatSDK.run({
        websiteToken: '${token}',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
</script>`;

  // Same mechanism floatchat-web-app's widget builder uses (dashboard/components/Code.vue):
  // a plain HTML form POST to CodePen's public "Define API" that opens a new pen
  // prefilled with the embed script, so you can test it on a real page in one click.
  const codepenData = JSON.stringify({
    title: `${inbox?.name || 'Website'} - Captain Widget Test`,
    private: true,
    html: embedSnippet,
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inboxes/${inboxId}`);
      const json = await res.json();
      const raw = json.data || {};
      setInbox({
        ...raw,
        csat_display_type: raw.csat_display_type === 'star' ? 'star' : 'emoji',
        csat_survey_rule: raw.csat_survey_rule || { condition: 'any', labels: [] },
        business_hours: raw.business_hours || {},
      });
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
      const res = await captainFetch(`${CAPTAIN_API_BASE}/inboxes/${inboxId}/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json())?.message || 'Failed to save');
      flashSaved();
      handleAlert({ text: 'Inbox settings saved', type: 'success' });
    } catch (err: any) {
      handleAlert({ text: err?.message || 'Failed to save inbox settings', type: 'error' });
      throw err;
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
    return <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <button type="button" onClick={onBack} className="flex w-fit items-center gap-1 text-xs font-medium text-gray-500 dark:text-muted-foreground hover:text-gray-800 dark:hover:text-foreground">
          <ChevronLeft className="size-3.5" />
          Inboxes
        </button>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-950 dark:text-foreground">{inbox.name}</h2>
          {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
        </div>
        {inbox.legacy_assistant_id && (
          <p className="text-xs text-gray-400 dark:text-muted-foreground">
            This is your existing embedded widget — changes you save here update the live script immediately.
          </p>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-col gap-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-5 rounded-none border-b border-gray-200 bg-transparent p-0 dark:border-gray-700">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-2.5 text-sm font-medium text-gray-500 dark:text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-foreground data-[state=active]:shadow-none"
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
                      className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-border hover:border-gray-300 dark:hover:border-border'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-gray-300 dark:border-border'}`}>
                          {selected && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        <span className="text-sm font-medium text-gray-800 dark:text-foreground">{opt.title}</span>
                      </div>
                      <div className="mt-1 pl-6 text-xs text-gray-400 dark:text-muted-foreground">{opt.desc}</div>
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
                className="w-full resize-none rounded-xl border border-gray-300 dark:border-border bg-white dark:bg-card px-3 py-2.5 text-sm text-gray-700 dark:text-foreground shadow-sm outline-none focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>Widget Color</Label>
                <input type="color" value={inbox.widget_color} onChange={(e) => patch({ widget_color: e.target.value })} className="h-10 w-full cursor-pointer rounded-xl border border-gray-300 dark:border-border" />
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
              <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/60">
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
                    <Label htmlFor={f.key} className="cursor-pointer text-sm font-normal text-gray-700 dark:text-foreground">{f.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Label>Enable channel greeting</Label>
                <Switch checked={inbox.channel_greeting_enabled} onCheckedChange={(c) => patch({ channel_greeting_enabled: c === true })} />
              </div>
              <p className="text-xs text-gray-400 dark:text-muted-foreground">Auto-greet visitors when they start a conversation and send their first message.</p>
              {inbox.channel_greeting_enabled && (
                <RichTextField
                  value={inbox.channel_greeting_message || ''}
                  onChange={(html) => patch({ channel_greeting_message: html })}
                  maxLength={500}
                  placeholder="Hi! Thanks for reaching out."
                  minHeight={90}
                />
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <Label>Enable email collect box</Label>
                <p className="text-xs text-gray-400 dark:text-muted-foreground">Enable or disable email collect box on new conversation.</p>
              </div>
              <Switch checked={inbox.email_collect_enabled} onCheckedChange={(c) => patch({ email_collect_enabled: c === true })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <Label>Allow messages after conversation resolved</Label>
                <p className="text-xs text-gray-400 dark:text-muted-foreground">Allow the end-user to send messages even after the conversation is resolved.</p>
              </div>
              <Switch checked={inbox.allow_messages_after_resolved} onCheckedChange={(c) => patch({ allow_messages_after_resolved: c === true })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <Label>Enable conversation continuity via email</Label>
                <p className="text-xs text-gray-400 dark:text-muted-foreground">Conversations will continue over email if the contact's email address is available.</p>
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
            <p className="text-xs text-gray-400 dark:text-muted-foreground">Add or remove agents from this inbox. Leave empty to allow every agent.</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
              <Input type="text" value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} placeholder="Search team members..." className="pl-9" />
            </div>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
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

            <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
              <Label>Conversation Assignment</Label>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-foreground">Enable automatic conversation assignment</div>
                  <p className="text-xs text-gray-400 dark:text-muted-foreground">Automatically assign incoming conversations to available agents.</p>
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

          <TabsContent value="business-hours" className="flex flex-col gap-5 pt-4">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-foreground">Enable business availability for this inbox</div>
                <p className="mt-1 text-xs text-gray-400 dark:text-muted-foreground">
                  Enabling business availability will show the available hours on the live chat widget even if all
                  agents are offline. Outside available hours visitors can be warned with a message and a pre-chat form.
                </p>
              </div>
              <Switch checked={inbox.business_hours_enabled} onCheckedChange={(c) => patch({ business_hours_enabled: c === true })} />
            </div>

            {inbox.business_hours_enabled && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Unavailable message for visitors</Label>
                  <RichTextField
                    value={inbox.business_hours_unavailable_message || ''}
                    onChange={(html) => patch({ business_hours_unavailable_message: html })}
                    maxLength={300}
                    placeholder="We are unavailable at the moment. Leave a message and we'll get back to you."
                    minHeight={100}
                  />
                </div>

                <div className="relative py-2 text-center">
                  <span className="relative z-10 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-muted-foreground dark:bg-gray-900">
                    Set your weekly hours
                  </span>
                  <span className="absolute left-0 top-1/2 h-px w-full bg-gray-100 dark:bg-gray-700" />
                </div>

                <div className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
                  <Label>Select timezone</Label>
                  <TimezoneCombobox
                    value={inbox.business_hours_timezone}
                    onChange={(iana) => patch({ business_hours_timezone: iana })}
                    className="w-full"
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-[8rem_1fr_4rem] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-muted-foreground dark:border-gray-700 dark:bg-gray-800">
                    <span>Day</span>
                    <span>Availability</span>
                    <span className="text-right">Hours</span>
                  </div>
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                    {DAY_ORDER.map((d) => {
                      const sched: DaySchedule = inbox.business_hours[d.key] || { enabled: false, open: '09:00', close: '17:00' };
                      const setDay = (patchSched: Partial<DaySchedule>) =>
                        patch({ business_hours: { ...inbox.business_hours, [d.key]: { ...sched, ...patchSched } } });
                      const allDay = isAllDay(sched);
                      return (
                        <div key={d.key} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-4 px-4 py-3.5 text-sm">
                          <label className="flex items-center gap-2.5">
                            <Checkbox checked={sched.enabled} onCheckedChange={(c) => setDay({ enabled: c === true })} />
                            <span className={sched.enabled ? 'font-medium text-gray-800 dark:text-foreground' : 'text-gray-500 dark:text-muted-foreground'}>{d.label}</span>
                          </label>

                          {sched.enabled ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-muted-foreground">
                                <Checkbox
                                  checked={allDay}
                                  onCheckedChange={(c) =>
                                    setDay(c === true ? { open: '00:00', close: '23:59' } : { open: '09:00', close: '17:00' })
                                  }
                                />
                                All-Day
                              </label>
                              <select
                                value={sched.open}
                                disabled={allDay}
                                onChange={(e) => setDay({ open: e.target.value })}
                                className="min-h-8 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-2 text-xs text-gray-700 dark:text-foreground outline-none focus:border-primary dark:focus:border-primary disabled:bg-gray-50 dark:disabled:bg-muted disabled:text-gray-400 dark:disabled:text-muted-foreground"
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                              <span className="text-gray-400 dark:text-muted-foreground">—</span>
                              <select
                                value={sched.close}
                                disabled={allDay}
                                onChange={(e) => setDay({ close: e.target.value })}
                                className="min-h-8 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-2 text-xs text-gray-700 dark:text-foreground outline-none focus:border-primary dark:focus:border-primary disabled:bg-gray-50 dark:disabled:bg-muted disabled:text-gray-400 dark:disabled:text-muted-foreground"
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="text-xs italic text-gray-400 dark:text-muted-foreground">Unavailable</span>
                          )}

                          <span className="justify-self-end">
                            {sched.enabled && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {hoursBetween(sched.open, allDay ? '24:00' : sched.close)}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Button
              type="button"
              variant="primary"
              className="w-fit self-end"
              disabled={isSaving}
              onClick={() => save('business-hours', {
                enabled: inbox.business_hours_enabled, timezone: inbox.business_hours_timezone,
                unavailable_message: inbox.business_hours_unavailable_message, days: inbox.business_hours,
              })}
            >
              {isSaving ? 'Saving...' : 'Update business hours settings'}
            </Button>
          </TabsContent>

          <TabsContent value="csat" className="flex flex-col gap-5 pt-4">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-foreground">Enable CSAT</div>
                <p className="mt-1 text-xs text-gray-400 dark:text-muted-foreground">
                  Automatically trigger CSAT surveys at the end of conversations to understand how customers feel about
                  their support experience. Track satisfaction trends and identify areas for improvement over time.
                </p>
              </div>
              <Switch checked={inbox.csat_enabled} onCheckedChange={(c) => patch({ csat_enabled: c === true })} />
            </div>

            {inbox.csat_enabled && (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Display type</Label>
                  <div className="flex flex-wrap gap-3">
                    {(['emoji', 'star'] as const).map((opt) => {
                      const selected = (inbox.csat_display_type || 'emoji') === opt;
                      const faces = opt === 'emoji' ? ['😞', '😕', '😐', '🙂', '😍'] : ['★', '★', '★', '★', '★'];
                      return (
                        <div
                          key={opt}
                          role="radio"
                          aria-checked={selected}
                          tabIndex={0}
                          onClick={() => patch({ csat_display_type: opt })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              patch({ csat_display_type: opt });
                            }
                          }}
                          className={`relative flex cursor-pointer select-none items-center gap-2 rounded-xl border-2 px-5 py-3 text-2xl transition-all ${
                            selected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/25 dark:bg-blue-950/30'
                              : 'border-gray-200 hover:border-gray-300 dark:hover:border-border dark:border-gray-600'
                          }`}
                        >
                          {faces.map((f, i) => (
                            <span key={i} className={opt === 'star' ? 'text-amber-400' : ''}>{f}</span>
                          ))}
                          {selected && (
                            <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-blue-500 text-white">
                              <Check className="size-3" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Message</Label>
                  <RichTextField
                    value={inbox.csat_message || ''}
                    onChange={(html) => patch({ csat_message: html })}
                    maxLength={200}
                    placeholder="Please enter a message to show users with the form"
                    minHeight={110}
                  />
                </div>

                <p className="text-xs italic text-gray-400 dark:text-muted-foreground">Note: CSAT surveys are sent only once per conversation.</p>
              </>
            )}

            <Button
              type="button"
              variant="primary"
              className="w-fit self-end"
              disabled={isSaving}
              onClick={() => save('csat', {
                enabled: inbox.csat_enabled,
                display_type: inbox.csat_display_type || 'emoji',
                message: inbox.csat_message,
                survey_rule: inbox.csat_survey_rule || { condition: 'any', labels: [] },
              })}
            >
              {isSaving ? 'Saving...' : 'Update'}
            </Button>
          </TabsContent>

          <TabsContent value="pre-chat-form" className="flex flex-col gap-5 pt-4">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-foreground">Enable pre chat form</div>
                <p className="mt-1 text-xs text-gray-400 dark:text-muted-foreground">
                  Pre chat forms enable you to capture user information before they start conversation with you.
                </p>
              </div>
              <Switch checked={inbox.pre_chat_form_enabled} onCheckedChange={(c) => patch({ pre_chat_form_enabled: c === true })} />
            </div>

            {inbox.pre_chat_form_enabled && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Pre chat message</Label>
                  <RichTextField
                    value={inbox.pre_chat_message || ''}
                    onChange={(html) => patch({ pre_chat_message: html })}
                    maxLength={300}
                    placeholder="Share your queries or comments here."
                    minHeight={90}
                  />
                </div>

                <div className="relative py-2 text-center">
                  <span className="relative z-10 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-muted-foreground dark:bg-gray-900">
                    Pre chat form fields
                  </span>
                  <span className="absolute left-0 top-1/2 h-px w-full bg-gray-100 dark:bg-gray-700" />
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-[6rem_7rem_3.5rem_4rem_minmax(6rem,1fr)_minmax(6rem,1fr)] items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-muted-foreground dark:border-gray-700 dark:bg-gray-800">
                      <span />
                      <span>Key</span>
                      <span>Type</span>
                      <span>Required</span>
                      <span>Label</span>
                      <span>Placeholder</span>
                    </div>
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                      {inbox.pre_chat_fields.map((f, i) => {
                        const setField = (chg: Partial<Field>) => {
                          const fields = [...inbox.pre_chat_fields];
                          fields[i] = { ...fields[i], ...chg };
                          patch({ pre_chat_fields: fields });
                        };
                        return (
                          <div
                            key={f.name}
                            className="grid grid-cols-[6rem_7rem_3.5rem_4rem_minmax(6rem,1fr)_minmax(6rem,1fr)] items-center gap-4 px-4 py-3.5"
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="size-4 shrink-0 cursor-grab text-gray-300 dark:text-muted-foreground" />
                              <Switch checked={f.enabled} onCheckedChange={(c) => setField({ enabled: c === true })} />
                            </div>
                            <span className="truncate font-mono text-xs text-gray-600 dark:text-muted-foreground">{f.name}</span>
                            <span className="text-xs text-gray-500 dark:text-muted-foreground">{f.type}</span>
                            <Checkbox checked={f.required} onCheckedChange={(c) => setField({ required: c === true })} />
                            <Input
                              type="text"
                              value={f.label}
                              disabled={!f.enabled}
                              onChange={(e) => setField({ label: e.target.value })}
                              placeholder="Label"
                            />
                            <Input
                              type="text"
                              value={f.placeholder || ''}
                              disabled={!f.enabled}
                              onChange={(e) => setField({ placeholder: e.target.value })}
                              placeholder={f.name}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button
              type="button"
              variant="primary"
              className="w-fit self-end"
              disabled={isSaving}
              onClick={() => save('pre-chat-form', { enabled: inbox.pre_chat_form_enabled, message: inbox.pre_chat_message, fields: inbox.pre_chat_fields })}
            >
              {isSaving ? 'Saving...' : 'Update Pre Chat Form Settings'}
            </Button>
          </TabsContent>

          <TabsContent value="configuration" className="flex flex-col gap-5 pt-4">
            <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <Label>Allowed Domains</Label>
              <p className="text-xs text-gray-400 dark:text-muted-foreground">Restrict which websites can embed your chat widget. Leave blank to allow all domains (not recommended for production).</p>
              <Input type="text" value={inbox.allowed_domains || ''} onChange={(e) => patch({ allowed_domains: e.target.value })} placeholder="example.com, www.example.com" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-foreground">Enable widget in mobile apps</div>
                <p className="text-xs text-gray-400 dark:text-muted-foreground">Mobile apps don't send domain information, so allow this to avoid them being blocked.</p>
              </div>
              <Switch checked={inbox.enable_widget_in_mobile_apps} onCheckedChange={(c) => patch({ enable_widget_in_mobile_apps: c === true })} />
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-foreground">Identity Validation</div>
                  <p className="text-xs text-gray-400 dark:text-muted-foreground">Verify user authenticity with a signed HMAC token to prevent impersonation.</p>
                </div>
                <Switch checked={inbox.identity_validation_enabled} onCheckedChange={(c) => patch({ identity_validation_enabled: c === true })} />
              </div>
              {inbox.identity_validation_enabled && (
                <>
                  <Label>Secret Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">{inbox.identity_validation_secret}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await captainFetch(`${CAPTAIN_API_BASE}/inboxes/${inboxId}/regenerate-secret`, { method: 'POST' });
                          if (!res.ok) throw new Error();
                          const json = await res.json();
                          patch({ identity_validation_secret: json.data.identity_validation_secret });
                          handleAlert({ text: 'Validation secret regenerated', type: 'success' });
                        } catch {
                          handleAlert({ text: 'Could not regenerate the secret', type: 'error' });
                        }
                      }}
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-700 dark:text-foreground">Require identity validation for all conversations</div>
                      <p className="text-xs text-gray-400 dark:text-muted-foreground">Requests without a valid token are rejected.</p>
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
                  <p className="text-xs text-gray-400 dark:text-muted-foreground">Pick which Captain assistant answers this inbox automatically. Choose "None" for a human-only inbox.</p>
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

        <div className="flex w-full shrink-0 flex-col rounded-2xl bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/10 p-5 text-gray-900 dark:text-white shadow-xl relative min-h-[500px]">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPreviewTab('preview')}
                className={`text-xs font-medium pb-1 border-b-2 ${previewTab === 'preview' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('script')}
                className={`text-xs font-medium pb-1 border-b-2 ${previewTab === 'script' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Script
              </button>
            </div>
            {previewTab === 'preview' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Chat mode</span>
                <Switch
                  checked={isPreviewChatOpen}
                  onCheckedChange={(c) => setIsPreviewChatOpen(c === true)}
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-muted dark:data-[state=unchecked]:bg-gray-700 scale-75 origin-right"
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex-1 relative flex flex-col">
            {previewTab === 'preview' ? (
              <WidgetLivePreview inbox={inbox} isChatOpen={isPreviewChatOpen} />
            ) : (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Paste this before the closing &lt;/body&gt; tag of any page.</p>
                <div className="relative rounded-lg bg-gray-50 dark:bg-black/50 p-3 ring-1 ring-gray-200 dark:ring-white/10">
                  <code className="block text-[10px] text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-all">{embedSnippet}</code>
                  <Button type="button" variant="ghost" onClick={copySnippet} className="absolute top-2 right-2 h-auto w-auto min-h-0 rounded bg-white dark:bg-white/10 p-1 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white ring-1 ring-gray-200 dark:ring-0 shadow-none hover:bg-white dark:hover:bg-white" title="Copy">
                    {copied ? <Check className="size-3 text-green-500 dark:text-green-400" /> : <Copy className="size-3" />}
                  </Button>
                </div>
                <form action="https://codepen.io/pen/define" method="POST" target="_blank" className="w-fit">
                  <input type="hidden" name="data" value={codepenData} />
                  <Button type="submit" className="gap-1.5 h-7 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-900 dark:text-white border-0 shadow-sm dark:shadow-none">
                    <Codepen className="size-3" />
                    Open in CodePen
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxDetail;
