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
import { queueSkillFit, queueSkillStage, readRouting, useMembersSkills } from '@/hooks/use-queue-skills';

/* The stored strategy names, mapped onto the ones the decision function knows.
   Anything unrecognised falls back to ringing everybody, which is the least
   surprising thing to show for a setting we cannot interpret. */
const ORDER_BY_STRATEGY: Record<string, RingOrder> = {
  'ring-all': 'all-at-once',
  ringall: 'all-at-once',
  'top-down': 'in-order',
  linear: 'in-order',
  'call-linear': 'in-order',
  'round-robin': 'in-order',
  random: 'in-order',
  'longest-idle-agent': 'longest-idle-first',
  'longest-idle': 'longest-idle-first',
  'agent-with-fewest-calls': 'fewest-calls-first',
  /* Deliberately 'in-order', not 'longest-idle-first'. Talk time is recorded
     nowhere - every agent reads zero - so on the switch this strategy ties on
     every comparison and falls back to the order the queue was set up in, which
     is Top Down. Showing it as longest-idle-first would preview a behaviour the
     caller will never get. */
  'agent-with-least-talk-time': 'in-order',
};

const asSeconds = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const RingPreview = () => {
  const { watch } = useFormContext();

  /* `settings.ring_strategy.value` is where the strategy select writes, and the
     only place it has ever been written. This read used to say `.type`, a path
     that exists nowhere in the form, so it was always undefined and the preview
     fell back to ringing everybody — it described Ring All whichever strategy
     you picked. */
  const strategyRaw = String(watch('settings.ring_strategy.value')?.value ?? '')
    .toLowerCase()
    .replace(/_/g, '-');
  const escalation = watch('settings.escalation');
  const members = watch('members') || [];
  /* Skills the queue asks for: people who do not hold them are not rung at
     all, and among those who do the best rated go first - the same rule the
     queue service applies. */
  const routingRaw = watch('settings.routing') || {};
  /* Keyed on its text so the memo below does not rebuild on every render. */
  const routingKey = JSON.stringify(routingRaw);
  const routing = useMemo(() => readRouting(routingRaw), [routingKey]);
  const { byUser: memberSkills } = useMembersSkills(
    (Array.isArray(members) ? members : []).map((m: any) => m?.user_uuid),
  );
  const queueTimeout = asSeconds(watch('settings.ring_strategy.max_wait_time.queue_timeout'), 60);

  const { rules, agents } = useMemo(() => {
    const widenAfter = asSeconds(escalation?.widen_after_seconds, 30);
    const widening = !!escalation?.enabled;
    const roster = Array.isArray(members) ? members : [];
    const required = routing.required_skills.length > 0 || (routing.requirements?.length || 0) > 0;

    /* Each person's standing against the skill requirement, encoded on the
       preview's 0-100 scale so the steps below can widen through it:
       60-100 meets the queue's minimum (fit decides the order), 20-59 holds
       the skills at one star or more, 0 does not hold them. */
    const stageOf = (m: any) => queueSkillStage(memberSkills[String(m?.user_uuid || '')], routing);
    const ratingFor = (m: any) => {
      if (!required) return 100;
      const fit = queueSkillFit(memberSkills[String(m?.user_uuid || '')], routing);
      const stage = stageOf(m);
      if (stage === 2) return 60 + Math.round(fit * 40);
      if (stage === 1) return 20 + Math.round(fit * 20);
      return 0;
    };

    /* The rounds. With skills, widening drops the bar one notch per round -
       the queue's minimum, then one star, then none - exactly as the queue
       picker does. A bar nobody on the roster meets is skipped, as the picker
       ignores it too, so the preview never shows a round that rings nobody
       for a reason that cannot be fixed by waiting. */
    const anyAt = (stage: number) => roster.some((m: any) => stageOf(m) >= stage);
    let steps: { waitSeconds: number; minimumRating?: number }[];
    if (required) {
      const bars: number[] = [];
      if (anyAt(2)) bars.push(60);
      if (routing.min_stars > 1 && anyAt(1)) bars.push(20);
      if (!widening) {
        steps = [{ waitSeconds: 0, ...(bars.length ? { minimumRating: bars[0] } : {}) }];
      } else {
        steps = [...bars.map((b) => ({ waitSeconds: widenAfter, minimumRating: b })), { waitSeconds: 0 }];
      }
    } else {
      /* Two steps only when widening is switched on. With it off the queue
         rings one group for the whole wait, and a second step would be a lie. */
      const minimumRating = Number(escalation?.minimum_rating);
      const firstStep =
        Number.isFinite(minimumRating) && minimumRating > 0
          ? { waitSeconds: widenAfter, minimumRating }
          : { waitSeconds: widenAfter };
      steps = widening ? [firstStep, { waitSeconds: 0 }] : [{ waitSeconds: 0 }];
    }

    const list: AcdAgent[] = roster.map((m: any, i: number) => ({
      id: String(m?.value ?? m?.uuid ?? i),
      name: String(m?.label ?? m?.name ?? m?.first_name ?? 'Someone')
        .split('/')[0]
        .trim(),
      state: 'available',
      rating: required ? ratingFor(m) : typeof m?.rating === 'number' ? m.rating : 100,
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
  }, [
    strategyRaw,
    escalation?.enabled,
    escalation?.widen_after_seconds,
    escalation?.minimum_rating,
    members,
    memberSkills,
    routing,
    queueTimeout,
  ]);

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
