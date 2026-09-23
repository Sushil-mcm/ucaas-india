import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, User, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Loader from '@/components/custom/loader';
import { SectionHeading } from './section-heading';
import { SectionActions } from './section-actions';
import { handleAlert } from '@/lib/utils';
import { saveSection } from '@/lib/company-settings-api';
import { DUTY_POLICY_SECTION, DutyPolicy, LOCKED_SENTENCE } from '@/lib/workday-permissions';
import { DUTY_POLICY_QUERY_KEY, useDutyPolicy } from '@/hooks/use-agent-duty';

/* Company › Duty policy.
 *
 * Two switches, one object (`duty_policy`, schema_version 1).
 *
 * "Agents may change their own duty" (start and end their shift, take a
 * break). On - the default - they may. Off, an agent's duty chip is a
 * read-out with the sentence "Your supervisor sets your status", and the
 * server refuses the change for the AGENT role; admins and the account owner
 * are never locked, so somebody can still set each person's duty from
 * Performance › Agents. Company-wide, like the break reasons: a lock that
 * differed per queue would leave the same person locked in one and free in
 * another.
 *
 * "Supervisors may change an agent's duty". Off by default. A supervisor
 * reaches the people in their groups but administers nobody; this is the one
 * thing the company can hand them beyond watching. Stored as
 * `supervisor_may_change_duty` beside the lock; a policy saved before the
 * switch existed reads as off. */
/* The two switches combine into one answer — who may actually set a duty —
   and a plain list of them never states it. These say it outright. */
const Holder = ({
  icon: Icon,
  label,
  state,
}: {
  icon: typeof User;
  label: string;
  state: 'on' | 'off' | 'always';
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
      state === 'off'
        ? 'border-gray-200 bg-gray-50 text-gray-400 line-through decoration-gray-300'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }`}
  >
    <Icon className="size-3.5 shrink-0" />
    {label}
    {state === 'always' ? (
      <span className="font-normal text-emerald-600/70">· always</span>
    ) : null}
  </span>
);

const Permission = ({
  icon: Icon,
  title,
  description,
  on,
  onToggle,
}: {
  icon: typeof User;
  title: string;
  description: string;
  on: boolean;
  onToggle: (checked: boolean) => void;
}) => (
  <div
    className={`mcm-solid-card flex h-full flex-col gap-2 rounded-xl border bg-white p-4 transition-colors ${
      on ? 'border-primary/40 ring-1 ring-primary/15' : 'border-[#EEE7DD]'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
          on ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
        }`}
      >
        <Icon className="size-4.5" />
      </span>
      <Switch checked={on} onCheckedChange={onToggle} />
    </div>
    <p className="text-sm font-semibold text-[#2E2D35]">{title}</p>
    <p className="text-xs leading-5 text-[#9A948F]">{description}</p>
  </div>
);

const CompanyDutyPolicy = () => {
  const queryClient: any = useQueryClient();
  const { policy: saved, version, isLoading, isError, refetch } = useDutyPolicy();
  const [agentsMayChange, setAgentsMayChange] = useState(true);
  const [supervisorsMayChange, setSupervisorsMayChange] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setAgentsMayChange(!saved.lock_own_status);
      setSupervisorsMayChange(saved.supervisor_may_change_duty);
    }
  }, [saved, dirty]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const settings: DutyPolicy = {
        schema_version: 1,
        lock_own_status: !agentsMayChange,
        supervisor_may_change_duty: supervisorsMayChange,
      };
      return saveSection({
        section: DUTY_POLICY_SECTION,
        settings,
        ...(typeof version === 'number' ? { version } : {}),
      });
    },
    onSuccess: () => {
      handleAlert({ type: 'success', text: 'Duty policy saved' });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: DUTY_POLICY_QUERY_KEY });
    },
  });

  if (isLoading) return <Loader />;
  if (isError) {
    return (
      <div className="p-4 text-sm text-red-600">
        Could not load the duty policy.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        icon={<ShieldCheck size={20} />}
        title="Duty policy"
        description="Whether agents set their own duty - on duty, on a break, off duty - or somebody sets it for them, and whether a supervisor may be that somebody. Location and group admins and the account owner always can, from Performance › Agents."
      />
      <div className="rounded-xl border border-[#EEE7DD] bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A948F]">
          Who can set an agent&apos;s duty right now
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Holder icon={User} label="Agents themselves" state={agentsMayChange ? 'on' : 'off'} />
          <Holder icon={UserCog} label="Supervisors" state={supervisorsMayChange ? 'on' : 'off'} />
          <Holder icon={ShieldCheck} label="Admins and the owner" state="always" />
        </div>
        <p className="mt-3 text-xs text-[#9A948F]">
          Both switches apply to every agent in the company. On, agents use the duty chip in their
          header. Off, the chip only shows their state and the server refuses the change.
        </p>
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-2">
        <Permission
          icon={User}
          title="Agents may change their own duty"
          on={agentsMayChange}
          onToggle={(checked) => {
            setAgentsMayChange(checked);
            setDirty(true);
          }}
          description={
            agentsMayChange
              ? 'Agents start and end their own shift and take their own breaks.'
              : `Locked. Agents see "${LOCKED_SENTENCE}" and an admin sets each person's duty.`
          }
        />
        <Permission
          icon={UserCog}
          title="Supervisors may change an agent's duty"
          on={supervisorsMayChange}
          onToggle={(checked) => {
            setSupervisorsMayChange(checked);
            setDirty(true);
          }}
          description="Off by default. When on, a supervisor can set On duty, Off duty or a break for people in their groups. Location and group admins can always do this."
        />
      </div>
      <SectionActions>
        <Button
          type="button"
          variant="primary"
          className="min-h-9"
          disabled={!dirty || isPending}
          onClick={() => save()}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </SectionActions>
    </div>
  );
};

export default CompanyDutyPolicy;
