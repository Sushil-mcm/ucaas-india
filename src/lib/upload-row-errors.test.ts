import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readUploadMessage, readUploadRowErrors } from './upload-row-errors';

/* The shapes named in skill-routing-web/HANDOVER.md (finding 2): a list under
   errors | rowErrors | row_errors | rejected | invalidRows | invalid_rows |
   skipped, at any depth up to 4 under data / result / error / summary, each
   entry a string or { row, message | error | reason }. Both a 422 (an axios
   error with response.data) and a 200 summary that carries a rejected list. */

const BAD_ROW = 'Unknown skill "Spanich" in row 4';

test('the 422 the handover asks the server to emit', () => {
  const error = {
    message: 'Request failed with status code 422',
    response: {
      status: 422,
      data: { success: false, message: '3 rows were not imported', errors: [{ row: 4, message: BAD_ROW }] },
    },
  };
  assert.deepEqual(readUploadRowErrors(error), [{ row: 4, message: BAD_ROW }]);
  assert.equal(readUploadMessage(error), '3 rows were not imported');
});

test('the same list on a 200 summary (the upload is processed in the background)', () => {
  const response = {
    data: {
      success: true,
      message: 'Upload started',
      data: { result: { imported: 3, rejected: [{ row: 4, reason: BAD_ROW }] } },
    },
  };
  assert.deepEqual(readUploadRowErrors(response), [{ row: 4, message: BAD_ROW }]);
});

test('every list key and every entry shape is read', () => {
  const keys = ['errors', 'rowErrors', 'row_errors', 'rejected', 'invalidRows', 'invalid_rows', 'skipped'];
  for (const key of keys) {
    assert.deepEqual(readUploadRowErrors({ [key]: [{ row: 2, message: 'm' }] }), [{ row: 2, message: 'm' }], key);
  }
  /* strings, {row,error}, {line,reason}, {index,msg}, {detail} without a row */
  assert.deepEqual(
    readUploadRowErrors({
      errors: ['Row 9: no phone', { row: 4, error: BAD_ROW }, { line: 5, reason: 'Bad phone' }, { index: 6, msg: 'x' }, { detail: 'file level' }],
    }),
    [
      { message: 'Row 9: no phone' },
      { row: 4, message: BAD_ROW },
      { row: 5, message: 'Bad phone' },
      { row: 6, message: 'x' },
      { message: 'file level' },
    ],
  );
});

test('lists are found under data / result / error / summary, four deep', () => {
  const deep = { data: { result: { summary: { error: { invalid_rows: [{ row: 7, message: 'deep' }] } } } } };
  assert.deepEqual(readUploadRowErrors(deep), [{ row: 7, message: 'deep' }]);
  /* the body's own data wrapper is free; five containers below it is past the limit, by design */
  const tooDeep = { data: { result: { summary: { error: { data: { result: { errors: [{ row: 8, message: 'lost' }] } } } } } } };
  assert.deepEqual(readUploadRowErrors(tooDeep), []);
});

test('duplicates collapse, blanks and junk are dropped, nothing throws on odd bodies', () => {
  assert.deepEqual(
    readUploadRowErrors({ errors: [{ row: 4, message: BAD_ROW }], data: { errors: [{ row: 4, message: BAD_ROW }] } }),
    [{ row: 4, message: BAD_ROW }],
  );
  assert.deepEqual(readUploadRowErrors({ errors: ['', '   ', null, 42, { row: 3 }, { row: 0, message: 'no row' }] }), [
    { message: 'no row' },
  ]);
  assert.deepEqual(readUploadRowErrors(null), []);
  assert.deepEqual(readUploadRowErrors('Invalid headers'), []);
  assert.deepEqual(readUploadRowErrors({ data: 'Invalid headers' }), []);
});

test('the one-line message, wherever the server put it', () => {
  assert.equal(readUploadMessage({ response: { data: { message: 'Invalid headers' } } }), 'Invalid headers');
  assert.equal(readUploadMessage({ data: { error: { message: 'Bad file' } } }), 'Bad file');
  assert.equal(readUploadMessage({ data: { data: { message: 'Nested' } } }), 'Nested');
  assert.equal(readUploadMessage({ message: 'Network Error' }), 'Network Error');
  assert.equal(readUploadMessage({}), '');
});
