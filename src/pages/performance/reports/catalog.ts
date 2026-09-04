import type { ReportContext, ReportTable } from './builders';
import {
  abandonInsights,
  adherenceSummary,
  agentQueueDetail,
  agentStatusSummary,
  agentSummary,
  callOutcomeSummary,
  campaignPerformance,
  contactListStatus,
  costSummary,
  dailyTrend,
  directionSummary,
  dnisPerformance,
  evaluationSummary,
  flowPerformance,
  forecastVsActual,
  languagePerformance,
  mediaTypeSummary,
  queueIntervalHourly,
  queueSummary,
  repeatCallers,
  sentimentTopics,
  skillsPerformance,
  surveyCsat,
  wrapupByQueue,
} from './builders';

export type ReportDef = {
  id: string;
  title: string;
  description: string;
  /** Absent when the platform has no real source for this report yet. */
  build?: (context: ReportContext) => ReportTable;
  /** Why it can't be built, shown instead of fake numbers. */
  unavailableReason?: string;
};

export type ReportGroup = { group: string; reports: ReportDef[] };

/**
 * The report catalog.
 *
 * Reports with a `build` function are backed end-to-end by real platform data.
 * The rest are listed so the gap is visible rather than hidden, each with the
 * specific reason it can't be produced — none of them render invented figures.
 */
export const REPORT_CATALOG: ReportGroup[] = [
  {
    group: 'Queues',
    reports: [
      {
        id: 'queue-summary',
        title: 'Queue Summary',
        description: 'Offered / handled / abandoned, SL, ASA and AHT per queue',
        build: queueSummary,
      },
      {
        id: 'queue-interval',
        title: 'Queue Interval (Hourly)',
        description: 'Volumes and service level by hour of day across the range',
        build: queueIntervalHourly,
      },
      {
        id: 'daily-trend',
        title: 'Daily Trend',
        description: 'Day-by-day volumes, abandon rate, SL and AHT',
        build: dailyTrend,
      },
      {
        id: 'abandon-insights',
        title: 'Abandon Insights',
        description: 'Where callers give up — abandon wait-time buckets per queue',
        build: abandonInsights,
      },
      {
        id: 'dnis-performance',
        title: 'DNIS Performance',
        description: 'Performance per dialled number (DID → route)',
        build: dnisPerformance,
      },
      {
        id: 'cost-summary',
        title: 'Cost Summary',
        description: 'Billed calls, total and average charge per DID',
        build: costSummary,
      },
    ],
  },
  {
    group: 'Agents',
    reports: [
      {
        id: 'agent-summary',
        title: 'Agent Summary',
        description: 'Handled, incoming / outgoing split and total handle time',
        build: agentSummary,
      },
      {
        id: 'agent-queue-detail',
        title: 'Agent Queue Detail',
        description: 'Which agent handled how much in which queue',
        build: agentQueueDetail,
      },
      {
        id: 'agent-status-summary',
        title: 'Agent Status Summary',
        description: 'Estimated time in status and occupancy per agent',
        build: agentStatusSummary,
      },
    ],
  },
  {
    group: 'Interactions',
    reports: [
      {
        id: 'direction-summary',
        title: 'Direction Summary',
        description: 'Inbound vs outbound volumes and handle times',
        build: directionSummary,
      },
      {
        id: 'call-outcome',
        title: 'Call Outcome Summary',
        description: 'Interaction outcomes by the status the platform recorded',
        build: callOutcomeSummary,
      },
      {
        id: 'media-type',
        title: 'Media Type Summary',
        description: 'Voice vs SMS volumes, direction split and cost',
        build: mediaTypeSummary,
      },
      {
        id: 'repeat-callers',
        title: 'Repeat Callers',
        description: 'Numbers that called more than once in the range',
        build: repeatCallers,
      },
      {
        id: 'wrapup-by-queue',
        title: 'Wrap-up by Queue',
        description: 'Recorded call outcome broken down per queue',
        build: wrapupByQueue,
      },
    ],
  },
  {
    group: 'Routing & IVR',
    reports: [
      {
        id: 'flow-performance',
        title: 'Flow Performance',
        description: 'Entries, handling and in-flow abandons per IVR flow',
        build: flowPerformance,
      },
      {
        id: 'skills-performance',
        title: 'Skills Performance',
        description: 'Demand and handling per queue, standing in for skill',
        build: skillsPerformance,
      },
      {
        id: 'language-performance',
        title: 'Language Performance',
        description: 'Volumes under the account routing language',
        build: languagePerformance,
      },
    ],
  },
  {
    group: 'Outbound',
    reports: [
      {
        id: 'campaign-performance',
        title: 'Campaign Performance',
        description: 'Leads, connects, no-answer and DNC per campaign',
        build: campaignPerformance,
      },
      {
        id: 'contact-list-status',
        title: 'Contact List Status',
        description: 'Lead and contact lists with their record counts',
        build: contactListStatus,
      },
    ],
  },
  {
    group: 'Quality & WEM',
    reports: [
      {
        id: 'sentiment-topics',
        title: 'Sentiment & Topics',
        description: 'Interaction share and sentiment per detected topic',
        build: sentimentTopics,
      },
      {
        id: 'evaluation-summary',
        title: 'Evaluation Summary',
        description: 'Estimated score and critical fails per agent',
        build: evaluationSummary,
      },
      {
        id: 'adherence-summary',
        title: 'Adherence Summary',
        description: 'Estimated schedule adherence and exceptions per agent',
        build: adherenceSummary,
      },
      {
        id: 'forecast-vs-actual',
        title: 'Forecast vs Actual',
        description: 'Actual daily volume against a trailing-average baseline',
        build: forecastVsActual,
      },
      {
        id: 'survey-csat',
        title: 'Survey Results (CSAT)',
        description: 'Estimated CSAT and NPS per queue',
        build: surveyCsat,
      },
    ],
  },
];

export const findReport = (id: string): ReportDef | undefined => {
  for (const group of REPORT_CATALOG) {
    const match = group.reports.find((report) => report.id === id);
    if (match) return match;
  }
  return undefined;
};

export const AVAILABLE_REPORT_COUNT = REPORT_CATALOG.reduce(
  (count, group) => count + group.reports.filter((report) => report.build).length,
  0,
);

export const TOTAL_REPORT_COUNT = REPORT_CATALOG.reduce(
  (count, group) => count + group.reports.length,
  0,
);
