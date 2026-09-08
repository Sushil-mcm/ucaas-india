import { useContext, useEffect, useMemo } from 'react';
import {
  Info,
  Sparkles,
  PhoneCall,
  Tag,
  Bot,
  MessageSquare,
  PhoneForwarded,
  CheckCircle2,
  Clock,
  Target,
  Radio,
} from 'lucide-react';
import { SocketEvents } from '@/context/socket-events-context';
import { useUser } from '@/hooks/use-user';
import TableManager from '@/components/custom/table-manager';
import PerfStatCard from './stat-card';
import { formatSecsToClock } from './format';
import './speech-theme.css';

/** Matches `PerfStatCard`'s own top-right icon badge exactly — used here
 *  for the raw `.stat` cards (Avg sentiment, AI calls today, Top topic,
 *  Sentiment distribution) whose custom bar/legend content doesn't fit
 *  PerfStatCard's fixed label/value/sub layout, so they can't route
 *  through that component the way the other 7 KPI cards on this page do. */
const StatIconBadge = ({ icon: IconComp }: { icon: any }) => (
  <span
    className="stat-icon"
    style={{
      display: 'grid',
      placeItems: 'center',
      width: 22,
      height: 22,
      flex: 'none',
      borderRadius: 99,
      background: 'var(--accent-wash)',
      color: 'var(--accent-ink)',
    }}
  >
    <IconComp style={{ width: 13, height: 13 }} />
  </span>
);

/** Sentiment tone, on the shared status tokens rather than raw colours. */
const toneColor = (value: number) =>
  value > 15 ? 'var(--live)' : value < -15 ? 'var(--crit)' : 'var(--warn)';
/** Same three-way split as `toneColor`, as the badge modifier class
 *  `.sp-sentiment-badge` reads (speech-theme.css) instead of a raw colour. */
const toneClass = (value: number) => (value > 15 ? 'pos' : value < -15 ? 'neg' : 'neu');

/**
 * Sentiment distribution bar segment colour, keyed by the bucket's own
 * label rather than its position — an alternating even/odd-index scheme
 * gave "Positive" and "Negative" the same colour (both even-indexed) and
 * only "Neutral" a different one, which read as two segments blending into
 * each other rather than three distinct sentiments. Gradients rather than
 * the shared design system's flat `--live`/`--warn`/`--crit` tokens: `--warn`
 * in particular is a dark amber-orange close enough to this view's own
 * brand orange to look like a clashing, muddy repeat of it (the same issue
 * fixed on Campaigns' "No answer" segment — a plain amber/gold reads as
 * "more orange" here, not as its own colour, so this goes further and uses
 * a true yellow instead).
 */
const SENTIMENT_COLORS: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'linear-gradient(90deg, #34d399 0%, #059669 100%)',
  neutral: 'linear-gradient(90deg, #fde047 0%, #eab308 100%)',
  negative: 'linear-gradient(90deg, #fb7185 0%, #e11d48 100%)',
};

const sentimentBucketKey = (label?: string): keyof typeof SENTIMENT_COLORS => {
  const key = String(label || '').toLowerCase();
  if (key.startsWith('pos')) return 'positive';
  if (key.startsWith('neg')) return 'negative';
  return 'neutral';
};

const SpeechTextTab = () => {
  const {
    aiLiveWallboardData,
    setAiLiveWallboardData,
    campaignAiLiveCallData,
    getAiLiveWallboardData,
    isSocketConnected,
  } = useContext(SocketEvents);
  const { user } = useUser();

  const canRefresh = Boolean(
    user?.sip_credentials?.domain &&
    user?.company_info?.uuid &&
    user?.user_info?.uuid &&
    isSocketConnected,
  );

  /**
   * `perf-warm-backdrop` flags the document so speech-theme.css can paint
   * the full-page ambient gradient on `.perf-speech` itself, the same
   * pattern Callbacks and Campaigns use.
   */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  useEffect(() => {
    if (!canRefresh) return;
    getAiLiveWallboardData(
      {
        domain: user?.sip_credentials?.domain,
        company_uuid: user?.company_info?.uuid,
        user_uuid: user?.user_info?.uuid,
      },
      (res: any) => {
        if (res) setAiLiveWallboardData(res);
      },
    );
  }, [canRefresh]);

  const result = campaignAiLiveCallData?.data?.result;
  const avgSentiment = typeof result?.avg_sentiment === 'number' ? result.avg_sentiment : null;
  const totalAiCalls = typeof result?.total_ai_calls === 'number' ? result.total_ai_calls : 0;
  const containmentPercent =
    typeof result?.ai_containment_percent === 'number' ? result.ai_containment_percent : null;
  const totalAiChats = typeof result?.total_ai_chats === 'number' ? result.total_ai_chats : 0;
  const transferredCalls =
    typeof result?.transferred_calls === 'number' ? result.transferred_calls : 0;
  const receptionist = result?.ai_receptionist_performance;
  const handledAiOnly =
    typeof receptionist?.handled_ai_only === 'number' ? receptionist.handled_ai_only : 0;
  const avgAiDuration =
    typeof receptionist?.avg_duration_sec === 'number' ? receptionist.avg_duration_sec : null;
  const leadsCaptured =
    typeof receptionist?.lead_captured_counts === 'number' ? receptionist.lead_captured_counts : 0;
  const voiceVsText = result?.voice_vs_text_interactions;
  const voicePercent =
    typeof voiceVsText?.voice_percent === 'number' ? voiceVsText.voice_percent : null;
  const textPercent =
    typeof voiceVsText?.text_percent === 'number' ? voiceVsText.text_percent : null;
  const sentimentBuckets = Array.isArray(result?.sentiment_buckets) ? result.sentiment_buckets : [];

  const topics = useMemo(() => {
    const rawIntentCount = result?.intent_count || {};
    return Object.entries(rawIntentCount)
      .map(([label, count]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        count: Number(count) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [result]);
  const topTopic = topics[0];
  const topicsTotal = topics.reduce((sum, t) => sum + t.count, 0);

  const agents = aiLiveWallboardData?.data?.result?.agents;
  const agentRows = useMemo(
    () =>
      (Array.isArray(agents) ? agents : []).map((agent: any) => ({
        name: agent?.agent_name || agent?.forward_name || 'N/A',
        interactions: Number(agent?.today_sentiment_calls || 0),
        avgSentiment: Number(agent?.avg_sentiment || 0),
        negativePct: Math.round(agent?.sentiment_counts?.negative_percent || 0),
      })),
    [agents],
  );

  const topicColumns = [
    { header: 'Topic', accessorKey: 'label' },
    {
      header: 'Volume',
      accessorKey: 'count',
      cell: ({ row }: any) => (
        <div className="hbar-t" style={{ width: 160 }}>
          <i
            style={{
              background: 'var(--accent)',
              width: `${topicsTotal ? Math.round((row.original.count / topicsTotal) * 100) : 0}%`,
            }}
          />
        </div>
      ),
    },
    { header: 'Interactions', accessorKey: 'count' },
    {
      header: 'Share',
      accessorKey: 'share',
      cell: ({ row }: any) =>
        topicsTotal ? `${Math.round((row.original.count / topicsTotal) * 100)}%` : '—',
    },
  ];

  const agentColumns = [
    { header: 'Agent', accessorKey: 'name' },
    { header: 'Interactions', accessorKey: 'interactions' },
    {
      header: 'Avg sentiment',
      accessorKey: 'avgSentiment',
      cell: ({ row }: any) => (
        <span className={`sp-sentiment-badge ${toneClass(row.original.avgSentiment)}`}>
          {row.original.avgSentiment > 0 ? '+' : ''}
          {row.original.avgSentiment.toFixed(1)}
        </span>
      ),
    },
    {
      header: '% negative',
      accessorKey: 'negativePct',
      cell: ({ row }: any) => `${row.original.negativePct}%`,
    },
  ];

  return (
    <div className="perf-speech flex w-full flex-col gap-4 px-[22px] pt-5 pb-6">
      <div className="st-notice">
        <Info style={{ width: 14, height: 14 }} />
        <span>
          AI-handled call sentiment, from the AI Wallboard. For human-agent calls, see each call's
          Call Intelligence panel under Interactions.
        </span>
      </div>
      <div className="grid3">
        <div className="stat">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div className="k">Avg sentiment</div>
            <StatIconBadge icon={Sparkles} />
          </div>
          <div
            className="v num"
            style={{ color: avgSentiment === null ? undefined : toneColor(avgSentiment) }}
          >
            {avgSentiment === null ? '—' : avgSentiment.toFixed(1)}
          </div>
        </div>
        <div className="stat">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div className="k">AI calls today</div>
            <StatIconBadge icon={PhoneCall} />
          </div>
          <div className="v num">{totalAiCalls}</div>
        </div>
        <div className="stat">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div className="k">Top topic</div>
            <StatIconBadge icon={Tag} />
          </div>
          <div className="v" style={{ fontSize: 18 }}>
            {topTopic?.label || '—'}
          </div>
          {topTopic && (
            <div className="d" style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
              {topTopic.count} interactions
            </div>
          )}
        </div>
      </div>

      <div className="grid4">
        <PerfStatCard
          label="AI containment"
          value={containmentPercent === null ? '—' : `${Math.round(containmentPercent)}%`}
          sub="resolved without a human"
          icon={Bot}
        />
        <PerfStatCard label="Total AI chats" value={String(totalAiChats)} icon={MessageSquare} />
        <PerfStatCard
          label="Transferred to agent"
          value={String(transferredCalls)}
          icon={PhoneForwarded}
        />
        <PerfStatCard
          label="Handled by AI only"
          value={String(handledAiOnly)}
          icon={CheckCircle2}
        />
        <PerfStatCard
          label="Avg AI call duration"
          value={avgAiDuration === null ? '—' : formatSecsToClock(avgAiDuration)}
          icon={Clock}
        />
        <PerfStatCard label="Leads captured by AI" value={String(leadsCaptured)} icon={Target} />
        <PerfStatCard
          label="Voice vs text"
          value={
            voicePercent === null
              ? '—'
              : `${Math.round(voicePercent)}% / ${Math.round(textPercent ?? 0)}%`
          }
          sub="voice / text"
          icon={Radio}
        />
        <div className="stat">
          <div className="k">Sentiment distribution</div>
          {sentimentBuckets.length ? (
            <>
              <div
                className="hbar-t sp-sentiment-bar"
                style={{ display: 'flex', gap: 2, marginTop: 9 }}
              >
                {sentimentBuckets.map((bucket: any, index: number) => (
                  <i
                    key={bucket?.label || index}
                    style={{
                      borderRadius: 0,
                      background: SENTIMENT_COLORS[sentimentBucketKey(bucket?.label)],
                      width: `${Math.max(0, Number(bucket?.percent) || 0)}%`,
                    }}
                  />
                ))}
              </div>
              {/* A colour dot per label — without one, "Positive: 31 · Neutral:
                  18 · Negative: 7" gives no way to tell which bar segment is
                  which; the dot repeats each segment's own colour next to its
                  name. */}
              <div
                className="d"
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  gap: '4px 10px',
                  marginTop: 9,
                  color: 'var(--ink-3)',
                  fontWeight: 500,
                }}
              >
                {sentimentBuckets.map((bucket: any, index: number) => (
                  <span
                    key={bucket?.label || index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      flex: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <i
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: SENTIMENT_COLORS[sentimentBucketKey(bucket?.label)],
                        flex: 'none',
                      }}
                    />
                    {bucket?.label}: {bucket?.count}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="v num">—</div>
          )}
        </div>
      </div>

      <div className="sp-topics-table">
        <h3 className="sect-title" style={{ marginBottom: 8 }}>
          Topics
        </h3>
        <TableManager
          columns={topicColumns}
          staticData={topics}
          showPagination={false}
          emptyTablePlaceholder="No topics detected yet"
          splitStickyHeader
        />
      </div>

      <div className="sp-agents-table">
        <h3 className="sect-title" style={{ marginBottom: 8 }}>
          Agent sentiment ranking
        </h3>
        <TableManager
          columns={agentColumns}
          staticData={agentRows}
          showPagination={false}
          emptyTablePlaceholder="No agent sentiment data yet"
          splitStickyHeader
        />
      </div>
    </div>
  );
};

export default SpeechTextTab;
