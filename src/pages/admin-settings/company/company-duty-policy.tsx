import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Loader from '@/components/custom/loader';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
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
      <SettingCard
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Who sets an agent's duty"
        description="Both apply to every agent in the company. On, agents use the duty chip in their header. Off, the chip only shows their state and the server refuses the change."
      >
        <SettingRow
          label="Agents may change their own duty"
          description={
            agentsMayChange
              ? 'Agents start and end their own shift and take their own breaks.'
              : `Locked. Agents see "${LOCKED_SENTENCE}" and an admin sets each person's duty.`
          }
          control={
            <Switch
              checked={agentsMayChange}
              onCheckedChange={(checked) => {
                setAgentsMayChange(checked);
                setDirty(true);
              }}
            />
          }
        />
        <SettingRow
          label="Supervisors may change an agent's duty"
          description="Off by default. When on, a supervisor can set On duty, Off duty or a break for people in their groups. Location and group admins can always do this."
          control={
            <Switch
              checked={supervisorsMayChange}
              onCheckedChange={(checked) => {
                setSupervisorsMayChange(checked);
                setDirty(true);
              }}
            />
          }
        />
      </SettingCard>
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
