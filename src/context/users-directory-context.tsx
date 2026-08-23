import { USER_QUERY_KEYS } from '@/constants/user-query-keys';
import { SESSION_NAME } from '@/lib/utils';
import { getUserList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useState } from 'react';

interface UsersDirectoryContextType {
  users: any[];
  isLoading: boolean;
  isFetching: boolean;
  refetchUsers: () => void;
  ensureUsersDirectory: () => void;
  getUserProfileByUuid: (userUuid: string) => string;
}

export const UsersDirectoryContext = createContext<UsersDirectoryContextType>({
  users: [],
  isLoading: false,
  isFetching: false,
  refetchUsers: () => {},
  ensureUsersDirectory: () => {},
  getUserProfileByUuid: () => '',
});

const usersDirectoryPayload = {
  page: 1,
  limit: 1000,
  filters: [],
  search: '',
};

export const UsersDirectoryProvider = ({ children }: { children: ReactNode }) => {
  const [isDirectoryRequested, setIsDirectoryRequested] = useState(false);
  const ensureUsersDirectory = useCallback(() => setIsDirectoryRequested(true), []);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: USER_QUERY_KEYS.directoryAll,
    queryFn: () => getUserList(usersDirectoryPayload),
    select: (response: any) => response?.data?.data?.result?.rows || [],
    enabled: isDirectoryRequested && Boolean(localStorage.getItem(SESSION_NAME)),
  });
  const users = data || [];

  const getUserProfileByUuid = (userUuid: string) => {
    const selectedUser = users.find((user: any) => user?.uuid === userUuid);
    return selectedUser?.profile || '';
  };

  return (
    <UsersDirectoryContext.Provider
      value={{
        users,
        isLoading,
        isFetching,
        refetchUsers: refetch,
        ensureUsersDirectory,
        getUserProfileByUuid,
      }}
    >
      {children}
    </UsersDirectoryContext.Provider>
  );
};
