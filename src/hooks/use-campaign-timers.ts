import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSection } from '@/lib/company-settings-api';
import {
  CAMPAIGN_TIMERS_SECTION,
  CampaignTimers,
  normaliseCampaignTimers,
} from '@/lib/campaign-timers';

/* The company's campaign timer defaults, read once and kept for five minutes.
 *
 * Read by the campaign form (to seed a new campaign), by the Company page
 * (to edit them) and by the agent's dialer (for the wait between calls on an
 * older campaign that has none stored, and for the company-only poll
 * interval). A server without the section, or a failed read, gives the
 * built-in defaults - the dialer must never stall for want of a setting. */
export const CAMPAIGN_TIMERS_QUERY_KEY = ['company-settings', CAMPAIGN_TIMERS_SECTION];

export const useCampaignTimers = (enabled = true) => {
  const query = useQuery({
    queryKey: CAMPAIGN_TIMERS_QUERY_KEY,
    queryFn: () => getSection(CAMPAIGN_TIMERS_SECTION),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const timers: CampaignTimers = useMemo(
    () => normaliseCampaignTimers(query.data?.settings),
    [query.data],
  );
  return { ...query, timers, version: query.data?.version };
};
