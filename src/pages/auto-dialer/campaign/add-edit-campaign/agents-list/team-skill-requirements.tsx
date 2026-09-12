import CustomSelect from '@/components/custom/custom-select';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import RequirementRows from '@/pages/admin-settings/phone-systems/call-queue/add-edit-call-queue/ring-strategy/requirement-rows';
import { ROUTING_ORDERS } from '@/pages/admin-settings/phone-systems/call-queue/constant';
import {
  readRouting,
  useSkillCategories,
  useSkillsCatalogue,
} from '@/hooks/use-queue-skills';
import { RequirementRow, effectiveRows, legacyFromRows, normaliseRows } from '@/lib/queue-requirements';
import { DIALER_TYPE } from '../consts';

/* "Who can take these calls": the campaign's requirement rows, one per skill
   category, in the same shape and with the same editor a call queue uses.
   The form keeps the block at the top level as `routing`; the mapper writes
   it to settings.routing beside the flat legacy fields, and the campaign's
   own queue mirrors it, so the live picker reads it with no change.

   Rows without a skill yet live only in the draft here, the way the queue
   editor does it, so a half-made row can never fail the save. */

const PER_LEAD_TITLE = 'Leads that name a skill';
const PER_LEAD_TEXT =
  'If your list has a Skill column, a lead is only offered to people rated on that skill. Leads nobody on the team can take are listed on the campaign page and never dialled.';
const PREVIEW_NOTE =
  'In preview, a person only sees leads they can take. A lead with an owner always goes to its owner.';
const PACED_NOTE =
  'An answered call rings the best-fitting free person first. If nobody who holds the lead’s skill is free, the lead waits for the next round instead of being dialled.';

interface TeamSkillRequirementsProps {
  dialMethod?: string;
}

const TeamSkillRequirements = ({ dialMethod = DIALER_TYPE.PREVIEW }: TeamSkillRequirementsProps) => {
  const { setValue, watch } = useFormContext();
  const routingRaw = watch('routing') || {};
  const routingKey = JSON.stringify(routingRaw);
  const routing = useMemo(() => readRouting(routingRaw), [routingKey]);
  const { options: skillOptions, isLoading: skillsLoading } = useSkillsCatalogue();
  const { rows: categories } = useSkillCategories();

  /* Saved rows, or the old flat list shown as one row until touched. */
  const savedRows = useMemo(() => effectiveRows(routing), [routing]);
  const [draft, setDraft] = useState<RequirementRow[] | null>(null);
  const rows: RequirementRow[] = draft ?? savedRows;

  const writeRows = (next: RequirementRow[]) => {
    setDraft(next);
    const kept = normaliseRows(next);
    setValue('routing.requirements', kept, { shouldDirty: true });
    /* The flat fields too, exactly as the queue form writes them. */
    const legacy = legacyFromRows(kept);
    setValue('routing.required_skills', legacy.required_skills, { shouldDirty: true });
    setValue('routing.min_stars', legacy.min_stars, { shouldDirty: true });
    setValue('routing.evaluation', legacy.evaluation, { shouldDirty: true });
    if (!routingRaw?.order) setValue('routing.order', 'best_first', { shouldDirty: true });
  };

  const hasRows = normaliseRows(rows).length > 0;
  const isInbound = dialMethod === DIALER_TYPE.INBOUND;
  const isPreview = dialMethod === DIALER_TYPE.PREVIEW;

  return (
    <section
      className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 flex flex-col gap-3"
      data-testid="team-skill-requirements"
    >
      <div>
        <h3 className="text-gray-900 font-semibold text-sm">Who can take these calls</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Add a category and the skills that count. A person is offered a call only when they
          meet every row. Leave it empty and anyone on the team is offered calls.
        </p>
      </div>

      <RequirementRows
        rows={rows}
        onChange={writeRows}
        skills={skillOptions}
        categories={categories}
        loading={skillsLoading}
      />

      {hasRows && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <CustomSelect
              label="Who rings first"
              options={ROUTING_ORDERS}
              value={ROUTING_ORDERS.find((o) => o.value === routing.order) || ROUTING_ORDERS[0]}
              handleChange={(picked: any) =>
                setValue('routing.order', picked?.value === 'fair' ? 'fair' : 'best_first', {
                  shouldDirty: true,
                })
              }
            />
          </div>
          <p className="text-xs text-gray-500 flex-1 min-w-[14rem]">
            {ROUTING_ORDERS.find((o) => o.value === routing.order)?.description ||
              ROUTING_ORDERS[0].description}
          </p>
        </div>
      )}

      {!isInbound && (
        <div className="border-t border-gray-200 pt-3 flex flex-col gap-1">
          <h4 className="text-gray-900 font-semibold text-xs">{PER_LEAD_TITLE}</h4>
          <p className="text-xs text-gray-500">{PER_LEAD_TEXT}</p>
          <p className="text-xs text-gray-600 mt-1">{isPreview ? PREVIEW_NOTE : PACED_NOTE}</p>
        </div>
      )}
    </section>
  );
};

export default TeamSkillRequirements;
