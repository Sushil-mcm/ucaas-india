/* The per-row rejections a list upload can come back with, in one shape.
 *
 * The server may answer a bad file with a plain message ("Invalid headers"),
 * or with a list of rows it refused: an unknown skill name, a number that
 * would not parse. The list has been seen in a few places and a few shapes
 * (`errors`, `data.errors`, `data.result.errors`, `result.rejected`), each
 * entry either a string or `{ row, message }`. This flattens whatever came
 * back into lines a dialog can show, so a rejected row is never reduced to
 * a toast that says only "422". */

export interface UploadRowError {
  row?: number;
  message: string;
}

const asMessage = (entry: any): UploadRowError | null => {
  if (entry === null || entry === undefined) return null;
  if (typeof entry === 'string') return entry.trim() ? { message: entry.trim() } : null;
  if (typeof entry !== 'object') return null;
  const row = Number(entry.row ?? entry.line ?? entry.index);
  const message = String(
    entry.message ?? entry.error ?? entry.reason ?? entry.msg ?? entry.detail ?? '',
  ).trim();
  if (!message) return null;
  return Number.isFinite(row) && row > 0 ? { row, message } : { message };
};

const LIST_KEYS = ['errors', 'rowErrors', 'row_errors', 'rejected', 'invalidRows', 'invalid_rows', 'skipped'];

const listsIn = (node: any, depth = 0): any[][] => {
  if (!node || typeof node !== 'object' || depth > 4) return [];
  const found: any[][] = [];
  for (const key of LIST_KEYS) {
    if (Array.isArray(node[key]) && node[key].length) found.push(node[key]);
  }
  for (const key of ['data', 'result', 'error', 'summary']) {
    if (node[key] && typeof node[key] === 'object') found.push(...listsIn(node[key], depth + 1));
  }
  return found;
};

/* Every per-row error in a response body, or an error's response body. */
export const readUploadRowErrors = (body: any): UploadRowError[] => {
  const source = body?.response?.data ?? body?.data ?? body;
  const seen = new Set<string>();
  const out: UploadRowError[] = [];
  for (const list of listsIn(source)) {
    for (const entry of list) {
      const item = asMessage(entry);
      if (!item) continue;
      const key = `${item.row ?? ''}|${item.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
};

/* The one-line message for the same body, when there is one. */
export const readUploadMessage = (body: any): string => {
  const source = body?.response?.data ?? body?.data ?? body;
  return String(
    source?.message ?? source?.error?.message ?? source?.data?.message ?? body?.message ?? '',
  ).trim();
};
