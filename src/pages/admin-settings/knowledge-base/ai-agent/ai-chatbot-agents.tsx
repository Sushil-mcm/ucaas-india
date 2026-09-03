import AlertConfirm from '@/components/custom/alert-confirm';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import TableManager from '@/components/custom/table-manager';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCompanyFeatures } from '@/hooks/rbac';
import { handleAlert } from '@/lib/utils';
import { sanitizeAiAgentUpdateRecord, sanitizeAiSearchText } from '@/lib/ai-input-security';
import {
  deleteAIAgent,
  getAIAgentToken,
  getChatAgentList,
  getChatAgentMetrics,
  updateAIAgent,
  updateAgentStatus,
} from '@/services/api';
import { Icon, IconName } from '@/assets/icons/icon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, ChevronDown, Loader2 } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PromptModal from '../ai-receptionist/update-prompt';
import AgentAnalytics from './agent-analytics';
import ChatAgentConfigureModal from './chat-agent-configure-modal';

const StatCardLoader = () => (
  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/70 backdrop-blur-[1px]">
    <Loader2 className="h-5 w-5 animate-spin text-primary" />
  </div>
);

const getNestedValue = (source: any, path: string) =>
  path.split('.').reduce((value, key) => value?.[key], source);

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;

  const normalized =
    typeof value === 'string' ? value.replace('%', '').replace(/,/g, '').trim() : value;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
};

const pickNumber = (source: any, paths: string[]) => {
  for (const path of paths) {
    const parsed = toNumber(getNestedValue(source, path));
    if (parsed !== null) return parsed;
  }

  return null;
};

const normalizePercent = (value: number | null) => {
  if (value === null) return null;
  if (value > 0 && value <= 1) return Math.round(value * 100);
  return Math.round(value);
};

const formatNumber = (value: number | null) =>
  value === null ? '--' : Math.round(value).toLocaleString();

const formatPercent = (value: number | null) => {
  const normalized = normalizePercent(value);
  return normalized === null ? '--' : `${normalized}%`;
};

const average = (values: Array<number | null>) => {
  const realValues = values.filter((value): value is number => value !== null);
  if (!realValues.length) return null;

  return realValues.reduce((sum, value) => sum + value, 0) / realValues.length;
};

const normalizeSentiment = (value: any) => {
  const sentiment = String(value || '')
    .trim()
    .toLowerCase();
  return ['positive', 'neutral', 'negative'].includes(sentiment) ? sentiment : '';
};

const sentimentBadgeClass = (sentiment: string) => {
  if (sentiment === 'positive') return 'bg-emerald-100 text-emerald-700';
  if (sentiment === 'negative') return 'bg-red-100 text-red-700';
  if (sentiment === 'neutral') return 'bg-slate-100 text-slate-700';
  return 'bg-[#FBE2C8]/40 text-[#9A948F]';
};

const sentimentEmoji = (sentiment: string) => {
  if (sentiment === 'negative') return '☹️';
  if (sentiment === 'neutral') return '😐';
  return '😊';
};

const sentimentScoreRows = [
  { key: 'positive', label: 'Positive', colorClass: 'bg-emerald-500' },
  { key: 'neutral', label: 'Neutral', colorClass: 'bg-amber-400' },
  { key: 'negative', label: 'Negative', colorClass: 'bg-rose-500' },
] as const;

const sentimentScoreValue = (scores: any, key: (typeof sentimentScoreRows)[number]['key']) => {
  const score = Number(scores?.[key] || 0);
  if (!Number.isFinite(score)) return 0;

  return Math.max(0, Math.min(100, score));
};

const sentimentLabelFromScore = (score: number | null) => {
  if (!score) return '';
  if (score >= 75) return 'positive';
  if (score >= 50) return 'neutral';
  return 'negative';
};

const metricPaths = {
  conversations: [
    'analytics.conversations_7d',
    'analytics.conversations7d',
    'metrics.conversations_7d',
    'metrics.conversations7d',
    'conversations_7d',
    'conversations7d',
    'conversation_count_7d',
    'conversationCount7d',
    'conversation_count',
    'conversationCount',
    'total_conversations',
    'totalConversations',
    'stats.conversations',
    'counts.sessions',
    'conversations',
  ],
  resolution: [
    'analytics.resolution_rate',
    'analytics.resolutionRate',
    'metrics.resolution_rate',
    'metrics.resolutionRate',
    'resolution_rate',
    'resolutionRate',
    'resolved_rate',
    'resolvedRate',
    'resolution',
  ],
  confidence: [
    'analytics.avg_confidence',
    'analytics.avgConfidence',
    'metrics.avg_confidence',
    'metrics.avgConfidence',
    'stats.avg_confidence',
    'stats.avgConfidence',
    'stats.confidence',
    'avg_confidence',
    'avgConfidence',
    'confidence',
  ],
};

const getAgentId = (agent: any) =>
  String(agent?.agent_uuid || agent?.agentId || agent?.id || agent?.uuid || agent?._id || '');

const getMetricsByAgentId = (rows: any[] = []) => {
  const metricsByAgentId = new Map<string, any>();
  rows.forEach((row) => {
    const agentId = getAgentId(row);
    if (agentId) metricsByAgentId.set(agentId, row);
  });
  return metricsByAgentId;
};

const mergeAgentMetrics = (agent: any, metricsByAgentId: Map<string, any>) => {
  const row = { ...agent };
  delete row.analytics;
  delete row.metrics;
  delete row.stats;
  delete row.conversations_7d;
  delete row.conversations7d;
  delete row.conversation_count_7d;
  delete row.conversationCount7d;
  delete row.conversation_count;
  delete row.conversationCount;
  delete row.total_conversations;
  delete row.totalConversations;
  delete row.conversations;
  delete row.resolution_rate;
  delete row.resolutionRate;
  delete row.resolved_rate;
  delete row.resolvedRate;
  delete row.resolution;
  delete row.avg_confidence;
  delete row.avgConfidence;
  delete row.confidence;
  delete row.handoffs;
  delete row.sentiment_calls;
  delete row.avg_sentiment;
  delete row.sentiment_counts;
  delete row.sentiment_label;
  return {
    ...row,
    ...(metricsByAgentId.get(getAgentId(agent)) || {}),
  };
};

const isDeletedAgent = (agent: any) => Boolean(agent?.deletedAt || agent?.deleted_at);

const isLiveAgent = (agent: any) => {
  if (isDeletedAgent(agent)) return false;

  const status = String(agent?.status || agent?.agentStatus || '').toLowerCase();
  return status === 'active' || status === 'live';
};
const isDraftAgent = (agent: any) => Boolean(agent?.forward_call_actions?.chatbot_builder?.draft);

const getAgentName = (agent: any) => agent?.agentName || agent?.name || 'Untitled agent';

const getAgentSubtitle = (agent: any) => {
  const values = [
    agent?.companyName || agent?.company_name,
    agent?.department || agent?.category || agent?.agentType || agent?.type,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return values.length ? values.join(' · ') : 'AI Chatbot Agent';
};

const getAgentAvatarImage = (agent: any) =>
  String(agent?.avatar || agent?.profile || agent?.image || agent?.agentAvatar || '').trim();

const getLastUpdated = (agent: any) => {
  const date = agent?.updatedAt || agent?.updated_at || agent?.createdAt || agent?.created_at;
  if (!date) return '--';

  const updatedAt = moment.utc(date).local();
  if (!updatedAt.isValid()) return '--';

  const seconds = Math.max(0, moment().diff(updatedAt, 'seconds'));
  if (seconds < 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
};

const CHAT_AGENT_DATE_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: '7d', value: '7_days' },
  { label: '30 days', value: '30_days' },
] as const;

type ChatAgentDateFilter = (typeof CHAT_AGENT_DATE_FILTERS)[number]['value'];

const getChatAgentDateFilters = (dateFilter: ChatAgentDateFilter) => {
  const today = moment().format('YYYY-MM-DD');

  if (dateFilter === '7_days') {
    return {
      from: moment().subtract(7, 'days').startOf('day').format('YYYY-MM-DD'),
      to: today,
    };
  }

  if (dateFilter === '30_days') {
    return {
      from: moment().subtract(30, 'days').startOf('day').format('YYYY-MM-DD'),
      to: today,
    };
  }

  return {
    from: today,
    to: today,
  };
};

const getChatAgentMetricDateFilters = (dateFilter: ChatAgentDateFilter) => {
  const filters = getChatAgentDateFilters(dateFilter);
  const rangeStart = new Date(`${filters.from}T00:00:00.000`);
  const rangeEnd = new Date(`${filters.to}T23:59:59.999`);

  return {
    ...filters,
    range_start: rangeStart.toISOString(),
    range_end: rangeEnd.toISOString(),
    analytics_from: rangeStart.toISOString().slice(0, 10),
    analytics_to: rangeEnd.toISOString().slice(0, 10),
  };
};

function AiChatbotAgents() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { features } = useCompanyFeatures();
  const agentAccess = features?.plan_features?.ai?.action?.agent;

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'analytics'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live'>('all');
  const dateFilter: ChatAgentDateFilter = '7_days';
  const [deleteAgent, setDeleteAgent] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);
  const [configureAgent, setConfigureAgent] = useState<any>(null);
  const [configureTokenId, setConfigureTokenId] = useState('');

  useEffect(() => {
    const routeState = (location.state || {}) as any;
    if (!routeState?.configureAgent) return;

    setConfigureAgent(routeState.configureAgent);
    setConfigureTokenId(routeState.configureTokenId || '');
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const selectedDateFilters = useMemo(() => getChatAgentDateFilters(dateFilter), [dateFilter]);
  const selectedMetricDateFilters = useMemo(
    () => getChatAgentMetricDateFilters(dateFilter),
    [dateFilter],
  );
  const selectedDateFilterLabel = useMemo(
    () => CHAT_AGENT_DATE_FILTERS.find((option) => option.value === dateFilter)?.label || 'Today',
    [dateFilter],
  );

  const invalidateChatAgentQueries = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey?.[0] || '').includes('getChatAgent'),
    });
  }, [queryClient]);

  const { data: agentResult, isFetching: isStatsFetching } = useQuery({
    queryKey: ['getChatAgentList', 'stats', selectedDateFilters],
    queryFn: () =>
      getChatAgentList({
        page: 1,
        limit: 1000,
        filters: [],
        search: '',
        date_filters: selectedDateFilters,
      }),
    refetchOnWindowFocus: false,
    retry: false,
    select: (response: any) => response?.data?.data?.result || {},
  });

  const allAgents = useMemo(
    () => (Array.isArray(agentResult?.rows) ? agentResult.rows : []),
    [agentResult?.rows],
  );
  const metricAgentIds = useMemo(() => allAgents.map(getAgentId).filter(Boolean), [allAgents]);
  const { data: agentMetricsResult, isFetching: isMetricsFetching } = useQuery({
    queryKey: ['getChatAgentMetrics', 'stats', selectedMetricDateFilters, metricAgentIds],
    queryFn: () =>
      getChatAgentMetrics({
        agentIds: metricAgentIds,
        date_filters: selectedMetricDateFilters,
      }),
    enabled: metricAgentIds.length > 0,
    refetchOnWindowFocus: false,
    retry: false,
    select: (response: any) => response?.data?.data?.result || {},
  });
  const agentMetricsById = useMemo(
    () => getMetricsByAgentId(agentMetricsResult?.rows || []),
    [agentMetricsResult?.rows],
  );
  const agentsWithMetrics = useMemo(
    () => allAgents.map((agent: any) => mergeAgentMetrics(agent, agentMetricsById)),
    [allAgents, agentMetricsById],
  );

  const totalAgentsCount = useMemo(
    () =>
      pickNumber(agentResult, ['counts.all', 'totalItems', 'total', 'totalRecords', 'count']) ??
      allAgents.length,
    [agentResult, allAgents],
  );

  const liveAgents = useMemo(() => allAgents.filter(isLiveAgent), [allAgents]);
  const liveAgentsCount = useMemo(
    () => pickNumber(agentResult, ['counts.active', 'active', 'activeCount']) ?? liveAgents.length,
    [agentResult, liveAgents.length],
  );

  const tableFilters = useMemo(
    () => (statusFilter === 'live' ? [{ key: 'status', value: 'active' }] : []),
    [statusFilter],
  );

  const selectTableAgents = useCallback(
    (response: any) => {
      const rows = response?.data?.data?.result?.rows || [];
      const rowsWithMetrics = rows.map((agent: any) => mergeAgentMetrics(agent, agentMetricsById));
      return statusFilter === 'live' ? rowsWithMetrics.filter(isLiveAgent) : rowsWithMetrics;
    },
    [agentMetricsById, statusFilter],
  );

  const stats = useMemo(() => {
    const conversations: Array<number | null> = agentsWithMetrics.map((agent: any) =>
      pickNumber(agent, metricPaths.conversations),
    );
    const resolution: Array<number | null> = agentsWithMetrics.map((agent: any) =>
      pickNumber(agent, metricPaths.resolution),
    );
    const confidence: Array<number | null> = agentsWithMetrics.map((agent: any) =>
      pickNumber(agent, metricPaths.confidence),
    );
    const averageResolution =
      pickNumber(agentMetricsResult, ['resolution_rate', 'analytics.resolution_rate']) ??
      average(resolution);
    const averageConfidence =
      pickNumber(agentMetricsResult, [
        'avg_confidence',
        'analytics.avg_confidence',
        'confidence',
      ]) ?? average(confidence);
    const totalConversations =
      pickNumber(agentMetricsResult, [
        'conversations',
        'conversation_count',
        'analytics.conversations',
      ]) ??
      (conversations.some((value) => value !== null)
        ? conversations.reduce<number>((sum, value) => sum + (value ?? 0), 0)
        : null);
    const resultSentimentCalls = pickNumber(agentMetricsResult, ['sentiment_calls']);
    const resultSentimentScore = pickNumber(agentMetricsResult, ['avg_sentiment']);
    const rowSentiment = agentsWithMetrics
      .map((agent: any) => ({
        calls: Number(agent?.sentiment_calls || 0),
        score: Number(agent?.avg_sentiment || 0),
      }))
      .filter((agent: any) => agent.calls > 0 && Number.isFinite(agent.score));
    const rowSentimentCalls = rowSentiment.reduce(
      (sum: number, agent: any) => sum + agent.calls,
      0,
    );
    const sentimentCalls =
      resultSentimentCalls !== null && resultSentimentCalls > 0
        ? resultSentimentCalls
        : rowSentimentCalls;
    const averageSentiment =
      resultSentimentCalls !== null && resultSentimentCalls > 0 && resultSentimentScore !== null
        ? resultSentimentScore
        : rowSentimentCalls
          ? rowSentiment.reduce((sum: number, agent: any) => sum + agent.score * agent.calls, 0) /
            rowSentimentCalls
          : null;
    const sentimentLabel =
      normalizeSentiment(agentMetricsResult?.sentiment_label) ||
      sentimentLabelFromScore(averageSentiment);

    return [
      {
        label: 'Total agents',
        value: totalAgentsCount.toLocaleString(),
        helper:
          totalAgentsCount && totalAgentsCount === liveAgentsCount
            ? 'All live'
            : `${liveAgentsCount.toLocaleString()} live`,
      },
      {
        label: `Conversations (${selectedDateFilterLabel})`,
        value: formatNumber(totalConversations),
        helper: '',
      },
      {
        label: 'Resolution rate',
        value: formatPercent(averageResolution),
        helper: '',
      },
      {
        label: 'Avg confidence',
        value: formatPercent(averageConfidence),
        helper: '',
      },
      {
        label: 'Overall sentiment',
        value:
          sentimentCalls && averageSentiment !== null
            ? `${sentimentEmoji(sentimentLabel)} ${Math.round(averageSentiment)}`
            : 'Not analyzed',
        helper: '',
      },
    ];
  }, [
    agentMetricsResult,
    agentsWithMetrics,
    liveAgentsCount,
    selectedDateFilterLabel,
    totalAgentsCount,
  ]);

  const { mutateAsync: mutateGetToken } = useMutation({
    mutationFn: getAIAgentToken,
    mutationKey: ['getAIAgentToken'],
  });

  const { mutate: mutateDeleteAgent, isPending: isDeletePending } = useMutation({
    mutationKey: ['deleteAIAgent'],
    mutationFn: deleteAIAgent,
    onSuccess: () => {
      setDeleteAgent(null);
      invalidateChatAgentQueries();
      handleAlert({
        text: 'Agent deleted successfully!',
        type: 'success',
      });
    },
  });

  const { mutate: submitAgent } = useMutation({
    mutationFn: updateAIAgent,
    onSuccess: () => {
      invalidateChatAgentQueries();
      handleAlert({
        text: 'AI Agent updated successfully!',
        type: 'success',
      });
    },
    onError: (err: any) => {
      console.error('Failed to update AI Agent:', err);
    },
  });

  const { mutate: updateStatusMutation } = useMutation({
    mutationFn: updateAgentStatus,
    onSuccess: () => {
      invalidateChatAgentQueries();
      handleAlert({
        text: 'AI Agent status updated successfully!',
        type: 'success',
      });
    },
    onError: (err: any) => {
      console.error('Failed to update AI Agent status:', err);
      handleAlert({
        text: 'Failed to update status.',
        type: 'error',
      });
    },
  });

  const handlePlaygroundClick = useCallback(
    (rowData: any) => {
      navigate('/admin-settings/knowledge/playground', {
        state: {
          activeTab: 'chat',
          selectedAgent: rowData,
          openAgentId: getAgentId(rowData),
        },
      });
    },
    [navigate],
  );

  const handleUpdatePrompt = useCallback(
    async (rowOriginal: any, newPrompt: string, onDone: () => void) => {
      setIsUpdatingPrompt(true);
      let token = '';

      try {
        const tokenRes = await mutateGetToken();
        token = tokenRes?.data?.data?.result?.tokenId || '';
      } catch (error) {
        console.error('Failed to fetch token:', error);
      }

      const safeRowOriginal = sanitizeAiAgentUpdateRecord(rowOriginal);
      const payload = {
        ...safeRowOriginal,
        agentId: rowOriginal.agent_uuid || rowOriginal.id,
        token,
        systemPrompt: newPrompt,
      };

      const {
        agent_uuid,
        uuid,
        did_uuid,
        company_uuid,
        created_at,
        useMessageExactly,
        ...updatedData
      } = payload;
      void agent_uuid;
      void uuid;
      void did_uuid;
      void company_uuid;
      void created_at;
      void useMessageExactly;

      submitAgent(updatedData, {
        onSuccess: () => {
          onDone();
          setIsUpdatingPrompt(false);
        },
        onError: () => {
          onDone();
          setIsUpdatingPrompt(false);
        },
      });
    },
    [mutateGetToken, submitAgent],
  );

  const handleStatusUpdate = useCallback(
    async (rowOriginal: any, newStatus: string) => {
      updateStatusMutation({
        agentType: 'chat',
        agentId: rowOriginal.agent_uuid || rowOriginal.id,
        status: newStatus === 'live' ? 'active' : 'inactive',
      });
    },
    [updateStatusMutation],
  );

  const openConfigureAgent = useCallback(
    (agent: any) => {
      navigate('/admin-settings/knowledge/create-agent', {
        state: { rowData: { isEdit: true, useWizard: true, formData: agent } },
      });
    },
    [navigate],
  );

  const openAgentDetails = useCallback(
    (agent: any) => {
      navigate('/admin-settings/knowledge/create-agent', {
        state: {
          rowData: { isEdit: true, readOnly: true, initialTab: 'overview', formData: agent },
        },
      });
    },
    [navigate],
  );

  const openPromptEditor = useCallback((agent: any) => {
    setEditData(agent);
    setPromptModalOpen(true);
  }, []);

  const openWidgetConfigure = useCallback((agent: any) => {
    setConfigureTokenId('');
    setConfigureAgent(agent);
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: 'Agent',
        accessorKey: 'agentName',
        cell: ({ row }: any) => {
          const agent = row?.original;
          const agentName = getAgentName(agent);
          const live = isLiveAgent(agent);

          return (
            <div className="flex w-full min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <CustomAvatar
                  name={agentName}
                  image={getAgentAvatarImage(agent)}
                  size="34"
                  showPresence={false}
                  isActivityInfo={false}
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                    live ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  title={agentName}
                  className="block max-w-full truncate text-left text-[14px] font-extrabold leading-5 text-slate-950 transition-colors hover:text-primary cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    openAgentDetails(agent);
                  }}
                >
                  {agentName}
                </button>
                <div className="mt-0.5 flex min-w-0 items-start gap-1.5 text-[11px] leading-4 text-slate-500">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="line-clamp-2">{getAgentSubtitle(agent)}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: any) => {
          const agent = row?.original;
          const live = isLiveAgent(agent);
          const draft = isDraftAgent(agent);

          if (isDeletedAgent(agent)) {
            return (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                Deleted
              </span>
            );
          }

          const handleStatusChange = (newStatus: string) => {
            const currentStatus = live ? 'live' : 'inactive';
            if (newStatus === currentStatus) return;
            handleStatusUpdate(agent, newStatus);
          };

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex h-7 min-w-[74px] items-center justify-center gap-1.5 rounded-full border px-2.5 text-[12px] font-extrabold cursor-pointer outline-none transition-colors duration-200 ${
                    live
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80'
                      : draft
                        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50/80'
                        : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100/80'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: live ? '#10b981' : draft ? '#f59e0b' : '#94a3b8' }}
                  />
                  <span>{live ? 'Live' : draft ? 'Draft' : 'Paused'}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[140px] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] border border-[rgba(225,200,165,0.9)] shadow-lg rounded-xl p-1 z-50 animate-none"
              >
                <DropdownMenuItem
                  onClick={() => handleStatusChange('live')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium cursor-pointer rounded-lg hover:bg-[#FBE2C8]/45 text-[#2E2D35]"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Live</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('inactive')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium cursor-pointer rounded-lg hover:bg-[#FBE2C8]/45 text-[#2E2D35]"
                >
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Paused</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
      {
        header: () => (
          <span>
            Conversations
            <span className="block">({selectedDateFilterLabel})</span>
          </span>
        ),
        accessorKey: 'conversations',
        cell: ({ row }: any) => (
          <div className="text-[14px] font-extrabold text-slate-950">
            {formatNumber(pickNumber(row?.original, metricPaths.conversations))}
          </div>
        ),
      },
      {
        header: 'Resolution',
        accessorKey: 'resolution',
        cell: ({ row }: any) => (
          <div className="text-[14px] font-extrabold text-slate-950">
            {formatPercent(pickNumber(row?.original, metricPaths.resolution))}
          </div>
        ),
      },
      {
        header: 'Sentiment',
        accessorKey: 'avg_sentiment',
        cell: ({ row }: any) => {
          const data = row.original || {};
          const chats = Number(data.sentiment_calls || 0);
          const rawScore = Number(data.avg_sentiment || 0);
          const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0;
          const displayScore = Math.round(score);
          const label =
            normalizeSentiment(data.sentiment_label) || sentimentLabelFromScore(score) || 'neutral';
          const sentimentScoresData = data.sentiment_scores || {};
          const positivePercent = sentimentScoreValue(sentimentScoresData, 'positive');
          const neutralPercent = sentimentScoreValue(sentimentScoresData, 'neutral');
          const negativePercent = sentimentScoreValue(sentimentScoresData, 'negative');
          const sentimentScores = sentimentScoreRows.map((item) => ({
            ...item,
            score: Math.round(sentimentScoreValue(sentimentScoresData, item.key)),
          }));
          const hasScores = sentimentScores.some((item) => item.score > 0);

          if (!chats || !score) {
            return (
              <span className="inline-flex rounded-full bg-[#FBE2C8]/40 px-2 py-1 text-xs font-semibold text-[#9A948F]">
                Not analyzed
              </span>
            );
          }

          return (
            <div className="group relative flex w-[112px] flex-col gap-1.5">
              <span
                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-extrabold capitalize ${sentimentBadgeClass(label)}`}
              >
                {sentimentEmoji(label)} {label} · {displayScore}
              </span>
              {hasScores ? (
                <div className="relative h-1.5 w-[108px] overflow-hidden rounded-full bg-slate-200">
                  <span
                    className="absolute left-0 top-0 h-full bg-emerald-500"
                    style={{ width: `${positivePercent}%` }}
                  />
                  <span
                    className="absolute top-0 h-full bg-slate-300"
                    style={{ left: `${positivePercent}%`, width: `${neutralPercent}%` }}
                  />
                  <span
                    className="absolute right-0 top-0 h-full bg-red-500"
                    style={{ width: `${negativePercent}%` }}
                  />
                </div>
              ) : (
                <div className="h-1.5 w-[108px] overflow-hidden rounded-full bg-slate-200" />
              )}
              {hasScores && (
                <div className="pointer-events-none absolute right-0 top-10 z-30 hidden w-[190px] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl group-hover:block">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500">
                    Sentiment scores
                  </div>
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
                </div>
              )}
            </div>
          );
        },
      },
      {
        header: 'Last updated',
        accessorKey: 'updatedAt',
        cell: ({ row }: any) => (
          <span className="text-[14px] font-medium text-slate-700">
            {getLastUpdated(row?.original)}
          </span>
        ),
      },
      {
        header: 'Actions',
        accessorKey: 'action',
        cell: ({ row }: any) => {
          const agent = row?.original;
          const deleted = isDeletedAgent(agent);
          const actions = [
            {
              icon: 'Play' as IconName,
              onClick: () => handlePlaygroundClick(agent),
              className: 'bg-green-100 text-green-900/80 hover:bg-green-500 hover:text-white',
              tooltipText: 'Play',
            },
            agentAccess?.edit && {
              icon: 'SettingsIcon' as IconName,
              onClick: () => openWidgetConfigure(agent),
              className: 'bg-primary/5 text-primary hover:bg-primary hover:text-white',
              tooltipText: 'Configure',
            },
            agentAccess?.edit && {
              icon: 'EditStrokIcon' as IconName,
              onClick: () => openConfigureAgent(agent),
              className: 'bg-[#FBE2C8]/40 text-[#2E2D35]/80 hover:bg-primary hover:text-white',
              tooltipText: 'Edit agent',
            },
            agentAccess?.edit && {
              icon: 'Chat' as IconName,
              onClick: () => openPromptEditor(agent),
              className: 'bg-[#FBE2C8]/40 text-[#2E2D35]/80 hover:bg-primary hover:text-white',
              tooltipText: 'Edit prompt',
            },
            agentAccess?.delete &&
              !deleted && {
                icon: 'TrashBin' as IconName,
                onClick: () => setDeleteAgent(agent),
                className: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white',
                tooltipText: 'Delete',
              },
          ].filter(Boolean) as Array<{
            icon: IconName;
            onClick: () => void;
            className: string;
            tooltipText: string;
          }>;

          if (!actions.length) return '---';

          return (
            <div className="flex w-full min-w-[146px] items-center justify-end gap-1">
              {actions.map((action) => (
                <CustomTooltip key={action.tooltipText} text={action.tooltipText} side="top">
                  <button
                    type="button"
                    className={`cursor-pointer flex h-[26px] w-[26px] items-center justify-center rounded-full ${action.className}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      action.onClick();
                    }}
                  >
                    <Icon name={action.icon} className="h-3.5 w-3.5" />
                  </button>
                </CustomTooltip>
              ))}
            </div>
          );
        },
        meta: {
          textAlign: 'center',
        },
      },
    ],
    [
      agentAccess?.delete,
      agentAccess?.edit,
      handlePlaygroundClick,
      openAgentDetails,
      openConfigureAgent,
      openWidgetConfigure,
      openPromptEditor,
      handleStatusUpdate,
      selectedDateFilterLabel,
    ],
  );

  if (view === 'analytics') {
    return <AgentAnalytics onClose={() => setView('list')} agents={agentsWithMetrics} />;
  }

  return (
    <>
      <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f4f5f7]">
        <div className="flex min-h-[64px] flex-col gap-3 border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 text-[18px] font-bold text-slate-950">
              <button
                type="button"
                onClick={() => navigate('/admin-settings/knowledge/ai-agent')}
                className="font-medium text-slate-500 transition-colors hover:text-primary"
              >
                AI Agents
              </button>
              <span className="text-slate-400">/</span>
              <span>AI Chatbot Agents</span>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              Agents that answer chats on your behalf, the knowledge they draw on, and how each one
              is performing.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            {agentAccess?.add && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setView('analytics')}
                className="h-9 gap-2 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
              >
                <span className="text-base leading-none">📊</span>
                Analytics
              </Button>
            )}
            {agentAccess?.add && (
              <Button
                type="button"
                variant="primary"
                onClick={() => navigate('/admin-settings/knowledge/create-agent')}
                className="h-9 gap-2 rounded-lg px-4 text-sm font-semibold shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                Create New AI Chatbot Agent
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-6 py-5">
          <div className="relative max-w-full flex-1 sm:max-w-[440px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(sanitizeAiSearchText(event.target.value, 50))}
              placeholder="Search agents by name..."
              maxLength={50}
              className="h-11 w-full rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] pl-10 pr-4 text-sm text-[#2E2D35] outline-none transition-colors placeholder:text-[#9A948F] hover:border-[rgba(225,200,165,0.9)] focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`h-9 rounded-full border px-4 text-sm font-bold transition-colors ${
              statusFilter === 'all'
                ? 'border-primary bg-primary text-white'
                : 'border-[#EEE7DD] bg-white text-[#9A948F] hover:border-[rgba(225,200,165,0.9)]'
            }`}
          >
            All <span>{totalAgentsCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('live')}
            className={`h-9 rounded-full border px-4 text-sm font-bold transition-colors ${
              statusFilter === 'live'
                ? 'border-primary bg-primary text-white'
                : 'border-[#EEE7DD] bg-white text-[#9A948F] hover:border-[rgba(225,200,165,0.9)]'
            }`}
          >
            Live <span>{liveAgentsCount}</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-5 pb-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="relative min-h-[86px] rounded-[10px] border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-4 py-3 shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] transition-colors hover:border-primary"
              >
                {(isStatsFetching || isMetricsFetching) && <StatCardLoader />}
                <p className="text-[11px] font-medium text-slate-500">{stat.label}</p>
                <p className="mt-[3px] text-[22px] font-bold leading-7 text-slate-950">
                  {stat.value}
                </p>
                {stat.helper ? (
                  <p className="mt-0.5 text-[11px] font-medium text-emerald-500">{stat.helper}</p>
                ) : null}
              </div>
            ))}
          </div>

          <TableManager
            columns={columns}
            fetcherKey="getChatAgentList"
            fetcherFn={getChatAgentList}
            search={search}
            extraParams={{ filters: tableFilters, date_filters: selectedDateFilters }}
            select={selectTableAgents}
            clientSideSearch={false}
            customClass="shadow-sm [&_table]:table-fixed [&_thead]:bg-[#f8fafc] [&_th]:px-2 [&_th]:py-3 [&_th]:text-[11px] [&_th]:font-extrabold [&_th]:uppercase [&_th]:tracking-[0.04em] [&_th]:text-slate-500 [&_th:first-child]:w-[27%] [&_td:first-child]:w-[27%] [&_th:last-child]:w-[180px] [&_td]:h-[70px] [&_td]:px-2 [&_td]:py-2.5 [&_td:last-child]:w-[180px]"
            loaderTableClass="min-h-[320px]"
            getRowClassName={() => 'transition-colors hover:bg-[#FBE2C8]/60'}
            emptyTablePlaceholder="No chat agents found"
            descriptionEmptyTable="Try a different search or create a new chat agent."
          />
        </div>
      </section>

      {!!deleteAgent && (
        <AlertConfirm
          apiLoading={isDeletePending}
          onConfirm={async () => {
            mutateDeleteAgent({ agentId: getAgentId(deleteAgent) });
          }}
          open={!!deleteAgent}
          setOpen={() => setDeleteAgent(null)}
        />
      )}

      <PromptModal
        open={promptModalOpen}
        setOpen={setPromptModalOpen}
        data={editData}
        onUpdate={handleUpdatePrompt}
        isUpdating={isUpdatingPrompt}
      />

      <ChatAgentConfigureModal
        open={Boolean(configureAgent)}
        agent={configureAgent}
        initialTokenId={configureTokenId}
        onOpenChange={(open) => {
          if (!open) {
            setConfigureAgent(null);
            setConfigureTokenId('');
          }
        }}
        onSaved={(agent) => setConfigureAgent(agent)}
      />
    </>
  );
}

export default AiChatbotAgents;
