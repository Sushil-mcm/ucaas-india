import { apiClient, type CustomAxiosRequestConfig } from '@/services/api/axios';
import { unwrapResult } from '@/lib/company-settings-api';
import type { AuditLogRow } from '@/lib/change-log';

export interface CentralAuditPage {
  rows: AuditLogRow[];
  next_cursor: string | null;
}

/* `hideToastOnError`, like the other three sources the change log reads: a
   server without the timeline route answers 404, and the screen already says
   "Central transactional history is unavailable" in the partial-history note.
   Without it the global interceptor also threw a toast saying to retry in a
   moment, over a route that is simply not there to retry. */
export const getCentralAuditHistory = async (cursor?: string): Promise<CentralAuditPage> => {
  const response = await apiClient.get('/api/audit/timeline', {
    params: { limit: 200, ...(cursor ? { cursor } : {}) },
    hideToastOnError: true,
  } as CustomAxiosRequestConfig);
  const result = unwrapResult(response) as CentralAuditPage;
  if (!result || !Array.isArray(result.rows)) throw new Error('Central history returned an invalid response.');
  return result;
};
