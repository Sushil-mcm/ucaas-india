import { useEffect, useState } from 'react';

/**
 * How current the figures on screen actually are.
 *
 * This replaces a hardcoded "Live — updates every 2s" badge, which was a
 * string rather than a measurement and was wrong for most of the page: queue
 * configuration refreshes on one interval, the date-ranged reports on another,
 * and the live figures arrive on a socket push with no interval at all. A
 * single stated number could only ever describe one of the three.
 *
 * Reading the newest successful fetch instead means the badge is true whatever
 * the tiers are set to, and — more usefully — it ages visibly when a feed
 * stalls. A frozen dashboard and a quiet one look identical otherwise.
 *
 * The clock lives here rather than in the page so a tick re-renders this badge
 * alone. Put in `Performance`, a once-a-second interval would re-render the
 * KPI band and the whole open tab beneath it.
 */
const STALE_AFTER_SECS = 30;

const describeAge = (secs: number): string => {
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const DataFreshness = ({ updatedAt }: { updatedAt: number | null }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!updatedAt) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [updatedAt]);

  if (!updatedAt) {
    return (
      <span className="fchip" title="No successful fetch yet">
        {/* `.dot` alone (mcm-page.css) sets no colour of its own — every
            other state here (`live`/`stale`) pairs it with a `green`/`amber`
            modifier that actually paints it; this one was the one state
            left without one, rendering as an invisible dot. `amber` reuses
            the same "still settling, not yet live" colour `stale` already
            uses elsewhere in this component. */}
        <span className="dot amber" />
        Waiting for data
      </span>
    );
  }

  const ageSecs = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  const isStale = ageSecs > STALE_AFTER_SECS;

  return (
    <span
      className={`fchip${isStale ? ' stale' : ' live'}`}
      title={`Last successful update: ${new Date(updatedAt).toLocaleTimeString()}`}
    >
      <span className={`dot ${isStale ? 'amber' : 'green pulsing'}`} />
      {isStale ? `Stale — updated ${describeAge(ageSecs)}` : `Live — updated ${describeAge(ageSecs)}`}
    </span>
  );
};

export default DataFreshness;
