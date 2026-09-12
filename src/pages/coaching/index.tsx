import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ear, MicIcon, UsersIcon } from 'lucide-react';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import Timer from '@/components/timer';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import {
  MONITOR_ACTION_LABELS,
  getMonitorTargetCallId,
  isDialpadMonitoringSessionActiveForCall,
  normalizeMonitorDialValue,
  requestMonitorSession,
} from '@/lib/monitoring-actions';
import {
  getMonitoringCallTimestamp,
  getMonitoringContactValue,
  getMonitoringLiveCalls,
  isActiveMonitoringCall,
  isMonitoringCallForMember,
} from '@/pages/monitoring/live-call-helpers';
import { myCoachingTeams } from '@/services/api';
import { RECORD_RULES } from '@/pages/admin-settings/phone-systems/coaching-teams/add-edit-coaching-team';

/* The Coaching page: what a coach sees.
 *
 * Every team the signed-in person coaches, with each trainee's presence and
 * live call, and the three supervisor moves on a live call - listen, whisper,
 * barge - scoped to those trainees. The switch only lets a coach join a call
 * of somebody in the same company (the call manager checks the domain); this
 * page narrows that further to the people the team says they coach. A coach
 * does not need the company-wide Monitoring permission to be here: coaching
 * is the permission.
 *
 * Live state comes from the same socket feed the Monitoring pages read
 * (usersOnlineStatus for presence, liveCalls for what is in progress), and
 * the monitor request goes the same way Monitoring sends it, so the two
 * screens cannot disagree about a call. */

interface TeamPerson {
  user_uuid: string;
  extension: string;
  name: string;
}
interface CoachingTeam {
  uuid: string;
  name: string;
  description?: string | null;
  coaches: TeamPerson[];
  trainees: TeamPerson[];
  record_calls: string;
  record_screen?: boolean;
}

const CoachingPage = () => {
  const { user } = useUser();
  const { sessions } = useDialpad();
  const { usersOnlineStatus, liveCalls, socketEventsManager, eventLiveCallsData } = useSocketEvents();
  const liveCallsData = getMonitoringLiveCalls(liveCalls, eventLiveCallsData);
  const activeCalls = useMemo(
    () => (liveCallsData || []).filter(isActiveMonitoringCall),
    [liveCallsData],
  );
  const myExtension = String(user?.user_info?.extension || '').trim();

  const teamsQuery = useQuery({
    queryKey: ['myCoachingTeams'],
    queryFn: myCoachingTeams,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
  });
  const coaching: CoachingTeam[] = useMemo(
    () => teamsQuery.data?.data?.data?.result?.coaching || [],
    [teamsQuery.data],
  );
  const training: CoachingTeam[] = useMemo(
    () => teamsQuery.data?.data?.data?.result?.training || [],
    [teamsQuery.data],
  );

  const presenceOf = useCallback(
    (extension: string) =>
      (usersOnlineStatus || []).find(
        (row: any) => String(row?.userId ?? '').trim() === String(extension || '').trim(),
      ),
    [usersOnlineStatus],
  );
  const callOf = useCallback(
    (extension: string) => activeCalls.find((call: any) => isMonitoringCallForMember(call, extension)),
    [activeCalls],
  );

  /* One monitor action per call at a time, released when the coach's own
     phone picks up the monitor leg or after ten seconds - the same guard the
     Monitoring page keeps. */
  const [pending, setPending] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const release = useCallback((callId: string) => {
    const id = normalizeMonitorDialValue(callId);
    if (!id) return;
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setPending((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);
  useEffect(() => {
    Object.keys(pending).forEach((id) => {
      if (isDialpadMonitoringSessionActiveForCall(sessions, id)) release(id);
    });
  }, [pending, sessions, release]);
  useEffect(
    () => () => {
      Object.values(timers.current).forEach((t) => clearTimeout(t));
      timers.current = {};
    },
    [],
  );
  const hasAnyLiveSession = useMemo(
    () =>
      Object.values(sessions || {}).some(
        (s: any) => !['ended', 'failed'].includes(String(s?.status || '').toLowerCase()),
      ),
    [sessions],
  );

  const monitor = (code: string, call: any) => {
    const id = normalizeMonitorDialValue(getMonitorTargetCallId(call));
    if (!id) return;
    if (pending[id] || isDialpadMonitoringSessionActiveForCall(sessions, id)) {
      handleAlert({
        text: `${MONITOR_ACTION_LABELS[pending[id] || code] || 'Monitoring'} is already active for this call.`,
        type: 'warning',
      });
      return;
    }
    setPending((prev) => ({ ...prev, [id]: code }));
    timers.current[id] = setTimeout(() => release(id), 10000);
    requestMonitorSession(socketEventsManager, code, id, (ok, error) => {
      if (!ok) {
        release(id);
        handleAlert({ text: error || 'Could not start monitoring.', type: 'error' });
      }
    });
  };

  const ruleLabel = (v: string) => RECORD_RULES.find((r) => r.value === v)?.label || 'Follow the company policy';

  const renderTrainee = (person: TeamPerson) => {
    const presence = presenceOf(person.extension);
    const call = callOf(person.extension);
    const status = String(call?.status || '');
    const onCall = ['bridged', 'answered', 'on_hold'].includes(status) || Boolean(presence?.onCall);
    const ringing = ['ringing', 'waiting'].includes(status);
    const state = onCall ? 'On a call' : ringing ? 'Ringing' : presence?.online ? 'Available' : 'Offline';
    const tone = onCall ? 'bg-green-100 text-green-800' : ringing ? 'bg-yellow-100 text-yellow-800' : presence?.online ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600';
    const canMonitor =
      Boolean(call) &&
      ['bridged', 'answered'].includes(status) &&
      !hasAnyLiveSession &&
      person.extension !== myExtension;
    const stamp = call ? getMonitoringCallTimestamp(call, person.extension) : null;
    return (
      <div
        key={person.user_uuid}
        className="grid grid-cols-1 gap-2 border-t border-gray-100 px-4 py-3 text-sm md:grid-cols-[1.3fr_0.7fr_1.2fr_auto] md:items-center md:gap-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          <CustomAvatar name={person.name} extension={person.extension} showPresence />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{person.name || person.extension}</p>
            <p className="text-xs text-gray-500">Ext {person.extension || '—'}</p>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
          {state}
        </span>
        <div className="min-w-0 text-xs text-gray-600">
          {call ? (
            <>
              <p className="truncate">
                {String(call?.direction || '').toLowerCase() === 'outbound' ? 'Calling' : 'With'}{' '}
                {getMonitoringContactValue(call) || '—'}
              </p>
              {stamp ? (
                <p className="text-gray-500">
                  <Timer startTime={stamp} />
                </p>
              ) : null}
            </>
          ) : (
            <span className="text-gray-400">No live call</span>
          )}
        </div>
        <span className="flex items-center gap-2">
          {canMonitor ? (
            <>
              <CustomTooltip text="Listen — hear the call, nobody hears you" side="top">
                <span
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-primary bg-white text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitor('*87', call)}
                >
                  <Ear className="h-4 w-4" />
                </span>
              </CustomTooltip>
              <CustomTooltip text="Whisper — only the trainee hears you" side="top">
                <span
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-primary bg-white text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitor('*86', call)}
                >
                  <MicIcon className="h-4 w-4" />
                </span>
              </CustomTooltip>
              <CustomTooltip text="Barge — join the call" side="top">
                <span
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-primary bg-white text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitor('*88', call)}
                >
                  <UsersIcon className="h-4 w-4" />
                </span>
              </CustomTooltip>
            </>
          ) : (
            <span className="text-xs text-gray-400">
              {hasAnyLiveSession && call ? 'Finish your own call first' : '—'}
            </span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="mcm-page flex h-full min-h-0 flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-lg font-semibold text-gray-900">Coaching</p>
        <p className="text-xs text-gray-500">
          Your trainees, live. Listen to a call in progress, whisper to the trainee, or join in.
          Recordings of their calls are under Reports &rsaquo; Call logs.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {teamsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading your teams…</p>
        ) : teamsQuery.isError ? (
          <p className="text-sm text-red-600">Your coaching teams could not be loaded.</p>
        ) : coaching.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-gray-900">You are not coaching anyone yet.</p>
            <p className="mt-1 text-xs text-gray-500">
              An administrator adds coaches and trainees under Phone System &rsaquo; Coaching Teams.
              {training.length
                ? ` You are a trainee in ${training.map((t) => t.name).join(', ')}.`
                : ''}
            </p>
          </div>
        ) : (
          coaching.map((team) => (
            <section key={team.uuid} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{team.name}</p>
                  {team.description ? <p className="truncate text-xs text-gray-500">{team.description}</p> : null}
                </div>
                <div className="text-xs text-gray-600">
                  {team.trainees.length} {team.trainees.length === 1 ? 'trainee' : 'trainees'} ·{' '}
                  {ruleLabel(team.record_calls)}
                  {team.record_screen ? ' · screens recorded' : ''}
                </div>
              </div>
              {team.trainees.length ? (
                team.trainees.map(renderTrainee)
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500">No trainees on this team yet.</p>
              )}
            </section>
          ))
        )}
        {training.length > 0 && coaching.length > 0 ? (
          <p className="text-xs text-gray-500">
            You are also a trainee in {training.map((t) => t.name).join(', ')}.
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default CoachingPage;
