import { listAgentDuty, setAgentDuty } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { getSection } from '@/lib/company-settings-api';
import {
  AgentDuty,
  INCOMING_UNANSWERED_EVENT,
  MISSED_REFETCH_DELAY_MS,
  missedCallNotice,
} from '@/lib/agent-duty';
import { BREAK_REASONS_SECTION, BreakReasonsSettings, normaliseBreakReasons } from '@/lib/break-reasons';
import { handleAlert } from '@/lib/utils';
import {
  DUTY_POLICY_SECTION,
  DutyPolicy,
  decideFor,
  normaliseDutyPolicy,
} from '@/lib/workday-permissions';

export const AGENT_DUTY_QUERY_KEY = ['agentDutyList'];
export const BREAK_REASONS_QUERY_KEY = ['companySettingsSection', BREAK_REASONS_SECTION];
export const DUTY_POLICY_QUERY_KEY = ['companySettingsSection', DUTY_POLICY_SECTION];

/* Everyone's duty on the company's queues, keyed by person, kept live by the
   server's "agent-duty-update" broadcast (one row per change) on top of one
   list request. The same hook feeds the header chip (own row) and the
   supervisor's agents list, so the two can never disagree. */
export const useAgentDuty = () => {
  const queryClient: any = useQueryClient();
  const { socketEventsManager } = useSocketEvents();
  const { user } = useUser();
  const myUuid = String(user?.uuid || user?.user_info?.uuid || '');
  const { policy } = useDutyPolicy();

  const query = useQuery({
    queryKey: AGENT_DUTY_QUERY_KEY,
    queryFn: () => listAgentDuty({}),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const [live, setLive] = useState<Record<string, AgentDuty>>({});
  useEffect(() => {
    if (!socketEventsManager) return;
    const onUpdate = (payload: any) => {
      if (!payload || typeof payload !== 'object' || !payload.user_uuid) return;
      setLive((prev) => ({ ...prev, [String(payload.user_uuid)]: payload as AgentDuty }));
    };
    socketEventsManager.on('agent-duty-update', onUpdate);
    return () => {
      socketEventsManager.off('agent-duty-update', onUpdate);
    };
  }, [socketEventsManager]);

  /* The start of each person's current duty period, as this tab has seen it.

     The server's `since` is the newest last_status_change across the
     person's queue rows, and the queue service stamps that field on EVERY
     write to a row - a call starting, a call ending - not only on a duty
     change. So the list came back with `since` moved to the last call and
     the header's on-duty clock restarted at every call (row #16, 9 Sep:
     13:57 -> 0:56 at the 18:43:41 bridge).

     A duty period only starts when the duty itself changes. So a row that
     reports the same duty, reason and pending change as the row before it is
     the same period, and its earlier start is kept. A different duty (or a
     live row from the server's own broadcast, which every duty change sends)
     starts a new period as before. This is per tab: after a reload the clock
     shows what the server says until the API carries a real duty_since. */
  const periodStartRef = useRef<Record<string, { key: string; since: number }>>({});
  const byUser: Record<string, AgentDuty> = useMemo(() => {
    const rows: AgentDuty[] = query.data?.data?.data?.rows || [];
    const map: Record<string, AgentDuty> = {};
    rows.forEach((row) => {
      map[String(row.user_uuid)] = row;
    });
    Object.entries(live).forEach(([uuid, row]) => {
      const listed = map[uuid];
      if (!listed || (Number(row.since) || 0) >= (Number(listed.since) || 0) || row.pending !== listed.pending) map[uuid] = row;
    });
    const starts = periodStartRef.current;
    Object.entries(map).forEach(([uuid, row]) => {
      const key = `${row.duty}|${row.reason_id || ''}|${row.pending ? `${row.pending.duty}|${row.pending.reason_id || ''}` : ''}`;
      const since = Number(row.since) || 0;
      const known = starts[uuid];
      if (known && known.key === key && known.since > 0 && since > known.since) {
        map[uuid] = { ...row, since: known.since };
        return;
      }
      starts[uuid] = { key, since };
    });
    return map;
  }, [query.data, live]);

  const mine: AgentDuty | null = myUuid ? byUser[myUuid] || null : null;

  /* An incoming call that rang here and was not answered is exactly when the
     engine counts a miss, so the list is re-read a moment later (the engine
     writes the count on the switch's report, which follows the hang-up). The
     60 s timed refresh remains the fallback: nothing pushes a miss. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer: number | null = null;
    const onUnanswered = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries({ queryKey: AGENT_DUTY_QUERY_KEY });
      }, MISSED_REFETCH_DELAY_MS);
    };
    window.addEventListener(INCOMING_UNANSWERED_EVENT, onUnanswered);
    return () => {
      window.removeEventListener(INCOMING_UNANSWERED_EVENT, onUnanswered);
      if (timer) window.clearTimeout(timer);
    };
  }, [queryClient]);

  /* Said once, when the engine stops offering calls - not on every refresh. */
  const wasMissedTooMany = useRef(false);
  useEffect(() => {
    const now = !!mine?.missed_too_many;
    if (now && !wasMissedTooMany.current) {
      handleAlert({ type: 'warning', text: `${missedCallNotice(mine)} Press Ready again when you are back.` });
    }
    wasMissedTooMany.current = now;
  }, [mine]);

  const mutation = useMutation({
    mutationFn: setAgentDuty,
    onSuccess: (res: any, vars) => {
      const row: AgentDuty | undefined = res?.data?.data;
      if (row?.user_uuid) setLive((prev) => ({ ...prev, [String(row.user_uuid)]: row }));
      queryClient.invalidateQueries({ queryKey: AGENT_DUTY_QUERY_KEY });
      if (row && row.pending) {
        handleAlert({ type: 'info', text: 'Noted. It takes effect when the current call ends.' });
      } else if (vars.action === 'ready') {
        handleAlert({ type: 'success', text: 'Ready again: calls will be offered.' });
      }
    },
  });

  /* The same two questions the server asks (lib/workday-permissions.ts):
     may I change my own duty - refused for an agent while the company lock
     is on - and may I change somebody else's - refused for a supervisor
     until the company's second switch is on. */
  const own = decideFor(user, 'duty.own', { lockOwnStatus: policy.lock_own_status });
  const others = decideFor(user, 'duty.others', {
    supervisorMayChangeDuty: policy.supervisor_may_change_duty,
  });

  return {
    ...query,
    byUser,
    mine,
    myUuid,
    setDuty: mutation.mutate,
    isSaving: mutation.isPending,
    canChangeOwn: own.ok,
    /* Why not, in a sentence, for the read-only chip. */
    ownRefusal: own.ok ? '' : own.message,
    canManageOthers: others.ok,
    /* Why not, for a read-only cell on somebody else's row. */
    othersRefusal: others.ok ? '' : others.message,
  };
};

/* Company › Duty policy: whether agents may change their own duty. Read by
   everyone (the chip needs it), written by the owner. */
export const useDutyPolicy = () => {
  const query = useQuery({
    queryKey: DUTY_POLICY_QUERY_KEY,
    queryFn: () => getSection(DUTY_POLICY_SECTION),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const policy: DutyPolicy = useMemo(() => normaliseDutyPolicy(query.data?.settings), [query.data]);
  return { ...query, policy, version: query.data?.version };
};

/* The company's break reasons, with the built-in two always present. */
export const useBreakReasons = () => {
  const query = useQuery({
    queryKey: BREAK_REASONS_QUERY_KEY,
    queryFn: () => getSection(BREAK_REASONS_SECTION),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const settings: BreakReasonsSettings = useMemo(
    () => normaliseBreakReasons(query.data?.settings),
    [query.data],
  );
  return { ...query, reasons: settings.reasons, version: query.data?.version };
};
