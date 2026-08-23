import { useContext, useEffect, useMemo } from 'react';
import { SocketEvents } from '@/context/socket-events-context';
import { useUser } from '@/hooks/use-user';
import TableManager from '@/components/custom/table-manager';
import PerfStatCard from './stat-card';
import { formatSecsToClock } from './format';

/** Sentiment tone, on the shared status tokens rather than raw colours. */
const toneColor = (value: number) =>
  value > 15 ? 'var(--live)' : value < -15 ? 'var(--crit)' : 'var(--warn)';

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
        <span style={{ fontWeight: 700, color: toneColor(row.original.avgSentiment) }}>
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
    <div className="flex w-full flex-col gap-4 px-[22px] py-4">
      <p className="page-note">
        Sentiment for AI receptionist / chatbot handled calls, sourced from the same live data as
        the AI Wallboard. Human-agent call sentiment isn't aggregated yet — see individual calls'
        "Call Intelligence" panel under Interactions for those.
      </p>
      <div className="grid3">
        <div className="stat">
          <div className="k">Avg sentiment</div>
          <div
            className="v num"
            style={{ color: avgSentiment === null ? undefined : toneColor(avgSentiment) }}
          >
            {avgSentiment === null ? '—' : avgSentiment.toFixed(1)}
          </div>
        </div>
        <div className="stat">
          <div className="k">AI calls today</div>
          <div className="v num">{totalAiCalls}</div>
        </div>
        <div className="stat">
          <div className="k">Top topic</div>
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
        />
        <PerfStatCard label="Total AI chats" value={String(totalAiChats)} />
        <PerfStatCard label="Transferred to agent" value={String(transferredCalls)} />
        <PerfStatCard label="Handled by AI only" value={String(handledAiOnly)} />
        <PerfStatCard
          label="Avg AI call duration"
          value={avgAiDuration === null ? '—' : formatSecsToClock(avgAiDuration)}
        />
        <PerfStatCard label="Leads captured by AI" value={String(leadsCaptured)} />
        <PerfStatCard
          label="Voice vs text"
          value={
            voicePercent === null
              ? '—'
              : `${Math.round(voicePercent)}% / ${Math.round(textPercent ?? 0)}%`
          }
          sub="voice / text"
        />
        <div className="stat">
          <div className="k">Sentiment distribution</div>
          {sentimentBuckets.length ? (
            <>
              <div className="hbar-t" style={{ display: 'flex', marginTop: 9 }}>
                {sentimentBuckets.map((bucket: any, index: number) => (
                  <i
                    key={bucket?.label || index}
                    style={{
                      borderRadius: 0,
                      background: index % 2 === 0 ? 'var(--accent)' : 'var(--accent-edge)',
                      width: `${Math.max(0, Number(bucket?.percent) || 0)}%`,
                    }}
                  />
                ))}
              </div>
              <div className="d" style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
                {sentimentBuckets
                  .map((bucket: any) => `${bucket?.label}: ${bucket?.count}`)
                  .join(' · ')}
              </div>
            </>
          ) : (
            <div className="v num">—</div>
          )}
        </div>
      </div>

      <div>
        <h3 className="sect-title" style={{ marginBottom: 8 }}>
          Topics
        </h3>
        <TableManager
          columns={topicColumns}
          staticData={topics}
          showPagination={false}
          emptyTablePlaceholder="No topics detected yet"
        />
      </div>

      <div>
        <h3 className="sect-title" style={{ marginBottom: 8 }}>
          Agent sentiment ranking
        </h3>
        <TableManager
          columns={agentColumns}
          staticData={agentRows}
          showPagination={false}
          emptyTablePlaceholder="No agent sentiment data yet"
        />
      </div>
    </div>
  );
};

export default SpeechTextTab;
