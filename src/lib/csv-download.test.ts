/* The one CSV writer: quoting, the BOM, the file name.
   Bundled by tests/run-stage-d.sh; run with node --test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CSV_BOM, csvFileName, csvFileText, csvText, csvValue } from './csv-download';

test('cells: commas, quotes, newlines and carriage returns are quoted; quotes doubled', () => {
  assert.equal(csvValue('plain'), 'plain');
  assert.equal(csvValue('a,b'), '"a,b"');
  assert.equal(csvValue('say "hi"'), '"say ""hi"""');
  assert.equal(csvValue('two\nlines'), '"two\nlines"');
  assert.equal(csvValue('old\r\nmac'), '"old\r\nmac"');
  assert.equal(csvValue(null), '');
  assert.equal(csvValue(undefined), '');
  assert.equal(csvValue(0), '0');
  assert.equal(csvValue(27.1), '27.1');
  assert.equal(csvValue(false), 'false');
  /* the report's own symbols pass through untouched */
  assert.equal(csvValue('2:00:00 ≈'), '2:00:00 ≈');
  assert.equal(csvValue('Lunch ×1 15:00'), 'Lunch ×1 15:00');
});

test('text: heading first, one line per row, no trailing newline; the file adds the BOM', () => {
  const text = csvText(['Agent', 'Signed in'], [['Asha, Rao', '8:00:00'], ['Priya', 0]]);
  assert.equal(text, 'Agent,Signed in\n"Asha, Rao",8:00:00\nPriya,0');
  assert.equal(csvFileText(['a'], [['b']]), `${CSV_BOM}a\nb`);
  assert.equal(CSV_BOM, '﻿');
});

test('file names lose spaces and slashes and end in .csv exactly once', () => {
  assert.equal(csvFileName('agent-day_2026-09-08_2026-09-08.csv'), 'agent-day_2026-09-08_2026-09-08.csv');
  assert.equal(csvFileName('Agent Status Summary / today'), 'Agent_Status_Summary_today.csv');
  assert.equal(csvFileName(''), 'export.csv');
});
