import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Loader from '@/components/custom/loader';
import { useGetQueueList } from '@/hooks/common';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import {
  QUEUE_ALERT_MAX_RULES,
  QUEUE_ALERT_METRICS,
  QUEUE_ALERT_OPERATORS,
  QUEUE_ALERT_WINDOWS,
  QueueAlertEvent,
  QueueAlertMetric,
  QueueAlertRule,
  blankQueueAlertRule,
  describeQueueAlertRecipients,
  describeQueueAlertRule,
  describeQueueAlertScope,
  describeWhen,
  formatQueueAlertValue,
  metricInfo,
  normaliseQueueAlertRules,
  queueAlertRuleProblem,
  splitAddresses,
} from '@/lib/queue-alerts';
import { listQueueAlertHistory, listQueueAlertRules, saveQueueAlertRules } from '@/services/api';
import { SectionHeading } from './section-heading';
import { SectionActions } from './section-actions';

/* Company › Alerts.
 *
 * Who gets told when a queue is in trouble. One rule type today - Queue - and
 * the type is shown as a chip so a second kind (say, billing) has a place to
 * go without the screen changing shape. A rule reads as a sentence: "Service
 * level drops below 80% over the last 15 minutes on Sales", then who hears
 * about it and how. The server judges the rules every five minutes, sends one
 * email per new breach, and lists what it sent below the rules.
 *
 * Two of the six things to watch cannot be measured yet (the live "waiting"
 * pair); they are in the list, greyed, with the reason, rather than hidden. */

export const QUEUE_ALERT_RULES_QUERY_KEY = ['queueAlertRules'];
export const QUEUE_ALERT_HISTORY_QUERY_KEY = ['queueAlertHistory'];

const unwrap = (res: any) => res?.data?.data?.result ?? res?.data?.result ?? res?.data ?? {};

type Draft = QueueAlertRule & { emailsText: string; phonesText: string };

const toDraft = (rule: QueueAlertRule): Draft => ({
  ...rule,
  emailsText: rule.recipients.emails.join(', '),
  phonesText: rule.recipients.phones.join(', '),
});

const fromDraft = (draft: Draft): QueueAlertRule => {
  const { emailsText, phonesText, ...rest } = draft;
  return {
    ...rest,
    recipients: {
      mode: rest.recipients.mode,
      emails: splitAddresses(emailsText),
      phones: splitAddresses(phonesText),
    },
  };
};

const CompanyAlerts = () => {
  const queryClient: any = useQueryClient();
  const { user = {} }: any = useUser();
  const isAdmin = String(user?.user_info?.role || '').toUpperCase() === 'ADMIN';

  const rulesQuery = useQuery({
    queryKey: QUEUE_ALERT_RULES_QUERY_KEY,
    queryFn: () => listQueueAlertRules(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const historyQuery = useQuery({
    queryKey: QUEUE_ALERT_HISTORY_QUERY_KEY,
    queryFn: () => listQueueAlertHistory({ limit: 50 }),
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const { data: queueRows = [] } = useGetQueueList({ filters: [], search: '' });

  const saved = useMemo(() => normaliseQueueAlertRules(unwrap(rulesQuery.data)?.rules), [rulesQuery.data]);
  const version: number | undefined = unwrap(rulesQuery.data)?.version ?? undefined;
  const history: QueueAlertEvent[] = useMemo(() => unwrap(historyQuery.data)?.rows || [], [historyQuery.data]);
  const queueNames = useMemo(() => {
    const map: Record<string, string> = {};
    /* The queue list is Mongo documents keyed by `_id`, and `_id` is also the id
       the alert server scopes a rule by (QueueAlertService loads queues by
       `_id`). Keying on `uuid` here left the picker empty on every tenant and
       said "No queues found" over three live queues. */
    (queueRows as any[]).forEach((row) => {
      const id = row?._id ?? row?.uuid;
      if (id) map[String(id)] = String(row?.name || 'Untitled queue');
    });
    return map;
  }, [queueRows]);

  const [rules, setRules] = useState<QueueAlertRule[]>([]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) setRules(saved);
  }, [saved, dirty]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (next: QueueAlertRule[]) =>
      saveQueueAlertRules({ rules: next, ...(typeof version === 'number' ? { version } : {}) }),
    onSuccess: () => {
      handleAlert({ type: 'success', text: 'Alert rules saved' });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: QUEUE_ALERT_RULES_QUERY_KEY });
    },
  });

  const startNew = () => {
    if (rules.length >= QUEUE_ALERT_MAX_RULES) {
      handleAlert({ type: 'error', text: `At most ${QUEUE_ALERT_MAX_RULES} rules.` });
      return;
    }
    setProblem(null);
    setEditing(toDraft(blankQueueAlertRule()));
  };
  const startEdit = (rule: QueueAlertRule) => {
    setProblem(null);
    setEditing(toDraft(rule));
  };
  const remove = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setDirty(true);
  };
  const toggle = (id: string, enabled: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    setDirty(true);
  };
  const commitEdit = () => {
    if (!editing) return;
    const rule = fromDraft(editing);
    const why = queueAlertRuleProblem(rule);
    if (why) {
      setProblem(why);
      return;
    }
    setRules((prev) => {
      const exists = prev.some((r) => r.id === rule.id);
      return exists ? prev.map((r) => (r.id === rule.id ? rule : r)) : [...prev, rule];
    });
    setDirty(true);
    setEditing(null);
    setProblem(null);
  };
  const patch = (changes: Partial<Draft>) => {
    setEditing((prev) => (prev ? { ...prev, ...changes } : prev));
    setProblem(null);
  };
  const changeMetric = (metric: QueueAlertMetric) => {
    const info = metricInfo(metric);
    if (!info) return;
    patch({ metric, operator: info.default_operator, threshold: info.default_threshold });
  };

  if (rulesQuery.isLoading) return <Loader />;

  const serverMissing = rulesQuery.isError;
  const editingInfo = editing ? metricInfo(editing.metric) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        icon={<BellRing size={20} />}
        title="Alerts"
        description="Who gets told when a queue is in trouble. The server checks every rule every five minutes over the window you pick, sends one email per new problem, and waits at least that window before writing about the same problem again. A text message is optional and costs credits."
        actions={
          isAdmin && !serverMissing ? (
            <Button type="button" variant="outline" className="min-h-9" onClick={startNew} disabled={!!editing}>
              Add rule
            </Button>
          ) : null
        }
      />

      {serverMissing ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Queue alerts are not switched on for this server yet. Nothing here can be saved until they are.{' '}
          <button type="button" className="underline" onClick={() => rulesQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : null}

      {!isAdmin && !serverMissing ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          Only an administrator can change these rules. You can see them and the recent alerts.
        </div>
      ) : null}

      {/* The rules */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_200px_220px_120px] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
          <span>Rule</span>
          <span>Queues</span>
          <span>Who is told</span>
          <span className="text-right">On</span>
        </div>
        {rules.length === 0 && !editing ? (
          <div className="px-4 py-6 text-sm text-gray-500">
            No rules yet. A good first one: service level drops below 80% over the last 15 minutes, to all admins and
            supervisors.
          </div>
        ) : null}
        {rules.map((r) => (
          <div
            key={r.id}
            className={`grid grid-cols-[1fr_200px_220px_120px] gap-3 items-center px-4 py-3 border-b last:border-b-0 border-gray-100 ${r.enabled ? '' : 'opacity-60'}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded-full px-1.5">
                  Queue
                </span>
                <span className="text-sm font-medium truncate">{r.name || describeQueueAlertRule(r)}</span>
                {!metricInfo(r.metric)?.evaluated ? (
                  <span
                    className="text-[10px] uppercase tracking-wide text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-1.5 whitespace-nowrap"
                    title="This is stored but not measured yet; it will never fire until the server can see live queues."
                  >
                    not measured yet
                  </span>
                ) : null}
              </div>
              {r.name ? <div className="text-xs text-gray-500 mt-0.5">{describeQueueAlertRule(r)}</div> : null}
              {isAdmin ? (
                <div className="flex gap-3 mt-1 text-xs">
                  <button type="button" className="underline underline-offset-2" onClick={() => startEdit(r)} disabled={!!editing}>
                    Edit
                  </button>
                  <button type="button" className="text-red-600 underline underline-offset-2" onClick={() => remove(r.id)} disabled={!!editing}>
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
            <div className="text-sm text-gray-700 truncate" title={describeQueueAlertScope(r, queueNames)}>
              {describeQueueAlertScope(r, queueNames)}
            </div>
            <div className="text-sm text-gray-700 truncate" title={describeQueueAlertRecipients(r)}>
              {describeQueueAlertRecipients(r)}
              {r.channel.sms ? <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-700">costs credits</span> : null}
            </div>
            <div className="flex justify-end">
              <Switch checked={r.enabled} disabled={!isAdmin || !!editing} onCheckedChange={(v) => toggle(r.id, Boolean(v))} />
            </div>
          </div>
        ))}
      </div>

      {/* The form: inline, so nothing tall is clipped by a drawer. */}
      {editing ? (
        <div className="rounded-xl border border-primary/40 bg-white p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded-full px-1.5">
              Rule type: Queue
            </span>
            <span className="text-sm font-medium">{describeQueueAlertRule(fromDraft(editing))}</span>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Name (optional)</span>
            <Input
              type="text"
              maxLength={80}
              placeholder={describeQueueAlertRule(fromDraft(editing))}
              value={editing.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px_180px] gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">Watch</span>
              <select
                className="h-10 rounded-lg border border-gray-300 px-2 bg-white"
                value={editing.metric}
                onChange={(e) => changeMetric(e.target.value as QueueAlertMetric)}
              >
                {QUEUE_ALERT_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                    {m.evaluated ? '' : ' (not measured yet)'}
                  </option>
                ))}
              </select>
              {editingInfo ? <span className={`text-xs ${editingInfo.evaluated ? 'text-gray-500' : 'text-amber-700'}`}>{editingInfo.help}</span> : null}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">When it</span>
              <select
                className="h-10 rounded-lg border border-gray-300 px-2 bg-white"
                value={editing.operator}
                onChange={(e) => patch({ operator: e.target.value as QueueAlertRule['operator'] })}
              >
                {QUEUE_ALERT_OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">
                {editingInfo?.unit === 'percent' ? 'Percent' : editingInfo?.unit === 'seconds' ? 'Seconds' : editingInfo?.unit === 'calls' ? 'Calls' : 'Agents'}
              </span>
              <Input
                type="number"
                min={0}
                max={editingInfo?.unit === 'percent' ? 100 : 100000}
                step={editingInfo?.unit === 'percent' ? 1 : 1}
                value={Number.isFinite(editing.threshold) ? editing.threshold : ''}
                onChange={(e) => patch({ threshold: e.target.value === '' ? NaN : Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">Over the</span>
              <select
                className="h-10 rounded-lg border border-gray-300 px-2 bg-white disabled:bg-gray-50"
                value={editing.window_minutes}
                disabled={editing.metric === 'agents_on_duty'}
                onChange={(e) => patch({ window_minutes: Number(e.target.value) as QueueAlertRule['window_minutes'] })}
              >
                {QUEUE_ALERT_WINDOWS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
              {editing.metric === 'agents_on_duty' ? (
                <span className="text-xs text-gray-500">Checked as it is right now; the window sets how long before a repeat email.</span>
              ) : null}
            </label>
          </div>

          {editingInfo?.needs_calls ? (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-700">Only judge once the window has at least</span>
              <Input
                type="number"
                min={1}
                max={1000}
                className="w-24"
                value={editing.min_calls}
                onChange={(e) => patch({ min_calls: Math.max(1, Math.min(1000, Math.round(Number(e.target.value) || 1))) })}
              />
              <span className="text-gray-700">calls, so a quiet spell is not a 0% service level.</span>
            </label>
          ) : null}

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">On which queues</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${editing.queue_uuids.length === 0 ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 text-gray-700'}`}
                onClick={() => patch({ queue_uuids: [] })}
              >
                All queues
              </button>
              {Object.entries(queueNames).map(([uuid, name]) => {
                const on = editing.queue_uuids.includes(uuid);
                return (
                  <button
                    key={uuid}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 text-gray-700'}`}
                    onClick={() =>
                      patch({
                        queue_uuids: on ? editing.queue_uuids.filter((id) => id !== uuid) : [...editing.queue_uuids, uuid],
                      })
                    }
                  >
                    {name}
                  </button>
                );
              })}
              {Object.keys(queueNames).length === 0 ? <span className="text-xs text-gray-500">No queues found; the rule will cover every queue.</span> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-gray-700">Who is told</span>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="qa-recipients"
                  checked={editing.recipients.mode === 'admins'}
                  onChange={() => patch({ recipients: { ...editing.recipients, mode: 'admins' } })}
                />
                <span>All admins and supervisors</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="qa-recipients"
                  checked={editing.recipients.mode === 'custom'}
                  onChange={() => patch({ recipients: { ...editing.recipients, mode: 'custom' } })}
                />
                <span>These people</span>
              </label>
              {editing.recipients.mode === 'custom' ? (
                <>
                  {editing.channel.email ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Email addresses, separated by commas</span>
                      <textarea
                        className="rounded-lg border border-gray-300 p-2 text-sm min-h-16"
                        value={editing.emailsText}
                        onChange={(e) => patch({ emailsText: e.target.value })}
                        placeholder="ops@example.com, lead@example.com"
                      />
                    </label>
                  ) : null}
                  {editing.channel.sms ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Phone numbers for texts, separated by commas</span>
                      <textarea
                        className="rounded-lg border border-gray-300 p-2 text-sm min-h-16"
                        value={editing.phonesText}
                        onChange={(e) => patch({ phonesText: e.target.value })}
                        placeholder="+15551234567"
                      />
                    </label>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-gray-700">How</span>
              <label className="flex items-center gap-2">
                <Switch checked={editing.channel.email} onCheckedChange={(v) => patch({ channel: { ...editing.channel, email: Boolean(v) } })} />
                <span>Email</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={editing.channel.sms} onCheckedChange={(v) => patch({ channel: { ...editing.channel, sms: Boolean(v) } })} />
                <span>Text message</span>
                <span className="text-[10px] uppercase tracking-wide text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-1.5">
                  costs credits
                </span>
              </label>
              <span className="text-xs text-gray-500">
                Each text is charged like any outbound message. Email is included.
              </span>
            </div>
          </div>

          {problem ? <div className="text-sm text-red-600">{problem}</div> : null}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" className="min-h-9" onClick={() => { setEditing(null); setProblem(null); }}>
              Cancel
            </Button>
            <Button type="button" variant="primary" className="min-h-9" onClick={commitEdit}>
              {rules.some((r) => r.id === editing.id) ? 'Update rule' : 'Add rule'}
            </Button>
          </div>
        </div>
      ) : null}

      {isAdmin && !serverMissing ? (
        <SectionActions>
          <Button type="button" variant="primary" className="min-h-9" disabled={!dirty || isPending || !!editing} onClick={() => save(rules)}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </SectionActions>
      ) : null}

      {/* Recent alerts */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">Recent alerts</span>
          <button type="button" className="text-xs underline underline-offset-2" onClick={() => historyQuery.refetch()}>
            Refresh
          </button>
        </div>
        {history.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">
            {historyQuery.isError ? 'Recent alerts could not be loaded.' : 'Nothing has fired yet.'}
          </div>
        ) : (
          history.map((ev) => (
            <div key={ev.uuid} className="px-4 py-3 border-b last:border-b-0 border-gray-100 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase tracking-wide rounded-full px-1.5 border ${ev.status === 'breached' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}
                >
                  {ev.status === 'breached' ? 'alert' : 'back to normal'}
                </span>
                <span className="font-medium truncate">{ev.rule_name}</span>
                <span className="text-gray-500 whitespace-nowrap ml-auto">{describeWhen(ev.evaluated_at)}</span>
              </div>
              <div className="text-gray-700 mt-0.5">
                {metricInfo(ev.metric)?.label || ev.metric} was {formatQueueAlertValue(ev.metric, ev.value)}
                {ev.queue_names?.length ? ` on ${ev.queue_names.join(', ')}` : ' on all queues'}
                {ev.metric !== 'agents_on_duty' ? ` (${ev.offered} call${ev.offered === 1 ? '' : 's'} in ${ev.window_minutes} minutes)` : ''}.
              </div>
              {ev.status === 'breached' ? (
                <div className="text-xs text-gray-500 mt-0.5">
                  {ev.email_sent ? `${ev.email_sent} email${ev.email_sent === 1 ? '' : 's'} sent` : 'No email sent'}
                  {ev.sms_sent ? `, ${ev.sms_sent} text${ev.sms_sent === 1 ? '' : 's'}` : ''}
                  {ev.delivery_error ? <span className="text-red-600"> — {ev.delivery_error}</span> : null}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CompanyAlerts;
