import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLANK_PARENT,
  ROLE_PRESETS,
  buildPresetPermission,
  systemRoleUuid,
} from './role-presets';
import { ROLE_DESCRIPTION_PATTERN, ROLE_NAME_PATTERN } from './name-rules';

/* A small plan tree in the shape the company endpoint returns: module keys,
   `IS_SHOW`, and boolean leaves. Enough to tell the agent's tools from the
   settings that shape them. */
const plan = {
  campaign: { IS_SHOW: true, action: { view: true, add: true, edit: true, delete: true } },
  chat: { IS_SHOW: true, action: { view: true } },
  omni_channel: { IS_SHOW: true, action: { view: true, reply: true } },
  phone_system_action: { IS_SHOW: true, action: { view: true, edit: true } },
  monitoring: { IS_SHOW: true, action: { listen: true, whisper: true } },
  billing: { IS_SHOW: true, action: { view: true, pay: true } },
  account_setting: { IS_SHOW: true, access: { USER: { action: { view: true, add: true } } } },
  reports: { IS_SHOW: true, action: { own: true, team: true, all: true } },
  agent_workday: { IS_SHOW: true, duty_own: true, duty_others: true },
};

const agent = ROLE_PRESETS.find((preset) => preset.id === 'agent')!;

test('the agent preset exists, is an agent on the server, and reads as an agent', () => {
  assert.ok(agent, 'an agent preset is offered');
  assert.equal(agent.parent, 'AGENT');
  assert.equal(agent.tier, 'agent');
  /* The server reserves the four built-in names; this must not be one. */
  assert.notEqual(agent.name.trim().toUpperCase(), 'AGENT');
});

test('the agent preset grants the tools of the job and withholds the settings', () => {
  const tree = buildPresetPermission(agent, plan);
  assert.equal(tree.campaign.action.view, true, 'works a campaign');
  assert.equal(tree.campaign.action.add, false, 'does not build one');
  assert.equal(tree.chat.action.view, true, 'chat');
  assert.equal(tree.omni_channel.action.reply, true, 'shared inbox');
  assert.equal(tree.phone_system_action.action.view, true, 'sees the queue');
  assert.equal(tree.phone_system_action.action.edit, false, 'cannot change it');
  assert.equal(tree.monitoring.action.listen, false, 'no supervision');
  assert.equal(tree.billing.action.view, false, 'no billing');
  assert.equal(tree.billing.IS_SHOW, false, 'billing module hidden');
  assert.equal(tree.account_setting.access.USER.action.add, false, 'no people admin');
  assert.equal(tree.reports.action.own, true, 'own reports');
  assert.equal(tree.reports.action.all, false, 'not the whole company');
  assert.equal(tree.agent_workday.duty_own, true, 'own shift');
  assert.equal(tree.agent_workday.duty_others, false, 'nobody else’s');
});

test('every preset names a parent the server accepts, and never the owner', () => {
  for (const preset of ROLE_PRESETS) {
    assert.ok(['MANAGER', 'SUB-ADMIN', 'SUPERVISOR', 'AGENT'].includes(preset.parent), preset.id);
  }
  assert.equal(BLANK_PARENT, 'AGENT');
});

test('every preset name and description pass the form rules as typed', () => {
  for (const preset of ROLE_PRESETS) {
    assert.match(preset.name, ROLE_NAME_PATTERN, preset.id);
    assert.match(preset.description, ROLE_DESCRIPTION_PATTERN, `${preset.id}: ${preset.description}`);
  }
});

test('the parent is looked up by stored name among the built-in rows only', () => {
  const rows = [
    { role_uuid: 'r-admin', name: 'ADMIN', company_uuid: 'PREDEFINED', type: 'system' },
    { role_uuid: 'r-agent', name: 'Agent', company_uuid: 'PREDEFINED', type: 'system' },
    { role_uuid: 'r-sub', name: 'sub_admin', company_uuid: 'PREDEFINED', type: 'system' },
    { role_uuid: 'r-agent', uuid: 'c-1', name: 'AGENT', company_uuid: 'co-1', type: 'custom' },
  ];
  assert.equal(systemRoleUuid(rows, 'AGENT'), 'r-agent');
  assert.equal(systemRoleUuid(rows, 'SUB-ADMIN'), 'r-sub');
  assert.equal(systemRoleUuid(rows, 'MANAGER'), '', 'missing row gives empty, not a guess');
  assert.equal(systemRoleUuid(null, 'AGENT'), '');
});
