/* Runs the menu checks against the menu currently being edited.
 *
 * The rules live in `lib/ivr-menu-checks.ts` as a plain function so they can be
 * tested without React and reused by anything else that needs them. This hook is
 * only the wiring: it reads what is in the form right now, fetches the other
 * menus so a ring between them can be spotted, and hands both to the checker.
 *
 * The other menus are fetched once and cached for five minutes. Loop detection
 * needs them, and a menu the admin cannot see is a menu whose loop they cannot
 * be warned about — but it is background information, so a failed fetch quietly
 * means "no link checks" rather than an error on screen. Half the checks are
 * still worth having.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';

import { ivrList } from '@/services/api';
import { checkIvrMenu, type IvrFinding } from '@/lib/ivr-menu-checks';

/* Enough to cover any realistic number of menus in one request. Loop detection
   on a partial list would miss rings that pass through a menu we did not load,
   which is worse than not checking - it would read as "no loop found". */
const ALL_MENUS_LIMIT = 500;

export const useIvrMenuChecks = (currentUuid?: string, currentName?: string): IvrFinding[] => {
  const { watch } = useFormContext();

  const ivrActions = watch('ivrActions');

  const { data: menus } = useQuery({
    queryKey: ['ivrMenusForChecks'],
    queryFn: () => ivrList({ page: 1, limit: ALL_MENUS_LIMIT } as any),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const allMenus = useMemo(() => {
    const rows =
      (menus as any)?.data?.data?.result?.rows ??
      (menus as any)?.data?.data?.rows ??
      (menus as any)?.data?.result?.rows ??
      [];
    return Array.isArray(rows) ? rows : [];
  }, [menus]);

  return useMemo(
    () =>
      checkIvrMenu({
        menu: { uuid: currentUuid, name: currentName, ivrActions },
        /* Only pass the list once it has actually arrived. An empty list would
           make every link look fine. */
        allMenus: allMenus.length ? allMenus : undefined,
      }),
    [currentUuid, currentName, ivrActions, allMenus],
  );
};
