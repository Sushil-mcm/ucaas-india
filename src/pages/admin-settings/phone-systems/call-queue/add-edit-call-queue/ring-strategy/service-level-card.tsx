import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SettingCard, SettingGrid, SettingNest, SettingRow } from '@/components/mcm/setting-card';
import { AFTER_CALL_LIMITS } from '../../constant';

/**
 * The queue's answering target, and what counts as a real abandon.
 *
 * This used to be two rows at the bottom of "Who to prefer, and the target",
 * beside last-agent routing. They are not the same kind of decision: last agent
 * changes who rings; the target changes nothing about the call and everything
 * about how the queue is judged afterwards. A supervisor looking for "what are
 * we measured against" should not have to find it under a routing heading.
 *
 * Every word about reach here is checked, not hoped. The target is read by the
 * Queue report (server-side, per queue, since 9 Sep 2026) and by Performance
 * in this app. The short-abandon floor is applied by this app's Performance
 * reports; the Queue report's own server-side figures do not apply it yet, so
 * that row says so rather than claiming otherwise.
 */
const ServiceLevelCard = () => {
  const { setValue, watch } = useFormContext();
  const enabled = !!watch('settings.after_call.service_level.enabled');

  return (
    <SettingCard
      title="Answering target"
      description="What this queue is measured against. It changes no call; it changes how the numbers are read."
      note="The Queue report and Performance both measure this queue against these seconds. Without a target of your own, the platform's 80% in 20 seconds stands in."
    >
      <SettingRow
        label="Set a target for answering"
        description="Reports show the service level against your goal instead of a bare average, so a supervisor sees a number and whether it is good enough."
        status={enabled ? 'active' : 'off'}
        control={
          <Switch
            checked={enabled}
            onCheckedChange={(checked: boolean) =>
              setValue('settings.after_call.service_level.enabled', checked, {
                shouldValidate: true,
              })
            }
          />
        }
      />

      <SettingNest when={enabled}>
        <SettingGrid>
          <Input
            label="Answer this share of calls (%)"
            type="number"
            min={AFTER_CALL_LIMITS.percent.min}
            max={AFTER_CALL_LIMITS.percent.max}
            value={watch('settings.after_call.service_level.percent') ?? ''}
            onChange={(event) =>
              setValue('settings.after_call.service_level.percent', Number(event.target.value), {
                shouldValidate: true,
              })
            }
          />
          <Input
            label="Within this many seconds"
            type="number"
            min={AFTER_CALL_LIMITS.seconds.min}
            max={AFTER_CALL_LIMITS.seconds.max}
            value={watch('settings.after_call.service_level.seconds') ?? ''}
            onChange={(event) =>
              setValue('settings.after_call.service_level.seconds', Number(event.target.value), {
                shouldValidate: true,
              })
            }
          />
        </SettingGrid>
      </SettingNest>

      {/* Outside the nest on purpose: a misdial is a misdial whether or not the
          queue has set itself a target, so the floor must stay reachable. */}
      <SettingRow
        label="Ignore hang-ups faster than (seconds)"
        description="A caller who rings off this quickly dialled the wrong number or changed their mind. Those calls are left out of the abandon rate and the service level, so a run of instant failures does not read as customers losing patience. Zero counts every hang-up."
        status="app-only"
        control={
          <Input
            type="number"
            min={AFTER_CALL_LIMITS.short_abandon.min}
            max={AFTER_CALL_LIMITS.short_abandon.max}
            value={watch('settings.after_call.service_level.short_abandon_seconds') ?? ''}
            onChange={(event) =>
              setValue(
                'settings.after_call.service_level.short_abandon_seconds',
                Number(event.target.value),
                { shouldValidate: true },
              )
            }
          />
        }
      />
    </SettingCard>
  );
};

export default ServiceLevelCard;
