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

// Comfortably inside the relay credential's lifetime (TURN_VALIDITY on the API,
// 24 hours today), so a missed refresh or two still leaves working credentials.
const TURN_CREDENTIAL_REFRESH_MS = 6 * 60 * 60 * 1000;

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
    // This response carries the softphone's relay (TURN) credentials, and those
    // expire. They used to be fetched once at login and never again, so a tab
    // left open past their lifetime lost its relay and calls went silent - then
    // died about fifteen seconds in when the carrier gave up. Refreshing well
    // inside that window keeps them valid. It does not disturb an established
    // call: the SIP connection is only rebuilt when the server, domain or
    // extension changes, and the relay password is read fresh for each new call.
    refetchInterval: TURN_CREDENTIAL_REFRESH_MS,
    refetchIntervalInBackground: true,
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
