/* What the queue's rules would actually do to a caller.
 *
 * Ring settings are easy to set and hard to picture. An admin choosing a
 * strategy, a widening delay and a give-up time has no way of knowing what those
 * three add up to until a real caller is affected by them — and by then it is a
 * complaint rather than a setting.
 *
 * This walks the caller's wait second by second through the same function the
 * routing itself uses (`lib/acd-routing.ts`), and shows what changes and when.
 * Because it is the same function, the preview cannot drift from the behaviour:
 * if one is wrong they are both wrong, which is far easier to notice.
 *
 * It assumes everybody is free, and says so. Live duty state belongs to the
 * switch, and a preview that guessed at it would be worse than one that is clear
 * about what it is showing — this answers "are my rules sensible", not "what is
 * happening right now".
 */

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { SettingCard } from '@/components/mcm/setting-card';
import {
  decideAcdRing,
  type AcdAgent,
  type AcdQueueRules,
  type RingOrder,
} from '@/lib/acd-routing';

/* The stored strategy names, mapped onto the ones the decision function knows.
   Anything unrecognised falls back to ringing everybody, which is the least
   surprising thing to show for a setting we cannot interpret. */
const ORDER_BY_STRATEGY: Record<string, RingOrder> = {
  'ring-all': 'all-at-once',
  ringall: 'all-at-once',
  'top-down': 'in-order',
  linear: 'in-order',
  'call-linear': 'in-order',
  'longest-idle-agent': 'longest-idle-first',
  'longest-idle': 'longest-idle-first',
  'agent-with-fewest-calls': 'fewest-calls-first',
  'agent-with-least-talk-time': 'longest-idle-first',
};

const asSeconds = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const RingPreview = () => {
  const { watch } = useFormContext();

  const strategyRaw = String(watch('settings.ring_strategy.type')?.value ?? '')
    .toLowerCase()
    .replace(/_/g, '-');
  const escalation = watch('settings.escalation');
  const members = watch('members') || [];
  const queueTimeout = asSeconds(watch('settings.ring_strategy.max_wait_time.queue_timeout'), 60);

  const { rules, agents } = useMemo(() => {
    const widenAfter = asSeconds(escalation?.widen_after_seconds, 30);
    /* Two steps only when widening is switched on. With it off the queue rings
       one group for the whole wait, and showing a second step would be a lie. */
    const steps = escalation?.enabled
      ? [{ waitSeconds: widenAfter }, { waitSeconds: 0 }]
      : [{ waitSeconds: 0 }];

    const list: AcdAgent[] = (Array.isArray(members) ? members : []).map((m: any, i: number) => ({
      id: String(m?.value ?? m?.uuid ?? i),
      name: String(m?.label ?? m?.first_name ?? 'Someone')
        .split('/')[0]
        .trim(),
      state: 'available',
      idleSince: 0,
    }));

    return {
      rules: {
        steps,
        order: ORDER_BY_STRATEGY[strategyRaw] ?? 'all-at-once',
        giveUpAfterSeconds: queueTimeout,
      } as AcdQueueRules,
      agents: list,
    };
  }, [strategyRaw, escalation?.enabled, escalation?.widen_after_seconds, members, queueTimeout]);

  /* The moments worth showing: the start, each point the answer changes, and the
     end. Walking forward using the decision's own `changesInSeconds` means the
     preview lists exactly the moments the routing itself would act on. */
  const moments = useMemo(() => {
    const out: { at: number; reason: string; count: number }[] = [];
    let at = 0;
    for (let guard = 0; guard < 12; guard += 1) {
      const d = decideAcdRing({ rules, agents, waitedSeconds: at, now: 0 });
      out.push({ at, reason: d.reason, count: d.ring.length });
      if (d.changesInSeconds === null) break;
      at += d.changesInSeconds;
      if (at > (rules.giveUpAfterSeconds ?? 0)) break;
    }
    return out;
  }, [rules, agents]);

  return (
    <SettingCard
      title="What a caller would experience"
      description="Your settings, walked through second by second. It assumes everybody is free — this answers whether the rules are sensible, not what is happening right now."
    >
      <div className="flex flex-col gap-2 py-3">
        {agents.length === 0 ? (
          <p className="text-xs text-gray-600">
            Add people on the Members tab to see what would happen.
          </p>
        ) : (
          moments.map((m, i) => (
            <div key={`${m.at}-${i}`} className="flex items-baseline gap-3">
              <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-gray-500">
                {m.at === 0 ? 'at once' : `${m.at}s`}
              </span>
              <span className="text-xs text-gray-700">{m.reason}</span>
            </div>
          ))
        )}
      </div>
    </SettingCard>
  );
};

export default RingPreview;
