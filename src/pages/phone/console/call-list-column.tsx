import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { pickCounterpartNumber } from '@/lib/call-number';
import moment from 'moment';
import { callMoment, callTimestamp } from '@/lib/call-time';
import { fetchPhone } from '@/services/api';
import { useFetchContact } from '@/hooks/common';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useSocketEvents } from '@/hooks/use-socket-events';
import Loader from '@/components/custom/loader';
import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialVal, handleDate } from '@/components/custom/date-dropdown/constant';
import NumberWithFlag from '@/components/custom/number-with-flag';
import { Ic } from './icons';
import { formatDuration, initialsOf, realNameOrEmpty, talkSeconds } from './copilot-adapter';
import { useConsoleDialer } from './dial-number';
import { useCallerName } from './use-caller-name';
import { useContactSuggestions } from '@/hooks/use-contact-suggestions';
import { useUsersDirectory } from '@/hooks/use-users-directory';

/** The three call-log sources the old phone page exposed, same `tabType` values. */
export type ConsoleLogSource = 'call' | 'recording' | 'voicemail';

export type ConsoleCallRow = {
  id: string;
  raw: any;
  direction: 'in' | 'out' | 'miss';
  name: string;
  number: string;
  time: string;
  duration: string;
  topic: string;
  contactId: string | number | null;
  /** how many calls this row stands for — 1 unless the number repeats */
  callCount: number;
  /** matched against the users directory (an extension), not the contact book */
  isDirectoryMatch?: boolean;
  hasRecording: boolean;
  /** whether the LATEST call has a transcript, same rule the record panel uses */
  hasTranscript: boolean;
  /** whether the LATEST call ended in a message being left */
  hasVoicemail: boolean;
  /** the shape `LogContent` consumes — matches call-list.tsx's buildLogData */
  logData: {
    main: any;
    count: number;
    acc_logs: any[];
    number: string;
  };
};

const DIRECTION_FILTERS: { key: 'all' | 'in' | 'out' | 'miss'; label: string; filter: any[] }[] = [
  { key: 'all', label: 'All', filter: [] },
  { key: 'in', label: 'Inbound', filter: [{ key: 'direction', value: 'Inbound' }] },
  { key: 'out', label: 'Outbound', filter: [{ key: 'direction', value: 'Outbound' }] },
  { key: 'miss', label: 'Missed', filter: [{ key: 'direction', value: 'Missed' }] },
];

/* Sorting key for a call row. Falls back through the stamp fields the API has
   used, and returns 0 rather than NaN so an unparseable row sinks instead of
   scrambling the order around it. */
const sortStamp = (raw: any): number => {
  const value = raw?.start_stamp || raw?.created_at || raw?.answer_stamp || raw?.end_stamp;
  if (!value) return 0;
  return callTimestamp(value);
};

/* `billsec`/`duration` arrive as "HH:MM:SS" strings — Number() on those is NaN,
   which is why every row read "—". durationSeconds parses all the shapes the
   API uses; an em dash still means "no talk time", not "unparseable". */
/**
 * The most recent call in a group.
 *
 * A grouped entry carries AGGREGATE fields — `count`, and a `billsectotal` that
 * is the sum across every call to that number. Reading the row's own duration
 * therefore showed 92 calls added together (52:17) as though one call had run
 * that long. Everything the row displays about "the call" comes from this leg
 * instead: its time, its talk time, and whether it was recorded.
 */
const newestLog = (raw: any, logs: any[]): any => {
  if (!logs.length) return raw;
  return logs.reduce(
    (newest, log) => (sortStamp(log) >= sortStamp(newest) ? log : newest),
    logs[0],
  );
};

const isRecorded = (log: any) =>
  Boolean(log?.record_file || log?.recording || log?.recording_file || log?.record_path);

/**
 * Whether this call has a transcript to read.
 *
 * Deliberately the SAME field the record panel builds its transcript URL from
 * (call-record.tsx: `transcript_file`). A badge that promised a transcript the
 * panel could not open would be worse than no badge - the point of it is to
 * save opening a call to find out.
 */
const isTranscribed = (log: any) => Boolean(String(log?.transcript_file ?? '').trim());

/**
 * Whether this call ended in somebody leaving a message.
 *
 * `is_voicemail` comes back as 1/0 from the API (it is the same column the
 * reports read), so it is compared loosely rather than with ===. A call that
 * went to voicemail looked identical to one nobody answered, which is a
 * meaningful difference: one has something to listen to.
 */
const isVoicemail = (log: any) => {
  const flag = log?.is_voicemail;
  return flag === true || flag === 1 || flag === '1';
};

const secondsToClock = (raw: any) => {
  const seconds = talkSeconds(raw);
  return seconds > 0 ? formatDuration(seconds) : '—';
};

const timeLabel = (stamp: unknown) => {
  if (!stamp) return '';
  const m = callMoment(stamp);
  if (!m.isValid()) return String(stamp);
  return m.isSame(moment(), 'day') ? m.format('HH:mm') : m.format('DD MMM');
};

const getEntryLogs = (main: any = {}) => {
  const callLogs = Array.isArray(main?.call_logs)
    ? main.call_logs.filter((item: any) => item && typeof item === 'object')
    : [];
  return callLogs.length ? callLogs : main && Object.keys(main).length ? [main] : [];
};

/* Which side of the call is the OTHER party — decided by looking at the
   values, not at the direction label. A call started in the web phone is
   logged as Inbound with our own `<extension>_web` as the caller, so going by
   direction alone showed people their own extension back. */
const getEntryRawNumber = (main: any = {}) => pickCounterpartNumber(main);

const getEntryNumber = (main: any = {}) => getEntryRawNumber(main).replace(/ /g, '');

/**
 * The contact map is keyed by whatever the call log stored, which is not always
 * the same shape as the number we display — it may carry spaces, a leading "+",
 * or a country prefix the saved contact lacks. Looking up only the
 * space-stripped form meant saved contacts kept reading "Not in contacts", so
 * the usual variants are tried, then a digits-only match as a last resort.
 */
const digitsOf = (value: string) => value.replace(/\D/g, '');

const findContact = (contactsByNumber: Record<string, any>, rawNumber: string) => {
  if (!contactsByNumber || !rawNumber) return null;

  const stripped = rawNumber.replace(/ /g, '');
  for (const key of [rawNumber, stripped, stripped.replace(/^\+/, ''), `+${stripped}`]) {
    if (key && contactsByNumber[key]) return contactsByNumber[key];
  }

  const digits = digitsOf(rawNumber);
  if (digits.length < 7) return null;
  /* Same number only when the longer form carries nothing but a country code
     (up to 3 digits) in front of the shorter one. A 16-digit test number that
     happens to end in a saved contact's digits is not that contact. */
  const match = Object.keys(contactsByNumber).find((key) => {
    const keyDigits = digitsOf(key);
    if (keyDigits.length < 7) return false;
    const [longer, shorter] =
      keyDigits.length >= digits.length ? [keyDigits, digits] : [digits, keyDigits];
    return longer.endsWith(shorter) && longer.length - shorter.length <= 3;
  });
  return match ? contactsByNumber[match] : null;
};

export const toCallRow = (
  raw: any,
  contactsByNumber: Record<string, any>,
  /* Extensions are never in the contact book — the users directory is the only
     place a colleague's name lives, so without this every internal call in the
     list read "Not in contacts". */
  resolveName?: (number: string) => string,
): ConsoleCallRow => {
  const accLogs = getEntryLogs(raw);
  /* One row stands for every call to this number, and what it says about "the
     call" — direction, time, length, recorded — is the most recent one. The
     entry's own fields are aggregates across the whole group. */
  const latest = newestLog(raw, accLogs);

  const rawDirection = String(latest?.direction || raw?.direction || '').toLowerCase();
  const isMissed =
    rawDirection === 'missed' ||
    String(latest?.hangup_cause || raw?.hangup_cause || '').toUpperCase() === 'NO_ANSWER' ||
    /* Talk time, not total: an unanswered call still has a `duration`, which is
       how long it rang, so testing that never found a missed call. */
    (rawDirection === 'inbound' && talkSeconds(latest) === 0);
  const direction: ConsoleCallRow['direction'] = isMissed
    ? 'miss'
    : rawDirection === 'outbound'
      ? 'out'
      : 'in';

  const number = getEntryNumber(raw);
  const contact = findContact(contactsByNumber, getEntryRawNumber(raw)) || {};
  const savedName = contact?.first_name
    ? `${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ''}`.trim()
    : String(contact?.name || '').trim();
  /* `contact_name`/`caller_id_name` on the row do NOT reliably identify the
     other party — for a call started in the web phone the switch stamps the
     agent's own name there (it means "received by", not "calling from"), so
     showing it as this row's identity attached the agent's name to numbers
     that were never saved as a contact. Only a real saved-contact match earns
     a name here; everyone else reads "Unknown Contact", same as the legacy
     Phone page. */
  /* The API resolves an extension to its owner's name server-side and returns
     it on the row. Use the side that is the OTHER party — `from_display_name`
     is our own extension, so it would caption every call with the agent's own
     name. Only `phone-call-list` currently omits these (the report endpoint
     fills them in), so this is a no-op there until the switch's own rows carry
     them; the directory lookup below still covers real extensions. */
  const apiName = realNameOrEmpty(
    rawDirection === 'outbound'
      ? raw?.to_display_name
      : raw?.caller_id_display_name || raw?.to_display_name,
  );
  const directoryName = savedName ? '' : resolveName?.(number) || '';
  const contactName = savedName || apiName || directoryName;

  return {
    id: String(raw?.uuid || raw?.id || raw?.sip_call_id || `${number}-${raw?.start_stamp}`),
    raw,
    direction,
    name: contactName || 'Unknown Contact',
    number,
    time: timeLabel(latest?.start_stamp || raw?.start_stamp),
    /* The LATEST call's talk time, not the group's total. A call nobody
       answered has no length worth showing — printing its ring time reads as a
       conversation that never happened. */
    duration: secondsToClock(latest),
    topic: String(raw?.disposition || raw?.queue_name || '').trim(),
    contactId: contact?.id || null,
    callCount: Math.max(Number(raw?.count) || accLogs.length || 1, 1),
    /* A directory match is a real identity even though it has no contact
       record, so the row must not offer to "add" it as one. */
    isDirectoryMatch: Boolean(directoryName || apiName),
    /* Whether THIS row's call was recorded — the latest one. Asking "did any of
       the 92 have a recording" put a Recorded badge on a row whose own call had
       none, which sent people to a player that had nothing to play. */
    hasRecording: isRecorded(latest),
    /* Same rule as the recording badge, and for the same reason: the latest
       call, not "any of them". */
    hasTranscript: isTranscribed(latest),
    hasVoicemail: isVoicemail(latest),
    logData: {
      main: raw,
      count: raw?.count ?? accLogs.length,
      acc_logs: accLogs,
      number,
    },
  };
};

type Props = {
  selectedId: string | null;
  onSelect: (row: ConsoleCallRow) => void;
  /** Same data as onSelect, but for the list choosing a row on its own
      (landing the panel on real content) rather than someone clicking one —
      so it does not also pull the stage off the dialer and onto that call's
      record the way an actual click does. */
  onAutoSelect?: (row: ConsoleCallRow) => void;
  source: ConsoleLogSource;
  onSourceChange: (source: ConsoleLogSource) => void;
  liveNumber?: string;
};

const CallListColumn = ({
  selectedId,
  onSelect,
  onAutoSelect,
  source,
  onSourceChange,
  liveNumber,
}: Props) => {
  const { dial } = useConsoleDialer();
  const [direction, setDirection] = useState<'all' | 'in' | 'out' | 'miss'>('all');
  const [search, setSearch] = useState('');
  const [dropdownVal, setDropdownVal] = useState(() => ({
    ...dropdownCallInitialVal,
    /* Opens on recent calls rather than a calendar day: a phone's call list
       is "who did I talk to lately". Pages of 50, newest first, so the last
       few hundred are a scroll away; the menu still narrows to a day. */
    date_type: 'Last 30 Days',
    value: handleDate('Last 30 Days'),
  }));
  const { data: contactsByNumber } = useFetchContact();
  const { resolveName } = useCallerName();
  const { features } = useCompanyFeatures();
  const callAccess = features?.plan_features?.advance_call_management?.access;

  /* Searching here used to only look through calls that already happened, so
     someone with no call history yet (or a contact you have simply never
     called) was unfindable — the box could only ever answer "who have I
     talked to", not "who can I call". Same contact-book + extension-directory
     search the dialler's "Type a name or number" field already does, applied
     to this box too, and only on the Calls tab (a recording or voicemail
     search over contacts makes no sense). */
  const searchQuery = source === 'call' ? search.trim() : '';
  const { matches: contactHits } = useContactSuggestions(searchQuery);
  const { users: directoryUsers } = useUsersDirectory();
  const directoryHits = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return [] as { name: string; extension: string; role: string }[];
    return (directoryUsers || [])
      .map((u: any) => ({
        name: `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || u?.email || 'User',
        extension: String(u?.extension || u?.user_info?.extension || '').trim(),
        role: u?.role || u?.department_name || 'Extension',
      }))
      .filter((u: any) => u.extension && `${u.name} ${u.extension}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [directoryUsers, searchQuery]);

  const filterDate = dropdownVal?.value || {};
  const activeDirection =
    DIRECTION_FILTERS.find((f) => f.key === direction) || DIRECTION_FILTERS[0];
  /* "Missed" is not a direction the switch records — it is derived from the
     hangup cause, or from an inbound call that never got a talk second. Asking
     the API to filter on direction='Missed' therefore returns nothing. Inbound
     and outbound are real values and stay server-side; missed is fetched
     unfiltered and narrowed below, on the same rule `toCallRow` already uses. */
  const filterMissedLocally = source !== 'voicemail' && direction === 'miss';
  // Voicemails were never direction-filtered on the old page; keep that.
  const directionFilter =
    source === 'voicemail' || filterMissedLocally ? [] : activeDirection.filter;

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: [
        'console-call-list',
        source,
        source === 'voicemail' ? 'all' : direction,
        filterDate?.from,
        filterDate?.to,
      ],
      queryFn: ({ pageParam = 1 }) =>
        fetchPhone({
          page: pageParam,
          limit: 50,
          type: source === 'call' ? undefined : source,
          filter: directionFilter,
          filter_date: {
            from: filterDate?.from,
            to: filterDate?.to,
            // the viewer's zone, so "Today" is the viewer's day, not UTC's
            timezone: filterDate?.timezone,
          },
          sort: { key: 'start_stamp', desc: true },
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage: any) => {
        const result = lastPage?.data?.data?.result;
        const { currentPage, totalPages } = result || {};
        if (!currentPage || !totalPages || currentPage >= totalPages) return undefined;
        return currentPage + 1;
      },
    });

  /* Live update: cdr-ingest (server 121) pushes one event per call it writes
     or merges. Re-running the existing query on that signal - rather than
     splicing the pushed row into the cache by hand - means pagination and
     whatever filter/date-range is active stay exactly as correct as a normal
     fetch, with no separate de-dup logic to get wrong. This fires once per
     real call, so it's far cheaper than any polling interval would be. */
  const { callHistoryLiveUpdate } = useSocketEvents();
  useEffect(() => {
    if (!callHistoryLiveUpdate) return;
    refetch();
  }, [callHistoryLiveUpdate?.receivedAt]);

  const rows = useMemo(() => {
    const flat =
      data?.pages.flatMap((page: any) => page?.data?.data?.result?.rows || []) || ([] as any[]);

    /* The API already groups repeat calls: one entry per number, carrying its
       `call_logs` and a `count`. Keep that grouping. Ringing the same person
       five times is five rows of the same name and number, which buries the
       rest of the day's calls; one row carrying "(5)" says the same thing and
       opening it lists every leg — that list is what the record view on the
       right already renders. */
    const mapped = flat
      .map((raw: any, index: number) => {
        const row = toCallRow(raw, contactsByNumber || {}, resolveName);
        /* Two groups can share every field the id is built from. A positional
           suffix keeps React keys unique so neither row disappears. */
        return { ...row, id: `${row.id}#${index}` };
      })
      .sort((a, b) => sortStamp(b.raw) - sortStamp(a.raw));

    const visible = filterMissedLocally ? mapped.filter((row) => row.direction === 'miss') : mapped;
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((r) =>
      `${r.name} ${r.number} ${r.topic}`.toLowerCase().includes(q.replace(/^\+/, '')),
    );
  }, [data, contactsByNumber, search, filterMissedLocally, resolveName]);

  /* liveNumber is just the other party's number on the in-progress session —
     it has no call id to match against, so every past call to/from that same
     number would otherwise get tagged "Live now" too. Only the most recent
     matching row (rows are already sorted newest-first) is the actual call. */
  const liveRowId = useMemo(() => {
    if (!liveNumber) return null;
    const match = rows.find((row) => row.number && row.number.endsWith(liveNumber.slice(-7)));
    return match ? match.id : null;
  }, [rows, liveNumber]);

  /* Land the panel on real content instead of an empty "pick a call" one:
     pick the newest row whenever nothing is selected — on first load, and
     again whenever switching tabs clears the selection (onSourceChange in
     index.tsx resets it), so Voicemails/Recordings land populated too, not
     just Calls. Goes through onAutoSelect, not onSelect, so the stage stays
     on the dialer — only clicking a row should pull it onto that record. */
  useEffect(() => {
    if (selectedId || !rows.length) return;
    (onAutoSelect || onSelect)(rows[0]);
  }, [rows, selectedId, source, onAutoSelect, onSelect]);

  const sources: { key: ConsoleLogSource; label: string; show: boolean }[] = [
    { key: 'call', label: 'Calls', show: true },
    { key: 'recording', label: 'Recordings', show: Boolean(callAccess?.RECORDING) },
    { key: 'voicemail', label: 'Voicemails', show: true },
  ];

  return (
    <div className="col calls">
      <div className="col-head">
        {/* The column heading said "Calls" directly above a "Calls" tab, which
            named the tab twice and the column not at all. The date range sits
            here now, in place of an icon button that was a Refresh action
            drawn with a merge glyph — it read as an unexplained filter icon,
            and the list already refetches whenever the date or tab changes. */}
        <div className="col-title">
          <h2>Phone</h2>
          <div className="console-datefilter">
            <DateDropdown
              dropdownVal={dropdownVal}
              setDropdownVal={setDropdownVal}
              customPickerPlacement="bottom"
              inputClass=""
            />
          </div>
        </div>

        {/* source tabs — same tabType values the old phone page sent. The
            date filter now sits next to the heading above, so this row is
            just the tab strip. */}
        <div className="panel-tabs" style={{ padding: 0, margin: 0 }}>
          {sources
            .filter((s) => s.show)
            .map((s) => (
              <button
                type="button"
                key={s.key}
                className={`ptab ${source === s.key ? 'on' : ''}`}
                onClick={() => onSourceChange(s.key)}
              >
                {s.label}
              </button>
            ))}
        </div>

        {source !== 'voicemail' ? (
          <div className="seg" role="tablist">
            {DIRECTION_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={direction === f.key}
                className={direction === f.key ? 'on' : ''}
                onClick={() => setDirection(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="search-mini">
          <Ic n="search" size={13} />
          <input
            placeholder={source === 'call' ? 'Search contacts & calls…' : 'Search calls…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={source === 'call' ? 'Search contacts and calls' : 'Search calls'}
          />
        </div>
      </div>

      <div className="list">
        {isPending ? (
          <div className="empty" style={{ height: 200 }}>
            <Loader />
          </div>
        ) : !rows.length ? (
          <div className="empty" style={{ height: 200 }}>
            <Ic n="search" size={30} />
            <p>
              No{' '}
              {source === 'voicemail'
                ? 'voicemails'
                : source === 'recording'
                  ? 'recordings'
                  : 'calls'}{' '}
              in this date range.
            </p>
          </div>
        ) : (
          <>
            {rows.map((row) => {
              const isLive = !!liveRowId && row.id === liveRowId;
              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  className={`call-row ${selectedId === row.id ? 'on' : ''} ${isLive ? 'live-now' : ''}`}
                  onClick={() => onSelect(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(row);
                    }
                  }}
                >
                  <div className={`cr-av ${row.direction === 'miss' ? 'miss' : row.direction}`}>
                    <Ic
                      n={
                        row.direction === 'out'
                          ? 'arrow-out'
                          : row.direction === 'miss'
                            ? 'miss'
                            : 'arrow-in'
                      }
                      size={15}
                    />
                  </div>
                  <div className="cr-body">
                    <div className="cr-top">
                      {/* `is-num` turns the ellipsis off. A shortened name is
                          still recognisable; a shortened number is not — it is
                          a different number. See .cr-name.is-num in the CSS. */}
                      <span
                        className={`cr-name ${row.contactId || row.isDirectoryMatch ? '' : 'is-num'}`}
                      >
                        {/* an unsaved number is its own title — don't print it twice.
                            Plain text, not a dial action: scanning the list used to
                            place a call the moment a number was brushed. The phone
                            button on the right is the only thing that dials. */}
                        {row.contactId || row.isDirectoryMatch ? (
                          row.name
                        ) : (
                          <NumberWithFlag number={row.number} className="num" />
                        )}
                      </span>
                      {/* OUTSIDE .cr-name on purpose: that span truncates with an
                          ellipsis, and a badge inside it was truncated too — "92"
                          arrived on screen as "9". One row stands for every call to
                          this number; opening it lists them all. */}
                      {row.callCount > 1 ? (
                        <span className="cr-count" title={`${row.callCount} calls`}>
                          {row.callCount}
                        </span>
                      ) : null}
                      <span className="cr-time num">{row.time}</span>
                    </div>
                    <div className="cr-num">
                      {row.contactId || row.isDirectoryMatch ? (
                        <NumberWithFlag number={row.number} className="num" />
                      ) : (
                        <span style={{ color: 'var(--ink-4)' }}>Not in contacts</span>
                      )}
                      {row.duration !== '—' ? (
                        <span style={{ color: 'var(--ink-4)' }}> · {row.duration}</span>
                      ) : null}
                    </div>
                    {row.topic ? (
                      <div
                        className="cr-num"
                        style={{ marginTop: 3, color: 'var(--ink-4)', fontSize: 11 }}
                      >
                        {row.topic}
                      </div>
                    ) : null}
                    <div className="cr-tags">
                      {row.direction === 'miss' ? <span className="tag neg">Missed</span> : null}
                      {/* One badge, not two. A voicemail IS a recording - the
                          message is the recording - so a row carrying both said
                          the same thing twice and buried the part that matters.
                          Voicemail wins when it applies, because "they left a
                          message" is what you act on; "Recorded" is what a call
                          somebody actually answered has. */}
                      {row.hasVoicemail ? (
                        <span className="tag warn">
                          <Ic n="vm" size={9} /> Voicemail
                        </span>
                      ) : row.hasRecording ? (
                        <span className="tag acc">
                          <Ic n="rec" size={9} /> Recorded
                        </span>
                      ) : null}
                      {/* `ai`, not `neu`: a transcript is produced by the
                          speech service, and the console already has a palette
                          for that. Grey read as "disabled" beside the
                          Recorded badge and the two were hard to tell apart. */}
                      {row.hasTranscript ? (
                        <span className="tag ai">
                          <Ic n="transcript" size={9} /> Transcript
                        </span>
                      ) : null}
                      {isLive ? <span className="tag pos">Live now</span> : null}
                    </div>
                  </div>
                  {row.number ? (
                    <button
                      type="button"
                      className="cr-call"
                      aria-label={`Call ${row.name || row.number}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        dial(row.number);
                      }}
                    >
                      <Ic n="phone" size={14} />
                    </button>
                  ) : null}
                </div>
              );
            })}
            {hasNextPage ? (
              <div style={{ padding: 12 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ width: '100%' }}
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              </div>
            ) : null}
          </>
        )}

        {/* Contacts, then directory - after the calls above, in the same
           list, styled as the same kind of row rather than a separate boxed
           section. Rendered here rather than inside the branch above so they
           still show when nothing in the date range matched a call: a saved
           contact or colleague someone hasn't called yet is exactly what this
           is for. */}
        {contactHits.map((c) => (
          <div
            key={c.id || c.phone}
            role="button"
            tabIndex={0}
            className="call-row"
            onClick={() => c.phone && dial(c.phone)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && c.phone) {
                e.preventDefault();
                dial(c.phone);
              }
            }}
          >
            <div className="cr-av out">{initialsOf(c.name) || <Ic n="phone" size={14} />}</div>
            <div className="cr-body">
              <div className="cr-top">
                <span className="cr-name">{c.name || c.phone}</span>
              </div>
              {c.name ? (
                <div className="cr-num">
                  <NumberWithFlag number={c.phone} className="num" />
                </div>
              ) : null}
            </div>
            {c.phone ? (
              <button
                type="button"
                className="cr-call"
                aria-label={`Call ${c.name || c.phone}`}
                onClick={(e) => {
                  e.stopPropagation();
                  dial(c.phone);
                }}
              >
                <Ic n="phone" size={14} />
              </button>
            ) : null}
          </div>
        ))}

        {directoryHits.map((d) => (
          <div
            key={d.extension}
            role="button"
            tabIndex={0}
            className="call-row"
            onClick={() => dial(d.extension)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dial(d.extension);
              }
            }}
          >
            <div className="cr-av in">{initialsOf(d.name) || <Ic n="phone" size={14} />}</div>
            <div className="cr-body">
              <div className="cr-top">
                <span className="cr-name">{d.name}</span>
              </div>
              <div className="cr-num">
                {d.role} · <span className="num">ext {d.extension}</span>
              </div>
            </div>
            <button
              type="button"
              className="cr-call"
              aria-label={`Call ${d.name}`}
              onClick={(e) => {
                e.stopPropagation();
                dial(d.extension);
              }}
            >
              <Ic n="phone" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CallListColumn;
