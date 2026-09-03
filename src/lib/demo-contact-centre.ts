/**
 * A contact centre worth looking at, for demo mode.
 *
 * `demo-mode.ts` answers every request with an empty list, which is honest but
 * leaves most of Performance — Queues, Agents, Calls, Flows, Boards, Callbacks,
 * Speech & Text, and the Reports catalog — rendering empty states. You cannot
 * judge a layout, a stat card or a table against no rows. This is the invented
 * account those screens read instead.
 *
 * Everything is derived from one generated call log, so the surfaces agree with
 * each other: a queue's Handled, an agent's AHT and the CDR table are the same
 * calls counted three ways rather than three unrelated made-up numbers.
 *
 * The account is Indian throughout, by request: agents, contacts and every
 * phone number are Indian names and +91 numbers, not a mixed international
 * roster. It is only ever reachable through demo mode, which only ever runs on
 * a preview host, so nothing here can be mistaken for a real customer's data.
 */

const DAY_START_HOUR = 9;

/* Deterministic, so a refresh does not reshuffle every number on screen. */
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type DemoAgent = {
  uuid: string;
  first_name: string;
  last_name: string;
  extension: string;
  /** A +91 mobile, distinct per agent — Directory ▸ People and the admin
   *  roster both read this, so it can't be left blank without every one of
   *  them rendering a bare "+undefined". */
  phone: string;
  /** One of the two IVR flow sites below, so an agent's site and a flow's
   *  site are the same short list rather than two unrelated ones. */
  site: string;
  role: string;
  role_name: string;
};

const agent = (
  first: string,
  last: string,
  extension: string,
  site: string,
  role = 'AGENT',
  roleName = 'Agent',
): DemoAgent => ({
  uuid: `demo-user-${extension}`,
  first_name: first,
  last_name: last,
  extension,
  /* Extension's last two digits keep each agent's number distinct and easy
     to eyeball against their extension. */
  phone: `+9198765430${extension.slice(-2)}`,
  site,
  role,
  role_name: roleName,
});

/** The floor. Extensions are the join key every surface matches on. */
export const DEMO_AGENTS: DemoAgent[] = [
  agent('Arjun', 'Mehta', '1001', 'Mumbai HQ', 'ADMIN', 'Administrator'),
  agent('Sanjay', 'Kapoor', '1002', 'Mumbai HQ', 'SUB_ADMIN', 'Sub Admin'),
  agent('Meera', 'Nair', '1003', 'Mumbai HQ', 'MANAGER', 'Manager'),
  agent('Priya', 'Sharma', '1004', 'Mumbai HQ'),
  agent('Karan', 'Malhotra', '1005', 'Mumbai HQ'),
  agent('Ananya', 'Iyer', '1006', 'Bengaluru'),
  agent('Vikram', 'Reddy', '1007', 'Bengaluru'),
  agent('Neha', 'Gupta', '1008', 'Bengaluru'),
  agent('Rohan', 'Verma', '1009', 'Mumbai HQ'),
  agent('Ishita', 'Bose', '1010', 'Bengaluru'),
  agent('Aditya', 'Rao', '1011', 'Mumbai HQ', 'SUPERVISOR', 'Supervisor'),
  agent('Kavya', 'Menon', '1012', 'Bengaluru'),
  agent('Rahul', 'Chatterjee', '1013', 'Mumbai HQ', 'BILLING_SPECIALIST', 'Billing Specialist'),
  agent('Divya', 'Pillai', '1014', 'Bengaluru'),
  agent('Farhan', 'Sheikh', '1015', 'Mumbai HQ', 'READ_ONLY', 'Read Only'),
];

type DemoQueue = {
  uuid: string;
  name: string;
  memberExtensions: string[];
  /** Right-now service level, the figure the KPI band and wallboard read. */
  sla: number;
};

export const DEMO_QUEUES: DemoQueue[] = [
  { uuid: 'demo-queue-sales', name: 'Sales', memberExtensions: ['1004', '1005', '1006'], sla: 88 },
  {
    uuid: 'demo-queue-support',
    name: 'Support',
    memberExtensions: ['1004', '1006', '1007', '1008'],
    sla: 74,
  },
  { uuid: 'demo-queue-billing', name: 'Billing', memberExtensions: ['1002', '1007'], sla: 91 },
  {
    uuid: 'demo-queue-onboarding',
    name: 'Onboarding',
    memberExtensions: ['1003', '1005'],
    sla: 96,
  },
  {
    uuid: 'demo-queue-retention',
    name: 'Retention',
    memberExtensions: ['1006', '1008'],
    sla: 58,
  },
];

export const DEMO_FLOWS = [
  { uuid: 'demo-ivr-main', name: 'Main Menu', extension: '8001', site: 'Mumbai HQ' },
  { uuid: 'demo-ivr-support', name: 'Support Routing', extension: '8002', site: 'Mumbai HQ' },
  { uuid: 'demo-ivr-afterhours', name: 'After Hours', extension: '8003', site: 'Bengaluru' },
  { uuid: 'demo-ivr-callback', name: 'Callback Offer', extension: '8004', site: 'Bengaluru' },
];

/**
 * `campaignStatus`/`dialMethod` use the platform's own tokens (`PROCESSING`,
 * `PAUSE`, `PROGRESSIVE`...) so `StatusPill`/`DIAL_METHOD_LABEL` in
 * `pages/auto-dialer/campaign/campaign-ui.tsx` render them, not an "Unknown"
 * fallback. `assignedLeads` is the base every outcome count below is a share
 * of, so the four always foot back to it.
 */
const DEMO_CAMPAIGN_SEED = [
  {
    uuid: 'demo-campaign-renewals',
    name: 'Q3 Renewals',
    campaignStatus: 'PROCESSING',
    dialMethod: 'PROGRESSIVE',
    assignedLeads: 420,
    answeredLeads: 231,
    totalCallNotAnswered: 96,
    totalDnc: 18,
    memberExtensions: ['1004', '1005', '1006'],
    daysAgoStarted: 6,
    daySpan: 14,
  },
  {
    uuid: 'demo-campaign-winback',
    name: 'Winback - Lapsed',
    campaignStatus: 'PROCESSING',
    dialMethod: 'PREDICTIVE',
    assignedLeads: 860,
    answeredLeads: 302,
    totalCallNotAnswered: 411,
    totalDnc: 47,
    memberExtensions: ['1006', '1007', '1008'],
    daysAgoStarted: 2,
    daySpan: 21,
  },
  {
    uuid: 'demo-campaign-survey',
    name: 'CSAT Survey',
    campaignStatus: 'PAUSE',
    dialMethod: 'PREVIEW',
    assignedLeads: 150,
    answeredLeads: 84,
    totalCallNotAnswered: 40,
    totalDnc: 6,
    memberExtensions: ['1002', '1005'],
    daysAgoStarted: 10,
    daySpan: 10,
  },
  {
    uuid: 'demo-campaign-upsell',
    name: 'Upsell - Pro Tier',
    campaignStatus: 'COMPLETED',
    dialMethod: 'PROGRESSIVE',
    assignedLeads: 300,
    answeredLeads: 210,
    totalCallNotAnswered: 76,
    totalDnc: 14,
    memberExtensions: ['1004', '1007'],
    daysAgoStarted: 30,
    daySpan: 12,
  },
];

/* Exported: Directory ▸ External reuses these same twelve people as address
   book entries, so a caller in the CDR and a contact in the directory are
   recognisably the same person rather than two disconnected invented lists. */
export const CONTACT_NAMES = [
  'Rahul Deshmukh',
  'Sneha Joshi',
  'Aditya Kumar',
  'Pooja Bansal',
  'Rohan Chatterjee',
  'Kavya Pillai',
  'Siddharth Rao',
  'Ishita Agarwal',
  'Manish Tiwari',
  'Divya Menon',
  'Farhan Sheikh',
  'Ritu Choudhary',
];

/* The company's own numbers — an Indian toll-free line and a Mumbai (022)
   landline, both carrying +91 so the flag lookup reads them as Indian rather
   than defaulting to +1 once a leading '+' is added. Exported: Inbox's
   "Your number" / fax-number pickers and the admin Numbers list all read the
   same handful of numbers rather than each inventing their own. */
export const DIDS = ['+911800123456', '+911800234567', '+912233445566'];

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

/** "HH:MM:SS" — the format the report pages parse `billsec` as. */
const secondsToClock = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/* A handful of Indian mobile prefixes cycling with a varied five-digit tail —
   reads as a real +91 number without ever landing on one actually issued. */
const INDIAN_MOBILE_PREFIXES = ['98765', '99887', '97123', '96654', '91234', '88990'];
const fakeCaller = (index: number) => {
  const prefix = INDIAN_MOBILE_PREFIXES[index % INDIAN_MOBILE_PREFIXES.length];
  const tail = pad((index * 37 + 10007) % 90000, 5);
  return `+91${prefix}${tail}`;
};

const CONTACT_COMPANIES = [
  'Nimbus Retail Pvt Ltd',
  'Shree Enterprises',
  'Vertex Logistics',
  'Coral Bay Hospitality',
  'Aster Healthcare',
  'Pinnacle Realty',
  'Bluewave Textiles',
  'Orion Fintech',
  'Meadow Foods',
  'Sundar Consulting',
  'Northstar Freight',
  'Zenith Apparel',
];

/** `/api/contact/list` — Directory ▸ External, the address book. */
export const demoContactBookRows = () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  return CONTACT_NAMES.map((fullName, index) => {
    const [first, ...rest] = fullName.split(' ');
    const last = rest.join(' ');
    return {
      _id: `demo-contact-${index + 1}`,
      name: { first, last },
      contact: {
        phone: fakeCaller(500 + index),
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      },
      profile: { contactPic: null, company: CONTACT_COMPANIES[index % CONTACT_COMPANIES.length] },
      company: CONTACT_COMPANIES[index % CONTACT_COMPANIES.length],
      title: index % 3 === 0 ? 'Owner' : index % 3 === 1 ? 'Purchase Manager' : 'Operations Lead',
      social: {},
      groupMeta: [],
      is_vip: index % 5 === 0,
      is_dnc: index === 4,
      is_blocked: index === 9,
      tag: index === 9 ? 'BLOCK' : index === 4 ? 'DNC' : index % 5 === 0 ? 'VIP' : 'STANDARD',
      createdAt: new Date(now - (30 + index) * DAY_MS).toISOString(),
      updatedAt: new Date(now - index * DAY_MS).toISOString(),
    };
  });
};

export type DemoCall = Record<string, any>;

/* Spans the last 35 days (covers Today, Last 7/30 Days, This Month and a
   sliver of Last Month) rather than clustering everything into one day —
   otherwise every date-range filter shows the identical set, and switching
   Week to Month proves nothing. Today keeps the original per-day volume so
   nothing that read this as "today's calls" before sees fewer; each earlier
   day gets its own smaller, weekday-shaped count. */
const HISTORY_DAYS = 35;
const TODAY_CALL_COUNT = 64;

const buildCalls = (now: number): DemoCall[] => {
  const random = mulberry32(20260831);
  const rows: DemoCall[] = [];
  let globalIndex = 0;

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    const dayNow = now - daysAgo * 24 * 60 * 60 * 1000;
    const dayOfWeek = new Date(dayNow).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const dayStart = new Date(dayNow);
    dayStart.setHours(DAY_START_HOUR, 0, 0, 0);
    /* Before the working day has started, still lay today's calls out
       behind "now" rather than in the future. */
    const windowEnd = daysAgo === 0 ? dayNow : new Date(dayNow).setHours(18, 30, 0, 0);
    const windowStart =
      daysAgo === 0 ? Math.min(dayStart.getTime(), dayNow - 60 * 60 * 1000) : dayStart.getTime();
    const span = Math.max(windowEnd - windowStart, 60 * 60 * 1000);

    const total =
      daysAgo === 0
        ? TODAY_CALL_COUNT
        : Math.round((isWeekend ? 3 : 10) + random() * (isWeekend ? 4 : 12));

    for (let index = 0; index < total; index += 1) {
      const roll = random();
      const kind = roll < 0.58 ? 'QUEUE' : roll < 0.78 ? 'IVR' : 'DIRECT';
      const outbound = kind === 'DIRECT' && random() < 0.62;

      const queue = DEMO_QUEUES[Math.floor(random() * DEMO_QUEUES.length)];
      const flow = DEMO_FLOWS[Math.floor(random() * DEMO_FLOWS.length)];
      const handler =
        kind === 'QUEUE'
          ? queue.memberExtensions[Math.floor(random() * queue.memberExtensions.length)]
          : DEMO_AGENTS[Math.floor(random() * DEMO_AGENTS.length)].extension;
      const handlerAgent = DEMO_AGENTS.find((row) => row.extension === handler) as DemoAgent;

      /* Retention is the queue that is struggling — it abandons more, which
         is what gives the SLA and abandon-rate cards something to say. */
      const abandonChance =
        kind === 'IVR' ? 0.12 : queue.uuid === 'demo-queue-retention' ? 0.34 : 0.1;
      const answered = outbound ? random() > 0.14 : random() > abandonChance;

      const wait = answered ? Math.round(4 + random() * 46) : Math.round(20 + random() * 70);
      const talk = answered ? Math.round(45 + random() * 520) : 0;

      const startedAt = windowStart + Math.floor((span * (index + random())) / total);
      const contact = CONTACT_NAMES[globalIndex % CONTACT_NAMES.length];
      const caller = fakeCaller(globalIndex);
      const did = DIDS[globalIndex % DIDS.length];

      /* Outbound minutes are billed at a real carrier rate, inbound/queue
         minutes at a much smaller one (the DID cost, not the call itself) —
         a flat $0.012/min made every charge, even a 9-minute call, land
         under $0.12, so the Charge column never showed real variation. This
         still keeps most calls under a dollar (a real contact centre's
         typical case) while letting a long outbound call clear it. */
      const ratePerMinute = outbound ? 0.05 + random() * 0.15 : 0.006 + random() * 0.02;
      const charge = Number(((talk / 60) * ratePerMinute).toFixed(4));

      rows.push({
        uuid: `demo-cdr-${globalIndex + 1}`,
        sipcall_id: `demo-sip-${globalIndex + 1}`,
        count: 1,
        start_stamp: new Date(startedAt).toISOString(),
        answer_stamp: answered ? new Date(startedAt + wait * 1000).toISOString() : null,
        end_stamp: new Date(startedAt + (wait + talk) * 1000).toISOString(),
        direction: outbound ? 'Outbound' : 'Inbound',
        status: answered ? 'ANSWERED' : 'NO ANSWER',
        caller_id_number: outbound ? handler : caller,
        display_caller_number: caller,
        from_display_name: outbound
          ? `${handlerAgent.first_name} ${handlerAgent.last_name}`
          : contact,
        contact_name: contact,
        contact_type: globalIndex % 5 === 0 ? 'LEAD' : '',
        extension: handler,
        agent_extension: handler,
        via_did: kind === 'IVR' ? flow.extension : did,
        destination_number: kind === 'IVR' ? flow.extension : outbound ? caller : did,
        forward_type: kind === 'DIRECT' ? null : kind,
        forward_value: kind === 'QUEUE' ? queue.uuid : kind === 'IVR' ? flow.uuid : null,
        forward_name: kind === 'QUEUE' ? queue.name : kind === 'IVR' ? flow.name : null,
        queue_uuid: kind === 'QUEUE' ? queue.uuid : null,
        is_voicemail: 0,
        hangup_cause: answered ? 'NORMAL_CLEARING' : 'NO_ANSWER',
        /* The report pages (Call History, Outbound, Voicemail, Call
           Recording, Inbound, Local Call List — and Performance ▸ Calls,
           which embeds Call History) all parse `billsec` as an "HH:MM:SS"
           string themselves (`timeStringToSeconds`, or sliced straight as a
           fallback duration); `billsectotal` is the one every page's
           primary duration column reads as a plain number, so that stays
           numeric. Internally, every demo aggregation below reads
           `billsectotal`, never `billsec`, for exactly this reason. */
        billsec: secondsToClock(talk),
        billsectotal: talk,
        duration: wait + talk,
        durationtotal: wait + talk,
        charge,
        chargeTotal: charge,
      });

      globalIndex += 1;
    }
  }

  return rows.sort((left, right) => Date.parse(right.start_stamp) - Date.parse(left.start_stamp));
};

/** Inclusive "YYYY-MM-DD" bounds, the shape every date-range picker sends as
 *  `filter_date`. Missing `from`/`to` leaves that side open. */
export const filterCallsByDateRange = (
  rows: DemoCall[],
  range?: { from?: string; to?: string } | null,
): DemoCall[] => {
  if (!range?.from && !range?.to) return rows;
  const startMs = range.from ? new Date(`${range.from}T00:00:00`).getTime() : -Infinity;
  const endMs = range.to ? new Date(`${range.to}T23:59:59.999`).getTime() : Infinity;
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return rows;
  return rows.filter((row) => {
    const timestamp = Date.parse(row.start_stamp);
    return timestamp >= startMs && timestamp <= endMs;
  });
};

/* Built once per page load: the figures then hold still across the 2s refetch
   instead of every card animating to a new number twice a second. */
let cachedCalls: DemoCall[] | null = null;
export const demoCalls = () => {
  if (!cachedCalls) cachedCalls = buildCalls(Date.now());
  return cachedCalls;
};

const isMissed = (row: DemoCall) => row.direction === 'Inbound' && row.billsectotal === 0;

export const demoCallStats = (rows: DemoCall[] = demoCalls()) => {
  return {
    total_calls: rows.length,
    missed_calls: rows.filter(isMissed).length,
    inbound_calls: rows.filter((row) => row.direction === 'Inbound').length,
    outbound_calls: rows.filter((row) => row.direction === 'Outbound').length,
    voicemail: 0,
  };
};

/** `/api/tenant/report/inbound-calls` — Reports ▸ Inbound, the same log
 *  filtered to one direction. */
export const demoInboundCallRows = (rows: DemoCall[] = demoCalls()) =>
  rows
    .filter((row) => row.direction === 'Inbound')
    /* `billsec` already arrives as the "HH:MM:SS" string this page (and every
       other call-list report) expects; only `waitsec` is specific to this
       one's own duration-column fallback. */
    .map((row): DemoCall => ({ ...row, waitsec: 2 }));

/** `/api/tenant/local-call-list` — extension-to-extension calls, which the
 *  generated CDR doesn't otherwise model. A handful of short internal calls
 *  between agents on the same roster the rest of the app already uses. */
export const demoLocalCallRows = () => {
  const now = Date.now();
  const MIN_MS = 60 * 1000;
  const pairs = [
    { fromExt: '1004', toExt: '1005', minutesAgo: 42, durationSec: 95 },
    { fromExt: '1006', toExt: '1003', minutesAgo: 130, durationSec: 210 },
    { fromExt: '1002', toExt: '1001', minutesAgo: 260, durationSec: 48 },
    { fromExt: '1008', toExt: '1007', minutesAgo: 400, durationSec: 165 },
  ];
  return pairs.map((row, index) => {
    const from = DEMO_AGENTS.find((agent) => agent.extension === row.fromExt) as DemoAgent;
    const to = DEMO_AGENTS.find((agent) => agent.extension === row.toExt) as DemoAgent;
    const startedAt = now - row.minutesAgo * MIN_MS;
    return {
      uuid: `demo-local-call-${index + 1}`,
      start_stamp: new Date(startedAt).toISOString(),
      end_stamp: new Date(startedAt + row.durationSec * 1000).toISOString(),
      caller_id_number: from.extension,
      from_name: `${from.first_name} ${from.last_name}`,
      destination_number: to.extension,
      to_name: `${to.first_name} ${to.last_name}`,
      to_display_name: `${to.first_name} ${to.last_name}`,
      direction: 'Internal',
      status: 'ANSWERED',
      /* `billsectotal`/`waitsec` are what the two duration columns actually
         read; `billsec` is only their fallback and has to stay a sliceable
         string there (`"HH:MM:SS".slice(3)`), not the number every other
         report page uses it as — this page is the one exception. */
      billsec: new Date(row.durationSec * 1000).toISOString().slice(11, 19),
      billsectotal: row.durationSec,
      waitsec: 2,
      duration: row.durationSec,
      durationtotal: row.durationSec,
    };
  });
};

/** `/api/campaign/dnc/list` — numbers a campaign must never dial. */
export const demoDncRows = () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const seed = [
    { name: 'Yash Oberoi', daysAgo: 40 },
    { name: 'Nikita Bhat', daysAgo: 18 },
    { name: 'Suresh Iyengar', daysAgo: 5 },
  ];
  return seed.map((row, index) => ({
    uuid: `demo-dnc-${index + 1}`,
    name: row.name,
    phone: fakeCaller(600 + index),
    email: `${row.name.split(' ')[0].toLowerCase()}@example.com`,
    createdAt: new Date(now - row.daysAgo * DAY_MS).toISOString(),
  }));
};

/** `/api/tenant/user/template/list` — Admin ▸ Templates ▸ User Settings, the
 *  named presets an admin applies when creating or editing someone. Deliberately
 *  does not include a "Company Default" row: that reserved name is company-wide
 *  policy (see company-policy.ts), and its absence is the documented, correct
 *  "nothing configured yet" state — inventing one would silently lock settings
 *  no admin actually chose to lock. */
export const demoTemplateRows = () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  type TemplateSeedRow = { name: string; daysAgo: number; uuidSuffix?: number };
  const seed: TemplateSeedRow[] = [
    { name: 'Sales Team Defaults', daysAgo: 60 },
    { name: 'Support Agent Defaults', daysAgo: 45 },
    { name: 'Management Defaults', daysAgo: 38 },
    { name: 'Remote Team Defaults', daysAgo: 30 },
    { name: 'Billing Team Defaults', daysAgo: 21 },
    { name: 'Onboarding Defaults', daysAgo: 10 },
    /* uuidSuffix picked so dummy-template-meta.ts's deterministic status
       roll lands on Pending/Draft — otherwise the seed set never showed
       either of those two statuses even once, only Active/Archived. */
    { name: 'Trial Team Defaults', daysAgo: 4, uuidSuffix: 8 },
    { name: 'New Hire Draft', daysAgo: 1, uuidSuffix: 12 },
  ];
  /* A second department-named batch — mainly so the list is long enough to
     span more than one page. `per page` defaults to 25, so this pushes the
     total past that boundary and onto a real page 2, not just a longer
     single page. */
  const BULK_TEAMS = [
    'Marketing', 'Product', 'Legal', 'HR', 'Finance', 'Logistics', 'Customer Success', 'IT',
    'Procurement', 'Field Ops', 'Data', 'Design', 'QA', 'DevOps', 'Partnerships', 'Growth',
    'Retail Ops', 'Warehouse', 'Compliance', 'Risk', 'Treasury', 'Payroll', 'Recruiting',
    'Training', 'Facilities', 'Security', 'Analytics', 'Localization', 'Content', 'Events',
  ];
  const bulkSeed: TemplateSeedRow[] = BULK_TEAMS.map((team, i) => ({
    name: `${team} Team Defaults`,
    daysAgo: 2 + ((i * 7) % 88),
  }));
  /* A third batch, pairing the same team list with a site, to push the
     total well past two pages of 25 for pagination testing. */
  const BULK_SITES = ['Mumbai HQ', 'Bengaluru'];
  const bulkSeed2: TemplateSeedRow[] = BULK_TEAMS.flatMap((team, i) =>
    BULK_SITES.map((site, s) => ({
      name: `${team} (${site})`,
      daysAgo: 2 + ((i * 11 + s * 5) % 88),
    })),
  );
  /* uuid used to come from array position (`demo-template-${index + 1}`),
     which quietly broke the moment a batch got inserted ahead of one of the
     two uuidSuffix-pinned rows below: two rows landed on the same position
     and so the same uuid, each silently overwriting the other's meta and
     tripping a duplicate-key warning in the table. Deriving it from the
     name instead is stable no matter how the array is reordered or grown —
     the two pinned suffixes get their own separate namespace so they can
     never collide with a slugified name. */
  const slugify = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return [...seed, ...bulkSeed, ...bulkSeed2].map((row) => ({
    uuid: row.uuidSuffix ? `demo-template-fixed-${row.uuidSuffix}` : `demo-template-${slugify(row.name)}`,
    name: row.name,
    settings: JSON.stringify({}),
    greetings: JSON.stringify({}),
    created_at: new Date(now - row.daysAgo * DAY_MS).toISOString(),
    updated_at: new Date(now - (row.daysAgo - 3) * DAY_MS).toISOString(),
  }));
};

/* Matches `DEMO_USER.uuid` in demo-mode.ts. Not imported from there —
   demo-mode.ts already imports this module, and the reverse import would be
   circular — so the id is repeated here rather than shared. */
const DEMO_USER_UUID = 'demo-user-0000-0000-0000-000000000001';

/** Activity ▸ Chat's `allChats` — arrives over the socket, which demo mode has
 *  no server for, so like presence and in-progress calls this seeds the
 *  socket context's initial state instead. A handful of real direct threads
 *  with the roster Chat already lists as "available", each with a last
 *  message, so the list shows real conversations rather than every colleague
 *  reading "Click to start a new chat". Full message history inside an
 *  opened thread is a live `socket.emit(GET_CHAT_MESSAGES, ...)` round trip
 *  this doesn't answer — demo mode has no server on the other end of that
 *  socket at all, so opening one of these still comes back empty. */
export const demoChatThreads = () => {
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const me = { uuid: DEMO_USER_UUID, first_name: 'Arjun', last_name: 'Mehta', name: 'Arjun Mehta' };
  const seed = [
    { extension: '1004', hoursAgo: 1, message: 'Can you take the Sales queue for the next hour?' },
    { extension: '1006', hoursAgo: 4, message: 'Sent over the Retention numbers from this morning.' },
    { extension: '1003', hoursAgo: 26, message: 'Approved your leave request for next week.' },
  ];
  const directChats = seed.map((row, index) => {
    const other = DEMO_AGENTS.find((agent) => agent.extension === row.extension) as DemoAgent;
    const createdAt = new Date(now - row.hoursAgo * HOUR_MS).toISOString();
    return {
      chatId: `demo-chat-${index + 1}`,
      isGroupChat: false,
      groupType: 'DM',
      users: [
        me,
        {
          uuid: other.uuid,
          first_name: other.first_name,
          last_name: other.last_name,
          name: `${other.first_name} ${other.last_name}`,
          extension: other.extension,
        },
      ],
      lastMessage: {
        message: row.message,
        createdAt,
        senderId: other.uuid,
      },
      createdAt,
      favoriteChats: [],
      isHidden: [],
      isDeleted: false,
    };
  });

  /* The Team tab — group chats, distinguished by `isGroupChat: true` and a
     `name` of their own rather than a single other person's. */
  const teamSeed = [
    {
      name: 'Sales Team',
      memberExtensions: ['1004', '1005', '1006'],
      hoursAgo: 3,
      message: 'Q3 Renewals is at 55% dialed, on pace for Friday.',
      senderExt: '1005',
    },
    {
      name: 'Support Escalations',
      memberExtensions: ['1004', '1006', '1007', '1008'],
      hoursAgo: 20,
      message: "Retention's abandon rate dipped below 30% today.",
      senderExt: '1008',
    },
  ];
  const teamChats = teamSeed.map((row, index) => {
    const members = row.memberExtensions.map((extension) => {
      const agent = DEMO_AGENTS.find((a) => a.extension === extension) as DemoAgent;
      return {
        uuid: agent.uuid,
        first_name: agent.first_name,
        last_name: agent.last_name,
        name: `${agent.first_name} ${agent.last_name}`,
        extension: agent.extension,
      };
    });
    const sender = DEMO_AGENTS.find((a) => a.extension === row.senderExt) as DemoAgent;
    const createdAt = new Date(now - row.hoursAgo * HOUR_MS).toISOString();
    return {
      chatId: `demo-team-chat-${index + 1}`,
      isGroupChat: true,
      groupType: 'TEAM',
      name: row.name,
      admins: [DEMO_USER_UUID],
      users: [me, ...members],
      lastMessage: {
        message: row.message,
        createdAt,
        senderId: sender.uuid,
      },
      createdAt,
      favoriteChats: [],
      isHidden: [],
      isDeleted: false,
    };
  });

  return [...directChats, ...teamChats];
};

/** The chat body renders `message.message` through `normalizeMessageNodes`,
 *  which only accepts an actual array (or a JSON string of one) — a plain
 *  string parses to `[]` and the bubble renders empty — so every seeded
 *  message body has to be this Slate paragraph shape, the same one the
 *  compose box itself sends. */
const toSlateMessage = (text: string) => [{ type: 'paragraph', children: [{ text }] }];

/** `messageList` — the actual message history behind each `demoChatThreads()`
 *  entry. Without this, opening any seeded chat shows "No messages found"
 *  even though the sidebar preview (`lastMessage`) has text, because
 *  `messageList` otherwise only ever grows from messages sent live in the
 *  session. The final line of each thread matches that chat's `lastMessage`
 *  exactly, so the preview and the opened thread never disagree. */
export const demoMessageList = () => {
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const meUuid = DEMO_USER_UUID;
  const agent = (extension: string) =>
    DEMO_AGENTS.find((row) => row.extension === extension) as DemoAgent;

  const directThreads: Array<{
    chatId: string;
    extension: string;
    lines: Array<{ hoursAgo: number; fromMe: boolean; text: string }>;
  }> = [
    {
      chatId: 'demo-chat-1',
      extension: '1004',
      lines: [
        { hoursAgo: 3, fromMe: true, text: 'Priya, how is the Sales queue looking this afternoon?' },
        { hoursAgo: 2.5, fromMe: false, text: 'Busy — two agents out, but we are keeping up.' },
        { hoursAgo: 1, fromMe: false, text: 'Can you take the Sales queue for the next hour?' },
      ],
    },
    {
      chatId: 'demo-chat-2',
      extension: '1006',
      lines: [
        { hoursAgo: 6, fromMe: true, text: 'Ananya, did the Retention list from this morning go out?' },
        { hoursAgo: 5.5, fromMe: false, text: 'Pulling it together now, give me a few minutes.' },
        { hoursAgo: 4, fromMe: false, text: 'Sent over the Retention numbers from this morning.' },
      ],
    },
    {
      chatId: 'demo-chat-3',
      extension: '1003',
      lines: [
        { hoursAgo: 30, fromMe: true, text: 'Meera, I put in a leave request for next week — can you review it?' },
        { hoursAgo: 26, fromMe: false, text: 'Approved your leave request for next week.' },
      ],
    },
  ];

  const directMessages = directThreads.map((thread) => {
    const other = agent(thread.extension);
    return {
      chatId: thread.chatId,
      messages: thread.lines.map((line, index) => ({
        messageId: `${thread.chatId}-msg-${index + 1}`,
        chatId: thread.chatId,
        message: toSlateMessage(line.text),
        senderId: line.fromMe ? meUuid : other.uuid,
        createdAt: new Date(now - line.hoursAgo * HOUR_MS).toISOString(),
        messageType: 'text',
      })),
    };
  });

  const teamThreads: Array<{
    chatId: string;
    lines: Array<{ hoursAgo: number; senderExt: string | null; text: string }>;
  }> = [
    {
      chatId: 'demo-team-chat-1',
      lines: [
        { hoursAgo: 8, senderExt: null, text: 'Morning team — Q3 Renewals push starts today, target is 55% dialed by EOD.' },
        { hoursAgo: 5, senderExt: '1004', text: 'On it, starting with the Mumbai HQ list.' },
        { hoursAgo: 3, senderExt: '1005', text: 'Q3 Renewals is at 55% dialed, on pace for Friday.' },
      ],
    },
    {
      chatId: 'demo-team-chat-2',
      lines: [
        { hoursAgo: 24, senderExt: '1007', text: "Retention's abandon rate crept up overnight, keeping an eye on it." },
        { hoursAgo: 22, senderExt: null, text: 'Added two more agents to the Retention queue for the morning.' },
        { hoursAgo: 20, senderExt: '1008', text: "Retention's abandon rate dipped below 30% today." },
      ],
    },
  ];

  const teamMessages = teamThreads.map((thread) => ({
    chatId: thread.chatId,
    messages: thread.lines.map((line, index) => ({
      messageId: `${thread.chatId}-msg-${index + 1}`,
      chatId: thread.chatId,
      message: toSlateMessage(line.text),
      senderId: line.senderExt ? agent(line.senderExt).uuid : meUuid,
      createdAt: new Date(now - line.hoursAgo * HOUR_MS).toISOString(),
      messageType: 'text',
    })),
  }));

  return [...directMessages, ...teamMessages];
};

/** Activity ▸ Agent Chat's `allAgentChats` — website-widget conversations
 *  already picked up by an agent (Active) or finished (Resolved). Seeds the
 *  socket context's initial state the same way `demoChatThreads` does for
 *  Activity ▸ Chat; see that function's comment for why. Visitors are
 *  distinct people from the internal roster/address book — a website
 *  visitor isn't necessarily someone already in the CRM. */
export const demoAgentChatThreads = () => {
  const now = Date.now();
  const MIN_MS = 60 * 1000;
  const me = { uuid: DEMO_USER_UUID, first_name: 'Arjun', last_name: 'Mehta', name: 'Arjun Mehta' };
  const seed = [
    {
      visitor: 'Manish Tiwari',
      minutesAgo: 6,
      message: 'Do you support porting an existing number?',
      isEnded: false,
    },
    {
      visitor: 'Divya Menon',
      minutesAgo: 240,
      message: 'Thanks for the help, that answers it!',
      isEnded: true,
    },
  ];
  return seed.map((row, index) => {
    const visitorUuid = `demo-visitor-${index + 1}`;
    const createdAt = new Date(now - row.minutesAgo * MIN_MS).toISOString();
    return {
      chatId: `demo-agent-chat-${index + 1}`,
      isGroupChat: false,
      groupType: 'AI',
      isEnded: row.isEnded,
      users: [me, { uuid: visitorUuid, name: row.visitor }],
      lastMessage: { message: row.message, createdAt, senderId: visitorUuid },
      metaData: { status: row.isEnded ? 'resolved' : 'active', lastMessageTimeStamp: createdAt },
      createdAt,
      isHidden: [],
      isDeleted: false,
    };
  });
};

/** Activity ▸ Agent Chat's `aiChatRequests` — visitors waiting in the
 *  Unassigned queue (`status: 'pending'`) or who left before anyone picked
 *  up (`status: 'abandoned'`, shown under Missed). */
export const demoAiChatRequests = () => {
  const now = Date.now();
  const MIN_MS = 60 * 1000;
  const seed = [
    { visitor: 'Farhan Sheikh', minutesAgo: 2, status: 'pending', domain: 'letsdial.com' },
    { visitor: 'Ritu Choudhary', minutesAgo: 5, status: 'pending', domain: 'letsdial.com' },
    { visitor: 'Kavya Pillai', minutesAgo: 90, status: 'abandoned', domain: 'letsdial.com' },
  ];
  return seed.map((row, index) => ({
    chatId: `demo-ai-request-${index + 1}`,
    status: row.status,
    domain: row.domain,
    createdAt: new Date(now - row.minutesAgo * MIN_MS).toISOString(),
    users: { name: row.visitor, uuid: `demo-visitor-request-${index + 1}` },
  }));
};

/** `/api/tenant/report/agents` — matched back to the roster by name. */
export const demoAgentReportRows = (rows: DemoCall[] = demoCalls()) =>
  DEMO_AGENTS.map((row) => {
    const handled = rows.filter((call) => call.extension === row.extension);
    const answered = handled.filter((call) => call.billsectotal > 0);
    const talkSeconds = answered.reduce((sum, call) => sum + call.billsectotal, 0);
    return {
      uuid: row.uuid,
      first_name: row.first_name,
      last_name: row.last_name,
      extension: row.extension,
      stats: {
        answered_calls: answered.length,
        missed_calls: handled.length - answered.length,
        total_calls: handled.length,
        incoming_calls: handled.filter((call) => call.direction === 'Inbound').length,
        outgoing_calls: handled.filter((call) => call.direction === 'Outbound').length,
        time_on_calls_minutes: Math.round(talkSeconds / 60),
      },
    };
  });

/** `/api/tenant/report/call-queue/list` — the per-queue REST report. */
export const demoQueueReportRows = (rows: DemoCall[] = demoCalls()) =>
  DEMO_QUEUES.map((queue) => {
    const handled = rows.filter((call) => call.forward_value === queue.uuid);
    const answered = handled.filter((call) => call.billsectotal > 0);
    const waitTotal = handled.reduce((sum, call) => sum + (call.duration - call.billsectotal), 0);
    return {
      uuid: queue.uuid,
      name: queue.name,
      queue_stats: {
        answered_calls: answered.length,
        missed_calls: handled.length - answered.length,
        total_calls: handled.length,
        avg_waiting_time: handled.length ? Math.round(waitTotal / handled.length) : 0,
      },
    };
  });

/** `/api/call-queue/list` — members are stored as a JSON string on the platform. */
export const demoQueueRows = () =>
  DEMO_QUEUES.map((queue, index) => ({
    uuid: queue.uuid,
    name: queue.name,
    extension: String(9001 + index),
    strategy: 'ring-all',
    status: 1,
    members: JSON.stringify(
      queue.memberExtensions.map((extension) => {
        const member = DEMO_AGENTS.find((row) => row.extension === extension) as DemoAgent;
        return {
          uuid: member.uuid,
          user_uuid: member.uuid,
          extension: member.extension,
          name: `${member.first_name} ${member.last_name}`,
        };
      }),
    ),
  }));

/** `/api/site/list` — Directory ▸ Locations and Company Info's own site list.
 *  Same two cities the agents and IVR flows already carry, so a "Mumbai HQ"
 *  named elsewhere resolves to a real site here rather than a label nothing
 *  backs up. */
export const demoSiteRows = () => [
  {
    uuid: 'demo-site-mumbai',
    name: 'Mumbai HQ',
    address: '14th Floor, Bandra Kurla Complex',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'IN',
    postal_code: '400051',
    timezone: 'Asia/Kolkata',
    is_default: 'Y',
  },
  {
    uuid: 'demo-site-bengaluru',
    name: 'Bengaluru',
    address: '2nd Block, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'IN',
    postal_code: '560034',
    timezone: 'Asia/Kolkata',
    is_default: 'N',
  },
];

/** `/api/tenant/ivr/list` — `site` arrives as a JSON string on the platform. */
export const demoFlowRows = () =>
  DEMO_FLOWS.map((flow) => ({
    uuid: flow.uuid,
    name: flow.name,
    extension: flow.extension,
    site: JSON.stringify({ label: flow.site, value: flow.site.toLowerCase() }),
    status: 1,
  }));

/** `/api/tenant/xml/call-logs` — the "Queue Info" / "IVR Info" side drawer a
 *  CDR row's forward-path icon opens. Shaped once and reused for both types:
 *  `queue-details-view.tsx` reads `result.queue`, `ivr-details-view.tsx`
 *  reads `result.ivr`, and both fall back to reading `result` itself when
 *  neither key is present — matching the field names here (`members`,
 *  `manager`, `forward_call_actions`, `site` as JSON strings) is what turns
 *  that "unavailable" empty state into the actual queue/flow record. */
export const demoQueueCallLogDetail = (callId: string, type: string) => {
  const call = demoCalls().find((row) => row.sipcall_id === callId);
  const manager = DEMO_AGENTS.find((row) => row.role === 'MANAGER') as DemoAgent;
  const toMemberEntry = (agentRow: DemoAgent) => ({
    uuid: agentRow.uuid,
    label: `${agentRow.first_name} ${agentRow.last_name}`,
    extension: agentRow.extension,
    value: agentRow.extension,
    role: agentRow.role_name,
    email: `${agentRow.first_name.toLowerCase()}.${agentRow.last_name.toLowerCase()}@example.com`,
    profile: '',
  });
  /* `CallHistoryLogs` (the sub-table both drawers render below their info
     card) reads `billsec` as a plain number of seconds, unlike every other
     CDR-report consumer in the app which reads it as an "HH:MM:SS" string —
     without this remap its Duration column shows NaN:NaN:NaN. */
  const relatedCalls = call
    ? demoCalls()
        .filter((row) => row.forward_value === call.forward_value)
        .slice(0, 8)
        .map((row) => ({ ...row, billsec: row.billsectotal }))
    : [];

  if (type === 'IVR') {
    const flow = DEMO_FLOWS.find((row) => row.uuid === call?.forward_value) || DEMO_FLOWS[0];
    return {
      result: {
        ivr: {
          name: flow.name,
          extension: flow.extension,
          site: JSON.stringify({ label: flow.site, value: flow.site.toLowerCase() }),
          /* Keys 1/2 route to a queue, 0 reaches the operator, anything else
             hangs up - `ivr-details-view.tsx` renders one row per entry. */
          ivr_option: JSON.stringify([
            { key: '1', type: 'QUEUE', label: 'Sales', value: 'demo-queue-sales' },
            { key: '2', type: 'QUEUE', label: 'Support', value: 'demo-queue-support' },
            { key: '0', type: 'EXTENSION', label: `${manager.first_name} ${manager.last_name}`, value: manager.extension },
            { key: '*', type: 'HANGUP', label: '', value: '' },
          ]),
          generic_keys: JSON.stringify({
            timeout_action: { status: 'HANGUP', type: '', label: '' },
            failure_action: { status: 'HANGUP', type: '', label: '' },
          }),
        },
      },
      calls: relatedCalls,
    };
  }

  const queueIndex = DEMO_QUEUES.findIndex((row) => row.uuid === call?.forward_value);
  const queue = queueIndex >= 0 ? DEMO_QUEUES[queueIndex] : DEMO_QUEUES[0];
  const members = queue.memberExtensions
    .map((extension) => DEMO_AGENTS.find((row) => row.extension === extension))
    .filter((row): row is DemoAgent => Boolean(row));
  return {
    result: {
      queue: {
        name: queue.name,
        extension: String(9001 + Math.max(queueIndex, 0)),
        description: `${queue.name} queue, service level target ${queue.sla}%.`,
        site: JSON.stringify({ label: members[0]?.site || 'Mumbai HQ' }),
        manager: JSON.stringify(toMemberEntry(manager)),
        members: JSON.stringify(members.map(toMemberEntry)),
        forward_call_actions: JSON.stringify({
          call_handling: { failover: { type: 'VOICEMAIL', value: 'Company Voicemail' } },
        }),
      },
    },
    calls: relatedCalls,
  };
};

/** `/api/fax/did/number/assigned` and `DEMO_USER.assigned_did` — the numbers
 *  Inbox's "Your number" / fax-number pickers offer, and what the admin
 *  Numbers list shows as owned by the tenant. */
export const demoAssignedDidRows = () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const seed = [
    { did: DIDS[0], name: 'Sales Line', type: 'toll_free', site: 'Mumbai HQ', daysAgo: 210 },
    { did: DIDS[1], name: 'Support Line', type: 'toll_free', site: 'Mumbai HQ', daysAgo: 180 },
    { did: DIDS[2], name: 'Bengaluru Office', type: 'local', site: 'Bengaluru', daysAgo: 95 },
  ];
  return seed.map((row, index) => ({
    uuid: `demo-did-${index + 1}`,
    did_number: row.did,
    phone_number: row.did,
    did_name: row.name,
    did_type: row.type,
    user_details: null,
    site_data: { name: row.site },
    Site: { name: row.site },
    type: row.site,
    features: ['voice', 'sms', 'fax'],
    buy_date: new Date(now - row.daysAgo * DAY_MS).toISOString(),
  }));
};

/* `DEMO_USER.uuid` in demo-mode.ts — duplicated as a literal rather than
   imported, since demo-mode.ts already imports from this module and an
   import the other way would cycle. Outbound SMS messages are attributed to
   this uuid so Inbox's "is this message mine" check reads correctly. */
const DEMO_ACCOUNT_UUID = 'demo-user-0000-0000-0000-000000000001';

/** `/api/v1/sms/did-list` — Inbox's conversation list for the selected number. */
export const demoSmsConversations = () => {
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const seed = [
    {
      name: 'Rahul Deshmukh',
      lastMessage: 'Thanks, that resolved it!',
      hoursAgo: 2,
      inbound: true,
    },
    {
      name: 'Sneha Joshi',
      lastMessage: 'Can you resend the invoice for this month?',
      hoursAgo: 7,
      inbound: true,
    },
    {
      name: 'Aditya Kumar',
      lastMessage: 'Sounds good, talk then.',
      hoursAgo: 27,
      inbound: false,
    },
  ];
  return seed.map((row, index) => {
    const phone = fakeCaller(400 + index);
    return {
      _id: `demo-chat-${index + 1}`,
      chatId: `demo-chat-${index + 1}`,
      from: row.inbound ? phone : DIDS[0],
      to: row.inbound ? DIDS[0] : phone,
      name: row.name,
      toContactName: row.name,
      phone,
      contactPic: null,
      metaData: {
        direction: row.inbound ? 'inbound' : 'outbound',
        lastMessage: row.lastMessage,
        timestamp: new Date(now - row.hoursAgo * HOUR_MS).toISOString(),
        messageMimeType: 'sms',
      },
    };
  });
};

/** `/api/v1/sms/list` — the open conversation's messages, keyed by chat_id. */
export const demoSmsThreadRows = (chatId: string) => {
  const conversation = demoSmsConversations().find((row) => row.chatId === chatId);
  if (!conversation) return [];

  const now = Date.now();
  const MIN_MS = 60 * 1000;
  const script = [
    { fromMe: false, minutesAgo: 130, text: `Hi, I need help with my account.` },
    { fromMe: true, minutesAgo: 125, text: `Hi ${conversation.name.split(' ')[0]}, happy to help — what's going on?` },
    { fromMe: false, minutesAgo: 118, text: conversation.metaData.lastMessage },
    { fromMe: true, minutesAgo: 110, text: `On it — give me a moment.` },
  ];

  return script.map((row, index) => ({
    _id: `${conversation.chatId}-msg-${index + 1}`,
    chatId: conversation.chatId,
    senderId: row.fromMe ? DEMO_ACCOUNT_UUID : `demo-contact-${conversation.chatId}`,
    message: row.text,
    messageMimeType: 'sms',
    dlrStatus: row.fromMe ? 'delivered' : 'received',
    createdAt: new Date(now - row.minutesAgo * MIN_MS).toISOString(),
  }));
};

/** `/api/fax/to-number-list` — Inbox ▸ Fax's conversation list for the
 *  selected fax number. `faxMessageId` is read elsewhere as `"{from}_{to}"`
 *  split on the underscore, so it has to be built that way here too. */
export const demoFaxConversations = () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const seed = [
    { name: 'Rahul Deshmukh', status: 'Delivered', daysAgo: 1, inbound: true, pages: 3 },
    { name: 'Pooja Bansal', status: 'Sent', daysAgo: 3, inbound: false, pages: 1 },
  ];
  return seed.map((row, index) => {
    const phone = fakeCaller(410 + index);
    const from = row.inbound ? phone : DIDS[0];
    const to = row.inbound ? DIDS[0] : phone;
    return {
      _id: `demo-fax-${index + 1}`,
      faxMessageId: `${from}_${to}`,
      from,
      to,
      name: row.name,
      toContactName: row.name,
      contactPic: null,
      metaData: {
        direction: row.inbound ? 'inbound' : 'outbound',
        lastMessage: row.status,
        timestamp: new Date(now - row.daysAgo * DAY_MS).toISOString(),
        pageCount: row.pages,
      },
    };
  });
};

/** `/api/fax/list` — the open fax conversation's documents. */
export const demoFaxMessages = (faxMessageId: string) => {
  const conversation = demoFaxConversations().find((row) => row.faxMessageId === faxMessageId);
  if (!conversation) return [];

  return [
    {
      _id: `${conversation.faxMessageId}-fax-1`,
      faxId: `${conversation.faxMessageId}-fax-1`,
      direction: conversation.metaData.direction,
      fileName:
        conversation.metaData.direction === 'inbound'
          ? 'Signed_Agreement.pdf'
          : 'Invoice_Statement.pdf',
      pageCount: conversation.metaData.pageCount,
      status: conversation.metaData.lastMessage,
      createdAt: conversation.metaData.timestamp,
    },
  ];
};

/** `/api/tenant/department/list` — Directory ▸ Groups and Admin ▸ Departments. */
export const demoDepartmentRows = () => {
  const seed = [
    {
      name: 'Sales Team',
      extension: '7001',
      memberExtensions: ['1004', '1005', '1006'],
      managerExt: '1003',
      description: 'Inbound and outbound sales calls, routed to whoever is free first.',
    },
    {
      name: 'Customer Support',
      extension: '7002',
      memberExtensions: ['1004', '1006', '1007', '1008'],
      managerExt: '1003',
      description: 'Existing-customer tickets and calls — billing questions go to Finance instead.',
    },
    {
      name: 'Finance & Billing',
      extension: '7003',
      memberExtensions: ['1002', '1007'],
      managerExt: '1002',
      description: 'Invoices, refunds and payment method updates.',
    },
    {
      name: 'Engineering',
      extension: '7004',
      memberExtensions: ['1006', '1008'],
      managerExt: '1001',
      description: 'Internal extension for the on-call engineer, not customer-facing.',
    },
  ];
  return seed.map((dept, index) => {
    const manager = DEMO_AGENTS.find((row) => row.extension === dept.managerExt) as DemoAgent;
    return {
      uuid: `demo-dept-${index + 1}`,
      name: dept.name,
      extension: dept.extension,
      description: dept.description,
      manager: JSON.stringify({
        uuid: manager.uuid,
        user_uuid: manager.uuid,
        first_name: manager.first_name,
        last_name: manager.last_name,
        name: `${manager.first_name} ${manager.last_name}`,
      }),
      members: JSON.stringify(
        dept.memberExtensions.map((extension) => {
          const member = DEMO_AGENTS.find((row) => row.extension === extension) as DemoAgent;
          return {
            uuid: member.uuid,
            user_uuid: member.uuid,
            extension: member.extension,
            name: `${member.first_name} ${member.last_name}`,
          };
        }),
      ),
    };
  });
};

/** `/api/v1/meeting/listing` — Video ▸ Upcoming meetings. */
export const demoMeetingRows = () => {
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const seed = [
    { name: 'Q3 Renewals — Sync', hostExt: '1001', daysFromNow: 1, hour: 11, durationHrs: 1 },
    { name: 'Support Escalation Review', hostExt: '1003', daysFromNow: 2, hour: 15, durationHrs: 1 },
    { name: 'Bengaluru Team Standup', hostExt: '1006', daysFromNow: 3, hour: 9.5, durationHrs: 0.5 },
  ];
  return seed.map((row, index) => {
    const host = DEMO_AGENTS.find((agent) => agent.extension === row.hostExt) as DemoAgent;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const startAt = start.getTime() + row.daysFromNow * 24 * HOUR_MS + row.hour * HOUR_MS;
    const endAt = startAt + row.durationHrs * HOUR_MS;
    const members = DEMO_AGENTS.filter((agent) => agent.extension !== row.hostExt)
      .slice(0, 3)
      .map((agent) => ({
        type: 'MEMBER',
        invited: true,
        name: `${agent.first_name} ${agent.last_name}`,
        extension: agent.extension,
      }));
    return {
      meetingId: `demo-meeting-${index + 1}`,
      name: row.name,
      hostName: `${host.first_name} ${host.last_name}`,
      createdById: host.uuid,
      mode: 'scheduled',
      status: 'upcoming',
      timezone: 'Asia/Kolkata',
      startUtc: new Date(startAt).toISOString(),
      startTimeLocal: new Date(startAt).toISOString(),
      endTimeLocal: new Date(endAt).toISOString(),
      members,
    };
  });
};

export const demoCampaignRows = () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  return DEMO_CAMPAIGN_SEED.map((campaign) => {
    const pending = Math.max(
      0,
      campaign.assignedLeads -
        campaign.answeredLeads -
        campaign.totalCallNotAnswered -
        campaign.totalDnc,
    );
    const startDate = new Date(now - campaign.daysAgoStarted * DAY_MS);
    const endDate = new Date(startDate.getTime() + campaign.daySpan * DAY_MS);
    const createdAt = new Date(startDate.getTime() - DAY_MS);

    return {
      _id: campaign.uuid,
      uuid: campaign.uuid,
      name: campaign.name,
      campaign_name: campaign.name,
      campaignStatus: campaign.campaignStatus,
      status: campaign.campaignStatus,
      dialMethod: campaign.dialMethod,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      createdAt: createdAt.toISOString(),
      campaignAnalytics: {
        assignedLeads: campaign.assignedLeads,
        dialedLeads: campaign.answeredLeads + campaign.totalCallNotAnswered + campaign.totalDnc,
        answeredLeads: campaign.answeredLeads,
        totalCallNotAnswered: campaign.totalCallNotAnswered,
        totalDnc: campaign.totalDnc,
        pendingLeads: pending,
      },
      members: JSON.stringify(
        campaign.memberExtensions.map((extension) => {
          const member = DEMO_AGENTS.find((row) => row.extension === extension) as DemoAgent;
          return {
            user_uuid: member.uuid,
            extension: member.extension,
            first_name: member.first_name,
            last_name: member.last_name,
            name: `${member.first_name} ${member.last_name}`,
          };
        }),
      ),
    };
  });
};

/* ---------------------------------------------------------------------------
   The live half — presence and in-progress calls.

   These arrive over the socket rather than over HTTP, so demo mode cannot
   answer them the way it answers a request; they seed the socket context's
   initial state instead. That is also why they are built relative to "now":
   the Longest wait timer has to have something to count up from.
--------------------------------------------------------------------------- */

const OFFLINE_EXTENSIONS = ['1003'];
const DND_EXTENSIONS = ['1002'];
/* Every online, queue-carrying agent gets a live call so Performance ▸
   Agents' Queue/Campaign and Caller ID columns read as real activity
   instead of "--" for anyone not one of the original three. Arjun Mehta
   (1001) is left out on purpose - he's ADMIN and a member of no queue (see
   DEMO_QUEUES), so "covers 0 queues" elsewhere on his own row would
   contradict a fabricated live call here. Offline/DND agents are excluded
   for the same reason: those states exist to demo not being reachable, and
   giving them a call anyway would undercut that. */
const ON_CALL_EXTENSIONS = ['1004', '1005', '1006', '1007', '1008'];

export const demoUsersOnlineStatus = () =>
  DEMO_AGENTS.map((row) => ({
    userId: row.extension,
    user_uuid: row.uuid,
    extension: row.extension,
    online: !OFFLINE_EXTENSIONS.includes(row.extension),
    status: DND_EXTENSIONS.includes(row.extension) ? 'dnd' : 'available',
    onCall: ON_CALL_EXTENSIONS.includes(row.extension),
  }));

/** In-progress calls: every online, queue-carrying agent is talking to
 *  someone, plus two callers still waiting. */
export const demoLiveCalls = () => {
  const now = Date.now();
  /* The monitoring helpers read epoch seconds as readily as milliseconds. */
  const startedSecondsAgo = (value: number) => Math.round(now / 1000) - value;

  const talking = [
    { extension: '1004', queue: 'demo-queue-support', since: 214, caller: fakeCaller(101) },
    { extension: '1006', queue: 'demo-queue-sales', since: 96, caller: fakeCaller(102) },
    { extension: '1007', queue: 'demo-queue-billing', since: 431, caller: fakeCaller(103) },
    { extension: '1005', queue: 'demo-queue-onboarding', since: 152, caller: fakeCaller(106) },
    { extension: '1008', queue: 'demo-queue-retention', since: 68, caller: fakeCaller(107) },
  ];

  const waiting = [
    { queue: 'demo-queue-retention', since: 148, caller: fakeCaller(104) },
    { queue: 'demo-queue-support', since: 37, caller: fakeCaller(105) },
  ];

  return [
    ...talking.map((call, index) => {
      const queueInfo = DEMO_QUEUES.find((row) => row.uuid === call.queue);
      const agentInfo = DEMO_AGENTS.find((row) => row.extension === call.extension);
      const queueName = queueInfo?.name || 'Queue';
      return {
        uuid: `demo-live-answered-${index + 1}`,
        call_id: `demo-live-answered-${index + 1}`,
        status: 'answered',
        direction: 'inbound',
        forward_type: 'QUEUE',
        forward_value: call.queue,
        queue_uuid: call.queue,
        agent_extension: call.extension,
        called_number: call.extension,
        caller_number: call.caller,
        caller_id_number: call.caller,
        contact_name: CONTACT_NAMES[index],
        did_number: DIDS[index % DIDS.length],
        start_time: startedSecondsAgo(call.since),
        answered_time: startedSecondsAgo(call.since),
        /* Read by the wallboard's monitoring buttons (Listen/Whisper/Barge/
           Intercept/Hangup) to resolve which call leg to dial into or hang
           up — production's real switch payload carries the same field
           names (see socket-events-context's own b_leg_uuid handling), so
           this is what lets those buttons exercise their real code path
           against a call at all, in demo mode. */
        call_uuid: `demo-live-answered-${index + 1}-a-leg`,
        b_leg_uuid: `demo-live-answered-${index + 1}-b-leg`,
        /* Read by CallPathCell for the "Queue / Campaign" column and its
           call-path dialog — without these it falls back to "---". */
        current_context: `${queueName} Queue`,
        context_path: [
          'IVR: Main Menu',
          `Queue: ${queueName}`,
          `Agent: ${agentInfo ? `${agentInfo.first_name} ${agentInfo.last_name}` : call.extension}`,
        ],
      };
    }),
    ...waiting.map((call, index) => ({
      uuid: `demo-live-waiting-${index + 1}`,
      call_id: `demo-live-waiting-${index + 1}`,
      status: 'waiting',
      direction: 'inbound',
      forward_type: 'QUEUE',
      forward_value: call.queue,
      queue_uuid: call.queue,
      caller_number: call.caller,
      caller_id_number: call.caller,
      contact_name: CONTACT_NAMES[index + 5],
      did_number: DIDS[index % DIDS.length],
      start_time: startedSecondsAgo(call.since),
    })),
  ];
};

/** The per-queue live snapshot: SLA, today's volume and who is free. */
export const demoLiveQueueCalls = () => {
  const report = demoQueueReportRows();
  const presence = demoUsersOnlineStatus();

  return DEMO_QUEUES.map((queue) => {
    const stats = report.find((row) => row.uuid === queue.uuid)?.queue_stats;
    const available = queue.memberExtensions.filter((extension) =>
      presence.some((row) => row.userId === extension && row.online && !row.onCall),
    ).length;
    return {
      uuid: queue.uuid,
      name: queue.name,
      sla_within_20_sec_percent: queue.sla,
      total_calls: stats?.total_calls ?? 0,
      avg_wait_time_sec: stats?.avg_waiting_time ?? 0,
      available_count: available,
    };
  });
};

/** The wallboard's KPI band, funnel and per-agent utilization all read this
 *  one socket payload (`DASH_LIVE_CALLS_RESPONSE` → `campaignLiveCallsData`),
 *  which demo mode's socket has no server behind to ever send — so it seeds
 *  the socket context's initial state instead, same reasoning as the live
 *  call/queue data above. Volume figures reuse `demoCallStats()` so the KPI
 *  band and the call log agree on Total/Inbound/Outbound/Missed. */
export const demoCampaignLiveCallsData = () => {
  const stats = demoCallStats();
  return {
    data: {
      summary: {
        total_call: stats.total_calls,
        inbound_call: stats.inbound_calls,
        outbound_call: stats.outbound_calls,
        missed_call: stats.missed_calls,
        ivr_call: 22,
        abandoned_in_call_percent: 4,
        callback_count: 5,
        answered_within_20_sec: 41,
        service_level_percent: 82,
        avg_speed_answer: 14,
        avg_handle_time: 246,
        avg_talk_time: 198,
        avg_hold_time: 22,
        avg_wrap_time_sec: 26,
        max_wait_time: 187,
        longest_active: 431,
      },
      call_log_summary: {
        ringing_calls: 1,
        hold_calls: 1,
      },
    },
  };
};

/** The three-stage funnel on the wallboard (`CAMPAIGN_CALL_FLOW_FUNNEL`). */
export const demoCampaignCallFlowFunnel = () => ({
  entered_ivr_percent: 100,
  entered_ivr_count: 64,
  queued_percent: 78,
  queued_count: 50,
  assigned_agent_percent: 66,
  assigned_agent_count: 42,
});

/** "Active Campaigns" panel (`ACTIVE_CAMPAIGN_RESPONSE`). */
export const demoActiveCampaigns = () => [
  {
    uuid: 'demo-campaign-renewal',
    name: 'Festive Renewal Drive',
    dialed: 340,
    connected: 214,
    connectedPercent: 63,
    conversions: 58,
    failed: 22,
  },
  {
    uuid: 'demo-campaign-winback',
    name: 'Q3 Win-back',
    dialed: 180,
    connected: 96,
    connectedPercent: 53,
    conversions: 21,
    failed: 14,
  },
];

/** Per-agent utilization/AHT plus the Top/Bottom callers strip
 *  (`CAMPAIGN_AGENT_RESPONSE`) — extensions match `DEMO_AGENTS` so the same
 *  people shown "on call" in the roster also show real utilization here. */
export const demoCampaignAgents = () => {
  const rows = [
    { extension: '1001', total_calls: 4, utilization_percent: 12, avg_handle_time: 198.5 },
    { extension: '1002', total_calls: 9, utilization_percent: 33, avg_handle_time: 288.3 },
    { extension: '1003', total_calls: 7, utilization_percent: 21, avg_handle_time: 245.0 },
    { extension: '1004', total_calls: 22, utilization_percent: 78, avg_handle_time: 252.4 },
    { extension: '1005', total_calls: 15, utilization_percent: 54, avg_handle_time: 216.8 },
    { extension: '1006', total_calls: 19, utilization_percent: 68, avg_handle_time: 234.1 },
    { extension: '1007', total_calls: 12, utilization_percent: 41, avg_handle_time: 306.7 },
    { extension: '1008', total_calls: 17, utilization_percent: 61, avg_handle_time: 227.6 },
  ];
  const agents = rows.map((row) => {
    const agentInfo = DEMO_AGENTS.find((a) => a.extension === row.extension);
    return {
      agent_extension: row.extension,
      agent_name: agentInfo ? `${agentInfo.first_name} ${agentInfo.last_name}` : row.extension,
      total_calls: row.total_calls,
      utilization_percent: row.utilization_percent,
      avg_handle_time: row.avg_handle_time,
    };
  });
  const top = agents.reduce((a, b) => (b.total_calls > a.total_calls ? b : a));
  const bottom = agents.reduce((a, b) => (b.total_calls < a.total_calls ? b : a));
  return {
    agents,
    top_calls: { agent_name: top.agent_name, total_calls: top.total_calls },
    bottom_calls: { agent_name: bottom.agent_name, total_calls: bottom.total_calls },
  };
};

/* ---------------------------------------------------------------------------
   AI receptionist / sentiment — Performance ▸ Speech & Text and the Boards
   "AI Containment" tile.

   Both arrive over a socket round-trip (`MAIN_AI_LIVE_WALLBOARD` /
   `DASH_CAMPAIGN_AI_LIVE_CALL_RESPONSE`) that demo mode's socket has no
   server behind, so these seed the socket context's initial state instead —
   same reasoning as the live-call data above.
--------------------------------------------------------------------------- */

export const demoCampaignAiLiveCallData = () => ({
  data: {
    result: {
      avg_sentiment: 18.4,
      total_ai_calls: 46,
      ai_containment_percent: 64,
      total_ai_chats: 58,
      transferred_calls: 17,
      ai_receptionist_performance: {
        handled_ai_only: 29,
        avg_duration_sec: 96,
        lead_captured_counts: 14,
      },
      voice_vs_text_interactions: { voice_percent: 62, text_percent: 38 },
      sentiment_buckets: [
        { label: 'Positive', count: 31, percent: 55 },
        { label: 'Neutral', count: 18, percent: 32 },
        { label: 'Negative', count: 7, percent: 13 },
      ],
      intent_count: {
        billing: 19,
        support: 24,
        sales: 13,
        onboarding: 8,
        retention: 5,
      },
    },
  },
});

export const demoAiLiveWallboardData = () => ({
  data: {
    result: {
      agents: [
        {
          agent_name: 'Priya Sharma',
          today_sentiment_calls: 14,
          avg_sentiment: 22.5,
          sentiment_counts: { negative_percent: 7 },
        },
        {
          agent_name: 'Karan Malhotra',
          today_sentiment_calls: 11,
          avg_sentiment: 9.2,
          sentiment_counts: { negative_percent: 18 },
        },
        {
          agent_name: 'Ananya Iyer',
          today_sentiment_calls: 9,
          avg_sentiment: -4.5,
          sentiment_counts: { negative_percent: 31 },
        },
        {
          agent_name: 'Vikram Reddy',
          today_sentiment_calls: 12,
          avg_sentiment: 15.8,
          sentiment_counts: { negative_percent: 12 },
        },
      ],
    },
  },
});

/** `/api/v1/sms/logs` — Performance ▸ Reports ▸ "Media type". */
export const demoSmsLogRows = () => {
  const now = Date.now();
  const MINUTE_MS = 60 * 1000;
  const seed = [
    { minutesAgo: 40, direction: 'inbound', body: 'What are your support hours today?' },
    { minutesAgo: 65, direction: 'outbound', body: 'We are open 9 AM to 9 PM IST, Mon-Sat.' },
    { minutesAgo: 130, direction: 'inbound', body: 'Please share the invoice for this month.' },
    { minutesAgo: 150, direction: 'outbound', body: 'Invoice sent to your registered email.' },
    { minutesAgo: 260, direction: 'inbound', body: 'Can I reschedule tomorrow’s callback?' },
    { minutesAgo: 300, direction: 'outbound', body: 'Sure, moved to 4 PM IST. Confirmed?' },
    { minutesAgo: 420, direction: 'inbound', body: 'Yes that works, thank you.' },
    { minutesAgo: 600, direction: 'outbound', body: 'Reminder: your renewal is due in 5 days.' },
    { minutesAgo: 720, direction: 'inbound', body: 'Is there a discount for annual billing?' },
    { minutesAgo: 740, direction: 'outbound', body: '10% off on annual plans, applied at checkout.' },
  ];
  return seed.map((row, index) => {
    const sentAt = new Date(now - row.minutesAgo * MINUTE_MS).toISOString();
    return {
      uuid: `demo-sms-${index + 1}`,
      direction: row.direction,
      from: row.direction === 'inbound' ? fakeCaller(200 + index) : DIDS[index % DIDS.length],
      to: row.direction === 'inbound' ? DIDS[index % DIDS.length] : fakeCaller(200 + index),
      message: row.body,
      messageCost: 0.045,
      created_at: sentAt,
      start_stamp: sentAt,
    };
  });
};

/** `/api/contact/group/list` — Performance ▸ Reports ▸ "Contact lists". */
export const demoContactGroupRows = () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  return [
    {
      uuid: 'demo-group-diwali',
      groupName: 'Diwali Offer Leads',
      leadCount: 420,
      generatedBy: 'Arjun Mehta',
      createdAt: new Date(now - 18 * DAY_MS).toISOString(),
    },
    {
      uuid: 'demo-group-renewal',
      groupName: 'Mumbai Renewal List',
      leadCount: 230,
      generatedBy: 'Meera Nair',
      createdAt: new Date(now - 9 * DAY_MS).toISOString(),
    },
    {
      uuid: 'demo-group-webinar',
      groupName: 'Webinar Signups - Aug',
      leadCount: 96,
      generatedBy: 'Priya Sharma',
      createdAt: new Date(now - 4 * DAY_MS).toISOString(),
    },
    {
      uuid: 'demo-group-bangalore',
      groupName: 'Bengaluru Enterprise Leads',
      leadCount: 158,
      generatedBy: 'Sanjay Kapoor',
      createdAt: new Date(now - 26 * DAY_MS).toISOString(),
    },
  ];
};

/** `/api/calendar/event-task/list` — Performance ▸ Callbacks ▸ "Scheduled tasks". */
export const demoCalendarTaskRows = () => {
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  /* Spread across the month rather than bunched into the next two days, so
     the calendar grid has something on most weeks. `category` drives the
     colour each entry gets — EVENT blue, TASK green, MEETING violet. */
  const seed = [
    { name: 'Callback - Rahul Deshmukh (Sales)', dueInHours: -3, source: 'Queue', status: 'PENDING', category: 'TASK' },
    { name: 'Follow up - Sneha Joshi (Billing)', dueInHours: 4, source: 'Manual', status: 'PENDING', category: 'TASK' },
    { name: 'Renewal call - Aditya Kumar', dueInHours: -18, source: 'Campaign', status: 'PENDING', category: 'TASK' },
    { name: 'Quarterly Business Review', dueInHours: 30, source: 'Manual', status: 'PENDING', category: 'MEETING' },
    { name: 'Demo follow-up - Rohan Chatterjee', dueInHours: 54, source: 'Manual', status: 'PENDING', category: 'EVENT' },
    { name: 'Bengaluru Team Standup', dueInHours: 78, source: 'Manual', status: 'PENDING', category: 'MEETING' },
    { name: 'Callback - Kavya Pillai (Onboarding)', dueInHours: 102, source: 'Queue', status: 'PENDING', category: 'TASK' },
    { name: 'Product Roadmap Review', dueInHours: 150, source: 'Manual', status: 'PENDING', category: 'MEETING' },
    { name: 'Support Escalation Sync', dueInHours: 198, source: 'Queue', status: 'PENDING', category: 'EVENT' },
    { name: 'Renewal Pipeline Check', dueInHours: 246, source: 'Campaign', status: 'PENDING', category: 'TASK' },
    { name: 'Partner Onboarding Call', dueInHours: 318, source: 'Manual', status: 'PENDING', category: 'MEETING' },
    { name: 'Monthly Performance Review', dueInHours: 390, source: 'Manual', status: 'PENDING', category: 'EVENT' },
  ];
  return seed.map((task, index) => {
    /* Offsets are whole hours from `now`, so the wall clock decides what
       time of day these land on. Once it drifts past ~23:00 the +1h end
       crosses midnight, and a one-hour meeting becomes a two-day booking:
       the month grid then draws it as a bar across two cells, pushes the
       real entry behind a "1 more", and renders it through the multi-day
       path instead of the single-day preview template.

       Keeping the day the offset chose and pulling only the clock into
       working hours fixes it without changing which day anything is on. */
    const startsAt = new Date(now + task.dueInHours * HOUR_MS);
    const hour = startsAt.getHours();
    if (hour >= 21) startsAt.setHours(20, 0, 0, 0);
    else if (hour < 7) startsAt.setHours(9, 0, 0, 0);
    const startAt = startsAt.getTime();
    return {
      uuid: `demo-task-${index + 1}`,
      name: task.name,
      source: task.source,
      status: task.status,
      category: task.category,
      createdAt: new Date(now - (Math.abs(task.dueInHours) + 20) * HOUR_MS).toISOString(),
      startTime: new Date(startAt).toISOString(),
      /* An end an hour on, so a preview can show a span rather than a
         zero-length entry. */
      endTime: new Date(startAt + HOUR_MS).toISOString(),
    };
  });
};

/** `/api/tenant/report/call-list` with `type: 'voicemail'` — Callbacks ▸ "Queue voicemail". */
export const demoVoicemailRows = () => {
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const seed = [
    { hoursAgo: 1.5, lengthSec: 38 },
    { hoursAgo: 5, lengthSec: 52 },
    { hoursAgo: 22, lengthSec: 21 },
    { hoursAgo: 30, lengthSec: 67 },
  ];
  return seed.map((row, index) => ({
    uuid: `demo-vm-${index + 1}`,
    start_stamp: new Date(now - row.hoursAgo * HOUR_MS).toISOString(),
    caller_id_number: fakeCaller(300 + index),
    via_did: DIDS[index % DIDS.length],
    billsectotal: row.lengthSec,
    billsec: row.lengthSec,
    is_voicemail: 1,
    recording_file: `demo-voicemail-${index + 1}.mp3`,
  }));
};
