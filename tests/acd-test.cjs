const { decideAcdRing, pickQueueForAgent } = require('./acd.build.cjs');
let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };
const NOW = 1_000_000;
const A = (id, state, rating, idleSince, wrapUpSeconds) => ({ id, state, rating, idleSince, wrapUpSeconds });

console.log('  --- who is ringable ---');
let d = decideAcdRing({ rules: { steps:[{waitSeconds:0}], order:'all-at-once' },
  agents:[A('a','available'),A('b','busy'),A('c','on-a-call'),A('d','off-duty')], waitedSeconds:0, now:NOW });
t('only available people ring', d.ring.length === 1 && d.ring[0].id === 'a');
t('busy is not rung — it is a choice, not idleness', !d.ring.find(x=>x.id==='b'));

console.log('  --- wrap-up ---');
d = decideAcdRing({ rules:{steps:[{waitSeconds:0}],order:'all-at-once'},
  agents:[A('a','wrapping-up',100,NOW-5,30)], waitedSeconds:0, now:NOW });
t('somebody mid wrap-up does not ring', d.ring.length === 0);
t('we are told when they free up', d.changesInSeconds === 25);
d = decideAcdRing({ rules:{steps:[{waitSeconds:0}],order:'all-at-once'},
  agents:[A('a','wrapping-up',100,NOW-40,30)], waitedSeconds:0, now:NOW });
t('wrap-up finished means ringable again', d.ring.length === 1);

console.log('  --- widening steps ---');
const rules = { steps:[{waitSeconds:20,minimumRating:80},{waitSeconds:20,minimumRating:50},{waitSeconds:0}], order:'highest-rated-first' };
const team = [A('expert','available',90,NOW-10), A('mid','available',60,NOW-99), A('new','available',10,NOW-5)];
d = decideAcdRing({ rules, agents:team, waitedSeconds:0, now:NOW });
t('step 1 rings only the highest rated', d.ring.length===1 && d.ring[0].id==='expert');
t('step 1 says so', /Step 1 of 3/.test(d.reason));
t('next step is 20s away', d.changesInSeconds === 20);
d = decideAcdRing({ rules, agents:team, waitedSeconds:25, now:NOW });
t('step 2 widens rather than swaps', d.ring.length===2 && d.ring.map(a=>a.id).includes('expert'));
d = decideAcdRing({ rules, agents:team, waitedSeconds:60, now:NOW });
t('final step includes everybody', d.ring.length===3);
t('nothing further changes on its own', d.changesInSeconds === null);

console.log('  --- ordering ---');
t('highest rated first', d.ring[0].id === 'expert');
d = decideAcdRing({ rules:{steps:[{waitSeconds:0}],order:'longest-idle-first'}, agents:team, waitedSeconds:0, now:NOW });
t('longest idle first', d.ring[0].id === 'mid');
d = decideAcdRing({ rules:{steps:[{waitSeconds:0}],order:'highest-rated-first'},
  agents:[A('x','available',80,NOW-5),A('y','available',80,NOW-90)], waitedSeconds:0, now:NOW });
t('equal ratings tie-break on longest idle', d.ring[0].id === 'y');

console.log('  --- unrated people ---');
d = decideAcdRing({ rules:{steps:[{waitSeconds:0,minimumRating:90}],order:'all-at-once'},
  agents:[A('unrated','available')], waitedSeconds:0, now:NOW });
t('an unrated person counts as 100, not 0', d.ring.length === 1);

console.log('  --- giving up ---');
d = decideAcdRing({ rules:{steps:[{waitSeconds:0}],order:'all-at-once',giveUpAfterSeconds:60},
  agents:[A('a','available')], waitedSeconds:60, now:NOW });
t('past the limit, nobody is rung', d.ring.length === 0);
t('and it says why', /failover/.test(d.reason));

console.log('  --- reasons an admin can read ---');
d = decideAcdRing({ rules:{steps:[{waitSeconds:0}],order:'all-at-once'}, agents:[], waitedSeconds:0, now:NOW });
t('empty queue is named as such', /Nobody is in this queue/.test(d.reason));
d = decideAcdRing({ rules:{steps:[{waitSeconds:0,minimumRating:95}],order:'all-at-once'},
  agents:[A('a','available',50)], waitedSeconds:0, now:NOW });
t('rating shut-out is explained', /rated 95 or above/.test(d.reason));
d = decideAcdRing({ rules:{steps:[{waitSeconds:0}],order:'all-at-once'},
  agents:[A('a','busy'),A('b','off-duty')], waitedSeconds:0, now:NOW });
t('states are counted in the reason', /on other work/.test(d.reason) && /signed out/.test(d.reason));

console.log('  --- queue priority ---');
t('higher priority wins', pickQueueForAgent([{priority:1},{priority:5}]).priority === 5);
t('equal priority: longer wait wins', pickQueueForAgent([{priority:1,longestWaitSeconds:10},{priority:1,longestWaitSeconds:99}]).longestWaitSeconds === 99);
t('no queues is null, not a crash', pickQueueForAgent([]) === null);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
