import { getUserNameByExtension } from '@/lib/extension-utility';

/**
 * Who handled a call, and on which of our numbers.
 *
 * Both facts were read out of the CDR row inside `call-record.tsx` and shown
 * only there, so the Copilot panel and the Contact tab — the two places a
 * person actually looks when asking "who dealt with this, and on what number?"
 * — could not answer it. Lifted out here rather than copied, so the three
 * surfaces cannot drift into reporting different agents for the same call.
 */

/** A value the switch filled in, as opposed to one it padded. */
const isMeaningful = (value: unknown) => {
  const s = String(value ?? '').trim();
  return Boolean(s) && s.toLowerCase() !== 'na' && s.toLowerCase() !== 'null';
};

/**
 * The agent on our side of the call, resolved from the row's extension.
 *
 * `caller_id_name` is the last resort and not the first: on a call placed from
 * the web phone the switch stamps our own agent's name there, so trusting it
 * ahead of the extension lookup attributes inbound calls to whoever happened to
 * be on the other leg. Returns '' when nothing identifies them — callers decide
 * whether to print a dash or hide the row.
 */
export const callAgentName = (log: any, extensionList: any): string => {
  const extension = String(log?.extension ?? '').trim();
  const matched = extensionList?.find?.(
    (ex: any) => String(ex?.extension ?? '') === extension,
  );
  const fromRoster = matched
    ? `${matched?.first_name || ''} ${matched?.last_name || ''}`.trim()
    : '';
  return (
    fromRoster ||
    (extension ? getUserNameByExtension(extensionList as any, extension) : '') ||
    String(log?.caller_id_name || '').trim() ||
    ''
  );
};

/**
 * Our own number on the call — the one dialled from, or the one dialled.
 *
 * `via_did` is not a stored column; the API derives it per row as
 *
 *     via_did = (direction === 'Inbound' || direction === 'Missed')
 *       ? caller_destination
 *       : caller_id_number
 *
 * and the CDR writer never fills `caller_destination` — it is NULL on 62 of 68
 * inbound rows here, and on every outbound one. So outbound calls had a number
 * to show (it comes off `caller_id_number`) while inbound and missed ones had
 * nothing, and the row simply vanished.
 *
 * The DID that was rung is not missing, only in a different column:
 * `destination_number` holds it on exactly those rows. Falling back to it means
 * inbound calls can answer "which of our numbers did they ring?" today, on rows
 * already written, without waiting for the writer to be corrected.
 */
export const callOurNumber = (log: any): string => {
  const via = isMeaningful(log?.via_did) ? String(log.via_did).trim() : '';
  if (via) return via;

  const fallback = isInboundLog(log) ? log?.destination_number : log?.caller_id_number;
  return isMeaningful(fallback) ? String(fallback).trim() : '';
};

/** Inbound and missed both arrived on one of our numbers. */
export const isInboundLog = (log: any): boolean => {
  const direction = String(log?.direction ?? '').trim().toLowerCase();
  return direction === 'inbound' || direction === 'missed';
};

/** The extension that handled it, for surfaces that show it beside the name. */
export const callExtension = (log: any): string =>
  isMeaningful(log?.extension) ? String(log.extension).trim() : '';
