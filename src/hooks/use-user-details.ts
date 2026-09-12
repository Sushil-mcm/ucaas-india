/* One cache entry for the signed-in user's /api/user/info record, shared by
 * every "My Account" screen.
 *
 * Profile and Preferences already shared `['getUserDetailsQueryFn']`, but My
 * Phone, Notifications and Greetings each had their own key with no
 * `staleTime` — so a single pass through the account tabs fired four identical
 * requests and every revisit refetched. They now all read `['userInfo']`.
 *
 * The global user object in `user-context` (`['getUsersDetails']`) is a
 * separate, longer-lived query and is intentionally left alone; call
 * `invalidateUserDetails` after a save so both refresh.
 */

import { useQuery } from '@tanstack/react-query';
import { getUserDetails } from '@/services/api';

export const USER_DETAILS_QUERY_KEY = ['userInfo'] as const;

/* The result shape every account screen expects: `data.data.data.result`. */
const selectResult = (raw: any) => raw?.data?.data?.result;

export const useUserDetails = () =>
  useQuery({
    queryKey: USER_DETAILS_QUERY_KEY,
    queryFn: getUserDetails,
    select: selectResult,
    staleTime: 60_000,
  });

type Invalidator = {
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => unknown;
};

/** Refresh the account-screen copy and the app-wide user object together. */
export const invalidateUserDetails = (queryClient: Invalidator): void => {
  if (!queryClient?.invalidateQueries) return;
  queryClient.invalidateQueries({ queryKey: USER_DETAILS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ['getUsersDetails'] });
};
