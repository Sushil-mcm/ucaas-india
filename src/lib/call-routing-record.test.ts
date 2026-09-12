import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCallRoutingRecord, describeCallRouting } from './call-routing-record';

/* The only queue on the platform that asks for skills asks for ONE category,
   so one row is the case that actually happens. It used to render the generic
   "skill requirement dropped" because the wording was gated on more than one
   row. */
const flow = (extra: Record<string, unknown>) =>
  JSON.stringify({ polls: 1, round: 1, rounds: 2, held: 0, ...extra });

test('one row that dropped names the category, not "skill requirement"', () => {
  const record = parseCallRoutingRecord(
    flow({ dropped: true, rows: [{ category: 'Language', skills: ['Hindi'], bar: 0, state: 'dropped' }] }),
  );
  const text = describeCallRouting(record);
  assert.ok(text.includes('Language dropped'), text);
  assert.ok(!text.includes('skill requirement dropped'), text);
});

test('one row that relaxed says so, and to what', () => {
  const record = parseCallRoutingRecord(
    flow({ rows: [{ category: 'Language', skills: ['Hindi'], bar: 1, state: 'relaxed' }] }),
  );
  assert.ok(describeCallRouting(record).includes('Language relaxed to 1 star'));
});

test('two rows still list both', () => {
  const record = parseCallRoutingRecord(
    flow({
      rows: [
        { category: 'Language', skills: ['Hindi'], bar: 1, state: 'relaxed' },
        { category: 'General', skills: ['accounting'], bar: 0, state: 'dropped' },
      ],
    }),
  );
  const text = describeCallRouting(record);
  assert.ok(text.includes('Language relaxed to 1 star') && text.includes('General dropped'), text);
});

test('a row that held is not reported as having given way', () => {
  const record = parseCallRoutingRecord(
    flow({ rows: [{ category: 'Language', skills: ['Hindi'], bar: 3, state: 'held' }] }),
  );
  const text = describeCallRouting(record);
  assert.ok(!/dropped|relaxed|set aside/.test(text), text);
});

test('no rows at all still falls back to the scalar wording', () => {
  const record = parseCallRoutingRecord(flow({ dropped: true }));
  assert.ok(describeCallRouting(record).includes('skill requirement dropped'));
});

test('skills arriving as an object (lunajson encodes [] as {}) does not crash', () => {
  const raw = '{"polls":1,"held":0,"rows":[{"category":"General","skills":{},"bar":0,"state":"dropped"}]}';
  const record = parseCallRoutingRecord(raw);
  assert.deepEqual(record?.rows[0].skills, []);
  assert.ok(describeCallRouting(record).includes('General dropped'));
});
