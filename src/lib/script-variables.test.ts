import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCRIPT_VARIABLES,
  resolveScriptNodes,
  resolveScriptText,
  sampleScriptValues,
  scriptValuesFromCall,
} from './script-variables';

test('sample values cover every catalogue token with its example, under the live keys', () => {
  const sample = sampleScriptValues();
  const live = scriptValuesFromCall({});
  for (const variable of SCRIPT_VARIABLES) {
    assert.equal(sample[variable.token.toLowerCase()], variable.example, variable.token);
    assert.ok(variable.token.toLowerCase() in live, `${variable.token} has no live counterpart`);
  }
  assert.equal(
    resolveScriptText('Hi {{ customer.firstname }}, this is {{Agent.Name}} from {{Company.Name}}', sample),
    'Hi Priya, this is Sam Taylor from Northwind Travel',
  );
});

test('resolving copies the tree and leaves unknown tokens blank', () => {
  const nodes = [{ type: 'paragraph', children: [{ text: '{{Nope.Thing}}|{{Queue.Name}}' }] }];
  const out = resolveScriptNodes(nodes, sampleScriptValues());
  assert.equal(out[0].children[0].text, '|Billing');
  assert.equal(nodes[0].children[0].text, '{{Nope.Thing}}|{{Queue.Name}}', 'stored script untouched');
});
