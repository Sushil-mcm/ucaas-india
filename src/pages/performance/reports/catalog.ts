import type { ReportContext, ReportTable } from './builders';
import {
  abandonInsights,
  agentQueueDetail,
  agentSummary,
  callOutcomeSummary,
  campaignPerformance,
  contactListStatus,
  costSummary,
  dailyTrend,
  directionSummary,
  dnisPerformance,
  flowPerformance,
  mediaTypeSummary,
  queueIntervalHourly,
  queueSummary,
  repeatCallers,
  sentimentTopics,
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
        description: 'Time in each presence status with occupancy',
        unavailableReason:
          'Presence history exists per agent but only as a per-agent timeline, with no aggregate endpoint. Open the Activity report below and pick an agent to see theirs.',
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
        description: 'Wrap-up code usage broken down per queue',
        unavailableReason:
          'Queue dispositions can be saved but the platform exposes no endpoint to read them back in aggregate. Call Outcome Summary above is the closest real equivalent.',
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
        description: 'Demand and handling per ACD skill, with staffing',
        unavailableReason:
          'Queues here route by membership, not by skill. There is no skills model in the platform to report against.',
      },
      {
        id: 'language-performance',
        title: 'Language Performance',
        description: 'Volumes per queue routing language',
        unavailableReason: 'Interactions do not carry a routing language attribute.',
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
        description: 'Evaluations, average score and critical fails per agent',
        unavailableReason: 'No quality-management module is connected to this account.',
      },
      {
        id: 'adherence-summary',
        title: 'Adherence Summary',
        description: 'Schedule adherence and exceptions per agent',
        unavailableReason: 'No workforce-management schedules exist to measure adherence against.',
      },
      {
        id: 'forecast-vs-actual',
        title: 'Forecast vs Actual',
        description: 'Forecast volumes vs actual interactions per planning group',
        unavailableReason: 'No forecasting data is produced by the platform.',
      },
      {
        id: 'survey-csat',
        title: 'Survey Results (CSAT)',
        description: 'CSAT and NPS per queue from post-interaction surveys',
        unavailableReason:
          'Post-interaction surveys are not configured, so there are no responses to report.',
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
