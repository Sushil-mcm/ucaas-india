/* The script answers report, as the campaign service returns it
   (helpers/ScriptAnswersReport.ts there), plus the small amount of
   arithmetic and wording the screen and the CSV export do on top of it.

   What it answers: for one call script over a date range, per question,
   how many calls answered and what they said - counts per choice for a
   checkbox or a dropdown, lowest / average / highest for a number, the
   latest written answers for text - and how many calls used the script at
   all against how many carried an answer. */

import moment from 'moment';
import type { CsvCell } from '@/lib/csv-download';

export type ScriptQuestionKind = 'checkbox' | 'dropdown' | 'number' | 'text';

export interface ReportOption {
  value: string;
  count: number;
  percent_of_answered: number | null;
  /* False for a choice the script no longer offers: shown, never hidden. */
  in_script: boolean;
}

export interface ReportTextSample {
  text: string;
  at: string | null;
  contact: string | null;
  agent: string | null;
  call_id: string | null;
  via: string | null;
}

export interface ReportQuestion {
  key: string;
  label: string;
  kind: ScriptQuestionKind;
  answered: number;
  unanswered: number;
  answer_rate_percent: number | null;
  options?: ReportOption[];
  number?: { min: number; avg: number; max: number; count: number } | null;
  text?: { samples: ReportTextSample[]; total: number };
}

export interface ScriptHolder {
  id: string;
  name: string;
  type: 'campaign' | 'queue';
}

export interface ScriptAnswersReport {
  script: { id: string; name: string | null };
  from: string;
  to: string;
  holders: ScriptHolder[];
  narrowed_to: string[];
  truncated: boolean;
  max_rows: number;
  calls_with_script: number;
  calls_with_answers: number;
  answer_rate_percent: number | null;
  questions: ReportQuestion[];
  extra_keys: string[];
}

export const KIND_LABEL: Record<ScriptQuestionKind, string> = {
  checkbox: 'Yes / no',
  dropdown: 'One choice',
  number: 'Number',
  text: 'Written answer',
};

/* The page's date filter is a pair of calendar days in the browser's zone.
   The report wants moments, so "2026-09-01".."2026-09-01" becomes that whole
   local day, start to end, in ISO. Anything already a moment passes through. */
export const rangeToIso = (range: { from?: string; to?: string } | null | undefined): {
  from: string;
  to: string;
} | null => {
  const from = String(range?.from ?? '').trim();
  const to = String(range?.to ?? '').trim();
  if (!from || !to) return null;
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const start = day.test(from) ? moment(from, 'YYYY-MM-DD').startOf('day') : moment(from);
  const end = day.test(to) ? moment(to, 'YYYY-MM-DD').endOf('day') : moment(to);
  if (!start.isValid() || !end.isValid()) return null;
  return { from: start.toISOString(), to: end.toISOString() };
};

export const pctText = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${Math.round(value * 10) / 10}%`;

export const numberText = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
};

/* "Ann · Agent A · Autumn push · 3 Sep 2026, 10:00" for a written answer. */
export const sampleMeta = (sample: ReportTextSample): string =>
  [
    sample.contact,
    sample.agent ? `by ${sample.agent}` : null,
    sample.via ? `via ${sample.via}` : null,
    sample.at ? moment(sample.at).format('D MMM YYYY, HH:mm') : null,
  ]
    .filter(Boolean)
    .join(' · ');

/* One sentence the screen shows about where the numbers come from. */
export const reportNote = (report: ScriptAnswersReport | null | undefined): string => {
  if (!report) return '';
  const parts = [
    'Counted on the server from every call that had this script open in the range, for the whole company or for the campaign or queue picked here. ' +
      '"Answered" is a call that recorded a usable answer to that question; a box left unticked counts as No.',
  ];
  if (report.truncated) {
    parts.push(
      `This range holds more than ${report.max_rows.toLocaleString()} calls; only the latest ${report.max_rows.toLocaleString()} are counted. Pick a shorter range for exact figures.`,
    );
  }
  if (report.extra_keys.length) {
    parts.push(
      `Some calls carry answers to questions this script no longer asks (${report.extra_keys.join(', ')}); they are not shown.`,
    );
  }
  return parts.join(' ');
};

export const CSV_HEAD = [
  'Question',
  'Type',
  'Value',
  'Count',
  'Share of answered',
  'Answered',
  'Calls with script',
  'When',
  'Contact',
  'Agent',
  'Via',
];

/* Every figure on the screen as rows: one per choice, one per number
   statistic, one per written answer, so nothing seen cannot be exported. */
export const reportCsvRows = (report: ScriptAnswersReport): CsvCell[][] => {
  const rows: CsvCell[][] = [];
  report.questions.forEach((question) => {
    const base: CsvCell[] = [question.label, KIND_LABEL[question.kind] ?? question.kind];
    const tail: CsvCell[] = [question.answered, report.calls_with_script];
    if (question.options) {
      question.options.forEach((option) => {
        rows.push([
          ...base,
          option.in_script ? option.value : `${option.value} (no longer offered)`,
          option.count,
          pctText(option.percent_of_answered),
          ...tail,
          '',
          '',
          '',
          '',
        ]);
      });
      if (!question.options.length) rows.push([...base, '', 0, '—', ...tail, '', '', '', '']);
      return;
    }
    if (question.kind === 'number') {
      const stats = question.number;
      (
        [
          ['Lowest', stats?.min],
          ['Average', stats?.avg],
          ['Highest', stats?.max],
        ] as Array<[string, number | undefined]>
      ).forEach(([name, value]) => {
        rows.push([...base, name, numberText(value ?? null), '', ...tail, '', '', '', '']);
      });
      return;
    }
    const samples = question.text?.samples ?? [];
    if (!samples.length) {
      rows.push([...base, '', 0, '', ...tail, '', '', '', '']);
      return;
    }
    samples.forEach((sample) => {
      rows.push([
        ...base,
        sample.text,
        1,
        '',
        ...tail,
        sample.at ? moment(sample.at).format('YYYY-MM-DD HH:mm') : '',
        sample.contact ?? '',
        sample.agent ?? '',
        sample.via ?? '',
      ]);
    });
  });
  return rows;
};
