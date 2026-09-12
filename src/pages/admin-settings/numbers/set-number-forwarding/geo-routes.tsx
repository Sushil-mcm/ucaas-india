import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQueries } from '@tanstack/react-query';
import CustomSelect from '@/components/custom/custom-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { forwardActionType } from '@/services/api';
import { ISELECTVALUE } from '@/interfaces/api-interfaces';
import { FORWARD_TYPES_LABEL } from './constants';
import {
  GEO_ROUTE_TYPES,
  GeoRouteRule,
  digitsOnly,
  geoRouteProblems,
  matchGeoRoute,
  normaliseGeoRoutes,
} from '@/lib/geo-routes';

/* Caller-location routing: "callers whose number starts with these digits go
   here instead". Saved on the number as forward_call_actions.geo_routes and
   read by the switch on every inbound call (longest prefix wins). Rows live in
   the form under `geoRoutes`; index.tsx seeds and saves them. */

const LIST_TYPES = ['EXTENSION', 'DEPARTMENT', 'IVR', 'QUEUE'] as const;

const TYPE_OPTIONS = GEO_ROUTE_TYPES.map((type) => ({
  label: (FORWARD_TYPES_LABEL as Record<string, string>)[type] || type,
  value: type,
}));

const emptyRule = (): GeoRouteRule => ({ prefix: '', type: '', value: '', label: '' });

const GeoRoutes: FC = () => {
  const { watch, setValue } = useFormContext();
  const { user } = useUser();
  const siteUuid = watch('did_info')?.site?.value || user?.user_info?.site_uuid;
  const rows: GeoRouteRule[] = normaliseGeoRoutes(watch('geoRoutes'));
  const [probe, setProbe] = useState('');

  /* Same query keys as the Call handling tab, so the lists are fetched once. */
  const lists = useQueries({
    queries: LIST_TYPES.map((type) => ({
      queryKey: [`forwardActionType-call-forwarding-${type}`, siteUuid, type],
      queryFn: () =>
        forwardActionType({ page: 1, limit: 1000, filters: [], search: '', site_uuid: siteUuid, type }),
      enabled: !!siteUuid,
      select: (data: any) => data?.data?.data?.result?.rows || [],
    })),
  });
  const [extensions = [], departments = [], menus = [], queues = []] = lists.map((q) => (q.data as unknown as any[]) || []);

  const optionsFor = (type: string): ISELECTVALUE[] => {
    switch (type) {
      case 'EXTENSION':
        return extensions.map((p: any) => ({
          label: `${p?.first_name || ''}${p?.last_name ? ` ${p.last_name}` : ''}${p?.extension ? ` (${p.extension})` : ''}`,
          value: String(p?.extension ?? ''),
        }));
      case 'DEPARTMENT':
        return departments.map((d: any) => ({ label: d?.name, value: String(d?.uuid ?? '') }));
      case 'IVR':
        return menus.map((m: any) => ({ label: m?.name, value: String(m?.uuid ?? '') }));
      case 'QUEUE':
        /* Same id the Call handling tab stores for a queue, so the switch resolves both alike. */
        return queues.map((q: any) => ({ label: q?.name, value: String(q?._id ?? '') }));
      default:
        return [];
    }
  };

  const update = (next: GeoRouteRule[]) => setValue('geoRoutes', next, { shouldDirty: true });
  const patch = (i: number, change: Partial<GeoRouteRule>) =>
    update(rows.map((r, idx) => (idx === i ? { ...r, ...change } : r)));

  const problems = geoRouteProblems(rows);
  const hit = probe ? matchGeoRoute(rows, probe) : null;

  return (
    <div className="flex flex-col gap-3 mt-4 border-t pt-4 geo-routes">
      <div>
        <div className="text-sm font-medium">Route by caller location</div>
        <div className="text-xs text-muted-foreground">
          Callers whose number starts with these digits skip the rule above and go straight to the
          destination you choose. The longest match wins, so 1415 beats 1. Country and area codes work
          (44, 1212, 91 22). Leave empty to route everyone the same way.
        </div>
      </div>

      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-3 geo-routes-row">
          <div className="w-40">
            <Input
              label="Number starts with"
              placeholder="e.g. 1415"
              value={row.prefix}
              onChange={(e) => patch(i, { prefix: digitsOnly(e.target.value) })}
            />
          </div>
          <div className="w-52">
            <CustomSelect
              label="Send them to"
              options={TYPE_OPTIONS}
              value={TYPE_OPTIONS.find((o) => o.value === row.type) || null}
              handleChange={(e: ISELECTVALUE | null) =>
                patch(i, { type: e ? String(e.value) : '', value: '', label: '' })
              }
            />
          </div>
          <div className="w-64">
            {row.type === 'PHONE' ? (
              <Input
                label="Outside number"
                placeholder="+1 415 555 0100"
                value={row.value}
                onChange={(e) => patch(i, { value: e.target.value.replace(/[^\d+]/g, ''), label: '' })}
              />
            ) : (
              <CustomSelect
                label="Destination"
                isDisabled={!row.type}
                options={optionsFor(row.type)}
                value={
                  optionsFor(row.type).find((o) => o.value === row.value) ||
                  (row.value ? { label: row.label || row.value, value: row.value } : null)
                }
                handleChange={(e: ISELECTVALUE | null) =>
                  patch(i, { value: e ? String(e.value) : '', label: e?.label || '' })
                }
              />
            )}
          </div>
          <Button type="button" variant="default" size="sm" onClick={() => update(rows.filter((_, idx) => idx !== i))}>
            Remove
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-end gap-3">
        <Button type="button" variant="default" size="sm" onClick={() => update([...rows, emptyRule()])}>
          Add a location rule
        </Button>
        {rows.length > 0 && (
          <div className="w-64">
            <Input
              label="Try a caller number"
              placeholder="+1 415 555 0100"
              value={probe}
              onChange={(e) => setProbe(e.target.value)}
            />
          </div>
        )}
        {probe && rows.length > 0 && (
          <div className="text-xs text-muted-foreground pb-2">
            {hit
              ? `Goes to ${(FORWARD_TYPES_LABEL as Record<string, string>)[hit.type] || hit.type}: ${hit.label || hit.value} (rule ${hit.prefix})`
              : 'No location rule matches; the normal route applies.'}
          </div>
        )}
      </div>

      {problems.length > 0 && (
        <ul className="text-xs text-destructive list-disc pl-5">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GeoRoutes;
