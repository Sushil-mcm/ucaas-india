/* Every location on one page.
 *
 * Company & Locations shows each location as a card you scroll past. That is a
 * fine way to read one location and a poor way to run twelve: to answer "which of
 * our branches has no timezone", or "is anybody actually in the Leeds office", an
 * admin has to open each card in turn and hold the answers in their head.
 * Established business phone systems solve this with a single management table —
 * one row per location, the facts that matter as columns, search and filters
 * across the top, and an export so the list can be taken away.
 *
 * This is that table. Three things on it are worth explaining:
 *
 *   Right now      Whether the location is open, worked out from the company
 *                  opening hours and holidays read on THAT LOCATION'S clock. It
 *                  is the company-wide rule, not a per-location one — there is no
 *                  per-location hours setting in the platform — and every queue,
 *                  menu and number may still carry its own hours that differ. The
 *                  card above the table says so, because a column that quietly
 *                  implied otherwise would be worse than no column.
 *
 *   To complete    The same readiness checks the location cards use
 *                  (src/lib/location-readiness.ts), gathered so the incomplete
 *                  locations can be filtered to in one click.
 *
 *   Timezone       The one field here that changes behaviour: assigning somebody
 *                  to a location fills their working-hours timezone from it. It
 *                  is therefore also the one thing this screen will write, and it
 *                  can be set for several locations at once, because a company
 *                  that added six branches in an afternoon left all six blank.
 *
 * Everything is written through the ordinary site save, echoing the record back
 * field for field with one value changed. That endpoint replaces rather than
 * patches, so a payload assembled from assumptions is how an address goes
 * missing.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Globe2,
  Loader2,
  MapPin,
} from 'lucide-react';

import { AdminPage } from '@/pages/admin-settings/page-shell';
import { SettingCard, SettingRow } from '@/components/mcm/setting-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import CustomSelect from '@/components/custom/custom-select';
import Loader from '@/components/custom/loader';
import { handleAlert } from '@/lib/utils';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useSiteHeadcount } from '@/hooks/use-site-headcount';
import { useLocationNumbers } from '@/hooks/use-location-numbers';
import { evaluateLocation } from '@/lib/location-readiness';
import { siteList as fetchSiteList, upsertSite } from '@/services/api';
import countryList from '@/lib/countries.json';
import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';
import { readCompanyHolidays } from '@/lib/company-holiday-import';
import {
  describeWeeklyHours,
  readLineHolidays,
  readWeeklyHours,
  resolveOpenState,
  type HolidayEntry,
} from '@/lib/location-hours';

/* Saves run one at a time with a breath between them. The site endpoint is
   shared with the rest of the platform, and a dozen parallel writes from a bulk
   action is how a convenience becomes an outage. */
const BATCH_PAUSE_MS = 150;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type StatusFilter = 'all' | 'attention' | 'complete';

/* A cell that may be empty reads better as a dash than as nothing at all. */
const orDash = (value: unknown) => {
  const text = `${value ?? ''}`.trim();
  return text || '—';
};

/* Quoted only where it has to be, so the file opens cleanly in a spreadsheet and
   a name containing a comma does not split into two columns. */
const csvCell = (value: unknown) => {
  const text = `${value ?? ''}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const STATE_STYLE: Record<string, string> = {
  open: 'text-emerald-700',
  closed: 'text-gray-500',
  holiday: 'text-amber-700',
};

const STATE_LABEL: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  holiday: 'Holiday',
};

const LocationManagement = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkZone, setBulkZone] = useState<{ label: string; value: string } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { features } = useCompanyFeatures();
  const siteAccess = features?.plan_features?.account_setting?.access?.SITE?.action;
  const canView = Boolean(siteAccess?.view);
  const canEdit = Boolean(siteAccess?.edit);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['siteList'],
    queryFn: () => fetchSiteList({ page: 1, limit: 1000 }),
    enabled: canView,
    select: (response: any) => response?.data?.data?.result?.rows || [],
  });

  /* The company opening hours and holiday list. Both live on the reserved
     company template, which is where every other company-wide rule is kept. */
  const { data: companyDefaults } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    enabled: canView,
    staleTime: 5 * 60 * 1000,
  });

  const companyHours = useMemo(
    () => readWeeklyHours(companyDefaults?.settings?.operational_hours),
    [companyDefaults],
  );

  /* Two lists, both marked with where they came from so the precedence rule in
     `findHoliday` can apply: a holiday declared on a line beats a company one on
     the same date. */
  const companyHolidays = useMemo<HolidayEntry[]>(() => {
    const declared = readCompanyHolidays(companyDefaults?.settings).map((holiday) => ({
      title: holiday.title,
      from: holiday.from,
      to: holiday.to,
      repeatsYearly: holiday.repeats_yearly,
      source: 'company' as const,
    }));
    const onCompanyHours = readLineHolidays(companyDefaults?.settings?.operational_hours).map(
      (holiday) => ({ ...holiday, source: 'company' as const }),
    );
    return [...declared, ...onCompanyHours];
  }, [companyDefaults]);

  const siteUuids = useMemo(
    () => sites.map((site: any) => `${site?.uuid || ''}`).filter(Boolean),
    [sites],
  );
  const { counts } = useSiteHeadcount(siteUuids, canView);
  const { bySite } = useLocationNumbers(canView);

  /* Worked out once for the whole table. The instant is fixed per render so every
     row is judged against the same moment — rows resolved a few milliseconds
     apart could otherwise disagree across midnight. */
  const now = useMemo(() => new Date(), [sites, companyDefaults]);

  const rows = useMemo(() => {
    return sites.map((site: any) => {
      const uuid = `${site?.uuid || ''}`;
      const readiness = evaluateLocation(site);
      const open = resolveOpenState({
        at: now,
        timezone: `${site?.timezone || ''}`.trim() || undefined,
        hours: companyHours,
        holidays: companyHolidays,
      });
      return {
        site,
        uuid,
        readiness,
        open,
        people: counts[uuid],
        numbers: (bySite[uuid] || []).length,
      };
    });
  }, [sites, companyHours, companyHolidays, counts, bySite, now]);

  const countries = useMemo(() => {
    const found = new Set<string>();
    sites.forEach((site: any) => site?.country && found.add(`${site.country}`));
    return ['All', ...Array.from(found).sort()];
  }, [sites]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row: any) => {
      if (country !== 'All' && row.site?.country !== country) return false;
      if (status === 'attention' && row.readiness.isComplete) return false;
      if (status === 'complete' && !row.readiness.isComplete) return false;
      if (!needle) return true;
      return [row.site?.name, row.site?.city, row.site?.state, row.site?.country, row.site?.address]
        .filter(Boolean)
        .some((value: any) => `${value}`.toLowerCase().includes(needle));
    });
  }, [rows, search, country, status]);

  const selectedRows = useMemo(
    () => visible.filter((row: any) => selected[row.uuid]),
    [visible, selected],
  );

  /* Only the zones belonging to the countries of the locations being changed. A
     full world list invites picking a zone that has nothing to do with where the
     branch is, and picking one automatically from the country would quietly move
     a branch to the wrong clock in every country that has several. */
  const zoneOptions = useMemo(() => {
    const wanted = new Set(selectedRows.map((row: any) => `${row.site?.country || ''}`));
    const found = new Map<string, string>();
    (countryList as any[]).forEach((entry) => {
      if (!wanted.has(`${entry?.name || ''}`)) return;
      (entry?.timezones || []).forEach((zone: any) => {
        if (zone?.zoneName) found.set(zone.zoneName, `${zone.zoneName} — ${entry.name}`);
      });
    });
    return Array.from(found.entries()).map(([value, label]) => ({ value, label }));
  }, [selectedRows]);

  const attentionCount = rows.filter((row: any) => !row.readiness.isComplete).length;

  const exportCsv = () => {
    const head = [
      'Location',
      'Address',
      'City',
      'State',
      'Country',
      'Postal code',
      'Timezone',
      'Main location',
      'People',
      'Numbers',
      'Right now',
      'To complete',
    ];
    /* The whole list, not the filtered view. An export that silently honoured a
       filter is how a partial list gets circulated as the full one. */
    const lines = [head.map(csvCell).join(',')];
    rows.forEach((row: any) => {
      lines.push(
        [
          row.site?.name,
          row.site?.address,
          row.site?.city,
          row.site?.state,
          row.site?.country,
          row.site?.postal_code,
          row.site?.timezone,
          row.site?.is_default === '1' ? 'Yes' : 'No',
          row.people ?? '',
          row.numbers,
          STATE_LABEL[row.open.state],
          row.readiness.issues.map((issue: any) => issue.label).join('; '),
        ]
          .map(csvCell)
          .join(','),
      );
    });

    /* Leading byte-order mark, so a spreadsheet opens the file as UTF-8 and a
       location name with an accent in it is not mangled. */
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `locations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* Every field is echoed back with one changed, because the save replaces the
     record. The result is then verified against a fresh read rather than assumed:
     a success message for a change the server refused is worse than an error. */
  const { mutate: applyTimezone, isPending: isApplying } = useMutation({
    mutationFn: async (zone: string) => {
      const targets = selectedRows;
      setProgress({ done: 0, total: targets.length });

      for (let index = 0; index < targets.length; index += 1) {
        const site = targets[index].site;
        try {
          await upsertSite({
            siteUUID: site?.uuid,
            name: site?.name,
            address: site?.address,
            country: site?.country,
            state: site?.state,
            city: site?.city,
            postal_code: site?.postal_code,
            caller_id_type: site?.caller_id_type || 'MAIN',
            ...(site?.caller_id_type === 'CUSTOM' && site?.caller_id_name
              ? { caller_id_name: site.caller_id_name }
              : {}),
            timezone: zone,
          });
        } catch {
          /* One refusal must not abandon the rest. What actually changed is
             read back below, so a swallowed error here still shows up as a
             location that did not move. */
        }
        setProgress({ done: index + 1, total: targets.length });
        if (index < targets.length - 1) await pause(BATCH_PAUSE_MS);
      }

      const fresh: any = await fetchSiteList({ page: 1, limit: 1000 });
      const rowsBack: any[] = fresh?.data?.data?.result?.rows || [];
      const moved = targets.filter(
        (target: any) => rowsBack.find((row) => row?.uuid === target.uuid)?.timezone === zone,
      ).length;

      return { moved, total: targets.length };
    },
    onSuccess: ({ moved, total }) => {
      queryClient.invalidateQueries({ queryKey: ['siteList'] });
      setProgress(null);
      setSelected({});
      handleAlert({
        text:
          moved === total
            ? `Timezone set on ${moved} ${moved === 1 ? 'location' : 'locations'}.`
            : `${moved} of ${total} locations were changed. The rest were not accepted by the server and are unchanged.`,
        type: moved === total ? 'success' : 'error',
      });
    },
    onError: () => {
      setProgress(null);
      handleAlert({ text: 'Could not change the timezones. Nothing was changed.', type: 'error' });
    },
  });

  if (!canView) {
    return (
      <AdminPage
      hideHead
        section="Company"
        title="Location management"
        description="Every location your company works from, side by side."
      >
        <div className="p-6 text-center text-sm text-gray-600">
          You do not have permission to view locations.
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      section="Company"
      title="Location management"
      description="Every location your company works from, side by side — so you can compare them without opening each one."
      actions={
        <Button type="button" variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-3.5 w-3.5" />
          Export list
        </Button>
      }
      filters={
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="min-w-[220px] flex-1">
            <Input
              placeholder="Search locations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="min-w-[180px]">
            <CustomSelect
              placeholder="Country"
              options={countries.map((name) => ({ label: name, value: name }))}
              value={{ label: country, value: country }}
              handleChange={(option: any) => setCountry(option?.value || 'All')}
            />
          </div>
          <div className="min-w-[200px]">
            <CustomSelect
              placeholder="Status"
              options={[
                { label: 'All locations', value: 'all' },
                { label: `Needs attention (${attentionCount})`, value: 'attention' },
                { label: 'Details complete', value: 'complete' },
              ]}
              value={{
                label:
                  status === 'all'
                    ? 'All locations'
                    : status === 'attention'
                      ? `Needs attention (${attentionCount})`
                      : 'Details complete',
                value: status,
              }}
              handleChange={(option: any) => setStatus((option?.value as StatusFilter) || 'all')}
            />
          </div>
          <span className="ml-auto text-xs font-medium text-gray-500">
            {visible.length} of {rows.length}
          </span>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        <SettingCard
          title="What this table is telling you"
          description="Two of these columns are worked out rather than stored, so it is worth knowing where the numbers come from."
          icon={<Globe2 className="h-4 w-4" />}
          status="coming-soon"
          note={
            <>
              Coming soon: opening hours set per location. Until then, “Right now” applies your
              company opening hours ({describeWeeklyHours(companyHours)}) and your company holidays,
              read on each location&rsquo;s own clock. Individual queues, menus, people and numbers
              each keep their own hours, and those are what actually answer a call — so a line at a
              location shown as closed may still be taking calls.
            </>
          }
        >
          <SettingRow
            label="Right now"
            description="Your company opening hours and holidays, judged on the location's timezone rather than yours. A location with no timezone is judged on your own clock, and is flagged as incomplete below."
            control={
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {describeWeeklyHours(companyHours)}
              </span>
            }
          />
          <SettingRow
            label="To complete"
            description="Address, city, country and timezone are what a location needs before people and numbers can safely be put in it. Filter to “Needs attention” to see only the locations missing something."
            control={
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
                <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
                {attentionCount} of {rows.length}
              </span>
            }
          />
        </SettingCard>

        {canEdit ? (
          <SettingCard
            title="Change several locations at once"
            description="Tick the locations in the table, then set the one thing that changes behaviour for everybody there."
            icon={<Clock className="h-4 w-4" />}
          >
            <SettingRow
              label="Timezone"
              description="Assigning somebody to a location fills in their working-hours timezone from it, so a branch with no timezone hands its people the account default. Only the zones belonging to the selected locations' countries are offered — picking one automatically would move a branch to the wrong clock in every country that has more than one."
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[260px]">
                  <CustomSelect
                    label="Set timezone to"
                    placeholder={
                      selectedRows.length ? 'Select a timezone' : 'Tick some locations first'
                    }
                    options={zoneOptions}
                    value={bulkZone}
                    handleChange={(option: any) => setBulkZone(option)}
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!selectedRows.length || !bulkZone?.value || isApplying}
                  onClick={() => bulkZone?.value && applyTimezone(bulkZone.value)}
                >
                  {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Apply to {selectedRows.length}{' '}
                  {selectedRows.length === 1 ? 'location' : 'locations'}
                </Button>
                {progress ? (
                  <span className="text-xs font-medium text-gray-500">
                    Saved {progress.done} of {progress.total}…
                  </span>
                ) : null}
              </div>
            </SettingRow>
          </SettingCard>
        ) : null}

        {/* No card of its own: `AdminPage` already puts its children inside the
            panel and the scrolling table wrapper. */}
        <div className="overflow-x-auto">
          <table>
              <thead>
                <tr>
                  {canEdit ? <th style={{ width: 36 }} /> : null}
                  <th>Location</th>
                  <th>Where</th>
                  <th>Timezone</th>
                  <th>Right now</th>
                  <th>People</th>
                  <th>Numbers</th>
                  <th>To complete</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7}>
                      <div className="flex justify-center p-6">
                        <Loader variant="blue" size="md" />
                      </div>
                    </td>
                  </tr>
                ) : !visible.length ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7}>
                      <div className="p-6 text-center text-sm text-gray-600">
                        {rows.length
                          ? 'No locations match those filters.'
                          : 'No locations yet. Add one from Company & Locations.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visible.map((row: any) => (
                    <tr key={row.uuid}>
                      {canEdit ? (
                        <td>
                          <Checkbox
                            checked={Boolean(selected[row.uuid])}
                            onCheckedChange={(checked: boolean | 'indeterminate') =>
                              setSelected((prev) => ({ ...prev, [row.uuid]: Boolean(checked) }))
                            }
                            aria-label={`Select ${row.site?.name || 'location'}`}
                          />
                        </td>
                      ) : null}
                      <td>
                        <div className="list-row-name flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {orDash(row.site?.name)}
                          {row.site?.is_default === '1' ? (
                            <span className="tag acc">Main</span>
                          ) : null}
                        </div>
                        <div className="list-row-sub">{orDash(row.site?.address)}</div>
                      </td>
                      <td>
                        {orDash(
                          [row.site?.city, row.site?.state, row.site?.country]
                            .filter(Boolean)
                            .join(', '),
                        )}
                      </td>
                      <td>
                        <span className="mono">{orDash(row.site?.timezone)}</span>
                      </td>
                      <td>
                        <span
                          className={`text-xs font-semibold ${STATE_STYLE[row.open.state]}`}
                          title={row.open.reason}
                        >
                          {STATE_LABEL[row.open.state]}
                        </span>
                      </td>
                      <td>{row.people === undefined ? '—' : row.people}</td>
                      <td>{row.numbers}</td>
                      <td>
                        {row.readiness.isComplete ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              row.readiness.requiredMissing > 0 ? 'text-amber-700' : 'text-gray-600'
                            }`}
                            title={row.readiness.issues
                              .map((issue: any) => issue.consequence)
                              .join(' ')}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.readiness.issues.map((issue: any) => issue.label).join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPage>
  );
};

export default LocationManagement;
