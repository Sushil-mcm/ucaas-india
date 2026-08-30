/* What a phone number is called, and which line it belongs to.
 *
 * A number on its own tells an agent nothing. Three numbers ring the same
 * support line — one printed on invoices, one on the website, one on a
 * partner's contract — and when a transferred call arrives the agent sees only
 * digits. Established phone systems answer this with a *label*: a few words
 * written beside the number. Their numbers table reads PHONE NUMBER · LABEL ·
 * TYPE rather than a column of digits.
 *
 * The label nearly exists here already, and the way it half-exists is the whole
 * reason this module is needed.
 *
 *   The number row has a `did_name` column. It is returned in every list
 *   response, searched on, sorted on, and rendered under the number on two
 *   screens. It is written once, when the number is bought.
 *
 *   Nothing can change it afterwards. The handler that would
 *   (default-api `controllers/DID/DidController.js:230`) is written, correct
 *   and never bound to a route — `routers/didRoute.js:17` destructures
 *   seventeen controller methods and `update` is not one of them. There is no
 *   PATCH or PUT on a number anywhere in the API.
 *
 *   Meanwhile the Set Forwarding drawer shows a field called "Name" and sends
 *   it as `forward_call_actions.did_info.did_name`. The endpoint that receives
 *   it (`DidController.js:596-604`) writes the JSON blob and lifts `did_info.site`
 *   out into the `site_uuid` column — and ignores `did_name` entirely. So an
 *   admin can type a name, save, and watch the list carry on showing the old
 *   one. The field has never worked.
 *
 * So the label lives in the blob, and this module reads it back from there.
 * That is a real server-side write on a live endpoint, shared by everyone on
 * the account — not a per-device note — but it comes with limits that the
 * screens using it have to state rather than hide:
 *
 *   it is cleared by Remove forwarding and by Release, because both null the
 *   whole `forward_call_actions` column;
 *
 *   it does not reach the softphone or call history, which read the `did_name`
 *   column and the call record's own copy of it;
 *
 *   a number with no call handling at all cannot hold one — see `canEditLabel`.
 *
 * Labels are capped at 30 characters and reject angle brackets for one reason:
 * that is exactly what `did_numbers.did_name` is (`VARCHAR(30)`, rejected by
 * the server's HTML check). The day somebody binds that one route, every label
 * written here moves into the column unchanged. Writing longer ones now would
 * mean truncating them later.
 *
 * Grouping is here for a related gap. The product has no notion of "the numbers
 * on this line": a department is not stored holding a list of numbers — each
 * number stores where it forwards, and the line is whatever they all point at.
 * Reading that backwards is the only way to show a line's numbers together, and
 * it is a pure function of the number list.
 */

import { FORWARD_TYPES } from '@/constants/forwarding-consts';

/** `did_numbers.did_name` is VARCHAR(30). Matching it keeps labels portable. */
export const LABEL_MAX_LENGTH = 30;

/** `forward_call_actions` arrives as a JSON string, or already parsed, or absent. */
export const parseActions = (raw: unknown): any => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * A label as it will be stored.
 *
 * Whitespace is collapsed so "Main  desk" and "Main desk" are one label rather
 * than two that look identical in a table. Control characters go because the
 * label is rendered into a cell and read out in a handover.
 */
export const normaliseLabel = (raw: unknown): string =>
  String(raw ?? '')
    /* Deliberate: a label typed with a newline in it, or pasted out of a
       spreadsheet, must become one line rather than break the cell. */
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Why a label cannot be saved, for the message under the input.
 *
 * An empty label is valid — it is how you clear one. Angle brackets are refused
 * here rather than at save time because the server refuses them too, and a
 * rejection you can see while typing beats one you get after pressing Save.
 */
export const checkLabel = (raw: unknown): { ok: boolean; reason?: string } => {
  const label = normaliseLabel(raw);
  if (label.length > LABEL_MAX_LENGTH) {
    return { ok: false, reason: `Keep it to ${LABEL_MAX_LENGTH} characters or fewer.` };
  }
  if (/[<>]/.test(label)) {
    return { ok: false, reason: 'Angle brackets are not allowed in a label.' };
  }
  return { ok: true };
};

/**
 * The label to show for a number.
 *
 * The blob wins over the column because the blob is the only one anybody can
 * change: a number bought as "Main DID" and since labelled "Accounting
 * voicemail" must read as the latter. The column is the fallback so numbers
 * nobody has renamed still show the name they were bought with.
 */
export const labelOf = (did: any): string => {
  const fromActions = parseActions(did?.forward_call_actions)?.did_info?.did_name;
  return normaliseLabel(fromActions) || normaliseLabel(did?.did_name);
};

/**
 * Local / Toll free / Fax — the three the reference table shows.
 *
 * Fax is not a value of `did_type`; it is a separate boolean on the row. Read
 * `did_type` alone and a fax line reads "Local", which is true of the number
 * and useless to the person reading the table.
 */
const DID_TYPE_NAMES: Record<string, string> = {
  L: 'Local',
  N: 'National',
  T: 'Toll free',
  M: 'Mobile',
};

export const numberTypeOf = (did: any): string => {
  if (did?.is_fax_enabled) return 'Fax';
  const key = String(did?.did_type ?? '')
    .trim()
    .toUpperCase();
  return DID_TYPE_NAMES[key] ?? '--';
};

/** Whether this number can carry text messages, from the feature list on the row. */
export const isSmsCapable = (did: any): boolean =>
  Array.isArray(did?.features) &&
  did.features.some((f: unknown) => f === 'sms_in' || f === 'sms_out');

/* Only these route a caller to a shared line. A number pointed at an extension
   belongs to a person, not to a line — and the reference is explicit that
   labels do not apply to direct calls to a user. */
const LINE_TYPES: string[] = [
  FORWARD_TYPES.DEPARTMENT,
  FORWARD_TYPES.QUEUE,
  FORWARD_TYPES.IVR,
  FORWARD_TYPES.AI,
];

export type Line = {
  /** Stable identity for the line: its type and the id the number points at. */
  key: string;
  type: string;
  value: string;
  name: string;
};

/**
 * The shared line this number rings, or null.
 *
 * Read from business hours only. A number whose closed-hours branch points at a
 * queue does not belong to that queue — it belongs to whatever answers it
 * during the day, and grouping by the closed branch would file numbers under
 * lines nobody associates them with.
 */
export const lineOf = (did: any): Line | null => {
  const hours = parseActions(did?.forward_call_actions)?.call_handling?.business_hours;
  const type = String(hours?.type || '').trim();
  if (!LINE_TYPES.includes(type)) return null;

  const value = String(hours?.value || '').trim();
  if (!value) return null;

  return {
    key: `${type}:${value}`,
    type,
    value,
    name: normaliseLabel(hours?.name || hours?.label) || value,
  };
};

/** True when this number routes anywhere at all, to a line or to a person. */
export const isRouted = (did: any): boolean =>
  Boolean(parseActions(did?.forward_call_actions)?.call_handling?.business_hours?.type);

export type LabelBlock = { ok: true } | { ok: false; reason: string };

/**
 * Whether this number's label can be changed, and if not, why not.
 *
 * A number with no call handling is refused, and this is the rule worth being
 * careful about. Its label would have to be written into a `forward_call_actions`
 * blob that does not exist yet — and three separate places read "this row has a
 * blob" as "this number is in use". Labelling an unused number would drop it out
 * of Unused numbers, take away its Set Forwarding action, and — the one that
 * costs money — make it unreleasable, because Release is blocked on exactly that
 * field. A label is not worth making a number unreturnable.
 *
 * The reason is handed back rather than the control being quietly hidden: "there
 * is no Edit label here" and "this number cannot have a label yet" look
 * identical on screen, and only one of them is something the reader can fix.
 */
export const canEditLabel = (did: any): LabelBlock => {
  if (!did?.uuid) return { ok: false, reason: 'This number has no record to save against.' };
  if (!parseActions(did?.forward_call_actions)) {
    return {
      ok: false,
      reason:
        'Point this number somewhere first. A number with no call handling has nowhere to keep a label.',
    };
  }
  return { ok: true };
};

export type LabelPatch = { uuid: string; forward_call_actions: Record<string, unknown> };

/**
 * The request that changes only the label.
 *
 * The stored routing object is spread back verbatim — nothing in it is read,
 * re-derived or defaulted. That matters because the endpoint replaces the whole
 * column with what it is sent: rebuilding the object through the forwarding
 * form instead would quietly drop every field the form does not know about.
 *
 * `site` is carried across because the receiving handler lifts `did_info.site`
 * into the `site_uuid` column, so a `did_info` block sent without it would move
 * the number out of its site as a side effect of renaming it. When there is no
 * site to carry, the key is left out entirely rather than sent empty.
 *
 * Returns null when the number cannot be labelled, so a caller that forgets
 * `canEditLabel` still cannot write a routing blob onto an unrouted number.
 */
export const buildLabelPatch = (did: any, rawLabel: unknown): LabelPatch | null => {
  if (!canEditLabel(did).ok) return null;
  if (!checkLabel(rawLabel).ok) return null;

  const actions = parseActions(did?.forward_call_actions);
  const site = actions?.did_info?.site || did?.site_uuid || '';

  return {
    uuid: String(did.uuid),
    forward_call_actions: {
      ...actions,
      did_info: {
        did_name: normaliseLabel(rawLabel),
        ...(site ? { site } : {}),
      },
    },
  };
};

export type LineGroup = {
  line: Line;
  numbers: any[];
};

/**
 * Numbers gathered under the line each one rings, busiest line first.
 *
 * Numbers within a group keep the order they arrived in, so the first is the
 * one an agent thinks of as the line's number. "Primary" is that position, not
 * a stored flag — the platform has no such flag — and this is the only place
 * that decides it.
 */
export const groupByLine = (dids: any[]): LineGroup[] => {
  const groups = new Map<string, LineGroup>();

  for (const did of Array.isArray(dids) ? dids : []) {
    const line = lineOf(did);
    if (!line) continue;
    const existing = groups.get(line.key);
    if (existing) existing.numbers.push(did);
    else groups.set(line.key, { line, numbers: [did] });
  }

  return [...groups.values()].sort(
    (a, b) => b.numbers.length - a.numbers.length || a.line.name.localeCompare(b.line.name),
  );
};

/** Everything `groupByLine` leaves out: numbers ringing a person, or nothing. */
export const numbersWithoutLine = (dids: any[]): any[] =>
  (Array.isArray(dids) ? dids : []).filter((did) => !lineOf(did));

/** Matches a group against the search box: the line's name, or any of its numbers. */
export const matchesLineSearch = (group: LineGroup, query: string): boolean => {
  const needle = normaliseLabel(query).toLowerCase();
  if (!needle) return true;
  if (group.line.name.toLowerCase().includes(needle)) return true;
  return group.numbers.some(
    (did) =>
      String(did?.did_number || '')
        .toLowerCase()
        .includes(needle) || labelOf(did).toLowerCase().includes(needle),
  );
};
