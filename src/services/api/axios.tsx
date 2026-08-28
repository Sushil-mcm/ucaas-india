import { getEnv, handleAlert, SESSION_NAME } from '@/lib/utils';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  hideToastOnError?: boolean;
}

const ORG_ID_HEADER = 'X-ORG-ID';
const ORG_ID_STORAGE_KEY = 'org_uuid';
const GET_META_DATA_PATH = '/api/admin/organisation/get-meta-data';

/**
 * The largest `limit` the list endpoints accept.
 *
 * They validate it and reject anything larger — "limit must be less than or
 * equal to 200" — rather than returning a truncated page. Around ninety call
 * sites across the app ask for more than that, most of them long-standing code
 * that predates the rule: pickers and dropdowns passing 1000, and two passing
 * 99999999 to mean "everything".
 *
 * Clamping here turns every one of those from a failed request into a working
 * one. It is deliberately a request-layer fix rather than ninety edits: the
 * call sites are not wrong about wanting the whole list, they are wrong about
 * how to ask, and that is one rule in one place.
 *
 * Where a screen genuinely needs more than 200 rows to be correct — the
 * statement of account, the coverage audit — it walks the pages with
 * `fetchAllPages` instead of relying on this.
 */
const MAX_PAGE_LIMIT = 200;

/** Warn once per endpoint, so the console shows the offenders without flooding. */
const warnedLimitPaths = new Set<string>();

const clampLimit = (bag: unknown, path: string): void => {
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return;
  const holder = bag as Record<string, unknown>;
  const raw = holder.limit;
  if (raw === undefined || raw === null || raw === '') return;

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= MAX_PAGE_LIMIT) return;

  holder.limit = MAX_PAGE_LIMIT;
  if (!warnedLimitPaths.has(path)) {
    warnedLimitPaths.add(path);
    console.warn(
      `[api] ${path} requested limit=${value}; clamped to ${MAX_PAGE_LIMIT}. ` +
        'Use fetchAllPages() if this screen needs every row.',
    );
  }
};

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

    /* Applies to both shapes these endpoints are called with: a POST body and
       a GET query string. */
    const path = config.url || 'unknown';
    clampLimit(config.data, path);
    clampLimit(config.params, path);

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