import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { reportWindowFor } from '@/lib/campaign-dates';

import {
  callReportAgentList,
  getCampaignActivtyLogs,
  getCampaignComplianceReport,
  getCampaignLiveSnapshot,
} from '@/services/api';

/**
 * Where the campaign monitor gets its numbers.
 *
 * Four sources, all of them real, none of them derived twice:
 *
 *   engine board   /campaign/live/snapshot and the "campaign-live-stats"
 *                  socket push. What is happening this second: calls up,
 *                  agent duty, this run's counters. It exists only while the
 *                  engine holds the campaign in memory.
 *   lead states    /campaign/call/statistics. Every lead of the campaign
 *                  counted by its own outcome at the moment of asking, plus
 *                  the lead rows themselves. Survives restarts; this is the
 *                  answer to "how far through the list are we".
 *   call history   /campaign/compliance/report. The campaign call log grouped
 *                  by day and by outgoing number: calls, answered, abandoned,
 *                  machine, busy, no answer, callbacks, talk time, and the
 *                  abandon rate the rule measures. Up to 93 days.
 *   agent calls    /tenant/report/agents. Per extension over a window, from
 *                  the switch's own call history.
 *
 * Nothing here invents a metric. Where a figure cannot be sourced (per agent
 * PER CAMPAIGN, which no endpoint groups today) the screen says so rather
 * than showing a number that means something else.
 */

export type CampaignLeadStates = {
  totalCall: number;
  DialedCall: number;
  PendingCall: number;
  connected: number;
  DialedButNotAnswered: number;
  dnc: number;
};

export type HistoryRow = {
  day: string;
  didNumber?: string | null;
  calls: number;
  answered: number;
  abandoned: number;
  machine: number;
  busy: number;
  noAnswer: number;
  callbacks: number;
  talkSeconds: number;
  answeredLive: number;
  abandonRatePercent: number;
  overCap: boolean;
};

export type CampaignHistory = {
  window: { from: string; to: string; timezone: string; abandonCapPercent: number };
  totals: Omit<HistoryRow, 'day' | 'didNumber'>;
  byDay: HistoryRow[];
  byNumber: HistoryRow[];
  daysOverCap: number;
};

const asNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The days the call-log figures cover: the campaign's run, in its own zone.
 * The rule is src/lib/campaign-dates.ts reportWindowFor (pure, tested).
 */
export const reportWindow = reportWindowFor;

/**
 * The engine board over HTTP.
 *
 * The socket push is the fast path, but it only arrives while the browser is
 * in the tenant's room and only every few seconds; a page opened between two
 * pushes used to show nothing at all. This asks directly, then keeps asking
 * slowly as a safety net. A campaign that is not running answers 404, which
 * is an answer, not an error - the board is simply not there.
 */
export const useLiveSnapshot = (campaignId: string, isRunning = true) =>
  useQuery({
    queryKey: ['campaignLiveSnapshot', campaignId],
    queryFn: () => getCampaignLiveSnapshot({ campaignId }),
    select: (response: any) => response?.data?.data?.result || null,
    enabled: Boolean(campaignId),
    /* A running campaign is worth asking about often; a stopped one is asked
       once, in case the engine is still holding the last board, and then left
       alone rather than polling a 404 all day. */
    refetchInterval: isRunning ? 8000 : false,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 0,
  });

/**
 * Every lead of the campaign, counted by its own outcome.
 *
 * `refreshEverySeconds` keeps the counts moving while the campaign runs.
 * Without it the page read the leads once, when it opened, and kept that
 * reading: on 9 Sep the contact list still said "Dialled, no answer 1" for a
 * lead the server had long since counted as answered (row #12).
 */
export const useCampaignStates = (campaignId: string, refreshEverySeconds = 0) => {
  const query = useQuery({
    queryKey: ['campaignOutcomeStates', campaignId],
    queryFn: () =>
      getCampaignActivtyLogs({
        page: 1,
        limit: 1,
        filters: [{ key: 'campaign_uuid', value: campaignId }],
      }),
    select: (response: any) => response?.data?.data?.result?.states || null,
    enabled: Boolean(campaignId),
    staleTime: 30 * 1000,
    refetchInterval: refreshEverySeconds > 0 ? refreshEverySeconds * 1000 : false,
    refetchOnWindowFocus: false,
  });

  const states: CampaignLeadStates | null = query.data
    ? {
        totalCall: asNumber(query.data.totalCall),
        DialedCall: asNumber(query.data.DialedCall),
        PendingCall: asNumber(query.data.PendingCall),
        connected: asNumber(query.data.connected),
        DialedButNotAnswered: asNumber(query.data.DialedButNotAnswered),
        dnc: asNumber(query.data.dnc),
      }
    : null;

  return { ...query, states };
};

/**
 * The lead list itself, one page at a time.
 *
 * `filterKey` is the server's own vocabulary: DialedCall, PendingCall,
 * connected, DialedButNotAnswered, dnc. Anything else means "every lead".
 */
export const useCampaignLeads = ({
  campaignId,
  filterKey,
  page = 1,
  limit = 25,
  search = '',
  enabled = true,
}: {
  campaignId: string;
  filterKey?: string;
  page?: number;
  limit?: number;
  search?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: ['campaignLeadRows', campaignId, filterKey || 'all', page, limit, search],
    queryFn: () =>
      getCampaignActivtyLogs({
        page,
        limit,
        ...(search ? { search } : {}),
        sort: { key: 'callEndTime', desc: true },
        filters: [
          { key: 'campaign_uuid', value: campaignId },
          ...(filterKey ? [{ key: filterKey, value: true }] : []),
        ],
      }),
    select: (response: any) => ({
      rows: response?.data?.data?.result?.rows || [],
      total: asNumber(response?.data?.data?.result?.total),
    }),
    enabled: Boolean(campaignId) && enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

/** The campaign call log, grouped by day and by outgoing number. */
export const useCampaignHistory = ({
  campaignId,
  from,
  to,
  timezone,
  abandonCapPercent,
  enabled = true,
  refreshEverySeconds = 0,
}: {
  campaignId: string;
  from: string;
  to: string;
  timezone: string;
  abandonCapPercent: number;
  enabled?: boolean;
  /** Re-read while the campaign runs; see useCampaignStates. */
  refreshEverySeconds?: number;
}) =>
  useQuery({
    queryKey: ['campaignCallHistory', campaignId, from, to, timezone, abandonCapPercent],
    queryFn: () =>
      getCampaignComplianceReport({ campaignId, from, to, timezone, abandonCapPercent }),
    select: (response: any): CampaignHistory | null => response?.data?.data?.result || null,
    enabled: Boolean(campaignId) && enabled,
    staleTime: 60 * 1000,
    refetchInterval: refreshEverySeconds > 0 ? refreshEverySeconds * 1000 : false,
    refetchOnWindowFocus: false,
  });

/**
 * How many leads carry each disposition an agent can pick.
 *
 * There is no per-campaign disposition report, but the lead query already
 * filters on the disposition name and answers with a total, so one cheap
 * count per configured disposition gives the mix. Names, not ids: the lead
 * stores `disposition.disposition`, which is what the filter matches.
 */
export const useDispositionMix = ({
  campaignId,
  names,
  enabled = true,
}: {
  campaignId: string;
  names: string[];
  enabled?: boolean;
}) => {
  const results = useQueries({
    queries: names.map((name) => ({
      queryKey: ['campaignDispositionCount', campaignId, name],
      queryFn: () =>
        getCampaignActivtyLogs({
          page: 1,
          limit: 1,
          filters: [
            { key: 'campaign_uuid', value: campaignId },
            { key: 'disposition_uuid', value: name },
          ],
        }),
      select: (response: any) => asNumber(response?.data?.data?.result?.total),
      enabled: Boolean(campaignId) && enabled && Boolean(name),
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  return useMemo(
    () => ({
      isLoading: results.some((result) => result.isLoading),
      rows: names.map((name, index) => ({ name, count: asNumber(results[index]?.data) })),
    }),
    [names, results],
  );
};

/**
 * Per-extension call figures from the switch's own history.
 *
 * The endpoint needs the extensions spelled out - it loops over them - and it
 * has no campaign filter, so these are ALL of that person's calls in the
 * window. The screen must say so; it is still the only per-agent measurement
 * the platform can produce today.
 */
export const useAgentCallReport = ({
  extensions,
  from,
  to,
  timezone,
  enabled = true,
}: {
  extensions: string[];
  from: string;
  to: string;
  timezone: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: ['campaignAgentCallReport', extensions.join(','), from, to, timezone],
    queryFn: () =>
      callReportAgentList({
        page: 1,
        limit: Math.max(1, extensions.length),
        timezone,
        extensions,
        filter_date: { from, to },
      }),
    select: (response: any) => response?.data?.data?.result?.rows || [],
    enabled: enabled && extensions.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

/* ── shaping ──────────────────────────────────────────────────────────── */

export const hhmm = (seconds: number) => {
  const total = Math.max(0, Math.round(asNumber(seconds)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
};

export const rate = (part: number, whole: number) =>
  whole > 0 ? Math.round((asNumber(part) / asNumber(whole)) * 1000) / 10 : 0;
