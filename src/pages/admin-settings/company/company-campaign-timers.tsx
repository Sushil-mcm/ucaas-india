import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import { SectionHeading } from './section-heading';
import { SectionActions } from './section-actions';
import { handleAlert } from '@/lib/utils';
import { saveSection } from '@/lib/company-settings-api';
import {
  CAMPAIGN_TIMERS_SECTION,
  CampaignTimerKey,
  CampaignTimers,
  DEFAULT_CAMPAIGN_TIMERS,
  TIMER_LABELS,
  TIMER_RANGES,
  isWithinRange,
  isWrapupMode,
} from '@/lib/campaign-timers';
import { CAMPAIGN_TIMERS_QUERY_KEY, useCampaignTimers } from '@/hooks/use-campaign-timers';
import { WRAPUP_PROMPT_MODES } from '@/pages/admin-settings/phone-systems/call-queue/constant';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';

/* Company › Campaign timers.
 *
 * The defaults every new campaign starts from: how long an agent may look at
 * a lead, how long wrap-up lasts and which rule applies, and the pause
 * before the next lead. A campaign may change those three on its own
 * Settings tab. The last one - how often the agent screen checks for a lead
 * when there is none - is company-wide and lives only here. */

type Draft = Record<CampaignTimerKey, string> & { wrapup_mode: CampaignTimers['wrapup_mode'] };

const toDraft = (t: CampaignTimers): Draft => ({
  preview_time: String(t.preview_time),
  wrapup_time: String(t.wrapup_time),
  wrapup_mode: t.wrapup_mode,
  wait_after_call: String(t.wait_after_call),
  contact_retry: String(t.contact_retry),
});

const NUMBER_KEYS: CampaignTimerKey[] = [
  'preview_time',
  'wrapup_time',
  'wait_after_call',
  'contact_retry',
];

const rangeError = (key: CampaignTimerKey, value: string): string => {
  if (value.trim() === '') return 'Enter a number';
  if (isWithinRange(key, value)) return '';
  const { min, max } = TIMER_RANGES[key];
  return `Between ${min} and ${max}`;
};

const CompanyCampaignTimers = () => {
  const queryClient: any = useQueryClient();
  const { timers: saved, version, isLoading, isError, refetch } = useCampaignTimers();
  const [draft, setDraft] = useState<Draft>(toDraft(DEFAULT_CAMPAIGN_TIMERS));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setDraft(toDraft(saved));
  }, [saved, dirty]);

  const errors = Object.fromEntries(
    NUMBER_KEYS.map((key) => [key, rangeError(key, draft[key])]),
  ) as Record<CampaignTimerKey, string>;
  const hasError = NUMBER_KEYS.some((key) => errors[key]);

  const setField = (key: CampaignTimerKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const settings: CampaignTimers = {
        schema_version: 1,
        preview_time: Number(draft.preview_time),
        wrapup_time: Number(draft.wrapup_time),
        wrapup_mode: isWrapupMode(draft.wrapup_mode)
          ? draft.wrapup_mode
          : DEFAULT_CAMPAIGN_TIMERS.wrapup_mode,
        wait_after_call: Number(draft.wait_after_call),
        contact_retry: Number(draft.contact_retry),
      };
      return saveSection({
        section: CAMPAIGN_TIMERS_SECTION,
        settings,
        ...(typeof version === 'number' ? { version } : {}),
      });
    },
    onSuccess: () => {
      handleAlert({ type: 'success', text: 'Campaign timers saved' });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_TIMERS_QUERY_KEY });
    },
  });

  if (isLoading) return <Loader />;
  if (isError) {
    return (
      <div className="p-4 text-sm text-red-600">
        Could not load the campaign timers.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  const numberField = (key: CampaignTimerKey) => (
    <div key={key} className="flex flex-col gap-1">
      <Input
        type="number"
        label={TIMER_LABELS[key].label}
        min={TIMER_RANGES[key].min}
        max={TIMER_RANGES[key].max}
        step={1}
        value={draft[key]}
        error={errors[key]}
        onChange={(e) => setField(key, e.target.value)}
      />
      <p className="text-xs text-gray-500">
        {TIMER_LABELS[key].help} Between {TIMER_RANGES[key].min} and {TIMER_RANGES[key].max}.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        icon={<Timer size={20} />}
        title="Campaign timers"
        description="What every new campaign starts with. A campaign can change the first three on its own Settings tab; the last one applies to the whole company."
      />
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Defaults for new campaigns</h3>
          <p className="text-xs text-gray-500">
            Changing these does not change a campaign that already exists.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {numberField('preview_time')}
          {numberField('wrapup_time')}
          <div className="flex flex-col gap-1">
            <CustomSelect
              label="Wrap-up rule"
              placeholder="Select Option"
              options={WRAPUP_PROMPT_MODES}
              handleChange={(e: ISELECTVALUE | null) => {
                const next = String(e?.value || '');
                setDraft((prev) => ({
                  ...prev,
                  wrapup_mode: isWrapupMode(next) ? next : DEFAULT_CAMPAIGN_TIMERS.wrapup_mode,
                }));
                setDirty(true);
              }}
              value={
                WRAPUP_PROMPT_MODES.find((mode: any) => mode.value === draft.wrapup_mode) ||
                WRAPUP_PROMPT_MODES.find(
                  (mode: any) => mode.value === DEFAULT_CAMPAIGN_TIMERS.wrapup_mode,
                )
              }
              menuPlacement="auto"
            />
            <p className="text-xs text-gray-500">
              Whether an agent may skip the wrap-up, must note the outcome, or is moved on when the time runs out.
            </p>
          </div>
          {numberField('wait_after_call')}
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-800">Company-wide</h3>
          <p className="text-xs text-gray-500 mb-3">Not something a campaign can change.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{numberField('contact_retry')}</div>
        </div>
      </div>
      <SectionActions>
        <Button
          type="button"
          variant="primary"
          className="min-h-9"
          disabled={!dirty || hasError || isPending}
          onClick={() => save()}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </SectionActions>
    </div>
  );
};

export default CompanyCampaignTimers;
