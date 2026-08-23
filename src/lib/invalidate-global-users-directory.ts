import type { QueryClient } from '@tanstack/react-query';
import { USER_QUERY_KEYS } from '@/constants/user-query-keys';

export const invalidateGlobalUsersDirectory = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({
    queryKey: USER_QUERY_KEYS.directoryAll,
  });
};

