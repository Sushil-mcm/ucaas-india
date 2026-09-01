/* Who is off, and when — derived from the per-person "custom days" model.
 *
 * A company holiday closes everybody at once. This is the other half: one
 * person away while the rest of the company works — annual leave, sickness, a
 * training week.
 *
 * HOW IT IS STORED, AND WHY THERE. An away period is written as a custom day on
 * that person: an entry in `settings.operational_hours.holidays` of the shape
 * `{ title, from, to }`, tagged `source: 'away'` so this screen can find and
 * clear its own entries without disturbing any real holiday the person already
 * had. This is the exact list the per-person forwarding screen (People →
 * forwarding → Call rules) writes and reads, so the two screens now agree on
 * one source of truth instead of a bespoke blob only this page understood.
 *
 * WHERE AN AWAY CALL GOES. A custom day marks the person *closed* for those
 * dates; a closed call then follows that person's closed-hours destination
 * (`settings.operational_hours.closed_hour_action`) — voicemail, an extension,
 * a queue, an announcement, a group, or hang up. Each row shows where that is,
 * so an admin can see exactly where an away person's calls will land. The panel
 * below can set it for everyone ticked, using the same picker as the forwarding
 * screen. Setting it here is the person's closed-hours destination in general,
 * not only while away — that is deliberate, and the panel says so.
 *
 * NOT YET CONFIRMED ON THE SWITCH. The dialplan change that reads closed days
 * and honours the closed-hours destination is written and tested in this repo
 * (`backend-patches/fs-xml-api/patch_holidays.py`,
 * `apply-closed-hours-destination.sh`) but has not been confirmed applied on the
 * switch. Until it is, this screen records the closure and the destination and
 * nothing more, and the amber panel says so rather than promising a phone will
 * stay quiet.
 *
 * SAVING ECHOES THE WHOLE PERSON BACK. `/api/user/update` replaces the record —
 * there is no endpoint that patches one field on somebody else — so every other
 * value is read off the person and written straight back, exactly as
 * `company-holiday-apply.tsx` and `use-presence-control.ts` do. A payload
 * assembled from assumptions about what a record contains is how settings get
 * silently dropped, and this codebase has paid for that before: presence
 * updates once erased people's voicemail greetings because `greetings` was left
 * out of the echo.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarOff,
  CheckCircle2,
  Info,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BackButton } from './section-actions';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import Loader from '@/components/custom/loader';
import { CustomDatePicker } from '@/components/custom/custom-datepicker';
import ForwardingActions, { callForwardingOptions } from '@/components/custom/forwarding-actions';
import { handleAlert } from '@/lib/utils';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { parseForwardActions } from '@/lib/call-standard';
import { useUser } from '@/hooks/use-user';
import { getUserList, updateMemberForwading } from '@/services/api';

/* Saves run one at a time with a breath between them. `/api/user/update`
   regenerates that person's device configuration, and two hundred parallel
   writes is how a bulk action becomes an outage. Same pace as the holiday
   apply panel next door. */
const BATCH_PAUSE_MS = 150;

/* The marker that tells an away custom-day apart from a real holiday the person
   set for another reason. Never routed on — only used to find and replace this
   screen's own entries. */
const AWAY_SOURCE = 'away';

/* ------------------------------------------------------------- date helpers */

const pad = (value: number) => `${value}`.padStart(2, '0');

const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/* Parsed to local noon so a browser west of UTC cannot render 2026-09-05 as the
   4th, which is how an off-by-one away date reaches production. */
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

const todayIso = () => toIso(new Date());

const asObject = (value: unknown): any => parseForwardActions(value) || {};

/* --------------------------------------------------------------- the period */

interface AwayPeriod {
  from: string;
  to: string;
  note?: string;
}

const cleanIso = (value: unknown) => `${value || ''}`.slice(0, 10);

/* Both ends are required, here and in the dialplan. A start with no end would
   mean "away until somebody remembers to clear this", and an admin who sets a
   start date and moves on would take that person off the phones for good
   without ever being told. A half-filled period is read as not set. */
const validPeriod = (from: string, to: string): AwayPeriod | null => {
  if (!from || !to || to < from) return null;
  return { from, to };
};

const holidaysOf = (person: any): any[] => {
  const operational = asObject(asObject(person?.settings)?.operational_hours);
  return Array.isArray(operational?.holidays) ? operational.holidays : [];
};

/* The away period is the custom day this screen tagged as its own. */
const readAway = (person: any): AwayPeriod | null => {
  const entry = holidaysOf(person).find((item) => item?.source === AWAY_SOURCE);
  if (!entry) return null;
  const period = validPeriod(cleanIso(entry.from), cleanIso(entry.to));
  return period ? { ...period, note: entry?.title ? `${entry.title}` : undefined } : null;
};

/* Records made before this screen wrote custom days still show, so nobody's
   booked leave disappears the day the model changes. Two legacy homes: the old
   `settings.away` blob, and the `holiday_start_date`/`holiday_end_date` columns
   that were always returned and written by nothing. */
const readLegacyAway = (person: any): AwayPeriod | null => {
  const blob = asObject(asObject(person?.settings)?.away);
  const fromBlob = validPeriod(cleanIso(blob?.from), cleanIso(blob?.to));
  if (fromBlob) return { ...fromBlob, note: blob?.note ? `${blob.note}` : undefined };
  return validPeriod(cleanIso(person?.holiday_start_date), cleanIso(person?.holiday_end_date));
};

const awayOf = (person: any): AwayPeriod | null => readAway(person) || readLegacyAway(person);

const isAwayOn = (period: AwayPeriod | null, iso: string) =>
  !!period && period.from <= iso && period.to >= iso;

/* Where a closed (and therefore away) call goes for this person, as a short
   label read off their stored closed-hours destination. */
const describeClosedDestination = (person: any): string | null => {
  const operational = asObject(asObject(person?.settings)?.operational_hours);
  const action = asObject(operational?.closed_hour_action);
  const type = `${action?.type || ''}`.toUpperCase();
  if (!type || action?.enabled === false) return null;
  const option = callForwardingOptions.find((item) => item.value === type);
  const base = option?.label || type;
  const target = `${action?.value_label || action?.value || ''}`.trim();
  if (type === 'VOICEMAIL') return action?.personal === false ? `${base} (shared)` : base;
  if (type === 'HANGUP') return base;
  return target ? `${base}: ${target}` : base;
};

/* ------------------------------------------------------- the destination form

   ForwardingActions is driven by watch/setValue over a dotted path, the way
   react-hook-form drives it on the forwarding screen. Here that form is a
   single piece of local state and these two shims stand in for the RHF pair, so
   the exact same picker renders with no form library. */
const getByPath = (root: any, path: string) =>
  `${path}`.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), root);

const setByPath = (root: any, path: string, value: any) => {
  const keys = `${path}`.split('.');
  const next = Array.isArray(root) ? [...root] : { ...(root || {}) };
  let cursor = next;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    const child = cursor[key];
    cursor[key] = Array.isArray(child) ? [...child] : { ...(child || {}) };
    cursor = cursor[key];
  });
  return next;
};

interface ClosedAction {
  type: { label: string; value: string };
  value: { label: string; value: string; name?: string };
  personal: boolean;
}

const EMPTY_ACTION: { action: ClosedAction } = {
  action: {
    type: { label: '', value: '' },
    value: { label: '', value: '' },
    personal: true,
  },
};

/* ------------------------------------------------------------------- the UI */

type Outcome = 'saved' | 'cleared' | 'unchanged' | 'failed';

interface PersonResult {
  outcome: Outcome;
  text: string;
}

const outcomeStyle: Record<Outcome, string> = {
  saved: 'text-emerald-700',
  cleared: 'text-gray-600',
  unchanged: 'text-gray-500',
  failed: 'text-red-600',
};

const OutcomeIcon = ({ outcome }: { outcome: Outcome }) => {
  if (outcome === 'failed') return <XCircle className="h-3.5 w-3.5 shrink-0" />;
  if (outcome === 'saved') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />;
  return <Trash2 className="h-3.5 w-3.5 shrink-0" />;
};

const CompanyAwayDates = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const adminSiteUuid = user?.user_info?.site_uuid || '';

  const [search, setSearch] = useState('');
  const [onlyAway, setOnlyAway] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');

  /* Setting the destination is opt-in. Left off, a save only books the dates and
     leaves each person's existing closed-hours destination exactly as it was —
     writing an empty action would silently wipe wherever their after-hours calls
     already go. */
  const [setDestination, setSetDestination] = useState(false);
  const [destForm, setDestForm] = useState<{ action: ClosedAction }>(EMPTY_ACTION);
  const watchDest = (path: string) => getByPath(destForm, path);
  const setDestValue = (path: string, value: any) =>
    setDestForm((previous) => setByPath(previous, path, value));

  const [results, setResults] = useState<Record<string, PersonResult>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const stopped = useRef(false);

  const {
    data: people = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ['fetchUsersList', 'companyAwayDates'],
    queryFn: () => fetchAllPages(getUserList),
    staleTime: 60 * 1000,
  });

  /* Fixed once per render so every row is judged against the same day. Rows
     resolved either side of midnight could otherwise disagree. */
  const today = useMemo(() => todayIso(), [people]);

  const rows = useMemo(() => {
    return (people as any[])
      .map((person) => {
        const uuid = `${person?.uuid || ''}`;
        const name = `${person?.first_name || ''} ${person?.last_name || ''}`.trim();
        const period = awayOf(person);
        return {
          uuid,
          person,
          name: name || person?.email || 'Unnamed person',
          extension: `${person?.extension || ''}`,
          email: `${person?.email || ''}`,
          period,
          destination: describeClosedDestination(person),
          awayToday: isAwayOn(period, today),
        };
      })
      .filter((row) => row.uuid)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, today]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyAway && !row.period) return false;
      if (!needle) return true;
      return [row.name, row.extension, row.email].some((value) =>
        `${value}`.toLowerCase().includes(needle),
      );
    });
  }, [rows, search, onlyAway]);

  const awayTodayCount = useMemo(() => rows.filter((row) => row.awayToday).length, [rows]);
  const bookedCount = useMemo(() => rows.filter((row) => row.period).length, [rows]);

  const selectedRows = useMemo(() => visible.filter((row) => selected[row.uuid]), [visible, selected]);

  const allVisibleOn = visible.length > 0 && visible.every((row) => selected[row.uuid]);

  /* ------------------------------------------------------------- the write */

  /* Turn the picker's form into the stored closed-hours action, or null when the
     admin has not chosen a type. Mirrors the shape the forwarding screen writes
     (`{ type, type_label, value, value_label, personal, enabled }`). */
  const buildClosedAction = (): any | null => {
    if (!setDestination) return null;
    const type = `${destForm.action?.type?.value || ''}`.trim();
    if (!type) return null;
    const needsTarget = !['VOICEMAIL', 'HANGUP'].includes(type);
    const value = `${destForm.action?.value?.value || ''}`.trim();
    if (needsTarget && !value) return null;
    return {
      type,
      type_label: destForm.action?.type?.label || '',
      value,
      value_label: destForm.action?.value?.label || destForm.action?.value?.name || '',
      personal: !!destForm.action?.personal,
      enabled: true,
    };
  };

  /* One person, whole record echoed. The away period is written as a tagged
     custom day; any earlier away entry is dropped first so a person never
     collects two. Real holidays (no away tag) are left untouched. The legacy
     `settings.away` blob is removed once its dates live in the custom day, so
     the record does not carry the same period in two places. */
  const writeAway = async (
    row: any,
    period: AwayPeriod | null,
    closedAction: any | null,
  ): Promise<PersonResult> => {
    const person = row.person;
    const settings = asObject(person?.settings);
    const operational = asObject(settings?.operational_hours);

    const existingHolidays = Array.isArray(operational?.holidays) ? operational.holidays : [];
    const keptHolidays = existingHolidays.filter((item: any) => item?.source !== AWAY_SOURCE);
    const nextHolidays = period
      ? [...keptHolidays, { title: period.note || 'Away', from: period.from, to: period.to, source: AWAY_SOURCE }]
      : keptHolidays;

    const nextOperational = {
      ...operational,
      holidays: nextHolidays,
      ...(closedAction ? { closed_hour_action: closedAction } : {}),
    };

    const nextSettings = { ...settings, operational_hours: nextOperational };
    /* Migrated into the custom day; do not leave a second copy behind. */
    delete nextSettings.away;

    const roleId = person?.custom_role_uuid || person?.role_uuid;
    const siteUuid = person?.site_uuid || person?.site?.uuid;

    await updateMemberForwading({
      first_name: person?.first_name,
      last_name: person?.last_name,
      job_title: person?.job_title,
      /* Omitted when absent rather than sent empty: writing these back in a
         different form than they were stored reads as "clear this", not "we
         could not resolve it". */
      ...(person?.caller_id ? { caller_id: person.caller_id } : {}),
      ...(siteUuid ? { site_uuid: siteUuid } : {}),
      ...(person?.profile ? { profile: person.profile } : {}),
      call_forwarding: asObject(person?.call_forwarding),
      ...(person?.custom_role_uuid ? { custom_role_uuid: roleId } : { role_uuid: roleId }),
      greetings: asObject(person?.greetings),
      settings: nextSettings,
      uuid: person?.uuid,
      userID: person?.uuid,
    });

    if (!period) {
      return { outcome: 'cleared', text: 'Away dates cleared. They take calls as normal.' };
    }
    const wentTo = closedAction
      ? ` Calls go to ${describeClosedDestination({ settings: { operational_hours: { closed_hour_action: closedAction } } }) || 'the chosen destination'}.`
      : '';
    return {
      outcome: 'saved',
      text: `Away ${prettyDate(period.from)} – ${prettyDate(period.to)}.${wentTo}`,
    };
  };

  const { mutate: run, isPending: running } = useMutation({
    mutationFn: async ({
      targets,
      period,
      closedAction,
    }: {
      targets: any[];
      period: AwayPeriod | null;
      closedAction: any | null;
    }) => {
      stopped.current = false;
      setResults({});
      setProgress({ done: 0, total: targets.length });

      const tally: Record<Outcome, number> = { saved: 0, cleared: 0, unchanged: 0, failed: 0 };

      for (const row of targets) {
        if (stopped.current) break;

        let result: PersonResult;
        try {
          result = await writeAway(row, period, closedAction);
        } catch (error: any) {
          result = {
            outcome: 'failed',
            text:
              error?.response?.data?.message ||
              error?.message ||
              'The save was rejected. Nothing was changed for this person.',
          };
        }

        tally[result.outcome] += 1;
        setResults((previous) => ({ ...previous, [row.uuid]: result }));
        setProgress((previous) => (previous ? { ...previous, done: previous.done + 1 } : previous));

        if (BATCH_PAUSE_MS) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
        }
      }

      return tally;
    },
    onSuccess: (tally) => {
      queryClient.invalidateQueries({ queryKey: ['fetchUsersList'] });
      const changed = tally.saved + tally.cleared;
      handleAlert({
        text: tally.failed
          ? `${changed} updated, ${tally.failed} failed. The list says what happened to each.`
          : `${changed} ${changed === 1 ? 'person' : 'people'} updated.`,
        type: tally.failed ? 'error' : 'success',
      });
    },
    onError: () => {
      handleAlert({ text: 'The run stopped early. Nothing further was changed.', type: 'error' });
    },
  });

  const toggleRow = (uuid: string) =>
    setSelected((previous) => {
      const next = { ...previous };
      if (next[uuid]) delete next[uuid];
      else next[uuid] = true;
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((previous) => {
      const next = { ...previous };
      visible.forEach((row) => {
        if (allVisibleOn) delete next[row.uuid];
        else next[row.uuid] = true;
      });
      return next;
    });

  const startSet = () => {
    if (!selectedRows.length) {
      handleAlert({ text: 'Tick the people who are away first.', type: 'error' });
      return;
    }
    if (!from || !to) {
      handleAlert({ text: 'Pick both a first day and a last day.', type: 'error' });
      return;
    }
    if (to < from) {
      handleAlert({ text: 'The last day cannot be before the first day.', type: 'error' });
      return;
    }
    if (setDestination) {
      const type = `${destForm.action?.type?.value || ''}`.trim();
      if (!type) {
        handleAlert({ text: 'Pick where away calls should go, or turn that option off.', type: 'error' });
        return;
      }
      const needsTarget = !['VOICEMAIL', 'HANGUP'].includes(type);
      if (needsTarget && !`${destForm.action?.value?.value || ''}`.trim()) {
        handleAlert({ text: 'Choose the destination for that redirection.', type: 'error' });
        return;
      }
    }
    run({
      targets: selectedRows,
      period: { from, to, note: note.trim() || undefined },
      closedAction: buildClosedAction(),
    });
  };

  const startClear = () => {
    if (!selectedRows.length) {
      handleAlert({ text: 'Tick the people whose away dates you want removed.', type: 'error' });
      return;
    }
    run({ targets: selectedRows, period: null, closedAction: null });
  };

  return (
    <div className="cs-section flex w-full flex-col gap-4">
      <div className="cs-block">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ucass-primary-200 text-primary">
            <CalendarOff className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">Who is away</p>
            <p className="mt-1 text-xs text-gray-600">
              One person off while everybody else works — leave, sickness, a training week. A
              company holiday closes the whole company; this closes one person, and sends their
              calls wherever you choose.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-gray-600">
          <p>
            <span className="text-sm font-semibold text-gray-900">{awayTodayCount}</span> away today
          </p>
          <p className="mt-0.5">{bookedCount} with dates booked</p>
        </div>
      </div>

      {/* HONESTY GATE. The dialplan change that reads closed days and honours the
          closed-hours destination is written and tested but not confirmed on the
          switch, so this screen records the closure and the destination and
          nothing more. It must say so until that is verified — a screen promising
          a call will divert, on a switch that has not been updated, is worse than
          no screen. When the switch is confirmed, swap this block for the green
          one in git history; nothing else here needs to change. */}
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900">
            Dates and destinations are recorded, but not yet acting on live calls
          </p>
          <p className="mt-0.5 text-xs text-gray-700">
            Booking somebody away marks them closed for those days and records where their calls
            should go, and everyone can see who is off. It does not change a live call yet — their
            phone still rings. The switch change that reads closed days and diverts to the chosen
            destination is written and tested but not confirmed applied. Once it is, an away
            person&apos;s callers go straight to that destination, on outside calls and on a
            colleague dialling their extension.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        <p className="text-xs text-gray-700">
          <span className="font-semibold text-gray-900">Both dates are needed.</span> A first day
          with no last day would mean &ldquo;away until somebody remembers to clear this&rdquo;, and
          a person set that way would be off the phones for good without anyone being told. Both
          days count as away, and the dates are read in your company&apos;s own timezone.
        </p>
      </div>

      {/* Set or clear. Above the list, because the list is what it acts on. */}
      <div className="mt-3 rounded-lg border border-ucass-primary-200 bg-ucass-primary-200/40 p-3">
        <p className="text-xs font-semibold text-gray-900">
          Set away dates for the people ticked below
        </p>

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="w-full sm:w-44">
            <CustomDatePicker
              label="First day away"
              placeholder="Pick a date"
              value={from ? isoToDate(from) : null}
              onChange={(date) => {
                if (!date) return;
                const iso = toIso(date);
                setFrom(iso);
                /* One day off is the common case, so the last day follows the
                   first until it is deliberately set apart. */
                setTo((previous) => (!previous || previous < iso ? iso : previous));
              }}
            />
          </div>
          <div className="w-full sm:w-44">
            <CustomDatePicker
              label="Last day away"
              placeholder="Pick a date"
              minDate={from ? isoToDate(from) || undefined : undefined}
              value={to ? isoToDate(to) : null}
              onChange={(date) => date && setTo(toIso(date))}
            />
          </div>
          <div className="w-full sm:w-64">
            <Input
              label="Reason (optional)"
              placeholder="Annual leave"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        {/* Redirection, opt-in. Off by default so booking dates never disturbs a
            person's existing after-hours routing. */}
        <div className="mt-3 rounded-lg border border-ucass-primary-200 bg-white/70 p-3">
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              checked={setDestination}
              onCheckedChange={() => setSetDestination((previous) => !previous)}
              disabled={running}
              aria-label="Also set where away calls go"
            />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-gray-900">
                Also set where their calls go while closed
              </span>
              <span className="block text-xs text-gray-600">
                Sends away callers to voicemail, another extension, a group, an announcement or a
                queue. This is the person&apos;s closed-hours destination in general, not only while
                away, and it applies to everyone ticked. Leave off to book the dates only and keep
                each person&apos;s current routing.
              </span>
            </span>
          </label>

          {setDestination && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <ForwardingActions
                setValue={setDestValue}
                watch={watchDest}
                errors={{}}
                forwardState="action"
                SITE_UUID={adminSiteUuid}
                description="Where a closed or away call for the ticked people should be sent."
                menuPlacement="bottom"
              />
              <p className="mt-2 text-[11px] text-gray-500">
                An extension is looked up in your own site&apos;s list. Groups, queues and
                announcements are shared across the company.
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" onClick={startSet} disabled={running || isPending}>
            {running
              ? 'Saving…'
              : `Set for ${selectedRows.length} ${selectedRows.length === 1 ? 'person' : 'people'}`}
          </Button>
          <Button
            type="button"
            variant="destructiveOutline"
            onClick={startClear}
            disabled={running || isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear dates
          </Button>
          {running && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopped.current = true;
              }}
            >
              Stop after this one
            </Button>
          )}
        </div>

        {progress && (
          <p className="mt-2 text-xs text-gray-600">
            {progress.done} of {progress.total} done{running ? '…' : ''}
          </p>
        )}
      </div>

      {/* The list. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, extension or email"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={onlyAway} onCheckedChange={() => setOnlyAway((previous) => !previous)} />
          <span className="text-xs text-gray-600">Only people with dates booked</span>
        </label>
      </div>

      {isError ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs text-gray-700">
            The list of people could not be loaded, so nothing can be changed safely. Reload the
            page and try again.
          </p>
        </div>
      ) : isPending ? (
        <div className="mt-3">
          <Loader />
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={allVisibleOn}
                onCheckedChange={toggleAllVisible}
                disabled={running || visible.length === 0}
                aria-label="Select everyone shown"
              />
              <span className="text-sm font-semibold text-gray-900">
                People <span className="font-normal text-gray-500">({visible.length})</span>
              </span>
            </label>
            <span className="text-xs text-gray-600">
              {selectedRows.length > 0 ? `${selectedRows.length} selected` : 'Tick who is away'}
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="p-3 text-xs text-gray-500">
              {rows.length === 0 ? 'Nobody on this account yet.' : 'Nobody matches that search.'}
            </p>
          ) : (
            <div className="flex max-h-96 flex-col overflow-y-auto">
              {visible.map((row) => {
                const result = results[row.uuid];
                return (
                  <label
                    key={row.uuid}
                    className="flex cursor-pointer items-center justify-between gap-3 border-b border-gray-100 p-2.5 last:border-b-0 hover:bg-gray-50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Checkbox
                        checked={!!selected[row.uuid]}
                        onCheckedChange={() => toggleRow(row.uuid)}
                        disabled={running}
                        aria-label={`Select ${row.name}`}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm text-gray-900">{row.name}</span>
                          {row.awayToday && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              Away today
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {row.extension ? `Extension ${row.extension}` : row.email}
                          {row.destination && (
                            <span className="text-gray-400"> · closed → {row.destination}</span>
                          )}
                        </span>
                      </span>
                    </span>

                    {result ? (
                      <span
                        className={`flex shrink-0 items-center gap-1.5 text-xs ${outcomeStyle[result.outcome]}`}
                      >
                        <OutcomeIcon outcome={result.outcome} />
                        <span className="max-w-[22rem] text-right">{result.text}</span>
                      </span>
                    ) : row.period ? (
                      <span className="shrink-0 text-right text-xs text-gray-600">
                        {prettyDate(row.period.from)} – {prettyDate(row.period.to)}
                        {row.period.note && (
                          <span className="block text-gray-400">{row.period.note}</span>
                        )}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-gray-400">Takes calls</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
          People are saved one at a time, not all at once, so a big change does not hit the switch
          in one burst. You can stop part-way — the people already saved keep their dates.
        </p>
      </div>

      {/* This screen applies its change from the controls above, so the end of
          it carries only the way back. */}
      <div className="cs-saverow">
        <BackButton />
      </div>
    </div>
  );
};

export default CompanyAwayDates;
