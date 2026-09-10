import { callVolumeList } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import { ReportsPageLayout } from '../../reports-content-layout';
import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialVal } from '@/components/custom/date-dropdown/constant';
import './call-volume-theme.css';

/** "12m 30s" / "45s" / "-" → seconds, or null for an empty slot. Shared by
 *  the heat scale and the peak-slot insight below so they can never read a
 *  cell two different ways. */
const parseSeconds = (value: string | undefined): number | null => {
  if (!value || value === '-') return null;
  const minutes = Number(value.match(/(\d+)m/)?.[1] || 0);
  const seconds = Number(value.match(/(\d+)s/)?.[1] || 0);
  return minutes * 60 + seconds;
};

/** Seconds → 0-4 heat level. Thresholds mirror a typical contact centre's
 *  own sense of "quiet" vs "busy": under a minute barely registers, past
 *  20 minutes in an hour is a genuinely packed slot. */
const getHeatLevel = (totalSeconds: number | null): number => {
  if (totalSeconds === null) return 0;
  if (totalSeconds < 60) return 1;
  if (totalSeconds <= 600) return 2;
  if (totalSeconds <= 1200) return 3;
  return 4;
};

type PeakSlot = { day: string; time: string; seconds: number };

const LEGEND_STEPS = [
  { level: 0, label: 'None' },
  { level: 1, label: '< 1m' },
  { level: 2, label: '1-10m' },
  { level: 3, label: '10-20m' },
  { level: 4, label: '20m+' },
];

const CallVolume = ({
  // Set only when this report is opened from Performance ▸ Reports'
  // catalog (reports-tab.tsx) — `dropdownVal`/`setDropdownVal` there are
  // Performance's own Today/Division/Media picker state, threaded straight
  // through rather than copied, so the DateDropdown rendered beside this
  // page's own "Performance" heading is the *same* control, two-way bound:
  // picking a date here moves the toolbar above this dialog too, and vice
  // versa. `selectedRange` is that state's already-resolved value, used
  // for the actual data fetch below. Reached any other way (its standalone
  // /reports/* route, if one exists), it falls back to managing its own
  // local picker instead.
  selectedRange,
  dropdownVal: sharedDropdownVal,
  setDropdownVal: setSharedDropdownVal,
}: {
  selectedRange?: { from: string; to: string };
  dropdownVal?: any;
  setDropdownVal?: any;
} = {}) => {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [localDropdownVal, setLocalDropdownVal] = useState(dropdownCallInitialVal);
  const dropdownVal = sharedDropdownVal || localDropdownVal;
  const setDropdownVal = setSharedDropdownVal || setLocalDropdownVal;
  const activeRange = selectedRange || dropdownVal?.value;
  const { mutate: mutateCallVolumeList, data: dataCallVolumeList } = useMutation({
    mutationFn: callVolumeList,
    mutationKey: ['getCallVolume'],
  });
  const { headers: activitiesHeaders = {}, rows: activitiesRows = [] } =
    dataCallVolumeList?.data?.data?.result || {};

  const activitiesDays = activitiesHeaders?.days ?? [];
  const activitiesTimeSlots = activitiesRows?.map((r: { time: string }) => r.time) ?? [];
  const formatTimeToAmPm = (time: string) => moment(time, ['HH:mm', 'HH:mm:ss']).format('h a');
  // The active range's own end date, not the literal calendar day — so
  // "today"'s accent highlight tracks whichever date is actually showing
  // instead of quietly pointing at the wrong column once someone picks a
  // past range.
  const todayDayName = moment(activeRange?.to || undefined).format('dddd');

  const getActivityValue = (dayKey: string, time: string) => {
    const row = activitiesRows?.find((r: { time: string }) => r.time === time);
    return (row as Record<string, string>)?.[dayKey] ?? '-';
  };

  // The single busiest day/hour combination — a one-line "here's the
  // headline" a raw grid can't give you at a glance, the same way a chart
  // page calls out its own high point instead of leaving it to be found.
  /* Annotated rather than inferred: `best` is only ever assigned inside
     the nested forEach callbacks, which TypeScript's control-flow analysis
     can't see through — it narrows the variable back to `null` at the
     return, infers `peakSlot` as `null`, and then reports every
     `peakSlot.day` below as a property access on `never`. */
  const peakSlot = useMemo<PeakSlot | null>(() => {
    let best: PeakSlot | null = null;
    activitiesTimeSlots.forEach((time: string) => {
      activitiesDays.forEach((day: string) => {
        const seconds = parseSeconds(getActivityValue(day, time));
        if (seconds !== null && (!best || seconds > best.seconds)) {
          best = { day, time, seconds };
        }
      });
    });
    return best;
  }, [activitiesDays, activitiesRows]);

  useEffect(() => {
    mutateCallVolumeList({
      timezone: browserTimezone,
      filter_date: { from: activeRange?.from, to: activeRange?.to },
    });
  }, [activeRange?.from, activeRange?.to]);

  const Filters = (
    // Same `rp-date-standalone` wrapper Reports ▸ Analytics uses for its own
    // bare DateDropdown (date-picker-theme.css) — without it the control's
    // default half-rounded/half-square styling (built for sitting inside
    // Performance's fused Today+Division+Media pill) reads as a broken
    // shape when it's the only control in the row.
    <div className="flex gap-2 rp-date-standalone">
      <DateDropdown
        {...{
          dropdownVal,
          setDropdownVal,
        }}
        // Matches Performance's own toolbar usage of this exact control
        // (performance/index.tsx) — the default 'inline' placement renders
        // a different (less exercised) layout for the "Date Range" panel;
        // 'bottom' is what every other real usage of this component
        // actually runs, so this is the same picker, not just the same
        // state.
        customPickerPlacement="bottom"
      />
    </div>
  );

  return (
    <ReportsPageLayout filters={Filters}>
      <div className="cv-report">
        {peakSlot && (
          <div className="cv-insight">
            <span className="cv-insight-dot" />
            Busiest slot: <strong>{peakSlot.day.split(' ')[0]}</strong> at{' '}
            <strong>{formatTimeToAmPm(peakSlot.time)}</strong> —{' '}
            {getActivityValue(peakSlot.day, peakSlot.time)} of talk time
          </div>
        )}
        <div className="cv-grid-scroll">
          <div
            className="cv-grid"
            style={{ gridTemplateColumns: `96px repeat(${activitiesDays.length || 1}, 1fr)` }}
          >
            <div className="cv-corner">Time</div>
            {activitiesDays?.map((dayKey: string) => {
              const [dayName = '', date = ''] = dayKey ? dayKey.split(' ') : [];
              const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
              const isToday = dayName === todayDayName;
              return (
                <div
                  key={dayKey}
                  className={`cv-day-head ${isWeekend ? 'is-weekend' : ''} ${isToday ? 'is-today' : ''}`}
                >
                  <span className="cv-day-name">{dayName}</span>
                  <span className="cv-day-date">({date})</span>
                </div>
              );
            })}
            {activitiesTimeSlots?.map((time: string) => (
              <>
                <div key={`time-${time}`} className="cv-time-cell">
                  {formatTimeToAmPm(time)}
                </div>
                {activitiesDays?.map((dayKey: string) => {
                  const value = getActivityValue(dayKey, time);
                  const seconds = parseSeconds(value);
                  const level = getHeatLevel(seconds);
                  const isPeak = peakSlot?.day === dayKey && peakSlot?.time === time;
                  return (
                    <div
                      key={`${dayKey}-${time}`}
                      className={`cv-cell ${level === 0 ? 'is-empty' : ''} ${isPeak ? 'is-peak' : ''}`}
                      data-level={level}
                      title={`${dayKey}, ${formatTimeToAmPm(time)}: ${value === '-' ? 'No calls' : value}`}
                    >
                      {value}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
        <div className="cv-legend">
          <span className="cv-legend-label">Talk time</span>
          {LEGEND_STEPS.map(({ level, label }) => (
            <span key={level} className="cv-legend-step">
              <span className="cv-legend-swatch" data-level={level} />
              <span className="cv-legend-step-label">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </ReportsPageLayout>
  );
};

export default CallVolume;
