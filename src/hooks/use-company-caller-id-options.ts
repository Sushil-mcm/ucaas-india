/**
 * The company's spare numbers, offered when a person has no number of their own.
 *
 * WHY THIS EXISTS
 * ---------------
 * The caller-ID picker is fed by the numbers assigned to one person
 * (src/hooks/use-dialpad-caller-id-options.ts). When none is assigned - the
 * person was never given one, or the one they had was released - the picker
 * showed a "Caller ID" box with nothing in it and the Call button stayed off.
 * Meanwhile the switch went right on placing their calls, presenting the
 * company's first number on its own. The screen and the switch disagreed, and
 * the person could not tell what number they were calling from, or why they
 * could not call at all.
 *
 * WHAT IS OFFERED
 * ---------------
 * Only numbers that belong to nobody: the numbers endpoint's `inventory` view
 * (no person, no call handling). A number assigned to a colleague is theirs,
 * and a number pointed at a queue or department is a group number, which
 * src/hooks/use-group-caller-id-options.ts already handles behind the
 * company's own permission.
 *
 * WHO SEES IT
 * -----------
 * The endpoint itself narrows the answer by role: an agent is only ever shown
 * their own numbers, so for an agent this list is empty and the picker says
 * plainly that no number is assigned. Admins and sub-admins, who could assign
 * the number to themselves in Admin > Numbers anyway, get to call from it in
 * the meantime.
 *
 * NOT A DEFAULT. Like a group number this is a per-call choice and is never
 * written back as the person's stored caller ID; the switch is told the number
 * on each call through X-CallerId and honours it because the company owns it.
 * Giving somebody a number for good is an assignment, made on the numbers
 * screen, not a side effect of placing a call.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { allNumbersList } from '@/services/api';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { useUser } from './use-user';
import type { CallerIdOption } from '@/components/dialpad/types';

export type CompanyCallerIdOption = CallerIdOption & {
  source: 'company';
  /* The DID record this option came from. */
  didUuid: string;
};

/* Prefixed ids, same reason as GROUP_CALLER_ID_ID_PREFIX: the persistence
   guard in the dialpad recognises the option without importing this module's
   types. */
export const COMPANY_CALLER_ID_ID_PREFIX = 'company:';

export const isCompanyCallerIdOption = (option?: { id?: string } | null): boolean =>
  String(option?.id || '').startsWith(COMPANY_CALLER_ID_ID_PREFIX);

/* Company numbers change rarely and the dialpad mounts often. */
const NUMBERS_STALE_TIME = 5 * 60 * 1000;

const cleanText = (value: unknown) => String(value ?? '').trim();

/**
 * @param enabled false while the person's own numbers are still loading, or
 *   once it is known they have one - nothing is fetched then, so a person with
 *   a number of their own sees exactly the picker they saw before.
 */
export const useCompanyCallerIdOptions = (enabled: boolean) => {
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ['company-caller-id-numbers'],
    queryFn: () => fetchAllPages(allNumbersList, { type: 'inventory', filters: [], search: '' }),
    enabled: enabled && Boolean(user),
    staleTime: NUMBERS_STALE_TIME,
    /* A role that cannot read the list gets an error, not a retry storm; the
       picker then falls back to its "no number assigned" state. */
    retry: false,
  });

  const companyCallerIdOptions = useMemo((): CompanyCallerIdOption[] => {
    if (!enabled) return [];
    const seen = new Set<string>();
    const options: CompanyCallerIdOption[] = [];
    (data || []).forEach((row: any) => {
      const number = cleanText(row?.did_number);
      const key = number.replace(/\D/g, '');
      if (!key || seen.has(key)) return;
      seen.add(key);
      options.push({
        id: `${COMPANY_CALLER_ID_ID_PREFIX}${cleanText(row?.uuid) || key}`,
        label: cleanText(row?.did_name) || 'Company number',
        country: (
          cleanText(row?.did_country) ||
          user?.countryInfo?.alpha2code ||
          'US'
        ).toUpperCase(),
        number,
        source: 'company',
        didUuid: cleanText(row?.uuid),
      });
    });
    /* Stable order so the list does not shuffle between renders. */
    return options.sort((left, right) => left.number.localeCompare(right.number));
  }, [data, enabled, user?.countryInfo?.alpha2code]);

  return { companyCallerIdOptions, isCompanyCallerIdLoading: enabled && isLoading };
};
