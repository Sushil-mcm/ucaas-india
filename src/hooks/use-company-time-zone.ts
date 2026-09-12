import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useUser } from '@/hooks/use-user';
import { browserTimeZone } from '@/hooks/use-agent-day';
import { midnightSentence, resolveCompanyTimeZone, timeZoneLabel, type TimeZoneChoice } from '@/lib/company-time-zone';
import { siteList } from '@/services/api';

/* The zone the report screens count days in: the company's main location,
   else the person's regional setting, else the browser (lib/company-time-zone
   explains the order). The site list is the same query Company › Locations
   runs, so it is fetched once per session; a person whose role cannot list
   locations gets the next source down, not an error. */
export const useCompanyTimeZone = (): TimeZoneChoice & { label: string; sentence: string; isPending: boolean } => {
  const { user } = useUser();
  const { data: sites = [], isPending } = useQuery({
    queryKey: ['siteList'],
    queryFn: () => siteList({ page: 1, limit: 1000 }),
    select: (response: any) => response?.data?.data?.result?.rows || [],
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const choice = useMemo(
    () => resolveCompanyTimeZone({ sites, user, browser: browserTimeZone() }),
    [sites, user],
  );
  return { ...choice, label: timeZoneLabel(choice), sentence: midnightSentence(choice), isPending };
};
