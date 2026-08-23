import { getAgentList, getChatAgentList, getSessionList } from '@/services/api';
import AiSessionDetailDrawer from '@/pages/admin-settings/knowledge-base/components/ai-session-detail-drawer';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Download, Loader2, MessageSquare, Phone, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type SessionChannel = 'all' | 'call' | 'chat';
type SelectOption = { label: string; value: string };
type SessionIntent = { label: string; summary: string };
type SentimentKey = 'positive' | 'neutral' | 'negative';

const dateRangeOptions: SelectOption[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'All time', value: 'all' },
];

const allAgentsOption: SelectOption = { label: 'All agents', value: '' };
const allOutcomesOption: SelectOption = { label: 'All outcomes', value: '' };
const sessionPageSize = 10;
const sentimentScoreRows: Array<{
  key: SentimentKey;
  label: string;
  colorClass: string;
}> = [
  { key: 'positive', label: 'Positive', colorClass: 'bg-emerald-500' },
  { key: 'neutral', label: 'Neutral', colorClass: 'bg-amber-400' },
  { key: 'negative', label: 'Negative', colorClass: 'bg-rose-500' },
];

const safeNumber = (value: any) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toDate = (value: any) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDuration = (durationMs: any) => {
  const totalSeconds = Math.max(0, Math.floor(safeNumber(durationMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatCost = (value: any) => `$${safeNumber(value).toFixed(2)}`;

const hasSessionCost = (session: any) =>
  session?.totalCostUSD !== null && session?.totalCostUSD !== undefined;

const getCostBasis = (session: any) =>
  String(session?.costBasis || session?.cost?.basis || '').trim();

const formatTime = (value: any) => {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatStarted = (value: any) => {
  const date = toDate(value);
  if (!date) return '-';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDate = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (sameDate(date, today)) return `Today · ${formatTime(date)}`;
  if (sameDate(date, yesterday)) return `Yesterday · ${formatTime(date)}`;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatFullDateTime = (value: any) => {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (value: any) => {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'AI';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getSessionIntents = (data: any): SessionIntent[] => {
  const seen = new Set<string>();
  return (Array.isArray(data?.intents) ? data.intents : [])
    .map((item: any) => ({
      label: String(item?.intent_label || '').trim(),
      summary: String(item?.intent_summary || '').trim(),
    }))
    .filter((item: any) => {
      const normalized = item.label.toLowerCase();
      if (!item.label || normalized === 'other' || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
};

const getSentimentLabel = (session: any) => {
  const label = String(session?.sentiment || '')
    .trim()
    .toLowerCase();
  if (!label) return 'Not analyzed';
  return label;
};

const getSentimentScore = (session: any) => {
  const scores = session?.sentiment_scores || {};
  const sentiment = getSentimentLabel(session);
  const score = safeNumber(scores?.[sentiment]);
  return score > 0 ? Math.round(score) : 0;
};

const getSentimentScores = (session: any) => {
  const scores = session?.sentiment_scores || {};
  return sentimentScoreRows.map((row) => ({
    ...row,
    score: Math.max(0, Math.min(100, Math.round(safeNumber(scores?.[row.key])))),
  }));
};

const getSentimentEmoji = (session: any) => {
  const sentiment = getSentimentLabel(session);
  if (sentiment === 'positive') return '😊';
  if (sentiment === 'negative') return '😞';
  if (sentiment === 'neutral') return '😐';
  return '–';
};

const getOutcome = (session: any) => {
  if (session?.status === 'active') return 'Active';
  if (session?.handoff) return 'Handoff';
  if (session?.scheduledCallback) return 'Callback';
  return 'Resolved';
};

const getOutcomeClass = (outcome: string) => {
  if (outcome === 'Resolved') return 'bg-emerald-100 text-emerald-700';
  if (outcome === 'Handoff') return 'bg-amber-100 text-amber-800';
  if (outcome === 'Callback') return 'bg-blue-100 text-blue-700';
  if (outcome === 'Active') return 'bg-slate-100 text-slate-700';
  return 'bg-rose-100 text-rose-700';
};

const getContactTitle = (session: any) => {
  const collectedData = session?.collectedData || {};
  const name = String(
    collectedData?.name?.value ||
      collectedData?.first_name?.value ||
      collectedData?.full_name?.value ||
      '',
  ).trim();

  if (name) return name;
  return session?.channel === 'call' ? 'Inbound caller' : 'visitor · web widget';
};

const getContactSubText = (session: any) => {
  const collectedData = session?.collectedData || {};
  const callerId = String(session?.callerId || session?.caller_id || '').trim();
  const phone = String(
    collectedData?.phone?.value || collectedData?.phone_number?.value || '',
  ).trim();
  const email = String(collectedData?.email?.value || '').trim();

  if (session?.channel === 'call' && callerId) return callerId;
  if (phone && email) return `${phone} · ${email}`;
  if (phone) return phone;
  if (email) return email;
  return session?.sessionId ? `sess_${String(session.sessionId).slice(0, 6)}` : '-';
};

const getAgentName = (session: any, agentById: Map<string, any>) => {
  const agentId = String(session?.agentId || '').trim();
  const agent = agentById.get(agentId);
  return String(
    agent?.agentName || agent?.name || session?.agentName || session?.agent_name || 'Unnamed agent',
  );
};

const isDeletedAgent = (session: any, agentById: Map<string, any>) => {
  const agentId = String(session?.agentId || '').trim();
  if (!agentId) return false;
  return !agentById.has(agentId);
};

const isInDateRange = (session: any, dateRange: string) => {
  if (dateRange === 'all') return true;
  const startedAt = toDate(session?.startedAt || session?.createdAt);
  if (!startedAt) return false;

  const now = new Date();
  if (dateRange === 'today') {
    return (
      startedAt.getFullYear() === now.getFullYear() &&
      startedAt.getMonth() === now.getMonth() &&
      startedAt.getDate() === now.getDate()
    );
  }

  const days = safeNumber(dateRange);
  if (!days) return true;
  const rangeStart = new Date(now);
  rangeStart.setDate(now.getDate() - (days - 1));
  rangeStart.setHours(0, 0, 0, 0);
  return startedAt >= rangeStart;
};

const downloadTextFile = (fileName: string, text: string) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const ChannelPill = ({
  channel,
  isSessionLabel = false,
}: {
  channel: string;
  isSessionLabel?: boolean;
}) => {
  const isCall = channel === 'call';
  const icon = isCall ? '📞' : '💬';
  const label = isCall
    ? isSessionLabel
      ? 'Voice call'
      : 'Voice'
    : isSessionLabel
      ? 'Chat session'
      : 'Chat';

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-[9px] py-1 text-[11.5px] font-bold ${
        isCall ? 'bg-indigo-50 text-indigo-700' : 'bg-cyan-50 text-cyan-700'
      }`}
    >
      <span className="text-[13px] leading-none">{icon}</span>
      {label}
    </span>
  );
};

const SentimentGraph = ({ session }: { session: any }) => {
  const score = getSentimentScore(session);
  const sentimentScores = getSentimentScores(session);
  const hasScores = sentimentScores.some((item) => item.score > 0);

  return (
    <div className="group relative flex w-fit items-center gap-[7px]">
      <span className="text-sm">{getSentimentEmoji(session)}</span>
      <div className="h-1.5 w-[70px] overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${score}%` }} />
      </div>
      <div className="pointer-events-none absolute right-0 top-6 z-30 hidden w-[190px] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl group-hover:block">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">
          Sentiment scores
        </div>
        {hasScores ? (
          <div className="space-y-2">
            {sentimentScores.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>{item.label}</span>
                  <span>{item.score}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.colorClass}`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-500">Not analyzed</div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string; value: string; icon?: string }) => (
  <div className="rounded-[10px] border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
    <div className="text-[11px] font-medium text-slate-500">{title}</div>
    <div className="mt-1 text-[22px] font-bold leading-tight text-slate-950">{value}</div>
    <div className="mt-0.5 min-h-[14px] text-[11px] leading-none text-emerald-600">
      {icon || '\u00a0'}
    </div>
  </div>
);

const AiBotSession = () => {
  const navigate = useNavigate();
  const [activeChannel, setActiveChannel] = useState<SessionChannel>('all');
  const [selectedAgent, setSelectedAgent] = useState(allAgentsOption);
  const [selectedOutcome, setSelectedOutcome] = useState(allOutcomesOption);
  const [dateRange, setDateRange] = useState('7');
  const [searchText, setSearchText] = useState('');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: receptionistAgentList = [], isLoading: isLoadingReceptionists } = useQuery({
    queryKey: ['getAgentList'],
    queryFn: () => getAgentList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const { data: chatAgentList = [], isLoading: isLoadingChatAgents } = useQuery({
    queryKey: ['getChatAgentList'],
    queryFn: () => getChatAgentList(),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const agentRows = useMemo(() => {
    const chatRows = (chatAgentList || []).map((agent: any) => ({
      ...agent,
      sessionChannel: 'chat',
    }));
    const callRows = (receptionistAgentList || []).map((agent: any) => ({
      ...agent,
      sessionChannel: 'call',
    }));
    return [...chatRows, ...callRows];
  }, [chatAgentList, receptionistAgentList]);

  const agentById = useMemo(() => {
    const map = new Map<string, any>();
    agentRows.forEach((agent: any) => {
      const agentId = String(agent?.agentId || agent?.agent_uuid || '').trim();
      if (agentId) map.set(agentId, agent);
    });
    return map;
  }, [agentRows]);

  const agentOptions = useMemo(() => {
    return [
      allAgentsOption,
      ...agentRows
        .filter((agent: any) => activeChannel === 'all' || agent?.sessionChannel === activeChannel)
        .map((agent: any) => ({
          label: String(agent?.agentName || agent?.name || 'Unnamed agent'),
          value: String(agent?.agentId || agent?.agent_uuid || ''),
        }))
        .filter((agent: any) => agent.value),
    ];
  }, [activeChannel, agentRows]);

  useEffect(() => {
    if (!selectedAgent.value) return;
    const stillVisible = agentOptions.some((option) => option.value === selectedAgent.value);
    if (!stillVisible) setSelectedAgent(allAgentsOption);
  }, [agentOptions, selectedAgent.value]);

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['getSessionList', activeChannel, selectedAgent.value],
    queryFn: () =>
      getSessionList({
        agentId: selectedAgent.value || undefined,
        channel: activeChannel === 'all' ? undefined : activeChannel,
        limit: 200,
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const rangeSessions = useMemo(
    () => (sessions || []).filter((session: any) => isInDateRange(session, dateRange)),
    [dateRange, sessions],
  );

  const tableRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return rangeSessions.filter((session: any) => {
      const outcome = getOutcome(session);
      if (selectedOutcome.value && outcome !== selectedOutcome.value) return false;

      if (!normalizedSearch) return true;

      const agentName = getAgentName(session, agentById);
      const intents = getSessionIntents(session)
        .map((item) => item.label)
        .join(' ');
      const haystack = [
        agentName,
        getContactTitle(session),
        getContactSubText(session),
        session?.sessionId,
        session?.room,
        session?.summary,
        intents,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [agentById, rangeSessions, searchText, selectedOutcome.value]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / sessionPageSize));
  const pageStart = tableRows.length ? (currentPage - 1) * sessionPageSize + 1 : 0;
  const pageEnd = Math.min(tableRows.length, currentPage * sessionPageSize);

  const pagedTableRows = useMemo(() => {
    const start = (currentPage - 1) * sessionPageSize;
    return tableRows.slice(start, start + sessionPageSize);
  }, [currentPage, tableRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeChannel, dateRange, searchText, selectedAgent.value, selectedOutcome.value]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const stats = useMemo(() => {
    const totalSessions = rangeSessions.length;
    const voiceCalls = rangeSessions.filter((session: any) => session?.channel === 'call').length;
    const chatSessions = rangeSessions.filter((session: any) => session?.channel === 'chat').length;
    const totalDuration = rangeSessions.reduce(
      (total: number, session: any) => total + safeNumber(session?.durationMs),
      0,
    );
    const resolved = rangeSessions.filter(
      (session: any) => getOutcome(session) === 'Resolved',
    ).length;
    const handoffs = rangeSessions.filter(
      (session: any) => getOutcome(session) === 'Handoff',
    ).length;
    const totalCost = rangeSessions.reduce(
      (total: number, session: any) => total + safeNumber(session?.totalCostUSD),
      0,
    );

    return {
      totalSessions,
      voiceCalls,
      chatSessions,
      avgDuration: totalSessions ? formatDuration(totalDuration / totalSessions) : '0:00',
      resolutionRate: totalSessions ? `${Math.round((resolved / totalSessions) * 100)}%` : '0%',
      handoffs,
      totalCost: formatCost(totalCost),
    };
  }, [rangeSessions]);

  const outcomeOptions = useMemo<SelectOption[]>(() => {
    const options = Array.from(
      new Set<string>(rangeSessions.map((session: any) => getOutcome(session))),
    ).map((outcome) => ({
      label: outcome,
      value: outcome,
    }));
    return [allOutcomesOption, ...options];
  }, [rangeSessions]);

  const exportCsv = () => {
    const header = [
      'Channel',
      'Agent',
      'Contact',
      'Started',
      'Duration',
      'Cost',
      'Outcome',
      'Sentiment',
    ];
    const csvRows = tableRows.map((session: any) =>
      [
        session?.channel === 'call' ? 'Voice' : 'Chat',
        getAgentName(session, agentById),
        `${getContactTitle(session)} ${getContactSubText(session)}`,
        formatFullDateTime(session?.startedAt || session?.createdAt),
        formatDuration(session?.durationMs),
        formatCost(session?.totalCostUSD),
        getOutcome(session),
        getSentimentLabel(session),
      ]
        .map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
        .join(','),
    );
    downloadTextFile('ai-sessions.csv', [header.join(','), ...csvRows].join('\n'));
  };

  return (
    <section className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-7 py-[18px]">
        <div className="text-base font-semibold text-slate-950">
          <button
            type="button"
            onClick={() => navigate('/admin-settings/knowledge/ai-agent')}
            className="font-medium text-slate-500 transition-colors hover:text-primary"
          >
            AI Agents
          </button>
          <span className="mx-2 text-slate-400">/</span>
          Sessions
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="h-[34px] min-w-[140px] appearance-none rounded-[7px] border border-slate-200 bg-white px-3 pr-9 text-xs font-semibold text-slate-950 outline-none"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[7px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-slate-400"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div>
          <h1 className="text-[19px] font-extrabold leading-tight text-slate-950">Sessions</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Every AI receptionist call & AI chatbot conversation — with transcripts, sentiment &
            outcomes.
          </p>
        </div>

        <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <StatCard title="Total sessions" value={String(stats.totalSessions)} />
          <StatCard title="Voice calls" value={String(stats.voiceCalls)} />
          <StatCard title="Chat sessions" value={String(stats.chatSessions)} />
          <StatCard title="Avg duration" value={stats.avgDuration} />
          <StatCard title="Resolution rate" value={stats.resolutionRate} />
          <StatCard title="Escalations / handoffs" value={String(stats.handoffs)} />
          <StatCard title="Total cost" value={stats.totalCost} />
        </div>

        <div className="mb-3.5 flex flex-nowrap items-center gap-2.5 max-xl:flex-wrap">
          <div className="relative min-w-[220px] flex-[1_1_220px]">
            <Search className="absolute left-[13px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by contact, agent, intent or transcript..."
              className="h-[38px] w-full rounded-[10px] border border-slate-200 bg-white pl-[38px] pr-3 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </div>
          {(['all', 'call', 'chat'] as SessionChannel[]).map((channel) => {
            const isActive = activeChannel === channel;
            const Icon = channel === 'call' ? Phone : channel === 'chat' ? MessageSquare : null;
            return (
              <button
                key={channel}
                type="button"
                onClick={() => setActiveChannel(channel)}
                className={`inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {channel === 'all' ? 'All' : channel === 'call' ? 'Voice' : 'Chat'}
              </button>
            );
          })}
          <div className="relative min-w-[190px]">
            <select
              value={selectedAgent.value}
              onChange={(event) => {
                const option = agentOptions.find((item) => item.value === event.target.value);
                setSelectedAgent(option || allAgentsOption);
              }}
              className="h-[38px] w-full appearance-none rounded-[10px] border border-slate-200 bg-white px-3 pr-8 text-[13.5px] text-slate-900 outline-none"
            >
              {agentOptions.map((option) => (
                <option key={option.value || 'all-agents'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          </div>
          <div className="relative min-w-[170px]">
            <select
              value={selectedOutcome.value}
              onChange={(event) => {
                const option = outcomeOptions.find((item) => item.value === event.target.value);
                setSelectedOutcome(option || allOutcomesOption);
              }}
              className="h-[38px] w-full appearance-none rounded-[10px] border border-slate-200 bg-white px-3 pr-8 text-[13.5px] text-slate-900 outline-none"
            >
              {outcomeOptions.map((option) => (
                <option key={option.value || 'all-outcomes'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid w-full min-w-0 grid-cols-[82px_1.3fr_1.4fr_0.95fr_0.7fr_0.72fr_0.95fr_1fr_96px] items-center gap-3 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-[18px] py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">
            <div>Channel</div>
            <div>Agent</div>
            <div>Contact</div>
            <div>Started</div>
            <div>Duration</div>
            <div>Cost</div>
            <div>Outcome</div>
            <div>Sentiment</div>
            <div className="text-right">Actions</div>
          </div>

          {isLoadingSessions || isLoadingReceptionists || isLoadingChatAgents ? (
            <div className="flex min-h-[260px] items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading sessions...
            </div>
          ) : tableRows.length ? (
            pagedTableRows.map((session: any) => {
              const agentName = getAgentName(session, agentById);
              const outcome = getOutcome(session);
              const deletedAgent = isDeletedAgent(session, agentById);

              return (
                <div
                  key={session?.sessionId}
                  className="grid w-full min-w-0 cursor-pointer grid-cols-[82px_1.3fr_1.4fr_0.95fr_0.7fr_0.72fr_0.95fr_1fr_96px] items-center gap-3 border-b border-slate-100 px-[18px] py-3 last:border-b-0 hover:bg-slate-50"
                  onClick={() => setSelectedSession(session)}
                >
                  <div>
                    <ChannelPill channel={session?.channel} />
                  </div>
                  <div className="flex min-w-0 items-center gap-[9px]">
                    <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {getInitials(agentName)}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate text-[13px] font-bold text-slate-950"
                        title={agentName}
                      >
                        {agentName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {deletedAgent ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                            Deleted
                          </span>
                        ) : session?.channel === 'call' ? (
                          'Receptionist'
                        ) : (
                          'Chat agent'
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-800">
                      {getContactTitle(session)}
                    </div>
                    <div className="truncate font-mono text-[11px] text-slate-500">
                      {getContactSubText(session)}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-[12.5px] text-slate-700">
                    {formatStarted(session?.startedAt || session?.createdAt)}
                  </div>
                  <div className="whitespace-nowrap text-[12.5px] text-slate-700">
                    {formatDuration(session?.durationMs)}
                  </div>
                  <div
                    className="whitespace-nowrap text-[12.5px] font-bold text-slate-900"
                    title={getCostBasis(session)}
                  >
                    {hasSessionCost(session) ? formatCost(session?.totalCostUSD) : '-'}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-[9px] px-[9px] py-[3px] text-[11px] font-bold ${getOutcomeClass(outcome)}`}
                    >
                      {outcome}
                    </span>
                  </div>
                  <SentimentGraph session={session} />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSession(session)}
                      className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      aria-label="Open session"
                    >
                      <MessageSquare className="h-[15px] w-[15px]" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex min-h-[260px] items-center justify-center text-slate-500">
              No sessions found.
            </div>
          )}
          {!isLoadingSessions &&
          !isLoadingReceptionists &&
          !isLoadingChatAgents &&
          tableRows.length ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-[18px] py-3 text-xs text-slate-500">
              <div>
                Showing {pageStart}-{pageEnd} of {tableRows.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectedSession ? (
        <AiSessionDetailDrawer
          session={selectedSession}
          agentById={agentById}
          onClose={() => setSelectedSession(null)}
        />
      ) : null}
    </section>
  );
};

export default AiBotSession;
