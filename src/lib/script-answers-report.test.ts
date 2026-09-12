/* node --test, after bundling with esbuild (see HANDOVER.md for the command). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { csvText, csvValue } from './csv-download';
import {
  CSV_HEAD,
  rangeToIso,
  reportCsvRows,
  reportNote,
  sampleMeta,
  type ScriptAnswersReport,
} from './script-answers-report';

const report: ScriptAnswersReport = {
  script: { id: 'aaaaaaaaaaaaaaaaaaaaaaa1', name: 'Renewal' },
  from: '2026-09-01T00:00:00.000Z',
  to: '2026-09-30T23:59:59.999Z',
  holders: [{ id: 'c1', name: 'Autumn', type: 'campaign' }],
  narrowed_to: [],
  truncated: false,
  max_rows: 10000,
  calls_with_script: 4,
  calls_with_answers: 3,
  answer_rate_percent: 75,
  extra_keys: [],
  questions: [
    {
      key: 'consent',
      label: 'Consent given',
      kind: 'checkbox',
      answered: 3,
      unanswered: 1,
      answer_rate_percent: 75,
      options: [
        { value: 'Yes', count: 2, percent_of_answered: 66.7, in_script: true },
        { value: 'No', count: 1, percent_of_answered: 33.3, in_script: true },
      ],
    },
    {
      key: 'plan',
      label: 'Plan',
      kind: 'dropdown',
      answered: 2,
      unanswered: 2,
      answer_rate_percent: 50,
      options: [
        { value: 'Gold', count: 1, percent_of_answered: 50, in_script: true },
        { value: 'Bronze', count: 1, percent_of_answered: 50, in_script: false },
      ],
    },
    {
      key: 'seats',
      label: 'Seats',
      kind: 'number',
      answered: 2,
      unanswered: 2,
      answer_rate_percent: 50,
      number: { min: 4, avg: 7.333, max: 10, count: 2 },
    },
    {
      key: 'why',
      label: 'Why not',
      kind: 'text',
      answered: 1,
      unanswered: 3,
      answer_rate_percent: 25,
      text: {
        total: 1,
        samples: [
          {
            text: 'too dear, "really"',
            at: '2026-09-03T10:00:00.000Z',
            contact: 'Ann',
            agent: 'Agent A',
            call_id: 'c1',
            via: 'Autumn',
          },
        ],
      },
    },
  ],
};

test('CSV rows: one per choice, one per number statistic, one per written answer', () => {
  const rows = reportCsvRows(report);
  assert.equal(rows.length, 2 + 2 + 3 + 1);
  assert.deepEqual(rows[0].slice(0, 7), ['Consent given', 'Yes / no', 'Yes', 2, '66.7%', 3, 4]);
  assert.equal(rows[3][2], 'Bronze (no longer offered)');
  assert.deepEqual(rows[4].slice(2, 4), ['Lowest', '4']);
  assert.deepEqual(rows[5].slice(2, 4), ['Average', '7.33']);
  assert.equal(rows[7][2], 'too dear, "really"');
  assert.equal(rows[7][8], 'Ann');
  assert.equal(rows[0].length, CSV_HEAD.length);
  assert.ok(rows.every((row) => row.length === CSV_HEAD.length));
});

test('CSV text escapes commas and quotes the standard way', () => {
  assert.equal(csvValue('plain'), 'plain');
  assert.equal(csvValue('a,b'), '"a,b"');
  assert.equal(csvValue('say "hi"'), '"say ""hi"""');
  assert.equal(csvValue(null), '');
  const text = csvText(['A', 'B'], [['x', 1], ['y,z', null]]);
  assert.equal(text, 'A,B\nx,1\n"y,z",');
});

test('a day range becomes that whole local day; moments pass through; junk is null', () => {
  const day = rangeToIso({ from: '2026-09-01', to: '2026-09-02' });
  assert.ok(day);
  assert.ok(new Date(day!.from).getTime() < new Date(day!.to).getTime());
  assert.equal(new Date(day!.to).getTime() - new Date(day!.from).getTime(), 2 * 86400000 - 1);
  const iso = rangeToIso({ from: '2026-09-01T05:00:00.000Z', to: '2026-09-01T06:00:00.000Z' });
  assert.deepEqual(iso, { from: '2026-09-01T05:00:00.000Z', to: '2026-09-01T06:00:00.000Z' });
  assert.equal(rangeToIso({ from: '', to: '2026-09-01' }), null);
  assert.equal(rangeToIso(null), null);
});

test('the note says when the count was capped or the script changed', () => {
  assert.match(reportNote(report), /every call that had this script open/);
  assert.doesNotMatch(reportNote(report), /latest 10,000/);
  assert.match(reportNote({ ...report, truncated: true }), /latest 10,000/);
  assert.match(reportNote({ ...report, extra_keys: ['old_key'] }), /old_key/);
  assert.equal(reportNote(null), '');
});

test('a written answer is labelled with who, through what, and when', () => {
  const meta = sampleMeta(report.questions[3].text!.samples[0]);
  assert.match(meta, /^Ann · by Agent A · via Autumn · 3 Sep 2026/);
  assert.equal(sampleMeta({ text: 'x', at: null, contact: null, agent: null, call_id: null, via: null }), '');
});
