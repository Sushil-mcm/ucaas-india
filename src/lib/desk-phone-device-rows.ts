/* A person's real desk phones as rows in the "devices that ring" list.
 *
 * The list on My Phone and on the admin Call Rules drawer used to hold three
 * placeholders: web, mobile and pstn. A desk phone had no row, so its switch
 * could not be turned off and its ring time could not be set. These helpers
 * put one row per phone into that list, keyed by the phone's MAC so two phones
 * on one person stay apart, and read the switch and ring time back from the
 * stored row on the next visit.
 *
 * Stored shape (call_forwarding.incoming_calls.device_options[]):
 *   { type: 'desk', device: '<mac, lowercase, no colons>', login: '1000_p1',
 *     status, timeout, value: <extension>, name: <phone label>,
 *     label: <ring-time label> }
 *
 * The switch reads type, status, timeout and the order; `device` is for the
 * screen. A phone that has been removed from the company loses its row here
 * rather than lingering as a switch that rings nothing. */

import type { DeskPhone } from '@/pages/admin-settings/people/desk-phones/desk-phones-api';

export const DESK_ROW_PREFIX = 'desk:';

export const deskRowKey = (mac: string): string => `${DESK_ROW_PREFIX}${String(mac || '').toLowerCase()}`;

export const isDeskRowKey = (key: string): boolean => String(key || '').startsWith(DESK_ROW_PREFIX);

/** The key a stored row is listed under. Desk rows key by MAC; everything
 *  else keeps the screen's old rule (own devices by type, colleagues by name). */
export const storedRowKey = (item: any, ownExtension: string): string => {
  const type = String(item?.type || 'web');
  if (type === 'desk') return deskRowKey(item?.device || item?.name || 'unknown');
  return String(ownExtension) !== String(item?.value) ? item?.name || 'web' : type;
};

const VENDOR_NAMES: Record<string, string> = {
  yealink: 'Yealink',
  poly: 'Poly',
  'poly-obi': 'Poly OBi',
  cisco: 'Cisco',
  grandstream: 'Grandstream',
};

/** A phone added without a name is labelled with its owner's name by the
 *  server, which tells two phones of one person apart not at all. Such a
 *  label counts as no label here. */
const realLabel = (phone: DeskPhone): string => {
  const label = String(phone?.label || '').trim();
  const owner = String(phone?.owner?.name || '').trim();
  if (!label || (owner && label.toLowerCase() === owner.toLowerCase())) return '';
  return label;
};

/** The device's name on the row: its own label if it has one, else make and
 *  model, "Yealink T46U". */
export const deskPhoneRowLabel = (phone: DeskPhone): string => {
  const label = realLabel(phone);
  if (label) return label;
  const vendor = VENDOR_NAMES[String(phone?.vendor || '')] || String(phone?.vendor || '');
  const model = String(phone?.model || '').trim();
  return [vendor, model].filter(Boolean).join(' ') || phone?.mac_display || 'Desk phone';
};

/** The second line: "Desk phone · Yealink T46U · 9D:96" so two phones of the
 *  same model still read apart. */
export const deskPhoneRowDetail = (phone: DeskPhone): string => {
  const vendor = VENDOR_NAMES[String(phone?.vendor || '')] || String(phone?.vendor || '');
  const model = String(phone?.model || '').trim();
  const make = [vendor, model].filter(Boolean).join(' ');
  const mac = String(phone?.mac_display || phone?.mac_address || '');
  const tail = mac.replace(/[^0-9a-f]/gi, '').slice(-4).toUpperCase();
  const parts = ['Desk phone'];
  if (realLabel(phone) && make) parts.push(make);
  if (tail) parts.push(`${tail.slice(0, 2)}:${tail.slice(2)}`);
  return parts.join(' · ');
};

/** Rows the switch dials today: the browser, desk phones and an outside
 *  number. The mobile-app row is stored but nothing registers as a mobile
 *  endpoint yet, so the list shows no switch for it. */
export const ringsToday = (row: any): boolean => String(row?.type || 'web') !== 'mobile';

/** Digits only, 7 to 15 of them, or "" - the same rule the switch applies. */
export const outsideNumberDigits = (value: unknown): string => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 ? digits : '';
};

/** Does this row ring right now: switched on, and for an outside number, a
 *  usable number saved. */
export const rowRings = (row: any): boolean => {
  if (!row?.status || !ringsToday(row)) return false;
  if (String(row?.type) === 'pstn') return Boolean(outsideNumberDigits(row?.number));
  return true;
};

type RingValue = { label: string; value: string };

/**
 * Insert or refresh one row per phone, keeping any stored switch and ring
 * time, and drop desk rows for phones that no longer exist.
 *
 * `rows` is the screen's ordered map (insertion order is the ring order). A
 * phone without a stored row lands right after the browser row, switched on,
 * with the browser row's ring time: that is exactly how the switch treated
 * the desk phone before it had a row of its own, so nothing changes until
 * somebody touches it.
 */
export const mergeDeskPhoneRows = (
  rows: Record<string, any>,
  phones: DeskPhone[],
  ownExtension: string,
  fallbackRing: RingValue,
): Record<string, any> => {
  const known = new Set(phones.map((p) => deskRowKey(p.mac_address)));
  const out: Record<string, any> = {};
  const fresh: Array<[string, any]> = [];

  phones.forEach((phone) => {
    const key = deskRowKey(phone.mac_address);
    const stored = rows[key];
    const row = {
      status: stored ? Boolean(stored.status) : true,
      value: stored?.value ?? rows.web?.value ?? fallbackRing,
      type: 'desk',
      device: String(phone.mac_address || '').toLowerCase(),
      login: phone.sip_username || '',
      /* what the switch says right now, from the same source as the Desk
         phones page: registered, or not */
      state: phone.state,
      isDefault: stored?.isDefault ?? false,
      detail: deskPhoneRowDetail(phone),
      option: { label: deskPhoneRowLabel(phone), value: ownExtension },
    };
    if (stored) rows[key] = row;
    else fresh.push([key, row]);
  });

  Object.entries(rows).forEach(([key, value]) => {
    if (isDeskRowKey(key) && !known.has(key)) return; // phone is gone
    out[key] = value;
    if (key === 'web') fresh.splice(0).forEach(([k, v]) => (out[k] = v));
  });
  fresh.forEach(([k, v]) => (out[k] = v)); // no web row: append

  return out;
};

/** The saved row for a desk entry. */
export const deskRowPayload = (key: string, item: any, ownExtension: string) => ({
  type: 'desk',
  device: String(item?.device || key.slice(DESK_ROW_PREFIX.length)).toLowerCase(),
  /* the phone's own SIP login, "1000_p2"; the switch rings this leg on its own */
  login: item?.login || '',
  status: item?.status ?? false,
  label: item?.value?.label || '',
  value: ownExtension,
  name: item?.option?.label || '',
  timeout: item?.value?.value,
  isDefault: item?.isDefault ?? false,
});

/** The word shown beside a desk phone row for its live state. */
export const deskPhoneStateLabel = (state: unknown): { text: string; live: boolean } =>
  String(state) === 'registered' ? { text: 'Registered', live: true } : { text: 'Not registered', live: false };
