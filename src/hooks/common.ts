import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  callQueueList,
  getAssignDidList,
  getDepartmentList,
  getGreetings,
  getUserList,
  ivrList,
  siteList,
  fetchContact,
  cardList,
  getGroupList,
  getPlans,
  getMyPlanDetails,
} from '@/services/api'; // adjust this

// Types
type GreetingType = 'greeting' | 'voicemail' | 'prompt';

export interface GreetingItem {
  id: string;
  name: string;
  type: GreetingType;
  [key: string]: any;
}

interface RawGreetingResponse {
  data: {
    data: {
      result: { rows: GreetingItem[] };
    };
  };
}

interface GetExtensionsPayload {
  page?: number;
  limit?: number;
  filters?: { key: string; value: unknown }[];
  search?: string;
  role?: string[];
  displayType?: 'dropdown';
}

export const useGetGreetings = (params?: any) => {
  const { data: greetingData } = useQuery<RawGreetingResponse, Error, GreetingItem[]>({
    queryKey: ['greetings', params],
    queryFn: () => getGreetings({ page: 1, limit: 1000, search: '', type: 'all', ...params }),
    select: (res) => res?.data?.data?.result?.rows ?? [],
  });

  const greetingList = useMemo(() => {
    return greetingData?.filter((item) => item.type === 'greeting') ?? [];
  }, [greetingData]);

  const voicemailList = useMemo(() => {
    return greetingData?.filter((item) => item.type === 'voicemail') ?? [];
  }, [greetingData]);

  const promptList = useMemo(() => {
    return greetingData?.filter((item) => item.type === 'prompt') ?? [];
  }, [greetingData]);

  return {
    ...greetingData,
    greetingList,
    voicemailList,
    promptList,
  };
};

export const useGetAssignedDIDNumbers = (uuid?: string) => {
  return useQuery({
    queryKey: ['getAssignedDIDNumbersQuery'],
    queryFn: () =>
      getAssignDidList({
        page: 1,
        limit: 1000,
        filters: [],
        search: '',
        ...(uuid && { user_uuid: uuid || '' }),
      }),
    select: (data) => data?.data?.data?.result?.rows,
  });
};

export const useGetExtensions = (
  payload: GetExtensionsPayload = {
    page: 1,
    limit: 25,
    filters: [],
    search: '',
  },
) => {
  return useQuery({
    queryKey: ['getExtensions', payload],
    queryFn: () => getUserList(payload),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
};

export const useGetSite = () => {
  const res = useQuery({
    queryKey: ['useGetSite'],
    queryFn: siteList,
    select: (data) => data?.data?.data?.result?.rows || [],
  });
  return res;
};

export const useGetSavedCards = (enabled = true) => {
  return useQuery({
    queryKey: ['useGetSavedCards'],
    queryFn: () => cardList(),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: enabled,
  });
};
export const useGetDepartment = (params?: any) => {
  const { isEnabled = true, ...rest } = params || {};
  return useQuery({
    queryKey: ['getDepartmentList', rest],
    queryFn: () => getDepartmentList(rest),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: isEnabled,
  });
};

export const useGetIVR = (params?: any) => {
  return useQuery({
    queryKey: ['getIVRList', params],
    queryFn: () => ivrList({ page: 1, limit: 9999, filters: [], search: '', ...params }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
};

export const useGetQueueList = (params?: any) => {
  return useQuery({
    queryKey: ['getCallQueueListQuery', params],
    queryFn: () => callQueueList({ page: 1, limit: 1000, ...params }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
};
export const useFetchContact = (payload?: any) => {
  return useQuery({
    queryKey: ['fetchContact', payload],
    queryFn: () => fetchContact(payload),
    select: (data) => data?.data?.data?.result,
  });
};

export const useGetGroupList = (type?: any) => {
  return useQuery({
    queryKey: ['getGroupListQuery', type],
    queryFn: () => getGroupList({ page: 1, limit: 1000, ...type }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });
};

export const useGetPlans = (enabled = true) => {
  return useQuery({
    queryKey: ['useGetPlans'],
    queryFn: getPlans,
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled,
  });
};

export const useGetMyPlanDetails = (data?: any, isEnabled?: boolean) => {
  return useQuery({
    queryKey: ['useGetMyPlanDetails'],
    queryFn: () => getMyPlanDetails(data),
    select: (data) => data?.data?.data?.result || {},
    enabled: isEnabled,
  });
};
