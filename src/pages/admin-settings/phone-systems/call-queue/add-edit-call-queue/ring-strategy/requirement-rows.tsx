import CustomSelect from '@/components/custom/custom-select';
import StarRating from '@/components/custom/star-rating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/assets/icons/icon';
import { RequirementRow, describeRelax } from '@/lib/queue-requirements';
import { SkillCategory, SkillOption } from '@/hooks/use-queue-skills';
import { ROW_MATCH_OPTIONS, ROW_RELAX_OPTIONS, ROW_WEIGHTS } from '../../constant';
import { Link } from 'react-router-dom';

/* The rows of a queue's requirement, one per category.
 *
 * Read across, a row is a sentence: "Language: Spanish or French, at 3 stars
 * or better, counts double, holds for the whole wait." Every row must be
 * met; inside a row any one skill will do (or all, when the row says so).
 * Rows without a skill yet live only here - the form gets the rows that
 * mean something, so a half-made row can never fail the save. */

const RELAX_NEEDS_SECONDS = ['one_star', 'drop', 'one_star_then_drop'];
const SECONDS_MIN = 15;
const SECONDS_MAX = 3600;

interface RequirementRowsProps {
  rows: RequirementRow[];
  onChange: (rows: RequirementRow[]) => void;
  skills: SkillOption[];
  categories: SkillCategory[];
  loading?: boolean;
  /* Two settings that live elsewhere on this screen decide whether parts of a
     row do anything at all. A row cannot see them on its own, so they are
     passed in rather than left to mislead:

       order === 'fair'        the queue service never scores anybody, so the
                               row weight changes nothing
       escalationEnabled false the ring never widens, so a row set to follow it
                               behaves exactly like "Hold for the whole wait"

     Both were previously offered as live controls in either state. */
  order?: string;
  escalationEnabled?: boolean;
}

export const emptyRow = (category?: SkillCategory): RequirementRow => ({
  category_id: category?._id || '',
  category_name: category?.name || '',
  skill_ids: [],
  min_stars: 1,
  match: 'ANY',
  weight: 1,
  relax: { after_seconds: 60, to: category?.kind === 'language' ? 'never' : 'one_star_then_drop' },
});

const RequirementRows = ({
  rows,
  onChange,
  skills,
  categories,
  loading,
  order,
  escalationEnabled,
}: RequirementRowsProps) => {
  const rankingOff = order === 'fair';
  const used = new Set(rows.map((row) => row.category_id).filter(Boolean));
  const unused = categories.filter((category) => !used.has(category._id));

  const update = (index: number, patch: Partial<RequirementRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const add = () => onChange([...rows, emptyRow(unused[0])]);

  if (!categories.length && !loading) {
    return (
      <p className="text-xs text-amber-700 px-1">
        No skills exist yet. Add some under{' '}
        <Link to="/admin-settings/phone/skills" className="text-primary underline">
          Phone System → Skills
        </Link>
        , then rate people on them.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const category = categories.find((c) => c._id === row.category_id);
        const inCategory = skills.filter(
          (s) => s.category_id === row.category_id || row.skill_ids.includes(s.value),
        );
        const chosen = inCategory.filter((s) => row.skill_ids.includes(s.value));
        const categoryOptions = categories.map((c) => ({
          value: c._id,
          label: c.name,
          isDisabled: c._id !== row.category_id && used.has(c._id),
        }));
        const needsSeconds = RELAX_NEEDS_SECONDS.includes(row.relax.to);
        return (
          <div
            key={`${row.category_id || 'row'}-${index}`}
            className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-48 max-w-full">
                <CustomSelect
                  label="Category"
                  options={categoryOptions}
                  value={categoryOptions.find((o) => o.value === row.category_id) || null}
                  handleChange={(picked: any) => {
                    const next = categories.find((c) => c._id === picked?.value);
                    update(index, {
                      category_id: next?._id || '',
                      category_name: next?.name || '',
                      /* Skills belong to one category; a new heading starts empty. */
                      skill_ids: next?._id === row.category_id ? row.skill_ids : [],
                    });
                  }}
                  placeholder="Choose"
                />
              </div>
              <div className="flex-1 min-w-[14rem]">
                <CustomSelect
                  label={
                    category?.kind === 'language' ? 'Languages that count' : 'Skills that count'
                  }
                  isMulti
                  isClearable
                  isLoading={loading}
                  isDisabled={!row.category_id}
                  placeholder={
                    !row.category_id
                      ? 'Choose a category first'
                      : inCategory.length
                        ? 'Choose skills'
                        : `No skills in ${category?.name || 'this category'} yet`
                  }
                  options={inCategory}
                  value={chosen}
                  handleChange={(picked: any) =>
                    update(index, {
                      skill_ids: (Array.isArray(picked) ? picked : []).map((o: any) => String(o?.value)),
                    })
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                title="Remove this row"
                className="flex items-center justify-center rounded-full w-9 h-9 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white shrink-0"
              >
                <Icon name="TrashBin" className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-x-5 gap-y-3 text-sm">
              {row.skill_ids.length > 1 && (
                <div className="w-44">
                  <CustomSelect
                    label="A person needs"
                    options={ROW_MATCH_OPTIONS}
                    value={ROW_MATCH_OPTIONS.find((o) => o.value === row.match) || ROW_MATCH_OPTIONS[0]}
                    handleChange={(picked: any) =>
                      update(index, { match: picked?.value === 'ALL' ? 'ALL' : 'ANY' })
                    }
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">At least</span>
                <div className="flex items-center gap-2 h-10">
                  <StarRating
                    value={row.min_stars}
                    label={`${row.category_name || 'Row'} minimum`}
                    onChange={(next) => update(index, { min_stars: Math.max(1, Math.min(5, next || 1)) })}
                  />
                  <span className="text-xs text-gray-500 tabular-nums">{row.min_stars} of 5</span>
                </div>
              </div>
              <div className="w-44">
                <CustomSelect
                  label="Importance when ranking"
                  options={ROW_WEIGHTS}
                  isDisabled={rankingOff}
                  value={ROW_WEIGHTS.find((o) => o.value === row.weight) || ROW_WEIGHTS[0]}
                  handleChange={(picked: any) =>
                    update(index, { weight: Math.max(1, Math.min(5, Number(picked?.value) || 1)) })
                  }
                />
              </div>
              <div className="w-64 max-w-full">
                <CustomSelect
                  label="While the caller waits"
                  options={ROW_RELAX_OPTIONS}
                  value={ROW_RELAX_OPTIONS.find((o) => o.value === row.relax.to) || ROW_RELAX_OPTIONS[0]}
                  handleChange={(picked: any) =>
                    update(index, {
                      relax: {
                        to: picked?.value || 'never',
                        after_seconds: Math.max(SECONDS_MIN, row.relax.after_seconds || 60),
                      },
                    })
                  }
                />
              </div>
              {needsSeconds && (
                <div className="w-28">
                  <Input
                    type="number"
                    label="After (seconds)"
                    min={SECONDS_MIN}
                    max={SECONDS_MAX}
                    value={row.relax.after_seconds}
                    onChange={(event) =>
                      update(index, {
                        relax: {
                          ...row.relax,
                          after_seconds: Math.max(
                            SECONDS_MIN,
                            Math.min(SECONDS_MAX, Number(event.target.value) || SECONDS_MIN),
                          ),
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
            {/* The sentence only claims what is actually in force. It used to
                read "counts 2x" even when the queue was set to Share the work
                and nothing was ever scored. */}
            <p className="text-xs text-gray-500">
              {row.skill_ids.length === 0
                ? 'Pick at least one skill, or this row is not saved.'
                : `${row.category_name || 'This row'}: ${chosen.map((s) => s.label).join(row.match === 'ALL' ? ' and ' : ' or ')} at ${row.min_stars === 1 ? '1 star' : `${row.min_stars}+ stars`}${row.weight > 1 && !rankingOff ? `, counts ${row.weight}×` : ''}. ${describeRelax(row)}`}
            </p>
            {/* Say plainly when a control on this row is doing nothing, and why,
                rather than leaving it looking live. Both point at the setting
                that would turn it back on. */}
            {rankingOff && row.weight > 1 ? (
              <p className="text-xs" style={{ color: 'var(--warn, #b26a00)' }}>
                Importance is ignored while this queue shares the work evenly. Set
                “Who rings first” to “Best rated first” for it to count.
              </p>
            ) : null}
            {row.relax.to === 'ladder' && escalationEnabled === false ? (
              <p className="text-xs" style={{ color: 'var(--warn, #b26a00)' }}>
                This row follows the ring widening, which is switched off, so it holds
                for the whole wait. Turn on “Widen the ring” for it to loosen.
              </p>
            ) : null}
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" className="min-h-9" onClick={add} disabled={!unused.length}>
          {rows.length ? 'Add another category' : 'Add a category'}
        </Button>
        {!unused.length && categories.length > 0 && (
          <span className="text-xs text-gray-500">Every category is already on this queue.</span>
        )}
      </div>
    </div>
  );
};

export default RequirementRows;
