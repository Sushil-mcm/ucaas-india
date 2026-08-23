import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Timer from '@/components/timer';
import { Ic, McmIconSprite } from '@/components/mcm/icons';

export type WallboardTile = {
  key: string;
  label: string;
  value: string;
  /** Live-timer tiles render a ticking clock instead of a static value. */
  timerStart?: number | null;
  /** Breaching its target — renders on the wallboard's red treatment. */
  warn?: boolean;
  /** Comfortably inside target — renders on the wallboard's teal treatment. */
  good?: boolean;
};

export type WallboardQueueRow = {
  uuid: string;
  name: string;
  waiting: number;
  longestWaitTimestamp: number | null;
  sla: number | null;
  handledToday: number | null;
};

const slaColor = (sla: number | null) => {
  if (sla === null) return '#7e8ca8';
  if (sla >= 80) return '#4fe0cd';
  if (sla >= 60) return '#ffc65c';
  return '#ff8a8a';
};

/**
 * Room-facing wallboard — the full-screen dark takeover from the artifact's
 * Performance view. It reads the same live figures as the KPI strip behind it,
 * so the wall and the console can never disagree.
 */
const Wallboard = ({
  tiles,
  queues,
  onClose,
}: {
  tiles: WallboardTile[];
  queues: WallboardQueueRow[];
  onClose: () => void;
}) => {
  const [clock, setClock] = useState(() => new Date().toTimeString().slice(0, 8));

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date().toTimeString().slice(0, 8)), 1000);
    return () => clearInterval(interval);
  }, []);

  // Full-screen takeover — stop the page behind it drifting under the overlay.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Esc closes, matching the "Exit (Esc)" affordance in the header.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="mcm-wall">
      {/* The sprite lives on the page root, which this portal escapes. */}
      <McmIconSprite />

      <div className="wh">
        <h2>Contact centre wallboard</h2>
        <span
          className="pulsing"
          style={{ color: '#4fe0cd', fontSize: 12, fontWeight: 700, letterSpacing: '.1em' }}
        >
          ● LIVE
        </span>
        <span style={{ marginLeft: 'auto', color: '#7e8ca8', fontSize: 15 }}>{clock}</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#1c2740',
            color: '#eef2f9',
            border: '1px solid #22304d',
            borderRadius: 10,
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Ic n="expand" />
          Exit (Esc)
        </button>
      </div>

      <div className="wgrid">
        {tiles.map((tile) => (
          <div key={tile.key} className={`wk${tile.warn ? ' bad' : tile.good ? ' good' : ''}`}>
            <div className="k">{tile.label}</div>
            <div className="v">
              {tile.timerStart ? <Timer startTime={tile.timerStart} /> : tile.value}
            </div>
          </div>
        ))}
      </div>

      <div className="wtbl">
        <table>
          <thead>
            <tr>
              <th>Queue</th>
              <th>Waiting</th>
              <th>Longest</th>
              <th>Service level</th>
              <th>Handled today</th>
            </tr>
          </thead>
          <tbody>
            {queues.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#7e8ca8', padding: '22px' }}>
                  No queues configured yet
                </td>
              </tr>
            )}
            {queues.map((queue) => (
              <tr key={queue.uuid}>
                <td style={{ fontWeight: 700, color: '#eef2f9' }}>{queue.name}</td>
                <td>{queue.waiting}</td>
                <td>
                  {queue.longestWaitTimestamp ? (
                    <Timer startTime={queue.longestWaitTimestamp} />
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ color: slaColor(queue.sla), fontWeight: 700 }}>
                  {queue.sla === null ? '—' : `${Math.round(queue.sla)}%`}
                </td>
                <td>{queue.handledToday === null ? '—' : queue.handledToday}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,
    document.body,
  );
};

export default Wallboard;
