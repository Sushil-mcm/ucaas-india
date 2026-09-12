/* Who may export which report.
 *
 * The agent reports (Performance › Reports › Agents group, Reports › Agent
 * reports › Day and Breaks) carry other people's days; reading them is
 * `reports.agents.view` (an AGENT gets their own day only) and taking them
 * out of the building as a file is `reports.agents.export`, which the AGENT
 * column does not have. Queue and campaign reports keep their existing
 * behaviour: no extra gate here. The server does not export anything — the
 * CSV is built in the browser from what the person could already see — so
 * this rule decides only whether the button is shown. */

import { can, type WorkdayUserLike } from './workday-permissions';

export const EXPORT_KEY = 'reports.agents.export' as const;

/* Report ids in the Agents group of the catalog, and the two tabs. */
export const isAgentReport = (reportId: unknown): boolean => /^agent-/.test(String(reportId ?? ''));

export const canExportReport = (user: WorkdayUserLike | null | undefined, reportId: unknown): boolean =>
  !isAgentReport(reportId) || can(user, EXPORT_KEY);

export const canExportAgentReports = (user: WorkdayUserLike | null | undefined): boolean =>
  can(user, EXPORT_KEY);
