import { useQuery } from '@tanstack/react-query';
import { SESSION_NAME } from '@/lib/utils';

const isProtectedMediaUrl = (url: string) => /\/api\/media(?:\/|\?|$)/.test(url);

export const getMediaAuthorizationHeaders = (url: string): HeadersInit | undefined => {
  if (!isProtectedMediaUrl(url) || typeof window === 'undefined') return undefined;

  const accessToken = localStorage.getItem(SESSION_NAME);
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
};

export const fetchAuthenticatedMedia = (url: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const authorizationHeaders = getMediaAuthorizationHeaders(url);

  if (authorizationHeaders) {
    new Headers(authorizationHeaders).forEach((value, key) => {
      if (!headers.has(key)) headers.set(key, value);
    });
  }

  return fetch(url, { ...init, headers });
};

export const fetchAuthenticatedMediaObjectUrl = async (url: string, signal?: AbortSignal) => {
  if (!url) throw new Error('Missing media URL');

  const response = await fetchAuthenticatedMedia(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error('Failed to fetch media: empty response');

  return URL.createObjectURL(blob);
};

export const useAuthenticatedMediaUrl = (url: string, enabled = true) => {
  const requiresAuthentication = isProtectedMediaUrl(url);
  const query = useQuery({
    queryKey: ['authenticated-media', url],
    queryFn: ({ signal }) => fetchAuthenticatedMediaObjectUrl(url, signal),
    enabled: Boolean(enabled && url && requiresAuthentication),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    retry: 1,
  });

  return {
    ...query,
    data: requiresAuthentication ? query.data || '' : url,
    isLoading: requiresAuthentication ? query.isLoading : false,
  };
};
