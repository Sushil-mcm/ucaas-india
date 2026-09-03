/* ============================================================================
 * DEMO DATA — placeholder customer intelligence, for design review only.
 *
 * The artifact's panel shows a depth of customer history the platform does not
 * expose yet: written call recaps, action items with owners, CSAT and auto-QA
 * scores, account tier and tenure, a per-interaction mood timeline. Until those
 * services exist this module invents them so the panes can be judged visually.
 *
 * Rules this module follows, so demo content can never be mistaken for real
 * customer data:
 *   1. Everything here is derived from a hash of the phone number — stable per
 *      number between renders, but obviously synthetic.
 *   2. Every pane that renders it also renders a "Demo" chip next to it.
 *   3. Real data always wins. Demo values only fill a gap the API left empty.
 *
 * TO TURN IT ALL OFF: set DEMO_ENABLED to false. The panes then show honest
 * empty states instead, and nothing else needs to change.
 * ==========================================================================*/

export const DEMO_ENABLED = true;

/** Stable, boring hash so the same number always gets the same demo profile. */
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

const TIERS = ['Retail — Standard', 'Retail — Plus', 'Business — Pro', 'Enterprise'];
const CITIES = [
  ['Manchester, UK', 'BST (UTC+1)'],
  ['Mumbai, IN', 'IST (UTC+5:30)'],
  ['Austin, US', 'CDT (UTC-5)'],
  ['Dublin, IE', 'IST (UTC+1)'],
];
const QUEUES = ['Retail_Billing_L1', 'Retail_Technical_L1', 'VIP_Concierge', 'Support_L2'];
const LANGS = ['English', 'English', 'Hindi', 'Spanish'];
const AGENTS = ['Sofia Petrova', 'Umar Ansari', 'Helen Chase', 'Daniel Moore', 'Meera Kapoor'];

export type DemoProfile = {
  account: string;
  tier: string;
  since: string;
  city: string;
  tz: string;
  balance: string;
  openTickets: number;
  lifetimeCalls: number;
  language: string;
  queue: string;
  flow: string;
  contractEnds: string;
  priority: number;
};

export const demoProfile = (number: string): DemoProfile => {
  const seed = hash(number);
  const [city, tz] = pick(CITIES, seed);
  const years = 1 + (seed % 7);
  const months = seed % 12;
  return {
    account: `MCM-${String(1000 + (seed % 8999))}-${String(1000 + ((seed >> 3) % 8999))}`,
    tier: pick(TIERS, seed),
    since: `${years} yr ${months} mo`,
    city,
    tz,
    balance: `$${(40 + (seed % 260)).toFixed(2)}`,
    openTickets: seed % 3,
    lifetimeCalls: 3 + (seed % 22),
    language: pick(LANGS, seed, 1),
    queue: pick(QUEUES, seed, 2),
    flow: 'MCM_Main_IVR v14',
    contractEnds: pick(['14 Oct', '02 Dec', '28 Feb', '19 Jun'], seed, 3),
    priority: 1 + (seed % 3),
  };
};

export type DemoInteraction = {
  id: string;
  date: string;
  duration: string;
  direction: 'Inbound' | 'Outbound';
  queue: string;
  agent: string;
  mood: 'pos' | 'neg' | 'neu' | 'acc';
  title: string;
  code: string;
  summary: string;
  items: string[];
};

const TOPICS: [string, string, DemoInteraction['mood'], string, string[]][] = [
  [
    'Duplicate direct debit not refunded',
    'Billing — Dispute',
    'neg',
    'Customer chased a duplicate collection raised the week before. No finance decision was found and a 24-hour callback was promised. Sentiment fell across the call.',
    ['Callback within 24h — NOT COMPLETED', 'Escalate to finance — completed'],
  ],
  [
    'Payment dispute raised',
    'Billing — Dispute',
    'neg',
    'Customer reported being charged twice for the same month. A dispute reference was logged and a 3 working day review was promised.',
    ['Finance review — OPEN 7 days'],
  ],
  [
    'Switched to paperless billing',
    'Billing — Complete',
    'pos',
    'Paperless billing enabled during the call. Customer confirmed the change and thanked the agent for the speed.',
    [],
  ],
  [
    'Annual account review',
    'AM — Review',
    'acc',
    'Reviewed tariff and usage. Customer was happy and confirmed they intended to renew.',
    ['Send tariff comparison — completed'],
  ],
  [
    'Broadband speed follow-up',
    'Technical — Resolved',
    'pos',
    'Line test run on the call, profile reset applied. Speeds confirmed back to normal before hanging up.',
    ['Monitor line for 48h — completed'],
  ],
];

/* One script per TOPICS entry, same index, so a call's demo transcript
   matches the story its demo summary/recap/history already tell. */
const TRANSCRIPT_SCRIPTS: [speaker: 'agent' | 'customer', text: string][][] = [
  [
    ['agent', "Thanks for calling — you're through to Billing. How can I help today?"],
    ['customer', "Hi, I'm calling again about that duplicate direct debit. It's still not back in my account."],
    ['agent', 'Sorry about that — let me pull up the case from your last call.'],
    ['agent', 'I can see finance was meant to review it within 24 hours, and that review was never logged.'],
    ['customer', "This is the second time I've had to chase this myself."],
    ['agent', "Completely understood. I'm escalating this to finance directly and will personally follow up within 24 hours."],
    ['customer', 'Okay. Thank you for actually looking into it this time.'],
  ],
  [
    ['agent', 'Hi, thanks for holding — how can I help?'],
    ['customer', "I've been charged twice for this month's plan."],
    ['agent', "Let me check that... you're right, there are two identical charges three days apart."],
    ['agent', "I'm logging a dispute now — reference will be sent by SMS."],
    ['customer', 'How long will the refund take?'],
    ['agent', 'Finance review takes up to 3 working days, then the refund is automatic.'],
    ['customer', "Alright, I'll wait to hear back."],
  ],
  [
    ['agent', 'Hi there, what can I do for you today?'],
    ['customer', "I keep getting paper bills — can you switch me to paperless?"],
    ['agent', "Of course, one moment... done. You'll get an email confirmation shortly."],
    ['customer', "That was quick, thank you!"],
    ['agent', 'Happy to help — is there anything else?'],
    ['customer', 'No, that was everything.'],
  ],
  [
    ['agent', "Hi, I'm calling for your annual account review — is now a good time?"],
    ['customer', 'Sure, go ahead.'],
    ['agent', "Looking at your usage, you're on a plan that still fits well. Any concerns on your end?"],
    ['customer', 'None really, been happy with the service.'],
    ['agent', "Great to hear. I'll send over a tariff comparison in case anything changes."],
    ['customer', "Sounds good, I'll likely renew."],
  ],
  [
    ['agent', 'Hi, I understand you\'ve been having speed issues?'],
    ['customer', "Yeah, it's been dropping to a crawl most evenings."],
    ['agent', "Running a line test now... I can see some noise on the line. Resetting your profile."],
    ['customer', 'Okay, let me know when to test again.'],
    ['agent', "That's done — can you run a speed test now?"],
    ['customer', "Yep, back to normal. Thanks for sorting it."],
    ['agent', "I'll keep an eye on the line for the next 48 hours just in case."],
  ],
];

export type DemoTurn = {
  id: string;
  speaker: 'agent' | 'customer';
  who: string;
  time: string;
  text: string;
  isSummary: false;
};

/** A short, plausible transcript for a call with no real one stored — themed
    to match demoInteractions/demoRecap for the same number. */
export const demoTranscript = (number: string, customerName = 'Customer'): DemoTurn[] => {
  const seed = hash(number);
  const script = pick(TRANSCRIPT_SCRIPTS, seed);
  const agentName = pick(AGENTS, seed, 2);
  const start = new Date(Date.now() - script.length * 32_000);
  return script.map(([speaker, text], i) => ({
    id: `demo-turn-${i}`,
    speaker,
    who: speaker === 'agent' ? agentName : customerName,
    time: new Date(start.getTime() + i * 32_000).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }),
    text,
    isSummary: false,
  }));
};

export const demoInteractions = (number: string, count = 4): DemoInteraction[] => {
  const seed = hash(number);
  const profile = demoProfile(number);
  return Array.from({ length: count }).map((_, i) => {
    const [title, code, mood, summary, items] = TOPICS[(seed + i) % TOPICS.length];
    const daysAgo = (i + 1) * (2 + (seed % 4));
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return {
      id: `demo-${i}`,
      date: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
      duration: `${String(2 + ((seed + i) % 18)).padStart(2, '0')}:${String((seed + i * 7) % 60).padStart(2, '0')}`,
      direction: (seed + i) % 3 === 0 ? 'Outbound' : 'Inbound',
      queue: profile.queue,
      agent: pick(AGENTS, seed, i),
      mood,
      title,
      code,
      summary,
      items,
    };
  });
};

export type DemoRecap = {
  reason: string;
  happened: string;
  outcome: { label: string; tone: 'pos' | 'warn' | 'neg' }[];
  outcomeNote: string;
  actions: { text: string; owner: string }[];
  stats: { k: string; v: string; tone?: 'pos' | 'neg' | 'warn' }[];
};

export const demoRecap = (number: string): DemoRecap => {
  const seed = hash(number);
  const profile = demoProfile(number);
  const interaction = demoInteractions(number, 1)[0];
  return {
    reason: `${interaction.title}. ${profile.openTickets ? `${profile.openTickets} case(s) still open on this account.` : 'No open cases on the account.'}`,
    happened:
      'Customer opened by restating the issue from the previous call. Identity verification passed. The agent confirmed the fault sat with us rather than the customer, and committed to a specific fix with a date instead of a general promise to look into it.',
    outcome: [
      { label: 'Resolved in call', tone: 'pos' },
      { label: 'Follow-up required', tone: 'warn' },
    ],
    outcomeNote:
      'Root cause identified and actioned live. Recovery is conditional on the fix actually landing within the promised window.',
    actions: [
      { text: 'Confirm the refund reached the account', owner: 'You · 3 days' },
      { text: 'Apply one month credit for the repeat failure', owner: 'Billing · 24h' },
      {
        text: `Flag contract end ${profile.contractEnds} for review`,
        owner: pick(AGENTS, seed, 4),
      },
    ],
    stats: [
      {
        k: 'Sentiment',
        v: `−${40 + (seed % 40)} → −${10 + (seed % 15)} · recovering`,
        tone: 'neg',
      },
      { k: 'Inferred CSAT', v: `${(2.8 + (seed % 20) / 10).toFixed(1)} / 5`, tone: 'warn' },
      { k: 'Talk ratio', v: `You ${35 + (seed % 15)}% · Customer ${45 + (seed % 10)}%` },
      { k: 'Auto-QA score', v: `${78 + (seed % 20)} / 100` },
      { k: 'Retention', v: 'Save play executed', tone: 'pos' },
    ],
  };
};

export type DemoNote = {
  id: string;
  who: string;
  initials: string;
  when: string;
  body: string;
  pinned?: boolean;
  ai?: boolean;
  src?: string;
};

export const demoNotes = (number: string): DemoNote[] => {
  const seed = hash(number);
  const agent = pick(AGENTS, seed, 2);
  return [
    {
      id: 'demo-note-1',
      who: 'AI Copilot',
      initials: 'AI',
      when: 'Auto-written from the last call recap',
      ai: true,
      body: 'Second contact about the same billing issue. The customer was told finance would review within 3 days on the previous call; no review was logged and no callback was made.',
      src: 'Generated from call recap',
    },
    {
      id: 'demo-note-2',
      who: agent,
      initials: agent
        .split(' ')
        .map((p) => p[0])
        .join(''),
      when: 'Pinned by the team lead',
      pinned: true,
      body: 'ESCALATION FLAG. Long-standing customer and the second month this has happened. Route straight to Billing rather than back through the IVR.',
    },
  ];
};
