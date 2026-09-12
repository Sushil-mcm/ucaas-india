import { FC, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { DIALER_TYPE } from '../consts';
import { getCountryName } from '@/lib/company-default-country';
import { effectiveCampaignCountry, hoursCountryOf } from '@/lib/campaign-country';
import { getCallingRules } from '@/services/api';

/**
 * Everything the person chose, in plain words, before the campaign is saved.
 * No inputs here: each block says which step to go back to.
 */
const Review: FC<{ dialMethod?: string; groupList?: any[]; isEditMode?: boolean }> = ({
  dialMethod,
  groupList = [],
  isEditMode,
}) => {
  const { watch } = useFormContext<any>();
  const v = watch();

  /* The hours this campaign will actually be held to, read from the server
     rather than written into this sentence. The last time these numbers were
     spelled out here by hand they went stale the moment the default moved, and
     a review screen quoting the wrong hours is worse than one quoting none. */
  /* Same rule as the Calling rules step: the compliance country, or the hours
     country standing in for it. The review used to read only the first and
     said "No country chosen" under a campaign whose Hours step plainly said
     United States. */
  const countryChoice = effectiveCampaignCountry(v?.country, hoursCountryOf(v));
  const { data: callingRules } = useQuery({
    queryKey: ['campaign-calling-rules', countryChoice.iso2],
    queryFn: async () => {
      const response: any = await getCallingRules(countryChoice.iso2);
      return response?.data?.data?.result || null;
    },
    staleTime: 60 * 60 * 1000,
  });
  const countrySentence =
    countryChoice.source === 'chosen'
      ? `Calling ${getCountryName(countryChoice.iso2)}.`
      : countryChoice.source === 'hours'
        ? `Calling ${getCountryName(countryChoice.iso2)} (using the hours country; pick another under Calling rules if needed).`
        : 'No country chosen, so the safest common rule applies.';

  const modeWords: Record<string, string> = {
    [DIALER_TYPE.PREVIEW]: 'Preview: agents see each lead and press Call themselves.',
    /* Progressive is keyed NORMAL in DIALER_TYPE - the key is historical, the
       value it carries is 'PROGRESSIVE'. Keying this off DIALER_TYPE.PROGRESSIVE
       looked right but was undefined, so this line never matched a mode and the
       progressive description never appeared. */
    [DIALER_TYPE.NORMAL]: 'Progressive: the system dials one lead per free agent and hands over the answered call.',
    [DIALER_TYPE.PREDICTIVE]: 'Predictive: the system dials ahead of the team, within the abandon cap set below.',
    [DIALER_TYPE.INBOUND]: 'Inbound: nobody is dialled; customers call the number and the team answers.',
  };
  const isInbound = dialMethod === DIALER_TYPE.INBOUND;

  const numbers: string[] = (v?.callerId || []).map((c: any) => c?.label || c?.value || c);
  const leadGroups = (v?.groupId || []).map((g: any) => {
    const found = groupList.find((x: any) => x?._id === (g?.value || g));
    return g?.label || found?.groupName || found?.name || String(g?.value || g);
  });
  const members: any[] = v?.members || [];
  const ds = v?.dialerSetting || {};
  const hours = v?.settings?.operational_hours?.value || {};
  const openDays = Object.entries(hours)
    .filter(([, d]: any) => d?.open !== false && (d?.start || d?.end))
    .map(([day, d]: any) => `${day.slice(0, 3)} ${d?.start || ''}-${d?.end || ''}`);
  const recording = v?.settings?.recording?.automatic?.enabled;
  const wrapupWords: Record<string, string> = {
    OPTIONAL: 'optional',
    MANDATORY: 'required, no time limit',
    MANDATORY_TIMEOUT: 'required, moves on when time runs out',
    MANDATORY_FORCED_TIMEOUT: 'required, forced closed when time runs out',
    AGENT_REQUESTED: 'only when the agent asks',
  };
  const amd = ds?.answering_detection_machine || {};
  const dispositions = (v?.agentDisposition || []).map((d: any) => d?.disposition?.name).filter(Boolean);
  const inbound = v?.inbound || {};
  const greetings = v?.greetings || {};

  const blocks = useMemo(
    () => [
      {
        title: 'Campaign',
        lines: [
          `${v?.name || 'Untitled'} · ${modeWords[dialMethod || ''] || dialMethod || ''}`,
          `Shows the customer ${numbers.length ? numbers.join(', ') : 'no number chosen'}${v?.rotateCallerId && numbers.length > 1 ? ' (rotated by area code)' : ''}.`,
          ...(isInbound
            ? ['No leads: this campaign only receives calls.']
            : [
                `Calls ${leadGroups.length ? leadGroups.join(', ') : 'no lead group chosen'}.`,
                v?.require_consent
                  ? 'Only leads with consent on file are offered. Check the lead group was uploaded with a consent column, or agents will see nothing to call.'
                  : 'Consent is not required.',
                callingRules
                  ? `${countrySentence} Leads are called ${callingRules.hoursLabel}, ${callingRules.daysLabel.toLowerCase()}, in each lead\u2019s own local time, and no more than ${callingRules.abandonCapPercent}% of answered calls may be abandoned.`
                  : `${countrySentence} Calling hours and the abandoned-call limit are applied in each lead\u2019s own local time.`,
              ]),
        ],
      },
      {
        title: 'Team',
        lines: [
          members.length
            ? `${members.length} ${members.length === 1 ? 'person' : 'people'}: ${members.map((m: any) => m?.label || m?.name || m?.extension).filter(Boolean).join(', ')}`
            : 'Nobody added yet.',
          v?.agentScripting ? `Script: ${v?.script?.label || 'chosen'}.` : 'No script.',
          ...(dialMethod === DIALER_TYPE.PREVIEW
            ? [
                v?.agentOwnedRecords
                  ? 'A lead with an owner is shown only to that agent.'
                  : 'Leads go to whoever is free.',
                Array.isArray(v?.declineDispositions) && v.declineDispositions.length
                  ? `Skipping asks for a reason (${v.declineDispositions.length} to choose from).`
                  : 'Skipping does not ask for a reason.',
              ]
            : []),
        ],
      },
      {
        title: 'Calling rules',
        lines: [
          ...(isInbound ? [] : [`Up to ${ds?.max_attempt_per_record ?? 1} attempt(s) per lead, retry after ${ds?.default_retry_period ?? 3} ${typeof ds?.default_retry_period_type === 'string' ? ds.default_retry_period_type : ds?.default_retry_period_type?.label || 'min'}${Array.isArray(ds?.retry_ladder) && ds.retry_ladder.length ? `, with a different wait set for ${ds.retry_ladder.length} attempt(s)` : ''}.`]),
          ...(dialMethod === DIALER_TYPE.PREDICTIVE || dialMethod === DIALER_TYPE.NORMAL
            ? [`Rings the customer for ${ds?.max_ring_time ?? 30} s and an agent for ${ds?.ringing_agent_time ?? 30} s; an answered customer waits no more than ${ds?.compliance_abandon_seconds ?? 2} s for a free agent.`]
            : []),
          ...(dialMethod === DIALER_TYPE.PREDICTIVE
            ? [
                ds?.dial_ahead === false
                  ? `Dials only for agents free right now, up to ${ds?.max_calls_per_agent ?? 3} calls each.`
                  : `Dials ahead of agents becoming free once ${ds?.min_agents_for_predictive ?? 5} or more are active; below that, one call per free agent.`,
                /* The pacing numbers and Automatic Answer were set on the
                   Settings step and never read back here (row #19, 9 Sep). */
                `Pacing: up to ${ds?.max_calls_per_agent ?? 3} calls per free agent, abandon cap ${ds?.target_abandon_rate ?? 3}% (a customer counts as abandoned after ${ds?.compliance_abandon_seconds ?? 2} s waiting), ${
                  Number(ds?.max_lines) > 0 ? `at most ${Number(ds.max_lines)} lines at once` : 'no line ceiling'
                }.`,
                ds?.auto_answering?.enabled
                  ? `Automatic Answer: the agent's phone answers each campaign call by itself after ${ds?.auto_answering?.timeout ?? 2} s.`
                  : 'Automatic Answer: off; agents answer each campaign call themselves.',
              ]
            : []),
          ...(ds?.retry_by_outcome && Object.keys(ds.retry_by_outcome).length
            ? [`Different waits set for ${Object.keys(ds.retry_by_outcome).map((k) => k.toLowerCase().replace('_', ' ')).join(', ')}.`]
            : []),
          `Wrap-up ${ds?.wrapup_time ?? 30} s, ${wrapupWords[typeof ds?.wrapup_mode === 'string' ? ds.wrapup_mode : ds?.wrapup_mode?.value] || 'required, moves on when time runs out'}.${
            isInbound || !Number.isFinite(Number(ds?.wait_after_call)) || ds?.wait_after_call === ''
              ? ''
              : Number(ds.wait_after_call) === 0
                ? ' The next lead is offered straight after.'
                : ` Then ${Number(ds.wait_after_call)} s before the next lead.`
          }`,
          ...(dialMethod === DIALER_TYPE.PREVIEW
            ? [
                `Agents get ${ds?.preview_time ?? 30} s to look at a lead. ${
                  String(ds?.preview_timeout_action || 'RETURN_TO_POOL').toUpperCase() === 'DIAL'
                    ? 'If they have not dialled by then, the number is dialled for them.'
                    : 'If they have not dialled by then, the lead goes back to be offered again.'
                }`,
              ]
            : []),
          ...(isInbound ? [] : [amd?.enabled ? `Answering machines: ${amd?.type === 'VOICEMAIL' ? `leave the message "${amd?.value?.label || ''}"` : 'hang up'}.` : 'Answering machines: not detected (calls go to the team as answered).']),
          dispositions.length ? `Outcomes agents can pick: ${dispositions.join(', ')}.` : 'No outcomes chosen yet.',
        ],
      },
      {
        title: 'Hours & recording',
        lines: [
          `${v?.startDate || ''} to ${v?.endDate || ''}${v?.settings?.operational_hours?.regional?.timezone?.value ? ` · ${v.settings.operational_hours.regional.timezone.value}` : ''}.`,
          openDays.length ? `Open ${openDays.join(', ')}.` : 'Open all day, every day.',
          recording ? 'Calls are recorded.' : 'Calls are not recorded.',
        ],
      },
      {
        title: 'Inbound & callbacks',
        lines: [
          isInbound ? 'Every caller reaches this team.' : 'Leads who call the number back reach this team, tagged with their record.',
          inbound?.route_number
            ? `Every call to ${numbers[0] || 'the number'} goes to this team while the campaign runs (the old rule is kept).`
            : 'Other callers to the number follow its usual rule.',
          `Team rung: ${inbound?.ring_strategy?.label || 'Ring All'}.`,
          greetings?.welcome?.enabled ? `Greeting: ${greetings?.welcome?.value?.label || 'chosen'}.` : 'No greeting.',
          greetings?.hold?.enabled ? `Hold music: ${greetings?.hold?.value?.label || 'chosen'}.` : 'Default hold music.',
          inbound?.closed?.type === 'VOICEMAIL' ? `Outside the hours: voicemail of ${inbound?.closed?.label || inbound?.closed?.value}.` : 'Outside the hours: the team keeps ringing.',
        ],
      },
    ],
    [v, dialMethod, groupList, callingRules, countrySentence],
  );

  return (
    <div className="flex w-full flex-col gap-3 overflow-auto h-[calc(100vh_-_22.5rem)] pr-1">
      <p className="text-sm text-gray-600">
        Check the summary. Press <b>{isEditMode ? 'Save changes' : 'Launch campaign'}</b> when it reads right, or go back to a step to change it.
      </p>
      {blocks.map((b) => (
        <section key={b.title} className="rounded-md border border-gray-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">{b.title}</p>
          <ul className="text-sm text-gray-800 flex flex-col gap-0.5">
            {b.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default Review;
