/* One holiday calendar for the whole company.
 *
 * Today a holiday can only be entered inside one object's business-hours dialog
 * (`src/components/custom/bussiness-hours-dialog.tsx`): capped at ten, stored as
 * a one-off date range with no recurrence, and repeated for every object that
 * needs it. A company with an IVR, three queues and forty users therefore types
 * Christmas forty-four times, and again next year. established systems keeps a holiday
 * catalogue at office level with per-country defaults and a repeat frequency;
 * other established systems keeps RRULE schedules grouped into open/closed/holiday sets. This is
 * the same idea at the level where it belongs — the company.
 *
 * IMPORTANT, AND SAID OUT LOUD IN THE UI: this calendar is recorded only. Call
 * routing still reads each object's own holiday list, so nothing here closes a
 * line by itself. The panel says so at the top rather than in a tooltip, because
 * an admin who believes their numbers close on Christmas and finds out otherwise
 * on the day has been actively misled by the software.
 *
 * Storage is the company level of the settings cascade — the reserved
 * `user_template` row named "Company Default" whose `settings` field is an
 * arbitrary JSON blob (see `src/lib/company-defaults.ts`). The calendar lives
 * under `settings.company_holidays`. The rest of `settings` and the whole of
 * `greetings` are read, kept and written back untouched, so saving a holiday
 * cannot wipe the company's business hours or voicemail rules.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Info, Pencil, Plus, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import CustomSelect from '@/components/custom/custom-select';
import { CustomDatePicker } from '@/components/custom/custom-datepicker';
import { handleAlert } from '@/lib/utils';
/* One definition of "the company record", shared by every company-level screen.
   This file originally carried a local copy of these helpers because it was
   built on a branch that predated the shared module. Two definitions of where
   the company rules live is how they start disagreeing. */
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  saveCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';

/* --------------------------------------------------------------- the shape */

/* `settings.company_holidays` is versioned from day one. The per-object holiday
   shape already has two generations of data in it because it never was, and the
   business-hours dialog now has to guess which it is holding. */
export interface CompanyHoliday {
  id: string;
  title: string;
  /* Inclusive YYYY-MM-DD. A single day has from === to. */
  from: string;
  to: string;
  /* True only when the same calendar date is correct every year. Anything that
     moves — Thanksgiving, Easter, a weekend substitute day — is false, so nobody
     is told a date will hold when it will not. */
  repeats_yearly: boolean;
  /* 'preset' rows came from a country list; 'manual' rows were typed. */
  source: 'preset' | 'manual';
  country?: string;
  note?: string;
}

export interface CompanyHolidayCalendar {
  version: 1;
  updated_at: string;
  items: CompanyHoliday[];
}

const SETTINGS_KEY = 'company_holidays';

const readCalendar = (settings: any): CompanyHoliday[] => {
  const raw = settings?.[SETTINGS_KEY];
  const items = Array.isArray(raw) ? raw : raw?.items;
  if (!Array.isArray(items)) return [];

  return items
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any, index: number): CompanyHoliday => ({
      id: `${item.id || `holiday-${index}`}`,
      title: `${item.title || ''}`,
      from: `${item.from || ''}`,
      to: `${item.to || item.from || ''}`,
      repeats_yearly: !!item.repeats_yearly,
      source: item.source === 'preset' ? 'preset' : 'manual',
      country: item.country ? `${item.country}` : undefined,
      note: item.note ? `${item.note}` : undefined,
    }))
    .filter((item: CompanyHoliday) => item.title && item.from);
};

/* The bridge to what call routing actually reads today. Each object's
   business-hours dialog stores holidays in the shape `getHolidaysFormVal`
   produces, so a company holiday has to be expressible in it. Exported rather
   than used here: wiring it into the dialog means editing that dialog, which
   this change is not allowed to do. It is the whole point of the storage shape,
   so it is written down and typed now rather than guessed at later. */
/* Converting this list into rows on a line's business hours lives in
   src/lib/company-holiday-import.ts. It is not a plain field copy: every holiday
   on a line must carry an action or it fails validation, so the import has to
   resolve one from that line's closed-hours behaviour. */

/* ------------------------------------------------------------ date helpers */

const pad = (value: number) => `${value}`.padStart(2, '0');

const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const utcToIso = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/* Parsed into a local-noon Date so a browser west of UTC cannot render
   2026-12-25 as the 24th. */
const isoToDate = (iso: string): Date | null => {
  const parts = `${iso}`.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
};

const prettyDate = (iso: string) => {
  const date = isoToDate(iso);
  if (!date) return iso || '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const prettyRange = (item: CompanyHoliday) =>
  item.to && item.to !== item.from
    ? `${prettyDate(item.from)} – ${prettyDate(item.to)}`
    : prettyDate(item.from);

/* --------------------------------------------------- public-holiday presets */

/* Every date below is either a fixed calendar date or produced by a rule that
   computes exactly for any year, so nothing is transcribed from a year-specific
   table that would rot. Holidays that follow the lunar calendars — Diwali, Holi,
   Eid, and the state-by-state Indian lists — are deliberately absent: there is
   no rule for them here, and a guessed Diwali is worse than no Diwali. The panel
   says so where the picker is. */

type PresetRule = {
  name: string;
  /* Fixed date. */
  month?: number;
  day?: number;
  /* Nth weekday of a month; nth = -1 means the last one. 0 = Sunday. */
  weekday?: number;
  nth?: number;
  /* Days from Easter Sunday (Good Friday = -2, Easter Monday = +1). */
  easterOffset?: number;
  /* The Monday strictly before month/day — Canada's Victoria Day. */
  mondayBefore?: boolean;
};

/* Meeus/Jones/Butcher. Cross-checked by hand against Easter Sunday 20 Apr 2025,
   5 Apr 2026 and 28 Mar 2027. */
const easterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
};

const nthWeekdayOf = (year: number, month: number, weekday: number, nth: number): Date => {
  if (nth < 0) {
    const lastDay = new Date(Date.UTC(year, month, 0));
    const back = (lastDay.getUTCDay() - weekday + 7) % 7;
    return new Date(Date.UTC(year, month - 1, lastDay.getUTCDate() - back));
  }
  const first = new Date(Date.UTC(year, month - 1, 1));
  const forward = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + forward + (nth - 1) * 7));
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const ruleDate = (rule: PresetRule, year: number): Date => {
  if (typeof rule.easterOffset === 'number') {
    return addDays(easterSunday(year), rule.easterOffset);
  }
  if (rule.mondayBefore && rule.month && rule.day) {
    const anchor = new Date(Date.UTC(year, rule.month - 1, rule.day));
    /* Strictly before: when the anchor is itself a Monday, step back a week. */
    const back = (anchor.getUTCDay() + 6) % 7 || 7;
    return addDays(anchor, -back);
  }
  if (typeof rule.weekday === 'number' && rule.month && rule.nth) {
    return nthWeekdayOf(year, rule.month, rule.weekday, rule.nth);
  }
  return new Date(Date.UTC(year, (rule.month || 1) - 1, rule.day || 1));
};

/* A rule lands on the same calendar date every year only when it is a plain
   fixed date that was not moved off a weekend. */
const isFixedDate = (rule: PresetRule) =>
  typeof rule.easterOffset !== 'number' && !rule.mondayBefore && typeof rule.weekday !== 'number';

type ObservanceRule = 'none' | 'uk' | 'us';

interface CountryPreset {
  code: string;
  label: string;
  /* What the list actually covers, shown next to the picker. Every one of these
     countries has holidays this list does not have. */
  scope: string;
  observance: ObservanceRule;
  rules: PresetRule[];
}

const COUNTRY_PRESETS: CountryPreset[] = [
  {
    code: 'US',
    label: 'United States',
    scope: 'The 11 federal public holidays. States and cities add their own.',
    /* 5 U.S.C. § 6103(b): a holiday on a Saturday is observed the Friday before,
       one on a Sunday the Monday after. */
    observance: 'us',
    rules: [
      { name: "New Year's Day", month: 1, day: 1 },
      { name: 'Martin Luther King Jr. Day', month: 1, weekday: 1, nth: 3 },
      { name: "Washington's Birthday (Presidents' Day)", month: 2, weekday: 1, nth: 3 },
      { name: 'Memorial Day', month: 5, weekday: 1, nth: -1 },
      { name: 'Juneteenth National Independence Day', month: 6, day: 19 },
      { name: 'Independence Day', month: 7, day: 4 },
      { name: 'Labor Day', month: 9, weekday: 1, nth: 1 },
      { name: 'Columbus Day', month: 10, weekday: 1, nth: 2 },
      { name: 'Veterans Day', month: 11, day: 11 },
      { name: 'Thanksgiving Day', month: 11, weekday: 4, nth: 4 },
      { name: 'Christmas Day', month: 12, day: 25 },
    ],
  },
  {
    code: 'GB',
    label: 'United Kingdom (England & Wales)',
    scope: 'Bank holidays for England and Wales. Scotland and Northern Ireland differ.',
    /* A bank holiday falling on a weekend moves to the next weekday that is not
       already a bank holiday — which is what produces 27 and 28 December when
       Christmas lands on a Saturday. */
    observance: 'uk',
    rules: [
      { name: "New Year's Day", month: 1, day: 1 },
      { name: 'Good Friday', easterOffset: -2 },
      { name: 'Easter Monday', easterOffset: 1 },
      { name: 'Early May bank holiday', month: 5, weekday: 1, nth: 1 },
      { name: 'Spring bank holiday', month: 5, weekday: 1, nth: -1 },
      { name: 'Summer bank holiday', month: 8, weekday: 1, nth: -1 },
      { name: 'Christmas Day', month: 12, day: 25 },
      { name: 'Boxing Day', month: 12, day: 26 },
    ],
  },
  {
    code: 'IN',
    label: 'India',
    scope:
      'The three national holidays plus Christmas. Diwali, Holi, Eid and the state lists move every year and are not included.',
    /* India does not substitute a weekday when a gazetted holiday falls on a
       weekend, so these are left on their real dates. */
    observance: 'none',
    rules: [
      { name: 'Republic Day', month: 1, day: 26 },
      { name: 'Independence Day', month: 8, day: 15 },
      { name: 'Gandhi Jayanti', month: 10, day: 2 },
      { name: 'Christmas Day', month: 12, day: 25 },
    ],
  },
  {
    code: 'CA',
    label: 'Canada (federal)',
    scope: 'The federal general holidays. Every province adds more.',
    observance: 'uk',
    rules: [
      { name: "New Year's Day", month: 1, day: 1 },
      { name: 'Good Friday', easterOffset: -2 },
      { name: 'Victoria Day', month: 5, day: 25, mondayBefore: true },
      { name: 'Canada Day', month: 7, day: 1 },
      { name: 'Labour Day', month: 9, weekday: 1, nth: 1 },
      { name: 'National Day for Truth and Reconciliation', month: 9, day: 30 },
      { name: 'Thanksgiving Day', month: 10, weekday: 1, nth: 2 },
      { name: 'Remembrance Day', month: 11, day: 11 },
      { name: 'Christmas Day', month: 12, day: 25 },
      { name: 'Boxing Day', month: 12, day: 26 },
    ],
  },
];

interface GeneratedHoliday {
  title: string;
  iso: string;
  repeats_yearly: boolean;
  note?: string;
}

const buildPreset = (preset: CountryPreset, year: number): GeneratedHoliday[] => {
  const dated = preset.rules
    .map((rule) => ({ rule, date: ruleDate(rule, year) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const taken = new Set(dated.map((entry) => utcToIso(entry.date)));
  const results: GeneratedHoliday[] = [];

  dated.forEach(({ rule, date }) => {
    let observed = date;
    let moved = false;

    if (preset.observance === 'us') {
      const weekday = date.getUTCDay();
      if (weekday === 6) {
        observed = addDays(date, -1);
        moved = true;
      } else if (weekday === 0) {
        observed = addDays(date, 1);
        moved = true;
      }
    } else if (preset.observance === 'uk') {
      while (
        observed.getUTCDay() === 0 ||
        observed.getUTCDay() === 6 ||
        (moved && taken.has(utcToIso(observed)))
      ) {
        observed = addDays(observed, 1);
        moved = true;
      }
    }

    const iso = utcToIso(observed);
    taken.add(iso);

    results.push({
      title: rule.name,
      iso,
      /* Only an untouched fixed date is safe to repeat. A moved date and a
         weekday-or-Easter rule both land somewhere else next year. */
      repeats_yearly: isFixedDate(rule) && !moved,
      note: moved
        ? `Observed on this day; the holiday itself is ${prettyDate(utcToIso(date))}`
        : isFixedDate(rule)
          ? undefined
          : 'Falls on a different date each year',
    });
  });

  return results.sort((a, b) => a.iso.localeCompare(b.iso));
};

/* ------------------------------------------------------------------ the UI */

const makeId = () => `hol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface Draft {
  id: string | null;
  title: string;
  from: string;
  to: string;
  repeats_yearly: boolean;
}

const EMPTY_DRAFT: Draft = { id: null, title: '', from: '', to: '', repeats_yearly: true };

const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  return [current, current + 1, current + 2].map((year) => ({
    label: `${year}`,
    value: `${year}`,
  }));
})();

const CompanyHolidays = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    staleTime: 5 * 60 * 1000,
  });

  const [items, setItems] = useState<CompanyHoliday[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [isAdding, setIsAdding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [country, setCountry] = useState<{ label: string; value: string } | null>(null);
  const [year, setYear] = useState<{ label: string; value: string }>(YEAR_OPTIONS[0]);

  /* Re-seeded from the server only while there is nothing unsaved, so a refetch
     landing mid-edit cannot throw away typing. */
  useEffect(() => {
    if (dirty) return;
    setItems(readCalendar(data?.settings));
  }, [data, dirty]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.from.localeCompare(b.from) || a.title.localeCompare(b.title)),
    [items],
  );

  const repeatingCount = useMemo(() => items.filter((item) => item.repeats_yearly).length, [items]);

  const selectedPreset = useMemo(
    () => COUNTRY_PRESETS.find((preset) => preset.code === country?.value) || null,
    [country],
  );

  const presetPreview = useMemo(() => {
    if (!selectedPreset) return [];
    return buildPreset(selectedPreset, Number(year.value));
  }, [selectedPreset, year]);

  /* A preset re-added for a second year, or added twice, must not double up. */
  const presetNewCount = useMemo(() => {
    const existing = new Set(items.map((item) => `${item.title}|${item.from}`));
    return presetPreview.filter((entry) => !existing.has(`${entry.title}|${entry.iso}`)).length;
  }, [items, presetPreview]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const calendar: CompanyHolidayCalendar = {
        version: 1,
        updated_at: new Date().toISOString(),
        items,
      };
      /* Everything else in the company record is carried through untouched.
         `settings` here is the whole blob, not just this key. */
      return saveCompanyDefaults({
        uuid: data?.uuid,
        settings: { ...(data?.settings || {}), [SETTINGS_KEY]: calendar },
        greetings: data?.greetings || {},
      });
    },
    onSuccess: (response: any) => {
      handleAlert({
        text: response?.data?.data?.message || 'Company holidays saved.',
        type: 'success',
      });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
    },
    onError: () => {
      handleAlert({ text: 'Could not save the holidays. Nothing was changed.', type: 'error' });
    },
  });

  const openAdd = () => {
    setDraft(EMPTY_DRAFT);
    setIsAdding(true);
  };

  const openEdit = (item: CompanyHoliday) => {
    setDraft({
      id: item.id,
      title: item.title,
      from: item.from,
      to: item.to,
      repeats_yearly: item.repeats_yearly,
    });
    setIsAdding(true);
  };

  const closeDraft = () => {
    setDraft(EMPTY_DRAFT);
    setIsAdding(false);
  };

  const commitDraft = () => {
    const title = draft.title.trim();
    if (!title) {
      handleAlert({ text: 'Give the holiday a name.', type: 'error' });
      return;
    }
    if (!draft.from) {
      handleAlert({ text: 'Pick the date the holiday starts.', type: 'error' });
      return;
    }
    const to = draft.to || draft.from;
    if (to < draft.from) {
      handleAlert({ text: 'The last day cannot be before the first day.', type: 'error' });
      return;
    }

    setItems((previous) => {
      if (draft.id) {
        return previous.map((item) =>
          item.id === draft.id
            ? { ...item, title, from: draft.from, to, repeats_yearly: draft.repeats_yearly }
            : item,
        );
      }
      return [
        ...previous,
        {
          id: makeId(),
          title,
          from: draft.from,
          to,
          repeats_yearly: draft.repeats_yearly,
          source: 'manual' as const,
        },
      ];
    });
    setDirty(true);
    closeDraft();
  };

  const removeItem = (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
    setDirty(true);
  };

  const toggleRepeat = (id: string) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, repeats_yearly: !item.repeats_yearly, note: undefined } : item,
      ),
    );
    setDirty(true);
  };

  const addPreset = () => {
    if (!selectedPreset) return;
    const existing = new Set(items.map((item) => `${item.title}|${item.from}`));
    const additions = presetPreview
      .filter((entry) => !existing.has(`${entry.title}|${entry.iso}`))
      .map((entry) => ({
        id: makeId(),
        title: entry.title,
        from: entry.iso,
        to: entry.iso,
        repeats_yearly: entry.repeats_yearly,
        source: 'preset' as const,
        country: selectedPreset.code,
        note: entry.note,
      }));

    if (!additions.length) {
      handleAlert({ text: 'Those holidays are already on the list.', type: 'error' });
      return;
    }

    setItems((previous) => [...previous, ...additions]);
    setDirty(true);
    handleAlert({
      text: `Added ${additions.length} ${selectedPreset.label} holiday${additions.length === 1 ? '' : 's'} for ${year.value}. Not saved yet.`,
      type: 'success',
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ucass-primary-200 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">Your holiday list</p>
            <p className="mt-0.5 text-xs text-gray-600">
              One list of the days your company is closed, kept in one place instead of typed again
              into every IVR, queue and user.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openAdd} disabled={isAdding}>
            <Plus className="h-3.5 w-3.5" />
            Add holiday
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => save()}
            disabled={!dirty || isPending || isLoading}
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* The one thing an admin must not misunderstand, at the top, in the
          colour the app uses for "read this". */}
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900">
            This list is recorded, but it does not close your lines yet
          </p>
          <p className="mt-0.5 text-xs text-gray-700">
            Calls are still routed from each object&apos;s own holiday list, set inside its
            business-hours dialog. Adding Christmas here does not make your IVR, queues or users
            close on Christmas — you still have to enter it on each of them. This page is the
            company&apos;s record of the dates; connecting it to routing is a separate piece of work
            that has not been done.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        <p className="text-xs text-gray-700">
          <span className="font-semibold text-gray-900">What a holiday means.</span> On a holiday
          the normal open-hours routing is skipped for the whole day and the closed-hours action
          applies instead — whatever each object is set to do outside business hours, usually
          voicemail, a forward, or a closed greeting. A holiday does not have its own separate
          action; it borrows the closed-hours one.
        </p>
      </div>

      {/* Presets. The point of the panel: a year of holidays in one click rather
          than twelve rows typed by hand. */}
      <div className="mt-3 rounded-lg border border-ucass-primary-200 bg-ucass-primary-200/40 p-3">
        <p className="text-xs font-semibold text-gray-900">Add a country&apos;s public holidays</p>
        <p className="mt-0.5 text-xs text-gray-600">
          Pick a country and a year, and the public holidays are added to the list below. You can
          edit or remove any of them afterwards.
        </p>

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="w-full sm:w-72">
            <CustomSelect
              label="Country"
              placeholder="Select a country"
              options={COUNTRY_PRESETS.map((preset) => ({
                label: preset.label,
                value: preset.code,
              }))}
              value={country}
              handleChange={(option: any) => setCountry(option)}
              isClearable
            />
          </div>
          <div className="w-full sm:w-32">
            <CustomSelect
              label="Year"
              options={YEAR_OPTIONS}
              value={year}
              handleChange={(option: any) => option && setYear(option)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addPreset}
            disabled={!selectedPreset || presetNewCount === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            {selectedPreset
              ? presetNewCount === 0
                ? 'Already added'
                : `Add ${presetNewCount} holiday${presetNewCount === 1 ? '' : 's'}`
              : 'Add holidays'}
          </Button>
        </div>

        {selectedPreset && (
          <p className="mt-2 text-xs text-gray-600">
            <span className="font-semibold text-gray-900">{selectedPreset.label}:</span>{' '}
            {selectedPreset.scope} Check the list against your own working year before you rely on
            it.
          </p>
        )}
      </div>

      {/* The list. */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500">
            {items.length} holiday{items.length === 1 ? '' : 's'}
            {items.length > 0 && (
              <span className="font-normal text-gray-500">
                {' '}
                · {repeatingCount} repeat every year · {items.length - repeatingCount} need
                re-adding next year
              </span>
            )}
          </p>
          {dirty && <span className="text-xs font-semibold text-amber-700">Unsaved changes</span>}
        </div>

        {isLoading ? (
          <p className="mt-3 text-sm text-gray-500">Loading…</p>
        ) : sorted.length === 0 && !isAdding ? (
          <div className="mt-2 rounded-lg border border-dashed border-gray-300 p-4 text-center">
            <p className="text-xs font-semibold text-gray-900">No company holidays yet</p>
            <p className="mt-0.5 text-xs text-gray-600">
              Add a country&apos;s public holidays above, or add one by hand.
            </p>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {sorted.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-gray-600">{prettyRange(item)}</p>
                  {item.note && <p className="mt-0.5 text-xs text-gray-500">{item.note}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Switch
                      checked={item.repeats_yearly}
                      onCheckedChange={() => toggleRepeat(item.id)}
                    />
                    <span className="text-xs text-gray-600">
                      {item.repeats_yearly ? 'Every year' : 'This year only'}
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(item)}
                    aria-label={`Edit ${item.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructiveOutline"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / edit row. Inline rather than a dialog: the list it changes stays
          visible, so a duplicate is obvious before it is added. */}
      {isAdding && (
        <div className="mt-3 rounded-lg border border-ucass-primary-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-900">
              {draft.id ? 'Edit holiday' : 'New holiday'}
            </p>
            <button
              type="button"
              onClick={closeDraft}
              aria-label="Cancel"
              className="cursor-pointer rounded-md p-1 text-gray-500 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="w-full sm:w-64">
              <Input
                label="Name"
                placeholder="Christmas Day"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </div>
            <div className="w-full sm:w-48">
              <CustomDatePicker
                label="First day"
                placeholder="Pick a date"
                value={draft.from ? isoToDate(draft.from) : null}
                onChange={(date) => {
                  if (!date) return;
                  const iso = toIso(date);
                  /* A one-day holiday is the common case, so the last day
                     follows the first until it is set apart. */
                  setDraft((previous) => ({
                    ...previous,
                    from: iso,
                    to: !previous.to || previous.to < iso ? iso : previous.to,
                  }));
                }}
              />
            </div>
            <div className="w-full sm:w-48">
              <CustomDatePicker
                label="Last day"
                placeholder="Same day"
                minDate={draft.from ? isoToDate(draft.from) || undefined : undefined}
                value={draft.to ? isoToDate(draft.to) : null}
                onChange={(date) =>
                  date && setDraft((previous) => ({ ...previous, to: toIso(date) }))
                }
              />
            </div>
            <label className="flex h-10 cursor-pointer items-center gap-2">
              <Switch
                checked={draft.repeats_yearly}
                onCheckedChange={(checked) => setDraft({ ...draft, repeats_yearly: !!checked })}
              />
              <span className="text-xs text-gray-600">Repeats every year</span>
            </label>
            <Button type="button" variant="primary" onClick={commitDraft}>
              {draft.id ? 'Update' : 'Add'}
            </Button>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Turn off &quot;repeats every year&quot; for anything that moves — Thanksgiving, Easter,
            Diwali, Eid — and add next year&apos;s date when you know it.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompanyHolidays;
