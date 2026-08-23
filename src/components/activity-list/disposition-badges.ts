export const DEFAULT_DISPOSITION_BADGE_CLASS =
  'inline-flex items-center justify-center px-4 py-1 w-fit min-w-[92px] text-center rounded-md text-xs font-medium border bg-slate-100 border-slate-200 text-slate-700';

const DISPOSITION_BADGE_CLASS_MAP: Record<string, string> = {
  resolved: 'bg-emerald-100 border-emerald-200 text-emerald-700',
  interested: 'bg-sky-100 border-sky-200 text-sky-700',
  'not interested': 'bg-zinc-200 border-zinc-300 text-zinc-700',
  'sale closed': 'bg-green-100 border-green-200 text-green-700',
  'feedback received': 'bg-cyan-100 border-cyan-200 text-cyan-700',
  answered: 'bg-emerald-100 border-emerald-200 text-emerald-700',
  bridged: 'bg-emerald-100 border-emerald-200 text-emerald-700',
  busy: 'bg-amber-100 border-amber-200 text-amber-700',
  'user busy': 'bg-amber-100 border-amber-200 text-amber-700',
  cancel: 'bg-red-100 border-red-200 text-red-700',
  canceled: 'bg-red-100 border-red-200 text-red-700',
  cancelled: 'bg-red-100 border-red-200 text-red-700',
  'not dialed': 'bg-slate-200 border-slate-300 text-slate-700',
  'call rejected': 'bg-rose-100 border-rose-200 text-rose-700',
  abandoned: 'bg-orange-100 border-orange-200 text-orange-700',
  'no answer': 'bg-rose-100 border-rose-200 text-rose-700',
  'agent abandoned': 'bg-red-100 border-red-200 text-red-700',
  'hang up': 'bg-orange-100 border-orange-200 text-orange-700',
  'invalid number': 'bg-violet-100 border-violet-200 text-violet-700',
  'happy client': 'bg-lime-100 border-lime-200 text-lime-700',
  'call back later': 'bg-indigo-100 border-indigo-200 text-indigo-700',
  'no disposition': 'bg-slate-200 border-slate-300 text-slate-700',
};

const normalizeDispositionKey = (value: string) =>
  `${value || ''}`.trim().toLowerCase().replace(/\s+/g, ' ');

export const getDispositionBadgeClass = (value: string) => {
  const normalized = normalizeDispositionKey(value);
  const toneClass = DISPOSITION_BADGE_CLASS_MAP[normalized];
  return toneClass
    ? `inline-flex items-center justify-center px-2 py-1 w-fit min-w-[92px] text-center rounded-md text-xs font-medium border ${toneClass}`
    : DEFAULT_DISPOSITION_BADGE_CLASS;
};
