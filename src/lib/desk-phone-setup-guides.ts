/* Where, on each kind of phone, the Credentials values go.
 *
 * The Credentials dialog used to say "open Settings › Auto Provision" for
 * every phone and "type the rows into the phone's account page" with no path
 * at all. Phones from the same maker do not share a web page: a Cisco SPA942
 * from 2008, an SPA504G and a CP-7841 are three different layouts, and the
 * SPA942 cannot fetch settings from us at all because it only speaks an old
 * form of TLS. So the guidance is per family, and it is honest about what a
 * family cannot do.
 *
 * Every guide has two halves:
 *   auto    - the page where the phone is told our provisioning address, the
 *             field that takes each of the three values, and what to press.
 *             null when the family cannot use it, with `autoBlocked` saying why.
 *   manual  - the page where the SIP account is typed by hand, and which
 *             field on that page takes which row from the dialog.
 *
 * Field names are the phone's own labels, as printed on its web page, so a
 * person can match them by eye. Keep them that way. */

export type DialogRow =
  | 'username'
  | 'password'
  | 'server'
  | 'port'
  | 'transport'
  | 'outbound_proxy'
  | 'outbound_port'
  | 'display_name'
  | 'prov_url'
  | 'prov_url_no_scheme'
  | 'prov_login'
  | 'prov_secret';

export interface ManualField {
  /** The label on the phone's page. */
  phone: string;
  /** Which dialog row goes there, or a fixed value to set. */
  from: DialogRow | { literal: string };
}

export interface SetupGuide {
  /** Shown as the heading: "Cisco SPA900 series (Linksys era)". */
  family: string;
  auto: null | {
    where: string[];
    fields: ManualField[];
    apply: string;
    note?: string;
  };
  /** Why the automatic path cannot be used, when `auto` is null. */
  autoBlocked?: string;
  manual: {
    where: string[];
    fields: ManualField[];
    apply: string;
    note?: string;
    /** The family cannot do our default transport; use this one instead. */
    transport?: 'udp';
  };
}

const norm = (model: unknown) =>
  String(model ?? '')
    .toUpperCase()
    .replace(/[\s\-_]/g, '')
    .replace(/^SIP/, '');

/* ---------- Yealink ---------- */

const yealinkAuto = {
  where: ['Settings', 'Auto Provision'],
  fields: [
    { phone: 'Server URL', from: 'prov_url' as const },
    { phone: 'User Name', from: 'prov_login' as const },
    { phone: 'Password', from: 'prov_secret' as const },
  ],
  apply: 'Press Confirm, then Auto Provision Now. The phone restarts and comes up registered.',
};

const yealinkManual = {
  where: ['Account', 'Register', 'pick an Account'],
  fields: [
    { phone: 'Line Active', from: { literal: 'On' } },
    { phone: 'Label', from: 'display_name' as const },
    { phone: 'Display Name', from: 'display_name' as const },
    { phone: 'Register Name', from: 'username' as const },
    { phone: 'User Name', from: 'username' as const },
    { phone: 'Password', from: 'password' as const },
    { phone: 'SIP Server 1 › Server Host', from: 'server' as const },
    { phone: 'SIP Server 1 › Port', from: 'port' as const },
    { phone: 'Transport', from: 'transport' as const },
    { phone: 'Enable Outbound Proxy Server', from: { literal: 'On' } },
    { phone: 'Outbound Proxy Server 1', from: 'outbound_proxy' as const },
    { phone: 'Outbound Proxy Server 1 › Port', from: 'outbound_port' as const },
  ],
  apply: 'Press Confirm. Within a few seconds the status reads Registered.',
};

const YEALINK_T: SetupGuide = { family: 'Yealink T series desk phone', auto: yealinkAuto, manual: yealinkManual };

const YEALINK_W: SetupGuide = {
  family: 'Yealink W series cordless base',
  auto: { ...yealinkAuto, note: 'The base takes the settings; the handset registered to it uses the account.' },
  manual: {
    ...yealinkManual,
    note: 'Then open Account › Handset & Account and tick this account for the handset that should ring.',
  },
};

const YEALINK_CP: SetupGuide = { family: 'Yealink CP conference phone', auto: yealinkAuto, manual: yealinkManual };

/* ---------- Poly, UC Software and Poly OS ---------- */

const polyAuto = {
  where: ['Settings', 'Provisioning Server'],
  fields: [
    { phone: 'Server Type', from: { literal: 'HTTPS' } },
    { phone: 'Server Address', from: 'prov_url_no_scheme' as const },
    { phone: 'Server User', from: 'prov_login' as const },
    { phone: 'Server Password', from: 'prov_secret' as const },
  ],
  apply: 'Save. The phone restarts, fetches its settings and comes up registered.',
};

const polyManual = {
  where: ['Settings', 'Lines', 'Line 1'],
  fields: [
    { phone: 'Identification › Display Name', from: 'display_name' as const },
    { phone: 'Identification › Address', from: 'username' as const },
    { phone: 'Identification › Label', from: 'display_name' as const },
    { phone: 'Authentication › User ID', from: 'username' as const },
    { phone: 'Authentication › Password', from: 'password' as const },
    { phone: 'SIP Server › Address', from: 'server' as const },
    { phone: 'SIP Server › Port', from: 'port' as const },
    { phone: 'SIP Server › Transport', from: 'transport' as const },
    { phone: 'Outbound Proxy › Address (Settings › SIP)', from: 'outbound_proxy' as const },
    { phone: 'Outbound Proxy › Port', from: 'outbound_port' as const },
  ],
  apply: 'Save. The line shows a registered tick on the phone.',
};

const POLY_VVX: SetupGuide = { family: 'Poly VVX desk phone (UC Software)', auto: polyAuto, manual: polyManual };
const POLY_EDGE: SetupGuide = { family: 'Poly Edge E desk phone', auto: polyAuto, manual: polyManual };
const POLY_CCX: SetupGuide = { family: 'Poly CCX desk phone', auto: polyAuto, manual: polyManual };
const POLY_TRIO: SetupGuide = { family: 'Poly Trio conference phone', auto: polyAuto, manual: polyManual };

/* ---------- Poly OBi Edition ---------- */

const POLY_OBI: SetupGuide = {
  family: 'Poly OBi Edition',
  auto: {
    where: ['System Management', 'Auto Provisioning', 'ITSP Provisioning'],
    fields: [
      { phone: 'Method', from: { literal: 'Periodically' } },
      { phone: 'Interval', from: { literal: '3600' } },
      { phone: 'ConfigURL', from: { literal: 'the OBi ConfigURL shown below (it carries the login and secret)' } },
    ],
    apply: 'Submit, then reboot. The phone fetches its file and comes up registered.',
  },
  manual: {
    where: ['Voice Services', 'SP1 Service', 'and Service Providers › ITSP Profile A › SIP'],
    fields: [
      { phone: 'SP1 Service › Enable', from: { literal: 'ticked' } },
      { phone: 'SP1 Service › AuthUserName', from: 'username' as const },
      { phone: 'SP1 Service › AuthPassword', from: 'password' as const },
      { phone: 'SP1 Service › URI', from: 'username' as const },
      { phone: 'ITSP Profile A › SIP › ProxyServer', from: 'server' as const },
      { phone: 'ITSP Profile A › SIP › ProxyServerPort', from: 'port' as const },
      { phone: 'ITSP Profile A › SIP › ProxyServerTransport', from: 'transport' as const },
      { phone: 'ITSP Profile A › SIP › OutboundProxy', from: 'outbound_proxy' as const },
      { phone: 'ITSP Profile A › SIP › OutboundProxyPort', from: 'outbound_port' as const },
    ],
    apply: 'Submit on each page, then reboot.',
  },
};

/* ---------- Cisco ---------- */

const ciscoManualFields = (transport: 'TCP' | 'UDP'): ManualField[] => [
  { phone: 'General › Line Enable', from: { literal: 'yes' } },
  { phone: 'Proxy and Registration › Proxy', from: 'server' },
  { phone: 'Proxy and Registration › Outbound Proxy', from: 'outbound_proxy' },
  { phone: 'Proxy and Registration › Use Outbound Proxy', from: { literal: 'yes' } },
  { phone: 'Proxy and Registration › Register', from: { literal: 'yes' } },
  { phone: 'Subscriber Information › Display Name', from: 'display_name' },
  { phone: 'Subscriber Information › User ID', from: 'username' },
  { phone: 'Subscriber Information › Password', from: 'password' },
  { phone: 'Subscriber Information › Use Auth ID', from: { literal: 'yes' } },
  { phone: 'Subscriber Information › Auth ID', from: 'username' },
  { phone: 'SIP Settings › SIP Transport', from: { literal: transport } },
];

const CISCO_SPA9: SetupGuide = {
  family: 'Cisco SPA900 series (Linksys era)',
  auto: null,
  autoBlocked:
    'This model cannot fetch its settings from us. Its software only speaks an old form of TLS that our provisioning server no longer accepts, so type the account in by hand below. The phone registers and makes calls normally once it is typed in.',
  manual: {
    where: ['Admin Login', 'advanced', 'Ext 1 tab'],
    fields: ciscoManualFields('UDP'),
    apply: 'Submit All Changes. The phone restarts and the line shows Registered.',
    note: 'This series speaks UDP only, so use the UDP port shown above rather than TCP.',
    transport: 'udp',
  },
};

const CISCO_SPA: SetupGuide = {
  family: 'Cisco SPA300 and SPA500 series',
  auto: {
    where: ['Admin Login', 'advanced', 'Provisioning tab'],
    fields: [{ phone: 'Profile Rule', from: { literal: 'the Profile Rule shown below (it carries the login and secret)' } }],
    apply: 'Submit All Changes. The phone fetches its file, restarts and comes up registered.',
  },
  manual: {
    where: ['Admin Login', 'advanced', 'Ext 1 tab'],
    fields: ciscoManualFields('TCP'),
    apply: 'Submit All Changes. The phone restarts and the line shows Registered.',
  },
};

const CISCO_MPP: SetupGuide = {
  family: 'Cisco IP Phone with Multiplatform firmware',
  auto: {
    where: ['Admin Login', 'advanced', 'Voice', 'Provisioning', 'Configuration Profile'],
    fields: [{ phone: 'Profile Rule', from: { literal: 'the Profile Rule shown below (it carries the login and secret)' } }],
    apply: 'Submit All Changes. The phone fetches its file, restarts and comes up registered.',
    note: 'The phone must already be on Multiplatform (MPP) firmware, not the Enterprise firmware that needs a Cisco call manager.',
  },
  manual: {
    where: ['Admin Login', 'advanced', 'Voice', 'Ext 1'],
    fields: ciscoManualFields('TCP'),
    apply: 'Submit All Changes. The phone restarts and the line shows Registered.',
  },
};

/* ---------- Grandstream ---------- */

const GRANDSTREAM: SetupGuide = {
  family: 'Grandstream GRP and GXP desk phone',
  auto: {
    where: ['Maintenance', 'Upgrade and Provisioning', 'Config File'],
    fields: [
      { phone: 'Config Upgrade via', from: { literal: 'HTTPS' } },
      { phone: 'Config Server Path', from: 'prov_url_no_scheme' },
      { phone: 'HTTP/HTTPS User Name', from: 'prov_login' },
      { phone: 'HTTP/HTTPS Password', from: 'prov_secret' },
    ],
    apply: 'Save and Apply, then press Provision (or reboot). The phone fetches its file and comes up registered.',
  },
  manual: {
    where: ['Accounts', 'Account 1', 'General Settings'],
    fields: [
      { phone: 'Account Active', from: { literal: 'Yes' } },
      { phone: 'Account Name', from: 'display_name' },
      { phone: 'SIP Server', from: 'server' },
      { phone: 'Outbound Proxy', from: 'outbound_proxy' },
      { phone: 'SIP User ID', from: 'username' },
      { phone: 'Authenticate ID', from: 'username' },
      { phone: 'Authenticate Password', from: 'password' },
      { phone: 'Name', from: 'display_name' },
      { phone: 'SIP Settings › Basic Settings › SIP Transport', from: 'transport' },
    ],
    apply: 'Save and Apply. The account shows a green tick on the phone.',
    note: 'The port goes after the server with a colon when it is not 5060, for example server:5061.',
  },
};

/** The guide for a phone, by its vendor and model. */
export function setupGuideFor(vendor: unknown, model: unknown): SetupGuide {
  const v = String(vendor ?? '').toLowerCase();
  const m = norm(model);
  if (v === 'yealink') {
    if (/^W\d/.test(m)) return YEALINK_W;
    if (/^CP\d/.test(m)) return YEALINK_CP;
    return YEALINK_T;
  }
  if (v === 'poly') {
    if (/^EDGE/.test(m)) return POLY_EDGE;
    if (/^TRIO/.test(m)) return POLY_TRIO;
    if (/^CCX/.test(m)) return POLY_CCX;
    return POLY_VVX;
  }
  if (v === 'poly-obi') return POLY_OBI;
  if (v === 'cisco') {
    if (/^SPA9\d\d/.test(m)) return CISCO_SPA9;
    if (/^SPA/.test(m)) return CISCO_SPA;
    return CISCO_MPP;
  }
  return GRANDSTREAM;
}

/* ---------- the model list, organised ---------- */

/* A vendor's catalogue runs to thirty-odd part numbers. Listed flat they are
 * a wall of near-identical codes: nothing separates a desk phone from a
 * conference phone, a cordless base or an analogue adapter until you already
 * know the range. So the Add-a-phone list is grouped by product line - the
 * same lines the vendors print on the box, and largely the same split as the
 * setup families above, because the range a phone belongs to is what decides
 * how it is set up.
 *
 * Order is deliberate: the range a company is most likely to be buying today
 * comes first, the long tail last. Within a group the catalogue's own order
 * is kept, which runs from the smallest model up. */

const MODEL_GROUPS: Record<string, { title: string; match: (m: string) => boolean }[]> = {
  yealink: [
    { title: 'Desk phones (T series)', match: (m) => /^T\d/.test(m) },
    { title: 'Conference phones (CP series)', match: (m) => /^CP\d/.test(m) },
    { title: 'Cordless bases (W series)', match: (m) => /^W\d/.test(m) },
  ],
  poly: [
    { title: 'VVX desk phones', match: (m) => /^VVX/.test(m) },
    { title: 'Edge E desk phones', match: (m) => /^EDGE/.test(m) },
    { title: 'CCX desk phones', match: (m) => /^CCX/.test(m) },
    { title: 'Trio conference phones', match: (m) => /^TRIO/.test(m) },
  ],
  'poly-obi': [
    { title: 'VVX desk phones, OBi Edition', match: (m) => /^VVX/.test(m) },
    { title: 'OBi phones and adapters', match: (m) => /^OBI/.test(m) },
  ],
  cisco: [
    { title: 'IP Phones, Multiplatform firmware', match: (m) => /^CP\d/.test(m) },
    { title: 'SPA300 and SPA500 series', match: (m) => /^SPA[35]\d\d/.test(m) },
    { title: 'SPA900 series (Linksys era, manual setup only)', match: (m) => /^SPA9\d\d/.test(m) },
    { title: 'Analogue adapters', match: (m) => /^SPA1\d\d/.test(m) },
  ],
  grandstream: [
    { title: 'GRP desk phones', match: (m) => /^GRP/.test(m) },
    { title: 'GXP desk phones', match: (m) => /^GXP/.test(m) },
  ],
};

export interface ModelGroup {
  title: string;
  models: string[];
}

/** The vendor's models split into named groups, in the order to show them.
 *  Anything the groups do not claim is kept, under "Other models", so a
 *  catalogue that gains a range never silently loses it from the list. */
export function groupModels(vendor: unknown, models: string[]): ModelGroup[] {
  const rules = MODEL_GROUPS[String(vendor ?? '').toLowerCase()];
  if (!rules) return models.length ? [{ title: 'Models', models }] : [];
  const claimed = new Set<string>();
  const groups: ModelGroup[] = [];
  for (const rule of rules) {
    const hit = models.filter((m) => !claimed.has(m) && rule.match(norm(m)));
    hit.forEach((m) => claimed.add(m));
    if (hit.length) groups.push({ title: rule.title, models: hit });
  }
  const rest = models.filter((m) => !claimed.has(m));
  if (rest.length) groups.push({ title: 'Other models', models: rest });
  return groups;
}

/** The model as its maker prints it on the box, for reading. The stored value
 *  is always the catalogue's own token ("EDGEE450"); this only adds the space
 *  the vendor puts there ("Edge E450"), because a run-on code is hard to match
 *  against a label by eye. Yealink and Grandstream print no space, so they are
 *  left exactly as they are. */
export function modelLabel(vendor: unknown, model: string): string {
  const v = String(vendor ?? '').toLowerCase();
  const m = norm(model);
  if (v === 'poly' || v === 'poly-obi') {
    const edge = m.match(/^EDGE ?E?(\w+)$/);
    if (edge) return `Edge E${edge[1]}`;
    const rest = m.match(/^(VVX|CCX|TRIO|OBI)(\w+)$/);
    if (rest) return `${rest[1] === 'OBI' ? 'OBi' : rest[1] === 'TRIO' ? 'Trio' : rest[1]} ${rest[2]}`;
  }
  if (v === 'cisco') {
    const spa = m.match(/^SPA(\w+)$/);
    if (spa) return `SPA ${spa[1]}`;
    const cp = m.match(/^CP(\w+)$/);
    if (cp) return `CP-${cp[1]}`;
  }
  return model;
}
