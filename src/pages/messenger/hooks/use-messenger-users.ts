import { usePaginatedUsers } from '@/hooks/use-paginated-users';
import { useCallback, useEffect, useRef } from 'react';

export const useMessengerUsers = ({
  search = '',
  enabled = true,
}: {
  search?: string;
  enabled?: boolean;
} = {}) => {
  return usePaginatedUsers({
    search,
    enabled,
    queryKey: ['messengerUserList'],
  });
};

export const useLoadMoreUsersObserver = ({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  enabled = true,
}: {
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  enabled?: boolean;
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node || !enabled || !hasNextPage || isFetchingNextPage) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { rootMargin: '160px 0px', threshold: 0.01 },
      );
      observerRef.current.observe(node);
    },
    [enabled, fetchNextPage, hasNextPage, isFetchingNextPage],
  );
};
