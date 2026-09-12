/* One CSV writer for the report screens. Each report used to carry its own
   copy of the quoting rule and the Blob-and-click download; a table exported
   from two screens should not be able to differ in how a comma is escaped.

   The text is plain (csvText); the FILE starts with a UTF-8 byte-order mark.
   Without it Excel on Windows reads the file as Latin-1 and the "≈" and "×"
   the agent reports carry turn into three characters of noise. */

export type CsvCell = string | number | boolean | null | undefined;

export const CSV_BOM = '﻿';

export const csvValue = (value: CsvCell): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const csvText = (head: CsvCell[], rows: CsvCell[][]): string =>
  [head, ...rows].map((row) => row.map(csvValue).join(',')).join('\n');

/* The bytes that go in the file: BOM, then the text. */
export const csvFileText = (head: CsvCell[], rows: CsvCell[][]): string => CSV_BOM + csvText(head, rows);

/* A file name that lands sensibly on every OS. */
export const csvFileName = (fileName: string): string =>
  `${fileName.replace(/\.csv$/i, '').replace(/[^a-z0-9_.-]+/gi, '_') || 'export'}.csv`;

/* Hands the browser a .csv to save. */
export const downloadCsv = (fileName: string, head: CsvCell[], rows: CsvCell[][]): void => {
  const blob = new Blob([csvFileText(head, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = csvFileName(fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
