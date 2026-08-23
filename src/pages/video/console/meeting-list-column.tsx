import { useMemo, useState } from 'react';
import { Ic } from './icons';
import { initialsOf, type VideoMeeting } from './demo-data';
import DemoChip from './panes/demo-chip';

/** The four books of meetings the left column can show. */
export type MeetingSource = 'upcoming' | 'live' | 'past' | 'recordings';

const SOURCES: { key: MeetingSource; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'past', label: 'Past' },
  { key: 'recordings', label: 'Recorded' },
];

/** Wall-clock label for a meeting that starts `mins` from now. */
export const clockLabel = (mins: number) => {
  const d = new Date(Date.now() + mins * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** "Today" / "Tue" / "12 Sep", so a row says when without a full date. */
export const dayLabel = (mins: number) => {
  const now = new Date();
  const then = new Date(now.getTime() + mins * 60_000);
  const days = Math.round(
    (new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Tmrw';
  if (days === -1) return 'Yest';
  if (Math.abs(days) < 7) return then.toLocaleDateString(undefined, { weekday: 'short' });
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** "in 12 min" / "started 8 min ago" — the phrase people actually scan for. */
export const relativeLabel = (mins: number) => {
  const abs = Math.abs(mins);
  const unit =
    abs < 60
      ? `${abs} min`
      : abs < 1440
        ? `${Math.round(abs / 60)} hr`
        : `${Math.round(abs / 1440)} d`;
  return mins >= 0 ? `in ${unit}` : `${unit} ago`;
};

const FaceStack = ({ people }: { people: VideoMeeting['participants'] }) => {
  const shown = people.slice(0, 4);
  const rest = people.length - shown.length;
  return (
    <div className="faces">
      {shown.map((p) => (
        <span key={p.id} className="face" style={{ background: p.tone }} title={p.name}>
          {initialsOf(p.name)}
        </span>
      ))}
      {rest > 0 && <span className="face more">+{rest}</span>}
    </div>
  );
};

type Props = {
  meetings: VideoMeeting[];
  isLoading: boolean;
  isError: boolean;
  /** every list came back empty, so the rows below are from demo-data.ts */
  usingDemo: boolean;
  selectedId: string | null;
  onSelect: (meeting: VideoMeeting) => void;
  onJoin: (meeting: VideoMeeting) => void;
  onNew: () => void;
  source: MeetingSource;
  onSourceChange: (source: MeetingSource) => void;
};

const MeetingListColumn = ({
  meetings,
  isLoading,
  isError,
  usingDemo,
  selectedId,
  onSelect,
  onJoin,
  onNew,
  source,
  onSourceChange,
}: Props) => {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const byBook = meetings.filter((m) => {
      if (source === 'recordings') return m.recorded;
      return m.state === source;
    });

    const q = query.trim().toLowerCase();
    const matched = q
      ? byBook.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.host.toLowerCase().includes(q) ||
            m.participants.some((p) => p.name.toLowerCase().includes(q)),
        )
      : byBook;

    // soonest first for what is ahead, most recent first for what is behind
    return [...matched].sort((a, b) =>
      source === 'past' || source === 'recordings'
        ? b.startsInMins - a.startsInMins
        : a.startsInMins - b.startsInMins,
    );
  }, [meetings, source, query]);

  return (
    <div className="col calls">
      <div className="col-head">
        <div className="col-title">
          <h2>Meetings</h2>
          {usingDemo && <DemoChip />}
          {isError && (
            <span className="src" style={{ color: 'var(--crit)', borderColor: 'var(--crit)' }}>
              <Ic n="alert" size={9} />
              Offline
            </span>
          )}
          <button type="button" className="btn primary sm" onClick={onNew}>
            <Ic n="video" />
            New
          </button>
        </div>

        <div className="seg" role="tablist" aria-label="Meeting list">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={source === s.key}
              className={source === s.key ? 'on' : ''}
              onClick={() => onSourceChange(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="search-mini">
          <Ic n="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meetings and people"
            aria-label="Search meetings"
          />
        </div>
      </div>

      <div className="list">
        {isLoading && (
          <div className="empty">
            <Ic n="clock" className="pulsing" />
            <p>Loading your meetings…</p>
          </div>
        )}

        {!isLoading && isError && !usingDemo && (
          <div className="empty">
            <Ic n="alert" />
            <p>
              Could not reach the meeting service. Your meetings are still there — this list will
              fill in as soon as the connection is back.
            </p>
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="empty">
            <Ic n="cal" />
            <p>
              {query
                ? 'No meeting matches that search.'
                : source === 'recordings'
                  ? 'No recordings yet. Recorded meetings appear here once processing finishes.'
                  : `Nothing ${source === 'past' ? 'behind you' : source === 'live' ? 'running right now' : 'scheduled'}.`}
            </p>
          </div>
        )}

        {!isLoading &&
          rows.map((m) => {
            const live = m.state === 'live';
            const soon = m.state === 'upcoming' && m.startsInMins <= 15;
            return (
              <div
                key={m.id}
                className={`mrow${selectedId === m.id ? ' on' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(m);
                  }
                }}
              >
                <div className="mrow-when">
                  <div className="t">{clockLabel(m.startsInMins)}</div>
                  <div className="d">{dayLabel(m.startsInMins)}</div>
                </div>

                <div className="mrow-body">
                  <div className="mrow-t">{m.title}</div>
                  <div className="mrow-s">
                    {m.host} · {m.durationMins} min · {relativeLabel(m.startsInMins)}
                  </div>
                  <div className="mrow-tags">
                    <FaceStack people={m.participants} />
                    {live && (
                      <span className="tag pos">
                        <span className="dot pulsing" />
                        Live
                      </span>
                    )}
                    {soon && !live && <span className="tag warn">Starting soon</span>}
                    {m.recurring && <span className="tag neu">Recurring</span>}
                    {m.pmi && <span className="tag acc">Personal room</span>}
                    {m.external && (
                      <span className="tag warn" title="Guests from outside your organisation">
                        <Ic n="shield" />
                        External
                      </span>
                    )}
                    {m.recorded && (
                      <span className="tag neu">
                        <Ic n="rec" />
                        Recorded
                      </span>
                    )}
                    {m.hasRecap && (
                      <span className="tag ai">
                        <Ic n="spark" />
                        AI recap
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={`mrow-join${live || soon ? ' now' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoin(m);
                  }}
                >
                  <Ic n={m.state === 'past' ? 'play' : 'video'} />
                  {m.state === 'past' ? 'Play' : live ? 'Join' : 'Start'}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MeetingListColumn;
