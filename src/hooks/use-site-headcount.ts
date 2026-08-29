/* How many people work at each location.
 *
 * Established business phone systems lead their location screens with this, and for good
 * reason: an address on its own does not tell an admin whether a location is real
 * or a leftover. "Head office — 34 people" and "Old warehouse — 0 people" are the
 * same record until you can see the count.
 *
 * It is counted rather than listed. The directory endpoint caps at 200 rows and
 * this tenant has over four thousand users, so pulling people in order to count
 * them would be both wrong and slow. Asking for a single row and reading the
 * total off the response costs one small request per location, and those are
 * cached for the session.
 */

import { useQueries } from '@tanstack/react-query';
import { getUserList } from '@/services/api';

const HEADCOUNT_STALE_TIME = 5 * 60 * 1000;

export interface SiteHeadcount {
  /* uuid -> number of people. Absent while loading or if the count failed. */
  counts: Record<string, number | undefined>;
  isLoading: boolean;
}

export const useSiteHeadcount = (siteUuids: string[], enabled = true): SiteHeadcount => {
  const results = useQueries({
    queries: siteUuids.map((uuid) => ({
      queryKey: ['site-headcount', uuid],
      queryFn: () =>
        getUserList({
          page: 1,
          /* One row is enough — only the total is wanted. */
          limit: 1,
          filters: [{ key: 'site_uuid', value: uuid }],
          search: '',
        }),
      select: (response: any) => {
        const result = response?.data?.data?.result;
        const total = result?.total ?? result?.count;
        return typeof total === 'number' ? total : undefined;
      },
      enabled: enabled && !!uuid,
      staleTime: HEADCOUNT_STALE_TIME,
      /* A failed count should leave the number blank, not retry in a loop behind
         a page the admin is already reading. */
      retry: false,
    })),
  });

  const counts: Record<string, number | undefined> = {};
  siteUuids.forEach((uuid, index) => {
    counts[uuid] = results[index]?.data as number | undefined;
  });

  return {
    counts,
    isLoading: results.some((result) => result.isLoading),
  };
};
