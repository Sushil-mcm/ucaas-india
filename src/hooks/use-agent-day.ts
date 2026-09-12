import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  AgentDayParams,
  getAgentDayBreaks,
  getAgentDayIntervals,
  getAgentDayPreview,
  getAgentDaySummary,
} from '@/services/api';

/* Agent-day reports: where each person's day went, read from the duty
   history through campaign-api. Dates are calendar days in the browser's
   time zone unless the caller says otherwise. */

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const todayText = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

type Kind = 'summary' | 'intervals' | 'breaks' | 'preview';
const CALLS: Record<Kind, (p: AgentDayParams) => Promise<any>> = {
  summary: getAgentDaySummary,
  intervals: getAgentDayIntervals,
  breaks: getAgentDayBreaks,
  preview: getAgentDayPreview,
};

export const useAgentDay = (
  kind: Kind,
  params: Omit<AgentDayParams, 'timezone'> & { timezone?: string },
  options: { enabled?: boolean; refetchInterval?: number } = {},
) => {
  const timezone = params.timezone || browserTimeZone();
  const full: AgentDayParams = { ...params, timezone };
  const query = useQuery({
    queryKey: ['agentDay', kind, full],
    queryFn: () => CALLS[kind](full),
    enabled: options.enabled !== false && Boolean(full.date_from && full.date_to),
    refetchInterval: options.refetchInterval,
    staleTime: 30 * 1000,
  });
  const data = query.data?.data?.data || {};
  return {
    rows: (data.rows || []) as any[],
    range: data.range as { date_from: string; date_to: string; timezone: string; days: number } | undefined,
    sources: (data.sources || {}) as Record<string, string>,
    now: Number(data.now) || 0,
    /* The server cuts a reply at its row cap and says so. */
    truncated: Boolean(data.truncated),
    maxRows: Number(data.max_rows) || 0,
    timezone,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error as any,
    refetch: query.refetch,
  };
};

/* "Today so far" for everyone: one summary request for today, keyed by
   person. Today is the BROWSER's today on purpose: the person looking wants
   their own day; the screen says which zone it is. The report screens use
   the company's zone instead (hooks/use-company-time-zone). */
export const useAgentDayToday = (enabled = true) => {
  const timezone = browserTimeZone();
  const today = todayText(timezone);
  const result = useAgentDay('summary', { date_from: today, date_to: today, timezone }, { enabled, refetchInterval: 60 * 1000 });
  const byUser = useMemo(() => {
    const map: Record<string, any> = {};
    result.rows.forEach((row) => {
      map[String(row.user_uuid)] = row;
    });
    return map;
  }, [result.rows]);
  return { ...result, byUser, today, timeZone: timezone };
};
