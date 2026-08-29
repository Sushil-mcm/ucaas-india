/* Proves the snapshot contract: what gets stored, what is carried through, and
   that history cannot nest and grow without limit. */
let pass=0, fail=0;
const check=(n,c)=>{c?pass++:fail++; console.log(`    ${c?'PASS':'FAIL'}  ${n}`);};

// mirror of the save logic
function buildNext(stored, rebuilt, isEdit, who='Ana Silva') {
  const next = {...rebuilt};
  Object.keys(stored).forEach(k => {
    if (k !== 'previous_version' && !(k in next)) next[k] = stored[k];
  });
  if (isEdit && Object.keys(stored).length) {
    const before = {...stored};
    delete before.previous_version;
    next.previous_version = { settings: before, changed_at: '2026-08-29T09:00:00Z', changed_by: who };
  }
  return next;
}

const stored = { operational_hours:{type:'weekly'}, media:{welcome:'a.mp3'}, future_key:'from-backend' };
const rebuilt = { operational_hours:{type:'24_hours'}, media:{welcome:'b.mp3'} };

const v1 = buildNext(stored, rebuilt, true);
check('unknown key carried through', v1.future_key === 'from-backend');
check('snapshot holds the OLD hours', v1.previous_version.settings.operational_hours.type === 'weekly');
check('snapshot holds the OLD media', v1.previous_version.settings.media.welcome === 'a.mp3');
check('current holds the NEW hours', v1.operational_hours.type === '24_hours');
check('who changed it is recorded', v1.previous_version.changed_by === 'Ana Silva');

const v2 = buildNext(v1, {operational_hours:{type:'weekly'}}, true);
check('history does not nest', v2.previous_version.settings.previous_version === undefined);
check('only one step of history kept', JSON.stringify(v2).match(/previous_version/g).length === 1);
check('snapshot is the version before this save', v2.previous_version.settings.operational_hours.type === '24_hours');

const fresh = buildNext({}, rebuilt, false);
check('a brand new IVR gets no snapshot', fresh.previous_version === undefined);

// restore: hydration picks the snapshot
const pick = (s, restoring) => (restoring && s.previous_version?.settings) ? s.previous_version.settings : s;
check('restore loads the previous settings', pick(v1,true).operational_hours.type === 'weekly');
check('normal open loads current settings', pick(v1,false).operational_hours.type === '24_hours');

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
