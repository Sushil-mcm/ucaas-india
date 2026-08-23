import { getUserList } from '@/services/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

const DEFAULT_USER_PAGE_LIMIT = 25;

const getNextUserPage = (lastPage: any, allPages: any[]) => {
  const result = lastPage?.data?.data?.result || {};
  const rows = Array.isArray(result?.rows) ? result.rows : [];
  const reportedPage = Number(result?.currentPage ?? result?.page);
  const currentPage =
    Number.isFinite(reportedPage) && reportedPage > 0 ? reportedPage : allPages.length;
  const totalPages = Number(result?.totalPages);

  if (Number.isFinite(totalPages) && totalPages > 0) {
    return currentPage < totalPages ? currentPage + 1 : undefined;
  }

  return rows.length === DEFAULT_USER_PAGE_LIMIT ? currentPage + 1 : undefined;
};

export const usePaginatedUsers = ({
  search = '',
  enabled = true,
  queryKey = ['paginatedUserList'],
  params = {},
}: {
  search?: string;
  enabled?: boolean;
  queryKey?: readonly unknown[];
  params?: Record<string, unknown>;
} = {}) => {
  const normalizedSearch = search.trim();
  const query = useInfiniteQuery({
    queryKey: [...queryKey, normalizedSearch, params],
    queryFn: ({ pageParam }) =>
      getUserList({
        ...params,
        page: pageParam,
        limit: DEFAULT_USER_PAGE_LIMIT,
        search: normalizedSearch || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: getNextUserPage,
    enabled,
  });

  const users = useMemo(() => {
    const uniqueUsers = new Map<string, any>();
    query.data?.pages?.forEach((page) => {
      const rows = page?.data?.data?.result?.rows || [];
      rows.forEach((user: any) => {
        const userKey = String(
          user?.uuid ||
            user?.user_uuid ||
            user?.userId ||
            user?.id ||
            user?._id ||
            user?.extension ||
            user?.email ||
            '',
        ).trim();
        if (userKey) uniqueUsers.set(userKey, user);
      });
    });
    return Array.from(uniqueUsers.values());
  }, [query.data]);

  return { ...query, users };
};
