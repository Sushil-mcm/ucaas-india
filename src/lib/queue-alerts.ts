/* Queue alerts: what a rule is, how it reads, and how a saved one is tidied.
 *
 * A rule says "when <what we watch> <goes past> <a number> over the last
 * <minutes> on <queues>, tell <people> by <email, and a text if asked>". The
 * server keeps the same vocabulary (default-api services/alerts/queueAlertRules)
 * and refuses anything outside it, so the lists here are the screen's copy of
 * the server's catalogue: the server's reply carries its own catalogue and the
 * screen prefers that when it arrives.
 *
 * Two metrics - calls waiting now and the longest wait now - are in the list
 * but not measured yet: the server judges rules from finished calls, and a
 * call reaches it once it has ended. They are shown greyed with a note rather
 * than hidden, so nobody is left wondering whether the product has them.
 */

export const QUEUE_ALERTS_SECTION = 'queue_alerts';

export type QueueAlertMetric =
  | 'service_level_percent'
  | 'abandon_percent'
  | 'asa_seconds'
  | 'agents_on_duty'
  | 'longest_wait_seconds'
  | 'waiting';

export type QueueAlertOperator = '<' | '<=' | '>' | '>=';
export type QueueAlertWindow = 5 | 15 | 60;

export interface QueueAlertMetricInfo {
  key: QueueAlertMetric;
  label: string;
  unit: 'percent' | 'seconds' | 'calls' | 'people';
  default_operator: QueueAlertOperator;
  default_threshold: number;
  /* False for the two live-queue metrics the server cannot measure yet. */
  evaluated: boolean;
  needs_calls: boolean;
  /* One line under the picker, in the words a supervisor uses. */
  help: string;
}

export const QUEUE_ALERT_METRICS: QueueAlertMetricInfo[] = [
  {
    key: 'service_level_percent',
    label: 'Service level',
    unit: 'percent',
    default_operator: '<',
    default_threshold: 80,
    evaluated: true,
    needs_calls: true,
    help: 'The share of calls answered within the queue’s target time. Short hang-ups are left out.',
  },
  {
    key: 'abandon_percent',
    label: 'Abandon rate',
    unit: 'percent',
    default_operator: '>',
    default_threshold: 10,
    evaluated: true,
    needs_calls: true,
    help: 'The share of callers who hung up while waiting, not counting very short hang-ups.',
  },
  {
    key: 'asa_seconds',
    label: 'Average speed of answer',
    unit: 'seconds',
    default_operator: '>',
    default_threshold: 60,
    evaluated: true,
    needs_calls: true,
    help: 'How long an answered caller waited, on average.',
  },
  {
    key: 'agents_on_duty',
    label: 'Agents on duty',
    unit: 'people',
    default_operator: '<',
    default_threshold: 1,
    evaluated: true,
    needs_calls: false,
    help: 'People marked Available on these queues right now. “Below 1” means nobody is on duty.',
  },
  {
    key: 'longest_wait_seconds',
    label: 'Longest wait right now',
    unit: 'seconds',
    default_operator: '>',
    default_threshold: 120,
    evaluated: false,
    needs_calls: false,
    help: 'Not measured yet. The server judges rules from finished calls, so a wait in progress is not seen.',
  },
  {
    key: 'waiting',
    label: 'Calls waiting right now',
    unit: 'calls',
    default_operator: '>',
    default_threshold: 5,
    evaluated: false,
    needs_calls: false,
    help: 'Not measured yet, for the same reason as the longest wait.',
  },
];

export const QUEUE_ALERT_OPERATORS: { value: QueueAlertOperator; label: string }[] = [
  { value: '<', label: 'drops below' },
  { value: '<=', label: 'is at or below' },
  { value: '>', label: 'goes above' },
  { value: '>=', label: 'is at or above' },
];

export const QUEUE_ALERT_WINDOWS: { value: QueueAlertWindow; label: string }[] = [
  { value: 5, label: 'last 5 minutes' },
  { value: 15, label: 'last 15 minutes' },
  { value: 60, label: 'last hour' },
];

export const QUEUE_ALERT_MAX_RULES = 50;
export const QUEUE_ALERT_MAX_RECIPIENTS = 25;

export interface QueueAlertRule {
  id: string;
  name: string;
  metric: QueueAlertMetric;
  operator: QueueAlertOperator;
  threshold: number;
  window_minutes: QueueAlertWindow;
  /* Empty means every queue. */
  queue_uuids: string[];
  /* Call-based metrics are only judged once the window holds this many calls. */
  min_calls: number;
  recipients: { mode: 'admins' | 'custom'; emails: string[]; phones: string[] };
  channel: { email: boolean; sms: boolean };
  enabled: boolean;
}

export interface QueueAlertEvent {
  uuid: string;
  rule_id: string;
  rule_name: string;
  metric: string;
  operator: string;
  threshold: number;
  window_minutes: number;
  queue_names: string[];
  status: 'breached' | 'recovered';
  value: number | null;
  value_text: string;
  offered: number;
  evaluated_at: string;
  recipients: string[];
  channel: { email: boolean; sms: boolean };
  email_sent: number;
  sms_sent: number;
  delivery_error: string | null;
  message: string;
}

export const metricInfo = (key: string): QueueAlertMetricInfo | undefined =>
  QUEUE_ALERT_METRICS.find((m) => m.key === key);

const isMetric = (v: unknown): v is QueueAlertMetric =>
  typeof v === 'string' && QUEUE_ALERT_METRICS.some((m) => m.key === v);
const isOperator = (v: unknown): v is QueueAlertOperator =>
  typeof v === 'string' && QUEUE_ALERT_OPERATORS.some((o) => o.value === v);
const isWindow = (v: unknown): v is QueueAlertWindow =>
  typeof v === 'number' && QUEUE_ALERT_WINDOWS.some((w) => w.value === v);

const unitWord = (unit: QueueAlertMetricInfo['unit'], value: number): string => {
  if (unit === 'percent') return `${value}%`;
  if (unit === 'seconds') return `${value} second${value === 1 ? '' : 's'}`;
  if (unit === 'calls') return `${value} call${value === 1 ? '' : 's'}`;
  return `${value} agent${value === 1 ? '' : 's'}`;
};

/* A measured value, written the way the threshold is. */
export const formatQueueAlertValue = (metric: string, value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'no data';
  const info = metricInfo(metric);
  const rounded = Math.round(value * 10) / 10;
  return unitWord(info?.unit || 'calls', rounded);
};

/* "Service level drops below 80% over the last 15 minutes" - the same
   sentence the server writes into the email subject. */
export const describeQueueAlertRule = (
  rule: Pick<QueueAlertRule, 'metric' | 'operator' | 'threshold' | 'window_minutes'>,
): string => {
  const info = metricInfo(rule.metric);
  const label = info?.label || rule.metric;
  const words = QUEUE_ALERT_OPERATORS.find((o) => o.value === rule.operator)?.label || rule.operator;
  const value = unitWord(info?.unit || 'calls', rule.threshold);
  if (rule.metric === 'agents_on_duty') return `${label} ${words} ${value}`;
  return `${label} ${words} ${value} over the last ${rule.window_minutes} minutes`;
};

/* What a rule's scope and audience say on the list. */
export const describeQueueAlertScope = (rule: QueueAlertRule, queueNames: Record<string, string>): string => {
  if (!rule.queue_uuids.length) return 'All queues';
  const names = rule.queue_uuids.map((id) => queueNames[id] || 'a removed queue');
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
};

export const describeQueueAlertRecipients = (rule: QueueAlertRule): string => {
  const via = rule.channel.sms ? (rule.channel.email ? 'email and text' : 'text') : 'email';
  if (rule.recipients.mode === 'admins') return `All admins and supervisors, by ${via}`;
  const count = rule.recipients.emails.length + (rule.channel.sms ? rule.recipients.phones.length : 0);
  return `${count} chosen ${count === 1 ? 'person' : 'people'}, by ${via}`;
};

let counter = 0;
export const newQueueAlertRuleId = (): string => {
  counter += 1;
  return `qa_${Date.now().toString(36)}${counter.toString(36)}`;
};

/* A fresh rule for the form: the metric's own default comparison and number,
   15 minutes, every queue, all admins, email only. */
export const blankQueueAlertRule = (metric: QueueAlertMetric = 'service_level_percent'): QueueAlertRule => {
  const info = metricInfo(metric) || QUEUE_ALERT_METRICS[0];
  return {
    id: newQueueAlertRuleId(),
    name: '',
    metric: info.key,
    operator: info.default_operator,
    threshold: info.default_threshold,
    window_minutes: 15,
    queue_uuids: [],
    min_calls: 1,
    recipients: { mode: 'admins', emails: [], phones: [] },
    channel: { email: true, sms: false },
    enabled: true,
  };
};

const cleanList = (value: unknown, limit: number): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const s = String(item ?? '').trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
};

/* Tidy what the server (or an older save) hands back into full rules. Anything
   that is not a rule is dropped, never repaired into something nobody wrote. */
export const normaliseQueueAlertRules = (raw: unknown): QueueAlertRule[] => {
  const list = Array.isArray((raw as any)?.rules) ? (raw as any).rules : Array.isArray(raw) ? raw : [];
  const out: QueueAlertRule[] = [];
  const ids = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const metric = (item as any).metric;
    if (!isMetric(metric)) continue;
    const info = metricInfo(metric)!;
    const threshold = Number((item as any).threshold);
    if (!Number.isFinite(threshold) || threshold < 0) continue;
    const operator = isOperator((item as any).operator) ? (item as any).operator : info.default_operator;
    const windowRaw = Number((item as any).window_minutes);
    const window_minutes: QueueAlertWindow = isWindow(windowRaw) ? windowRaw : 15;
    const minCalls = Number((item as any).min_calls);
    const recipientsRaw = (item as any).recipients || {};
    const channelRaw = (item as any).channel || {};
    let id = String((item as any).id ?? '').trim();
    if (!id) id = newQueueAlertRuleId();
    if (ids.has(id)) continue;
    ids.add(id);
    out.push({
      id,
      name: String((item as any).name ?? '')
        .trim()
        .slice(0, 80),
      metric,
      operator,
      threshold: Math.round(threshold * 100) / 100,
      window_minutes,
      queue_uuids: cleanList((item as any).queue_uuids, 200),
      min_calls: Number.isFinite(minCalls) && minCalls >= 1 ? Math.min(1000, Math.round(minCalls)) : 1,
      recipients: {
        mode: recipientsRaw?.mode === 'custom' ? 'custom' : 'admins',
        emails: cleanList(recipientsRaw?.emails, QUEUE_ALERT_MAX_RECIPIENTS),
        phones: cleanList(recipientsRaw?.phones, QUEUE_ALERT_MAX_RECIPIENTS),
      },
      channel: { email: channelRaw?.email !== false, sms: channelRaw?.sms === true },
      enabled: (item as any).enabled !== false,
    });
    if (out.length >= QUEUE_ALERT_MAX_RULES) break;
  }
  return out;
};

/* What stops a rule being saved, in one sentence, or null when it is fine.
   The server checks the same things; this is so the person hears it before
   the round trip, in the same words. */
export const queueAlertRuleProblem = (rule: QueueAlertRule): string | null => {
  if (!isMetric(rule.metric)) return 'Pick what to watch.';
  if (!Number.isFinite(rule.threshold) || rule.threshold < 0) return 'The number must be zero or more.';
  const info = metricInfo(rule.metric)!;
  if (info.unit === 'percent' && rule.threshold > 100) return 'A percentage cannot be above 100.';
  if (!rule.channel.email && !rule.channel.sms) return 'Turn on email or text, or both.';
  if (rule.recipients.mode === 'custom') {
    const emails = rule.channel.email ? rule.recipients.emails : [];
    const phones = rule.channel.sms ? rule.recipients.phones : [];
    if (!emails.length && !phones.length) {
      return rule.channel.email ? 'Add at least one email address.' : 'Add at least one phone number.';
    }
    const badEmail = emails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (badEmail) return `“${badEmail}” is not an email address.`;
    const badPhone = phones.find((p) => !/^\+?[0-9]{7,16}$/.test(p));
    if (badPhone) return `“${badPhone}” is not a phone number (digits only, + allowed).`;
  }
  return null;
};

/* Split "a@x.io, b@x.io\nc@x.io" into a clean list. */
export const splitAddresses = (text: string, limit = QUEUE_ALERT_MAX_RECIPIENTS): string[] =>
  cleanList(String(text || '').split(/[\s,;]+/), limit);

/* "3 minutes ago", "at 14:05", "yesterday 09:10" - for the recent alerts list. */
export const describeWhen = (iso: string | null | undefined, now: Date = new Date()): string => {
  if (!iso) return '';
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return '';
  const diff = now.getTime() - t.getTime();
  if (diff >= 0 && diff < 60 * 1000) return 'just now';
  if (diff >= 0 && diff < 60 * 60 * 1000) {
    const m = Math.round(diff / 60000);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const sameDay = t.toDateString() === now.toDateString();
  if (sameDay) return `today at ${hh}:${mm}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (t.toDateString() === yesterday.toDateString()) return `yesterday at ${hh}:${mm}`;
  return `${t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} at ${hh}:${mm}`;
};
