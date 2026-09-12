import { Icon } from '@/assets/icons/icon';
import CustomSelect from '@/components/custom/custom-select';
import WaitPicker from '@/components/custom/wait-picker';
import ErrorTooltip from '@/components/custom/error-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { getCallingRules, getDispositions, getGreetings } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { DEFAULT_RETRY_PERIOD_TYPE, DIALER_TYPE, MAX_ATTEMPTS, PREVIEW_TIMEOUT_ACTIONS, RETRY_OUTCOMES, isCampaignLocked } from '../consts';
import { TIMER_LABELS, TIMER_RANGES } from '@/lib/campaign-timers';
import { WRAPUP_PROMPT_MODES } from '@/pages/admin-settings/phone-systems/call-queue/constant';
import { Label } from '@/components/ui/label';
import { COUNTRY_OPTIONS, getCountryName } from '@/lib/company-default-country';
import { effectiveCampaignCountry } from '@/lib/campaign-country';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const Settings: FC<any> = ({ dialMethod, setModalState, campaignStatus }) => {
  const { data: voicemailList = [] } = useQuery({
    queryKey: ['useGetVoicemails'],
    queryFn: () =>
      getGreetings({
        page: 1,
        limit: 1000,
        filters: [],
        search: '',
        type: 'voicemail',
        sort: { key: 'created_at', desc: true },
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();

  /* The country being called. Left blank, it is the country the team sits in
     (Hours & recording), because that is what nearly every campaign calls; an
     explicit choice here always wins. src/lib/campaign-country.ts. */
  const countryChoice = effectiveCampaignCountry(
    watch('country'),
    watch('settings.operational_hours.regional.country_code'),
  );
  const selectedCountry = countryChoice.iso2;
  /* The hours and abandon limit for the chosen country, fetched rather than
     hardcoded here: the dialer enforces these numbers, and a screen holding its
     own copy could tell somebody they are compliant when they are not. Blank is
     a real answer too - it returns the conservative default. */
  const { data: callingRules, isError: callingRulesFailed } = useQuery({
    queryKey: ['campaign-calling-rules', selectedCountry],
    queryFn: async () => {
      const response: any = await getCallingRules(selectedCountry);
      return response?.data?.data?.result || null;
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: dispositionsList = [] } = useQuery({
    queryKey: ['getDispositionsList'],
    queryFn: () => getDispositions({ page: 1, limit: 200 }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  const handleDispositionCheck = (checked: boolean, item: any) => {
    const currentValues = watch('agentDisposition') || [];
    if (checked) {
      if (!currentValues.some((d: any) => d._id === item?._id)) {
        setValue('agentDisposition', [...currentValues, { ...item }], { shouldValidate: true });
      }
    } else {
      setValue(
        'agentDisposition',
        currentValues.filter((d: any) => d._id !== item?._id),
        { shouldValidate: true },
      );
    }
  };

  /* Which chosen dispositions an agent may also give as the reason for a skip. */
  const isDeclineDisposition = (item: any) =>
    (watch('declineDispositions') || []).map(String).includes(String(item?._id));
  const toggleDeclineDisposition = (checked: boolean, item: any) => {
    const current: string[] = (watch('declineDispositions') || []).map(String);
    const id = String(item?._id);
    setValue(
      'declineDispositions',
      checked ? Array.from(new Set([...current, id])) : current.filter((d) => d !== id),
      { shouldDirty: true },
    );
  };
  const retryLadder: { period: number | ''; unit: string }[] = watch('dialerSetting.retry_ladder') || [];
  const setLadderStep = (index: number, next: Partial<{ period: number | ''; unit: string }>) => {
    const rows = [...retryLadder];
    const current = rows[index] || { period: '' as number | '', unit: 'min' };
    rows[index] = { ...current, ...next };
    setValue('dialerSetting.retry_ladder', rows, { shouldDirty: true });
  };

  /* How many dispositions the agent will actually be offered on a skip. */
  const declineDispositionCount = (watch('declineDispositions') || []).length;

  const isDispositionChecked = (item: any) => {
    return (watch('agentDisposition') || []).some((d: any) => d._id === item?._id);
  };

  return (
    <>
      <div className="flex h-[calc(100vh_-_22.5rem)] flex-col gap-6 overflow-auto pr-1 ">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-5">
          {dialMethod === DIALER_TYPE.PREVIEW ? (
            <>
            {/* A number with a range, not a dropdown of seven values: the
                company sets the default (Company › Campaign timers) and a
                campaign may go anywhere in the range. The server refuses the
                same range, so the form cannot save what the dialer would not
                honour. */}
            <Input
              type="number"
              label={TIMER_LABELS.preview_time.label}
              title={TIMER_LABELS.preview_time.help}
              placeholder={`${TIMER_RANGES.preview_time.min}–${TIMER_RANGES.preview_time.max}`}
              min={TIMER_RANGES.preview_time.min}
              max={TIMER_RANGES.preview_time.max}
              step={1}
              disabled={isCampaignLocked(campaignStatus, dialMethod)}
              {...register('dialerSetting.preview_time')}
              error={(errors as any)?.dialerSetting?.preview_time?.message}
            />
            {/* Without this the countdown just stops and the lead stays on the
                agent's screen with nothing to do. Returning the lead is the
                default: it is the only answer that is safe in every market,
                because a person still decides to place each call. */}
            <CustomSelect
              isDisabled={isCampaignLocked(campaignStatus, dialMethod)}
              label={'When the preview time runs out'}
              placeholder="Select Option"
              options={PREVIEW_TIMEOUT_ACTIONS}
              handleChange={(e: ISELECTVALUE | null) => {
                setValue(`dialerSetting.preview_timeout_action`, e?.value || 'RETURN_TO_POOL', {
                  shouldDirty: true,
                });
              }}
              value={
                PREVIEW_TIMEOUT_ACTIONS.find(
                  (action) =>
                    action.value ===
                    (watch('dialerSetting.preview_timeout_action') || 'RETURN_TO_POOL'),
                ) || PREVIEW_TIMEOUT_ACTIONS[0]
              }
              menuPlacement="auto"
            />
            </>
          ) : null}
          {/* Both of these now reach the switch: the customer ring time becomes the
              originate timeout, the agent ring time becomes the per-agent leg
              timeout on the campaign's queue. They were removed while they did
              nothing; they are back because they do something. */}
          {dialMethod === DIALER_TYPE.PREDICTIVE || dialMethod === DIALER_TYPE.NORMAL ? (
            <>
              <CustomSelect
                label={'Customer ring time (seconds)'}
                placeholder="Select Option"
                isDisabled={isCampaignLocked(campaignStatus, dialMethod)}
                options={[15, 20, 25, 30, 35, 40, 45].map((item) => ({ label: item, value: item }))}
                handleChange={(e: ISELECTVALUE | null) => {
                  setValue(`dialerSetting.max_ring_time`, e?.value || 30, { shouldDirty: true });
                }}
                value={{
                  value: watch('dialerSetting.max_ring_time') || 30,
                  label: watch('dialerSetting.max_ring_time') || 30,
                }}
                menuPlacement="auto"
              />
              <CustomSelect
                label={'Agent ring time (seconds)'}
                placeholder="Select Option"
                isDisabled={isCampaignLocked(campaignStatus, dialMethod)}
                options={[10, 15, 20, 25, 30, 40, 45, 60].map((item) => ({ label: item, value: item }))}
                handleChange={(e: ISELECTVALUE | null) => {
                  setValue(`dialerSetting.ringing_agent_time`, e?.value || 30, { shouldDirty: true });
                }}
                value={{
                  value: watch('dialerSetting.ringing_agent_time') || 30,
                  label: watch('dialerSetting.ringing_agent_time') || 30,
                }}
                menuPlacement="auto"
              />
            </>
          ) : null}

          <Input
            type="number"
            label={TIMER_LABELS.wrapup_time.label}
            title={TIMER_LABELS.wrapup_time.help}
            placeholder={`${TIMER_RANGES.wrapup_time.min}–${TIMER_RANGES.wrapup_time.max}`}
            min={TIMER_RANGES.wrapup_time.min}
            max={TIMER_RANGES.wrapup_time.max}
            step={1}
            disabled={isCampaignLocked(campaignStatus, dialMethod)}
            {...register('dialerSetting.wrapup_time')}
            error={(errors?.dialerSetting as any)?.wrapup_time?.message}
          />

          {/* The same five wrap-up rules a queue offers, so a supervisor can
              say whether an agent may skip the wrap-up, must label the call,
              or is moved on when the time runs out. */}
          <CustomSelect
            label={'Wrap-up rule'}
            isDisabled={isCampaignLocked(campaignStatus, dialMethod)}
            placeholder="Select Option"
            options={WRAPUP_PROMPT_MODES}
            handleChange={(e: ISELECTVALUE | null) => {
              setValue(`dialerSetting.wrapup_mode`, e?.value || 'MANDATORY_TIMEOUT', {
                shouldDirty: true,
              });
            }}
            value={
              WRAPUP_PROMPT_MODES.find(
                (mode) => mode.value === (watch('dialerSetting.wrapup_mode') || 'MANDATORY_TIMEOUT'),
              ) || WRAPUP_PROMPT_MODES[2]
            }
            menuPlacement="auto"
          />

          {/* The pause between wrap-up ending and the next lead being offered.
              Used to be a 30 s constant in the dialer that nobody could see or
              change. The poll interval for an empty campaign is deliberately
              NOT here: it is company-wide (Company › Campaign timers). */}
          {dialMethod !== DIALER_TYPE.INBOUND ? (
            <Input
              type="number"
              label={TIMER_LABELS.wait_after_call.label}
              title={TIMER_LABELS.wait_after_call.help}
              placeholder={`${TIMER_RANGES.wait_after_call.min}–${TIMER_RANGES.wait_after_call.max}`}
              min={TIMER_RANGES.wait_after_call.min}
              max={TIMER_RANGES.wait_after_call.max}
              step={1}
              disabled={isCampaignLocked(campaignStatus, dialMethod)}
              {...register('dialerSetting.wait_after_call')}
              error={(errors?.dialerSetting as any)?.wait_after_call?.message}
            />
          ) : null}

          {dialMethod !== DIALER_TYPE.INBOUND ? (<>
          <div className="relative flex flex-col gap-1.5 w-full">
            <Label className="text-sm font-medium leading-none">Default retry period</Label>
            <div className="flex gap-1">
              <div className="w-full relative">
                <Input
                  // label="Default retry period"
                  disabled={isCampaignLocked(campaignStatus, dialMethod)}
                  placeholder="Enter default retry period"
                  type="number"
                  {...register('dialerSetting.default_retry_period')}
                  // error={(errors?.dialerSetting as any)?.default_retry_period?.message}
                />
                <span className="absolute top-[-20px] right-0">
                  {(errors as any)?.dialerSetting?.default_retry_period?.message && (
                    <ErrorTooltip
                      text={(errors as any)?.dialerSetting?.default_retry_period?.message}
                    />
                  )}
                </span>
              </div>

              <CustomSelect
                // label={'Default retry period type'}
                className="max-w-[100px]  "
                isDisabled={isCampaignLocked(campaignStatus, dialMethod)}
                placeholder="Select Option"
                options={DEFAULT_RETRY_PERIOD_TYPE.map((item) => ({
                  label: item?.label,
                  value: item?.value,
                }))}
                handleChange={(e: ISELECTVALUE | null) => {
                  setValue(`dialerSetting.default_retry_period_type`, e || '', {
                    shouldValidate: true,
                  });
                }}
                value={watch('dialerSetting.default_retry_period_type')}
                error={(errors?.dialerSetting as any)?.default_retry_period_type?.message}
                menuPlacement="auto"
              />
            </div>
          </div>

          <CustomSelect
            label={'Max attempts per record'}
            placeholder="Select Option"
            isDisabled={isCampaignLocked(campaignStatus, dialMethod)}
            options={MAX_ATTEMPTS.map((item) => ({
              label: item,
              value: item,
            }))}
            handleChange={(e: ISELECTVALUE | null) => {
              setValue(`dialerSetting.max_attempt_per_record`, e?.value || '', {
                shouldValidate: true,
              });
            }}
            value={{
              value: watch('dialerSetting.max_attempt_per_record'),
              label: watch('dialerSetting.max_attempt_per_record'),
            }}
            error={(errors?.dialerSetting as any)?.max_attempt_per_record?.message}
            menuPlacement="auto"
          />
          </>) : null}
        </div>

        {dialMethod !== DIALER_TYPE.INBOUND ? (
          <div className="w-full flex flex-col gap-2">
            <div>
              <h3 className="text-gray-900 font-semibold text-sm">Wait by outcome</h3>
              <p className="text-xs text-gray-500">
                A busy line is worth trying again soon; a machine is not. Pick a wait for each outcome, or leave it on the ladder or the default.
              </p>
              {/* These waits only ever apply to a second attempt, so with one attempt
                  per record they are collected and never used. Say so rather than
                  letting an admin fill in four boxes that cannot do anything. */}
              {Number(watch('dialerSetting.max_attempt_per_record') || 1) <= 1 ? (
                <p className="text-xs text-amber-600">
                  Max attempts per record is 1, so nothing set here will be used — a lead is
                  never called back. Raise it above 1 for these waits to take effect.
                </p>
              ) : null}
            </div>
            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-4">
              {RETRY_OUTCOMES.map((outcome) => {
                const current = (watch('dialerSetting.retry_by_outcome') || {})[outcome.value] || {};
                const setOutcome = (next: any) => {
                  const all = { ...(watch('dialerSetting.retry_by_outcome') || {}) };
                  const merged = { period: '', unit: 'min', ...current, ...next };
                  if (merged.period === '' || Number(merged.period) <= 0) delete all[outcome.value];
                  else all[outcome.value] = merged;
                  setValue('dialerSetting.retry_by_outcome', all, { shouldDirty: true });
                };
                return (
                  <WaitPicker
                    key={outcome.value}
                    label={outcome.label}
                    disabled={isCampaignLocked(campaignStatus, dialMethod)}
                    value={current.period ? current : null}
                    onChange={(next) => setOutcome(next ? next : { period: '' })}
                    blankLabel="Use the ladder or the default"
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {dialMethod !== DIALER_TYPE.INBOUND && Number(watch('dialerSetting.max_attempt_per_record') || 1) > 1 ? (
          <div className="w-full flex flex-col gap-2">
            <div>
              <h3 className="text-gray-900 font-semibold text-sm">Wait between attempts</h3>
              <p className="text-xs text-gray-500">
                Pick how long to wait after each attempt; the first row is the wait after the first attempt. A row left on the default uses the retry period above.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-4">
              {Array.from({ length: Math.min(20, Number(watch('dialerSetting.max_attempt_per_record') || 1) - 1) }).map((_, index) => (
                <WaitPicker
                  key={index}
                  label={`After attempt ${index + 1}`}
                  disabled={isCampaignLocked(campaignStatus, dialMethod)}
                  value={retryLadder[index]?.period ? retryLadder[index] : null}
                  onChange={(next) => setLadderStep(index, next ? next : { period: '' })}
                  blankLabel="Use the default retry period"
                />
              ))}
            </div>
          </div>
        ) : null}
        <div>
        </div>

        {dialMethod === DIALER_TYPE.PREDICTIVE || dialMethod === DIALER_TYPE.NORMAL ? (
          <div className="w-full flex flex-col gap-3">
            <div>
              <h3 className="text-gray-900 font-semibold text-md">Pacing</h3>
              <p className="text-xs text-gray-500">
                {dialMethod === DIALER_TYPE.PREDICTIVE
                  ? 'The dialer places more calls than there are free agents, then corrects itself from the answer rate. Keep the abandon cap where your regulations put it.'
                  : 'The dialer places one call for each free agent, so nobody answers to silence. Only the line ceiling applies.'}
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
              <Input
                label="Line ceiling (0 = no limit)"
                type="number"
                min={0}
                max={500}
                disabled={isCampaignLocked(campaignStatus, dialMethod)}
                {...register('dialerSetting.max_lines')}
                error={(errors?.dialerSetting as any)?.max_lines?.message}
              />
              {dialMethod === DIALER_TYPE.PREDICTIVE ? (
                <>
                  <Input
                    label="Max calls per free agent"
                    type="number"
                    step="0.1"
                    min={1}
                    max={15}
                    disabled={isCampaignLocked(campaignStatus, dialMethod)}
                    {...register('dialerSetting.max_calls_per_agent')}
                    error={(errors?.dialerSetting as any)?.max_calls_per_agent?.message}
                  />
                  <Input
                    /* The cap and the period it is measured over differ by
                       country, so the label reads them rather than stating the
                       US rule as if it were universal. */
                    label={
                      callingRules
                        ? `Abandon rate cap (%, limit ${callingRules.abandonCapPercent} ${
                            callingRules.abandonWindowHours === 24
                              ? 'each day'
                              : `over ${Math.round(callingRules.abandonWindowHours / 24)} days`
                          })`
                        : 'Abandon rate cap (%)'
                    }
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={3}
                    disabled={isCampaignLocked(campaignStatus, dialMethod)}
                    {...register('dialerSetting.target_abandon_rate')}
                    error={(errors?.dialerSetting as any)?.target_abandon_rate?.message}
                  />
                  <Input
                    label="Counts as abandoned after (seconds waiting)"
                    type="number"
                    min={0}
                    max={60}
                    disabled={isCampaignLocked(campaignStatus, dialMethod)}
                    {...register('dialerSetting.compliance_abandon_seconds')}
                    error={(errors?.dialerSetting as any)?.compliance_abandon_seconds?.message}
                  />
                  {/* Predictive needs a crowd to forecast from. Below the floor the
                      campaign paces one call per free agent, which is honest rather
                      than a guess with the customer's time. The reference guidance
                      is fifteen consistently active agents. */}
                  <Input
                    label="Agents needed before dialling ahead"
                    type="number"
                    min={1}
                    max={50}
                    disabled={isCampaignLocked(campaignStatus, dialMethod)}
                    {...register('dialerSetting.min_agents_for_predictive')}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 font-medium text-sm">Dial ahead of agents becoming free</p>
                      <Switch
                        disabled={isCampaignLocked(campaignStatus, dialMethod)}
                        onCheckedChange={(checked) => setValue('dialerSetting.dial_ahead', checked, { shouldDirty: true })}
                        checked={watch('dialerSetting.dial_ahead') !== false}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Off means calls are placed only for agents free right now, at the ratio above.
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {dialMethod !== DIALER_TYPE.INBOUND ? (
          <div className="w-full flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-gray-900">Compliance</p>
              <p className="text-xs text-gray-500">
                The rules this campaign is held to. They apply whether the system dials or an
                agent does.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
              {/* The country being called INTO. It decides two things: which
                  abandoned-call rule this campaign is held to, and which country
                  a lead written in local format belongs to when we read its
                  number. It is not the same as the regional setting on the
                  hours tab, which says where your own team sits. */}
              <CustomSelect
                label={'Country you are calling'}
                isDisabled={isCampaignLocked(campaignStatus, dialMethod)}
                placeholder="Select country"
                options={COUNTRY_OPTIONS}
                handleChange={(e: ISELECTVALUE | null) => {
                  setValue('country', e?.value || '', { shouldDirty: true });
                }}
                value={COUNTRY_OPTIONS.find((option) => option.value === selectedCountry) || null}
                menuPlacement="auto"
              />

              {/* What that choice actually means, in the same numbers the dialer
                  enforces. Read from the server so this panel can never promise
                  hours the dialer will not keep. */}
              <div className="flex flex-col justify-center gap-1.5 rounded-md bg-gray-50 px-3 py-2.5">
                {callingRules ? (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-gray-500">Calling hours</span>
                      <span className="text-xs font-medium text-gray-900">
                        {callingRules.hoursLabel}, {callingRules.daysLabel.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-gray-500">Measured in</span>
                      <span className="text-xs font-medium text-gray-900">
                        {"the lead\u2019s own local time"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-gray-500">Abandoned calls</span>
                      <span className="text-xs font-medium text-gray-900">
                        {callingRules.abandonCapPercent}% max,{' '}
                        {callingRules.abandonWindowHours === 24
                          ? 'each day'
                          : `over ${Math.round(callingRules.abandonWindowHours / 24)} days`}
                      </span>
                    </div>
                    {countryChoice.source === 'hours' ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                        Using the hours country, {getCountryName(selectedCountry)}. Pick another above
                        if this campaign calls somewhere else.
                      </p>
                    ) : null}
                    {!callingRules.hoursConfirmed ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-amber-700">
                        {selectedCountry
                          ? `We have not had ${getCountryName(selectedCountry)} hours checked yet, so the safest common window is used until we do.`
                          : 'No country chosen, so the safest common window is used. Choosing one lets us apply that country\u2019s own rules where we have them.'}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    {callingRulesFailed
                      ? 'We could not load the rules to show you. They are still applied when calls are made.'
                      : 'Checking the rules for this country\u2026'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-1 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2">
                <p className="text-gray-900 font-medium text-sm">Only call leads with consent on file</p>
                <Switch
                  disabled={isCampaignLocked(campaignStatus, dialMethod)}
                  onCheckedChange={(checked) => setValue('require_consent', checked, { shouldDirty: true })}
                  checked={Boolean(watch('require_consent'))}
                />
              </div>
              {/* Say what this switch really does. The old text promised
                  consent could be set "on the contact's record" - a contact has
                  no such field - and that leads are "parked as No consent",
                  which only the server-dialled modes do. A preview campaign
                  simply offers agents nothing, so a group uploaded without a
                  consent column looks like a broken dialer. */}
              <p className="text-xs text-gray-500">
                Only contacts uploaded with a <span className="font-mono">consent</span> column set to given are
                offered or dialled. A contact record has no consent switch of its own, so if the lead group was
                uploaded without that column, this campaign will offer nothing at all.
              </p>
            </div>
          </div>
        ) : null}

        {dialMethod === DIALER_TYPE.PREDICTIVE || dialMethod === DIALER_TYPE.NORMAL ? (
          <>
            {dialMethod === DIALER_TYPE.PREDICTIVE ? (
            <div className="w-full flex items-start flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-gray-900 font-medium text-sm">Automatic Answer</p>
                <Switch
                  disabled={isCampaignLocked(campaignStatus, dialMethod)}
                  onCheckedChange={(checked) => {
                    setValue(`dialerSetting.auto_answering.enabled`, checked, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  checked={Boolean(watch('dialerSetting.auto_answering.enabled'))}
                />
              </div>
              {watch('dialerSetting.auto_answering.enabled') ? (
                <div className="flex items-center gap-2">
                  <Input
                    label="Answer after (seconds)"
                    disabled={isCampaignLocked(campaignStatus, dialMethod)}
                    placeholder="Timeout in seconds"
                    type="number"
                    {...register('dialerSetting.auto_answering.timeout')}
                    error={(errors?.dialerSetting as any)?.auto_answering?.timeout?.message}
                    min={2}
                    max={30}
                  />
                </div>
              ) : null}
            </div>
            ) : null}
            <div className="w-full flex items-start gap-2 flex-col">
              <div className="flex items-center gap-2">
                <p className="text-gray-900 font-medium text-sm">Answering Machine Detection</p>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title="Detection runs on the switch. Where the switch has the detection module this choice is applied on every campaign call; where it does not, the choice is stored and calls reach agents unscreened.">
                  applied where the switch supports it
                </span>
                <span
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                  title="The switch listens for about three seconds after the call is answered. A short greeting followed by silence is a person; a greeting that keeps going is a machine. When unsure it treats the call as a person."
                >
                  on server-dialled calls
                </span>
                <Switch
                  disabled={isCampaignLocked(campaignStatus, dialMethod)}
                  onCheckedChange={(checked) => {
                    setValue(`dialerSetting.answering_detection_machine.enabled`, checked);
                  }}
                  checked={watch('dialerSetting.answering_detection_machine.enabled')}
                />
              </div>
              {watch('dialerSetting.answering_detection_machine.enabled') ? (
                <div className="flex w-full gap-4 h-10">
                  <div className="flex w-full gap-4 items-end">
                    <div className="flex gap-8 items-center ">
                      <Label>Select Action:</Label>
                      <RadioGroup
                        disabled={isCampaignLocked(campaignStatus, dialMethod)}
                        className="flex items-center gap-4 h-10"
                        value={watch('dialerSetting.answering_detection_machine.type')}
                        onValueChange={(value) =>
                          setValue('dialerSetting.answering_detection_machine.type', value)
                        }
                      >
                        <div className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="HANGUP" id="HANGUP" />
                          <Label htmlFor="HANGUP" className="cursor-pointer">
                            Hangup
                          </Label>
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="VOICEMAIL" id="VOICEMAIL" />
                          <Label htmlFor="VOICEMAIL" className="cursor-pointer">
                            Voicemail Message
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <>
                      {watch('dialerSetting.answering_detection_machine.type') === 'VOICEMAIL' && (
                        <div className="flex gap-1.5 relative flex-row">
                          <CustomSelect
                            isDisabled={isCampaignLocked(campaignStatus, dialMethod)}
                            options={
                              voicemailList?.length > 0
                                ? voicemailList?.map((item: { name: string; uuid: string }) => ({
                                    label: item?.name,
                                    value: item?.uuid,
                                  }))
                                : [{ label: 'No record found!', value: '', disabled: true }]
                            }
                            handleChange={(e: ISELECTVALUE | null) => {
                              setValue('dialerSetting.answering_detection_machine.value', e, {
                                shouldValidate: true,
                              });
                            }}
                            value={watch('dialerSetting.answering_detection_machine.value') || {}}
                            error={
                              (errors?.dialerSetting as any)?.answering_detection_machine?.value
                                ?.value?.message
                            }
                            menuPlacement="auto"
                          />
                        </div>
                      )}
                    </>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <div
          className={`w-full flex gap-6 ${isCampaignLocked(campaignStatus, dialMethod) ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div className="w-full">
            <div className="w-full flex items-center gap-2 mb-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  <h3 className="text-gray-900 font-semibold text-md">Agent Disposition</h3>
                  {(errors as any)?.agentDisposition?.message && (
                    <ErrorTooltip text={(errors as any)?.agentDisposition?.message} />
                  )}
                </div>
                <Button
                  className="shadow-none"
                  variant="secondary"
                  type="button"
                  onClick={() => setModalState(true)}
                >
                  <Icon name="Plus" className="w-3 h-3" />
                </Button>
              </div>
              {/* The Skip reason tick is what puts a disposition in front of the
                  agent when they skip a lead. Nothing on this screen said so, so
                  a campaign could be set up with every disposition switched on and
                  the agent would still be asked nothing. */}
              {dialMethod === DIALER_TYPE.PREVIEW ? (
                <p className="text-xs text-gray-500">
                  Switch a disposition on to offer it after a call. Also tick{' '}
                  <span className="font-medium text-gray-700">Skip reason</span> to have the
                  agent choose it when they skip a lead without calling.
                  {!declineDispositionCount ? (
                    <span className="text-amber-600">
                      {' '}
                      None are ticked, so a skip goes through without asking anything.
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
            {/* <div
              className={`w-full h-full grid grid-cols-2 gap-2 overflow-y-auto ${dialMethod === 'PREDICTIVE' ? 'max-h-[calc(100vh_-_41rem)]' : 'max-h-[calc(100vh_-_30rem)]'}  pr-1`}
            > */}
            <div className={`w-full h-full grid grid-cols-2 gap-2 overflow-y-auto `}>
              {dispositionsList && dispositionsList?.length
                ? dispositionsList
                    ?.filter((item: any) => item?.dispositionType?.toLowerCase() === 'agent')
                    ?.map((item: any) => (
                      <div
                        className="w-full  flex items-center justify-between gap-3"
                        key={`${item?.disposition?.name}`}
                      >
                        <div className="w-full p-2 border border-gray-200 rounded-lg flex items-center justify-between gap-2  min-h-[62px]">
                          <div className="flex items-center gap-3">
                            <Switch
                              id={item?._id}
                              onCheckedChange={(checked) => {
                                handleDispositionCheck(checked, item);
                              }}
                              checked={isDispositionChecked(item)}
                            />
                            <label
                              htmlFor={item?._id}
                              className="text-gray-900/80 font-semibold text-sm"
                            >
                              {item?.disposition?.name}
                            </label>
                          </div>
                          {/* Only a chosen disposition can also be a skip reason, and
                              only on a preview campaign, where an agent decides. */}
                          {dialMethod === DIALER_TYPE.PREVIEW && isDispositionChecked(item) ? (
                            <label className="flex items-center gap-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={isDeclineDisposition(item)}
                                onChange={(e) => toggleDeclineDisposition(e.target.checked, item)}
                                disabled={isCampaignLocked(campaignStatus, dialMethod)}
                              />
                              Skip reason
                            </label>
                          ) : null}
                        </div>
                        {/* <Button
                        className="shadow-none min-w-[70px]"
                        variant={'secondary'}
                        type="submit"
                      >
                        Retry
                      </Button> */}
                      </div>
                    ))
                : null}
              {/* items */}

              {/* ---- */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
