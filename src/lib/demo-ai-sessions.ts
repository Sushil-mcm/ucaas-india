/**
 * Sessions for the AI Agents > Sessions screen in demo mode.
 *
 * The screen reads `/api/ai/agent/session/list` and derives everything else
 * from the rows: seven stat cards, the channel and outcome filters, the date
 * range, the search box and the CSV export. With no rows it showed zeros
 * across the board and "No sessions found", so none of it could be looked at.
 *
 * Dates are generated relative to now rather than fixed, because the screen
 * opens on "Last 7 days" - a fixed date would fall out of range and the table
 * would be empty again a week later. Spread across the last few days so the
 * range filter visibly changes the counts.
 *
 * Everything here is invented, and Indian throughout to match the rest of the
 * demo data. No transcript, caller, number or cost figure below describes
 * anything that happened.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

interface SessionSeed {
  channel: 'call' | 'chat';
  agentName: string;
  name?: string;
  phone?: string;
  email?: string;
  callerId?: string;
  hoursAgo: number;
  durationMinutes: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  outcome: 'resolved' | 'handoff' | 'callback' | 'active';
  intents: string[];
  summary: string;
  costUSD: number;
}

const SEEDS: SessionSeed[] = [
  {
    channel: 'call',
    agentName: 'Mumbai Front Desk',
    name: 'Ananya Iyer',
    callerId: '+91 98200 41276',
    hoursAgo: 2,
    durationMinutes: 3.4,
    sentiment: 'positive',
    outcome: 'resolved',
    intents: ['Billing question'],
    summary: 'Caller asked why their invoice was higher this month and accepted the explanation.',
    costUSD: 0.14,
  },
  {
    channel: 'chat',
    agentName: 'UCaaS Support bot',
    name: 'Rohit Deshpande',
    email: 'rohit.deshpande@example.com',
    hoursAgo: 5,
    durationMinutes: 6.2,
    sentiment: 'neutral',
    outcome: 'handoff',
    intents: ['Number porting'],
    summary: 'Asked how long porting takes; passed to a person once account details were needed.',
    costUSD: 0.09,
  },
  {
    channel: 'call',
    agentName: 'Mumbai Front Desk',
    name: 'Kavya Menon',
    callerId: '+91 99304 88512',
    hoursAgo: 9,
    durationMinutes: 1.8,
    sentiment: 'positive',
    outcome: 'resolved',
    intents: ['Opening hours'],
    summary: 'Wanted to know Saturday hours before travelling in.',
    costUSD: 0.07,
  },
  {
    channel: 'chat',
    agentName: 'UCaaS Support bot',
    hoursAgo: 26,
    durationMinutes: 2.1,
    sentiment: 'neutral',
    outcome: 'resolved',
    intents: ['Pricing'],
    summary: 'Visitor compared two plans and left without giving contact details.',
    costUSD: 0.04,
  },
  {
    channel: 'call',
    agentName: 'Bengaluru Reception',
    name: 'Vikram Nair',
    phone: '+91 80471 20934',
    callerId: '+91 80471 20934',
    hoursAgo: 31,
    durationMinutes: 8.7,
    sentiment: 'negative',
    outcome: 'handoff',
    intents: ['Call quality'],
    summary: 'Reported dropped calls for a week; escalated to support with a callback promised.',
    costUSD: 0.31,
  },
  {
    channel: 'chat',
    agentName: 'UCaaS Support bot',
    name: 'Priya Raghavan',
    email: 'priya.raghavan@example.com',
    hoursAgo: 49,
    durationMinutes: 4.5,
    sentiment: 'positive',
    outcome: 'callback',
    intents: ['Demo request'],
    summary: 'Asked for a walkthrough of call queues; a callback was booked for the morning.',
    costUSD: 0.11,
  },
  {
    channel: 'call',
    agentName: 'Mumbai Front Desk',
    name: 'Sana Qureshi',
    callerId: '+91 98670 33418',
    hoursAgo: 54,
    durationMinutes: 2.9,
    sentiment: 'neutral',
    outcome: 'resolved',
    intents: ['Address'],
    summary: 'Confirmed the Bandra Kurla Complex address and parking.',
    costUSD: 0.1,
  },
  {
    channel: 'chat',
    agentName: 'UCaaS Support bot',
    name: 'Imran Shaikh',
    email: 'imran.shaikh@example.com',
    hoursAgo: 73,
    durationMinutes: 11.3,
    sentiment: 'negative',
    outcome: 'handoff',
    intents: ['Refund'],
    summary: 'Wanted a refund outside the 30-day window; handed to billing.',
    costUSD: 0.18,
  },
  {
    channel: 'call',
    agentName: 'Bengaluru Reception',
    name: 'Meera Pillai',
    callerId: '+91 80456 71209',
    hoursAgo: 96,
    durationMinutes: 5.6,
    sentiment: 'positive',
    outcome: 'resolved',
    intents: ['Add a user'],
    summary: 'Walked through adding two extensions for new joiners.',
    costUSD: 0.2,
  },
  {
    channel: 'chat',
    agentName: 'UCaaS Support bot',
    hoursAgo: 121,
    durationMinutes: 0.9,
    sentiment: 'neutral',
    outcome: 'resolved',
    intents: ['Integrations'],
    summary: 'Asked whether HubSpot is supported and read the linked page.',
    costUSD: 0.03,
  },
  {
    channel: 'call',
    agentName: 'Mumbai Front Desk',
    name: 'Aditya Kulkarni',
    callerId: '+91 98195 60472',
    hoursAgo: 140,
    durationMinutes: 7.2,
    sentiment: 'positive',
    outcome: 'resolved',
    intents: ['International calling'],
    summary: 'Checked which countries the plan allows before a trip.',
    costUSD: 0.26,
  },
  {
    channel: 'chat',
    agentName: 'UCaaS Support bot',
    name: 'Neha Bhatt',
    email: 'neha.bhatt@example.com',
    phone: '+91 99872 41065',
    hoursAgo: 6,
    durationMinutes: 3.1,
    sentiment: 'positive',
    outcome: 'active',
    intents: ['Voicemail setup'],
    summary: 'Still on the widget, working through voicemail greetings.',
    costUSD: 0.06,
  },
];

/* The three scores the sentiment panel draws as bars. They are derived from the
   seed's label rather than written out per row, so a row can never claim to be
   positive while its bars lean negative. */
const scoresFor = (sentiment: SessionSeed['sentiment']) => {
  if (sentiment === 'positive') return { positive: 0.78, neutral: 0.18, negative: 0.04 };
  if (sentiment === 'negative') return { positive: 0.08, neutral: 0.22, negative: 0.7 };
  return { positive: 0.24, neutral: 0.63, negative: 0.13 };
};

const toRow = (seed: SessionSeed, index: number) => {
  const startedAt = new Date(Date.now() - seed.hoursAgo * HOUR);
  const durationMs = Math.round(seed.durationMinutes * MINUTE);
  /* An still-running session has no end and no outcome flag; `getOutcome`
     reads `status` first, so this is what makes it show as Active. */
  const isActive = seed.outcome === 'active';

  const collectedData: Record<string, { value: string }> = {};
  if (seed.name) collectedData.name = { value: seed.name };
  if (seed.phone) collectedData.phone = { value: seed.phone };
  if (seed.email) collectedData.email = { value: seed.email };

  return {
    _id: `demo-session-${index + 1}`,
    sessionId: `demo-session-${index + 1}`,
    room: `demo-room-${index + 1}`,
    channel: seed.channel,
    agentId: `demo-agent-${seed.agentName.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    agentName: seed.agentName,
    status: isActive ? 'active' : 'completed',
    handoff: seed.outcome === 'handoff',
    scheduledCallback: seed.outcome === 'callback' ? startedAt.toISOString() : null,
    startedAt: startedAt.toISOString(),
    createdAt: startedAt.toISOString(),
    endedAt: isActive ? null : new Date(startedAt.getTime() + durationMs).toISOString(),
    durationMs: isActive ? 0 : durationMs,
    callerId: seed.callerId || '',
    collectedData,
    summary: seed.summary,
    intents: seed.intents.map((label) => ({
      intent_label: label,
      intent_summary: seed.summary,
    })),
    sentiment: seed.sentiment,
    sentiment_scores: scoresFor(seed.sentiment),
    totalCostUSD: seed.costUSD,
    costBasis: seed.channel === 'call' ? 'per minute' : 'per message',
  };
};

export const demoAiSessionRows = () => SEEDS.map(toRow);
