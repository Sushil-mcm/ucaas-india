import { getEnv, handleAlert, SESSION_NAME } from '@/lib/utils';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  hideToastOnError?: boolean;
}

const ORG_ID_HEADER = 'X-ORG-ID';
const ORG_ID_STORAGE_KEY = 'org_uuid';
const GET_META_DATA_PATH = '/api/admin/organisation/get-meta-data';

const getOrgUuidFromMetaDataResponse = (responseData: any): string => {
  const result = responseData?.data?.result ?? responseData?.result ?? responseData ?? null;
  const uuid = result?.uuid;
  return typeof uuid === 'string' ? uuid : '';
};

export const apiClient = axios.create({
  baseURL: getEnv().VITE_API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers ?? {};

    const accessToken = localStorage.getItem(SESSION_NAME) || '';
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const orgId = localStorage.getItem(ORG_ID_STORAGE_KEY) || '';
    if (orgId) {
      config.headers[ORG_ID_HEADER] = orgId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => {
    const requestUrl = response?.config?.url || '';

    if (requestUrl.includes(GET_META_DATA_PATH)) {
      const orgUuid = getOrgUuidFromMetaDataResponse(response?.data);
      if (orgUuid) {
        localStorage.setItem(ORG_ID_STORAGE_KEY, orgUuid);
        apiClient.defaults.headers.common[ORG_ID_HEADER] = orgUuid;
      }
    }

    return response;
  },
  (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig | undefined;

    if (!config?.hideToastOnError && error?.response?.status !== 401) {
      let msg = '';

      if (!navigator.onLine) {
        msg = 'Network unavailable. Please check your internet connection.';
      } else if (error?.response?.status === 502) {
        msg = 'System update ongoing. Please retry in a bit.';
      } else if ((error.response?.data as any)?.message) {
        msg = (error.response?.data as any).message;
      } else if ((error.response?.data as any)?.error?.message) {
        msg = (error.response?.data as any).error.message;
      }
      if (msg) {
        handleAlert({
          text: msg,
          type: 'error',
        });;
      }

    }

    if (error?.response?.status === 401) {
      if (typeof window !== 'undefined') {
        (window as any).isSessionTerminated = true;
      }
      localStorage.removeItem(SESSION_NAME);
      window.dispatchEvent(new CustomEvent('unauthorized-session'));
    }

    return Promise.reject(error);
  },
);