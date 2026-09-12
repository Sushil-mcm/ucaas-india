import CustomSelect from '@/components/custom/custom-select';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';

/* "Skill match" on the campaign call log.
 *
 * Each campaign call's routing record says whether the person who answered
 * was chosen with the lead's skill held at the bar (matched), after the
 * requirement had relaxed (relaxed), or with no skill asked for at all. The
 * list is filtered server-side by the `skill_match` key in `filters`, the
 * same way it is filtered by campaign; this is only the control. */

export type SkillMatch = '' | 'matched' | 'relaxed' | 'none';

export const SKILL_MATCH_FILTER_KEY = 'skill_match';

export const SKILL_MATCH_OPTIONS: Array<ISELECTVALUE & { value: SkillMatch }> = [
  { label: 'Any skill match', value: '' },
  { label: 'Matched', value: 'matched' },
  { label: 'Relaxed', value: 'relaxed' },
  { label: 'No skill', value: 'none' },
];

/* The list's payload with the Skill match choice merged into `filters`: any
   earlier skill_match entry is replaced, the other filters (the campaign,
   the answered-only view) pass through untouched, and an empty choice sends
   no skill_match key at all. Pure, so the shape the server receives is
   provable without the list. */
export const withSkillMatchFilter = <
  T extends { filters?: Array<{ key: string; value: unknown }>; [key: string]: unknown },
>(
  payloadExtraParams: T | undefined,
  skillMatch: SkillMatch,
): T & { filters: Array<{ key: string; value: unknown }> } => ({
  ...((payloadExtraParams || {}) as T),
  filters: [
    ...(payloadExtraParams?.filters || []).filter((f) => f?.key !== SKILL_MATCH_FILTER_KEY),
    ...(skillMatch ? [{ key: SKILL_MATCH_FILTER_KEY, value: skillMatch }] : []),
  ],
});

interface SkillMatchFilterProps {
  value: SkillMatch;
  onChange: (next: SkillMatch) => void;
}

const SkillMatchFilter = ({ value, onChange }: SkillMatchFilterProps) => (
  <div className="w-[180px]" title="Matched: the lead's skill was held. Relaxed: taken after the requirement loosened. No skill: the lead asked for none.">
    <CustomSelect
      className="w-full"
      label=""
      placeholder="Skill match"
      options={SKILL_MATCH_OPTIONS}
      value={SKILL_MATCH_OPTIONS.find((o) => o.value === value) || SKILL_MATCH_OPTIONS[0]}
      handleChange={(picked: ISELECTVALUE | null) => onChange((picked?.value as SkillMatch) || '')}
      menuPlacement="auto"
    />
  </div>
);

export default SkillMatchFilter;
