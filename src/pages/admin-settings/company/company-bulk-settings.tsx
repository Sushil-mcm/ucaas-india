/* Changing one setting for many people at once.
 *
 * Every setting on this screen can already be changed for ONE person, in the
 * settings drawer under People. What could not be done was changing it for
 * everybody. A company of two hundred people meant two hundred trips through
 * that drawer, so in practice the answer to "is recording on for the company?"
 * was whatever each person happened to have been set to years ago.
 *
 * The decisions all live in src/lib/bulk-user-settings.ts, which is a plain
 * module with no React in it and its own tests. This file is only the screen:
 * pick the settings, pick the people, show exactly what would happen, then do
 * it one person at a time and report what happened to each.
 *
 * Two things it is careful about.
 *
 * It never writes somebody it had no reason to write. The preview and the run
 * use the same function, so a person already set the way you asked is counted
 * and skipped rather than saved again. Each save regenerates that person's
 * routing, and a screen that quietly rewrites two hundred records to change
 * nothing is two hundred chances to break something.
 *
 * And it does not claim more than it does. A check of the call switch found
 * that none of these settings currently changes a live call — the switch does
 * not read them. So every setting here is marked "Coming soon" — the software
 * cannot do it yet, which is a different thing from an admin not having switched
 * it on — and the screen says plainly that it is putting the same answer on
 * everyone's record rather than changing what a caller hears. When that stops
 * being true, the notes here are what must change first.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Info, MinusCircle, Users, XCircle } from 'lucide-react';

import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { handleAlert } from '@/lib/utils';
import {
  describeRun,
  hasAnyChoice,
  parseRingSeconds,
  planBulkUserUpdate,
  RING_MAX_SECONDS,
  RING_MIN_SECONDS,
  type BulkChoices,
  type BulkUserPlan,
  type InternationalCallingChoice,
  type RecordingDirection,
} from '@/lib/bulk-user-settings';
import { getUserList, updateMemberForwading } from '@/services/api';

/* Saves run one at a time with a breath between them, the same as the holiday
   apply screen next door. These writes regenerate routing, and two hundred
   parallel writes is how a bulk action becomes an outage. */
const BATCH_PAUSE_MS = 150;

const pause = () =>
  new Promise((resolve) => {
    setTimeout(resolve, BATCH_PAUSE_MS);
  });

const RECORDING_OPTIONS: { label: string; value: RecordingDirection }[] = [
  { label: 'Off — do not record automatically', value: 'off' },
  { label: 'All calls', value: 'all' },
  { label: 'Incoming calls only', value: 'incoming' },
  { label: 'Outgoing calls only', value: 'outgoing' },
];

/* "Follow the company setting" is first because it is the answer that keeps
   tracking whatever the company decides later, and it is the one an admin
   usually wants when they are undoing a personal permission rather than
   granting one. */
const INTERNATIONAL_OPTIONS: { label: string; value: InternationalCallingChoice }[] = [
  { label: 'Follow the company setting', value: 'inherit' },
  { label: 'Allowed to call other countries', value: 'allow' },
  { label: 'Not allowed to call other countries', value: 'block' },
];

/* The switch reads none of these today, so the same sentence is true of every
   one of them. It is written once and shown on each, rather than being softened
   into something vaguer that an admin could read as "it works". */
const COMING_SOON_NOTE =
  'Coming soon. This is written onto each person the same way their own settings page writes it, so it is saved and waiting — but the call switch does not read it yet, so what a caller hears does not change.';

type FieldId =
  | 'recording_automatic'
  | 'recording_on_demand'
  | 'voicemail_to_text'
  | 'transcription'
  | 'ring_seconds'
  | 'international_calling';

interface Draft {
  recording_automatic: RecordingDirection;
  recording_on_demand: boolean;
  voicemail_to_text: boolean;
  transcription: boolean;
  ring_seconds: string;
  international_calling: InternationalCallingChoice;
}

const DEFAULT_DRAFT: Draft = {
  recording_automatic: 'off',
  recording_on_demand: false,
  voicemail_to_text: false,
  transcription: false,
  ring_seconds: '30',
  /* Opens on the answer that changes nobody's permissions. Taking away the
     right to phone abroad from two hundred people should be something an admin
     chooses, never the setting a screen happened to open on. */
  international_calling: 'inherit',
};

interface PersonRow {
  uuid: string;
  name: string;
  detail: string;
  row: any;
}

type Outcome = 'changed' | 'unchanged' | 'skipped' | 'failed';

interface RunResult {
  outcome: Outcome;
  text: string;
}

const OUTCOME_ICON: Record<Outcome, typeof CheckCircle2> = {
  changed: CheckCircle2,
  unchanged: MinusCircle,
  skipped: AlertTriangle,
  failed: XCircle,
};

const OUTCOME_COLOUR: Record<Outcome, string> = {
  changed: 'text-green-600',
  unchanged: 'text-gray-400',
  skipped: 'text-amber-600',
  failed: 'text-red-600',
};

/* One tick box plus its control, so every setting on this screen reads the same
   way: decide whether to touch it at all, then decide what to set it to.
   Deliberately declared out here rather than inside the screen — a component
   rebuilt on every render is a different component each time, and React would
   throw away the box being typed into, so the ring time lost a keystroke and
   the cursor with it. */
const FieldRow = ({
  label,
  description,
  included,
  onToggle,
  disabled,
  control,
}: {
  label: string;
  description: string;
  included: boolean;
  onToggle: () => void;
  disabled: boolean;
  control: React.ReactNode;
}) => (
  <SettingRow label={label} description={description} status="coming-soon">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox checked={included} onCheckedChange={onToggle} disabled={disabled} />
        <span className="text-xs font-semibold text-gray-900">
          {included ? 'Will be changed' : 'Leave this one alone'}
        </span>
      </label>
      {included ? <div className="min-w-[240px]">{control}</div> : null}
    </div>
  </SettingRow>
);

const personName = (row: any): string => {
  const full = `${row?.first_name || ''} ${row?.last_name || ''}`.trim();
  return full || row?.name || row?.email || 'Unnamed person';
};

const CompanyBulkSettings = () => {
  const queryClient = useQueryClient();

  /* Which settings the admin has ticked. A setting not ticked is never sent —
     that is the difference between "set recording to off" and "leave recording
     alone", and confusing the two would switch recording off for everyone. */
  const [include, setInclude] = useState<Record<FieldId, boolean>>({
    recording_automatic: false,
    recording_on_demand: false,
    voicemail_to_text: false,
    transcription: false,
    ring_seconds: false,
    international_calling: false,
  });
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [ran, setRan] = useState(false);

  const { data: rows = [], isPending: loadingPeople } = useQuery({
    queryKey: ['fetchUsersList', 'companyBulkSettings'],
    queryFn: () => fetchAllPages(getUserList),
  });

  const people = useMemo<PersonRow[]>(
    () =>
      (rows as any[])
        .filter((row) => row?.uuid)
        .map((row) => ({
          uuid: String(row.uuid),
          name: personName(row),
          detail: [row?.extension ? `Ext ${row.extension}` : '', row?.email]
            .filter(Boolean)
            .join(' · '),
          row,
        })),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(
      (person) =>
        person.name.toLowerCase().includes(needle) ||
        person.detail.toLowerCase().includes(needle),
    );
  }, [people, search]);

  const ringError = useMemo(() => {
    if (!include.ring_seconds) return '';
    return parseRingSeconds(draft.ring_seconds) === null
      ? `Enter a whole number of seconds between ${RING_MIN_SECONDS} and ${RING_MAX_SECONDS}.`
      : '';
  }, [include.ring_seconds, draft.ring_seconds]);

  /* Only the ticked settings reach the decision module. */
  const choices = useMemo<BulkChoices>(() => {
    const next: BulkChoices = {};
    if (include.recording_automatic) next.recording_automatic = draft.recording_automatic;
    if (include.recording_on_demand) next.recording_on_demand = draft.recording_on_demand;
    if (include.voicemail_to_text) next.voicemail_to_text = draft.voicemail_to_text;
    if (include.transcription) next.transcription = draft.transcription;
    if (include.international_calling) next.international_calling = draft.international_calling;
    if (include.ring_seconds) {
      const seconds = parseRingSeconds(draft.ring_seconds);
      if (seconds !== null) next.ring_seconds = seconds;
    }
    return next;
  }, [include, draft]);

  const chosenPeople = useMemo(
    () => people.filter((person) => selected[person.uuid]),
    [people, selected],
  );

  /* The preview and the run call the same function on the same records, so what
     an admin is shown before pressing the button is what actually happens. */
  const preview = useMemo(() => {
    if (!hasAnyChoice(choices)) return null;
    const plans = chosenPeople.map(
      (person) => [person, planBulkUserUpdate(person.row, choices)] as const,
    );
    return {
      plans,
      changed: plans.filter(([, plan]) => plan.outcome === 'changed').length,
      unchanged: plans.filter(([, plan]) => plan.outcome === 'unchanged').length,
      skipped: plans.filter(([, plan]) => plan.outcome === 'skipped').length,
    };
  }, [chosenPeople, choices]);

  const { mutate: run, isPending: running } = useMutation({
    mutationFn: async () => {
      const tally = { changed: 0, unchanged: 0, skipped: 0, failed: 0 };
      const collected: Record<string, RunResult> = {};

      for (const person of chosenPeople) {
        const plan: BulkUserPlan = planBulkUserUpdate(person.row, choices);

        if (plan.outcome !== 'changed' || !plan.payload) {
          const notes = plan.outcome === 'unchanged' ? plan.unchanged : plan.skipped;
          collected[person.uuid] = {
            outcome: plan.outcome,
            text: notes.map((note) => note.message).join(' ') || 'Nothing to change.',
          };
          tally[plan.outcome] += 1;
          continue;
        }

        try {
          await updateMemberForwading(plan.payload);
          collected[person.uuid] = {
            outcome: 'changed',
            text: [...plan.changes, ...plan.skipped].map((note) => note.message).join(' '),
          };
          tally.changed += 1;
        } catch (error: any) {
          /* Named, not just counted. "4 failed" without saying which four
             leaves an admin with no way to finish the job by hand. */
          collected[person.uuid] = {
            outcome: 'failed',
            text: error?.response?.data?.message || 'The save was refused. Please try again.',
          };
          tally.failed += 1;
        }

        await pause();
      }

      return { tally, collected };
    },
    onSuccess: ({ tally, collected }) => {
      setResults(collected);
      setRan(true);
      handleAlert({ type: tally.failed > 0 ? 'warning' : 'success', text: describeRun(tally) });
      if (tally.changed > 0) {
        invalidateGlobalUsersDirectory(queryClient);
        queryClient.invalidateQueries({ queryKey: ['fetchUsersList', 'companyBulkSettings'] });
      }
    },
    onError: () =>
      handleAlert({ type: 'error', text: 'The run could not be started. Please try again.' }),
  });

  const toggleField = (field: FieldId) =>
    setInclude((previous) => ({ ...previous, [field]: !previous[field] }));

  const allVisibleOn = visible.length > 0 && visible.every((person) => selected[person.uuid]);

  const toggleAllVisible = () =>
    setSelected((previous) => {
      const next = { ...previous };
      visible.forEach((person) => {
        next[person.uuid] = !allVisibleOn;
      });
      return next;
    });

  const canRun =
    !running &&
    hasAnyChoice(choices) &&
    chosenPeople.length > 0 &&
    !ringError &&
    (preview?.changed || 0) > 0;

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-200/15">
      <div className="flex min-h-[65px] flex-col justify-center border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-lg font-semibold text-gray-900">Apply to many people</p>
        <p className="text-xs text-gray-500">
          Set the same answer on everybody at once, instead of opening each person in turn.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-3 sm:px-4">
        <div className="mx-auto flex w-full min-h-0 max-w-[1040px] flex-col gap-4">
          <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <p className="text-xs text-gray-700">
              <span className="font-semibold text-gray-900">What this writes.</span> Each person you
              pick is saved with only the settings you ticked changed — everything else on their
              record is written back exactly as it was. Somebody already set the way you asked is
              counted and left alone rather than saved again. This is the same change their own
              settings page makes, so it is recorded on the person, but it does not yet change what
              a caller hears.
            </p>
          </div>

          <SettingCard
            title="Choose what to change"
            description="Tick a setting to include it in this run. Anything left unticked is not touched on anyone."
            status="coming-soon"
            note={COMING_SOON_NOTE}
          >
            <FieldRow
              included={include.recording_automatic}
              onToggle={() => toggleField('recording_automatic')}
              disabled={running}
              label="Record calls automatically"
              description="Whether each person's calls start recording on their own, and in which direction."
              control={
                <CustomSelect
                  options={RECORDING_OPTIONS}
                  value={RECORDING_OPTIONS.find(
                    (option) => option.value === draft.recording_automatic,
                  )}
                  handleChange={(option: any) =>
                    setDraft((previous) => ({
                      ...previous,
                      recording_automatic: (option?.value || 'off') as RecordingDirection,
                    }))
                  }
                />
              }
            />

            <FieldRow
              included={include.recording_on_demand}
              onToggle={() => toggleField('recording_on_demand')}
              disabled={running}
              label="Let people start a recording mid-call"
              description="Whether somebody on a call can choose to start recording it themselves."
              control={
                <Switch
                  checked={draft.recording_on_demand}
                  onCheckedChange={(checked) =>
                    setDraft((previous) => ({ ...previous, recording_on_demand: !!checked }))
                  }
                  disabled={running}
                />
              }
            />

            <FieldRow
              included={include.voicemail_to_text}
              onToggle={() => toggleField('voicemail_to_text')}
              disabled={running}
              label="Turn voicemail into text"
              description="Whether a message left for this person is written out as well as recorded."
              control={
                <Switch
                  checked={draft.voicemail_to_text}
                  onCheckedChange={(checked) =>
                    setDraft((previous) => ({ ...previous, voicemail_to_text: !!checked }))
                  }
                  disabled={running}
                />
              }
            />

            <FieldRow
              included={include.transcription}
              onToggle={() => toggleField('transcription')}
              disabled={running}
              label="Write out what is said on calls"
              description="Whether each person's calls are transcribed."
              control={
                <Switch
                  checked={draft.transcription}
                  onCheckedChange={(checked) =>
                    setDraft((previous) => ({ ...previous, transcription: !!checked }))
                  }
                  disabled={running}
                />
              }
            />

            <FieldRow
              included={include.international_calling}
              onToggle={() => toggleField('international_calling')}
              disabled={running}
              label="Calling other countries"
              description="Whether each person may phone numbers outside your own country. Refusing somebody always works; allowing them never reaches past the company list under Company → Calling, which stays the ceiling."
              control={
                <CustomSelect
                  options={INTERNATIONAL_OPTIONS}
                  value={INTERNATIONAL_OPTIONS.find(
                    (option) => option.value === draft.international_calling,
                  )}
                  handleChange={(option: any) =>
                    setDraft((previous) => ({
                      ...previous,
                      international_calling: (option?.value ||
                        'inherit') as InternationalCallingChoice,
                    }))
                  }
                />
              }
            />

            <FieldRow
              included={include.ring_seconds}
              onToggle={() => toggleField('ring_seconds')}
              disabled={running}
              label="How long a phone rings"
              description="Applied to every device on the person. Someone with no devices saved yet is skipped and named."
              control={
                <Input
                  type="number"
                  min={RING_MIN_SECONDS}
                  max={RING_MAX_SECONDS}
                  value={draft.ring_seconds}
                  error={ringError}
                  disabled={running}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, ring_seconds: event.target.value }))
                  }
                />
              }
            />
          </SettingCard>

          <SettingCard
            icon={<Users className="h-5 w-5" />}
            title="Choose who this applies to"
            description="Only the people you tick are written. Nobody else is touched."
            aside={
              <span className="text-xs font-semibold text-gray-700">
                {chosenPeople.length} of {people.length} chosen
              </span>
            }
          >
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-[280px]">
                <Input
                  placeholder="Search by name, extension or email"
                  value={search}
                  disabled={running}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAllVisible}
                disabled={running || visible.length === 0}
              >
                {allVisibleOn ? 'Clear these' : `Select these ${visible.length}`}
              </Button>
            </div>

            {loadingPeople ? (
              <Loader />
            ) : (
              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-gray-200">
                {visible.length === 0 ? (
                  <p className="p-4 text-center text-xs text-gray-500">
                    Nobody matches that search.
                  </p>
                ) : (
                  visible.map((person) => {
                    const result = ran ? results[person.uuid] : undefined;
                    const Icon = result ? OUTCOME_ICON[result.outcome] : null;
                    return (
                      <label
                        key={person.uuid}
                        className="flex cursor-pointer items-start gap-3 border-b border-gray-100 p-3 last:border-b-0 hover:bg-gray-50"
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={!!selected[person.uuid]}
                          disabled={running}
                          onCheckedChange={() =>
                            setSelected((previous) => ({
                              ...previous,
                              [person.uuid]: !previous[person.uuid],
                            }))
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-gray-900">
                            {person.name}
                          </span>
                          {person.detail ? (
                            <span className="block text-xs text-gray-500">{person.detail}</span>
                          ) : null}
                          {result && Icon ? (
                            <span
                              className={`mt-1 flex items-start gap-1 text-xs ${OUTCOME_COLOUR[result.outcome]}`}
                            >
                              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="text-gray-700">{result.text}</span>
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </SettingCard>

          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
            {!hasAnyChoice(choices) ? (
              <p className="text-xs text-gray-500">
                Tick at least one setting above to see what would happen.
              </p>
            ) : chosenPeople.length === 0 ? (
              <p className="text-xs text-gray-500">Choose at least one person.</p>
            ) : (
              <p className="text-xs text-gray-700">
                <span className="font-semibold text-gray-900">Before you run this.</span>{' '}
                {preview?.changed || 0} of {chosenPeople.length} would be changed.{' '}
                {(preview?.unchanged || 0) > 0
                  ? `${preview?.unchanged} are already set that way and will not be saved. `
                  : ''}
                {(preview?.skipped || 0) > 0
                  ? `${preview?.skipped} cannot be changed and will be named below. `
                  : ''}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                People are saved one at a time, so a long list takes a moment. Please leave this
                page open until it finishes.
              </p>
              <Button type="button" variant="primary" onClick={() => run()} disabled={!canRun}>
                {running
                  ? 'Applying...'
                  : `Apply to ${preview?.changed || 0} ${
                      (preview?.changed || 0) === 1 ? 'person' : 'people'
                    }`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyBulkSettings;
