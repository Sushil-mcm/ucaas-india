/* The directory of cost centres, and where each one's spend is reported.
 *
 * The rules live in `lib/cost-centres.ts` with their own tests — what a valid
 * code is, that a split totals 100, that the most specific one wins. This screen
 * is the part somebody touches.
 *
 * Stored under `settings.cost_centres` on the company record, the same place the
 * other company-wide lists live. Nothing reads it yet, and the screen says so:
 * a finance team told their spending is being split, when no report splits it,
 * would find out at quarter end.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Coins, Plus, RotateCcw } from 'lucide-react';

import Loader from '@/components/custom/loader';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { handleAlert } from '@/lib/utils';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  saveCompanyDefaults,
} from '@/lib/company-defaults';
import { checkCentre, normaliseCode, type CostCentre } from '@/lib/cost-centres';

const STORE_KEY = 'cost_centres';

const CostCentres = () => {
  const queryClient: any = useQueryClient();
  const [centres, setCentres] = useState<CostCentre[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
  });

  useEffect(() => {
    if (!data) return;
    const stored = (data as any)?.settings?.[STORE_KEY];
    setCentres(Array.isArray(stored) ? stored : []);
    setDirty(false);
  }, [data]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: saveCompanyDefaults,
    onSuccess: () => {
      handleAlert({ text: 'Cost centres saved.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: COMPANY_DEFAULTS_QUERY_KEY });
      setDirty(false);
    },
  });

  /* Everything else on the company record travels through untouched. Writing
     only this key would delete the rest, which is the fault this codebase has
     already had three times. */
  const onSave = () => {
    const settings = { ...((data as any)?.settings || {}), [STORE_KEY]: centres };
    save({ uuid: (data as any)?.uuid, settings, greetings: (data as any)?.greetings ?? {} });
  };

  const update = (index: number, patch: Partial<CostCentre>) => {
    setCentres((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    setDirty(true);
  };

  const add = () => {
    setCentres((list) => [...list, { code: '', name: '' }]);
    setDirty(true);
  };

  const problemsFor = useMemo(
    () =>
      centres.map((c) =>
        checkCentre(
          c,
          centres.filter((o) => o !== c),
        ),
      ),
    [centres],
  );
  const anyProblem = problemsFor.some((p) => p.length > 0);

  const active = centres.filter((c) => !c.archived).length;

  return (
    <AdminPage
      title="Cost centres"
      description="Labels your finance team can report spending against — a department, a project, a client."
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <SettingCard
              title="Your cost centres"
              description={
                active
                  ? `${active} in use. Codes are what your finance system matches on, so they are kept upper case.`
                  : 'None yet. Add the codes your finance team already uses, so the two systems agree.'
              }
              enforced={false}
              enforcementNote="Saved for your company, but nothing splits spending by them yet — no report or invoice uses these. Set them up now and they are ready when that arrives."
              aside={
                <Button type="button" variant="outline" onClick={add}>
                  <Plus className="h-3.5 w-3.5" />
                  Add a cost centre
                </Button>
              }
            >
              {centres.length === 0 ? (
                <SettingRow
                  label="Nothing set up"
                  description="Most companies start with the departments that already appear on their budget."
                />
              ) : (
                centres.map((centre, index) => (
                  <SettingRow
                    key={index}
                    label={centre.name?.trim() || centre.code || 'New cost centre'}
                    description={
                      centre.archived
                        ? 'Archived. Old reports still show it, but it cannot be used for new spending.'
                        : problemsFor[index].map((p) => p.message).join(' ') || undefined
                    }
                  >
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-full sm:w-40">
                        <Input
                          label="Code"
                          placeholder="SALES"
                          value={centre.code}
                          onChange={(e) => update(index, { code: normaliseCode(e.target.value) })}
                          error={problemsFor[index].find((p) => p.field === 'code')?.message}
                        />
                      </div>
                      <div className="w-full sm:w-56">
                        <Input
                          label="Name"
                          placeholder="Sales"
                          value={centre.name}
                          onChange={(e) => update(index, { name: e.target.value })}
                          error={problemsFor[index].find((p) => p.field === 'name')?.message}
                        />
                      </div>
                      <div className="w-full sm:w-56">
                        <Input
                          label="Your ledger's reference"
                          placeholder="Optional"
                          value={centre.externalReference || ''}
                          onChange={(e) => update(index, { externalReference: e.target.value })}
                        />
                      </div>
                      {/* Archive rather than delete. A centre that appears on last
                          quarter's report has to stay readable, and removing it
                          would silently rewrite what was already reported. */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => update(index, { archived: !centre.archived })}
                        title={centre.archived ? 'Put back into use' : 'Archive'}
                      >
                        {centre.archived ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </>
                        )}
                      </Button>
                    </div>
                  </SettingRow>
                ))
              )}
            </SettingCard>

            <SettingCard
              title="How a split is decided"
              description="Once spending is reported by cost centre, the most specific split wins."
            >
              <SettingRow
                label="A person's own split"
                description="Beats everything else. Use it for somebody whose work genuinely spans two budgets."
                control={<span className="text-xs font-semibold text-gray-500">1st</span>}
              />
              <SettingRow
                label="The split on their licence"
                description="Applies when the person has none of their own."
                control={<span className="text-xs font-semibold text-gray-500">2nd</span>}
              />
              <SettingRow
                label="The split on their location"
                description="The fallback. Setting one here covers everybody at that location in one go."
                control={<span className="text-xs font-semibold text-gray-500">3rd</span>}
              />
              <SettingRow
                label="Nothing set anywhere"
                description="The spend is reported as unallocated. That is a real answer, not a fault — it shows what has not been budgeted for yet."
              />
            </SettingCard>

            <div className="flex items-center justify-end gap-3 pt-1">
              {anyProblem ? (
                <span className="text-xs text-red-700">Fix the problems above before saving.</span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={!dirty || anyProblem || isPending}
                onClick={onSave}
              >
                <Coins className="h-3.5 w-3.5" />
                {isPending ? 'Saving…' : 'Save cost centres'}
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminPage>
  );
};

export default CostCentres;
