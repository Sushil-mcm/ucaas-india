/* ============================================================================
 * DEMO DATA — placeholder meeting content, for design review only.
 *
 * The video console shows a depth of meeting intelligence the platform does
 * not expose yet: live captions with translation, AI recaps with action items
 * and chapters, poll results, raised-hand queues, per-participant network
 * quality. Until those services exist this module invents them so the console
 * can be judged visually.
 *
 * Same rules as the phone console's `demo-data.ts`, so demo content can never
 * be mistaken for a real meeting:
 *   1. Everything here is derived from a hash of the meeting id — stable
 *      between renders, but obviously synthetic.
 *   2. Every surface that renders it also renders a "Demo" chip next to it.
 *   3. Real data always wins. Demo values only fill a gap the API left empty.
 *
 * TO TURN IT ALL OFF: set DEMO_ENABLED to false. The panes then show honest
 * empty states instead, and nothing else needs to change.
 * ==========================================================================*/

export const DEMO_ENABLED = true;

/** Stable, boring hash so the same meeting always gets the same demo shape. */
const hash = (value: string) => {
  let h = 0;
  const s = String(value || 'unknown');
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const pick = <T>(list: T[], seed: number, offset = 0) => list[(seed + offset) % list.length];

/* ------------------------------------------------------------------ types -- */

export type ParticipantRole = 'host' | 'cohost' | 'presenter' | 'attendee';
export type NetQuality = 'good' | 'weak' | 'bad';

export type VideoParticipant = {
  id: string;
  name: string;
  title: string;
  tone: string;
  role: ParticipantRole;
  muted: boolean;
  camOff: boolean;
  hand: boolean;
  sharing: boolean;
  speaking: boolean;
  net: NetQuality;
  /** outside the org — surfaced because who can hear you is a security fact */
  external: boolean;
  self: boolean;
  /** waiting in the lobby rather than admitted to the meeting */
  waiting: boolean;
};

export type MeetingState = 'upcoming' | 'live' | 'past';

export type VideoMeeting = {
  id: string;
  title: string;
  host: string;
  /** minutes from now — negative means it already started */
  startsInMins: number;
  durationMins: number;
  state: MeetingState;
  recurring: boolean;
  recorded: boolean;
  hasRecap: boolean;
  /** personal meeting room rather than a one-off scheduled id */
  pmi: boolean;
  external: boolean;
  agenda: string[];
  roomId: string;
  passcode: string;
  participants: VideoParticipant[];
  /** true when this row came from this module rather than the platform */
  isDemo: boolean;
};

export type ChatMessage = {
  id: string;
  who: string;
  tone: string;
  at: string;
  text: string;
  /** machine translation of `text`, when the viewer's language differs */
  translated?: string;
  toEveryone: boolean;
};

export type CaptionTurn = {
  id: string;
  who: string;
  tone: string;
  at: string;
  text: string;
  translated?: string;
};

export type ActionItem = {
  id: string;
  text: string;
  owner: string;
  due: string;
  done: boolean;
  /** transcript timestamp the item was inferred from */
  cite: string;
};

export type Chapter = { at: string; pct: number; title: string; summary: string };

export type Poll = {
  question: string;
  responded: number;
  total: number;
  options: { label: string; votes: number }[];
};

/* ------------------------------------------------------------- avatar tone -- */

const TONES = [
  'linear-gradient(150deg,#3b6fe0,#7c3aed)',
  'linear-gradient(150deg,#0d9488,#0e7490)',
  'linear-gradient(150deg,#c2670a,#d97706)',
  'linear-gradient(150deg,#7c3aed,#a855f7)',
  'linear-gradient(150deg,#0e7490,#2563eb)',
  'linear-gradient(150deg,#be185d,#7c3aed)',
  'linear-gradient(150deg,#15803d,#0d9488)',
  'linear-gradient(150deg,#4338ca,#3b6fe0)',
];

export const toneFor = (key: string) => pick(TONES, hash(key));

export const initialsOf = (name: string) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

/* ------------------------------------------------------------------ people -- */

const PEOPLE: [string, string, ParticipantRole, boolean][] = [
  ['Priya Raman', 'VP Customer Success', 'host', false],
  ['Daniel Okafor', 'Solutions Engineer', 'cohost', false],
  ['Mei Lin Chen', 'Product Manager', 'presenter', false],
  ['Alex Whitfield', 'Procurement — Northwind', 'attendee', true],
  ['Sofia Marchetti', 'Account Director', 'attendee', false],
  ['Tom Hargreaves', 'IT Security — Northwind', 'attendee', true],
  ['Aisha Bello', 'Implementation Lead', 'attendee', false],
  ['Ravi Deshmukh', 'Support Engineer', 'attendee', false],
  ['Hannah Brooks', 'Finance Partner', 'attendee', false],
  ['Marcus Silva', 'Network Architect', 'attendee', false],
];

const buildParticipants = (seed: number, count: number, selfName: string): VideoParticipant[] => {
  const roster = PEOPLE.slice(0, Math.max(2, Math.min(count, PEOPLE.length)));

  const others = roster.map(([name, title, role, external], i) => ({
    id: `p-${seed}-${i}`,
    name,
    title,
    tone: toneFor(name),
    role,
    muted: (seed + i) % 3 !== 0,
    camOff: (seed + i) % 4 === 0,
    hand: (seed + i) % 7 === 3,
    sharing: false,
    speaking: i === seed % Math.max(1, roster.length),
    net: ((seed + i) % 9 === 0 ? 'bad' : (seed + i) % 5 === 0 ? 'weak' : 'good') as NetQuality,
    external,
    self: false,
    waiting: false,
  }));

  // "You" always sits first — the self tile is the one people look for.
  const self: VideoParticipant = {
    id: `p-${seed}-self`,
    name: selfName,
    title: 'You',
    tone: toneFor(selfName),
    role: 'host',
    muted: true,
    camOff: false,
    hand: false,
    sharing: false,
    speaking: false,
    net: 'good',
    external: false,
    self: true,
    waiting: false,
  };

  // one person parked in the lobby, so the waiting-room control has something
  // real to act on
  if (others.length > 3) others[3] = { ...others[3], waiting: true, speaking: false };

  return [self, ...others];
};

/* ---------------------------------------------------------------- meetings -- */

const TITLES: [string, string[]][] = [
  [
    'Northwind — Platform rollout review',
    ['Migration status by site', 'Number porting window', 'Security sign-off', 'Go-live date'],
  ],
  [
    'Weekly CS + Product sync',
    ['Escalation review', 'Roadmap changes', 'Churn-risk accounts', 'Actions from last week'],
  ],
  ['Q3 pipeline review', ['Committed deals', 'Slipped opportunities', 'Forecast adjustment']],
  [
    'Support handover — EMEA to APAC',
    ['Open P1 tickets', 'Overnight watchlist', 'On-call contacts'],
  ],
  [
    'Design critique — Unified console',
    ['Phone console walkthrough', 'Video console concepts', 'Open questions'],
  ],
  [
    'Onboarding — Meridian Logistics',
    ['Account setup', 'User provisioning', 'Training schedule', 'Success criteria'],
  ],
  [
    'Vendor QBR — carrier performance',
    ['ASR and ACD trends', 'Incident review', 'Commercial terms'],
  ],
  ['All-hands — engineering update', ['Release recap', 'Reliability metrics', 'What ships next']],
];

const buildMeeting = (
  id: string,
  state: MeetingState,
  startsInMins: number,
  selfName: string,
): VideoMeeting => {
  const seed = hash(id);
  const [title, agenda] = pick(TITLES, seed);
  const size = 4 + (seed % 6);

  return {
    id,
    title,
    host: state === 'past' ? pick(PEOPLE, seed, 1)[0] : selfName,
    startsInMins,
    durationMins: pick([30, 45, 60], seed),
    state,
    recurring: seed % 3 === 0,
    recorded: state !== 'upcoming' && seed % 2 === 0,
    hasRecap: state === 'past',
    pmi: seed % 5 === 0,
    external: seed % 2 === 0,
    agenda,
    roomId: `${100 + (seed % 900)} ${100 + ((seed >> 3) % 900)} ${1000 + ((seed >> 6) % 9000)}`,
    passcode: String(100000 + (seed % 900000)),
    participants: buildParticipants(seed, size, selfName),
    isDemo: true,
  };
};

/**
 * The demo meeting book. Offsets are minutes from "now" so the list always
 * looks plausible whenever it is opened — one live, a few ahead, some behind.
 */
export const demoMeetings = (selfName = 'You'): VideoMeeting[] => [
  buildMeeting('demo-live-1', 'live', -12, selfName),
  buildMeeting('demo-up-1', 'upcoming', 14, selfName),
  buildMeeting('demo-up-2', 'upcoming', 75, selfName),
  buildMeeting('demo-up-3', 'upcoming', 190, selfName),
  buildMeeting('demo-up-4', 'upcoming', 1_450, selfName),
  buildMeeting('demo-past-1', 'past', -95, selfName),
  buildMeeting('demo-past-2', 'past', -1_390, selfName),
  buildMeeting('demo-past-3', 'past', -2_870, selfName),
];

/* ------------------------------------------------------------ conversation -- */

export const demoChat = (meetingId: string): ChatMessage[] => {
  const seed = hash(meetingId);
  return [
    {
      id: 'c1',
      who: 'Daniel Okafor',
      tone: toneFor('Daniel Okafor'),
      at: '00:04',
      text: 'Sharing the migration tracker now — shout if the text is too small.',
      toEveryone: true,
    },
    {
      id: 'c2',
      who: 'Alex Whitfield',
      tone: toneFor('Alex Whitfield'),
      at: '00:06',
      text: 'Können wir die Portierung auf nächste Woche verschieben?',
      translated: 'Can we move the porting window to next week?',
      toEveryone: true,
    },
    {
      id: 'c3',
      who: 'Priya Raman',
      tone: toneFor('Priya Raman'),
      at: '00:07',
      text: 'Good question — Mei has the carrier confirmation, she will cover it next.',
      toEveryone: true,
    },
    {
      id: 'c4',
      who: 'Tom Hargreaves',
      tone: toneFor('Tom Hargreaves'),
      at: `00:${9 + (seed % 3)}`,
      text: 'Security sign-off is with our CISO. I will have an answer by Thursday.',
      toEveryone: true,
    },
    {
      id: 'c5',
      who: 'Aisha Bello',
      tone: toneFor('Aisha Bello'),
      at: '00:11',
      text: 'Dropping the runbook link in here for anyone who joined late.',
      toEveryone: false,
    },
  ];
};

export const demoCaptions = (meetingId: string): CaptionTurn[] => {
  const seed = hash(meetingId);
  return [
    {
      id: 't1',
      who: 'Priya Raman',
      tone: toneFor('Priya Raman'),
      at: '00:08:12',
      text: 'So the three sites in Hamburg are done, and Rotterdam finishes on Friday.',
    },
    {
      id: 't2',
      who: 'Alex Whitfield',
      tone: toneFor('Alex Whitfield'),
      at: '00:08:31',
      text: 'Und die Nummernportierung? Das ist mein groesstes Risiko gerade.',
      translated: 'And the number porting? That is my biggest risk right now.',
    },
    {
      id: 't3',
      who: 'Mei Lin Chen',
      tone: toneFor('Mei Lin Chen'),
      at: '00:08:47',
      text: 'The carrier confirmed a Saturday 02:00 window. Nothing moves during business hours.',
    },
    {
      id: 't4',
      who: 'Tom Hargreaves',
      tone: toneFor('Tom Hargreaves'),
      at: `00:09:0${seed % 9}`,
      text: 'I need the penetration test summary before I can sign anything off.',
    },
    {
      id: 't5',
      who: 'Daniel Okafor',
      tone: toneFor('Daniel Okafor'),
      at: '00:09:26',
      text: 'That report went out this morning. I will forward it right after this call.',
    },
  ];
};

export const demoRecap = (meetingId: string) => {
  const seed = hash(meetingId);
  return {
    summary:
      'The rollout is on track for the three completed sites, with Rotterdam closing on Friday. ' +
      'Number porting is the customer’s main concern; the carrier has confirmed a Saturday ' +
      '02:00 window so no business hours are affected. Security sign-off is the one open blocker — ' +
      'Northwind’s CISO needs the penetration test summary, which was sent this morning but ' +
      'has not been acknowledged.',
    decisions: [
      'Porting window fixed to Saturday 02:00–05:00 CET.',
      'Go-live date held at the 14th, pending security sign-off.',
      'Weekly check-in continues until all sites are cut over.',
    ],
    risks:
      seed % 2 === 0
        ? 'Security sign-off has slipped twice. If the CISO does not respond by Thursday the go-live date is at risk.'
        : 'Two sites still have unconfirmed on-site contacts for cutover night.',
    sentiment: 68,
    talkRatio: 41,
    engagement: 82,
  };
};

export const demoActions = (meetingId: string): ActionItem[] => {
  const seed = hash(meetingId);
  return [
    {
      id: 'a1',
      text: 'Forward the penetration test summary to Northwind’s CISO',
      owner: 'Daniel Okafor',
      due: 'Today',
      done: seed % 2 === 0,
      cite: '00:09:26',
    },
    {
      id: 'a2',
      text: 'Confirm on-site contacts for the two remaining cutover sites',
      owner: 'Aisha Bello',
      due: 'Wed',
      done: false,
      cite: '00:14:03',
    },
    {
      id: 'a3',
      text: 'Send the revised porting schedule to all site leads',
      owner: 'Mei Lin Chen',
      due: 'Thu',
      done: false,
      cite: '00:08:47',
    },
    {
      id: 'a4',
      text: 'Book the go-live war room for the 14th',
      owner: 'Priya Raman',
      due: 'Fri',
      done: false,
      cite: '00:21:40',
    },
  ];
};

export const demoChapters = (meetingId: string): Chapter[] => {
  const seed = hash(meetingId);
  return [
    {
      at: '00:00',
      pct: 0,
      title: 'Welcome and agenda',
      summary: 'Priya sets the four agenda items.',
    },
    {
      at: '02:40',
      pct: 9,
      title: 'Migration status by site',
      summary: 'Hamburg complete, Rotterdam closing Friday.',
    },
    {
      at: '08:12',
      pct: 27,
      title: 'Number porting window',
      summary: 'Carrier confirms Saturday 02:00 CET.',
    },
    {
      at: '14:03',
      pct: 47,
      title: 'Security sign-off',
      summary: 'Blocked on the CISO — flagged as the main risk.',
    },
    {
      at: `21:${40 + (seed % 15)}`,
      pct: 72,
      title: 'Go-live planning',
      summary: 'Date held at the 14th; war room to be booked.',
    },
    {
      at: '27:15',
      pct: 91,
      title: 'Actions and close',
      summary: 'Four owners confirmed before the call ended.',
    },
  ];
};

export const demoPoll = (meetingId: string): Poll => {
  const seed = hash(meetingId);
  const a = 4 + (seed % 5);
  const b = 2 + (seed % 4);
  const c = 1 + (seed % 3);
  return {
    question: 'Are you comfortable holding the go-live date at the 14th?',
    responded: a + b + c,
    total: a + b + c + 2,
    options: [
      { label: 'Yes', votes: a },
      { label: 'With conditions', votes: b },
      { label: 'No', votes: c },
    ],
  };
};

export const demoQuestions = (meetingId: string) => {
  const seed = hash(meetingId);
  return [
    {
      id: 'q1',
      who: 'Hannah Brooks',
      text: 'Does the porting window affect billing cut-off?',
      votes: 6 + (seed % 5),
      answered: false,
    },
    {
      id: 'q2',
      who: 'Marcus Silva',
      text: 'Which SBC handles the Rotterdam traffic after cutover?',
      votes: 3 + (seed % 4),
      answered: true,
    },
    {
      id: 'q3',
      who: 'Ravi Deshmukh',
      text: 'Is there a rollback plan if porting fails overnight?',
      votes: 2 + (seed % 3),
      answered: false,
    },
  ];
};
