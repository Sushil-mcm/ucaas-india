/* Applying a User Settings Template to many people at once.
 *
 * Until now a template could only be picked one person at a time, from that
 * person's own Edit screen — useful, but it means a template meant to save
 * an admin two hundred trips through that screen still needed two hundred
 * trips to actually hand out. This screen is the other entry point: start
 * from the template, pick who gets it, apply it to all of them in one run.
 *
 * The decision of *which* fields a template writes, and to what value, is
 * not repeated here — src/lib/apply-user-settings-template.ts already answers
 * that question for the single-person screen, and this reuses the exact same
 * answer so a person handed a template from either screen ends up in the
 * same state. This file is only the picker and the run: pick the people,
 * build each one's payload from the shared decision module, save one at a
 * time, report what happened.
 *
 * Same two carefulness rules as the company-wide bulk-settings screen next
 * door (src/pages/admin-settings/company/company-bulk-settings.tsx):
 *   - A person this template has nothing to say to (every field on it is
 *     "leave people alone") is reported as skipped and never saved.
 *   - Saves run one at a time with a pause between them, not in parallel —
 *     each one regenerates that person's routing.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import Loader from '@/components/custom/loader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { invalidateGlobalUsersDirectory } from '@/lib/invalidate-global-users-directory';
import { asObject } from '@/lib/bulk-user-settings';
import {
  applyFieldWrites,
  buildTemplateGreetingsWrites,
  buildTemplateSettingsWrites,
} from '@/lib/apply-user-settings-template';
import { handleAlert } from '@/lib/utils';
import { getUserList, updateMemberForwading } from '@/services/api';

/* Same pause as the company-wide bulk screen, and for the same reason: these
   saves regenerate routing, and a burst of parallel writes is how a bulk
   action turns into an outage instead of a convenience. */
const BATCH_PAUSE_MS = 150;

const pause = () =>
  new Promise((resolve) => {
    setTimeout(resolve, BATCH_PAUSE_MS);
  });

interface PersonRow {
  uuid: string;
  name: string;
  detail: string;
  row: any;
}

type Outcome = 'changed' | 'skipped' | 'failed';

interface RunResult {
  outcome: Outcome;
  text: string;
}

const OUTCOME_ICON: Record<Outcome, typeof CheckCircle2> = {
  changed: CheckCircle2,
  skipped: AlertTriangle,
  failed: XCircle,
};

const OUTCOME_COLOUR: Record<Outcome, string> = {
  changed: 'text-green-600',
  skipped: 'text-amber-600',
  failed: 'text-red-600',
};

const personName = (row: any): string => {
  const full = `${row?.first_name || ''} ${row?.last_name || ''}`.trim();
  return full || row?.name || row?.email || 'Unnamed person';
};

const parseMaybeJson = (value: unknown): any => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
};

/**
 * Everything one person needs, worked out from the template plus that
 * person's own current record. Returns null when the template has nothing
 * to say to this person at all, so the caller can skip them without saving.
 */
const buildApplyPayload = (person: any, template: any): Record<string, any> | null => {
  const templateSettings = parseMaybeJson(template?.settings);
  const templateGreetings = parseMaybeJson(template?.greetings);

  /* forceDisplayNumber: true — matches the single-person screen, which
     always writes outgoing caller ID the moment a template is chosen. It is
     the one setting already wired to a live call (see the User Settings
     Templates list), so it is the one field that must never depend on the
     template author remembering to flip its own apply flag. */
  const settingsWrites = buildTemplateSettingsWrites(templateSettings, { forceDisplayNumber: true });
  const greetingsWrites = buildTemplateGreetingsWrites(templateGreetings);

  if (settingsWrites.length === 0 && greetingsWrites.length === 0) return null;

  const merged = applyFieldWrites(
    { settings: asObject(person?.settings), greetings: asObject(person?.greetings) },
    [...settingsWrites, ...greetingsWrites],
  );

  const roleId = person?.custom_role_uuid || person?.role_uuid;
  const siteUuid = person?.site_uuid || person?.site?.uuid;

  return {
    first_name: person?.first_name,
    last_name: person?.last_name,
    job_title: person?.job_title,
    ...(person?.caller_id ? { caller_id: person.caller_id } : {}),
    ...(siteUuid ? { site_uuid: siteUuid } : {}),
    ...(person?.custom_role_uuid ? { custom_role_uuid: roleId } : { role_uuid: roleId }),
    greetings: merged.greetings,
    /* Templates do not touch call routing/devices — only settings and
       greetings — so this rides through exactly as the person already had
       it, the same way an untouched field survives on the settings side. */
    call_forwarding: asObject(person?.call_forwarding),
    settings: merged.settings,
    uuid: person?.uuid,
    userID: person?.uuid,
  };
};

const ApplyUserSettingsTemplate = ({
  template,
  onClose,
}: {
  template: any;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [ran, setRan] = useState(false);

  const { data: rows = [], isPending: loadingPeople } = useQuery({
    queryKey: ['fetchUsersList', 'applyUserSettingsTemplate'],
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
        person.name.toLowerCase().includes(needle) || person.detail.toLowerCase().includes(needle),
    );
  }, [people, search]);

  const chosenPeople = useMemo(
    () => people.filter((person) => selected[person.uuid]),
    [people, selected],
  );

  /* Same function the run uses, so the count shown before pressing the
     button is the count that actually happens. */
  const willChangeCount = useMemo(
    () => chosenPeople.filter((person) => buildApplyPayload(person.row, template) !== null).length,
    [chosenPeople, template],
  );

  const { mutate: run, isPending: running } = useMutation({
    mutationFn: async () => {
      const tally = { changed: 0, skipped: 0, failed: 0 };
      const collected: Record<string, RunResult> = {};

      for (const person of chosenPeople) {
        const payload = buildApplyPayload(person.row, template);

        if (!payload) {
          collected[person.uuid] = {
            outcome: 'skipped',
            text: 'This template has nothing turned on to apply, so nothing was saved.',
          };
          tally.skipped += 1;
          continue;
        }

        try {
          await updateMemberForwading(payload);
          collected[person.uuid] = { outcome: 'changed', text: 'Template applied.' };
          tally.changed += 1;
        } catch (error: any) {
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
      const parts: string[] = [];
      if (tally.changed > 0) parts.push(`Applied to ${tally.changed}.`);
      if (tally.skipped > 0) parts.push(`${tally.skipped} skipped — nothing on the template to give them.`);
      if (tally.failed > 0) parts.push(`${tally.failed} failed to save.`);
      handleAlert({
        type: tally.failed > 0 ? 'warning' : 'success',
        text: parts.join(' ') || 'Nothing to do — no people were selected.',
      });
      if (tally.changed > 0) {
        invalidateGlobalUsersDirectory(queryClient);
        queryClient.invalidateQueries({ queryKey: ['fetchUsersList', 'applyUserSettingsTemplate'] });
      }
    },
    onError: () =>
      handleAlert({ type: 'error', text: 'The run could not be started. Please try again.' }),
  });

  const allVisibleOn = visible.length > 0 && visible.every((person) => selected[person.uuid]);

  const toggleAllVisible = () =>
    setSelected((previous) => {
      const next = { ...previous };
      visible.forEach((person) => {
        next[person.uuid] = !allVisibleOn;
      });
      return next;
    });

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#9A948F]" />
        <p className="text-xs text-[#2E2D35]">
          <span className="font-semibold text-[#2E2D35]">What this writes.</span> Each person you pick
          is saved with only the fields "{template?.name}" has switched on — everything else on their
          record is written back exactly as it was, the same as picking this template from that
          person's own Edit screen. A person this template has nothing turned on for is skipped rather
          than saved with no change.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#EEE7DD] p-3">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-[280px]">
            <Input
              placeholder="Search by name, extension or email"
              value={search}
              disabled={running}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2E2D35]">
              {chosenPeople.length} of {people.length} chosen
            </span>
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
        </div>

        {loadingPeople ? (
          <Loader />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#EEE7DD]">
            {visible.length === 0 ? (
              <p className="p-4 text-center text-xs text-[#9A948F]">Nobody matches that search.</p>
            ) : (
              visible.map((person) => {
                const result = ran ? results[person.uuid] : undefined;
                const Icon = result ? OUTCOME_ICON[result.outcome] : null;
                return (
                  <label
                    key={person.uuid}
                    className="flex cursor-pointer items-start gap-3 border-b border-gray-100 p-3 last:border-b-0 hover:bg-[#FBE2C8]/45"
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
                      <span className="block text-xs font-semibold text-[#2E2D35]">{person.name}</span>
                      {person.detail ? (
                        <span className="block text-xs text-[#9A948F]">{person.detail}</span>
                      ) : null}
                      {result && Icon ? (
                        <span
                          className={`mt-1 flex items-start gap-1 text-xs ${OUTCOME_COLOUR[result.outcome]}`}
                        >
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="text-[#2E2D35]">{result.text}</span>
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] p-4">
        <p className="text-xs text-[#9A948F]">
          People are saved one at a time, so a long list takes a moment. Please leave this open until
          it finishes.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={running}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => run()}
            disabled={running || chosenPeople.length === 0}
          >
            {running
              ? 'Applying...'
              : `Apply to ${willChangeCount || chosenPeople.length} ${
                  (willChangeCount || chosenPeople.length) === 1 ? 'person' : 'people'
                }`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplyUserSettingsTemplate;
