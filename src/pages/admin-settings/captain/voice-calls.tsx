import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Phone, ArrowLeft, Clock, ChevronRight, Play, Pause, X,
  Headphones, FileText, PhoneCall, User, Bot, Plus, Trash2,
  Inbox,
} from 'lucide-react';
import { getAIReceptionistList, getSessionList, getSessionChat, allNumbersList } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';



// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });
};

const fmtDur = (secs: number): string => {
  if (!secs) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
};

const totalDur = (calls: any[]): string => {
  const total = calls.reduce((s, c) => s + (Number(c.duration_seconds) || 0), 0);
  return fmtDur(total);
};

// ── Audio Player ──────────────────────────────────────────────────────────────

const AudioPlayer = ({ url }: { url: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = Number(e.target.value);
    audioRef.current.currentTime = val;
    setProgress(val);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/90 px-4 py-3 shadow-sm">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onDurationChange={() => audioRef.current && setDuration(audioRef.current.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer shadow-md shadow-primary/20"
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 100}
        value={progress}
        onChange={seek}
        className="h-1 flex-1 accent-primary cursor-pointer"
      />
      <span className="text-xs text-muted-foreground tabular-nums font-mono">
        {fmtDur(Math.floor(progress))} / {fmtDur(Math.floor(duration))}
      </span>
    </div>
  );
};

// ── Right Side Panel (Transcript & Recording Drawer) ──────────────────────────

const RightPanel = ({ call, onClose }: { call: any; onClose: () => void }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vc-chat', call?.id],
    queryFn: async () => {
      try {
        const res = await captainFetch(`${CAPTAIN_API_BASE}/voice/calls/${call?.id}`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.transcript) return json.data;
        }
      } catch (_) {}
      const fallback = await getSessionChat({ agentId: call?.agent_id || call?.receptionist_id, sessionId: call?.id });
      return fallback?.data?.data;
    },
    enabled: !!call?.id && (!call?.transcript || call.transcript.length === 0),
  });
  const transcript: { role: string; text: string }[] =
    (Array.isArray(call?.transcript) && call.transcript.length > 0 ? call.transcript : null) ||
    data?.transcript ||
    data?.messages ||
    [];

  return (
    <div className="absolute right-0 top-0 bottom-0 z-50 flex h-full w-[400px] max-w-[95vw] flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Call Transcript</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Call meta */}
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{call?.from_number || 'Unknown'}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium text-foreground">{call?.to_number || 'Unknown'}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
          <span>{fmt(call?.started_at || call?.created_at)}</span>
          {call?.duration_seconds > 0 && (
            <>
              <span>•</span>
              <span className="tabular-nums">{fmtDur(call.duration_seconds)}</span>
            </>
          )}
        </div>

        {/* Audio Recording Player if available */}
        {call?.recording_url && (
          <div className="mt-3">
            <AudioPlayer url={call.recording_url} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading transcript...</div>
        ) : transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No transcript available</p>
            <p className="text-xs text-muted-foreground">Transcript will appear here once the call completes.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {transcript.map((entry, i) => (
              <div key={i} className={`flex items-start gap-2.5 ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                    entry.role === 'assistant'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted-foreground text-background'
                  }`}
                >
                  {entry.role === 'assistant' ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
                </div>
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    entry.role === 'assistant'
                      ? 'rounded-tl-sm bg-muted text-foreground border border-border'
                      : 'rounded-tr-sm bg-primary text-foreground'
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Call History Page ─────────────────────────────────────────────────────────

const CallHistoryPage = ({ inboxId }: { inboxId: string }) => {
  const navigate = useNavigate();
  const [panelCall, setPanelCall] = useState<any | null>(null);

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['vc-history', inboxId],
    queryFn: async () => {
      try {
        const res = await captainFetch(`${CAPTAIN_API_BASE}/voice/channels/${inboxId}/calls`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            return json.data;
          }
        }
      } catch (_) {}
      const fallback = await getSessionList({ agentId: inboxId, channel: 'voice', limit: 100 });
      return fallback?.data?.data?.sessions || fallback?.data?.data?.calls || fallback?.data?.calls || [];
    },
    enabled: !!inboxId,
    select: (raw: any[]) => {
      return (raw || []).map((c: any) => ({
        id: String(c.id || c.session_id || c.call_id || ''),
        from_number: c.from_number || c.caller_number || c.caller || '—',
        to_number: c.to_number || c.did_number || c.called || '—',
        duration_seconds: Math.round(Number(c.duration_seconds || c.duration || (c.durationMs ? c.durationMs / 1000 : 0))),
        outcome: c.outcome || c.status || '',
        started_at: c.started_at || c.created_at || c.createdAt || '',
        recording_url: c.recording_url || null,
        transcript: Array.isArray(c.transcript) ? c.transcript : (c.messages || null),
        agent_id: inboxId,
        receptionist_id: inboxId,
      }));
    },
  });

  const outcomeBadge = (outcome: string) => {
    const o = String(outcome || '').toLowerCase();
    if (o === 'transferred' || o === 'human_handled' || o === 'handoff')
      return { label: 'Human Handled', color: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30' };
    if (o === 'resolved')
      return { label: 'Resolved', color: 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30' };
    if (o === 'missed')
      return { label: 'Missed', color: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30' };
    return { label: outcome || 'Completed', color: 'text-muted-foreground border-border bg-muted' };
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate('/admin-settings/captain/voice-calls')}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <Phone className="size-4 text-primary" />
            Call History
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <PhoneCall className="size-3.5" />
            {calls.length} calls
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {totalDur(calls)} total
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Call list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading calls...</div>
          ) : calls.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <PhoneCall className="size-10 text-gray-700 dark:text-foreground" />
              <p className="text-sm text-muted-foreground">No calls yet</p>
              <p className="text-xs text-muted-foreground">Calls will appear here once Captain AI handles them.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {/* Column Headers */}
              <div className="grid grid-cols-[40px_minmax(280px,1fr)_120px_160px_130px] items-center gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                <div />
                <div>Caller & Destination</div>
                <div>Duration</div>
                <div>Outcome</div>
                <div className="text-right pr-2">Actions</div>
              </div>

              {/* Call Rows */}
              {calls.map((call) => {
                const badge = outcomeBadge(call.outcome);
                const isOpen = panelCall?.id === call.id;

                return (
                  <div
                    key={call.id}
                    className={`grid grid-cols-[40px_minmax(280px,1fr)_120px_160px_130px] items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
                      isOpen ? 'bg-muted/60' : 'hover:bg-muted/40'
                    }`}
                  >
                    {/* Col 1: Phone icon */}
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40 text-primary">
                      <Phone className="size-4" />
                    </div>

                    {/* Col 2: From → To + date */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                        <span className="text-muted-foreground text-xs">from</span>
                        <span className="font-medium text-foreground">{call.from_number}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-muted-foreground text-xs">to</span>
                        <span className="font-medium text-foreground">{call.to_number}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{fmt(call.started_at)}</div>
                    </div>

                    {/* Col 3: Duration */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                      <Clock className="size-3.5 text-muted-foreground shrink-0" />
                      <span>{call.duration_seconds > 0 ? fmtDur(call.duration_seconds) : '—'}</span>
                    </div>

                    {/* Col 4: Outcome badge */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                        <Headphones className="size-3" />
                        {badge.label}
                      </span>
                    </div>

                    {/* Col 5: Single unified Action button */}
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setPanelCall(isOpen ? null : call)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          isOpen
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-muted/80 text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                      >
                        <FileText className="size-3" />
                        Transcript
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel overlay drawer */}
        {panelCall && (
          <>
            <div
              className="absolute inset-0 z-40 bg-black/25 backdrop-blur-[0.5px] transition-opacity cursor-pointer"
              onClick={() => setPanelCall(null)}
            />
            <RightPanel
              call={panelCall}
              onClose={() => setPanelCall(null)}
            />
          </>
        )}
      </div>
    </div>
  );
};



// ── Connect Phone Number Modal ────────────────────────────────────────────────

const ConnectPhoneModal = ({
  open,
  onClose,
  assistants,
  availableNumbers,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  assistants: any[];
  availableNumbers: any[];
  onSuccess: () => void;
}) => {
  const [selectedNumber, setSelectedNumber] = useState('');
  const [customNumber, setCustomNumber] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [label, setLabel] = useState('');
  const [transferNumber, setTransferNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeNumber = selectedNumber === 'custom' ? customNumber.trim() : (selectedNumber || availableNumbers[0]?.did_number || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNumber) {
      setError('Please select or enter a phone number.');
      return;
    }
    const targetAssistant = assistantId || assistants[0]?.id;
    if (!targetAssistant) {
      setError('Please choose a Captain Assistant.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/voice/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: activeNumber,
          assistant_id: targetAssistant,
          label: label.trim() || `Voice (${activeNumber})`,
          transfer_number: transferNumber.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.detail || json?.message || 'Failed to connect phone number');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error connecting phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 text-foreground">
        <DialogTitle className="text-base font-semibold text-foreground">Connect Phone Number to Captain AI</DialogTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Incoming calls to this phone number will be answered by your chosen Captain Assistant with full access to Knowledge Base FAQs and enabled actions.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Phone Number selection */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Select Phone Number</Label>
            {availableNumbers.length > 0 ? (
              <select
                value={selectedNumber}
                onChange={(e) => setSelectedNumber(e.target.value)}
                className="min-h-10 rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {availableNumbers.map((num: any) => (
                  <option key={num.uuid || num.did_number} value={num.did_number}>
                    {num.did_number} {num.friendly_name ? `(${num.friendly_name})` : ''}
                  </option>
                ))}
                <option value="custom">+ Enter another phone number...</option>
              </select>
            ) : null}

            {(availableNumbers.length === 0 || selectedNumber === 'custom') && (
              <Input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={customNumber}
                onChange={(e) => setCustomNumber(e.target.value)}
                className="mt-1 min-h-10 rounded-xl border-border bg-muted text-sm text-foreground"
              />
            )}
            <p className="text-[11px] text-muted-foreground">The phone number (DID) that customers will dial.</p>
          </div>

          {/* Line Label */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Phone Line Name (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g. Main Support Line, Sales Hotline"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="min-h-10 rounded-xl border-border bg-muted text-sm text-foreground"
            />
          </div>

          {/* Assign Captain Assistant */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Assign Captain Assistant</Label>
            <select
              value={assistantId || (assistants[0]?.id || '')}
              onChange={(e) => setAssistantId(e.target.value)}
              className="min-h-10 rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {assistants.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              The assistant's system prompt, FAQs, and enabled actions will drive the call conversation.
            </p>
          </div>

          {/* Human Transfer destination */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Human Transfer Number / Extension (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g. 101 or +15559990000"
              value={transferNumber}
              onChange={(e) => setTransferNumber(e.target.value)}
              className="min-h-10 rounded-xl border-border bg-muted text-sm text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              When a caller asks to speak with a human, Captain will transfer the call here.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isSubmitting ? 'Connecting...' : 'Connect Phone Line'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ── Inbox List Page ───────────────────────────────────────────────────────────

const InboxListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  // Fetch Captain Assistants
  const { data: assistants = [] } = useQuery({
    queryKey: ['captain-assistants-list'],
    queryFn: async () => {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/assistants`);
      const json = await res.json();
      return json?.data || [];
    },
  });

  // Fetch Voice Channels from Captain
  const { data: captainVoiceChannels = [], refetch: refetchChannels } = useQuery({
    queryKey: ['captain-voice-channels'],
    queryFn: async () => {
      try {
        const res = await captainFetch(`${CAPTAIN_API_BASE}/voice/channels`);
        const json = await res.json();
        return json?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Account Numbers from PBX
  const { data: availableNumbers = [] } = useQuery({
    queryKey: ['account-all-numbers'],
    queryFn: () => allNumbersList({ limit: 100 }),
    select: (res: any) => {
      const raw = res?.data?.data?.result?.rows || res?.data?.result?.rows || res?.data?.data?.rows || [];
      return Array.isArray(raw) ? raw : [];
    },
  });

  // Fetch AI Receptionists as fallback / PBX call count source
  const { data: pbxReceptionists = [], isLoading: isLoadingReceptionists } = useQuery({
    queryKey: ['vc-inboxes'],
    queryFn: () => getAIReceptionistList({ page: 1, limit: 100 }),
    select: (res: any) => {
      const raw = res?.data?.data?.result || res?.data?.result || res?.data?.data || [];
      return (Array.isArray(raw) ? raw : []).map((r: any) => ({
        id: String(r.agent_uuid || r.id || r._id || ''),
        name: r.agentName || r.name || r.agent_name || 'AI Receptionist',
        phone: r.callerId || r.caller_id || r.did_number || r.phone || '',
        assistant: r.assistantName || r.assistant_name || r.assistant || '',
        call_count: Number(r.callCount || r.call_count || r.calls || 0),
      }));
    },
  });

  // Unified voice items list: Map Captain Voice Channels and PBX receptionists
  const unifiedItems = (() => {
    const list: any[] = [];
    const seenPhones = new Set<string>();

    // 1. Add explicitly mapped Captain Voice Channels
    captainVoiceChannels.forEach((ch: any) => {
      const phoneNorm = (ch.phone_number || '').replace(/\D/g, '');
      if (phoneNorm) seenPhones.add(phoneNorm);
      const matchedPbx = pbxReceptionists.find((p: any) => (p.phone || '').replace(/\D/g, '') === phoneNorm);

      list.push({
        id: String(matchedPbx?.id || ch.id),
        channel_id: ch.id,
        phone: ch.phone_number,
        name: ch.label || `Voice (${ch.phone_number})`,
        assistant: ch.assistant_name || 'Captain Assistant',
        assistant_id: ch.assistant_id,
        call_count: matchedPbx?.call_count || 0,
        is_captain_channel: true,
      });
    });

    // 2. Add remaining PBX Receptionists
    pbxReceptionists.forEach((r: any) => {
      const phoneNorm = (r.phone || '').replace(/\D/g, '');
      if (phoneNorm && seenPhones.has(phoneNorm)) return;

      list.push({
        id: r.id,
        channel_id: null,
        phone: r.phone,
        name: r.phone ? `Voice (${r.phone})` : r.name,
        assistant: r.assistant || 'Unassigned Assistant',
        assistant_id: null,
        call_count: r.call_count,
        is_captain_channel: false,
      });
    });

    return list;
  })();

  const handleDeleteChannel = async (channelId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Disconnect this phone line from Captain AI?')) return;
    try {
      await captainFetch(`${CAPTAIN_API_BASE}/voice/channels/${channelId}`, { method: 'DELETE' });
      refetchChannels();
      queryClient.invalidateQueries({ queryKey: ['captain-voice-channels'] });
    } catch {
      // non-critical
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Phone className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">AI Voice Calls</h1>
            <p className="text-xs text-muted-foreground">Voice inboxes handled by Captain AI</p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setIsConnectOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
        >
          <Plus className="size-4" />
          Connect Phone Number
        </Button>
      </div>

      {/* Voice channels list / cards */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoadingReceptionists && unifiedItems.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading voice lines...</div>
        ) : unifiedItems.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Phone className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No phone numbers connected yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Connect a phone number to Captain AI so inbound callers can speak directly with your AI Assistant.
            </p>
            <Button
              type="button"
              onClick={() => setIsConnectOpen(true)}
              className="mt-2 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Connect Phone Number
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {unifiedItems.map((item) => (
              <div
                key={item.id || item.phone}
                onClick={() => navigate(`/admin-settings/captain/voice-calls/${item.id}`)}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card hover:border-border hover:bg-muted p-4.5 w-84 transition-all cursor-pointer shadow-sm"
              >
                {/* Top: Icon, Name, Subtitle, Chevron */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-primary border border-blue-500/20">
                        <Phone className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {item.phone ? `Voice (${item.phone})` : item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                          {item.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.channel_id ? (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChannel(item.channel_id, e)}
                          title="Disconnect Phone Line"
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 dark:hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-muted-foreground transition shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Bottom: Inbox icon + Assistant, Call count */}
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Inbox className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{item.assistant}</span>
                  </div>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {item.call_count} call{item.call_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Phone Modal */}
      <ConnectPhoneModal
        open={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        assistants={assistants}
        availableNumbers={availableNumbers}
        onSuccess={() => {
          refetchChannels();
          queryClient.invalidateQueries({ queryKey: ['captain-voice-channels'] });
        }}
      />
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────

const VoiceCallsPage = () => {
  const { inboxId } = useParams<{ inboxId?: string }>();
  return inboxId ? <CallHistoryPage inboxId={inboxId} /> : <InboxListPage />;
};

export default VoiceCallsPage;

