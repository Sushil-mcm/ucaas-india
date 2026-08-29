import CustomSelect from '@/components/custom/custom-select';
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
  ESCALATION_LIMITS,
  MEMBER_TIERS,
  CALL_DISTRIBUTION_DATA,
  DEPARTMENT_RING_STRATEGY_DESC,
  LAST_AGENT_MODES,
  WAITING_LIMITS,
} from '../../constant';
import { SettingCard, SettingGrid, SettingNest, SettingRow } from '@/components/mcm/setting-card';
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

      {/* Widening the ring rather than failing.
          Established systems ring the best people first and then add more after
          a timer. Their version can also drop a skill requirement as it widens;
          we have no skills, so the honest half is tiers. Everyone on tier 1
          behaves exactly as the queue does today, which is the default. */}
      <SettingCard
        title="Widening the ring"
        description="What happens when the first group of people does not pick up."
      >
        <SettingRow
          label="Widen the ring if nobody answers"
          description="Start with tier 1, then bring in the next tier. People are added, never swapped out, so the first group keeps ringing."
          notActive
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
            label="Add the next tier after (seconds)"
            description="Set each member's tier in the list below. Anyone left on tier 1 rings from the start."
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
        </SettingNest>
      </SettingCard>

      <RingPreview />

      {/* Who the queue prefers to ring, and what it is measured against.
          Last agent sends a repeat caller back to whoever they spoke to last —
          both reference platforms have it, we had nothing. It always falls back
          to normal routing when that person is not free: holding a caller for
          one person is a choice, never a side effect.
          Service level gives reporting a target, so a supervisor sees a number
          against a goal instead of a bare average.
          Stored, not yet acted on. */}
      <SettingCard
        title="Who to prefer, and the target"
        description="Two choices a supervisor makes about the queue rather than about a single call."
      >
        <SettingRow
          label="Send them back to the person they spoke to last"
          description="Familiar voice, no repeating themselves. If that person is busy or signed out the call routes normally - nobody waits for one agent unless you ask for it."
          notActive
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

        <SettingRow
          label="Set a target for answering"
          description="Reporting compares against this instead of showing a bare average, so a supervisor sees a number against a goal."
          notActive
          control={
            <Switch
              checked={!!watch('settings.after_call.service_level.enabled')}
              onCheckedChange={(checked: boolean) =>
                setValue('settings.after_call.service_level.enabled', checked)
              }
            />
          }
        />

        <SettingNest when={!!watch('settings.after_call.service_level.enabled')}>
          <SettingGrid>
            <Input
              label="Answer this share of calls (%)"
              type="number"
              min={AFTER_CALL_LIMITS.percent.min}
              max={AFTER_CALL_LIMITS.percent.max}
              value={watch('settings.after_call.service_level.percent') ?? ''}
              onChange={(event) =>
                setValue('settings.after_call.service_level.percent', Number(event.target.value))
              }
            />
            <Input
              label="Within this many seconds"
              type="number"
              min={AFTER_CALL_LIMITS.seconds.min}
              max={AFTER_CALL_LIMITS.seconds.max}
              value={watch('settings.after_call.service_level.seconds') ?? ''}
              onChange={(event) =>
                setValue('settings.after_call.service_level.seconds', Number(event.target.value))
              }
            />
          </SettingGrid>
        </SettingNest>
      </SettingCard>

      {/* What happens while somebody waits.
          Established systems all do three things here that we did not: offer a
          callback so the caller can hang up and keep their place, tell them
          where they are in the line, and repeat a message on a timer.
          These controls store the choice. Nothing acts on them yet — the call
          path has no queue-depth counter, no rolling handle time and no callback
          scheduler — so each block says so rather than letting an admin believe
          it is switched on. */}
      <SettingCard
        title="While the caller waits"
        description="What somebody hears, and what they can do, between joining the line and being answered."
      >
        <SettingRow
          label="Tell them where they are in the line"
          description="Callers who know they are third wait more willingly than callers who know nothing."
          notActive
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
          description="An estimate from how long recent calls have taken. Better a rough number than silence."
          notActive
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
          description="They hang up and keep their place. The queue rings them when their turn comes, so a long wait does not have to be spent holding."
          notActive
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
            label="Offer it once this many are waiting"
            description="Below this, callers are likely to be answered quickly enough that offering would be a nuisance."
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.offer_after_callers.min}
                max={WAITING_LIMITS.offer_after_callers.max}
                value={watch('settings.waiting.callback.offer_after_callers') ?? ''}
                onChange={(event) =>
                  setValue(
                    'settings.waiting.callback.offer_after_callers',
                    Number(event.target.value),
                  )
                }
              />
            }
          />
          <SettingRow
            label="Or once the wait passes (minutes)"
            description="Whichever happens first."
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.offer_after_minutes.min}
                max={WAITING_LIMITS.offer_after_minutes.max}
                value={watch('settings.waiting.callback.offer_after_minutes') ?? ''}
                onChange={(event) =>
                  setValue(
                    'settings.waiting.callback.offer_after_minutes',
                    Number(event.target.value),
                  )
                }
              />
            }
          />
          <SettingRow
            label="Try this many times"
            description="If nobody picks up when the queue rings them back."
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
            label="Wait between tries (minutes)"
            description="Long enough that a second ring is not an annoyance."
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.retry_after_minutes.min}
                max={WAITING_LIMITS.retry_after_minutes.max}
                value={watch('settings.waiting.callback.retry_after_minutes') ?? ''}
                onChange={(event) =>
                  setValue(
                    'settings.waiting.callback.retry_after_minutes',
                    Number(event.target.value),
                  )
                }
              />
            }
          />
          <SettingRow
            label="Give up after (hours)"
            description="Past this the callback is dropped rather than ringing somebody about a problem from yesterday."
            control={
              <Input
                type="number"
                min={WAITING_LIMITS.expires_after_hours.min}
                max={WAITING_LIMITS.expires_after_hours.max}
                value={watch('settings.waiting.callback.expires_after_hours') ?? ''}
                onChange={(event) =>
                  setValue(
                    'settings.waiting.callback.expires_after_hours',
                    Number(event.target.value),
                  )
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
