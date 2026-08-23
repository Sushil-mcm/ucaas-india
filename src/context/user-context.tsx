import { SESSION_NAME } from '@/lib/utils';
import { DASHBOARDCONST } from '@/pages/dashboard/constant';
import { getUserDetails } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface UserContextType {
  user: any;
  isConnectedToInternet: boolean;
  loader: boolean;
  handleSetUser: (user: any) => void;
  handleRemoveUser: () => void;
  refetch: () => void;
  isDialerEnable: boolean;
  setIsDialerEnable: (value: boolean) => void;
}
export const UserContext = createContext<UserContextType>({
  user: undefined,
  loader: false,
  isConnectedToInternet: navigator.onLine,
  handleSetUser: () => {},
  handleRemoveUser: () => {},
  refetch: () => {},
  isDialerEnable: false,
  setIsDialerEnable: () => {},
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setCurrentUser] = useState<any>(() => {
    const token = localStorage.getItem(SESSION_NAME);
    return token ? { token } : undefined;
  });
  const [hasHydratedStoredUser, setHasHydratedStoredUser] = useState(
    () => !localStorage.getItem(SESSION_NAME),
  );

  const [isConnectedToInternet, setIsConnectedToInternet] = useState<boolean>(navigator.onLine);
  const [isDialerEnable, setIsDialerEnable] = useState<boolean>(false);
  const lastSyncedDataRef = useRef<unknown>(null);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['getUsersDetails'],
    queryFn: getUserDetails,
    select: (data) => data?.data?.data?.result,
    enabled: Boolean(user?.token) || Boolean(localStorage.getItem(SESSION_NAME)),
    retry: 3,
  });

  const hasStoredSession = Boolean(localStorage.getItem(SESSION_NAME));
  const isSynchronizingUser = hasStoredSession && !isError && !hasHydratedStoredUser;
  const loader = isLoading || isSynchronizingUser;

  function handleInternetConnectivity() {
    setIsConnectedToInternet(navigator.onLine);
  }

  function handleSetUser(payload: any) {
    if (!localStorage.getItem(SESSION_NAME) && payload?.token) {
      localStorage.setItem(SESSION_NAME, payload?.token);
    }
    setCurrentUser((prev: any) => ({ ...prev, ...payload }));
  }

  function handleRemoveUser() {
    try {
      if (localStorage.getItem(SESSION_NAME)) {
        localStorage.removeItem(SESSION_NAME);
        localStorage.removeItem(DASHBOARDCONST?.dashboardType);
      }
      setCurrentUser(undefined);
      window.location.reload();
    } catch (error) {
      console.error('Error during user cleanup:', error);
      // Force user logout even if there's an error
      setCurrentUser(undefined);
    }
  }

  useEffect(() => {
    window.addEventListener('online', handleInternetConnectivity);
    window.addEventListener('offline', handleInternetConnectivity);

    return () => {
      window.removeEventListener('online', handleInternetConnectivity);
      window.removeEventListener('offline', handleInternetConnectivity);
    };
  }, []);

  useEffect(() => {
    // Only remove user after 3 retries are exhausted (isError and not refetching)
    if (isError && !isFetching) {
      handleRemoveUser();
      return;
    }

    if (data && lastSyncedDataRef.current !== data) {
      lastSyncedDataRef.current = data;
      handleSetUser({ ...data, token: localStorage.getItem(SESSION_NAME) });
      setHasHydratedStoredUser(true);
    }
  }, [data, isError, isFetching]);

  return (
    <UserContext.Provider
      value={{
        user,
        handleSetUser,
        isConnectedToInternet,
        loader,
        handleRemoveUser,
        refetch,
        isDialerEnable,
        setIsDialerEnable,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
