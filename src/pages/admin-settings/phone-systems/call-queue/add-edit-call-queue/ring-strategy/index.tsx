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
  CALL_DISTRIBUTION_DATA,
  DEPARTMENT_RING_STRATEGY_DESC,
  LAST_AGENT_MODES,
  WAITING_LIMITS,
} from '../../constant';
import { Input } from '@/components/ui/input';
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

      {/* Who the queue prefers to ring, and what it is measured against.
          Last agent sends a repeat caller back to whoever they spoke to last —
          both reference platforms have it, we had nothing. It always falls back
          to normal routing when that person is not free: holding a caller for
          one person is a choice, never a side effect.
          Service level gives reporting a target, so a supervisor sees a number
          against a goal instead of a bare average.
          Stored, not yet acted on. */}
      <div className="w-full px-1 sm:px-3">
        <p className="font-semibold text-gray-900 text-md mb-1">Who to prefer, and the target</p>
        <p className="text-gray-600 text-xs mb-3">Saved with the queue, but not in effect yet.</p>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-900 mb-2">
              Send them back to the person they spoke to last
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CustomSelect
                label="When to do it"
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
              {watch('settings.after_call.last_agent.mode') !== 'DISABLED' && (
                <Input
                  label="Only if they called within (hours)"
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
              )}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              If that person is busy or signed out, the call routes normally. Nobody is left
              waiting for one agent unless you ask for it.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!watch('settings.after_call.service_level.enabled')}
                onChange={(event) =>
                  setValue('settings.after_call.service_level.enabled', event.target.checked)
                }
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Set a target for answering
                </span>
                <span className="block text-xs text-gray-600">
                  Reporting compares against this instead of showing a bare average.
                </span>
              </span>
            </label>

            {watch('settings.after_call.service_level.enabled') && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Answer this share of calls (%)"
                  type="number"
                  min={AFTER_CALL_LIMITS.percent.min}
                  max={AFTER_CALL_LIMITS.percent.max}
                  value={watch('settings.after_call.service_level.percent') ?? ''}
                  onChange={(event) =>
                    setValue(
                      'settings.after_call.service_level.percent',
                      Number(event.target.value),
                    )
                  }
                />
                <Input
                  label="Within this many seconds"
                  type="number"
                  min={AFTER_CALL_LIMITS.seconds.min}
                  max={AFTER_CALL_LIMITS.seconds.max}
                  value={watch('settings.after_call.service_level.seconds') ?? ''}
                  onChange={(event) =>
                    setValue(
                      'settings.after_call.service_level.seconds',
                      Number(event.target.value),
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What happens while somebody waits.
          Established systems all do three things here that we did not: offer a
          callback so the caller can hang up and keep their place, tell them
          where they are in the line, and repeat a message on a timer.
          These controls store the choice. Nothing acts on them yet — the call
          path has no queue-depth counter, no rolling handle time and no callback
          scheduler — so each block says so rather than letting an admin believe
          it is switched on. */}
      <div className="w-full px-1 sm:px-3">
        <p className="font-semibold text-gray-900 text-md mb-1">While the caller waits</p>
        <p className="text-gray-600 text-xs mb-3">
          Saved with the queue, but not in effect yet. The call path needs to be able to count the
          line before any of it can happen.
        </p>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!watch('settings.waiting.announce_position')}
                onChange={(event) =>
                  setValue('settings.waiting.announce_position', event.target.checked)
                }
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Tell them their place in the line
                </span>
                <span className="block text-xs text-gray-600">
                  Skipped when the wait is under two minutes — it only delays the answer.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer mt-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!watch('settings.waiting.announce_wait_time')}
                onChange={(event) =>
                  setValue('settings.waiting.announce_wait_time', event.target.checked)
                }
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Tell them how long the wait is
                </span>
                <span className="block text-xs text-gray-600">
                  Rounded, and said nothing at all when the estimate cannot be trusted. A wrong
                  number is worse than no number.
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!watch('settings.waiting.callback.enabled')}
                onChange={(event) =>
                  setValue('settings.waiting.callback.enabled', event.target.checked)
                }
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Offer to call them back
                </span>
                <span className="block text-xs text-gray-600">
                  They hang up and keep their place. An agent is found first, then the customer is
                  dialled, so nobody answers to silence.
                </span>
              </span>
            </label>

            {watch('settings.waiting.callback.enabled') && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Offer it once this many are waiting"
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
                <Input
                  label="Or once the wait passes (minutes)"
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
                <Input
                  label="Try this many times"
                  type="number"
                  min={WAITING_LIMITS.max_attempts.min}
                  max={WAITING_LIMITS.max_attempts.max}
                  value={watch('settings.waiting.callback.max_attempts') ?? ''}
                  onChange={(event) =>
                    setValue('settings.waiting.callback.max_attempts', Number(event.target.value))
                  }
                />
                <Input
                  label="Wait between tries (minutes)"
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
                <Input
                  label="Give up after (hours)"
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
                <p className="text-xs text-gray-600 sm:col-span-2">
                  Set either threshold to zero to ignore it. Both zero means the offer never goes
                  out. Outside opening hours a callback waits until the queue opens again.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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
