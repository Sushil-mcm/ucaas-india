// import { Button } from '@/components/ui/button';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
import { SocketEvents } from '@/context/socket-events-context';
import { useUser } from '@/hooks/use-user';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  // CircleAlert,
  Headphones,
  HeartPulse,
  MessageCircle,
  // MessageSquareWarning,
  PhoneCall,
  // ShieldAlert,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import CustomTooltip from '@/components/custom/custom-tooltip';

type KpiCard = {
  label: string;
  value: string;
  icon: any;
  tone: 'green' | 'blue' | 'red' | 'orange' | 'gray';
  suffix?: string;
  alertDot?: boolean;
};

type SentimentBar = {
  label: string;
  value: number;
  count?: number;
};

// type IntentBar = {
//   label: string;
//   value: number;
// };

// type TopicItem = {
//   label: string;
//   value: number;
//   tone: 'red' | 'blue' | 'green' | 'orange' | 'gray';
// };

type AgentRisk = 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'N/A';
type AgentMood = 'SATISFIED' | 'HAPPY' | 'CONFUSED' | 'ANGRY' | 'FRUSTRATED' | 'N/A';

type AgentSentimentCard = {
  name: string;
  initials: string;
  ext: string;
  state: string;
  duration: string;
  risk: AgentRisk;
  mood: AgentMood;
  liveScore: string;
  todayAvg: string;
  pos: number;
  neu: number;
  neg: number;
  posCount: number;
  neuCount: number;
  negCount: number;
  negCalls: number;
  escalations: number;
  consecutiveNeg: number;
  trend: number[];
  today_sentiment_calls?: number | string;
  sentimentLabel?: string;
};

type AiWallboardAgentResult = {
  uuid?: string;
  agent_uuid?: string;
  did_uuid?: string;
  agent_extension?: string;
  agent_name?: string;
  agent_status?: string;
  ai_agent_status?: string;
  today_calls?: number | string;
  today_sentiment_calls?: number | string;
  avg_sentiment?: number | string;
  forward_name?: string;
  forward_type?: string;
  forward_value?: string;
  sentiment?: string;
  sentiment_counts?: {
    positive: number;
    neutral: number;
    negative: number;
    positive_percent: number;
    neutral_percent: number;
    negative_percent: number;
  };
  // {
  //   positive?: number;
  //   neutral?: number;
  //   negative?: number;
  // };
  last_activity?: string;
  sentiment_label?: string;
};

type AiWallboardSummary = {
  agent_sentiment_top?: {
    agent_name?: string;
    agent_extension?: string;
    avg_sentiment?: number;
  };
  agent_sentiment_bottom?: {
    agent_name?: string;
    agent_extension?: string;
    avg_sentiment?: number;
  };
  idle_over_5_minutes?: any[];
};

type AhtBucket = {
  label?: string;
  count?: number;
  percent?: number;
};

type AiReceptionistPerformance = {
  handled_today?: number;
  handled_ai_only?: any;
  transfer_to_agent_percent?: number;
  avg_duration_sec?: number;
  lead_captured_counts?: number;
  intent_accuracy_percent?: number;
};

type CampaignAiLiveCallResult = {
  total_ai_calls?: number;
  at_risk_calls?: number;
  transferred_calls?: number;
  handled_ai_only?: number;
  ai_containment_percent?: number;
  avg_sentiment?: number;
  total_ai_chats?: number;
  sentiment_buckets?: AhtBucket[]; // Reusing AhtBucket as it has label/count/percent
  aht_buckets?: AhtBucket[];
  ai_receptionist_performance?: AiReceptionistPerformance;
  voice_vs_text_interactions?: {
    voice_count?: number;
    text_count?: number;
    voice_percent?: number;
    text_percent?: number;
  };
  intent_count?: Record<string, number>;
};

// type FallbackSegment = {
//   label: string;
//   value: number;
//   color: string;
// };

// type EmotionPressure = {
//   queue: string;
//   calls: number;
//   pressure: number;
//   tone: 'green' | 'orange' | 'red';
//   warning?: boolean;
// };

// type RiskCall = {
//   intent: string;
//   caller: string;
//   agent: string;
//   duration: string;
//   score: string;
//   factor: string;
//   factorTone: 'red' | 'orange' | 'blue';
//   action: string;
// };

const kpiCards: KpiCard[] = [
  { label: 'Avg Sentiment', value: '8.4', icon: HeartPulse, tone: 'green' },
  { label: 'AI Containment', value: '64%', icon: Bot, tone: 'blue' },
  { label: 'At Risk Calls', value: '4', icon: AlertTriangle, tone: 'red', alertDot: true },
  { label: 'Active AI Calls', value: '28', icon: PhoneCall, tone: 'blue' },
  { label: 'Total AI Calls', value: '600', icon: Users, tone: 'gray' },
  { label: 'Total AI Chats', value: '20', icon: MessageCircle, tone: 'orange' },
];

const sentimentBars: SentimentBar[] = [
  { label: 'Excellent', value: 0 },
  { label: 'Good', value: 0 },
  { label: 'Neutral', value: 0 },
  { label: 'Poor', value: 0 },
  { label: 'Critical', value: 0 },
];

const defaultAhtBuckets: AhtBucket[] = [
  { label: '0-2m', count: 0, percent: 0 },
  { label: '2-5m', count: 0, percent: 0 },
  { label: '5-10m', count: 0, percent: 0 },
  { label: '10-15m', count: 0, percent: 0 },
  { label: '>15m', count: 0, percent: 0 },
];

// const intentBars: IntentBar[] = [
//   { label: 'Billing', value: 78 },
//   { label: 'Support', value: 56 },
//   { label: 'Sales', value: 49 },
//   { label: 'Cancellation', value: 22 },
//   { label: 'Status', value: 16 },
// ];

// const topicItems: TopicItem[] = [
//   { label: 'Billing Error', value: 120, tone: 'red' },
//   { label: 'Password Reset', value: 85, tone: 'blue' },
//   { label: 'Upgrade Plan', value: 64, tone: 'green' },
//   { label: 'Cancel Subscription', value: 42, tone: 'orange' },
//   { label: 'Late Delivery', value: 38, tone: 'gray' },
// ];

// const emotionalPos: number[] = [66, 58, 48, 42, 40, 60, 69, 75, 78];
// const emotionalNeg: number[] = [15, 19, 34, 44, 46, 17, 12, 11, 11];

// const fallbackSegments: FallbackSegment[] = [
//   { label: 'Complex Query', value: 42, color: '#f59e0b' },
//   { label: 'Human Requested', value: 28, color: '#0ea5e9' },
//   { label: 'Low Confidence', value: 18, color: '#ef4444' },
//   { label: 'Auth Required', value: 12, color: 'var(--color-ucass-active)' },
// ];

// const agentCards: AgentSentimentCard[] = [
//   {
//     name: 'Sarah Jenkins',
//     initials: 'SJ',
//     ext: '1012',
//     state: 'On Call',
//     duration: '04:12',
//     risk: 'LOW RISK',
//     mood: 'SATISFIED',
//     liveScore: '+0.85',
//     todayAvg: '+0.72',
//     pos: 75,
//     neu: 20,
//     neg: 5,
//     negCalls: 0,
//     escalations: 0,
//     consecutiveNeg: 0,
//     trend: [78, 80, 81, 82, 83],
//   },
//   {
//     name: 'Michael Chen',
//     initials: 'MC',
//     ext: '1015',
//     state: 'On Call',
//     duration: '12:45',
//     risk: 'HIGH RISK',
//     mood: 'ANGRY',
//     liveScore: '-0.82',
//     todayAvg: '-0.15',
//     pos: 40,
//     neu: 35,
//     neg: 25,
//     negCalls: 3,
//     escalations: 2,
//     consecutiveNeg: 2,
//     trend: [62, 58, 55, 49, 44],
//   },
//   {
//     name: 'Emma Watson',
//     initials: 'EW',
//     ext: '1016',
//     state: 'Wrap Up',
//     duration: '01:32',
//     risk: 'LOW RISK',
//     mood: 'CONFUSED',
//     liveScore: '+0.15',
//     todayAvg: '+0.45',
//     pos: 60,
//     neu: 30,
//     neg: 10,
//     negCalls: 0,
//     escalations: 0,
//     consecutiveNeg: 0,
//     trend: [53, 54, 55, 54, 54],
//   },
//   {
//     name: 'David Miller',
//     initials: 'DM',
//     ext: '1017',
//     state: 'On Call',
//     duration: '08:15',
//     risk: 'MODERATE RISK',
//     mood: 'FRUSTRATED',
//     liveScore: '-0.45',
//     todayAvg: '+0.10',
//     pos: 45,
//     neu: 40,
//     neg: 15,
//     negCalls: 1,
//     escalations: 1,
//     consecutiveNeg: 0,
//     trend: [58, 57, 55, 53, 51],
//   },
//   {
//     name: 'Jessica Alba',
//     initials: 'JA',
//     ext: '1014',
//     state: 'Available',
//     duration: '00:00',
//     risk: 'LOW RISK',
//     mood: 'HAPPY',
//     liveScore: '+0.90',
//     todayAvg: '+0.85',
//     pos: 85,
//     neu: 10,
//     neg: 5,
//     negCalls: 0,
//     escalations: 0,
//     consecutiveNeg: 0,
//     trend: [70, 72, 75, 79, 82],
//   },
//   {
//     name: 'Robert Fox',
//     initials: 'RF',
//     ext: '1013',
//     state: 'On Call',
//     duration: '02:10',
//     risk: 'LOW RISK',
//     mood: 'SATISFIED',
//     liveScore: '+0.79',
//     todayAvg: '+0.65',
//     pos: 65,
//     neu: 25,
//     neg: 10,
//     negCalls: 0,
//     escalations: 0,
//     consecutiveNeg: 0,
//     trend: [63, 65, 67, 68, 69],
//   },
// ];

// const emotionPressure: EmotionPressure[] = [
//   { queue: 'Billing & Payments', calls: 12, pressure: 88, tone: 'red', warning: true },
//   { queue: 'Technical Support', calls: 24, pressure: 63, tone: 'orange' },
//   { queue: 'Sales / Upgrades', calls: 8, pressure: 26, tone: 'green' },
//   { queue: 'Cancellations', calls: 5, pressure: 98, tone: 'red', warning: true },
// ];

// const aiAlerts = [
//   { text: 'Multiple negative calls in Billing Queue', age: 'Just now', tone: 'orange' },
//   {
//     text: 'Suspicious robocall pattern detected (5 calls)',
//     age: '2 min ago',
//     tone: 'red',
//   },
//   { text: 'AI intent recognition dropped below 85%', age: '10 min ago', tone: 'blue' },
//   { text: 'Support Q SLA at 65% (Threshold: 80%)', age: '15 min ago', tone: 'orange' },
// ];

// const highRiskCalls: RiskCall[] = [
//   {
//     intent: 'Billing Dispute',
//     caller: '+1 (555) 019-2834',
//     agent: 'Michael Chen',
//     duration: '12:45',
//     score: '3.2 / 10',
//     factor: 'ANGER SPIKE',
//     factorTone: 'red',
//     action: 'Barge / Whisper',
//   },
//   {
//     intent: 'Cancellation',
//     caller: '+1 (555) 882-1022',
//     agent: 'David Miller',
//     duration: '08:15',
//     score: '4.1 / 10',
//     factor: 'HIGH FRUSTRATION',
//     factorTone: 'orange',
//     action: 'Monitor',
//   },
//   {
//     intent: 'AI Receptionist',
//     caller: 'Anonymous',
//     agent: 'Unassigned',
//     duration: '02:30',
//     score: '4.5 / 10',
//     factor: 'FALLBACK LOOP',
//     factorTone: 'blue',
//     action: 'Takeover Call',
//   },
// ];

const metricToneClasses = {
  green: { icon: 'text-[#4EAE6E]', value: 'text-[#4EAE6E]' },
  blue: { icon: 'text-primary', value: 'text-primary' },
  red: { icon: 'text-[#DC5049]', value: 'text-[#DC5049]' },
  orange: { icon: 'text-amber-600', value: 'text-amber-600' },
  gray: { icon: 'text-[#2E2D35]', value: 'text-[#2E2D35]' },
};

// const moodBadgeClasses: Record<AgentMood, string> = {
//   SATISFIED: 'bg-green-100 text-green-700',
//   HAPPY: 'bg-green-100 text-green-700',
//   CONFUSED: 'bg-ucass-active-bg text-ucass-active',
//   ANGRY: 'bg-red-100 text-red-600',
//   FRUSTRATED: 'bg-amber-100 text-amber-700',
//   'N/A': 'bg-gray-100 text-gray-600',
// };

const sentimentLabelBadgeClass = (value?: string) => {
  const val = String(value || '').toLowerCase();
  if (val === 'positive') return 'bg-green-100 text-green-700';
  if (val === 'negative') return 'bg-red-100 text-red-600';
  if (val === 'neutral') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
};

// const riskBadgeClasses: Record<AgentRisk, string> = {
//   'LOW RISK': 'bg-green-100 text-green-700',
//   'MODERATE RISK': 'bg-amber-100 text-amber-700',
//   'HIGH RISK': 'bg-red-100 text-red-600',
//   'N/A': 'bg-gray-100 text-gray-600',
// };

const scoreToneClass = (value: string) =>
  value === 'N/A'
    ? 'text-[#9A948F]'
    : value.trim().startsWith('-')
      ? 'text-[#DC5049]'
      : 'text-[#4EAE6E]';

const getAgentInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NA';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

// const pressureBarClass = (tone: EmotionPressure['tone']) => {
//   if (tone === 'red') return 'bg-red-500';
//   if (tone === 'orange') return 'bg-amber-500';
//   return 'bg-green-500';
// };

// const factorBadgeClass = (tone: RiskCall['factorTone']) => {
//   if (tone === 'red') return 'bg-red-100 text-red-600';
//   if (tone === 'orange') return 'bg-amber-100 text-amber-700';
//   return 'bg-ucass-active-bg text-ucass-active';
// };

// const topicToneClass = (tone: TopicItem['tone']) => {
//   if (tone === 'red') return 'text-red-500';
//   if (tone === 'blue') return 'text-primary';
//   if (tone === 'green') return 'text-green-600';
//   if (tone === 'orange') return 'text-amber-600';
//   return 'text-gray-500';
// };

const createLinePath = (points: number[], width = 360, height = 160, padding = 14) => {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  return points
    .map((point, idx) => {
      const x = padding + (idx * (width - padding * 2)) / Math.max(points.length - 1, 1);
      const y = height - padding - ((point - min) * (height - padding * 2)) / range;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

// const createAreaPath = (points: number[], width = 360, height = 160, padding = 14) => {
//   const line = createLinePath(points, width, height, padding);
//   const endX = width - padding;
//   const startX = padding;
//   const baseY = height - padding;
//   return `${line} L ${endX} ${baseY} L ${startX} ${baseY} Z`;
// };

// const RingChart = ({ segments }: { segments: FallbackSegment[] }) => {
//   const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
//   let current = 0;
//   const gradient = segments
//     .map((segment) => {
//       const from = (current / total) * 360;
//       current += segment.value;
//       const to = (current / total) * 360;
//       return `${segment.color} ${from}deg ${to}deg`;
//     })
//     .join(', ');

//   return (
//     <div className="flex flex-col items-center gap-3">
//       <div
//         className="relative h-32 w-32 rounded-full"
//         style={{ backgroundImage: `conic-gradient(${gradient})` }}
//       >
//         <div className="absolute inset-3 rounded-full bg-white" />
//       </div>
//       <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
//         {segments.map((segment) => (
//           <span
//             key={segment.label}
//             className="flex items-center gap-1 text-xs font-medium text-gray-600"
//           >
//             <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
//             {segment.label}
//           </span>
//         ))}
//       </div>
//     </div>
//   );
// };

const formatPercentValue = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0%';
  return `${value.toFixed(2).replace(/\.?0+$/, '')}%`;
};

const formatDurationFromSeconds = (seconds?: number) => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || seconds <= 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

// const TrendSparkline = ({ points, tone }: { points: number[]; tone: 'green' | 'red' }) => {
//   const width = 290;
//   const height = 38;
//   return (
//     <svg viewBox={`0 0 ${width} ${height}`} className="h-6 w-full">
//       <path
//         d={createLinePath(points, width, height, 3)}
//         fill="none"
//         stroke={tone === 'green' ? '#22c55e' : '#ef4444'}
//         strokeWidth="2"
//         strokeLinecap="round"
//       />
//     </svg>
//   );
// };

// const ActionButtons = ({ highRisk }: { highRisk: boolean }) => (
//   <div className="mt-2.5 flex flex-col gap-2">
//     <div className="grid grid-cols-2 gap-2">
//       <button
//         type="button"
//         className="rounded-md border border-ucass-active-bg bg-ucass-active-bg py-1 text-[11px] font-semibold text-ucass-active hover:bg-ucass-active-bg"
//       >
//         Listen
//       </button>
//       <button
//         type="button"
//         className="rounded-md border border-cyan-100 bg-cyan-50 py-1 text-[11px] font-semibold text-cyan-600 hover:bg-cyan-100"
//       >
//         Whisper
//       </button>
//     </div>
//     {highRisk && (
//       <button
//         type="button"
//         className="rounded-md border border-red-200 bg-red-50 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-100"
//       >
//         Barge &amp; Takeover
//       </button>
//     )}
//     <div className="grid grid-cols-2 gap-2">
//       <button
//         type="button"
//         className="rounded-md border border-amber-100 bg-amber-50 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-100"
//       >
//         Send AI Prompt
//       </button>
//       <button
//         type="button"
//         className="rounded-md border border-gray-200 bg-gray-100 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-200"
//       >
//         Tag for QA
//       </button>
//     </div>
//   </div>
// );
type AgentStatus = 'AVAILABLE' | 'ON CALL' | 'RINGING' | 'WRAP UP' | 'ON HOLD' | 'OFFLINE';
const statusPillClass: Record<AgentStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 border border-green-200',
  'ON CALL': 'bg-ucass-active-bg text-ucass-active border border-ucass-active-bg',
  RINGING: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  'WRAP UP': 'bg-amber-100 text-amber-700 border border-amber-200',
  'ON HOLD': 'bg-red-100 text-red-700 border border-red-200',
  OFFLINE: 'bg-gray-100 text-gray-400 border border-gray-200',
};
const AiWallboard = () => {
  const {
    aiLiveWallboardData,
    setAiLiveWallboardData,
    campaignAiLiveCallData,
    getAiLiveWallboardData,
    isSocketConnected,
    liveCalls,
    usersOnlineStatus,
  } = useContext(SocketEvents);
  console.log('🚀 ~ AiWallboard ~ liveCalls:', liveCalls);
  const { user } = useUser();
  const [isRefreshingAiWallboard, setIsRefreshingAiWallboard] = useState(false);
  const hasAiWallboardDataRef = useRef(false);
  const refreshLoaderTimeoutRef = useRef<number | null>(null);
  console.log('🚀 ~ AiWallboard ~ aiLiveWallboardData:', aiLiveWallboardData);
  const canRefreshAiWallboard = Boolean(
    user?.sip_credentials?.domain &&
    user?.company_info?.uuid &&
    user?.user_info?.uuid &&
    isSocketConnected,
  );
  const campaignAiLiveCallResult: CampaignAiLiveCallResult | null =
    campaignAiLiveCallData?.data?.result && typeof campaignAiLiveCallData?.data?.result === 'object'
      ? campaignAiLiveCallData.data.result
      : null;
  const aiContainmentPercentValue =
    typeof campaignAiLiveCallResult?.ai_containment_percent === 'number'
      ? `${campaignAiLiveCallResult.ai_containment_percent.toFixed(2)}%`
      : '0%';
  const atRiskCallsValue = String(
    Array.isArray(liveCalls)
      ? liveCalls.filter(
          (call: any) =>
            String(call?.sentiment || '')
              .trim()
              .toLowerCase() === 'negative',
        ).length
      : 0,
  );
  const totalAiCallsValue =
    typeof campaignAiLiveCallResult?.total_ai_calls === 'number'
      ? String(campaignAiLiveCallResult.total_ai_calls)
      : '0';
  const ahtBuckets =
    Array.isArray(campaignAiLiveCallResult?.aht_buckets) &&
    campaignAiLiveCallResult.aht_buckets.length > 0
      ? campaignAiLiveCallResult.aht_buckets
      : defaultAhtBuckets;
  const aiReceptionistPerformance =
    campaignAiLiveCallResult?.ai_receptionist_performance &&
    typeof campaignAiLiveCallResult.ai_receptionist_performance === 'object'
      ? campaignAiLiveCallResult.ai_receptionist_performance
      : null;
  const avgSentimentValue =
    typeof campaignAiLiveCallResult?.avg_sentiment === 'number'
      ? campaignAiLiveCallResult.avg_sentiment.toFixed(1)
      : '0';
  const totalAiChatsValue =
    typeof campaignAiLiveCallResult?.total_ai_chats === 'number'
      ? String(campaignAiLiveCallResult.total_ai_chats)
      : '0';
  console.log(aiReceptionistPerformance, 'aiReceptionistPerformance', campaignAiLiveCallResult);

  const dynamicSentimentBars: SentimentBar[] =
    Array.isArray(campaignAiLiveCallResult?.sentiment_buckets) &&
    campaignAiLiveCallResult.sentiment_buckets.length > 0
      ? campaignAiLiveCallResult.sentiment_buckets.map((bucket) => ({
          label: bucket.label || 'N/A',
          value: bucket.percent || 0,
          count: bucket.count || 0,
        }))
      : sentimentBars;

  const handledTodayValue =
    typeof aiReceptionistPerformance?.handled_ai_only === 'number'
      ? aiReceptionistPerformance.handled_ai_only.toLocaleString()
      : '0';
  const transferredCallsValue =
    typeof campaignAiLiveCallResult?.transferred_calls === 'number'
      ? campaignAiLiveCallResult.transferred_calls.toLocaleString()
      : '0';

  const transferToAgentValue = formatPercentValue(
    aiReceptionistPerformance?.transfer_to_agent_percent,
  );
  const avgDurationValue = formatDurationFromSeconds(aiReceptionistPerformance?.avg_duration_sec);
  const leadCapturedValue =
    typeof aiReceptionistPerformance?.lead_captured_counts === 'number'
      ? aiReceptionistPerformance.lead_captured_counts.toLocaleString()
      : '0';
  const aiAhtChartValues = ahtBuckets.map((bucket) => Number(bucket?.count || 0));
  const aiAhtChartLabels = ahtBuckets.map((bucket) => String(bucket?.label || 'N/A'));

  const rawIntentCount = campaignAiLiveCallResult?.intent_count || {};
  const intentEntries = Object.entries(rawIntentCount)
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      count: Number(count) || 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7); // Top 7

  const aiIntentBuckets = intentEntries;

  const aiIntentChartValues = aiIntentBuckets.map((bucket) => bucket.count);
  // const aiIntentChartLabels = aiIntentBuckets.map((bucket) => bucket.label);

  const activeAiCallsCount = Array.isArray(liveCalls)
    ? liveCalls?.filter((call: any) => String(call?.call_type || '').toLowerCase() === 'ai')?.length
    : 0;

  const voiceVsText = campaignAiLiveCallResult?.voice_vs_text_interactions;
  // const voiceCount = voiceVsText?.voice_count || 0;
  // const textCount = voiceVsText?.text_count || 0;
  const voicePercent = voiceVsText?.voice_percent || 0;
  const textPercent = voiceVsText?.text_percent || 0;
  const aiWallboardResult = aiLiveWallboardData?.data?.result;
  const aiWallboardAgentList: AiWallboardAgentResult[] = Array.isArray(aiWallboardResult?.agents)
    ? aiWallboardResult.agents
    : [];
  const aiWallboardSummary: AiWallboardSummary | null = aiWallboardResult?.summary || null;

  const agentSentimentCards: AgentSentimentCard[] =
    aiWallboardAgentList.length > 0
      ? aiWallboardAgentList.map((agent) => {
          const parsedTodayCalls = Number(agent?.today_calls);
          const parsedTodaySentimentCalls = Number(agent?.today_sentiment_calls);
          const parsedAvgSentiment = Number(agent?.avg_sentiment);
          // const sentiment = String(agent?.sentiment || '').toLowerCase();
          const scores = agent?.sentiment_counts;

          // let risk: AgentRisk = 'N/A';
          // let mood: AgentMood = 'N/A';

          // const pos = Math.round(scores?.positive_percent || 0);
          // const neu = Math.round(scores?.neutral_percent || 0);
          // const neg = Math.round(scores?.negative_percent || 0);
          // const totalRaw = pos + neu + neg;
          // console.log(neg, 'negnegneg');

          // if (totalRaw > 0) {
          //   if (neg > 40) {
          //     risk = 'HIGH RISK';
          //     mood = 'ANGRY';
          //   } else if (neg > 20) {
          //     risk = 'MODERATE RISK';
          //     mood = 'FRUSTRATED';
          //   } else if (pos > 60) {
          //     risk = 'LOW RISK';
          //     mood = 'HAPPY';
          //   } else if (pos > 30 || neu > 50) {
          //     risk = 'LOW RISK';
          //     mood = 'SATISFIED';
          //   } else {
          //     risk = 'LOW RISK';
          //     mood = 'CONFUSED';
          //   }
          // } else {
          //   // If no scores, fallback to overall sentiment string if available
          //   if (sentiment === 'positive') {
          //     risk = 'LOW RISK';
          //     mood = 'HAPPY';
          //   } else if (sentiment === 'neutral') {
          //     risk = 'LOW RISK';
          //     mood = 'SATISFIED';
          //   } else if (sentiment === 'negative' || sentiment === 'cancelled') {
          //     risk = 'HIGH RISK';
          //     mood = 'ANGRY';
          //   }
          // }

          const agentName = agent?.agent_name || agent?.forward_name || 'N/A';
          const agentStatus = agent?.agent_status || agent?.ai_agent_status || 'N/A';
          const sentimentLabel = agent?.sentiment_label || 'N/A';

          return {
            name: agentName,
            initials: getAgentInitials(agentName),
            ext: agent?.agent_extension || 'N/A',
            state: agentStatus,
            duration: '',
            risk: 'N/A',
            mood: 'N/A',
            sentimentLabel,
            liveScore: Number.isFinite(parsedTodayCalls) ? parsedTodayCalls.toLocaleString() : '0',
            todayAvg: Number.isFinite(parsedAvgSentiment)
              ? parsedAvgSentiment.toFixed(2).replace(/\.?0+$/, '')
              : '0',
            pos: Math.round(scores?.positive_percent || 0),
            neu: Math.round(scores?.neutral_percent || 0),
            neg: Math.round(scores?.negative_percent || 0),
            posCount: Math.round(scores?.positive || 0),
            neuCount: Math.round(scores?.neutral || 0),
            negCount: Math.round(scores?.negative || 0),
            negCalls: 0,
            escalations: 0,
            consecutiveNeg: 0,
            trend: [0, 0, 0, 0, 0],
            today_sentiment_calls: parsedTodaySentimentCalls,
          };
        })
      : [];
  const getAgentStatus = (agent: any): AgentStatus => {
    const agentExt = String(agent?.extension || agent?.ext || '');
    if (!agentExt) return 'OFFLINE';

    const liveCall = liveCalls?.find((call: any) => String(call.agent_extension) === agentExt);

    if (liveCall) {
      const liveStatus = String(liveCall.status || '').toUpperCase();
      if (['ANSWERED', 'BRIDGE', 'BRIDGED'].includes(liveStatus)) return 'ON CALL';
      if (['RINGING', 'CONNECTING', 'MEMBERS-OFFERED', 'START'].includes(liveStatus))
        return 'RINGING';
      if (['HOLD'].includes(liveStatus)) return 'ON HOLD';

      // Fallback check against AgentStatus keys
      if (['WRAP UP'].includes(liveStatus)) return 'WRAP UP';
    }

    const presence = usersOnlineStatus?.find((u: any) => String(u.userId) === agentExt);

    if (presence?.online) return 'AVAILABLE';
    return 'OFFLINE';
  };
  const clearRefreshLoaderTimeout = useCallback(() => {
    if (refreshLoaderTimeoutRef.current !== null) {
      window.clearTimeout(refreshLoaderTimeoutRef.current);
      refreshLoaderTimeoutRef.current = null;
    }
  }, []);

  const stopRefreshLoader = useCallback(() => {
    clearRefreshLoaderTimeout();
    setIsRefreshingAiWallboard(false);
  }, [clearRefreshLoaderTimeout]);

  const handleRefreshAiWallboard = useCallback(
    ({ showLoader = false }: { showLoader?: boolean } = {}) => {
      if (!canRefreshAiWallboard) {
        if (showLoader) {
          stopRefreshLoader();
        }
        return;
      }

      if (showLoader) {
        clearRefreshLoaderTimeout();
        setIsRefreshingAiWallboard(true);
        refreshLoaderTimeoutRef.current = window.setTimeout(() => {
          setIsRefreshingAiWallboard(false);
          refreshLoaderTimeoutRef.current = null;
        }, 10000);
      }

      getAiLiveWallboardData(
        {
          domain: user?.sip_credentials?.domain,
          company_uuid: user?.company_info?.uuid,
          user_uuid: user?.user_info?.uuid,
        },
        (res: any) => {
          if (res) {
            setAiLiveWallboardData(res);
          }
          if (showLoader) {
            stopRefreshLoader();
          }
        },
      );
    },
    [
      canRefreshAiWallboard,
      clearRefreshLoaderTimeout,
      getAiLiveWallboardData,
      setAiLiveWallboardData,
      stopRefreshLoader,
      user?.company_info?.uuid,
      user?.sip_credentials?.domain,
      user?.user_info?.uuid,
    ],
  );

  useEffect(() => {
    if (!canRefreshAiWallboard) return;

    handleRefreshAiWallboard();

    // Retry once after the socket bootstrap emits finish on hard reloads.
    const retryTimer = window.setTimeout(() => {
      if (!hasAiWallboardDataRef.current) {
        handleRefreshAiWallboard();
      }
    }, 1500);

    return () => window.clearTimeout(retryTimer);
  }, [canRefreshAiWallboard, handleRefreshAiWallboard]);

  useEffect(() => {
    hasAiWallboardDataRef.current = Boolean(aiLiveWallboardData);

    if (aiLiveWallboardData) {
      console.log('dash-ai-agent-data-response:', aiLiveWallboardData);
      stopRefreshLoader();
    }
  }, [aiLiveWallboardData, stopRefreshLoader]);

  useEffect(() => {
    if (campaignAiLiveCallData) {
      console.log('dash-campaign-ai-live-call-response:', campaignAiLiveCallData);
      stopRefreshLoader();
    }
  }, [campaignAiLiveCallData, stopRefreshLoader]);

  useEffect(() => {
    return () => {
      clearRefreshLoaderTimeout();
    };
  }, [clearRefreshLoaderTimeout]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-3">
      <div className="mx-auto flex w-full max-w-470 flex-col gap-3">
        <div className="rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)]">
          <div className="flex  flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-[#2E2D35] ">
                <Sparkles className="h-5 w-5 text-primary" />
                Live AI Wallboard
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-[#DC5049]">
                  LIVE
                </span>
              </h3>
              <p className="mt-1 text-xs font-medium text-[#9A948F] sm:text-sm">
                Real-time sentiment, AI reception, and agent monitoring
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleRefreshAiWallboard({ showLoader: true })}
                disabled={!canRefreshAiWallboard || isRefreshingAiWallboard}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingAiWallboard ? 'animate-spin' : ''}`} />
                {isRefreshingAiWallboard ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-6">
          {kpiCards.map((metric) => {
            const IconComp = metric.icon;
            const metricValue = (() => {
              if (metric.label === 'AI Containment') return aiContainmentPercentValue;
              if (metric.label === 'At Risk Calls') return atRiskCallsValue;
              if (metric.label === 'Active AI Calls') return String(activeAiCallsCount);
              if (metric.label === 'Total AI Calls') return totalAiCallsValue;
              if (metric.label === 'Avg Sentiment') return avgSentimentValue;
              if (metric.label === 'Total AI Chats') return totalAiChatsValue;
              return metric.value;
            })();
            const showAlertDot =
              metric.label === 'At Risk Calls'
                ? Number(atRiskCallsValue) > 0
                : Boolean(metric.alertDot);
            return (
              <div
                key={metric.label}
                className="relative rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-4 py-3 shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)]"
              >
                {showAlertDot && (
                  // <span className="absolute right-2 top-2 h-3 w-3 min-h-3 min-w-3 flex rounded-full bg-red-500" />
                  <div className="absolute right-1 top-1">
                    <div className="relative flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50 animate-ping"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <IconComp className={`h-5 w-5 ${metricToneClasses[metric.tone].icon}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                    {metric.label}
                  </p>
                  <p className={`text-2xl font-semibold ${metricToneClasses[metric.tone].value}`}>
                    {metricValue}
                    {metric.suffix && (
                      <span className="ml-0.5 text-base font-semibold">{metric.suffix}</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          <div className="rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] w-full">
            <div className="border-b border-[#EEE7DD] px-4 py-3">
              <h4 className="flex items-center gap-2 text-lg font-semibold text-[#2E2D35]">
                <TrendingUp className="h-4 w-4 text-[#4EAE6E]" />
                Sentiment
              </h4>
            </div>
            <div className="p-4">
              <div className="relative h-48">
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((line) => (
                    <div key={line} className="border-t border-dashed border-[#EEE7DD]" />
                  ))}
                </div>
                <div className="relative flex h-full items-end justify-between gap-2 px-2">
                  {dynamicSentimentBars.map((bar) => {
                    const labelMap: Record<string, string> = {
                      'High Positive': 'Excellent',
                      Positive: 'Good',
                      Neutral: 'Neutral',
                      Negative: 'Poor',
                      'High Negative': 'Critical',
                    };
                    const mappedLabel = labelMap[bar.label] || bar.label;

                    const tooltipText =
                      bar.count !== undefined
                        ? `${mappedLabel}: ${bar.count || 0} (${bar.value}%)`
                        : `${mappedLabel}: ${bar.value}%`;

                    const getSentimentColor = (label: string) => {
                      const l = label.toLowerCase();
                      if (l === 'excellent' || l === 'high positive')
                        return 'bg-[#4EAE6E] hover:bg-green-400';
                      if (l === 'good' || l === 'positive') return 'bg-[#f2994a] hover:bg-[#f2994a]/80';
                      if (l === 'neutral') return 'bg-yellow-400 hover:bg-yellow-300';
                      if (l === 'poor' || l === 'negative')
                        return 'bg-orange-500 hover:bg-orange-400';
                      if (l === 'critical' || l === 'high negative')
                        return 'bg-[#DC5049] hover:bg-red-400';
                      return 'bg-gray-400 hover:bg-gray-300';
                    };

                    return (
                      <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-40 w-full items-end justify-center">
                          <CustomTooltip text={tooltipText} side="top">
                            <div
                              className={`w-7 rounded-t-md cursor-pointer transition-colors ${getSentimentColor(mappedLabel)}`}
                              style={{ height: `${Math.max(bar.value, 4)}%` }}
                            />
                          </CustomTooltip>
                        </div>
                        <p className="text-center text-[10px] font-medium leading-4 text-[#9A948F]">
                          {mappedLabel}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] w-full">
            <div className="border-b border-[#EEE7DD] px-4 py-3">
              <h4 className="flex items-center gap-2 text-lg font-semibold text-[#2E2D35]">
                <Headphones className="h-4 w-4 text-primary" />
                AI AHT
              </h4>
            </div>
            <div className="p-4">
              <svg viewBox="0 0 420 190" className="h-48 w-full">
                {[0, 1, 2, 3, 4].map((line) => (
                  <line
                    key={line}
                    x1="12"
                    y1={24 + line * 36}
                    x2="408"
                    y2={24 + line * 36}
                    stroke="#EEE7DD"
                    strokeDasharray="4 4"
                  />
                ))}
                <path
                  d={createLinePath(aiAhtChartValues, 420, 190, 18)}
                  fill="none"
                  stroke="#f2994a"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {aiAhtChartValues.map((value, index) => {
                  const max = Math.max(...aiAhtChartValues, 1);
                  const min = Math.min(...aiAhtChartValues, 0);
                  const x = 18 + (index * (420 - 36)) / Math.max(aiAhtChartValues.length - 1, 1);
                  const y = 190 - 18 - ((value - min) * (190 - 36)) / (max - min || 1);
                  const bucket = ahtBuckets[index];
                  const count = bucket?.count ?? value;
                  const label = bucket?.label ?? '';
                  const percent = bucket?.percent;

                  const tooltipText =
                    percent !== undefined
                      ? `${label}: ${count} (${percent}%)`
                      : `${label}: ${count}`;

                  return (
                    <CustomTooltip key={`${value}-${index}`} text={tooltipText} side="top">
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#f2994a"
                        className="cursor-pointer hover:fill-[#f2994a]/70 transition-colors"
                      />
                    </CustomTooltip>
                  );
                })}
              </svg>
              <div
                className="mt-1 grid text-center text-[10px] font-medium text-[#9A948F]"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(aiAhtChartLabels.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                {aiAhtChartLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] w-full">
            <div className="border-b border-[#EEE7DD] px-4 py-3">
              <h4 className="flex items-center gap-2 text-lg font-semibold text-[#2E2D35]">
                <Bot className="h-4 w-4 text-primary" />
                Most Common AI Intents
              </h4>
            </div>
            <div className="p-4">
              <div className="relative h-48">
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((line) => (
                    <div key={line} className="border-t border-dashed border-[#EEE7DD]" />
                  ))}
                </div>
                {aiIntentBuckets.length > 0 ? (
                  <div className="relative flex h-full items-end justify-start gap-4 px-4 overflow-x-auto pb-1 custom-scrollbar">
                    {aiIntentBuckets.map((bar, index) => {
                      const tooltipText = `${bar.label}: ${bar.count || 0}`;

                      const colors = [
                        'bg-[#4EAE6E] hover:bg-green-400',
                        'bg-[#f2994a] hover:bg-[#f2994a]/80',
                        'bg-yellow-400 hover:bg-yellow-300',
                        'bg-orange-500 hover:bg-orange-400',
                        'bg-[#DC5049] hover:bg-red-400',
                      ];
                      const colorClass =
                        colors[index % colors.length] || 'bg-gray-400 hover:bg-gray-300';

                      const maxCount = Math.max(...aiIntentChartValues, 1);
                      const heightPercent = bar.count ? (bar.count / maxCount) * 100 : 0;

                      return (
                        <div
                          key={bar.label}
                          className="flex flex-col items-center gap-2 w-16 shrink-0"
                        >
                          <div className="flex h-40 w-full items-end justify-center">
                            <CustomTooltip text={tooltipText} side="top">
                              <div
                                className={`w-7 rounded-t-md cursor-pointer transition-colors ${colorClass}`}
                                style={{ height: `${Math.max(heightPercent, 4)}%` }}
                              />
                            </CustomTooltip>
                          </div>
                          <p
                            className="truncate w-full px-1 text-center text-[10px] font-medium leading-4 text-[#9A948F]"
                            title={bar.label}
                          >
                            {bar.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white/90 backdrop-blur-sm px-4 py-1.5 shadow-xs">
                      <Bot className="h-3.5 w-3.5 text-[#9A948F]" />
                      <span className="text-xs font-semibold text-[#9A948F]">No data found</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1 md:grid-cols-12">
          <div className="flex flex-col col-span-12 md:col-span-4">
            <div className="flex h-full flex-col rounded-xl border border-[rgba(214,163,90,0.55)] shadow-xs">
              <div className="border-b border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-4 py-3 rounded-t-xl">
                <h4 className="flex items-center gap-2 text-lg font-semibold text-[#2E2D35]">
                  <Bot className="h-4 w-4 text-primary" />
                  AI Receptionist Performance
                </h4>
              </div>
              <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                      Handled by AI only
                    </p>
                    <p className="text-lg font-semibold text-[#2E2D35]">{handledTodayValue}</p>
                  </div>
                  <div className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                      Transferred to Agent
                    </p>
                    <p className="text-lg font-semibold text-[#2E2D35]">{transferredCallsValue}</p>
                  </div>
                  <div className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                      Transfer Percentage
                    </p>
                    <p className="text-lg font-semibold text-[#2E2D35]">{transferToAgentValue}</p>
                  </div>
                  <div className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                      Avg Duration
                    </p>
                    <p className="text-lg font-semibold text-[#2E2D35]">{avgDurationValue}</p>
                  </div>
                  <div className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                      Leads Captured
                    </p>
                    <p className="text-lg font-semibold text-[#2E2D35]">{leadCapturedValue}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-2.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                    Voice vs Text Interactions
                  </p>
                  <div className="h-3 overflow-hidden rounded-full bg-ucass-active-bg">
                    <div className="flex h-full transition-all duration-500">
                      <div
                        className="bg-ucass-active text-right text-[9px] font-semibold text-white flex items-center justify-end pr-1"
                        style={{ width: `${voicePercent}%` }}
                      >
                        {voicePercent > 5 ? `${voicePercent.toFixed(0)}%` : ''}
                      </div>
                      <div
                        className="bg-[#f2994a] text-right text-[9px] font-semibold text-white flex items-center justify-end pr-1"
                        style={{ width: `${textPercent}%` }}
                      >
                        {textPercent > 5 ? `${textPercent.toFixed(0)}%` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <span>Active AI Chats/Calls</span>
                    <span className="font-semibold">28</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <span>Agent Escalations in Prog.</span>
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    <span>Failed AI Conversations</span>
                    <span className="font-semibold">1</span>
                  </div>
                </div> */}

            {/* <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-xs">
              <div className="border-b border-red-200 bg-red-50 px-4 py-3">
                <h4 className="flex items-center gap-2 text-lg font-semibold text-red-500">
                  <CircleAlert className="h-4 w-4" />
                  AI-Powered Alert System
                </h4>
              </div>
              <div>
                {aiAlerts.map((alert, index) => (
                  <div
                    key={`${alert.text}-${index}`}
                    className="flex items-start justify-between gap-2 border-b border-gray-200 px-4 py-3 last:border-b-0"
                  >
                    <p
                      className={`text-sm font-medium ${
                        alert.tone === 'red'
                          ? 'text-red-500'
                          : alert.tone === 'orange'
                            ? 'text-amber-600'
                            : 'text-primary'
                      }`}
                    >
                      {alert.text}
                      <span className="mt-1 block text-xs font-medium text-gray-500">
                        {alert.age}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div> */}
          </div>

          <div className="space-y-3 col-span-12 md:col-span-8">
            <div className="rounded-xl border border-[rgba(214,163,90,0.55)]  shadow-xs">
              <div className="flex flex-wrap items-center justify-between border-b border-[rgba(225,200,165,0.9)] px-4 py-3 bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] rounded-t-xl">
                <h4 className="flex items-center gap-2 text-lg font-semibold text-[#2E2D35]">
                  <Headphones className="h-4 w-4 text-primary" />
                  Agent Sentiment Status
                </h4>
                <div className="rounded-md border border-[#EEE7DD] bg-[#FBE2C8]/45 px-3 py-1">
                  <p className="text-[11px] font-medium text-[#9A948F]">
                    Top: {aiWallboardSummary?.agent_sentiment_top?.agent_name || 'N/A'} (
                    {aiWallboardSummary?.agent_sentiment_top?.avg_sentiment || '0'}) &nbsp; | &nbsp;
                    Bottom: {aiWallboardSummary?.agent_sentiment_bottom?.agent_name || 'N/A'} (
                    {aiWallboardSummary?.agent_sentiment_bottom?.avg_sentiment || '0'}) &nbsp; |
                    &nbsp;
                    <span className="font-semibold text-[#9A948F]">
                      Idle {'>'}5m: {aiWallboardSummary?.idle_over_5_minutes?.length || 0}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid gap-2 p-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {agentSentimentCards.map((agent, index) => {
                  console.log(agent, 'agentagent');

                  const isHighRisk = agent.risk === 'HIGH RISK';
                  return (
                    <div
                      key={`${agent.name}-${index}`}
                      className={`rounded-xl border bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3 shadow-[0_12px_28px_-6px_rgba(194,98,46,0.22),0_2px_8px_rgba(194,98,46,0.12)] ${
                        isHighRisk ? 'border-red-200' : 'border-[rgba(225,200,165,0.9)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2  mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 min-w-10 items-center justify-center rounded-full bg-ucass-primary-200 font-semibold text-primary">
                            {agent.initials}
                          </div>
                          <div>
                            <p className="text-base leading-6 font-semibold text-[#2E2D35]">
                              {agent.name}
                            </p>
                            <p className="flex items-center gap-1 text-xs font-medium text-[#9A948F] whitespace-nowrap">
                              <p className="flex items-center gap-1 text-[11px] font-medium text-[#9A948F]">
                                {(() => {
                                  const status = getAgentStatus(agent);
                                  return (
                                    <span
                                      className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide ${statusPillClass[status]}`}
                                    >
                                      {status}
                                    </span>
                                  );
                                })()}
                                {`${agent?.ext?.length > 4 ? 'DID' : 'EXT'}`}: {agent?.ext || ''}
                              </p>
                              {/* {agent.state === 'N/A'
                                ? 'N/A'
                                : `${agent.state}${agent.ext !== 'N/A' ? ` • Ext ${agent.ext}` : ''}${agent.duration ? ` • ${agent.duration}` : ''}`} */}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-0.2 text-right">
                          {/* <span
                            className={`inline-flex rounded-sm px-2 me-1 py-0.5 text-[10px] font-semibold ${riskBadgeClasses[agent.risk]}`}
                          >
                            {agent.risk}
                          </span>
                          <span
                            className={`inline-flex rounded-sm px-2 py-0.5 text-[10px] font-semibold ${moodBadgeClasses[agent.mood]}`}
                          >
                            {agent.mood}
                          </span> */}
                          {agent.sentimentLabel && agent.sentimentLabel !== 'N/A' && (
                            <span
                              className={`inline-flex rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase ${sentimentLabelBadgeClass(agent.sentimentLabel)}`}
                            >
                              {agent.sentimentLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
                        <div className="rounded-md border border-[#EEE7DD] bg-[#FBE2C8]/45 p-1.5 sm:p-2">
                          <p
                            className="text-[9px] lg:text-[10px] font-semibold uppercase text-[#9A948F] truncate"
                            title="Today Calls"
                          >
                            Total
                          </p>
                          <p className="text-lg sm:text-lg font-semibold text-[#2E2D35]">
                            {agent.liveScore}
                          </p>
                        </div>
                        <div className="rounded-md border border-[#EEE7DD] bg-[#FBE2C8]/45 p-1.5 sm:p-2">
                          <p
                            className="text-[9px] lg:text-[10px] font-semibold uppercase text-[#9A948F] truncate"
                            title="Sentiment Calls"
                          >
                            Monitored
                          </p>
                          <p className="text-lg sm:text-lg font-semibold text-[#2E2D35]">
                            {agent?.today_sentiment_calls || 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-md border border-[#EEE7DD] bg-[#FBE2C8]/45 p-1.5 sm:p-2">
                          <p
                            className="text-[9px] lg:text-[10px] font-semibold uppercase text-[#9A948F] truncate"
                            title="Avg Sentiment"
                          >
                            Average
                          </p>
                          <p
                            className={`text-lg sm:text-lg font-semibold ${scoreToneClass(agent.todayAvg)}`}
                          >
                            {agent.todayAvg}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-[#9A948F]">
                          <span>
                            POS {agent.posCount} ({agent.pos}%)
                          </span>
                          <span>
                            NEU {agent.neuCount} ({agent.neu}%)
                          </span>
                          <span>
                            NEG {agent.negCount} ({agent.neg}%)
                          </span>
                        </div>
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#FBE2C8]/40">
                          <div className="bg-[#4EAE6E] h-full" style={{ width: `${agent.pos}%` }} />
                          <div className="bg-gray-400 h-full" style={{ width: `${agent.neu}%` }} />
                          <div className="bg-[#DC5049] h-full" style={{ width: `${agent.neg}%` }} />
                        </div>
                      </div>

                      {/* <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-200 pt-2.5">
                        <div className="text-center">
                          <p className="text-xl font-semibold text-red-500">{agent.negCalls}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                            Neg Calls (30m)
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-semibold text-amber-600">
                            {agent.escalations}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                            Escalations
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-semibold text-red-500">
                            {agent.consecutiveNeg}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                            Consecutive Neg
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                          Sentiment Trend (Last 5 Calls)
                        </p>
                        <TrendSparkline
                          points={agent.trend}
                          tone={agent.risk === 'LOW RISK' ? 'green' : 'red'}
                        />
                      </div>

                      <ActionButtons highRisk={isHighRisk} /> */}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    Emotion Pressure Score
                  </h4>
                  <p className="text-xs font-medium text-gray-500">
                    High negative mood traffic detection per queue
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  {emotionPressure.map((item) => (
                    <div key={item.queue}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-700">
                          {item.queue}
                          {item.warning && (
                            <span className="ml-1 inline-flex align-middle">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                            </span>
                          )}
                        </p>
                        <p className="text-xs font-medium text-gray-500">{item.calls} live calls</p>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-1.5 rounded-full ${pressureBarClass(item.tone)}`}
                          style={{ width: `${item.pressure}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <Users className="h-4 w-4 text-green-600" />
                    Team Sentiment Overview
                  </h4>
                  <p className="text-xs font-medium text-gray-500">
                    Aggregated performance across all online agents
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600">
                        Team Avg Score
                      </p>
                      <p className="text-3xl font-semibold text-green-600">+0.48</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500">
                        % Negative (Last 15m)
                      </p>
                      <p className="text-3xl font-semibold text-red-500">18%</p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                        Most Stressed
                      </p>
                      <p className="text-base font-semibold text-red-500">Michael Chen</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A948F]">
                        Best Performer
                      </p>
                      <p className="text-base font-semibold text-green-600">Jessica Alba</p>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}
            {/* <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-3">
                <div>
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-red-500">
                    <ShieldAlert className="h-4 w-4" />
                    Live High-Risk Calls
                  </h4>
                  <p className="text-xs font-medium text-red-300">
                    Real-time monitoring of active calls with negative sentiment or high
                    frustration.
                  </p>
                </div>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                  3 ACTIVE
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[960px]">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Queue / Intent
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Caller Info
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Agent
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Duration
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Sentiment Score
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Risk Factor
                      </TableHead>
                      <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highRiskCalls.map((call) => (
                      <TableRow
                        key={`${call.intent}-${call.caller}`}
                        className="hover:bg-red-50/40"
                      >
                        <TableCell className="px-3 py-2 text-sm font-medium text-gray-700">
                          {call.intent}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm font-medium text-gray-500">
                          {call.caller}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm font-medium text-gray-700">
                          {call.agent}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm font-semibold text-amber-600">
                          {call.duration}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm font-semibold text-red-500">
                          {call.score}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-sm px-2 py-0.5 text-[10px] font-semibold ${factorBadgeClass(call.factorTone)}`}
                          >
                            {call.factor}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Button
                            variant="transparent"
                            className="h-auto px-0 py-0 text-xs font-semibold text-primary"
                          >
                            {call.action}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiWallboard;
