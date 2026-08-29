import { getEnv, handleAlert, SESSION_NAME } from '@/lib/utils';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export interface CustomAgenticAxiosRequestConfig extends AxiosRequestConfig {
  hideToastOnError?: boolean;
}

// Fully separate axios instance for the new, additive "Agentic AI" backend —
// deliberately not sharing state with services/api/axios.tsx, since that
// client's 401 handler clears the whole app session. A hiccup in this new
// service must never log an admin out of the rest of the product.
export const agenticApiClient = axios.create({
  baseURL: getEnv().VITE_AGENTIC_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
  },
});

agenticApiClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers ?? {};

    const accessToken = localStorage.getItem(SESSION_NAME) || '';
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const orgId = localStorage.getItem('org_uuid') || '';
    if (orgId) {
      config.headers['X-ORG-ID'] = orgId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

agenticApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const config = error.config as CustomAgenticAxiosRequestConfig | undefined;

    if (!config?.hideToastOnError) {
      let msg = '';
      if (!navigator.onLine) {
        msg = 'Network unavailable. Please check your internet connection.';
      } else if ((error.response?.data as any)?.error?.message) {
        msg = (error.response?.data as any).error.message;
      } else if (error?.response?.status === 404) {
        msg = '';
      } else {
        msg = 'Agentic AI service is unavailable. Please try again shortly.';
      }
      if (msg) {
        handleAlert({ text: msg, type: 'error' });
      }
    }

    return Promise.reject(error);
  },
);
