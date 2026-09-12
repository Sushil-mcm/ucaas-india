import CustomSelect from '@/components/custom/custom-select';
import CommonGreetingNotification from '@/components/common-greetings';
import { Switch } from '@/components/ui/switch';
import { GreetingItem, useGetGreetings } from '@/hooks/common';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { FC, useMemo } from 'react';
import { CALL_DISTRIBUTION_DATA } from '@/pages/admin-settings/phone-systems/call-queue/constant';
import { useFormContext } from 'react-hook-form';
import { isCampaignLocked } from '../consts';

/**
 * What happens when a customer calls the campaign's number.
 *
 * Every campaign has its own queue (its team), made when the campaign is
 * saved. A lead who calls the outgoing number back always reaches that team,
 * tagged with their record. This step adds the rest: send everyone who calls
 * the number to the team while the campaign runs, what they hear, and where
 * they go outside the calling hours.
 */
const InboundAndCallbacks: FC<{ campaignStatus?: string; inventoryNumberList?: any[] }> = ({
  campaignStatus,
  inventoryNumberList = [],
}) => {
  const { watch, setValue } = useFormContext<any>();
  const { greetingList } = useGetGreetings();
  const locked = isCampaignLocked(campaignStatus, watch('dialMethod'));

  const callerIds: string[] = (watch('callerId') || []).map((c: any) => c?.value || c);
  const members: any[] = watch('members') || [];
  const routeNumber = Boolean(watch('inbound.route_number'));
  const closedType = watch('inbound.closed.type') || 'NONE';
  const closedValue = watch('inbound.closed');

  const numberRows = useMemo(
    () =>
      callerIds
        .map((num) => {
          const digits = String(num || '').replace(/\D/g, '');
          const row = (inventoryNumberList || []).find(
            (r: any) => String(r?.did_number || '').replace(/\D/g, '') === digits,
          );
          let currentRule: any = null;
          try {
            const raw = row?.forward_call_actions;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            currentRule = parsed?.call_handling?.business_hours || null;
          } catch {
            currentRule = null;
          }
          return { number: num, row, currentRule };
        })
        .filter((n) => n.number),
    [callerIds, inventoryNumberList],
  );

  const optionsData: Record<string, GreetingItem[]> = { welcome: greetingList, hold: greetingList };
  const slots = [
    /* The shared control phrases these as: Do you want to add "<label> message"? */
    { name: 'welcome', placeholder: 'Greeting', label: 'a greeting' },
    { name: 'hold', placeholder: 'On hold music', label: 'a hold music' },
  ];

  const memberOptions: ISELECTVALUE[] = members
    .filter((m) => m?.extension || m?.value)
    .map((m) => ({
      label: `${m?.label || m?.name || m?.username || 'Team member'}${m?.extension ? ` (${m.extension})` : ''}`,
      value: String(m?.extension || ''),
    }))
    .filter((m) => m.value);

  const closedOptions: ISELECTVALUE[] = [
    { label: 'Keep ringing the team (default)', value: 'NONE' },
    ...memberOptions.map((m) => ({ label: `Voicemail of ${m.label}`, value: `VOICEMAIL:${m.value}`, extLabel: m.label })),
  ] as any;

  const closedSelected =
    closedType === 'VOICEMAIL' && closedValue?.value
      ? closedOptions.find((o) => o.value === `VOICEMAIL:${closedValue.value}`) || closedOptions[0]
      : closedOptions[0];

  const describeRule = (rule: any) => {
    if (!rule || !rule.type) return 'no rule yet';
    const label = rule.label || rule.name || rule.value || '';
    const type = String(rule.type).toUpperCase();
    const words: Record<string, string> = {
      EXTENSION: 'rings',
      PHONE: 'forwards to',
      QUEUE: 'goes to queue',
      IVR: 'goes to menu',
      DEPARTMENT: 'goes to group',
      VOICEMAIL: 'goes to voicemail of',
      HANGUP: 'hangs up',
    };
    return `${words[type] || type.toLowerCase()} ${label}`.trim();
  };

  return (
    <div className="flex w-full flex-col gap-5 overflow-auto h-[calc(100vh_-_22.5rem)] pr-1">
      <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3 text-sm text-gray-700">
        <p className="font-medium text-gray-900">Your campaign already has a team line.</p>
        <p className="mt-1">
          When a lead calls the campaign number back, the call goes to this campaign's team and is
          tagged with their record. Nothing to set up for that. Below is what to do with everyone
          else who calls the number while the campaign runs, and what callers hear.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-gray-900 font-medium text-sm">Send all calls to the campaign number to this team while it runs</p>
          <Switch
            disabled={locked || numberRows.length === 0}
            checked={routeNumber}
            onCheckedChange={(checked) => setValue('inbound.route_number', checked, { shouldDirty: true })}
          />
        </div>
        {numberRows.length === 0 ? (
          <p className="text-xs text-gray-500">Pick an outgoing number on the Campaign step first.</p>
        ) : (
          <ul className="text-xs text-gray-600 flex flex-col gap-1">
            {numberRows.map((n) => (
              <li key={n.number}>
                <span className="font-medium text-gray-800">{n.number}</span> today {describeRule(n.currentRule)}.
                {routeNumber ? ' While the campaign runs it will go to the campaign team; the old rule is kept and can be put back from the campaign page.' : ''}
                {!n.row ? ' This number is not in your inventory, so it cannot be re-routed.' : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-gray-900 font-medium text-sm">What callers hear</p>
        <CommonGreetingNotification
          mediaOptionsGreetingNotifications={slots}
          optionsData={optionsData}
          customClass="h-auto"
        />
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-gray-900 font-medium text-sm">How the team is rung</p>
        <p className="text-xs text-gray-500">Applies to callers waiting for this team. The deeper queue controls are under Admin, Call queues.</p>
        <div className="max-w-md">
          <CustomSelect
            isDisabled={locked}
            options={CALL_DISTRIBUTION_DATA}
            value={watch('inbound.ring_strategy') || CALL_DISTRIBUTION_DATA[0]}
            handleChange={(e: any) => setValue('inbound.ring_strategy', e || CALL_DISTRIBUTION_DATA[0], { shouldDirty: true })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-gray-900 font-medium text-sm">Outside the calling hours</p>
        <p className="text-xs text-gray-500">
          The hours on the previous step apply to callers too. When the team is closed, send callers to:
        </p>
        <div className="max-w-md">
          <CustomSelect
            isDisabled={locked}
            options={closedOptions}
            value={closedSelected}
            handleChange={(e: any) => {
              const v = String(e?.value || 'NONE');
              if (v.startsWith('VOICEMAIL:')) {
                setValue('inbound.closed', { type: 'VOICEMAIL', value: v.slice('VOICEMAIL:'.length), label: e?.extLabel || e?.label || '' }, { shouldDirty: true });
              } else {
                setValue('inbound.closed', { type: 'NONE', value: '', label: '' }, { shouldDirty: true });
              }
            }}
          />
        </div>
        {memberOptions.length === 0 ? (
          <p className="text-xs text-gray-500">Add people on the Team step to offer their voicemail here.</p>
        ) : null}
      </section>
    </div>
  );
};

export default InboundAndCallbacks;
