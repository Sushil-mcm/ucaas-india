/* Workforce (People module stage 5): the pure parts of the schedules, adherence,
   time-off and coverage screens, so they can be proven without a browser.
   Dates are YYYY-MM-DD strings in the company's zone; the arithmetic runs in
   UTC on purpose so a browser in another zone gets the same calendar. */
import { BreakReason, categoryOf } from './break-reasons';

export interface ScheduleBlock {
  start: string;
  end: string;
  code: string;
  label?: string;
}
export interface ScheduleRow {
  user_uuid: string;
  date: string;
  timezone?: string;
  blocks: ScheduleBlock[];
  published: boolean;
  published_at?: string | null;
  updated_at?: string;
}
export interface CoverageBucket {
  start: string;
  scheduled: number;
  need: number;
  gap: number;
  calls: number;
}

export const ON_QUEUE = 'on_queue';
export const TIME_OFF_CATEGORY = 'time_off';

const pad = (n: number) => String(n).padStart(2, '0');
const partsOf = (date: string) => date.split('-').map(Number) as [number, number, number];
export const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const shiftDate = (date: string, days: number): string => {
  const [y, m, d] = partsOf(date);
  return isoDate(new Date(Date.UTC(y, m - 1, d + days)));
};
/** Monday to Sunday around a date. */
export const weekOf = (date: string): string[] => {
  const [y, m, d] = partsOf(date);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const monday = shiftDate(date, dow === 0 ? -6 : 1 - dow);
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
};
export const todayIn = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const dayLabel = (date: string): string => {
  const [y, m, d] = partsOf(date);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export const codeLabel = (code: string, reasons: BreakReason[]): string =>
  code === ON_QUEUE ? 'On queue' : reasons.find((r) => r.id === code)?.name || code;

export const blocksText = (blocks: ScheduleBlock[], reasons: BreakReason[]): string =>
  blocks.map((b) => `${b.start}–${b.end} ${codeLabel(b.code, reasons)}`).join('; ');

const HHMM = /^([01]\d|2[0-3]|24):[0-5]\d$/;
const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** "09:00-12:30 On queue; 12:30-13:00 Lunch; 13:00-17:00 On queue" → blocks.
    Every line is checked so a typo is a sentence, never a silent gap. */
export const parseBlocksText = (text: string, reasons: BreakReason[]): { blocks: ScheduleBlock[]; error: string } => {
  const blocks: ScheduleBlock[] = [];
  const parts = text.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = /^(\d{1,2}:\d{2})\s*(?:-|–|to)\s*(\d{1,2}:\d{2})\s+(.+)$/i.exec(part);
    if (!m) return { blocks: [], error: `Cannot read "${part}". Write it as 09:00-12:00 On queue.` };
    const start = m[1].padStart(5, '0');
    const end = m[2].padStart(5, '0');
    const name = m[3].trim();
    if (!HHMM.test(start) || !HHMM.test(end)) return { blocks: [], error: `"${part}": times are HH:MM (24-hour, up to 24:00).` };
    if (minutesOf(end) <= minutesOf(start)) return { blocks: [], error: `"${part}": the end must be after the start.` };
    const wanted = name.toLowerCase();
    const code =
      wanted === 'on queue' || wanted === ON_QUEUE || wanted === 'queue'
        ? ON_QUEUE
        : reasons.find((r) => r.id.toLowerCase() === wanted || r.name.toLowerCase() === wanted)?.id;
    if (!code) return { blocks: [], error: `"${name}" is not an activity code. Use On queue or a code from Company › Activity codes.` };
    blocks.push({ start, end, code });
  }
  blocks.sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
  for (let i = 1; i < blocks.length; i += 1) {
    if (minutesOf(blocks[i].start) < minutesOf(blocks[i - 1].end)) {
      return { blocks: [], error: `${blocks[i - 1].start}–${blocks[i - 1].end} and ${blocks[i].start}–${blocks[i].end} overlap.` };
    }
  }
  return { blocks, error: '' };
};

export const onQueueMinutes = (blocks: ScheduleBlock[]): number =>
  blocks.filter((b) => b.code === ON_QUEUE).reduce((sum, b) => sum + minutesOf(b.end) - minutesOf(b.start), 0);
export const hoursText = (minutes: number): string =>
  minutes ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : '0h';

/** The built-in Lunch code, or the first pickable break, for the templates. */
export const lunchCode = (reasons: BreakReason[]): string =>
  reasons.find((r) => /lunch/i.test(r.name))?.id || reasons[0]?.id || 'lunch';
export const TEMPLATES = [
  { key: 'day', label: 'Day 09:00–17:00', from: '09:00', lunch: '12:30', to: '17:00' },
  { key: 'early', label: 'Early 07:00–15:00', from: '07:00', lunch: '11:00', to: '15:00' },
  { key: 'late', label: 'Late 13:00–21:00', from: '13:00', lunch: '17:00', to: '21:00' },
  { key: 'off', label: 'Day off', from: '', lunch: '', to: '' },
] as const;
export const templateBlocks = (key: string, lunch: string): ScheduleBlock[] => {
  const t = TEMPLATES.find((x) => x.key === key);
  if (!t || !t.from) return [];
  const lunchEnd = `${pad(Math.floor((minutesOf(t.lunch) + 30) / 60))}:${pad((minutesOf(t.lunch) + 30) % 60)}`;
  return [
    { start: t.from, end: t.lunch, code: ON_QUEUE },
    { start: t.lunch, end: lunchEnd, code: lunch },
    { start: lunchEnd, end: t.to, code: ON_QUEUE },
  ];
};

export const scheduleKey = (userUuid: string, date: string) => `${userUuid}|${date}`;

export const adherenceText = (row: { adherence?: number | null; adherence_reason?: string }): string => {
  if (typeof row.adherence === 'number') return `${row.adherence}%`;
  const why = String(row.adherence_reason || '').trim();
  return why && why !== 'needs schedules' ? why : 'Needs schedules';
};
export const averageOf = (values: Array<number | null | undefined>): number | null => {
  const nums = values.filter((v): v is number => typeof v === 'number');
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
};

export const timeOffCodes = (reasons: BreakReason[]): BreakReason[] => reasons.filter((r) => categoryOf(r.category).key === TIME_OFF_CATEGORY);
export const timeOffTone = (status: string): string =>
  ({ pending: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', declined: 'bg-rose-100 text-rose-800' })[status] ||
  'bg-gray-100 text-gray-700';
export const daysBetween = (from: string, to: string): number => {
  const [y1, m1, d1] = partsOf(from);
  const [y2, m2, d2] = partsOf(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
};

export const coverageScale = (buckets: CoverageBucket[]): number => Math.max(1, ...buckets.map((b) => Math.max(b.scheduled, b.need)));
export const coverageSummary = (buckets: CoverageBucket[]) => ({
  short: buckets.filter((b) => b.gap < 0).length,
  spare: buckets.filter((b) => b.gap > 0 && b.need > 0).length,
  peakNeed: Math.max(0, ...buckets.map((b) => b.need)),
  peakScheduled: Math.max(0, ...buckets.map((b) => b.scheduled)),
});
