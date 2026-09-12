import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callQueueSeries } from '@/services/api';
import type { QueueSeriesResponse, SeriesGranularity } from '@/lib/queue-series';

/**
 * Service level by hour or by day, per queue and in total, from the report
 * endpoint - which computes every figure from counts on the server and sums
 * the counts for the totals. Nothing here averages a percentage.
 *
 * Buckets are calendar hours or days in this browser's timezone, the same
 * zone every other report on the page already sends.
 */
export type QueueSeriesOptions = {
  granularity: SeriesGranularity;
  /** Empty means every queue of the company. */
  queueUuids?: string[];
  enabled?: boolean;
  refetchMs?: number;
};

export const useQueueSeries = (
  range: { from: string; to: string } | null | undefined,
  { granularity, queueUuids = [], enabled = true, refetchMs }: QueueSeriesOptions,
) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const uuids = useMemo(() => Array.from(new Set(queueUuids.filter(Boolean))).sort(), [queueUuids]);

  return useQuery<QueueSeriesResponse | null>({
    queryKey: ['queueServiceLevelSeries', range?.from, range?.to, granularity, timezone, uuids],
    queryFn: async () => {
      const res = await callQueueSeries({
        timezone,
        filter_date: { from: range?.from, to: range?.to },
        granularity,
        queue_uuids: uuids,
      });
      return (res?.data?.data?.result as QueueSeriesResponse | undefined) ?? null;
    },
    enabled: Boolean(enabled && range?.from && range?.to),
    refetchInterval: refetchMs,
    staleTime: 10000,
    /* Until the report service is installed this answers 404; retrying would
       only repeat it. The callers fall back to the call log on their own. */
    retry: false,
  });
};

export default useQueueSeries;
