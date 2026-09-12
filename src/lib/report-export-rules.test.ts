/* Who sees the Export button on the agent reports.
   Bundled by tests/run-stage-d.sh (with the user-context stub); node --test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { canExportAgentReports, canExportReport, isAgentReport } from './report-export-rules';

const as = (role: string, tree?: Record<string, any>) => ({
  user_info: { role, ...(tree ? { custom_role_data: { permission: tree } } : {}) },
});

test('an AGENT never exports an agent report; managers and the owner do', () => {
  assert.equal(canExportReport(as('AGENT'), 'agent-status-summary'), false);
  assert.equal(canExportAgentReports(as('AGENT')), false);
  assert.equal(canExportReport(as('MANAGER'), 'agent-status-summary'), true);
  assert.equal(canExportReport(as('SUPERVISOR'), 'agent-status-summary'), true);
  assert.equal(canExportReport(as('SUB-ADMIN'), 'agent-status-summary'), true);
  assert.equal(canExportReport(as('ADMIN'), 'agent-status-summary'), true);
  /* an unknown or custom role reads the AGENT column */
  assert.equal(canExportReport(as('Team lead'), 'agent-status-summary'), false);
  assert.equal(canExportReport(null, 'agent-status-summary'), false);
});

test('queue and campaign reports are not gated by the agent-report key', () => {
  assert.equal(isAgentReport('queue-summary'), false);
  assert.equal(isAgentReport('agent-summary'), true);
  assert.equal(canExportReport(as('AGENT'), 'queue-summary'), true);
  assert.equal(canExportReport(as('AGENT'), 'campaign-performance'), true);
});

test('a custom role\'s tick box decides: ticked exports, unticked refuses a manager', () => {
  const ticked = { agent_workday: { IS_SHOW: true, action: { reports_agents_export: true } } };
  const unticked = { agent_workday: { IS_SHOW: true, action: { reports_agents_export: false } } };
  assert.equal(canExportReport(as('Team lead', ticked), 'agent-status-summary'), true);
  assert.equal(canExportReport(as('MANAGER', unticked), 'agent-status-summary'), false);
  /* the owner is never narrowed */
  assert.equal(canExportReport(as('ADMIN', unticked), 'agent-status-summary'), true);
});
