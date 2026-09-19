/* The company's parked calls, shown where people park them.
 *
 * Park puts the other party in a slot (71-79) in the company's lot and the
 * switch reads the slot number to whoever parked it; until now a colleague had
 * to be told "dial *7 and 3" by voice. This strip asks the socket hub for the
 * lot every few seconds (`park-lots`, answered by the call manager from the
 * switch's own valet_info, read-only) and lists each parked call with who it
 * is, how long it has waited and a Pick up button that dials *<slot> (slots are 71-79).
 *
 * The same bar shows calls that colleagues have ON HOLD (`held-calls`): hold is
 * private to the phone that holds, so without this a waiting caller is invisible
 * to everyone else. Take asks the call manager for a takeover with require_held,
 * which it refuses unless the call really is on hold.
 *
 * Nothing is shown when nothing is parked or held, or the feed is unavailable: an
 * empty bar would be noise on every call. Polling stops when the strip unmounts. */
import { useEffect, useState } from 'react';
import { mmss } from './use-console-call';

export interface ParkedCall {
  slot: string;
  uuid: string;
  caller_number: string;
  caller_name: string;
  seconds: number;
  pickup: string;
}

export const PARK_POLL_MS = 5000;

/** A call somebody in the company has on hold: the caller is invisible to
 *  everyone else until it shows here. Take moves the caller to whoever
 *  presses it (the server refuses unless the call really is on hold). */
export interface HeldCall {
  holder_uuid: string;
  holder_extension: string;
  caller_uuid: string;
  caller_number: string;
  caller_name: string;
  seconds: number;
}

export const heldRowsFrom = (resp: any, ownExtension: string): HeldCall[] => {
  if (!resp || resp.ok !== true || !Array.isArray(resp.rows)) return [];
  const own = String(ownExtension || '').trim();
  return resp.rows
    .filter((r: any) => r && r.holder_uuid && r.holder_extension && String(r.holder_extension) !== own)
    .map((r: any) => ({
      holder_uuid: String(r.holder_uuid),
      holder_extension: String(r.holder_extension),
      caller_uuid: String(r.caller_uuid || ''),
      caller_number: String(r.caller_number || ''),
      caller_name: String(r.caller_name || ''),
      seconds: Number.isFinite(Number(r.seconds)) ? Math.max(0, Math.floor(Number(r.seconds))) : 0,
    }));
};

/** What the feed answered, as rows; anything unexpected is "no rows". */
export const parkedRowsFrom = (resp: any): ParkedCall[] => {
  if (!resp || resp.ok !== true || !Array.isArray(resp.rows)) return [];
  return resp.rows
    .filter((r: any) => r && typeof r.slot === 'string' && r.slot)
    .map((r: any) => ({
      slot: String(r.slot),
      uuid: String(r.uuid || ''),
      caller_number: String(r.caller_number || ''),
      caller_name: String(r.caller_name || ''),
      seconds: Number.isFinite(Number(r.seconds)) ? Math.max(0, Math.floor(Number(r.seconds))) : 0,
      pickup: String(r.pickup || `*${r.slot}`),
    }));
};

export const parkedCallLabel = (row: ParkedCall): string =>
  row.caller_name && row.caller_name !== row.caller_number
    ? `${row.caller_name} (${row.caller_number || 'number withheld'})`
    : row.caller_number || 'Number withheld';

interface Props {
  socketEventsManager: any;
  onPickup: (code: string) => void;
  /** the viewer's own extension: their own held calls are already on their stage */
  ownExtension?: string;
  onTaken?: (ok: boolean, error?: string) => void;
}

const ParkedCallsStrip = ({ socketEventsManager, onPickup, ownExtension = '', onTaken }: Props) => {
  const [rows, setRows] = useState<ParkedCall[]>([]);
  const [held, setHeld] = useState<HeldCall[]>([]);
  const [taking, setTaking] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!socketEventsManager || typeof socketEventsManager.emit !== 'function') return;
    let alive = true;
    const ask = () => {
      try {
        socketEventsManager.emit('park-lots', { data: {} }, (resp: any) => {
          if (alive) setRows(parkedRowsFrom(resp));
        });
        socketEventsManager.emit('held-calls', { data: {} }, (resp: any) => {
          if (alive) setHeld(heldRowsFrom(resp, ownExtension));
        });
      } catch {
        /* the hub is away; keep whatever we last knew */
      }
    };
    ask();
    const timer = window.setInterval(ask, PARK_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [socketEventsManager, ownExtension]);

  /* Wait times tick locally between polls so they read as live. */
  useEffect(() => {
    if (rows.length === 0 && held.length === 0) return;
    const t = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, [rows.length, held.length]);

  const take = (row: HeldCall) => {
    if (!socketEventsManager || taking) return;
    setTaking(row.holder_uuid);
    try {
      socketEventsManager.emit(
        'call-monitor',
        { data: { mode: 'takeover', call_uuid: row.holder_uuid, require_held: true } },
        (resp: any) => {
          setTaking(null);
          onTaken?.(Boolean(resp?.ok), resp?.error);
        },
      );
    } catch {
      setTaking(null);
      onTaken?.(false, 'Could not reach the call manager.');
    }
  };

  if (rows.length === 0 && held.length === 0) return null;

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      role="status"
      aria-label="Parked and held calls"
    >
      {held.map((row) => (
        <span key={row.holder_uuid} className="flex items-center gap-2 rounded-md bg-white/70 px-2 py-1">
          <span className="font-semibold">On hold</span>
          <span>
            {row.caller_name && row.caller_name !== row.caller_number
              ? `${row.caller_name} (${row.caller_number || 'number withheld'})`
              : row.caller_number || 'Number withheld'}
          </span>
          <span className="text-xs text-amber-700">held by {row.holder_extension}</span>
          <span className="font-mono text-xs tabular-nums text-amber-700">{mmss(row.seconds + tick)}</span>
          <button
            type="button"
            className="rounded bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            title={`Move this caller to you; ${row.holder_extension}'s leg ends`}
            disabled={taking !== null}
            onClick={() => take(row)}
          >
            {taking === row.holder_uuid ? 'Taking…' : 'Take'}
          </button>
        </span>
      ))}
      {rows.length > 0 ? (
        <span className="font-semibold">
          Parked {rows.length === 1 ? 'call' : `calls (${rows.length})`}
        </span>
      ) : null}
      {rows.map((row) => (
        <span key={row.uuid || row.slot} className="flex items-center gap-2 rounded-md bg-white/70 px-2 py-1">
          <span className="font-mono text-xs text-amber-800">{row.slot}</span>
          <span>{parkedCallLabel(row)}</span>
          <span className="font-mono text-xs tabular-nums text-amber-700">{mmss(row.seconds + tick)}</span>
          <button
            type="button"
            className="rounded bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-amber-700"
            title={`Dial ${row.pickup} to take this call`}
            onClick={() => onPickup(row.pickup)}
          >
            Pick up
          </button>
        </span>
      ))}
    </div>
  );
};

export default ParkedCallsStrip;
