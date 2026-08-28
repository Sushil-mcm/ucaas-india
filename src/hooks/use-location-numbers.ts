/* Which phone numbers belong to each location.
 *
 * `did_numbers` already carries a `site_uuid`, and every number on this account
 * is populated with one — the link between a number and the place it belongs to
 * has existed all along, it was simply never shown anywhere. established business phone systems
 * both put this on the location screen, because "which numbers ring here" is
 * half of what a location means.
 *
 * The list is fetched once and grouped in memory rather than filtered per
 * location: the numbers endpoint has no site filter, and an account holds tens of
 * numbers, not thousands. One request beats one request per location.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { allNumbersList } from '@/services/api';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { assignedNameOf } from '@/lib/call-standard';

export interface LocationNumber {
  uuid?: string;
  number: string;
  /* What the number is pointed at, when the record says. */
  assignedTo?: string;
  type?: string;
}

const NUMBERS_STALE_TIME = 5 * 60 * 1000;

/* `did_number` and `did_type` are the column names the numbers table reads, and
   assignedNameOf already resolves the person a number points at — the assignment
   is nested rather than a flat field, so it is not worth restating here. */
const toLocationNumber = (row: any): LocationNumber => ({
  uuid: row?.uuid,
  number: row?.did_number || '',
  assignedTo: assignedNameOf(row) || undefined,
  type: row?.did_type || undefined,
});

export const useLocationNumbers = (enabled = true) => {
  const { data, isLoading } = useQuery({
    queryKey: ['location-numbers'],
    queryFn: () => fetchAllPages(allNumbersList, { type: 'in_use', filters: [], search: '' }),
    enabled,
    staleTime: NUMBERS_STALE_TIME,
  });

  /* uuid of the location -> the numbers sitting at it. */
  const bySite = useMemo(() => {
    const grouped: Record<string, LocationNumber[]> = {};
    (data || []).forEach((row: any) => {
      const siteUuid = row?.site_uuid;
      if (!siteUuid) return;
      const entry = toLocationNumber(row);
      if (!entry.number) return;
      (grouped[siteUuid] ||= []).push(entry);
    });
    return grouped;
  }, [data]);

  return { bySite, isLoading };
};
