import CustomSelect from '@/components/custom/custom-select';
import ServiceLevelCard from './service-level-card';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CustomAvatar from '@/components/custom/custom-avatar';
import { Icon } from '@/assets/icons/icon';
import {
  AFTER_CALL_LIMITS,
  CALLBACK_KEYS,
  ESCALATION_LIMITS,
  MEMBER_TIERS,
  CALL_DISTRIBUTION_DATA,
  DEPARTMENT_RING_STRATEGY_DESC,
  LAST_AGENT_MODES,
  ROUTING_ORDERS,
  ROUTING_PRIORITIES,
  WAITING_LIMITS,
} from '../../constant';
import { Link } from 'react-router-dom';
import {
  SkillOption,
  holdsQueueSkills,
  readRouting,
  useMembersSkills,
  useSkillCategories,
  useSkillsCatalogue,
  widenLadder,
} from '@/hooks/use-queue-skills';
import {
  QueueRouting,
  RequirementRow,
  effectiveRows,
  legacyFromRows,
  normaliseRows,
} from '@/lib/queue-requirements';
import RequirementRows from './requirement-rows';

/* A queue saved before categories existed holds a flat list. Shown as rows
   by category - one per category for "all of them", one row for "any one" -
   until the admin touches it; only then is the list written back as rows. */
const legacyAsRows = (routing: QueueRouting, skills: SkillOption[]): RequirementRow[] => {
  if (routing.requirements?.length || !routing.required_skills.length) return [];
  const byId = new Map(skills.map((s) => [s.value, s]));
  const base = {
    min_stars: routing.min_stars,
    weight: 1,
    relax: { after_seconds: 0, to: 'ladder' as const },
  };
  if (routing.evaluation === 'ANY') {
    const first = byId.get(routing.required_skills[0]);
    return [
      {
        ...base,
        category_id: first?.category_id || '',
        category_name: first?.category_name || '',
        skill_ids: routing.required_skills,
        match: 'ANY',
      },
    ];
  }
  const groups = new Map<string, RequirementRow>();
  routing.required_skills.forEach((id) => {
    const skill = byId.get(id);
    const key = skill?.category_id || '';
    const row = groups.get(key) || {
      ...base,
      category_id: key,
      category_name: skill?.category_name || '',
      skill_ids: [],
      match: 'ALL' as const,
    };
    row.skill_ids.push(id);
    groups.set(key, row);
  });
  return Array.from(groups.values());
};
import { SettingCard, SettingNest, SettingRow } from '@/components/mcm/setting-card';
import RingPreview from '../ring-preview';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import SelectedMemberList from '@/pages/admin-settings/phone-systems/departments/new-department/selected-member-list';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';
import { getRingTimeOptions, seedDeviceRingTime } from '@/lib/company-ring-time';

const RingStrategy = () => {
  const { setValue, watch } = useFormContext();
  const [watchMembers = [], watchRingStrategy] = watch(['members', 'settings.ring_strategy.value']);
  const isRingAllStrategy = watchRingStrategy?.value === 'ring-all';

  /* Same company record, same cache key as the rest of the drawer, so this
     costs no extra request. A member who has never been given a ring time
     starts on the company's number; one who has keeps what was chosen. */
  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    staleTime: 5 * 60 * 1000,
  });
  const companySettings = companyDefaults?.settings;

  const getRingTimeOption = (ringTime: any) => seedDeviceRingTime(ringTime, companySettings);

  /* The rows this queue asks for, and who on it meets them. */
  const routingRaw = watch('settings.routing') || {};
  const routingKey = JSON.stringify(routingRaw);
  const routing = useMemo(() => readRouting(routingRaw), [routingKey]);
  const { options: skillOptions, isLoading: skillsLoading } = useSkillsCatalogue();
  const { rows: categories } = useSkillCategories();
  const { byUser: memberSkills } = useMembersSkills(
    (watchMembers || []).map((m: any) => m?.user_uuid),
  );
  /* Rows on screen: the saved list, or the old flat list as rows until the
     admin touches it. A row without a skill yet lives only in the draft. */
  const savedRows = routing.requirements || [];
  const legacyRows = useMemo(() => legacyAsRows(routing, skillOptions), [routing, skillOptions]);
  const [draft, setDraft] = useState<RequirementRow[] | null>(null);
  const rows: RequirementRow[] = draft ?? (savedRows.length ? savedRows : legacyRows);
  const writeRows = (next: RequirementRow[]) => {
    setDraft(next);
    const kept = normaliseRows(next);
    setValue('settings.routing.requirements', kept, { shouldDirty: true });
    /* The flat fields too, for a picker that has not learnt rows yet. */
    const legacy = legacyFromRows(kept);
    setValue('settings.routing.required_skills', legacy.required_skills, { shouldDirty: true });
    setValue('settings.routing.min_stars', legacy.min_stars, { shouldDirty: true });
    setValue('settings.routing.evaluation', legacy.evaluation, { shouldDirty: true });
  };
  const requiredSkills: string[] = effectiveRows(routing).flatMap((row) => row.skill_ids);
  const holders = (watchMembers || []).filter((m: any) =>
    holdsQueueSkills(memberSkills[String(m?.user_uuid || '')], routing),
  );

  const getRingStrategyLabel = () => {
    const index = CALL_DISTRIBUTION_DATA.findIndex(
      (item) => item?.value === watch('settings.ring_strategy.value')?.value,
    );
    return index !== -1 ? CALL_DISTRIBUTION_DATA?.[index]?.label : '';
  };

  const syncRingAllMemberTimes = (ringTime: any, members = watchMembers) => {
    const nextRingTime = getRingTimeOption(ringTime);

    setValue(
      'members',
      (members || []).map((member: any) => ({
        ...member,
        ring_time: nextRingTime,
      })),
      { shouldValidate: true },
    );
  };

  const handleRingTimeChange = (value: any, index: number) => {
    const nextRingTime = getRingTimeOption(value);

    if (isRingAllStrategy) {
      syncRingAllMemberTimes(nextRingTime);
      return;
    }

    setValue(`members.${index}.ring_time`, nextRingTime, { shouldValidate: true });
  };

  /* Only offered while widening is switched on. A tier column sitting there
     when nothing widens is a control that cannot do anything, and reads as
     broken rather than as unused. */
  const renderTierSelect = (member: any, index: number) => (
    <CustomSelect
      className="w-44"
      options={MEMBER_TIERS}
      handleChange={(value: any) =>
        setValue(`members.${index}.tier`, value?.value ?? 1, { shouldValidate: true })
      }
      value={MEMBER_TIERS.find((tier) => tier.value === (member?.tier ?? 1)) || MEMBER_TIERS[0]}
      menuPlacement="auto"
    />
  );

  const renderRingTimeSelect = (member: any, index: number) => {
    const stored = member?.ring_time ?? member?.timeout;

    return (
      <CustomSelect
        className="w-56"
        /* The list carries the company's number when it is not one of the two
           shipped choices, so a queue sitting on it is a real selection rather
           than a blank box the first click would silently rewrite. */
        options={getRingTimeOptions(companySettings, stored)}
        handleChange={(value) => handleRingTimeChange(value, index)}
        value={getRingTimeOption(stored)}
        placeholder="Select time"
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-col gap-4 px-1 sm:px-3 lg:flex-row lg:items-start lg:gap-5">
        <p className="text-gray-800 text-sm">
          Set how you'd like to answer calls when conditions are met.{' '}
        </p>
        <div className="w-full lg:max-w-[300px] lg:pl-1">
          <CustomSelect
            options={CALL_DISTRIBUTION_DATA}
            handleChange={(value) => {
              setValue('settings.ring_strategy.value', value);
              if (value?.value === 'ring-all') {
                const firstMemberWithRingTime = watchMembers.find(
                  (member: any) => member?.ring_time || member?.timeout,
                );
                const firstMemberRingTime =
                  firstMemberWithRingTime?.ring_time ?? firstMemberWithRingTime?.timeout;

                syncRingAllMemberTimes(firstMemberRingTime);
              }
            }}
            placeholder={'Select ring strategy'}
            className="w-full"
            value={
              watch('settings.ring_strategy.value')?.value
                ? {
                    label: watch('settings.ring_strategy.value')?.label || getRingStrategyLabel(),
                    value: watch('settings.ring_strategy.value')?.value,
                  }
                : { label: '', value: '' }
            }
          />
          <p className="text-gray-800 text-xs mt-3">
            {DEPARTMENT_RING_STRATEGY_DESC[
              watch('settings.ring_strategy.value')
                ?.value as keyof typeof DEPARTMENT_RING_STRATEGY_DESC
            ] || ''}
          </p>
        </div>
      </div>

      {/* What this queue asks for, one row per category. People are rated on
          their profile; the queue service offers only those who meet every
          row, best fit first (or in the ring strategy's order, on "fair"). */}
      <SettingCard
        title="Skills this queue needs"
        description="One row per category. A person must meet every row; inside a row, any one skill will do. Read each row as a sentence."
      >
        <SettingRow
          label="Requirement"
          description={
            rows.length
              ? 'Remove every row and everybody on the queue rings, as before.'
              : 'Leave empty and everybody on the queue rings, as before.'
          }
          status={requiredSkills.length ? 'active' : 'off'}
        >
          <RequirementRows
            rows={rows}
            onChange={writeRows}
            skills={skillOptions}
            categories={categories}
            loading={skillsLoading}
            /* Both live on this screen but outside the rows, and both decide
               whether part of a row does anything. See RequirementRowsProps. */
            order={routing.order}
            escalationEnabled={!!watch('settings.escalation.enabled')}
          />
        </SettingRow>

        <SettingNest when={requiredSkills.length > 0}>
          <SettingRow
            label="Who rings first"
            description={
              ROUTING_ORDERS.find((o) => o.value === routing.order)?.description ||
              ROUTING_ORDERS[0].description
            }
            control={
              <div className="w-56">
                <CustomSelect
                  options={ROUTING_ORDERS}
                  value={ROUTING_ORDERS.find((o) => o.value === routing.order) || ROUTING_ORDERS[0]}
                  handleChange={(picked: any) =>
                    setValue('settings.routing.order', picked?.value === 'fair' ? 'fair' : 'best_first', {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
            }
          />

          <p
            className={`text-xs px-1 ${
              holders.length ? 'text-gray-600' : 'text-amber-700'
            }`}
          >
            {!watchMembers?.length
              ? 'Add members on the Members tab to see who meets these rows.'
              : holders.length
                ? `${holders.length} of ${watchMembers.length} member${
                    watchMembers.length === 1 ? '' : 's'
                  } meet${holders.length === 1 ? 's' : ''} every row and will be offered calls.`
                : 'Nobody on this queue meets these rows yet. A row nobody holds is set aside by the queue until somebody is rated. Rate people on their profile, or change the rows.'}{' '}
            <Link to="/admin-settings/phone/skills" className="text-primary underline">
              Manage skills
            </Link>
          </p>
        </SettingNest>
      </SettingCard>

      {/* Priority between queues. Every waiting call asks the queue picker on
          its own, so two queues sharing a person used to race for them; the
          picker now keeps a free person for the higher-priority caller, or the
          longer-waiting one at the same priority. */}
      <SettingCard
        title="Priority between queues"
        description="When the same people answer for several queues, whose caller gets a free person first."
      >
        <SettingRow
          label="This queue's priority"
          description={
            ROUTING_PRIORITIES.find((o) => o.value === (Number(routing?.priority) || 5))
              ?.description || 'First come, first served across queues.'
          }
          status={(Number(routing?.priority) || 5) === 5 ? 'off' : 'active'}
          control={
            <div className="w-56">
              <CustomSelect
                options={ROUTING_PRIORITIES}
                value={
                  ROUTING_PRIORITIES.find((o) => o.value === (Number(routing?.priority) || 5)) ||
                  ROUTING_PRIORITIES[1]
                }
                handleChange={(picked: any) =>
                  setValue('settings.routing.priority', Number(picked?.value) || 5, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
          }
        />
      </SettingCard>

      {/* Widening the ring rather than failing. Each round adds the next tier
          and, when the queue asks for skills, drops the skill bar one notch
          (the queue's minimum, then one star, then none). The queue picker
          does exactly this, in lockstep, every widen_after_seconds. */}
      <SettingCard
        title="Widening the ring"
        description="What happens when the first group of people does not pick up."
      >
        <SettingRow
          label="Widen the ring if nobody answers"
          description={
            requiredSkills.length
              ? 'Each round adds the next tier. A row set to follow the ring drops one notch each round; the other rows keep their own clock. People are added, never swapped out.'
              : 'Start with tier 1, then bring in the next tier. People are added, never swapped out, so the first group keeps ringing.'
          }
          status={watch('settings.escalation.enabled') ? 'active' : 'off'}
          control={
            <Switch
              checked={!!watch('settings.escalation.enabled')}
              onCheckedChange={(checked: boolean) =>
                setValue('settings.escalation.enabled', checked)
              }
            />
          }
        />

        <SettingNest when={!!watch('settings.escalation.enabled')}>
          <SettingRow
            label="Widen after (seconds)"
            description="How long the first group rings before more people are added. Below fifteen seconds nobody has had a fair chance to answer."
            control={
              <Input
                type="number"
                min={ESCALATION_LIMITS.widen_after_seconds.min}
                max={ESCALATION_LIMITS.widen_after_seconds.max}
                value={watch('settings.escalation.widen_after_seconds') ?? ''}
                onChange={(event) =>
                  setValue('settings.escalation.widen_after_seconds', Number(event.target.value))
                }
              />
            }
          />

          {requiredSkills.length > 0 && (
            <ol className="text-xs text-gray-600 px-1 flex flex-col gap-0.5">
              {widenLadder({
                tiers: (watchMembers || []).map((m: any) => Number(m?.tier) || 1),
                routing,
                widenAfterSeconds: Number(watch('settings.escalation.widen_after_seconds')) || 30,
              }).map((r) => (
                <li key={r.round} className="tabular-nums">
                  <span className="font-medium text-gray-800">Round {r.round}</span>
                  {r.fromSeconds ? ` from ${r.fromSeconds}s` : ' at once'}:{' '}
                  {r.tiersUpTo > 1 ? `tiers 1–${r.tiersUpTo}` : 'tier 1'},{' '}
                  {effectiveRows(routing)
                    .map(
                      (row, i) =>
                        `${row.category_name || 'skills'} ${
                          r.bars[i] > 0
                            ? `at ${r.bars[i] === 1 ? '1 star' : `${r.bars[i]}+ stars`}`
                            : 'dropped'
                        }`,
                    )
                    .join(' · ')}
                </li>
              ))}
            </ol>
          )}
        </SettingNest>
      </SettingCard>

      <RingPreview />

      {/* Who the queue prefers to ring, and what it is measured against.
          Last agent sends a repeat caller back to whoever they spoke to last —
          both reference platforms have it, we had nothing. It always falls back
          to normal routing when that person is not free: holding a caller for
          one person is a choice, never a side effect.
          Last agent is honoured by the queue picker (it looks the repeat caller
          up and tries that person first, alone, then routes normally). The
          answering target used to sit here too; it is its own card below,
          because it changes how the queue is judged, not who rings. */}
      <SettingCard
        title="Who to prefer"
        description="A choice a supervisor makes about the queue rather than about a single call."
      >
        <SettingRow
          label="Send them back to the person they spoke to last"
          description="Familiar voice, no repeating themselves. If that person is busy or signed out the call routes normally - nobody waits for one agent unless you ask for it."
          status={
            watch('settings.after_call.last_agent.mode') &&
            watch('settings.after_call.last_agent.mode') !== 'DISABLED'
              ? 'active'
              : 'off'
          }
          control={
            <CustomSelect
              options={LAST_AGENT_MODES}
              handleChange={(value: any) =>
                setValue('settings.after_call.last_agent.mode', value?.value || 'DISABLED')
              }
              value={
                LAST_AGENT_MODES.find(
                  (mode) => mode.value === watch('settings.after_call.last_agent.mode'),
                ) || LAST_AGENT_MODES[0]
              }
              menuPlacement="auto"
            />
          }
        />

        <SettingNest when={watch('settings.after_call.last_agent.mode') !== 'DISABLED'}>
          <SettingRow
            label="Only within (hours)"
            description="After this long, treat it as a new call and route it normally."
            control={
              <Input
                type="number"
                min={AFTER_CALL_LIMITS.window_hours.min}
                max={AFTER_CALL_LIMITS.window_hours.max}
                value={watch('settings.after_call.last_agent.window_hours') ?? ''}
                onChange={(event) =>
                  setValue(
                    'settings.after_call.last_agent.window_hours',
                    Number(event.target.value),
                  )
                }
              />
            }
          />
        </SettingNest>
      </SettingCard>

      <ServiceLevelCard />

      {/* What happens while somebody waits.
          The position announcement and the wait estimate are both real: the
          switch says the position, and the queue service works the estimate
          out from the people on duty and how long this queue's calls take.
          The callback is real too: the switch makes the offer on the same
          clock, takes the number, and the queue service keeps the caller's
          place and rings them back (customer first, then an agent) through
          the same path an outbound campaign call takes. */}
      <SettingCard
        title="While the caller waits"
        description="What somebody hears, and what they can do, between joining the line and being answered."
      >
        <SettingRow
          label="Tell them where they are in the line"
          description="Callers who know they are third wait more willingly than callers who know nothing. The switch reads this and says the position while they wait."
          status="active"
          control={
            <Switch
              checked={!!watch('settings.waiting.announce_position')}
              onCheckedChange={(checked: boolean) =>
                setValue('settings.waiting.announce_position', checked)
              }
            />
          }
        />

        <SettingRow
          label="Tell them roughly how long"
          description="The queue works it out from the people on duty and how long its own calls take, and says it every minute or so. Nothing is said while it cannot be worked out honestly."
          status={watch('settings.waiting.announce_wait_time') ? 'active' : 'off'}
          control={
            <Switch
              checked={!!watch('settings.waiting.announce_wait_time')}
              onCheckedChange={(checked: boolean) =>
                setValue('settings.waiting.announce_wait_time', checked)
              }
            />
          }
        />

        <SettingRow
          label="Offer to call them back"
          description="Instead of holding, a caller can press a key, confirm their number and hang up. They keep their place in the line; when their turn comes the queue rings them, and once they accept, an agent."
          status={watch('settings.waiting.callback.enabled') ? 'active' : 'off'}
          control={
            <Switch
              checked={!!watch('settings.waiting.callback.enabled')}
              onCheckedChange={(checked: boolean) =>
                setValue('settings.waiting.callback.enabled', checked)
              }
            />
          }
        />

        <SettingNest when={!!watch('settings.waiting.callback.enabled')}>
          <SettingRow
            label="Offer it when more than this many are ahead"
            description="0 means the number of callers is not used."
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.offer_after_callers.min}
                max={WAITING_LIMITS.offer_after_callers.max}
                value={watch('settings.waiting.callback.offer_after_callers') ?? ''}
                onChange={(event) =>
                  setValue('settings.waiting.callback.offer_after_callers', Number(event.target.value))
                }
              />
            }
          />
          <SettingRow
            label="Or once the wait passes this many minutes"
            description="Measured so far, or as estimated. 0 means the wait is not used. With both at 0 the offer is never made."
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.offer_after_minutes.min}
                max={WAITING_LIMITS.offer_after_minutes.max}
                value={watch('settings.waiting.callback.offer_after_minutes') ?? ''}
                onChange={(event) =>
                  setValue('settings.waiting.callback.offer_after_minutes', Number(event.target.value))
                }
              />
            }
          />
          <SettingRow
            label="Key to press"
            description="What the caller presses to ask for the callback. Keep it clear of any key a menu on this queue already uses."
            control={
              <CustomSelect
                options={CALLBACK_KEYS}
                handleChange={(value: any) =>
                  setValue('settings.waiting.callback.key', value?.value || '1')
                }
                value={
                  CALLBACK_KEYS.find((key) => key.value === watch('settings.waiting.callback.key')) ||
                  CALLBACK_KEYS[0]
                }
                menuPlacement="auto"
              />
            }
          />
          <SettingRow
            label="Confirm the number first"
            description="Read back the number they called from and ask before taking it. Off means it is taken as it is. A withheld number is always asked for."
            control={
              <Switch
                checked={watch('settings.waiting.callback.confirm_number') !== false}
                onCheckedChange={(checked: boolean) =>
                  setValue('settings.waiting.callback.confirm_number', checked)
                }
              />
            }
          />
          <SettingRow
            label="Return call attempts"
            description="How many times to ring them back before giving up. A missed attempt keeps their place."
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.max_attempts.min}
                max={WAITING_LIMITS.max_attempts.max}
                value={watch('settings.waiting.callback.max_attempts') ?? ''}
                onChange={(event) =>
                  setValue('settings.waiting.callback.max_attempts', Number(event.target.value))
                }
              />
            }
          />
          <SettingRow
            label="Minutes between attempts"
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.retry_after_minutes.min}
                max={WAITING_LIMITS.retry_after_minutes.max}
                value={watch('settings.waiting.callback.retry_after_minutes') ?? ''}
                onChange={(event) =>
                  setValue('settings.waiting.callback.retry_after_minutes', Number(event.target.value))
                }
              />
            }
          />
          <SettingRow
            label="Give up after this many hours"
            description="A request nobody could reach by then is closed."
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.expires_after_hours.min}
                max={WAITING_LIMITS.expires_after_hours.max}
                value={watch('settings.waiting.callback.expires_after_hours') ?? ''}
                onChange={(event) =>
                  setValue('settings.waiting.callback.expires_after_hours', Number(event.target.value))
                }
              />
            }
          />
        </SettingNest>
      </SettingCard>

      <div className="w-full">
        <p className="font-semibold text-gray-900 truncate text-md mb-2">Call Queue Members</p>
        {watch('settings.ring_strategy.value')?.value === 'top-down' ? (
          <>
            <div className="w-full lg:w-2/3">
              <div className="flex flex-col gap-2 overflow-auto border border-gray-200 rounded-xl">
                <Table className="w-full text-sm text-gray-700 h-full ">
                  <TableHeader className="bg-gray-100/40 text-gray-90/80">
                    <TableRow>
                      <TableHead className="px-4 py-2 font-medium text-left "></TableHead>

                      <TableHead className="px-4 py-2 font-medium text-left ">Name</TableHead>
                      <TableHead className="px-4 py-2 font-medium text-left ">Ring For</TableHead>
                      {watch('settings.escalation.enabled') && (
                        <TableHead className="px-4 py-2 font-medium text-left ">Tier</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody className="bg-white w-full font-normal">
                    <SelectedMemberList
                      {...{
                        members: watchMembers,
                        setValue,
                        renderRight: renderRingTimeSelect,
                      }}
                    />
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full lg:w-2/3">
            <div className="flex flex-col gap-2 overflow-auto border border-gray-200 rounded-xl">
              <Table className="w-full text-sm text-gray-700 h-full ">
                <TableHeader className="bg-gray-100/40 text-gray-90/80">
                  <TableRow>
                    <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                      Name
                    </TableHead>
                    <TableHead className="px-4 py-2 font-medium text-left text-text-gray-90/80">
                      Ring For
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-200 bg-white w-full font-normal">
                  {watchMembers.map((data: any, index: any) => {
                    const fullName = data?.last_name
                      ? `${data?.first_name} ${data?.last_name}`
                      : data?.label;

                    return (
                      <TableRow key={`${data?.user_uuid}-${index}`} className="h-8">
                        <TableCell className="px-4 py-2 border-b">
                          <div className="flex items-center gap-3">
                            <CustomAvatar
                              name={fullName}
                              showPresence
                              extension={data?.value}
                              image={data?.profile}
                            />
                            <div className="flex flex-col w-full">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="capitalize font-medium text-sm">{fullName}</p>
                                  <p className="text-primary text-[11px]">{data?.role}</p>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500 text-sm">
                                  <Icon name="Grid" className="w-4 h-4" />
                                  <span>{data?.value}</span>
                                </div>
                              </div>
                              {data?.email && (
                                <p className="text-gray-500 text-[11px] truncate">{data?.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b align-middle">
                          {renderRingTimeSelect(data, index)}
                        </TableCell>
                        {watch('settings.escalation.enabled') && (
                          <TableCell className="px-4 py-2 border-b align-middle">
                            {renderTierSelect(data, index)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RingStrategy;
