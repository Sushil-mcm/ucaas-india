/* Proves the menu checks catch what strands a caller, and stay quiet otherwise. */
const fs = require('fs');
const { checkIvrMenu } = require('./ivr-checks.build.cjs');

let pass = 0, fail = 0;
const t = (name, cond) => { cond ? pass++ : fail++; console.log(`    ${cond ? 'PASS' : 'FAIL'}  ${name}`); };
const codes = (f) => f.map(x => x.code).sort();

const row = (key, type, value, label) => ({ key: { value: key }, forwardType: { value: type }, forwardValue: { value, label } });

// clean menu
const FALLBACKS = { timeout_action: { status: 'HANGUP' }, failure_action: { status: 'HANGUP' } };
let f = checkIvrMenu({ menu: { uuid: 'a', name: 'Main', generic: FALLBACKS,
  ivrActions: [row('1','QUEUE','q1','Sales'), row('2','EXTENSION','101','Ana')] } });
t('a sound menu reports nothing', f.length === 0);

// duplicate key
f = checkIvrMenu({ menu: { uuid: 'a', ivrActions: [row('2','QUEUE','q1'), row('2','EXTENSION','101')] } });
t('two rows on the same digit is an error', codes(f).includes('duplicate-key') && f[0].level === 'error');
t('the message names the key', /key 2/.test(f[0].message));

// points at itself
f = checkIvrMenu({ menu: { uuid: 'a', ivrActions: [row('1','IVR','a','Main')] } });
t('a menu pointing at itself is caught', codes(f).includes('points-at-itself'));

// no keys
f = checkIvrMenu({ menu: { uuid: 'a', ivrActions: [] } });
t('no keys is a warning, not an error', codes(f).includes('no-keys') && f[0].level === 'warning');

// ring of menus  a -> b -> a
const a = { uuid: 'a', name: 'Main',    ivrActions: [row('1','IVR','b','Support')] };
const b = { uuid: 'b', name: 'Support', ivr_option: [{ key: '1', type: 'IVR', value: 'a', label: 'Main' }] };
f = checkIvrMenu({ menu: a, allMenus: [a, b] });
t('a ring of two menus is caught', codes(f).includes('menu-loop'));
t('the loop message names both menus', /Main/.test(f.find(x=>x.code==='menu-loop').message) && /Support/.test(f.find(x=>x.code==='menu-loop').message));

// stored shape is read too
t('the stored shape (ivr_option) is understood', checkIvrMenu({ menu: b, allMenus: [a, b] }).length > 0);

// missing target
f = checkIvrMenu({ menu: { uuid: 'a', ivrActions: [row('1','QUEUE','gone','Old queue')] }, knownTargets: { QUEUE: ['q1','q2'] } });
t('a deleted target is caught', codes(f).includes('missing-target'));

// unknown list is not treated as empty
f = checkIvrMenu({ menu: { uuid: 'a', ivrActions: [row('1','QUEUE','q9')] }, knownTargets: { EXTENSION: ['101'] } });
t('a type we were not told about is not reported missing', !codes(f).includes('missing-target'));

// no way out
f = checkIvrMenu({ menu: { uuid: 'a', ivrActions: [row('1','IVR','b')] }, allMenus: [{uuid:'b',name:'B',ivrActions:[]}] });
t('all keys leading to menus is a warning', codes(f).includes('no-way-out'));

// # and * read naturally
f = checkIvrMenu({ menu: { uuid: 'a', ivrActions: [row('#','QUEUE','q1'), row('#','EXTENSION','1')] } });
t('# is described as # not "key #"', /^# is used/.test(f[0].message));

console.log('  --- the fallbacks ---');
f = checkIvrMenu({ menu: { uuid:'a', ivrActions:[row('1','QUEUE','q1')],
  generic:{ timeout_action:{status:'EXTENSION',type:{value:'IVR'},value:{value:'a'}},
            failure_action:{status:'HANGUP'} } } });
t('a timeout that returns to this menu is an error', codes(f).includes('fallback-loops'));
t('and it says what the caller did', /presses nothing/.test(f.find(x=>x.code==='fallback-loops').message));

f = checkIvrMenu({ menu: { uuid:'a', ivrActions:[row('1','QUEUE','q1')],
  generic:{ timeout_action:{status:'HANGUP'}, failure_action:{status:'HANGUP'} } } });
t('fallbacks that are set report nothing', f.length === 0);

f = checkIvrMenu({ menu: { uuid:'a', ivrActions:[row('1','QUEUE','q1')] } });
t('missing fallbacks are a warning', f.filter(x=>x.code==='no-fallback').length === 2);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
