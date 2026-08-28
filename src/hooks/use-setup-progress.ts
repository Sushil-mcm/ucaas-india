/* How far a new company has got with setting itself up.
 *
 * Dialpad's deployment guide runs offices -> users -> main line routing, and
 * Genesys teaches organisation -> locations -> people -> telephony. Both put
 * locations before people, because a person inherits their clock and their
 * address from where they sit. The order below is that order, trimmed to the
 * steps this platform actually has — network testing, desk phones, porting and
 * training have no equivalent here.
 *
 * Every count comes from data already on the account. Nothing new is stored, so
 * a company that set itself up before this existed still shows the right state
 * rather than starting from zero.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserList, siteList } from '@/services/api';
import { useLocationNumbers } from '@/hooks/use-location-numbers';
import { COMPANY_DEFAULTS_QUERY_KEY, fetchCompanyDefaults } from '@/lib/company-defaults';

export type SetupStepKey = 'company' | 'locations' | 'people' | 'numbers' | 'handling';

export interface SetupStep {
  key: SetupStepKey;
  title: string;
  /* What the admin gets out of doing it, not what the screen is called. */
  purpose: string;
  path: string;
  /* Set when the step's destination is on the page the guide itself sits on.
     Navigating there would appear to do nothing, so the guide scrolls to the
     section instead. */
  anchor?: string;
  done: boolean;
  /* Shown under the title — "2 of 3 licences used", "no numbers yet". */
  detail: string;
}

export interface SetupProgress {
  steps: SetupStep[];
  completed: number;
  total: number;
  /* The first unfinished step: what "Next" should point at. */
  next: SetupStep | null;
  isLoading: boolean;
  licences: { bought: number; used: number } | null;
}

const COUNT_STALE_TIME = 2 * 60 * 1000;

export const useSetupProgress = (companyInfo?: any): SetupProgress => {
  /* Whether company-wide phone rules have been set up at all. */
  const { data: companyDefaults } = useQuery({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    staleTime: COUNT_STALE_TIME,
  });
  const hasCompanyRules = Boolean(companyDefaults?.uuid);

  /* Deliberately NOT fetched. `/api/admin/company/info/:uuid` sits behind
     AdminMiddleware, which resolves the token against the `admins` table —
     platform staff only, zero tenant users. Every customer got a 401, and the
     axios interceptor turns any 401 into a forced logout, so simply opening a
     page carrying this guide ended the session. The company details that are
     already on the session are used instead. */
  const company = companyInfo;
  const isCompanyLoading = false;

  const { data: sites = [], isLoading: isSitesLoading } = useQuery({
    queryKey: ['siteList'],
    queryFn: () => siteList({ page: 1, limit: 200 }),
    select: (response: any) => response?.data?.data?.result?.rows || [],
    staleTime: COUNT_STALE_TIME,
  });

  /* One row is enough — only the total is wanted. */
  const { data: peopleTotal, isLoading: isPeopleLoading } = useQuery({
    queryKey: ['setup-people-count'],
    queryFn: () => getUserList({ page: 1, limit: 1, filters: [], search: '' }),
    select: (response: any) => {
      const result = response?.data?.data?.result;
      const total = result?.total ?? result?.count;
      return typeof total === 'number' ? total : 0;
    },
    staleTime: COUNT_STALE_TIME,
  });

  const { bySite, isLoading: isNumbersLoading } = useLocationNumbers();

  return useMemo(() => {
    const numberCount = Object.values(bySite).reduce((sum, list) => sum + list.length, 0);
    const people = peopleTotal || 0;
    const bought = Number(company?.licenses ?? company?.total_licenses ?? 0);

    /* A location always exists — one is created with the account — so "done"
       means the details are filled in, not merely that a row is present. */
    const completedLocations = sites.filter(
      (site: any) => `${site?.address || ''}`.trim() && `${site?.timezone || ''}`.trim(),
    ).length;

    const steps: SetupStep[] = [
      {
        key: 'company',
        title: 'Company details',
        purpose: 'Your name and address, used on bills and when buying numbers.',
        path: '/admin-settings/company-info',
        anchor: 'setup-company-record',
        /* Judged on the address alone. The session's company_info is built from a
           fixed attribute list that includes `address` but NOT `name`, so testing
           for a name meant this step could never be ticked — it read as "not
           filled in" for every company, including ones fully set up. */
        done: Boolean(`${company?.address || ''}`.trim()),
        detail: `${company?.address || ''}`.trim()
          ? `${company.address}`
          : 'No company address yet',
      },
      {
        key: 'locations',
        title: 'Locations',
        purpose: 'Each place you work from. Sets the clock and the address for everyone there.',
        path: '/admin-settings/company-info',
        anchor: 'setup-locations',
        done: completedLocations > 0,
        detail:
          completedLocations > 0
            ? `${completedLocations} ${completedLocations === 1 ? 'location' : 'locations'} ready`
            : 'No location has an address and timezone yet',
      },
      {
        key: 'people',
        title: 'People',
        purpose: 'Everyone who needs a phone. Each one uses a licence.',
        path: '/admin-settings/users/extension',
        done: people > 0,
        detail: bought
          ? `${people} of ${bought} ${bought === 1 ? 'licence' : 'licences'} used`
          : `${people} ${people === 1 ? 'person' : 'people'}`,
      },
      {
        key: 'numbers',
        title: 'Numbers',
        purpose: 'The numbers customers dial, pointed at the right person or menu.',
        path: '/admin-settings/numbers/in-use',
        done: numberCount > 0,
        detail:
          numberCount > 0
            ? `${numberCount} ${numberCount === 1 ? 'number' : 'numbers'} in use`
            : 'No numbers yet',
      },
      {
        key: 'handling',
        title: 'Call handling',
        purpose: 'What happens when nobody answers, and outside working hours.',
        path: '/admin-settings/company-info/rules',
        /* Not ticked from a row count: whether calls are handled correctly
           cannot be read off one — a number can be configured and still drop
           every out-of-hours call. It counts as done once company-wide rules
           exist, which is the point at which there is something to check
           rather than nothing at all. Leaving it permanently false meant
           `next` was always set, so the guide could never reach "finished"
           and never disappeared, contradicting its own design. */
        done: hasCompanyRules,
        detail: hasCompanyRules
          ? 'Company rules are set — check what happens to an unanswered call'
          : 'Check what happens to an unanswered call',
      },
    ];

    const completed = steps.filter((step) => step.done).length;

    return {
      steps,
      completed,
      total: steps.length,
      next: steps.find((step) => !step.done) || null,
      isLoading: isCompanyLoading || isSitesLoading || isPeopleLoading || isNumbersLoading,
      licences: bought ? { bought, used: people } : null,
    };
  }, [
    company,
    hasCompanyRules,
    sites,
    peopleTotal,
    bySite,
    isCompanyLoading,
    isSitesLoading,
    isPeopleLoading,
    isNumbersLoading,
  ]);
};
